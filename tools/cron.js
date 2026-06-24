export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.CRON_EXPRESSION_HUMANIZER) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTH_DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];

  container.innerHTML = `
    <div class="ceh">
      <div class="ceh-head">
        <span class="ceh-title">Cron Humanizer</span>
      </div>
      <input class="ceh-input" id="ceh-input" type="text" placeholder="0 9 * * 1-5" autocomplete="off" spellcheck="false" />
      <div class="ceh-chips">
        <span class="ceh-label">Examples</span>
        <span class="ceh-chip" data-expr="* * * * *">* * * * *</span>
        <span class="ceh-chip" data-expr="0 9 * * 1-5">0 9 * * 1-5</span>
        <span class="ceh-chip" data-expr="30 18 * * 5">30 18 * * 5</span>
        <span class="ceh-chip" data-expr="0 0 1 * *">0 0 1 * *</span>
        <span class="ceh-chip" data-expr="*/15 * * * *">*/15 * * * *</span>
        <span class="ceh-chip" data-expr="0 8,12,17 * * 1-5">0 8,12,17 * * 1-5</span>
        <span class="ceh-chip" data-expr="0 0 1 1 *">0 0 1 1 *</span>
      </div>
      <div id="ceh-output"></div>
    </div>`;

  const input  = document.getElementById('ceh-input');
  const output = document.getElementById('ceh-output');

  input.value = raw;

  // ── Parsing ──────────────────────────────────────────────

  function parseField(raw, min, max) {
    const values = new Set();
    for (const part of raw.split(',')) {
      const stepMatch = part.match(/^(.+)\/(\d+)$/);
      const range = stepMatch ? stepMatch[1] : part;
      const step  = stepMatch ? parseInt(stepMatch[2], 10) : 1;
      if (step < 1) return null;
      let lo, hi;
      if (range === '*') { lo = min; hi = max; }
      else if (range.includes('-')) {
        const [a, b] = range.split('-').map(Number);
        if (isNaN(a) || isNaN(b)) return null;
        lo = a; hi = b;
      } else {
        const v = Number(range);
        if (isNaN(v)) return null;
        lo = hi = v;
      }
      if (lo < min || hi > max || lo > hi) return null;
      for (let i = lo; i <= hi; i += step) values.add(i);
    }
    return [...values].sort((a, b) => a - b);
  }

  function parse(expr) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) throw new Error('Expected exactly 5 fields: minute hour day month weekday');
    const [minR, hourR, domR, monR, dowR] = parts;
    const minutes = parseField(minR,  0, 59);
    const hours   = parseField(hourR, 0, 23);
    const doms    = parseField(domR,  1, 31);
    const months  = parseField(monR,  1, 12);
    const dows    = parseField(dowR,  0,  7);
    if (!minutes) throw new Error('Invalid minute field: ' + minR);
    if (!hours)   throw new Error('Invalid hour field: ' + hourR);
    if (!doms)    throw new Error('Invalid day-of-month field: ' + domR);
    if (!months)  throw new Error('Invalid month field: ' + monR);
    if (!dows)    throw new Error('Invalid weekday field: ' + dowR);
    return { parts, minutes, hours, doms, months, dows, domWild: domR === '*', dowWild: dowR === '*' };
  }

  // ── Next runs ────────────────────────────────────────────

  function nextRuns(parsed, count) {
    const { minutes, hours, doms, months, dows, domWild, dowWild } = parsed;
    const results = [];
    let cur = new Date();
    cur.setSeconds(0, 0);
    cur = new Date(cur.getTime() + 60000);
    let iter = 0;
    while (results.length < count && iter++ < 100000) {
      const mo = cur.getMonth() + 1, dom = cur.getDate(), hr = cur.getHours(), mn = cur.getMinutes();
      if (!months.includes(mo)) {
        const next = months.find(m => m > mo) ?? months[0];
        cur = new Date(next <= mo ? cur.getFullYear() + 1 : cur.getFullYear(), next - 1, 1, 0, 0, 0, 0);
        continue;
      }
      const domOk = domWild || doms.includes(dom);
      const dowOk = dowWild || dows.includes(cur.getDay()) || dows.includes(cur.getDay() === 0 ? 7 : cur.getDay());
      const dayOk = (!domWild && !dowWild) ? (domOk || dowOk) : (domWild ? dowOk : domOk);
      if (!dayOk) { cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0, 0); continue; }
      if (!hours.includes(hr)) {
        const next = hours.find(h => h > hr);
        cur = next !== undefined
          ? new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), next, 0, 0, 0)
          : new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0, 0);
        continue;
      }
      if (!minutes.includes(mn)) {
        const next = minutes.find(m => m > mn);
        if (next !== undefined) { cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), hr, next, 0, 0); }
        else {
          const nextHr = hours.find(h => h > hr);
          cur = nextHr !== undefined
            ? new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), nextHr, 0, 0, 0)
            : new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0, 0);
        }
        continue;
      }
      results.push(new Date(cur));
      cur = new Date(cur.getTime() + 60000);
    }
    return results;
  }

  // ── Humanize ─────────────────────────────────────────────

  function describeField(raw, values, min, max, names, unit, units) {
    if (values.length === max - min + 1) return 'every ' + unit;
    const stepM = raw.match(/^\*\/(\d+)$/);
    if (stepM) return `every ${stepM[1]} ${units}`;
    if (values.length === 1) return names ? names[values[0]] : `${unit} ${values[0]}`;
    if (raw.match(/^\d+-\d+$/)) {
      const lo = names ? names[values[0]] : values[0];
      const hi = names ? names[values[values.length - 1]] : values[values.length - 1];
      return `${lo} through ${hi}`;
    }
    const mapped = names ? values.map(v => names[v]) : values.map(String);
    return mapped.length === 2 ? `${mapped[0]} and ${mapped[1]}` : `${mapped.slice(0,-1).join(', ')}, and ${mapped[mapped.length-1]}`;
  }

  function humanize(expr) {
    const parsed = parse(expr);
    const [minR, hourR, domR, monR, dowR] = parsed.parts;

    const minutePart = describeField(minR,  parsed.minutes, 0, 59, null,   'minute', 'minutes');
    const hourPart   = describeField(hourR, parsed.hours,   0, 23, null,   'hour',   'hours');
    const domPart    = describeField(domR,  parsed.doms,    1, 31, null,   'day',    'days');
    const monPart    = describeField(monR,  parsed.months,  1, 12, MONTHS, 'month',  'months');
    const dowPart    = describeField(dowR,  parsed.dows.map(d => d === 7 ? 0 : d), 0, 6, DAYS, 'day', 'days');

    const allMin = parsed.minutes.length === 60, allHour = parsed.hours.length === 24;
    let timePart;
    if (allMin && allHour)     timePart = 'every minute';
    else if (allMin)           timePart = `every minute during ${hourPart}`;
    else if (allHour)          timePart = minR.startsWith('*/') ? minutePart : `at minute ${minutePart} of every hour`;
    else if (parsed.hours.length === 1 && parsed.minutes.length === 1)
      timePart = `at ${pad(parsed.hours[0])}:${pad(parsed.minutes[0])}`;
    else if (parsed.minutes.length === 1)
      timePart = `at minute :${pad(parsed.minutes[0])} past ${hourPart}`;
    else
      timePart = `at minute ${minutePart} past ${hourPart}`;

    let dayPart = '';
    if (!parsed.domWild && !parsed.dowWild) dayPart = ` on ${domPart} of the month or on ${dowPart}`;
    else if (!parsed.domWild) dayPart = ` on the ${humanOrdinals(parsed.doms)} of the month`;
    else if (!parsed.dowWild) dayPart = ` on ${dowPart}`;

    const monthPhrase = parsed.months.length < 12 ? ` in ${monPart}` : '';
    return { sentence: cap(timePart) + dayPart + monthPhrase + '.', parsed };
  }

  function humanOrdinals(arr) {
    const mapped = arr.map(ordinal);
    if (mapped.length === 1) return mapped[0];
    if (mapped.length === 2) return `${mapped[0]} and ${mapped[1]}`;
    return `${mapped.slice(0,-1).join(', ')}, and ${mapped[mapped.length-1]}`;
  }

  function ordinal(n) {
    const s = ['th','st','nd','rd'], v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ── Render result ────────────────────────────────────────

  function fmtDate(d) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${days[d.getDay()]} ${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function relTime(d) {
    const s = Math.round((d - Date.now()) / 1000);
    if (s < 60)    return `in ${s}s`;
    if (s < 3600)  return `in ${Math.round(s/60)}m`;
    if (s < 86400) return `in ${Math.round(s/3600)}h`;
    return `in ${Math.round(s/86400)}d`;
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function showResult(expr) {
    try {
      const { sentence, parsed } = humanize(expr);
      const runs = nextRuns(parsed, 5);
      output.innerHTML = `
        <p class="ceh-human">${esc(sentence)}</p>
        <div class="ceh-fields">
          ${['Minute','Hour','Day','Month','Weekday'].map((n,i) => `
            <div class="ceh-field">
              <div class="ceh-field-name">${n}</div>
              <div class="ceh-field-val">${esc(parsed.parts[i])}</div>
            </div>`).join('')}
        </div>
        <div class="ceh-runs">
          <div class="ceh-runs-label">Next 5 scheduled runtimes</div>
          ${runs.map((d,i) => `
            <div class="ceh-run">
              <span class="ceh-run-i">#${i+1}</span>
              <span class="ceh-run-dt">${esc(fmtDate(d))}</span>
              <span class="ceh-run-rel">${esc(relTime(d))}</span>
            </div>`).join('')}
        </div>`;
    } catch (e) {
      output.innerHTML = `<div class="ceh-error">${esc(e.message)}</div>`;
    }
  }

  input.addEventListener('keydown', e => { if (e.key === 'Enter') showResult(input.value.trim()); });
  input.addEventListener('input', () => { if (input.value.trim()) showResult(input.value.trim()); });
  container.querySelectorAll('.ceh-chip').forEach(chip => {
    chip.addEventListener('click', () => { input.value = chip.dataset.expr; showResult(chip.dataset.expr); });
  });

  if (raw.trim()) showResult(raw.trim());
}
