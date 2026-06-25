export function preview(container, raw) {
  const words = raw.trim().split(/\s+/).filter(Boolean).length;
  const meta = document.createElement('div');
  meta.className = 'tile-meta';
  meta.textContent = `${words.toLocaleString()} words`;
  container.appendChild(meta);
  const snippet = document.createElement('div');
  snippet.className = 'wc-tile-snippet';
  snippet.textContent = raw.trim().slice(0, 120);
  container.appendChild(snippet);
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.WORD_COUNTER) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  container.innerHTML = `
    <div class="wc">
      <div class="wc-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="wc-title">Word Counter</span>
      </div>
      <div class="wc-body">
        <textarea class="wc-textarea" id="wc-text" placeholder="Paste or type text here…" spellcheck="false"></textarea>
        <div class="wc-stats" id="wc-stats">
          <div class="wc-stat"><span class="wc-stat-val" id="wc-words">0</span><span class="wc-stat-key">Words</span></div>
          <div class="wc-stat"><span class="wc-stat-val" id="wc-chars">0</span><span class="wc-stat-key">Characters</span></div>
          <div class="wc-stat"><span class="wc-stat-val" id="wc-no-sp">0</span><span class="wc-stat-key">No spaces</span></div>
          <div class="wc-stat"><span class="wc-stat-val" id="wc-sent">0</span><span class="wc-stat-key">Sentences</span></div>
          <div class="wc-stat"><span class="wc-stat-val" id="wc-para">0</span><span class="wc-stat-key">Paragraphs</span></div>
          <div class="wc-stat"><span class="wc-stat-val" id="wc-read">0 min</span><span class="wc-stat-key">Read time</span></div>
        </div>
        <div class="wc-top" id="wc-top"></div>
      </div>
    </div>`;

  const textarea = document.getElementById('wc-text');
  const els = {
    words: document.getElementById('wc-words'),
    chars: document.getElementById('wc-chars'),
    noSp:  document.getElementById('wc-no-sp'),
    sent:  document.getElementById('wc-sent'),
    para:  document.getElementById('wc-para'),
    read:  document.getElementById('wc-read'),
  };
  const topEl = document.getElementById('wc-top');

  const STOP = new Set('the a an and or but in on at to for of with is are was were be been being have has had do does did will would could should may might shall can'.split(' '));

  function analyse(text) {
    const words    = text.trim().split(/\s+/).filter(Boolean);
    const sents    = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const paras    = text.split(/\n\s*\n/).filter(p => p.trim()).length;
    const readMins = Math.max(1, Math.round(words.length / 238));

    els.words.textContent = words.length.toLocaleString();
    els.chars.textContent = text.length.toLocaleString();
    els.noSp.textContent  = text.replace(/\s/g, '').length.toLocaleString();
    els.sent.textContent  = sents.toLocaleString();
    els.para.textContent  = (paras || (text.trim() ? 1 : 0)).toLocaleString();
    els.read.textContent  = readMins + ' min';

    // Top words
    const freq = {};
    for (const w of words) {
      const clean = w.toLowerCase().replace(/[^a-z]/g, '');
      if (clean.length > 2 && !STOP.has(clean)) freq[clean] = (freq[clean] || 0) + 1;
    }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (top.length) {
      topEl.innerHTML = '<div class="wc-top-label">Top words</div>';
      const max = top[0][1];
      top.forEach(([word, count]) => {
        const row = document.createElement('div');
        row.className = 'wc-top-row';
        row.innerHTML = `
          <span class="wc-top-word">${word}</span>
          <div class="wc-top-bar-wrap"><div class="wc-top-bar" style="width:${(count/max*100).toFixed(0)}%"></div></div>
          <span class="wc-top-count">${count}</span>`;
        topEl.appendChild(row);
      });
    } else {
      topEl.innerHTML = '';
    }
  }

  textarea.addEventListener('input', () => analyse(textarea.value));
  textarea.value = raw || '';
  if (raw) analyse(raw);
}
