/**
 * 主入口文件 - 整合所有功能模块
 */
window.SteamSirP = window.SteamSirP || {};

/**
 * 初始化应用
 */
(function initApp() {
  const Utils = window.SteamSirP.Utils;
  const TimezoneConverter = window.SteamSirP.TimezoneConverter;
  const SearchProcessorClass = window.SteamSirP.SearchProcessor.SearchProcessor;

  let searchProcessor = null;
  let observer = null;
  let lastProcessTime = 0;
  const PROCESS_INTERVAL = 2000; // 2秒内只处理一次

  /**
   * 检测当前页面类型
   */
  function detectPageType() {
    return Utils.detectPageType();
  }

  /**
   * 初始化搜索处理器
   */
  async function initSearchProcessor() {
    if (!searchProcessor) {
      searchProcessor = new SearchProcessorClass();
    }
    await searchProcessor.processSearchResults();
  }

  /**
   * 处理页面加载
   */
  async function processPageInitial() {
    try {
      const pageType = detectPageType();
      Utils.log(`检测到页面类型: ${pageType}`);

      // 处理库存页面的UTC转换
      if (pageType === 'inventory') {
        TimezoneConverter.processPage();
      }

      // 处理搜索结果页面的家庭库标记
      if (pageType === 'search') {
        await initSearchProcessor();
      }
    } catch (error) {
      Utils.warn('页面初始化出错', error);
    }
  }

  /**
   * 处理DOM变化（防抖）
   */
  const handleMutations = Utils.debounce(async () => {
    try {
      const now = Date.now();
      // 限制处理频率，避免重复处理
      if (now - lastProcessTime < PROCESS_INTERVAL) {
        return;
      }
      lastProcessTime = now;

      const pageType = detectPageType();

      // 处理库存页面的UTC转换
      if (pageType === 'inventory') {
        TimezoneConverter.processPage();
      }

      // 处理搜索结果页面的家庭库标记
      if (pageType === 'search') {
        await initSearchProcessor();
      }
    } catch (error) {
      Utils.warn('DOM变化处理出错', error);
    }
  }, 1000); // 防抖延迟改为1秒，减少频繁处理

  /**
   * 初始化MutationObserver
   */
  function initObserver() {
    observer = new MutationObserver(handleMutations);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false
    });

    Utils.log('MutationObserver已初始化');
  }

  /**
   * 启动应用
   */
  function start() {
    // 延迟创建调试面板，确保 body 可用
    setTimeout(() => {
      // 从存储中读取是否显示调试面板
      chrome.storage.sync.get(['showDebugPanel'], (result) => {
        if (result.showDebugPanel === true) {
          Utils.createDebugPanel();
        }
      });
      Utils.log('SteamSirP 插件已启动');
    }, 100);

    // 如果页面还在加载中，等待DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        processPageInitial();
        initObserver();
      });
    } else {
      // 页面已加载，直接处理
      processPageInitial();
      initObserver();
    }
  }

  // 启动应用
  start();
})();
