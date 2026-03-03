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
        /* 为家庭库游戏的徽章添加展开/缩小动画效果 */
        .ds_owned_flag {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .search_result_row:hover .ds_owned_flag {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* 隐藏家庭库游戏的样式 */
        .search_result_row.hide-family-shared {
          display: none !important;
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
      // 使用 Steam 原生的 class
      badge.className = 'ds_flag ds_owned_flag';
      // 设置文本内容，与原生"在库中"样式保持一致
      badge.innerHTML = Config.UI.BADGE_TEXT + '&nbsp;&nbsp;';
      return badge;
    }

    /**
     * 注入过滤选项UI - 在client_filter中添加"隐藏家庭库中已有的项目"
     */
    injectFilterOption() {
      try {
        // 查找client_filter容器
        const clientFilterBlock = document.getElementById('client_filter');
        if (!clientFilterBlock) {
          Utils.log('⚠️ 未找到 client_filter 容器，跳过过滤选项注入');
          return;
        }

        // 检查是否已注入过滤选项
        if (document.querySelector('[data-value="hide_family_shared"]')) {
          return;
        }

        // 创建新的过滤选项行
        const filterRow = document.createElement('div');
        filterRow.className = 'tab_filter_control_row';
        filterRow.setAttribute('data-param', 'hide');
        filterRow.setAttribute('data-value', 'hide_family_shared');
        filterRow.setAttribute('data-loc', '隐藏家庭库中已有的项目');
        filterRow.setAttribute('data-clientside', '1');

        const filterControl = document.createElement('span');
        filterControl.className = 'tab_filter_control tab_filter_control_include';
        filterControl.setAttribute('data-panel', '{"focusable":true,"clickOnActivate":true}');
        filterControl.setAttribute('role', 'button');
        filterControl.setAttribute('data-param', 'hide');
        filterControl.setAttribute('data-value', 'hide_family_shared');
        filterControl.setAttribute('data-loc', '隐藏家庭库中已有的项目');
        filterControl.setAttribute('data-clientside', '1');
        filterControl.setAttribute('data-gpfocus', 'item');

        const labelContainer = document.createElement('span');
        labelContainer.className = 'tab_filter_label_container';

        const checkbox = document.createElement('span');
        checkbox.className = 'tab_filter_control_checkbox';

        const label = document.createElement('span');
        label.className = 'tab_filter_control_label';
        label.textContent = '隐藏家庭库中已有的项目';

        const count = document.createElement('span');
        count.className = 'tab_filter_control_count';
        count.style.display = 'none';

        labelContainer.appendChild(checkbox);
        labelContainer.appendChild(label);
        labelContainer.appendChild(count);
        filterControl.appendChild(labelContainer);
        filterRow.appendChild(filterControl);

        // 找到block_content并添加到其中
        const blockContent = clientFilterBlock.querySelector('.block_content_inner');
        if (blockContent) {
          blockContent.appendChild(filterRow);
          Utils.log('✓ 已注入家庭库过滤选项');

          // 添加事件监听
          filterControl.addEventListener('click', () => {
            this.toggleFamilySharedFilter(filterControl, filterRow);
          });
        }
      } catch (error) {
        Utils.warn('注入过滤选项出错', error);
      }
    }

    /**
     * 切换家庭库过滤
     * @param {HTMLElement} filterControl - 过滤控制元素（span）
     * @param {HTMLElement} filterRow - 过滤行元素（div）
     */
    toggleFamilySharedFilter(filterControl, filterRow) {
      const isChecked = filterControl.classList.contains('checked');
      const familySharedElements = document.querySelectorAll('.search_result_row.steamsr-family-shared');

      if (!isChecked) {
        // 激活过滤 - 在两个元素上添加checked类并隐藏家庭库游戏
        filterControl.classList.add('checked');
        filterRow.classList.add('checked');
        this.applyFamilySharedFilter(true);
        Utils.log(`✓ 已启用: 隐藏家庭库中已有的项目 (共 ${familySharedElements.length} 个)`);
      } else {
        // 停用过滤 - 在两个元素上移除checked类并显示所有游戏
        filterControl.classList.remove('checked');
        filterRow.classList.remove('checked');
        this.applyFamilySharedFilter(false);
        Utils.log(`✓ 已禁用: 隐藏家庭库中已有的项目`);
      }

      // 保存过滤状态到Chrome存储
      chrome.storage.sync.set({
        hideFamily_shared: !isChecked
      });
    }

    /**
     * 应用家庭库过滤
     * @param {boolean} hide - 是否隐藏
     */
    applyFamilySharedFilter(hide) {
      const resultElements = document.querySelectorAll('.search_result_row.steamsr-family-shared');
      const hiddenAppIds = [];

      resultElements.forEach((element) => {
        if (hide) {
          element.classList.add('hide-family-shared');
          const appId = this.extractAppId(element);
          if (appId) {
            hiddenAppIds.push(appId);
          }
        } else {
          element.classList.remove('hide-family-shared');
        }
      });

      if (hide && hiddenAppIds.length > 0) {
        Utils.log(`🙈 已隐藏 ${hiddenAppIds.length} 个家庭库游戏`);
        Utils.log(`🙈 隐藏的游戏 ID (前20): ${hiddenAppIds.slice(0, 20).join(', ')}`);
      } else if (!hide) {
        Utils.log('👁️ 显示所有游戏');
      }
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
      if (flagContainer.querySelector('.ds_owned_flag')) {
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

      // 给搜索结果行添加 ds_flagged class，不添加 ds_owned 以避免被原生过滤隐藏
      resultElement.classList.add('ds_flagged');

      // 添加独立标记用于过滤家庭库游戏
      resultElement.classList.add('steamsr-family-shared');
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
        const markedAppIds = [];
        const skippedAppIds = [];

        resultElements.forEach((element) => {
          const appId = this.extractAppId(element);
          if (!appId) return;

          // 只处理家庭库应用
          if (familyApps.includes(appId)) {
            // 同时检查不是直接拥有的游戏
            if (!ownedApps.includes(appId)) {
              this.injectBadge(element);
              markedCount++;
              markedAppIds.push(appId);
              Utils.log(`✓ 标记游戏: ${appId}`);
            } else {
              skippedAppIds.push(appId);
              Utils.log(`⊘ 跳过 (已拥有): ${appId}`);
            }
          }
        });

        if (markedCount > 0) {
          Utils.log(`✓ 共标记了 ${markedCount} 个家庭库游戏`);
          Utils.log(`📌 标记的游戏 ID: ${markedAppIds.slice(0, 20).join(', ')}`);
        } else {
          Utils.log('搜索结果中没有找到家庭库游戏');
        }

        if (skippedAppIds.length > 0) {
          Utils.log(`⊘ 已拥有，未标记的游戏 ID (前20): ${skippedAppIds.slice(0, 20).join(', ')}`);
        }

        // 注入过滤选项
        this.injectFilterOption();

        // 恢复用户保存的过滤状态
        chrome.storage.sync.get(['hideFamily_shared'], (result) => {
          if (result.hideFamily_shared === true) {
            const filterRow = document.querySelector('[data-value="hide_family_shared"]');
            const filterControl = filterRow?.querySelector('.tab_filter_control');
            if (filterControl && filterRow) {
              filterControl.classList.add('checked');
              filterRow.classList.add('checked');
              const familySharedCount = document.querySelectorAll('.search_result_row.steamsr-family-shared').length;
              this.applyFamilySharedFilter(true);
              Utils.log(`✓ 已恢复过滤状态: 隐藏家庭库中已有的项目 (共 ${familySharedCount} 个)`);
            }
          }
        });
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
