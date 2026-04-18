# 工具函数目录

本目录存放纯 JavaScript 工具函数，不依赖 Vue 框架，可在项目各处复用。

## 文件列表

### time.js
时间处理工具

**导出函数**：

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `toLocalTime` | `input` | string | 转换为本地时间字符串，格式：`YYYY-MM-DD HH:mm:ss` |
| `toIso` | `input` | string | 转换为 ISO 格式字符串 |

**使用示例**：

```javascript
import { toLocalTime, toIso } from "../utils/time";

// 转换为本地时间
const local = toLocalTime("2026-04-10T10:20:30.123Z");
// 结果: "2026-04-10 18:20:30"（本地时间）

// 转换为 ISO 格式
const iso = toIso(new Date());
// 结果: "2026-04-10T10:20:30.123Z"
```

---

### level.js
告警等级处理工具

**导出函数**：

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `normalizeLevel` | `raw` | string | 统一告警等级为 `alarm`/`warn`/`ok` |
| `prettyLevel` | `lv` | string | 将等级转换为中文显示 |

**等级映射规则**：

| 输入值 | normalizeLevel 输出 | prettyLevel 输出 |
|--------|---------------------|------------------|
| `alarm`, `critical`, `danger`, `error`, `严重`, `告警` | `"alarm"` | `"告警"` |
| `warn`, `warning`, `预警`, `警告` | `"warn"` | `"预警"` |
| `ok`, `normal`, `healthy`, `正常` | `"ok"` | `"正常"` |
| 其他 | `"warn"` (默认) | `"未知"` |

**使用示例**：

```javascript
import { normalizeLevel, prettyLevel } from "../utils/level";

// 标准化等级
const level = normalizeLevel("critical");  // "alarm"
const level2 = normalizeLevel("WARNING");  // "warn"

// 中文显示
const text = prettyLevel("alarm");  // "告警"
const text2 = prettyLevel("warn");   // "预警"
```

---

### draw.js
Canvas 绘图工具

**导出函数**：

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `ensureCanvasSize` | `canvas, refEl` | void | 确保 canvas 尺寸与参考元素一致 |
| `drawBoxes` | `{ canvas, imgEl, boxes, enabled, level }` | void | 在 canvas 上绘制检测框 |

**drawBoxes 参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `canvas` | HTMLCanvasElement | 绘图目标 canvas |
| `imgEl` | HTMLImageElement | 参考图片元素 |
| `boxes` | Array | 检测框数组 |
| `enabled` | boolean | 是否启用绘制 |
| `level` | string | 告警等级（影响框颜色） |

**框颜色规则**：

| 等级 | 颜色 |
|------|------|
| `alarm` | 红色 `rgba(255,77,109,0.95)` |
| `warn` | 黄色 `rgba(255,209,102,0.95)` |
| 其他 | 青色 `rgba(50,224,255,0.95)` |

**检测框格式**：

```javascript
{
  left: number,    // 左坐标（归一化0-1 或 像素）
  top: number,     // 顶坐标（归一化0-1 或 像素）
  right: number,   // 右坐标（归一化0-1 或 像素）
  bottom: number,   // 底坐标（归一化0-1 或 像素）
  label: string,   // 标签文字
  score: number,   // 置信度 0-1
  kind: "norm" | "px"  // 坐标系类型
}
```

**使用示例**：

```javascript
import { ensureCanvasSize, drawBoxes } from "../utils/draw";

// 确保 canvas 尺寸正确
ensureCanvasSize(canvasEl, imgEl);

// 绘制检测框
drawBoxes({
  canvas: canvasEl,
  imgEl: imgEl,
  boxes: [{ left: 0.2, top: 0.3, right: 0.6, bottom: 0.7, label: "裂纹", score: 0.93 }],
  enabled: true,
  level: "alarm"
});
```

---

### parser.js
MQTT 消息解析工具

**导出函数**：

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `parseEventMessage` | `topic, payloadText` | object | 解析 MQTT 消息为标准事件对象 |

**解析后事件对象结构**：

```javascript
{
  id: string,           // 事件 ID
  topic: string,       // MQTT Topic
  ts: string,          // 事件时间（ISO 格式）
  receivedAt: string,  // 接收时间（ISO 格式）
  deviceId: string,    // 设备 ID
  faultType: string,   // 缺陷类型
  level: string,        // 告警等级（alarm/warn/ok）
  confidence: number,  // 置信度（0-1）
  locName: string,     // 位置名称
  lat: number,         // 纬度
  lng: number,         // 经度
  imageUrl: string,    // 图片 URL
  imageDataUrl: string,// Base64 图片数据
  bboxes: Array,       // 检测框数组
  rawText: string,     // 原始消息文本
  rawObj: object       // 原始 JSON 对象
}
```

**支持的消息格式**：

1. **标准格式**（推荐）
```json
{
  "eventId": "evt-001",
  "ts": "2026-04-10T10:20:30Z",
  "deviceId": "edge-001",
  "faultType": "裂纹",
  "level": "alarm",
  "confidence": 0.93
}
```

2. **华为云 IoTDA 格式**
```json
{
  "services": [{
    "properties": {
      "eventId": "evt-001",
      "deviceId": "edge-001"
    }
  }]
}
```

3. **图片 URL 格式**
```
https://example.com/image.jpg
```

**支持的位置字段名**：

`latlng`, `latLng`, `coord`, `coords`, `gps`, `location`, `position`, `lat`, `lng`, `latitude`, `lon`, `longitude`

**支持的时间字段名**：

`ts`, `time`, `timestamp`, `datetime`, `t`

**使用示例**：

```javascript
import { parseEventMessage } from "../utils/parser";

// 解析 MQTT 消息
const event = parseEventMessage("iot/events", JSON.stringify({
  eventId: "evt-001",
  deviceId: "edge-001",
  faultType: "裂纹",
  level: "alarm"
}));

console.log(event.id);        // "evt-001"
console.log(event.level);    // "alarm"
console.log(event.lat);       // 30.560123
```

---

## 工具函数规范

### 命名规范

- 文件名使用小写 + 下划线：`xxx.js`
- 导出函数使用 PascalCase：`function toLocalTime()`
- 帮助函数使用 camelCase：`function safeJsonParse()`

### 纯函数原则

工具函数应遵循纯函数原则：

- **无副作用**：不修改外部状态
- **确定性**：相同输入必有相同输出
- **独立性强**：不依赖 Vue/React 等框架特性

### 错误处理

所有函数应包含错误处理：

```javascript
export function safeJsonParse(txt) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}
```

---

## 相关文档

- [src/README.md](../src/README.md) - 源代码目录说明
- [components/README.md](../components/README.md) - 组件说明