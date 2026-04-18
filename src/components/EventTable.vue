<template>
  <div class="card card--table">
    <div class="card__header">
      <div class="card__title">告警中心</div>
      <div class="card__actions">
        <input class="input input--mini" v-model="q" placeholder="搜索：设备/类型/ID" />
        <button class="chip" @click="exportJson">导出JSON</button>
      </div>
    </div>
    <div class="statBar">
      <div class="statItem">
        <div class="statItem__val">{{ stats.todayTotal }}</div>
        <div class="statItem__label">今日告警</div>
      </div>
      <div class="statItem">
        <div class="statItem__val statItem__val--warn">{{ stats.unprocessed }}</div>
        <div class="statItem__label">未处理</div>
      </div>
      <div class="statItem">
        <div class="statItem__val statItem__val--alarm">{{ stats.highRisk }}</div>
        <div class="statItem__label">高危(告警)</div>
      </div>
      <div class="statItem">
        <div class="statItem__val">{{ stats.avgLatency }}</div>
        <div class="statItem__label">平均时延</div>
      </div>
    </div>
    <div class="filterBar">
      <span class="filterBar__label">等级:</span>
      <button class="chip" :class="{ 'chip--active': filterLevel === 'all' }" @click="filterLevel = 'all'">全部</button>
      <button class="chip" :class="{ 'chip--active': filterLevel === 'alarm' }" @click="filterLevel = 'alarm'">告警</button>
      <button class="chip" :class="{ 'chip--active': filterLevel === 'warn' }" @click="filterLevel = 'warn'">预警</button>
      <button class="chip" :class="{ 'chip--active': filterLevel === 'ok' }" @click="filterLevel = 'ok'">正常</button>
      <span class="filterBar__sep"></span>
      <span class="filterBar__label">设备:</span>
      <select class="input input--mini" v-model="filterDevice">
        <option value="">全部</option>
        <option v-for="d in devices" :key="d" :value="d">{{ d }}</option>
      </select>
      <span class="filterBar__sep"></span>
      <button class="chip chip--text" :class="{ 'chip--active': onlyUnprocessed }" @click="onlyUnprocessed = !onlyUnprocessed">
        只看未处理
      </button>
    </div>
    <div class="tableWrap">
      <table class="table">
        <thead>
          <tr>
            <th>时间</th>
            <th>设备</th>
            <th>缺陷类型</th>
            <th>等级</th>
            <th>置信度</th>
            <th>定位</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in list" :key="e.id">
            <td>{{ toLocalTime(e.ts) }}</td>
            <td>{{ e.deviceId }}</td>
            <td>{{ e.faultType }}</td>
            <td v-html="levelTag(e.level)"></td>
            <td>{{ scoreText(e.confidence) }}</td>
            <td>{{ e.locName && e.locName !== '--' ? e.locName : e.lat != null ? `${e.lat.toFixed(5)},${e.lng.toFixed(5)}` : '--' }}</td>
            <td>
              <span class="tag" :class="e.state ? 'tag--ok' : 'tag--warn'">
                {{ e.state ? '已处理' : '待处理' }}
              </span>
            </td>
            <td>
              <button class="rowBtn" @click="$emit('open', e)">查看</button>
              <button class="rowBtn rowBtn--secondary" @click="$emit('toggleState', e.id)">
                {{ e.state ? '标记待处理' : '标记已处理' }}
              </button>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="8" style="color:rgba(232,244,255,0.5);padding:14px">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { toLocalTime } from "../utils/time";

const props = defineProps({
  events: { type: Array, required: true },
});

defineEmits(["open", "toggleState"]);

const q = ref("");
const filterLevel = ref("all");
const filterDevice = ref("");
const onlyUnprocessed = ref(false);

const devices = computed(() => {
  const seen = new Set();
  props.events.forEach((e) => {
    if (e.deviceId) seen.add(e.deviceId);
  });
  return [...seen];
});

const stats = computed(() => {
  const today = new Date().toDateString();
  const todayEvents = props.events.filter((e) => new Date(e.receivedAt).toDateString() === today);
  const todayTotal = todayEvents.filter((e) => e.level === "alarm" || e.level === "warn").length;
  const highRisk = todayEvents.filter((e) => e.level === "alarm").length;
  const unprocessed = props.events.filter((e) => !e.state && (e.level === "alarm" || e.level === "warn")).length;
  const latencies = props.events
    .map((e) => {
      const created = e?.ts ? new Date(e.ts).getTime() : null;
      if (!created || Number.isNaN(created)) return null;
      const ms = Date.now() - created;
      if (ms < 0 || ms > 24 * 3600 * 1000) return null;
      return ms;
    })
    .filter((v) => v !== null);
  const avgLatency = latencies.length ? `${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms` : "--";
  return { todayTotal, unprocessed, highRisk, avgLatency };
});

const list = computed(() => {
  const s = q.value.trim().toLowerCase();
  return props.events
    .filter((e) => {
      if (!s) return true;
      return (
        String(e.deviceId).toLowerCase().includes(s) ||
        String(e.faultType).toLowerCase().includes(s) ||
        String(e.id).toLowerCase().includes(s)
      );
    })
    .filter((e) => {
      if (filterLevel.value !== "all" && e.level !== filterLevel.value) return false;
      if (filterDevice.value && e.deviceId !== filterDevice.value) return false;
      if (onlyUnprocessed.value && e.state) return false;
      return true;
    })
    .slice(0, 80);
});

function scoreText(v) {
  if (typeof v !== "number") return "--";
  const c = Math.max(0, Math.min(1, v));
  return `${Math.round(c * 100)}%`;
}

function levelTag(lv) {
  const cn = lv === "alarm" ? "tag tag--alarm" : lv === "warn" ? "tag tag--warn" : "tag tag--ok";
  const txt = lv === "alarm" ? "告警" : lv === "warn" ? "预警" : "正常";
  return `<span class="${cn}">${txt}</span>`;
}

function exportJson() {
  const data = JSON.stringify(props.events.slice(0, 200), null, 2);
  const blob = new Blob([data], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `events-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
</script>

