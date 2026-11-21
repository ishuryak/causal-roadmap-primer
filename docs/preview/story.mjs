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
// Reveal the destination before native fragment navigation or history restoration.
function revealAnchor(hash) {
  if (!hash || hash === '#') return;
  let id;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  const checkpoint = target.closest('#practice-panels > details');
  if (checkpoint) {
    for (const panel of checkpoint.parentElement.children) panel.hidden = panel !== checkpoint;
    document.getElementById('practice-component').value = checkpoint.id.slice('bleile-'.length);
    document.querySelector('.practice-back')?.remove();
  }
  for (let panel = target.closest('details'); panel; panel = panel.parentElement.closest('details')) {
    panel.open = true;
  }
}
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link || link.hasAttribute('target') || link.hasAttribute('download')) return;
  const hash = link.getAttribute('href');
  if (hash !== location.hash) {
    const readingPosition = {hash: location.hash, x: window.scrollX, y: window.scrollY};
    history.replaceState({...history.state, readingPosition}, '');
  }
  revealAnchor(hash);
});
window.addEventListener('popstate', event => {
  revealAnchor(location.hash);
  const position = event.state?.readingPosition;
  if (!position || position.hash !== location.hash) return;
  // A reader may have continued past the old fragment. Restore this entry once,
  // before paint, and suppress the browser's subsequent snap back to the anchor.
  const previousMode = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  window.scrollTo(position.x, position.y);
  requestAnimationFrame(() => {
    if (location.hash === position.hash) history.scrollRestoration = previousMode;
  });
});
revealAnchor(location.hash);
