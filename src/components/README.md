# 组件目录

本目录存放所有 Vue 单文件组件（.vue），采用 Vue 3 Composition API 编写。

## 组件列表

### 页面布局组件

| 组件 | 文件名 | 说明 |
|------|--------|------|
| 顶部导航栏 | [TopBar.vue](TopBar.vue) | 系统导航栏，包含视图切换、演示模式开关、状态指示、实时时钟 |
| KPI 指标栏 | [KpiBar.vue](KpiBar.vue) | 显示在线设备数、今日告警数、端到端时延、最新识别置信度 |

### 功能组件

| 组件 | 文件名 | 说明 |
|------|--------|------|
| 最新识别画面 | [LatestViewer.vue](LatestViewer.vue) | 显示最新告警图片，支持检测框叠加、双视图对比、全屏模式 |
| 故障地图 | [FaultMap.vue](FaultMap.vue) | Leaflet 地图组件，支持设备定位、轨迹连线、点击告警自动定位 |
| 告警时间线 | [AlarmTimeline.vue](AlarmTimeline.vue) | 时间线形式展示告警历史 |
| 告警趋势图表 | [AlarmTrend.vue](AlarmTrend.vue) | ECharts 图表组件，展示告警趋势和统计分析 |
| MQTT 面板 | [MqttPanel.vue](MqttPanel.vue) | MQTT 连接配置面板，支持 WebSocket 连接和主题订阅 |

### 数据展示组件

| 组件 | 文件名 | 说明 |
|------|--------|------|
| 简单事件表格 | [SimpleEventTable.vue](SimpleEventTable.vue) | 实时监控和总览页面使用的基础事件列表 |
| 告警中心表格 | [EventTable.vue](EventTable.vue) | 告警中心工作台，包含统计指标、筛选功能、状态管理 |
| 事件详情抽屉 | [EventDrawer.vue](EventDrawer.vue) | 侧边抽屉组件，展示事件详情、图片、历史同类告警对比 |

## 组件架构

```
App.vue (根组件)
├── TopBar.vue              # 顶部导航
├── KpiBar.vue              # KPI 指标
├── FaultMap.vue            # 故障地图
├── LatestViewer.vue        # 最新画面
├── SimpleEventTable.vue    # 简单事件列表 (总览/实时监控)
├── EventTable.vue          # 告警中心 (事件视图)
├── EventDrawer.vue         # 详情抽屉
├── AlarmTimeline.vue       # 告警时间线
├── AlarmTrend.vue          # 告警趋势图
└── MqttPanel.vue           # MQTT 配置
```

## 组件通信

### Props（父 → 子）

```javascript
// KpiBar.vue
defineProps({
  onlineDevices: Array,    // 在线设备列表
  todayAlarms: Number,      // 今日告警数
  latencyMs: Number,       // 延迟毫秒数
  latest: Object           // 最新事件对象
});

// FaultMap.vue
defineProps({
  events: Array,           // 事件列表
  latest: Object,          // 最新事件
  activeEvent: Object      // 当前激活的事件（用于地图定位）
});

// EventTable.vue
defineProps({
  events: Array            // 事件列表
});
```

### Events（子 → 父）

```javascript
// TopBar.vue
defineEmits(["changeView", "toggleDemo"]);

// EventTable.vue
defineEmits(["open", "toggleState"]);

// LatestViewer.vue
defineEmits(["toggleOverlay", "toggleSplit"]);
```

## 通用 Props

大多数组件接受以下通用 Props：

- `events: Array` - 事件列表数据
- `latest: Object` - 最新事件对象

## 样式约定

组件使用 BEM 命名规范：

```css
.componentName { }
.componentName__element { }
.componentName--modifier { }
```

示例：

```css
.card { }
.card__header { }
.card--active { }
```

## 相关文档

- [src/README.md](../src/README.md) - 源代码目录说明
- [composables/README.md](../composables/README.md) - 组合式函数说明