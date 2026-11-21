import {cousins} from './cousins-model.mjs';
import {renderDrawing} from './cohort-drawings.mjs';

const byId = id => document.getElementById(id);
const format = (value, digits) => value.toFixed(digits).replace('-', '−');
const percent = (value, digits = 2) => format(100 * value, digits) + '%';
const points = (value, digits = 2) => format(100 * value, digits);
const count = value => value.toLocaleString('en-US');
const tmle = cousins.tmle;
const dml = cousins.dml;
const [lower, higher] = tmle.profiles;

const methods = {
  tmle: {name: 'Targeted maximum likelihood estimation', stages: ['Fit', 'Target', 'Average']},
  dml: {name: 'Double machine learning', stages: ['Split & fit', 'Score', 'Pool']}
};
const stepsTmle = [
  {
    title: 'Fit the starting risks',
    copy: 'Pool both schedules within each frailty group to get its starting mortality risk. A second fit gives the chance of receiving short, ' + percent(lower.e, 0) + ' at lower frailty and ' + percent(higher.e, 0) + ' at higher frailty. The next step uses both fits.',
    formula: 'Q⁰(a, L) = mean(Y | L)     e(L) = P(short | L)',
    worked: 'For lower frailty, 642 deaths among ' + count(lower.n) + ' records give a starting risk of ' + percent(lower.initial) + '. For higher frailty, 725 deaths among ' + count(higher.n) + ' give ' + percent(higher.initial) + '.',
    extra: 'The chances of receiving short were ' + percent(lower.e) + ' and ' + percent(higher.e) + ', respectively. This deliberately simple starting risk model uses only frailty, so its starting schedule contrast is zero.'
  },
  {
    title: 'Update the risks together',
    copy: 'Compare the observed deaths with the risks predicted for the schedules people received. Fit one update, weighted by the treatment probabilities, until the weighted prediction errors average to zero.',
    formula: 'H = A/e − (1−A)/(1−e)     logit Q* = logit Q⁰ + εH',
    worked: 'A = 1 for short and 0 for standard. The fitted update ε is ' + format(tmle.epsilon, 5) + '. Across the cohort, the mean of H × (Y − fitted risk) moves from ' + format(tmle.scoreBefore, 3) + ' to ' + format(tmle.scoreAfter, 3) + '.',
    extra: 'Apply the update to both schedules within each group. Under standard and short, the targeted risks are ' + percent(lower.q0) + ' and ' + percent(lower.q1) + ' at lower frailty, and ' + percent(higher.q0) + ' and ' + percent(higher.q1) + ' at higher frailty.'
  },
  {
    title: 'Average over the same cohort',
    copy: 'Predict both schedules using the same mix of frailty. In this cohort, the difference between the two averages translates to about five fewer deaths per 100 people by five years under the short course.',
    formula: 'ATE estimate = mean[Q*(short, L)] − mean[Q*(standard, L)]',
    worked: 'The averages use the same 60% lower-frailty and 40% higher-frailty mix. The result is ' + percent(tmle.shortRisk) + ' − ' + percent(tmle.standardRisk) + ' = ' + points(tmle.ate) + ' percentage points.',
    extra: 'The T-learner also gives −4.80 points here, from 23.20% under short and 28.00% under standard. Two different pairs of risks can have the same difference.'
  }
];

function dmlStep(step, foldIndex) {
  const fold = dml.folds[foldIndex];
  const foldName = 'Fold ' + fold.id;
  if (step === 1) return {
    title: 'Train on four folds',
    copy: 'Split the records into five groups, called folds. Set one fold aside. On the other four, fit the risk under each schedule and the chance of receiving short. These fits will score the records set aside.',
    formula: 'Training set = all records outside the held-out fold',
    worked: foldName + ' contains ' + count(fold.holdoutN) + ' held-out records. The other ' + count(fold.trainN) + ' supply Q̂(short, L), Q̂(standard, L) and ê(L).',
    extra: 'Rotate the training and held-out groups five times. Each mortality outcome is scored using predictions from a fit that excluded its fold.'
  };
  if (step === 2) return {
    title: 'Score the held-out fold',
    copy: 'Predict both schedules in the held-out records. Correct each predicted difference using the outcome observed under the schedule received. The drawing shows the mean for one fold before and after that correction.',
    formula: 'Score = Q̂(short, L) − Q̂(standard, L) + H × [Y − Q̂(A, L)]',
    worked: 'In ' + foldName.toLowerCase() + ', the mean fitted difference is ' + points(fold.initialDifference, 3) + ' points and the mean correction is ' + points(fold.meanCorrection, 3) + ' points. Together they give ' + points(fold.ate, 3) + ' points, using unrounded values.',
    extra: 'H = A/ê − (1−A)/(1−ê), with A = 1 for short. This augmented inverse probability weighting (AIPW) score combines a fitted contrast with a weighted prediction error.'
  };
  const foldMeans = dml.folds.map(item => points(item.ate, 3)).join(', ');
  return {
    title: 'Pool the five held-out folds',
    copy: 'After all five rotations, every record has contributed one score. Each fold here has the same size, so averaging the five fold means gives the same answer as averaging all 5,000 scores.',
    formula: 'ATE estimate = sum of all held-out scores / 5,000',
    worked: 'The five means are ' + foldMeans + ' percentage points. Their average is ' + points(dml.ate) + ' percentage points.',
    extra: 'Here that agrees with TMLE’s targeted risk difference. The held-out corrections vary by fold, even though they average to zero across this fitting cohort.'
  };
}

const methodInputs = [...document.querySelectorAll('input[name="method"]')];
const stepInputs = [...document.querySelectorAll('input[name="step"]')];
const mathDisclosure = byId('math-disclosure');
const fwlDisclosure = byId('fwl');
const foldPicker = byId('fold-number');
const storageKey = 'causal-roadmap.estimator-cousins.v1';
const state = {method: 'tmle', step: 1, fold: 1, math: false, fwl: false};

function render() {
  const method = methods[state.method];
  const showFoldChoice = state.method === 'dml' && state.step < 3;
  const content = state.method === 'tmle' ? stepsTmle[state.step - 1] : dmlStep(state.step, state.fold - 1);
  for (const input of methodInputs) input.checked = input.value === state.method;
  for (const input of stepInputs) input.checked = Number(input.value) === state.step;
  method.stages.forEach((label, i) => { byId('stage-name-' + (i + 1)).textContent = label; });
  byId('method-name').textContent = method.name;
  byId('stage-title').textContent = content.title;
  byId('stage-copy').textContent = content.copy;
  byId('formula').textContent = content.formula;
  byId('worked-math').textContent = content.worked;
  byId('math-extra').textContent = content.extra;
  byId('fold-control').hidden = !showFoldChoice;
  foldPicker.value = String(state.fold);
  renderDrawing(byId('cohort-drawing'), state.method, state.step, state.fold - 1);
  mathDisclosure.open = state.math;
  fwlDisclosure.open = state.fwl;
  byId('process-status').textContent = state.method.toUpperCase() + ', step ' + state.step + ' of 3. ' + content.title +
    (showFoldChoice ? ', fold ' + state.fold : '') + '.';
  byId('process-book').hidden = false;
}

function validChoice(text, count) {
  const value = Number(text);
  return Number.isInteger(value) && value >= 1 && value <= count ? value : 1;
}

function paramsForState() {
  const params = new URLSearchParams({method: state.method, step: String(state.step)});
  if (state.method === 'dml') params.set('fold', String(state.fold));
  if (state.math) params.set('math', '1');
  if (state.fwl) params.set('fwl', '1');
  return params;
}

function remember(writeUrl = true) {
  const settings = paramsForState();
  try { sessionStorage.setItem(storageKey, settings.toString()); } catch { /* Optional storage. */ }
  const url = new URL(location.href);
  if (writeUrl) {
    for (const key of ['method', 'step', 'fold', 'patient', 'math', 'fwl']) url.searchParams.delete(key);
    settings.forEach((value, key) => url.searchParams.set(key, value));
    if (['#fwl', '#math-disclosure'].includes(url.hash)) url.hash = '';
  }
  try { history.replaceState({...history.state, estimatorCousins: settings.toString()}, '', url); } catch { /* Optional history. */ }
}

function readLocation() {
  const url = new URL(location.href);
  const explicit = ['method', 'patient', 'step', 'fold', 'math', 'fwl'].some(key => url.searchParams.has(key)) ||
    ['#fwl', '#math-disclosure'].includes(url.hash);
  let params = url.searchParams;
  if (!explicit) {
    try { params = new URLSearchParams(history.state?.estimatorCousins ?? sessionStorage.getItem(storageKey) ?? ''); }
    catch { /* Defaults work without storage. */ }
  }
  const requestedMethod = params.get('method');
  state.method = ['dml', 'plr'].includes(requestedMethod) || (url.hash === '#fwl' && requestedMethod !== 'tmle') ? 'dml' : 'tmle';
  state.step = validChoice(params.get('step'), 3);
  state.fold = validChoice(params.get('fold'), dml.folds.length);
  state.math = params.get('math') === '1' || url.hash === '#math-disclosure';
  state.fwl = requestedMethod === 'plr' || params.get('fwl') === '1' || url.hash === '#fwl';
  render();
  if (url.hash === '#how-fit') byId('how-fit').open = true;
  remember(false);
}

function change() { render(); remember(); }
for (const input of methodInputs) input.addEventListener('change', () => { state.method = input.value; change(); });
for (const input of stepInputs) input.addEventListener('change', () => { state.step = Number(input.value); change(); });
foldPicker.addEventListener('change', () => { state.fold = Number(foldPicker.value); change(); });
for (const [element, key] of [[mathDisclosure, 'math'], [fwlDisclosure, 'fwl']]) {
  element.addEventListener('toggle', () => {
    if (state[key] !== element.open) { state[key] = element.open; remember(); }
  });
}
window.addEventListener('popstate', readLocation);
window.addEventListener('hashchange', readLocation);
window.addEventListener('pageshow', event => { if (event.persisted) readLocation(); });
byId('residual-ratio').textContent = format(dml.plrNumerator, 2) + ' ÷ ' + count(dml.plrDenominator);
byId('residual-slope').textContent = format(dml.plr, 5);
byId('residual-points').textContent = points(dml.plr) + ' percentage points';
byId('overlap-weight').textContent = percent(dml.overlapWeights[0]);
readLocation();
