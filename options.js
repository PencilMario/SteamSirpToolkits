const form = document.getElementById('settingsForm');
const statusDiv = document.getElementById('status');
const showDebugPanelCheckbox = document.getElementById('showDebugPanel');
const disableFamilyLibraryPurchaseCheckbox = document.getElementById('disableFamilyLibraryPurchase');

function showStatus(message, type = 'success') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
}

function loadSettings() {
  chrome.storage.sync.get(['showDebugPanel', 'disableFamilyLibraryPurchase'], (result) => {
    showDebugPanelCheckbox.checked = result.showDebugPanel ?? false;
    disableFamilyLibraryPurchaseCheckbox.checked = result.disableFamilyLibraryPurchase ?? true;
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  chrome.storage.sync.set({
    showDebugPanel: showDebugPanelCheckbox.checked,
    disableFamilyLibraryPurchase: disableFamilyLibraryPurchaseCheckbox.checked
  }, () => {
    showStatus('✅ 设置已保存！');
  });
});

document.addEventListener('DOMContentLoaded', loadSettings);
