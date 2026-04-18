(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const el = {
    clock: $("#clock"),
    connStatus: $("#connStatus"),
    toggleDemo: $("#toggleDemo"),
    openConn: $("#openConn"),
    clearLog: $("#clearLog"),
    brokerUrl: $("#brokerUrl"),
    clientId: $("#clientId"),
    topic: $("#topic"),
    imgTopic: $("#imgTopic"),
    username: $("#username"),
    password: $("#password"),
    qos: $("#qos"),
    btnConnect: $("#btnConnect"),
    btnDisconnect: $("#btnDisconnect"),
    saveCfg: $("#saveCfg"),
    log: $("#log"),
    alarms: $("#alarms"),
    tableBody: $("#tableBody"),
    search: $("#search"),
    exportJson: $("#exportJson"),
    mainImage: $("#mainImage"),
    overlay: $("#overlay"),
    badgeLevel: $("#badgeLevel"),
    badgeType: $("#badgeType"),
    badgeScore: $("#badgeScore"),
    metaId: $("#metaId"),
    metaDevice: $("#metaDevice"),
    metaTime: $("#metaTime"),
    metaInfer: $("#metaInfer"),
    metaModel: $("#metaModel"),
    metaLoc: $("#metaLoc"),
    kpiDevices: $("#kpiDevices"),
    kpiDevicesHint: $("#kpiDevicesHint"),
    kpiAlarms: $("#kpiAlarms"),
    kpiLatency: $("#kpiLatency"),
    kpiLast: $("#kpiLast"),
    kpiLastHint: $("#kpiLastHint"),
    toggleOverlay: $("#toggleOverlay"),
    toggleSplit: $("#toggleSplit"),
    splitPanel: $("#splitPanel"),
    rawImage: $("#rawImage"),
    algImage: $("#algImage"),
    overlay2: $("#overlay2"),
    fullScreen: $("#fullScreen"),
    viewerStage: $("#viewerStage"),
    topologyNodes: $("#towerNodes"),
    locName: $("#locName"),
    locCoord: $("#locCoord"),
    locAcc: $("#locAcc"),
    locSrc: $("#locSrc"),
    topology: $("#topology"),
    coords: $("#coords"),
    drawer: $("#drawer"),
    drawerClose: $("#drawerClose"),
    dId: $("#dId"),
    dTime: $("#dTime"),
    dDevice: $("#dDevice"),
    dType: $("#dType"),
    dLevel: $("#dLevel"),
    dScore: $("#dScore"),
    dLoc: $("#dLoc"),
    dInfer: $("#dInfer"),
    dModel: $("#dModel"),
    dImg: $("#dImg"),
    dOverlay: $("#dOverlay"),
    dRaw: $("#dRaw"),
  };

  const STORAGE_KEY = "insulator-web-demo:v1";

  const state = {
    mqttClient: null,
    demo: false,
    overlayOn: true,
    splitOn: false,
    activeFilter: "all",
    events: [],
    imagesByEventId: new Map(),
    lastSeenByDevice: new Map(),
    towerStatus: Array.from({ length: 9 }, () => ({ level: "off", last: 0 })),
    lastRenderedEventId: null,
    lastLatencyMs: null,
    qos: 0,
    pendingById: new Map(),
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function toLocalTime(ts) {
    const d = ts ? new Date(ts) : new Date();
    if (Number.isNaN(d.getTime())) return "--";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
      d.getSeconds(),
    )}`;
  }

  function levelOf(raw) {
    const v = String(raw ?? "").toLowerCase();
    if (v === "alarm" || v === "critical" || v === "danger" || v === "error" || v === "严重" || v === "告警") return "alarm";
    if (v === "warn" || v === "warning" || v === "预警" || v === "警告") return "warn";
    if (v === "ok" || v === "normal" || v === "healthy" || v === "正常") return "ok";
    return "warn";
  }

  function prettyLevel(lv) {
    if (lv === "alarm") return "告警";
    if (lv === "warn") return "预警";
    if (lv === "ok") return "正常";
    return "未知";
  }

  function randId() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function safeJsonParse(txt) {
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  }

  function asNumber(x) {
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function normalizeBoxes(payload) {
    const boxes = payload?.bboxes ?? payload?.boxes ?? payload?.detections ?? payload?.objects ?? payload?.defects ?? null;
    if (!boxes) return [];
    const arr = Array.isArray(boxes) ? boxes : [];
    const w = asNumber(payload?.imageWidth ?? payload?.width ?? payload?.imgWidth);
    const h = asNumber(payload?.imageHeight ?? payload?.height ?? payload?.imgHeight);
    return arr
      .map((b) => {
        if (!b || typeof b !== "object") return null;
        const label = b.label ?? b.type ?? b.name ?? "";
        const score = asNumber(b.score ?? b.confidence ?? b.prob);
        const left = asNumber(b.left ?? b.x ?? b.xmin);
        const top = asNumber(b.top ?? b.y ?? b.ymin);
        const right = asNumber(b.right ?? (left != null && asNumber(b.w) != null ? left + asNumber(b.w) : null) ?? b.xmax);
        const bottom = asNumber(b.bottom ?? (top != null && asNumber(b.h) != null ? top + asNumber(b.h) : null) ?? b.ymax);
        if (left == null || top == null || right == null || bottom == null) return null;
        const kind =
          left <= 1 && top <= 1 && right <= 1 && bottom <= 1 && left >= 0 && top >= 0 && right >= 0 && bottom >= 0 ? "norm" : "px";
        return { left, top, right, bottom, kind, label: String(label), score, w, h };
      })
      .filter(Boolean);
  }

  function parseImageField(obj) {
    const url =
      obj?.imageUrl ??
      obj?.imgUrl ??
      obj?.url ??
      obj?.image_url ??
      obj?.image ??
      obj?.img ??
      obj?.snapshot ??
      null;
    if (typeof url === "string" && url.startsWith("http")) return { imageUrl: url, imageDataUrl: null };
    if (typeof url === "string" && url.startsWith("data:image/")) return { imageUrl: null, imageDataUrl: url };

    const b64 = obj?.imageBase64 ?? obj?.imgBase64 ?? obj?.base64 ?? obj?.jpgBase64 ?? obj?.pngBase64 ?? null;
    if (typeof b64 === "string" && b64.length > 50) {
      const clean = b64.trim();
      if (clean.startsWith("data:image/")) return { imageUrl: null, imageDataUrl: clean };
      return { imageUrl: null, imageDataUrl: `data:image/jpeg;base64,${clean}` };
    }
    return { imageUrl: null, imageDataUrl: null };
  }

  function parseEventFromMessage(topic, payloadText, rawBytes) {
    const js = safeJsonParse(payloadText);
    if (js && typeof js === "object") {
      const ts = js.ts ?? js.time ?? js.timestamp ?? js.datetime ?? js.t ?? null;
      const evtId = js.eventId ?? js.id ?? js.event_id ?? js.uuid ?? null;
      const deviceId = js.deviceId ?? js.device_id ?? js.devId ?? js.sn ?? js.cameraId ?? js.edgeId ?? "edge-001";
      const defectType = js.faultType ?? js.type ?? js.defectType ?? js.defect ?? js.label ?? "未知缺陷";
      const level = levelOf(js.level ?? js.alarmLevel ?? js.severity ?? js.status ?? "warn");
      const score = asNumber(js.confidence ?? js.score ?? js.prob ?? js.p) ?? null;
      const inferMs = asNumber(js.inferMs ?? js.infer_time_ms ?? js.latencyMs ?? js.inference_ms) ?? null;
      const model = js.model ?? js.modelVersion ?? js.model_version ?? js.algVersion ?? "--";
      const lat = asNumber(js.lat ?? js.latitude);
      const lng = asNumber(js.lng ?? js.lon ?? js.longitude);
      const acc = asNumber(js.acc ?? js.accuracy ?? js.hdop);
      const locName = js.locName ?? js.towerId ?? js.poleId ?? js.segment ?? js.location ?? "--";
      const locSrc = js.locSrc ?? js.locSource ?? js.gnss ?? js.source ?? "--";
      const { imageUrl, imageDataUrl } = parseImageField(js);
      const boxes = normalizeBoxes(js);
      const raw = js.raw ?? js;
      const createdAt = ts ? new Date(ts).toISOString() : nowIso();
      return {
        id: String(evtId ?? randId()),
        topic,
        createdAt,
        receivedAt: nowIso(),
        deviceId: String(deviceId),
        defectType: String(defectType),
        level,
        score,
        inferMs,
        model: String(model),
        location: {
          name: String(locName),
          lat,
          lng,
          acc,
          src: String(locSrc),
        },
        imageUrl,
        imageDataUrl,
        boxes,
        rawText: payloadText,
        rawObj: raw,
        bytes: rawBytes?.length ?? null,
      };
    }

    const s = payloadText.trim();
    if (s.startsWith("http")) {
      return {
        id: randId(),
        topic,
        createdAt: nowIso(),
        receivedAt: nowIso(),
        deviceId: "edge-001",
        defectType: "未知缺陷",
        level: "warn",
        score: null,
        inferMs: null,
        model: "--",
        location: { name: "--", lat: null, lng: null, acc: null, src: "--" },
        imageUrl: s,
        imageDataUrl: null,
        boxes: [],
        rawText: payloadText,
        rawObj: null,
        bytes: rawBytes?.length ?? null,
      };
    }

    if (s.length > 100 && /^[A-Za-z0-9+/=]+$/.test(s)) {
      return {
        id: randId(),
        topic,
        createdAt: nowIso(),
        receivedAt: nowIso(),
        deviceId: "edge-001",
        defectType: "未知缺陷",
        level: "warn",
        score: null,
        inferMs: null,
        model: "--",
        location: { name: "--", lat: null, lng: null, acc: null, src: "--" },
        imageUrl: null,
        imageDataUrl: `data:image/jpeg;base64,${s}`,
        boxes: [],
        rawText: payloadText,
        rawObj: null,
        bytes: rawBytes?.length ?? null,
      };
    }

    return {
      id: randId(),
      topic,
      createdAt: nowIso(),
      receivedAt: nowIso(),
      deviceId: "edge-001",
      defectType: "未知缺陷",
      level: "warn",
      score: null,
      inferMs: null,
      model: "--",
      location: { name: "--", lat: null, lng: null, acc: null, src: "--" },
      imageUrl: null,
      imageDataUrl: null,
      boxes: [],
      rawText: payloadText,
      rawObj: null,
      bytes: rawBytes?.length ?? null,
    };
  }

  function logLine(kind, msg) {
    const t = toLocalTime(Date.now());
    const line = document.createElement("div");
    line.className = "logLine";
    const prefix = kind === "ok" ? "[OK]" : kind === "warn" ? "[WARN]" : kind === "err" ? "[ERR]" : "[INFO]";
    line.textContent = `${t} ${prefix} ${msg}`;
    el.log.prepend(line);
  }

  function setConnStatus(status, text) {
    el.connStatus.dataset.status = status;
    el.connStatus.textContent = text;
  }

  function saveCfg() {
    const cfg = {
      brokerUrl: el.brokerUrl.value.trim(),
      clientId: el.clientId.value.trim(),
      topic: el.topic.value.trim(),
      imgTopic: el.imgTopic.value.trim(),
      username: el.username.value,
      password: el.password.value,
      qos: Number(el.qos.value || 0),
      demo: state.demo,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    logLine("ok", "已保存配置到本地浏览器");
  }

  function loadCfg() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const cfg = safeJsonParse(raw);
    if (!cfg) return;
    el.brokerUrl.value = cfg.brokerUrl ?? el.brokerUrl.value;
    el.clientId.value = cfg.clientId ?? el.clientId.value;
    el.topic.value = cfg.topic ?? el.topic.value;
    el.imgTopic.value = cfg.imgTopic ?? el.imgTopic.value;
    el.username.value = cfg.username ?? el.username.value;
    el.password.value = cfg.password ?? el.password.value;
    el.qos.value = String(cfg.qos ?? 0);
    state.demo = Boolean(cfg.demo ?? false);
  }

  function humanScore(score) {
    if (score == null) return "--";
    const s = clamp(score, 0, 1);
    return `${Math.round(s * 100)}%`;
  }

  function computeLatency(evt) {
    const created = evt?.createdAt ? new Date(evt.createdAt).getTime() : null;
    if (!created || Number.isNaN(created)) return null;
    const ms = Date.now() - created;
    return ms >= 0 && ms < 24 * 3600 * 1000 ? ms : null;
  }

  function setKpis() {
    const now = Date.now();
    const active = Array.from(state.lastSeenByDevice.entries()).filter(([, ts]) => now - ts < 5 * 60 * 1000);
    el.kpiDevices.textContent = String(active.length);
    el.kpiDevicesHint.textContent = active.length ? `活跃：${active.slice(0, 2).map(([d]) => d).join(", ")}${active.length > 2 ? "…" : ""}` : "近5分钟活跃";
    const todayStr = new Date().toDateString();
    const alarmsToday = state.events.filter((e) => new Date(e.receivedAt).toDateString() === todayStr && (e.level === "alarm" || e.level === "warn")).length;
    el.kpiAlarms.textContent = String(alarmsToday);
    el.kpiLatency.textContent = state.lastLatencyMs == null ? "--" : `${Math.round(state.lastLatencyMs)}ms`;
    const last = state.events[0];
    if (last) {
      el.kpiLast.textContent = humanScore(last.score);
      el.kpiLastHint.textContent = `${last.defectType} · ${prettyLevel(last.level)}`;
    } else {
      el.kpiLast.textContent = "--";
      el.kpiLastHint.textContent = "等待数据";
    }
  }

  function ensureCanvasSize(canvas, imgEl) {
    const rect = imgEl.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function drawBoxes(canvas, imgEl, boxes, enabled) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!enabled || !boxes || boxes.length === 0) return;
    const nW = imgEl.naturalWidth || 1;
    const nH = imgEl.naturalHeight || 1;
    const scaleX = canvas.width / nW;
    const scaleY = canvas.height / nH;

    for (const b of boxes) {
      const left = b.kind === "norm" ? b.left * nW : b.left;
      const top = b.kind === "norm" ? b.top * nH : b.top;
      const right = b.kind === "norm" ? b.right * nW : b.right;
      const bottom = b.kind === "norm" ? b.bottom * nH : b.bottom;
      const w = (right - left) * scaleX;
      const h = (bottom - top) * scaleY;
      const x = left * scaleX;
      const y = top * scaleY;

      const lv = state.events[0]?.level ?? "warn";
      const color = lv === "alarm" ? "rgba(255,77,109,0.95)" : lv === "warn" ? "rgba(255,209,102,0.95)" : "rgba(50,224,255,0.95)";
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeRect(x, y, w, h);
      ctx.shadowBlur = 0;

      const label = b.label ? `${b.label}${b.score != null ? ` ${Math.round(clamp(b.score, 0, 1) * 100)}%` : ""}` : "";
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

  function setViewer(evt) {
    if (!evt) return;
    state.lastRenderedEventId = evt.id;

    const src = evt.imageDataUrl ?? evt.imageUrl ?? "./640.png";
    el.mainImage.src = src;
    el.rawImage.src = src;
    el.algImage.src = src;
    el.dImg.src = src;

    const lv = evt.level;
    el.badgeLevel.className = `badge badge--${lv === "alarm" ? "alarm" : lv === "warn" ? "warn" : "ok"}`;
    el.badgeLevel.textContent = lv === "alarm" ? "ALARM" : lv === "warn" ? "WARN" : "NORMAL";
    el.badgeType.textContent = evt.defectType || "--";
    el.badgeScore.textContent = evt.score == null ? "--" : `置信度 ${humanScore(evt.score)}`;

    el.metaId.textContent = evt.id;
    el.metaDevice.textContent = evt.deviceId;
    el.metaTime.textContent = toLocalTime(evt.createdAt);
    el.metaInfer.textContent = evt.inferMs == null ? "--" : `${Math.round(evt.inferMs)}ms`;
    el.metaModel.textContent = evt.model || "--";
    const loc = evt.location?.name && evt.location.name !== "--" ? evt.location.name : evt.location?.lat != null ? `${evt.location.lat},${evt.location.lng}` : "--";
    el.metaLoc.textContent = loc;

    el.locName.textContent = evt.location?.name ?? "--";
    el.locCoord.textContent =
      evt.location?.lat != null && evt.location?.lng != null ? `${evt.location.lng.toFixed(6)}, ${evt.location.lat.toFixed(6)}` : "--";
    el.locAcc.textContent = evt.location?.acc != null ? `±${evt.location.acc}m` : "--";
    el.locSrc.textContent = evt.location?.src ?? "--";

    const latency = computeLatency(evt);
    state.lastLatencyMs = latency;
    setKpis();

    const repaint = () => {
      ensureCanvasSize(el.overlay, el.mainImage);
      drawBoxes(el.overlay, el.mainImage, evt.boxes, state.overlayOn);
      ensureCanvasSize(el.overlay2, el.algImage);
      drawBoxes(el.overlay2, el.algImage, evt.boxes, state.overlayOn);
      ensureCanvasSize(el.dOverlay, el.dImg);
      drawBoxes(el.dOverlay, el.dImg, evt.boxes, true);
    };

    if (el.mainImage.complete) repaint();
    el.mainImage.onload = repaint;
    el.algImage.onload = repaint;
    el.dImg.onload = repaint;
    window.requestAnimationFrame(repaint);
  }

  function openDrawer(evt) {
    el.drawer.classList.remove("drawer--hidden");
    el.dId.textContent = evt.id;
    el.dTime.textContent = toLocalTime(evt.createdAt);
    el.dDevice.textContent = evt.deviceId;
    el.dType.textContent = evt.defectType;
    el.dLevel.textContent = prettyLevel(evt.level);
    el.dScore.textContent = evt.score == null ? "--" : humanScore(evt.score);
    const loc = evt.location?.name && evt.location.name !== "--" ? evt.location.name : evt.location?.lat != null ? `${evt.location.lat},${evt.location.lng}` : "--";
    el.dLoc.textContent = loc;
    el.dInfer.textContent = evt.inferMs == null ? "--" : `${Math.round(evt.inferMs)}ms`;
    el.dModel.textContent = evt.model || "--";
    el.dRaw.textContent = evt.rawText || "--";
    setViewer(evt);
  }

  function closeDrawer() {
    el.drawer.classList.add("drawer--hidden");
  }

  function towerLevelToColor(lv) {
    if (lv === "alarm") return "var(--alarm)";
    if (lv === "warn") return "var(--warn)";
    if (lv === "ok") return "var(--ok)";
    return "var(--off)";
  }

  function renderTowers(activeIndex = null) {
    const nodes = state.towerStatus;
    const positions = [
      [60, 140],
      [140, 95],
      [220, 160],
      [300, 120],
      [390, 170],
      [470, 90],
      [560, 150],
      [650, 110],
      [720, 140],
    ];
    el.topologyNodes.innerHTML = "";
    positions.forEach(([x, y], idx) => {
      const lv = nodes[idx]?.level ?? "off";
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x);
      c.setAttribute("cy", y);
      c.setAttribute("r", idx === activeIndex ? 9 : 7);
      c.setAttribute("fill", towerLevelToColor(lv));
      c.setAttribute("opacity", "0.92");
      c.setAttribute("filter", "url(#glow)");
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", x);
      t.setAttribute("y", y + 22);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("fill", "rgba(232,244,255,0.65)");
      t.setAttribute("font-size", "10");
      t.textContent = `T${idx + 1}`;
      g.appendChild(c);
      g.appendChild(t);
      el.topologyNodes.appendChild(g);
    });
  }

  function inferTowerIndex(evt) {
    const name = evt?.location?.name ?? "";
    const m = String(name).match(/(\d+)/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) return clamp(n - 1, 0, 8);
    }
    const lat = evt?.location?.lat;
    const lng = evt?.location?.lng;
    if (lat != null && lng != null) {
      const h = Math.abs(Math.floor((lat * 1000 + lng * 1000) % 9));
      return clamp(h, 0, 8);
    }
    return null;
  }

  function upsertEvent(evt) {
    const key = `${evt.deviceId}|${evt.defectType}|${evt.location?.name ?? "--"}`;
    const last = state.pendingById.get(key);
    const now = Date.now();
    if (last && now - last.ts < 20 * 1000) {
      last.evt = evt;
      last.ts = now;
    } else {
      state.pendingById.set(key, { evt, ts: now });
    }

    state.events.unshift(evt);
    state.events = state.events.slice(0, 300);
    state.lastSeenByDevice.set(evt.deviceId, Date.now());

    const ti = inferTowerIndex(evt);
    if (ti != null) {
      state.towerStatus[ti] = { level: evt.level, last: Date.now() };
    }
    renderTowers(ti);

    renderAlarms();
    renderTable();
    setViewer(evt);
    setKpis();
  }

  function renderAlarms() {
    const filter = state.activeFilter;
    const items = state.events
      .filter((e) => {
        if (filter === "alarm") return e.level === "alarm";
        if (filter === "warn") return e.level === "warn";
        return true;
      })
      .slice(0, 30);

    el.alarms.innerHTML = "";
    for (const e of items) {
      const div = document.createElement("div");
      div.className = `alarmItem alarmItem--${e.level === "alarm" ? "alarm" : e.level === "warn" ? "warn" : "ok"}`;
      div.innerHTML = `<div class="alarmItem__bar"></div>
        <div>
          <div class="alarmItem__title">${escapeHtml(e.defectType)} · ${prettyLevel(e.level)}</div>
          <div class="alarmItem__meta">
            <span>${escapeHtml(e.deviceId)}</span>
            <span>${escapeHtml(toLocalTime(e.createdAt))}</span>
          </div>
        </div>`;
      div.addEventListener("click", () => openDrawer(e));
      el.alarms.appendChild(div);
    }
  }

  function renderTable() {
    const q = el.search.value.trim().toLowerCase();
    const list = state.events
      .filter((e) => {
        if (!q) return true;
        return (
          String(e.deviceId).toLowerCase().includes(q) ||
          String(e.defectType).toLowerCase().includes(q) ||
          String(e.id).toLowerCase().includes(q)
        );
      })
      .slice(0, 80);

    el.tableBody.innerHTML = "";
    for (const e of list) {
      const tr = document.createElement("tr");
      const loc = e.location?.name && e.location.name !== "--" ? e.location.name : e.location?.lat != null ? `${e.location.lat.toFixed(5)},${e.location.lng.toFixed(5)}` : "--";
      tr.innerHTML = `
        <td>${escapeHtml(toLocalTime(e.createdAt))}</td>
        <td>${escapeHtml(e.deviceId)}</td>
        <td>${escapeHtml(e.defectType)}</td>
        <td>${levelTag(e.level)}</td>
        <td>${escapeHtml(humanScore(e.score))}</td>
        <td>${escapeHtml(loc)}</td>
        <td><button class="rowBtn" data-id="${escapeHtml(e.id)}">查看</button></td>
      `;
      $("button", tr).addEventListener("click", () => openDrawer(e));
      el.tableBody.appendChild(tr);
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

  function levelTag(lv) {
    const cn = lv === "alarm" ? "tag tag--alarm" : lv === "warn" ? "tag tag--warn" : "tag tag--ok";
    const txt = lv === "alarm" ? "告警" : lv === "warn" ? "预警" : "正常";
    return `<span class="${cn}">${txt}</span>`;
  }

  function attachNav() {
    const views = {
      overview: $("#view-overview"),
      realtime: $("#view-realtime"),
      events: $("#view-events"),
      history: $("#view-history"),
      devices: $("#view-devices"),
    };
    $$(".nav__item").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".nav__item").forEach((b) => b.classList.remove("nav__item--active"));
        btn.classList.add("nav__item--active");
        const v = btn.dataset.view;
        Object.entries(views).forEach(([k, sec]) => {
          if (k === v) sec.classList.remove("grid--hidden");
          else sec.classList.add("grid--hidden");
        });
      });
    });
  }

  function attachFilters() {
    const chips = $$(".card--alarms .chip");
    chips.forEach((c) => {
      c.addEventListener("click", () => {
        chips.forEach((x) => x.classList.remove("chip--active"));
        c.classList.add("chip--active");
        state.activeFilter = c.dataset.filter || "all";
        renderAlarms();
      });
    });
  }

  function attachMapMode() {
    const chips = $$(".card--map .chip");
    chips.forEach((c) => {
      c.addEventListener("click", () => {
        chips.forEach((x) => x.classList.remove("chip--active"));
        c.classList.add("chip--active");
        const mode = c.dataset.mapmode;
        if (mode === "coords") {
          el.coords.classList.remove("coords--hidden");
          el.topology.classList.add("coords--hidden");
        } else {
          el.coords.classList.add("coords--hidden");
          el.topology.classList.remove("coords--hidden");
        }
      });
    });
  }

  function attachViewerActions() {
    el.toggleOverlay.addEventListener("click", () => {
      state.overlayOn = !state.overlayOn;
      el.toggleOverlay.classList.toggle("chip--active", state.overlayOn);
      const evt = state.events[0];
      if (evt) setViewer(evt);
    });
    el.toggleSplit.addEventListener("click", () => {
      state.splitOn = !state.splitOn;
      el.toggleSplit.classList.toggle("chip--active", state.splitOn);
      el.splitPanel.classList.toggle("viewer__split--hidden", !state.splitOn);
      const evt = state.events[0];
      if (evt) setViewer(evt);
    });
    el.fullScreen.addEventListener("click", async () => {
      const target = el.viewerStage;
      if (!document.fullscreenElement) {
        try {
          await target.requestFullscreen();
        } catch {
          logLine("warn", "浏览器阻止全屏，请手动允许");
        }
      } else {
        await document.exitFullscreen();
      }
    });
    window.addEventListener("resize", () => {
      const evt = state.events[0];
      if (evt) setViewer(evt);
    });
  }

  function disconnectMqtt() {
    if (state.mqttClient) {
      try {
        state.mqttClient.end(true);
      } catch {}
      state.mqttClient = null;
    }
    setConnStatus("disconnected", state.demo ? "演示中" : "未连接");
  }

  function connectMqtt() {
    if (!window.mqtt) {
      logLine("err", "未加载MQTT库（mqtt.min.js），请检查网络");
      return;
    }
    const url = el.brokerUrl.value.trim();
    const clientId = el.clientId.value.trim() || `web-${Math.random().toString(16).slice(2, 8)}`;
    const topic = el.topic.value.trim();
    const imgTopic = el.imgTopic.value.trim();
    const username = el.username.value || undefined;
    const password = el.password.value || undefined;
    const qos = Number(el.qos.value || 0);
    state.qos = qos;

    if (!url || !topic) {
      logLine("warn", "请填写Broker地址和订阅Topic");
      return;
    }

    disconnectMqtt();
    state.demo = false;
    el.toggleDemo.classList.remove("btn--primary");
    el.toggleDemo.classList.add("btn--ghost");
    el.toggleDemo.textContent = "演示模式";

    setConnStatus("disconnected", "连接中…");
    logLine("info", `连接 ${url} (${clientId})`);

    const opts = {
      clientId,
      username,
      password,
      keepalive: 30,
      reconnectPeriod: 2000,
      connectTimeout: 7000,
      clean: true,
    };

    const client = window.mqtt.connect(url, opts);
    state.mqttClient = client;

    client.on("connect", () => {
      setConnStatus("connected", "已连接");
      logLine("ok", "已连接Broker");
      client.subscribe(topic, { qos }, (err) => {
        if (err) logLine("err", `订阅失败：${topic}`);
        else logLine("ok", `已订阅：${topic} (qos=${qos})`);
      });
      if (imgTopic) {
        client.subscribe(imgTopic, { qos }, (err) => {
          if (err) logLine("err", `订阅失败：${imgTopic}`);
          else logLine("ok", `已订阅：${imgTopic} (qos=${qos})`);
        });
      }
      saveCfg();
    });

    client.on("reconnect", () => {
      setConnStatus("disconnected", "重连中…");
      logLine("warn", "重连中…");
    });

    client.on("close", () => {
      if (!state.demo) setConnStatus("disconnected", "连接已断开");
    });

    client.on("error", (err) => {
      logLine("err", `连接错误：${err?.message ?? err}`);
      if (!state.demo) setConnStatus("disconnected", "连接失败");
    });

    client.on("message", (t, payload) => {
      const text = payload instanceof Uint8Array ? new TextDecoder().decode(payload) : String(payload ?? "");
      logLine("info", `收到 ${t} (${payload?.length ?? text.length} bytes)`);
      const evt = parseEventFromMessage(t, text, payload);
      if (t === imgTopic && evt.rawObj && (evt.rawObj.eventId || evt.rawObj.id)) {
        const refId = String(evt.rawObj.eventId || evt.rawObj.id);
        const { imageUrl, imageDataUrl } = parseImageField(evt.rawObj);
        if (imageUrl || imageDataUrl) {
          state.imagesByEventId.set(refId, { imageUrl, imageDataUrl });
        }
        const found = state.events.find((x) => x.id === refId);
        if (found) {
          const img = state.imagesByEventId.get(refId);
          if (img?.imageDataUrl) found.imageDataUrl = img.imageDataUrl;
          if (img?.imageUrl) found.imageUrl = img.imageUrl;
          setViewer(found);
          renderTable();
          renderAlarms();
        }
        return;
      }

      if (evt.id && state.imagesByEventId.has(evt.id)) {
        const img = state.imagesByEventId.get(evt.id);
        evt.imageUrl = evt.imageUrl ?? img.imageUrl;
        evt.imageDataUrl = evt.imageDataUrl ?? img.imageDataUrl;
      }
      upsertEvent(evt);
    });
  }

  function initDefaults() {
    if (!el.brokerUrl.value) el.brokerUrl.value = "wss://test.mosquitto.org:8081/mqtt";
    if (!el.clientId.value) el.clientId.value = `web-demo-${Math.random().toString(16).slice(2, 6)}`;
    if (!el.topic.value) el.topic.value = "iot/insulator/events";
    if (!el.imgTopic.value) el.imgTopic.value = "";
  }

  function startClock() {
    const tick = () => {
      el.clock.textContent = toLocalTime(Date.now());
    };
    tick();
    setInterval(tick, 1000);
  }

  let demoTimer = null;
  function stopDemo() {
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
    }
  }

  function startDemo() {
    disconnectMqtt();
    stopDemo();
    state.demo = true;
    setConnStatus("connected", "演示中");
    logLine("ok", "已进入演示模式（离线模拟数据）");
    const defectTypes = ["污闪风险", "伞裙破损", "裂纹", "金具锈蚀", "异物附着", "放电痕迹"];
    const devices = ["edge-001", "edge-002", "edge-003"];
    const models = ["insulator-det-v1.2", "insulator-det-v1.3", "edge-yolo-v0.9"];
    demoTimer = setInterval(() => {
      const lvPick = Math.random();
      const level = lvPick > 0.82 ? "alarm" : lvPick > 0.48 ? "warn" : "ok";
      const ti = clamp(Math.floor(Math.random() * 9), 0, 8);
      const evt = {
        id: randId(),
        topic: "demo",
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 800)).toISOString(),
        receivedAt: nowIso(),
        deviceId: devices[Math.floor(Math.random() * devices.length)],
        defectType: defectTypes[Math.floor(Math.random() * defectTypes.length)],
        level,
        score: clamp(0.55 + Math.random() * 0.44, 0, 1),
        inferMs: Math.floor(28 + Math.random() * 55),
        model: models[Math.floor(Math.random() * models.length)],
        location: {
          name: `T${ti + 1}`,
          lat: 30.56 + Math.random() * 0.02,
          lng: 114.31 + Math.random() * 0.02,
          acc: Math.floor(1 + Math.random() * 5),
          src: "GNSS",
        },
        imageUrl: null,
        imageDataUrl: null,
        boxes: [
          {
            left: 0.32 + Math.random() * 0.18,
            top: 0.24 + Math.random() * 0.2,
            right: 0.64 + Math.random() * 0.16,
            bottom: 0.62 + Math.random() * 0.2,
            kind: "norm",
            label: "缺陷",
            score: clamp(0.6 + Math.random() * 0.35, 0, 1),
            w: null,
            h: null,
          },
        ],
        rawText: JSON.stringify(
          {
            id: "demo",
            deviceId: "edge",
            type: "defect",
          },
          null,
          2,
        ),
        rawObj: null,
        bytes: null,
      };
      upsertEvent(evt);
    }, 2200);
  }

  function attachConnActions() {
    el.btnConnect.addEventListener("click", connectMqtt);
    el.btnDisconnect.addEventListener("click", () => {
      state.demo = false;
      stopDemo();
      disconnectMqtt();
      logLine("info", "已断开连接");
    });
    el.saveCfg.addEventListener("click", saveCfg);
    el.openConn.addEventListener("click", () => {
      const top = $(".card--mqtt");
      top.scrollIntoView({ behavior: "smooth", block: "center" });
      el.brokerUrl.focus();
    });
    el.clearLog.addEventListener("click", () => {
      el.log.innerHTML = "";
    });
  }

  function attachSearchAndExport() {
    el.search.addEventListener("input", renderTable);
    el.exportJson.addEventListener("click", () => {
      const data = JSON.stringify(state.events.slice(0, 200), null, 2);
      const blob = new Blob([data], { type: "application/json;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `events-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  function attachDrawer() {
    el.drawerClose.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  function attachDemo() {
    el.toggleDemo.addEventListener("click", () => {
      if (!state.demo) {
        el.toggleDemo.classList.remove("btn--ghost");
        el.toggleDemo.classList.add("btn--primary");
        el.toggleDemo.textContent = "退出演示";
        startDemo();
        saveCfg();
      } else {
        el.toggleDemo.classList.remove("btn--primary");
        el.toggleDemo.classList.add("btn--ghost");
        el.toggleDemo.textContent = "演示模式";
        state.demo = false;
        stopDemo();
        disconnectMqtt();
        saveCfg();
      }
    });
  }

  function init() {
    attachNav();
    attachFilters();
    attachMapMode();
    attachViewerActions();
    attachConnActions();
    attachSearchAndExport();
    attachDrawer();
    attachDemo();
    loadCfg();
    initDefaults();
    renderTowers(null);
    startClock();
    setKpis();
    setConnStatus("disconnected", "未连接");
    logLine("info", "页面已就绪：可直接打开 index.html 或用本地HTTP服务访问");
    if (state.demo) {
      el.toggleDemo.classList.remove("btn--ghost");
      el.toggleDemo.classList.add("btn--primary");
      el.toggleDemo.textContent = "退出演示";
      startDemo();
    }
  }

  init();
})();
