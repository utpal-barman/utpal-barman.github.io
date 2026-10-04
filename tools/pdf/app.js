/* ==========================================================================
   utpals.com/tools/pdf
   The interface. Every byte stays in the tab: files are read with FileReader,
   rendered with pdf.js and rewritten with pdf-lib. There is no fetch() here
   and no server to send anything to. All PDF work lives in pdfops.js.
   ========================================================================== */

(function () {
  'use strict';

  var ops = window.PDFOps;
  var pdfjs = window.pdfjsLib;

  /* --- shell -------------------------------------------------------------- */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var engine = $('#engine');
  var engineLabel = $('#engineLabel');
  var statusLine = $('#status');

  function setEngine(state, label) {
    engine.setAttribute('data-state', state);
    engineLabel.textContent = label;
  }

  function say(message, tone) {
    statusLine.textContent = message || '';
    if (tone) statusLine.setAttribute('data-tone', tone);
    else statusLine.removeAttribute('data-tone');
  }

  /* Long jobs block the main thread while pdf-lib serialises, so hand the
     browser a frame to paint the "working" state before starting. A
     backgrounded tab never fires rAF, so the timeout is the one that has to
     win there — otherwise the job would wait for the user to come back. */
  function frame() {
    return new Promise(function (resolve) {
      var done = false;
      function go() {
        if (done) return;
        done = true;
        resolve();
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(go);
      });
      setTimeout(go, 80);
    });
  }

  async function run(button, label, job) {
    var was = button.textContent;
    button.disabled = true;
    button.textContent = 'Working';
    setEngine('busy', label);
    say(label, 'busy');
    await frame();
    var started = Date.now();
    try {
      var note = await job();
      var took = ((Date.now() - started) / 1000).toFixed(1);
      say((note || 'Done') + ' · ' + took + 's', 'done');
      setEngine('ready', 'Local only');
    } catch (error) {
      say(explain(error), 'error');
      setEngine('error', 'Last job failed');
      if (window.console) console.error(error);
    } finally {
      button.disabled = false;
      button.textContent = was;
    }
  }

  function explain(error) {
    var message = (error && error.message) || String(error);
    if (/password|encrypt/i.test(message)) {
      return 'That PDF is password-protected. Unlock it in your reader first, then try again.';
    }
    if (/Invalid PDF|No PDF header|corrupt|FormatError/i.test(message)) {
      return 'That file is not a PDF this tool can read.';
    }
    if (/out of memory|Array buffer allocation/i.test(message)) {
      return 'The browser ran out of memory — try fewer pages at a time.';
    }
    return message;
  }

  function sizeLabel(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function safeName(value, fallback, extension) {
    var name = String(value || '').trim().replace(/[\\/:*?"<>|]+/g, '-');
    if (!name) name = fallback;
    var ext = extension || '.pdf';
    if (name.slice(-ext.length).toLowerCase() !== ext) name += ext;
    return name;
  }

  function download(bytes, name, mime) {
    var blob = new Blob([bytes], { type: mime || 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var link = el('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    /* Safari needs the URL to outlive the click by a beat. */
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 20000);
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(new Uint8Array(reader.result));
      };
      reader.onerror = function () {
        reject(new Error('Could not read ' + file.name));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /* pdf.js detaches the buffer it is handed, so it always gets a copy. */
  function openDoc(bytes) {
    return pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
  }

  /* Trailing-edge throttle. Scroll handlers need one, and rAF is not an option:
     a throttled or occluded tab never fires it, which would leave pages blank. */
  function throttle(fn, wait) {
    var timer = null;
    return function () {
      if (timer) return;
      timer = setTimeout(function () {
        timer = null;
        fn();
      }, wait);
    };
  }

  var nextId = 0;

  async function intake(file) {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      throw new Error(file.name + ' is not a PDF');
    }
    var bytes = await readFile(file);
    var doc = await openDoc(bytes);
    return {
      id: ++nextId,
      name: file.name,
      size: file.size,
      bytes: bytes,
      doc: doc,
      pageCount: doc.numPages,
      pages: null
    };
  }

  /* Give the canvas its CSS box and its backing store, and clear it to white.
     Returns the viewport to render with. */
  function sizeCanvas(page, cssWidth, canvas) {
    var base = page.getViewport({ scale: 1 });
    var scale = cssWidth / base.width;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var viewport = page.getViewport({ scale: scale * dpr });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = Math.round(base.width * scale) + 'px';
    canvas.style.height = Math.round(base.height * scale) + 'px';
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return viewport;
  }

  /* A placeholder holds the layout without paying for a backing store: a
     200-page file at full size would be well over a gigabyte of canvas. */
  function blankCanvas(page, cssWidth) {
    var base = page.getViewport({ scale: 1 });
    var scale = cssWidth / base.width;
    var canvas = el('canvas');
    canvas.width = 1;
    canvas.height = 1;
    canvas.style.width = Math.round(base.width * scale) + 'px';
    canvas.style.height = Math.round(base.height * scale) + 'px';
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
    return canvas;
  }

  async function renderToCanvas(page, cssWidth, extra) {
    var canvas = extra || el('canvas');
    var viewport = sizeCanvas(page, cssWidth, canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
    return canvas;
  }

  function canvasBytes(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        blob.arrayBuffer().then(function (buffer) {
          resolve(new Uint8Array(buffer));
        });
      }, 'image/png');
    });
  }

  /* --- tabs --------------------------------------------------------------- */

  var tabs = $$('.tab');

  function showTab(tab) {
    tabs.forEach(function (other) {
      var on = other === tab;
      other.setAttribute('aria-selected', on ? 'true' : 'false');
      other.tabIndex = on ? 0 : -1;
      $('#' + other.getAttribute('aria-controls')).hidden = !on;
    });
    say('');
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      showTab(tab);
    });
    tab.addEventListener('keydown', function (event) {
      var step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      var next = tabs[(i + step + tabs.length) % tabs.length];
      showTab(next);
      next.focus();
    });
  });

  /* --- drop zones --------------------------------------------------------- */

  /* Each zone declares which store it feeds; the browser's default drop
     behaviour (navigating to the file) is cancelled document-wide. */
  ['dragover', 'drop'].forEach(function (type) {
    document.addEventListener(type, function (event) {
      if (event.target.closest('.drop')) return;
      event.preventDefault();
    });
  });

  var handlers = {};

  $$('.drop').forEach(function (zone) {
    var key = zone.getAttribute('data-drop');
    var input = $('input[type=file]', zone);

    function take(files) {
      var pdfs = Array.prototype.slice.call(files).filter(function (file) {
        return /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
      });
      if (!pdfs.length) {
        say('Drop a PDF — that was not one.', 'error');
        return;
      }
      handlers[key](pdfs);
    }

    zone.addEventListener('dragenter', function (event) {
      event.preventDefault();
      zone.classList.add('is-over');
    });
    zone.addEventListener('dragover', function (event) {
      event.preventDefault();
      zone.classList.add('is-over');
    });
    zone.addEventListener('dragleave', function (event) {
      if (zone.contains(event.relatedTarget)) return;
      zone.classList.remove('is-over');
    });
    zone.addEventListener('drop', function (event) {
      event.preventDefault();
      zone.classList.remove('is-over');
      take(event.dataTransfer.files);
    });
    zone.addEventListener('click', function (event) {
      if (event.target.closest('label, input')) return;
      input.click();
    });
    /* the styled <label> is a button to screen readers, so give it keys */
    $$('label.link', zone).forEach(function (label) {
      label.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          input.click();
        }
      });
    });
    input.addEventListener('change', function () {
      if (input.files.length) take(input.files);
      input.value = '';
    });
  });

  /* --- 01 merge ----------------------------------------------------------- */

  var merge = {
    items: [],
    rows: $('#mergeRows'),
    work: $('#mergeWork'),
    zone: $('.drop[data-drop=merge]'),
    readout: $('#mergeReadout')
  };

  handlers.merge = async function (files) {
    say('Reading ' + plural(files.length, 'file') + '…');
    for (var i = 0; i < files.length; i++) {
      try {
        merge.items.push(await intake(files[i]));
      } catch (error) {
        say(explain(error), 'error');
      }
    }
    paintMerge();
  };

  function mergeTotals() {
    var pages = 0;
    var bytes = 0;
    merge.items.forEach(function (item) {
      pages += (item.pages || []).length || item.pageCount;
      bytes += item.size;
    });
    return { pages: pages, bytes: bytes };
  }

  function paintMerge() {
    var has = merge.items.length > 0;
    merge.work.hidden = !has;
    merge.zone.hidden = has;
    if (!has) {
      say('');
      return;
    }

    var totals = mergeTotals();
    merge.readout.textContent =
      plural(merge.items.length, 'file') + ' · ' + plural(totals.pages, 'page') + ' · ' +
      sizeLabel(totals.bytes);

    merge.rows.textContent = '';

    merge.items.forEach(function (item, index) {
      var used = (item.pages || []).length || item.pageCount;
      var row = el('li', 'row');
      row.draggable = true;
      row.dataset.id = String(item.id);

      var grip = el('button', 'row__grip', String(index + 1).padStart(2, '0'));
      grip.type = 'button';
      grip.setAttribute('aria-label', 'Reorder ' + item.name);
      row.appendChild(grip);

      var main = el('div', 'row__main');
      main.appendChild(el('p', 'row__name', item.name));
      var meta = el('div', 'row__meta');
      meta.appendChild(el('span', null, used + '/' + item.pageCount + ' pp'));
      meta.appendChild(el('span', null, sizeLabel(item.size)));
      var bar = el('span', 'row__bar');
      var fill = el('i');
      fill.style.setProperty('--w', totals.pages ? (used / totals.pages) * 100 + '%' : '0%');
      bar.appendChild(fill);
      meta.appendChild(bar);
      main.appendChild(meta);
      row.appendChild(main);

      var field = el('label', 'field row__range');
      field.appendChild(el('span', null, 'Pages'));
      var range = el('input');
      range.type = 'text';
      range.value = item.spec || '';
      range.placeholder = 'all';
      range.spellcheck = false;
      field.appendChild(range);
      row.appendChild(field);

      range.addEventListener('input', function () {
        var spec = range.value.trim();
        item.spec = spec;
        if (!spec) {
          item.pages = null;
          range.setCustomValidity('');
          paintMergeTotals();
          return;
        }
        var parsed = ops.parseRanges(spec, item.pageCount);
        if (parsed.error) {
          item.pages = null;
          say(item.name + ': ' + parsed.error, 'error');
          range.style.borderColor = 'var(--amber)';
          return;
        }
        range.style.borderColor = '';
        item.pages = parsed.pages;
        say('');
        paintMergeTotals();
      });

      var acts = el('div', 'row__acts');
      var up = el('button', 'btn btn--icon', '↑');
      up.type = 'button';
      up.setAttribute('aria-label', 'Move ' + item.name + ' up');
      up.disabled = index === 0;
      up.addEventListener('click', function () {
        moveMerge(index, index - 1);
      });
      var down = el('button', 'btn btn--icon', '↓');
      down.type = 'button';
      down.setAttribute('aria-label', 'Move ' + item.name + ' down');
      down.disabled = index === merge.items.length - 1;
      down.addEventListener('click', function () {
        moveMerge(index, index + 1);
      });
      var drop = el('button', 'btn btn--icon', '✕');
      drop.type = 'button';
      drop.setAttribute('aria-label', 'Remove ' + item.name);
      drop.addEventListener('click', function () {
        merge.items.splice(index, 1);
        paintMerge();
      });
      acts.appendChild(up);
      acts.appendChild(down);
      acts.appendChild(drop);
      row.appendChild(acts);

      merge.rows.appendChild(row);
    });
  }

  /* the readout and bars change on every range edit; the rows do not */
  function paintMergeTotals() {
    var totals = mergeTotals();
    merge.readout.textContent =
      plural(merge.items.length, 'file') + ' · ' + plural(totals.pages, 'page') + ' · ' +
      sizeLabel(totals.bytes);
    $$('.row', merge.rows).forEach(function (row, index) {
      var item = merge.items[index];
      var used = (item.pages || []).length || item.pageCount;
      $('.row__meta span', row).textContent = used + '/' + item.pageCount + ' pp';
      $('.row__bar i', row).style.setProperty(
        '--w',
        totals.pages ? (used / totals.pages) * 100 + '%' : '0%'
      );
    });
  }

  function moveMerge(from, to) {
    if (to < 0 || to >= merge.items.length) return;
    var moved = merge.items.splice(from, 1)[0];
    merge.items.splice(to, 0, moved);
    paintMerge();
  }

  /* pointer reordering, with the keyboard buttons above as the accessible path */
  var dragging = null;

  merge.rows.addEventListener('dragstart', function (event) {
    var row = event.target.closest('.row');
    if (!row) return;
    dragging = row;
    row.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.dataset.id);
  });

  merge.rows.addEventListener('dragover', function (event) {
    if (!dragging) return;
    event.preventDefault();
    var over = event.target.closest('.row');
    $$('.row', merge.rows).forEach(function (row) {
      row.classList.toggle('is-target', row === over && row !== dragging);
    });
  });

  merge.rows.addEventListener('drop', function (event) {
    if (!dragging) return;
    event.preventDefault();
    var over = event.target.closest('.row');
    if (over && over !== dragging) {
      var rows = $$('.row', merge.rows);
      moveMerge(rows.indexOf(dragging), rows.indexOf(over));
    }
    dragging = null;
  });

  merge.rows.addEventListener('dragend', function () {
    $$('.row', merge.rows).forEach(function (row) {
      row.classList.remove('is-dragging', 'is-target');
    });
    dragging = null;
  });

  $('#mergeAdd').addEventListener('click', function () {
    $('#mergeInput').click();
  });

  $('#mergeClear').addEventListener('click', function () {
    merge.items = [];
    paintMerge();
  });

  $('#mergeGo').addEventListener('click', function () {
    var button = this;
    if (!merge.items.length) {
      say('Add a PDF first.', 'error');
      return;
    }
    /* one file is legitimate — a page range makes it an extract */
    run(button, 'Joining pages', async function () {
      var bytes = await ops.merge(
        merge.items.map(function (item) {
          return { bytes: item.bytes, pages: item.pages };
        }),
        { title: $('#mergeName').value }
      );
      var name = safeName($('#mergeName').value, 'merged');
      download(bytes, name);
      return 'Saved ' + name + ' · ' + plural(mergeTotals().pages, 'page');
    });
  });

  /* --- 02 split ----------------------------------------------------------- */

  var split = {
    file: null,
    selected: [],
    work: $('#splitWork'),
    zone: $('.drop[data-drop=split]'),
    thumbs: $('#splitThumbs'),
    sweep: null,
    range: $('#splitRange'),
    readout: $('#splitReadout')
  };

  handlers.split = async function (files) {
    say('Reading ' + files[0].name + '…');
    try {
      split.file = await intake(files[0]);
      split.selected = [];
      for (var i = 1; i <= split.file.pageCount; i++) split.selected.push(i);
      paintSplit();
      paintSplitThumbs();
      say('');
    } catch (error) {
      say(explain(error), 'error');
    }
  };

  function paintSplit() {
    var has = !!split.file;
    split.work.hidden = !has;
    split.zone.hidden = has;
    if (!has) return;

    $('#splitTitle').textContent = split.file.name;
    split.readout.textContent =
      plural(split.file.pageCount, 'page') + ' · ' + split.selected.length + ' selected · ' +
      sizeLabel(split.file.size);
    split.range.value = compress(split.selected);

    $$('.thumb', split.thumbs).forEach(function (thumb) {
      var page = Number(thumb.dataset.page);
      thumb.setAttribute('aria-pressed', split.selected.indexOf(page) !== -1 ? 'true' : 'false');
    });
  }

  /* "1,2,3,7,8" reads as "1-3, 7-8" once there are more than a handful */
  function compress(pages) {
    if (!pages.length) return '';
    var sorted = pages.slice().sort(function (a, b) {
      return a - b;
    });
    var out = [];
    var start = sorted[0];
    var last = sorted[0];
    for (var i = 1; i <= sorted.length; i++) {
      if (sorted[i] === last + 1) {
        last = sorted[i];
        continue;
      }
      out.push(start === last ? String(start) : start + '-' + last);
      start = last = sorted[i];
    }
    return out.join(', ');
  }

  /* The grid appears at once and is clickable at once; a page is rastered only
     when it scrolls into the viewport. A 300-page file used to mean 300 renders
     before the first click landed. */
  function paintSplitThumbs() {
    split.thumbs.textContent = '';

    var doc = split.file.doc;
    var frag = document.createDocumentFragment();
    var slots = [];

    for (var i = 1; i <= doc.numPages; i++) {
      var thumb = el('button', 'thumb');
      thumb.type = 'button';
      thumb.dataset.page = String(i);
      thumb.setAttribute('aria-pressed', 'true');
      thumb.setAttribute('aria-label', 'Page ' + i);
      thumb.appendChild(el('div', 'thumb__skeleton'));
      thumb.appendChild(el('span', 'thumb__n', String(i).padStart(2, '0')));
      frag.appendChild(thumb);
      slots.push(thumb);
    }

    split.thumbs.appendChild(frag);

    var owner = split.file;

    async function paint(thumb) {
      if (thumb.dataset.done) return;
      thumb.dataset.done = '1';
      var page = await doc.getPage(Number(thumb.dataset.page));
      if (split.file !== owner || !thumb.isConnected) return;
      var canvas = await renderToCanvas(page, 100);
      var skeleton = $('.thumb__skeleton', thumb);
      if (skeleton) thumb.replaceChild(canvas, skeleton);
    }

    split.sweep = function () {
      if (split.file !== owner) return;
      var view = split.thumbs.getBoundingClientRect();
      slots.forEach(function (thumb) {
        if (thumb.dataset.done) return;
        var box = thumb.getBoundingClientRect();
        if (box.bottom > view.top - 300 && box.top < view.bottom + 300) paint(thumb);
      });
    };

    split.sweep();
  }

  var sweepThumbs = throttle(function () {
    if (split.sweep) split.sweep();
  }, 120);

  split.thumbs.addEventListener('scroll', sweepThumbs, { passive: true });
  window.addEventListener('scroll', sweepThumbs, { passive: true });
  window.addEventListener('resize', sweepThumbs);

  split.thumbs.addEventListener('click', function (event) {
    var thumb = event.target.closest('.thumb');
    if (!thumb) return;
    var page = Number(thumb.dataset.page);
    var at = split.selected.indexOf(page);
    if (at === -1) split.selected.push(page);
    else split.selected.splice(at, 1);
    paintSplit();
  });

  split.range.addEventListener('input', function () {
    if (!split.file) return;
    var parsed = ops.parseRanges(split.range.value, split.file.pageCount);
    if (parsed.error) {
      say(parsed.error, 'error');
      split.range.style.borderColor = 'var(--amber)';
      return;
    }
    split.range.style.borderColor = '';
    say('');
    split.selected = parsed.pages.slice();
    /* repaint the grid and readout, but leave the field the user is typing in */
    split.readout.textContent =
      plural(split.file.pageCount, 'page') + ' · ' + split.selected.length + ' selected · ' +
      sizeLabel(split.file.size);
    $$('.thumb', split.thumbs).forEach(function (thumb) {
      var page = Number(thumb.dataset.page);
      thumb.setAttribute('aria-pressed', split.selected.indexOf(page) !== -1 ? 'true' : 'false');
    });
  });

  $$('[data-select]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (!split.file) return;
      var mode = button.getAttribute('data-select');
      var count = split.file.pageCount;
      if (mode === 'none') split.selected = [];
      else split.selected = ops.parseRanges(mode === 'all' ? 'all' : mode, count).pages.slice();
      paintSplit();
    });
  });

  $('#splitClear').addEventListener('click', function () {
    split.file = null;
    split.selected = [];
    split.thumbs.textContent = '';
    paintSplit();
    say('');
  });

  $('#splitGo').addEventListener('click', function () {
    var button = this;
    if (!split.selected.length) {
      say('Select at least one page.', 'error');
      return;
    }
    var mode = $('input[name=splitMode]:checked').value;
    var stem = split.file.name.replace(/\.pdf$/i, '');

    run(button, 'Pulling pages out', async function () {
      var groups;
      if (mode === 'one') {
        groups = [{ name: safeName(stem + ' pages ' + compress(split.selected), 'pages'),
          pages: split.selected }];
      } else if (mode === 'each') {
        groups = split.selected.map(function (page) {
          return { name: safeName(stem + ' p' + page, 'page'), pages: [page] };
        });
      } else {
        var parsed = ops.parseRanges(split.range.value || 'all', split.file.pageCount);
        if (parsed.error) throw new Error(parsed.error);
        groups = parsed.ranges.map(function (pair) {
          var pages = [];
          if (pair[0] <= pair[1]) for (var p = pair[0]; p <= pair[1]; p++) pages.push(p);
          else for (var q = pair[0]; q >= pair[1]; q--) pages.push(q);
          var label = pair[0] === pair[1] ? 'p' + pair[0] : 'p' + pair[0] + '-' + pair[1];
          return { name: safeName(stem + ' ' + label, 'part'), pages: pages };
        });
      }

      var results = await ops.split(split.file.bytes, groups);

      if (results.length === 1) {
        download(results[0].bytes, results[0].name);
        return 'Saved ' + results[0].name;
      }

      var archive = ops.zip(
        results.map(function (result) {
          return { name: result.name, bytes: result.bytes };
        })
      );
      var zipName = safeName(stem + ' split', 'split', '.zip');
      download(archive, zipName, 'application/zip');
      return 'Saved ' + zipName + ' · ' + plural(results.length, 'file');
    });
  });

  /* --- 03 collage --------------------------------------------------------- */

  var collage = {
    items: [],
    thumbs: [],
    work: $('#collageWork'),
    zone: $('.drop[data-drop=collage]'),
    readout: $('#collageReadout'),
    canvas: $('#collagePreview'),
    caption: $('#collageCaption'),
    perSheet: 4
  };

  handlers.collage = async function (files) {
    say('Reading ' + plural(files.length, 'file') + '…');
    for (var i = 0; i < files.length; i++) {
      try {
        collage.items.push(await intake(files[i]));
      } catch (error) {
        say(explain(error), 'error');
      }
    }
    collage.thumbs = [];
    paintCollage();
    /* draw once with the real counts so the caption is never stale, then
       again when the thumbnails have something to show */
    drawCollagePreview();
    say('Rendering the preview…');
    await buildCollageThumbs();
    drawCollagePreview();
    say('');
  };

  function collageOptions() {
    return {
      perSheet: collage.perSheet,
      sheet: $('#collageSheet').value,
      orientation: $('#collageOrient').value,
      margin: Number($('#collageMargin').value),
      gap: Number($('#collageGap').value),
      border: $('#collageBorder').checked
    };
  }

  function collagePageTotal() {
    return collage.items.reduce(function (sum, item) {
      return sum + item.pageCount;
    }, 0);
  }

  function paintCollage() {
    var has = collage.items.length > 0;
    collage.work.hidden = !has;
    collage.zone.hidden = has;
    if (!has) return;

    var pages = collagePageTotal();
    var sheets = Math.max(1, Math.ceil(pages / collage.perSheet));
    collage.readout.textContent =
      plural(collage.items.length, 'file') + ' · ' + plural(pages, 'page') + ' · ' +
      plural(sheets, 'sheet');
  }

  /* One small raster per previewed cell. The preview only ever shows the first
     sheet, so rasterising a 200-page file would be 200 renders for nothing —
     stop at the largest grid on offer. */
  var PREVIEW_CELLS = 9;

  async function buildCollageThumbs() {
    collage.thumbs = [];
    for (var i = 0; i < collage.items.length; i++) {
      var doc = collage.items[i].doc;
      for (var p = 1; p <= doc.numPages; p++) {
        if (collage.thumbs.length >= PREVIEW_CELLS) return;
        var page = await doc.getPage(p);
        var base = page.getViewport({ scale: 1 });
        var canvas = await renderToCanvas(page, Math.min(190, base.width));
        collage.thumbs.push({ canvas: canvas, width: base.width, height: base.height });
      }
    }
  }

  /* The preview runs the same layout arithmetic as ops.collage, at 1/N scale.
     Kept deliberately simple: it is a sanity check for the user, not a proof. */
  function drawCollagePreview() {
    var options = collageOptions();
    var grid = ops.GRIDS[options.perSheet];
    var sheet = ops.SHEETS[options.sheet];
    var orientation = options.orientation === 'auto' ? grid.orientation : options.orientation;
    var sheetW = orientation === 'landscape' ? sheet[1] : sheet[0];
    var sheetH = orientation === 'landscape' ? sheet[0] : sheet[1];

    var scale = 420 / Math.max(sheetW, sheetH);
    var canvas = collage.canvas;
    canvas.width = Math.round(sheetW * scale);
    canvas.height = Math.round(sheetH * scale);
    canvas.style.aspectRatio = sheetW + ' / ' + sheetH;

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cols = grid.cols;
    var rows = grid.rows;
    var cellW = (sheetW - options.margin * 2 - options.gap * (cols - 1)) / cols;
    var cellH = (sheetH - options.margin * 2 - options.gap * (rows - 1)) / rows;

    if (cellW <= 4 || cellH <= 4) {
      ctx.fillStyle = '#c99a3f';
      ctx.font = '12px monospace';
      ctx.fillText('margins too wide', 12, 24);
      return;
    }

    for (var c = 0; c < options.perSheet; c++) {
      var col = c % cols;
      var row = Math.floor(c / cols);
      var cellX = (options.margin + col * (cellW + options.gap)) * scale;
      var cellY = (options.margin + row * (cellH + options.gap)) * scale;
      var boxW = cellW * scale;
      var boxH = cellH * scale;
      var thumb = collage.thumbs[c];

      if (options.border) {
        ctx.strokeStyle = '#c8c8c8';
        ctx.lineWidth = 1;
        ctx.strokeRect(cellX + 0.5, cellY + 0.5, boxW - 1, boxH - 1);
      }

      if (!thumb) {
        ctx.strokeStyle = '#ededed';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(cellX + 0.5, cellY + 0.5, boxW - 1, boxH - 1);
        ctx.setLineDash([]);
        continue;
      }

      var fit = Math.min(boxW / thumb.width, boxH / thumb.height);
      var drawW = thumb.width * fit;
      var drawH = thumb.height * fit;
      ctx.drawImage(
        thumb.canvas,
        cellX + (boxW - drawW) / 2,
        cellY + (boxH - drawH) / 2,
        drawW,
        drawH
      );
    }

    var total = Math.max(1, Math.ceil(collagePageTotal() / options.perSheet));
    collage.caption.textContent = 'Sheet 1 of ' + total + ' · ' + Math.round(sheetW) + '×' +
      Math.round(sheetH) + 'pt';
  }

  $$('[data-per]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      collage.perSheet = Number(chip.getAttribute('data-per'));
      $$('[data-per]').forEach(function (other) {
        var on = other === chip;
        other.classList.toggle('is-on', on);
        other.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      paintCollage();
      drawCollagePreview();
    });
  });

  ['#collageSheet', '#collageOrient', '#collageBorder'].forEach(function (sel) {
    $(sel).addEventListener('change', drawCollagePreview);
  });

  $('#collageMargin').addEventListener('input', function () {
    $('#collageMarginOut').value = this.value;
    drawCollagePreview();
  });

  $('#collageGap').addEventListener('input', function () {
    $('#collageGapOut').value = this.value;
    drawCollagePreview();
  });

  $('#collageAdd').addEventListener('click', function () {
    $('#collageInput').click();
  });

  $('#collageClear').addEventListener('click', function () {
    collage.items = [];
    collage.thumbs = [];
    paintCollage();
    say('');
  });

  $('#collageGo').addEventListener('click', function () {
    var button = this;
    if (!collage.items.length) {
      say('Add a PDF first.', 'error');
      return;
    }
    run(button, 'Laying out sheets', async function () {
      var options = collageOptions();
      options.title = $('#collageName').value;
      var result = await ops.collage(
        collage.items.map(function (item) {
          return { bytes: item.bytes };
        }),
        options
      );
      var name = safeName($('#collageName').value, 'collage');
      download(result.bytes, name);
      return 'Saved ' + name + ' · ' + plural(result.sheets, 'sheet') + ' from ' +
        plural(result.placed, 'page');
    });
  });

  /* --- 04 edit & sign ----------------------------------------------------- */

  /* Geometry is stored in PDF points, in the page's visual orientation, with
     the origin at the top-left. That is exactly what ops.applyEdits expects,
     so exporting is a straight copy — no coordinate flipping in the UI. */
  var ed = {
    file: null,
    doc: null,
    pages: [],
    items: [],
    assets: {},
    history: [],
    tool: 'select',
    zoom: 1,
    sel: null,
    pending: null,
    seq: 0,
    stage: $('#edStage'),
    work: $('#editorWork'),
    zone: $('.drop[data-drop=editor]'),
    inspect: $('#edInspect')
  };

  var CSS_FONTS = {
    helvetica: ['Helvetica, Arial, sans-serif', 400, 'normal'],
    'helvetica-bold': ['Helvetica, Arial, sans-serif', 700, 'normal'],
    'helvetica-oblique': ['Helvetica, Arial, sans-serif', 400, 'italic'],
    times: ['"Times New Roman", Times, serif', 400, 'normal'],
    'times-bold': ['"Times New Roman", Times, serif', 700, 'normal'],
    'times-italic': ['"Times New Roman", Times, serif', 400, 'italic'],
    courier: ['"Courier New", Courier, monospace', 400, 'normal'],
    'courier-bold': ['"Courier New", Courier, monospace', 700, 'normal']
  };

  var SWATCHES = [
    ['#000000', 'Black'],
    ['#ffffff', 'White'],
    ['#2e66e6', 'Blue'],
    ['#4e9e7a', 'Green'],
    ['#c99a3f', 'Amber'],
    ['#b3261e', 'Red']
  ];

  var LINE_HEIGHT = 1.25;

  function clamp(value, lo, hi) {
    return value < lo ? lo : value > hi ? hi : value;
  }

  handlers.editor = async function (files) {
    say('Reading ' + files[0].name + '…');
    try {
      var file = await intake(files[0]);
      ed.file = file;
      ed.doc = file.doc;
      ed.items = [];
      ed.assets = {};
      ed.history = [];
      ed.sel = null;
      ed.zoom = 1;
      $('#edName').value = safeName(file.name.replace(/\.pdf$/i, '') + ' signed', 'signed');
      await paintEditor();
      say('');
    } catch (error) {
      say(explain(error), 'error');
    }
  };

  function editorVisible() {
    var has = !!ed.file;
    ed.work.hidden = !has;
    ed.zone.hidden = has;
  }

  /* Pages are laid out immediately at their true size but rastered only while
     they are near the viewport, and released again once they are well away.
     Marks live in the overlay, so releasing a canvas never loses work. */
  function releasePage(entry) {
    if (entry.task) {
      try {
        entry.task.cancel();
      } catch (error) {
        /* already finished */
      }
      entry.task = null;
    }
    /* The canvas itself is the source of truth. A cancelled render leaves the
       backing store allocated with `painted` still false, and keying off the
       flag would leak every page the user scrolled past quickly. */
    if (entry.canvas.width <= 1) return;
    entry.painted = false;
    entry.canvas.width = 1;
    entry.canvas.height = 1;
    var ctx = entry.canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
  }

  async function paintPage(entry) {
    if (entry.painted || entry.task) return;
    var viewport = sizeCanvas(entry.page, entry.w * ed.zoom, entry.canvas);
    entry.task = entry.page.render({
      canvasContext: entry.canvas.getContext('2d'),
      viewport: viewport
    });
    try {
      await entry.task.promise;
      entry.painted = true;
    } catch (error) {
      /* cancelled by a release or a zoom change */
    } finally {
      entry.task = null;
    }
  }

  async function paintEditor() {
    editorVisible();
    if (!ed.file) return;

    ed.pages.forEach(releasePage);

    ed.stage.textContent = '';
    ed.pages = [];
    $('#edZoom').value = Math.round(ed.zoom * 100) + '%';

    for (var i = 1; i <= ed.doc.numPages; i++) {
      var page = await ed.doc.getPage(i);
      var base = page.getViewport({ scale: 1 });

      var wrap = el('div', 'sheetwrap');
      var canvas = blankCanvas(page, base.width * ed.zoom);
      wrap.appendChild(canvas);
      wrap.appendChild(el('span', 'sheetwrap__n', String(i).padStart(2, '0')));

      var layer = el('div', 'layer');
      layer.dataset.page = String(i - 1);
      layer.dataset.tool = ed.tool;
      wrap.appendChild(layer);

      ed.stage.appendChild(wrap);
      ed.pages.push({
        index: i - 1,
        w: base.width,
        h: base.height,
        page: page,
        canvas: canvas,
        layer: layer,
        wrap: wrap,
        painted: false,
        task: null
      });
    }

    placeAll();
    paintReadout();
    sweepPages();
  }

  /* Paint what is on or near screen, release what is not. Measured from the
     stage's own box on every sweep, so it needs nothing from the browser but
     scroll events. */
  function sweepPages() {
    if (!ed.pages.length) return;
    var view = ed.stage.getBoundingClientRect();
    var pad = 400;
    ed.pages.forEach(function (entry) {
      var box = entry.wrap.getBoundingClientRect();
      if (box.bottom > view.top - pad && box.top < view.bottom + pad) paintPage(entry);
      else releasePage(entry);
    });
  }

  function paintReadout() {
    /* also called after the editor is cleared, when there is no document */
    if (!ed.doc) {
      $('#edReadout').textContent = '—';
      return;
    }

    var pages = {};
    ed.items.forEach(function (item) {
      pages[item.page] = true;
    });
    var touched = Object.keys(pages).length;
    $('#edReadout').textContent = ed.items.length
      ? plural(ed.items.length, 'mark') + ' on ' + plural(touched, 'page')
      : plural(ed.doc.numPages, 'page') + ' · nothing added yet';
  }

  /* --- items -------------------------------------------------------------- */

  function pageOf(index) {
    return ed.pages[index];
  }

  function itemNode(item) {
    return $('[data-item="' + item.id + '"]');
  }

  function itemById(id) {
    return ed.items.filter(function (candidate) {
      return String(candidate.id) === String(id);
    })[0];
  }

  /* contenteditable hands back non-breaking spaces; a standard PDF font has the
     glyph, but a plain space is what the user typed. */
  function readLines(node) {
    var text = node.innerText.replace(/\u00a0/g, ' ').replace(/\n$/, '');
    return text.length ? text.split('\n') : [''];
  }

  function placeAll() {
    ed.pages.forEach(function (page) {
      page.layer.textContent = '';
    });
    ed.items.forEach(function (item) {
      var page = pageOf(item.page);
      if (!page) return;
      page.layer.appendChild(buildItem(item));
    });
    if (ed.sel) select(ed.sel);
  }

  function buildItem(item) {
    var node = el('div', 'item item--' + (item.kind === 'rect' ? 'rect' : item.kind));
    node.dataset.item = String(item.id);

    if (item.kind === 'text') {
      node.textContent = item.lines.join('\n');
    } else if (item.kind === 'image') {
      var asset = ed.assets[item.asset];
      var img = el('img');
      img.src = asset ? asset.url : '';
      img.alt = '';
      img.draggable = false;
      node.appendChild(img);
    }

    var grab = el('span', 'item__grab');
    grab.dataset.grab = String(item.id);
    node.appendChild(grab);

    style(node, item);
    return node;
  }

  function style(node, item) {
    var z = ed.zoom;
    node.style.left = item.x * z + 'px';
    node.style.top = item.y * z + 'px';

    if (item.kind === 'text') {
      var face = CSS_FONTS[item.font] || CSS_FONTS.helvetica;
      node.style.fontFamily = face[0];
      node.style.fontWeight = String(face[1]);
      node.style.fontStyle = face[2];
      node.style.fontSize = item.size * z + 'px';
      node.style.lineHeight = String(LINE_HEIGHT);
      node.style.color = item.color;
      /* measured, not assumed — the selection box has to match the glyphs */
      item.w = node.offsetWidth / z;
      item.h = item.lines.length * item.size * LINE_HEIGHT;
      node.style.height = item.h * z + 'px';
    } else {
      node.style.width = item.w * z + 'px';
      node.style.height = item.h * z + 'px';
      if (item.kind === 'rect') node.style.background = item.fill;
      node.style.opacity = String(item.opacity == null ? 1 : item.opacity);
    }
  }

  function restyle(item) {
    var node = itemNode(item);
    if (node) style(node, item);
  }

  function pushHistory() {
    ed.history.push(JSON.stringify(ed.items));
    if (ed.history.length > 40) ed.history.shift();
  }

  function undo() {
    if (!ed.history.length) {
      say('Nothing left to undo.');
      return;
    }
    ed.items = JSON.parse(ed.history.pop());
    ed.sel = null;
    placeAll();
    paintInspector();
    paintReadout();
  }

  function add(item) {
    pushHistory();
    item.id = ++ed.seq;
    ed.items.push(item);
    var page = pageOf(item.page);
    var node = buildItem(item);
    page.layer.appendChild(node);
    style(node, item);
    select(item);
    paintReadout();
    return node;
  }

  function remove(item) {
    pushHistory();
    var at = ed.items.indexOf(item);
    if (at !== -1) ed.items.splice(at, 1);
    var node = itemNode(item);
    if (node) node.remove();
    if (ed.sel === item) {
      ed.sel = null;
      paintInspector();
    }
    paintReadout();
  }

  function select(item) {
    ed.sel = item || null;
    $$('.item').forEach(function (node) {
      node.classList.toggle('is-on', !!item && node.dataset.item === String(item.id));
    });
    paintInspector();
  }

  function kindKey(item) {
    return item.kind === 'rect' ? 'cover' : item.kind;
  }

  function paintInspector() {
    var item = ed.sel;
    ed.inspect.hidden = !item;
    if (!item) return;

    var key = kindKey(item);
    var titles = { text: 'Text', cover: 'Cover-up', image: 'Placed image' };
    $('#edKind').textContent = titles[key];

    $$('[data-for]', ed.inspect).forEach(function (field) {
      field.hidden = field.getAttribute('data-for').split(' ').indexOf(key) === -1;
    });

    if (item.kind === 'text') {
      $('#edText').value = item.lines.join('\n');
      $('#edFont').value = item.font;
      $('#edSize').value = String(item.size);
      $('#edSizeOut').value = String(item.size);
      $('#edColorLabel').textContent = 'Ink';
    }
    if (item.kind === 'rect') $('#edColorLabel').textContent = 'Fill';

    if (item.kind === 'rect' || item.kind === 'image') {
      $('#edOpacity').value = String(Math.round((item.opacity == null ? 1 : item.opacity) * 100));
      $('#edOpacityOut').value = $('#edOpacity').value;
    }

    var current = item.kind === 'rect' ? item.fill : item.color;
    if (current) $('#edColor').value = current;
    $$('.swatch', ed.inspect).forEach(function (swatch) {
      swatch.setAttribute(
        'aria-pressed',
        current && swatch.dataset.hex.toLowerCase() === String(current).toLowerCase()
          ? 'true'
          : 'false'
      );
    });

    $('#edPos').textContent =
      'x ' + Math.round(item.x) + ' · y ' + Math.round(item.y) + ' · ' +
      Math.round(item.w) + '×' + Math.round(item.h) + 'pt · page ' + (item.page + 1);
  }

  /* --- pointer work ------------------------------------------------------- */

  function pointOn(page, event) {
    var box = page.layer.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) / ed.zoom,
      y: (event.clientY - box.top) / ed.zoom
    };
  }

  function drag(event, item, mode) {
    var page = pageOf(item.page);
    var startX = event.clientX;
    var startY = event.clientY;
    var from = { x: item.x, y: item.y, w: item.w, h: item.h, size: item.size };
    var moved = false;
    var node = itemNode(item);

    function onMove(move) {
      var dx = (move.clientX - startX) / ed.zoom;
      var dy = (move.clientY - startY) / ed.zoom;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 1) {
        moved = true;
        pushHistory();
      }

      if (mode === 'move') {
        item.x = clamp(from.x + dx, -from.w + 8, page.w - 8);
        item.y = clamp(from.y + dy, -from.h + 8, page.h - 8);
      } else if (item.kind === 'text') {
        var factor = from.w > 2 ? (from.w + dx) / from.w : 1 + dx / 40;
        item.size = Math.round(clamp(from.size * factor, 4, 200));
      } else if (item.kind === 'image') {
        var width = clamp(from.w + dx, 12, page.w * 2);
        item.w = width;
        item.h = width / (from.w / from.h);
      } else {
        item.w = clamp(from.w + dx, 4, page.w * 2);
        item.h = clamp(from.h + dy, 4, page.h * 2);
      }

      style(node, item);
      paintInspector();
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      /* a resize that never moved should not leave an undo step behind */
      if (!moved) ed.history.pop();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function marquee(event, page, then) {
    var start = pointOn(page, event);
    var box = el('div', 'marquee');
    page.layer.appendChild(box);

    function onMove(move) {
      var now = pointOn(page, move);
      var x = Math.min(start.x, now.x);
      var y = Math.min(start.y, now.y);
      box.style.left = x * ed.zoom + 'px';
      box.style.top = y * ed.zoom + 'px';
      box.style.width = Math.abs(now.x - start.x) * ed.zoom + 'px';
      box.style.height = Math.abs(now.y - start.y) * ed.zoom + 'px';
    }

    function onUp(up) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      box.remove();
      var now = pointOn(page, up);
      var w = Math.abs(now.x - start.x);
      var h = Math.abs(now.y - start.y);
      /* a click, not a drag: give them a sensible default box */
      if (w < 6 || h < 6) {
        then({ x: start.x, y: start.y, w: 140, h: 20 });
        return;
      }
      then({ x: Math.min(start.x, now.x), y: Math.min(start.y, now.y), w: w, h: h });
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function newText(page, x, y, size) {
    return add({
      page: page.index,
      kind: 'text',
      x: x,
      y: y,
      w: 40,
      h: (size || 14) * LINE_HEIGHT,
      size: size || 14,
      font: $('#edFont').value || 'helvetica',
      color: '#000000',
      lines: ['Type here']
    });
  }

  function editText(item) {
    var node = itemNode(item);
    if (!node) return;
    node.setAttribute('contenteditable', 'plaintext-only');
    if (!node.isContentEditable) node.setAttribute('contenteditable', 'true');
    node.focus();
    var range = document.createRange();
    range.selectNodeContents(node);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function commitText(node) {
    var item = itemById(node.dataset.item);
    if (!item) return;
    item.lines = readLines(node);
    node.removeAttribute('contenteditable');
    node.textContent = item.lines.join('\n');
    if (!node.querySelector('.item__grab')) {
      var grab = el('span', 'item__grab');
      grab.dataset.grab = String(item.id);
      node.appendChild(grab);
    }
    style(node, item);
    if (!item.lines.join('').trim()) remove(item);
    else paintInspector();
  }

  var sweepEditor = throttle(sweepPages, 120);
  ed.stage.addEventListener('scroll', sweepEditor, { passive: true });
  window.addEventListener('scroll', sweepEditor, { passive: true });
  window.addEventListener('resize', sweepEditor);

  ed.stage.addEventListener('pointerdown', function (event) {
    var layer = event.target.closest('.layer');
    if (!layer) return;
    var page = pageOf(Number(layer.dataset.page));

    var grab = event.target.closest('[data-grab]');
    if (grab) {
      var held = itemById(grab.dataset.grab);
      if (held) {
        event.preventDefault();
        select(held);
        drag(event, held, 'resize');
      }
      return;
    }

    var hit = event.target.closest('.item');
    if (hit) {
      var item = itemById(hit.dataset.item);
      if (!item) return;
      if (hit.isContentEditable) return;
      event.preventDefault();
      select(item);
      drag(event, item, 'move');
      return;
    }

    var at = pointOn(page, event);

    if (ed.tool === 'select') {
      select(null);
      return;
    }

    if (ed.tool === 'text') {
      event.preventDefault();
      newText(page, at.x, at.y, Number($('#edSize').value) || 14);
      editText(ed.sel);
      return;
    }

    if (ed.tool === 'cover') {
      event.preventDefault();
      marquee(event, page, function (box) {
        add({
          page: page.index,
          kind: 'rect',
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          fill: '#ffffff',
          opacity: 1
        });
      });
      return;
    }

    if (ed.tool === 'retype') {
      event.preventDefault();
      marquee(event, page, function (box) {
        add({
          page: page.index,
          kind: 'rect',
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          fill: '#ffffff',
          opacity: 1
        });
        var size = Math.round(clamp(box.h * 0.68, 6, 72));
        add({
          page: page.index,
          kind: 'text',
          x: box.x + 1,
          y: box.y + (box.h - size * LINE_HEIGHT) / 2,
          w: 40,
          h: size * LINE_HEIGHT,
          size: size,
          font: $('#edFont').value || 'helvetica',
          color: '#000000',
          lines: ['New words']
        });
        editText(ed.sel);
      });
      return;
    }

    if (ed.tool === 'sign') {
      event.preventDefault();
      ed.pending = { page: page.index, x: at.x, y: at.y };
      openSign();
      return;
    }

    if (ed.tool === 'image') {
      event.preventDefault();
      ed.pending = { page: page.index, x: at.x, y: at.y };
      $('#imageInput').click();
    }
  });

  ed.stage.addEventListener('dblclick', function (event) {
    var hit = event.target.closest('.item--text');
    if (!hit) return;
    var item = itemById(hit.dataset.item);
    if (!item) return;
    pushHistory();
    select(item);
    editText(item);
  });

  /* Keep the model in step with every keystroke. Relying on focusout alone
     meant a text box could be exported with its placeholder if focus was
     never established or was lost in an unusual way. The DOM is deliberately
     left alone here — rewriting it would move the caret. */
  ed.stage.addEventListener('input', function (event) {
    var node = event.target;
    if (!node.classList || !node.classList.contains('item--text')) return;
    if (!node.isContentEditable) return;
    var item = itemById(node.dataset.item);
    if (!item) return;
    item.lines = readLines(node);
    item.w = node.offsetWidth / ed.zoom;
    item.h = item.lines.length * item.size * LINE_HEIGHT;
    $('#edText').value = item.lines.join('\n');
    $('#edPos').textContent =
      'x ' + Math.round(item.x) + ' · y ' + Math.round(item.y) + ' · ' +
      Math.round(item.w) + '×' + Math.round(item.h) + 'pt · page ' + (item.page + 1);
  });

  ed.stage.addEventListener('focusout', function (event) {
    if (event.target.classList && event.target.classList.contains('item--text') &&
      event.target.isContentEditable) {
      commitText(event.target);
    }
  });

  /* keep pasted text plain — a pasted <span> would not survive the export */
  ed.stage.addEventListener('paste', function (event) {
    if (!event.target.isContentEditable) return;
    event.preventDefault();
    var text = (event.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text.replace(/\r/g, ''));
  });

  /* --- tools -------------------------------------------------------------- */

  var HINTS = {
    select: 'Click a mark to move it. Drag the blue corner to resize. Double-click text to retype it.',
    text: 'Click anywhere on a page to start typing.',
    sign: 'Click where the signature should sit.',
    cover: 'Drag a box over anything you want hidden.',
    retype: 'Drag a box over the old words — you get a cover and a text box in one go.',
    image: 'Click where the image should sit, then pick a PNG or JPEG.'
  };

  function setTool(name) {
    ed.tool = name;
    $$('[data-tool]').forEach(function (button) {
      var on = button.getAttribute('data-tool') === name;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    ed.pages.forEach(function (page) {
      page.layer.dataset.tool = name;
    });
    $('#edHint').textContent = HINTS[name];
  }

  $$('[data-tool]').forEach(function (button) {
    button.addEventListener('click', function () {
      setTool(button.getAttribute('data-tool'));
    });
  });

  function setZoom(next) {
    ed.zoom = clamp(next, 0.5, 2);
    $('#edZoom').value = Math.round(ed.zoom * 100) + '%';
    paintEditor();
  }

  $('#edZoomIn').addEventListener('click', function () {
    setZoom(ed.zoom + 0.25);
  });
  $('#edZoomOut').addEventListener('click', function () {
    setZoom(ed.zoom - 0.25);
  });
  $('#edUndo').addEventListener('click', undo);

  /* --- inspector wiring --------------------------------------------------- */

  $('#edText').addEventListener('input', function () {
    if (!ed.sel || ed.sel.kind !== 'text') return;
    var text = this.value;
    ed.sel.lines = text.length ? text.split('\n') : [''];
    var node = itemNode(ed.sel);
    if (node) {
      node.textContent = ed.sel.lines.join('\n');
      var grab = el('span', 'item__grab');
      grab.dataset.grab = String(ed.sel.id);
      node.appendChild(grab);
      style(node, ed.sel);
    }
  });

  $('#edFont').addEventListener('change', function () {
    if (!ed.sel || ed.sel.kind !== 'text') return;
    pushHistory();
    ed.sel.font = this.value;
    restyle(ed.sel);
  });

  $('#edSize').addEventListener('input', function () {
    $('#edSizeOut').value = this.value;
    if (!ed.sel || ed.sel.kind !== 'text') return;
    ed.sel.size = Number(this.value);
    restyle(ed.sel);
    paintInspector();
  });

  $('#edOpacity').addEventListener('input', function () {
    $('#edOpacityOut').value = this.value;
    if (!ed.sel) return;
    ed.sel.opacity = Number(this.value) / 100;
    restyle(ed.sel);
  });

  var swatchBox = $('#edSwatches');
  SWATCHES.forEach(function (pair) {
    var swatch = el('button', 'swatch');
    swatch.type = 'button';
    swatch.dataset.hex = pair[0];
    swatch.style.background = pair[0];
    swatch.setAttribute('aria-label', pair[1]);
    swatch.setAttribute('aria-pressed', 'false');
    swatch.addEventListener('click', function () {
      applyColor(pair[0]);
    });
    swatchBox.appendChild(swatch);
  });

  $('#edColor').addEventListener('input', function () {
    applyColor(this.value);
  });

  function applyColor(hex) {
    if (!ed.sel) return;
    pushHistory();
    if (ed.sel.kind === 'rect') ed.sel.fill = hex;
    else ed.sel.color = hex;
    restyle(ed.sel);
    paintInspector();
  }

  $('#edDelete').addEventListener('click', function () {
    if (ed.sel) remove(ed.sel);
  });

  $('#edDuplicate').addEventListener('click', function () {
    if (!ed.sel) return;
    var copy = JSON.parse(JSON.stringify(ed.sel));
    copy.x += 12;
    copy.y += 12;
    add(copy);
  });

  $('#edClear').addEventListener('click', function () {
    ed.pages.forEach(releasePage);
    ed.file = null;
    ed.doc = null;
    ed.items = [];
    ed.pages = [];
    ed.sel = null;
    ed.stage.textContent = '';
    ed.inspect.hidden = true;
    ed.stage.scrollTop = 0;
    editorVisible();
    paintReadout();
    say('');
  });

  /* --- image placement ---------------------------------------------------- */

  $('#imageInput').addEventListener('change', async function () {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file || !ed.pending) return;
    try {
      var bytes = await readFile(file);
      var type = /png$/i.test(file.type) || /\.png$/i.test(file.name) ? 'png' : 'jpg';
      placeAsset(bytes, type, ed.pending);
      ed.pending = null;
      say('');
    } catch (error) {
      say(explain(error), 'error');
    }
  });

  function placeAsset(bytes, type, where) {
    var blob = new Blob([bytes], { type: type === 'png' ? 'image/png' : 'image/jpeg' });
    var url = URL.createObjectURL(blob);
    var image = new Image();
    image.onload = function () {
      var key = 'a' + ++ed.seq;
      ed.assets[key] = { data: bytes, type: type, url: url };
      var page = pageOf(where.page);
      /* screen pixels are 96dpi, PDF points are 72 — place at true size,
         capped so a phone photo does not land bigger than the page */
      var width = Math.min(image.naturalWidth * 0.75, page.w * 0.6);
      var height = width * (image.naturalHeight / image.naturalWidth);
      add({
        page: where.page,
        kind: 'image',
        asset: key,
        x: clamp(where.x - width / 2, 0, page.w - 8),
        y: clamp(where.y - height / 2, 0, page.h - 8),
        w: width,
        h: height,
        opacity: 1
      });
      setTool('select');
    };
    image.onerror = function () {
      say('That image could not be read.', 'error');
    };
    image.src = url;
  }

  /* --- keyboard ----------------------------------------------------------- */

  var SHORTCUTS = { v: 'select', t: 'text', s: 'sign', c: 'cover', r: 'retype', i: 'image' };

  document.addEventListener('keydown', function (event) {
    if ($('#signSheet').hidden === false) return;
    if (ed.work.hidden || $('#panel-editor').hidden) return;

    var target = event.target;
    var typing = target.matches('input, textarea, select') || target.isContentEditable;

    if (event.key === 'Escape') {
      if (target.isContentEditable) {
        commitText(target);
        ed.stage.focus();
        return;
      }
      select(null);
      return;
    }

    if (typing) return;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (SHORTCUTS[event.key.toLowerCase()]) {
      event.preventDefault();
      setTool(SHORTCUTS[event.key.toLowerCase()]);
      return;
    }

    if (!ed.sel) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      remove(ed.sel);
      return;
    }

    var step = event.shiftKey ? 10 : 1;
    var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step],
      ArrowDown: [0, step] };
    if (moves[event.key]) {
      event.preventDefault();
      pushHistory();
      ed.sel.x += moves[event.key][0];
      ed.sel.y += moves[event.key][1];
      restyle(ed.sel);
      paintInspector();
    }
  });

  /* --- export ------------------------------------------------------------- */

  $('#edGo').addEventListener('click', function () {
    var button = this;
    if (!ed.file) return;
    if (!ed.items.length) {
      say('Add some text or a signature first.', 'error');
      return;
    }
    /* a text box still being typed into has not been committed yet */
    var open = $('.item--text[contenteditable]');
    if (open) commitText(open);

    run(button, 'Writing the PDF', async function () {
      var byPage = {};
      ed.items.forEach(function (item) {
        (byPage[item.page] = byPage[item.page] || []).push(toOperation(item));
      });

      var edits = Object.keys(byPage).map(function (index) {
        return { page: Number(index), items: byPage[index] };
      });

      var result = await ops.applyEdits(ed.file.bytes, edits, { title: $('#edName').value });
      var name = safeName($('#edName').value, 'signed');
      download(result.bytes, name);

      var note = 'Saved ' + name + ' · ' + plural(ed.items.length, 'mark');
      if (result.substituted) {
        note += ' · ' + result.substituted +
          ' character(s) a standard PDF font cannot show were written as "?"';
      }
      return note;
    });
  });

  function toOperation(item) {
    if (item.kind === 'text') {
      return {
        kind: 'text',
        x: item.x,
        y: item.y,
        size: item.size,
        font: item.font,
        color: item.color,
        lineHeight: LINE_HEIGHT,
        lines: item.lines
      };
    }
    if (item.kind === 'rect') {
      return {
        kind: 'rect',
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
        fill: item.fill,
        opacity: item.opacity
      };
    }
    var asset = ed.assets[item.asset];
    return {
      kind: 'image',
      x: item.x,
      y: item.y,
      width: item.w,
      height: item.h,
      data: asset.data,
      type: asset.type,
      opacity: item.opacity
    };
  }

  /* --- signature capture -------------------------------------------------- */

  var SIGN_KEY = 'utpals.pdf.signature';

  var FACES = [
    ['Script', 'italic 150px "Snell Roundhand", "Brush Script MT", "Segoe Script", cursive'],
    ['Chancery', 'italic 140px "Apple Chancery", "Lucida Calligraphy", "Palatino Linotype", cursive'],
    ['Formal', 'italic 130px "Times New Roman", Times, serif']
  ];

  var sign = {
    sheet: $('#signSheet'),
    pad: $('#signPad'),
    mode: 'draw',
    face: 0,
    drawn: false,
    restore: null
  };

  var padCtx = sign.pad.getContext('2d');

  function padWipe() {
    padCtx.clearRect(0, 0, sign.pad.width, sign.pad.height);
    sign.drawn = false;
  }

  function padPoint(event) {
    var box = sign.pad.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * sign.pad.width,
      y: ((event.clientY - box.top) / box.height) * sign.pad.height
    };
  }

  /* Midpoint smoothing: a raw polyline from pointer events looks like a
     seismograph, which is not what a signature should look like. */
  sign.pad.addEventListener('pointerdown', function (event) {
    event.preventDefault();
    sign.pad.setPointerCapture(event.pointerId);
    var last = padPoint(event);
    var previous = last;
    sign.drawn = true;

    padCtx.lineCap = 'round';
    padCtx.lineJoin = 'round';
    padCtx.strokeStyle = '#000000';
    padCtx.lineWidth = 5;
    padCtx.beginPath();
    padCtx.moveTo(last.x, last.y);
    padCtx.lineTo(last.x + 0.1, last.y);
    padCtx.stroke();

    function onMove(move) {
      var now = padPoint(move);
      var mid = { x: (previous.x + now.x) / 2, y: (previous.y + now.y) / 2 };
      padCtx.beginPath();
      padCtx.moveTo(last.x, last.y);
      padCtx.quadraticCurveTo(previous.x, previous.y, mid.x, mid.y);
      padCtx.stroke();
      last = mid;
      previous = now;
    }

    function onUp() {
      sign.pad.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    sign.pad.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  var facesBox = $('#signFaces');

  FACES.forEach(function (face, index) {
    var button = el('button', 'face');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', index === 0 ? 'true' : 'false');
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    button.setAttribute('aria-label', face[0]);
    button.style.font = face[1].replace(/\d+px/, '30px');
    button.addEventListener('click', function () {
      sign.face = index;
      $$('.face', facesBox).forEach(function (other, i) {
        other.setAttribute('aria-pressed', i === index ? 'true' : 'false');
        other.setAttribute('aria-checked', i === index ? 'true' : 'false');
      });
    });
    facesBox.appendChild(button);
  });

  $('#signName').addEventListener('input', function () {
    var value = this.value;
    $$('.face', facesBox).forEach(function (button) {
      button.textContent = value;
    });
  });

  $$('[data-sign]').forEach(function (button) {
    button.addEventListener('click', function () {
      sign.mode = button.getAttribute('data-sign');
      $$('[data-sign]').forEach(function (other) {
        var on = other === button;
        other.classList.toggle('is-on', on);
        other.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      $$('.sign').forEach(function (pane) {
        pane.hidden = pane.getAttribute('data-pane') !== sign.mode;
      });
    });
  });

  function openSign() {
    sign.restore = document.activeElement;
    sign.sheet.hidden = false;

    /* offer back whatever they signed last time */
    if (!sign.drawn) {
      try {
        var stored = localStorage.getItem(SIGN_KEY);
        if (stored) {
          var image = new Image();
          image.onload = function () {
            var fit = Math.min(
              (sign.pad.width * 0.9) / image.width,
              (sign.pad.height * 0.9) / image.height
            );
            padCtx.drawImage(
              image,
              (sign.pad.width - image.width * fit) / 2,
              (sign.pad.height - image.height * fit) / 2,
              image.width * fit,
              image.height * fit
            );
            sign.drawn = true;
          };
          image.src = stored;
        }
      } catch (error) {
        /* private mode, or storage is off — no signature to restore */
      }
    }

    $('#signUse').focus();
  }

  function closeSign() {
    sign.sheet.hidden = true;
    if (sign.restore && sign.restore.focus) sign.restore.focus();
  }

  $('#signClose').addEventListener('click', closeSign);
  $('#signWipe').addEventListener('click', function () {
    if (sign.mode === 'draw') padWipe();
    else {
      $('#signName').value = '';
      $$('.face', facesBox).forEach(function (button) {
        button.textContent = '';
      });
    }
  });

  sign.sheet.addEventListener('pointerdown', function (event) {
    if (event.target === sign.sheet) closeSign();
  });

  document.addEventListener('keydown', function (event) {
    if (sign.sheet.hidden) return;
    if (event.key === 'Escape') closeSign();
  });

  /* Crop the transparent margin, otherwise the placed signature is mostly
     empty box and impossible to position. */
  function trim(source) {
    var ctx = source.getContext('2d');
    var pixels = ctx.getImageData(0, 0, source.width, source.height).data;
    var left = source.width;
    var top = source.height;
    var right = -1;
    var bottom = -1;

    for (var y = 0; y < source.height; y++) {
      for (var x = 0; x < source.width; x++) {
        if (pixels[(y * source.width + x) * 4 + 3] < 12) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }

    if (right < 0) return null;

    var pad = 6;
    left = Math.max(0, left - pad);
    top = Math.max(0, top - pad);
    right = Math.min(source.width - 1, right + pad);
    bottom = Math.min(source.height - 1, bottom + pad);

    var out = el('canvas');
    out.width = right - left + 1;
    out.height = bottom - top + 1;
    out.getContext('2d').drawImage(source, -left, -top);
    return out;
  }

  function renderTyped() {
    var text = $('#signName').value.trim();
    if (!text) return null;
    var face = FACES[sign.face][1];
    var measure = el('canvas').getContext('2d');
    measure.font = face;
    var width = Math.ceil(measure.measureText(text).width) + 60;
    var canvas = el('canvas');
    canvas.width = Math.max(80, width);
    canvas.height = 260;
    var ctx = canvas.getContext('2d');
    ctx.font = face;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, 30, 175);
    return trim(canvas);
  }

  $('#signUse').addEventListener('click', async function () {
    var source = sign.mode === 'draw' ? trim(sign.pad) : renderTyped();
    if (!source) {
      say(sign.mode === 'draw' ? 'Draw your signature first.' : 'Type a name first.', 'error');
      return;
    }

    if ($('#signRemember').checked) {
      try {
        localStorage.setItem(SIGN_KEY, source.toDataURL('image/png'));
      } catch (error) {
        /* nothing to do — the signature still gets placed */
      }
    }

    var bytes = await canvasBytes(source);
    var aspect = source.width / source.height;
    var where = ed.pending || { page: 0, x: 120, y: 120 };
    ed.pending = null;
    closeSign();

    var page = pageOf(where.page);
    var width = Math.min(170, page.w * 0.5);
    var height = width / aspect;
    var key = 'a' + ++ed.seq;
    ed.assets[key] = { data: bytes, type: 'png', url: URL.createObjectURL(
      new Blob([bytes], { type: 'image/png' })) };

    add({
      page: where.page,
      kind: 'image',
      asset: key,
      x: clamp(where.x - width / 2, 0, page.w - 8),
      y: clamp(where.y - height / 2, 0, page.h - 8),
      w: width,
      h: height,
      opacity: 1
    });

    setTool('select');
    say('Signature placed. Drag it into position, then apply.', 'done');
  });

  /* --- boot --------------------------------------------------------------- */

  window.addEventListener('beforeunload', function (event) {
    if (!ed.items.length) return;
    event.preventDefault();
    event.returnValue = '';
  });

  (function boot() {
    if (!window.PDFLib || !pdfjs || !ops) {
      setEngine('error', 'Engine failed to load');
      say(
        'The PDF engine could not be fetched. Check the connection and reload — once it is loaded, ' +
          'everything else runs offline.',
        'error'
      );
      $$('.drop').forEach(function (zone) {
        zone.style.opacity = '0.4';
        zone.style.pointerEvents = 'none';
      });
      return;
    }

    pdfjs.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    setEngine('ready', 'Local only');
    setTool('select');
    drawCollagePreview();
  })();
})();
