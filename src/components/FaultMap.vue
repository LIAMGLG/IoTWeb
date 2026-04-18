<template>
  <div class="card card--map">
    <div class="card__header">
      <div class="card__title">故障定位</div>
      <div class="card__actions">
        <button class="chip" :class="{ 'chip--active': mode === 'map' }" @click="mode = 'map'">地图</button>
        <button class="chip" :class="{ 'chip--active': mode === 'info' }" @click="mode = 'info'">信息</button>
      </div>
    </div>
    <div class="map">
      <div v-show="mode === 'map'" class="leafletMapWrap">
        <div v-show="!tileError" ref="mapEl" class="leafletMapCanvas"></div>
        <div v-if="tileError" class="fallbackMap">
          <svg viewBox="0 0 760 360" preserveAspectRatio="none" class="fallbackMap__svg">
            <defs>
              <linearGradient id="gridGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="rgba(0,215,255,0.14)" />
                <stop offset="1" stop-color="rgba(0,215,255,0.04)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="760" height="360" fill="rgba(0,0,0,0.18)" />
            <g opacity="0.6">
              <path
                v-for="x in 12"
                :key="'x'+x"
                :d="`M ${x * (760 / 12)} 0 L ${x * (760 / 12)} 360`"
                stroke="url(#gridGlow)"
                stroke-width="1"
              />
              <path
                v-for="y in 8"
                :key="'y'+y"
                :d="`M 0 ${y * (360 / 8)} L 760 ${y * (360 / 8)}`"
                stroke="url(#gridGlow)"
                stroke-width="1"
              />
            </g>

            <g v-for="p in fallbackPoints" :key="p.id">
              <circle :cx="p.x" :cy="p.y" :r="p.isLatest ? 8 : 6" :fill="p.color" opacity="0.92" />
              <circle v-if="p.isLatest" :cx="p.x" :cy="p.y" r="14" :fill="p.color" opacity="0.12" />
            </g>

            <text x="16" y="26" fill="rgba(232,244,255,0.72)" font-size="12">离线定位示意（无外网底图）</text>
            <text x="16" y="46" fill="rgba(232,244,255,0.5)" font-size="11">按经纬度相对位置投影，适合比赛演示</text>
          </svg>
          <div class="fallbackMap__hint">底图加载失败：当前网络无法访问在线瓦片</div>
        </div>
      </div>
      <div v-show="mode === 'info'" class="coords">
        <div class="coords__row">
          <div class="coords__label">位置名称</div>
          <div class="coords__value">{{ event?.locName ?? "--" }}</div>
        </div>
        <div class="coords__row">
          <div class="coords__label">经纬度</div>
          <div class="coords__value">
            {{ event?.lat != null && event?.lng != null ? `${event.lng.toFixed(6)}, ${event.lat.toFixed(6)}` : "--" }}
          </div>
        </div>
        <div class="coords__row">
          <div class="coords__label">设备</div>
          <div class="coords__value">{{ event?.deviceId ?? "--" }}</div>
        </div>
        <div class="coords__row">
          <div class="coords__label">缺陷</div>
          <div class="coords__value">{{ event?.faultType ?? "--" }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import L from "leaflet";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
  events: { type: Array, required: true },
  latest: { type: Object, default: null },
  activeEvent: { type: Object, default: null },
});

const mapEl = ref(null);
const mode = ref("map");
const tileError = ref(false);
const useGcj02 = ref(false);

let map = null;
let markers = [];
let latestMarker = null;
let polylines = [];

const event = computed(() => props.latest);

function colorByLevel(lv) {
  if (lv === "alarm") return "rgba(255,77,109,0.95)";
  if (lv === "warn") return "rgba(255,209,102,0.95)";
  return "rgba(50,224,255,0.92)";
}

function normalizeLevel(lv) {
  if (lv === "alarm" || lv === "warn" || lv === "ok") return lv;
  return "warn";
}

function createDivIcon(level, isLatest) {
  const lv = normalizeLevel(level);
  const size = isLatest ? 18 : 14;
  const cls = `mapMarker__pin mapMarker__pin--${lv} ${isLatest ? "mapMarker__pin--latest" : ""}`;
  return L.divIcon({
    className: "mapMarker",
    html: `<div class="${cls}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function wgs84ToGcj02(lat, lng) {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  const pi = Math.PI;
  const outOfChina = (lat, lng) => lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  const transformLat = (x, y) => {
    let ret =
      -100.0 +
      2.0 * x +
      3.0 * y +
      0.2 * y * y +
      0.1 * x * y +
      0.2 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * pi) + 40.0 * Math.sin((y / 3.0) * pi)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * pi) + 320.0 * Math.sin((y * pi) / 30.0)) * 2.0) / 3.0;
    return ret;
  };
  const transformLng = (x, y) => {
    let ret =
      300.0 +
      x +
      2.0 * y +
      0.1 * x * x +
      0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * pi) + 40.0 * Math.sin((x / 3.0) * pi)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * pi) + 300.0 * Math.sin((x / 30.0) * pi)) * 2.0) / 3.0;
    return ret;
  };

  if (outOfChina(lat, lng)) return { lat, lng };
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * pi;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * pi);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * pi);
  return { lat: lat + dLat, lng: lng + dLng };
}

function toNumber(x) {
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(x)) {
    const n = Number(x[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapLatLng(lat, lng) {
  const la = toNumber(lat);
  const ln = toNumber(lng);
  if (la == null || ln == null) return null;
  if (!useGcj02.value) return { lat, lng };
  return wgs84ToGcj02(la, ln);
}

const fallbackPoints = computed(() => {
  const pts = props.events
    .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
    .slice(0, 80);
  if (!pts.length) return [];

  const minLat = Math.min(...pts.map((p) => p.lat));
  const maxLat = Math.max(...pts.map((p) => p.lat));
  const minLng = Math.min(...pts.map((p) => p.lng));
  const maxLng = Math.max(...pts.map((p) => p.lng));
  const dx = Math.max(1e-9, maxLng - minLng);
  const dy = Math.max(1e-9, maxLat - minLat);

  const latestId = props.latest?.id ?? null;
  return pts.map((p) => {
    const x = 40 + ((p.lng - minLng) / dx) * (760 - 80);
    const y = 50 + (1 - (p.lat - minLat) / dy) * (360 - 90);
    return {
      id: p.id,
      x,
      y,
      color: colorByLevel(p.level),
      isLatest: latestId && p.id === latestId,
    };
  });
});

function rebuildMarkers() {
  if (!map) return;
  markers.forEach((m) => m.remove());
  markers = [];
  if (latestMarker) {
    latestMarker.remove();
    latestMarker = null;
  }
  polylines.forEach((p) => p.remove());
  polylines = [];
  
  // 按设备分组事件
  const eventsByDevice = props.events
    .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
    .reduce((acc, e) => {
      if (!acc[e.deviceId]) acc[e.deviceId] = [];
      acc[e.deviceId].push(e);
      return acc;
    }, {});
  
  // 为每个设备创建轨迹和标记
  Object.entries(eventsByDevice).forEach(([deviceId, deviceEvents]) => {
    // 按时间排序（最新的在前）
    const sortedEvents = deviceEvents
      .sort((a, b) => new Date(b.ts || b.receivedAt) - new Date(a.ts || a.receivedAt))
      .slice(0, 50); // 每个设备最多显示50个点
    
    // 创建轨迹线
    if (sortedEvents.length > 1) {
      const points = [];
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const current = sortedEvents[i];
        const next = sortedEvents[i + 1];
        
        // 检查时间差是否不超过一天
        const currentTime = new Date(current.ts || current.receivedAt).getTime();
        const nextTime = new Date(next.ts || next.receivedAt).getTime();
        const timeDiff = currentTime - nextTime;
        
        if (timeDiff <= 24 * 60 * 60 * 1000) { // 不超过一天
          const currentLL = mapLatLng(current.lat, current.lng);
          const nextLL = mapLatLng(next.lat, next.lng);
          if (currentLL && nextLL) {
            points.push([currentLL.lat, currentLL.lng]);
          }
        }
      }
      
      if (points.length > 1) {
        const polyline = L.polyline(points, {
          color: colorByLevel(sortedEvents[0].level),
          weight: 2,
          opacity: 0.6,
          smoothFactor: 1
        }).addTo(map);
        polylines.push(polyline);
      }
    }
    
    // 创建标记
    sortedEvents.forEach((e) => {
      const isLatest = props.latest?.id === e.id;
      const ll = mapLatLng(e.lat, e.lng);
      if (!ll) return;
      const m = L.marker([ll.lat, ll.lng], { icon: createDivIcon(e.level, isLatest) });
      const html = `<div style="font-family:ui-sans-serif,system-ui;font-size:12px;color:#0b1220"><b>${escapeHtml(
        e.faultType,
      )}</b><div>${escapeHtml(e.deviceId)}</div><div>${escapeHtml(e.locName ?? "--")}</div></div>`;
      m.bindPopup(html);
      m.addTo(map);
      markers.push(m);
    });
  });

  const latestPoint = event.value;
  const targetPoint = props.activeEvent || latestPoint;
  
  if (targetPoint?.lat != null && targetPoint?.lng != null) {
    const ll = mapLatLng(targetPoint.lat, targetPoint.lng);
    if (ll) {
      map.setView([ll.lat, ll.lng], 15, { animate: true });
      latestMarker = L.marker([ll.lat, ll.lng], { icon: createDivIcon(targetPoint.level, true) }).addTo(map);
    }
  } else if (markers.length) {
    const fg = L.featureGroup(markers);
    map.fitBounds(fg.getBounds().pad(0.2), { animate: true });
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

onMounted(() => {
  map = L.map(mapEl.value, { zoomControl: false, attributionControl: false });
  map.setView([30.56, 114.31], 13);
  const tdtKey = String(import.meta.env.VITE_TDT_KEY ?? "").trim();
  const tdtStyle = String(import.meta.env.VITE_TDT_STYLE ?? "vec").trim().toLowerCase();

  const onTileError = () => {
    tileError.value = true;
  };

  if (tdtKey) {
    useGcj02.value = true;
    const baseLayer = tdtStyle === "img" ? "img" : "vec";
    const labelLayer = tdtStyle === "img" ? "cia" : "cva";

    const baseUrl = `https://t{s}.tianditu.gov.cn/${baseLayer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${baseLayer}&STYLE=default&TILEMATRIXSET=w&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=tiles&tk=${tdtKey}`;
    const labelUrl = `https://t{s}.tianditu.gov.cn/${labelLayer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${labelLayer}&STYLE=default&TILEMATRIXSET=w&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=tiles&tk=${tdtKey}`;

    const baseTiles = L.tileLayer(baseUrl, { maxZoom: 18, minZoom: 1, subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"] });
    const labelTiles = L.tileLayer(labelUrl, { maxZoom: 18, minZoom: 1, subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"] });

    baseTiles.on("tileerror", onTileError);
    labelTiles.on("tileerror", onTileError);
    baseTiles.addTo(map);
    labelTiles.addTo(map);
  } else {
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 });
    tiles.on("tileerror", onTileError);
    tiles.addTo(map);
  }
  rebuildMarkers();
  setTimeout(() => {
    try {
      map?.invalidateSize();
    } catch {}
  }, 0);
});

watch(
  () => [props.events.length, props.latest?.id, props.activeEvent?.id],
  () => rebuildMarkers(),
);

watch(
  () => [props.latest?.lat, props.latest?.lng, props.latest?.level, props.activeEvent?.lat, props.activeEvent?.lng, props.activeEvent?.level],
  () => rebuildMarkers(),
);

watch(
  () => props.events,
  () => rebuildMarkers(),
  { deep: true },
);

watch(
  () => mode.value,
  async (v) => {
    if (v !== "map") return;
    await nextTick();
    setTimeout(() => {
      try {
        map?.invalidateSize();
      } catch {}
    }, 0);
  },
);

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>
