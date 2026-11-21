// Ensure checkpoint panels exist before binding their UI, independent of fetch timing.
import './bleile.mjs?v=20261121-quiet';
// Select an editor locally; lesson links and copied deep links still work.
const selector=document.querySelector('#practice-component');
const panels=[...document.querySelectorAll('#practice-panels .bleile-checkpoint')];
selector.addEventListener('change', () => {
  for (const panel of panels) {
    panel.hidden = panel.dataset.component !== selector.value;
    if (!panel.hidden) panel.open = true;
  }
});
document.addEventListener('click',event=>{
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
  }
},true);
