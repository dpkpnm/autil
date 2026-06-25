export function preview(container, raw) {
  const hint = document.createElement('div');
  hint.className = 'tile-meta';
  hint.textContent = 'Generate QR code';
  container.appendChild(hint);
}

export async function render(container, raw) {
  if (!window.AUTIL_FLAGS?.QR_CODE) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  container.innerHTML = `
    <div class="qr">
      <div class="qr-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="qr-title">QR Code Generator</span>
      </div>
      <div class="qr-body">
        <div class="qr-input-row">
          <input class="qr-input" id="qr-input" type="text" placeholder="https://example.com or any text" spellcheck="false" autocomplete="off" />
        </div>
        <div class="qr-stage" id="qr-stage">
          <canvas id="qr-canvas"></canvas>
        </div>
        <div class="qr-actions" id="qr-actions" hidden>
          <button class="tool-btn" id="qr-dl">Download PNG</button>
          <button class="tool-btn tool-btn-ghost" id="qr-copy">Copy to Clipboard</button>
        </div>
        <p class="qr-error" id="qr-error" hidden></p>
      </div>
    </div>`;

  const input    = document.getElementById('qr-input');
  const canvas   = document.getElementById('qr-canvas');
  const actions  = document.getElementById('qr-actions');
  const errorEl  = document.getElementById('qr-error');
  const dlBtn    = document.getElementById('qr-dl');
  const copyBtn  = document.getElementById('qr-copy');

  let QRCode = null;
  let debounce = null;

  async function loadLib() {
    if (QRCode) return;
    const mod = await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm');
    QRCode = mod.default ?? mod;
  }

  async function generate(text) {
    if (!text.trim()) {
      canvas.width = 0;
      actions.hidden = true;
      errorEl.hidden = true;
      return;
    }
    try {
      await loadLib();
      await QRCode.toCanvas(canvas, text.trim(), {
        width: 280,
        margin: 2,
        color: { dark: '#0a0a0a', light: '#ffffff' },
      });
      actions.hidden = false;
      errorEl.hidden = true;
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.hidden = false;
      actions.hidden = true;
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => generate(input.value), 250);
  });

  dlBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'qr-code.png';
    a.click();
  });

  copyBtn.addEventListener('click', async () => {
    canvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; }, 1500);
      } catch {
        copyBtn.textContent = 'Copy failed';
        setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; }, 1500);
      }
    });
  });

  // Seed with dropped text
  const seed = (raw || '').trim();
  if (seed && !seed.startsWith('data:')) {
    input.value = seed;
    generate(seed);
  } else {
    input.focus();
  }
}
