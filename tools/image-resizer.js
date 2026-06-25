import { el } from '../lib/dom.js';

export function preview(container, raw) {
  if (!raw?.startsWith('data:image/')) return;
  container.appendChild(el('img', { class: 'ic-tile-img', src: raw, alt: '' }));
  container.appendChild(el('div', { class: 'tile-meta', text: 'Image' }));
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.IMAGE_RESIZER) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  if (!raw?.startsWith('data:image/')) {
    container.innerHTML = '<p class="tool-hint">No image data — drop or paste an image file.</p>';
    return;
  }

  container.innerHTML = `
    <div class="ir">
      <div class="ir-bar">
        <span class="ir-title">Image Resizer</span>
        <div class="ir-controls">
          <div class="ir-field">
            <span class="tool-label">W</span>
            <input class="ir-input" id="ir-w" type="number" min="1" max="32000">
          </div>
          <span class="ir-x">×</span>
          <div class="ir-field">
            <span class="tool-label">H</span>
            <input class="ir-input" id="ir-h" type="number" min="1" max="32000">
          </div>
          <button class="ir-lock-btn ir-lock-on" id="ir-lock" title="Lock aspect ratio">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="5" y="11" width="14" height="10" rx="1"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
          </button>
          <span class="ir-sep"></span>
          <div class="ir-field">
            <input class="ir-input ir-pct" id="ir-pct" type="number" min="1" max="1000" value="100">
            <span class="tool-label">%</span>
          </div>
        </div>
        <button class="tool-btn" id="ir-dl">Download</button>
      </div>
      <div class="ir-split">
        <div class="ir-pane">
          <div class="ir-pane-head">Original</div>
          <div class="ir-img-area"><img id="ir-orig" alt="original"></div>
          <div class="ir-pane-foot">
            <div class="ir-stat"><span class="ir-stat-key">Dimensions</span><span class="ir-stat-val" id="ir-orig-dim">—</span></div>
            <div class="ir-stat"><span class="ir-stat-key">Size</span><span class="ir-stat-val" id="ir-orig-size">—</span></div>
          </div>
        </div>
        <div class="ir-pane">
          <div class="ir-pane-head">Resized</div>
          <div class="ir-img-area"><img id="ir-out" alt="resized"></div>
          <div class="ir-pane-foot">
            <div class="ir-stat"><span class="ir-stat-key">Dimensions</span><span class="ir-stat-val" id="ir-out-dim">—</span></div>
            <div class="ir-stat"><span class="ir-stat-key">Size</span><span class="ir-stat-val" id="ir-out-size">—</span></div>
          </div>
        </div>
      </div>
    </div>`;

  const wInput   = document.getElementById('ir-w');
  const hInput   = document.getElementById('ir-h');
  const pctInput = document.getElementById('ir-pct');
  const lockBtn  = document.getElementById('ir-lock');
  const dlBtn    = document.getElementById('ir-dl');
  const origImg  = document.getElementById('ir-orig');
  const outImg   = document.getElementById('ir-out');
  const origDimEl  = document.getElementById('ir-orig-dim');
  const origSizeEl = document.getElementById('ir-orig-size');
  const outDimEl   = document.getElementById('ir-out-dim');
  const outSizeEl  = document.getElementById('ir-out-size');

  let locked = true;
  let origW = 0, origH = 0, ratio = 1;
  let outBlobUrl = null;
  const mime = ['image/jpeg', 'image/webp', 'image/png'].includes(raw.split(';')[0].slice(5))
    ? raw.split(';')[0].slice(5)
    : 'image/png';

  const base64Len = (raw.split(',')[1] || '').length;
  origSizeEl.textContent = fmtSize(Math.round(base64Len * 0.75));

  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const img    = new Image();

  img.onerror = () => {
    container.innerHTML = '<div class="ir-error">Failed to decode image.</div>';
  };

  img.onload = () => {
    origW = img.naturalWidth;
    origH = img.naturalHeight;
    ratio = origW / origH;
    origImg.src = raw;
    origDimEl.textContent = `${origW} × ${origH}`;
    wInput.value = origW;
    hInput.value = origH;
    pctInput.value = 100;
    resize();
  };
  img.src = raw;

  function resize() {
    const w = Math.max(1, parseInt(wInput.value, 10) || origW);
    const h = Math.max(1, parseInt(hInput.value, 10) || origH);
    canvas.width  = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    if (outBlobUrl) URL.revokeObjectURL(outBlobUrl);
    canvas.toBlob(blob => {
      if (!blob) { outSizeEl.textContent = 'Error'; return; }
      outBlobUrl = URL.createObjectURL(blob);
      outImg.src = outBlobUrl;
      outDimEl.textContent = `${w} × ${h}`;
      outSizeEl.textContent = fmtSize(blob.size);
    }, mime);
  }

  lockBtn.addEventListener('click', () => {
    locked = !locked;
    lockBtn.classList.toggle('ir-lock-on', locked);
  });

  wInput.addEventListener('input', () => {
    const w = parseInt(wInput.value, 10);
    if (locked && w > 0 && origH > 0) hInput.value = Math.round(w / ratio);
    if (origW > 0) pctInput.value = Math.round(w / origW * 100);
    resize();
  });

  hInput.addEventListener('input', () => {
    const h = parseInt(hInput.value, 10);
    if (locked && h > 0 && origW > 0) wInput.value = Math.round(h * ratio);
    if (origH > 0) pctInput.value = Math.round(parseInt(wInput.value, 10) / origW * 100);
    resize();
  });

  pctInput.addEventListener('input', () => {
    const pct = parseFloat(pctInput.value) / 100;
    if (pct > 0 && origW > 0) {
      wInput.value = Math.round(origW * pct);
      hInput.value = Math.round(origH * pct);
      resize();
    }
  });

  dlBtn.addEventListener('click', () => {
    if (!outBlobUrl) return;
    const ext = mime.split('/')[1];
    const a = document.createElement('a');
    a.href = outBlobUrl;
    a.download = `resized.${ext}`;
    a.click();
  });

  function fmtSize(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
