
# RecordNow 📝

**RecordNow** 是一款专为 macOS 设计的优雅 Markdown 编辑器。它采用了类似 Typora 的混合编辑模式（Hybrid Mode），结合了 Notion 风格的块级编辑体验和纯文本 Markdown 的灵活性。

基于 **Electron**、**React** 和 **Vite** 构建，旨在提供原生般的桌面应用体验。

## ✨ 核心特性

*   **混合编辑模式 (Hybrid Editor)**: 所见即所得的块级编辑体验，支持拖拽排序。同时保留纯 Markdown 源码模式。
*   **本地文件系统集成**: 直接读取和保存本地 `.md` 文件，支持打开文件夹作为侧边栏工作区。
*   **可视化表格编辑**: 内置强大的 GUI 表格编辑器，支持行列添加、删除和拖拽排序，无需手动编写繁琐的 Markdown 表格语法。
*   **实时预览**: 支持 Split（分栏）和 Preview（纯预览）模式。
*   **丰富的内容支持**:
    *   LaTeX 数学公式渲染 (`$E=mc^2$`)
    *   Mermaid 图表支持 (流程图、时序图等)
    *   代码高亮
    *   图片拖拽上传（转为 Base64）
*   **多格式导出**: 支持导出为 PDF (通过打印预览)、HTML 和 Markdown。
*   **MacOS 原生体验**: 沉浸式无边框设计，毛玻璃效果顶部栏，原生窗口控制。

## 🛠 技术栈

*   **Core**: [Electron](https://www.electronjs.org/) (桌面容器)
*   **Frontend**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/) (极速构建)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Markdown Engine**: `react-markdown`, `remark-gfm`, `rehype-katex`

## 🚀 开发指南

确保你已安装 [Node.js](https://nodejs.org/) (推荐 v16+)。

1.  **安装依赖**
    ```bash
    npm install
    ```

2.  **启动开发环境**
    这将同时启动 Vite 开发服务器和 Electron 窗口：
    ```bash
    npm run electron:start
    ```

    *如果你只想调试 Web 界面（无文件系统权限），可以运行 `npm run dev`。*

## 📦 打包发布

本项目包含一个自动化构建脚本，可一键完成构建和打包流程，生成 macOS 安装包 (`.dmg`)。

### 运行构建脚本

在项目根目录下运行：

```bash
node build_app.js
```

**脚本会自动执行以下步骤：**
1.  检查并安装依赖。
2.  使用 Vite 编译 React 前端代码到 `dist/` 目录。
3.  使用 Electron Builder 将应用打包为 macOS 应用。

### 构建产物

构建完成后，你可以在 `release/` 文件夹中找到安装包：
*   `RecordNow-1.0.0.dmg` (macOS 安装包)
*   `RecordNow-1.0.0-mac.zip` (绿色版)

## 📂 项目结构

```
RecordNow/
├── build_app.js         # 自动化构建脚本
├── electron/
│   └── main.js          # Electron 主进程 (窗口管理, 权限控制)
├── src/                 # (根目录即源码目录)
│   ├── components/      # React 组件 (Sidebar, Editor, Preview...)
│   ├── hooks/           # 自定义 Hooks (useFileSystem)
│   ├── utils/           # 工具函数 (Storage, Helpers)
│   ├── App.tsx          # 主应用组件
│   └── index.tsx        # 入口文件
├── index.html           # Web 入口
├── package.json         # 依赖与脚本配置
└── vite.config.ts       # Vite 配置
```

## 📄 License

MIT License
