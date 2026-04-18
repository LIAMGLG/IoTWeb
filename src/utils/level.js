export function normalizeLevel(raw) {
  const v = String(raw ?? "").toLowerCase();
  if (v === "alarm" || v === "critical" || v === "danger" || v === "error" || v === "严重" || v === "告警") return "alarm";
  if (v === "warn" || v === "warning" || v === "预警" || v === "警告") return "warn";
  if (v === "ok" || v === "normal" || v === "healthy" || v === "正常") return "ok";
  return "warn";
}

export function prettyLevel(lv) {
  if (lv === "alarm") return "告警";
  if (lv === "warn") return "预警";
  if (lv === "ok") return "正常";
  return "未知";
}

