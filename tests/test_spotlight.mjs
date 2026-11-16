import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PRESETS,assess} from '../docs/v2/bleile-model.mjs';
import {spotlightAssessment} from '../docs/preview/spotlight-model.mjs';
const sandbox={};sandbox.window=sandbox;
vm.runInNewContext(readFileSync(new URL('../docs/preview/glasshouses/src/primer-config.js',import.meta.url),'utf8'),sandbox);
vm.runInNewContext(readFileSync(new URL('../docs/preview/glasshouses/src/game-model.js',import.meta.url),'utf8'),sandbox);
const G=sandbox.BleileGame;
let state=G.initialState('rwd');
assert.deepEqual(spotlightAssessment(G.scores(state)),{profile:PRESETS.start.scores,basis:PRESETS.start.basis});
assert.equal(G.total(state),60);
for(const bug of state.bugs){
  const before=G.total(state);state=G.reveal(state,bug.id).state;
  assert.equal(G.total(state),before,'Finding a concern never changes the score');
  const detail=G.getBugDetails(bug,state);
  assert(detail.reason && detail.action);
  assert(!/Treatment X|usual care|one.year|24|19 Bleiles/.test(detail.reason),'Susan must keep her own context');
}
for(const component of ['confounding','measurement','sensitivity']){
  const before=spotlightAssessment(G.scores(state));
  const bugs=state.bugs.filter(b=>b.component===component&&b.kind==='clearable');
  for(const [i,bug] of bugs.entries()){
    state=G.clear(state,bug.id).state;
    const assessment=spotlightAssessment(G.scores(state));
    assert.equal(assessment.profile.positivity,8);
    assert.equal(assessment.basis[component],i===bugs.length-1?'evidence':PRESETS.start.basis[component]);
    for(const id of Object.keys(before.profile))if(id!==component)assert.equal(assessment.profile[id],before.profile[id]);
  }
}
assert.equal(G.total(state),50);
assert.match(G.verdict(state).heading,/Missing comparisons/);
const recovered=spotlightAssessment(G.scores(state));
assert.deepEqual(recovered,{profile:PRESETS.recover.scores,basis:PRESETS.recover.basis});
assert.match(assess(recovered.profile,recovered.basis).verdict,/population-wide effect remains unsupported/);
assert.throws(()=>spotlightAssessment({...PRESETS.start.scores,positivity:7}));
assert.throws(()=>spotlightAssessment({...PRESETS.start.scores,confounding:3}));
assert.throws(()=>spotlightAssessment({...PRESETS.start.scores,measurement:5.5}));
assert.throws(()=>spotlightAssessment({}));
console.log('PASS spotlight: Susan’s context, reveal versus repair, 60 to 50, unchanged positivity, completed-repair basis and message validation');
