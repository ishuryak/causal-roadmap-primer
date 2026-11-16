import {spotlightAssessment} from './spotlight-model.mjs?v=20261116-spotlight';

export function createSpotlight(root,onProfile,onStart){
  const launch=root.querySelector('#spotlight-launch'),stage=root.querySelector('#spotlight-stage'),status=root.querySelector('#spotlight-status');
  let frame=null;
  function pause(anchor=document.activeElement){
    if(!frame)return false;
    const keepPosition=anchor instanceof HTMLElement && !!anchor.closest('.bleile-workbench');
    const top=keepPosition?anchor.getBoundingClientRect().top:0;
    frame.remove();frame=null;stage.hidden=true;
    if(keepPosition)window.scrollBy(0,anchor.getBoundingClientRect().top-top);
    status.textContent='The profile now follows your selected preset or manual judgment. Restart the spotlight exercise to return to Susan’s starting study.';
    return true;
  }
  launch.addEventListener('click',()=>{
    pause();onStart();
    frame=document.createElement('iframe');
    frame.title='Susan’s study: the Glasshouses spotlight game';
    frame.src='glasshouses/index.html?v=20261116-spotlight';
    frame.setAttribute('allow','fullscreen');
    stage.replaceChildren(frame);stage.hidden=false;
    launch.textContent='Restart spotlight exercise at 60';
    status.textContent='Investigate the study with the spotlight. Named repairs update the profile below. Finding a concern leaves its score unchanged.';
  });
  window.addEventListener('message',event=>{
    if(!frame || event.source!==frame.contentWindow || event.origin!==location.origin)return;
    const data=event.data;
    if(data?.type==='bleile:height' && Number.isFinite(data.height))frame.style.height=Math.max(600,Math.min(1800,data.height))+'px';
    if(data?.type==='bleile:profile'){
      try{onProfile(spotlightAssessment(data.scores));}catch{pause();status.textContent='The game sent an unsupported profile. Restart the spotlight exercise.';}
    }
  });
  document.querySelector('#practice-fold').addEventListener('toggle',event=>{
    if(!event.currentTarget.open && frame)frame.contentWindow.postMessage({type:'primer:pause'},location.origin);
  });
  return {pause};
}
