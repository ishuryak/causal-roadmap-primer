import {cousins} from './cousins-model.mjs';
import {renderDrawing, renderResidualPlot} from './cohort-drawings.mjs';

const byId = id => document.getElementById(id);
const format = (value, digits) => value.toFixed(digits).replace('-', '−');
const percent = (value, digits = 2) => format(100 * value, digits) + '%';
const points = (value, digits = 2) => format(100 * value, digits);
const signedPoints = (value, digits) => (value > 0 ? '+' : '') + points(value, digits);
const count = value => value.toLocaleString('en-US');
const tmle = cousins.tmle;
const dml = cousins.dml;
const [lower, higher] = tmle.profiles;

const stepsTmle = [
  {
    title: 'Predict under each schedule',
    copy: 'Keep each patient’s frailty fixed. Read the risk model under the schedule received, then under short and standard for everyone. Pause at g-computation. With this deliberately simple frailty-only model, the two schedule columns match and the starting difference is zero.',
    notation: 'L is baseline frailty, A is schedule (1 short, 0 standard), and Y is 1 for death by five years. Here the starting risk Q⁰ uses frailty alone.',
    worked: 'For lower frailty, 642 deaths among ' + count(lower.n) + ' records give a starting risk of ' + percent(lower.initial) + '. For higher frailty, 725 deaths among ' + count(higher.n) + ' give ' + percent(higher.initial) + '.',
    extra: 'The received-schedule prediction is the one we can check against an observed outcome. A separate fit gives the chance of receiving short, ' + percent(lower.e, 0) + ' at lower frailty and ' + percent(higher.e, 0) + ' at higher frailty.'
  },
  {
    title: 'Fit the update on the schedule received',
    copy: 'Compare observed deaths with the risks predicted for the schedules patients received. Keep those starting predictions fixed and fit one adjustment using the treatment probabilities. Apply it twice, once assuming everyone received standard and once assuming everyone received short.',
    notation: 'The clever covariate H weights errors by the inverse chance of the schedule received. It is positive for short (A = 1) and negative for standard (A = 0). The offset holds each starting log odds fixed while the data determine one coefficient, ε.',
    worked: 'A logistic fit with H, the offset and no intercept gives ε = ' + format(tmle.epsilon, 5) + '. The mean of H × (Y − fitted risk) moves from ' + points(tmle.scoreBefore) + ' to 0.00 percentage points. The fitted risk difference moves from 0.00 to ' + points(tmle.ate) + ' points.',
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
    copy: 'Set aside the circled fold. Fit the risk and schedule models on the four checked folds. For the patients in the circled fold, predict mortality under each schedule and the chance of receiving short. Every patient takes one turn outside the training data.',
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
    extra: 'This is an orthogonal score. At the true risk and treatment models, a small change to either model has zero first-order effect on the expected score. In these balanced folds the five corrections cancel in the pooled estimate.'
  };
}

const method = document.body.dataset.method;
const stepInputs = [...document.querySelectorAll('input[name="step"]')];
const mathDisclosure = byId('math-disclosure');
const fwlDisclosure = byId('fwl');
const foldPicker = byId('fold-number');
let step = 1;
let fold = 1;

function render() {
  const hasFoldChoice = method === 'dml' && step < 3;
  const content = method === 'tmle' ? stepsTmle[step - 1] : dmlStep(step, fold - 1);
  for (const input of stepInputs) input.checked = Number(input.value) === step;
  byId('stage-title').textContent = content.title;
  byId('stage-copy').textContent = content.copy;
  if (method === 'tmle') byId('profile-comparison').hidden = step !== 3;
  if (foldPicker) {
    byId('fold-control').hidden = !hasFoldChoice;
    byId('sampling-note').hidden = step !== 3;
    foldPicker.value = String(fold);
  }
  byId('notation').textContent = content.notation;
  const equations = byId(method + '-math-' + step);
  byId('formula').replaceChildren(equations.content.cloneNode(true));
  byId('worked-math').textContent = content.worked;
  byId('math-extra').textContent = content.extra;
  renderDrawing(byId('cohort-drawing'), method, step, fold - 1);
  byId('process-status').textContent = method.toUpperCase() + ', step ' + step + ' of 3. ' + content.title +
    (hasFoldChoice ? ', fold ' + fold : '') + '.';
  byId('process-book').hidden = false;
}

function validChoice(text, count) {
  const value = Number(text);
  return Number.isInteger(value) && value >= 1 && value <= count ? value : 1;
}

function remember() {
  const url = new URL(location.href);
  for (const key of ['method', 'step', 'fold', 'math', 'fwl']) url.searchParams.delete(key);
  if (step !== 1) url.searchParams.set('step', String(step));
  if (foldPicker && fold !== 1) url.searchParams.set('fold', String(fold));
  if (url.hash === '#math-disclosure' && !mathDisclosure.open) url.hash = '';
  if (url.hash === '#fwl' && !fwlDisclosure?.open) url.hash = '';
  if (mathDisclosure.open && url.hash !== '#math-disclosure') url.searchParams.set('math', '1');
  if (fwlDisclosure?.open && url.hash !== '#fwl') url.searchParams.set('fwl', '1');
  if (url.href !== location.href) {
    try { history.replaceState(history.state, '', url); } catch { /* Interaction also works without history. */ }
  }
}

function readLocation() {
  const url = new URL(location.href);
  step = validChoice(url.searchParams.get('step'), stepInputs.length);
  fold = foldPicker ? validChoice(url.searchParams.get('fold'), dml.folds.length) : 1;
  mathDisclosure.open = url.searchParams.get('math') === '1' || url.hash === '#math-disclosure';
  if (fwlDisclosure) fwlDisclosure.open = url.searchParams.get('fwl') === '1' || url.hash === '#fwl';
  if (url.hash === '#how-fit') byId('how-fit').open = true;
  render();
}

for (const input of stepInputs) input.addEventListener('change', () => {
  step = Number(input.value);
  render();
  remember();
});
foldPicker?.addEventListener('change', () => {
  fold = Number(foldPicker.value);
  render();
  remember();
});
mathDisclosure.addEventListener('toggle', remember);
fwlDisclosure?.addEventListener('toggle', remember);
window.addEventListener('popstate', readLocation);
window.addEventListener('hashchange', readLocation);
window.addEventListener('pageshow', event => { if (event.persisted) readLocation(); });
if (fwlDisclosure) {
  byId('residual-ratio').textContent = format(dml.plrNumerator, 2) + ' ÷ ' + count(dml.plrDenominator);
  byId('residual-slope').textContent = format(dml.plr, 5);
  byId('residual-points').textContent = points(dml.plr) + ' percentage points';
  byId('overlap-low').textContent = percent(dml.overlapWeights[0]);
  byId('overlap-high').textContent = percent(dml.overlapWeights[1]);
  const plot = byId('residual-plot');
  renderResidualPlot(plot);
  plot.closest('figure').hidden = false;
}
readLocation();
