// Símbolos dos status principais e dos traços (SVG de traço, viewBox 24x24).
const P = {
  evasao: `<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>`,
  limiares: `<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>`,
  prof: `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>`,
  agi: `<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>`,
  for: `<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>`,
  acu: `<path d="M20 4c-9 0-14 5-14 12l-2 4M6 16c6 0 10-4 14-12M9 13h5"/>`,
  ins: `<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`,
  pre: `<path d="M3 18h18M4 18L3 7l5 4 4-6 4 6 5-4-1 11"/>`,
  con: `<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13M9 8h6"/>`,
};
const ATTR = `fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"`;
// Glifo solto (status principais)
export const glifo = k => `<svg viewBox="0 0 24 24" ${ATTR} aria-hidden="true" focusable="false">${P[k] || ""}</svg>`;
// Traço como uma face de dado: hexágono com o símbolo do atributo (o modificador fica ao lado, no HTML da ficha)
export const dado6 = k => `<span class="die6"><svg viewBox="0 0 48 52" aria-hidden="true" focusable="false"><path class="hx" d="M24 2l20 11.5v25L24 50 4 38.5v-25z"/><svg class="gl" x="10" y="13" width="28" height="28" viewBox="0 0 24 24" ${ATTR}>${P[k] || ""}</svg></svg></span>`;
