<template>
  <div class="card card--kpi">
    <div class="kpis">
      <div class="kpi">
        <div class="kpi__label">在线设备</div>
        <div class="kpi__value">{{ onlineCount }}</div>
        <div class="kpi__hint">{{ onlineHint }}</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">今日告警</div>
        <div class="kpi__value">{{ todayAlarms }}</div>
        <div class="kpi__hint">按事件计数</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">端到端时延</div>
        <div class="kpi__value">{{ latencyText }}</div>
        <div class="kpi__hint">基于 ts 与接收时间</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">最新识别</div>
        <div class="kpi__value">{{ latestScore }}</div>
        <div class="kpi__hint">{{ latestHint }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { prettyLevel } from "../utils/level";

const props = defineProps({
  onlineDevices: { type: Array, required: true },
  todayAlarms: { type: Number, required: true },
  latencyMs: { type: Number, default: null },
  latest: { type: Object, default: null },
});

const onlineCount = computed(() => props.onlineDevices.length);
const onlineHint = computed(() => {
  if (!props.onlineDevices.length) return "近5分钟活跃";
  const s = props.onlineDevices.slice(0, 2).join(", ");
  return props.onlineDevices.length > 2 ? `活跃：${s}…` : `活跃：${s}`;
});

const latencyText = computed(() => (props.latencyMs == null ? "--" : `${Math.round(props.latencyMs)}ms`));

const latestScore = computed(() => {
  const c = props.latest?.confidence;
  if (typeof c !== "number") return "--";
  const v = Math.max(0, Math.min(1, c));
  return `${Math.round(v * 100)}%`;
});

const latestHint = computed(() => {
  if (!props.latest) return "等待数据";
  return `${props.latest.faultType} · ${prettyLevel(props.latest.level)}`;
});
</script>

