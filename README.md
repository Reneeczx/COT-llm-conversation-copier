# LLM对话复制工具

一个 Chrome 浏览器扩展，用于轻松复制和导出 LLM (Large Language Model) 对话内容。

## 功能特点

- 批量选择并复制对话内容，包括用户提问和模型回答
- 支持复制模型的思考过程（可选）
- 导出为 Markdown 格式，保留原始格式（加粗、斜体、代码块等）
- 支持导出为 PDF 和图片格式（计划中）
- 严格保持对话时间线顺序
- 支持多个 LLM 平台：
  - Google AI Studio
  - ChatGPT
  - Claude
  - 腾讯混元
- 可选择多个对话内容
- 支持包含思考过程
- 导出为 Markdown 格式
- 拖拽式弹窗界面

## 使用方法

1. 安装扩展后，在支持的 LLM 平台页面点击扩展图标
2. 点击"开始选择"按钮进入选择模式
3. 点击要复制的对话内容（可多选）
4. 可选：勾选"包含思考过程"
5. 点击"复制为 Markdown"按钮

## 开发说明

### 项目结构
```
project_root/
├── background/
│   └── service-worker.js    // Service Worker
├── popup/
│   ├── popup.html          // 弹窗界面
│   ├── popup.css          // 弹窗样式
│   └── popup.js           // 弹窗逻辑
├── content/
│   ├── content.js         // 内容脚本
│   └── content.css        // 内容样式
└── manifest.json          // 扩展配置
```

### 技术特点

- 使用 Chrome Extension Manifest V3
- 采用 Service Worker
- 样式完全隔离
- 最小权限原则
- 支持错误恢复

### 注意事项

- 确保在支持的 LLM 平台页面使用
- 部分平台可能需要展开思考过程才能复制
- 拖动弹窗时注意避开页面侧边栏

## 安装方法

1. 下载项目代码
2. 打开 Chrome 浏览器，进入扩展程序页面 (chrome://extensions/)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 开发中功能

- [ ] PDF 导出
- [ ] 图片导出
- [ ] 自定义 Markdown 样式
- [ ] 快捷键支持
- [ ] 多语言界面

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 项目规范

### 项目结构
```
project_root/
├── background/
│   └── service-worker.js    // Service Worker 必须放在这里
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   ├── content.js
│   └── content.css
└── manifest.json
```

### 开发规范
1. 检查所有相关文件的现有代码：
   - 理解现有功能
   - 避免重复代码
   - 确保不破坏现有功能

2. 遵循 Chrome 扩展开发规范：
   - 使用正确的文件路径和结构
   - 遵循 Manifest V3 的要求
   - 保持代码组织的一致性 

3. CSS 样式规范
    - 所有样式必须使用 `#llm-copier-popup` 作为命名空间前缀
    - 避免使用通用类名（如 `.btn`、`.container` 等）
    - 使用 BEM 命名规范
  