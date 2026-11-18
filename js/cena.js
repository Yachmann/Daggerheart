// Cenas complexas: lógica pura (sem tela, sem rede). Testada em tests/index.html.
// Uma cena é movida por Contadores em disputa e por uma tabela de resultados ligada aos dados de dualidade.

const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isInt = v => typeof v === "number" && Number.isInteger(v);
const str = v => typeof v === "string" && v.trim() !== "";
export const novoId = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const RESULTADOS = [
  ["critico", "Crítico", "crit"],
  ["sucesso_esperanca", "Sucesso com Esperança", "hope"],
  ["sucesso_medo", "Sucesso com Medo", "fear"],
  ["falha_esperanca", "Falha com Esperança", "hope-bad"],
  ["falha_medo", "Falha com Medo", "fear-bad"],
];
export const COM_MEDO = new Set(["sucesso_medo", "falha_medo"]);
export const LADOS = ["jogadores", "mestre"];
export const MEDO_MAX = 12;
const rotuloRes = chave => (RESULTADOS.find(r => r[0] === chave) || [chave, chave])[1];

// ---------- Lembretes (o que o mestre não pode esquecer) ----------
export const TIPOS_LEMBRETE = [["obrigatorio", "Não pode esquecer"], ["condicao", "Se acontecer…"], ["geral", "Geral"]];
const TIPO_L = { obrigatorio: "obrigatorio", obrigatoria: "obrigatorio", essencial: "obrigatorio", nao_esquecer: "obrigatorio", beat: "obrigatorio", condicao: "condicao", condicional: "condicao", se: "condicao", gatilho: "condicao", geral: "geral", dica: "geral", nota: "geral" };
const tipoL = v => TIPO_L[norm(v).replace(/[-\s]+/g, "_")];
export function validarLembretes(raw) {
  const erros = [], avisos = [];
  if (raw == null) return { erros, avisos };
  if (!Array.isArray(raw)) { erros.push({ campo: "lembretes", msg: "precisa ser uma lista." }); return { erros, avisos }; }
  raw.forEach((l, i) => {
    const p = `lembretes[${i}]`;
    if (!l || typeof l !== "object") { erros.push({ campo: p, msg: "precisa ser um objeto." }); return; }
    if (!str(l.titulo)) erros.push({ campo: p + ".titulo", msg: "obrigatório." });
    if (l.texto != null && typeof l.texto !== "string") erros.push({ campo: p + ".texto", msg: "precisa ser texto." });
    if (l.tipo != null && !tipoL(l.tipo)) avisos.push({ campo: p + ".tipo", msg: `“${l.tipo}” não existe; vale "obrigatorio", "condicao" ou "geral". Usei "geral".` });
    if (l.adversario != null && typeof l.adversario !== "string") erros.push({ campo: p + ".adversario", msg: "precisa ser o nome do adversário." });
  });
  return { erros, avisos };
}
export function criarLembretes(raw) {
  return (Array.isArray(raw) ? raw : []).filter(l => l && str(l.titulo)).map(l => ({ id: novoId(), tipo: (l.tipo != null && tipoL(l.tipo)) || "geral", titulo: String(l.titulo).trim(), texto: String(l.texto || "").trim(), adversario: str(l.adversario) ? l.adversario.trim() : "", feito: false }));
}
// Um lembrete vale para uma unidade quando o nome bate com o nome dela, com o adversário de origem ou com o nome sem o número final.
export function casaLembrete(adversario, u) {
  const n = norm(adversario);
  return !!n && [u.name, u.ref, String(u.name || "").replace(/\s+\d+$/, "")].some(x => norm(x) === n);
}

// ---------- Validação ----------
// Devolve { erros: [{campo, msg}], avisos: [{campo, msg}] }. Os campos seguem o caminho do JSON (ex.: "resultados.falha_medo").
export function validarCena(r) {
  const erros = [], avisos = [];
  const E = (campo, msg) => erros.push({ campo, msg });
  const A = (campo, msg) => avisos.push({ campo, msg });
  if (!r || typeof r !== "object" || Array.isArray(r)) { E("(raiz)", "o JSON da cena precisa ser um objeto."); return { erros, avisos }; }
  if (r.tipo !== "cena") E("tipo", 'precisa ser "cena".');
  if (!(Number(r.versao) >= 2)) E("versao", 'cenas exigem "versao": 2.');
  if (!str(r.nome)) E("nome", "obrigatório.");
  if (!str(r.objetivo)) E("objetivo", "obrigatório: o que os PJs precisam conseguir.");
  if (r.jogadores != null && !(isInt(r.jogadores) && r.jogadores >= 1 && r.jogadores <= 8)) E("jogadores", "inteiro de 1 a 8.");
  if (r.patamar != null && !(isInt(r.patamar) && r.patamar >= 1 && r.patamar <= 4)) E("patamar", "inteiro de 1 a 4.");
  if (r.dificuldade_rolagem != null && !(isInt(r.dificuldade_rolagem) && r.dificuldade_rolagem >= 1 && r.dificuldade_rolagem <= 30)) E("dificuldade_rolagem", "inteiro de 1 a 30.");

  // contagens
  const tam = new Map();
  if (!Array.isArray(r.contagens) || !r.contagens.length) E("contagens", "informe pelo menos 1 contagem.");
  else r.contagens.forEach((c, i) => {
    const p = `contagens[${i}]`;
    if (!c || typeof c !== "object") { E(p, "precisa ser um objeto."); return; }
    if (!str(c.nome)) E(p + ".nome", "obrigatório.");
    else { const k = norm(c.nome); if (tam.has(k)) E(p + ".nome", `“${c.nome}” aparece mais de uma vez.`); else tam.set(k, isInt(c.caixas) ? c.caixas : 0); }
    if (!(isInt(c.caixas) && c.caixas >= 1 && c.caixas <= 30)) E(p + ".caixas", "inteiro de 1 a 30.");
    if (c.lado != null && !LADOS.includes(norm(c.lado))) E(p + ".lado", 'use "jogadores" ou "mestre".');
  });
  const existe = n => tam.has(norm(n));
  const efeitos = (arr, p) => {
    if (arr == null) return;
    if (!Array.isArray(arr)) { E(p, "precisa ser uma lista."); return; }
    arr.forEach((e, i) => {
      const q = `${p}[${i}]`;
      if (!e || typeof e !== "object") { E(q, "precisa ser um objeto."); return; }
      if (!str(e.contagem)) E(q + ".contagem", "obrigatório.");
      else if (!existe(e.contagem)) E(q + ".contagem", `“${e.contagem}” não existe em "contagens".`);
      if (!isInt(e.delta)) E(q + ".delta", "inteiro (positivo marca caixas, negativo apaga).");
    });
  };

  // resultados
  if (!r.resultados || typeof r.resultados !== "object") E("resultados", `obrigatório, com as 5 chaves: ${RESULTADOS.map(x => x[0]).join(", ")}.`);
  else {
    RESULTADOS.forEach(([k]) => {
      const x = r.resultados[k], p = "resultados." + k;
      if (!x || typeof x !== "object") { E(p, "obrigatório."); return; }
      if (!str(x.texto)) E(p + ".texto", "obrigatório.");
      efeitos(x.efeitos, p + ".efeitos");
    });
    Object.keys(r.resultados).filter(k => !RESULTADOS.some(x => x[0] === k)).forEach(k => A("resultados." + k, "chave desconhecida; será ignorada."));
  }

  // jogadas de Medo do mestre
  if (r.medo != null) {
    if (!Array.isArray(r.medo)) E("medo", "precisa ser uma lista.");
    else r.medo.forEach((m, i) => {
      const p = `medo[${i}]`;
      if (!m || typeof m !== "object") { E(p, "precisa ser um objeto."); return; }
      if (!str(m.nome)) E(p + ".nome", "obrigatório.");
      if (!(isInt(m.custo) && m.custo >= 1 && m.custo <= MEDO_MAX)) E(p + ".custo", "inteiro de 1 a 12.");
      if (!str(m.texto)) E(p + ".texto", "obrigatório.");
      efeitos(m.efeitos, p + ".efeitos");
      if (m.limite != null) {
        if (typeof m.limite !== "object") E(p + ".limite", 'use { "por": "rodada" ou "cena", "vezes": N }.');
        else {
          if (!["rodada", "cena"].includes(norm(m.limite.por))) E(p + ".limite.por", 'use "rodada" ou "cena".');
          if (!(isInt(m.limite.vezes) && m.limite.vezes >= 1)) E(p + ".limite.vezes", "inteiro maior ou igual a 1.");
        }
      }
    });
  }

  // usos dos jogadores
  if (r.jogadores_usos != null) {
    if (!Array.isArray(r.jogadores_usos)) E("jogadores_usos", "precisa ser uma lista.");
    else r.jogadores_usos.forEach((u, i) => {
      const p = `jogadores_usos[${i}]`;
      if (!u || typeof u !== "object") { E(p, "precisa ser um objeto."); return; }
      if (!str(u.nome)) E(p + ".nome", "obrigatório.");
      if (!["esperanca", "estresse"].includes(norm(u.recurso))) E(p + ".recurso", 'use "Esperança" ou "Estresse".');
      if (!(isInt(u.custo) && u.custo >= 1)) E(p + ".custo", "inteiro maior ou igual a 1.");
      if (!str(u.texto)) E(p + ".texto", "obrigatório.");
      efeitos(u.efeitos, p + ".efeitos");
    });
  }

  // gatilhos
  if (r.gatilhos != null) {
    if (!Array.isArray(r.gatilhos)) E("gatilhos", "precisa ser uma lista.");
    else r.gatilhos.forEach((g, i) => {
      const p = `gatilhos[${i}]`;
      if (!g || typeof g !== "object") { E(p, "precisa ser um objeto."); return; }
      if (!str(g.contagem)) E(p + ".contagem", "obrigatório.");
      else if (!existe(g.contagem)) E(p + ".contagem", `“${g.contagem}” não existe em "contagens".`);
      if (!isInt(g.quando) || g.quando < 1) E(p + ".quando", "inteiro maior ou igual a 1.");
      else if (existe(g.contagem) && g.quando > tam.get(norm(g.contagem))) E(p + ".quando", `${g.quando} passa das ${tam.get(norm(g.contagem))} caixas de “${g.contagem}”: nunca dispararia.`);
      if (!str(g.titulo)) E(p + ".titulo", "obrigatório.");
      if (!str(g.texto)) E(p + ".texto", "obrigatório.");
      if (g.uma_vez != null && typeof g.uma_vez !== "boolean") E(p + ".uma_vez", "true ou false.");
    });
  }

  const lv = validarLembretes(r.lembretes); erros.push(...lv.erros); avisos.push(...lv.avisos);

  // fim
  if (!r.fim || typeof r.fim !== "object") E("fim", 'obrigatório, com pelo menos "vitoria".');
  else {
    const lado = (k, obrig) => {
      const x = r.fim[k], p = "fim." + k;
      if (x == null) { if (obrig) E(p, "obrigatório."); return; }
      if (typeof x !== "object") { E(p, "precisa ser um objeto."); return; }
      if (!str(x.contagem)) E(p + ".contagem", "obrigatório.");
      else if (!existe(x.contagem)) E(p + ".contagem", `“${x.contagem}” não existe em "contagens".`);
      if (!str(x.texto)) E(p + ".texto", "obrigatório.");
    };
    lado("vitoria", true); lado("derrota", false);
    if (r.fim.empate != null && (typeof r.fim.empate !== "object" || !str(r.fim.empate.texto))) E("fim.empate.texto", "obrigatório quando houver empate.");
    if (r.fim.vitoria && r.fim.derrota && norm(r.fim.vitoria.contagem) === norm(r.fim.derrota.contagem)) A("fim", "vitória e derrota usam a mesma contagem.");
    if (r.fim.empate && !r.fim.derrota) A("fim.empate", "sem derrota definida, o empate nunca acontece.");
  }
  return { erros, avisos };
}

// ---------- Criação ----------
const lista = (v, f) => (Array.isArray(v) ? v.map(f) : []);
const efs = v => lista(v, e => ({ contagem: String(e.contagem).trim(), delta: e.delta }));
export function criarCena(r, extra = {}) {
  const c = {
    id: novoId(), tipo: "cena", nome: String(r.nome).trim(), cena: String(r.cena || ""), objetivo: String(r.objetivo || ""), ciclo: String(r.ciclo || ""),
    jogadores: r.jogadores || 4, patamar: r.patamar || 1, dificuldadeRolagem: r.dificuldade_rolagem || null,
    contagens: lista(r.contagens, x => ({ id: novoId(), n: String(x.nome).trim(), size: x.caixas, val: 0, lado: x.lado ? norm(x.lado) : "neutro" })),
    resultados: Object.fromEntries(RESULTADOS.map(([k]) => [k, { texto: String(r.resultados[k].texto), efeitos: efs(r.resultados[k].efeitos) }])),
    medoJogadas: lista(r.medo, m => ({ id: novoId(), nome: String(m.nome), custo: m.custo, texto: String(m.texto), efeitos: efs(m.efeitos), limite: m.limite ? { por: norm(m.limite.por), vezes: m.limite.vezes } : null, usosRodada: 0, usosCena: 0 })),
    jogadoresUsos: lista(r.jogadores_usos, u => ({ id: novoId(), nome: String(u.nome), recurso: norm(u.recurso) === "estresse" ? "Estresse" : "Esperança", custo: u.custo, texto: String(u.texto), efeitos: efs(u.efeitos) })),
    gatilhos: lista(r.gatilhos, g => ({ id: novoId(), contagem: String(g.contagem).trim(), quando: g.quando, umaVez: g.uma_vez === true, titulo: String(g.titulo), texto: String(g.texto), disparado: false })),
    fim: {
      vitoria: { contagem: String(r.fim.vitoria.contagem).trim(), texto: String(r.fim.vitoria.texto) },
      derrota: r.fim.derrota ? { contagem: String(r.fim.derrota.contagem).trim(), texto: String(r.fim.derrota.texto) } : null,
      empate: r.fim.empate ? { texto: String(r.fim.empate.texto) } : null,
    },
    ambiente: null, unidades: [], proxNum: 1, lembretes: criarLembretes(r.lembretes), notas: String(r.notas || ""), recompensas: String(r.recompensas || ""),
    medo: 0, rodada: 1, status: "prep", config: { medoAuto: true },
    alertas: [], fimPendente: null, ultimo: null, log: [], pilha: [], origem: "ia", criadaEm: Date.now(),
    ...extra,
  };
  return c;
}

// ---------- Consultas ----------
export const achaContagem = (c, nome) => c.contagens.find(x => norm(x.n) === norm(nome));
export function medoDisponivel(c, m) {
  if (c.medo < m.custo) return { ok: false, motivo: `Medo insuficiente (precisa de ${m.custo}).` };
  if (m.limite) {
    const usos = m.limite.por === "rodada" ? m.usosRodada : m.usosCena;
    if (usos >= m.limite.vezes) return { ok: false, motivo: `Limite atingido: ${m.limite.vezes}× por ${m.limite.por}.` };
  }
  return { ok: true, motivo: "" };
}
export const textoLimite = m => (m.limite ? `${m.limite.vezes}× por ${m.limite.por} (usado ${m.limite.por === "rodada" ? m.usosRodada : m.usosCena})` : "");
export const cheia = k => k.val >= k.size;

// ---------- Ações (todas passam por agir: gatilhos, fim, log e desfazer) ----------
function snapshot(c) {
  return JSON.parse(JSON.stringify({
    vals: c.contagens.map(x => x.val), medo: c.medo, rodada: c.rodada, status: c.status,
    usos: c.medoJogadas.map(m => [m.usosRodada, m.usosCena]), disparados: c.gatilhos.map(g => g.disparado),
    alertas: c.alertas, fimPendente: c.fimPendente, ultimo: c.ultimo,
  }));
}
function restaurar(c, s) {
  c.contagens.forEach((x, i) => (x.val = s.vals[i]));
  c.medo = s.medo; c.rodada = s.rodada; c.status = s.status;
  c.medoJogadas.forEach((m, i) => { m.usosRodada = s.usos[i][0]; m.usosCena = s.usos[i][1]; });
  c.gatilhos.forEach((g, i) => (g.disparado = s.disparados[i]));
  c.alertas = s.alertas; c.fimPendente = s.fimPendente; c.ultimo = s.ultimo;
}

export function aplicarEfeitos(c, efeitos) {
  return (efeitos || []).map(e => {
    const k = achaContagem(c, e.contagem);
    const antes = k.val, alvo = antes + e.delta, depois = clamp(alvo, 0, k.size);
    k.val = depois;
    return { contagem: k.n, delta: e.delta, antes, depois, limitado: depois !== alvo };
  });
}

// Executa uma ação: guarda o estado para desfazer, roda a mutação, dispara gatilhos, detecta fim e registra no log.
export function agir(c, rotulo, mutacao) {
  const snap = snapshot(c);
  const antes = c.contagens.map(x => x.val);
  const info = mutacao() || {};
  const disparos = [];
  c.gatilhos.forEach(g => {
    const k = achaContagem(c, g.contagem), i = c.contagens.indexOf(k);
    if (antes[i] < g.quando && k.val >= g.quando && !(g.umaVez && g.disparado)) {
      g.disparado = true;
      c.alertas.push({ id: novoId(), titulo: g.titulo, texto: g.texto, contagem: g.contagem, quando: g.quando, rodada: c.rodada });
      disparos.push(g.titulo);
    }
  });
  // fim: só quando a contagem ENCHE nesta ação (se as duas enchem juntas, é empate)
  const kv = achaContagem(c, c.fim.vitoria.contagem), kd = c.fim.derrota && achaContagem(c, c.fim.derrota.contagem);
  const novaV = cheia(kv) && antes[c.contagens.indexOf(kv)] < kv.size;
  const novaD = kd && cheia(kd) && antes[c.contagens.indexOf(kd)] < kd.size;
  let fim = null;
  if (novaV && novaD) fim = { tipo: "empate", textos: c.fim.empate ? [c.fim.empate.texto] : [c.fim.vitoria.texto, c.fim.derrota.texto] };
  else if (novaV) fim = { tipo: "vitoria", textos: [c.fim.vitoria.texto] };
  else if (novaD) fim = { tipo: "derrota", textos: [c.fim.derrota.texto] };
  if (fim) c.fimPendente = fim;
  else if (c.fimPendente) { // apagou caixas depois de cheio: o fim some
    const t = c.fimPendente.tipo;
    if ((t === "vitoria" && !cheia(kv)) || (t === "derrota" && !(kd && cheia(kd))) || (t === "empate" && !(cheia(kv) && kd && cheia(kd)))) c.fimPendente = null;
  }
  c.ultimo = info.mostrar || null;
  c.pilha.push(snap); if (c.pilha.length > 60) c.pilha.shift();
  if (c.log.length > 300) c.log.splice(0, c.log.length - 300);
  c.log.push({ id: novoId(), rodada: c.rodada, rotulo, efeitos: info.efeitos || [], medoDelta: info.medoDelta || 0, disparos, fim: fim ? fim.tipo : null, t: Date.now() });
  return { ...info, disparos, fim };
}

export function aplicarResultado(c, chave) {
  const r = c.resultados[chave], nome = rotuloRes(chave);
  return agir(c, nome, () => {
    const efeitos = aplicarEfeitos(c, r.efeitos);
    let medoDelta = 0;
    if (c.config.medoAuto && COM_MEDO.has(chave)) { const a = c.medo; c.medo = Math.min(MEDO_MAX, c.medo + 1); medoDelta = c.medo - a; }
    return { efeitos, medoDelta, mostrar: { titulo: nome, texto: r.texto, efeitos, medoDelta } };
  });
}
export function usarMedo(c, id) {
  const m = c.medoJogadas.find(x => x.id === id);
  if (!m) return { ok: false, motivo: "Jogada não encontrada." };
  const d = medoDisponivel(c, m);
  if (!d.ok) return d;
  const r = agir(c, `Medo: ${m.nome} (−${m.custo})`, () => {
    c.medo -= m.custo; m.usosRodada++; m.usosCena++;
    const efeitos = aplicarEfeitos(c, m.efeitos);
    return { efeitos, medoDelta: -m.custo, mostrar: { titulo: m.nome, texto: m.texto, efeitos, medoDelta: -m.custo } };
  });
  return { ok: true, ...r };
}
export function usarJogador(c, id) {
  const u = c.jogadoresUsos.find(x => x.id === id);
  if (!u) return { ok: false, motivo: "Uso não encontrado." };
  const r = agir(c, `Jogadores: ${u.nome} (${u.custo} de ${u.recurso})`, () => {
    const efeitos = aplicarEfeitos(c, u.efeitos);
    return { efeitos, mostrar: { titulo: u.nome, texto: u.texto, efeitos, medoDelta: 0 } };
  });
  return { ok: true, ...r };
}
export function ajustarContagem(c, id, valor) {
  const k = c.contagens.find(x => x.id === id);
  if (!k) return null;
  const novo = clamp(valor, 0, k.size);
  if (novo === k.val) return null;
  return agir(c, `Ajuste manual: ${k.n} ${k.val}→${novo}`, () => {
    const antes = k.val; k.val = novo;
    return { efeitos: [{ contagem: k.n, delta: novo - antes, antes, depois: novo, limitado: false }] };
  });
}
export function ajustarMedo(c, valor) {
  const novo = clamp(valor, 0, MEDO_MAX);
  if (novo === c.medo) return null;
  return agir(c, `Ajuste manual de Medo ${c.medo}→${novo}`, () => { const a = c.medo; c.medo = novo; return { efeitos: [], medoDelta: novo - a }; });
}
export function proximaRodada(c) {
  return agir(c, `Rodada ${c.rodada + 1}`, () => { c.rodada++; c.medoJogadas.forEach(m => (m.usosRodada = 0)); return {}; });
}
export function desfazer(c) {
  if (!c.pilha.length) return false;
  restaurar(c, c.pilha.pop());
  c.log.pop();
  return true;
}
export function dispensarAlerta(c, id) { c.alertas = c.alertas.filter(a => a.id !== id); }
export function continuarMesmoAssim(c) { c.fimPendente = null; }
export function encerrar(c) { c.desfecho = c.fimPendente ? c.fimPendente.tipo : "manual"; c.status = "fim"; }
export function reiniciar(c) {
  c.contagens.forEach(k => (k.val = 0)); c.medo = 0; c.rodada = 1; c.status = "prep";
  c.medoJogadas.forEach(m => { m.usosRodada = 0; m.usosCena = 0; }); c.gatilhos.forEach(g => (g.disparado = false));
  c.alertas = []; c.fimPendente = null; c.ultimo = null; c.log = []; c.pilha = []; c.desfecho = null;
  c.unidades.forEach(u => { u.hp = 0; u.st = 0; u.cond = []; });
}

// Texto curto de um efeito: "Fuga +1 (3→4)"
export const descEfeito = e => `${e.contagem} ${e.delta > 0 ? "+" : e.delta < 0 ? "−" : "±"}${Math.abs(e.delta)}${e.antes != null ? ` (${e.antes}→${e.depois}${e.limitado ? ", no limite" : ""})` : ""}`;

// Ordem da lista: "Sessão N · …" por número e título; os demais depois, em aberto antes de encerrados e do mais novo ao mais antigo.
export function ordenarRegistros(l) {
  const com = l.filter(x => numeroSessao(x.nome) != null).sort((a, b) => numeroSessao(a.nome) - numeroSessao(b.nome) || a.nome.localeCompare(b.nome, "pt"));
  const sem = l.filter(x => numeroSessao(x.nome) == null).sort((a, b) => (a.status === "fim") - (b.status === "fim") || (b.criadaEm || 0) - (a.criadaEm || 0));
  return [...com, ...sem];
}

// Nomes no padrão "Sessão N · Nome · Título": devolve N ou null (para ordenar a listagem).
export function numeroSessao(nome) {
  const m = String(nome || "").match(/^\s*sess[ãa]o\s+(\d+)\s*[·\-–:]/i);
  return m ? parseInt(m[1], 10) : null;
}
