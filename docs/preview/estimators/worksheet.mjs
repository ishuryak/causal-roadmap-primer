(() => {
  'use strict';

  const profiles = [
    {label: 'Lower', standard: {people: 900, deaths: 180}, short: {people: 2100, deaths: 462}},
    {label: 'Higher', standard: {people: 1500, deaths: 600}, short: {people: 500, deaths: 125}}
  ];
  const people = [
    {id: 'P01', group: 0, a: 0, y: 0}, {id: 'P02', group: 0, a: 1, y: 0},
    {id: 'P03', group: 0, a: 1, y: 1}, {id: 'P04', group: 1, a: 1, y: 1},
    {id: 'P05', group: 1, a: 0, y: 1}, {id: 'P06', group: 1, a: 0, y: 0}
  ];
  const schedule = ['standard', 'short'];
  const eligible = profiles.map(p => p.standard.people + p.short.people);
  const treated = profiles.map(p => p.short.people);
  const profileRisks = profiles.map(p => schedule.map(a => p[a].deaths / p[a].people));
  const crudeRisks = schedule.map(a => sum(profiles.map(p => p[a].deaths)) / sum(profiles.map(p => p[a].people)));
  // Fitted probabilities from the unpenalized binomial GLM in analysis.Rmd.
  // Array order is [standard, short] within each frailty group.
  const sharedSlopeRisks = [
    [0.2411727171242990, 0.2023545498251430],
    [0.3752963697266447, 0.3241108908399532]
  ];
  const fitLabels = {observed:'No risk fit', crude:'Arm means', s:'One risk model', t:'Two risk models', x:'Cross-arm risks'};
  const effectLabels = {observed:'Individual effect', crude:'Crude difference', s:'Profile effect', t:'Profile effect', x:'Blended profile effect'};
  const stageName = {observed:'Observed data', crude:'Arm means', s:'S-learner', t:'T-learner', x:'X-learner'};
  const byId = id => document.getElementById(id);
  const signed = (x, digits) => (x < 0 ? '−' : x > 0 ? '+' : '') + Math.abs(x).toFixed(digits);
  const percent = x => (x * 100).toFixed(2).replace(/\.00$/, '') + '%';
  const points = x => signed(x * 100, 2);
  const decimal = x => x.toFixed(2);
  const nf = x => x.toLocaleString('en-US');
  const pp = (text,cls='') => '<p' + (cls ? ' class="' + cls + '"' : '') + '>' + text + '</p>';
  const equation = text => pp(text,'equation');
  const state = {stage:'observed', selected:3, allowInteraction:true, target:'ate', view:'patients'};
  const rowElements = [];

  function sum(xs) { return xs.reduce((total, x) => total + x, 0); }
  function risksFor(group) {
    if (state.stage === 'observed') return null;
    if (state.stage === 'crude') return crudeRisks;
    if (state.stage === 's' && !state.allowInteraction) return sharedSlopeRisks[group];
    return profileRisks[group];
  }
  function xFits(group) {
    const p = profiles[group];
    const [q0,q1] = profileRisks[group];
    // One fitted mean in each frailty stratum, using the actual arm's event counts.
    const d0 = (p.standard.deaths * (q1-1) + (p.standard.people-p.standard.deaths) * q1) / p.standard.people;
    const d1 = (p.short.deaths * (1-q0) + (p.short.people-p.short.deaths) * (-q0)) / p.short.people;
    const e = p.short.people / eligible[group];
    return {d0,d1,e,blended:e*d0 + (1-e)*d1};
  }
  function contrastFor(group) {
    const q = risksFor(group);
    if (!q) return null;
    return state.stage === 'x' ? xFits(group).blended : q[1]-q[0];
  }
  function rowPseudo(p, q) {
    return p.a
      ? {value:p.y - q[0], subtraction:p.y + ' − ' + decimal(q[0])}
      : {value:q[1] - p.y, subtraction:decimal(q[1]) + ' − ' + p.y};
  }
  function targetEstimate() {
    const counts = state.target === 'ate' ? eligible : treated;
    const total = sum(counts);
    return {counts, total, effect:sum(counts.map((n, group) => n * contrastFor(group))) / total};
  }
  function updateRecordFigure(person) {
    const stage = state.stage;
    const q = risksFor(person.group);
    const figure = byId('row-figure');
    figure.dataset.method = stage;
    figure.dataset.arm = schedule[person.a];
    byId('record-id').textContent = person.id;
    byId('record-fit-label').textContent = fitLabels[stage];
    schedule.forEach((arm, index) => {
      const observed = index === person.a;
      const outcomeCell = byId('record-y' + index);
      outcomeCell.textContent = observed ? String(person.y) : '?';
      outcomeCell.className = 'record-cell ' + (observed ? 'is-observed' : 'is-missing');
      outcomeCell.classList.toggle('is-source', stage === 'x' && observed);
      outcomeCell.setAttribute('aria-label', arm + ' outcome: ' + (observed ? person.y + ', observed' : 'unknown'));
      const riskCell = byId('record-q' + index);
      riskCell.textContent = q ? percent(q[index]) : '—';
      riskCell.classList.toggle('is-fitted', Boolean(q));
      riskCell.classList.toggle('is-source', stage === 'x' && !observed);
      riskCell.setAttribute('aria-label', arm + ' risk: ' + (q ? percent(q[index]) : 'not fitted'));
    });
    byId('record-pseudo').hidden = stage !== 'x';
    byId('record-note').hidden = stage === 'x';
    byId('record-result-label').textContent = effectLabels[stage];
    const effect = q ? points(contrastFor(person.group)) : null;
    const resultCell = byId('record-result');
    resultCell.textContent = effect ? effect + ' pp' : '?';
    resultCell.setAttribute('aria-label', effect ? effect + ' percentage points' : 'Unknown individual effect');
    if (stage === 'x') {
      const pseudo = rowPseudo(person,q);
      byId('record-subtraction').textContent = pseudo.subtraction;
      byId('record-pseudo-value').textContent = signed(pseudo.value,2);
      return;
    }
    let caption;
    if (stage === 's') {
      caption = state.allowInteraction ? 'One regression predicts twice, allowing a different frailty slope in each arm.' : 'One regression predicts both schedules using a shared frailty slope.';
    } else if (stage === 't') {
      caption = 'Two arm-specific regressions predict at the same frailty.';
    } else if (stage === 'crude') {
      caption = 'Every row gets the two arm means. Their frailty mixes differ.';
    } else {
      caption = 'The green digit is recorded. The other outcome stays unknown.';
    }
    byId('record-note').textContent = caption;
  }
  function updateMath() {
    const p = people[state.selected];
    const stage = state.stage;
    const q = risksFor(p.group);
    const group = profiles[p.group];
    const adjusted = ['s','t','x'].includes(stage);
    byId('math-context').textContent = stageName[stage] + ' · ' + p.id + ' · ' + group.label.toLowerCase() + ' frailty';
    for (const method of Object.keys(stageName)) byId('math-' + method).hidden = method !== stage;
    byId('math-target').hidden = !adjusted;
    if (stage === 'observed') {
      byId('math-observed-value').textContent = p.id + ' received ' + schedule[p.a] + ', so Y(' + p.a + ') = ' + p.y + '. Y(' + (1-p.a) + ') is unknown.';
    }
    if (!adjusted) return;
    if (stage === 'x') {
      const {d0,d1,e,blended} = xFits(p.group);
      const pseudo = rowPseudo(p,q);
      byId('math-x-risks').textContent = 'Fitted risk at this frailty is ' + percent(q[0]) + ' under standard and ' + percent(q[1]) + ' under short.';
      byId('math-arm-short').classList.toggle('current', p.a === 1);
      byId('math-arm-standard').classList.toggle('current', p.a === 0);
      byId('math-x-pseudo').textContent = p.id + ' (' + schedule[p.a] + ') uses Eq. ' + (p.a ? '7' : '8') + '. ' + pseudo.subtraction + ' = ' + signed(pseudo.value,2) + '.';
      byId('math-x-fits').textContent = 'Average training pseudo-outcomes at this frailty within each arm. The standard fit is ' + points(d0) + ' points and the short fit is ' + points(d1) + '. Here g = ' + nf(group.short.people) + ' / ' + nf(eligible[p.group]) + '.';
      byId('math-x-blend').textContent = decimal(e) + ' × (' + points(d0) + ') + ' + decimal(1-e) + ' × (' + points(d1) + ') = ' + points(blended) + ' points.';
    } else {
      byId('math-' + stage + '-value').textContent = p.id + ' shares this frailty profile. ' + percent(q[1]) + ' − ' + percent(q[0]) + ' ≈ ' + points(contrastFor(p.group)) + ' percentage points.';
      if (stage === 's') byId('math-s-model').textContent = state.allowInteraction
        ? 'A treatment-by-frailty interaction gives each schedule its own intercept and slope. Here the two fitted risks match T.'
        : 'The pooled model shares a frailty slope on the log-odds scale. The common treatment odds ratio can still give different risk differences.';
    }
    const isAte = state.target === 'ate';
    const {counts,total,effect} = targetEstimate();
    byId('math-ate').hidden = !isAte;
    byId('math-att').hidden = isAte;
    byId('math-target-name').textContent = 'Worksheet population average · ' + (isAte ? 'all eligible patients (ATE)' : 'short recipients (ATT)');
    byId('math-target-value').textContent = '[' + nf(counts[0]) + ' × (' + points(contrastFor(0)) + ') + ' + nf(counts[1]) + ' × (' + points(contrastFor(1)) + ')] / ' + nf(total) + ' ≈ ' + points(effect) + ' points.';
  }

  function buildRows() {
    const body = byId('patients').tBodies[0];
    people.forEach((person, index) => {
      const row = body.insertRow();
      const group = profiles[person.group].label;
      const arm = schedule[person.a];
      const armTitle = person.a ? 'Short' : 'Standard';
      const status = person.y ? 'died by five years' : 'alive at five years';
      const idCell = document.createElement('th');
      idCell.scope = 'row';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'idbtn';
      button.textContent = person.id;
      button.setAttribute('aria-label', 'Trace ' + person.id + ', ' + group.toLowerCase() + ' frailty, ' + arm + ', ' + status);
      idCell.append(button);
      const compact = document.createElement('span');
      compact.className = 'mobile-profile';
      compact.setAttribute('aria-hidden','true');
      const mobileGroup = document.createElement('span');
      mobileGroup.textContent = group;
      const mobileArm = document.createElement('span');
      mobileArm.textContent = person.a ? 'Short' : 'Std.';
      compact.append(mobileGroup,mobileArm);
      idCell.append(compact);
      row.append(idCell);
      for (const value of [group, armTitle, String(person.y)]) {
        const cell = row.insertCell();
        cell.className = 'record-long';
        cell.textContent = value;
      }
      const factual = schedule.map((name, a) => {
        const cell = row.insertCell();
        if (a===0) cell.dataset.split = '';
        const value = document.createElement('span');
        value.className = person.a === a ? 'obs' : 'unknown';
        value.textContent = person.a === a ? String(person.y) : '?';
        value.setAttribute('aria-label', person.a === a ? 'Observed ' + person.y + ', ' + status : 'Unobserved outcome under ' + name);
        cell.append(value);
        return cell;
      });
      const risks = schedule.map((name, a) => {
        const cell = row.insertCell();
        if (a===0) cell.dataset.split = '';
        const value = document.createElement('span');
        cell.append(value);
        return {cell,value};
      });
      const delta = row.insertCell();
      delta.dataset.split = '';
      delta.className = 'diff';
      rowElements.push({row,button,factual,risks,delta});
      row.addEventListener('click', () => {
        state.selected = index;
        changeWorksheet();
      });
    });
  }
  function updateTable() {
    byId('contrast-label').textContent = state.stage === 'x' ? 'X effect' : 'Short − std.';
    byId('x-key').hidden = state.stage !== 'x';
    people.forEach((person, index) => {
      const cells = rowElements[index];
      const selected = index === state.selected;
      const q = risksFor(person.group);
      const effect = contrastFor(person.group);
      cells.row.classList.toggle('selected', selected);
      cells.button.setAttribute('aria-pressed', String(selected));
      cells.factual.forEach((cell, a) => cell.classList.toggle('source', selected && state.stage === 'x' && person.a === a));
      cells.risks.forEach(({cell,value}, a) => {
        value.className = q ? 'risk' : 'risk pending';
        value.textContent = q ? percent(q[a]) : '·';
        value.setAttribute('aria-label', q ? 'Predicted risk under ' + schedule[a] + ': ' + percent(q[a]) : 'Risk has not been fitted');
        cell.classList.toggle('source', selected && state.stage === 'x' && person.a !== a);
      });
      cells.delta.textContent = effect === null ? '·' : points(effect);
      cells.delta.setAttribute('aria-label', effect === null ? 'Effect not estimated' : points(effect) + ' percentage points');
    });
  }
  function updateTableViewport() {
    const area = byId('table-scroll');
    const canScroll = area.scrollWidth > area.clientWidth + 1;
    area.tabIndex = canScroll ? 0 : -1;
    byId('scroll-hint').hidden = !canScroll;
  }

  function updateTrace() {
    const p = people[state.selected];
    const arm = schedule[p.a];
    const alternate = schedule[1-p.a];
    const q = risksFor(p.group);
    const effect = contrastFor(p.group);
    byId('trace-title').textContent = p.id;
    byId('trace-profile').textContent = profiles[p.group].label + ' frailty · ' + arm + ' schedule';
    let content;
    if (state.stage === 'observed') {
      const outcome = p.y ? 'died by five years' : 'was alive at five years';
      content = pp(p.id + ' ' + outcome + ' after ' + arm + '. Their observed ' + p.y + ' fills that schedule’s outcome column. What would have happened under ' + alternate + '?');
    } else if (state.stage === 'x') {
      const {d0,d1} = xFits(p.group);
      const pseudo = rowPseudo(p,q);
      content = '<h4>Signed pseudo-outcome</h4>' + equation(pseudo.subtraction + ' = ' + signed(pseudo.value,2));
      content += pp(p.a ? 'Observed short outcome minus predicted standard risk.' : 'Predicted short risk minus observed standard outcome.');
      content += '<h4>Effect at this frailty</h4>' + pp('Standard fit ' + points(d0) + ' points. Short fit ' + points(d1) + ' points. Their blend gives ' + points(effect) + ' points.');
    } else {
      content = '<h4>' + (state.stage === 'crude' ? 'Observed arm averages' : 'Two predicted risks') + '</h4>';
      content += equation(percent(q[1]) + ' − ' + percent(q[0]) + ' ≈ ' + points(effect) + ' points');
      if (state.stage === 'crude') content += pp('Every row gets these same two arm averages.');
      if (state.stage === 's') content += pp(state.allowInteraction ? 'One fit gives each schedule its own intercept and frailty slope.' : 'One fit shares its frailty slope on the log-odds scale across both schedules.');
      if (state.stage === 't') content += pp('Both arm-specific fits use this patient’s baseline frailty.');
    }
    byId('trace-body').innerHTML = content;
  }

  function updateEffects(adjusted) {
    byId('effects-observed').hidden = adjusted;
    byId('effects-adjusted').hidden = !adjusted;
    if (!adjusted) {
      byId('unadjusted-note').textContent = state.stage === 'crude'
        ? 'The crude association is ' + points(contrastFor(0)) + ' percentage points. The two arms contain different mixes of frailty.'
        : 'These are observed arm totals. Choose S, T or X to compare schedules in the same target population.';
      return;
    }
    ['lower','higher'].forEach((key, group) => {
      const effect = contrastFor(group);
      const bar = byId('bar-' + key);
      const width = Math.abs(effect) / .40 * 100;
      bar.style.width = width + '%';
      bar.style.left = (effect < 0 ? 50-width : 50) + '%';
      bar.classList.toggle('positive', effect > 0);
      byId('effect-' + key).textContent = points(effect) + ' pp';
    });
    const {counts,total,effect} = targetEstimate();
    byId('target-value').textContent = points(effect) + ' percentage points';
    byId('target-note').textContent = nf(total) + (state.target === 'ate' ? ' eligible patients' : ' short recipients') +
      ' contribute equally. ' + nf(counts[0]) + ' have lower frailty and ' + nf(counts[1]) + ' have higher frailty.';
  }

  const viewInputs = document.querySelectorAll('input[name="view"]');
  const cousinLinks = document.querySelectorAll('a[data-patient-link]');
  const views = ['patients','effects','math'];
  const stateKeys = ['method','patient','view','target','slope'];
  const storageKey = 'causal-roadmap.estimator-worksheet.v1';

  function readLocation() {
    let params = new URL(location.href).searchParams;
    const explicit = stateKeys.some(key => params.has(key));
    if (!explicit) {
      const entry = history.state && history.state.estimatorWorksheet;
      if (typeof entry === 'string') params = new URLSearchParams(entry);
      else {
        try {
          params = new URLSearchParams(sessionStorage.getItem(storageKey) || '');
        } catch {
          // The current URL remains usable when browser storage is unavailable.
        }
      }
    }
    const method = params.get('method');
    const view = params.get('view');
    const index = people.findIndex(p => p.id === (params.get('patient') || '').toUpperCase());
    state.stage = Object.hasOwn(stageName,method) ? method : 'observed';
    state.selected = index >= 0 ? index : 3;
    state.target = params.get('target') === 'att' ? 'att' : 'ate';
    state.view = views.includes(view) ? view : 'patients';
    state.allowInteraction = params.get('slope') !== 'shared';
    const fields = rememberState();
    if (!explicit && history.state?.estimatorWorksheet !== fields.toString()) {
      // Keep a bare address tied to its own history entry when returning from another page.
      try { history.replaceState({...history.state, estimatorWorksheet:fields.toString()}, ''); } catch { /* Optional locally. */ }
    }
    render();
  }

  function rememberState() {
    const fields = new URLSearchParams({
      method:state.stage, patient:people[state.selected].id, view:state.view,
      target:state.target, slope:state.allowInteraction ? 'separate' : 'shared'
    });
    try { sessionStorage.setItem(storageKey, fields.toString()); } catch { /* Optional on file URLs. */ }
    return fields;
  }

  function persist() {
    const fields = rememberState();
    const url = new URL(location.href);
    for (const [key,value] of fields) url.searchParams.set(key,value);
    if (url.href !== location.href) {
      const entry = {...history.state, estimatorWorksheet:fields.toString()};
      try { history.replaceState(entry, '', url.href); } catch {
        try { history.replaceState(entry, ''); } catch { /* Local-file browser restrictions. */ }
      }
    }
  }

  function render() {
    const p = people[state.selected];
    const adjusted = ['s','t','x'].includes(state.stage);
    byId('method').value = state.stage;
    byId('patient').value = p.id;
    for (const link of cousinLinks) link.href = 'cousins.html?patient=' + encodeURIComponent(p.id);
    byId('target').value = state.target;
    byId('target').disabled = !adjusted;
    byId('s-setting').hidden = state.stage !== 's';
    byId('interaction').value = state.allowInteraction ? 'separate' : 'shared';
    for (const input of viewInputs) input.checked = input.value === state.view;
    for (const view of views) byId('view-' + view).hidden = view !== state.view;
    updateRecordFigure(p);
    updateTable();
    updateTrace();
    updateEffects(adjusted);
    updateMath();
    updateTableViewport();
    const details = state.stage === 'x'
      ? ' Signed pseudo-outcome ' + signed(rowPseudo(p, risksFor(p.group)).value,2) + '.'
      : '';
    const population = adjusted ? ' ' + state.target.toUpperCase() + ' ' + points(targetEstimate().effect) + ' percentage points.' : '';
    byId('live-note').textContent = stageName[state.stage] + ', ' + p.id + ', ' + state.view + '.' + details + population;
  }

  function changeWorksheet() {
    render();
    persist();
  }

  byId('method').addEventListener('change', event => { state.stage = event.target.value; changeWorksheet(); });
  byId('patient').addEventListener('change', event => {
    state.selected = people.findIndex(p => p.id === event.target.value);
    changeWorksheet();
  });
  byId('target').addEventListener('change', event => { state.target = event.target.value; changeWorksheet(); });
  byId('interaction').addEventListener('change', event => { state.allowInteraction = event.target.value === 'separate'; changeWorksheet(); });
  for (const input of viewInputs) input.addEventListener('change', () => { state.view = input.value; changeWorksheet(); });
  window.addEventListener('popstate', readLocation);
  window.addEventListener('pageshow', () => {
    // Browsers can restore native form values silently after showing a history entry.
    setTimeout(readLocation,0);
  });
  buildRows();
  readLocation();
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(updateTableViewport);
    observer.observe(byId('table-scroll'));
    observer.observe(byId('patients'));
  }
})();
