<template>
  <div class="card" style="grid-column: 1 / -1; height: 420px">
    <div class="card__header">
      <div class="card__title">告警趋势</div>
      <div class="card__actions">
        <button class="chip" :class="{ 'chip--active': chartVisible }" @click="toggleChart">ECharts</button>
      </div>
    </div>
    <div v-if="chartVisible" ref="chartEl" style="height: calc(100% - 48px); position: relative; z-index: 1"></div>
    <div v-else class="logLine" style="display:flex;align-items:center;justify-content:center;height:calc(100% - 48px)">点击 ECharts 按钮显示图表</div>
  </div>
</template>

<script setup>
import * as echarts from "echarts";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { toLocalTime } from "../utils/time";

const props = defineProps({
  events: { type: Array, required: true },
});

const chartEl = ref(null);
let chart = null;
const chartVisible = ref(false);

function toggleChart() {
  chartVisible.value = !chartVisible.value;
  if (chartVisible.value) {
    setTimeout(() => {
      if (chartEl.value && !chart) {
        chart = echarts.init(chartEl.value);
        render();
        window.addEventListener("resize", render);
      } else if (chart) {
        render();
      }
    }, 0);
  }
}

function buildOption() {
  const list = props.events.slice(0, 40).reverse();
  const labels = list.map((e) => toLocalTime(e.ts).slice(11, 19));
  const alarm = list.map((e) => (e.level === "alarm" ? 1 : 0));
  const warn = list.map((e) => (e.level === "warn" ? 1 : 0));
  const ok = list.map((e) => (e.level === "ok" ? 1 : 0));

  return {
    backgroundColor: "transparent",
    grid: { left: 40, right: 24, top: 26, bottom: 32 },
    tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { color: "rgba(232,244,255,0.7)" } },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { color: "rgba(232,244,255,0.55)" },
      axisLine: { lineStyle: { color: "rgba(0,215,255,0.18)" } },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: "rgba(232,244,255,0.55)" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
      axisLine: { lineStyle: { color: "rgba(0,215,255,0.18)" } },
    },
    series: [
      { name: "告警", type: "bar", stack: "a", data: alarm, itemStyle: { color: "rgba(255,77,109,0.9)" } },
      { name: "预警", type: "bar", stack: "a", data: warn, itemStyle: { color: "rgba(255,209,102,0.9)" } },
      { name: "正常", type: "bar", stack: "a", data: ok, itemStyle: { color: "rgba(50,224,255,0.75)" } },
    ],
  };
}

function render() {
  if (!chart) return;
  chart.setOption(buildOption(), true);
}

onMounted(() => {
  // 图表现在通过点击按钮初始化
});

watch(
  () => props.events.length,
  () => render(),
);

onUnmounted(() => {
  window.removeEventListener("resize", render);
  chart?.dispose();
  chart = null;
});
</script>

