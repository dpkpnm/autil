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
};

// ── Type detection ─────────────────────────────────────
function detect(raw) {
  const t = raw.trim();
  if (t.startsWith('[')) {
    try {
      const p = JSON.parse(t);
      if (Array.isArray(p) && p.length && p[0] !== null && typeof p[0] === 'object' && !Array.isArray(p[0])) return 'csv';
    } catch {}
    return 'json';
  }
  if (t.startsWith('{'))                                     return 'json';
  if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(t))                  return 'jwt';
  if (/^https?:\/\//.test(t))                               return 'url';
  if (t.includes('\t') && t.split('\n').length > 1)         return 'csv';
  if (t.includes(',') && t.split('\n').length > 1)          return 'csv';
  if (/^([0-9a-fA-F]{2}\s*)+$/.test(t.replace(/\s/g, ''))) return 'hex';
  if (/^[A-Za-z0-9+/]+=*$/.test(t) && t.length % 4 === 0) return 'base64';
  if (/^[\d*\/,\-]+ [\d*\/,\-]+ [\d*\/,\-]+ [\d*\/,\-]+ [\d*\/,\-]+$/.test(t)) return 'cron';
  return 'text';
}

// ── Route to tool ──────────────────────────────────────
async function route(raw) {
  const type = detect(raw);
  setStatus(type.toUpperCase());

  // swap drop zone for output area
  drop.hide();
  main.html('<aoutput id="output"></aoutput>').show();

  const output = document.getElementById('output');
  output.innerHTML = '';

  try {
    const mod = await import(`./tools/${type}.js`);
    mod.render(output, raw);
  } catch {
    output.innerHTML = `
      <div style="padding:2rem 0">
        <p style="font-family:var(--mono);font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;opacity:.3">
          no tool for ${type.toUpperCase()} yet
        </p>
      </div>`;
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
  reader.readAsText(file);
}

// ── Back to drop ───────────────────────────────────────
on(document, 'click', '[data-back]', () => {
  main.html('').hide();
  drop.show();
  status.text('READY').attr('data-ready', '');
});
