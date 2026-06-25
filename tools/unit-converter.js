export function preview(container, raw) {
  const hint = document.createElement('div');
  hint.className = 'tile-meta';
  hint.textContent = 'Convert units';
  container.appendChild(hint);
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.UNIT_CONVERTER) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  const CATS = {
    Length:      { base: 'm',   units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 } },
    Weight:      { base: 'kg',  units: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.02835, lb: 0.45359, st: 6.35029 } },
    Volume:      { base: 'L',   units: { mL: 0.001, L: 1, m³: 1000, tsp: 0.00493, tbsp: 0.01479, 'fl oz': 0.02957, cup: 0.23659, pt: 0.47318, qt: 0.94635, gal: 3.78541 } },
    Area:        { base: 'm²',  units: { 'mm²': 0.000001, 'cm²': 0.0001, 'm²': 1, 'km²': 1e6, 'in²': 0.000645, 'ft²': 0.0929, 'yd²': 0.8361, ac: 4046.86, 'mi²': 2589988 } },
    Speed:       { base: 'm/s', units: { 'm/s': 1, 'km/h': 0.27778, mph: 0.44704, knot: 0.51444, 'ft/s': 0.3048 } },
    Temperature: { base: 'C',   units: { C: null, F: null, K: null } },
    Data:        { base: 'B',   units: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 } },
  };

  const catNames = Object.keys(CATS);

  container.innerHTML = `
    <div class="uc">
      <div class="uc-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="uc-title">Unit Converter</span>
      </div>
      <div class="uc-body">
        <div class="uc-tabs" id="uc-tabs">
          ${catNames.map((c, i) => `<button class="uc-tab${i === 0 ? ' active' : ''}" data-cat="${c}">${c}</button>`).join('')}
        </div>
        <div class="uc-input-row">
          <input class="uc-input" id="uc-val" type="number" value="1" step="any" />
          <select class="dg-select" id="uc-from"></select>
        </div>
        <div class="uc-results" id="uc-results"></div>
      </div>
    </div>`;

  const tabs    = document.getElementById('uc-tabs');
  const valEl   = document.getElementById('uc-val');
  const fromEl  = document.getElementById('uc-from');
  const results = document.getElementById('uc-results');

  let activeCat = catNames[0];

  function toBase(val, unit, cat) {
    if (cat === 'Temperature') {
      if (unit === 'C') return val;
      if (unit === 'F') return (val - 32) * 5 / 9;
      if (unit === 'K') return val - 273.15;
    }
    return val * CATS[cat].units[unit];
  }

  function fromBase(baseVal, unit, cat) {
    if (cat === 'Temperature') {
      if (unit === 'C') return baseVal;
      if (unit === 'F') return baseVal * 9 / 5 + 32;
      if (unit === 'K') return baseVal + 273.15;
    }
    return baseVal / CATS[cat].units[unit];
  }

  function fmt(n) {
    if (Math.abs(n) >= 1e9 || (Math.abs(n) < 0.0001 && n !== 0)) return n.toExponential(4);
    const s = parseFloat(n.toPrecision(6)).toString();
    return s.replace(/\.?0+$/, '');
  }

  function populate(cat) {
    const units = Object.keys(CATS[cat].units);
    fromEl.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
    convert(cat);
  }

  function convert(cat) {
    const val = parseFloat(valEl.value);
    if (isNaN(val)) { results.innerHTML = ''; return; }
    const from = fromEl.value;
    const baseVal = toBase(val, from, cat);
    const units = Object.keys(CATS[cat].units);
    results.innerHTML = '';
    units.forEach(u => {
      if (u === from) return;
      const converted = fromBase(baseVal, u, cat);
      const row = document.createElement('div');
      row.className = 'uc-row';
      row.innerHTML = `<span class="uc-row-val">${fmt(converted)}</span><span class="uc-row-unit">${u}</span>`;
      row.addEventListener('click', () => {
        valEl.value = fmt(converted);
        fromEl.value = u;
        convert(cat);
      });
      results.appendChild(row);
    });
  }

  tabs.addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    activeCat = btn.dataset.cat;
    tabs.querySelectorAll('.uc-tab').forEach(t => t.classList.toggle('active', t === btn));
    populate(activeCat);
  });

  valEl.addEventListener('input', () => convert(activeCat));
  fromEl.addEventListener('change', () => convert(activeCat));

  populate(activeCat);
}
