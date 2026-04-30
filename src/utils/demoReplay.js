import demoPayloadText from "../../payloadforshow.txt?raw";
import { parseEventMessage } from "./parser";

const DEMO_TOPIC = "huawei/iotda/match2026/dev1";

const demoProfiles = [
  { deviceId: "edge-001", faultType: "破损", level: "告警", confidence: 0.91, location: [30.5388, 114.3567], state: false },
  { deviceId: "edge-001", faultType: "污闪", level: "预警", confidence: 0.86, location: [30.53858, 114.3574], state: false },
  { deviceId: "edge-001", faultType: "异物附着", level: "预警", confidence: 0.82, location: [30.53805, 114.35792], state: true },
  { deviceId: "edge-001", faultType: "裂纹", level: "告警", confidence: 0.93, location: [30.53735, 114.35795], state: false },
  { deviceId: "edge-001", faultType: "放电痕迹", level: "预警", confidence: 0.79, location: [30.53676, 114.35748], state: true },
  { deviceId: "edge-001", faultType: "伞裙破损", level: "告警", confidence: 0.9, location: [30.53658, 114.3567], state: false },
  { deviceId: "edge-001", faultType: "污秽沉积", level: "预警", confidence: 0.77, location: [30.5368, 114.35595], state: false },
  { deviceId: "edge-001", faultType: "金具锈蚀", level: "预警", confidence: 0.84, location: [30.53732, 114.35542], state: true },
  { deviceId: "edge-001", faultType: "破损", level: "告警", confidence: 0.95, location: [30.53803, 114.35545], state: false },
  { deviceId: "edge-001", faultType: "异物附着", level: "预警", confidence: 0.81, location: [30.5386, 114.35598], state: false },
];

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          jsonText: text.slice(start, i + 1),
          restText: text.slice(i + 1),
        };
      }
    }
  }

  return null;
}

function extractImageList(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("data:image/");
      return idx >= 0 ? line.slice(idx) : line;
    })
    .filter((line) => line.startsWith("data:image/"));
}

function getBasePayloadAndImages() {
  const parsed = safeJsonParse(demoPayloadText);
  if (parsed && typeof parsed === "object") {
    return { payload: parsed, images: [] };
  }

  const extracted = extractFirstJsonObject(demoPayloadText);
  if (extracted) {
    const payload = safeJsonParse(extracted.jsonText);
    if (payload && typeof payload === "object") {
      return {
        payload,
        images: extractImageList(extracted.restText),
      };
    }
  }

  return {
    payload: {
      services: [
        {
          service_id: "linux",
          properties: {},
        },
      ],
    },
    images: [],
  };
}

const { payload: basePayload, images: demoImages } = getBasePayloadAndImages();

function ensureProps(payload) {
  if (!Array.isArray(payload.services) || !payload.services.length) {
    payload.services = [{ service_id: "linux", properties: {} }];
  }
  if (!payload.services[0] || typeof payload.services[0] !== "object") {
    payload.services[0] = { service_id: "linux", properties: {} };
  }
  if (!payload.services[0].properties || typeof payload.services[0].properties !== "object") {
    payload.services[0].properties = {};
  }
  return payload.services[0].properties;
}

function buildPayload(index = 0, now = Date.now()) {
  const payload = clone(basePayload);
  const props = ensureProps(payload);
  const profile = demoProfiles[index % demoProfiles.length];
  const eventTime = new Date(now - (index % 6) * 45 * 1000);

  props.ts = eventTime.toISOString();
  props.deviceId = profile.deviceId;
  props.faultType = profile.faultType;
  props.level = profile.level;
  props.confidence = profile.confidence;
  props.location = profile.location;
  props.state = profile.state;
  props.eventId = `demo-${eventTime.getTime()}-${index}`;
  props.demo = true;
  if (demoImages.length) {
    props.image = demoImages[index % demoImages.length];
  }

  return payload;
}

export function createDemoEvent(index = 0, now = Date.now()) {
  const payload = buildPayload(index, now);
  const payloadText = JSON.stringify(payload, null, 2);
  return parseEventMessage(DEMO_TOPIC, payloadText);
}

export function createDemoSeed(count = 8, now = Date.now()) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    list.push(createDemoEvent(i, now - (count - 1 - i) * 60 * 1000));
  }
  return list.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}
