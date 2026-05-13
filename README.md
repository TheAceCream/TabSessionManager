# 标签页会话管理器

一个简洁实用的 Edge/Chrome 浏览器扩展，帮助你保存、管理和恢复浏览器标签页会话。适合需要频繁切换工作场景的用户，一键保存当前工作环境，随时恢复。

## 功能特性

- **一键保存** - 快速保存当前窗口所有标签页为一个会话
- **智能命名** - 自动生成会话名称（日期 + 时间 + 标签页数量）
- **会话恢复** - 在新窗口中一键恢复完整会话
- **实时搜索** - 根据会话名称或网页标题/网址快速筛选
- **详情预览** - 展开查看会话内的所有标签页
- **灵活编辑** - 支持修改会话名称、删除单个标签页
- **数据持久化** - 使用浏览器本地存储，数据不丢失
- **数量限制** - 最多保存 50 个会话，避免存储溢出

## 安装说明

### 前置要求

- Edge 浏览器（Chromium 内核）或 Chrome 浏览器

### 安装步骤

1. **下载项目**

   ```bash
   git clone https://github.com/CreamTong/TabSessionManager.git
   ```
   
   或直接下载 ZIP 压缩包并解压。

2. **打开扩展管理页面**

   - Edge: 访问 `edge://extensions/`
   - Chrome: 访问 `chrome://extensions/`

3. **启用开发者模式**

   在页面右上角开启「开发者模式」开关。

4. **加载扩展**

   点击「加载解压缩的扩展」按钮，选择项目文件夹。

5. **完成安装**

   扩展图标将出现在浏览器工具栏，点击即可使用。

## 使用方法

### 保存会话

1. 打开若干标签页
2. 点击扩展图标
3. 点击「保存当前窗口所有标签页」按钮
4. 会话自动保存，显示成功提示

### 恢复会话

1. 点击扩展图标
2. 找到目标会话（可使用搜索框筛选）
3. 点击「全部恢复」按钮
4. 新窗口自动打开所有标签页

### 管理会话

- **修改名称** - 点击会话名称即可编辑
- **查看详情** - 点击「展开详情」查看标签页列表
- **删除标签页** - 悬停标签页项，点击 × 按钮
- **删除会话** - 点击「删除」按钮

## 项目结构

```
TabSessionManager/
├── manifest.json     # 扩展配置文件（Manifest V3）
├── popup.html        # 弹窗页面结构
├── popup.css         # 样式文件
├── popup.js          # 核心逻辑代码
├── icon16.svg        # 扩展图标（16×16）
├── icon48.svg        # 扩展图标（48×48）
├── icon128.svg       # 扩展图标（128×128）
├── LICENSE           # MIT 开源协议
└── README.md         # 项目说明文档
```

## 技术栈

| 技术 | 说明 |
|------|------|
| Manifest V3 | Chrome 扩展最新规范 |
| Chrome Extensions API | tabs、storage、windows |
| JavaScript (ES6+) | 原生 JavaScript，无框架依赖 |
| CSS3 | 原生 CSS，无预处理器 |

### 核心依赖

- `chrome.tabs` - 获取和创建标签页
- `chrome.storage.local` - 本地数据持久化
- `chrome.windows` - 创建新窗口

## 数据存储

会话数据存储在 `chrome.storage.local`，结构如下：

```javascript
{
  sessions: [
    {
      id: "1704067200000",           // 唯一ID（时间戳）
      name: "2026/5/12 18:30（5个标签页）",
      createdAt: "2026-05-12T10:30:00.000Z",
      tabs: [
        {
          title: "页面标题",
          url: "https://example.com",
          favIconUrl: "https://example.com/favicon.ico"
        }
      ]
    }
  ]
}
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

## 作者

CreamTong

## 致谢

本项目使用 [华为云码道（CodeArts）代码智能体](https://www.huaweicloud.com/product/codearts.html) 辅助开发。
