export function preview(container, raw) {
  const hint = document.createElement('div');
  hint.className = 'tile-meta';
  hint.textContent = 'Calculate loan payments';
  container.appendChild(hint);
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.LOAN_CALCULATOR) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  container.innerHTML = `
    <div class="lc">
      <div class="lc-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="lc-title">Loan Calculator</span>
      </div>
      <div class="lc-body">
        <div class="lc-fields">
          <div class="lc-field">
            <label class="lc-label">Loan Amount ($)</label>
            <input class="lc-input" id="lc-principal" type="number" min="0" step="1000" placeholder="100000" />
          </div>
          <div class="lc-field">
            <label class="lc-label">Annual Interest Rate (%)</label>
            <input class="lc-input" id="lc-rate" type="number" min="0" step="0.1" placeholder="6.5" />
          </div>
          <div class="lc-field">
            <label class="lc-label">Term (years)</label>
            <input class="lc-input" id="lc-term" type="number" min="1" step="1" placeholder="30" />
          </div>
        </div>
        <div class="lc-result" id="lc-result" hidden>
          <div class="lc-result-row lc-hero"><span class="lc-result-label">Monthly payment</span><span class="lc-result-val" id="lc-monthly"></span></div>
          <div class="lc-result-row"><span class="lc-result-label">Total interest</span><span class="lc-result-val" id="lc-interest"></span></div>
          <div class="lc-result-row"><span class="lc-result-label">Total paid</span><span class="lc-result-val" id="lc-total"></span></div>
        </div>
        <div class="lc-amort" id="lc-amort" hidden>
          <div class="lc-amort-title">Year-by-year breakdown</div>
          <div class="lc-amort-head">
            <span>Year</span><span>Principal</span><span>Interest</span><span>Balance</span>
          </div>
          <div id="lc-amort-rows"></div>
        </div>
      </div>
    </div>`;

  const principalEl = document.getElementById('lc-principal');
  const rateEl      = document.getElementById('lc-rate');
  const termEl      = document.getElementById('lc-term');
  const resultEl    = document.getElementById('lc-result');
  const amortEl     = document.getElementById('lc-amort');
  const monthlyEl   = document.getElementById('lc-monthly');
  const interestEl  = document.getElementById('lc-interest');
  const totalEl     = document.getElementById('lc-total');
  const amortRows   = document.getElementById('lc-amort-rows');

  const fmt  = n => '$' + Math.round(n).toLocaleString();
  const fmt2 = n => '$' + n.toFixed(2);

  function calc() {
    const P = parseFloat(principalEl.value);
    const r = parseFloat(rateEl.value) / 100 / 12;
    const n = parseInt(termEl.value) * 12;
    if (!P || !r || !n) { resultEl.hidden = true; amortEl.hidden = true; return; }

    const M = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const total = M * n;
    const interest = total - P;

    monthlyEl.textContent  = fmt2(M);
    interestEl.textContent = fmt(interest);
    totalEl.textContent    = fmt(total);
    resultEl.hidden = false;

    // Year-by-year
    amortRows.innerHTML = '';
    let balance = P;
    const years = parseInt(termEl.value);
    for (let y = 1; y <= years; y++) {
      let yearPrincipal = 0, yearInterest = 0;
      for (let m = 0; m < 12 && balance > 0; m++) {
        const intPmt = balance * r;
        const prinPmt = Math.min(M - intPmt, balance);
        yearInterest  += intPmt;
        yearPrincipal += prinPmt;
        balance -= prinPmt;
      }
      const row = document.createElement('div');
      row.className = 'lc-amort-row';
      row.innerHTML = `<span>${y}</span><span>${fmt(yearPrincipal)}</span><span>${fmt(yearInterest)}</span><span>${fmt(Math.max(0, balance))}</span>`;
      amortRows.appendChild(row);
    }
    amortEl.hidden = false;
  }

  [principalEl, rateEl, termEl].forEach(el => el.addEventListener('input', calc));
}
