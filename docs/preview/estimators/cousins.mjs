import {cousins, tracePatient} from './cousins-model.mjs';

const patients = [
  {id:'P01', group:0, a:0, y:0}, {id:'P02', group:0, a:1, y:0},
  {id:'P03', group:0, a:1, y:1}, {id:'P04', group:1, a:1, y:1},
  {id:'P05', group:1, a:0, y:1}, {id:'P06', group:1, a:0, y:0}
];
const labels = {tmle:['Start','Target','Average'], dml:['Fit','Correct','Average']};
const names = {tmle:'TMLE', dml:'DML'};
const byId = id => document.getElementById(id);
const put = (id, text) => { byId(id).textContent = text; };
const number = (value, digits = 4) => value.toFixed(digits).replace('-', '−');
const signed = (value, digits = 4) => (value < 0 ? '−' : value > 0 ? '+' : '') + Math.abs(value).toFixed(digits);
const percent = value => number(100 * value, 2) + '%';
const points = value => signed(100 * value, 2) + ' points';
const storageKey = 'causal-roadmap.estimator-cousins.v1';
const state = {method:'tmle', patient:'P04', step:1, math:false, fwl:false};
const methodInputs = [...document.querySelectorAll('input[name="method"]')];
const stepInputs = [...document.querySelectorAll('input[name="step"]')];
const mathDisclosure = byId('math-disclosure');
const fwlDisclosure = byId('fwl');

function tmleStep(patient, trace) {
  const fit = cousins.tmle;
  const q = trace.tmle;
  if (state.step === 1) {
    return {
      middle:'Fit initial risks', left:['Standard', percent(q.initial)], right:['Short', percent(q.initial)],
      result:'Initial contrast', value:points(fit.initialAte),
      note:'The starting fit uses baseline frailty alone. Patients with this frailty get the same predicted risk under each schedule.',
      formula:'Q⁰(0,L) = Q⁰(1,L) = E[Y | L].',
      worked:(patient.group ? '725 deaths / 2,000 higher-frailty patients' : '642 deaths / 3,000 lower-frailty patients') +
        ' gives ' + percent(q.initial) + ' under both schedules.',
      extra:'Averaging the initial risk difference across all 5,000 fitting patients gives 0.00 points.'
    };
  }
  if (state.step === 2) {
    return {
      middle:'Update the factual risk', left:['Starting risk', percent(q.initial)], right:['Schedule weight H', signed(q.h,3)],
      result:'Targeted factual risk', value:percent(q.updated),
      note:'The same fitted fluctuation shifts each schedule’s log odds according to its signed weight. This row shows the update for the schedule actually received.',
      formula:'H = A/e − (1−A)/(1−e).  logit Q* = logit Q⁰ + εH.',
      worked:'At this frailty e = ' + number(q.e,2) + '. The fitted ε is ' + number(fit.epsilon,5) +
        '. Applying ε × (' + signed(q.h,3) + ') to the initial log odds changes risk from ' + percent(q.initial) + ' to ' + percent(q.updated) + '.',
      extra:'Across the fitting cohort the mean H × (Y − fitted risk) changes from ' + number(fit.scoreBefore,3) + ' to 0.000.'
    };
  }
  return {
    middle:'Average targeted risks', left:['Standard', percent(fit.standardRisk)], right:['Short', percent(fit.shortRisk)],
    result:'Five-year mortality ATE', value:points(fit.ate),
    note:'Predict both schedules for every fitting patient, then subtract the two averages across the same 5,000 people.',
    formula:'ATE = mean[Q*(1,L) − Q*(0,L)].',
    worked:percent(fit.shortRisk) + ' − ' + percent(fit.standardRisk) + ' = ' + points(fit.ate) + '.',
    extra:'This one-parameter update targets the difference. Here T gives 23.20% short and 28.00% standard. Its difference also equals −4.80 points even though the two arm risks differ.'
  };
}

function dmlStep(patient, trace) {
  const fit = cousins.dml;
  const q = trace.dml;
  if (state.step === 1) {
    return {
      middle:'Fit risks outside fold 1', left:['Standard', percent(q.q0)], right:['Short', percent(q.q1)],
      result:'Fitted profile contrast', value:points(q.riskDifference),
      note:'The fit excluding fold 1 uses 4,000 training records. Apply those risk predictions to this independent display patient’s frailty profile.',
      formula:'Start with Q̂(1,L) − Q̂(0,L). Also estimate e(L) = P(A = 1 | L) in the training folds.',
      worked:percent(q.q1) + ' − ' + percent(q.q0) + ' ≈ ' + points(q.riskDifference) + '. The short-schedule propensity at this frailty is ' + percent(q.e) + '.',
      extra:'Each fitting patient is scored once with predictions from the other four folds. The six illustrative patients belong to none of the folds.'
    };
  }
  if (state.step === 2) {
    return {
      middle:'Correct the fitted contrast', left:['Fitted difference', signed(q.riskDifference)], right:['H × residual', signed(q.correction)],
      result:'Illustrative ATE score', value:signed(q.pseudoOutcome),
      note:'The factual outcome corrects the risk difference on the 0/1 outcome scale. A single score can exceed one. Only the held-out fitting records enter the cohort average.',
      formula:'Score = Q̂(1,L) − Q̂(0,L) + H × [Y − Q̂(A,L)], with H = A/e − (1−A)/(1−e).',
      worked:'For ' + patient.id + ', ' + signed(q.riskDifference) + ' + (' + signed(q.h,3) + ') × (' + patient.y + ' − ' + number(q.risk) + ') = ' + signed(q.pseudoOutcome) + '.',
      extra:'This is the uncentered augmented inverse-probability-weighted (AIPW) score. The estimating equation sets the mean of score minus ATE to zero.'
    };
  }
  const first = fit.folds[0];
  const other = fit.folds.slice(1);
  const others = other.reduce((sum, f) => sum + f.ate * f.holdoutN,0) / (cousins.n - first.holdoutN);
  return {
    middle:'Pool held-out scores', left:['Fold 1 · 1,000', points(first.ate)], right:['Folds 2–5 · 4,000', points(others)],
    result:'Five-year mortality ATE', value:points(fit.ate),
    note:'Combine scores from all five held-out folds. Every one of the 5,000 fitting patients contributes equally to the average.',
    formula:'ATE = (1 / N) × sum of uncentered held-out AIPW scores.',
    worked:'The five equal-size fold means are ' + fit.folds.map(f => signed(100 * f.ate,3)).join(', ') +
      ' percentage points. Their mean is ' + points(fit.ate) + '.',
    extra:'TMLE reaches the same numerical ATE in this teaching cohort. Its fit updates risks before averaging. This DML estimator averages corrected scores.'
  };
}

function render() {
  const p = patients.find(person => person.id === state.patient);
  const trace = tracePatient(p,1);
  const display = state.method === 'tmle' ? tmleStep(p,trace) : dmlStep(p,trace);
  for (const input of methodInputs) input.checked = input.value === state.method;
  for (const input of stepInputs) input.checked = Number(input.value) === state.step;
  byId('case-patient').value = p.id;
  labels[state.method].forEach((text,i) => put('step-label-' + (i+1),text));
  put('fit-story', state.method === 'tmle'
    ? 'TMLE updates the predicted risk under each schedule, then compares the two averages.'
    : 'DML combines each held-out patient’s predicted risk difference with a weighted prediction error.');
  put('trace-id',p.id);
  put('trace-profile',(p.group ? 'Higher' : 'Lower') + ' frailty · ' + (p.a ? 'short' : 'standard') + ' schedule · ' +
    (p.y ? 'died by five years' : 'alive at five years'));
  for (const a of [0,1]) {
    const cell = byId('trace-y' + a);
    cell.textContent = p.a === a ? String(p.y) : '?';
    cell.className = 'record-cell ' + (p.a === a ? 'is-observed' : 'is-missing');
    cell.setAttribute('aria-label', (a ? 'Short' : 'Standard') + ' outcome ' + (p.a === a ? 'observed, ' + p.y : 'unobserved'));
  }
  put('middle-title',display.middle);
  [display.left,display.right].forEach(([label,value],i) => {
    put('middle-label-' + i,label);
    put('middle-value-' + i,value);
  });
  put('result-title',display.result);
  put('result-value',display.value);
  put('step-note',display.note);
  put('formula',display.formula);
  put('worked-math',display.worked);
  put('math-extra',display.extra);
  const d = trace.dml;
  put('fwl-a',p.a + ' − ' + number(d.e,4) + ' = ' + signed(d.treatmentResidual));
  put('fwl-y',p.y + ' − ' + number(d.m,6) + ' = ' + signed(d.outcomeResidual,6));
  put('fwl-out', points(cousins.dml.plr));
  byId('back-to-patient').href = 'worksheet.html?patient=' + p.id;
  const menuWorksheet = document.querySelector('.section-nav a[href^="worksheet.html"]');
  if (menuWorksheet) menuWorksheet.href = 'worksheet.html?patient=' + p.id;
  mathDisclosure.open = state.math;
  fwlDisclosure.open = state.fwl;
  put('case-live',names[state.method] + ', ' + labels[state.method][state.step-1] + ', ' + p.id + '. ' + display.result + ' ' + display.value + '.');
}

function settings() {
  return new URLSearchParams({method:state.method, patient:state.patient, step:String(state.step),
    math:state.math ? '1' : '0', fwl:state.fwl ? '1' : '0'});
}

function readLocation() {
  const url = new URL(location.href);
  const explicit = ['method','patient','step','math','fwl'].some(key => url.searchParams.has(key)) || url.hash === '#fwl';
  let params = url.searchParams;
  if (!explicit) {
    try { params = new URLSearchParams(history.state?.estimatorCousins ?? sessionStorage.getItem(storageKey) ?? ''); }
    catch { /* Basic controls also work without browser storage. */ }
  }
  const requested = params.get('method');
  state.method = requested === 'dml' || requested === 'plr' || (url.hash === '#fwl' && requested !== 'tmle') ? 'dml' : 'tmle';
  state.patient = patients.find(p => p.id === (params.get('patient') || '').toUpperCase())?.id || 'P04';
  const step = Number(params.get('step'));
  state.step = [1,2,3].includes(step) ? step : 1;
  state.math = params.get('math') === '1';
  state.fwl = requested === 'plr' || url.hash === '#fwl' || params.get('fwl') === '1';
  const encoded = settings().toString();
  try { sessionStorage.setItem(storageKey,encoded); } catch { /* Optional. */ }
  if (!explicit && history.state?.estimatorCousins !== encoded) {
    try { history.replaceState({...history.state, estimatorCousins:encoded},''); } catch { /* Optional. */ }
  }
  render();
}

function persist() {
  const params = settings();
  const url = new URL(location.href);
  for (const [key,value] of params) {
    if ((key === 'fwl' || key === 'math') && value === '0') url.searchParams.delete(key);
    else url.searchParams.set(key,value);
  }
  if (url.hash === '#fwl') url.hash = '';
  const encoded = params.toString();
  try { sessionStorage.setItem(storageKey,encoded); } catch { /* Optional. */ }
  try { history.replaceState({...history.state,estimatorCousins:encoded},'',url.href); } catch { /* Optional locally. */ }
}

function change() { render(); persist(); }
for (const input of methodInputs) input.addEventListener('change', () => { state.method = input.value; change(); });
for (const input of stepInputs) input.addEventListener('change', () => { state.step = Number(input.value); change(); });
byId('case-patient').addEventListener('change', event => { state.patient = event.target.value; change(); });
for (const [el,key] of [[mathDisclosure,'math'],[fwlDisclosure,'fwl']]) {
  el.addEventListener('toggle', () => {
    if (state[key] !== el.open) { state[key] = el.open; persist(); }
  });
}
window.addEventListener('popstate',readLocation);
window.addEventListener('hashchange',readLocation);
window.addEventListener('pageshow',() => setTimeout(readLocation,0));
readLocation();
