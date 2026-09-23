// "How many can I have?" box on /caffeine-in/:slug/ pages (task C13).
//
// Uses the same limit as the calculator: script.js restores the visitor's
// saved calculator settings into `user`, and calculateCaffeineLimit() turns
// them into mg. Without saved settings the limit is the 400 mg FDA figure the
// page renders server-side. Runs on `load` because this file precedes
// script.js in the document, and script.js restores settings on DOMContentLoaded.
(function () {
  var PREFS_KEY = 'caffeineCalculatorPreferences';
  var EFSA_URL = 'https://www.efsa.europa.eu/en/efsajournal/pub/4102';

  function hasSavedSettings() {
    try {
      return !!localStorage.getItem(PREFS_KEY);
    } catch (e) {
      return false;
    }
  }

  function personalLimit(fallback) {
    if (!hasSavedSettings() || typeof calculateCaffeineLimit !== 'function') return null;
    var limit = Math.round(calculateCaffeineLimit());
    return isFinite(limit) ? limit : fallback;
  }

  // Keep in step with the server-rendered sentence in _layouts/caffeine-in.html
  function describe(mg, limit, ranged) {
    if (limit === 0) return 'Your calculator settings give a limit of 0 mg, the level set for children under 13.';
    if (mg === 0) return 'No caffeine: this size does not count toward your limit.';
    var n = Math.floor(limit / mg);
    var rest = limit - n * mg;
    var text;
    if (n === 0) {
      text = 'One serving of this size (' + mg + ' mg) is already over your ' + limit + ' mg limit.';
    } else {
      text = n + ' serving' + (n > 1 ? 's' : '') + ' of this size fit' + (n === 1 ? 's' : '') + ' under a ' +
        limit + ' mg day (' + n * mg + ' mg),' +
        (rest === 0 ? ' using the whole allowance.' : ' leaving ' + rest + ' mg for anything else.');
    }
    if (ranged) text += ' This counts the top of the published range.';
    return text;
  }

  function init() {
    var box = document.querySelector('.how-many');
    if (!box) return;
    var result = box.querySelector('.how-many-result');
    var basis = box.querySelector('.how-many-basis');
    var buttons = box.querySelectorAll('.how-many-sizes button');
    var cap = Number(box.dataset.dailyCap);
    var mine = personalLimit(cap);
    var limit = mine === null ? cap : mine;

    if (mine !== null) {
      basis.textContent = 'Based on your saved calculator settings: ' + limit + ' mg a day.';
    }

    function show(button) {
      buttons.forEach(function (b) {
        b.classList.toggle('active', b === button);
        b.setAttribute('aria-pressed', b === button ? 'true' : 'false');
      });
      var mg = Number(button.dataset.mg);
      result.textContent = describe(mg, limit, button.dataset.ranged === 'true');
      if (mg > 200) {
        var note = document.createElement('span');
        note.innerHTML = ' One serving is above the 200 mg single dose ' +
          '<a href="' + EFSA_URL + '" target="_blank" rel="noopener">EFSA</a> assesses as safe for healthy adults.';
        result.appendChild(note);
      }
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        show(b);
        // /caffeine-in/<slug>/ — the slug is page content, not user input
        var m = location.pathname.match(/\/caffeine-in\/([^/]+)\//);
        if (typeof trackEvent === 'function' && m) {
          trackEvent('drink_size_pick', { drink: m[1], mg: Number(b.dataset.mg) });
        }
      });
    });
    var active = box.querySelector('.how-many-sizes button.active') || buttons[0];
    if (active) show(active);
  }

  window.addEventListener('load', init);
})();
