// Independent checks against the record-level base-R calculations in analysis.Rmd.
import assert from 'node:assert/strict';
import {cousins, tracePatient} from '../docs/preview/estimators/cousins-model.mjs';

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${label}: ${actual} vs ${expected}`);
}

const {n, tmle, dml} = cousins;
const cells = [[900, 180], [2100, 462], [1500, 600], [500, 125]];
const target = .6 * (.22 - .20) + .4 * (.25 - .40);
assert.equal(n, 5000);
close(tmle.initialAte, 0, 'pooled model gives identical risks under both schedules');
close(tmle.epsilon, -0.049149193626826, 'one-parameter logistic fluctuation');
close(tmle.scoreBefore, -.048, 'initial mean clever residual');
for (let g = 0; g < 2; g++) {
  const {e, initial, h0, h1, q0, q1} = tmle.profiles[g];
  close(h0, -1 / (1 - e), 'standard clever covariate');
  close(h1, 1 / e, 'short clever covariate');
  close(initial, g ? .3625 : .214, 'pooled initial risk');
  for (const [q, h] of [[q0, h0], [q1, h1]]) {
    close(Math.log(q / (1 - q)) - Math.log(initial / (1 - initial)), tmle.epsilon * h, 'targeted log odds');
  }
}
close(tmle.standardRisk, .296816901995990, 'targeted standard risk');
close(tmle.shortRisk, .248816901995990, 'targeted short risk');
close(tmle.standardRisk, tmle.profiles.reduce((sum, p) => sum + p.n * p.q0, 0) / n, 'standardized over both frailty groups');
close(tmle.shortRisk, tmle.profiles.reduce((sum, p) => sum + p.n * p.q1, 0) / n, 'same group weights under short');
close(tmle.ate, target, 'TMLE target');
close(tmle.scoreAfter, 0, 'final mean clever residual');

// The held-out deaths are from deterministic, outcome-blind permutations of the four cell ID ranges.
const foldDeaths = [[40, 98, 121, 25], [38, 91, 121, 25], [35, 91, 122, 25], [32, 90, 121, 23], [35, 92, 115, 27]];
const expectedStarts = [-.046333333333333, -.0455, -.047666666666667, -.048142857142857, -.052357142857143];
const expectedCorrections = [-.008333333333333, -.0125, -.001666666666667, .000714285714286, .021785714285714];
const expectedFoldMeans = [-.054666666666667, -.058, -.049333333333333, -.047428571428571, -.030571428571429];
assert.equal(dml.folds.length, 5);
let scored = 0;
for (const [k, fold] of dml.folds.entries()) {
  assert.equal(fold.id, k + 1);
  assert.equal(fold.holdoutN, 1000);
  assert.equal(fold.trainN, 4000);
  assert.deepEqual(fold.holdoutCells.map(c => c.n), [180, 420, 300, 100]);
  assert.deepEqual(fold.holdoutCells.map(c => c.deaths), foldDeaths[k]);
  for (const [g, p] of fold.profiles.entries()) {
    const i = 2 * g, j = i + 1;
    const n0 = cells[i][0] - fold.holdoutCells[i].n, n1 = cells[j][0] - fold.holdoutCells[j].n;
    const d0 = cells[i][1] - foldDeaths[k][i], d1 = cells[j][1] - foldDeaths[k][j];
    close(p.q0, d0 / n0, 'out-of-fold standard risk');
    close(p.q1, d1 / n1, 'out-of-fold short risk');
    close(p.m, (d0 + d1) / (n0 + n1), 'out-of-fold marginal mortality');
    close(p.e, n1 / (n0 + n1), 'out-of-fold propensity');
  }
  close(fold.initialDifference, expectedStarts[k], 'held-out mean starting contrast');
  close(fold.meanCorrection, expectedCorrections[k], 'held-out mean residual correction');
  close(fold.initialDifference + fold.meanCorrection, fold.ate, 'fold start plus correction');
  close(fold.ate, expectedFoldMeans[k], 'mean held-out AIPW contribution');
  scored += fold.holdoutN;
}
assert.equal(scored, n);
for (const [cellIndex, [size, deaths]] of cells.entries()) {
  assert.equal(dml.folds.reduce((sum, f) => sum + f.holdoutCells[cellIndex].n, 0), size);
  assert.equal(dml.folds.reduce((sum, f) => sum + f.holdoutCells[cellIndex].deaths, 0), deaths);
}
const cohortStart = dml.folds.reduce((sum, f) => sum + f.holdoutN * f.initialDifference, 0) / n;
const cohortCorrection = dml.folds.reduce((sum, f) => sum + f.holdoutN * f.meanCorrection, 0) / n;
close(cohortStart, -.048, 'starting contrasts standardized over all scored patients');
close(cohortCorrection, 0, 'fold corrections cancel in this balanced synthetic example');
close(dml.ate, cohortStart + cohortCorrection, 'full cohort start plus correction');
close(dml.ate, target, 'mean cross-fitted AIPW contribution');
// Rebuild the centered moment from held-out outcomes using the two inverse-probability terms.
function meanAteScore(theta) {
  let sum = 0;
  for (const fold of dml.folds) {
    for (const {group, a, n: size, deaths} of fold.holdoutCells) {
      const {q1, q0, e} = fold.profiles[group];
      const errors = a ? (deaths - size * q1) / e : -(deaths - size * q0) / (1 - e);
      sum += size * (q1 - q0 - theta) + errors;
    }
  }
  return sum / n;
}
close(meanAteScore(0), target, 'at zero the mean score equals the mean contribution');
close(meanAteScore(dml.ate), 0, 'centered ATE score vanishes at the fitted difference');
close(dml.plrNumerator, -43.65, 'residual cross-product');
close(dml.plrDenominator, 1005, 'residual treatment sum of squares');
close(dml.overlapWeights[0], 630 / 1005, 'overlap weight for lower frailty');
close(dml.overlapWeights[1], 375 / 1005, 'overlap weight for higher frailty');
close(dml.plr, (630 * .02 - 375 * .15) / 1005, 'heterogeneous-effect FWL coefficient');
close(dml.plr, dml.overlapTarget, 'PLR and overlap-weighted risk difference');
assert.ok(Math.abs(dml.plr - dml.ate) > .004);

const p04 = tracePatient({group: 1, a: 1, y: 1}, 1);
close(p04.tmle.updated, .318401724085853, 'targeted higher-frailty short risk');
close(p04.tmle.scoreAfter, 4 * (1 - p04.tmle.updated), 'patient clever residual');
close(p04.dml.pseudoOutcome, .25 - 479 / 1200 + (1 - .25) / .25, 'illustrative death in short arm');
close(p04.dml.treatmentResidual, .75, 'PLR treatment residual');
close(p04.dml.outcomeResidual, 1 - 579 / 1600, 'PLR outcome residual');
const p05 = tracePatient({group: 1, a: 0, y: 1}, 1);
close(p05.dml.correction, -(1 - 479 / 1200) / .75, 'opposite correction direction in standard arm');
assert.notEqual(tracePatient({group: 1, a: 1, y: 1}, 4).dml.q1, p04.dml.q1);
assert.throws(() => tracePatient({group: 1, a: 1, y: 1}, 0), RangeError);
assert.throws(() => tracePatient({group: 1, a: 1, y: 2}), RangeError);
console.log('TMLE, held-out AIPW, PLR, overlap target and display traces verified.');
