# 组合式函数目录

本目录存放 Vue 3 组合式函数（Composables），用于状态管理和业务逻辑封装。

## 组合式函数列表

### useEventStore.js
事件状态管理器

**功能**：
- 管理事件列表（events）
- 跟踪在线设备（onlineDevices）
- 计算今日告警数（todayAlarms）
- 标记告警状态（toggleState）
- 获取最新事件（latest）

**使用示例**：

```javascript
import { useEventStore } from "../composables/useEventStore";

const { events, addEvent, onlineDevices, todayAlarms, latest, toggleState } = useEventStore();

// 添加新事件
addEvent(newEvent);

// 切换告警状态
toggleState(eventId);

// 获取在线设备数
const deviceCount = onlineDevices.value.length;
```

**返回数据**：

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| events | Ref\<Array\> | 事件列表（最多保留300条） |
| addEvent | Function | 添加新事件 |
| onlineDevices | Computed | 在线设备 ID 列表（5分钟内有活动的设备） |
| todayAlarms | Computed | 今日告警数量 |
| latest | Computed | 最新事件 |
| toggleState | Function | 切换事件状态（待处理/已处理） |

---

### useMqttClient.js
MQTT 客户端封装

**功能**：
- MQTT WebSocket 连接管理
- 主题订阅/取消订阅
- 消息接收处理
- 自动重连机制

**使用示例**：

```javascript
import { useMqttClient } from "../composables/useMqttClient";

const mqtt = useMqttClient();

await mqtt.connect({
  brokerUrl: "wss://broker:8084/mqtt",
  clientId: "web-client-001",
  username: "user",
  password: "pass"
});

mqtt.subscribe("iot/events", (topic, message) => {
  console.log("收到消息:", topic, message);
});

mqtt.disconnect();
```

**配置参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| brokerUrl | string | 是 | MQTT Broker 地址（WebSocket 协议） |
| clientId | string | 否 | 客户端 ID |
| username | string | 否 | 用户名 |
| password | string | 否 | 密码 |
| reconnectPeriod | number | 否 | 重连间隔（默认 5000ms） |

---

### useBackendStream.js
后端数据流处理

**功能**：
- 接收后端推送的实时数据
- 解析和转换数据格式
- 与 useEventStore 集成

**使用示例**：

```javascript
import { useBackendStream } from "../composables/useBackendStream";

const backend = useBackendStream({
  onEvent: (event) => {
    console.log("收到事件:", event);
  }
});

backend.connect();
```

---

### useConfig.js
配置管理

**功能**：
- 管理应用配置项
- 从环境变量读取配置
- 提供配置验证

**使用示例**：

```javascript
import { useConfig } from "../composables/useConfig";

const config = useConfig();

// 获取天地图 Key
const tdtKey = config.get("VITE_TDT_KEY");

// 获取地图样式
const mapStyle = config.get("VITE_TDT_STYLE", "vec");
```

---

## 组合式函数规范

### 命名规范

- 文件名使用 `use` 前缀 + 功能名称：`useXxx.js`
- 导出的函数使用相同的命名：`export function useXxx() { }`

### 返回值规范

- 返回响应式数据（Ref、Computed）
- 返回方法使用普通函数
- 提供清晰的 JSDoc 注释

### 使用规范

```javascript
// ✅ 正确：在 setup 中调用
const { data, fetch } = useDataStore();

// ❌ 错误：在 setup 外调用
const store = useDataStore();
```

---

## 状态管理模式

项目采用"组合式函数"模式进行状态管理，类似于 Pinia 的设计理念：

```javascript
// 创建全局状态
export function useEventStore() {
  const events = ref([]);

  function addEvent(evt) {
    events.value = [evt, ...events.value].slice(0, 300);
  }

  return { events, addEvent };
}

// 使用状态
const { events, addEvent } = useEventStore();
```

---

## 相关文档

- [src/README.md](../src/README.md) - 源代码目录说明
- [components/README.md](../components/README.md) - 组件说明