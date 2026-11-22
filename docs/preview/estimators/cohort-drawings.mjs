import {cousins} from './cousins-model.mjs';

const ink = '#30296c';
const purple = '#733e87';
const blue = '#265898';
const green = '#216b38';
const lightInk = '#d5d4e0';
const pen = "'Bradley Hand', 'Segoe Print', 'Comic Sans MS', 'Trebuchet MS', Arial, sans-serif";
const labels = "system-ui, 'Segoe UI', Arial, sans-serif";
const num = new Intl.NumberFormat('en-US');

const percent = value => (100 * value).toFixed(2) + '%';
const points = value => (value < 0 ? '−' : value > 0 ? '+' : '') + (100 * Math.abs(value)).toFixed(2);
const proportion = value => (100 * value).toFixed(0) + '%';
const groupNames = ['Lower', 'Higher'];

function text(x, y, words, {size = 20, color = ink, anchor = 'start', hand = false} = {}) {
  const font = hand ? ` font-family="${pen}"` : '';
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}"${font}>${words}</text>`;
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

function people(x, y, count, scale) {
  const strokes = [
    'M11 3c-5-1-8 4-7 8s4 6 8 4 5-7 4-10q-1-3-5-2M9 16l1 12-6 11m6-11 7 10M2 22l8-3 9-2',
    'M11 4c-4-2-8 2-8 7s4 8 8 6 6-7 3-11l-3-2m3 1q4-6 5-2t-4 4M9 17l-1 12-5 9m5-9 7 10M1 22l7-2 10 4',
    'M11 2C6 1 3 6 4 11s5 7 9 4 4-9 1-12l-3-1M10 17l2 12-6 11m6-11 8 9M2 20l9 3 8-7'
  ];
  return `<g transform="translate(${x} ${y}) scale(${scale})">${strokes.slice(0, count).map((d, i) =>
    `<g transform="translate(${i * 21} ${i === 1 ? -2 : 0})">${stroke(d, green, 2.9)}</g>`
  ).join('')}</g>`;
}

function rightBrace(x, top, height) {
  return `<g transform="translate(${x} ${top}) scale(1 ${height / 100})">
    <path d="M0 1c12-1 11 11 10 23s0 22 11 26c-13 4-13 13-12 25s2 22-10 24"
      fill="none" stroke="${purple}" stroke-width="2.6" vector-effect="non-scaling-stroke"/></g>`;
}

function straightArrow(x, y, length) {
  return stroke(`M${x} ${y}q${length / 2} 2 ${length} -1m-7 -4 8 4-7 5`);
}

function startingRisks() {
  const {profiles} = cousins.tmle;
  const rows = profiles.map((p, i) => {
    const y = 79 + i * 85;
    return text(8, y, groupNames[i])
      + people(8, y + 8, 3 - i, .64)
      + text(54, y + 31, num.format(p.n), {color: green})
      + text(180, y + 18, percent(p.initial), {size: 24, color: blue, anchor: 'middle', hand: true})
      + text(243, y + 17, '=', {size: 23, color: purple, anchor: 'middle'})
      + text(307, y + 18, percent(p.initial), {size: 24, color: blue, anchor: 'middle', hand: true});
  }).join('');
  return {
    title: 'TMLE starts with one risk per frailty group',
    description: profiles.map((p, i) => `${groupNames[i]} frailty, ${num.format(p.n)} patients. Both schedule predictions start at ${percent(p.initial)}.`).join(' '),
    drawing: text(8, 32, 'Frailty')
      + text(180, 32, 'Standard', {anchor: 'middle'})
      + text(307, 32, 'Short', {anchor: 'middle'})
      + stroke('M8 46q76-2 171 0t171-1', lightInk, 1.5)
      + rows + stroke('M143 210q54 3 116 1t89-2', blue, 1.7)
      + text(180, 253, 'Same risk under either schedule', {color: purple, anchor: 'middle'})
  };
}

function targetedRisks() {
  const {profiles, scoreBefore, scoreAfter} = cousins.tmle;
  const rows = profiles.map((p, i) => {
    const y = 80 + i * 80;
    const fork = stroke(`M127 ${y + 4}q15 0 30-14m-6 0 7-1-2 6M127 ${y + 4}q12 1 30 23m-6-2 7 3-1-7`);
    return text(8, y - 6, groupNames[i] + ' frailty')
      + text(12, y + 24, percent(p.initial), {size: 25, color: blue, hand: true})
      + fork
      + text(166, y - 5, percent(p.q0), {size: 23, color: blue, hand: true})
      + text(269, y - 5, 'standard')
      + text(166, y + 32, percent(p.q1), {size: 23, color: blue, hand: true})
      + text(269, y + 32, 'short');
  }).join('');
  const scoreValue = score => (score < 0 ? '−' : '') + Math.abs(score).toFixed(3);
  return {
    title: 'A signed update changes both schedule risks',
    description: profiles.map((p, i) => `${groupNames[i]} frailty starts at ${percent(p.initial)}. The targeted standard risk is ${percent(p.q0)} and the short risk is ${percent(p.q1)}.`).join(' ')
      + ` The cohort mean weighted error moves from ${scoreValue(scoreBefore)} to ${scoreValue(scoreAfter)}.`,
    drawing: text(8, 30, 'Starting risk') + text(166, 30, 'Updated risk')
      + stroke('M8 41q72-2 160 0t182 0', lightInk, 1.5)
      + rows + stroke('M8 208q95 2 168 0t174 0', lightInk, 1.5)
      + text(180, 235, 'Mean weighted error', {anchor: 'middle'})
      + text(137, 264, scoreValue(scoreBefore), {size: 24, color: purple, anchor: 'end', hand: true})
      + straightArrow(155, 255, 48)
      + text(222, 264, scoreValue(scoreAfter), {size: 24, color: green, hand: true})
  };
}

function standardizedRisks() {
  const {profiles, standardRisk, shortRisk, ate} = cousins.tmle;
  const weights = profiles.map(p => proportion(p.n / cousins.n));
  const rows = profiles.map((p, i) => {
    const y = 75 + i * 57;
    return people(6, y - 11, 3 - i, .61)
      + text(53, y, weights[i], {color: green}) + text(53, y + 23, groupNames[i].toLowerCase())
      + text(180, y + 14, percent(p.q0), {size: 24, color: blue, anchor: 'middle', hand: true})
      + text(305, y + 14, percent(p.q1), {size: 24, color: blue, anchor: 'middle', hand: true});
  }).join('');
  return {
    title: 'TMLE averages the targeted risks over the same clinic population',
    description: `Both schedules use ${weights[0]} lower-frailty and ${weights[1]} higher-frailty patients. The standard risk is ${percent(standardRisk)} and the short risk is ${percent(shortRisk)}. Short minus standard is ${points(ate)} percentage points.`,
    drawing: text(8, 30, 'Frailty mix') + text(180, 30, 'Standard', {anchor: 'middle'})
      + text(305, 30, 'Short', {anchor: 'middle'})
      + stroke('M8 43q84-2 171 0t171-1', lightInk, 1.5) + rows
      + stroke('M8 171q86 2 177 0t165 0', lightInk, 1.5)
      + text(8, 199, 'Average')
      + text(180, 200, percent(standardRisk), {size: 26, color: blue, anchor: 'middle', hand: true})
      + text(305, 200, percent(shortRisk), {size: 26, color: blue, anchor: 'middle', hand: true})
      + text(180, 235, 'Short − standard', {anchor: 'middle'})
      + text(180, 265, points(ate) + ' points', {size: 27, color: purple, anchor: 'middle', hand: true})
  };
}

function crossFitting(fold) {
  const {folds} = cousins.dml;
  const columns = folds.map((f, col) => text(109 + 48 * col, 52, f.id, {anchor: 'middle'})).join('');
  const matrix = folds.map((f, row) => {
    const y = 79 + row * 28;
    const cells = folds.map((part, col) =>
      part.id === f.id ? ring(109 + 48 * col, y, .82) : tick(109 + 48 * col, y, .91)).join('');
    return (fold.id === f.id ? straightArrow(7, y, 18) : '')
      + text(51, y + 6, f.id, {anchor: 'middle'}) + cells;
  }).join('');
  return {
    title: 'Each fold takes one turn as the held-out data',
    description: `Each of the five rounds trains on the four check-marked folds and applies the fitted models to the one open-circle fold. In round ${fold.id}, ${num.format(fold.trainN)} records train the models and the ${num.format(fold.holdoutN)} records in fold ${fold.id} are held out.`,
    drawing: text(205, 24, 'Data fold', {anchor: 'middle'}) + text(6, 52, 'Round') + columns
      + stroke('M76 63q125-1 247 0M76 63q-2 67 0 139', ink, 1.6) + matrix
      + tick(17, 224) + text(34, 231, 'Train ' + num.format(fold.trainN), {color: green})
      + ring(173, 224, .91) + text(191, 231, 'Hold out ' + num.format(fold.holdoutN), {color: purple})
      + text(180, 264, `Round ${fold.id} holds out fold ${fold.id}`, {anchor: 'middle', color: purple})
  };
}

function correctFold(fold) {
  const training = cousins.dml.folds.filter(f => f.id !== fold.id).map(f => f.id);
  const trainIds = training.map((id, i) =>
    text(20 + i * 32, 54, id, {color: green, size: 26, anchor: 'middle', hand: true})).join('');
  const held = cousins.tmle.profiles.map((_, group) =>
    fold.holdoutCells.filter(cell => cell.group === group).reduce((count, cell) => count + cell.n, 0));
  const row = (y, label, value, color, result = false) => text(9, y, label)
    + text(349, y, (result ? '≈ ' : '') + points(value), {size: result ? 29 : 26, color, anchor: 'end', hand: true});
  return {
    title: `Correct the fitted difference in held-out fold ${fold.id}`,
    description: `Folds ${training.join(', ')} train the models. Apply those fits to the ${held[0]} lower-frailty and ${held[1]} higher-frailty patients of fold ${fold.id}. In percentage points, the mean fitted difference is ${points(fold.initialDifference)} and the mean held-out correction is ${points(fold.meanCorrection)}. Adding their unrounded values gives a fold estimate of ${points(fold.ate)}. Each displayed value is rounded separately.`,
    drawing: text(8, 23, 'Fit on folds') + text(217, 23, 'Held-out fold')
      + trainIds + straightArrow(140, 45, 73) + ring(278, 45, 1.17)
      + text(278, 53, fold.id, {size: 23, color: purple, anchor: 'middle', hand: true})
      + text(180, 84, `${num.format(held[0])} lower · ${num.format(held[1])} higher frailty`, {anchor: 'middle'})
      + stroke('M8 96q83 2 160 0t182 0', lightInk, 1.5)
      + text(9, 123, 'Difference in percentage points')
      + row(155, 'Mean fitted difference', fold.initialDifference, blue)
      + row(186, 'Add held-out correction', fold.meanCorrection, green)
      + stroke('M8 198q83-2 160 0t181-1', ink, 1.8)
      + row(229, `Fold ${fold.id} estimate`, fold.ate, purple, true)
      + text(180, 263, 'Each value is rounded separately.', {anchor: 'middle'})
  };
}

function pooledEstimates() {
  const {folds, ate} = cousins.dml;
  const rows = folds.map((f, i) => {
    const y = 88 + 29 * i;
    return text(30, y, f.id, {anchor: 'middle'})
      + text(147, y, points(f.ate), {size: 24, color: blue, anchor: 'end', hand: true});
  }).join('');
  return {
    title: 'Pool the five held-out fold estimates',
    description: folds.map(f => `Fold ${f.id} contributes ${num.format(f.holdoutN)} held-out records with a mean contribution of ${points(f.ate)} percentage points.`).join(' ')
      + ` Averaging all ${num.format(cousins.n)} contributions gives ${points(ate)} percentage points.`,
    drawing: text(180, 25, 'Difference in percentage points', {anchor: 'middle'})
      + text(30, 57, 'Fold', {anchor: 'middle'}) + text(153, 57, 'Estimate', {anchor: 'end'})
      + stroke('M9 65q67-1 144 0', lightInk, 1.5) + rows
      + rightBrace(161, 70, 143) + straightArrow(187, 143, 23)
      + text(284, 112, 'All ' + num.format(cousins.n), {anchor: 'middle'}) + text(284, 138, 'records', {anchor: 'middle'})
      + text(284, 180, points(ate), {size: 35, color: purple, anchor: 'middle', hand: true})
      + stroke('M239 190q40 3 91-1', purple, 2)
      + stroke('M8 227q83-2 164 0t178-1', lightInk, 1.5)
      + text(180, 261, num.format(folds[0].holdoutN) + ' held-out records per fold', {anchor: 'middle'})
  };
}

const drawings = {
  tmle: [startingRisks, targetedRisks, standardizedRisks],
  dml: [crossFitting, correctFold, pooledEstimates]
};

export function renderDrawing(svg, method, step, foldIndex = 0) {
  const draw = drawings[method]?.[step - 1];
  const fold = cousins.dml.folds[foldIndex];
  if (!draw || !fold) throw new RangeError('Choose an available method, step and fold.');
  const {title, description, drawing} = draw(fold);
  svg.setAttribute('viewBox', '0 0 360 278');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', title);
  svg.setAttribute('aria-description', description);
  svg.innerHTML = `<title>${title}</title><desc>${description}</desc>
    <rect width="360" height="278" fill="#fff"/>
    <g font-family="${labels}" stroke-linecap="round" stroke-linejoin="round">${drawing}</g>`;
}
