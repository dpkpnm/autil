export function preview(container, raw) {
  const icon = document.createElement('div');
  icon.className = 'pm-tile-icon';
  icon.textContent = 'PDF';
  container.appendChild(icon);
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.PDF_MERGER) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  container.innerHTML = `
    <div class="pm">
      <div class="pm-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="pm-title">PDF Merger</span>
        <button class="tool-btn" id="pm-merge" hidden>Merge & Download</button>
      </div>
      <div class="pm-body">
        <div class="pm-drop" id="pm-drop">
          <span class="pm-drop-text">Drop more PDFs here · or click to add</span>
        </div>
        <div class="pm-list" id="pm-list"></div>
      </div>
    </div>`;

  const dropEl  = document.getElementById('pm-drop');
  const listEl  = document.getElementById('pm-list');
  const mergeBtn = document.getElementById('pm-merge');

  // { name, dataURL }
  const pdfs = [];

  function dataURLToBytes(dataURL) {
    const b64 = dataURL.split(',')[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function renderList() {
    listEl.innerHTML = '';
    pdfs.forEach((pdf, i) => {
      const row = document.createElement('div');
      row.className = 'pm-row';

      const idx = document.createElement('span');
      idx.className = 'pm-row-idx';
      idx.textContent = i + 1;

      const name = document.createElement('span');
      name.className = 'pm-row-name';
      name.textContent = pdf.name;

      const actions = document.createElement('div');
      actions.className = 'pm-row-actions';

      const up = document.createElement('button');
      up.className = 'dg-icon-btn';
      up.disabled = i === 0;
      up.title = 'Move up';
      up.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>';
      up.onclick = () => { [pdfs[i - 1], pdfs[i]] = [pdfs[i], pdfs[i - 1]]; renderList(); };

      const down = document.createElement('button');
      down.className = 'dg-icon-btn';
      down.disabled = i === pdfs.length - 1;
      down.title = 'Move down';
      down.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
      down.onclick = () => { [pdfs[i], pdfs[i + 1]] = [pdfs[i + 1], pdfs[i]]; renderList(); };

      const del = document.createElement('button');
      del.className = 'dg-icon-btn';
      del.title = 'Remove';
      del.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      del.onclick = () => { pdfs.splice(i, 1); renderList(); syncMergeBtn(); };

      actions.append(up, down, del);
      row.append(idx, name, actions);
      listEl.appendChild(row);
    });
  }

  function syncMergeBtn() {
    pdfs.length >= 2 ? mergeBtn.removeAttribute('hidden') : mergeBtn.setAttribute('hidden', '');
  }

  function addFile(name, dataURL) {
    pdfs.push({ name, dataURL });
    renderList();
    syncMergeBtn();
  }

  function readPDF(file) {
    const reader = new FileReader();
    reader.onload = e => addFile(file.name, e.target.result);
    reader.readAsDataURL(file);
  }

  // Seed with the initially dropped file
  if (raw?.startsWith('data:application/pdf')) {
    addFile('document.pdf', raw);
  }

  // Drop zone
  dropEl.addEventListener('dragover', e => { e.preventDefault(); dropEl.classList.add('pm-drop-over'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('pm-drop-over'));
  dropEl.addEventListener('drop', e => {
    e.preventDefault();
    dropEl.classList.remove('pm-drop-over');
    [...e.dataTransfer.files].filter(f => f.type === 'application/pdf').forEach(readPDF);
  });
  dropEl.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.multiple = true;
    input.onchange = e => [...e.target.files].forEach(readPDF);
    input.click();
  });

  mergeBtn.addEventListener('click', async () => {
    mergeBtn.textContent = 'Merging…';
    mergeBtn.disabled = true;
    try {
      const { PDFDocument } = await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm');
      const merged = await PDFDocument.create();
      for (const { dataURL } of pdfs) {
        const bytes = dataURLToBytes(dataURL);
        const doc = await PDFDocument.load(bytes);
        const copied = await merged.copyPages(doc, doc.getPageIndices());
        copied.forEach(p => merged.addPage(p));
      }
      const out = await merged.save();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
      a.download = 'merged.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert('Merge failed: ' + e.message);
    } finally {
      mergeBtn.textContent = 'Merge & Download';
      mergeBtn.disabled = false;
    }
  });
}
