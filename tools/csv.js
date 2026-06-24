// DataGrid: CSV · TSV · JSON array → virtual scroll, IndexedDB, sort, filter, group, edit
export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.DATA_GRID) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  // ── State ─────────────────────────────────────────────────
  const ROW_H = 36;
  let idb = null;
  let datasets = [];
  let activeId = null;
  let headers = [];
  let rows = [];
  let displayed = [];
  let sortCol = null, sortDir = 'asc';
  let groupCol = '';
  let collapsed = new Set();
  let searchQ = '';
  let editing = false;
  let saveTimer = null;

  // ── Shell ─────────────────────────────────────────────────
  container.innerHTML = `
    <div class="dg">
      <div class="dg-toolbar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <input class="dg-search" id="dg-search" type="text" placeholder="Search all columns…" autocomplete="off" spellcheck="false">
        <span class="dg-flex-gap"></span>
        <label class="dg-label">Group</label>
        <select class="dg-select" id="dg-group"></select>
        <span class="dg-flex-gap"></span>
        <button class="dg-icon-btn" id="dg-export-json" title="Export JSON">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        </button>
        <button class="dg-icon-btn" id="dg-export-csv" title="Export CSV">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        </button>
        <button class="dg-icon-btn" id="dg-panel-btn" title="Datasets & Tools">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
      </div>

      <div class="dg-body">
        <div class="dg-scroller" id="dg-scroller">
          <div class="dg-viewport" id="dg-viewport">
            <div class="dg-head" id="dg-head"></div>
            <div class="dg-canvas" id="dg-canvas"></div>
          </div>
        </div>

        <div class="dg-panel" id="dg-panel">
          <div class="dg-panel-head">
            <span>Workspace</span>
            <button class="dg-icon-btn" id="dg-panel-close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="dg-panel-body">
            <div>
              <div class="dg-panel-section">Datasets</div>
              <div id="dg-ds-list"></div>
            </div>
            <div>
              <div class="dg-panel-section">Cleaning</div>
              <button class="dg-clean-btn" id="dg-trim">Trim whitespace</button>
              <button class="dg-clean-btn" id="dg-drop-empty">Drop empty rows</button>
              <button class="dg-clean-btn dg-clean-danger" id="dg-drop-col">Drop group-by column</button>
            </div>
          </div>
        </div>
      </div>

      <div class="dg-foot">
        <span id="dg-stat-rows">—</span>
        <span id="dg-stat-view"></span>
      </div>
      <div class="dg-toast" id="dg-toast"></div>
    </div>`;

  // ── Refs ──────────────────────────────────────────────────
  const dgEl      = container.querySelector('.dg');
  const searchEl  = dgEl.querySelector('#dg-search');
  const groupEl   = dgEl.querySelector('#dg-group');
  const scroller  = dgEl.querySelector('#dg-scroller');
  const viewport  = dgEl.querySelector('#dg-viewport');
  const headEl    = dgEl.querySelector('#dg-head');
  const canvas    = dgEl.querySelector('#dg-canvas');
  const panel     = dgEl.querySelector('#dg-panel');
  const dsList    = dgEl.querySelector('#dg-ds-list');
  const statRows  = dgEl.querySelector('#dg-stat-rows');
  const statView  = dgEl.querySelector('#dg-stat-view');
  const toastEl   = dgEl.querySelector('#dg-toast');

  // ── Toast ─────────────────────────────────────────────────
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ── IndexedDB ─────────────────────────────────────────────
  function openDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open('autil-datagrid', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('datasets', { keyPath: 'id' });
      req.onsuccess = e => res(e.target.result);
      req.onerror   = e => rej(e.target.error);
    });
  }

  function tx(mode, fn) {
    return new Promise((res, rej) => {
      const t = idb.transaction(['datasets'], mode);
      const store = t.objectStore('datasets');
      const req = fn(store);
      if (req) { req.onsuccess = () => res(req.result); req.onerror = e => rej(e.target.error); }
      else t.oncomplete = res;
    });
  }

  const idbAll    = ()       => tx('readonly',  s => s.getAll());
  const idbGet    = (id)     => tx('readonly',  s => s.get(id));
  const idbPut    = (val)    => tx('readwrite', s => s.put(val));
  const idbDelete = (id)     => tx('readwrite', s => s.delete(id));

  // ── Parsing ───────────────────────────────────────────────
  function parse(text) {
    const t = text.trim();
    if (t.startsWith('[') || t.startsWith('{')) return parseJSON(t);
    return parseDSV(t, t.includes('\t') ? '\t' : ',');
  }

  function parseJSON(text) {
    let d = JSON.parse(text);
    if (!Array.isArray(d)) d = [d];
    if (!d.length) return { headers: [], rows: [] };
    const h = [...new Set(d.flatMap(r => (r && typeof r === 'object' ? Object.keys(r) : [])))];
    const rows = d.map((obj, i) => {
      const row = { _id: i };
      h.forEach(k => { row[k] = obj != null && obj[k] !== undefined ? String(obj[k]) : ''; });
      return row;
    });
    return { headers: h, rows };
  }

  function parseDSV(text, sep) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return { headers: [], rows: [] };
    const h = splitLine(lines[0], sep).map(s => s.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map((line, i) => {
      const vals = splitLine(line, sep);
      const row = { _id: i };
      h.forEach((k, j) => { row[k] = (vals[j] ?? '').trim().replace(/^["']|["']$/g, ''); });
      return row;
    });
    return { headers: h, rows };
  }

  function splitLine(line, sep) {
    if (sep === '\t') return line.split('\t');
    const vals = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === sep && !inQ) { vals.push(cur); cur = ''; }
      else cur += c;
    }
    vals.push(cur);
    return vals;
  }

  // ── Grid template ─────────────────────────────────────────
  function colTpl() {
    return `36px repeat(${headers.length}, minmax(120px, 1fr))`;
  }

  // ── Header ────────────────────────────────────────────────
  function renderHead() {
    const tpl = colTpl();
    headEl.style.gridTemplateColumns = tpl;
    headEl.innerHTML = '';

    const corner = document.createElement('div');
    corner.className = 'dg-head-cell';
    headEl.appendChild(corner);

    headers.forEach(h => {
      const cell = document.createElement('div');
      cell.className = 'dg-head-cell' + (sortCol === h ? ' sorted' : '');
      const label = document.createElement('span');
      label.textContent = h;
      cell.appendChild(label);
      if (sortCol === h) {
        const ind = document.createElement('span');
        ind.className = 'dg-sort-ind';
        ind.textContent = sortDir === 'asc' ? '↑' : '↓';
        cell.appendChild(ind);
      }
      cell.onclick = () => {
        sortCol === h ? (sortDir = sortDir === 'asc' ? 'desc' : 'asc') : (sortCol = h, sortDir = 'asc');
        renderHead(); process();
      };
      headEl.appendChild(cell);
    });
  }

  // ── Data processing ───────────────────────────────────────
  function process() {
    const q = searchQ.toLowerCase();
    let data = rows;

    if (q) data = data.filter(row => headers.some(h => String(row[h] ?? '').toLowerCase().includes(q)));

    if (sortCol) {
      data = [...data].sort((a, b) => {
        let va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
        const na = Number(va), nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
        va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    if (groupCol) {
      const groups = {};
      data.forEach(row => {
        const k = String(row[groupCol] ?? 'N/A');
        (groups[k] = groups[k] || []).push(row);
      });
      displayed = [];
      for (const [key, grpRows] of Object.entries(groups)) {
        const isCollapsed = collapsed.has(key);
        displayed.push({ type: 'g', key, count: grpRows.length, collapsed: isCollapsed });
        if (!isCollapsed) grpRows.forEach(r => displayed.push({ type: 'r', data: r }));
      }
    } else {
      displayed = data.map(r => ({ type: 'r', data: r }));
    }

    renderVirtual();
  }

  // ── Virtual scroll ────────────────────────────────────────
  function renderVirtual() {
    const headH = headEl.offsetHeight || 38;
    const total = displayed.length;
    viewport.style.height = `${headH + total * ROW_H}px`;
    canvas.style.top = `${headH}px`;

    const scrollTop = scroller.scrollTop;
    const visH = scroller.clientHeight;
    const adj = Math.max(0, scrollTop - headH);
    const start = Math.max(0, Math.floor(adj / ROW_H) - 2);
    const end   = Math.min(total, start + Math.ceil(visH / ROW_H) + 6);

    canvas.style.transform = `translateY(${start * ROW_H}px)`;
    canvas.innerHTML = '';

    const tpl = colTpl();

    for (let i = start; i < end; i++) {
      const item = displayed[i];
      if (!item) continue;

      if (item.type === 'g') {
        const row = document.createElement('div');
        row.className = 'dg-group-row';
        row.style.height = ROW_H + 'px';
        row.innerHTML = `<span class="dg-group-arrow">${item.collapsed ? '▸' : '▾'}</span><span>${groupCol}: <strong>${item.key}</strong> — ${item.count} rows</span>`;
        row.onclick = () => {
          collapsed.has(item.key) ? collapsed.delete(item.key) : collapsed.add(item.key);
          process();
        };
        canvas.appendChild(row);
      } else {
        const row = document.createElement('div');
        row.className = 'dg-row';
        row.style.gridTemplateColumns = tpl;
        row.style.height = ROW_H + 'px';

        const ac = document.createElement('div');
        ac.className = 'dg-cell dg-action-cell';
        const del = document.createElement('button');
        del.className = 'dg-del-btn';
        del.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        del.onclick = () => { rows = rows.filter(r => r._id !== item.data._id); autoSave(); process(); };
        ac.appendChild(del);
        row.appendChild(ac);

        headers.forEach(h => {
          const cell = document.createElement('div');
          cell.className = 'dg-cell';
          cell.textContent = item.data[h] ?? '';
          cell.ondblclick = () => editCell(cell, item.data, h);
          row.appendChild(cell);
        });

        canvas.appendChild(row);
      }
    }

    const rowCount = displayed.filter(r => r.type === 'r').length;
    statRows.textContent = `${rowCount.toLocaleString()} rows · ${headers.length} cols`;
    statView.textContent = rows.length !== rowCount ? `${rows.length.toLocaleString()} total` : '';
  }

  // ── Cell edit ─────────────────────────────────────────────
  function editCell(cell, rowData, col) {
    if (editing) return;
    editing = true;
    const orig = cell.textContent;
    cell.textContent = '';
    const input = document.createElement('input');
    input.className = 'dg-cell-input';
    input.value = orig;
    const commit = () => {
      rowData[col] = input.value;
      cell.textContent = input.value;
      input.remove();
      editing = false;
      autoSave();
    };
    input.onblur = commit;
    input.onkeydown = e => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') { cell.textContent = orig; input.remove(); editing = false; }
    };
    cell.appendChild(input);
    input.focus();
  }

  // ── Auto-save ─────────────────────────────────────────────
  function autoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!activeId || !idb) return;
      const ds = await idbGet(activeId);
      if (!ds) return;
      ds.rows = rows; ds.rowCount = rows.length;
      await idbPut(ds);
      renderPanel();
    }, 600);
  }

  // ── Group dropdown ────────────────────────────────────────
  function populateGroup() {
    groupEl.innerHTML = '<option value="">None</option>';
    headers.forEach(h => {
      const o = document.createElement('option');
      o.value = h; o.textContent = h;
      groupEl.appendChild(o);
    });
    groupEl.value = groupCol;
  }

  // ── Panel (sidebar) ───────────────────────────────────────
  async function renderPanel() {
    datasets = await idbAll();
    datasets.sort((a, b) => b.timestamp - a.timestamp);
    dsList.innerHTML = '';

    if (!datasets.length) {
      const p = document.createElement('p');
      p.className = 'dg-panel-empty';
      p.textContent = 'No saved datasets.';
      dsList.appendChild(p);
      return;
    }

    datasets.forEach(ds => {
      const item = document.createElement('div');
      item.className = 'dg-ds-item' + (ds.id === activeId ? ' active' : '');

      const info = document.createElement('div');
      info.className = 'dg-ds-info';
      const name = document.createElement('div');
      name.className = 'dg-ds-name';
      name.textContent = ds.name;
      const meta = document.createElement('div');
      meta.className = 'dg-ds-meta';
      meta.textContent = `${ds.rowCount.toLocaleString()} rows · ${new Date(ds.timestamp).toLocaleDateString()}`;
      info.append(name, meta);

      const del = document.createElement('button');
      del.className = 'dg-del-btn';
      del.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>`;
      del.onclick = async e => {
        e.stopPropagation();
        await idbDelete(ds.id);
        if (activeId === ds.id) { rows = []; headers = []; activeId = null; renderHead(); process(); }
        renderPanel();
        toast('Deleted');
      };

      item.onclick = () => activate(ds.id);
      item.append(info, del);
      dsList.appendChild(item);
    });
  }

  // ── Activate dataset ──────────────────────────────────────
  async function activate(id) {
    const ds = await idbGet(id);
    if (!ds) return;
    activeId = id;
    headers = ds.headers;
    rows = ds.rows;
    sortCol = null; sortDir = 'asc'; groupCol = '';
    collapsed.clear(); searchEl.value = ''; searchQ = '';
    scroller.scrollTop = 0;
    populateGroup(); renderHead(); renderPanel(); process();
    panel.classList.remove('open');
    dgEl.querySelector('#dg-panel-btn').classList.remove('active');
    toast(`${rows.length.toLocaleString()} rows loaded`);
  }

  // ── Export ────────────────────────────────────────────────
  function download(content, name, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click();
    URL.revokeObjectURL(a.href);
  }

  // ── Events ────────────────────────────────────────────────
  searchEl.addEventListener('input', () => { searchQ = searchEl.value; scroller.scrollTop = 0; process(); });
  groupEl.addEventListener('change', () => { groupCol = groupEl.value; collapsed.clear(); process(); });
  scroller.addEventListener('scroll', renderVirtual);
  window.addEventListener('resize', renderVirtual);

  const panelBtn = dgEl.querySelector('#dg-panel-btn');
  panelBtn.addEventListener('click', () => {
    panel.classList.toggle('open');
    panelBtn.classList.toggle('active');
  });
  dgEl.querySelector('#dg-panel-close').addEventListener('click', () => {
    panel.classList.remove('open'); panelBtn.classList.remove('active');
  });

  dgEl.querySelector('#dg-export-json').addEventListener('click', () => {
    const data = displayed.filter(r => r.type === 'r').map(r => {
      const obj = {}; headers.forEach(h => { obj[h] = r.data[h] ?? ''; }); return obj;
    });
    download(JSON.stringify(data, null, 2), 'export.json', 'application/json');
    toast('Exported JSON');
  });

  dgEl.querySelector('#dg-export-csv').addEventListener('click', () => {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(esc).join(',')];
    displayed.filter(r => r.type === 'r').forEach(r => lines.push(headers.map(h => esc(r.data[h] ?? '')).join(',')));
    download(lines.join('\n'), 'export.csv', 'text/csv');
    toast('Exported CSV');
  });

  dgEl.querySelector('#dg-trim').addEventListener('click', () => {
    rows.forEach(row => headers.forEach(h => { if (typeof row[h] === 'string') row[h] = row[h].trim(); }));
    autoSave(); process(); toast('Whitespace trimmed');
  });

  dgEl.querySelector('#dg-drop-empty').addEventListener('click', () => {
    const before = rows.length;
    rows = rows.filter(row => headers.some(h => row[h] !== undefined && String(row[h]).trim()));
    autoSave(); process(); toast(`Removed ${before - rows.length} empty rows`);
  });

  dgEl.querySelector('#dg-drop-col').addEventListener('click', () => {
    if (!groupCol) { toast('Select a column in Group By first'); return; }
    const col = groupCol;
    headers = headers.filter(h => h !== col);
    rows.forEach(r => delete r[col]);
    groupCol = ''; populateGroup(); renderHead(); autoSave(); process(); toast(`Dropped: ${col}`);
  });

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    idb = await openDB();

    let parsed;
    try { parsed = parse(raw); }
    catch (e) { container.innerHTML = `<div style="padding:var(--pad);font-family:var(--mono);font-size:.7rem">${e.message}</div>`; return; }

    if (!parsed.headers.length) {
      container.innerHTML = `<div style="padding:var(--pad);font-family:var(--mono);font-size:.7rem">No data found.</div>`;
      return;
    }

    const id = 'ds_' + Date.now();
    const name = `import ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    await idbPut({ id, name, timestamp: Date.now(), headers: parsed.headers, rows: parsed.rows, rowCount: parsed.rows.length });

    activeId = id;
    headers = parsed.headers;
    rows = parsed.rows;

    populateGroup();
    renderHead();
    renderPanel();
    process();
    toast(`${rows.length.toLocaleString()} rows loaded`);
  }

  init();
}
