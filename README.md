<p align="center">
  <a href="https://github.com/lastshrek/t3code-relay">
    <img src="./assets/prod/t3-black-web-icon-192x192.png" width="80" height="80" alt="T3 Code logo" />
  </a>
</p>

<h1 align="center">T3 Code（定制版）</h1>

<p align="center">开源编码智能体控制平面 · 本仓库为个人定制分支</p>

<p align="center">
  <strong>中文</strong> · <a href="./README.en.md">English</a> · <a href="./docs/README.md">文档索引</a>
</p>

> 本仓库基于上游 [pingdotgg/t3code](https://github.com/pingdotgg/t3code) 二开，针对中文网络环境与个人使用习惯做了一系列定制。默认分支为 `master`，上游更新保留在 `upstream/main`。

---

## 与原版的主要区别

本分支在上游基础上做了以下定制（按功能分组）：

### 隐私与遥测

- **默认零遥测**：产品分析与 Relay tracing 默认关闭，需显式设置 `T3CODE_TELEMETRY_ENABLED=true` 才启用；关闭时不读取或创建分析用安装身份，移除了从 T3 Connect 账号及客户端设备 ID 构造遥测身份的代码。
- **移动端**：崩溃报告与连接 traces 默认关闭；Axiom traces 地址不再默认配置。
- 详见 [docs/user/telemetry.md](./docs/user/telemetry.md)。

### 品牌与版本

- 正式版应用名去掉 `(Beta)` 后缀，显示为 **T3 Code**；stage label 改为 `Latest`。
- 版本号从 `1.0.0` 起。
- **打包自动升级版本号**：每次执行 `pnpm dist:desktop:*` 前自动把补丁号 +1（`1.0.1 → 1.0.2`），改动留在工作区不自动提交，由使用者自行决定何时提交。

### 会话与项目体验

- **欢迎页关闭按钮**：首次运行引导页标题右侧新增关闭入口，可跳过设置直接进入主界面。
- **按项目视图**：侧栏顶部可在「按会话查看」与「按项目查看」间切换；按项目视图把同一项目（跨 agent、跨机器）的会话归入同一文件夹。
- **已收尾线程纳入项目文件夹**：`settled` 线程不再沉在独立的 Settled shelf，而是归入各自项目文件夹，方便日后重新唤醒继续。
- **选区 Cite 按钮位置**：浮动 Cite 按钮固定在选区下方并留 12px 间距，不再贴着鼠标释放点。

### 会话导入

- **OpenCode 本地会话**：欢迎页可扫描本机 `opencode.db`（含 `session_v2` 与旧版 `session` 表），导入为 T3 线程。
- **WorkBuddy / CodeBuddy 本地会话**：扫描 `~/.workbuddy/projects/*/*.jsonl`，剥离注入的 `<system-reminder>`、优先使用 `ai-title`、回读外置工具结果，导入后绑定到 `acpRegistry` driver 以便续接原生会话。
- **已用 credits 展示**：ACP `usage_update` 中 currency 为空的积分映射为 `CRD` 哨兵，在会话详情面板展示「已用积分」。

### 模型与额度

- **模型套装（思考 / 执行）**：可在 `设置 → 会话 → 模型套装` 配置多套模型配置，每套含「思考模型」与「执行模型」；聊天输入框底部一键切换阶段并自动套用对应阶段的模型。
- **额度备选**：模型链为有序列表，解析时自动跳过额度耗尽或不可用的模型；额度不足的横幅可一键用下一个模型继续（复用 Portable Handoff 无缝接力）。
- **CodeBuddy Code 默认国内站**：ACP Registry 的 `codebuddy-code` agent 默认注入 `CODEBUDDY_INTERNET_ENVIRONMENT=internal`，新电脑添加时无需手动加环境变量；仍可通过实例环境变量覆盖。

### Provider 修复

- **Antigravity CLI 文件凭据**：注入 `AGY_CLI_FORCE_FILE_TOKEN_STORAGE=1`，让每个 profile 使用独立的 token 文件，修复「能对话但 Limits 提示未登录」的问题。
- **构建脚本兼容**：build-desktop-artifact 生成的临时 workspace 配置补齐 pnpm 12 所需的 `packages` 字段。

---

## 快速开始

### 安装

从 [Releases](https://github.com/lastshrek/t3code-relay/releases) 下载对应平台的安装包（macOS 提供 arm64 DMG / ZIP）。桌面版支持 macOS、Windows、Linux；手机端需分别通过 Xcode / Android 构建环境生成。

也可从源码启动（不打包）：

1. 克隆仓库并确保 Node 版本符合 `package.json` 要求；
2. 执行依赖安装后运行 `pnpm dev`。

### 首次运行

1. 打开应用，欢迎页会检查本机已安装并登录的 agent；
2. 若需要导入 OpenCode / WorkBuddy 会话，先在 `Settings → Providers` 添加对应 provider；
3. 欢迎页勾选要导入的项目后启动导入。

### 连接 CodeBuddy（国内站）

`Settings → Providers → Browse` 添加 **CodeBuddy Code**，用微信 / Google 登录国内站账号即可。默认已切国内站，无需手动设置环境变量。

---

## 常用操作

### 模型套装

1. `设置 → 会话 → 模型套装` → 点「添加套装」；
2. 分别为「思考：」与「执行：」选择模型，打开右侧开关激活；
3. 回到对话，输入框底部的「思考 / 执行」按钮可一键切换阶段，并自动套用对应阶段的模型。

> 当前设置 UI 每套只提供主模型；备选模型链虽已支持，但需手动编辑 `~/.t3/userdata/settings.json` 中的 `modelProfiles[].thinkModels` / `executeModels` 数组添加后续条目。

### 视图切换与已收尾线程

侧栏顶部的视图切换按钮（网格图标 = 按项目、列表图标 = 按会话）可随时切换。按项目视图下已收尾的线程会留在项目文件夹里，右键可 Un-settle 重新激活。

### 打包

```bash
pnpm dist:desktop:dmg:arm64   # 自动 bump patch 版本后打 arm64 DMG
```

其他平台见 `package.json` 的 `dist:desktop:*` 脚本。版本号改动不会自动提交，请自行检查并提交。

---

## 文档

- [完整文档索引](./docs/README.md)
- [安装与首次运行](./docs/user/install.md)
- [线程侧栏](./docs/user/thread-sidebar.md)
- [远程访问](./docs/user/remote-access.md)
- [用量与额度](./docs/user/usage.md)
- [遥测说明](./docs/user/telemetry.md)
- [开发运行手册](./docs/operations/00_development.md)

英文原版 README 见 [README.en.md](./README.en.md)。

---

## 许可与商标

本仓库源码沿用上游的 [MIT License](./LICENSE)。MIT 许可**仅适用于源码**，不授予 T3 Tools, Inc. 的商标、品牌或商业外观权利，包括 **T3 Code** 名称、字标、Logo 与应用图标。

若你分发或基于本源码构建：请使用自己的品牌，并明确说明你的项目是非官方版本、与 T3 Tools, Inc. 无关联。详见 [TRADEMARK.md](./TRADEMARK.md)。
