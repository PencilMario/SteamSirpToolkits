/**
 * 全局配置常量
 */
window.SteamSirP = window.SteamSirP || {};

SteamSirP.Config = {
  // 日志前缀
  LOG_PREFIX: '[SteamSirP]',

  // 缓存配置
  CACHE_TTL: 30 * 60 * 1000, // 30分钟

  // API端点
  API: {
    USERDATA: 'https://store.steampowered.com/dynamicstore/userdata/',
    FAMILY_LIBRARY: 'https://api.steampowered.com/IFamilyGroupsService/GetSharedLibraryApps/v1'
  },

  // UI配置
  UI: {
    BADGE_TEXT: '在家庭库中',
    BADGE_CLASS: 'steamsr-family-library-badge',
    STYLE_ID: 'steamsr-family-badge-style'
  },

  // 时区转换配置
  TIMEZONE: {
    TIME_PATTERN: /在(\d+\s+\d+月\s+\d+)\s+\((\d+:\d+:\d+)\)\s+格林尼治标准时间/g,
    LOCAL_TIME_LABEL: '本地时间'
  }
};

window.SteamSirP = SteamSirP;
