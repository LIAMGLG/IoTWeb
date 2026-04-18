<template>
  <div class="card card--table">
    <div class="card__header">
      <div class="card__title">实时事件</div>
      <div class="card__actions">
        <input class="input input--mini" v-model="q" placeholder="搜索：设备/类型/ID" />
        <button class="chip" @click="exportJson">导出JSON</button>
      </div>
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
            <td><button class="rowBtn" @click="$emit('open', e)">查看</button></td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="7" style="color:rgba(232,244,255,0.5);padding:14px">等待数据…</td>
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

defineEmits(["open"]);

const q = ref("");

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