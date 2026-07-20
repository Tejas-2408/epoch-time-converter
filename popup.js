// Saves user perferences inside the secure chrome.storage.local

document.addEventListener('DOMContentLoaded', () => {
  const statusCheckbox = document.getElementById('status');
  const timezoneSelect = document.getElementById('timezone');

  // Load saved configurations
  chrome.storage.local.get({ enabled: true, timezone: 'LOCAL' }, (items) => {
    statusCheckbox.checked = items.enabled;
    timezoneSelect.value = items.timezone;
  });

  // Persist configurations on change
  const saveOptions = () => {
    chrome.storage.local.set({
      enabled: statusCheckbox.checked,
      timezone: timezoneSelect.value
    });
  };

  statusCheckbox.addEventListener('change', saveOptions);
  timezoneSelect.addEventListener('change', saveOptions);
});