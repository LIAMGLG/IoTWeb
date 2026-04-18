import mqtt from "mqtt";
import { ref } from "vue";
import { parseEventMessage } from "../utils/parser";

export function useMqttClient({ cfg, onEvent, onLog }) {
  const status = ref("disconnected");
  const statusText = ref("未连接");
  const clientRef = ref(null);

  function setStatus(s, text) {
    status.value = s;
    statusText.value = text;
  }

  function disconnect() {
    const c = clientRef.value;
    if (c) {
      try {
        c.end(true);
      } catch {}
      clientRef.value = null;
    }
    setStatus("disconnected", "未连接");
  }

  function connectAndSubscribe() {
    const url = cfg.brokerUrl.value.trim();
    const clientId = cfg.clientId.value.trim() || `web-${Math.random().toString(16).slice(2, 8)}`;
    const topic = cfg.topic.value.trim();
    const imgTopic = cfg.imgTopic.value.trim();
    const username = cfg.username.value || undefined;
    const password = cfg.password.value || undefined;
    const qos = Number(cfg.qos.value || 0);

    if (!url || !topic) {
      onLog?.("warn", "请填写Broker地址和订阅Topic");
      return;
    }

    disconnect();
    setStatus("connecting", "连接中…");
    onLog?.("info", `连接 ${url} (${clientId})`);

    const c = mqtt.connect(url, {
      clientId,
      username,
      password,
      keepalive: 30,
      reconnectPeriod: 2000,
      connectTimeout: 7000,
      clean: true,
    });
    clientRef.value = c;

    c.on("connect", () => {
      setStatus("connected", "已连接");
      onLog?.("ok", "已连接Broker");
      c.subscribe(topic, { qos }, (err) => {
        if (err) onLog?.("err", `订阅失败：${topic}`);
        else onLog?.("ok", `已订阅：${topic} (qos=${qos})`);
      });
      if (imgTopic) {
        c.subscribe(imgTopic, { qos }, (err) => {
          if (err) onLog?.("err", `订阅失败：${imgTopic}`);
          else onLog?.("ok", `已订阅：${imgTopic} (qos=${qos})`);
        });
      }
    });

    c.on("reconnect", () => {
      setStatus("connecting", "重连中…");
      onLog?.("warn", "重连中…");
    });

    c.on("close", () => {
      setStatus("disconnected", "连接已断开");
    });

    c.on("error", (err) => {
      setStatus("disconnected", "连接失败");
      onLog?.("err", `连接错误：${err?.message ?? err}`);
    });

    c.on("message", (t, payload) => {
      const text = payload instanceof Uint8Array ? new TextDecoder().decode(payload) : String(payload ?? "");
      onLog?.("info", `收到 ${t} (${payload?.length ?? text.length} bytes)`);
      const evt = parseEventMessage(t, text);
      onEvent?.(evt);
    });
  }

  return { status, statusText, connectAndSubscribe, disconnect };
}

