export function preview(container, raw) {
  const hint = document.createElement('div');
  hint.className = 'tile-meta';
  hint.textContent = 'Count down to a date';
  container.appendChild(hint);
}

export function render(container, raw) {
  if (!window.AUTIL_FLAGS?.COUNTDOWN_TIMER) {
    container.innerHTML = '<p class="tool-offline">Tool offline.</p>';
    return;
  }

  container.innerHTML = `
    <div class="ct">
      <div class="ct-bar">
        <button class="dg-icon-btn" data-back title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="ct-title">Countdown Timer</span>
      </div>
      <div class="ct-body">
        <div class="ct-setup">
          <input class="ct-name-input" id="ct-name" type="text" placeholder="Event name (optional)" maxlength="60" />
          <input class="ct-date-input" id="ct-date" type="datetime-local" />
        </div>
        <div class="ct-display" id="ct-display" hidden>
          <div class="ct-event-name" id="ct-event-name"></div>
          <div class="ct-units">
            <div class="ct-unit"><span class="ct-val" id="ct-days">0</span><span class="ct-unit-label">Days</span></div>
            <div class="ct-sep">:</div>
            <div class="ct-unit"><span class="ct-val" id="ct-hours">0</span><span class="ct-unit-label">Hours</span></div>
            <div class="ct-sep">:</div>
            <div class="ct-unit"><span class="ct-val" id="ct-mins">0</span><span class="ct-unit-label">Minutes</span></div>
            <div class="ct-sep">:</div>
            <div class="ct-unit"><span class="ct-val" id="ct-secs">0</span><span class="ct-unit-label">Seconds</span></div>
          </div>
          <div class="ct-done" id="ct-done" hidden>Time's up!</div>
        </div>
      </div>
    </div>`;

  const nameEl    = document.getElementById('ct-name');
  const dateEl    = document.getElementById('ct-date');
  const displayEl = document.getElementById('ct-display');
  const eventName = document.getElementById('ct-event-name');
  const daysEl    = document.getElementById('ct-days');
  const hoursEl   = document.getElementById('ct-hours');
  const minsEl    = document.getElementById('ct-mins');
  const secsEl    = document.getElementById('ct-secs');
  const doneEl    = document.getElementById('ct-done');

  // Default to 1 week from now
  const def = new Date(Date.now() + 7 * 86400000);
  dateEl.value = def.toISOString().slice(0, 16);

  let timer = null;

  function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }

  function tick() {
    const target = new Date(dateEl.value).getTime();
    const diff = target - Date.now();

    if (diff <= 0) {
      daysEl.textContent = hoursEl.textContent = minsEl.textContent = secsEl.textContent = '00';
      doneEl.hidden = false;
      return;
    }
    doneEl.hidden = true;

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    const secs  = Math.floor((diff % 60000) / 1000);

    daysEl.textContent  = days;
    hoursEl.textContent = pad(hours);
    minsEl.textContent  = pad(mins);
    secsEl.textContent  = pad(secs);
  }

  function start() {
    if (!dateEl.value) return;
    clearInterval(timer);
    eventName.textContent = nameEl.value.trim();
    displayEl.hidden = false;
    tick();
    timer = setInterval(tick, 1000);
  }

  dateEl.addEventListener('change', start);
  nameEl.addEventListener('input', () => { eventName.textContent = nameEl.value.trim(); });

  // Try to extract a date from dropped text
  const parsed = raw ? new Date(raw.trim()) : null;
  if (parsed && !isNaN(parsed)) {
    dateEl.value = parsed.toISOString().slice(0, 16);
  }

  start();
}
