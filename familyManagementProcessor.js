/**
 * 家庭管理页面处理器 - 显示每个成员的游戏数量
 */
window.SteamSirP = window.SteamSirP || {};

SteamSirP.FamilyManagementProcessor = (() => {
  const Utils = window.SteamSirP.Utils;
  const LibraryManagerClass = window.SteamSirP.LibraryManager.LibraryManager;

  /**
   * FamilyManagementProcessor 类
   */
  class FamilyManagementProcessor {
    constructor() {
      this.libraryManager = new LibraryManagerClass();
      this.processedMembers = new Set();
      this.familyGroupId = null;
      this.webApiToken = null;
    }

    /**
     * 获取 webapi token
     */
    async getWebApiToken() {
      if (this.webApiToken) {
        return this.webApiToken;
      }
      this.webApiToken = await this.libraryManager.getWebApiToken();
      return this.webApiToken;
    }

    /**
     * 获取家庭组ID
     */
    async getFamilyGroupId() {
      if (this.familyGroupId) {
        return this.familyGroupId;
      }
      const token = await this.getWebApiToken();
      if (!token) {
        Utils.warn('无法获取 webapi token');
        return null;
      }
      this.familyGroupId = await this.libraryManager.getFamilyGroupId(token);
      return this.familyGroupId;
    }

    /**
     * 从头像URL提取Steam ID
     */
    extractSteamIdFromAvatar(avatarUrl) {
      // 头像URL格式: https://avatars.fastly.steamstatic.com/{hash}_full.jpg
      // 我们需要通过其他方式获取Steam ID
      return null;
    }

    /**
     * 获取家庭组成员信息
     */
    async getFamilyMembers() {
      try {
        const token = await this.getWebApiToken();
        const familyGroupId = await this.getFamilyGroupId();

        if (!token || !familyGroupId) {
          Utils.warn('无法获取必要的认证信息');
          return null;
        }

        Utils.log('正在获取家庭组成员信息...');

        const params = new URLSearchParams({
          access_token: token,
          family_groupid: familyGroupId
        });

        const url = `https://api.steampowered.com/IFamilyGroupsService/GetFamilyGroup/v1/?${params}`;

        Utils.log(`请求URL: ${url.replace(token, 'TOKEN')}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          Utils.warn(`获取家庭组成员失败: ${response.status}`);
          const text = await response.text();
          Utils.warn(`响应内容: ${text.substring(0, 200)}`);
          return null;
        }

        const data = await response.json();
        Utils.log('GetFamilyGroup响应:', data);

        if (data.response && data.response.members) {
          Utils.log(`✓ 获取到 ${data.response.members.length} 个家庭成员`);
          return data.response.members;
        }

        Utils.warn('响应中没有成员信息');
        return null;
      } catch (error) {
        Utils.warn('获取家庭组成员失败', error);
        return null;
      }
    }

    /**
     * 获取Steam API Key
     */
    async getSteamApiKey() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(['steamApiKey'], (result) => {
          resolve(result.steamApiKey || null);
        });
      });
    }

    /**
     * 获取成员拥有的游戏数量
     */
    async getMemberGameCount(steamId) {
      try {
        // 优先使用用户设置的API Key
        let apiKey = await this.getSteamApiKey();

        // 如果没有设置API Key，尝试使用webapi token
        if (!apiKey) {
          Utils.log('未设置Steam API Key，尝试使用webapi token...');
          apiKey = await this.getWebApiToken();
        }

        if (!apiKey) {
          Utils.warn('缺少API Key，请在设置页面配置');
          return null;
        }

        Utils.log(`正在获取成员 ${steamId} 的游戏数量...`);

        // 使用 IPlayerService/GetOwnedGames
        const params = new URLSearchParams({
          key: apiKey,
          steamid: steamId,
          include_appinfo: 0,
          include_played_free_games: 1
        });

        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`;

        Utils.log(`请求URL: ${url.replace(apiKey, 'KEY')}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        Utils.log(`响应状态: ${response.status}`);

        if (!response.ok) {
          Utils.warn(`获取成员游戏数量失败: ${response.status}`);
          const text = await response.text();
          Utils.warn(`响应内容: ${text.substring(0, 200)}`);
          return null;
        }

        const data = await response.json();
        Utils.log(`GetOwnedGames响应:`, data);

        if (data.response && typeof data.response.game_count === 'number') {
          const gameCount = data.response.game_count;
          Utils.log(`✓ 成员 ${steamId} 拥有 ${gameCount} 个游戏`);
          return gameCount;
        }

        Utils.warn('响应格式不正确或没有游戏数据');
        return 0;
      } catch (error) {
        Utils.warn(`获取成员 ${steamId} 游戏数量失败`, error);
        return null;
      }
    }

    /**
     * 在成员卡片上显示游戏数量
     */
    async displayGameCount(memberElement, steamId, gameCount) {
      // 检查是否已经添加过
      if (memberElement.querySelector('.steamsr-game-count')) {
        return;
      }

      // 找到成员信息容器
      const infoContainer = memberElement.querySelector('._20bk3gw7mQb1rm93YkO757');
      if (!infoContainer) {
        Utils.warn('未找到成员信息容器');
        return;
      }

      // 创建游戏数量显示元素
      const gameCountElement = document.createElement('div');
      gameCountElement.className = 'steamsr-game-count';
      gameCountElement.style.cssText = `
        margin-top: 8px;
        padding: 4px 8px;
        background: rgba(0, 132, 255, 0.1);
        border: 1px solid rgba(0, 132, 255, 0.3);
        border-radius: 4px;
        font-size: 12px;
        color: #66c0f4;
        text-align: center;
      `;

      if (gameCount === null) {
        gameCountElement.textContent = `🎮 获取中...`;
      } else if (gameCount === -1) {
        gameCountElement.textContent = `🎮 获取失败`;
        gameCountElement.style.color = '#ff6b6b';
      } else {
        gameCountElement.textContent = `🎮 拥有游戏: ${gameCount}`;
      }

      infoContainer.appendChild(gameCountElement);
    }

    /**
     * 处理家庭管理页面
     */
    async processFamilyManagement() {
      try {
        Utils.log('开始处理家庭管理页面...');

        // 获取所有家庭成员元素
        const memberElements = document.querySelectorAll('._2LyGIHuQ8SFKb5T262YUvg.TTgPUDgZKRwRLHs0om_Jn');

        if (memberElements.length === 0) {
          Utils.log('未找到家庭成员元素');
          return;
        }

        Utils.log(`找到 ${memberElements.length} 个家庭成员元素`);

        // 获取家庭组成员信息
        const members = await this.getFamilyMembers();

        if (!members || members.length === 0) {
          Utils.warn('无法获取家庭组成员信息');
          // 即使无法获取成员信息，也显示错误状态
          for (const memberElement of memberElements) {
            if (!memberElement.getAttribute('data-steamsr-processed')) {
              memberElement.setAttribute('data-steamsr-processed', 'true');
              await this.displayGameCount(memberElement, null, -1);
            }
          }
          return;
        }

        // 为每个成员显示游戏数量
        for (let i = 0; i < memberElements.length && i < members.length; i++) {
          const memberElement = memberElements[i];
          const member = members[i];

          // 检查是否已处理
          const elementId = memberElement.getAttribute('data-steamsr-processed');
          if (elementId) {
            continue;
          }

          // 标记为已处理
          memberElement.setAttribute('data-steamsr-processed', 'true');

          const steamId = member.steamid;

          // 先显示加载状态
          await this.displayGameCount(memberElement, steamId, null);

          // 异步获取游戏数量，设置超时
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(-1), 10000); // 10秒超时
          });

          const gameCountPromise = this.getMemberGameCount(steamId);

          Promise.race([gameCountPromise, timeoutPromise]).then(gameCount => {
            // 更新显示
            const gameCountElement = memberElement.querySelector('.steamsr-game-count');
            if (gameCountElement) {
              if (gameCount === null || gameCount === -1) {
                gameCountElement.textContent = `🎮 获取失败`;
                gameCountElement.style.color = '#ff6b6b';
              } else {
                gameCountElement.textContent = `🎮 拥有游戏: ${gameCount}`;
                gameCountElement.style.color = '#66c0f4';
              }
            }
          });
        }

        Utils.log('家庭管理页面处理完成');
      } catch (error) {
        Utils.warn('处理家庭管理页面时出错', error);
      }
    }
  }

  return {
    FamilyManagementProcessor
  };
})();

window.SteamSirP = SteamSirP;
