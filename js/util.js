// Utilitários compartilhados
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
export const clone = o => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sgn = n => (n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0");

// Markdown mínimo usado nos textos do SRD: **negrito**, _itálico_, listas "- ", citações "> ", parágrafos.
export function md(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(“"'>])_(.+?)_(?=[\s.,;:)!?”"'<]|$)/g, "$1<em>$2</em>");
}
export function mdBlock(s) {
  const src = String(s || "").replace(/\r/g, "");
  return src.split(/\n{2,}/).map(p => {
    p = p.trim();
    if (!p) return "";
    if (/^#{2,6}\s/.test(p)) return `<h4>${md(p.replace(/^#+\s*/, ""))}</h4>`;
    if (p === "---") return "<hr>";
    if (/^>/.test(p)) return `<blockquote>${mdBlock(p.split("\n").map(l => l.replace(/^>\s?/, "")).join("\n"))}</blockquote>`;
    if (/^\|.*\|/.test(p)) return mdTable(p);
    const lines = p.split("\n");
    if (lines.every(l => /^\s*[-•]\s/.test(l) || /^\s{2,}/.test(l))) return `<ul>${lines.map(l => `<li>${md(l.replace(/^\s*[-•]\s/, ""))}</li>`).join("")}</ul>`;
    if (lines.every(l => /^\s*\d+\.\s/.test(l))) return `<ol>${lines.map(l => `<li>${md(l.replace(/^\s*\d+\.\s/, ""))}</li>`).join("")}</ol>`;
    return `<p>${lines.map(l => /^\s*[-•]\s/.test(l) ? "• " + md(l.replace(/^\s*[-•]\s/, "")) : md(l)).join("<br>")}</p>`;
  }).join("");
}
function mdTable(p) {
  const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  const body = p.split("\n").filter(r => r.trim() && !/^\|?[\s:|-]+\|?$/.test(r.trim()));
  if (!body.length) return "";
  const [h, ...rest] = body;
  return `<div class="tbl"><table><thead><tr>${cells(h).map(c => `<th>${md(c)}</th>`).join("")}</tr></thead><tbody>${rest.map(r => `<tr>${cells(r).map(c => `<td>${md(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

let toastT;
export function toast(msg, kind = "") {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show " + kind;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.className = "toast"), 2800);
}

export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

export const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// Painel inferior (bottom sheet) reutilizável para detalhes e diálogos
export function openSheet(html, { title = "", wide = false, onClose } = {}) {
  closeSheet();
  const w = document.createElement("div");
  w.className = "sheet-wrap";
  w.innerHTML = `<div class="sheet-bg" data-close></div>
  <div class="sheet${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-grab" data-close aria-hidden="true"></div>
    <div class="sheet-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Fechar">${icon("x")}</button></div>
    <div class="sheet-body">${html}</div>
  </div>`;
  document.body.appendChild(w);
  document.body.classList.add("no-scroll");
  w._onClose = onClose;
  w.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeSheet(); });
  requestAnimationFrame(() => w.classList.add("on"));
  const f = w.querySelector(".sheet-body input, .sheet-body button");
  if (f && matchMedia("(pointer:fine)").matches) f.focus();
  return w;
}
export function closeSheet() {
  const w = $(".sheet-wrap");
  if (!w) return;
  document.body.classList.remove("no-scroll");
  const cb = w._onClose;
  w.remove();
  if (cb) cb();
}
addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

export function confirmar(msg, { ok = "Confirmar", perigo = false } = {}) {
  return new Promise(res => {
    const w = openSheet(`<p class="lead">${esc(msg)}</p><div class="acts"><button class="btn ${perigo ? "danger" : "pri"}" data-yes>${esc(ok)}</button><button class="btn ghost" data-close>Cancelar</button></div>`, { title: "Confirmar", onClose: () => res(false) });
    w.querySelector("[data-yes]").addEventListener("click", () => { w._onClose = null; closeSheet(); res(true); });
  });
}

// Ícones SVG (traço) — conjunto pequeno e próprio
const P = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14.8c2.4.6 4 2.3 4 5.2"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5z"/><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>',
  cards: '<rect x="3" y="5" width="12" height="16" rx="2"/><path d="M8 3h11a2 2 0 012 2v14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="16" cy="16" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  chev: '<path d="M9 18l6-6-6-6"/>',
  moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 10-1.4-8.8A6 6 0 104 15.5 3.5 3.5 0 006.5 19z"/>',
  bed: '<path d="M2 4v16M2 8h18a2 2 0 012 2v10M2 17h20M6 8v9"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
  sword: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>',
  bag: '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 01-8 0"/>',
  feather: '<path d="M20.2 12.2A6 6 0 0011.8 3.8L5 10.6V19h8.4z"/><path d="M16 8L2 22M17.5 15H9"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  link: '<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>',
  crown: '<path d="M2 18h20l-2-11-5 4-3-6-3 6-5-4z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
};
export const icon = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;
