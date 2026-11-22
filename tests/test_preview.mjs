import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {COMPONENTS} from '../docs/v2/bleile-model.mjs';
import {renderDrawing} from '../docs/preview/estimators/cohort-drawings.mjs';
const file=new URL('../docs/preview/index.html',import.meta.url);
const html=readFileSync(file,'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'IDs must remain unique for deep links and controller selectors');
for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(id),'Broken anchor #'+id);
for(const [,path] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(/^(https?:|mailto:|data:)/.test(path))continue;
  assert(existsSync(resolve(dirname(fileURLToPath(file)),path.split(/[?#]/)[0])),'Missing local asset '+path);
}
const sections=[...html.matchAll(/<section\b[^>]*data-learning-step="(\d+)"[^>]*id="([^"]+)"/g)].map(m=>[Number(m[1]),m[2]]);
assert.equal(sections.length,8,'One section per learning step');
assert.deepEqual(sections.map(s=>s[0]),[1,2,3,4,5,6,7,8],'Steps must follow the promised order');
for(const cls of ['roadmap-flow']){
  const region=html.match(new RegExp('<(?:ol|nav)[^>]*class="'+cls+'"[^>]*>([\\s\\S]*?)</(?:ol|nav)>'))?.[1];
  assert(region,cls+' navigation exists');
  assert.deepEqual([...region.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]),sections.map(s=>s[1]),'Navigation and lesson sequence agree');
}
assert(!html.includes('class="chapter-track"'),'Use one step index instead of competing numbered navigation');
assert(!html.includes('class="learning-takeaway"'),'Keep the main route free of repeated lesson summaries');
for(const id of ['practice-fold','worksheet-fold','references-fold'])assert.match(html,new RegExp('<details\\b(?=[^>]*id="'+id+'")(?![^>]*\\bopen)[^>]*>'),'Optional material starts collapsed: '+id);
assert(html.indexOf('id="causal-verdict"')<html.indexOf('id="bleile-game"'),'Game follows the core interpretation');
assert(html.indexOf('id="estimand"')<html.indexOf('id="identify"'),'Causal estimand is defined before identification');
assert(html.indexOf('id="identify"')<html.indexOf('id="statistical-target"'),'Statistical target follows identification');
assert.match(html,/href="\.\.\/v2\/"/,'Keep comparison link');
assert.match(html,/<meta\b(?=[^>]*name="robots")(?=[^>]*content="noindex, nofollow")[^>]*>/);
assert(!/\bsections? \d/i.test(html),'Cross-references must not retain the superseded section numbering');
assert(!html.includes('0000000000001636'),'Preview citation points to the intended article');
const controller=readFileSync(new URL('../docs/preview/app.mjs',import.meta.url),'utf8');
assert(controller.includes('causal-roadmap-worksheet-preview-v1'),'Preview worksheet state is isolated');
for (const component of COMPONENTS) {
  assert(ids.includes(component.section), 'Each game component has a lesson destination');
  assert(ids.includes('bleile-' + component.id), 'Checkpoint link exists before game initialization: ' + component.id);
}
for(const oldId of [...readFileSync(new URL('../docs/v2/index.html',import.meta.url),'utf8').matchAll(/<section\b[^>]*id="([^"]+)"/g)].map(m=>m[1]))assert(ids.includes(oldId),'Preserve old section link '+oldId);
const stepSix = html.slice(html.indexOf('id="estimators"'), html.indexOf('id="checks"'));
assert(stepSix.split('<details')[0].includes('href="estimators/index.html"'), 'The tutorial is visible on the main Step 6 path');
const overviewFile = new URL('estimators/index.html', file);
const tutorialPages = ['index.html', 'worksheet.html', 'tmle.html', 'dml.html', 'guide.html', 'paper.html'];
const pageHtml = name => readFileSync(new URL(name, overviewFile), 'utf8');
for (const page of tutorialPages) {
  const source = pageHtml(page);
  const nav = source.match(/<nav\b[^>]*aria-label="Estimator tutorial"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert(nav, 'Shared navigation is available on ' + page);
  assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(match => match[1]), tutorialPages);
  assert.match(nav, new RegExp('<a\\b(?=[^>]*href="' + page + '")(?=[^>]*aria-current="page")[^>]*>'));
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'IDs are unique on ' + page);
  for (const [, target] of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:)/.test(target)) continue;
    const linked = new URL(target, new URL(page, overviewFile));
    assert(existsSync(linked), page + ' links to missing ' + target);
    if (linked.hash && linked.pathname.endsWith('.html')) {
      const linkedHtml = readFileSync(linked, 'utf8');
      assert(linkedHtml.includes('id="' + linked.hash.slice(1) + '"'), page + ' links to missing anchor ' + target);
    }
  }
}
const overview = pageHtml('index.html');
assert.equal([...overview.matchAll(/type="radio" name="family"/g)].length, 4, 'The methods map has four branches');
assert(!overview.includes('paper-reader.mjs') && !overview.includes('worksheet.mjs'),
  'The introduction loads independently of the worksheet and PDF reader');
const legacyScript = overview.match(/<script>([\s\S]*?)<\/script>/)[1];
for (const [hash, expected] of Object.entries({
  '': null, '#main': null, '#methods-map': null, '#unknown': null, '#worksheet': 'worksheet.html',
  '#math': 'worksheet.html?view=math', '#x-weights': 'worksheet.html?method=x&patient=P04&view=math',
  '#field-guide': 'guide.html', '#paper': 'paper.html', '#support': 'guide.html#support',
  '#fitting-records': 'guide.html#fitting-records'
})) {
  const from = new URL(hash, 'https://example.org/preview/estimators/');
  let destination = null;
  runInNewContext(legacyScript, {URL, location: {hash, href: from.href, replace(url) {destination = url.href;}}});
  assert.equal(destination, expected && new URL(expected, from).href, 'Bookmark ' + hash);
}
const paper = pageHtml('paper.html');
const pdfPath = paper.match(/href="([^":]+\.pdf)#page=3"/)?.[1];
assert(pdfPath, 'Readers can open the local PDF at the published equations');
assert.equal(readFileSync(new URL(pdfPath, overviewFile)).subarray(0, 5).toString(), '%PDF-');
const reader = pageHtml('paper-reader.mjs');
assert(paper.includes('src="paper-reader.mjs"') && reader.includes(pdfPath) && reader.includes('pdfjs.getDocument'),
  'The inline white reader opens the same complete article');
for (const asset of ['equations-page.webp', 'vendor/pdf.mjs', 'vendor/pdf.worker.mjs', 'vendor/LICENSE']) {
  assert(existsSync(new URL(asset, overviewFile)), 'Missing paper reader asset ' + asset);
}
assert(pageHtml('worksheet.html').includes('href="analysis.Rmd"'), 'The worked R notebook is available at the worksheet');
assert(overview.includes('ink/observed.png') && pageHtml('guide.html').includes('ink/fitted.png'), 'The overview and field guide use the original ECA pen drawings');
assert(overview.includes('guide.html#vocabulary'), 'The introduction connects learners with the estimator vocabulary');
for (const method of ['tmle', 'dml']) {
  const lesson = pageHtml(method + '.html');
  assert(lesson.includes('href="analysis.Rmd"'), 'Both lessons link to the workbook');
  assert(!lesson.includes('id="case-patient"'), 'The walkthrough uses the cohort');
  assert.deepEqual([...lesson.matchAll(/<template id="([^"]+)"/g)].map(m => m[1]),
    [1, 2, 3].map(step => method + '-math-' + step), 'Only the current method owns equations');
  for (const id of ['fold-control', 'fwl', 'residual-plot', 'sampling-note']) {
    assert.equal(lesson.includes('id="' + id + '"'), method === 'dml', id + ' belongs exclusively to DML');
  }
  assert.equal(lesson.includes('id="profile-comparison"'), method === 'tmle');
}
const oldMethodLink = pageHtml('cousins.html').match(/<script>([\s\S]*?)<\/script>/)[1];
for (const [suffix, stored, expected] of [
  ['', '', 'tmle.html'],
  ['', 'method=dml&step=2&fold=3', 'dml.html?step=2&fold=3'],
  ['?method=dml&step=2&fold=5&math=1', '', 'dml.html?step=2&math=1&fold=5'],
  ['?method=tmle&step=2&fold=5&fwl=1#fwl', 'method=dml', 'tmle.html?step=2'],
  ['?method=plr#fwl', '', 'dml.html#fwl'],
  ['#fwl', '', 'dml.html#fwl'],
  ['?fwl=1', '', 'dml.html#fwl'],
  ['?method=dml#how-fit', '', 'dml.html#how-fit'],
  ['?method=tmle#math-disclosure', '', 'tmle.html#math-disclosure'],
  ['?method=plr#math-disclosure', '', 'dml.html?fwl=1#math-disclosure']
]) {
  const href = new URL('cousins.html' + suffix, 'https://example.org/preview/estimators/');
  let destination;
  runInNewContext(oldMethodLink, {URL, URLSearchParams, history: {}, sessionStorage: {getItem: () => stored},
    location: {href: href.href, replace(value) { destination = value; }}});
  assert.equal(destination, new URL(expected, href).href, 'Old method link ' + suffix);
}
// Exercise the same SVG renderer as the interactive board, including every held-out fold.
let pooledDrawing;
for (const method of ['tmle', 'dml']) {
  for (const step of [1, 2, 3]) {
    for (const fold of method === 'dml' ? [0, 1, 2, 3, 4] : [0]) {
      const svg = {setAttribute() {}, innerHTML: ''};
      renderDrawing(svg, method, step, fold);
      assert.match(svg.innerHTML, /<title>[^<]+<\/title><desc>[^<]+<\/desc>/);
      assert.doesNotMatch(svg.innerHTML, /NaN|undefined|Infinity/);
      if (method === 'tmle' && step === 2) {
        assert.match(svg.innerHTML, /percentage points, the cohort mean weighted error moves from −4\.80 to 0\.00/);
      }
      if (method === 'dml' && step < 3) assert.match(svg.innerHTML, new RegExp('fold ' + (fold + 1), 'i'));
      if (method === 'dml' && step === 3) {
        if (fold === 0) pooledDrawing = svg.innerHTML;
        else assert.equal(svg.innerHTML, pooledDrawing, 'Pooling all records is independent of the last selected fold');
      }
      if (step === 3) assert(svg.innerHTML.includes('−4.80'), 'The cohort figure shows the fitted estimate');
    }
  }
}
assert.match(html, /<html\b[^>]*\bdata-theme="light"/, 'The test roadmap uses the white palette');
const practice = html.slice(html.indexOf('id="spotlight-game"'), html.indexOf('class="bleile-workbench"'));
assert(practice.includes('https://andystats.github.io/bleile-glasshouses/'), 'Practice links to the standalone confounding game');
console.log('PASS preview navigation, ordering, deep links, assets, citation and isolated worksheet storage');
