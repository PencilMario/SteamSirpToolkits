/**
 * 时区转换模块 - 将UTC时间转换为本地时间
 */
window.SteamSirP = window.SteamSirP || {};

SteamSirP.TimezoneConverter = (() => {
  const Config = window.SteamSirP.Config;
  const Utils = window.SteamSirP.Utils;

  /**
   * 将UTC时间转换为本地时间
   * @param {string} dateStr - 格式: "2026 2月 22"
   * @param {string} timeStr - 格式: "8:00:00"
   * @returns {Object|null} 包含转换后的日期和时间，或null如果解析失败
   */
  function convertUTCToLocal(dateStr, timeStr) {
    // 解析日期字符串 "2026 2月 22"
    const dateMatch = dateStr.match(/(\d+)\s+(\d+月)\s+(\d+)/);
    if (!dateMatch) return null;

    const year = parseInt(dateMatch[1]);
    const monthStr = dateMatch[2];
    const day = parseInt(dateMatch[3]);
    const month = Utils.getMonthIndex(monthStr);

    if (month === undefined) return null;

    // 解析时间字符串 "8:00:00"
    const timeMatch = timeStr.match(/(\d+):(\d+):(\d+)/);
    if (!timeMatch) return null;

    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const seconds = parseInt(timeMatch[3]);

    try {
      // 创建UTC时间
      const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));

      // 转换为本地时间
      const localDate = new Date(utcDate);

      // 获取本地时间的年月日时分秒
      const localYear = localDate.getFullYear();
      const localMonth = localDate.getMonth();
      const localDay = localDate.getDate();
      const localHours = String(localDate.getHours()).padStart(2, '0');
      const localMinutes = String(localDate.getMinutes()).padStart(2, '0');
      const localSeconds = String(localDate.getSeconds()).padStart(2, '0');

      // 反向映射月份数字到中文
      const localMonthStr = Utils.getMonthName(localMonth);

      return {
        dateStr: `${localYear} ${localMonthStr} ${localDay}`,
        timeStr: `${localHours}:${localMinutes}:${localSeconds}`
      };
    } catch (error) {
      Utils.warn('时间转换出错', error);
      return null;
    }
  }

  /**
   * 扫描并替换页面中的交易保护时间文本
   */
  function processPage() {
    try {
      const pattern = Config.TIMEZONE.TIME_PATTERN;

      // 获取所有文本节点
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const nodesToProcess = [];
      let node;
      while (node = walker.nextNode()) {
        if (pattern.test(node.textContent)) {
          nodesToProcess.push(node);
          pattern.lastIndex = 0; // 重置正则表达式
        }
      }

      // 处理找到的每个文本节点
      nodesToProcess.forEach(node => {
        const originalText = node.textContent;

        // 替换所有匹配的时间
        const newText = originalText.replace(
          Config.TIMEZONE.TIME_PATTERN,
          (match, dateStr, timeStr) => {
            const converted = convertUTCToLocal(dateStr.trim(), timeStr);
            if (converted) {
              return `在${converted.dateStr} (${converted.timeStr}) ${Config.TIMEZONE.LOCAL_TIME_LABEL}`;
            }
            return match;
          }
        );

        // 如果文本改变了，更新节点
        if (newText !== originalText) {
          node.textContent = newText;
        }
      });

      Utils.log('Steam交易保护时间已转换为本地时间');
    } catch (error) {
      Utils.warn('时区转换处理出错', error);
    }
  }

  return {
    convertUTCToLocal,
    processPage
  };
})();

window.SteamSirP = SteamSirP;
