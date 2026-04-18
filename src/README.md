# 源代码目录

本目录包含项目的所有源代码，采用 Vue 3 + Vite 构建。

## 目录结构

```
src/
├── components/     # Vue 组件
├── composables/    # 组合式函数 (Hooks)
├── utils/          # 工具函数
├── App.vue         # 主应用组件
└── main.js         # 应用入口
```

## 主要模块

### components/
存放所有 Vue 单文件组件（.vue），包括页面布局组件、功能组件等。

### composables/
存放 Vue 3 组合式函数（类似 Hooks），包含状态管理和业务逻辑。

### utils/
存放纯 JavaScript 工具函数，不依赖 Vue 框架，可在其他地方复用。

## 入口文件

### main.js
应用入口文件，负责：
- 创建 Vue 应用实例
- 挂载根组件
- 注册全局配置

### App.vue
根组件，包含：
- 顶部导航栏
- 主内容区域
- 事件抽屉组件
- 状态管理集成

## 相关文档

- [components/README.md](components/README.md) - 组件说明
- [composables/README.md](composables/README.md) - 组合式函数说明
- [utils/README.md](utils/README.md) - 工具函数说明