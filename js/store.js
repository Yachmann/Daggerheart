// Persistência: Supabase (nuvem + tempo real) com cópia local para funcionar offline.
import { store, uid, clone, debounce } from "./util.js";

const CFG = window.MESA_CONFIG || {};
export const sb = CFG.supabaseUrl && CFG.supabaseKey && window.supabase ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;

const LK = "dh-fichas-v1";          // cache local: { [id]: {id, dono, mesa_id, nome, data, updated_at, local?:true, sujo?:true} }
const LMESAS = "dh-mesas-v1";

export const S = {
  sess: null,
  fichas: store.get(LK, {}),
  mesas: store.get(LMESAS, []),
  status: "local",          // local | sync | ok | erro
  ouvintes: new Set(),
  tabelaOk: true,
};

function emit(motivo) { S.ouvintes.forEach(f => { try { f(motivo); } catch (e) { console.warn(e); } }); }
export const onChange = f => { S.ouvintes.add(f); return () => S.ouvintes.delete(f); };
const saveLocal = () => { store.set(LK, S.fichas); store.set(LMESAS, S.mesas); };
const setStatus = s => { if (S.status !== s) { S.status = s; emit("status"); } };
export const user = () => S.sess && S.sess.user;

// ---------- Autenticação ----------
const AUTHMSG = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme o e-mail antes de entrar (procure a mensagem na sua caixa de entrada).",
  "User already registered": "Já existe uma conta com esse e-mail. Use Entrar.",
  "Signups not allowed for this instance": "Novos cadastros estão desativados neste site.",
};
export const authMsg = e => AUTHMSG[e && e.message] || (e && e.message) || "Não foi possível falar com o servidor.";

export async function entrar(email, senha) { const r = await sb.auth.signInWithPassword({ email, password: senha }); if (r.error) throw r.error; return r; }
export async function cadastrar(email, senha) {
  const r = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.origin + location.pathname } });
  if (r.error) throw r.error; return r;
}
export async function linkMagico(email) { const r = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); if (r.error) throw r.error; }
export async function recuperarSenha(email) { const r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + "#conta" }); if (r.error) throw r.error; }
export async function novaSenha(senha) { const r = await sb.auth.updateUser({ password: senha }); if (r.error) throw r.error; }
export async function sair() { await sb.auth.signOut(); }

export async function iniciar() {
  if (!sb) { setStatus("local"); return; }
  const { data } = await sb.auth.getSession();
  S.sess = data.session;
  sb.auth.onAuthStateChange((ev, session) => {
    const antes = S.sess && S.sess.user.id, agora = session && session.user.id;
    S.sess = session;
    if (ev === "PASSWORD_RECOVERY") emit("recuperar-senha");
    if (agora && agora !== antes) setTimeout(() => sincronizar(), 0);
    if (!agora && antes) pararTempoReal();
    emit("auth");
  });
  if (S.sess) await sincronizar();
  addEventListener("online", () => sincronizar());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.sess) sincronizar(); });
}

// ---------- Fichas ----------
export const minhasFichas = () => Object.values(S.fichas).filter(f => !f.removida && (!user() || !f.dono || f.dono === user().id)).sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
export const ficha = id => S.fichas[id];

export function criarFicha(data, mesa_id = null) {
  const id = uid();
  S.fichas[id] = { id, dono: user() ? user().id : null, mesa_id, nome: data.nome || "Sem nome", data, updated_at: new Date().toISOString(), sujo: true, nova: true };
  saveLocal(); emit("fichas"); agendarEnvio(id);
  return id;
}

// Altera a ficha: fn recebe o objeto data e pode mutá-lo
export function editar(id, fn, { imediato = false } = {}) {
  const f = S.fichas[id];
  if (!f) return;
  fn(f.data);
  f.nome = f.data.nome || "Sem nome";
  f.updated_at = new Date().toISOString();
  f.sujo = true;
  saveLocal();
  emit("ficha:" + id);
  agendarEnvio(id, imediato);
}

export async function excluirFicha(id) {
  const f = S.fichas[id];
  if (!f) return;
  if (sb && S.sess && !f.nova) {
    const { error } = await sb.from("personagens").delete().eq("id", id);
    if (error) throw error;
  }
  delete S.fichas[id]; saveLocal(); emit("fichas");
}

export async function moverParaMesa(id, mesa_id) {
  const f = S.fichas[id]; if (!f) return;
  f.mesa_id = mesa_id || null; f.sujo = true; saveLocal(); emit("fichas");
  await enviar(id);
}

const pendentes = new Set();
const enviarLote = debounce(async () => { for (const id of [...pendentes]) await enviar(id); }, 900);
function agendarEnvio(id, imediato) {
  if (!sb || !S.sess) { setStatus("local"); return; }
  pendentes.add(id); setStatus("sync");
  imediato ? enviarLote.flush() : enviarLote();
}

async function enviar(id) {
  pendentes.delete(id);
  const f = S.fichas[id];
  if (!f || !sb || !S.sess) return;
  if (f.dono && f.dono !== S.sess.user.id && !podeEditarComoMestre(f)) return;
  setStatus("sync");
  const row = { id: f.id, nome: f.nome, data: f.data, mesa_id: f.mesa_id || null };
  try {
    let r;
    if (f.nova) { row.dono = S.sess.user.id; r = await sb.from("personagens").insert(row).select("id,dono,updated_at,rev").single(); }
    else r = await sb.from("personagens").update(row).eq("id", f.id).select("id,dono,updated_at,rev").single();
    if (r.error) throw r.error;
    f.dono = r.data.dono; f.updated_at = r.data.updated_at; f.rev = r.data.rev; delete f.nova;
    if (!pendentes.has(id)) delete f.sujo;
    saveLocal(); S.tabelaOk = true;
    setStatus(pendentes.size ? "sync" : "ok");
  } catch (e) {
    console.warn("enviar ficha", e);
    if (e && (e.code === "42P01" || /relation .* does not exist|schema cache/i.test(e.message || ""))) S.tabelaOk = false;
    setStatus("erro");
  }
}
const podeEditarComoMestre = f => f.mesa_id && S.mesas.some(m => m.id === f.mesa_id && m.mestre === S.sess.user.id);

// Busca o estado da nuvem e mescla com o local (local sujo mais recente vence)
let sincronizando = null;
export function sincronizar() {
  if (!sb || !S.sess) return Promise.resolve();
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    setStatus("sync");
    try {
      const uidAtual = S.sess.user.id;
      // fichas criadas sem conta passam a ser desta conta
      for (const f of Object.values(S.fichas)) if (!f.dono) { f.dono = uidAtual; f.nova = true; f.sujo = true; }
      await carregarMesas();
      const { data, error } = await sb.from("personagens").select("id,dono,mesa_id,nome,data,updated_at,rev");
      if (error) throw error;
      S.tabelaOk = true;
      const remotos = new Map(data.map(r => [r.id, r]));
      for (const r of data) {
        const l = S.fichas[r.id];
        if (l && l.sujo && (l.updated_at || "") > (r.updated_at || "")) continue; // local tem alterações não enviadas
        S.fichas[r.id] = { ...r };
      }
      for (const [id, l] of Object.entries(S.fichas)) {
        if (!remotos.has(id) && !l.nova && !l.sujo && l.dono) delete S.fichas[id]; // apagada em outro aparelho
      }
      saveLocal(); emit("fichas");
      for (const f of Object.values(S.fichas)) if (f.sujo || f.nova) pendentes.add(f.id);
      for (const id of [...pendentes]) await enviar(id);
      ligarTempoReal();
      setStatus(S.status === "erro" ? "erro" : "ok");
    } catch (e) {
      console.warn("sincronizar", e);
      if (e && (e.code === "42P01" || /does not exist|schema cache/i.test(e.message || ""))) S.tabelaOk = false;
      setStatus("erro");
    } finally { sincronizando = null; }
  })();
  return sincronizando;
}

// ---------- Tempo real ----------
let canal = null;
function ligarTempoReal() {
  if (!sb || !S.sess || canal) return;
  canal = sb.channel("personagens-" + S.sess.user.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "personagens" }, msg => {
      if (msg.eventType === "DELETE") { const id = msg.old && msg.old.id; if (id && S.fichas[id]) { delete S.fichas[id]; saveLocal(); emit("fichas"); } return; }
      const r = msg.new; if (!r || !r.id) return;
      const l = S.fichas[r.id];
      if (l && l.sujo) return;                                  // estou editando: minha versão vai sobrescrever
      if (l && l.rev != null && r.rev != null && r.rev <= l.rev) return;
      S.fichas[r.id] = { id: r.id, dono: r.dono, mesa_id: r.mesa_id, nome: r.nome, data: r.data, updated_at: r.updated_at, rev: r.rev };
      saveLocal(); emit("ficha:" + r.id); emit("fichas");
    })
    .subscribe();
}
function pararTempoReal() { if (canal) { sb.removeChannel(canal); canal = null; } }

// ---------- Mesas (campanhas) ----------
export async function carregarMesas() {
  if (!sb || !S.sess) return S.mesas;
  const { data, error } = await sb.from("mesas").select("id,nome,mestre,codigo,config,created_at, mesa_membros(user_id,apelido)").order("created_at");
  if (error) throw error;
  S.mesas = data || []; saveLocal(); emit("mesas");
  return S.mesas;
}
const codigo = () => { const a = "abcdefghjkmnpqrstuvwxyz23456789"; let s = ""; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
export async function criarMesa(nome) {
  for (let i = 0; i < 5; i++) {
    const { data, error } = await sb.from("mesas").insert({ nome, codigo: codigo(), mestre: S.sess.user.id }).select().single();
    if (!error) { await carregarMesas(); return data; }
    if (error.code !== "23505") throw error;
  }
  throw new Error("Não consegui gerar um código livre. Tente de novo.");
}
export async function entrarNaMesa(cod, apelido) {
  const { data, error } = await sb.rpc("entrar_na_mesa", { cod, nome_jogador: apelido || null });
  if (error) throw error;
  await carregarMesas(); await sincronizar();
  return data;
}
export async function atualizarMesa(id, campos) {
  const { error } = await sb.from("mesas").update(campos).eq("id", id);
  if (error) throw error; await carregarMesas();
}
export async function sairDaMesa(id) {
  const { error } = await sb.from("mesa_membros").delete().eq("mesa_id", id).eq("user_id", S.sess.user.id);
  if (error) throw error; await carregarMesas(); await sincronizar();
}
export async function excluirMesa(id) { const { error } = await sb.from("mesas").delete().eq("id", id); if (error) throw error; await carregarMesas(); await sincronizar(); }
export const fichasDaMesa = id => Object.values(S.fichas).filter(f => f.mesa_id === id).sort((a, b) => a.nome.localeCompare(b.nome));

// ---------- Backup ----------
export function exportar() { return JSON.stringify({ app: "daggerheart-fichas", v: 1, em: new Date().toISOString(), fichas: minhasFichas().map(f => ({ nome: f.nome, data: f.data })) }, null, 1); }
export function importar(txt) {
  const o = JSON.parse(txt);
  const lista = o && Array.isArray(o.fichas) ? o.fichas : null;
  if (!lista) throw new Error("Arquivo não reconhecido.");
  lista.forEach(f => criarFicha(clone(f.data)));
  return lista.length;
}
