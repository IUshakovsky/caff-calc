#!/usr/bin/env node
// Verify the decay maths behind /half-life/ (task C14 in
// documentation/caffcalc-implementation-brief.md) against worked cases:
//
//     node scripts/check-half-life.js
//
// Note on the brief's own example: 200 mg at 3 pm with a 5-hour half-life is
// 8 hours, or 1.6 half-lives, before 11 pm, so about 66 mg remains, not ~50 mg.
// 50 mg is reached two half-lives later, at 1 am. Both are checked here.
'use strict';
const path = require('path');
const M = require(path.join(__dirname, '..', 'assets', 'js', 'half-life.js'));

let failures = 0;
function check(name, actual, expected, tolerance = 0.5) {
  const ok = typeof expected === 'number' ? Math.abs(actual - expected) <= tolerance : actual === expected;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
  if (!ok) failures++;
}

// Decay
check('200 mg, 3 pm -> 11 pm, 5 h half-life', M.remaining(200, M.hoursUntil('15:00', '23:00'), 5), 65.98, 0.05);
check('200 mg, 3 pm -> 1 am, 5 h half-life', M.remaining(200, M.hoursUntil('15:00', '01:00'), 5), 50, 0.001);
check('one half-life halves the dose', M.remaining(150, 4, 4), 75, 0.001);
check('no time elapsed keeps the dose', M.remaining(95, 0, 5), 95, 0.001);

// Clock arithmetic
check('bedtime after midnight is the next day', M.hoursUntil('23:30', '01:00'), 1.5, 0.001);
check('same clock time is zero hours', M.hoursUntil('22:00', '22:00'), 0, 0.001);

// Sleep threshold: EFSA 100 mg, or 1.4 mg/kg when weight is given
check('threshold without weight', M.sleepThreshold(0), 100, 0.001);
check('threshold at 70 kg', M.sleepThreshold(70), 98, 0.001);

// Cut-off: the earlier of 6 h before bed and the time to fall below the threshold
const coffee = M.cutoff('23:00', 200, 100, 5);
check('200 mg: six-hour rule sets 5:00 pm', coffee.minutes, 17 * 60, 0);
check('200 mg: rule', coffee.rule, 'six-hours');
const pike = M.cutoff('23:00', 390, 100, 5);
check('390 mg: needs 5 * log2(3.9) h to reach 100 mg', pike.gapHours, 9.818, 0.001);
check('390 mg: threshold rule sets 1:11 pm', pike.minutes, 13 * 60 + 11, 0);
check('390 mg: rule', pike.rule, 'threshold');
check('80 mg: below threshold, no cut-off', M.cutoff('23:00', 80, 100, 5), null);
check('cut-off wraps past midnight', M.cutoff('02:00', 200, 100, 5).minutes, 20 * 60, 0);

console.log(failures ? `\n${failures} check(s) failed.` : '\nOK - decay, clock and cut-off maths match the worked cases.');
process.exit(failures ? 1 : 0);
