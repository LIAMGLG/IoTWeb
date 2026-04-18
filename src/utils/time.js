export function toLocalTime(input) {
  const d = input == null ? new Date() : new Date(input);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds(),
  )}`;
}

export function toIso(input) {
  const d = input == null ? new Date() : new Date(input);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

