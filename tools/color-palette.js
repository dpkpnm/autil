export function preview(container, raw) {
  if (!raw?.startsWith('data:image/')) return;
  const img = document.createElement('img');
  img.className = 'ic-tile-img';
  img.src = raw;
  container.appendChild(img);
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.COLOR_PALETTE) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  container.innerHTML = `
    <div class="cp">
      <div class="cp-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="cp-title">Color Palette</span>
        <label class="cp-count-label">Colors
          <select class="dg-select" id="cp-count">
            <option value="6">6</option>
            <option value="8" selected>8</option>
            <option value="12">12</option>
            <option value="16">16</option>
          </select>
        </label>
      </div>
      <div class="cp-body">
        <div class="cp-image-wrap"><img class="cp-img" id="cp-img" /></div>
        <div class="cp-swatches" id="cp-swatches"></div>
      </div>
    </div>`;

  const imgEl    = document.getElementById('cp-img');
  const swatches = document.getElementById('cp-swatches');
  const countSel = document.getElementById('cp-count');

  function quantize(imageData, k) {
    const data = imageData.data;
    const pixels = [];
    const step = Math.max(1, Math.floor(data.length / 4 / 2000));
    for (let i = 0; i < data.length; i += 4 * step) {
      if (data[i + 3] < 128) continue;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // K-means (3 iterations is enough for palette extraction)
    let centers = [];
    for (let i = 0; i < k; i++) centers.push(pixels[Math.floor(i * pixels.length / k)]);

    for (let iter = 0; iter < 4; iter++) {
      const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
      for (const p of pixels) {
        let best = 0, bestD = Infinity;
        for (let j = 0; j < k; j++) {
          const d = (p[0]-centers[j][0])**2 + (p[1]-centers[j][1])**2 + (p[2]-centers[j][2])**2;
          if (d < bestD) { bestD = d; best = j; }
        }
        sums[best][0] += p[0]; sums[best][1] += p[1]; sums[best][2] += p[2]; sums[best][3]++;
      }
      centers = sums.map((s, i) => s[3] ? [s[0]/s[3], s[1]/s[3], s[2]/s[3]] : centers[i]);
    }

    return centers.map(c => c.map(Math.round));
  }

  function toHex([r, g, b]) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function luminance([r, g, b]) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function extract() {
    const k = parseInt(countSel.value);
    const offscreen = document.createElement('canvas');
    const size = 150;
    offscreen.width = offscreen.height = size;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const palette = quantize(imageData, k);
    palette.sort((a, b) => luminance(b) - luminance(a));

    swatches.innerHTML = '';
    palette.forEach(color => {
      const hex = toHex(color);
      const lum = luminance(color);
      const fg = lum > 128 ? '#0a0a0a' : '#ffffff';

      const swatch = document.createElement('div');
      swatch.className = 'cp-swatch';
      swatch.style.background = hex;

      const label = document.createElement('div');
      label.className = 'cp-swatch-label';
      label.style.color = fg;

      const hexEl = document.createElement('span');
      hexEl.className = 'cp-swatch-hex';
      hexEl.textContent = hex.toUpperCase();

      const rgb = document.createElement('span');
      rgb.className = 'cp-swatch-rgb';
      rgb.textContent = `rgb(${color.join(', ')})`;
      rgb.style.color = fg;

      label.append(hexEl, rgb);
      swatch.appendChild(label);

      swatch.addEventListener('click', () => {
        navigator.clipboard.writeText(hex.toUpperCase()).catch(() => {});
        hexEl.textContent = 'Copied!';
        setTimeout(() => { hexEl.textContent = hex.toUpperCase(); }, 1200);
      });

      swatches.appendChild(swatch);
    });
  }

  imgEl.onload = extract;
  imgEl.src = raw;
  countSel.addEventListener('change', () => { if (imgEl.complete) extract(); });
}
