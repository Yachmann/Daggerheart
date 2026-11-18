// Envio de personagem por link: a ficha vai dentro do endereço (comprimida), sem conta e sem banco.
// O jogador abre o link e recebe uma cópia só dele; o original continua com quem enviou.
import { novoPersonagem } from "./calc.js";
import { get } from "./data.js";

const b64u = bytes => { let s = ""; bytes.forEach(b => (s += String.fromCharCode(b))); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const desb64u = t => { const s = atob(t.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, c => c.charCodeAt(0)); };
const temCompressao = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

async function via(bytes, Classe) {
  const stream = new Blob([bytes]).stream().pipeThrough(new Classe("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Estado entregue: ficha "nova de pacote" (PV e Estresse limpos, sem condições)
export function paraEntrega(pc, { zerar = true } = {}) {
  const c = JSON.parse(JSON.stringify(pc));
  delete c.criadoEm; delete c.modelo;
  if (zerar) c.st = { pv: 0, es: 0, esp: Math.min(2, 6 - (c.cicatrizes || 0)), arm: 0, cond: [] };
  return c;
}

export async function empacotar(pc) {
  const bytes = new TextEncoder().encode(JSON.stringify(pc));
  if (temCompressao()) return "d." + b64u(await via(bytes, CompressionStream));
  return "u." + b64u(bytes);
}
export async function desempacotar(texto) {
  const t = String(texto || "");
  const modo = t.slice(0, 2), corpo = t.slice(2);
  let bytes;
  try { bytes = desb64u(corpo); } catch { throw new Error("O link está incompleto ou foi alterado. Peça o link de novo."); }
  if (modo === "d.") {
    if (!temCompressao()) throw new Error("Este navegador é antigo demais para abrir o link. Use um navegador atualizado.");
    try { bytes = await via(bytes, DecompressionStream); } catch { throw new Error("O link está incompleto ou foi alterado. Peça o link de novo."); }
  } else if (modo !== "u.") throw new Error("Link de personagem não reconhecido.");
  let raw;
  try { raw = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error("O conteúdo do link está corrompido."); }
  return sanear(raw);
}

// Aceita só o que a ficha conhece, com os tipos certos, para um link malformado não quebrar as telas.
export function sanear(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("O link não traz um personagem.");
  const base = novoPersonagem(), pc = novoPersonagem();
  for (const k of Object.keys(base)) {
    const v = raw[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(base[k])) { if (Array.isArray(v)) pc[k] = v; }
    else if (typeof base[k] === "object") { if (typeof v === "object" && !Array.isArray(v)) pc[k] = { ...base[k], ...v }; }
    else if (typeof v === typeof base[k]) pc[k] = v;
  }
  pc.cartas = { mao: Array.isArray(pc.cartas.mao) ? pc.cartas.mao : [], cofre: Array.isArray(pc.cartas.cofre) ? pc.cartas.cofre : [] };
  pc.st = { ...base.st, ...pc.st, cond: Array.isArray(pc.st.cond) ? pc.st.cond : [] };
  pc.hist = { ...base.hist, ...pc.hist }; pc.mod = { ...base.mod, ...pc.mod }; pc.ouro = { ...base.ouro, ...pc.ouro };
  pc.nivel = Math.max(1, Math.min(10, parseInt(pc.nivel, 10) || 1));
  if (!get("classes", pc.classe)) throw new Error(`A classe “${pc.classe || "?"}” não existe aqui. Se é da expansão Hope & Fear, a expansão precisa estar nos dados do site.`);
  pc.criadoEm = Date.now();
  return pc;
}

export async function montarLink(pc, { mesaCodigo = "", zerar = true } = {}) {
  const payload = await empacotar(paraEntrega(pc, { zerar }));
  const base = location.origin + location.pathname;
  return `${base}#/receber/${payload}${mesaCodigo ? "?m=" + encodeURIComponent(mesaCodigo) : ""}`;
}
