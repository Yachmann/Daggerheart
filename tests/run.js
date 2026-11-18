// Testes sem dependências. Cada teste lança um erro se algo estiver errado.
import * as C from "../js/cena.js";
import { loadData, get } from "../js/data.js";
import { empacotar, desempacotar, sanear, paraEntrega, montarLink } from "../js/entrega.js";
import { novoPersonagem } from "../js/calc.js";
import { loadGM, lerResposta, montarDaIA, extrairBlocos, orcamento, EXEMPLO_JSON } from "../js/gm.js";

const out = document.getElementById("out"), sum = document.getElementById("sum");
let total = 0, falhas = 0;
const grupo = nome => { const d = document.createElement("div"); d.className = "g"; d.textContent = nome; out.appendChild(d); };
async function teste(nome, fn) {
  total++;
  const d = document.createElement("div");
  try { await fn(); d.className = "t ok"; d.textContent = nome; }
  catch (e) { falhas++; d.className = "t bad"; d.textContent = nome; const pre = document.createElement("pre"); pre.textContent = String(e && e.message || e); d.appendChild(pre); }
  out.appendChild(d);
}
const ok = (c, msg) => { if (!c) throw new Error(msg || "afirmação falsa"); };
const igual = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || "valores diferentes"}\n  esperado: ${JSON.stringify(b)}\n  recebido: ${JSON.stringify(a)}`); };
const clone = o => JSON.parse(JSON.stringify(o));
const fixture = await (await fetch("./tests/fixtures/fuga-telhados.json")).json();
const nova = (mod) => { const raw = clone(fixture); if (mod) mod(raw); return C.criarCena(raw); };
const campos = raw => C.validarCena(raw).erros.map(e => e.campo);
const val = (c, n) => C.achaContagem(c, n).val;
await loadGM(); await loadData();

// ---------------------------------------------------------------------
grupo("Validação da cena");
await teste("o JSON de exemplo (Fuga pelos Telhados) é válido", () => { const r = C.validarCena(fixture); igual(r.erros, [], "erros inesperados"); });
await teste("campos obrigatórios ausentes apontam o campo", () => {
  for (const campo of ["nome", "objetivo", "contagens", "resultados", "fim"]) { const r = clone(fixture); delete r[campo]; ok(campos(r).includes(campo), `faltou erro para ${campo}`); }
  const r = clone(fixture); delete r.fim.vitoria; ok(campos(r).includes("fim.vitoria"), "faltou erro para fim.vitoria");
});
await teste("contagens vazia é erro", () => { const r = clone(fixture); r.contagens = []; ok(campos(r).includes("contagens")); });
await teste("contagem inexistente em efeitos de resultado", () => { const r = clone(fixture); r.resultados.falha_medo.efeitos[0].contagem = "Fantasma"; ok(campos(r).includes("resultados.falha_medo.efeitos[0].contagem")); });
await teste("contagem inexistente em medo, jogadores_usos, gatilhos e fim", () => {
  const r = clone(fixture); r.medo[0].efeitos[0].contagem = "X"; r.jogadores_usos[0].efeitos[0].contagem = "X"; r.gatilhos[0].contagem = "X"; r.fim.vitoria.contagem = "X"; r.fim.derrota.contagem = "X";
  const c = campos(r);
  for (const k of ["medo[0].efeitos[0].contagem", "jogadores_usos[0].efeitos[0].contagem", "gatilhos[0].contagem", "fim.vitoria.contagem", "fim.derrota.contagem"]) ok(c.includes(k), "faltou " + k);
});
await teste("resultados incompleto: cada chave ausente é apontada", () => { const r = clone(fixture); delete r.resultados.critico; delete r.resultados.falha_medo; const c = campos(r); ok(c.includes("resultados.critico") && c.includes("resultados.falha_medo")); });
await teste("resultado sem texto e delta não inteiro", () => { const r = clone(fixture); r.resultados.critico.texto = ""; r.resultados.critico.efeitos[0].delta = 1.5; const c = campos(r); ok(c.includes("resultados.critico.texto") && c.includes("resultados.critico.efeitos[0].delta")); });
await teste("gatilho com 'quando' maior que as caixas nunca dispararia", () => { const r = clone(fixture); r.gatilhos[0].quando = 99; ok(campos(r).includes("gatilhos[0].quando")); });
await teste("limite do Medo: 'por' e 'vezes' inválidos", () => { const r = clone(fixture); r.medo[0].limite = { por: "turno", vezes: 0 }; const c = campos(r); ok(c.includes("medo[0].limite.por") && c.includes("medo[0].limite.vezes")); });
await teste("lado inválido e contagem repetida", () => { const r = clone(fixture); r.contagens[1].lado = "gm"; r.contagens.push({ nome: "fuga", caixas: 3 }); const c = campos(r); ok(c.includes("contagens[1].lado") && c.includes("contagens[2].nome")); });
await teste("cena exige versao 2 e tipo cena", () => { const r = clone(fixture); r.versao = 1; ok(campos(r).includes("versao")); const s = clone(fixture); s.tipo = "batalha"; ok(campos(s).includes("tipo")); });
await teste("opcionais podem faltar (ambiente, adversarios, medo, usos, gatilhos, derrota, empate)", () => {
  const r = clone(fixture); for (const k of ["ambiente", "adversarios", "medo", "jogadores_usos", "gatilhos", "notas", "recompensas", "dificuldade_rolagem"]) delete r[k]; delete r.fim.derrota; delete r.fim.empate;
  igual(C.validarCena(r).erros, []);
});

// ---------------------------------------------------------------------
grupo("Efeitos e contadores");
await teste("contadores começam vazios e o lado vira cor", () => { const c = nova(); igual(c.contagens.map(k => [k.n, k.val, k.size, k.lado]), [["Fuga", 0, 8, "jogadores"], ["Cerco", 0, 8, "mestre"]]); });
await teste("delta positivo marca e negativo apaga", () => { const c = nova(); C.aplicarResultado(c, "sucesso_esperanca"); igual(val(c, "Fuga"), 1); C.aplicarEfeitos(c, [{ contagem: "Fuga", delta: -1 }]); igual(val(c, "Fuga"), 0); });
await teste("nunca fica abaixo de 0", () => { const c = nova(); const r = C.aplicarEfeitos(c, [{ contagem: "Fuga", delta: -3 }]); igual(val(c, "Fuga"), 0); ok(r[0].limitado, "devia marcar como limitado"); });
await teste("nunca passa do total de caixas", () => { const c = nova(); C.aplicarEfeitos(c, [{ contagem: "Cerco", delta: 20 }]); igual(val(c, "Cerco"), 8); });
await teste("nome da contagem ignora maiúsculas e acentos", () => { const c = nova(); C.aplicarEfeitos(c, [{ contagem: "FUGA", delta: 2 }]); igual(val(c, "Fuga"), 2); });
await teste("cada resultado aplica os efeitos da tabela", () => {
  const esperado = { critico: ["Fuga", 2], sucesso_esperanca: ["Fuga", 1], sucesso_medo: ["Fuga", 1], falha_esperanca: ["Cerco", 1], falha_medo: ["Cerco", 2] };
  for (const [chave, [n, v]] of Object.entries(esperado)) { const c = nova(); C.aplicarResultado(c, chave); igual(val(c, n), v, chave); }
});
await teste("ajuste manual muda a contagem, registra no log e respeita os limites", () => { const c = nova(); const k = c.contagens[0]; C.ajustarContagem(c, k.id, 5); igual(k.val, 5); C.ajustarContagem(c, k.id, 99); igual(k.val, 8); ok(c.log.length === 2); });

// ---------------------------------------------------------------------
grupo("Medo do mestre");
await teste("resultados com Medo somam +1 ao Medo; os outros não", () => {
  const c = nova(); C.aplicarResultado(c, "sucesso_medo"); C.aplicarResultado(c, "falha_medo"); igual(c.medo, 2);
  C.aplicarResultado(c, "critico"); C.aplicarResultado(c, "sucesso_esperanca"); C.aplicarResultado(c, "falha_esperanca"); igual(c.medo, 2);
});
await teste("o +1 automático pode ser desligado", () => { const c = nova(); c.config.medoAuto = false; C.aplicarResultado(c, "falha_medo"); igual(c.medo, 0); });
await teste("o Medo não passa de 12", () => { const c = nova(); c.medo = 12; C.aplicarResultado(c, "falha_medo"); igual(c.medo, 12); });
await teste("usar uma jogada desconta o custo e aplica os efeitos", () => { const c = nova(); c.medo = 3; const m = c.medoJogadas[0]; const r = C.usarMedo(c, m.id); ok(r.ok); igual(c.medo, 2); igual(val(c, "Cerco"), 1); });
await teste("sem Medo suficiente não usa", () => { const c = nova(); c.medo = 1; const r = C.usarMedo(c, c.medoJogadas[1].id); ok(!r.ok); igual(c.medo, 1); igual(val(c, "Fuga"), 0); });
await teste("limite por rodada: 1×; 'Próxima rodada' libera de novo", () => {
  const c = nova(); c.medo = 6; const m = c.medoJogadas[0];
  ok(C.usarMedo(c, m.id).ok); ok(!C.usarMedo(c, m.id).ok, "segunda vez na mesma rodada devia falhar"); igual(c.medo, 5);
  C.proximaRodada(c); igual(c.rodada, 2); ok(C.usarMedo(c, m.id).ok, "na rodada seguinte devia liberar");
});
await teste("limite por cena: 1×; a próxima rodada NÃO libera", () => {
  const c = nova(); c.medo = 8; const m = c.medoJogadas[1];
  ok(C.usarMedo(c, m.id).ok); C.proximaRodada(c); ok(!C.usarMedo(c, m.id).ok, "limite por cena devia continuar"); igual(c.medo, 6);
});
await teste("jogada sem limite pode repetir", () => { const c = nova(); c.medo = 3; const m = c.medoJogadas[2]; ok(C.usarMedo(c, m.id).ok && C.usarMedo(c, m.id).ok && C.usarMedo(c, m.id).ok); igual(c.medo, 0); });
await teste("usos dos jogadores aplicam efeitos e vão para o log, sem rastrear recursos", () => {
  const c = nova(); const u = c.jogadoresUsos[0]; C.usarJogador(c, u.id); igual(val(c, "Fuga"), 1); ok(c.log[0].rotulo.includes("Salto Impossível")); ok(!("esperanca" in c));
});

// ---------------------------------------------------------------------
grupo("Gatilhos");
await teste("dispara quando a contagem chega ao valor (Fuga 4)", () => {
  const c = nova(); C.ajustarContagem(c, c.contagens[0].id, 3); igual(c.alertas.length, 0);
  const r = C.aplicarResultado(c, "sucesso_esperanca"); igual(val(c, "Fuga"), 4); igual(c.alertas.length, 1); igual(c.alertas[0].titulo, "Iolande!"); igual(r.disparos, ["Iolande!"]);
});
await teste("dispara ao ULTRAPASSAR o valor (3 → 5 com crítico)", () => { const c = nova(); C.ajustarContagem(c, c.contagens[0].id, 3); C.aplicarResultado(c, "critico"); igual(c.alertas.length, 1); });
await teste("não dispara antes do valor", () => { const c = nova(); C.aplicarResultado(c, "sucesso_esperanca"); C.aplicarResultado(c, "sucesso_esperanca"); igual(c.alertas.length, 0); });
await teste("uma_vez: ligado dispara só uma vez, mesmo baixando e subindo de novo", () => {
  const c = nova(); const k = c.contagens[0];
  C.ajustarContagem(c, k.id, 4); igual(c.alertas.length, 1); C.ajustarContagem(c, k.id, 3); C.ajustarContagem(c, k.id, 4); igual(c.alertas.length, 1);
});
await teste("uma_vez: desligado dispara de novo a cada subida", () => {
  const c = nova(r => { r.gatilhos[0].uma_vez = false; }); const k = c.contagens[0];
  C.ajustarContagem(c, k.id, 4); C.ajustarContagem(c, k.id, 3); C.ajustarContagem(c, k.id, 4); igual(c.alertas.length, 2);
});
await teste("dispensar o alerta não faz o gatilho disparar de novo", () => { const c = nova(); const k = c.contagens[0]; C.ajustarContagem(c, k.id, 4); C.dispensarAlerta(c, c.alertas[0].id); igual(c.alertas.length, 0); C.ajustarContagem(c, k.id, 3); C.ajustarContagem(c, k.id, 4); igual(c.alertas.length, 0); });

// ---------------------------------------------------------------------
grupo("Fim de cena");
await teste("vitória: a contagem de vitória enche", () => { const c = nova(); C.ajustarContagem(c, c.contagens[0].id, 8); igual(c.fimPendente.tipo, "vitoria"); igual(c.fimPendente.textos, ["Chegam ao moinho limpos."]); });
await teste("derrota: a contagem de derrota enche", () => { const c = nova(); C.ajustarContagem(c, c.contagens[1].id, 8); igual(c.fimPendente.tipo, "derrota"); igual(c.fimPendente.textos[0].slice(0, 11), "Encurralado"); });
await teste("empate: as duas enchem na mesma ação", () => {
  const c = nova(r => { r.resultados.critico.efeitos = [{ contagem: "Fuga", delta: 8 }, { contagem: "Cerco", delta: 8 }]; });
  C.aplicarResultado(c, "critico"); igual(c.fimPendente.tipo, "empate"); igual(c.fimPendente.textos, ["As duas completam na mesma ação: escapam, mas Renn viu um rosto."]);
});
await teste("sem texto de empate, mostra os dois textos", () => {
  const c = nova(r => { delete r.fim.empate; r.resultados.critico.efeitos = [{ contagem: "Fuga", delta: 8 }, { contagem: "Cerco", delta: 8 }]; });
  C.aplicarResultado(c, "critico"); igual(c.fimPendente.tipo, "empate"); igual(c.fimPendente.textos.length, 2);
});
await teste("uma enche numa ação e a outra em outra: não é empate", () => { const c = nova(); C.ajustarContagem(c, c.contagens[0].id, 8); C.continuarMesmoAssim(c); C.ajustarContagem(c, c.contagens[1].id, 8); igual(c.fimPendente.tipo, "derrota"); });
await teste("'Continuar mesmo assim' limpa o aviso e 'Encerrar' fecha a cena", () => { const c = nova(); C.ajustarContagem(c, c.contagens[0].id, 8); C.continuarMesmoAssim(c); igual(c.fimPendente, null); C.ajustarContagem(c, c.contagens[0].id, 7); C.ajustarContagem(c, c.contagens[0].id, 8); C.encerrar(c); igual(c.status, "fim"); igual(c.desfecho, "vitoria"); });
await teste("apagar caixas depois de cheio desfaz o aviso de fim", () => { const c = nova(); C.ajustarContagem(c, c.contagens[0].id, 8); ok(c.fimPendente); C.ajustarContagem(c, c.contagens[0].id, 6); igual(c.fimPendente, null); });
await teste("sem 'derrota' definida, só a vitória encerra", () => { const c = nova(r => { delete r.fim.derrota; delete r.fim.empate; }); C.ajustarContagem(c, c.contagens[1].id, 8); igual(c.fimPendente, null); });

// ---------------------------------------------------------------------
grupo("Desfazer");
await teste("a última ação volta ao estado anterior (contagens, Medo, log)", () => {
  const c = nova(); C.aplicarResultado(c, "sucesso_medo"); C.aplicarResultado(c, "falha_medo");
  igual([val(c, "Fuga"), val(c, "Cerco"), c.medo, c.log.length], [1, 2, 2, 2]);
  ok(C.desfazer(c)); igual([val(c, "Fuga"), val(c, "Cerco"), c.medo, c.log.length], [1, 0, 1, 1]);
  ok(C.desfazer(c)); igual([val(c, "Fuga"), val(c, "Cerco"), c.medo, c.log.length], [0, 0, 0, 0]);
  ok(!C.desfazer(c), "sem histórico não desfaz");
});
await teste("desfazer devolve o uso e o custo de uma jogada de Medo", () => { const c = nova(); c.medo = 3; const m = c.medoJogadas[0]; C.usarMedo(c, m.id); C.desfazer(c); igual([c.medo, m.usosRodada, m.usosCena, val(c, "Cerco")], [3, 0, 0, 0]); ok(C.usarMedo(c, m.id).ok); });
await teste("desfazer remove o alerta e libera o gatilho de novo", () => {
  const c = nova(); C.ajustarContagem(c, c.contagens[0].id, 4); igual(c.alertas.length, 1); C.desfazer(c); igual(c.alertas.length, 0); igual(c.gatilhos[0].disparado, false);
  C.ajustarContagem(c, c.contagens[0].id, 4); igual(c.alertas.length, 1);
});
await teste("desfazer volta o aviso de fim e a rodada", () => { const c = nova(); C.ajustarContagem(c, c.contagens[0].id, 8); ok(c.fimPendente); C.desfazer(c); igual(c.fimPendente, null); C.proximaRodada(c); C.desfazer(c); igual(c.rodada, 1); });
await teste("reiniciar zera tudo", () => { const c = nova(); c.medo = 4; C.aplicarResultado(c, "critico"); C.reiniciar(c); igual([val(c, "Fuga"), c.medo, c.log.length, c.pilha.length, c.rodada], [0, 0, 0, 0, 1]); });

// ---------------------------------------------------------------------
grupo("Importador: compatibilidade e blocos");
const v1 = clone(EXEMPLO_JSON);
const blocoMD = o => "```json\n" + JSON.stringify(o, null, 2) + "\n```";
await teste("batalha v1 (sem 'tipo') continua importando como batalha", () => {
  const r = lerResposta(blocoMD(v1)); igual(r.length, 1); igual(r[0].tipo, "batalha"); ok(r[0].ok, JSON.stringify(r[0].avisos)); igual(r[0].registro.unidades.length, 7);
});
await teste("batalha v2 com tipo 'batalha' se comporta igual à v1", () => {
  const v2 = clone(v1); v2.versao = 2; v2.tipo = "batalha";
  const a = lerResposta(blocoMD(v1))[0], b = lerResposta(blocoMD(v2))[0];
  ok(b.ok); igual(b.registro.unidades.map(u => [u.name, u.hpMax, u.type]), a.registro.unidades.map(u => [u.name, u.hpMax, u.type]));
  igual(orcamento(b.registro), orcamento(a.registro)); igual(b.registro.contagens.map(c => c.n), a.registro.contagens.map(c => c.n));
});
await teste("a função antiga montarDaIA continua igual para JSON v1", () => { const r = montarDaIA(clone(v1)); ok(r.ok); igual(r.batalha.unidades.length, 7); ok(!r.batalha.tipo || r.batalha.tipo === "batalha"); });
await teste("a cena de exemplo importa como cena", () => { const r = lerResposta(blocoMD(fixture)); igual(r[0].tipo, "cena"); ok(r[0].ok, JSON.stringify(r[0].avisos)); igual(r[0].registro.tipo, "cena"); igual(r[0].registro.ambiente.name, "Cliffside Ascent"); });
await teste("texto inteiro com vários blocos: cada bloco vira um item", () => {
  const texto = `Aqui estão as duas cenas {com chaves soltas}.\n\n${blocoMD(v1)}\n\nE agora a fuga:\n\n${blocoMD(fixture)}\n\nBoa sorte!`;
  const r = lerResposta(texto); igual(r.map(x => x.tipo), ["batalha", "cena"]); ok(r.every(x => x.ok));
});
await teste("um bloco inválido não derruba os outros", () => {
  const texto = `${blocoMD(v1)}\n\n\`\`\`json\n{ "tipo": "cena", "nome": "X", \n\`\`\`\n\n${blocoMD(fixture)}`;
  const r = lerResposta(texto); igual(r.length, 3); ok(r[0].ok && !r[1].ok && r[2].ok); ok(/^O JSON está (inválido|incompleto)/.test(r[1].avisos[0].t));
});
await teste("cena com versao 1 dá erro claro apontando o campo", () => { const c = clone(fixture); c.versao = 1; const r = lerResposta(blocoMD(c))[0]; ok(!r.ok); ok(r.avisos.some(a => a.campo === "versao" && /versao/.test(a.t))); });
await teste("tipo desconhecido dá erro claro", () => { const c = clone(fixture); c.tipo = "perseguicao"; const r = lerResposta(blocoMD(c))[0]; ok(!r.ok); ok(/tipo/.test(r[0] ? "" : r.avisos[0].t)); });
await teste("cena com erro mostra o caminho do campo", () => { const c = clone(fixture); c.resultados.falha_medo.efeitos[0].contagem = "Nada"; const r = lerResposta(blocoMD(c))[0]; ok(r.avisos.some(a => a.t.startsWith("resultados.falha_medo.efeitos[0].contagem:"))); });
await teste("cena com adversários usa o mesmo formato da batalha (ref e novo)", () => {
  const c = clone(fixture); c.adversarios = [{ ref: "Bear", quantidade: 1 }, v1.adversarios[1]]; const r = lerResposta(blocoMD(c))[0];
  ok(r.ok, JSON.stringify(r.avisos)); igual(r.registro.unidades.length, 5); igual(r.novos.length, 1);
});
await teste("adversário inexistente numa cena é erro com sugestão", () => { const c = clone(fixture); c.adversarios = [{ ref: "Bearr", quantidade: 1 }]; const r = lerResposta(blocoMD(c))[0]; ok(!r.ok); ok(/Bear/.test(r.avisos.map(a => a.t).join())); });
await teste("batalha com resultados/contagens mas sem 'tipo' sugere usar tipo cena", () => { const c = clone(fixture); delete c.tipo; delete c.adversarios; const r = lerResposta(blocoMD(c))[0]; ok(!r.ok); ok(/"tipo": "cena"/.test(r.avisos[0].t)); });
await teste("extrairBlocos ignora blocos de código que não são JSON de conteúdo", () => { const b = extrairBlocos("```js\nconst a = 1\n```\n" + blocoMD(v1)); igual(b.length, 1); });
await teste("ordem por sessão: reconhece 'Sessão N · …'", () => { igual(C.numeroSessao("Sessão 12 · A Ponte · Fuga"), 12); igual(C.numeroSessao("sessao 3 - X"), 3); igual(C.numeroSessao("Emboscada"), null); });

grupo("Lembretes");
await teste("lembretes válidos não geram erro", () => { igual(C.validarLembretes([{ titulo: "A", texto: "x", tipo: "obrigatorio" }, { titulo: "B", tipo: "condicao", adversario: "Bear" }, { titulo: "C" }]).erros, []); });
await teste("sem título é erro apontando o campo; tipo desconhecido é só aviso", () => {
  const r = C.validarLembretes([{ texto: "x" }, { titulo: "T", tipo: "xyz" }]);
  igual(r.erros.map(e => e.campo), ["lembretes[0].titulo"]); igual(r.avisos.map(e => e.campo), ["lembretes[1].tipo"]);
  igual(C.validarLembretes("oi").erros.map(e => e.campo), ["lembretes"]);
});
await teste("tipos aceitam variações com acento e espaço", () => {
  const l = C.criarLembretes([{ titulo: "1", tipo: "Condição" }, { titulo: "2", tipo: "Obrigatório" }, { titulo: "3", tipo: "não esquecer" }, { titulo: "4" }, { titulo: "5", tipo: "dica" }]);
  igual(l.map(x => x.tipo), ["condicao", "obrigatorio", "obrigatorio", "geral", "geral"]); ok(l.every(x => x.feito === false && x.id));
});
await teste("o lembrete casa com o adversário pelo nome, pela origem ou sem o número final", () => {
  ok(C.casaLembrete("Bandit", { name: "Bandit 2", ref: "Jagged Knife Bandit" })); ok(C.casaLembrete("jagged knife bandit", { name: "Capanga Zé", ref: "Jagged Knife Bandit" }));
  ok(C.casaLembrete("Capanga Zé", { name: "Capanga Zé", ref: "X" })); ok(!C.casaLembrete("Outro", { name: "Bandit 2", ref: "Bandit" })); ok(!C.casaLembrete("", { name: "A", ref: "A" }));
});
await teste("o exemplo de batalha traz lembretes e importa sem avisos", () => {
  const r = lerResposta(blocoMD(EXEMPLO_JSON))[0]; ok(r.ok, JSON.stringify(r.avisos)); igual(r.registro.lembretes.length, 2); igual(r.avisos.length, 0, "avisos inesperados");
  igual(r.registro.lembretes.map(l => l.tipo), ["obrigatorio", "condicao"]);
});
await teste("lembrete de adversário que não está na batalha avisa, mas não impede", () => {
  const b = clone(EXEMPLO_JSON); b.lembretes = [{ titulo: "X", adversario: "Dragão Inexistente" }]; const r = lerResposta(blocoMD(b))[0];
  ok(r.ok); ok(r.avisos.some(a => a.campo === "lembretes[0].adversario"));
});
await teste("lembrete sem título numa batalha é erro com o campo", () => { const b = clone(EXEMPLO_JSON); b.lembretes = [{ texto: "só texto" }]; const r = lerResposta(blocoMD(b))[0]; ok(!r.ok); ok(r.avisos.some(a => a.t.startsWith("lembretes[0].titulo:"))); });
await teste("batalha sem 'lembretes' continua igual (lista vazia)", () => { const b = clone(EXEMPLO_JSON); delete b.lembretes; const r = lerResposta(blocoMD(b))[0]; ok(r.ok); igual(r.registro.lembretes, []); });
await teste("cena aceita lembretes e valida os campos", () => {
  const c = nova(r => { r.lembretes = [{ titulo: "Renn vigia", tipo: "obrigatorio", texto: "Renn precisa ver o rosto de alguém." }]; }); igual(c.lembretes.length, 1); igual(c.lembretes[0].tipo, "obrigatorio");
  const r = clone(fixture); r.lembretes = [{ tipo: "geral" }]; ok(campos(r).includes("lembretes[0].titulo"));
});

grupo("Listagem");
await teste("ordena por número de sessão e deixa os outros depois", () => {
  const l = [{ nome: "Emboscada", status: "prep", criadaEm: 5 }, { nome: "Sessão 10 · B · Y", criadaEm: 1 }, { nome: "Sessão 2 · A · Z", criadaEm: 9 }, { nome: "Sessão 2 · A · A", criadaEm: 3 }, { nome: "Antiga", status: "fim", criadaEm: 9 }, { nome: "Nova", status: "ativa", criadaEm: 8 }];
  igual(C.ordenarRegistros(l).map(x => x.nome), ["Sessão 2 · A · A", "Sessão 2 · A · Z", "Sessão 10 · B · Y", "Nova", "Emboscada", "Antiga"]);
});

grupo("Enviar personagem por link");
const pcExemplo = () => { const p = novoPersonagem(); Object.assign(p, { nome: "Thessa", classe: "Rogue", subclasse: "Nightwalker", anc: { tipo: "uma", id: "Elf" }, comunidade: "Slyborne", armas: { p: "Rapier", s: "" }, armadura: "Gambeson Armor", nivel: 3 }); p.st.pv = 4; p.st.cond = ["Vulnerável"]; p.modelo = true; return p; };
await teste("ida e volta: o personagem chega igual, com estado limpo e sem a etiqueta de modelo", async () => {
  const link = await empacotar(paraEntrega(pcExemplo())); const pc = await desempacotar(link);
  igual([pc.nome, pc.classe, pc.nivel], ["Thessa", "Rogue", 3]); igual(pc.st, { pv: 0, es: 0, esp: 2, arm: 0, cond: [] }); ok(!pc.modelo);
});
await teste("entregar sem zerar mantém o estado", async () => { const pc = await desempacotar(await empacotar(paraEntrega(pcExemplo(), { zerar: false }))); igual(pc.st.pv, 4); });
await teste("o link é curto (cabe em mensagem)", async () => { const l = await montarLink(pcExemplo(), { mesaCodigo: "abc123" }); ok(l.length < 1500, "link com " + l.length + " caracteres"); ok(l.includes("?m=abc123")); });
await teste("link adulterado ou desconhecido dá erro claro", async () => {
  for (const ruim of ["d.AAAA", "xx", "d.@@@", ""]) { let msg = ""; try { await desempacotar(ruim); } catch (e) { msg = e.message; } ok(msg.length > 5, "devia falhar para " + JSON.stringify(ruim)); }
});
await teste("classe desconhecida é recusada", () => { let msg = ""; try { sanear({ ...pcExemplo(), classe: "Pirata" }); } catch (e) { msg = e.message; } ok(/classe/i.test(msg)); });
await teste("campos com tipo errado não quebram a ficha", () => { const pc = sanear({ ...pcExemplo(), exp: "x", cartas: "y", st: 5, nivel: 99 }); ok(Array.isArray(pc.exp) && Array.isArray(pc.cartas.mao) && typeof pc.st === "object"); igual(pc.nivel, 10); });

sum.className = "sum " + (falhas ? "bad" : "ok");
sum.textContent = falhas ? `${falhas} de ${total} testes falharam` : `Todos os ${total} testes passaram`;
document.title = (falhas ? "✗ " : "✓ ") + sum.textContent;
window.__testes = { total, falhas };
