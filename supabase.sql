-- Mesa do Mestre: estrutura do banco no Supabase.
-- Rode uma vez em: Supabase > SQL Editor > New query > cole tudo > Run.

-- Uma linha por usuário, com todo o estado do site (campanhas, jogadores, combate, adversários criados).
create table if not exists public.estados (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Sem RLS, qualquer um com a chave pública leria tudo. Com ela, cada pessoa só vê a própria linha.
alter table public.estados enable row level security;

drop policy if exists "ler o proprio estado" on public.estados;
create policy "ler o proprio estado" on public.estados
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "criar o proprio estado" on public.estados;
create policy "criar o proprio estado" on public.estados
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "atualizar o proprio estado" on public.estados;
create policy "atualizar o proprio estado" on public.estados
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
