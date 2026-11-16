// Navigation and narrative controls, independent of the scientific examples.
// A stipulated two-group example, not an estimate from patient data.
const transportMix=document.querySelector('#transport-mix');
function updateTransport(){
  const share=Number(transportMix.value)/100;
  document.querySelector('#transport-mix-value').textContent=transportMix.value+'%';
  document.querySelector('#transport-effect').textContent=(8*share-2*(1-share)).toFixed(1)+' percentage points';
}
transportMix.addEventListener('input',updateTransport);
updateTransport();
// Deep links open the relevant details, including the optional history section.
function revealAnchor(hash, scroll = false) {
  if (!hash || hash === '#') return;
  let target; try { target=document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
  if (!target) return;
  for (let node=target;node;node=node.parentElement) if (node.tagName === 'DETAILS') node.open=true;
  if (scroll) requestAnimationFrame(() => target.scrollIntoView({behavior:'auto',block:'start'}));
}
document.addEventListener('click', e => {
  const link=e.target.closest('a[href^="#"]');
  if(link) revealAnchor(link.getAttribute('href'));
});
window.addEventListener('hashchange',()=>revealAnchor(location.hash));
document.addEventListener('bleile-ready',()=>revealAnchor(location.hash,true));
revealAnchor(location.hash);
