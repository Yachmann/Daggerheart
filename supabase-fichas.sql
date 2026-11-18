-- Daggerheart · Fichas e Mesas
-- Rode UMA vez em: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo sem quebrar nada (é idempotente). Não mexe nas tabelas antigas (estados, encontros).

create extension if not exists pgcrypto;

-- ---------- Tabelas ----------
create table if not exists public.mesas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  mestre     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  codigo     text not null unique,
  config     jsonb not null default '{}'::jsonb,       -- ex.: {"expansao": {"hf": true}}
  created_at timestamptz not null default now()
);

create table if not exists public.mesa_membros (
  mesa_id   uuid not null references public.mesas (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  apelido   text,
  entrou_em timestamptz not null default now(),
  primary key (mesa_id, user_id)
);

create table if not exists public.personagens (
  id         uuid primary key default gen_random_uuid(),
  dono       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mesa_id    uuid references public.mesas (id) on delete set null,
  nome       text not null default '',
  data       jsonb not null default '{}'::jsonb,
  rev        bigint not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists personagens_dono_idx on public.personagens (dono);
create index if not exists personagens_mesa_idx on public.personagens (mesa_id);

-- ---------- Funções auxiliares (evitam recursão nas políticas) ----------
create or replace function public.eh_mestre(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mesas where id = m and mestre = auth.uid());
$$;

create or replace function public.eh_membro(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mesa_membros where mesa_id = m and user_id = auth.uid())
      or exists (select 1 from public.mesas where id = m and mestre = auth.uid());
$$;

-- Entrar numa mesa pelo código de convite (o jogador não consegue ler a mesa antes de ser membro).
create or replace function public.entrar_na_mesa(cod text, nome_jogador text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  if auth.uid() is null then raise exception 'precisa estar logado'; end if;
  select id into m from public.mesas where codigo = lower(trim(cod));
  if m is null then raise exception 'codigo invalido'; end if;
  insert into public.mesa_membros (mesa_id, user_id, apelido) values (m, auth.uid(), nome_jogador)
  on conflict (mesa_id, user_id) do update set apelido = coalesce(excluded.apelido, public.mesa_membros.apelido);
  return m;
end; $$;

grant execute on function public.eh_mestre(uuid), public.eh_membro(uuid), public.entrar_na_mesa(text, text) to authenticated;

-- updated_at automático
create or replace function public.toca_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); new.rev = coalesce(old.rev, 0) + 1; return new; end; $$;
drop trigger if exists personagens_touch on public.personagens;
create trigger personagens_touch before update on public.personagens
  for each row execute function public.toca_updated_at();

-- ---------- Segurança por linha ----------
alter table public.mesas enable row level security;
alter table public.mesa_membros enable row level security;
alter table public.personagens enable row level security;

drop policy if exists "mesas: ver" on public.mesas;
create policy "mesas: ver" on public.mesas for select to authenticated using (mestre = auth.uid() or public.eh_membro(id));
drop policy if exists "mesas: criar" on public.mesas;
create policy "mesas: criar" on public.mesas for insert to authenticated with check (mestre = auth.uid());
drop policy if exists "mesas: editar" on public.mesas;
create policy "mesas: editar" on public.mesas for update to authenticated using (mestre = auth.uid()) with check (mestre = auth.uid());
drop policy if exists "mesas: excluir" on public.mesas;
create policy "mesas: excluir" on public.mesas for delete to authenticated using (mestre = auth.uid());

drop policy if exists "membros: ver" on public.mesa_membros;
create policy "membros: ver" on public.mesa_membros for select to authenticated using (public.eh_membro(mesa_id));
drop policy if exists "membros: sair ou remover" on public.mesa_membros;
create policy "membros: sair ou remover" on public.mesa_membros for delete to authenticated
  using (user_id = auth.uid() or public.eh_mestre(mesa_id));
drop policy if exists "membros: editar apelido" on public.mesa_membros;
create policy "membros: editar apelido" on public.mesa_membros for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Personagem: o dono faz tudo; quem está na mesma mesa pode ver; o mestre da mesa pode ver e editar.
drop policy if exists "personagens: ver" on public.personagens;
create policy "personagens: ver" on public.personagens for select to authenticated
  using (dono = auth.uid() or (mesa_id is not null and public.eh_membro(mesa_id)));
drop policy if exists "personagens: criar" on public.personagens;
create policy "personagens: criar" on public.personagens for insert to authenticated
  with check (dono = auth.uid() and (mesa_id is null or public.eh_membro(mesa_id)));
drop policy if exists "personagens: editar" on public.personagens;
create policy "personagens: editar" on public.personagens for update to authenticated
  using (dono = auth.uid() or (mesa_id is not null and public.eh_mestre(mesa_id)))
  with check (dono = auth.uid() or (mesa_id is not null and public.eh_mestre(mesa_id)));
drop policy if exists "personagens: excluir" on public.personagens;
create policy "personagens: excluir" on public.personagens for delete to authenticated using (dono = auth.uid());

-- ---------- Tempo real (o mestre vê as fichas mudarem na hora) ----------
do $$ begin
  alter publication supabase_realtime add table public.personagens;
exception when duplicate_object then null; end $$;
alter table public.personagens replica identity full;


-- ---------- Dados do mestre (batalhas, adversários criados, notas) ----------
create table if not exists public.mestre_dados (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.mestre_dados enable row level security;
drop policy if exists "mestre: ver" on public.mestre_dados;
create policy "mestre: ver" on public.mestre_dados for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "mestre: criar" on public.mestre_dados;
create policy "mestre: criar" on public.mestre_dados for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "mestre: atualizar" on public.mestre_dados;
create policy "mestre: atualizar" on public.mestre_dados for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
