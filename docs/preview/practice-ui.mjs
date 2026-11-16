// Ensure checkpoint panels exist before binding their UI, independent of fetch timing.
import './bleile.mjs?v=20261116-spotlight';
// Select an editor locally; lesson links and copied deep links still work.
const selector=document.querySelector('#practice-component');
const editor=document.querySelector('#practice-editor');
const panels=[...document.querySelectorAll('#practice-panels .bleile-checkpoint')];
function selectComponent(id, focus=false) {
  const panel=panels.find(p=>p.dataset.component===id);
  if(!panel)return false;
  for(const item of panels)item.hidden=item!==panel;
  panel.open=true;
  selector.value=id;
  if(focus){
    selector.focus({preventScroll:true});
    if(matchMedia('(max-width:760px)').matches)editor.scrollIntoView({block:'nearest',behavior:'auto'});
  }
  return true;
}
selector.addEventListener('change',()=>selectComponent(selector.value));
document.addEventListener('click',event=>{
  const lesson=event.target.closest('.practice-lesson-link');
  if(lesson){
    const destination=document.querySelector(lesson.getAttribute('href'));
    if(destination){
      document.querySelector('.practice-back')?.remove();
      const back=document.createElement('a');
      back.className='practice-back';
      back.href='#bleile-'+selector.value;
      back.textContent='← Back to '+selector.selectedOptions[0].textContent.toLowerCase()+' in practice';
      (destination.querySelector(':scope > .wrap')||destination).prepend(back);
    }
    return;
  }
  const link=event.target.closest('.bleile-workbench a[href^="#bleile-"]');
  if(!link)return;
  const id=link.getAttribute('href').slice('#bleile-'.length);
  if(selectComponent(id,true)){
    event.preventDefault();
    event.stopPropagation();
  }
},true);
function revealSharedComponent(){
  if(location.hash.startsWith('#bleile-')){
    document.querySelector('.practice-back')?.remove();
    const id=location.hash.slice('#bleile-'.length);
    if(selectComponent(id)) requestAnimationFrame(()=>document.getElementById('bleile-'+id).scrollIntoView({block:'nearest'}));
  }
}
window.addEventListener('hashchange',revealSharedComponent);
revealSharedComponent();
