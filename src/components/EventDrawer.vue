<template>
  <aside class="drawer" :class="{ 'drawer--hidden': !open }">
    <div class="drawer__header">
      <div class="drawer__title">事件详情</div>
      <button class="btn btn--ghost" @click="$emit('close')">关闭</button>
    </div>
    <div class="drawer__body">
      <div class="drawer__section">
        <div class="drawer__kv">
          <div class="kv"><div class="kv__k">事件ID</div><div class="kv__v">{{ event?.id ?? "--" }}</div></div>
          <div class="kv"><div class="kv__k">时间</div><div class="kv__v">{{ timeText }}</div></div>
          <div class="kv"><div class="kv__k">设备</div><div class="kv__v">{{ event?.deviceId ?? "--" }}</div></div>
          <div class="kv"><div class="kv__k">类型</div><div class="kv__v">{{ event?.faultType ?? "--" }}</div></div>
          <div class="kv"><div class="kv__k">等级</div><div class="kv__v">{{ levelText }}</div></div>
          <div class="kv"><div class="kv__k">置信度</div><div class="kv__v">{{ scoreText }}</div></div>
          <div class="kv"><div class="kv__k">定位</div><div class="kv__v">{{ locText }}</div></div>
          <div class="kv"><div class="kv__k">Topic</div><div class="kv__v">{{ event?.topic ?? "--" }}</div></div>
        </div>
      </div>
      <div class="drawer__section">
        <div class="drawer__label">图片</div>
        <div class="drawer__imgWrap">
          <img ref="imgEl" class="drawer__img" alt="事件图片" :src="imgSrc" @load="repaint" />
          <canvas ref="canvasEl" class="drawer__overlay"></canvas>
        </div>
      </div>
      <div class="drawer__section">
        <div class="drawer__label">原始报文</div>
        <pre class="drawer__pre">{{ event?.rawText ?? "--" }}</pre>
      </div>
      <div class="drawer__section">
        <div class="drawer__label">历史同类告警 ({{ similarEvents.length }})</div>
        <div class="similarList">
          <div v-for="e in similarEvents" :key="e.id" class="similarItem" :class="'similarItem--' + e.level" @click="$emit('openSimilar', e)">
            <div class="similarItem__time">{{ toLocalTime(e.ts) }}</div>
            <div class="similarItem__type">{{ e.faultType }}</div>
            <div class="similarItem__level">{{ levelTextSimple(e.level) }}</div>
          </div>
          <div v-if="!similarEvents.length" class="logLine">暂无同类告警</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { prettyLevel } from "../utils/level";
import { toLocalTime } from "../utils/time";
import { drawBoxes, ensureCanvasSize } from "../utils/draw";

const props = defineProps({
  open: { type: Boolean, required: true },
  event: { type: Object, default: null },
  allEvents: { type: Array, default: () => [] },
});

const emit = defineEmits(["close", "openSimilar"]);

const imgEl = ref(null);
const canvasEl = ref(null);

const placeholderSvg = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500"><rect width="100%" height="100%" fill="#07111f"/><text x="50%" y="50%" fill="rgba(232,244,255,0.55)" font-size="18" font-family="ui-sans-serif,system-ui" text-anchor="middle">无图片</text></svg>`,
)}`;

const imgSrc = computed(() => props.event?.imageDataUrl ?? props.event?.imageUrl ?? placeholderSvg);
const timeText = computed(() => (props.event?.ts ? toLocalTime(props.event.ts) : "--"));
const levelText = computed(() => prettyLevel(props.event?.level ?? "--"));
const scoreText = computed(() => {
  const c = props.event?.confidence;
  if (typeof c !== "number") return "--";
  const v = Math.max(0, Math.min(1, c));
  return `${Math.round(v * 100)}%`;
});
const locText = computed(() => props.event?.locName ?? (props.event?.lat != null ? `${props.event.lat},${props.event.lng}` : "--"));

const similarEvents = computed(() => {
  if (!props.event?.faultType) return [];
  return props.allEvents
    .filter((e) => e.id !== props.event.id && e.faultType === props.event.faultType)
    .slice(0, 10);
});

function levelTextSimple(lv) {
  return lv === "alarm" ? "告警" : lv === "warn" ? "预警" : "正常";
}

async function repaint() {
  await nextTick();
  if (!props.open) return;
  if (!props.event) return;
  if (!imgEl.value || !canvasEl.value) return;
  ensureCanvasSize(canvasEl.value, imgEl.value);
  drawBoxes({ canvas: canvasEl.value, imgEl: imgEl.value, boxes: props.event.bboxes, enabled: true, level: props.event.level });
}

function onKeydown(e) {
  if (e.key === "Escape") {
    if (props.open) {
      e.preventDefault();
      e.stopPropagation();
      emit("close");
    }
  }
}

watch(
  () => [props.open, props.event?.id],
  () => repaint(),
);

onMounted(() => {
  window.addEventListener("resize", repaint);
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("resize", repaint);
  document.removeEventListener("keydown", onKeydown);
});
</script>
