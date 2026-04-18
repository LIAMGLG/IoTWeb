<template>
  <div class="card card--mqtt">
    <div class="card__header">
      <div class="card__title">MQTT链路</div>
      <div class="card__actions">
        <button class="chip chip--active" @click="scrollInto">连接</button>
        <button class="chip" @click="clear">清空</button>
      </div>
    </div>

    <div ref="panelEl" class="conn">
      <div class="conn__row">
        <div class="conn__label">Broker(WebSocket)</div>
        <input class="input" v-model="cfg.brokerUrl.value" placeholder="wss://your-broker:8084/mqtt" />
      </div>
      <div class="conn__row conn__row--2">
        <div class="conn__col">
          <div class="conn__label">ClientID</div>
          <input class="input" v-model="cfg.clientId.value" placeholder="web-demo-001" />
        </div>
        <div class="conn__col">
          <div class="conn__label">订阅Topic</div>
          <input class="input" v-model="cfg.topic.value" placeholder="iot/insulator/events" />
        </div>
      </div>
      <div class="conn__row conn__row--2">
        <div class="conn__col">
          <div class="conn__label">用户名(可选)</div>
          <input class="input" v-model="cfg.username.value" />
        </div>
        <div class="conn__col">
          <div class="conn__label">密码(可选)</div>
          <input class="input" type="password" v-model="cfg.password.value" />
        </div>
      </div>
      <div class="conn__row conn__row--2">
        <div class="conn__col">
          <div class="conn__label">图片Topic(可选)</div>
          <input class="input" v-model="cfg.imgTopic.value" placeholder="iot/insulator/images" />
        </div>
        <div class="conn__col">
          <div class="conn__label">QoS</div>
          <select class="input" v-model.number="cfg.qos.value">
            <option :value="0">0</option>
            <option :value="1">1</option>
            <option :value="2">2</option>
          </select>
        </div>
      </div>
      <div class="conn__row conn__row--actions">
        <button class="btn btn--primary" @click="$emit('connect')">连接并订阅</button>
        <button class="btn" @click="$emit('disconnect')">断开</button>
        <div class="pill" style="display:flex;align-items:center;justify-content:center">{{ statusText }}</div>
      </div>
    </div>

    <div class="log">
      <div v-for="l in logs" :key="l.id" class="logLine">{{ l.text }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { toLocalTime } from "../utils/time";

defineProps({
  cfg: { type: Object, required: true },
  statusText: { type: String, required: true },
});

defineEmits(["connect", "disconnect"]);

const panelEl = ref(null);
const logs = ref([]);

function push(kind, msg) {
  const prefix = kind === "ok" ? "[OK]" : kind === "warn" ? "[WARN]" : kind === "err" ? "[ERR]" : "[INFO]";
  logs.value = [{ id: `${Date.now()}-${Math.random()}`, text: `${toLocalTime(Date.now())} ${prefix} ${msg}` }, ...logs.value].slice(0, 120);
}

function clear() {
  logs.value = [];
}

function scrollInto() {
  panelEl.value?.scrollIntoView({ behavior: "smooth", block: "center" });
}

defineExpose({ push });
</script>

