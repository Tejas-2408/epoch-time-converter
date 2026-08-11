// Saves user preferences inside chrome.storage.local, and runs the manual
// epoch <-> human time converters shown in the popup.

document.addEventListener('DOMContentLoaded', () => {
  const statusCheckbox = document.getElementById('status');
  const timezoneSelect = document.getElementById('timezone');

  // ---------------------------------------------------------------------
  // Settings: enable/disable the on-page converter + target timezone
  // ---------------------------------------------------------------------

  chrome.storage.local.get({ enabled: true, timezone: 'LOCAL' }, (items) => {
    statusCheckbox.checked = items.enabled;
    timezoneSelect.value = items.timezone;
  });

  const saveOptions = () => {
    chrome.storage.local.set({
      enabled: statusCheckbox.checked,
      timezone: timezoneSelect.value
    });
  };

  statusCheckbox.addEventListener('change', saveOptions);
  timezoneSelect.addEventListener('change', () => {
    saveOptions();
    // Keep the manual converters in sync with whichever zone is selected.
    updateEpochToHumanResult();
  });

  // ---------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------

  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // ---------------------------------------------------------------------
  // Epoch -> Human
  // ---------------------------------------------------------------------

  const epochInput = document.getElementById('epoch-input');
  const epochToHumanBtn = document.getElementById('epoch-to-human-btn');
  const epochToHumanResult = document.getElementById('epoch-to-human-result');

  function formatEpochToHuman(rawValue, timeZone) {
    const trimmed = rawValue.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      throw new Error('Enter a plain epoch number (10 digits for seconds, 13 for milliseconds).');
    }

    let ms = parseInt(trimmed, 10);
    // Treat 10-digit-ish values as seconds, everything longer as milliseconds.
    if (Math.abs(ms) < 100000000000) {
      ms *= 1000;
    }

    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) {
      throw new Error('That number is not a valid timestamp.');
    }

    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short'
    };
    if (timeZone !== 'LOCAL') options.timeZone = timeZone;

    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', options).formatToParts(date).map((p) => [p.type, p.value])
    );

    return {
      human: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${parts.timeZoneName}`,
      iso: date.toISOString()
    };
  }

  function updateEpochToHumanResult() {
    const raw = epochInput.value;
    epochToHumanResult.classList.remove('error');

    if (!raw.trim()) {
      epochToHumanResult.classList.remove('visible');
      return;
    }

    try {
      const { human, iso } = formatEpochToHuman(raw, timezoneSelect.value);
      epochToHumanResult.innerHTML =
        `<div class="main-value">${human}</div>` +
        `<div class="sub-value">ISO: ${iso}</div>` +
        `<button type="button" class="copy-btn" data-copy="${human}">Copy</button>`;
      epochToHumanResult.classList.add('visible');
    } catch (err) {
      epochToHumanResult.textContent = err.message;
      epochToHumanResult.classList.add('visible', 'error');
    }
  }

  epochToHumanBtn.addEventListener('click', updateEpochToHumanResult);
  epochInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') updateEpochToHumanResult();
  });

  // ---------------------------------------------------------------------
  // Human -> Epoch
  // ---------------------------------------------------------------------

  const dateInput = document.getElementById('date-input');
  const timeInput = document.getElementById('time-input');
  const humanToEpochBtn = document.getElementById('human-to-epoch-btn');
  const humanToEpochResult = document.getElementById('human-to-epoch-result');

  // Default the pickers to "right now" so the popup is useful immediately.
  (function seedDefaults() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    timeInput.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  })();

  /**
   * Returns the UTC-millisecond offset a given IANA timeZone has at `date`.
   * Standard no-dependency trick: format the instant in that zone, re-parse
   * those wall-clock numbers as if they were UTC, and diff against the
   * original instant.
   */
  function getTimeZoneOffsetMs(date, timeZone) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).formatToParts(date).map((p) => [p.type, p.value])
    );

    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second)
    );

    return asUTC - date.getTime();
  }

  /** Converts a wall-clock date/time in `timeZone` to a UTC epoch (ms). */
  function zonedTimeToEpochMs(year, month, day, hour, minute, second, timeZone) {
    if (timeZone === 'LOCAL') {
      return new Date(year, month - 1, day, hour, minute, second).getTime();
    }

    let guess = Date.UTC(year, month - 1, day, hour, minute, second);
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone);
    guess -= offset;

    // One extra pass to stay correct across DST transitions.
    const offset2 = getTimeZoneOffsetMs(new Date(guess), timeZone);
    if (offset2 !== offset) {
      guess = Date.UTC(year, month - 1, day, hour, minute, second) - offset2;
    }

    return guess;
  }

  function updateHumanToEpochResult() {
    humanToEpochResult.classList.remove('error');

    const dateVal = dateInput.value; // yyyy-mm-dd
    const timeVal = timeInput.value; // hh:mm or hh:mm:ss

    if (!dateVal || !timeVal) {
      humanToEpochResult.textContent = 'Pick both a date and a time.';
      humanToEpochResult.classList.add('visible', 'error');
      return;
    }

    const [year, month, day] = dateVal.split('-').map(Number);
    const timeParts = timeVal.split(':').map(Number);
    const hour = timeParts[0] || 0;
    const minute = timeParts[1] || 0;
    const second = timeParts[2] || 0;

    try {
      const epochMs = zonedTimeToEpochMs(year, month, day, hour, minute, second, timezoneSelect.value);
      if (Number.isNaN(epochMs)) throw new Error('Invalid date/time.');

      const epochSeconds = Math.round(epochMs / 1000);
      humanToEpochResult.innerHTML =
        `<div class="main-value">${epochSeconds} <span class="sub-value" style="display:inline">(seconds)</span></div>` +
        `<div class="sub-value">${epochMs} ms</div>` +
        `<button type="button" class="copy-btn" data-copy="${epochSeconds}">Copy seconds</button>`;
      humanToEpochResult.classList.add('visible');
    } catch (err) {
      humanToEpochResult.textContent = err.message;
      humanToEpochResult.classList.add('visible', 'error');
    }
  }

  humanToEpochBtn.addEventListener('click', updateHumanToEpochResult);

  // ---------------------------------------------------------------------
  // Copy-to-clipboard for whichever result panel produced a "Copy" button
  // ---------------------------------------------------------------------

  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;

    navigator.clipboard.writeText(btn.dataset.copy).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1200);
    });
  });
});
