/**
 * 工具函数模块
 */
window.SteamSirP = window.SteamSirP || {};

SteamSirP.Utils = (() => {
  /**
   * 中文月份映射
   */
  const monthMap = {
    '1月': 0, '2月': 1, '3月': 2, '4月': 3, '5月': 4, '6月': 5,
    '7月': 6, '8月': 7, '9月': 8, '10月': 9, '11月': 10, '12月': 11
  };

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // 调试面板
  let debugPanel = null;

  /**
   * 创建调试面板
   */
  function createDebugPanel() {
    if (debugPanel && debugPanel.parentNode) {
      return debugPanel;
    }

    // 等待 body 可用
    if (!document.body) {
      console.warn('[SteamSirP] Body not ready, retrying...');
      setTimeout(createDebugPanel, 100);
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'steamsr-debug-panel';
    panel.style.position = 'fixed';
    panel.style.top = '0';
    panel.style.left = '0';
    panel.style.right = '0';
    panel.style.width = '100%';
    panel.style.maxHeight = '150px';
    panel.style.background = '#1b1b1b';
    panel.style.border = '2px solid #0084ff';
    panel.style.borderRadius = '0 0 5px 5px';
    panel.style.padding = '10px';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.color = '#00ff00';
    panel.style.overflowY = 'auto';
    panel.style.zIndex = '99999';
    panel.style.boxShadow = '0 2px 10px rgba(0, 132, 255, 0.5)';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ 关闭';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '5px';
    closeBtn.style.right = '5px';
    closeBtn.style.background = '#0084ff';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '2px 8px';
    closeBtn.style.borderRadius = '3px';
    closeBtn.style.fontSize = '12px';
    closeBtn.onclick = () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    };

    panel.appendChild(closeBtn);

    const content = document.createElement('div');
    content.id = 'steamsr-debug-content';
    content.style.marginTop = '25px';
    panel.appendChild(content);

    document.body.appendChild(panel);
    debugPanel = panel;

    // 添加初始化日志
    console.log('[SteamSirP] 调试面板已创建');
    addDebugLog('调试面板已创建', null);

    return panel;
  }

  /**
   * 添加日志到调试面板
   */
  function addDebugLog(message, data = null) {
    // 如果面板不存在且被禁用，则只使用控制台输出
    if (!debugPanel || !debugPanel.parentNode) {
      return; // 如果调试面板被禁用或不存在，不要尝试创建
    }

    const content = document.getElementById('steamsr-debug-content');
    if (!content) return;

    const logLine = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();

    if (data) {
      logLine.textContent = `[${timestamp}] ${message}: ${JSON.stringify(data).substring(0, 100)}`;
    } else {
      logLine.textContent = `[${timestamp}] ${message}`;
    }

    logLine.style.marginBottom = '3px';
    logLine.style.wordBreak = 'break-all';
    content.appendChild(logLine);

    // 滚动到底部
    if (debugPanel) {
      debugPanel.scrollTop = debugPanel.scrollHeight;
    }

    // 保持最多100条日志
    if (content.children.length > 100) {
      content.removeChild(content.firstChild);
    }
  }

  /**
   * 统一日志输出
   */
  function log(message, data = null) {
    const prefix = window.SteamSirP.Config.LOG_PREFIX;
    addDebugLog(message, data);
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * 统一警告输出
   */
  function warn(message, data = null) {
    const prefix = window.SteamSirP.Config.LOG_PREFIX;
    addDebugLog(`⚠️ ${message}`, data);
    if (data) {
      console.warn(`${prefix} ${message}`, data);
    } else {
      console.warn(`${prefix} ${message}`);
    }
  }

  /**
   * 获取月份索引
   */
  function getMonthIndex(monthStr) {
    return monthMap[monthStr];
  }

  /**
   * 获取月份名称
   */
  function getMonthName(monthIndex) {
    return monthNames[monthIndex];
  }

  /**
   * 检测页面类型
   */
  function detectPageType() {
    const url = window.location.href;
    if (url.includes('/search')) {
      return 'search';
    }
    if (url.includes('/inventory')) {
      return 'inventory';
    }
    // 检测首页 - 包含多个可能的首页 URL
    if (url === 'https://store.steampowered.com/' || url === 'https://store.steampowered.com' ||
        !url.includes('/search') && !url.includes('/inventory') && url.includes('store.steampowered.com')) {
      if (!url.includes('/app/') && !url.includes('/bundle/') && !url.includes('/sub/')) {
        return 'home';
      }
    }
    return 'unknown';
  }

  /**
   * 注入样式
   */
  function injectStyle(styleId, cssText) {
    if (document.getElementById(styleId)) {
      return; // 已存在，无需重新注入
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssText;
    document.head.appendChild(style);
  }

  /**
   * 防抖函数
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return {
    log,
    warn,
    getMonthIndex,
    getMonthName,
    detectPageType,
    injectStyle,
    debounce,
    monthMap,
    monthNames,
    createDebugPanel
  };
})();

window.SteamSirP = SteamSirP;

