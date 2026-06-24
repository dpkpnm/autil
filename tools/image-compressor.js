import { el } from './lib/dom.js';

export function preview(container, raw) {
  if (!raw?.startsWith('data:image/')) return;
  const img = el('img', { class: 'ic-tile-img', src: raw, alt: '' });
  container.appendChild(img);
  const meta = el('div', { class: 'tile-meta', text: 'Image' });
  container.appendChild(meta);
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.IMAGE_COMPRESSOR) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  if (!raw?.startsWith('data:image/')) {
    container.innerHTML = '<p class="tool-hint">No image data — drop or paste an image file.</p>';
    return;
  }

  container.innerHTML = `
    <div class="ic">
      <div class="ic-bar">
        <span class="ic-title">Image Compressor</span>
        <div class="ic-controls">
          <div class="ic-field">
            <span class="tool-label">Format</span>
            <select class="ic-select" id="ic-format">
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
              <option value="image/png">PNG</option>
            </select>
          </div>
          <div class="ic-field" id="ic-quality-wrap">
            <span class="tool-label">Quality</span>
            <input class="ic-range" type="range" id="ic-quality" min="1" max="100" value="80">
            <span class="ic-quality-num" id="ic-quality-num">80</span>
          </div>
        </div>
        <button class="tool-btn" id="ic-dl">Download</button>
      </div>
      <div class="ic-split">
        <div class="ic-pane">
          <div class="ic-pane-head">Original</div>
          <div class="ic-img-area"><img id="ic-orig-img" alt="original"></div>
          <div class="ic-pane-foot">
            <div class="ic-stat"><span class="ic-stat-key">Size</span><span class="ic-stat-val" id="ic-orig-size">—</span></div>
            <div class="ic-stat"><span class="ic-stat-key">Dimensions</span><span class="ic-stat-val" id="ic-orig-dim">—</span></div>
          </div>
        </div>
        <div class="ic-pane">
          <div class="ic-pane-head">Compressed</div>
          <div class="ic-img-area"><img id="ic-out-img" alt="compressed"></div>
          <div class="ic-pane-foot">
            <div class="ic-stat"><span class="ic-stat-key">Size</span><span class="ic-stat-val" id="ic-out-size">—</span></div>
            <div class="ic-stat"><span class="ic-stat-key">Saved</span><span class="ic-stat-val ic-saved" id="ic-saved">—</span></div>
          </div>
        </div>
      </div>
    </div>`;

  const formatSel    = document.getElementById('ic-format');
  const qualityWrap  = document.getElementById('ic-quality-wrap');
  const qualityRange = document.getElementById('ic-quality');
  const qualityNum   = document.getElementById('ic-quality-num');
  const dlBtn        = document.getElementById('ic-dl');
  const origImg      = document.getElementById('ic-orig-img');
  const outImg       = document.getElementById('ic-out-img');
  const origSizeEl   = document.getElementById('ic-orig-size');
  const origDimEl    = document.getElementById('ic-orig-dim');
  const outSizeEl    = document.getElementById('ic-out-size');
  const savedEl      = document.getElementById('ic-saved');

  const origMime = raw.split(';')[0].slice(5);
  if (['image/jpeg', 'image/webp', 'image/png'].includes(origMime)) {
    formatSel.value = origMime;
  }

  const base64Len  = (raw.split(',')[1] || '').length;
  const origBytes  = Math.round(base64Len * 0.75);
  origSizeEl.textContent = fmtSize(origBytes);

  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const img    = new Image();
  let   currentBlob = null;
  let   outBlobUrl  = null;

  img.onerror = () => {
    container.innerHTML = '<div class="ic-error">Failed to decode image data.</div>';
  };

  img.onload = () => {
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    origImg.src = raw;
    origDimEl.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
    compress();
  };

  img.src = raw;

  function compress() {
    const mime    = formatSel.value;
    const quality = mime === 'image/png' ? undefined : parseInt(qualityRange.value, 10) / 100;
    qualityWrap.hidden = mime === 'image/png';

    canvas.toBlob(blob => {
      if (!blob) { outSizeEl.textContent = 'Error'; return; }
      currentBlob = blob;
      if (outBlobUrl) URL.revokeObjectURL(outBlobUrl);
      outBlobUrl = URL.createObjectURL(blob);
      outImg.src = outBlobUrl;
      outSizeEl.textContent = fmtSize(blob.size);
      const saved = origBytes - blob.size;
      const pct   = Math.round(Math.abs(saved) / origBytes * 100);
      savedEl.textContent = saved >= 0
        ? `-${pct}%  (${fmtSize(saved)} smaller)`
        : `+${pct}%  (${fmtSize(-saved)} larger)`;
      savedEl.classList.toggle('ic-saved-neg', saved < 0);
    }, mime, quality);
  }

  function fmtSize(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  formatSel.addEventListener('change', compress);
  qualityRange.addEventListener('input', () => {
    qualityNum.textContent = qualityRange.value;
    compress();
  });

  dlBtn.addEventListener('click', () => {
    if (!currentBlob) return;
    const ext = formatSel.value.split('/')[1];
    const a   = document.createElement('a');
    a.href     = URL.createObjectURL(currentBlob);
    a.download = `compressed.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}
