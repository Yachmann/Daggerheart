// Testes sem dependências. Cada teste lança um erro se algo estiver errado.
import * as C from "../js/cena.js";
import { loadData, get } from "../js/data.js";
import { empacotar, desempacotar, sanear, paraEntrega, montarLink } from "../js/entrega.js";
import { novoPersonagem } from "../js/calc.js";
import * as L from "../js/locais.js";
import { aplicar } from "../js/views/dar.js";
import { S as ST } from "../js/store.js";
import { lerPersonagens, EXEMPLO_PERSONAGEM } from "../js/personagem-json.js";
import { tokens as tokensDe, gastarToken, devolverToken } from "../js/homebrew.js";
import { loadGM, lerResposta, montarDaIA, extrairBlocos, orcamento, EXEMPLO_JSON, GM, adversarios, adicionar, novaBatalha, setMesaAtiva, mesaAtiva, naMesaAtiva, SEM_MESA, estiloAdv, gerarAdversario, sortearHabilidade, TIPOS, CATS } from "../js/gm.js";
import { sortearNomes, sortearLugares, sortearDescricao, TIPOS_LUGAR, TIPOS_DESC } from "../js/nomes.js";
import * as MK from "../js/marcadores.js";

const _bak = { f: localStorage.getItem("dh-fichas-v1"), m: localStorage.getItem("dh-mestre-v1") }; // os testes mexem em fichas: restauramos o que havia no fim
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

grupo("Lembretes: JSON real (Bram Queima)");
const bram = await (await fetch("./tests/fixtures/bram-queima.json")).text();
await teste("a batalha da Bram importa com os 5 lembretes e sem avisos", () => {
  const r = lerResposta(bram)[0]; ok(r.ok, JSON.stringify(r.avisos)); igual(r.registro.lembretes.length, 5); igual(r.avisos.length, 0, "avisos inesperados");
  igual(r.registro.lembretes.map(l => l.tipo), ["obrigatorio", "obrigatorio", "condicao", "condicao", "geral"]);
});
await teste("cada lembrete com adversário casa com uma unidade (aparece o selo no cartão)", () => {
  const b = lerResposta(bram)[0].registro;
  for (const l of b.lembretes.filter(x => x.adversario)) ok(b.unidades.some(u => C.casaLembrete(l.adversario, u)), "sem unidade para " + l.adversario);
});

grupo("Pressão de Fim de Rodada");
const PR = () => ({ atributo: "Agilidade", dificuldade: 12, contagem: "Cerco", faixas: [{ de: 0, ate: 2, dano: "1d6+2 fís" }, { de: 3, ate: 5, dano: "1d8+3 fís" }, { de: 6, ate: 8, dano: "1d10+4 fís" }], sucesso: "Marca 1 Estresse.", critico: "Ignora o efeito." });
const rawP = mod => { const r = clone(fixture); r.pressao = PR(); if (mod) mod(r.pressao, r); return r; };
const novaP = mod => C.criarCena(rawP(mod));
const campP = mod => campos(rawP(mod));
const msgP = (mod, campo) => (C.validarCena(rawP(mod)).erros.find(e => e.campo === campo) || {}).msg || "";
await teste("JSON antigo, sem pressao, continua válido e importa igual", async () => {
  igual(C.validarCena(fixture).erros, [], "fixture antigo");
  const c = C.criarCena(clone(fixture)); igual(c.pressao, null, "sem pressao => null");
  const it = lerResposta("```json\n" + JSON.stringify(fixture) + "\n```")[0]; ok(it.ok && it.tipo === "cena", "importou"); igual(it.registro.pressao, null);
  C.proximaRodada(c); igual(c.log.at(-1).rotulo, "Rodada 2", "próxima rodada sem Pressão é a de sempre"); ok(!c.log.at(-1).pressao);
});
await teste("JSON novo com pressao valida, importa e guarda a Pressão", () => {
  igual(C.validarCena(rawP()).erros, [], "erros inesperados");
  const it = lerResposta("```json\n" + JSON.stringify(rawP()) + "\n```")[0]; ok(it.ok, "importou");
  const p = it.registro.pressao; igual([p.atributo, p.dificuldade, p.contagem, p.faixasPadrao], ["Agilidade", 12, "Cerco", false]);
  igual(p.faixas, PR().faixas); igual([p.sucesso, p.critico], ["Marca 1 Estresse.", "Ignora o efeito."]);
});
await teste("dificuldade omitida usa dificuldade_rolagem da cena; sem nenhuma das duas é erro", () => {
  const c = novaP(p => { delete p.dificuldade; }); igual(C.difPressao(c), 12); igual(c.pressao.dificuldade, null);
  ok(campP((p, r) => { delete p.dificuldade; delete r.dificuldade_rolagem; }).includes("pressao.dificuldade"), "faltou erro");
  ok(campP(p => { p.dificuldade = 0; }).includes("pressao.dificuldade") && campP(p => { p.dificuldade = 31; }).includes("pressao.dificuldade"), "fora de 1 a 30");
});
await teste("faixas omitidas: terços das caixas com o dano do Tier (8 caixas: 0–2, 3–5, 6–8)", () => {
  const dano = { 1: ["1d6+2", "1d8+3", "1d10+4"], 2: ["2d6+3", "2d8+3", "2d10+4"], 3: ["3d8+3", "3d10+4", "3d12+5"], 4: ["4d8+10", "4d10+12", "4d12+15"] };
  for (const t of [1, 2, 3, 4]) {
    const c = novaP((p, r) => { delete p.faixas; r.patamar = t; });
    igual(c.pressao.faixas, [{ de: 0, ate: 2, dano: dano[t][0] + " fís" }, { de: 3, ate: 5, dano: dano[t][1] + " fís" }, { de: 6, ate: 8, dano: dano[t][2] + " fís" }], "Tier " + t);
    ok(c.pressao.faixasPadrao);
  }
  igual(C.faixasPadrao(10, 1).map(f => [f.de, f.ate]), [[0, 3], [4, 7], [8, 10]], "10 caixas cobrem 0–10 sem lacuna");
  igual(C.faixasPadrao(1, 1).map(f => [f.de, f.ate, f.dano]), [[0, 0, "1d6+2 fís"], [1, 1, "1d10+4 fís"]], "1 caixa");
});
await teste("contagem inexistente, ausente ou do lado errado", () => {
  ok(campP(p => { p.contagem = "Fantasma"; }).includes("pressao.contagem"), "inexistente");
  ok(msgP(p => { p.contagem = "Fantasma"; }, "pressao.contagem").includes("não existe"));
  ok(campP(p => { delete p.contagem; }).includes("pressao.contagem"), "ausente");
  ok(msgP(p => { p.contagem = "Fuga"; }, "pressao.contagem").includes('"mestre"'), "Fuga é dos jogadores");
  igual(novaP(p => { p.contagem = "cerco"; }).pressao.contagem, "Cerco", "nome canônico, sem diferenciar maiúsculas");
});
await teste("faixa fora do Contador, sobreposta ou invertida", () => {
  ok(campP(p => { p.faixas[2].ate = 9; }).includes("pressao.faixas[2].ate"), "9 passa das 8 caixas");
  ok(msgP(p => { p.faixas[2].ate = 9; }, "pressao.faixas[2].ate").includes("fora do Contador"));
  ok(campP(p => { p.faixas[1].de = 2; }).includes("pressao.faixas[1]"), "sobreposição 0–2 com 2–5");
  ok(campP(p => { p.faixas[0] = { de: 3, ate: 1, dano: "1d6+2 fís" }; }).includes("pressao.faixas[0].ate"), "ate < de");
  ok(campP(p => { p.faixas[0].de = -1; }).includes("pressao.faixas[0].de") && campP(p => { p.faixas[0].de = 1.5; }).includes("pressao.faixas[0].de"), "de negativo ou fracionário");
  ok(campP(p => { p.faixas = []; }).includes("pressao.faixas"), "lista vazia");
});
await teste("dano malformado é erro; 'fis' e 'mag' sem acento valem e são normalizados", () => {
  for (const ruim of ["1d6+2", "1d6+2 gelo", "2d fís", "abc", "fís", "1d6+ fís", "5 fís", ""]) ok(campP(p => { p.faixas[0].dano = ruim; }).includes("pressao.faixas[0].dano"), `“${ruim}” deveria falhar`);
  ok(campP(p => { p.faixas[0].dano = 5; }).includes("pressao.faixas[0].dano"), "número não é dano");
  const c = novaP(p => { p.faixas[0].dano = "2d6 + 3 mag"; p.faixas[1].dano = "1D8+3  FIS"; p.faixas[2].dano = "1d10 mág"; });
  igual(c.pressao.faixas.map(f => f.dano), ["2d6+3 mág", "1d8+3 fís", "1d10 mág"]);
});
await teste("faixas com lacuna só avisam (a Pressão não dói nesse ponto)", () => {
  const r = rawP(p => { p.faixas = [{ de: 0, ate: 1, dano: "1d6+2 fís" }, { de: 5, ate: 8, dano: "1d10+4 fís" }]; });
  const v = C.validarCena(r); igual(v.erros, []); ok(v.avisos.some(a => a.campo === "pressao.faixas" && a.msg.includes("2–4")), "aviso de lacuna 2–4");
  const c = C.criarCena(r); C.ajustarContagem(c, C.achaContagem(c, "Cerco").id, 3); igual(C.faixaAtiva(c), null);
});
await teste("tipos errados: pressao não objeto, atributo, texto", () => {
  const r = clone(fixture); r.pressao = "forte"; ok(campos(r).includes("pressao"));
  ok(campP(p => { p.sucesso = 3; }).includes("pressao.sucesso"));
  const v = C.validarCena(rawP(p => { p.atributo = "Sorte"; })); igual(v.erros, []); ok(v.avisos.some(a => a.campo === "pressao.atributo"), "atributo desconhecido só avisa");
});
await teste("a faixa ativa muda quando o Contador do mestre cruza 2→3 e 5→6 (8 caixas)", () => {
  const c = novaP(); const k = C.achaContagem(c, "Cerco");
  const dano = () => C.faixaAtiva(c).dano;
  const v = {}; for (const n of [0, 2, 3, 5, 6, 8]) { C.ajustarContagem(c, k.id, n); v[n] = dano(); }
  igual(v, { 0: "1d6+2 fís", 2: "1d6+2 fís", 3: "1d8+3 fís", 5: "1d8+3 fís", 6: "1d10+4 fís", 8: "1d10+4 fís" });
  C.ajustarContagem(c, k.id, 5); C.aplicarResultado(c, "falha_esperanca"); igual([k.val, dano()], [6, "1d10+4 fís"], "uma falha leva o Cerco de 5 a 6 e muda a faixa");
});
await teste("Próxima rodada com Pressão: falha registra o dano da faixa atual no log", () => {
  const c = novaP(); const k = C.achaContagem(c, "Cerco"); C.ajustarContagem(c, k.id, 4);
  const r = C.proximaRodada(c, "falha"); const e = c.log.at(-1);
  igual(c.rodada, 2); igual(e.rodada, 1, "a linha do log é da rodada que terminou");
  igual(e.pressao, { resultado: "falha", dano: "1d8+3 fís", contagem: "Cerco", valor: 4 });
  ok(e.rotulo.includes("Falhou") && e.rotulo.includes("1d8+3 fís") && e.rotulo.includes("Rodada 2"), e.rotulo);
  ok(c.ultimo && c.ultimo.texto.includes("1d8+3 fís"), "última ação mostra o dano"); ok(r.ok !== false);
});
await teste("sucesso, crítico e pular entram no log; só a falha leva dano", () => {
  const c = novaP();
  C.proximaRodada(c, "sucesso"); igual(c.log.at(-1).pressao, { resultado: "sucesso", dano: null, contagem: "Cerco", valor: 0 }); ok(c.log.at(-1).rotulo.includes("Passou") && c.log.at(-1).rotulo.includes("Marca 1 Estresse."));
  C.proximaRodada(c, "critico"); ok(c.log.at(-1).rotulo.includes("Crítico") && c.log.at(-1).rotulo.includes("Ignora o efeito."));
  C.proximaRodada(c, "pular"); igual(c.log.at(-1).pressao.resultado, "pular"); ok(c.log.at(-1).rotulo.includes("Pulou")); igual(c.ultimo, null, "pular não mostra nada");
  igual([c.rodada, c.log.length], [4, 3]);
});
await teste("a Pressão não consome Medo, não altera Contadores e não zera usos do Medo além do reset normal de rodada", () => {
  const c = novaP(); c.medo = 5; C.ajustarContagem(c, C.achaContagem(c, "Cerco").id, 4); C.ajustarContagem(c, C.achaContagem(c, "Fuga").id, 2);
  const antes = c.contagens.map(x => x.val);
  for (const res of ["falha", "sucesso", "critico", "pular"]) C.proximaRodada(c, res);
  igual(c.contagens.map(x => x.val), antes, "Contadores intactos"); igual(c.medo, 5, "Medo intacto"); igual(c.rodada, 5);
});
await teste("desfazer volta a rodada e a linha do log numa só ação", () => {
  const c = novaP(); const n = c.log.length;
  C.proximaRodada(c, "falha"); ok(C.desfazer(c)); igual([c.rodada, c.log.length], [1, n]);
});
await teste("cena sem Pressão ignora o argumento; resultado desconhecido não aplica Pressão", () => {
  const c = nova(); C.proximaRodada(c, "falha"); igual(c.log.at(-1).rotulo, "Rodada 2"); ok(!c.log.at(-1).pressao);
  const d = novaP(); C.proximaRodada(d, "talvez"); igual(d.log.at(-1).rotulo, "Rodada 2");
});
await teste("editar a Pressão e o ciclo numa cena em andamento não perde o andamento", () => {
  const c = nova(); c.status = "ativa"; C.aplicarResultado(c, "falha_medo"); C.proximaRodada(c); C.aplicarResultado(c, "critico");
  const foto = JSON.stringify({ v: c.contagens.map(x => x.val), m: c.medo, r: c.rodada, l: c.log.length, a: c.alertas, g: c.gatilhos.map(x => x.disparado), p: c.pilha.length });
  const raw = { atributo: "Instinto", contagem: "cerco", sucesso: "Marca 1 Estresse." };
  igual(C.validarPressaoCena(c, raw).erros.map(e => e.campo), ["pressao.dificuldade"].filter(() => !c.dificuldadeRolagem), "usa a dificuldade da cena");
  c.ciclo = "Novo ciclo."; c.pressao = C.montarPressao(raw, c.contagens, c.patamar);
  igual(JSON.stringify({ v: c.contagens.map(x => x.val), m: c.medo, r: c.rodada, l: c.log.length, a: c.alertas, g: c.gatilhos.map(x => x.disparado), p: c.pilha.length }), foto, "andamento intacto");
  igual([c.pressao.atributo, c.pressao.contagem, c.pressao.faixasPadrao], ["Instinto", "Cerco", true]);
  C.proximaRodada(c, "falha"); ok(c.log.at(-1).pressao.dano, "a Pressão nova já vale");
  ok(C.validarPressaoCena(c, { contagem: "Fuga" }).erros.some(e => e.campo === "pressao.contagem"), "editor também exige lado mestre");
});
await teste("Pressão padrão do Tier: primeira contagem do mestre; sem ela, nada", () => {
  const c = nova(); c.patamar = 3; const p = C.pressaoPadraoDe(c);
  igual([p.atributo, p.contagem, p.faixasPadrao, p.faixas[0].dano, p.faixas[2].dano], ["Agilidade", "Cerco", true, "3d8+3 fís", "3d12+5 fís"]);
  c.contagens.forEach(k => { k.lado = "jogadores"; }); igual(C.pressaoPadraoDe(c), null);
});
await teste("duplicar e reiniciar a cena mantêm a Pressão", () => {
  const c = novaP(); const d = JSON.parse(JSON.stringify(c)); C.reiniciar(d); igual(d.pressao, c.pressao);
});

grupo("Locais e preços");
await teste("preço formatado em baús, bolsas, punhados e moedas", () => {
  igual(L.fmtPreco(7), "7 moedas"); igual(L.fmtPreco(10), "1 punhado"); igual(L.fmtPreco(15), "1 punhado e 5 moedas"); igual(L.fmtPreco(300), "3 bolsas"); igual(L.fmtPreco(1500), "1 baú e 5 bolsas"); igual(L.fmtPreco(1), "1 moeda");
});
await teste("arredondamento mantém no máximo duas unidades", () => { for (const v of [3, 17, 43, 88, 123, 457, 999, 1234, 1850, 2000]) ok(L.fmtPreco(L.arredondar(v)).split(" e ").length <= 2, "preço com mais de duas unidades: " + v + " → " + L.fmtPreco(L.arredondar(v))); });
await teste("armas e armaduras ficam dentro da faixa do SRD por patamar (antes dos ajustes)", async () => {
  const { list } = await import("../js/data.js");
  for (const kind of ["weapons", "armor"]) for (const x of list(kind)) { const [a, b] = L.FAIXA[x.t]; const p = L.precoBase(kind, x); ok(p >= a - 0.01 && p <= b + 0.01, `${x.id} (T${x.t}) fora da faixa: ${p}`); }
});
await teste("qualidade e região mexem no preço na ordem certa", async () => {
  const x = (await import("../js/data.js")).get("weapons", "Broadsword");
  const pr = (qual, reg) => L.precoFinal("weapons", x, { qual, reg });
  ok(pr("simples", "cidade") < pr("comum", "cidade") && pr("comum", "cidade") < pr("refinada", "cidade"), "qualidade");
  ok(pr("comum", "rural") < pr("comum", "cidade") && pr("comum", "cidade") < pr("comum", "capital") && pr("comum", "capital") < pr("comum", "remota"), "região");
});
await teste("os preços do SRD aparecem certos: quarto simples e refeição = 1 punhado, quarto de luxo = 1 bolsa, montaria = 3 bolsas, carruagem = 2 punhados", () => {
  const l = L.gerarLocal({ tipo: "taverna", tam: "lendaria", qual: "comum", reg: "cidade" }); const por = n => l.servicos.find(s => s.n.startsWith(n));
  igual(por("Quarto simples").preco, 10); igual(por("Refeição para o grupo").preco, 10); igual(por("Quarto de luxo").preco, 100);
  const e = L.gerarLocal({ tipo: "estabulo", tam: "lendaria", qual: "comum", reg: "cidade" }); igual(e.servicos.find(s => s.n.startsWith("Montaria")).preco, 300); igual(e.servicos.find(s => s.n.startsWith("Corrida")).preco, 20);
});
await teste("o tamanho define a quantidade de itens e o patamar máximo", () => {
  for (const [tam, T] of Object.entries(L.TAMANHOS)) for (let k = 0; k < 6; k++) {
    const l = L.gerarLocal({ tipo: "ferraria", tam, qual: "comum", reg: "cidade" });
    ok(l.estoque.length >= 1 && l.estoque.length <= T.linhas[1], `${tam}: ${l.estoque.length} linhas`);
    ok(l.estoque.every(e => L.nivelItem(e.kind, get(e.kind, e.id)) <= T.maxN), `${tam}: item acima do patamar ${T.maxN}`);
  }
});
await teste("loja simples fica um patamar abaixo; banca nunca passa do patamar 1", () => {
  for (let k = 0; k < 8; k++) { const l = L.gerarLocal({ tipo: "ferraria", tam: "emporio", qual: "simples", reg: "cidade" }); ok(l.estoque.every(e => L.nivelItem(e.kind, get(e.kind, e.id)) <= 2)); const b = L.gerarLocal({ tipo: "ferraria", tam: "banca", qual: "refinada", reg: "cidade" }); ok(b.estoque.every(e => L.nivelItem(e.kind, get(e.kind, e.id)) === 1)); }
});
await teste("todo item do estoque existe, sem repetição e com preço e quantidade válidos", () => {
  for (const t of L.TIPOS) for (const tam of ["banca", "loja", "lendaria"]) {
    const l = L.gerarLocal({ tipo: t.k, tam, qual: "comum", reg: "cidade" }); const ids = l.estoque.map(e => e.kind + "|" + e.id);
    igual(new Set(ids).size, ids.length, `${t.k}/${tam}: repetido`); ok(l.estoque.every(e => get(e.kind, e.id) && e.preco >= 1 && e.qtd >= 1), `${t.k}/${tam}: item inválido`);
    if (t.estoque.length) ok(l.estoque.length > 0, `${t.k}/${tam}: sem estoque`);
  }
});
await teste("tipos só de serviços não têm estoque; a casa pequena tem menos serviços que a grande", () => {
  for (const k of ["taverna", "estabulo", "alfaiate", "saber"]) { const a = L.gerarLocal({ tipo: k, tam: "banca" }), g = L.gerarLocal({ tipo: k, tam: "lendaria" }); igual(a.estoque.length, 0); ok(a.servicos.length >= 2 && g.servicos.length > a.servicos.length, k); }
});
await teste("trocar e acrescentar linha não repete item do estoque", () => { const l = L.gerarLocal({ tipo: "ferraria", tam: "loja" }); const nova = L.sortearLinha(l); ok(nova); ok(!l.estoque.some(e => e.kind === nova.kind && e.id === nova.id)); });
await teste("texto do local sai completo para copiar", () => { const t = L.textoLocal(L.gerarLocal({ tipo: "boticario", tam: "loja" })); ok(/À venda/.test(t) && /Dono:/.test(t) && /moeda|punhado|bolsa|baú/.test(t)); });

grupo("Dar item ao jogador");
const fichaDe = (nivel = 1) => { const p = novoPersonagem(); Object.assign(p, { nome: "Teste", classe: "Warrior", subclasse: "Call of the Brave", nivel, armas: { p: "Broadsword", s: "" }, armadura: "Gambeson Armor" }); const id = "t" + Math.random().toString(36).slice(2, 8); ST.fichas[id] = { id, dono: null, nome: "Teste", data: p, nova: true }; return id; };
await teste("consumível entra no inventário e soma a quantidade ao repetir", () => {
  const id = fichaDe(); aplicar(id, "consumables", "Minor Health Potion", { qtd: 2 }); aplicar(id, "consumables", "Minor Health Potion", { qtd: 1 });
  const inv = ST.fichas[id].data.inventario.filter(x => x.ref === "Minor Health Potion"); igual(inv.length, 1); igual(inv[0].q, 3);
});
await teste("item comum entra no inventário", () => { const id = fichaDe(); aplicar(id, "items", "Premium Bedroll"); ok(ST.fichas[id].data.inventario.some(x => x.ref === "Premium Bedroll")); });
await teste("arma pode ser guardada na reserva sem mexer na equipada", () => { const id = fichaDe(); aplicar(id, "weapons", "Rapier"); igual(ST.fichas[id].data.reserva, [{ k: "weapons", id: "Rapier" }]); igual(ST.fichas[id].data.armas.p, "Broadsword"); });
await teste("equipar arma primária troca e guarda a antiga", () => { const id = fichaDe(); const msg = aplicar(id, "weapons", "Rapier", { equipar: true }); const pc = ST.fichas[id].data; igual(pc.armas.p, "Rapier"); ok(pc.reserva.some(r => r.id === "Broadsword")); ok(/primária/.test(msg)); });
await teste("equipar armadura troca, guarda a antiga e zera os espaços marcados", () => { const id = fichaDe(); ST.fichas[id].data.st.arm = 2; aplicar(id, "armor", "Leather Armor", { equipar: true }); const pc = ST.fichas[id].data; igual(pc.armadura, "Leather Armor"); igual(pc.st.arm, 0); ok(pc.reserva.some(r => r.id === "Gambeson Armor")); });
await teste("item de patamar acima do personagem só pode ser guardado", () => {
  const id = fichaDe(1); const msg = aplicar(id, "weapons", "Legendary Dagger", { equipar: true }); const pc = ST.fichas[id].data;
  igual(pc.armas.p, "Broadsword"); ok(/patamar/.test(msg)); ok(pc.reserva.some(r => r.id === "Legendary Dagger"));
});
await teste("arma de duas mãos libera a secundária; secundária com primária de duas mãos vai para a reserva", () => {
  const id = fichaDe(); const pc = ST.fichas[id].data; pc.armas.s = "Small Dagger"; aplicar(id, "weapons", "Greatsword", { equipar: true }); igual(pc.armas.s, ""); ok(pc.reserva.some(r => r.id === "Small Dagger"));
  const msg = aplicar(id, "weapons", "Round Shield", { equipar: true }); ok(/duas mãos/.test(msg)); igual(pc.armas.s, "");
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

// ---------------------------------------------------------------------
grupo("Personagem por JSON");
const pj = mod => { const o = clone(EXEMPLO_PERSONAGEM); if (mod) mod(o); return lerPersonagens(JSON.stringify(o))[0]; };
await teste("o exemplo é válido e vira ficha de nível 1 com cálculos", () => { const r = pj(); ok(r.ok, JSON.stringify(r.avisos)); igual(r.pc.cartas.mao, ["Pick and Pull", "Uncanny Disguise"]); igual(r.pc.exp.map(e => e.v), [2, 2]); igual(r.pc.st, { pv: 0, es: 0, esp: 2, arm: 0, cond: [] }); });
await teste("nomes em português e ids em inglês funcionam", () => { const r = pj(o => { o.classe = "Ladino"; o.subclasse = "Andarilho Noturno"; o.ancestralidade = "Elfo"; }); ok(r.ok, JSON.stringify(r.avisos)); igual(r.pc.classe, "Rogue"); });
await teste("atributos fora de +2,+1,+1,0,0,−1 são recusados", () => { const r = pj(o => { o.atributos.forca = 2; }); ok(!r.ok && r.avisos.some(a => a.campo === "atributos")); });
await teste("carta de outro domínio, nível 2 ou repetida é recusada", () => {
  ok(pj(o => { o.cartas = ["Rune Ward", "Pick and Pull"]; }).avisos.some(a => a.campo === "cartas[0]"));
  ok(pj(o => { o.cartas = ["Pick and Pull", "Pick and Pull"]; }).avisos.some(a => a.campo === "cartas[1]"));
  ok(!pj(o => { o.cartas = ["Pick and Pull"]; }).ok);
});
await teste("omitir atributos e equipamento usa a sugestão da classe", () => { const r = pj(o => { delete o.atributos; delete o.arma_primaria; delete o.arma_secundaria; delete o.armadura; }); ok(r.ok, JSON.stringify(r.avisos)); igual(r.pc.armas.p, "Dagger"); });
await teste("arma de duas mãos não aceita secundária", () => { const r = pj(o => { o.arma_primaria = "Greatsword"; }); ok(!r.ok && r.avisos.some(a => a.campo === "arma_secundaria")); });
await teste("ancestralidade mista e vários personagens por lista", () => {
  const a = clone(EXEMPLO_PERSONAGEM); a.ancestralidade = { nome: "elfo-orc", primeira: "Elf", segunda: "Orc" };
  const r = lerPersonagens(JSON.stringify({ personagens: [a, EXEMPLO_PERSONAGEM] })); igual(r.map(x => x.ok), [true, true]); igual(r[0].pc.anc.f, [{ anc: "Elf", i: 0 }, { anc: "Orc", i: 1 }]);
});
await teste("JSON dentro de resposta com texto e cercas é encontrado; JSON quebrado dá erro", () => {
  const cerca = "```";
  ok(lerPersonagens(["Aqui vai:", cerca + "json", JSON.stringify(EXEMPLO_PERSONAGEM), cerca, "Boa sorte!"].join("\n"))[0].ok);
  ok(!lerPersonagens([cerca + "json", '{"nome": "x",', cerca].join("\n"))[0].ok);
});
await teste("nível acima de 1 é recusado com orientação", () => ok(pj(o => { o.nivel = 3; }).avisos.some(a => a.campo === "nivel")));

// ---------------------------------------------------------------------
grupo("Tokens de ação (sem reinício automático)");
const fTok = () => ({ id: "t", nome: "T", data: { hb: { tokens: true, tokMax: 3 }, st: {} } });
await teste("ao gastar todos, ficam em zero e não voltam sozinhos", () => { const f = fTok(); for (let i = 0; i < 3; i++) gastarToken(f.data, { epoca: 0 }); const t = tokensDe(f); igual([t.resta, t.gasto], [0, 3]); igual(tokensDe(f).resta, 0, "voltou sozinho"); });
await teste("só o reinício devolve os tokens", () => { const f = fTok(); for (let i = 0; i < 3; i++) gastarToken(f.data, { epoca: 0 }); for (let i = 0; i < 3; i++) devolverToken(f.data, { epoca: 0 }); igual(tokensDe(f).resta, 3); });

// ---------------------------------------------------------------------
grupo("Marcadores físicos (tokens)");
const advP = t => adversarios().find(a => a.src === "base" && a.type === t && a.tier === 1);
await teste("cada adversário recebe um marcador diferente", () => { const b = novaBatalha({ nome: "x" }); adicionar(b, advP("Minion"), 4); adicionar(b, advP("Leader"), 1); adicionar(b, advP("Bruiser"), 1); ok(b.unidades.every(u => MK.valido(u.mk))); igual(new Set(b.unidades.map(u => u.mk.f + ":" + u.mk.n)).size, b.unidades.length, "marcador repetido"); });
await teste("o mesmo adversário fica na mesma figura, em números seguidos", () => { const b = novaBatalha({ nome: "x" }); adicionar(b, advP("Minion"), 4); igual(b.unidades.map(u => [u.mk.f, u.mk.n]), [[0, 1], [0, 2], [0, 3], [0, 4]]); adicionar(b, advP("Leader"), 1); igual(b.unidades[4].mk.f, 1, "outro adversário usa outra figura"); });
await teste("são 25 marcadores no total; o 26º adversário fica sem", () => { const b = novaBatalha({ nome: "x" }); adicionar(b, advP("Minion"), 30); igual(b.unidades.filter(u => MK.valido(u.mk)).length, 25); igual(b.unidades.filter(u => !u.mk).length, 5); igual(new Set(b.unidades.filter(u => u.mk).map(u => u.mk.f + ":" + u.mk.n)).size, 25); });
await teste("trocar para um marcador ocupado troca os dois de lugar", () => { const b = novaBatalha({ nome: "x" }); adicionar(b, advP("Minion"), 2); const [a, c] = b.unidades; const o = MK.definir(b, a, c.mk.f, c.mk.n); ok(o === c); igual([a.mk, c.mk], [{ f: 0, n: 2 }, { f: 0, n: 1 }]); });
await teste("batalha antiga (sem marcador) ganha marcadores sem repetir", () => { const b = novaBatalha({ nome: "x" }); adicionar(b, advP("Minion"), 3); b.unidades[1].mk = undefined; const n = MK.atribuirFaltantes(b); igual(n, 1); igual(new Set(b.unidades.map(u => u.mk.f + ":" + u.mk.n)).size, 3); });
await teste("a cena importada pela IA também recebe marcadores", () => { const r = lerResposta("```json\n" + JSON.stringify({ ...clone(fixture), adversarios: [{ ref: advP("Minion").name, quantidade: 3 }] }) + "\n```"); const c = r.find(x => x.tipo === "cena"); ok(c && c.ok, JSON.stringify(c && c.avisos)); ok(c.registro.unidades.every(u => MK.valido(u.mk))); });

// ---------------------------------------------------------------------
grupo("Mesa ativa");
await teste("sem escolha, todas as batalhas aparecem; com escolha, só as da mesa", () => {
  const bak = GM.batalhas, bakM = GM.mesaAtiva; ST.mesas = [{ id: "m1", nome: "A", mestre: "u" }, { id: "m2", nome: "B", mestre: "u" }]; ST.sess = { user: { id: "u" } };
  try {
    const a = { mesa: "m1" }, b = { mesa: "m2" }, c = { mesa: null }, d = { mesa: "apagada" };
    setMesaAtiva(null); ok([a, b, c, d].every(naMesaAtiva));
    setMesaAtiva("m1"); igual([a, b, c, d].map(naMesaAtiva), [true, false, false, false]);
    setMesaAtiva(SEM_MESA); igual([a, b, c, d].map(naMesaAtiva), [false, false, true, true], "mesa apagada conta como sem mesa");
    setMesaAtiva("m2"); ST.mesas = ST.mesas.filter(m => m.id !== "m2"); igual(mesaAtiva(), null, "mesa excluída volta para Todas");
  } finally { GM.batalhas = bak; GM.mesaAtiva = bakM; ST.mesas = []; ST.sess = null; }
});
await teste("batalha nova nasce na mesa ativa", () => {
  const bakM = GM.mesaAtiva; ST.mesas = [{ id: "m1", nome: "A", mestre: "u" }]; ST.sess = { user: { id: "u" } };
  try { GM.mesaAtiva = "m1"; igual(novaBatalha({ nome: "x" }).mesa, "m1"); igual(novaBatalha({ nome: "x", mesa: null }).mesa, null, "mesa explícita vence"); GM.mesaAtiva = SEM_MESA; igual(novaBatalha({ nome: "x" }).mesa, null); }
  finally { GM.mesaAtiva = bakM; ST.mesas = []; ST.sess = null; }
});

// ---------------------------------------------------------------------
grupo("Adversário aleatório: habilidades do mesmo estilo de combate");
const exigeAlc = t => { const c = /\bMelee\b|Corpo a Corpo/.test(t), l = /\bFar\b|\bLonge\b/.test(t); return c && !l ? "corpo" : l && !c ? "longe" : null; };
const srdAdv = n => adversarios({ todos: true }).find(a => a.name === n);
await teste("o estilo vem do alcance, da arma e do tipo de dano", () => {
  igual([srdAdv("Archer Guard"), srdAdv("War Wizard"), srdAdv("Dire Wolf"), srdAdv("Chaos Skull")].map(estiloAdv), ["arco", "magia", "corpo", "magia"]);
});
await teste("atirador à distância nunca recebe habilidade que exige corpo a corpo", () => {
  for (const tier of [1, 2, 3, 4]) for (let i = 0; i < 40; i++) {
    const g = gerarAdversario("Ranged", tier);
    ok(estiloAdv(g) !== "corpo", `${g.name} (${g.wpn}, ${g.rng}) devia ser à distância`);
    g.f.filter(f => !/^(Minion|Horde|Relentless)\b/.test(f.n)).forEach(f => ok(exigeAlc(f.t) !== "corpo", `${g.name} recebeu “${f.n}”, que exige corpo a corpo`));
  }
});
await teste("adversário corpo a corpo nunca recebe habilidade que exige atacar de longe", () => {
  for (const tipo of ["Bruiser", "Standard", "Skulk", "Leader", "Solo", "Horde", "Minion"]) for (const tier of [1, 2, 3, 4]) for (let i = 0; i < 15; i++) {
    const g = gerarAdversario(tipo, tier);
    if (estiloAdv(g) !== "corpo") continue;
    g.f.filter(f => !/^(Minion|Horde|Relentless)\b/.test(f.n)).forEach(f => ok(exigeAlc(f.t) !== "longe", `${g.name} recebeu “${f.n}”, que exige atacar de longe`));
  }
});
await teste("todo adversário sorteado vem com habilidades e com o tema da base", () => {
  for (const tipo of TIPOS) { const g = gerarAdversario(tipo, 2); ok(g.f.length >= 1, `${tipo} sem habilidades`); ok(CATS.some(c => c[0] === g.cat), `${tipo}: tema ${g.cat}`); }
});
await teste("as habilidades sorteadas saem em português e citam o nome novo, não o do adversário de origem", () => {
  const ingles = /\b(the|The|Make a|within|range|Spend a Fear|Mark a Stress)\b/;
  for (const tipo of TIPOS) for (let i = 0; i < 10; i++) {
    const g = gerarAdversario(tipo, 1 + (i % 4));
    g.f.forEach(f => { ok(!ingles.test(f.t) && !ingles.test(f.n), `${g.name}: “${f.n}” ainda em inglês: ${f.t.slice(0, 80)}`); });
  }
  const g = gerarAdversario("Ranged", 1); ok(g.f.some(f => f.t.includes(g.name)) || g.f.every(f => !/\b[Oo] (Arqueiro|Atirador|Esqueleto)\b/.test(f.t)), "sobrou o nome do adversário de origem");
});
await teste("sortearHabilidade respeita o estilo pedido e não repete nome", () => {
  const f = sortearHabilidade("Ranged", 1, [], { estilo: "arco", cat: "humanoides" }); ok(f && exigeAlc(f.t) !== "corpo");
  const nomes = new Set(); for (let i = 0; i < 6; i++) { const x = sortearHabilidade("Ranged", 1, [...nomes], { estilo: "arco", cat: "" }); ok(x, "acabou cedo demais"); ok(!nomes.has(x.n), "repetiu " + x.n); nomes.add(x.n); }
});

// ---------------------------------------------------------------------
grupo("Sorteio rápido (painel de emergência)");
await teste("nomes: a quantidade pedida, sem repetir, com e sem sobrenome", () => {
  for (const g of ["f", "m"]) { const a = sortearNomes(g, 8, true); igual(a.length, 8); igual(new Set(a.map(x => x.n)).size, 8); ok(a.every(x => /\S+ \S+/.test(x.n)), "faltou sobrenome"); const b = sortearNomes(g, 8, false); igual(b.length, 8); ok(b.every(x => x.n && !/ /.test(x.n) && !/undefined/.test(x.n)), "sem sobrenome deve ser uma palavra só"); }
});
await teste("nomes femininos e masculinos vêm de listas diferentes", () => {
  const fem = new Set(sortearNomes("f", 40, false).map(x => x.n)), masc = new Set(sortearNomes("m", 40, false).map(x => x.n));
  ok([...fem].every(n => !masc.has(n)), "um nome apareceu nas duas listas");
});
await teste("especiais: classes com regra própria e H&F mostram o botão; Guerreiro não", async () => {
  const { quantosEspeciais, especiais } = await import("../js/views/especiais.js");
  const mk = x => ({ ...novoPersonagem(), ...x });
  for (const c of ["Bard", "Druid", "Guardian", "Ranger", "Rogue", "Seraph", "Sorcerer", "Wizard", "Assassin", "Brawler", "Warlock", "Witch"]) ok(quantosEspeciais(mk({ classe: c })) > 0, `${c} sem especiais`);
  igual(quantosEspeciais(mk({ classe: "Warrior" })), 0);
  igual(quantosEspeciais(mk({})), 0);
  ok(quantosEspeciais(mk({ classe: "Ranger", subclasse: "Beastbound" })) > quantosEspeciais(mk({ classe: "Ranger" })), "companheiro não apareceu");
  ok(especiais(mk({ classe: "Witch" })).some(s => s.t === "Expansão Hope & Fear") === false, "classe H&F fica em 'Da sua classe'");
  ok(especiais(mk({ classe: "Warrior", comunidade: "Reborne" })).some(s => s.t === "Expansão Hope & Fear"), "comunidade H&F não apareceu");
});
await teste("Forma Bestial: transformar muda Evasão e atributo; sair desfaz; custos e Evolução", async () => {
  const { assumir, sairForma, podeAssumir, formaAtiva } = await import("../js/forma.js");
  const { deriv } = await import("../js/calc.js");
  const pc = { ...novoPersonagem(), classe: "Druid", nivel: 5, atr: { agi: 1, for: 0, acu: 0, ins: 0, pre: 0, con: 0 } };
  const antes = deriv(pc);
  ok(!podeAssumir(pc, antes, "Agile Scout", "estresse"), "deveria poder");
  assumir(pc, "Agile Scout", "estresse");
  igual(pc.st.es, 1);
  const em = deriv(pc);
  igual(em.ev, antes.ev + 2); igual(em.atr.agi, antes.atr.agi + 1); ok(em.forma && em.forma.n === "Batedor Ágil");
  ok(podeAssumir(pc, em, "Pack Predator", "estresse"), "já transformado deve recusar");
  sairForma(pc);
  const fora = deriv(pc);
  igual(fora.ev, antes.ev); igual(fora.atr.agi, antes.atr.agi); igual(fora.forma, null);
  // Evolução: 3 Esperança, sem Estresse, +1 no atributo escolhido
  pc.st.esp = 3;
  assumir(pc, "Pack Predator", "evolucao", { evo: "ins" });
  igual(pc.st.esp, 0); igual(pc.st.es, 1); igual(deriv(pc).atr.ins, antes.atr.ins + 1); igual(deriv(pc).atr.for, antes.atr.for + 2);
  sairForma(pc);
  // Forma de patamar maior que o do personagem é recusada
  ok(podeAssumir(pc, antes, "Massive Behemoth", "estresse"), "patamar 4 num personagem de nível 5 deve recusar");
  // Evoluída (Fera Lendária) soma bônus à forma de base
  const lv = { ...pc, nivel: 5, bf: { id: "Legendary Beast", base: "Agile Scout" } };
  const fa = formaAtiva(lv);
  igual(fa.ev, 2 + 2); igual(fa.tb, 1 + 1); igual(fa.dn.flat, 6);
});
await teste("batalha sorteada: nome e descrição para cada adversário, sem equipamento", async () => {
  const { nomearBatalha, GRUPOS } = await import("../js/batalha-nomes.js");
  const { gerarBatalha } = await import("../js/gm.js");
  for (const [k] of GRUPOS) for (let i = 0; i < 40; i++) {
    const b = nomearBatalha(gerarBatalha({ tier: 1 + (i % 4), jogadores: 4 }), k);
    ok(b.unidades.length > 0, "batalha vazia");
    igual(new Set(b.unidades.map(u => u.name)).size, b.unidades.length);
    b.unidades.forEach(u => {
      ok(u.name && !/undefined|NaN|\{|\}|\s{2}/.test(u.name), `nome ruim: “${u.name}”`);
      ok(u.desc && !/undefined|NaN|\{|\}|\s{2}/.test(u.desc), `descrição ruim: “${u.desc}”`);
      ok(!/escudo|espada|machado|arco|armadura|lança|adaga|cajado/i.test(u.desc), `equipamento na descrição: “${u.desc}”`);
    });
  }
});
await teste("nomes de lugar saem bem formados em todos os tipos", () => {
  for (const t of TIPOS_LUGAR.map(x => x[0])) for (let i = 0; i < 100; i++) sortearLugares(t, 6).forEach(r => ok(r.n && !/undefined|NaN|\s{2}|^\s|\s$/.test(r.n), `nome ruim: “${r.n}”`));
});
await teste("descrição de lugar junta quatro frases e respeita o tipo", () => {
  for (const [k, rot] of TIPOS_DESC.filter(x => x[0] !== "qualquer")) { const d = sortearDescricao(k); igual(d.t, rot); ok((d.n.match(/\./g) || []).length >= 4, "menos de quatro frases"); }
  ok(sortearDescricao("qualquer").n.length > 80);
});

sum.className = "sum " + (falhas ? "bad" : "ok");
sum.textContent = falhas ? `${falhas} de ${total} testes falharam` : `Todos os ${total} testes passaram`;
document.title = (falhas ? "✗ " : "✓ ") + sum.textContent;
for (const [k, v] of [["dh-fichas-v1", _bak.f], ["dh-mestre-v1", _bak.m]]) { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
window.__testes = { total, falhas };
