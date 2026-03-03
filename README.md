# PP的Steam工具箱 (SteamSirP Toolkits)

一个功能丰富的 Chrome 扩展，为 Steam 平台提供多项实用优化和功能增强。

## 🎯 功能特性

### 1. **家庭库游戏标记**
在 Steam 搜索结果中标记通过家庭库共享的游戏，使用与"在库中"相同的原生样式，一目了然地识别可玩游戏。

- 自动检测并标记所有家庭库共享游戏
- 使用 Steam 原生"在库中"样式和配色
- 游戏项自动变灰，与已拥有游戏视觉一致
- 支持动态加载的搜索结果（自动滚动加载）

### 2. **库存页面时间转换**
自动将 Steam 库存页面的 UTC 时间转换为本地时间，方便快速查看交易保护倒计时。

- 自动识别并转换所有 UTC 时间显示
- 显示本地时间信息
- 无需手动切换时区

### 3. **可配置的调试窗口**
开发者友好的调试面板，可在设置中控制显示/隐藏。

- 实时显示插件日志和操作信息
- 默认关闭，可在设置中启用
- 便于问题排查和功能验证

## 📦 安装

### 从 Chrome 商店安装（推荐）
1. 访问 [Chrome Web Store](https://chrome.google.com/webstore/category/extensions)
2. 搜索 "PP的Steam工具箱"
3. 点击"添加至Chrome"

### 本地开发安装
1. Clone 本仓库
2. 在 Chrome 中访问 `chrome://extensions/`
3. 启用"开发者模式"（右上角开关）
4. 点击"加载未打包的扩展程序"
5. 选择本项目目录

## ⚙️ 设置

点击扩展图标 → 选项，进入设置页面：

- **显示调试窗口**：勾选以启用实时日志面板（默认关闭）
- **Steam Web API Key**：如需高级功能，可选配置（目前不需要）

## 🔧 技术详情

### 架构设计
- **MV3 Chrome 扩展** - 采用最新 Manifest V3 标准
- **模块化结构** - 代码分离为独立功能模块，易于维护
- **本地数据存储** - 使用 Chrome Storage API，所有数据存储在本地

### 核心模块
- `config.js` - 全局配置和常量
- `utils.js` - 工具函数和调试面板
- `libraryManager.js` - Steam 库数据管理和缓存
- `searchProcessor.js` - 搜索结果页面处理
- `timezoneConverter.js` - 时区转换逻辑
- `content.js` - 主程序入口和协调器

### 数据安全
- ✅ 所有数据本地存储
- ✅ 无服务器后端
- ✅ 不上传用户隐私信息
- ✅ 不修改网页内容（仅添加信息）

## 🌐 支持的页面

- `https://steamcommunity.com/id/*/inventory*` - Steam 库存页面
- `https://store.steampowered.com/search*` - Steam 搜索结果页面

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📝 许可

MIT License - 详见 LICENSE 文件

## 🙋 常见问题

**Q: 需要输入 API Key 吗？**
A: 不需要。扩展使用 Steam 的 Web API Token，通过自动化流程获取，无需用户干预。

**Q: 家庭库标记会影响性能吗？**
A: 不会。数据缓存 30 分钟，仅在页面加载时处理一次，后续操作对性能影响极小。

**Q: 为什么没看到调试窗口？**
A: 调试窗口默认关闭。请在扩展选项中勾选"显示调试窗口"以启用。

**Q: 支持其他语言吗？**
A: 目前仅支持中文。未来计划添加国际化支持。

## 📧 反馈

如遇到问题或有功能建议，请提交 Issue 至 GitHub：
https://github.com/PencilMario/SteamSirpToolkits

---

**开发者**: PencilMario
**最后更新**: 2026-03-03
**版本**: 1.0
