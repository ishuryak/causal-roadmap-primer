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
const routeButtons = [...document.querySelectorAll('[data-study-route]')];
const routeReading = document.querySelector('#study-route-reading');
const routeCopy = {
  trial: ['Create the comparison.', 'Assign the treatment strategies at random, then follow the patients. The design addresses treatment-assignment confounding. Treatment definitions, adherence, follow-up and applicability still need an argument.'],
  observed: ['Reconstruct the comparison.', 'Use care that already happened. Reconstruct the trial you wanted, learn how treatment was chosen, and make the assumptions behind the comparison explicit. Collect more information where the argument needs it.']
};
for (const button of routeButtons) {
  button.addEventListener('click', () => {
    for (const peer of routeButtons) peer.setAttribute('aria-pressed', String(peer === button));
    const [heading, body] = routeCopy[button.dataset.studyRoute];
    routeReading.replaceChildren();
    const strong = document.createElement('strong'), p = document.createElement('p');
    strong.textContent = heading; p.textContent = body;
    routeReading.append(strong,p);
  });
}
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
