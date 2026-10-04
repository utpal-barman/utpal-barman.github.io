/* ==========================================================================
   utpals.com/tools/pdf — pdfops
   Every PDF operation the tool can perform, with no DOM and no UI state, so
   the same code path that runs in the browser can be exercised from node.
   Expects pdf-lib on the global object; the UI layer loads it, node injects it.
   ========================================================================== */

(function (root, factory) {
  root.PDFOps = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function L() {
    var l = root.PDFLib;
    if (!l) throw new Error('pdf-lib is not loaded');
    return l;
  }

  /* --- constants ---------------------------------------------------------- */

  var SHEETS = {
    a4: [595.28, 841.89],
    a3: [841.89, 1190.55],
    letter: [612, 792],
    legal: [612, 1008]
  };

  /* Layout per sheet. The default orientation is the one that wastes the least
     paper for portrait sources, which is what people actually feed a collage. */
  var GRIDS = {
    1: { cols: 1, rows: 1, orientation: 'portrait' },
    2: { cols: 2, rows: 1, orientation: 'landscape' },
    4: { cols: 2, rows: 2, orientation: 'portrait' },
    6: { cols: 2, rows: 3, orientation: 'portrait' },
    8: { cols: 2, rows: 4, orientation: 'portrait' },
    9: { cols: 3, rows: 3, orientation: 'portrait' }
  };

  var FONTS = {
    helvetica: 'Helvetica',
    'helvetica-bold': 'HelveticaBold',
    'helvetica-oblique': 'HelveticaOblique',
    times: 'TimesRoman',
    'times-bold': 'TimesRomanBold',
    'times-italic': 'TimesRomanItalic',
    courier: 'Courier',
    'courier-bold': 'CourierBold'
  };

  /* WinAnsi has no room for anything outside latin-1 plus a handful of
     punctuation. Substituting is better than throwing halfway through a save. */
  var EXTRA_GLYPHS = [
    0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2013, 0x2014, 0x2020,
    0x2021, 0x2022, 0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122, 0x0152,
    0x0153, 0x0160, 0x0161, 0x0178, 0x017d, 0x017e, 0x0192, 0x02c6, 0x02dc
  ];

  /* --- small helpers ------------------------------------------------------ */

  function seq(n, from) {
    var out = [];
    for (var i = 0; i < n; i++) out.push((from || 0) + i);
    return out;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function toBytes(input) {
    if (input instanceof Uint8Array) return input;
    if (input && input.buffer instanceof ArrayBuffer) return new Uint8Array(input.buffer);
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    throw new Error('expected bytes');
  }

  function hexToRgb(hex, fallback) {
    var rgb = L().rgb;
    var h = String(hex || '').trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return fallback || rgb(0, 0, 0);
    return rgb(
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    );
  }

  function sanitize(text) {
    var out = '';
    var dropped = 0;
    var str = String(text == null ? '' : text);
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if ((c >= 32 && c <= 126) || (c >= 160 && c <= 255) || EXTRA_GLYPHS.indexOf(c) !== -1) {
        out += str[i];
      } else if (c === 9) {
        out += '    ';
      } else {
        out += '?';
        dropped++;
      }
    }
    return { text: out, dropped: dropped };
  }

  function load(bytes) {
    return L().PDFDocument.load(toBytes(bytes), {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false
    });
  }

  function stamp(doc, title) {
    try {
      doc.setProducer('utpals.com/tools/pdf');
      doc.setCreator('utpals.com/tools/pdf');
      doc.setModificationDate(new Date());
      if (title) doc.setTitle(String(title));
    } catch (e) {
      /* metadata is a courtesy, never a reason to fail a save */
    }
  }

  /* Rotation lives in /Rotate, which pdf-lib's embedPage and drawPage both
     ignore — they work in unrotated user space. Given the box a page should
     visually occupy, this returns the anchor and angle that put it there. */
  function placeRotated(rotation, x0, y0, drawW, drawH) {
    var degrees = L().degrees;
    var rot = ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
    if (rot === 90) return { x: x0, y: y0 + drawH, rotate: degrees(-90) };
    if (rot === 180) return { x: x0 + drawW, y: y0 + drawH, rotate: degrees(180) };
    if (rot === 270) return { x: x0 + drawW, y: y0, rotate: degrees(90) };
    return { x: x0, y: y0, rotate: degrees(0) };
  }

  /* The size a page presents to a reader, which is the mediabox with its
     rotation applied. Every coordinate the UI hands back is in this space. */
  function visualSize(page) {
    var size = page.getSize();
    var rot = ((Math.round(page.getRotation().angle / 90) * 90) % 360 + 360) % 360;
    return rot % 180 === 0
      ? { width: size.width, height: size.height, rotation: rot }
      : { width: size.height, height: size.width, rotation: rot };
  }

  /* --- page ranges -------------------------------------------------------- */

  /* Accepts "1-3, 5, 9-", "-4", "all", "odd", "even". Returns 1-based pages in
     the order written, so "3,1" is also a reorder instruction. */
  function parseRanges(spec, count) {
    var text = String(spec == null ? '' : spec).trim().toLowerCase();
    if (!count || count < 1) return { pages: [], ranges: [], error: 'no pages' };

    if (!text || text === 'all' || text === '*') {
      return { pages: seq(count, 1), ranges: [[1, count]] };
    }
    if (text === 'odd' || text === 'even') {
      var want = text === 'odd' ? 1 : 0;
      var pages = seq(count, 1).filter(function (p) {
        return p % 2 === want;
      });
      return {
        pages: pages,
        ranges: pages.map(function (p) {
          return [p, p];
        })
      };
    }

    var parts = text.split(/[,;\s]+/).filter(Boolean);
    var ranges = [];
    var flat = [];

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      var single = /^(\d+)$/.exec(part);
      var span = /^(\d*)(?:-|–|—|\.\.|to)(\d*)$/.exec(part);
      var from, to;

      if (single) {
        from = to = parseInt(single[1], 10);
      } else if (span) {
        from = span[1] ? parseInt(span[1], 10) : 1;
        to = span[2] ? parseInt(span[2], 10) : count;
      } else {
        return { pages: [], ranges: [], error: '"' + part + '" is not a page or a range' };
      }

      if (!from || from > count || !to || to > count) {
        return {
          pages: [],
          ranges: [],
          error: '"' + part + '" is outside 1–' + count
        };
      }

      ranges.push([from, to]);
      if (from <= to) for (var p = from; p <= to; p++) flat.push(p);
      else for (var q = from; q >= to; q--) flat.push(q);
    }

    return { pages: flat, ranges: ranges };
  }

  /* --- merge -------------------------------------------------------------- */

  /* items: [{ bytes, pages? }] where pages is 1-based and optional. */
  async function merge(items, opts) {
    var options = opts || {};
    var out = await L().PDFDocument.create();

    for (var i = 0; i < items.length; i++) {
      var src = await load(items[i].bytes);
      var total = src.getPageCount();
      var wanted = items[i].pages && items[i].pages.length ? items[i].pages : seq(total, 1);
      var indices = wanted
        .map(function (p) {
          return p - 1;
        })
        .filter(function (idx) {
          return idx >= 0 && idx < total;
        });
      if (!indices.length) continue;
      var copied = await out.copyPages(src, indices);
      for (var c = 0; c < copied.length; c++) out.addPage(copied[c]);
    }

    if (out.getPageCount() === 0) throw new Error('nothing to merge');
    stamp(out, options.title);
    return out.save();
  }

  /* --- split -------------------------------------------------------------- */

  /* groups: [{ name, pages }] with 1-based pages. Returns [{ name, bytes }]. */
  async function split(bytes, groups) {
    var src = await load(bytes);
    var total = src.getPageCount();
    var out = [];

    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      var indices = group.pages
        .map(function (p) {
          return p - 1;
        })
        .filter(function (idx) {
          return idx >= 0 && idx < total;
        });
      if (!indices.length) continue;

      var doc = await L().PDFDocument.create();
      var copied = await doc.copyPages(src, indices);
      for (var c = 0; c < copied.length; c++) doc.addPage(copied[c]);
      stamp(doc, group.name);
      out.push({ name: group.name, pages: indices.length, bytes: await doc.save() });
    }

    if (!out.length) throw new Error('nothing to split');
    return out;
  }

  /* --- collage / n-up ----------------------------------------------------- */

  /* sources: [{ bytes, pages? }]. Lays every page of every source onto sheets
     of `perSheet` cells, scaled to fit and centred, reading order left to right. */
  async function collage(sources, opts) {
    var options = opts || {};
    var perSheet = GRIDS[options.perSheet] ? options.perSheet : 4;
    var grid = GRIDS[perSheet];
    var cols = grid.cols;
    var rows = grid.rows;

    var sheet = SHEETS[options.sheet] || SHEETS.a4;
    var orientation = options.orientation && options.orientation !== 'auto'
      ? options.orientation
      : grid.orientation;
    var sheetW = orientation === 'landscape' ? sheet[1] : sheet[0];
    var sheetH = orientation === 'landscape' ? sheet[0] : sheet[1];

    var margin = clamp(options.margin == null ? 24 : options.margin, 0, 120);
    var gap = clamp(options.gap == null ? 12 : options.gap, 0, 120);

    var innerW = sheetW - margin * 2 - gap * (cols - 1);
    var innerH = sheetH - margin * 2 - gap * (rows - 1);
    if (innerW <= 8 || innerH <= 8) throw new Error('margins leave no room for the pages');

    var cellW = innerW / cols;
    var cellH = innerH / rows;

    var out = await L().PDFDocument.create();
    var cells = [];

    /* Gather every requested page as an embeddable, in output order. */
    for (var s = 0; s < sources.length; s++) {
      var src = await load(sources[s].bytes);
      var total = src.getPageCount();
      var wanted = sources[s].pages && sources[s].pages.length
        ? sources[s].pages
        : seq(total, 1);
      var indices = wanted
        .map(function (p) {
          return p - 1;
        })
        .filter(function (idx) {
          return idx >= 0 && idx < total;
        });

      for (var i = 0; i < indices.length; i++) {
        var page = src.getPage(indices[i]);
        var vis = visualSize(page);
        cells.push({ embedded: await out.embedPage(page), visual: vis });
      }
    }

    if (!cells.length) throw new Error('no pages to lay out');

    var borderColor = hexToRgb(options.borderColor || '#c8c8c8');
    var sheetCount = Math.ceil(cells.length / perSheet);

    for (var n = 0; n < sheetCount; n++) {
      var target = out.addPage([sheetW, sheetH]);

      for (var c2 = 0; c2 < perSheet; c2++) {
        var cell = cells[n * perSheet + c2];
        var col = c2 % cols;
        var row = Math.floor(c2 / cols);
        var cellX = margin + col * (cellW + gap);
        var cellY = sheetH - margin - row * (cellH + gap) - cellH;

        if (options.border && (cell || options.borderEmpty)) {
          target.drawRectangle({
            x: cellX,
            y: cellY,
            width: cellW,
            height: cellH,
            borderColor: borderColor,
            borderWidth: 0.5
          });
        }
        if (!cell) continue;

        var scale = Math.min(cellW / cell.visual.width, cellH / cell.visual.height);
        var drawW = cell.visual.width * scale;
        var drawH = cell.visual.height * scale;
        var x0 = cellX + (cellW - drawW) / 2;
        var y0 = cellY + (cellH - drawH) / 2;
        var at = placeRotated(cell.visual.rotation, x0, y0, drawW, drawH);

        target.drawPage(cell.embedded, {
          x: at.x,
          y: at.y,
          rotate: at.rotate,
          xScale: scale,
          yScale: scale
        });
      }
    }

    stamp(out, options.title);
    return { bytes: await out.save(), sheets: sheetCount, placed: cells.length };
  }

  /* --- page operations ---------------------------------------------------- */

  /* order: [{ page, rotate }] with 1-based pages; omitted pages are dropped. */
  async function organize(bytes, order, opts) {
    var src = await load(bytes);
    var total = src.getPageCount();
    var out = await L().PDFDocument.create();
    var degrees = L().degrees;

    var valid = order.filter(function (entry) {
      return entry.page >= 1 && entry.page <= total;
    });
    if (!valid.length) throw new Error('every page was removed');

    var copied = await out.copyPages(
      src,
      valid.map(function (entry) {
        return entry.page - 1;
      })
    );

    for (var i = 0; i < copied.length; i++) {
      var page = copied[i];
      var turn = valid[i].rotate || 0;
      if (turn) page.setRotation(degrees((((page.getRotation().angle + turn) % 360) + 360) % 360));
      out.addPage(page);
    }

    stamp(out, (opts || {}).title);
    return out.save();
  }

  /* --- edits (text, signatures, covers, images) --------------------------- */

  /* edits: [{ page, items }] with 0-based page and items in visual points
     measured from the page's top-left corner:
       { kind:'text',  x, y, size, font, color, opacity, lineHeight, lines:[] }
       { kind:'rect',  x, y, width, height, fill, stroke, borderWidth, opacity }
       { kind:'image', x, y, width, height, data, type:'png'|'jpg', opacity }
     A page carrying /Rotate is rebuilt upright first, so callers never have to
     reason about rotation — everything below works in plain visual space. */
  async function applyEdits(bytes, edits, opts) {
    var options = opts || {};
    var doc = await load(bytes);
    var origin = await load(bytes); /* untouched source for re-embedding */
    var fontCache = {};
    var substituted = 0;

    async function getFont(name) {
      var key = FONTS[name] ? name : 'helvetica';
      if (!fontCache[key]) fontCache[key] = await doc.embedFont(L().StandardFonts[FONTS[key]]);
      return fontCache[key];
    }

    var byPage = {};
    for (var e = 0; e < edits.length; e++) {
      var edit = edits[e];
      if (!edit || !edit.items || !edit.items.length) continue;
      (byPage[edit.page] = byPage[edit.page] || []).push.apply(byPage[edit.page], edit.items);
    }

    var indices = Object.keys(byPage)
      .map(Number)
      .filter(function (i) {
        return i >= 0 && i < doc.getPageCount();
      })
      .sort(function (a, b) {
        return a - b;
      });

    for (var p = 0; p < indices.length; p++) {
      var index = indices[p];
      var page = doc.getPage(index);
      var vis = visualSize(page);

      /* Flatten rotation: draw the original upright onto a fresh page of the
         visual size, then swap it in. Only rotated pages pay this cost. */
      if (vis.rotation !== 0) {
        var embedded = await doc.embedPage(origin.getPage(index));
        var upright = doc.insertPage(index, [vis.width, vis.height]);
        var at = placeRotated(vis.rotation, 0, 0, vis.width, vis.height);
        upright.drawPage(embedded, { x: at.x, y: at.y, rotate: at.rotate });
        doc.removePage(index + 1);
        page = upright;
      }

      var H = vis.height;
      var items = byPage[index];

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var opacity = item.opacity == null ? 1 : clamp(item.opacity, 0, 1);

        if (item.kind === 'rect') {
          var spec = {
            x: item.x,
            y: H - item.y - item.height,
            width: item.width,
            height: item.height
          };
          if (item.fill) {
            spec.color = hexToRgb(item.fill);
            spec.opacity = opacity;
          }
          if (item.stroke) {
            spec.borderColor = hexToRgb(item.stroke);
            spec.borderWidth = item.borderWidth == null ? 1 : item.borderWidth;
            spec.borderOpacity = opacity;
          }
          if (!item.fill && !item.stroke) continue;
          page.drawRectangle(spec);
          continue;
        }

        if (item.kind === 'image') {
          var data = toBytes(item.data);
          var image = item.type === 'jpg' || item.type === 'jpeg'
            ? await doc.embedJpg(data)
            : await doc.embedPng(data);
          page.drawImage(image, {
            x: item.x,
            y: H - item.y - item.height,
            width: item.width,
            height: item.height,
            opacity: opacity
          });
          continue;
        }

        if (item.kind === 'text') {
          var font = await getFont(item.font);
          var size = item.size || 12;
          var lineHeight = size * (item.lineHeight || 1.25);
          var ascent = font.heightAtSize(size, { descender: false });
          var full = font.heightAtSize(size);
          /* half-leading, the same way a browser centres a line box */
          var lead = (lineHeight - full) / 2;
          var color = hexToRgb(item.color || '#000000');
          var lines = item.lines || String(item.text || '').split('\n');

          for (var l = 0; l < lines.length; l++) {
            var clean = sanitize(lines[l]);
            substituted += clean.dropped;
            if (!clean.text) continue;
            var fromTop = l * lineHeight + lead + ascent;
            page.drawText(clean.text, {
              x: item.x,
              y: H - item.y - fromTop,
              size: size,
              font: font,
              color: color,
              opacity: opacity
            });
          }
        }
      }
    }

    stamp(doc, options.title);
    return { bytes: await doc.save(), substituted: substituted };
  }

  /* --- inspect ------------------------------------------------------------ */

  async function inspect(bytes) {
    var doc = await load(bytes);
    return {
      pageCount: doc.getPageCount(),
      pages: doc.getPages().map(function (page, i) {
        var vis = visualSize(page);
        return { index: i, width: vis.width, height: vis.height, rotation: vis.rotation };
      })
    };
  }

  /* --- zip (store only) --------------------------------------------------- */

  /* A split of 40 pages is 40 downloads without this, and a compressor is a
     third dependency for files that are already compressed. Store-only it is. */
  var CRC_TABLE = null;

  function crcTable() {
    if (CRC_TABLE) return CRC_TABLE;
    CRC_TABLE = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
    return CRC_TABLE;
  }

  function crc32(data) {
    var table = crcTable();
    var c = 0xffffffff;
    for (var i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosStamp(date) {
    var d = date || new Date();
    var year = Math.max(1980, d.getFullYear());
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 128) bytes.push(c);
      else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
      else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
    }
    return new Uint8Array(bytes);
  }

  /* files: [{ name, bytes }] */
  function zip(files) {
    var stampAt = dosStamp();
    var entries = [];
    var localSize = 0;
    var centralSize = 0;

    for (var i = 0; i < files.length; i++) {
      var name = utf8(files[i].name);
      var data = toBytes(files[i].bytes);
      entries.push({ name: name, data: data, crc: crc32(data), offset: localSize });
      localSize += 30 + name.length + data.length;
      centralSize += 46 + name.length;
    }

    var out = new Uint8Array(localSize + centralSize + 22);
    var view = new DataView(out.buffer);
    var at = 0;

    function u16(v) {
      view.setUint16(at, v, true);
      at += 2;
    }
    function u32(v) {
      view.setUint32(at, v >>> 0, true);
      at += 4;
    }
    function raw(bytes) {
      out.set(bytes, at);
      at += bytes.length;
    }

    for (var e = 0; e < entries.length; e++) {
      var entry = entries[e];
      u32(0x04034b50);
      u16(20); /* version needed */
      u16(0x0800); /* utf-8 names */
      u16(0); /* stored */
      u16(stampAt.time);
      u16(stampAt.date);
      u32(entry.crc);
      u32(entry.data.length);
      u32(entry.data.length);
      u16(entry.name.length);
      u16(0);
      raw(entry.name);
      raw(entry.data);
    }

    var centralStart = at;

    for (var c = 0; c < entries.length; c++) {
      var item = entries[c];
      u32(0x02014b50);
      u16(20); /* version made by */
      u16(20); /* version needed */
      u16(0x0800);
      u16(0);
      u16(stampAt.time);
      u16(stampAt.date);
      u32(item.crc);
      u32(item.data.length);
      u32(item.data.length);
      u16(item.name.length);
      u16(0); /* extra */
      u16(0); /* comment */
      u16(0); /* disk */
      u16(0); /* internal attrs */
      u32(0); /* external attrs */
      u32(item.offset);
      raw(item.name);
    }

    /* measure before writing, the EOCD header advances `at` too */
    var centralLength = at - centralStart;

    u32(0x06054b50);
    u16(0);
    u16(0);
    u16(entries.length);
    u16(entries.length);
    u32(centralLength);
    u32(centralStart);
    u16(0);

    return out;
  }

  return {
    SHEETS: SHEETS,
    GRIDS: GRIDS,
    FONTS: FONTS,
    parseRanges: parseRanges,
    visualSize: visualSize,
    placeRotated: placeRotated,
    inspect: inspect,
    merge: merge,
    split: split,
    collage: collage,
    organize: organize,
    applyEdits: applyEdits,
    sanitize: sanitize,
    crc32: crc32,
    zip: zip
  };
});
