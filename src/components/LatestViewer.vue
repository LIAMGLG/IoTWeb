<template>
  <div class="card card--viewer">
    <div class="card__header">
      <div class="card__title">最新识别画面</div>
      <div class="card__actions">
        <button class="chip" :class="{ 'chip--active': overlayOn }" @click="$emit('toggleOverlay')">叠加</button>
        <button class="chip" :class="{ 'chip--active': splitOn }" @click="$emit('toggleSplit')">双视图</button>
        <button class="chip" @click="toggleFullScreen">全屏</button>
      </div>
    </div>

    <div class="viewer">
      <div ref="stageEl" class="viewer__stage">
        <img ref="mainImgEl" class="viewer__img" alt="最新画面" :src="imgSrc" @load="repaint" />
        <canvas ref="overlayEl" class="viewer__overlay"></canvas>
        <div class="viewer__badge">
          <span class="badge" :class="badgeClass">{{ badgeText }}</span>
          <span class="badge badge--info">{{ event?.faultType ?? "--" }}</span>
          <span class="badge badge--info">{{ scoreText }}</span>
        </div>
      </div>

      <div class="viewer__split" :class="{ 'viewer__split--hidden': !splitOn }">
        <div class="split__col">
          <div class="split__label">原图</div>
          <img class="split__img" alt="原图" :src="imgSrc" />
        </div>
        <div class="split__col">
          <div class="split__label">算法叠加</div>
          <div class="split__stack">
            <img ref="algImgEl" class="split__img" alt="算法叠加" :src="imgSrc" @load="repaint" />
            <canvas ref="overlay2El" class="split__overlay"></canvas>
          </div>
        </div>
      </div>

      <div class="viewer__meta">
        <div class="meta__item"><span class="meta__k">事件ID</span><span class="meta__v">{{ event?.id ?? "--" }}</span></div>
        <div class="meta__item"><span class="meta__k">设备</span><span class="meta__v">{{ event?.deviceId ?? "--" }}</span></div>
        <div class="meta__item"><span class="meta__k">时间</span><span class="meta__v">{{ timeText }}</span></div>
        <div class="meta__item"><span class="meta__k">定位</span><span class="meta__v">{{ locText }}</span></div>
        <div class="meta__item"><span class="meta__k">Topic</span><span class="meta__v">{{ event?.topic ?? "--" }}</span></div>
        <div class="meta__item"><span class="meta__k">等级</span><span class="meta__v">{{ levelText }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { prettyLevel } from "../utils/level";
import { toLocalTime } from "../utils/time";
import { drawBoxes, ensureCanvasSize } from "../utils/draw";

const props = defineProps({
  event: { type: Object, default: null },
  overlayOn: { type: Boolean, required: true },
  splitOn: { type: Boolean, required: true },
});

defineEmits(["toggleOverlay", "toggleSplit"]);

const stageEl = ref(null);
const mainImgEl = ref(null);
const algImgEl = ref(null);
const overlayEl = ref(null);
const overlay2El = ref(null);

const placeholderSvg = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1a30"/><stop offset="0.55" stop-color="#081426"/><stop offset="1" stop-color="#07111f"/></linearGradient><radialGradient id="r" cx="30%" cy="30%" r="70%"><stop offset="0" stop-color="#00d7ff" stop-opacity="0.25"/><stop offset="1" stop-color="#00d7ff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/><text x="50%" y="48%" fill="rgba(232,244,255,0.65)" font-size="28" font-family="ui-sans-serif,system-ui" text-anchor="middle">等待实时图片</text><text x="50%" y="55%" fill="rgba(232,244,255,0.45)" font-size="16" font-family="ui-sans-serif,system-ui" text-anchor="middle">端侧上传 imageBase64 或 imageUrl</text></svg>`,
)}`;

const imgSrc = computed(() => props.event?.imageDataUrl ?? props.event?.imageUrl ?? placeholderSvg);

const scoreText = computed(() => {
  const c = props.event?.confidence;
  if (typeof c !== "number") return "--";
  const v = Math.max(0, Math.min(1, c));
  return `置信度 ${Math.round(v * 100)}%`;
});

const badgeText = computed(() => {
  const lv = props.event?.level ?? "warn";
  return lv === "alarm" ? "ALARM" : lv === "warn" ? "WARN" : "NORMAL";
});

const badgeClass = computed(() => {
  const lv = props.event?.level ?? "warn";
  return lv === "alarm" ? "badge--alarm" : lv === "warn" ? "badge--warn" : "badge--ok";
});

const timeText = computed(() => (props.event?.ts ? toLocalTime(props.event.ts) : "--"));
const levelText = computed(() => prettyLevel(props.event?.level ?? "--"));
const locText = computed(() => props.event?.locName ?? (props.event?.lat != null ? `${props.event.lat},${props.event.lng}` : "--"));

async function repaint() {
  await nextTick();
  const e = props.event;
  if (!e) return;
  if (!mainImgEl.value || !overlayEl.value) return;
  ensureCanvasSize(overlayEl.value, mainImgEl.value);
  drawBoxes({ canvas: overlayEl.value, imgEl: mainImgEl.value, boxes: e.bboxes, enabled: props.overlayOn, level: e.level });
  if (algImgEl.value && overlay2El.value) {
    ensureCanvasSize(overlay2El.value, algImgEl.value);
    drawBoxes({ canvas: overlay2El.value, imgEl: algImgEl.value, boxes: e.bboxes, enabled: props.overlayOn, level: e.level });
  }
}

async function toggleFullScreen() {
  const target = stageEl.value;
  if (!target) return;
  if (!document.fullscreenElement) await target.requestFullscreen();
  else await document.exitFullscreen();
}

watch(
  () => [props.event?.id, props.overlayOn, props.splitOn],
  () => repaint(),
);

onMounted(() => {
  window.addEventListener("resize", repaint);
});

onUnmounted(() => {
  window.removeEventListener("resize", repaint);
});
</script>
