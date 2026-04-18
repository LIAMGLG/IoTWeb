# 绝缘子巡检可视化（Vue3 + Vite + ECharts + Leaflet）

当前版本已切换为 Vue3 + Vite，并集成 ECharts（趋势图）与 Leaflet（地图定位）。页面内置“演示模式”，也支持通过 MQTT(WebSocket) 接入云端实时数据（含图片）。

## 启动方式

```bash
npm install
npm run dev
```

打开 Vite 提示的本地地址即可。

## 国内瓦片（带 Key）

Leaflet 默认示例使用 OpenStreetMap，部分网络环境会加载失败。项目支持直接切换到天地图（需要 Key）：

1. 申请天地图 Key（tk）
2. 在项目根目录创建 `.env.local`，写入：

```bash
VITE_TDT_KEY=你的天地图tk
VITE_TDT_STYLE=vec
```

其中 `VITE_TDT_STYLE`：

- `vec`：矢量底图 + 注记（默认）
- `img`：影像底图 + 注记

改完后重启 `npm run dev`。

### 旧版静态页

如果你想保留之前“无需依赖、直接打开”的静态版本，可打开 [index-static.html](file:///d:/trae_proj/IoTWeb/legacy/index-static.html)。

## MQTT 连接

在页面右下「MQTT链路」面板填写：

- Broker(WebSocket)：例如 `wss://你的broker:端口/mqtt`
- 订阅Topic：例如 `iot/insulator/events`
- 图片Topic（可选）：如果图片单独走 Topic，可填写 `iot/insulator/images`
- 用户名/密码（可选）：按你的 broker 配置填写

点击「连接并订阅」即可开始接收实时数据。

## 消息格式（建议）

页面对字段名做了兼容，你也可以按下面结构统一，展示效果最好：

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

### 图片字段支持

- `imageUrl`：HTTP 图片地址
- `imageBase64` / `base64`：Base64（可不带 `data:image/...` 前缀）
- 或者图片走单独 Topic：消息里携带 `eventId` 并包含 `imageUrl` / `imageBase64` 即可关联

### 框字段支持

- `bboxes` / `boxes` / `detections` / `objects`
- 坐标支持两种：
  - 归一化：`0~1`（推荐）
  - 像素：`left/top/right/bottom` 为像素值
