<template>
  <header class="topbar">
    <div class="brand">
      <div class="brand__mark"></div>
      <div class="brand__text">
        <div class="brand__title">绝缘子智能巡检系统</div>
        <div class="brand__subtitle">采集 · 识别 · 定位 · 传输 · 告警 · 分析</div>
      </div>
    </div>

    <nav class="nav">
      <button class="nav__item" :class="{ 'nav__item--active': view === 'overview' }" @click="$emit('changeView', 'overview')">
        总览
      </button>
      <button class="nav__item" :class="{ 'nav__item--active': view === 'realtime' }" @click="$emit('changeView', 'realtime')">
        实时监控
      </button>
      <button class="nav__item" :class="{ 'nav__item--active': view === 'events' }" @click="$emit('changeView', 'events')">
        告警中心
      </button>
      <button class="nav__item" :class="{ 'nav__item--active': view === 'history' }" @click="$emit('changeView', 'history')">
        历史分析
      </button>
      <button class="nav__item" :class="{ 'nav__item--active': view === 'devices' }" @click="$emit('changeView', 'devices')">
        设备管理
      </button>
    </nav>

    <div class="topbar__right">
      <div class="pill" aria-label="clock">{{ clock }}</div>
      <div class="pill pill--status" :data-status="status === 'connected' ? 'connected' : 'disconnected'">{{ statusText }}</div>
      <button class="btn" :class="demo ? 'btn--primary' : 'btn--ghost'" @click="$emit('toggleDemo')">
        {{ demo ? "退出演示" : "演示模式" }}
      </button>
    </div>
  </header>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { toLocalTime } from "../utils/time";

defineProps({
  view: { type: String, required: true },
  status: { type: String, required: true },
  statusText: { type: String, required: true },
  demo: { type: Boolean, required: true },
});

defineEmits(["changeView", "toggleDemo"]);

const clock = ref(toLocalTime(Date.now()));
let timer = null;

onMounted(() => {
  timer = setInterval(() => {
    clock.value = toLocalTime(Date.now());
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

