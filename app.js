import { $, on } from './lib/dom.js';

const drop   = $('#drop');
const main   = $('#main');
const status = $('#status');

// ── Feature flags ──────────────────────────────────────
window.AUTIL_FLAGS = {
  DATA_GRID:                   true,
  JSON_SEMANTIC_DIFF:          true,
  CRON_EXPRESSION_HUMANIZER:   true,
  SPREADSHEET_GRID_V1:         true,
  TEMPORAL_CALENDAR_P2P:       true,
  CRYPTOGRAPHIC_DEVELOPER_KIT: true,
  WASM_FFMPEG_TRANSCODER:      false,
  IMAGE_COMPRESSOR:            true,
  IMAGE_RESIZER:               true,
  BACKGROUND_REMOVER:          true,
  STICKER_MAKER:               true,
  PDF_MERGER:                  true,
};

// ── Tool registry ──────────────────────────────────────
const TOOLS = [
  { slug: 'grid',             name: 'Data Grid',        desc: 'Sort · filter · group · edit',  accepts: ['csv', 'tsv', 'jsonarray'] },
  { slug: 'json',             name: 'JSON Diff',         desc: 'Compare two JSON payloads',     accepts: ['json', 'jsonarray'] },
  { slug: 'cron',             name: 'Cron Humanizer',    desc: 'Human-readable schedule',       accepts: ['cron'] },
  { slug: 'image-compressor', name: 'Image Compressor',  desc: 'Compress · convert · download', accepts: ['image'] },
  { slug: 'image-resizer',   name: 'Image Resizer',      desc: 'Resize · scale · download',     accepts: ['image'] },
  { slug: 'bg-remover',      name: 'Background Remover', desc: 'Remove background via ML',      accepts: ['image'] },
  { slug: 'sticker-maker',   name: 'Sticker Maker',      desc: 'Draw · mask · export sticker',  accepts: ['image'] },
  { slug: 'pdf-merger',      name: 'PDF Merger',          desc: 'Merge · reorder · download',    accepts: ['pdf'] },
];

// ── Type detection ─────────────────────────────────────
function detect(raw) {
  const t = raw.trim();
  if (t.startsWith('data:image/')) return 'image';
  if (t.startsWith('data:application/pdf')) return 'pdf';
  if (t.startsWith('[')) {
    try {
      const p = JSON.parse(t);
      if (Array.isArray(p) && p.length && p[0] !== null && typeof p[0] === 'object' && !Array.isArray(p[0])) return 'jsonarray';
    } catch {}
    return 'json';
  }
  if (t.startsWith('{'))                                     return 'json';
  if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(t))                  return 'jwt';
  if (/^https?:\/\//.test(t))                               return 'url';
  if (t.includes('\t') && t.split('\n').length > 1)         return 'tsv';
  if (t.includes(',') && t.split('\n').length > 1)          return 'csv';
  if (/^([0-9a-fA-F]{2}\s*)+$/.test(t.replace(/\s/g, ''))) return 'hex';
  if (/^[A-Za-z0-9+/]+=*$/.test(t) && t.length % 4 === 0) return 'base64';
  if (/^[\d*\/,\-]+ [\d*\/,\-]+ [\d*\/,\-]+ [\d*\/,\-]+ [\d*\/,\-]+$/.test(t)) return 'cron';
  return 'text';
}

// ── Open a single tool ─────────────────────────────────
async function openTool(slug, raw) {
  setStatus(slug.toUpperCase());
  main.html('<aoutput id="output"></aoutput>').show();
  drop.hide();

  const output = document.getElementById('output');
  output.innerHTML = '';

  try {
    const mod = await import(`./tools/${slug}.js`);
    mod.render(output, raw);
  } catch (err) {
    output.innerHTML = `
      <div style="padding:2rem 0">
        <p style="font-family:var(--mono);font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;opacity:.3">
          error loading ${slug}: ${err.message}
        </p>
      </div>`;
  }
}

// ── Tile launcher ──────────────────────────────────────
async function route(raw) {
  const type = detect(raw);
  setStatus(type.toUpperCase());

  const matches = TOOLS.filter(t => t.accepts.includes(type));

  // Only one match — open it directly
  if (matches.length === 1) {
    openTool(matches[0].slug, raw);
    return;
  }

  // No match — show a friendly message
  if (matches.length === 0) {
    drop.hide();
    main.html(`
      <div class="tiles-bar">
        <button class="tiles-back" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="tiles-type">${type.toUpperCase()}</span>
      </div>
      <div class="tiles-empty">
        <p class="tiles-empty-type">${type.toUpperCase()}</p>
        <p class="tiles-empty-msg">No tools available for this data type yet.</p>
      </div>
    `).show();
    return;
  }

  // Multiple matches — show tile launcher
  drop.hide();
  main.html(`
    <div class="tiles-bar">
      <button class="tiles-back" data-back title="Back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="tiles-type">${type.toUpperCase()} · ${matches.length} tools</span>
    </div>
    <div class="tiles-wrap"></div>
  `).show();
  const wrap = main.el.querySelector('.tiles-wrap');

  for (const tool of matches) {
    const tile = document.createElement('div');
    tile.className = 'tile';

    const head = document.createElement('div');
    head.className = 'tile-head';

    const nameEl = document.createElement('span');
    nameEl.className = 'tile-name';
    nameEl.textContent = tool.name;

    const descEl = document.createElement('span');
    descEl.className = 'tile-desc';
    descEl.textContent = tool.desc;

    head.append(nameEl, descEl);

    const previewEl = document.createElement('div');
    previewEl.className = 'tile-preview';

    tile.append(head, previewEl);
    tile.addEventListener('click', () => openTool(tool.slug, raw));
    wrap.appendChild(tile);

    // Load preview async — don't block tile render
    import(`./tools/${tool.slug}.js`).then(mod => {
      if (mod.preview) mod.preview(previewEl, raw);
    }).catch(() => {
      previewEl.textContent = 'Preview unavailable';
    });
  }
}

function setStatus(text) {
  status.text(text).attr('data-ready', null);
}

// ── Drag and drop ──────────────────────────────────────
drop.on('dragover', e => { e.preventDefault(); drop.cls('over', true); });
drop.on('dragleave', () => drop.cls('over', false));
drop.on('drop', e => {
  e.preventDefault();
  drop.cls('over', false);
  const file = e.dataTransfer.files[0];
  if (file) return readFile(file);
  const text = e.dataTransfer.getData('text');
  if (text) route(text);
});

// ── Click to pick file ─────────────────────────────────
drop.on('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.onchange = e => readFile(e.target.files[0]);
  input.click();
});

// ── Paste anywhere ─────────────────────────────────────
document.addEventListener('paste', e => {
  const text = e.clipboardData.getData('text');
  if (text) return route(text);
  const file = e.clipboardData.files[0];
  if (file) readFile(file);
});

function readFile(file) {
  setStatus(file.name.toUpperCase());
  const reader = new FileReader();
  reader.onload = e => route(e.target.result);
  if (file.type.startsWith('image/') || file.type === 'application/pdf') {
    reader.readAsDataURL(file);
  } else {
    reader.readAsText(file);
  }
}

// ── Back to drop ───────────────────────────────────────
on(document, 'click', '[data-back]', () => {
  main.html('').hide();
  drop.show();
  status.text('READY').attr('data-ready', '');
});
