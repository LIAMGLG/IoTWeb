export function ensureCanvasSize(canvas, refEl) {
  const rect = refEl.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

export function drawBoxes({ canvas, imgEl, boxes, enabled, level }) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!enabled || !boxes || boxes.length === 0) return;
  const nW = imgEl.naturalWidth || 1;
  const nH = imgEl.naturalHeight || 1;
  const scaleX = canvas.width / nW;
  const scaleY = canvas.height / nH;
  const color = level === "alarm" ? "rgba(255,77,109,0.95)" : level === "warn" ? "rgba(255,209,102,0.95)" : "rgba(50,224,255,0.95)";

  for (const b of boxes) {
    const left = b.kind === "norm" ? b.left * nW : b.left;
    const top = b.kind === "norm" ? b.top * nH : b.top;
    const right = b.kind === "norm" ? b.right * nW : b.right;
    const bottom = b.kind === "norm" ? b.bottom * nH : b.bottom;
    const w = (right - left) * scaleX;
    const h = (bottom - top) * scaleY;
    const x = left * scaleX;
    const y = top * scaleY;

    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;

    const label = b.label ? `${b.label}${typeof b.score === "number" ? ` ${Math.round(Math.max(0, Math.min(1, b.score)) * 100)}%` : ""}` : "";
    if (label) {
      ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, PingFang SC, Microsoft YaHei";
      const pad = 6;
      const tw = ctx.measureText(label).width + pad * 2;
      const th = 18;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, Math.max(0, y - th - 4), tw, th);
      ctx.strokeStyle = color;
      ctx.strokeRect(x, Math.max(0, y - th - 4), tw, th);
      ctx.fillStyle = "rgba(232,244,255,0.92)";
      ctx.fillText(label, x + pad, Math.max(12, y - 10));
    }
  }
}

