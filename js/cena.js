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

// ---------- Pressão de Fim de Rodada (homebrew) ----------
// No fim da rodada, o PJ com o pior resultado (empate: o mestre escolhe) faz uma reação na Dificuldade da cena.
// Falha: dano da faixa do Contador do mestre. Sucesso: Estresse. Crítico: ignora. Não custa Medo e não mexe nos Contadores.
export const ATRIBUTOS = ["Agilidade", "Força", "Acuidade", "Instinto", "Presença", "Conhecimento"];
export const DANO_TIER = { 1: ["1d6+2", "1d8+3", "1d10+4"], 2: ["2d6+3", "2d8+3", "2d10+4"], 3: ["3d8+3", "3d10+4", "3d12+5"], 4: ["4d8+10", "4d10+12", "4d12+15"] };
export const PRESSAO_RES = { falha: "Falhou", sucesso: "Passou", critico: "Crítico", pular: "Pulou" };
const RE_DANO = /^\d{1,2}d\d{1,3}([+-]\d{1,3})?\s+(fis|mag)$/;
const PRESSAO_SUCESSO = "Marca 1 Estresse.", PRESSAO_CRITICO = "Ignora o efeito.";
const limpaDano = s => norm(s).replace(/\s*([+-])\s*/g, "$1").replace(/\s+/g, " ");
// "1d6 + 2 fis" -> "1d6+2 fís"
const normDano = s => limpaDano(s).replace(/ fis$/, " fís").replace(/ mag$/, " mág");
export const danoValido = s => str(s) && RE_DANO.test(limpaDano(s));

// Terços das caixas (valores 0..caixas) com o dano do Tier. Com 8 caixas: 0–2, 3–5, 6–8. Com só 1 caixa: 0 e 1 (leve e pesada).
export function faixasPadrao(caixas, patamar = 1) {
  const d = DANO_TIER[clamp(isInt(patamar) ? patamar : 1, 1, 4)], n = caixas + 1;
  if (n < 3) return [{ de: 0, ate: 0, dano: d[0] + " fís" }, { de: 1, ate: caixas, dano: d[2] + " fís" }];
  const base = Math.floor(n / 3), sobra = n % 3;
  let de = 0;
  return [0, 1, 2].map(i => { const q = base + (i < sobra ? 1 : 0), f = { de, ate: de + q - 1, dano: d[i] + " fís" }; de += q; return f; });
}
const lacunas = (faixas, caixas) => {
  const cob = new Set(); faixas.forEach(f => { for (let v = f.de; v <= f.ate; v++) cob.add(v); });
  const r = []; let ini = null;
  for (let v = 0; v <= caixas + 1; v++) { const falta = v <= caixas && !cob.has(v); if (falta && ini == null) ini = v; if (!falta && ini != null) { r.push(ini === v - 1 ? `${ini}` : `${ini}–${v - 1}`); ini = null; } }
  return r;
};
// ctx: { tam: Map(norm(nome) -> { caixas, lado, nome }), dificuldade (da cena) }. Devolve { erros, avisos } com campos "pressao.…".
export function validarPressao(p, ctx) {
  const erros = [], avisos = [];
  const E = (c, m) => erros.push({ campo: "pressao" + (c ? "." + c : ""), msg: m });
  const A = (c, m) => avisos.push({ campo: "pressao" + (c ? "." + c : ""), msg: m });
  if (!p || typeof p !== "object" || Array.isArray(p)) { E("", "precisa ser um objeto."); return { erros, avisos }; }
  if (p.atributo != null) {
    if (!str(p.atributo)) E("atributo", "precisa ser o nome de um atributo.");
    else if (!ATRIBUTOS.some(a => norm(a) === norm(p.atributo))) A("atributo", `“${p.atributo}” não é um dos 6 atributos (${ATRIBUTOS.join(", ")}).`);
  }
  if (p.dificuldade != null) { if (!(isInt(p.dificuldade) && p.dificuldade >= 1 && p.dificuldade <= 30)) E("dificuldade", "inteiro de 1 a 30."); }
  else if (!ctx.dificuldade) E("dificuldade", 'omitida e a cena não tem "dificuldade_rolagem": informe uma das duas.');
  let caixas = null;
  if (!str(p.contagem)) E("contagem", "obrigatório: a Contagem do mestre que mede a pressão.");
  else {
    const k = ctx.tam.get(norm(p.contagem));
    if (!k) E("contagem", `“${p.contagem}” não existe em "contagens".`);
    else { caixas = k.caixas; if (k.lado !== "mestre") E("contagem", `“${p.contagem}” precisa ser uma contagem do lado "mestre" (está como "${k.lado}").`); }
  }
  if (p.faixas != null) {
    if (!Array.isArray(p.faixas) || !p.faixas.length) E("faixas", "lista com pelo menos 1 faixa (ou omita para gerar pelos terços do Tier).");
    else {
      const boas = [];
      p.faixas.forEach((f, i) => {
        const q = `faixas[${i}]`;
        if (!f || typeof f !== "object") { E(q, "precisa ser um objeto."); return; }
        let bom = true;
        if (!(isInt(f.de) && f.de >= 0)) { E(q + ".de", "inteiro maior ou igual a 0."); bom = false; }
        if (!(isInt(f.ate) && f.ate >= 0)) { E(q + ".ate", "inteiro maior ou igual a 0."); bom = false; }
        if (bom && f.ate < f.de) { E(q + ".ate", `“ate” (${f.ate}) é menor que “de” (${f.de}).`); bom = false; }
        if (bom && caixas != null && f.ate > caixas) { E(q + ".ate", `${f.ate} passa das ${caixas} caixas de “${p.contagem}”: faixa fora do Contador.`); bom = false; }
        if (!str(f.dano)) E(q + ".dano", "obrigatório.");
        else if (!danoValido(f.dano)) E(q + ".dano", `“${f.dano}” está malformado; use dados + tipo, como "1d8+3 fís" ou "2d6+3 mág".`);
        if (bom) boas.push({ i, de: f.de, ate: f.ate });
      });
      boas.sort((a, b) => a.de - b.de).forEach((f, j, arr) => { if (j && f.de <= arr[j - 1].ate) E(`faixas[${f.i}]`, `sobrepõe a faixa ${arr[j - 1].i} (${arr[j - 1].de}–${arr[j - 1].ate}).`); });
      if (caixas != null && boas.length === p.faixas.length && !erros.length) { const l = lacunas(boas, caixas); if (l.length) A("faixas", `sem faixa para o valor ${l.join(", ")} de “${p.contagem}”: nesses pontos a Pressão não causa dano.`); }
    }
  }
  for (const k of ["sucesso", "critico", "texto"]) if (p[k] != null && typeof p[k] !== "string") E(k, "precisa ser texto.");
  return { erros, avisos };
}
// Monta a Pressão guardada na cena. contagens: [{ n, size }] da cena já criada; devolve o nome canônico da contagem.
export function montarPressao(p, contagens, patamar = 1) {
  const k = contagens.find(x => norm(x.n) === norm(p.contagem));
  const dadas = Array.isArray(p.faixas) && p.faixas.length > 0;
  return {
    atributo: str(p.atributo) ? p.atributo.trim() : "Agilidade",
    dificuldade: isInt(p.dificuldade) ? p.dificuldade : null, // null = usa a dificuldade_rolagem da cena
    contagem: k.n,
    faixas: dadas ? p.faixas.map(f => ({ de: f.de, ate: f.ate, dano: normDano(f.dano) })).sort((a, b) => a.de - b.de) : faixasPadrao(k.size, patamar),
    faixasPadrao: !dadas,
    sucesso: str(p.sucesso) ? p.sucesso.trim() : PRESSAO_SUCESSO,
    critico: str(p.critico) ? p.critico.trim() : PRESSAO_CRITICO,
    texto: String(p.texto || "").trim(),
  };
}
// Valida uma Pressão editada na tela contra a cena já criada.
export function validarPressaoCena(c, raw) {
  const tam = new Map(c.contagens.map(k => [norm(k.n), { caixas: k.size, lado: k.lado, nome: k.n }]));
  return validarPressao(raw, { tam, dificuldade: c.dificuldadeRolagem });
}
export const difPressao = c => (c.pressao ? c.pressao.dificuldade || c.dificuldadeRolagem || null : null);
export function faixaAtiva(c) {
  const p = c.pressao, k = p && achaContagem(c, p.contagem);
  return k ? p.faixas.find(f => k.val >= f.de && k.val <= f.ate) || null : null;
}
// Pressão padrão do Tier para uma cena que já existe: usa a primeira contagem do mestre.
export function pressaoPadraoDe(c) {
  const k = c.contagens.find(x => x.lado === "mestre");
  if (!k) return null;
  return montarPressao({ atributo: "Agilidade", contagem: k.n }, c.contagens, c.patamar);
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
  const tam = new Map(), info = new Map();
  if (!Array.isArray(r.contagens) || !r.contagens.length) E("contagens", "informe pelo menos 1 contagem.");
  else r.contagens.forEach((c, i) => {
    const p = `contagens[${i}]`;
    if (!c || typeof c !== "object") { E(p, "precisa ser um objeto."); return; }
    if (!str(c.nome)) E(p + ".nome", "obrigatório.");
    else { const k = norm(c.nome); if (tam.has(k)) E(p + ".nome", `“${c.nome}” aparece mais de uma vez.`); else { tam.set(k, isInt(c.caixas) ? c.caixas : 0); info.set(k, { caixas: isInt(c.caixas) ? c.caixas : 0, lado: c.lado != null ? norm(c.lado) : "neutro", nome: c.nome }); } }
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

  if (r.pressao != null) { const vp = validarPressao(r.pressao, { tam: info, dificuldade: r.dificuldade_rolagem }); erros.push(...vp.erros); avisos.push(...vp.avisos); }

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
  const contagens = lista(r.contagens, x => ({ id: novoId(), n: String(x.nome).trim(), size: x.caixas, val: 0, lado: x.lado ? norm(x.lado) : "neutro" }));
  const c = {
    id: novoId(), tipo: "cena", nome: String(r.nome).trim(), cena: String(r.cena || ""), objetivo: String(r.objetivo || ""), ciclo: String(r.ciclo || ""),
    jogadores: r.jogadores || 4, patamar: r.patamar || 1, dificuldadeRolagem: r.dificuldade_rolagem || null,
    contagens, pressao: r.pressao ? montarPressao(r.pressao, contagens, r.patamar || 1) : null,
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
  c.log.push({ id: novoId(), rodada: info.rodadaLog ?? c.rodada, rotulo, efeitos: info.efeitos || [], medoDelta: info.medoDelta || 0, disparos, fim: fim ? fim.tipo : null, ...(info.pressao ? { pressao: info.pressao } : {}), t: Date.now() });
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
// Fecha a rodada. Com Pressão na cena, `pressao` é "falha" | "sucesso" | "critico" | "pular": entra no log na mesma ação
// (um só "desfazer"). A Pressão não gasta Medo e não mexe nos Contadores.
export function proximaRodada(c, pressao = null) {
  const p = c.pressao, de = c.rodada, aplica = p && PRESSAO_RES[pressao] ? pressao : null;
  let rotulo = `Rodada ${de + 1}`, mostrar, reg;
  if (aplica) {
    const k = achaContagem(c, p.contagem), faixa = faixaAtiva(c), dif = difPressao(c);
    const efeito = aplica === "falha" ? (faixa ? `dano ${faixa.dano}` : "sem faixa ativa, sem dano") : aplica === "sucesso" ? p.sucesso : aplica === "critico" ? p.critico : "não aplicada";
    rotulo = `Pressão da rodada ${de} · ${PRESSAO_RES[aplica]} (${efeito}) → Rodada ${de + 1}`;
    reg = { resultado: aplica, dano: aplica === "falha" && faixa ? faixa.dano : null, contagem: p.contagem, valor: k ? k.val : null };
    if (aplica !== "pular") mostrar = { titulo: `Pressão de fim da rodada ${de}`, texto: `${p.atributo}, Dificuldade ${dif}: **${PRESSAO_RES[aplica].toLowerCase()}**. ${aplica === "falha" ? (faixa ? `Dano: **${faixa.dano}**.` : "Nenhuma faixa de dano para este valor.") : efeito}`, efeitos: [], medoDelta: 0 };
  }
  return agir(c, rotulo, () => { c.rodada++; c.medoJogadas.forEach(m => (m.usosRodada = 0)); return aplica ? { rodadaLog: de, pressao: reg, mostrar } : {}; });
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
