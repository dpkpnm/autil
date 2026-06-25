export function preview(container, raw) {
  const hint = document.createElement('div');
  hint.className = 'tile-meta';
  hint.textContent = 'Split a bill';
  container.appendChild(hint);
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.BILL_SPLITTER) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  container.innerHTML = `
    <div class="bs">
      <div class="bs-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="bs-title">Bill Splitter</span>
      </div>
      <div class="bs-body">
        <div class="bs-fields">
          <div class="bs-field">
            <label class="bs-label">Bill Total ($)</label>
            <input class="bs-input" id="bs-bill" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="bs-field">
            <label class="bs-label">Tip (%)</label>
            <div class="bs-tip-row">
              <input class="bs-input" id="bs-tip" type="number" min="0" max="100" step="1" value="18" />
              <div class="bs-tip-chips">
                <button class="bs-chip" data-tip="10">10%</button>
                <button class="bs-chip" data-tip="15">15%</button>
                <button class="bs-chip" data-tip="18">18%</button>
                <button class="bs-chip" data-tip="20">20%</button>
                <button class="bs-chip" data-tip="25">25%</button>
              </div>
            </div>
          </div>
          <div class="bs-field">
            <label class="bs-label">People</label>
            <div class="bs-people-row">
              <button class="bs-adj" id="bs-minus">−</button>
              <span class="bs-people-val" id="bs-people-val">2</span>
              <button class="bs-adj" id="bs-plus">+</button>
            </div>
          </div>
        </div>
        <div class="bs-result" id="bs-result" hidden>
          <div class="bs-result-row"><span class="bs-result-label">Tip amount</span><span class="bs-result-val" id="bs-tip-amt"></span></div>
          <div class="bs-result-row"><span class="bs-result-label">Total with tip</span><span class="bs-result-val" id="bs-total"></span></div>
          <div class="bs-result-row bs-result-hero"><span class="bs-result-label">Per person</span><span class="bs-result-val" id="bs-per"></span></div>
        </div>
      </div>
    </div>`;

  const billEl   = document.getElementById('bs-bill');
  const tipEl    = document.getElementById('bs-tip');
  const peopleEl = document.getElementById('bs-people-val');
  const resultEl = document.getElementById('bs-result');
  const tipAmt   = document.getElementById('bs-tip-amt');
  const totalEl  = document.getElementById('bs-total');
  const perEl    = document.getElementById('bs-per');

  let people = 2;

  const fmt = n => '$' + n.toFixed(2);

  function calc() {
    const bill = parseFloat(billEl.value);
    const tip  = parseFloat(tipEl.value);
    if (isNaN(bill) || bill <= 0) { resultEl.hidden = true; return; }
    const tipAmount = bill * (tip || 0) / 100;
    const total = bill + tipAmount;
    const per = total / people;
    tipAmt.textContent  = fmt(tipAmount);
    totalEl.textContent = fmt(total);
    perEl.textContent   = fmt(per);
    resultEl.hidden = false;
  }

  billEl.addEventListener('input', calc);
  tipEl.addEventListener('input', calc);

  document.getElementById('bs-minus').addEventListener('click', () => { if (people > 1) { people--; peopleEl.textContent = people; calc(); } });
  document.getElementById('bs-plus').addEventListener('click',  () => { people++; peopleEl.textContent = people; calc(); });

  document.querySelector('.bs-tip-chips').addEventListener('click', e => {
    const chip = e.target.closest('[data-tip]');
    if (!chip) return;
    tipEl.value = chip.dataset.tip;
    calc();
  });
}
