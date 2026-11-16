const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../src/game-model.js');
const clone=s=>JSON.parse(JSON.stringify(s));
const clearAll=(s,component)=>s.bugs.filter(b=>b.kind==='clearable'&&(!component||b.component===component)).reduce((state,b)=>G.clear(G.reveal(state,b.id).state,b.id).state,s);

test('three stipulated scenarios span 5, 24 and 94, with 0–10 per component',()=>{
  assert.equal(G.COMPONENTS.length,10);
  assert.deepEqual(G.SCENARIOS.map(c=>G.total(G.initialState(c.id))),[5,24,94]);
  for(const c of G.SCENARIOS){const s=G.initialState(c.id);assert.deepEqual(G.scores(s),c.scores);assert(Object.values(G.scores(s)).every(v=>v>=0&&v<=10));}
  assert.match(G.SCENARIOS[0].subtitle,/well-run/i);
  const middle=G.initialState('rwd');
  assert.deepEqual(G.scores(middle),{question:1,design:1,confounding:6,positivity:4,consistency:1,measurement:3,censoring:2,estimation:2,sensitivity:2,transport:2});
  assert.equal(middle.bugs.filter(b=>b.kind==='clearable').length,5);
  assert(G.total(middle)<G.total(G.initialState('poor'))/3);
});

test('all bugs exist initially but are unseen, and scenario state is independent',()=>{
  const a=G.initialState(),b=G.initialState('rct'),snapshot=clone(b);
  assert(a.bugs.every(b=>!b.seen&&!b.cleared));
  const next=G.reveal(a,a.bugs[0].id).state;
  assert.equal(next.bugs.length,a.bugs.length);assert.deepEqual(b,snapshot);
  assert.equal(a.bugs[0].seen,false);assert.equal(next.bugs[0].seen,true);
});

test('revelation never spawns bugs or increases any concern score',()=>{
  for(const c of G.SCENARIOS){let s=G.initialState(c.id),before=G.scores(s),count=s.bugs.length;
    for(const b of s.bugs){const out=G.reveal(s,b.id);s=out.state;assert.equal(out.event.delta,0);assert.equal(out.event.before,out.event.after);assert.equal(s.bugs.length,count);assert.deepEqual(G.scores(s),before);}
    assert(s.bugs.every(b=>b.seen));
  }
});

test('unseen and persistent bugs cannot be neutralized',()=>{
  const s=G.initialState();const blue=s.bugs.find(b=>b.kind==='clearable'),red=s.bugs.find(b=>b.kind==='persistent');
  assert.equal(G.clear(s,blue.id).event,null);assert.strictEqual(G.clear(s,blue.id).state,s);
  const found=G.reveal(s,red.id).state;assert.equal(G.clear(found,red.id).event,null);assert.equal(G.total(found),24);
});

test('recoveries produce 24→21→20→19 while positivity stays at 4',()=>{
  let s=G.initialState();
  for(const [component,total] of [['confounding',21],['measurement',20],['sensitivity',19]]){
    s=clearAll(s,component);assert.equal(G.total(s),total);assert.equal(G.scores(s).positivity,4);
  }
  assert.equal(G.scores(s).confounding,3);assert.match(G.verdict(s).heading,/Missing comparisons/);
});

test('component scores are nonfungible: each neutralization only changes its own component',()=>{
  let s=G.initialState();
  for(const bug of s.bugs.filter(b=>b.kind==='clearable')){
    s=G.reveal(s,bug.id).state;const before=G.scores(s),out=G.clear(s,bug.id);s=out.state;
    assert.equal(out.event.delta,-1);assert.equal(out.event.component,bug.component);
    for(const c of G.COMPONENTS)assert.equal(G.scores(s)[c.id],before[c.id]-(c.id===bug.component?1:0));
  }
});

test('revealing or clearing twice has no duplicate event, history or points',()=>{
  let s=G.initialState(),b=s.bugs.find(b=>b.kind==='clearable');
  s=G.reveal(s,b.id).state;assert.strictEqual(G.reveal(s,b.id).state,s);assert.equal(G.reveal(s,b.id).event,null);
  s=G.clear(s,b.id).state;assert.equal(G.total(s),23);assert.equal(s.history.length,2);
  assert.strictEqual(G.clear(s,b.id).state,s);assert.equal(G.clear(s,b.id).event,null);
});

test('all blue bugs cleared leaves red concerns in every scenario',()=>{
  for(const [id,expected] of [['rct',3],['rwd',19],['poor',78]]){
    const s=clearAll(G.initialState(id));assert.equal(G.total(s),expected);
    assert(s.bugs.filter(b=>!b.cleared).every(b=>b.kind==='persistent'));
    assert(Object.values(G.scores(s)).every(v=>v>=0&&v<=10));
  }
});

test('scenario and event objects are immutable without changing caller values',()=>{
  const s=clone(G.initialState()),before=clone(s),id=s.bugs.find(b=>b.kind==='clearable').id;
  const out=G.reveal(s,id);assert.deepEqual(s,before);
  assert(Object.isFrozen(out));assert(Object.isFrozen(out.state));assert(Object.isFrozen(out.state.bugs));assert(Object.isFrozen(out.state.bugs[0]));assert(Object.isFrozen(out.event));
  assert(Object.isFrozen(G.SCENARIOS[0].scores));
});

test('verdicts retain residual concerns and do not certify a treatment effect',()=>{
  assert.match(G.verdict(G.initialState()).heading,/Confounding/);
  let partial=G.initialState();
  for(const b of partial.bugs.filter(b=>b.component==='confounding'&&b.kind==='clearable').slice(0,2))partial=G.clear(G.reveal(partial,b.id).state,b.id).state;
  assert.equal(G.scores(partial).confounding,4);
  assert.match(G.verdict(partial).heading,/Confounding/);
  assert.match(G.verdict(clearAll(partial,'confounding')).subtitle,/Some subgroups still lack support/);
  assert.match(G.verdict(clearAll(G.initialState())).subtitle,/does not repair positivity/);
  assert.match(G.verdict(clearAll(G.initialState('rct'))).subtitle,/Follow-up and applicability/);
  assert.match(G.verdict(clearAll(G.initialState('poor'))).subtitle,/cannot repair this design/);
  const s=G.initialState(),b=s.bugs.find(b=>b.component==='sensitivity'&&b.kind==='clearable');
  assert.match(G.getBugText(b,s).subtitle,/Only the specified departures/);
});

test('unknown scenarios, unknown bugs and malformed state are rejected',()=>{
  assert.throws(()=>G.initialState('imaginary'),/Unknown scenario/);
  assert.throws(()=>G.reveal(G.initialState(),'imaginary'),/Unknown bug/);
  const s=clone(G.initialState());s.bugs[0].cleared=true;assert.throws(()=>G.total(s),/revealed, clearable/);
  assert.throws(()=>G.scores({}),/Invalid game state/);
});

test('every active scenario/component has a specific immutable hover story',()=>{
  for(const scenario of G.SCENARIOS){
    const state=G.initialState(scenario.id);
    for(const bug of state.bugs){
      const detail=G.getBugDetails(bug,state);
      assert.deepEqual(Object.keys(detail),['component','label','score','title','reason','action','status','sizeNote']);
      assert.equal(detail.component,bug.component);
      assert.equal(detail.score,scenario.scores[bug.component]);
      assert(detail.title.length>5&&detail.reason.length>40&&detail.action.length>5);
      assert.match(detail.sizeNote,/each bug is one ding/);
      assert(Object.isFrozen(detail));
    }
  }
});

test('hover details follow the current component score without rewriting other components',()=>{
  const before=G.initialState(),blue=before.bugs.find(b=>b.component==='confounding'&&b.kind==='clearable');
  const red=before.bugs.find(b=>b.component==='confounding'&&b.kind==='persistent');
  const positivity=before.bugs.find(b=>b.component==='positivity');
  assert.equal(G.getBugDetails(blue,before).score,6);
  assert.match(G.getBugDetails(blue,before).reason,/performance status/i);
  const after=clearAll(before,'confounding');
  assert.equal(G.getBugDetails(red,after).score,3);
  assert.match(G.getBugDetails(red,after).reason,/does not capture every shared cause/);
  assert.equal(G.getBugDetails(positivity,after).score,4);
  assert.match(G.getBugDetails(positivity,after).reason,/does not create the missing comparison/);
  assert.equal(G.getBugDetails(blue,after).status,'Cleared in this example');
  assert.equal(G.getBugDetails(blue,after).score,3);
});

test('hover stories distinguish scenario-specific study failures from generic definitions',()=>{
  const trial=G.initialState('rct'),records=G.initialState('rwd'),poor=G.initialState('poor');
  const story=(s,c,kind)=>G.getBugDetails(s.bugs.find(b=>b.component===c&&(!kind||b.kind===kind)),s);
  assert.match(story(trial,'transport').reason,/excluded frailer patients/);
  assert.match(story(records,'transport').reason,/selected clinics/);
  assert.match(story(poor,'transport').reason,/convenience sample/);
  assert.match(story(records,'design').reason,/start at the recorded treatment decision/);
  assert.match(story(records,'question').reason,/protocol specifies eligible patients/i);
  assert.match(story(records,'consistency').reason,/defines Treatment X and usual care consistently/);
  assert.doesNotMatch(story(records,'design').reason,/do not.*line up|need alignment/);
  assert.match(story(poor,'design').reason,/later receive Treatment X/);
  assert.notEqual(story(records,'confounding','clearable').reason,story(records,'confounding','persistent').reason);
  assert.notEqual(story(poor,'measurement','clearable').action,story(poor,'measurement','persistent').action);
});

test('hover actions distinguish available repairs from remaining assumptions and preserve sensitivity scope',()=>{
  for(const scenario of G.SCENARIOS){const state=G.initialState(scenario.id);
    for(const bug of state.bugs){
      const detail=G.getBugDetails(bug,state);
      assert.equal(detail.status,bug.kind==='clearable'?'Available repair':'Unresolved with these tools');
      if(bug.component==='sensitivity'&&bug.kind==='clearable')assert.match(detail.reason,/bounds|within that range|checked range/);
    }
  }
  const state=clearAll(G.initialState('poor'));
  const design=state.bugs.find(b=>b.component==='design');
  assert.equal(G.getBugDetails(design,state).score,10);
  assert.match(G.getBugDetails(design,state).reason,/Survival before treatment/);
});

test('hover detail rejects unknown bugs, altered component identity, unsupported kinds and invalid state',()=>{
  const s=G.initialState(),b=s.bugs[0];
  assert.throws(()=>G.getBugDetails({id:'unknown',component:'question',kind:'persistent'},s),/Unknown bug/);
  assert.throws(()=>G.getBugDetails({...b,component:'confounding'},s),/Unknown bug/);
  assert.throws(()=>G.getBugDetails({...b,kind:'clearable'},s),/Unknown bug/);
  assert.throws(()=>G.getBugDetails(null,s),/Unknown bug/);
  assert.throws(()=>G.getBugDetails(b,{scenario:'unknown',bugs:[],history:[]}),/Unknown scenario/);
});

test('persistent hover stories distinguish planned work from completed recovery and checks',()=>{
  const initial=G.initialState();
  for(const [component,beforeText,afterText] of [
    ['confounding',/Recovering performance status would still leave/,/The recovered performance status/],
    ['sensitivity',/The planned sensitivity check/,/The reassuring sensitivity check/]
  ]){
    const red=initial.bugs.find(b=>b.component===component&&b.kind==='persistent');
    assert.match(G.getBugDetails(red,initial).reason,beforeText);
    const first=initial.bugs.find(b=>b.component===component&&b.kind==='clearable');
    const partial=G.clear(G.reveal(initial,first.id).state,first.id).state;
    const hasUnfinished=partial.bugs.some(b=>b.component===component&&b.kind==='clearable'&&!b.cleared);
    assert.match(G.getBugDetails(red,partial).reason,hasUnfinished?beforeText:afterText);
    const complete=clearAll(initial,component);
    assert.match(G.getBugDetails(red,complete).reason,afterText);
    assert.doesNotMatch(G.getBugDetails(red,complete).reason,beforeText);
  }
  const measurementOnly=clearAll(initial,'measurement');
  const sensitivity=initial.bugs.find(b=>b.component==='sensitivity'&&b.kind==='persistent');
  assert.match(G.getBugDetails(sensitivity,measurementOnly).reason,/planned/);
});
