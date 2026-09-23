/* GA4 event instrumentation. Event reference: docs/analytics-events.md */
(function () {
  'use strict';

  // Single guarded entry point. No-ops silently if analytics is unavailable.
  // The mobile branch of the head snippet declares gtag() inside a callback, so
  // window.gtag is never global there; once that snippet has created dataLayer,
  // push exactly what gtag() would.
  function track(name, params) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params || {});
      } else if (Array.isArray(window.dataLayer)) {
        (function () { window.dataLayer.push(arguments); })('event', name, params || {});
      }
    } catch (e) { /* analytics must never break the page */ }
  }
  window.caffTrack = track; // consumed by calculator + tracker modules

  var fired = {};
  var body = document.body;
  var slug = body.dataset.postSlug || '';
  var FIRST_USE = 'caffcalc_first_use';

  // Local calendar day as YYYY-MM-DD.
  function isoDay() {
    var d = new Date();
    return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  }

  // --- Tracker ---------------------------------------------------------------
  // localStorage: caffcalc_first_use = "YYYY-MM-DD",
  //               caffcalc_entries   = "YYYY-MM-DD|<saves that day>"
  window.caffTrackerSave = function () {
    var day = isoDay(), n = 1;
    try {
      var ls = localStorage;
      if (!ls.getItem(FIRST_USE)) ls.setItem(FIRST_USE, day);
      var prev = (ls.getItem('caffcalc_entries') || '').split('|');
      if (prev[0] === day) n = (parseInt(prev[1], 10) || 0) + 1;
      ls.setItem('caffcalc_entries', day + '|' + n);
    } catch (e) {}
    track('tracker_entry_save', { entries_today: n });
  };

  // Once per browser session, on any page, for prior use on an earlier day.
  try {
    var days = Math.round((Date.parse(isoDay()) - Date.parse(localStorage.getItem(FIRST_USE))) / 864e5);
    if (days > 0 && !sessionStorage.getItem('caffcalc_return_sent')) {
      sessionStorage.setItem('caffcalc_return_sent', '1');
      track('tracker_return', { days_since_first_use: days });
    }
  } catch (e) {}

  // --- Calculator start ------------------------------------------------------
  // Posts live at /YYYY/MM/DD/slug/, the blog index at /blog/ and /blog/page/N/.
  function entryPoint() {
    try {
      var ref = new URL(document.referrer);
      if (ref.hostname === location.hostname) {
        if (/^\/(blog(\/|$)|\d{4}\/\d\d\/\d\d\/)/.test(ref.pathname)) return 'blog';
        if (/^\/caffeine-in(\/|$)/.test(ref.pathname)) return 'drinks';
        if (ref.pathname === '/') return 'home';
      }
    } catch (e) {}
    return 'direct';
  }

  var calc = document.querySelector('.calculator-layout');
  if (calc) {
    var onStart = function (e) {
      if (fired.start || (e.type === 'click' && !e.target.closest('button, .custom-select-option'))) return;
      fired.start = true;
      track('calc_start', { entry_point: entryPoint() });
    };
    // Capture phase: some calculator handlers stop propagation.
    ['click', 'input', 'change'].forEach(function (t) { calc.addEventListener(t, onStart, true); });
  }

  // --- Half-life calculator start -------------------------------------------
  // The tool recomputes on every input, so there is no "calculate" click to
  // hook; first interaction is the start. The first result a user settles on
  // is sent as hl_complete from half-life.js.
  var hlTool = document.querySelector('.half-life-tool');
  if (hlTool) {
    var onHlStart = function (e) {
      if (fired.hlStart || (e.type === 'click' && !e.target.closest('button, .custom-select-option'))) return;
      fired.hlStart = true;
      track('hl_start', { entry_point: entryPoint() });
    };
    ['click', 'input', 'change'].forEach(function (t) { hlTool.addEventListener(t, onHlStart, true); });
  }

  // --- Delegated click tracking ---------------------------------------------
  // Markup: <a data-ga-event="blog_to_calc_click" data-ga-params='{"source_post":"x"}'>
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-ga-event]');
    if (!el) return;
    var params = {};
    try { params = JSON.parse(el.dataset.gaParams || '{}'); } catch (err) {}
    track(el.dataset.gaEvent, params);
  });

  // --- Links inside post body: calculator links + citations -----------------
  var postBody = slug && document.querySelector('.blog-content');
  if (postBody) {
    postBody.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.hasAttribute('data-ga-event')) return;
      if (a.hostname === location.hostname) {
        if (a.pathname === '/') track('blog_to_calc_click', { source_post: slug });
      } else if (/^https?:$/.test(a.protocol)) {
        track('citation_click', { domain: a.hostname });
      }
    });
  }

  // --- External source/citation links outside post bodies -------------------
  // Same event as post-body citations (hostname only, no path). Scopes:
  // homepage cards, .content-page wrappers (half-life + info pages + the
  // /caffeine-in/ hub), and every drink detail page (its .main-content).
  var citeScopes = ['.home-content', '.content-page'];
  if (document.querySelector('.caffeine-in-headline')) citeScopes.push('.main-content');
  citeScopes.forEach(function (sel) {
    var scope = document.querySelector(sel);
    if (!scope) return;
    scope.addEventListener('click', function (e) {
      // One click can bubble through nested scopes (.home-content sits inside
      // .content-page on the homepage); count it once.
      if (e.caffCiteSeen) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.hasAttribute('data-ga-event')) return;
      if (a.hostname !== location.hostname && /^https?:$/.test(a.protocol)) {
        e.caffCiteSeen = true;
        track('citation_click', { domain: a.hostname });
      }
    });
  });

  // --- Scroll depth + read_complete -----------------------------------------
  var docHeight = body.scrollHeight;
  var ticking = false;
  var engaged = 0;
  var shownAt = document.hidden ? 0 : Date.now();
  var readTimer;

  function measure() { docHeight = body.scrollHeight; }
  addEventListener('resize', measure, { passive: true });

  // read_complete needs 45s of visible-tab time; re-checks by timer so a reader
  // who stops scrolling after 75% still counts.
  function checkRead() {
    if (fired.read || document.hidden) return;
    var left = 45000 - engaged - (Date.now() - shownAt);
    clearTimeout(readTimer);
    if (left > 0) {
      readTimer = setTimeout(checkRead, left);
    } else {
      fired.read = true;
      track('read_complete', { post_slug: slug });
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (shownAt) engaged += Date.now() - shownAt;
      shownAt = 0;
    } else {
      shownAt = Date.now();
      if (fired.r75) checkRead();
    }
  });

  function onScroll() {
    var pct = Math.round((scrollY + innerHeight) / docHeight * 100);
    [25, 50, 75, 100].forEach(function (t) {
      if (pct >= t && !fired['s' + t]) {
        fired['s' + t] = true;
        track('scroll_depth', { percent: t });
      }
    });
    if (slug && pct >= 75 && !fired.r75) {
      fired.r75 = true;
      checkRead();
    }
    ticking = false;
  }

  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  // --- Web Vitals (and re-measure once images have loaded) ------------------
  addEventListener('load', function () {
    measure();
    if (!window.webVitals) return;
    var send = function (m) {
      track('web_vitals', {
        metric_name: m.name,
        value: m.name === 'CLS' ? Math.round(m.value * 1000) : Math.round(m.value)
      });
    };
    ['onCLS', 'onLCP', 'onINP'].forEach(function (fn) {
      if (window.webVitals[fn]) window.webVitals[fn](send);
    });
  });
})();
