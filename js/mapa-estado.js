// Estado "ao vivo" de um mapa, compartilhado entre a mesa do mestre (aba Mapas) e a janela do projetor (projetor.html).
// Guardado no localStorage (sobrevive a recarregar) e avisado entre janelas por BroadcastChannel. Nada vai para o servidor.
// Forma: { fase, grade, nevoa: { ativa, rev: "0101…" (1 = revelada, uma letra por quadrado, linha a linha) }, marc: [{ i, t, x, y, s }] }
// x e y estão em quadrados da grade do mapa (a imagem cobre exatamente a grade), s = tamanho em quadrados.

// Desenhos em img/marcadores/<tipo>-<1..3>.png (gerados por `python -m mapa.marcadores`, no mesmo traço dos mapas).
export const TIPOS = [
  { t: "fogo", n: "Fogo" }, { t: "fumaca", n: "Fumaça" }, { t: "tocha", n: "Tocha" }, { t: "destrocos", n: "Destroços" },
  { t: "agua", n: "Água" }, { t: "gelo", n: "Gelo" }, { t: "sangue", n: "Sangue" }, { t: "queimado", n: "Queimado" },
  { t: "limo", n: "Limo" }, { t: "corpo", n: "Corpo" }, { t: "ossos", n: "Ossos" }, { t: "armadilha", n: "Armadilha" },
  { t: "tesouro", n: "Tesouro" }, { t: "teia", n: "Teia" },
];
export const VARIANTES = 3;
export const imgMarc = (t, v = 1) => `img/marcadores/${t}-${v}.png`;
const OK = new Set(TIPOS.map(x => x.t));
const COBERTURA = 1.6; // o PNG cobre 1,6 × 1,6 quadrados (o quadrado nominal fica no miolo)

const mem = {};
const ouvintes = new Set();
let bc = null;
try { bc = new BroadcastChannel("dh-mapa"); } catch { /* sem BroadcastChannel: usa o evento storage */ }

function normalizar(e) {
  const o = Object.assign({ fase: null, grade: false }, e || {});
  o.nevoa = Object.assign({ ativa: false, rev: "" }, o.nevoa);
  o.marc = Array.isArray(o.marc) ? o.marc.filter(m => m && OK.has(m.t) && isFinite(m.x) && isFinite(m.y)) : [];
  return o;
}
function receber(id, e) { mem[id] = normalizar(e); ouvintes.forEach(f => { try { f(id); } catch (x) { console.error(x); } }); }

if (bc) bc.onmessage = ev => ev.data && ev.data.id && receber(ev.data.id, ev.data.e);
addEventListener("storage", ev => {
  if (!ev.key || !ev.key.startsWith("dh-mapa-") || !ev.newValue) return;
  try { receber(ev.key.slice(8), JSON.parse(ev.newValue)); } catch { /* ignora */ }
});

export function ler(id) {
  if (mem[id]) return mem[id];
  let e = null;
  try { e = JSON.parse(localStorage.getItem("dh-mapa-" + id)); } catch { /* sem armazenamento */ }
  return (mem[id] = normalizar(e));
}
export function gravar(id, e) {
  mem[id] = e;
  try { localStorage.setItem("dh-mapa-" + id, JSON.stringify(e)); } catch { /* segue só na memória */ }
  if (bc) bc.postMessage({ id, e });
}
// Chama f(id) quando OUTRA janela muda o estado de um mapa. Devolve a função que cancela.
export function ouvir(f) { ouvintes.add(f); return () => ouvintes.delete(f); }

// ---------- névoa ----------
export function celulas(e, cols, rows) {
  const r = e.nevoa.rev;
  return r.length === cols * rows ? Array.from(r, c => (c === "1" ? 1 : 0)) : new Array(cols * rows).fill(0);
}
export const guardarCelulas = (e, arr) => { e.nevoa.rev = arr.join(""); };

// alpha 1 = preto total (projetor); menos que 1 = o mestre ainda enxerga por baixo.
export function desenharNevoa(cv, e, cols, rows, alpha) {
  const P = 16;
  cv.width = cols * P; cv.height = rows * P;
  const c = cv.getContext("2d");
  c.clearRect(0, 0, cv.width, cv.height);
  if (!e.nevoa.ativa) return;
  const arr = celulas(e, cols, rows);
  c.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      if (arr[y * cols + x]) { x++; continue; }
      let x2 = x; while (x2 < cols && !arr[y * cols + x2]) x2++;
      c.fillRect(x * P, y * P, (x2 - x) * P, P);
      x = x2;
    }
  }
}

// ---------- marcadores ----------
export function marcadoresHtml(e, cols, rows) {
  return e.marc.map(m => `<img class="mv ${m.t}" alt="" draggable="false" src="${imgMarc(m.t, m.v || 1)}" style="left:${(m.x / cols) * 100}%;top:${(m.y / rows) * 100}%;width:${((m.s || 1) * COBERTURA / cols) * 100}%">`).join("");
}
