function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function plural(n, singular, pluralForm) {
  return `${n} ${n === 1 ? singular : pluralForm || singular + "s"}`;
}

function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateFromKey(key) {
  return new Date(`${key}T00:00:00`);
}

function addDaysKey(key, amount) {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + amount);
  return dayKey(d);
}

function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const _fmtCache = {};
function fmtDate(iso, opts) {
  const key = JSON.stringify(opts || {});
  if (!_fmtCache[key]) {
    _fmtCache[key] = new Intl.DateTimeFormat("en-US", opts || { month: "short", day: "numeric", year: "numeric" });
  }
  return _fmtCache[key].format(new Date(iso));
}

function fmtShort(iso) {
  return fmtDate(iso, { month: "short", day: "numeric" });
}

function fmtTime(iso) {
  return fmtDate(iso, { hour: "numeric", minute: "2-digit" });
}

function fmtWeekday(iso) {
  return fmtDate(iso, { weekday: "short" });
}

function fmtLongDate(date = new Date()) {
  return fmtDate(date, { weekday: "long", month: "long", day: "numeric" });
}

let _currencySymbol = null;
function currencySymbol() {
  if (_currencySymbol !== null) return _currencySymbol;
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.settings.currency,
    }).formatToParts(0);
    _currencySymbol = (parts.find((p) => p.type === "currency") || {}).value || "$";
  } catch {
    _currencySymbol = "$";
  }
  return _currencySymbol;
}

function resetCurrencyCache() {
  _currencySymbol = null;
}

function money(value, forceDecimals = false) {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.settings.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function compactMoney(value) {
  const n = Number(value) || 0;
  const sym = currencySymbol();
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${sym}${(n / 1000000).toFixed(1).replace(/\.0$/, "")}m`;
  if (abs >= 1000) return `${sym}${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${sym}${Math.round(n)}`;
}

function relativeTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (dayKey(d) === dayKey(now)) return fmtTime(iso);
  if (dayKey(d) === addDaysKey(dayKey(now), -1)) return `Yesterday, ${fmtTime(iso)}`;
  return `${fmtShort(iso)}, ${fmtTime(iso)}`;
}

function initials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothLine(points, tension = 0.17) {
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

function niceMax(value) {
  if (!value || value <= 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  let nf;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 2.5) nf = 2.5;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * exp;
}

function trendBadge(current, previous, options = {}) {
  const invert = !!options.invert;
  const suffix = options.suffix || "%";
  const absolute = !!options.absolute;
  if (!previous && !current) {
    return `<span class="kpi-trend is-flat">${icon("minus", 11)}0${suffix}</span>`;
  }
  if (!previous) {
    return `<span class="kpi-trend">${icon("arrowUpRight", 11)}New</span>`;
  }
  const change = absolute ? current - previous : ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.05) {
    return `<span class="kpi-trend is-flat">${icon("minus", 11)}0${suffix}</span>`;
  }
  const good = invert ? change < 0 : change > 0;
  const cls = good ? "" : "is-down";
  const arrow = change > 0 ? icon("arrowUpRight", 11) : icon("arrowDownRight", 11);
  return `<span class="kpi-trend ${cls}">${arrow}${Math.abs(change).toFixed(absolute ? 1 : 0)}${suffix}</span>`;
}

function sparkline(values, key, dark) {
  const source = values && values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const W = 132;
  const H = 34;
  const inset = 2;
  const min = Math.min(0, ...source);
  const max = Math.max(...source, 1);
  const span = max - min || 1;
  const points = source.map((value, i) => ({
    x: inset + (i * (W - inset * 2)) / Math.max(source.length - 1, 1),
    y: H - inset - ((value - min) / span) * (H - inset * 2),
  }));
  const line = smoothLine(points);
  const area = `${line} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`;
  const id = `spark-${key}`;
  const stopColor = dark ? "#ff8a5b" : "#f15a24";
  return `<svg class="sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${stopColor}" stop-opacity="0.38"/>
      <stop offset="1" stop-color="${stopColor}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${id})" opacity="0.9"></path>
    <path d="${line}" fill="none" stroke="${dark ? "#ff8a5b" : "#f15a24"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
    <circle cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="2.6" fill="${dark ? "#ffb08c" : "#f15a24"}" vector-effect="non-scaling-stroke"></circle>
  </svg>`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  const s = String(value == null ? "" : value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
