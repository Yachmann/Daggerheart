// Marcadores físicos do mestre (os tokens de madeira da mesa presencial): 5 figuras × 5 números.
// Cada adversário de uma batalha/cena pode ter um marcador { f: figura (0..4), n: número (1..5) }, sem repetir dentro do mesmo registro.
// Para trocar nomes das figuras ou a quantidade de cada uma, edite só este arquivo (e as imagens em img/tokens/).
export const FIGURAS = [
  { n: "Barbudo", img: "img/tokens/token-1.png" },
  { n: "Mulher", img: "img/tokens/token-2.png" },
  { n: "Encapuzado", img: "img/tokens/token-3.png" },
  { n: "Chifres", img: "img/tokens/token-4.png" },
  { n: "Presa", img: "img/tokens/token-5.png" },
];
export const POR_FIGURA = 5;
export const TOTAL = FIGURAS.length * POR_FIGURA;

const chave = mk => mk.f + ":" + mk.n;
export const valido = mk => !!mk && Number.isInteger(mk.f) && mk.f >= 0 && mk.f < FIGURAS.length && Number.isInteger(mk.n) && mk.n >= 1 && mk.n <= POR_FIGURA;
export const rotulo = mk => (valido(mk) ? `${FIGURAS[mk.f].n} ${mk.n}` : "Sem marcador");

// Mapa "figura:número" → unidade que o usa neste registro.
export function ocupados(reg, ignorar = null) {
  const m = new Map();
  (reg.unidades || []).forEach(u => { if (u !== ignorar && valido(u.mk)) m.set(chave(u.mk), u); });
  return m;
}

// Próximo marcador livre. Prefere a figura que o mesmo adversário já usa (4 bandidos = 4 números da mesma figura);
// depois uma figura ainda intocada; por fim qualquer lugar livre. Devolve null se os 25 estiverem em uso.
export function proximo(reg, ref = "", ignorar = null) {
  const oc = ocupados(reg, ignorar);
  const livreEm = f => { for (let n = 1; n <= POR_FIGURA; n++) if (!oc.has(f + ":" + n)) return n; return 0; };
  const usos = f => { let c = 0; for (let n = 1; n <= POR_FIGURA; n++) if (oc.has(f + ":" + n)) c++; return c; };
  const mesmas = (reg.unidades || []).filter(u => u !== ignorar && u.ref === ref && valido(u.mk)).map(u => u.mk.f).reverse();
  const ordem = [...new Set([...mesmas, ...FIGURAS.map((_, i) => i).filter(f => usos(f) === 0), ...FIGURAS.map((_, i) => i)])];
  for (const f of ordem) { const n = livreEm(f); if (n) return { f, n }; }
  return null;
}

// Dá marcador a quem ainda não tem (batalhas antigas). Devolve quantos receberam.
export function atribuirFaltantes(reg) {
  let c = 0;
  (reg.unidades || []).forEach(u => { if (!valido(u.mk)) { const mk = proximo(reg, u.ref, u); if (mk) { u.mk = mk; c++; } else u.mk = null; } });
  return c;
}

// Define o marcador de uma unidade; se já estiver com outra, as duas trocam de lugar. Devolve a unidade trocada (ou null).
export function definir(reg, u, f, n) {
  const outro = ocupados(reg, u).get(f + ":" + n) || null;
  const meu = valido(u.mk) ? { ...u.mk } : null;
  if (outro) outro.mk = meu;
  u.mk = { f, n };
  return outro;
}
