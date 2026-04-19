# 绝缘子巡检可视化系统

一个基于 Vue3 + Vite 构建的实时监控与告警平台，集成 ECharts 数据可视化和 Leaflet 地图定位功能，支持 MQTT 实时数据接入。

## 项目特点

- **实时监控**：通过 MQTT(WebSocket) 接收并展示实时告警数据
- **数据可视化**：使用 ECharts 展示告警趋势和统计分析
- **地图定位**：集成 Leaflet 实现设备定位和轨迹追踪
- **告警管理**：支持告警状态管理（待处理/已处理）和筛选
- **响应式设计**：适配不同屏幕尺寸
- **演示模式**：内置模拟数据，方便快速体验功能

## 技术栈

- **前端框架**：Vue 3 + Vite
- **数据可视化**：ECharts 5
- **地图库**：Leaflet
- **样式**：原生 CSS
- **数据管理**：Vue 3 Composition API
- **实时通信**：MQTT.js

## 核心功能

### 1. 总览页面
- 设备在线状态统计
- 今日告警数量统计
- 系统延迟监控
- 故障地图定位
- 实时事件列表

### 2. 实时监控
- 实时事件流展示
- 事件详情查看
- 支持按设备/类型搜索

### 3. 告警中心（工作台）
- 顶部统计指标：今日告警总数、未处理数、高危数、平均处理时长
- 多维度筛选：按等级、设备、状态筛选
- 告警状态管理：标记待处理/已处理
- 支持导出 JSON 数据

### 4. 历史分析
- 告警趋势图表
- 历史数据可视化
- 设备活动分析

### 5. 地图功能
- 设备位置标记
- 同设备轨迹连线（时间差≤1天）
- 点击告警自动定位到地图
- 支持天地图和 OpenStreetMap 切换

## 项目结构

```
IoTWeb/
├── src/
│   ├── components/          # 组件目录
│   │   ├── AlarmTimeline.vue     # 告警时间线
│   │   ├── AlarmTrend.vue        # 告警趋势图表
│   │   ├── EventDrawer.vue       # 事件详情抽屉
│   │   ├── EventTable.vue        # 告警中心表格
│   │   ├── FaultMap.vue          # 故障地图
│   │   ├── KpiBar.vue            # KPI 指标栏
│   │   ├── SimpleEventTable.vue  # 简单事件表格
│   │   └── TopBar.vue            # 顶部导航栏
│   ├── composables/         # 组合式函数
│   │   ├── useBackendStream.js   # 后端流处理
│   │   ├── useEventStore.js      # 事件存储管理
│   │   └── useMqttClient.js      # MQTT 客户端
│   ├── utils/               # 工具函数
│   │   ├── draw.js               # 绘图工具
│   │   ├── level.js              # 告警等级处理
│   │   └── time.js               # 时间处理
│   ├── App.vue              # 主应用组件
│   └── main.js              # 应用入口
├── styles.css               # 全局样式
├── index.html               # HTML 入口
├── package.json             # 依赖配置
└── vite.config.js           # Vite 配置
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

打开 Vite 提示的本地地址即可访问。

### 3. 构建生产版本

```bash
npm run build
```

构建后的文件会生成在 `dist` 目录，可直接部署到静态服务器。

## Netlify 部署说明（MQTT 连接失败的根因与解决）

Netlify 只能托管前端静态站点，无法常驻运行 WebSocket/MQTT 长连接后端。当前项目的实时数据链路是：

- 后端 [server.js](file:///d:/trae_proj/IoTWeb/server.js) 连接华为云 IoTDA（应用侧 MQTTS 8883）订阅推送 Topic
- 前端通过 WebSocket 连接后端获取数据并渲染

因此你把前端部署到 Netlify 后，如果后端还在本机 `ws://localhost:8080`，浏览器一定连不上；并且 Netlify 使用 HTTPS，前端也必须使用 `wss://` 连接（`ws://` 会被浏览器拦截为 Mixed Content）。

### 解决方案（推荐）

1. 把后端 `server.js` 单独部署到一台公网服务器（云服务器 / Render / Railway / Fly.io 等）
2. 用域名 + HTTPS（反向代理）给后端提供 `wss://你的后端域名/ws`
3. 在 Netlify 的 Environment variables 里配置：

```bash
VITE_BACKEND_WS_URL=wss://你的后端域名/ws
```

4. 重新部署 Netlify 前端（让 Vite 在构建时注入该变量）

### 后端环境变量（不要把密钥写进代码）

后端支持从环境变量读取华为云参数，部署平台里配置：

```bash
IOTDA_HOST=af8f490a33.st1.iotda-app.cn-north-4.myhuaweicloud.com
IOTDA_PORT=8883
IOTDA_ACCESS_KEY=你的access_key
IOTDA_ACCESS_CODE=你的access_code
IOTDA_TOPIC=huawei/iotda/match2026/dev1
IOTDA_INSTANCE_ID=
IOTDA_CA_PATH=./certificate/c/DigiCertGlobalRootCA.crt.pem
PORT=8080
```


## 配置说明

### 天地图配置

Leaflet 默认使用 OpenStreetMap，部分网络环境可能加载失败。可配置天地图（需要 Key）：

1. 申请天地图 Key（tk）
2. 在项目根目录创建 `.env.local` 文件：

```bash
VITE_TDT_KEY=你的天地图tk
VITE_TDT_STYLE=vec  # vec: 矢量底图, img: 影像底图
```

### MQTT 连接配置

在页面右下「MQTT链路」面板填写：

- **Broker(WebSocket)**：例如 `wss://你的broker:端口/mqtt`
- **订阅Topic**：例如 `iot/insulator/events`
- **图片Topic**（可选）：如果图片单独走 Topic，可填写 `iot/insulator/images`
- **用户名/密码**（可选）：按你的 broker 配置填写

点击「连接并订阅」即可开始接收实时数据。

## 数据格式

### 推荐消息格式

```json
{
  "eventId": "evt-0001",
  "ts": "2026-04-10T10:20:30.123Z",
  "deviceId": "edge-001",
  "faultType": "裂纹",
  "level": "alarm",
  "confidence": 0.93,
  "inferMs": 42,
  "modelVersion": "insulator-det-v1.3",
  "locName": "T3",
  "lat": 30.560123,
  "lng": 114.310456,
  "accuracy": 3,
  "locSrc": "GNSS",
  "imageBase64": "......",
  "bboxes": [
    { "left": 0.32, "top": 0.25, "right": 0.68, "bottom": 0.62, "label": "裂纹", "score": 0.93 }
  ]
}
```

### 字段说明

- **基本信息**：`eventId`, `ts`, `deviceId`, `faultType`
- **告警信息**：`level` (alarm/warn/ok), `confidence` (0-1)
- **定位信息**：`locName`, `lat`, `lng`, `accuracy`
- **图片信息**：`imageUrl` 或 `imageBase64`
- **检测框**：`bboxes` (支持归一化坐标 0-1 或像素坐标)
- **状态管理**：`state` (false: 待处理, true: 已处理)

## 部署方式

### 1. 静态部署

1. 执行 `npm run build` 构建生产版本
2. 将 `dist` 目录下的文件上传到静态服务器（如 Nginx、Apache）
3. 配置服务器根目录指向 `dist` 目录

### 2. 容器部署

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html
EXPOSE 80
```

### 3. 持续部署

推荐使用 GitHub Actions 或 GitLab CI 实现自动化部署：

1. 推送代码到 Git 仓库
2. CI 自动构建并部署到服务器
3. 支持版本回滚和快速更新

## 更新流程

1. **本地开发**：修改代码并测试
2. **构建**：`npm run build`
3. **部署**：上传 `dist` 目录到服务器
4. **验证**：访问线上地址确认更新生效

## 演示模式

页面顶部提供「演示模式」开关，开启后会自动生成模拟数据，方便快速体验所有功能。

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 故障排查

### 地图加载失败
- 检查网络连接
- 配置天地图 Key（推荐）
- 确认 `.env.local` 文件配置正确

### MQTT 连接失败
- 检查 broker 地址和端口
- 确认 WebSocket 协议使用正确（wss:// 或 ws://）
- 验证用户名和密码

### 数据不显示
- 检查消息格式是否符合要求
- 确认 MQTT 订阅 Topic 正确
- 查看浏览器控制台是否有错误信息

## 版本历史

- **v1.0.0**：基础版本，包含实时监控、告警中心、地图定位功能
- **v1.1.0**：添加告警状态管理、轨迹追踪功能

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提交 Issue 或联系项目维护者。
