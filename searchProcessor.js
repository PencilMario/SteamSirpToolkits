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
          position: absolute;
          top: 50%;
          left: 0;
          transform: translateY(-70%);
          background: rgb(79, 149, 189);
          color: #000;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          border-radius: 2px;
          font-size: 10px;
          font-weight: 400;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 1px 1px;
          min-width: 14px;
          height: 14px;
          justify-content: center;
          cursor: default;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
          white-space: nowrap;
          z-index: 10;
        }

        .${Config.UI.BADGE_CLASS}::before {
          content: "☑︎";
          font-size: 9px;
          flex-shrink: 0;
          display: inline-block;
        }

        .${Config.UI.BADGE_CLASS} .badge-text {
          opacity: 0;
          width: 0;
          transition: opacity 0.3s ease, width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .search_result_row:hover .${Config.UI.BADGE_CLASS},
        .${Config.UI.BADGE_CLASS}:hover {
          padding: 1px 4px;
          min-width: auto;
        }

        .search_result_row:hover .${Config.UI.BADGE_CLASS} .badge-text,
        .${Config.UI.BADGE_CLASS}:hover .badge-text {
          opacity: 1;
          width: auto;
        }

        .search_result_row .search_result_img {
          position: relative;
          overflow: visible;
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
      const badge = document.createElement('span');
      badge.className = Config.UI.BADGE_CLASS;

      const textSpan = document.createElement('span');
      textSpan.className = 'badge-text';
      textSpan.textContent = Config.UI.BADGE_TEXT;

      badge.appendChild(textSpan);
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

      // 查找图片容器 - 徽章应该贴在图片上
      let imageContainer = resultElement.querySelector('.search_result_img');

      if (!imageContainer) {
        // 备选：查找任何包含图片的容器
        imageContainer = resultElement.querySelector('img')?.parentElement;
      }

      if (!imageContainer) {
        // 最后的备选：用第一个 div 容器
        imageContainer = resultElement.querySelector('div');
      }

      if (!imageContainer) {
        Utils.log('⚠️ 无法找到图片容器');
        return;
      }

      // 确保容器支持相对定位
      if (window.getComputedStyle(imageContainer).position === 'static') {
        imageContainer.style.position = 'relative';
      }

      // 检查是否已有徽章
      if (imageContainer.querySelector(`.${Config.UI.BADGE_CLASS}`)) {
        return;
      }

      // 创建并注入徽章
      const badge = this.createBadgeElement();
      imageContainer.appendChild(badge);
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
