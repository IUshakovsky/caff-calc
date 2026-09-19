// Caffeine half-life calculator (task C14), /half-life/.
//
// Model: the dose is treated as absorbed at once and cleared by first-order
// (exponential) decay, remaining = dose * 0.5^(hours / halfLife). The pure
// functions are exported for Node so scripts/check-half-life.js can verify the
// maths without a browser.
(function (root) {
  'use strict';

  // Single dose EFSA says may affect sleep in some adults close to bedtime:
  // 100 mg, "about 1.4 mg/kg bw" (efsa.europa.eu/en/topics/topic/caffeine)
  var SLEEP_MG_PER_KG = 1.4;
  var SLEEP_MG_DEFAULT = 100;
  // Drake et al. 2013: refrain from substantial caffeine for at least 6 h before bed
  var MIN_GAP_HOURS = 6;

  function remaining(doseMg, hours, halfLife) {
    return doseMg * Math.pow(0.5, hours / halfLife);
  }

  // Minutes since midnight from "HH:MM"
  function toMinutes(hhmm) {
    var parts = String(hhmm).split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  // Hours from one clock time to the next occurrence of another (bedtime after
  // midnight counts as the next day)
  function hoursUntil(fromHHMM, toHHMM) {
    return (((toMinutes(toHHMM) - toMinutes(fromHHMM)) % 1440) + 1440) % 1440 / 60;
  }

  function sleepThreshold(weightKg) {
    return weightKg > 0 ? SLEEP_MG_PER_KG * weightKg : SLEEP_MG_DEFAULT;
  }

  function hoursToFallBelow(doseMg, thresholdMg, halfLife) {
    return doseMg <= thresholdMg ? 0 : halfLife * Math.log2(doseMg / thresholdMg);
  }

  // Latest clock time (minutes since midnight) to have this dose before bed:
  // the earlier of Drake's 6-hour gap and the time the dose needs to fall below
  // the sleep threshold. Doses already below the threshold get no cut-off.
  function cutoff(bedtimeHHMM, doseMg, thresholdMg, halfLife) {
    if (doseMg <= thresholdMg) return null;
    var decayHours = hoursToFallBelow(doseMg, thresholdMg, halfLife);
    var gapHours = Math.max(MIN_GAP_HOURS, decayHours);
    return {
      minutes: ((toMinutes(bedtimeHHMM) - Math.round(gapHours * 60)) % 1440 + 1440) % 1440,
      gapHours: gapHours,
      rule: decayHours > MIN_GAP_HOURS ? 'threshold' : 'six-hours'
    };
  }

  var model = {
    remaining: remaining,
    toMinutes: toMinutes,
    hoursUntil: hoursUntil,
    sleepThreshold: sleepThreshold,
    hoursToFallBelow: hoursToFallBelow,
    cutoff: cutoff,
    SLEEP_MG_DEFAULT: SLEEP_MG_DEFAULT,
    MIN_GAP_HOURS: MIN_GAP_HOURS
  };

  if (typeof module === 'object' && module.exports) module.exports = model;
  root.CaffHalfLife = model;
})(typeof window !== 'undefined' ? window : this);

// UI. The drink and size dropdowns are the main calculator's
// (renderBeverageOptions, renderSizeOptions and initSelectDropdown in script.js,
// which loads on every page and has run by DOMContentLoaded).
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var M = window.CaffHalfLife;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var PREFS_KEY = 'caffeineCalculatorPreferences';
  var beverages = {};
  var selected = { slug: null, size: 0 };
  var els = {};

  function $(id) { return document.getElementById(id); }

  function clock(minutes) {
    var m = ((Math.round(minutes) % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm + (h < 12 ? ' am' : ' pm');
  }

  function hoursText(h) {
    var whole = Math.floor(h), mins = Math.round((h - whole) * 60);
    if (mins === 60) { whole += 1; mins = 0; }
    return whole + ' h' + (mins ? ' ' + mins + ' min' : '');
  }

  function selectSize(index, text) {
    selected.size = index;
    els.sizeText.textContent = text;
    update();
  }

  // Picks the drink and its default size, as the tracker's dropdowns do
  function selectDrink(bev) {
    selected.slug = bev.slug;
    els.drinkText.textContent = bev.product;
    els.sizeOptions.textContent = '';
    renderSizeOptions(els.sizeOptions, bev, selectSize);
    els.sizeButton.disabled = false;
    var index = Math.max(0, bev.servings.findIndex(function (s) { return s.default; }));
    selectSize(index, els.sizeOptions.children[index].textContent);
  }

  function weightKg() {
    var w = parseFloat(els.weight.value);
    if (!(w > 0)) return 0;
    return els.weightUnit.value === 'lbs' ? w * 0.453592 : w;
  }

  function halfLife() {
    var opt = els.modifier.options[els.modifier.selectedIndex];
    return opt.dataset.halfLife ? Number(opt.dataset.halfLife) : Number(els.halfLife.value);
  }

  function inputs() {
    var bev = beverages[selected.slug];
    var serving = bev.servings[selected.size];
    var qty = Math.max(1, Math.min(10, parseInt(els.qty.value, 10) || 1));
    return {
      bev: bev,
      serving: serving,
      ranged: serving.caffeine_mg == null,
      dose: servingCaffeine(serving) * qty,
      time: els.time.value || '15:00',
      bedtime: els.bedtime.value || '23:00',
      halfLife: halfLife(),
      weightKg: weightKg()
    };
  }

  function update() {
    if (!selected.slug) return;
    var i = inputs();
    var hours = M.hoursUntil(i.time, i.bedtime);
    var left = M.remaining(i.dose, hours, i.halfLife);
    var threshold = M.sleepThreshold(i.weightKg);
    var cut = M.cutoff(i.bedtime, i.dose, threshold, i.halfLife);
    var bedMinutes = M.toMinutes(i.bedtime);

    els.halfLife.disabled = !!els.modifier.value;
    els.halfLifeValue.textContent = i.halfLife + ' h';

    els.resultMg.textContent = Math.round(left) + ' mg';
    els.resultWhen.textContent = 'left at bedtime (' + clock(bedMinutes) + ')';
    els.resultDetail.textContent = i.dose === 0 ? 'This drink has no caffeine.' :
      Math.round(left / i.dose * 100) + '% of the ' + i.dose + ' mg you had at ' +
      clock(M.toMinutes(i.time)) + ', ' + hoursText(hours) + ' earlier, on ' + (/^8/.test(String(i.halfLife)) ? 'an ' : 'a ') +
      i.halfLife + '-hour half-life.' +
      (i.ranged ? ' The dose counts the top of the published range.' : '');

    var basis = i.weightKg > 0
      ? Math.round(threshold) + ' mg (1.4 mg per kg at your weight)'
      : threshold + ' mg';
    els.resultSleep.textContent = (left >= threshold ? 'Above ' : 'Below ') + basis +
      ', the single dose EFSA says may affect sleep in some adults when taken close to bedtime.';

    if (cut) {
      els.resultCutoff.textContent = 'Latest time for this drink: ' + clock(cut.minutes) + '.';
      els.resultCutoffWhy.textContent = cut.rule === 'threshold'
        ? 'That is the ' + hoursText(cut.gapHours) + ' it takes ' + i.dose + ' mg to fall below ' + Math.round(threshold) +
          ' mg by bedtime, longer than the 6-hour gap Drake et al. recommend.'
        : 'That is the 6-hour gap Drake et al. recommend before bed; ' + i.dose + ' mg falls below ' +
          Math.round(threshold) + ' mg in ' + hoursText(M.hoursToFallBelow(i.dose, threshold, i.halfLife)) + '.';
      if (cut.gapHours >= 12) {
        els.resultCutoffWhy.textContent += ' A smaller size, or less of it, moves the cut-off later.';
      }
    } else if (i.dose === 0) {
      els.resultCutoff.textContent = 'No cut-off needed: this drink has no caffeine.';
      els.resultCutoffWhy.textContent = '';
    } else {
      els.resultCutoff.textContent = 'No cut-off needed for this drink.';
      els.resultCutoffWhy.textContent = 'At ' + i.dose + ' mg it is already below ' + Math.round(threshold) +
        ' mg, the dose EFSA flags for sleep. Sensitive sleepers may still want a gap.';
    }

    drawChart(i, hours, threshold);
    fillTable(i);
  }

  function svgEl(name, attrs, parent) {
    var el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(el);
    return el;
  }

  function niceStep(max) {
    var steps = [10, 20, 25, 50, 100, 200, 250, 500];
    for (var s = 0; s < steps.length; s++) if (max / steps[s] <= 5) return steps[s];
    return 1000;
  }

  function drawChart(i, hoursToBed, threshold) {
    var svg = els.chart;
    svg.textContent = '';
    var W = svg.clientWidth || 640, H = 260;
    var pad = { l: 44, r: 16, t: 16, b: 32 };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var span = Math.min(24, Math.max(12, Math.ceil(hoursToBed + 3)));
    var step = niceStep(i.dose);
    var yMax = Math.max(step, Math.ceil(i.dose / step) * step);
    var x = function (h) { return pad.l + h / span * (W - pad.l - pad.r); };
    var y = function (mg) { return H - pad.b - mg / yMax * (H - pad.t - pad.b); };
    var start = M.toMinutes(i.time);

    var grid = svgEl('g', { class: 'hl-grid' }, svg);
    for (var v = 0; v <= yMax; v += step) {
      svgEl('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v) }, grid);
      var t = svgEl('text', { x: pad.l - 6, y: y(v) + 4, 'text-anchor': 'end' }, grid);
      t.textContent = v;
    }
    var xStep = span > 16 ? 4 : 2;
    for (var h = 0; h <= span; h += xStep) {
      var xt = svgEl('text', { x: x(h), y: H - 10, 'text-anchor': 'middle' }, grid);
      xt.textContent = clock(start + h * 60).replace(':00', '');
    }

    if (threshold < yMax) {
      svgEl('line', { class: 'hl-threshold', x1: pad.l, x2: W - pad.r, y1: y(threshold), y2: y(threshold) }, svg);
      // Left end, clear of the bedtime line, which sits towards the right
      var tl = svgEl('text', { class: 'hl-ref-label', x: pad.l + 6, y: y(threshold) - 6 }, svg);
      tl.textContent = 'Sleep threshold ' + Math.round(threshold) + ' mg';
    }

    var pts = [], area = [];
    for (var m = 0; m <= span * 60; m += 5) {
      var hh = m / 60;
      pts.push(x(hh).toFixed(1) + ',' + y(M.remaining(i.dose, hh, i.halfLife)).toFixed(1));
    }
    area = ['M' + x(0) + ',' + y(0), 'L' + pts.join(' L'), 'L' + x(span) + ',' + y(0), 'Z'];
    svgEl('path', { class: 'hl-area', d: area.join(' ') }, svg);
    svgEl('polyline', { class: 'hl-line', points: pts.join(' ') }, svg);

    if (hoursToBed <= span) {
      var bx = x(hoursToBed), leftMg = M.remaining(i.dose, hoursToBed, i.halfLife);
      svgEl('line', { class: 'hl-bedtime', x1: bx, x2: bx, y1: pad.t, y2: H - pad.b }, svg);
      svgEl('circle', { class: 'hl-dot', cx: bx, cy: y(leftMg), r: 5 }, svg);
      var bl = svgEl('text', { class: 'hl-ref-label', x: bx + 8, y: pad.t + 12 }, svg);
      bl.textContent = 'Bedtime: ' + Math.round(leftMg) + ' mg';
      if (bx > W - 140) { bl.setAttribute('x', bx - 8); bl.setAttribute('text-anchor', 'end'); }
    }

    // Crosshair + tooltip, on pointer and keyboard
    var cross = svgEl('line', { class: 'hl-cross', y1: pad.t, y2: H - pad.b, visibility: 'hidden' }, svg);
    var marker = svgEl('circle', { class: 'hl-dot', r: 4, visibility: 'hidden' }, svg);
    var tip = els.tooltip;
    var current = null;

    function show(hh) {
      hh = Math.max(0, Math.min(span, Math.round(hh * 4) / 4));
      current = hh;
      var mg = M.remaining(i.dose, hh, i.halfLife);
      cross.setAttribute('x1', x(hh)); cross.setAttribute('x2', x(hh));
      cross.setAttribute('visibility', 'visible');
      marker.setAttribute('cx', x(hh)); marker.setAttribute('cy', y(mg));
      marker.setAttribute('visibility', 'visible');
      tip.querySelector('.hl-tip-value').textContent = Math.round(mg) + ' mg';
      tip.querySelector('.hl-tip-label').textContent = clock(start + hh * 60);
      tip.hidden = false;
      var rect = svg.getBoundingClientRect();
      var px = x(hh) / W * rect.width;
      tip.style.left = Math.min(Math.max(px, 40), rect.width - 40) + 'px';
    }
    function hide() {
      cross.setAttribute('visibility', 'hidden');
      marker.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    }
    svg.onpointermove = function (e) {
      var rect = svg.getBoundingClientRect();
      var sx = (e.clientX - rect.left) / rect.width * W;
      show((sx - pad.l) / (W - pad.l - pad.r) * span);
    };
    svg.onpointerleave = hide;
    svg.onblur = hide;
    svg.onfocus = function () { show(current == null ? hoursToBed : current); };
    svg.onkeydown = function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      show((current == null ? 0 : current) + (e.key === 'ArrowRight' ? 0.25 : -0.25));
    };
    svg.setAttribute('aria-label', 'Caffeine remaining from ' + clock(start) + ': ' + i.dose + ' mg falling to ' +
      Math.round(M.remaining(i.dose, hoursToBed, i.halfLife)) + ' mg at bedtime, ' + clock(M.toMinutes(i.bedtime)) +
      '. Use the left and right arrow keys to read values.');
  }

  function fillTable(i) {
    var tbody = els.table;
    tbody.textContent = '';
    var start = M.toMinutes(i.time);
    for (var h = 0; h <= 24; h += 2) {
      var tr = document.createElement('tr');
      var td1 = document.createElement('td'), td2 = document.createElement('td');
      td1.textContent = clock(start + h * 60) + (h ? ' (+' + h + ' h)' : '');
      td2.textContent = Math.round(M.remaining(i.dose, h, i.halfLife)) + ' mg';
      tr.appendChild(td1); tr.appendChild(td2);
      tbody.appendChild(tr);
    }
  }

  // Prefill weight from the calculator's saved settings, if any
  function prefillWeight() {
    try {
      var prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      if (prefs && prefs.weight > 0 && !els.weight.value) {
        els.weight.value = prefs.weight;
        els.weightUnit.value = prefs.weightUnit === 'lbs' ? 'lbs' : 'kg';
      }
    } catch (e) { /* storage unavailable: leave the field empty */ }
  }

  async function init() {
    els = {
      drinkButton: $('hlDrinkButton'), drinkText: $('hlDrinkButtonText'), drinkOptions: $('hlDrinkOptions'),
      sizeButton: $('hlSizeButton'), sizeText: $('hlSizeButtonText'), sizeOptions: $('hlSizeOptions'),
      qty: $('hlQty'), time: $('hlTime'), bedtime: $('hlBedtime'),
      halfLife: $('hlHalfLife'), halfLifeValue: $('hlHalfLifeValue'), modifier: $('hlModifier'),
      weight: $('hlWeight'), weightUnit: $('hlWeightUnit'),
      resultMg: $('hlResultMg'), resultWhen: $('hlResultWhen'), resultDetail: $('hlResultDetail'),
      resultSleep: $('hlResultSleep'), resultCutoff: $('hlResultCutoff'), resultCutoffWhy: $('hlResultCutoffWhy'),
      chart: $('hlChart'), tooltip: $('hlTooltip'), table: $('hlTable')
    };
    if (!els.drinkButton) return;
    var list;
    try {
      var response = await fetch((window.SITE_BASEURL || '') + '/assets/data/beverages.json');
      list = await response.json();
    } catch (e) {
      console.error('Error loading caffeine data:', e);
      els.drinkText.textContent = 'Could not load drinks';
      return;
    }
    list.forEach(function (b) { beverages[b.slug] = b; });

    renderBeverageOptions(els.drinkOptions, list, selectDrink);
    if (window.renderIcons) window.renderIcons();
    initSelectDropdown(els.drinkButton.closest('.custom-select-container'));
    initSelectDropdown(els.sizeButton.closest('.custom-select-container'));
    els.drinkButton.disabled = false;

    prefillWeight();
    ['qty', 'time', 'bedtime', 'halfLife', 'modifier', 'weight', 'weightUnit'].forEach(function (k) {
      els[k].addEventListener('input', update);
      els[k].addEventListener('change', update);
    });
    window.addEventListener('resize', update);
    selectDrink(beverages['brewed-coffee'] || list[0]);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
