/**
 * 设置页面脚本
 */

const form = document.getElementById('settingsForm');
const apiKeyInput = document.getElementById('apiKey');
const clearBtn = document.getElementById('clearBtn');
const statusDiv = document.getElementById('status');
const showDebugPanelCheckbox = document.getElementById('showDebugPanel');

/**
 * 显示状态消息
 */
function showStatus(message, type = 'success') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
}

/**
 * 加载已保存的设置
 */
function loadSettings() {
  chrome.storage.sync.get(['steamApiKey', 'showDebugPanel'], (result) => {
    if (result.steamApiKey) {
      apiKeyInput.value = result.steamApiKey;
    }
    // 默认不显示调试面板
    if (result.showDebugPanel !== undefined) {
      showDebugPanelCheckbox.checked = result.showDebugPanel;
    } else {
      showDebugPanelCheckbox.checked = false;
    }
  });
}

/**
 * 保存设置
 */
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showStatus('⚠️ 请输入 API Key', 'error');
    return;
  }

  if (apiKey.length < 20) {
    showStatus('⚠️ API Key 格式不正确', 'error');
    return;
  }

  const settings = {
    steamApiKey: apiKey,
    showDebugPanel: showDebugPanelCheckbox.checked
  };

  chrome.storage.sync.set(settings, () => {
    showStatus('✅ 设置已保存！');
    console.log('Settings saved', settings);
  });
});

/**
 * 清除数据
 */
clearBtn.addEventListener('click', () => {
  if (confirm('确定要清除保存的 API Key 吗？')) {
    chrome.storage.sync.remove(['steamApiKey'], () => {
      apiKeyInput.value = '';
      showStatus('✅ 数据已清除', 'success');
    });
  }
});

/**
 * 页面加载时读取设置
 */
document.addEventListener('DOMContentLoaded', loadSettings);

