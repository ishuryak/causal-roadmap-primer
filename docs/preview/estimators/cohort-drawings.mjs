import {cousins} from './cousins-model.mjs';

const ink = '#30296c';
const purple = '#733e87';
const blue = '#265898';
const green = '#216b38';
const lightInk = '#d5d4e0';
const pen = "'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive";
const num = new Intl.NumberFormat('en-US');

const percent = value => (100 * value).toFixed(2) + '%';
const points = value => (value < 0 ? '−' : value > 0 ? '+' : '') + (100 * Math.abs(value)).toFixed(2);
const proportion = value => (100 * value).toFixed(0) + '%';
const groupNames = ['Lower', 'Higher'];

function text(x, y, words, {size = 23, color = ink, anchor = 'start'} = {}) {
  const label = size <= 23 ? ' class="cohort-label"' : '';
  return `<text${label} x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${words}</text>`;
}

function stroke(d, color = purple, width = 2.6) {
  return `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none"/>`;
}

function tick(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">${stroke('M-7 0q3 3 5 6Q3-2 9-8', green, 3.2)}</g>`;
}

function ring(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">${stroke('M-2-10c-6 0-10 5-9 11s6 10 12 9 10-6 9-12S3-12-2-10', purple, 2.4)}</g>`;
}

function people(x, y, count) {
  const strokes = [
    'M11 3c-5-1-8 4-7 8s4 6 8 4 5-7 4-10q-1-3-5-2M9 16l1 12-6 11m6-11 7 10M2 22l8-3 9-2',
    'M11 4c-4-2-8 2-8 7s4 8 8 6 6-7 3-11l-3-2m3 1q4-6 5-2t-4 4M9 17l-1 12-5 9m5-9 7 10M1 22l7-2 10 4',
    'M11 2C6 1 3 6 4 11s5 7 9 4 4-9 1-12l-3-1M10 17l2 12-6 11m6-11 8 9M2 20l9 3 8-7'
  ];
  return `<g transform="translate(${x} ${y})">${strokes.slice(0, count).map((d, i) =>
    `<g transform="translate(${i * 21} ${i === 1 ? -2 : 0})">${stroke(d, green, 2.4)}</g>`
  ).join('')}</g>`;
}

function rightBrace(x, top, height) {
  // A continuous pen stroke collecting a column of entries.
  return `<g transform="translate(${x} ${top}) scale(1 ${height / 100})">
    <path d="M0 1c12-1 11 11 10 23s0 22 11 26c-13 4-13 13-12 25s2 22-10 24"
      fill="none" stroke="${purple}" stroke-width="2.6" vector-effect="non-scaling-stroke"/></g>`;
}

function straightArrow(x, y, length) {
  return stroke(`M${x} ${y}q${length / 2} 2 ${length} -1m-8 -5 9 5-8 5`);
}

function startingRisks() {
  const {profiles} = cousins.tmle;
  const rows = profiles.map((p, i) => {
    const y = 104 + i * 90;
    return people(10, y - 29, 3 - i)
      + text(85, y - 2, groupNames[i])
      + text(85, y + 24, num.format(p.n), {size: 22, color: green})
      + straightArrow(166, y - 2, 43)
      + text(281, y + 7, percent(p.initial), {size: 30, color: blue, anchor: 'middle'})
      + text(369, y + 6, '=', {size: 26, color: purple, anchor: 'middle'})
      + text(448, y + 7, percent(p.initial), {size: 30, color: blue, anchor: 'middle'});
  }).join('');
  return {
    title: 'TMLE starts with one risk per frailty group',
    description: profiles.map((p, i) => `${groupNames[i]} frailty, ${num.format(p.n)} patients. Both schedule predictions start at ${percent(p.initial)}.`).join(' '),
    drawing: text(16, 38, 'Baseline frailty')
      + text(281, 38, 'Standard', {anchor: 'middle'})
      + text(448, 38, 'Short', {anchor: 'middle'})
      + stroke('M14 51Q145 48 251 51t270-1', lightInk, 1.5)
      + rows + stroke('M251 226q48 3 93 2t114-1q15 0 27-2', blue, 1.8)
      + text(367, 258, 'Same initial risk', {color: purple, anchor: 'middle'})
  };
}

function targetedRisks() {
  const {profiles, scoreBefore, scoreAfter} = cousins.tmle;
  const rows = profiles.map((p, i) => {
    const y = 86 + i * 90;
    const fork = stroke(`M169 ${y}c33 0 43-21 87-22m-8-4 9 4-8 6M169 ${y}c35 0 43 21 87 22m-8-6 9 6-9 4`);
    return text(16, y - 6, groupNames[i] + ' frailty', {size: 23})
      + text(39, y + 24, percent(p.initial), {size: 29, color: blue})
      + fork + text(268, y - 15, percent(p.q0), {size: 28, color: blue})
      + text(397, y - 16, 'standard')
      + text(268, y + 30, percent(p.q1), {size: 28, color: blue})
      + text(397, y + 29, 'short');
  }).join('');
  const scoreValue = score => (score < 0 ? '−' : '') + Math.abs(score).toFixed(3);
  return {
    title: 'A signed update changes both schedule risks',
    description: profiles.map((p, i) => `${groupNames[i]} frailty starts at ${percent(p.initial)}. The targeted standard risk is ${percent(p.q0)} and the short risk is ${percent(p.q1)}.`).join(' ')
      + ` The cohort mean weighted residual moves from ${scoreValue(scoreBefore)} to ${scoreValue(scoreAfter)}.`,
    drawing: text(18, 32, 'Starting risk') + text(270, 32, 'After targeting')
      + rows + stroke('M18 221q133 2 259 0t242 0', lightInk, 1.5)
      + text(18, 258, 'Mean weighted error', {size: 22})
      + text(317, 258, scoreValue(scoreBefore), {size: 25, color: purple, anchor: 'end'})
      + straightArrow(327, 249, 52)
      + text(398, 258, scoreValue(scoreAfter), {size: 25, color: green})
  };
}

function standardizedRisks() {
  const {profiles, standardRisk, shortRisk, ate} = cousins.tmle;
  const [lower, higher] = profiles;
  const row = (y, name, key, risk) => text(12, y, name, {size: 23})
    + text(188, y, percent(lower[key]), {size: 25, color: blue, anchor: 'middle'})
    + text(316, y, percent(higher[key]), {size: 25, color: blue, anchor: 'middle'})
    + straightArrow(366, y - 8, 29)
    + text(462, y, percent(risk), {size: 28, color: blue, anchor: 'middle'});
  const weights = profiles.map(p => proportion(p.n / cousins.n));
  return {
    title: 'TMLE averages the targeted risks over the same clinic population',
    description: `Both arms use ${weights[0]} lower-frailty and ${weights[1]} higher-frailty patients. The standard risk is ${percent(standardRisk)} and the short risk is ${percent(shortRisk)}. Short minus standard is ${points(ate)} percentage points.`,
    drawing: text(190, 31, weights[0] + ' lower', {size: 22, anchor: 'middle'})
      + text(318, 31, weights[1] + ' higher', {size: 22, anchor: 'middle'})
      + people(157, 36, 3) + people(297, 36, 2)
      + text(461, 62, 'Average', {anchor: 'middle'})
      + stroke('M12 84q119-3 251-2t256 0', lightInk, 1.5)
      + row(122, 'Standard', 'q0', standardRisk)
      + row(173, 'Short', 'q1', shortRisk)
      + stroke('M407 189q47 4 102-1', blue, 1.9)
      + text(16, 241, 'Short − standard', {size: 25})
      + straightArrow(218, 232, 38)
      + text(275, 244, points(ate) + ' points', {size: 34, color: purple})
  };
}

function crossFitting(fold) {
  const size = 30, left = 103, top = 82, gap = 42;
  const columns = cousins.dml.folds.map((f, col) =>
    text(left + col * gap, 53, f.id, {size: 22, anchor: 'middle'})).join('');
  const matrix = cousins.dml.folds.map((f, row) => {
    const y = top + row * size;
    const cells = cousins.dml.folds.map((part, col) =>
      part.id === f.id ? ring(left + col * gap, y, 0.87) : tick(left + col * gap, y, 0.94)).join('');
    return (fold.id === f.id ? straightArrow(12, y, 20) : '')
      + text(56, y + 6, f.id, {size: 22, anchor: 'middle'}) + cells;
  }).join('');
  return {
    title: 'Each fold takes one turn as the validation data',
    description: `Each of the five fit rounds trains on the four green check-marked folds and scores the one open-circle fold. In round ${fold.id}, ${num.format(fold.trainN)} records train the models and the ${num.format(fold.holdoutN)} records in fold ${fold.id} are held out. Each record receives one held-out score.`,
    drawing: text(186, 23, 'Data fold', {anchor: 'middle', size: 23}) + text(18, 54, 'Fit', {size: 22}) + columns
      + stroke('M78 66q103-2 211 0M79 66q-1 76 0 150', ink, 1.6)
      + matrix
      + tick(329, 79) + text(346, 87, 'Train', {color: green, size: 25})
      + text(346, 118, num.format(fold.trainN) + ' records', {size: 21})
      + ring(329, 160) + text(346, 168, 'Hold out', {color: purple, size: 25})
      + text(346, 198, num.format(fold.holdoutN) + ' records', {size: 21})
      + stroke('M19 227q130 2 259 0t236 0', lightInk, 1.5)
      + text(270, 261, `Fit ${fold.id} scores only fold ${fold.id}`, {anchor: 'middle', color: purple, size: 25})
  };
}

function scoreFold(fold) {
  const training = cousins.dml.folds.filter(f => f.id !== fold.id).map(f => f.id);
  const trainIds = training.map((id, i) =>
    text(32 + i * 36, 75, id, {color: green, size: 29, anchor: 'middle'})).join('');
  const held = cousins.tmle.profiles.map((_, group) =>
    fold.holdoutCells.filter(cell => cell.group === group).reduce((count, cell) => count + cell.n, 0));
  const row = (y, label, value, color) => text(72, y, label, {size: 22})
    + text(480, y, points(value), {size: 26, color, anchor: 'end'});
  return {
    title: `Use other-fold fits to correct the mean in held-out fold ${fold.id}`,
    description: `Folds ${training.join(', ')} train the models. They score the ${held[0]} lower-frailty and ${held[1]} higher-frailty patients in fold ${fold.id}. Its fitted mean risk difference is ${points(fold.initialDifference)} percentage points. Adding its mean weighted error of ${points(fold.meanCorrection)} gives ${points(fold.ate)} percentage points, after rounding.`,
    drawing: text(17, 32, 'Fit on folds') + trainIds
      + stroke('M22 83q59 3 127-1', green, 1.8)
      + straightArrow(168, 66, 58)
      + text(242, 32, 'Score fold') + ring(270, 66, 1.5)
      + text(270, 74, fold.id, {color: purple, size: 24, anchor: 'middle'})
      + text(331, 58, num.format(held[0]) + ' lower', {size: 22})
      + text(331, 85, num.format(held[1]) + ' higher', {size: 22})
      + text(479, 117, 'percentage points', {size: 19, anchor: 'end'})
      + row(151, 'Mean fitted difference', fold.initialDifference, blue)
      + text(32, 191, '+', {size: 29, color: purple}) + row(191, 'Mean weighted error', fold.meanCorrection, green)
      + stroke('M29 208q137-2 235 0t224-2', ink, 2)
      + text(32, 250, '≈', {size: 28, color: purple})
      + row(249, `Fold ${fold.id} mean`, fold.ate, purple)
  };
}

function pooledScores(selected) {
  const {folds, ate} = cousins.dml;
  const rows = folds.map((f, i) => {
    const y = 66 + 37 * i;
    return (f.id === selected.id ? ring(55, y - 8, 1.04) : '')
      + text(55, y, f.id, {size: 22, anchor: 'middle'})
      + text(207, y, points(f.ate), {size: 26, color: blue, anchor: 'end'});
  }).join('');
  return {
    title: 'Pool the five held-out fold means',
    description: folds.map(f => `Fold ${f.id} contributes ${num.format(f.holdoutN)} held-out scores with a mean of ${points(f.ate)} percentage points.`).join(' ')
      + ` Their population average is ${points(ate)} points across ${num.format(cousins.n)} patients.`,
    drawing: text(55, 28, 'Fold', {anchor: 'middle'}) + text(207, 28, 'Mean (pp)', {size: 21, anchor: 'end'})
      + stroke('M22 38q98-1 193 0', lightInk, 1.6)
      + rows + rightBrace(224, 46, 186) + straightArrow(251, 138, 40)
      + text(410, 101, 'All ' + num.format(cousins.n) + ' records', {size: 22, anchor: 'middle'})
      + text(410, 151, points(ate), {color: purple, size: 40, anchor: 'middle'})
      + stroke('M353 166q59 2 112-1', purple, 2)
      + text(410, 202, 'percentage points', {size: 22, anchor: 'middle'})
      + text(259, 268, 'Each person contributes one held-out score', {size: 20, anchor: 'middle'})
  };
}

const drawings = {
  tmle: [startingRisks, targetedRisks, standardizedRisks],
  dml: [crossFitting, scoreFold, pooledScores]
};

export function renderDrawing(svg, method, step, foldIndex = 0) {
  const draw = drawings[method]?.[step - 1];
  const fold = cousins.dml.folds[foldIndex];
  if (!draw || !fold) throw new RangeError('Choose an available method, step and fold.');
  const {title, description, drawing} = draw(fold);
  svg.setAttribute('viewBox', '0 0 540 284');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', title);
  svg.setAttribute('aria-description', description);
  svg.innerHTML = `<title>${title}</title><desc>${description}</desc>
    <style>@media (max-width: 480px) {
      .cohort-label {font: 550 22px system-ui, sans-serif;}
    }</style>
    <rect width="540" height="284" fill="#fff"/>
    <g font-family="${pen}" stroke-linecap="round" stroke-linejoin="round">${drawing}</g>`;
}
