// Homebrews opcionais da mesa [HOMEBREW]: (1) limiar Ínfimo, (2) tokens de ação por rodada.
// A configuração fica em mesas.config.homebrew (só o mestre grava). Ficha sem mesa usa o interruptor pessoal pc.hb.
// Tokens: cada ficha guarda só o próprio contador cumulativo (st.tokN) e a época (st.tokEp), então ninguém
// precisa escrever na ficha dos outros. Os tokens NÃO voltam sozinhos ao zerar: só quando o mestre
// aperta "Reiniciar tokens" (muda a época) ou o jogador aperta o ↺ da própria ficha.
import { S, fichasDaMesa } from "./store.js";

export const TOK_PADRAO = 3;
export const infimo = lim0 => Math.floor((lim0 || 0) / 3);
export const mesaDe = f => (f && f.mesa_id ? S.mesas.find(m => m.id === f.mesa_id) : null);

export function hbCfg(f) {
  const m = mesaDe(f), c = (m && m.config && m.config.homebrew) || {};
  const p = (f && f.data && f.data.hb) || {};
  const daMesa = !!(m && c.tokens);
  const max = Math.min(9, Math.max(1, parseInt(daMesa ? c.tokMax : p.tokMax, 10) || TOK_PADRAO));
  // Liga se a mesa ligou OU se o próprio jogador ligou na ficha. Tokens da mesa sincronizam entre todos; os pessoais valem só para a ficha.
  return { mesa: m, daMesa, limiar: !!c.limiar || !!p.limiar, tokens: daMesa || !!p.tokens, max, epoca: daMesa ? c.epoca || 0 : p.epoca || 0 };
}

const usados = (f, ep) => (f.data.st && f.data.st.tokEp === ep ? f.data.st.tokN || 0 : 0);

// Situação dos tokens de uma ficha (null se a homebrew está desligada).
export function tokens(f) {
  const cfg = hbCfg(f);
  if (!cfg.tokens) return null;
  // Sem reinício automático: os tokens só voltam quando o botão de reiniciar é usado (muda a época ou devolve os gastos).
  const todas = cfg.daMesa ? fichasDaMesa(cfg.mesa.id).filter(x => !x.removida) : [f];
  const gasto = Math.max(0, Math.min(cfg.max, usados(f, cfg.epoca)));
  const esperando = todas.filter(x => usados(x, cfg.epoca) < cfg.max).map(x => x.nome || "Sem nome");
  return { max: cfg.max, resta: cfg.max - gasto, gasto, esperando };
}

export function gastarToken(pc, cfg) {
  if (pc.st.tokEp !== cfg.epoca) { pc.st.tokEp = cfg.epoca; pc.st.tokN = 0; }
  pc.st.tokN = (pc.st.tokN || 0) + 1;
}
export function devolverToken(pc, cfg) {
  if (pc.st.tokEp === cfg.epoca && pc.st.tokN > 0) pc.st.tokN--;
}
