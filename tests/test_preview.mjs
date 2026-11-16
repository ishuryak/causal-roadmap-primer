import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {COMPONENTS} from '../docs/v2/bleile-model.mjs';
const file=new URL('../docs/preview/index.html',import.meta.url);
const html=readFileSync(file,'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'IDs must remain unique for deep links and controller selectors');
const dynamicIds=new Set(COMPONENTS.map(c=>'bleile-'+c.id));
for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(id)||dynamicIds.has(id),'Broken anchor #'+id);
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
for(const c of COMPONENTS)assert(ids.includes(c.section),'Each game component has a lesson destination');
for(const oldId of [...readFileSync(new URL('../docs/v2/index.html',import.meta.url),'utf8').matchAll(/<section\b[^>]*id="([^"]+)"/g)].map(m=>m[1]))assert(ids.includes(oldId),'Preserve old section link '+oldId);
console.log('PASS preview navigation, ordering, deep links, assets, citation and isolated worksheet storage');
