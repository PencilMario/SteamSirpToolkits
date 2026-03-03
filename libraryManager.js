/**
 * 库管理模块 - 管理Steam库数据和缓存
 */
window.SteamSirP = window.SteamSirP || {};

SteamSirP.LibraryManager = (() => {
  const Config = window.SteamSirP.Config;
  const Utils = window.SteamSirP.Utils;

  /**
   * LibraryManager 类
   */
  class LibraryManager {
    constructor() {
      this.cache = null;
      this.cacheTime = null;
      this.accessToken = null;
    }

    /**
     * 获取 cookies
     */
    getCookies() {
      const cookies = {
        sessionid: null,
        steamLoginSecure: null
      };

      // 从 document.cookie 解析
      const cookieArray = document.cookie.split(';');
      for (const cookie of cookieArray) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'sessionid') {
          cookies.sessionid = value;
        }
        if (name === 'steamLoginSecure') {
          cookies.steamLoginSecure = value;
        }
      }

      return cookies;
    }

    /**
     * 获取库数据（含缓存）
     */
    async fetchLibraryData() {
      // 检查缓存是否仍然有效
      if (this.cache && this.cacheTime && (Date.now() - this.cacheTime) < Config.CACHE_TTL) {
        return this.cache;
      }

      try {
        Utils.log('正在获取库数据...');

        // 获取自有应用
        const ownedApps = await this.fetchOwnedApps();

        // 尝试使用动态获取的 webapi token 获取家庭库应用
        const familyApps = await this.fetchFamilyLibraryWithWebApiToken();

        // 合并数据
        const data = {
          rgOwnedApps: ownedApps || [],
          rgFamilyGroupApps: familyApps || []
        };

        this.cache = data;
        this.cacheTime = Date.now();
        Utils.log('库数据获取成功');
        Utils.log(`自有应用: ${data.rgOwnedApps.length}，家庭库应用: ${data.rgFamilyGroupApps.length}`);
        return data;
      } catch (error) {
        Utils.warn('库数据获取错误', error);
        return null;
      }
    }

    /**
     * 获取 webapi token
     */
    async getWebApiToken() {
      try {
        Utils.log('正在获取 webapi token...');

        const response = await fetch(
          'https://store.steampowered.com/pointssummary/ajaxgetasyncconfig',
          {
            credentials: 'include'
          }
        );

        if (!response.ok) {
          Utils.warn(`获取 token 失败: ${response.status}`);
          return null;
        }

        const data = await response.json();

        // 响应格式: { success: 1, data: { webapi_token: "..." } }
        if (data.success && data.data && data.data.webapi_token) {
          Utils.log('✓ 成功获取 webapi token');
          return data.data.webapi_token;
        } else {
          Utils.warn('响应格式不正确或没有 webapi_token');
          return null;
        }
      } catch (error) {
        Utils.warn('获取 webapi token 失败', error);
        return null;
      }
    }

    /**
     * 获取用户的 family_groupid
     */
    async getFamilyGroupId(token) {
      try {
        Utils.log('正在获取 family_groupid...');

        const params = new URLSearchParams({
          access_token: token
          // 不指定 steamid，则获取当前认证用户的 family group
        });

        const url = `https://api.steampowered.com/IFamilyGroupsService/GetFamilyGroupForUser/v1?${params}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          Utils.warn(`获取 family_groupid 失败: ${response.status}`);
          return null;
        }

        const data = await response.json();

        if (data.response && data.response.family_groupid) {
          Utils.log(`✓ 成功获取 family_groupid: ${data.response.family_groupid}`);
          return data.response.family_groupid;
        } else {
          Utils.warn('响应中没有 family_groupid');
          return null;
        }
      } catch (error) {
        Utils.warn('获取 family_groupid 失败', error);
        return null;
      }
    }

    /**
     * 使用 webapi token 调用家庭库 API
     */
    async fetchFamilyLibraryWithWebApiToken() {
      try {
        // 先获取 webapi token
        const token = await this.getWebApiToken();

        if (!token) {
          Utils.warn('无法获取 webapi token，无法调用家庭库 API');
          return null;
        }

        // 再获取 family_groupid
        const familyGroupId = await this.getFamilyGroupId(token);

        if (!familyGroupId) {
          Utils.warn('无法获取 family_groupid，无法调用家庭库 API');
          return null;
        }

        Utils.log('使用 webapi token 调用家庭库 API...');

        // 构建请求参数
        const params = new URLSearchParams({
          access_token: token,
          family_groupid: familyGroupId,
          include_own: 0,
          include_excluded: 0,
          include_free: 1
        });

        // 调用 IFamilyGroupsService/GetSharedLibraryApps
        const url = `https://api.steampowered.com/IFamilyGroupsService/GetSharedLibraryApps/v1?${params}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          Utils.warn(`家庭库 API 调用失败: ${response.status}`);
          return null;
        }

        const data = await response.json();

        // 解析响应
        let appIds = [];
        if (data.response && data.response.apps && Array.isArray(data.response.apps)) {
          appIds = data.response.apps
            .map(app => app.appid)
            .filter(id => typeof id === 'number' && id > 0);

          if (appIds.length > 0) {
            Utils.log(`✓ 从家庭库 API 获取到 ${appIds.length} 个应用: ${appIds.slice(0, 5).join(', ')}`);
            return appIds;
          }
        }

        Utils.warn('家庭库 API 返回结果为空');
        return null;
      } catch (error) {
        Utils.warn('家庭库 API 调用失败', error);
        return null;
      }
    }

    /**
     * 从库页面获取所有应用（包括自有和家庭库）
     */
    async fetchAllAppsFromLibraryPage() {
      try {
        Utils.log('尝试从库页面获取所有应用...');

        // 尝试多个可能的库页面 URL
        const urls = [
          'https://steamcommunity.com/my/games/?tab=all',
          'https://steamcommunity.com/gamerprofile/_/allgames',
          'https://steamcommunity.com/games/?tab=all'
        ];

        for (const libraryUrl of urls) {
          try {
            const response = await fetch(libraryUrl, {
              credentials: 'include',
              timeout: 10000
            });

            if (response.ok) {
              const html = await response.text();

              // 从 HTML 中提取应用数据 - 查找 var rgGames = [...]
              const gamesMatch = html.match(/var\s+rgGames\s*=\s*(\[[\s\S]*?\]);/);
              if (gamesMatch) {
                try {
                  const games = JSON.parse(gamesMatch[1]);
                  const appIds = games.map(game => game.appid).filter(id => typeof id === 'number' && id > 0);
                  if (appIds.length > 0) {
                    Utils.log(`✓ 从库页面获取到 ${appIds.length} 个应用`);
                    return appIds;
                  }
                } catch (e) {
                  Utils.warn(`解析 ${libraryUrl} 应用数据失败`);
                  continue;
                }
              }
            }
          } catch (e) {
            Utils.warn(`获取 ${libraryUrl} 失败`);
            continue;
          }
        }

        Utils.warn('未能从任何库页面获取应用列表');
        return null;
      } catch (error) {
        Utils.warn('库页面获取失败', error);
        return null;
      }
    }

    /**
     * 获取用户自有应用
     */
    async fetchOwnedApps() {
      try {
        const response = await fetch(Config.API.USERDATA, {
          credentials: 'include',
          timeout: 5000
        });

        if (!response.ok) {
          Utils.warn(`自有应用获取失败: ${response.status}`);
          return null;
        }

        const data = await response.json();

        if (data.rgOwnedApps && Array.isArray(data.rgOwnedApps)) {
          Utils.log(`从userdata获取到 ${data.rgOwnedApps.length} 个自有应用`);
          return data.rgOwnedApps;
        }

        return null;
      } catch (error) {
        Utils.warn('自有应用获取错误', error);
        return null;
      }
    }

    /**
     * 检查游戏是否被直接拥有
     * @param {number} appId - 应用ID
     * @param {Object} data - 库数据
     * @returns {boolean}
     */
    isGameOwned(appId, data) {
      if (!data || !data.rgOwnedApps) return false;
      return data.rgOwnedApps.includes(appId);
    }

    /**
     * 检查游戏是否在家庭库中共享
     * @param {number} appId - 应用ID
     * @param {Object} data - 库数据
     * @returns {boolean}
     */
    isFamilyShared(appId, data) {
      if (!data) return false;
      // 检查 rgFamilyGroupApps 数组（家庭库共享游戏）
      if (data.rgFamilyGroupApps && data.rgFamilyGroupApps.includes(appId)) {
        return true;
      }
      return false;
    }

    /**
     * 清除缓存
     */
    invalidateCache() {
      this.cache = null;
      this.cacheTime = null;
      Utils.log('库缓存已清除');
    }
  }

  return {
    LibraryManager
  };
})();

window.SteamSirP = SteamSirP;
