import mqtt from "mqtt";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= 配置区 =================
const HUAWEI_CONFIG = {
  // 华为云应用侧 MQTT 接入地址 (注意去掉 tcp:// 或 ssl://，只要域名或IP)
  host: "af8f490a33.st1.iotda-app.cn-north-4.myhuaweicloud.com",
  port: 8883,
  
  // 刚才你发的 access_key 和 access_code
  accessKey: "wqN5xMQW",
  accessCode: "CEYlxEyDK6d6fzaXOdiBzvHHSnJPNM42",
  
  // 你刚才配置的推送队列 Topic
  topic: "huawei/iotda/match2026/dev1",
};

// 本地 WebSocket 服务器端口 (网页连这个端口)
const WS_PORT = 8080;
// ==========================================

const instanceId = "";

// 2. 拼接 ClientID (全局唯一即可，建议用 accessKey 加上随机数)
const clientId = `${HUAWEI_CONFIG.accessKey}_${Math.random().toString(16).slice(2, 8)}`;

// 3. 读取华为云 CA 证书 (用于 8883 端口 TLS 校验)
const caCertPath = path.join(__dirname, "certificate", "c", "DigiCertGlobalRootCA.crt.pem");
let caCert;
try {
  caCert = fs.readFileSync(caCertPath);
  console.log("✅ 成功加载 CA 证书:", caCertPath);
} catch (err) {
  console.error("❌ 无法读取 CA 证书，请确保 certificate 目录在当前路径下:", err.message);
  process.exit(1);
}

// 4. 连接华为云 MQTT
console.log(`\n⏳ 正在连接华为云 IoTDA...`);
console.log(`   Host: ${HUAWEI_CONFIG.host}:${HUAWEI_CONFIG.port}`);
console.log(`   ClientID: ${clientId}`);

let mqttClient = null;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getClientOptions() {
  const timestamp = String(Math.round(new Date()));
  const username = `accessKey=${HUAWEI_CONFIG.accessKey}|timestamp=${timestamp}|instanceId=${instanceId}`;
  return {
    host: HUAWEI_CONFIG.host,
    port: HUAWEI_CONFIG.port,
    connectTimeout: 4000,
    clientId,
    protocol: "mqtts",
    keepalive: 120,
    username,
    password: HUAWEI_CONFIG.accessCode,
    rejectUnauthorized: false,
    secureProtocol: "TLSv1_2_method",
    ca: caCert,
    clean: true,
    reconnectPeriod: 0,
  };
}

function connectOnce() {
  mqttClient = mqtt.connect(getClientOptions());

  mqttClient.on("connect", () => {
    console.log("✅ 成功连接到华为云 IoTDA!");
    mqttClient.subscribe(HUAWEI_CONFIG.topic, { qos: 0 }, (err, granted) => {
      if (err || (granted && granted[0] && granted[0].qos === 128)) {
        console.error("❌ 订阅失败");
        return;
      }
      console.log(`✅ 成功订阅流转 Topic: ${HUAWEI_CONFIG.topic}`);
    });
  });

  mqttClient.on("message", (topic, message) => {
    const payload = message.toString();
    console.log(`\n📩 收到华为云数据 [Topic: ${topic}]:`);
    console.log(payload.length > 200 ? payload.substring(0, 200) + "... (已截断)" : payload);

    const envelope = JSON.stringify({ topic, payload });
    let count = 0;
    for (const ws of clients) {
      if (ws.readyState === 1) {
        ws.send(envelope);
        count++;
      }
    }
    if (count > 0) {
      console.log(`   👉 已转发给 ${count} 个前端页面`);
    }
  });

  mqttClient.on("error", (err) => {
    console.error("❌ MQTT 连接错误:", err.message);
  });

  mqttClient.on("close", () => {
    console.log("⚠️ MQTT 连接已关闭，准备重连…");
    if (mqttClient) mqttClient.end(true);
    mqttClient = null;
    connectWithRetry();
  });
}

async function connectWithRetry() {
  let duration = 1000;
  const maxDuration = 20000;
  let times = 0;

  while (true) {
    try {
      if (!mqttClient) {
        connectOnce();
      } else {
        mqttClient.end(true, () => connectOnce());
      }
      return;
    } catch (e) {
      times++;
      console.log(`connect mqtt broker retry. times: ${times}`);
      await sleep(duration);
      if (duration < maxDuration) duration *= 2;
    }
  }
}

// 5. 启动本地 WebSocket 服务器
const wss = new WebSocketServer({ port: WS_PORT }, () => {
  console.log(`\n🚀 本地 WebSocket 服务器已启动，监听端口: ${WS_PORT}`);
  console.log(`   网页前端请连接: ws://localhost:${WS_PORT}`);
});

// 记录所有连进来的前端页面
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("🟢 有前端页面(浏览器)连接进来了!");
  clients.add(ws);
  try {
    ws.send(JSON.stringify({ topic: "backend", payload: JSON.stringify({ type: "hello", ts: new Date().toISOString() }) }));
  } catch {}
  
  ws.on("close", () => {
    console.log("🔴 前端页面断开连接");
    clients.delete(ws);
  });
});

connectWithRetry();
