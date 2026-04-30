<template>
  <div class="app">
    <TopBar :view="view" :status="headerStatus" :statusText="statusText" :demo="demo" @changeView="view = $event" @toggleDemo="toggleDemo" />

    <main class="main">
      <section v-show="view === 'overview'" class="grid">
        <KpiBar :onlineDevices="onlineDevices" :todayAlarms="todayAlarms" :latencyMs="lastLatencyMs" :latest="latest" />
        <FaultMap :events="events" :latest="latest" :activeEvent="activeEvent" />
        <SimpleEventTable :events="events" @open="openDrawer" />
      </section>

      <section
        v-show="view === 'realtime'"
        class="grid"
        style="grid-template-columns: 1fr; grid-template-rows: 1fr; grid-template-areas: 'table'"
      >
        <SimpleEventTable :events="events" @open="openDrawer" />
      </section>

      <section
        v-show="view === 'events'"
        class="grid"
        style="grid-template-columns: 1fr; grid-template-rows: 1fr; grid-template-areas: 'table'"
      >
        <EventTable :events="events" @open="openDrawer" @toggleState="handleToggleState" />
      </section>

      <section
        v-show="view === 'history'"
        class="grid"
        style="grid-template-columns: 1fr; grid-template-rows: 1fr; grid-template-areas: 'kpi'"
      >
        <AlarmTrend :events="events" />
      </section>

      <section
        v-show="view === 'devices'"
        class="grid"
        style="grid-template-columns: 1fr; grid-template-rows: 1fr; grid-template-areas: 'kpi'"
      >
        <div class="card" style="grid-column: 1 / -1; height: 100%">
          <div class="card__header">
            <div class="card__title">设备管理</div>
            <div class="card__actions">
              <button class="chip chip--active">在线 {{ onlineDevices.length }}</button>
            </div>
          </div>
          <div class="alarms" style="height: calc(100% - 48px)">
            <div v-for="d in onlineDevices" :key="d" class="alarmItem alarmItem--ok">
              <div class="alarmItem__bar"></div>
              <div>
                <div class="alarmItem__title">{{ d }}</div>
                <div class="alarmItem__meta">
                  <span>近5分钟活跃</span>
                  <span>{{ lastSeenText(d) }}</span>
                </div>
              </div>
            </div>
            <div v-if="!onlineDevices.length" class="logLine">暂无在线设备</div>
          </div>
        </div>
      </section>
    </main>

    <footer
      style="
        margin: 12px 18px 18px;
        padding: 10px 14px;
        border: 1px solid rgba(0, 215, 255, 0.12);
        border-radius: 12px;
        background: rgba(8, 20, 38, 0.72);
        color: rgba(232, 244, 255, 0.62);
        font-size: 12px;
        line-height: 1.7;
      "
    >
      本网页仅供项目演示与答辩展示使用，页面中的告警数据、图片与定位信息为演示回放内容，用于展示系统流程、界面交互与功能设计，不作为实时监测或生产运行依据。
    </footer>

    <EventDrawer :open="drawerOpen" :event="drawerEvent" :allEvents="events" @close="drawerOpen = false" @openSimilar="openSimilar" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";

import AlarmTrend from "./components/AlarmTrend.vue";
import EventDrawer from "./components/EventDrawer.vue";
import EventTable from "./components/EventTable.vue";
import SimpleEventTable from "./components/SimpleEventTable.vue";
import FaultMap from "./components/FaultMap.vue";
import KpiBar from "./components/KpiBar.vue";
import TopBar from "./components/TopBar.vue";
import { useEventStore } from "./composables/useEventStore";
import { useBackendStream } from "./composables/useBackendStream";
import { createDemoSeed } from "./utils/demoReplay";
import { toLocalTime } from "./utils/time";

const view = ref("overview");
const { events, addEvent, replaceEvents, onlineDevices, todayAlarms, latest, toggleState } = useEventStore();

const drawerOpen = ref(false);
const drawerEvent = ref(null);
const activeEvent = ref(null);

const demo = ref(false);

const lastLatencyMs = ref(null);
const lastSeenByDevice = ref({});

const defaultBackendUrl =
  String(import.meta.env.VITE_BACKEND_WS_URL ?? "").trim() ||
  (typeof window !== "undefined" && window.location.hostname === "localhost" ? "ws://localhost:8080" : "");

const backendUrl = ref(defaultBackendUrl);

function computeLatency(evt) {
  const created = evt?.ts ? new Date(evt.ts).getTime() : null;
  if (!created || Number.isNaN(created)) return null;
  const ms = Date.now() - created;
  if (ms < 0 || ms > 24 * 3600 * 1000) return null;
  return ms;
}

function onEvent(evt) {
  if (demo.value) return;
  addEvent(evt);
  lastLatencyMs.value = computeLatency(evt);
  lastSeenByDevice.value = { ...lastSeenByDevice.value, [evt.deviceId]: Date.now() };
}

const backend = useBackendStream({
  urlRef: backendUrl,
  onEvent,
});

const headerStatus = computed(() => {
  if (demo.value || !backendUrl.value) return "connected";
  return backend.status.value;
});

const statusText = computed(() => {
  if (demo.value) return "演示回放";
  if (!backendUrl.value) return "离线展示";
  return backend.statusText.value;
});

const lastReceiveText = computed(() => {
  const ts = backend.lastReceiveAt.value;
  if (!ts) return "--";
  return toLocalTime(ts);
});

const lastRawPreview = computed(() => {
  const s = backend.lastRaw.value || "";
  if (!s) return "--";
  return s.length > 180 ? s.slice(0, 180) + "…" : s;
});

function openDrawer(e) {
  drawerEvent.value = e;
  activeEvent.value = e; // 设置当前激活的事件，用于地图定位
  drawerOpen.value = true;
}

function openSimilar(e) {
  drawerEvent.value = e;
  activeEvent.value = e; // 设置当前激活的事件，用于地图定位
  drawerOpen.value = true;
}

function handleToggleState(eventId) {
  toggleState(eventId);
}

function rebuildLastSeen(list) {
  const next = {};
  (Array.isArray(list) ? list : []).forEach((evt) => {
    if (evt?.deviceId) next[evt.deviceId] = Date.now();
  });
  lastSeenByDevice.value = next;
}

function applyDemoSeed() {
  const seed = createDemoSeed(10);
  replaceEvents(seed);
  rebuildLastSeen(seed);
  activeEvent.value = seed[0] ?? null;
  if (drawerOpen.value) drawerEvent.value = seed[0] ?? null;
  lastLatencyMs.value = seed[0] ? computeLatency(seed[0]) : null;
}

function stopDemo() {
  return;
}

function startDemo() {
  stopDemo();
  backend.disconnect();
  applyDemoSeed();
}

function toggleDemo() {
  if (!demo.value) {
    demo.value = true;
    startDemo();
  } else {
    demo.value = false;
    stopDemo();
    if (backendUrl.value) {
      replaceEvents([]);
      rebuildLastSeen([]);
      lastLatencyMs.value = null;
      activeEvent.value = null;
      drawerEvent.value = null;
      backend.connect();
    }
  }
}

function lastSeenText(deviceId) {
  const ts = lastSeenByDevice.value?.[deviceId];
  if (!ts) return "--";
  return toLocalTime(ts);
}

onUnmounted(() => {
  stopDemo();
  backend.disconnect();
});

onMounted(() => {
  if (backendUrl.value) {
    backend.connect();
    return;
  }

  demo.value = true;
  startDemo();
});
</script>
