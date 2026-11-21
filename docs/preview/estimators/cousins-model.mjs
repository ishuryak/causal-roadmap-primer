// All estimates use the fitting cohort. A display patient can be traced through an existing fit.
const cells = [
  {group: 0, a: 0, n: 900, deaths: 180},
  {group: 0, a: 1, n: 2100, deaths: 462},
  {group: 1, a: 0, n: 1500, deaths: 600},
  {group: 1, a: 1, n: 500, deaths: 125}
];
const total = cells.reduce((n, cell) => n + cell.n, 0);
const foldCount = 5;

function fitProfiles(counts) {
  return [0, 1].map(group => {
    const [standard, short] = counts.filter(cell => cell.group === group);
    const n = standard.n + short.n;
    return {
      n, e: short.n / n, m: (standard.deaths + short.deaths) / n,
      q0: standard.deaths / standard.n, q1: short.deaths / short.n
    };
  });
}

function clever(a, e) {
  return a ? 1 / e : -1 / (1 - e);
}

function updatedRisk(initial, epsilon, h) {
  const logOdds = Math.log(initial / (1 - initial)) + epsilon * h;
  return 1 / (1 + Math.exp(-logOdds));
}

function fitTmle() {
  const pooled = fitProfiles(cells);
  function score(epsilon) {
    let sum = 0;
    for (const cell of cells) {
      const {e, m} = pooled[cell.group];
      const h = clever(cell.a, e);
      sum += h * (cell.deaths - cell.n * updatedRisk(m, epsilon, h));
    }
    return sum / total;
  }
  // The binomial log-likelihood score decreases monotonically and changes sign on this interval.
  let low = -1, high = 1;
  if (score(low) <= 0 || score(high) >= 0) throw new Error('The TMLE score root is outside the teaching interval.');
  for (let step = 0; step < 55; step++) {
    const mid = (low + high) / 2;
    if (score(mid) > 0) low = mid;
    else high = mid;
  }
  const epsilon = (low + high) / 2;
  const profiles = pooled.map(({n, e, m}) => {
    const h0 = clever(0, e), h1 = clever(1, e);
    return {n, e, initial: m, h0, h1, q0: updatedRisk(m, epsilon, h0), q1: updatedRisk(m, epsilon, h1)};
  });
  const standardRisk = profiles.reduce((sum, p) => sum + p.n * p.q0, 0) / total;
  const shortRisk = profiles.reduce((sum, p) => sum + p.n * p.q1, 0) / total;
  return {initialAte: 0, epsilon, ate: shortRisk - standardRisk, standardRisk, shortRisk,
    scoreBefore: score(0), scoreAfter: score(epsilon), profiles};
}

function validationCounts() {
  const folds = Array.from({length: foldCount}, () => cells.map(({group, a}) => ({group, a, n: 0, deaths: 0})));
  cells.forEach((cell, index) => {
    // 37 is coprime to each cell size. The permutation of the within-cell IDs uses no outcomes.
    for (let j = 0; j < cell.n; j++) {
      const rank = (37 * j + 17) % cell.n;
      const k = Math.floor(foldCount * rank / cell.n);
      const held = folds[k][index];
      held.n++;
      if (j < cell.deaths) held.deaths++;
    }
  });
  return folds;
}

function dmlTrace({a, y}, {e, q0, q1, m}) {
  const risk = a ? q1 : q0;
  const riskDifference = q1 - q0;
  const h = clever(a, e);
  const correction = h * (y - risk);
  return {e, q0, q1, m, h, risk, riskDifference, correction, pseudoOutcome: riskDifference + correction,
    treatmentResidual: a - e, outcomeResidual: y - m};
}

function fitDml() {
  const folds = validationCounts().map((holdoutCells, index) => {
    // Only the four other folds supply these arm risks, marginal outcome and treatment probability.
    const training = cells.map((cell, i) => ({...cell, n: cell.n - holdoutCells[i].n,
      deaths: cell.deaths - holdoutCells[i].deaths}));
    const profiles = fitProfiles(training);
    let pseudoSum = 0, plrNumerator = 0, plrDenominator = 0;
    for (const cell of holdoutCells) {
      for (const y of [0, 1]) {
        const count = y ? cell.deaths : cell.n - cell.deaths;
        const trace = dmlTrace({a: cell.a, y}, profiles[cell.group]);
        pseudoSum += count * trace.pseudoOutcome;
        plrNumerator += count * trace.treatmentResidual * trace.outcomeResidual;
        plrDenominator += count * trace.treatmentResidual ** 2;
      }
    }
    const holdoutN = holdoutCells.reduce((sum, cell) => sum + cell.n, 0);
    return {id: index + 1, trainN: total - holdoutN, holdoutN, holdoutCells, profiles,
      ate: pseudoSum / holdoutN, plrNumerator, plrDenominator};
  });
  const ate = folds.reduce((sum, f) => sum + f.holdoutN * f.ate, 0) / total;
  const plrNumerator = folds.reduce((sum, f) => sum + f.plrNumerator, 0);
  const plrDenominator = folds.reduce((sum, f) => sum + f.plrDenominator, 0);
  const full = fitProfiles(cells);
  const masses = full.map(p => p.n * p.e * (1 - p.e));
  const mass = masses.reduce((a, b) => a + b, 0);
  const overlapWeights = masses.map(w => w / mass);
  const overlapTarget = full.reduce((sum, p, i) => sum + overlapWeights[i] * (p.q1 - p.q0), 0);
  return {folds, ate, plr: plrNumerator / plrDenominator, plrNumerator, plrDenominator, overlapWeights, overlapTarget};
}

export const cousins = {n: total, tmle: fitTmle(), dml: fitDml()};

export function tracePatient({group, a, y}, fold = 1) {
  const selected = cousins.dml.folds[fold - 1];
  if (!selected || ![0, 1].includes(group) || ![0, 1].includes(a) || ![0, 1].includes(y)) {
    throw new RangeError('Use a display patient with binary group, schedule and outcome, and a fold from 1 to 5.');
  }
  const {e, initial, q0, q1, h0, h1} = cousins.tmle.profiles[group];
  const h = a ? h1 : h0, updated = a ? q1 : q0;
  return {tmle: {e, initial, q0, q1, h, updated, residualBefore: y - initial, residualAfter: y - updated,
    scoreBefore: h * (y - initial), scoreAfter: h * (y - updated)},
  dml: {fold, ...dmlTrace({a, y}, selected.profiles[group])}};
}
