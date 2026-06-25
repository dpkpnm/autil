export function preview(container, raw) {
  if (!raw?.startsWith('data:image/')) return;
  const img = document.createElement('img');
  img.className = 'ic-tile-img';
  img.src = raw;
  container.appendChild(img);
  const meta = document.createElement('div');
  meta.className = 'tile-meta';
  meta.textContent = 'Remove background';
  container.appendChild(meta);
}

export async function render(container, raw) {
  if (!window.AUTIL_FLAGS?.BACKGROUND_REMOVER) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  container.innerHTML = `
    <div class="bgr">
      <div class="bgr-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="bgr-title">Background Remover</span>
        <button class="tool-btn" id="bgr-dl" hidden>Download PNG</button>
      </div>
      <div class="bgr-body">
        <div class="bgr-loading" id="bgr-loading">
          <p class="bgr-status" id="bgr-status">Loading model…</p>
          <div class="bgr-track"><div class="bgr-fill" id="bgr-fill"></div></div>
          <p class="bgr-note">~175 MB download · cached in browser after first run</p>
        </div>
        <div class="bgr-split" id="bgr-split" hidden>
          <div class="bgr-pane">
            <div class="bgr-pane-label">Original</div>
            <canvas id="bgr-before"></canvas>
          </div>
          <div class="bgr-pane">
            <div class="bgr-pane-label">No background</div>
            <canvas id="bgr-after" class="bgr-checkered"></canvas>
          </div>
        </div>
      </div>
    </div>`;

  const loadingEl  = document.getElementById('bgr-loading');
  const statusEl   = document.getElementById('bgr-status');
  const fillEl     = document.getElementById('bgr-fill');
  const splitEl    = document.getElementById('bgr-split');
  const beforeC    = document.getElementById('bgr-before');
  const afterC     = document.getElementById('bgr-after');
  const dlBtn      = document.getElementById('bgr-dl');

  const setStatus = (text, pct) => {
    statusEl.textContent = text;
    if (pct != null) fillEl.style.width = pct + '%';
  };

  try {
    setStatus('Loading Transformers.js…', 5);
    const { AutoModel, AutoProcessor, RawImage, env } = await import(
      'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm'
    );

    env.allowLocalModels = false;

    setStatus('Loading processor…', 12);
    const processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
      config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: 'ImageFeatureExtractor',
        image_std: [1, 1, 1],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      },
    });

    setStatus('Loading model (~175 MB)…', 20);
    const model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
      config: { model_type: 'custom' },
      progress_callback: (info) => {
        if (info.status === 'progress' && info.progress != null) {
          setStatus(`Downloading… ${Math.round(info.progress)}%`, 20 + info.progress * 0.65);
        }
      },
    });

    setStatus('Processing image…', 88);

    // Draw original to before canvas
    const imgEl = new Image();
    imgEl.src = raw;
    await new Promise(res => { imgEl.onload = res; });
    beforeC.width  = imgEl.naturalWidth;
    beforeC.height = imgEl.naturalHeight;
    beforeC.getContext('2d').drawImage(imgEl, 0, 0);

    // Run model
    const image = await RawImage.fromURL(raw);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });
    const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8'))
      .resize(imgEl.naturalWidth, imgEl.naturalHeight);

    // Apply mask as alpha channel
    afterC.width  = imgEl.naturalWidth;
    afterC.height = imgEl.naturalHeight;
    const ctx = afterC.getContext('2d');
    ctx.drawImage(imgEl, 0, 0);
    const px = ctx.getImageData(0, 0, afterC.width, afterC.height);
    for (let i = 0; i < mask.data.length; i++) {
      px.data[i * 4 + 3] = mask.data[i];
    }
    ctx.putImageData(px, 0, 0);

    loadingEl.hidden = true;
    splitEl.hidden = false;
    dlBtn.hidden = false;

    dlBtn.onclick = () => {
      afterC.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'no-bg.png';
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };

  } catch (e) {
    loadingEl.innerHTML = `<p class="bgr-error">Error: ${e.message}</p>`;
  }
}
