<template>
  <div class="app">
    <TopBar :view="view" :status="backend.status.value" :statusText="statusText" :demo="demo" @changeView="view = $event" @toggleDemo="toggleDemo" />

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
import { toLocalTime } from "./utils/time";

const view = ref("overview");
const { events, addEvent, onlineDevices, todayAlarms, latest, toggleState } = useEventStore();

const drawerOpen = ref(false);
const drawerEvent = ref(null);
const activeEvent = ref(null);

const demo = ref(false);
let demoTimer = null;

const lastLatencyMs = ref(null);
const lastSeenByDevice = ref({});

const backendUrl = ref("ws://localhost:8080");

function computeLatency(evt) {
  const created = evt?.ts ? new Date(evt.ts).getTime() : null;
  if (!created || Number.isNaN(created)) return null;
  const ms = Date.now() - created;
  if (ms < 0 || ms > 24 * 3600 * 1000) return null;
  return ms;
}

function onEvent(evt) {
  addEvent(evt);
  lastLatencyMs.value = computeLatency(evt);
  lastSeenByDevice.value = { ...lastSeenByDevice.value, [evt.deviceId]: Date.now() };
}

const backend = useBackendStream({
  urlRef: backendUrl,
  onEvent,
});

onMounted(() => {
  backend.connect();
});

const statusText = computed(() => {
  if (demo.value) return "演示中";
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

function stopDemo() {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
}

function randomId() {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
}

function startDemo() {
  stopDemo();
  demoTimer = setInterval(() => {
    const lvPick = Math.random();
    const level = lvPick > 0.82 ? "alarm" : lvPick > 0.48 ? "warn" : "ok";
    const defectTypes = ["污闪风险", "伞裙破损", "裂纹", "金具锈蚀", "异物附着", "放电痕迹"];
    const devices = ["edge-001", "edge-002", "edge-003"];
    const ti = Math.max(1, Math.min(9, Math.floor(Math.random() * 9) + 1));
    const evt = {
      id: randomId(),
      topic: "demo",
      ts: new Date(Date.now() - Math.floor(Math.random() * 800)).toISOString(),
      receivedAt: new Date().toISOString(),
      deviceId: devices[Math.floor(Math.random() * devices.length)],
      faultType: defectTypes[Math.floor(Math.random() * defectTypes.length)],
      level,
      confidence: Math.max(0, Math.min(1, 0.55 + Math.random() * 0.44)),
      locName: `线路A-T${ti}`,
      lat: 30.56 + Math.random() * 0.02,
      lng: 114.31 + Math.random() * 0.02,
      imageUrl: null,
      imageDataUrl: null,
      bboxes: [
        {
          left: 0.32 + Math.random() * 0.18,
          top: 0.24 + Math.random() * 0.2,
          right: 0.64 + Math.random() * 0.16,
          bottom: 0.62 + Math.random() * 0.2,
          kind: "norm",
          label: "缺陷",
          score: Math.max(0, Math.min(1, 0.6 + Math.random() * 0.35)),
        },
      ],
      rawText: JSON.stringify({ demo: true }, null, 2),
      rawObj: null,
    };
    onEvent(evt);
  }, 2200);
}

function toggleDemo() {
  if (!demo.value) {
    demo.value = true;
    startDemo();
  } else {
    demo.value = false;
    stopDemo();
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
</script>
