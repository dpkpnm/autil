import { el } from '../lib/dom.js';

export function preview(container, raw) {
  if (!raw?.startsWith('data:image/')) return;
  const img = document.createElement('img');
  img.className = 'ic-tile-img';
  img.src = raw;
  container.appendChild(img);
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.STICKER_MAKER) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  if (!raw?.startsWith('data:image/')) {
    container.innerHTML = '<p class="tool-offline">Drop an image to begin.</p>';
    return;
  }

  container.innerHTML = `
    <div class="sm">
      <div class="sm-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="sm-title">Sticker Maker</span>
        <div class="sm-actions">
          <button class="tool-btn tool-btn-ghost" id="sm-clear">Clear</button>
          <button class="tool-btn" id="sm-apply" hidden>Apply Mask</button>
          <button class="tool-btn" id="sm-dl" hidden>Download PNG</button>
        </div>
      </div>
      <div class="sm-body">
        <div class="sm-wrap">
          <canvas id="sm-img" class="sm-img-canvas"></canvas>
          <canvas id="sm-draw" class="sm-draw-canvas"></canvas>
        </div>
        <p class="sm-hint" id="sm-hint">Draw around your subject · lift to continue · Apply Mask when done</p>
      </div>
    </div>`;

  const imgCanvas  = document.getElementById('sm-img');
  const drawCanvas = document.getElementById('sm-draw');
  const applyBtn   = document.getElementById('sm-apply');
  const clearBtn   = document.getElementById('sm-clear');
  const dlBtn      = document.getElementById('sm-dl');
  const hint       = document.getElementById('sm-hint');
  const wrap       = imgCanvas.parentElement;

  const imgCtx  = imgCanvas.getContext('2d');
  const drawCtx = drawCanvas.getContext('2d');

  const img = new Image();
  img.onload = () => {
    imgCanvas.width  = img.naturalWidth;
    imgCanvas.height = img.naturalHeight;
    drawCanvas.width  = img.naturalWidth;
    drawCanvas.height = img.naturalHeight;
    imgCtx.drawImage(img, 0, 0);
  };
  img.src = raw;

  let strokes  = [];
  let current  = null;
  let drawing  = false;
  let applied  = false;

  function canvasPoint(e) {
    const r = drawCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (drawCanvas.width  / r.width),
      y: (e.clientY - r.top)  * (drawCanvas.height / r.height),
    };
  }

  function repaint() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    const all = current ? [...strokes, current] : strokes;
    if (!all.length) return;

    drawCtx.strokeStyle = 'var(--red, #e52e00)';
    drawCtx.lineWidth   = Math.max(2, drawCanvas.width / 300);
    drawCtx.lineCap     = 'round';
    drawCtx.lineJoin    = 'round';

    for (const pts of all) {
      if (pts.length < 2) continue;
      drawCtx.beginPath();
      drawCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) drawCtx.lineTo(pts[i].x, pts[i].y);
      drawCtx.stroke();
    }

    // Closing line from last point back to stroke start
    const last = all[all.length - 1];
    if (last && last.length > 1) {
      drawCtx.setLineDash([6, 6]);
      drawCtx.beginPath();
      drawCtx.moveTo(last[last.length - 1].x, last[last.length - 1].y);
      drawCtx.lineTo(last[0].x, last[0].y);
      drawCtx.stroke();
      drawCtx.setLineDash([]);
    }
  }

  function onDown(e) {
    if (applied) return;
    drawing = true;
    current = [canvasPoint(e)];
  }

  function onMove(e) {
    if (!drawing || !current) return;
    current.push(canvasPoint(e));
    repaint();
  }

  function onUp() {
    if (!drawing || !current) return;
    drawing = false;
    if (current.length > 1) {
      strokes.push(current);
      applyBtn.removeAttribute('hidden');
    }
    current = null;
    repaint();
  }

  drawCanvas.addEventListener('mousedown', onDown);
  drawCanvas.addEventListener('mousemove', onMove);
  drawCanvas.addEventListener('mouseup',   onUp);
  drawCanvas.addEventListener('mouseleave', onUp);

  drawCanvas.addEventListener('touchstart', e => { e.preventDefault(); onDown(e.touches[0]); }, { passive: false });
  drawCanvas.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e.touches[0]); }, { passive: false });
  drawCanvas.addEventListener('touchend',   e => { e.preventDefault(); onUp(); },               { passive: false });

  clearBtn.addEventListener('click', () => {
    strokes  = [];
    current  = null;
    drawing  = false;
    applied  = false;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    wrap.classList.remove('sm-wrap-checkered');
    imgCtx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
    imgCtx.drawImage(img, 0, 0);
    applyBtn.setAttribute('hidden', '');
    dlBtn.setAttribute('hidden', '');
    hint.textContent = 'Draw around your subject · lift to continue · Apply Mask when done';
  });

  applyBtn.addEventListener('click', () => {
    if (!strokes.length) return;
    applied = true;

    imgCtx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
    imgCtx.save();
    imgCtx.beginPath();
    for (const pts of strokes) {
      if (pts.length < 2) continue;
      imgCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) imgCtx.lineTo(pts[i].x, pts[i].y);
      imgCtx.closePath();
    }
    imgCtx.clip('evenodd');
    imgCtx.drawImage(img, 0, 0);
    imgCtx.restore();

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    wrap.classList.add('sm-wrap-checkered');
    applyBtn.setAttribute('hidden', '');
    dlBtn.removeAttribute('hidden');
    hint.textContent = 'Sticker ready — Download PNG to save';
  });

  dlBtn.addEventListener('click', () => {
    imgCanvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sticker.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  });
}
