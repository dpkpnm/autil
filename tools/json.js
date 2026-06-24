export function preview(container, raw) {
  try {
    const obj = JSON.parse(raw);
    const isArr = Array.isArray(obj);
    const src = isArr ? obj[0] : obj;
    const keys = src && typeof src === 'object' ? Object.keys(src).slice(0, 5) : [];

    const meta = document.createElement('div');
    meta.className = 'tile-meta';
    meta.textContent = isArr ? `Array · ${obj.length} items` : `Object · ${keys.length} keys`;
    container.appendChild(meta);

    const t = document.createElement('table');
    t.className = 'tile-table';
    keys.forEach(k => {
      const tr = t.insertRow();
      const kd = tr.insertCell(); kd.className = 'tile-key'; kd.textContent = k;
      const vd = tr.insertCell();
      const v = src[k];
      vd.textContent = v === null ? 'null' : typeof v === 'object' ? (Array.isArray(v) ? `[…]` : '{…}') : String(v).slice(0, 30);
    });
    container.appendChild(t);
  } catch {
    container.textContent = 'Preview unavailable';
  }
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.JSON_SEMANTIC_DIFF) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  container.innerHTML = `
    <div class="jsd">
      <div class="jsd-toolbar">
        <span class="jsd-title">JSON Semantic Diff</span>
        <div class="jsd-actions">
          <button class="tool-btn" id="jsd-run">Compare</button>
          <button class="tool-btn tool-btn-ghost" id="jsd-clear">Clear</button>
          <span id="jsd-stats" hidden class="jsd-stats">
            <span id="jsd-add">0</span> added &middot;
            <span id="jsd-del">0</span> deleted &middot;
            <span id="jsd-mod">0</span> modified
          </span>
        </div>
      </div>
      <div class="jsd-inputs">
        <div class="jsd-panel">
          <span class="jsd-panel-label tool-label">Input A — base</span>
          <textarea class="jsd-textarea" id="jsd-a" placeholder='{ "key": "value" }'></textarea>
        </div>
        <div class="jsd-panel">
          <span class="jsd-panel-label tool-label">Input B — target</span>
          <textarea class="jsd-textarea" id="jsd-b" placeholder='{ "key": "changed" }'></textarea>
        </div>
      </div>
      <div class="jsd-output" id="jsd-output">
        <p class="tool-hint">Paste a second JSON payload above and click Compare</p>
      </div>
    </div>`;

  const ta      = document.getElementById('jsd-a');
  const tb      = document.getElementById('jsd-b');
  const output  = document.getElementById('jsd-output');
  const stats   = document.getElementById('jsd-stats');
  const addEl   = document.getElementById('jsd-add');
  const delEl   = document.getElementById('jsd-del');
  const modEl   = document.getElementById('jsd-mod');

  ta.value = raw;

  // ── Diff engine ──────────────────────────────────────────

  function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  function diff(a, b, key) {
    const ta = typeOf(a), tb = typeOf(b);
    if (ta !== tb) return { status: 'modified', key, valA: a, valB: b, typeA: ta, typeB: tb, children: null };

    if (ta === 'object') {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      const children = [];
      let hasChange = false;
      for (const k of keys) {
        const inA = Object.prototype.hasOwnProperty.call(a, k);
        const inB = Object.prototype.hasOwnProperty.call(b, k);
        let child;
        if (!inA)       { child = markAll(b[k], k, 'added');   hasChange = true; }
        else if (!inB)  { child = markAll(a[k], k, 'deleted'); hasChange = true; }
        else            { child = diff(a[k], b[k], k); if (child.status !== 'same') hasChange = true; }
        children.push(child);
      }
      return { status: hasChange ? 'modified' : 'same', key, valA: a, valB: b, type: 'object', children };
    }

    if (ta === 'array') {
      const len = Math.max(a.length, b.length);
      const children = [];
      let hasChange = false;
      for (let i = 0; i < len; i++) {
        let child;
        if (i >= a.length)      { child = markAll(b[i], i, 'added');   hasChange = true; }
        else if (i >= b.length) { child = markAll(a[i], i, 'deleted'); hasChange = true; }
        else                    { child = diff(a[i], b[i], i); if (child.status !== 'same') hasChange = true; }
        children.push(child);
      }
      return { status: hasChange ? 'modified' : 'same', key, valA: a, valB: b, type: 'array', children };
    }

    if (a === b) return { status: 'same', key, valA: a, valB: b, type: ta, children: null };
    return { status: 'modified', key, valA: a, valB: b, typeA: ta, typeB: tb, children: null };
  }

  function markAll(v, key, status) {
    const t = typeOf(v);
    if (t === 'object') return { status, key, valA: status === 'deleted' ? v : undefined, valB: status === 'added' ? v : undefined, type: 'object', children: Object.keys(v).map(k => markAll(v[k], k, status)) };
    if (t === 'array')  return { status, key, valA: status === 'deleted' ? v : undefined, valB: status === 'added' ? v : undefined, type: 'array',  children: v.map((item, i) => markAll(item, i, status)) };
    return { status, key, valA: v, valB: v, type: t, children: null };
  }

  function countNode(node, acc) {
    if (node.children) { node.children.forEach(c => countNode(c, acc)); return; }
    if (node.status === 'added')    acc.added++;
    if (node.status === 'deleted')  acc.deleted++;
    if (node.status === 'modified') acc.modified++;
  }

  // ── Rendering ────────────────────────────────────────────

  function valSpan(v, extra = '') {
    const t = typeOf(v);
    const span = document.createElement('span');
    span.className = `jsd-val type-${t}${extra ? ' ' + extra : ''}`;
    span.textContent = t === 'string' ? JSON.stringify(v) : t === 'null' ? 'null' : String(v);
    return span;
  }

  function renderNode(node, depth, parentEl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'jsd-node';

    const row = document.createElement('div');
    row.className = 'jsd-row' + (node.status !== 'same' ? ' ' + node.status : '');

    const marker = document.createElement('span');
    marker.className = 'jsd-marker';
    marker.textContent = node.status === 'added' ? '+' : node.status === 'deleted' ? '−' : node.status === 'modified' && !node.children ? '~' : ' ';
    row.appendChild(marker);

    const indent = document.createElement('span');
    indent.style.cssText = `width:${depth * 16}px;display:inline-block;flex-shrink:0`;
    row.appendChild(indent);

    const toggle = document.createElement('span');
    toggle.className = 'jsd-toggle';
    row.appendChild(toggle);

    if (node.key !== undefined && node.key !== null && node.key !== '__root__') {
      const keyEl = document.createElement('span');
      keyEl.className = 'jsd-key';
      keyEl.textContent = typeof node.key === 'number' ? `[${node.key}]` : `"${node.key}"`;
      row.appendChild(keyEl);
      const colon = document.createElement('span');
      colon.className = 'jsd-colon';
      colon.textContent = ':';
      row.appendChild(colon);
    }

    const childrenEl = document.createElement('div');
    childrenEl.className = 'jsd-children';

    if (node.children) {
      const isObj = node.type === 'object';
      const openBr = document.createElement('span');
      openBr.className = 'jsd-bracket';
      openBr.textContent = isObj ? '{' : '[';
      row.appendChild(openBr);

      const summary = document.createElement('span');
      summary.className = 'jsd-summary';
      summary.hidden = true;
      summary.textContent = `${node.children.length} ${isObj ? 'key' : 'item'}${node.children.length !== 1 ? 's' : ''}`;
      row.appendChild(summary);

      const closingRow = document.createElement('div');
      closingRow.className = 'jsd-row';
      const cm = document.createElement('span'); cm.className = 'jsd-marker'; cm.textContent = ' ';
      const ci = document.createElement('span'); ci.style.cssText = `width:${depth * 16}px;display:inline-block;flex-shrink:0`;
      const cp = document.createElement('span'); cp.style.cssText = 'width:14px;display:inline-block';
      const cb = document.createElement('span'); cb.className = 'jsd-bracket'; cb.textContent = isObj ? '}' : ']';
      closingRow.append(cm, ci, cp, cb);

      node.children.forEach(child => renderNode(child, depth + 1, childrenEl));

      wrapper.append(row, childrenEl, closingRow);

      let collapsed = false;
      toggle.textContent = '▾';
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        collapsed = !collapsed;
        childrenEl.classList.toggle('collapsed', collapsed);
        closingRow.hidden = collapsed;
        toggle.textContent = collapsed ? '▸' : '▾';
        summary.hidden = !collapsed;
      });
    } else {
      toggle.textContent = ' ';
      if (node.status === 'modified') {
        const arrow = document.createElement('span');
        arrow.className = 'jsd-val-arrow';
        arrow.textContent = '→';
        row.append(valSpan(node.valA, 'jsd-val-old'), arrow, valSpan(node.valB, 'jsd-val-new'));
      } else if (node.status === 'added') {
        row.appendChild(valSpan(node.valB));
      } else {
        row.appendChild(valSpan(node.valA));
      }
      wrapper.appendChild(row);
    }

    parentEl.appendChild(wrapper);
  }

  // ── Run & clear ──────────────────────────────────────────

  function run() {
    const rawA = ta.value.trim();
    const rawB = tb.value.trim();

    if (!rawA && !rawB) {
      output.innerHTML = '<p class="tool-hint">Paste two JSON payloads above and click Compare</p>';
      stats.hidden = true;
      return;
    }

    let a, b;
    const errors = [];
    try { a = JSON.parse(rawA); } catch (e) { errors.push(`Input A: ${e.message}`); }
    try { b = JSON.parse(rawB); } catch (e) { errors.push(`Input B: ${e.message}`); }

    if (errors.length) {
      output.innerHTML = errors.map(msg => `<div class="jsd-error">${msg}</div>`).join('');
      stats.hidden = true;
      return;
    }

    const tree = diff(a, b, '__root__');
    const totals = { added: 0, deleted: 0, modified: 0 };
    countNode(tree, totals);

    addEl.textContent = totals.added;
    delEl.textContent = totals.deleted;
    modEl.textContent = totals.modified;
    stats.hidden = false;

    output.innerHTML = '';

    if (!totals.added && !totals.deleted && !totals.modified) {
      output.innerHTML = '<p class="tool-hint">Inputs are semantically identical</p>';
      return;
    }

    const treeEl = document.createElement('div');
    treeEl.className = 'jsd-tree';
    if (tree.children) tree.children.forEach(child => renderNode(child, 0, treeEl));
    else renderNode(tree, 0, treeEl);
    output.appendChild(treeEl);
  }

  function clear() {
    ta.value = '';
    tb.value = '';
    output.innerHTML = '<p class="tool-hint">Paste two JSON payloads above and click Compare</p>';
    stats.hidden = true;
  }

  document.getElementById('jsd-run').addEventListener('click', run);
  document.getElementById('jsd-clear').addEventListener('click', clear);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); });
  tb.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); });
}
