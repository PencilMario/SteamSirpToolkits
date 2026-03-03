/**
 * 搜索结果处理模块 - 在Steam搜索结果页面标记家庭库游戏
 */
window.SteamSirP = window.SteamSirP || {};

SteamSirP.SearchProcessor = (() => {
  const Config = window.SteamSirP.Config;
  const Utils = window.SteamSirP.Utils;
  const LibraryManagerClass = window.SteamSirP.LibraryManager.LibraryManager;

  /**
   * SearchProcessor 类
   */
  class SearchProcessor {
    constructor() {
      this.libraryManager = new LibraryManagerClass();
      this.processedElements = new WeakSet();
    }

    /**
     * 注入CSS样式
     */
    injectStyles() {
      const cssText = `
        .${Config.UI.BADGE_CLASS} {
          display: inline-block;
          float: left;
          background: #5f7c8f;
          color: #c7d4dd;
          font-size: 11px;
          padding: 3px 4px;
          margin: 0 4px 0 0;
          white-space: nowrap;
          border-radius: 2px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .${Config.UI.BADGE_CLASS}::before {
          content: "";
          display: none;
        }

        .${Config.UI.BADGE_CLASS} .badge-text {
          display: inline;
          opacity: 1;
          width: auto;
        }
      `;
      Utils.injectStyle(Config.UI.STYLE_ID, cssText);
    }

    /**
     * 从元素提取应用ID
     * @param {HTMLElement} element - 搜索结果元素
     * @returns {number|null} 应用ID或null
     */
    extractAppId(element) {
      // 主要方式：从 data-ds-appid 属性
      let appId = element.getAttribute('data-ds-appid');
      if (appId && /^\d+$/.test(appId)) {
        return parseInt(appId);
      }

      // 备选方式：从链接href解析
      const link = element.querySelector('a');
      if (link) {
        const match = link.href.match(/\/app\/(\d+)/);
        if (match) {
          return parseInt(match[1]);
        }
      }

      return null;
    }

    /**
     * 创建徽章元素
     * @returns {HTMLElement} 徽章元素
     */
    createBadgeElement() {
      const badge = document.createElement('div');
      badge.className = Config.UI.BADGE_CLASS;
      badge.textContent = Config.UI.BADGE_TEXT;
      return badge;
    }

    /**
     * 为搜索结果元素注入徽章
     * @param {HTMLElement} resultElement - 搜索结果元素
     */
    injectBadge(resultElement) {
      // 避免重复处理
      if (this.processedElements.has(resultElement)) {
        return;
      }
      this.processedElements.add(resultElement);

      // 提取应用ID
      const appId = this.extractAppId(resultElement);
      if (!appId) {
        return;
      }

      // 检查游戏是否在家庭库中
      if (!this.libraryManager.cache || !this.libraryManager.isFamilyShared(appId, this.libraryManager.cache)) {
        return;
      }

      // 同时检查不是直接拥有的游戏（避免重复标记）
      if (this.libraryManager.isGameOwned(appId, this.libraryManager.cache)) {
        return;
      }

      // 查找标志容器 - 与"在库中"标志相同的位置
      // 通常在搜索结果行内有一个存放标志的地方
      let flagContainer = resultElement.querySelector('.ds_flagged');

      if (!flagContainer) {
        // 备选：查找任何 ds_flag 容器
        flagContainer = resultElement.querySelector('[class*="ds_flag"]')?.parentElement;
      }

      if (!flagContainer) {
        // 最后备选：在搜索结果行的开头（作为第一个子元素）
        // 找到搜索结果行的主容器
        const resultContent = resultElement.querySelector('.search_result_row_inner') ||
                             resultElement.querySelector('div[class*="search_result"]') ||
                             resultElement;
        flagContainer = resultContent;
      }

      if (!flagContainer) {
        Utils.log('⚠️ 无法找到标志容器');
        return;
      }

      // 检查是否已有徽章
      if (flagContainer.querySelector(`.${Config.UI.BADGE_CLASS}`)) {
        return;
      }

      // 创建并注入徽章
      const badge = this.createBadgeElement();

      // 在容器的开头插入徽章
      if (flagContainer.firstChild) {
        flagContainer.insertBefore(badge, flagContainer.firstChild);
      } else {
        flagContainer.appendChild(badge);
      }

      Utils.log(`✓ 已注入徽章到 appId: ${appId}`);
    }

    /**
     * 处理页面上的所有搜索结果
     */
    async processSearchResults() {
      try {
        // 确保样式已注入
        this.injectStyles();

        // 如果缓存中没有数据，则获取
        if (!this.libraryManager.cache) {
          await this.libraryManager.fetchLibraryData();
        }

        // 如果还是没有数据，则无法处理
        if (!this.libraryManager.cache) {
          Utils.warn('无法获取库数据，跳过家庭库标记处理');
          return;
        }

        // 调试：打印库数据结构
        const familyApps = this.libraryManager.cache.rgFamilyGroupApps || [];
        const ownedApps = this.libraryManager.cache.rgOwnedApps || [];

        if (familyApps.length === 0) {
          // 没有家庭库应用，不需要处理
          return;
        }

        // 查找所有搜索结果行
        const resultElements = document.querySelectorAll('.search_result_row');
        let markedCount = 0;

        resultElements.forEach((element) => {
          const appId = this.extractAppId(element);
          if (!appId) return;

          // 只处理家庭库应用
          if (familyApps.includes(appId)) {
            // 同时检查不是直接拥有的游戏
            if (!ownedApps.includes(appId)) {
              this.injectBadge(element);
              markedCount++;
              Utils.log(`✓ 标记游戏: ${appId}`);
            }
          }
        });

        if (markedCount > 0) {
          Utils.log(`✓ 共标记了 ${markedCount} 个家庭库游戏`);
        } else {
          Utils.log('搜索结果中没有找到家庭库游戏');
        }
      } catch (error) {
        Utils.warn('搜索结果处理出错', error);
      }
    }
  }

  return {
    SearchProcessor
  };
})();

window.SteamSirP = SteamSirP;
