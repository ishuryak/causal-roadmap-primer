(function (root, factory) {
  'use strict';
  const api = factory();
  root.BleileGame = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const COMPONENTS = freeze([
    {id:'question', label:'Research question', short:'Question', definition:'Specify the people, treatment strategies, outcome and time horizon you want to compare.'},
    {id:'design', label:'Study design', short:'Design', definition:'Align eligibility, treatment assignment and follow-up so the records represent the comparison you intended.'},
    {id:'confounding', label:'Confounding', short:'Confounding', definition:'Common causes of treatment choice and survival can make the groups differ before treatment. Important causes may be unrecorded.'},
    {id:'positivity', label:'Treatment overlap', short:'Positivity', definition:'Both treatment options must be possible for the people in the question. Sparse or missing comparisons leave parts of that question unsupported.'},
    {id:'consistency', label:'Treatment definition', short:'Consistency', definition:'The treatment labels must correspond to the strategies being compared, with relevant versions of treatment specified.'},
    {id:'measurement', label:'Measurement', short:'Measurement', definition:'Check that health, treatment and outcomes are recorded accurately, at the right times and with usable definitions.'},
    {id:'censoring', label:'Follow-up', short:'Censoring', definition:'When outcomes become unavailable, explain how the remaining records can represent those lost to follow-up.'},
    {id:'estimation', label:'Estimation', short:'Estimation', definition:'Choose an estimator for the target quantity and check its fit, stability and uncertainty.'},
    {id:'sensitivity', label:'Sensitivity analysis', short:'Sensitivity', definition:'Ask how the conclusion changes under plausible departures from the assumptions. A reassuring check covers only the departures examined.'},
    {id:'transport', label:'Applicability elsewhere', short:'Transport', definition:'Applying a result to different people or settings needs an argument about which differences matter for the effect.'}
  ]);

  // These profiles and recoveries are stipulated teaching scenarios. A color
  // describes what the available investigation can address, not a universal
  // property of a causal assumption or a measured amount of bias.
  const SCENARIOS = freeze([
    {id:'rct', title:'The trial', subtitle:'A well-run randomized study',
      scores:{question:0,design:0,confounding:0,positivity:0,consistency:0,measurement:1,censoring:1,estimation:0,sensitivity:1,transport:2},
      clearable:{measurement:1,sensitivity:1}},
    {id:'rwd', title:'The records', subtitle:'A carefully designed observational study',
      scores:globalThis.BleilePrimer?.scores || {question:1,design:1,confounding:6,positivity:4,consistency:1,measurement:3,censoring:2,estimation:2,sensitivity:2,transport:2},
      clearable:globalThis.BleilePrimer?.clearable || {confounding:3,measurement:1,sensitivity:1}},
    {id:'poor', title:'The tangle', subtitle:'A poorly specified and poorly designed study',
      scores:{question:10,design:10,confounding:10,positivity:10,consistency:9,measurement:9,censoring:9,estimation:9,sensitivity:9,transport:9},
      clearable:{confounding:6,measurement:4,consistency:4,sensitivity:2}}
  ]);
  const componentIds = COMPONENTS.map(c=>c.id);
  const config = id => {
    const value=SCENARIOS.find(s=>s.id===id);
    if(!value)throw new RangeError('Unknown scenario: '+id);
    return value;
  };
  function initialState(scenario='rwd') {
    const source=config(scenario), bugs=[];
    for(const c of COMPONENTS)for(let i=0;i<source.scores[c.id];i++)bugs.push({
      id:c.id+'-'+i,component:c.id,
      kind:i<(source.clearable[c.id]||0)?'clearable':'persistent',
      cleared:false,seen:false
    });
    return freeze({scenario,bugs,history:[]});
  }
  function assertState(state) {
    if(!state||!Array.isArray(state.bugs)||!Array.isArray(state.history))throw new TypeError('Invalid game state.');
    const source=config(state.scenario), counts=Object.fromEntries(componentIds.map(id=>[id,0])), ids=new Set();
    for(const b of state.bugs){
      if(!b||!componentIds.includes(b.component)||!['clearable','persistent'].includes(b.kind)||typeof b.id!=='string'||ids.has(b.id)||typeof b.cleared!=='boolean'||typeof b.seen!=='boolean')throw new TypeError('Invalid bug.');
      if(b.cleared&&(!b.seen||b.kind!=='clearable'))throw new TypeError('Only a revealed, clearable bug can be cleared.');
      ids.add(b.id);counts[b.component]++;
    }
    for(const id of componentIds)if(counts[id]!==source.scores[id])throw new RangeError('The initial infestation must be preserved.');
  }
  function total(state) {assertState(state);return state.bugs.filter(b=>!b.cleared).length;}
  function scores(state) {
    assertState(state);
    const result=Object.fromEntries(componentIds.map(id=>[id,0]));
    for(const b of state.bugs)if(!b.cleared)result[b.component]++;
    return freeze(result);
  }
  const clearText=freeze({
    question:['Clarify the question','Specify the intended comparison.'],
    design:['Check the study timeline','Align eligibility and follow-up.'],
    confounding:['Recover pretreatment records','An important common cause is now recorded.'],
    positivity:['Review the comparison','A different question needs its own assessment.'],
    consistency:['Resolve treatment coding','Clarify the recorded treatment versions.'],
    measurement:['Validate the measurements','Check source records and timing.'],
    censoring:['Recover follow-up','Retrieve the available outcome records.'],
    estimation:['Check the analysis','Examine fit and uncertainty.'],
    sensitivity:['Test the bias scenarios','Only the specified departures are checked.'],
    transport:['Check the new setting','Reassess who the result can describe.']
  });
  const persistentText=freeze({
    question:['The question is underspecified','Needs a clearer target.'],
    design:['A gap in the study design','Needs a different design or argument.'],
    confounding:['Unmeasured common causes','Needs more evidence or stronger assumptions.'],
    positivity:['Missing treatment comparisons','Needs comparison data or a new question.'],
    consistency:['Ambiguous treatment versions','Needs a defensible treatment definition.'],
    measurement:['Unresolved measurement error','Needs validation beyond these records.'],
    censoring:['Incomplete follow-up','Needs evidence about the people lost.'],
    estimation:['Uncertain analytic fit','Needs further model checks.'],
    sensitivity:['Untested departures remain','Needs a broader sensitivity argument.'],
    transport:['A different population','Needs a separate transport argument.']
  });
  function getBugText(bug,state) {
    if(state)assertState(state);
    if(!bug||!componentIds.includes(bug.component))throw new RangeError('Unknown bug component.');
    if(state?.scenario==='rwd' && globalThis.BleilePrimer){const d=getBugDetails(bug,state);return freeze({title:d.title,subtitle:d.action});}
    const [title,subtitle]=(bug.kind==='clearable'?clearText:persistentText)[bug.component];
    if(state?.scenario==='rwd'&&bug.kind==='persistent'){
      const captions={question:['A few eligibility cases need review','The population and one-year contrast are specified.'],design:['A few decision dates need review','The study otherwise aligns time zero.'],consistency:['A few treatment versions need review','The treatment strategies are mostly consistent.']};
      if(captions[bug.component])return freeze({title:captions[bug.component][0],subtitle:captions[bug.component][1]});
    }
    return freeze({title,subtitle});
  }

  // Hover stories are fictional facts of these three worked examples. Each
  // color is tied to the current tools, and each size to a component judgment.
  const BUG_DETAILS = freeze({
    rct:{
      measurement:{
        clearable:{title:'A survival-code discrepancy',reason:'One-year survival codes do not fully agree with the source records. The source audit can resolve the discrepancy in this trial.',action:'Audit the survival codes'}
      },
      censoring:{
        persistent:{title:'A few outcomes are unavailable',reason:'Some randomized patients left follow-up before one year. Their survival outcomes are not in the available records.',action:'Obtain follow-up or justify the missingness assumption'}
      },
      sensitivity:{
        clearable:{title:'The missing-outcome check is unfinished',reason:'The trial has not yet checked its specified missing-outcome scenarios. The stipulated check is reassuring within those bounds.',action:'Check the specified scenarios'}
      },
      transport:{
        persistent:{title:'The trial enrolled a selected population',reason:'This trial excluded frailer patients treated in routine care. Randomization within the trial does not establish the effect for those patients.',action:'Build a separate transport argument'}
      }
    },
    rwd:{
      question:{
        persistent:{title:'The question is defined, with one boundary to review',reason:'The protocol specifies eligible patients, Treatment X versus usual care, and the difference in one-year survival. A small set of borderline eligibility cases still needs review.',action:'Adjudicate the remaining eligibility cases'}
      },
      design:{
        persistent:{title:'Time zero is aligned',reason:'Eligibility, treatment assignment and follow-up start at the recorded treatment decision for both strategies. A few uncertain decision dates still need adjudication.',action:'Review the remaining uncertain dates'}
      },
      confounding:{
        clearable:{title:'Pretreatment function can be recovered',reason:'Most baseline factors are recorded, but performance status is absent from the analysis and recoverable from pretreatment charts. In this example it helps explain both treatment choice and one-year survival.',action:'Recover pretreatment performance status'},
        persistent:{title:'Other common causes are unrecorded',reason:'The recovered performance status does not capture every shared cause of treatment choice and survival. Other clinically relevant baseline differences remain unrecorded.',action:'Seek additional evidence or justify the assumption'}
      },
      positivity:{
        persistent:{title:'A few subgroups have no comparison',reason:'Most patients have both options represented, but a few subgroups appear under only one treatment in these records. Recovering performance status does not create the missing comparison.',action:'Seek comparison data or reassess the subgroup question'}
      },
      consistency:{
        persistent:{title:'Treatment strategies are mostly clear',reason:'The protocol defines Treatment X and usual care consistently across clinics. A few changes in dose or schedule still need interpretation against those definitions.',action:'Review the remaining treatment-version cases'}
      },
      measurement:{
        clearable:{title:'One validation check remains',reason:'Most coding and timing checks are complete. Available source charts can resolve the remaining specified discrepancy and confirm pretreatment timing.',action:'Complete the source-record validation'},
        persistent:{title:'A limited validation gap remains',reason:'Most health and survival records have been checked, but a small set lacks source documentation. Auditing the available charts does not validate those missing sources.',action:'Obtain validation for the remaining records'}
      },
      censoring:{
        persistent:{title:'Follow-up is nearly complete',reason:'One-year survival is known for most patients. A small group left follow-up, and the remaining records do not establish how their outcomes compare with those retained.',action:'Recover the missing outcomes or assess their impact'}
      },
      estimation:{
        persistent:{title:'The main analysis has been checked',reason:'Basic fit and uncertainty checks are complete for the main comparison. Estimates in small subgroups remain sensitive to modeling choices.',action:'Check stability in the sparse subgroups'}
      },
      sensitivity:{
        clearable:{title:'Specified bias scenarios are unchecked',reason:'The analysis has not yet examined its prespecified departures from the assumptions. In this example the checked range gives reassuring results.',action:'Examine the specified bias scenarios'},
        persistent:{title:'Other departures remain untested',reason:'The reassuring sensitivity check covers only its specified scenarios. Larger or different unmeasured differences could still change the interpretation.',action:'Broaden the sensitivity argument'}
      },
      transport:{
        persistent:{title:'Transfer beyond these clinics needs review',reason:'These records come from selected clinics with a defined study population. Applying the one-year comparison in other settings still needs evidence about relevant differences.',action:'Assess the intended new population'}
      }
    },
    poor:{
      question:{
        persistent:{title:'The study never settled its target',reason:'Eligibility, Treatment X, usual care and the start of the one-year survival window were chosen inconsistently. The reported comparison has no stable target.',action:'Specify a coherent question and reassess'}
      },
      design:{
        persistent:{title:'Treatment is assigned after follow-up starts',reason:'Patients are labelled treated if they later receive Treatment X, while follow-up starts at clinic entry. Survival before treatment is therefore built into group assignment.',action:'Redesign time zero and treatment assignment'}
      },
      confounding:{
        clearable:{title:'Baseline charts were left unused',reason:'Pretreatment performance status is missing from the analysis even though some charts contain it. Recovering it can reduce this concern without repairing the study timeline.',action:'Recover the available baseline charts'},
        persistent:{title:'Treatment decisions remain poorly explained',reason:'Important reasons for choosing Treatment X were never recorded. Recovering the available charts leaves other common causes of treatment and survival unresolved.',action:'Obtain new evidence about treatment decisions'}
      },
      positivity:{
        persistent:{title:'The groups scarcely overlap',reason:'Treatment X is concentrated in patient profiles that have no usual-care counterparts in these records. Better coding cannot supply those missing comparisons.',action:'Collect comparison data or redefine the question'}
      },
      consistency:{
        clearable:{title:'Several treatment codes can be untangled',reason:'Some entries combine different Treatment X regimens, but source prescriptions identify their dose and schedule. These available records can resolve part of the ambiguity.',action:'Recover dose and schedule from prescriptions'},
        persistent:{title:'Other treatment versions remain ambiguous',reason:'Some prescriptions are missing and usual care was never specified consistently. Resolving available codes does not establish a coherent treatment strategy.',action:'Define strategies and obtain missing treatment detail'}
      },
      measurement:{
        clearable:{title:'Source records can fix some coding errors',reason:'Several health and survival codes conflict with source charts that are still available. A chart audit can correct those documented errors.',action:'Audit the available source charts'},
        persistent:{title:'Much of the measurement cannot be checked',reason:'Other outcomes and baseline health measures lack source documentation or reliable dates. A partial chart audit cannot validate those records.',action:'Obtain reliable measurement and timing data'}
      },
      censoring:{
        persistent:{title:'Loss to follow-up is extensive',reason:'Many patients vanish from the dataset before one-year survival is known. The study did not record why they left or obtain outcomes elsewhere.',action:'Recover follow-up and investigate the losses'}
      },
      estimation:{
        persistent:{title:'The model does not match the intended comparison',reason:'The analysis pools incompatible follow-up windows and extrapolates across sparse treatment groups. A precise model output would not repair those design gaps.',action:'Rebuild the design before reassessing the estimator'}
      },
      sensitivity:{
        clearable:{title:'A limited bias check is available',reason:'The team can examine a few prespecified coding and confounding scenarios. The stipulated results narrow concern within that range only.',action:'Run the available bias scenarios'},
        persistent:{title:'Major departures are still unexamined',reason:'The available sensitivity scenarios do not cover the flawed timeline, missing comparisons or extensive loss to follow-up.',action:'Reassess the unresolved design and bias mechanisms'}
      },
      transport:{
        persistent:{title:'The claim extends far beyond these records',reason:'The study claims an effect for routine-care patients broadly, but its convenience sample comes from a few atypical clinics. The necessary transport argument is absent.',action:'Name the target population and gather transport evidence'}
      }
    }
  });
  function getBugDetails(bug,state) {
    assertState(state);
    if(!bug||typeof bug.id!=='string')throw new RangeError('Unknown bug.');
    const current=state.bugs.find(b=>b.id===bug.id);
    if(!current||current.component!==bug.component||current.kind!==bug.kind)throw new RangeError('Unknown bug for this study.');
    const c=COMPONENTS.find(c=>c.id===current.component);
    const detail=(state.scenario==='rwd' && globalThis.BleilePrimer ? globalThis.BleilePrimer.details : BUG_DETAILS[state.scenario])?.[current.component]?.[current.kind];
    if(!detail)throw new RangeError('No story exists for this bug in this study.');
    const repairComplete=state.bugs.filter(b=>b.component===current.component&&b.kind==='clearable').every(b=>b.cleared);
    let reason=detail.reason;
    if(state.scenario==='rwd'&&!globalThis.BleilePrimer&&current.kind==='persistent'&&!repairComplete){
      if(current.component==='confounding')reason='Recovering performance status would still leave other shared causes of treatment choice and survival unresolved. Other clinically relevant baseline differences remain unrecorded.';
      if(current.component==='sensitivity')reason='The planned sensitivity check covers only its specified scenarios. Larger or different unmeasured differences could still change the interpretation.';
    }
    return freeze({component:c.id,label:c.label,score:scores(state)[c.id],
      title:detail.title,reason,
      action:current.cleared?'Resolved within this example':detail.action,
      status:current.cleared?'Cleared in this example':current.kind==='clearable'?'Available repair':'Unresolved with these tools',
      sizeNote:'Size follows this component’s concern level; each bug is one ding.'});
  }

  function transition(state,id,kind) {
    assertState(state);
    const bug=state.bugs.find(b=>b.id===id);
    if(!bug)throw new RangeError('Unknown bug: '+id);
    if((kind==='reveal'&&bug.seen)||(kind==='clear'&&(bug.cleared||!bug.seen||bug.kind!=='clearable')))return freeze({state,event:null});
    const before=total(state),bugs=state.bugs.map(b=>b.id===id?{...b,seen:true,cleared:kind==='clear'||b.cleared}:{...b});
    const text=getBugText(bug,state);
    const event={kind,bugId:id,component:bug.component,delta:kind==='clear'?-1:0,before,after:before-(kind==='clear'?1:0),...text};
    const next={scenario:state.scenario,bugs,history:[...state.history,event]};
    return freeze({state:next,event});
  }
  const reveal=(state,id)=>transition(state,id,'reveal');
  const clear=(state,id)=>transition(state,id,'clear');
  function verdict(state) {
    const profile=scores(state);
    if(state.scenario==='rct')return freeze({heading:'Strong starting design',subtitle:'Follow-up and applicability still matter.'});
    if(state.scenario==='poor')return freeze({heading:'Fundamental gaps remain',subtitle:'Better records cannot repair this design.'});
    if(state.bugs.some(b=>b.component==='confounding'&&b.kind==='clearable'&&!b.cleared))return freeze({heading:'Confounding obscures the comparison',subtitle:'Recover information about treatment choice.'});
    return freeze({heading:'Missing comparisons remain',subtitle:'Some subgroups still lack support; recovering confounders does not repair positivity.'});
  }
  return freeze({COMPONENTS,SCENARIOS,initialState,total,scores,reveal,clear,verdict,getBugText,getBugDetails});
});

