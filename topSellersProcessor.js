/**
 * 热销商品处理模块 - 在Steam首页热销商品中标记和过滤家庭库游戏
 */
window.SteamSirP = window.SteamSirP || {};

SteamSirP.TopSellersProcessor = (() => {
  const Config = window.SteamSirP.Config;
  const Utils = window.SteamSirP.Utils;
  const LibraryManagerClass = window.SteamSirP.LibraryManager.LibraryManager;

  /**
   * TopSellersProcessor 类
   */
  class TopSellersProcessor {
    constructor() {
      this.libraryManager = new LibraryManagerClass();
      this.contentObserver = null;
    }

    /**
     * 注入CSS样式
     */
    injectStyles() {
      const cssText = `
        /* 禁用家庭库游戏的模糊/灰显效果，保持原始外观 */
        .steamsr-topsellers-family-shared {
          filter: none !important;
          opacity: 1 !important;
        }

        .steamsr-topsellers-family-shared img {
          filter: none !important;
          opacity: 1 !important;
        }

        /* 隐藏家庭库游戏 */
        .steamsr-topsellers-family-shared.hide-family-shared {
          display: none !important;
        }
      `;
      Utils.injectStyle('steamsr-topsellers-style', cssText);
    }

    /**
     * 从元素提取应用ID
     * @param {HTMLElement} element - 热销商品元素
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
     * 为元素添加家庭库标记
     * @param {HTMLElement} element - 热销商品元素
     */
    markFamilyShared(element) {
      // 检查是否已标记
      if (element.classList.contains('steamsr-topsellers-family-shared')) {
        return;
      }

      element.classList.add('steamsr-topsellers-family-shared');
      element.classList.add('ds_flagged');

      // 检查是否已有徽章
      if (element.querySelector('.ds_owned_flag')) {
        return;
      }

      // 创建徽章
      const badge = document.createElement('div');
      badge.className = 'ds_flag ds_owned_flag';
      badge.innerHTML = '在家庭库中&nbsp;&nbsp;';

      // 查找标志容器位置
      let flagContainer = element.querySelector('.tab_item_cap') || element;

      // 如果是 tab_item_cap，在 cap 之后添加徽章
      if (flagContainer.classList.contains('tab_item_cap')) {
        flagContainer.parentElement.insertBefore(badge, flagContainer.nextSibling);
      } else {
        // 否则在开始位置添加
        if (flagContainer.firstChild) {
          flagContainer.insertBefore(badge, flagContainer.firstChild);
        } else {
          flagContainer.appendChild(badge);
        }
      }
    }

    /**
     * 注入复选框到热销商品控制面板
     */
    injectFamilySharedCheckbox() {
      try {
        // 查找热销商品控制面板
        const topsellersControls = document.getElementById('topsellers_controls');
        if (!topsellersControls) {
          Utils.log('⚠️ 未找到热销商品控制面板，跳过复选框注入');
          return;
        }

        // 检查是否已注入
        if (document.querySelector('[id="top_sellers_family_shared_check"]')) {
          return;
        }

        // 创建新的控制行
        const newControl = document.createElement('div');
        newControl.className = 'tab_control tab_check_control';

        const label = document.createElement('label');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'top_sellers_family_shared_check';

        const labelText = document.createElement('span');
        labelText.textContent = '隐藏家庭库中的项目';

        label.appendChild(checkbox);
        label.appendChild(labelText);
        newControl.appendChild(label);

        // 查找 top_sellers_info 元素，在其之前插入新复选框
        const infoElement = topsellersControls.querySelector('.top_sellers_info');
        if (infoElement) {
          topsellersControls.insertBefore(newControl, infoElement);
        } else {
          // 备选：直接添加到末尾
          topsellersControls.appendChild(newControl);
        }

        Utils.log('✓ 已注入家庭库复选框到热销商品');

        // 添加事件监听
        checkbox.addEventListener('change', () => {
          this.handleCheckboxChange(checkbox);
        });
      } catch (error) {
        Utils.warn('注入复选框出错', error);
      }
    }

    /**
     * 处理复选框变化
     * @param {HTMLInputElement} checkbox - 复选框元素
     */
    handleCheckboxChange(checkbox) {
      const hide = checkbox.checked;
      this.applyFilter(hide);

      // 保存状态
      chrome.storage.sync.set({
        topsellers_hide_family: hide
      });

      if (hide) {
        Utils.log('✓ 已启用: 隐藏家庭库中的项目');
      } else {
        Utils.log('✓ 已禁用: 隐藏家庭库中的项目');
      }
    }

    /**
     * 应用过滤
     * @param {boolean} hide - 是否隐藏
     */
    applyFilter(hide) {
      const topSellerItems = document.querySelectorAll('#tab_topsellers_content .tab_item');

      topSellerItems.forEach((item) => {
        const isFamilyShared = item.classList.contains('steamsr-topsellers-family-shared');

        if (isFamilyShared) {
          if (hide) {
            item.classList.add('hide-family-shared');
          } else {
            item.classList.remove('hide-family-shared');
          }
        }
      });

      if (hide) {
        Utils.log('🙈 已隐藏家庭库游戏');
      } else {
        Utils.log('👁️ 已显示所有游戏');
      }
    }

    /**
     * 标记已有的热销商品
     */
    markExistingTopSellers() {
      try {
        const familyApps = this.libraryManager.cache.rgFamilyGroupApps || [];
        const ownedApps = this.libraryManager.cache.rgOwnedApps || [];

        if (familyApps.length === 0) {
          Utils.log('家庭库中没有游戏，跳过标记');
          return;
        }

        const topSellerContent = document.getElementById('tab_topsellers_content');
        if (!topSellerContent) {
          Utils.log('⚠️ 未找到热销商品内容容器');
          return;
        }

        const topSellerItems = topSellerContent.querySelectorAll('.tab_item');
        let markedCount = 0;
        const markedAppIds = [];

        topSellerItems.forEach((item) => {
          const appId = this.extractAppId(item);
          if (!appId) return;

          // 检查是否在家庭库中且不是直接拥有
          if (familyApps.includes(appId) && !ownedApps.includes(appId)) {
            this.markFamilyShared(item);
            markedCount++;
            markedAppIds.push(appId);
          }
        });

        if (markedCount > 0) {
          Utils.log(`✓ 共标记了 ${markedCount} 个热销商品中的家庭库游戏`);
          Utils.log(`📌 标记的游戏 ID: ${markedAppIds.slice(0, 10).join(', ')}`);
        } else {
          Utils.log('热销商品中没有找到家庭库游戏');
        }
      } catch (error) {
        Utils.warn('标记热销商品出错', error);
      }
    }

    /**
     * 设置 MutationObserver 来监听新加载的内容
     */
    setupContentObserver() {
      const topSellerContent = document.getElementById('tab_topsellers_content');
      if (!topSellerContent) {
        return;
      }

      if (this.contentObserver) {
        this.contentObserver.disconnect();
      }

      this.contentObserver = new MutationObserver((mutations) => {
        // 检查是否有新的 tab_item 被添加
        let hasNewItems = false;
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.classList && node.classList.contains('tab_item')) {
                  hasNewItems = true;
                }
              }
            });
          }
        });

        if (hasNewItems) {
          // 延迟处理，确保 DOM 已完全更新
          setTimeout(() => {
            this.markExistingTopSellers();
            // 应用当前的过滤状态
            const checkbox = document.getElementById('top_sellers_family_shared_check');
            if (checkbox) {
              this.applyFilter(checkbox.checked);
            }
            Utils.log('✓ 已处理新加载的热销商品');
          }, 100);
        }
      });

      this.contentObserver.observe(topSellerContent, {
        childList: true,
        subtree: true,
        characterData: false
      });

      Utils.log('✓ 已设置热销商品内容观察器');
    }

    /**
     * 处理热销商品
     */
    async processTopSellers() {
      try {
        Utils.log('开始处理热销商品...');

        // 注入样式
        this.injectStyles();

        // 注入复选框
        this.injectFamilySharedCheckbox();

        // 如果缓存中没有数据，则获取
        if (!this.libraryManager.cache) {
          await this.libraryManager.fetchLibraryData();
        }

        // 如果还是没有数据，则无法处理
        if (!this.libraryManager.cache) {
          Utils.warn('无法获取库数据，跳过热销商品处理');
          return;
        }

        // 标记现有的热销商品
        this.markExistingTopSellers();

        // 设置 MutationObserver 来监听新加载的内容
        this.setupContentObserver();

        // 恢复保存的状态
        chrome.storage.sync.get(['topsellers_hide_family'], (result) => {
          const checkbox = document.getElementById('top_sellers_family_shared_check');
          if (checkbox) {
            checkbox.checked = result.topsellers_hide_family === true;
            // 应用当前的过滤状态
            this.applyFilter(result.topsellers_hide_family === true);
          }
        });
      } catch (error) {
        Utils.warn('热销商品处理出错', error);
      }
    }
  }

  return {
    TopSellersProcessor
  };
})();

window.SteamSirP = SteamSirP;
