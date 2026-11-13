import {COMPONENTS,PRESETS,assess,snapshot,compareAssessment} from './bleile-model.mjs';
import {renderStar} from './bleile-star.mjs';

let profile={...PRESETS.start.scores}, basis={...PRESETS.start.basis}, active='start';
let baseline=null;
const basisName={evidence:'Evidence / design',assumption:'Assumption',unresolved:'Unresolved'};
const panels=[];
for(const c of COMPONENTS){
  const host=document.querySelector(`[data-bleile-slot="${c.section}"]`);
  if(!host)throw new Error(`Missing roadmap checkpoint ${c.section}`);
  const panel=document.createElement('section');
  panel.className='bleile-checkpoint'; panel.id=`bleile-${c.id}`;
  panel.setAttribute('aria-labelledby',`bleile-title-${c.id}`);
  panel.dataset.component=c.id;
  panel.innerHTML=`<div class="bleile-check-head"><span class="bleile-check-mark" aria-hidden="true">◇</span><div><p class="eyebrow">Roadmap checkpoint</p><h3 id="bleile-title-${c.id}">${c.label}</h3></div><span class="bleile-dings"><output for="bleile-input-${c.id}" id="bleile-out-${c.id}"></output><small> / 10 dings</small></span></div>
    <p>${c.prompt}</p><label class="bleile-range-label" for="bleile-input-${c.id}">How much of this gap remains?</label><input id="bleile-input-${c.id}" type="range" min="0" max="10" step="1" aria-describedby="bleile-scale-${c.id}">
    <div class="bleile-scale" id="bleile-scale-${c.id}"><span><b>0</b> ${c.rubric[0]}</span><span><b>5</b> ${c.rubric[1]}</span><span><b>10</b> ${c.rubric[2]}</span></div>
    <label class="bleile-basis">What supports your judgment?<select id="bleile-basis-${c.id}" aria-label="Basis for ${c.label}"><option value="evidence">Observed evidence or study design</option><option value="assumption">An assumption still to challenge</option><option value="unresolved">Unresolved or not yet checked</option></select></label>
    <p class="bleile-concern"></p><a class="bleile-return" href="#bleile-game">Return to the roadmap exercise ↑</a>`;
  host.append(panel);
  const input=panel.querySelector('input'),select=panel.querySelector('select');
  input.addEventListener('input',()=>{profile[c.id]=Number(input.value);active='custom';render(`${c.short}: ${profile[c.id]} dings. Moving a slider records a judgment. It does not add evidence.`);});
  select.addEventListener('change',()=>{basis[c.id]=select.value;active='custom';render(`${c.short}: basis updated.`);});
  panels.push({c,panel,input,select});
}
const profileList=document.querySelector('#bleile-profile');
for(const c of COMPONENTS){
  const link=document.createElement('a');link.href=`#bleile-${c.id}`;link.dataset.profile=c.id;
  link.innerHTML=`<span>${c.short}</span><span class="bleile-mini-track"><i></i></span><b></b><span class="bleile-basis-dot" title=""></span>`;
  profileList.append(link);
}
function render(change=''){
  const result=assess(profile,basis);
  renderStar(document.querySelector('#bleile-star'),profile);
  for(const {c,panel,input,select} of panels){
    input.value=profile[c.id];select.value=basis[c.id];
    panel.querySelector('output').textContent=profile[c.id];
    panel.dataset.concern=profile[c.id]>=8?'high':profile[c.id]>=4?'some':'low';
    panel.querySelector('.bleile-concern').textContent={high:'High concern · 8–10 dings',some:'Some concern · 4–7 dings',low:'Fewer dings · 0–3'}[panel.dataset.concern];
    const item=profileList.querySelector(`[data-profile="${c.id}"]`);
    item.querySelector('b').textContent=profile[c.id];
    item.querySelector('i').style.width=`${profile[c.id]*10}%`;
    const mark=item.querySelector('.bleile-basis-dot');
    mark.textContent={evidence:'●',assumption:'◇',unresolved:'?'}[basis[c.id]];
    mark.setAttribute('aria-label',{evidence:'Evidence or design',assumption:'Assumption to challenge',unresolved:'Unresolved'}[basis[c.id]]);
    mark.title=mark.getAttribute('aria-label');
  }
  document.querySelectorAll('[data-bleile-total]').forEach(el=>el.textContent=result.total);
  document.querySelectorAll('[data-bleile-confounding]').forEach(el=>el.textContent=profile.confounding);
  document.querySelectorAll('[data-bleile-positivity]').forEach(el=>el.textContent=profile.positivity);
  document.querySelectorAll('[data-bleile-title]').forEach(el=>el.textContent=result.title);
  document.querySelectorAll('[data-bleile-verdict]').forEach(el=>el.textContent=result.verdict);
  const reason=[result.assumptions.length?`Assumptions still to challenge: ${result.assumptions.join(', ')}.`:'',result.unresolved.length?`Unresolved or not yet checked: ${result.unresolved.join(', ')}.`:''].filter(Boolean).join(' ');
  document.querySelectorAll('[data-bleile-basis-note]').forEach(el=>el.textContent=reason || 'Evidence/design is selected for every component. These are judgments in a fictional teaching example.');
  document.querySelectorAll('[data-bleile-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bleilePreset===active)));
  document.querySelector('#bleile-change').textContent=change;
  document.querySelector('#bleile-case').textContent=active==='custom'?'Your edited profile':PRESETS[active].label;
  if(active==='custom')document.querySelector('#bleile-story').textContent='You are editing the fictional study. Visit each checkpoint to set a judgment and say whether it rests on evidence, an assumption or an unresolved gap. Reducing a number alone does not recover information.';
  renderRevision();
}

function renderRevision(){
  const host=document.querySelector('#bleile-revision');
  host.hidden=!baseline;
  if(!baseline)return;
  const comparison=compareAssessment(baseline,profile,basis);
  const delta=comparison.delta;
  document.querySelector('#bleile-revision-summary').textContent=`Recorded before analysis: ${comparison.beforeTotal}. Current: ${comparison.currentTotal}. ${delta===0?'The total is unchanged; inspect the components.':Math.abs(delta)+' '+(delta<0?'fewer':'more')+' dings; inspect what changed.'}`;
  const body=document.querySelector('#bleile-revision-rows');body.replaceChildren();
  for(const c of comparison.components){
    const row=document.createElement('tr');row.dataset.component=c.id;
    const label=document.createElement('th');label.scope='row';label.textContent=c.label;row.append(label);
    for(const value of [c.before,c.after,c.delta>0?'+'+c.delta:c.delta,basisName[c.beforeBasis]+' → '+basisName[c.afterBasis]]){
      const cell=document.createElement('td');cell.textContent=value;row.append(cell);
    }
    body.append(row);
  }
}
document.querySelector('#bleile-record').addEventListener('click',()=>{
  baseline=snapshot(profile,basis);
  document.querySelector('#bleile-revision-note').value='';
  document.querySelector('#bleile-record').textContent='Replace the recorded baseline';
  document.querySelector('#bleile-record-status').textContent='Pre-analysis profile recorded for this visit. Now try Recover information, or edit a checkpoint.';
  renderRevision();
});
document.querySelector('#bleile-download').addEventListener('click',()=>{
  if(!baseline)return;
  const report={rubric:'Bleile teaching prototype, not a validated index',before:baseline,current:snapshot(profile,basis),
    comparison:compareAssessment(baseline,profile,basis),reason:document.querySelector('#bleile-revision-note').value,
    verdict:assess(profile,basis).verdict};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='bleile-assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function preset(key){
  if(!PRESETS[key])return;
  active=key;profile={...PRESETS[key].scores};basis={...PRESETS[key].basis};
  document.querySelector('#bleile-story').textContent=PRESETS[key].story;
  render(key==='recover'?'60 → 50: confounding −6, measurement −2, sensitivity −2. Positivity is unchanged.':`${PRESETS[key].label} loaded.`);
}
document.querySelectorAll('[data-bleile-preset]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.bleilePreset)));
document.querySelector('#bleile-copy').addEventListener('click',async()=>{
  const url=new URL(location.href);url.searchParams.set('bleile',COMPONENTS.map(c=>profile[c.id]).join(','));url.searchParams.set('basis',COMPONENTS.map(c=>({evidence:'e',assumption:'a',unresolved:'u'})[basis[c.id]]).join(''));url.hash='bleile-game';
  try{await navigator.clipboard.writeText(url.href);document.querySelector('#bleile-copy-result').textContent='Profile link copied.';}
  catch{document.querySelector('#bleile-copy-result').textContent='Copy this link:';const field=document.querySelector('#bleile-share-url');field.hidden=false;field.value=url.href;field.focus();field.select();}
});
const query=new URLSearchParams(location.search), saved=query.get('bleile'), savedBasis=query.get('basis');
if(saved && /^\d+(,\d+){9}$/.test(saved) && saved.split(',').every(n=>Number(n)<=10) && /^[eau]{10}$/.test(savedBasis||'')){
  profile=Object.fromEntries(COMPONENTS.map((c,i)=>[c.id,Number(saved.split(',')[i])]));basis=Object.fromEntries(COMPONENTS.map((c,i)=>[c.id,({e:'evidence',a:'assumption',u:'unresolved'})[savedBasis[i]]]));active='custom';render('Shared profile loaded.');
}else preset('start');
let starResizePending=false;
window.addEventListener('resize',()=>{if(!starResizePending){starResizePending=true;requestAnimationFrame(()=>{starResizePending=false;renderStar(document.querySelector('#bleile-star'),profile);});}});
