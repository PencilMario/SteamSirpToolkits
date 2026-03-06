/**
 * 应用页面处理模块 - 在Steam应用页面禁用家庭库游戏的购买按钮
 */
window.SteamSirP = window.SteamSirP || {};

SteamSirP.AppPageProcessor = (() => {
  const Config = window.SteamSirP.Config;
  const Utils = window.SteamSirP.Utils;
  const LibraryManagerClass = window.SteamSirP.LibraryManager.LibraryManager;

  /**
   * AppPageProcessor 类
   */
  class AppPageProcessor {
    constructor() {
      this.libraryManager = new LibraryManagerClass();
      this.appId = null;
      this.originalAddToCartHref = null; // 保存原始的购物车 href
    }

    /**
     * 从URL提取应用ID
     * @returns {number|null} 应用ID或null
     */
    extractAppIdFromUrl() {
      const match = window.location.href.match(/\/app\/(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
      return null;
    }

    /**
     * 注入CSS样式
     */
    injectStyles() {
      const cssText = `
        /* 购买按钮禁用样式 */
        .game_area_purchase_game_wrapper .game_purchase_action .btn_green_steamui.steamsr-disabled {
          pointer-events: none !important;
          opacity: 0.5 !important;
          filter: grayscale(1) !important;
          cursor: not-allowed !important;
        }

        /* 家庭库横幅修改 */
        .game_purchase_area_owned_by_family .family_info a {
          color: #4a90e2;
          text-decoration: underline;
          cursor: pointer;
          font-weight: 500;
        }

        .game_purchase_area_owned_by_family .family_info a:hover {
          color: #357abd;
        }
      `;
      Utils.injectStyle('steamsr-app-page-style', cssText);
    }

    /**
     * 禁用购买按钮
     */
    disablePurchaseButtons() {
      try {
        // 查找购买横幅容器
        const purchaseWrapper = document.querySelector('.game_area_purchase_game_wrapper');
        if (!purchaseWrapper) {
          Utils.log('⚠️ 未找到购买横幅容器 (.game_area_purchase_game_wrapper)');
          return;
        }

        // 查找购买操作区域
        const purchaseAction = purchaseWrapper.querySelector('.game_purchase_action');
        if (!purchaseAction) {
          Utils.log('⚠️ 未找到购买操作区域 (.game_purchase_action)');
          return;
        }

        // 查找"添加至购物车"按钮
        const addToCartBtn = purchaseAction.querySelector('a[class*="btn_green"]');
        if (!addToCartBtn) {
          Utils.log('⚠️ 未找到"添加至购物车"按钮');
          return;
        }

        // 保存原始的 href（例如: javascript:addToCart(1424518);）
        this.originalAddToCartHref = addToCartBtn.href;
        Utils.log(`✓ 保存购物车 href: ${this.originalAddToCartHref}`);

        // 禁用按钮 - 移除原始事件处理，使用自定义处理
        addToCartBtn.classList.add('steamsr-disabled');
        addToCartBtn.style.opacity = '0.5';
        addToCartBtn.style.cursor = 'not-allowed';
        addToCartBtn.style.filter = 'grayscale(1)';

        // 替换 href 为空，添加点击拦截
        addToCartBtn.href = 'javascript:void(0);';
        addToCartBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        };

        // 使用 CSS 禁用指针事件
        addToCartBtn.style.pointerEvents = 'none';

        Utils.log(`✓ 已禁用购买按钮`);
      } catch (error) {
        Utils.warn('禁用购买按钮出错', error);
      }
    }

    /**
     * 修改家庭库提示横幅
     */
    modifyFamilyLibraryBanner() {
      try {
        const familyBanner = document.querySelector('.game_purchase_area_owned_by_family');
        if (!familyBanner) {
          Utils.log('⚠️ 未找到家庭库提示横幅');
          return;
        }

        // 查找 family_info div
        const familyInfo = familyBanner.querySelector('.family_info');
        if (!familyInfo) {
          Utils.log('⚠️ 未找到 family_info 元素');
          return;
        }

        // 使用原始的 addToCart href
        const cartHref = this.originalAddToCartHref || 'javascript:void(0);';

        // 替换内容为我们的提示，链接使用原始的 addToCart href
        familyInfo.innerHTML = `
          <p>❌ 此游戏已在家庭库中，无法购买。<a href="${cartHref}">点击此处</a>可将其添加至购物车。</p>
        `;

        Utils.log('✓ 已修改家庭库提示横幅');
      } catch (error) {
        Utils.warn('修改家庭库提示横幅出错', error);
      }
    }

    /**
     * 检查游戏并处理
     */
    async processAppPage() {
      try {
        // 检查功能是否启用
        const settings = await this.getSettings();
        if (!settings.disableFamilyLibraryPurchase) {
          Utils.log('ℹ️ 家庭库购买按钮禁用功能已关闭');
          return;
        }

        // 提取应用ID
        this.appId = this.extractAppIdFromUrl();
        if (!this.appId) {
          Utils.log('⚠️ 无法从URL提取应用ID');
          return;
        }

        Utils.log(`检测到应用页面，AppID: ${this.appId}`);

        // 注入样式
        this.injectStyles();

        // 获取库数据
        if (!this.libraryManager.cache) {
          await this.libraryManager.fetchLibraryData();
        }

        if (!this.libraryManager.cache) {
          Utils.warn('无法获取库数据，跳过应用页面处理');
          return;
        }

        // 检查游戏是否在家庭库中（但不是直接拥有）
        const isFamilyShared = this.libraryManager.isFamilyShared(this.appId, this.libraryManager.cache);
        const isOwned = this.libraryManager.isGameOwned(this.appId, this.libraryManager.cache);

        if (isFamilyShared && !isOwned) {
          Utils.log(`✓ 游戏在家庭库中，禁用购买按钮 (AppID: ${this.appId})`);
          this.disablePurchaseButtons();
          this.modifyFamilyLibraryBanner();
        } else if (isOwned) {
          Utils.log(`✓ 游戏已拥有，不需要处理 (AppID: ${this.appId})`);
        } else {
          Utils.log(`ℹ️ 游戏不在家庭库中，无需处理 (AppID: ${this.appId})`);
        }
      } catch (error) {
        Utils.warn('应用页面处理出错', error);
      }
    }

    /**
     * 从 Chrome 存储中获取设置
     */
    getSettings() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(['disableFamilyLibraryPurchase'], (result) => {
          resolve({
            disableFamilyLibraryPurchase: result.disableFamilyLibraryPurchase ?? true
          });
        });
      });
    }
  }

  return {
    AppPageProcessor
  };
})();

// 为了在 onclick 中能访问，创建全局实例
window.SteamSirP.AppPageProcessorInstance = null;

window.SteamSirP = SteamSirP;
