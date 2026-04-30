import demoPayloadText from "../../payloadforshow.txt?raw";
import { parseEventMessage } from "./parser";

const DEMO_TOPIC = "huawei/iotda/match2026/dev1";

const demoProfiles = [
  { deviceId: "edge-001", faultType: "破损", level: "告警", confidence: 0.91, location: [30.4139, 114.36354], state: false },
  { deviceId: "edge-002", faultType: "污闪", level: "预警", confidence: 0.86, location: [30.41455, 114.3629], state: false },
  { deviceId: "edge-003", faultType: "异物附着", level: "预警", confidence: 0.82, location: [30.41328, 114.36418], state: true },
  { deviceId: "edge-001", faultType: "裂纹", level: "告警", confidence: 0.93, location: [30.41402, 114.36312], state: false },
  { deviceId: "edge-002", faultType: "放电痕迹", level: "预警", confidence: 0.79, location: [30.41488, 114.36375], state: true },
  { deviceId: "edge-003", faultType: "伞裙破损", level: "告警", confidence: 0.9, location: [30.41296, 114.36446], state: false },
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

function getBasePayload() {
  const parsed = safeJsonParse(demoPayloadText);
  if (parsed && typeof parsed === "object") return parsed;
  return {
    services: [
      {
        service_id: "linux",
        properties: {},
      },
    ],
  };
}

const basePayload = getBasePayload();

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
