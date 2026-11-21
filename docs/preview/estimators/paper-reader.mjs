// The equation-page image stays visible until an actual PDF page has finished painting.
const byId = id => document.getElementById(id);
const viewport = byId('paper-viewport');
const sheet = byId('paper-sheet');
const previous = byId('paper-prev');
const next = byId('paper-next');
const zoom = byId('paper-zoom');
const counter = byId('paper-page');
const note = byId('paper-note');

let wantedPage = 3;
let displayedPage = 3;
let displayedZoom = 1;
let pageCount = 10;
let documentPromise;
let renderTask;
let request = 0;
let activeKey = '';
let displayedKey = '';
let resizeTimer;

function loadDocument() {
  if (!documentPromise) {
    documentPromise = import('./vendor/pdf.mjs').then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
      const url = new URL('./kunzel-2019.pdf', import.meta.url).href;
      return pdfjs.getDocument({url}).promise;
    }).catch(error => {
      documentPromise = null;
      throw error;
    });
  }
  return documentPromise;
}

function showPageNumber() {
  counter.textContent = 'Page ' + displayedPage + ' of ' + pageCount;
}

function updateButtons() {
  previous.disabled = wantedPage <= 1;
  next.disabled = wantedPage >= pageCount;
}

function cancelRequest() {
  request++;
  renderTask?.cancel();
  renderTask = null;
  activeKey = '';
  viewport.setAttribute('aria-busy', 'false');
}

async function draw() {
  const availableWidth = viewport.clientWidth;
  if (!availableWidth) return;
  const number = wantedPage;
  const magnification = Number(zoom.value);
  const density = window.devicePixelRatio || 1;
  const key = [number, availableWidth, magnification, density].join('/');
  if (key === activeKey) return;
  cancelRequest();
  if (key === displayedKey) {
    showPageNumber();
    return;
  }
  const ticket = request;
  activeKey = key;
  viewport.setAttribute('aria-busy', 'true');
  if (number !== displayedPage) counter.textContent = 'Loading page ' + number + '…';
  let canvas;
  try {
    const pdf = await loadDocument();
    if (ticket !== request) return;
    pageCount = pdf.numPages;
    const page = await pdf.getPage(number);
    if (ticket !== request) return;

    const base = page.getViewport({scale:1});
    const width = availableWidth * magnification;
    const pageView = page.getViewport({scale:width / base.width});
    // Bound the backing store on high-density devices while retaining the chosen CSS zoom.
    const pixels = Math.min(density, 4096 / Math.max(pageView.width, pageView.height),
      Math.sqrt(12000000 / (pageView.width * pageView.height)));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(pageView.width * pixels));
    canvas.height = Math.max(1, Math.round(pageView.height * pixels));
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Article page ' + number + ' of ' + pageCount +
      ', printed page ' + (4155 + number) + '. An accessible full-text version is linked above.');
    const context = canvas.getContext('2d', {alpha:false});
    if (!context) throw new Error('Canvas drawing unavailable');
    renderTask = page.render({canvasContext:context, viewport:pageView, background:'#ffffff',
      transform:[canvas.width / pageView.width, 0, 0, canvas.height / pageView.height, 0, 0]});
    await renderTask.promise;
    if (ticket !== request) return;

    const samePage = number === displayedPage;
    const oldWidth = sheet.getBoundingClientRect().width || width;
    const oldLeft = viewport.scrollLeft;
    const oldTop = viewport.scrollTop;
    const oldCanvas = sheet.querySelector('canvas');
    sheet.style.width = (magnification * 100) + '%';
    sheet.replaceChildren(canvas);
    if (oldCanvas) oldCanvas.width = oldCanvas.height = 0;
    viewport.scrollLeft = samePage ? oldLeft * width / oldWidth : 0;
    viewport.scrollTop = samePage ? oldTop * width / oldWidth : 0;
    displayedPage = number;
    displayedZoom = magnification;
    displayedKey = key;
    showPageNumber();
    previous.hidden = next.hidden = byId('paper-zoom-tools').hidden = false;
    updateButtons();
    note.hidden = true;
  } catch {
    if (ticket !== request) return;
    wantedPage = displayedPage;
    zoom.value = String(displayedZoom);
    showPageNumber();
    updateButtons();
    note.firstChild.textContent = displayedKey ? 'The requested view could not load. ' : 'Showing the equation-page preview. ';
    note.hidden = false;
  } finally {
    if (canvas && !canvas.isConnected) canvas.width = canvas.height = 0;
    if (ticket === request) {
      renderTask = null;
      activeKey = '';
      viewport.setAttribute('aria-busy', 'false');
    }
  }
}

function movePage(step) {
  wantedPage = Math.min(pageCount, Math.max(1, wantedPage + step));
  updateButtons();
  draw();
}

function scheduleResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(draw, 100);
}

previous.addEventListener('click', () => movePage(-1));
next.addEventListener('click', () => movePage(1));
zoom.addEventListener('change', draw);
if (typeof ResizeObserver === 'function') new ResizeObserver(scheduleResize).observe(viewport);
window.addEventListener('resize', scheduleResize);
draw();
