// Homebrews opcionais da mesa [HOMEBREW]: (1) limiar Ínfimo, (2) tokens de ação por rodada.
// A configuração fica em mesas.config.homebrew (só o mestre grava). Ficha sem mesa usa o interruptor pessoal pc.hb.
// Tokens: cada ficha guarda só o próprio contador cumulativo (st.tokN) e a época (st.tokEp), então ninguém
// precisa escrever na ficha dos outros. A rodada vigente é o menor "gastos ÷ máx" entre as fichas da mesa:
// quando todos esgotam os tokens, todos voltam sozinhos. O mestre pode forçar o reinício (muda a época).
import { S, fichasDaMesa } from "./store.js";

export const TOK_PADRAO = 3;
export const infimo = lim0 => Math.floor((lim0 || 0) / 3);
export const mesaDe = f => (f && f.mesa_id ? S.mesas.find(m => m.id === f.mesa_id) : null);

export function hbCfg(f) {
  const m = mesaDe(f), c = (m && m.config && m.config.homebrew) || {};
  const p = (f && f.data && f.data.hb) || {};
  const max = Math.min(9, Math.max(1, parseInt(c.tokMax, 10) || TOK_PADRAO));
  return { mesa: m, limiar: m ? !!c.limiar : !!p.limiar, tokens: !!(m && c.tokens), max, epoca: c.epoca || 0 };
}

const usados = (f, ep) => (f.data.st && f.data.st.tokEp === ep ? f.data.st.tokN || 0 : 0);

// Situação dos tokens de uma ficha dentro da mesa dela (null se a homebrew está desligada).
export function tokens(f) {
  const cfg = hbCfg(f);
  if (!cfg.tokens) return null;
  const todas = fichasDaMesa(cfg.mesa.id).filter(x => !x.removida);
  const gastos = todas.map(x => usados(x, cfg.epoca));
  const ciclo = todas.length ? Math.min(...gastos.map(g => Math.floor(g / cfg.max))) : 0;
  const meus = usados(f, cfg.epoca) - ciclo * cfg.max;
  const gasto = Math.max(0, Math.min(cfg.max, meus));
  const esperando = todas.filter((x, i) => gastos[i] - ciclo * cfg.max < cfg.max).map(x => x.nome || "Sem nome");
  return { max: cfg.max, resta: cfg.max - gasto, gasto, esperando, ciclo };
}

export function gastarToken(pc, cfg) {
  if (pc.st.tokEp !== cfg.epoca) { pc.st.tokEp = cfg.epoca; pc.st.tokN = 0; }
  pc.st.tokN = (pc.st.tokN || 0) + 1;
}
export function devolverToken(pc, cfg) {
  if (pc.st.tokEp === cfg.epoca && pc.st.tokN > 0) pc.st.tokN--;
}
