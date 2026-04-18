import { ref } from "vue";
import { parseEventMessage } from "../utils/parser";

export function useBackendStream({ urlRef, onEvent }) {
  const status = ref("disconnected");
  const statusText = ref("未连接");
  const lastReceiveAt = ref(null);
  const messageCount = ref(0);
  const lastRaw = ref("");

  let ws = null;
  let reconnectTimer = null;
  let reconnectDelayMs = 800;

  function setStatus(s, text) {
    status.value = s;
    statusText.value = text;
  }

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    clearReconnect();
    reconnectTimer = setTimeout(() => {
      reconnectDelayMs = Math.min(20000, Math.floor(reconnectDelayMs * 1.4));
      connect();
    }, reconnectDelayMs);
  }

  function disconnect() {
    clearReconnect();
    reconnectDelayMs = 800;
    if (ws) {
      try {
        ws.close();
      } catch {}
      ws = null;
    }
    setStatus("disconnected", "未连接");
  }

  function connect() {
    const url = urlRef?.value;
    if (!url) return;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    setStatus("connecting", "连接中…");

    try {
      ws = new WebSocket(url);
    } catch {
      setStatus("disconnected", "连接失败");
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectDelayMs = 800;
      setStatus("connected", "已连接");
    };

    ws.onclose = () => {
      setStatus("disconnected", "连接已断开");
      scheduleReconnect();
    };

    ws.onerror = () => {
      setStatus("disconnected", "连接失败");
      scheduleReconnect();
    };

    ws.onmessage = (ev) => {
      lastReceiveAt.value = Date.now();
      const raw = typeof ev.data === "string" ? ev.data : "";
      messageCount.value += 1;
      lastRaw.value = raw;
      let topic = "backend";
      let payloadText = raw;
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object") {
          if (typeof obj.topic === "string") topic = obj.topic;
          if (typeof obj.payload === "string") payloadText = obj.payload;
        }
      } catch {}
      const evt = parseEventMessage(topic, payloadText);
      onEvent?.(evt);
    };
  }

  return { status, statusText, lastReceiveAt, messageCount, lastRaw, connect, disconnect };
}
