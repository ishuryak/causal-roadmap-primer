import {cousins} from './cousins-model.mjs';
import {renderDrawing} from './cohort-drawings.mjs';

const byId = id => document.getElementById(id);
const format = (value, digits) => value.toFixed(digits).replace('-', '−');
const percent = (value, digits = 2) => format(100 * value, digits) + '%';
const points = (value, digits = 2) => format(100 * value, digits);
const signedPoints = (value, digits) => (value > 0 ? '+' : '') + points(value, digits);
const count = value => value.toLocaleString('en-US');
const tmle = cousins.tmle;
const dml = cousins.dml;
const [lower, higher] = tmle.profiles;

const methods = {
  tmle: {name: 'Targeted maximum likelihood estimation', stages: ['Fit', 'Target', 'Average']},
  dml: {name: 'Double machine learning for the average treatment effect', stages: ['Split & fit', 'Correct', 'Pool']}
};
const stepsTmle = [
  {
    title: 'Fit the starting risks',
    copy: 'To make the update visible, Susan deliberately starts with a simple risk model. It uses frailty alone, so both schedules start with the same risk. A second fit gives the chance of short, ' + percent(lower.e, 0) + ' at lower frailty and ' + percent(higher.e, 0) + ' at higher frailty.',
    notation: 'L is baseline frailty, A is schedule (1 short, 0 standard), and Y is 1 for death by five years. Here the starting risk Q⁰ uses frailty alone.',
    worked: 'For lower frailty, 642 deaths among ' + count(lower.n) + ' records give a starting risk of ' + percent(lower.initial) + '. For higher frailty, 725 deaths among ' + count(higher.n) + ' give ' + percent(higher.initial) + '.',
    extra: 'Within each group the starting risk is identical for both schedules, so the initial risk difference is zero.'
  },
  {
    title: 'Update the risks together',
    copy: 'Compare each outcome with its predicted risk under the schedule received. Weight the error by the inverse chance of that schedule, positive for short and negative for standard. One fitted update makes the signed errors balance across the cohort.',
    notation: 'A is 1 for short and 0 for standard. If e is the fitted chance of short given frailty, H is positive for short and negative for standard.',
    worked: 'Fit a logistic regression with the starting log odds as an offset and H as its sole covariate, with no intercept. The fitted coefficient ε is ' + format(tmle.epsilon, 5) + '. The mean of H × (Y − fitted risk) moves from ' + points(tmle.scoreBefore) + ' to 0.00 percentage points. The fitted risk difference moves from 0.00 to ' + points(tmle.ate) + ' points.',
    extra: 'Use that same update under each schedule. At lower frailty the risks become ' + percent(lower.q1) + ' under short and ' + percent(lower.q0) + ' under standard. At higher frailty they become ' + percent(higher.q1) + ' and ' + percent(higher.q0) + '.'
  },
  {
    title: 'Average over the same cohort',
    copy: 'Average the working risks for each schedule, then subtract. This update targets just the cohort difference, about five fewer deaths per 100 patients by five years under short. At lower frailty, the working risks even point in the opposite direction from the observed group contrast.',
    notation: 'Q₁* is the targeted short-course risk and Q₀* the targeted standard-course risk for the same frailty profile.',
    worked: 'For short, 0.60 × ' + percent(lower.q1) + ' + 0.40 × ' + percent(higher.q1) + ' ≈ ' + percent(tmle.shortRisk) + '. For standard, 0.60 × ' + percent(lower.q0) + ' + 0.40 × ' + percent(higher.q0) + ' ≈ ' + percent(tmle.standardRisk) + '. Their difference is ' + points(tmle.ate) + ' percentage points.',
    extra: 'The update targets the cohort risk difference. At lower frailty its contrast is ' + points(lower.q1 - lower.q0) + ' points, while the T-learner gives +2.00 there. Both give −4.80 points when averaged over the full cohort.'
  }
];

function dmlStep(step, foldIndex) {
  const fold = dml.folds[foldIndex];
  const foldName = 'Fold ' + fold.id;
  if (step === 1) return {
    title: 'Train on four folds',
    copy: 'Set aside one of five groups of records. Use the other four to predict mortality under each schedule and the chance of receiving short, given frailty. Apply those fits to the group set aside.',
    notation: 'For a patient i with frailty Lᵢ in fold k, (−k) means fitted outside that fold. The schedule a is 1 for short and 0 for standard.',
    worked: foldName + ' contributes ' + count(fold.holdoutN) + ' held-out records. The other ' + count(fold.trainN) + ' supply both risk predictions and the treatment probability for each of them.',
    extra: 'This is cross-fitting. Every record takes one turn in a held-out fold. This version of DML uses the interactive regression model (IRM), which lets each schedule have its own risk curve.'
  };
  if (step === 2) {
    const lowerStandard = fold.holdoutCells.find(cell => cell.group === 0 && cell.a === 0);
    return {
      title: 'Correct the held-out predictions',
      copy: 'Start with short risk minus standard risk. Take each held-out outcome minus its predicted risk under the schedule received, and divide that error by the chance of receiving that schedule. Add this term for short and subtract it for standard.',
      notation: 'Y is 1 for death by five years. A is 1 for short and 0 for standard. The other folds supply q₁ and q₀, this patient’s two predicted risks, and e, the fitted chance of short. The residual uses the risk for the schedule received.',
      worked: 'Γᵢ is one record’s augmented inverse probability weighted (AIPW) contribution to the average. It can exceed the range of an individual risk difference. In ' + foldName.toLowerCase() + ', the predicted difference averages ' + points(fold.initialDifference, 3) + ' points and the correction averages ' + signedPoints(fold.meanCorrection, 3) + ' points. Using unrounded values gives ' + points(fold.ate, 3) + ' points.',
      extra: 'For example, ' + lowerStandard.deaths + ' of ' + lowerStandard.n + ' lower-frailty patients on standard died in this fold (' + percent(lowerStandard.deaths / lowerStandard.n) + '). The other folds predicted ' + percent(fold.profiles[0].q0) + '. Standard-course errors enter the contrast with a minus sign.'
    };
  }
  const foldMeans = dml.folds.map(item => points(item.ate, 3)).join(', ');
  return {
    title: 'Pool the five held-out folds',
    copy: 'Average the 5,000 held-out contributions. Each fold contains 1,000 patients, so its mean gets one-fifth of the weight. The result is about five fewer deaths per 100 patients by five years under short.',
    notation: 'Γᵢ is a patient’s AIPW contribution, and θ is a candidate average treatment effect. Subtract θ from each contribution to get the orthogonal estimating score.',
    worked: 'The fold means are ' + foldMeans + ' percentage points. The mean contribution is ' + points(dml.ate) + ' points (−0.048 on the risk scale). At that estimate the centered scores average to zero.',
    extra: 'Here DML starts with separate risk fits for the two schedules. Its corrections cancel across the balanced folds. TMLE starts with identical risks, so its update accounts for the whole difference. Either method can use a richer starting fit.'
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
  byId('profile-comparison').hidden = state.method !== 'tmle' || state.step !== 3;
  byId('sampling-note').hidden = state.method !== 'dml' || state.step !== 3;
  byId('notation').textContent = content.notation;
  const equations = byId(state.method + '-math-' + state.step);
  byId('formula').replaceChildren(equations.content.cloneNode(true));
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
for (const input of methodInputs) input.addEventListener('change', () => {
  state.method = input.value;
  state.step = 1;
  change();
});
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
byId('overlap-low').textContent = percent(dml.overlapWeights[0]);
byId('overlap-high').textContent = percent(dml.overlapWeights[1]);
readLocation();
