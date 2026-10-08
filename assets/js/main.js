/* ==========================================================================
   utpals.com — "trace"
   Vanilla. One vendored library, liquidGL, loaded on idle. Spec: .claude/skills/brand-system/SKILL.md

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
    nav.setAttribute('data-menu', 'closed');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }

  function openMenu() {
    links.hidden = false;
    nav.setAttribute('data-menu', 'open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    fitMenuGlass();
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
    else {
      links.hidden = false;
      nav.setAttribute('data-menu', 'closed');
    }
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

  /* Real liquid glass from liquidGL (naughtyduk/liquidGL, MIT, vendored in
     assets/js/vendor): the capsule refracts the page through a bevelled rim
     with a moving specular sheen, rendered in WebGPU or WebGL. It draws into a
     canvas inside the nav and hides its target, so the target is an empty pane
     behind the links, which stay ordinary DOM. The library rasterises the page
     into a texture, so it loads only once the page is idle and only where a GPU
     context exists; everywhere else the frosted glass from the CSS stays. */
  var root = document.documentElement;
  var pane = document.createElement('span');
  pane.className = 'nav__glass';
  pane.setAttribute('aria-hidden', 'true');
  navInner.insertBefore(pane, navInner.firstChild);

  /* The open mobile menu is a second lens on the same canvas. Its pane sits
     directly under .nav, so both lenses share one renderer and one snapshot,
     and main.js lays it over the menu each time the menu opens. */
  var menuPane = document.createElement('span');
  menuPane.className = 'nav__menu-glass';
  menuPane.setAttribute('aria-hidden', 'true');
  nav.appendChild(menuPane);

  function fitMenuGlass() {
    if (!menuPane || links.hidden) return;
    var box = links.getBoundingClientRect();
    menuPane.style.top = box.top + 'px';
    menuPane.style.left = box.left + 'px';
    menuPane.style.width = box.width + 'px';
    menuPane.style.height = box.height + 'px';
  }
  window.addEventListener('resize', fitMenuGlass, { passive: true });

  function hasGPU() {
    if ('gpu' in navigator) return true;
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }

  /* The texture is a still of the page, so it must show the page as it will
     be read: sections waiting to reveal are drawn visible for the capture,
     then drop back to hidden at once rather than fading out. */
  function beginSnap() { root.classList.add('glass-snap'); }

  function endSnap() {
    if (!root.classList.contains('glass-snap')) return;
    root.classList.add('glass-settle');
    root.classList.remove('glass-snap');
    void root.offsetWidth;
    root.classList.remove('glass-settle');
  }

  function snapshotRevealed(renderer) {
    var capture = renderer.captureSnapshot.bind(renderer);
    renderer.captureSnapshot = function () {
      beginSnap();
      return Promise.resolve(capture()).then(function (ok) {
        endSnap();
        return ok;
      });
    };
  }

  /* lazy images arrive after the capture; take a fresh one once they land */
  function recaptureOnImages(renderer) {
    var timer;
    function recapture() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (renderer._capturing) return recapture();
        renderer.captureSnapshot();
      }, 400);
    }
    Array.prototype.forEach.call(document.querySelectorAll('img[loading="lazy"]'), function (img) {
      if (!img.complete) img.addEventListener('load', recapture, { once: true });
    });
  }

  function startGlass() {
    if (typeof window.liquidGL !== 'function') return;
    beginSnap();
    var glass = window.liquidGL({
      target: '.nav__glass',
      content: false,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      refraction: 0.008,
      aberration: 0.2,
      bevelDepth: 0.085,
      bevelWidth: 0.24,
      frost: 0,
      shadow: false,
      specular: !reduced,
      reveal: 'none',
      interaction: reduced ? 'none' : 'fluid',
      interactionStrength: 0.35,
      interactionRadius: 0.6,
      interactionViscosity: 0.7,
      tint: getComputedStyle(root).getPropertyValue('--glass-dye').trim(),
      on: {
        init: function (lens) {
          endSnap();
          if (!lens.renderer) return;
          snapshotRevealed(lens.renderer);
          recaptureOnImages(lens.renderer);
          /* the capsule animates its size; settle the lens on the final box */
          navInner.addEventListener('transitionend', function () {
            lens.updateMetrics();
            lens.renderer.render();
          });
          root.classList.add('liquid');
        }
      }
    });
    /* the menu is a tall pane of busy rows: a narrow rim and a denser dye */
    window.liquidGL({
      target: '.nav__menu-glass',
      content: false,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      refraction: 0.008,
      aberration: 0.15,
      bevelDepth: 0.06,
      bevelWidth: 0.08,
      frost: 0,
      shadow: false,
      specular: !reduced,
      reveal: 'none',
      interaction: reduced ? 'none' : 'fluid',
      interactionStrength: 0.3,
      interactionRadius: 0.35,
      interactionViscosity: 0.7,
      tint: getComputedStyle(root).getPropertyValue('--glass-dye-menu').trim()
    });
    if (!glass || !glass.renderer) endSnap();
    /* if the GPU backend fails quietly, init never fires: end the capture anyway */
    setTimeout(endSnap, 4000);
  }

  function loadGlass() {
    var s = document.createElement('script');
    s.src = './assets/js/vendor/liquidGL.js?v=3.0.0';
    s.onload = startGlass;
    document.head.appendChild(s);
  }

  if (hasGPU() && !(navigator.connection && navigator.connection.saveData)) {
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); };
    var whenIdle = function () { idle(loadGlass, { timeout: 3000 }); };
    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle, { once: true });
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
