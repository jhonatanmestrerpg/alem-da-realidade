-- =====================================================================
-- Além da Realidade · estrutura do banco no Supabase
-- Rode inteiro no SQL Editor do projeto (ou: supabase db push com este arquivo em migrations).
-- Pode rodar de novo sem quebrar nada.
-- =====================================================================

-- ---------- perfis (nome que aparece na mesa e papel de administrador) ----------
create table if not exists public.perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  papel text not null default 'jogador' check (papel in ('jogador', 'admin')),
  criado_em timestamptz not null default now()
);
alter table public.perfis enable row level security;

drop policy if exists "perfis: logados leem" on public.perfis;
create policy "perfis: logados leem" on public.perfis for select to authenticated using (true);
drop policy if exists "perfis: cada um troca o próprio nome" on public.perfis;
create policy "perfis: cada um troca o próprio nome" on public.perfis for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.perfis from authenticated;
grant update (nome) on public.perfis to authenticated;

-- cria o perfil automaticamente quando alguém entra pela primeira vez
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Agente'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.criar_perfil();
-- perfis de quem já existia antes deste script
insert into public.perfis (id, nome)
select id, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Agente') from auth.users
on conflict (id) do nothing;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin');
$$;

-- ---------- documentos (fichas, campanhas, rolagens, homebrew, escudo) ----------
-- Cada registro é um documento JSON num caminho, por exemplo:
--   fichas/<id> · campanhas/<id> · campanhas/<id>/rolagens/<id> · homebrew/<id>
--   mestre/<uid>/escudo/<campanha>   (só o próprio mestre lê e escreve)
--   data/users/<uid>/participacoes   (lista privada de cada pessoa)
create table if not exists public.docs (
  path text primary key,
  colecao text not null,
  dados jsonb not null default '{}'::jsonb,
  criado_por uuid not null default auth.uid() references auth.users on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists docs_colecao on public.docs (colecao);
create index if not exists docs_dono on public.docs ((dados->>'dono'));
create index if not exists docs_autor on public.docs ((dados->>'autor'));
alter table public.docs replica identity full;
alter table public.docs enable row level security;

create or replace function public.pode_acessar(p text) returns boolean
language sql stable as $$
  select auth.uid() is not null and case
    when p like 'mestre/%'     then split_part(p, '/', 2) = auth.uid()::text
    when p like 'data/users/%' then split_part(p, '/', 3) = auth.uid()::text
    else true
  end;
$$;
create or replace function public.caminho_valido(p text, c text) returns boolean
language sql immutable as $$
  select c = regexp_replace(p, '/[^/]+$', '')
     and array_length(string_to_array(p, '/'), 1) % 2 = 0
     and p ~ '^[A-Za-z0-9_.~:@+-]+(/[A-Za-z0-9_.~:@+-]+)*$';
$$;

drop policy if exists "docs: ler" on public.docs;
create policy "docs: ler" on public.docs for select to authenticated
  using (public.pode_acessar(path) or (path like 'mestre/%' and public.eh_admin()));
drop policy if exists "docs: criar" on public.docs;
create policy "docs: criar" on public.docs for insert to authenticated
  with check (public.pode_acessar(path) and public.caminho_valido(path, colecao) and criado_por = auth.uid());
drop policy if exists "docs: alterar" on public.docs;
create policy "docs: alterar" on public.docs for update to authenticated
  using (public.pode_acessar(path)) with check (public.pode_acessar(path) and public.caminho_valido(path, colecao));
drop policy if exists "docs: apagar" on public.docs;
create policy "docs: apagar" on public.docs for delete to authenticated
  using (public.pode_acessar(path));

create or replace function public.tocar_atualizado() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); new.criado_por = old.criado_por; return new; end $$;
drop trigger if exists docs_atualizado on public.docs;
create trigger docs_atualizado before update on public.docs for each row execute function public.tocar_atualizado();

-- tempo real (a mesa vê rolagens, combate e vitais na hora)
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- ---------- imagens (retratos, capas, criaturas do homebrew) ----------
insert into storage.buckets (id, name, public) values ('imagens', 'imagens', true)
on conflict (id) do update set public = true;

drop policy if exists "imagens: cada um envia na própria pasta" on storage.objects;
create policy "imagens: cada um envia na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "imagens: cada um apaga as suas" on storage.objects;
create policy "imagens: cada um apaga as suas" on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- tornar alguém administrador (vê todos os agentes, edita tudo, lê escudos) ----------
-- Troque o e-mail e rode depois que a pessoa entrar no site pela primeira vez:
-- update public.perfis set papel = 'admin' where id = (select id from auth.users where email = 'seu-email@exemplo.com');
