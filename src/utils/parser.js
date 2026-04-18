import { normalizeLevel } from "./level";
import { toIso } from "./time";

function safeJsonParse(txt) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function asNumber(x) {
  if (Array.isArray(x)) {
    const first = x[0];
    const n = typeof first === "number" ? first : Number(first);
    return Number.isFinite(n) ? n : null;
  }
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : null;
}

function pickCoordPair(flat) {
  const list =
    flat?.latlng ??
    flat?.latLng ??
    flat?.coord ??
    flat?.coords ??
    flat?.gps ??
    flat?.location ??
    flat?.position ??
    null;
  if (Array.isArray(list) && list.length >= 2) {
    const lat = asNumber(list[0]);
    const lng = asNumber(list[1]);
    if (lat != null && lng != null) return { lat, lng };
  }
  if (typeof list === "string" && list.includes(",")) {
    const [a, b] = list.split(",").map((s) => s.trim());
    const lat = asNumber(a);
    const lng = asNumber(b);
    if (lat != null && lng != null) return { lat, lng };
  }
  return { lat: null, lng: null };
}

function randomId() {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
}

function parseImageField(obj) {
  const url = obj?.imageUrl ?? obj?.imgUrl ?? obj?.url ?? obj?.image_url ?? obj?.image ?? obj?.img ?? null;
  if (typeof url === "string" && url.startsWith("http")) return { imageUrl: url, imageDataUrl: null };
  if (typeof url === "string" && url.startsWith("data:image/")) return { imageUrl: null, imageDataUrl: url };

  const b64 = obj?.imageBase64 ?? obj?.imgBase64 ?? obj?.base64 ?? obj?.jpgBase64 ?? obj?.pngBase64 ?? null;
  if (typeof b64 === "string" && b64.length > 80) {
    const clean = b64.trim();
    if (clean.startsWith("data:image/")) return { imageUrl: null, imageDataUrl: clean };
    return { imageUrl: null, imageDataUrl: `data:image/jpeg;base64,${clean}` };
  }
  return { imageUrl: null, imageDataUrl: null };
}

function flattenIoTDA(js) {
  const services = Array.isArray(js?.services) ? js.services : null;
  const first = services?.[0];
  const props = first?.properties && typeof first.properties === "object" ? first.properties : null;
  const content = js?.content;
  const notifyServices = Array.isArray(js?.notify_data?.body?.services) ? js.notify_data.body.services : null;
  const notifyFirst = notifyServices?.[0];
  const notifyProps =
    notifyFirst?.properties && typeof notifyFirst.properties === "object" ? notifyFirst.properties : null;

  const bodyServices = Array.isArray(js?.body?.services) ? js.body.services : null;
  const bodyFirst = bodyServices?.[0];
  const bodyProps = bodyFirst?.properties && typeof bodyFirst.properties === "object" ? bodyFirst.properties : null;

  if (props) return { ...js, ...props };
  if (notifyProps) return { ...js, ...notifyProps, device_id: js?.notify_data?.header?.device_id };
  if (bodyProps) return { ...js, ...bodyProps };
  if (typeof content === "object" && content) return { ...js, ...content };
  if (typeof content === "string") {
    const inner = safeJsonParse(content);
    if (inner && typeof inner === "object") return { ...js, ...inner };
  }
  return js;
}

function normalizeBoxes(payload) {
  const boxes = payload?.bboxes ?? payload?.boxes ?? payload?.detections ?? payload?.objects ?? payload?.defects ?? null;
  if (!boxes) return [];
  const arr = Array.isArray(boxes) ? boxes : [];
  return arr
    .map((b) => {
      if (!b || typeof b !== "object") return null;
      const label = b.label ?? b.type ?? b.name ?? "";
      const score = asNumber(b.score ?? b.confidence ?? b.prob);
      const left = asNumber(b.left ?? b.x ?? b.xmin);
      const top = asNumber(b.top ?? b.y ?? b.ymin);
      const right = asNumber(b.right ?? b.xmax ?? (left != null && asNumber(b.w) != null ? left + asNumber(b.w) : null));
      const bottom = asNumber(b.bottom ?? b.ymax ?? (top != null && asNumber(b.h) != null ? top + asNumber(b.h) : null));
      if (left == null || top == null || right == null || bottom == null) return null;
      const kind =
        left <= 1 && top <= 1 && right <= 1 && bottom <= 1 && left >= 0 && top >= 0 && right >= 0 && bottom >= 0 ? "norm" : "px";
      return { left, top, right, bottom, kind, label: String(label), score };
    })
    .filter(Boolean);
}

export function parseEventMessage(topic, payloadText) {
  const js = safeJsonParse(payloadText);
  if (js && typeof js === "object") {
    const flat = flattenIoTDA(js);
    const ts = flat.ts ?? flat.time ?? flat.timestamp ?? flat.datetime ?? flat.t ?? null;
    const eventId = flat.eventId ?? flat.id ?? flat.event_id ?? flat.uuid ?? flat.request_id ?? null;
    const deviceId = flat.deviceId ?? flat.device_id ?? flat.devId ?? flat.sn ?? flat.cameraId ?? flat.edgeId ?? "edge-001";
    const faultType = flat.faultType ?? flat.type ?? flat.defectType ?? flat.defect ?? flat.label ?? "未知缺陷";
    const level = normalizeLevel(flat.level ?? flat.alarmLevel ?? flat.severity ?? flat.status ?? "warn");
    const confidence = asNumber(flat.confidence ?? flat.score ?? flat.prob ?? flat.p);
    const locName = flat.locName ?? flat.towerId ?? flat.poleId ?? flat.segment ?? flat.location ?? "--";
    const latRaw = flat.lat ?? flat.latitude;
    const lngRaw = flat.lng ?? flat.lon ?? flat.longitude;
    let lat = asNumber(latRaw);
    let lng = asNumber(lngRaw);
    if (lat == null || lng == null) {
      const pair = pickCoordPair(flat);
      lat = lat ?? pair.lat;
      lng = lng ?? pair.lng;
    }
    const { imageUrl, imageDataUrl } = parseImageField(flat);
    const bboxes = normalizeBoxes(flat);
    return {
      id: String(eventId ?? randomId()),
      topic,
      ts: toIso(ts),
      receivedAt: new Date().toISOString(),
      deviceId: String(deviceId),
      faultType: String(faultType),
      level,
      confidence,
      locName: String(locName ?? "--"),
      lat,
      lng,
      imageUrl,
      imageDataUrl,
      bboxes,
      rawText: payloadText,
      rawObj: js,
    };
  }

  const s = payloadText.trim();
  if (s.startsWith("http")) {
    return {
      id: randomId(),
      topic,
      ts: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      deviceId: "edge-001",
      faultType: "未知缺陷",
      level: "warn",
      confidence: null,
      locName: "--",
      lat: null,
      lng: null,
      imageUrl: s,
      imageDataUrl: null,
      bboxes: [],
      rawText: payloadText,
      rawObj: null,
    };
  }

  return {
    id: randomId(),
    topic,
    ts: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    deviceId: "edge-001",
    faultType: "未知缺陷",
    level: "warn",
    confidence: null,
    locName: "--",
    lat: null,
    lng: null,
    imageUrl: null,
    imageDataUrl: null,
    bboxes: [],
    rawText: payloadText,
    rawObj: null,
  };
}
