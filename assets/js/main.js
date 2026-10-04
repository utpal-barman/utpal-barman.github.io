/* ==========================================================================
   utpals.com — "trace"
   Vanilla. No dependencies. Spec: .claude/skills/brand-system/SKILL.md

   1 setup               5 lens
   2 nav and menu        6 scroll spy
   3 scroll state        7 reveal
   4 liquid glass        8 live duration
   ========================================================================== */

(function () {
  'use strict';

  /* --- 1. setup ----------------------------------------------------------- */

  document.documentElement.classList.add('js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia('(max-width: 860px)');

  var nav = document.getElementById('nav');
  var navInner = nav.querySelector('.nav__inner');
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');

  /* --- 2. nav and menu ---------------------------------------------------- */

  function closeMenu() {
    links.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }

  function openMenu() {
    links.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
  }

  if (mobile.matches) closeMenu();

  toggle.addEventListener('click', function () {
    if (toggle.getAttribute('aria-expanded') === 'true') closeMenu();
    else openMenu();
  });

  links.addEventListener('click', function (e) {
    if (e.target.closest('a') && mobile.matches) closeMenu();
  });

  mobile.addEventListener('change', function (e) {
    if (e.matches) closeMenu();
    else links.hidden = false;
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });

  /* --- 3. scroll state and brand reveal ----------------------------------- */

  function onScroll() {
    nav.setAttribute('data-scrolled', window.scrollY > 12 ? 'true' : 'false');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* The nav carries the name only once the hero's h1 has left the viewport,
     so the two are never on screen together. */
  var heroTitle = document.querySelector('.hero__title');
  if (heroTitle && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        nav.setAttribute('data-brand', entries[0].isIntersecting ? 'hide' : 'show');
      },
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 }
    ).observe(heroTitle);
  } else {
    nav.setAttribute('data-brand', 'show');
  }

  /* --- 4. liquid glass ---------------------------------------------------- */

  /* the specular highlight tracks the pointer across the glass */
  var navInner = nav.querySelector('.nav__inner');
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    navInner.addEventListener('pointermove', function (e) {
      var box = navInner.getBoundingClientRect();
      navInner.style.setProperty('--mx', e.clientX - box.left + 'px');
    });
    navInner.addEventListener('pointerleave', function () {
      navInner.style.removeProperty('--mx');
    });
  }

  /* Chromium can run an SVG filter as a backdrop-filter, so there the capsule
     really bends the page behind it: a displacement map, strongest at the rim
     and pointing inward, makes content curve at the edges like a drop of
     liquid on the screen, with a slight colour split. Other browsers keep the
     frosted glass from the CSS. The map is rebuilt whenever the capsule's size
     changes. */
  var liquidOK =
    !!(navigator.userAgentData && navigator.userAgentData.brands) &&
    navigator.userAgentData.brands.some(function (b) { return /Chromium/.test(b.brand); });

  var SVGNS = 'http://www.w3.org/2000/svg';
  var liquidSvg, liquidKey = '';

  function displacementMap(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h);
    var r = h / 2;
    var zone = Math.min(22, r);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var cx = Math.min(Math.max(x + 0.5, r), w - r);
        var dx = x + 0.5 - cx;
        var dy = y + 0.5 - r;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var inside = r - dist;
        var nx = 0, ny = 0;
        if (inside > 0 && inside < zone) {
          var k = 1 - inside / zone;
          var mag = k * k * k;
          nx = -(dx / dist) * mag;
          ny = -(dy / dist) * mag;
        }
        var i = (y * w + x) * 4;
        img.data[i] = 128 + nx * 127;
        img.data[i + 1] = 128 + ny * 127;
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    for (var a in attrs) n.setAttribute(a, attrs[a]);
    return n;
  }

  function buildLiquid() {
    if (!liquidOK || nav.getAttribute('data-scrolled') !== 'true') return;
    var w = Math.round(navInner.offsetWidth);
    var h = Math.round(navInner.offsetHeight);
    if (!w || !h || w + 'x' + h === liquidKey) return;
    liquidKey = w + 'x' + h;

    var filter = el('filter', {
      id: 'liquid-glass',
      x: 0, y: 0, width: w, height: h,
      filterUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB'
    });
    filter.appendChild(el('feImage', { href: displacementMap(w, h), x: 0, y: 0, width: w, height: h, result: 'map' }));
    /* one displacement per channel, each a little stronger: the colour fringe */
    [['R', 44, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
     ['G', 40, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
     ['B', 36, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']].forEach(function (ch) {
      filter.appendChild(el('feDisplacementMap', {
        in: 'SourceGraphic', in2: 'map', scale: ch[1],
        xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + ch[0]
      }));
      filter.appendChild(el('feColorMatrix', { in: 'd' + ch[0], type: 'matrix', values: ch[2], result: 'c' + ch[0] }));
    });
    filter.appendChild(el('feBlend', { in: 'cR', in2: 'cG', mode: 'screen', result: 'rg' }));
    filter.appendChild(el('feBlend', { in: 'rg', in2: 'cB', mode: 'screen' }));

    if (!liquidSvg) {
      liquidSvg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
      liquidSvg.style.position = 'absolute';
      document.body.appendChild(liquidSvg);
    }
    liquidSvg.replaceChildren(filter);
    document.documentElement.classList.add('liquid');
  }

  if (liquidOK) {
    /* the capsule animates its size for --t-reveal; build once it settles */
    navInner.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'max-width' || e.propertyName === 'height') buildLiquid();
    });
    window.addEventListener('scroll', buildLiquid, { passive: true });
    window.addEventListener('resize', buildLiquid, { passive: true });
    buildLiquid();
  }

  /* --- 5. lens ------------------------------------------------------------ */
  /* a lens of brighter glass slides under the current link (desktop only;
     the mobile menu highlights the row instead, in CSS) */

  var lens = document.createElement('span');
  lens.className = 'nav__lens';
  lens.setAttribute('aria-hidden', 'true');
  links.insertBefore(lens, links.firstChild);

  var LEAD = '360ms cubic-bezier(0.3, 0.7, 0.2, 1)';
  var TRAIL = '600ms cubic-bezier(0.55, 0, 0.2, 1) 40ms';
  var lensLeft = null;

  function placeLens() {
    var current = links.querySelector('.nav__link[aria-current="true"]');
    if (!current || mobile.matches) {
      lens.removeAttribute('data-on');
      return;
    }
    var left = current.offsetLeft;
    var right = links.clientWidth - (left + current.offsetWidth);
    var moving = lens.getAttribute('data-on') === 'true' && lensLeft !== null && left !== lensLeft;

    if (moving && !reduced) {
      /* the edge facing the new link leads, the other one trails */
      var toRight = left > lensLeft;
      lens.style.transition =
        (toRight ? 'right ' + LEAD + ', left ' + TRAIL : 'left ' + LEAD + ', right ' + TRAIL) +
        ', opacity 180ms ease';
      lens.classList.remove('is-flowing');
      void lens.offsetWidth;
      lens.classList.add('is-flowing');
    } else {
      lens.style.transition = 'opacity 180ms ease';
    }

    lens.style.left = left + 'px';
    lens.style.right = right + 'px';
    lens.setAttribute('data-on', 'true');
    lensLeft = left;
  }

  window.addEventListener('resize', placeLens, { passive: true });

  /* --- 6. scroll spy ------------------------------------------------------ */

  var navLinks = Array.prototype.slice.call(links.querySelectorAll('.nav__link'));
  var watched = navLinks
    .map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    })
    .filter(Boolean);
  /* the hero has no link, so reaching it clears the highlight */
  var hero = document.getElementById('home');
  if (hero) watched.push(hero);

  if ('IntersectionObserver' in window && watched.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (a) {
            var on = a.getAttribute('href') === '#' + entry.target.id;
            if (on) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
          placeLens();
        });
      },
      { rootMargin: '-64px 0px -60% 0px', threshold: 0 }
    );
    watched.forEach(function (s) {
      spy.observe(s);
    });
  }

  /* --- 7. reveal ---------------------------------------------------------- */

  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) {
      el.classList.add('is-revealed');
    });
  } else {
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  }

  /* --- 8. live duration --------------------------------------------------- */
  /* The current role counts its own length from its start date, so the page
     never goes stale. */

  var NOW = new Date();

  function monthsBetween(a, b) {
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }

  function humanDuration(m) {
    var y = Math.floor(m / 12);
    var mo = m % 12;
    if (!y) return mo + 'm';
    return y + 'y ' + mo + 'm';
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-live-duration]'), function (live) {
    var role = live.closest('li');
    var startEl = role && role.querySelector('time[data-start]');
    if (!startEl) return;
    var parts = startEl.getAttribute('datetime').split('-');
    var start = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    live.textContent = 'Present · ' + humanDuration(monthsBetween(start, NOW) + 1);
  });

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(NOW.getFullYear());

})();
