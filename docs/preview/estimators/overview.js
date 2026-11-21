const families = [...document.querySelectorAll('input[name="family"]')];
const next = document.getElementById('next-branch');
const status = document.getElementById('map-status');

function syncWalk(announce) {
  const selected = families.find(input => input.checked);
  next.textContent = selected === families.at(-1) ? 'Back to the first branch' : 'Next branch';
  if (announce) {
    const label = selected.labels[0].querySelector('strong').textContent;
    const note = document.getElementById(selected.getAttribute('aria-describedby')).textContent;
    status.textContent = label + '. ' + note;
  }
}

for (const input of families) input.addEventListener('change', () => syncWalk(false));
next.addEventListener('click', () => {
  const current = families.findIndex(input => input.checked);
  families[(current + 1) % families.length].checked = true;
  syncWalk(true);
});
// Browsers can restore a radio choice on Back without firing a change event.
window.addEventListener('pageshow', () => syncWalk(false));
syncWalk(false);
next.hidden = false;
