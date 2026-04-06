const form = document.getElementById('settingsForm');
const statusDiv = document.getElementById('status');
const showDebugPanelCheckbox = document.getElementById('showDebugPanel');
const disableFamilyLibraryPurchaseCheckbox = document.getElementById('disableFamilyLibraryPurchase');
const steamApiKeyInput = document.getElementById('steamApiKey');

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
  chrome.storage.sync.get(['showDebugPanel', 'disableFamilyLibraryPurchase', 'steamApiKey'], (result) => {
    showDebugPanelCheckbox.checked = result.showDebugPanel ?? false;
    disableFamilyLibraryPurchaseCheckbox.checked = result.disableFamilyLibraryPurchase ?? true;
    steamApiKeyInput.value = result.steamApiKey ?? '';
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  chrome.storage.sync.set({
    showDebugPanel: showDebugPanelCheckbox.checked,
    disableFamilyLibraryPurchase: disableFamilyLibraryPurchaseCheckbox.checked,
    steamApiKey: steamApiKeyInput.value.trim()
  }, () => {
    showStatus('✅ 设置已保存！');
  });
});

document.addEventListener('DOMContentLoaded', loadSettings);
