-- =====================================================================
-- Além da Realidade · regras de segurança dos documentos (rode depois do schema.sql)
-- Cada caminho só pode ser escrito por quem é dono dele. Administrador (perfis.papel = 'admin') pode tudo,
-- menos escrever no Escudo de outro mestre (mestre/<uid>/...), que ele só lê.
-- Pode rodar de novo sem quebrar nada.
-- =====================================================================

-- quem pode criar, alterar ou apagar o documento do caminho p (d = dados novos; nulo ao apagar)
create or replace function public.pode_escrever(p text, d jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  s text[] := string_to_array(p, '/');
  u text := auth.uid()::text;
  velho jsonb;
  mestre text;
begin
  if u is null then return false; end if;
  -- espaços pessoais
  if p like 'mestre/%' then return s[2] = u; end if;
  if p like 'data/users/%' then return s[3] = u; end if;
  if public.eh_admin() then return true; end if;

  select dados into velho from public.docs where path = p;

  -- atividade, perfil estendido e caçador: só a própria conta
  if s[1] in ('atividade', 'usuarios', 'cacadores') then return s[2] = u; end if;
  -- abates do bestiário: só administrador
  if s[1] = 'bestiario' then return false; end if;

  -- homebrew: só quem criou; ninguém além do administrador canoniza ou mexe em canonizado
  if s[1] = 'homebrew' then
    if coalesce((velho->>'canonico')::boolean, false) then return false; end if;
    return coalesce(velho->>'autor', d->>'autor') = u
       and coalesce(d->>'autor', u) = u
       and not coalesce((d->>'canonico')::boolean, false);
  end if;

  -- extensão Deu a Louca nos Bichos: detetives do dono (ou do mestre de um caso em que estão)
  if s[1] = 'bichos-detetives' then
    if velho is null then return d->>'dono' = u; end if;
    if velho->>'dono' = u then return coalesce(d->>'dono', u) = u; end if;
    return exists (
      select 1 from jsonb_array_elements_text(coalesce(velho->'casos', '[]'::jsonb)) as c(id)
      join public.docs x on x.path = 'bichos-casos/' || c.id
      where x.dados->>'mestre' = u);
  end if;
  -- casos dos Bichos: igual às campanhas
  if s[1] = 'bichos-casos' then
    select dados->>'mestre' into mestre from public.docs where path = 'bichos-casos/' || s[2];
    if array_length(s, 1) = 2 then return coalesce(mestre, d->>'mestre') = u and coalesce(d->>'mestre', u) = u; end if;
    if mestre = u then return true; end if;
    if s[3] = 'rolagens' then return velho is null and d->>'uid' = u; end if;
    if s[3] = 'membros' then return s[4] = u; end if;
    if s[3] = 'detetives' then
      return coalesce(velho->>'por', d->>'por') = u
          or exists (select 1 from public.docs f where f.path = 'bichos-detetives/' || s[4] and f.dados->>'dono' = u);
    end if;
    -- quadro da equipe (suspeitos inocentados, quadro criminal): qualquer membro do caso
    if s[3] = 'quadro' then
      return exists (select 1 from public.docs m where m.path = 'bichos-casos/' || s[2] || '/membros/' || u);
    end if;
    return false;
  end if;

  -- fichas: o dono; ou o mestre de uma campanha em que a ficha está
  if s[1] = 'fichas' then
    if velho is null then return d->>'dono' = u; end if;
    if velho->>'dono' = u then return coalesce(d->>'dono', u) = u; end if;
    return exists (
      select 1 from jsonb_array_elements_text(coalesce(velho->'campanhas', '[]'::jsonb)) as c(id)
      join public.docs x on x.path = 'campanhas/' || c.id
      where x.dados->>'mestre' = u);
  end if;

  -- campanhas
  if s[1] = 'campanhas' then
    select dados->>'mestre' into mestre from public.docs where path = 'campanhas/' || s[2];
    if array_length(s, 1) = 2 then return coalesce(mestre, d->>'mestre') = u and coalesce(d->>'mestre', u) = u; end if;
    if mestre = u then return true; end if;
    -- rolagens e chat: cada um só cria as próprias, ninguém edita
    if s[3] in ('rolagens', 'chat') then return velho is null and d->>'uid' = u; end if;
    -- membros: cada um entra e sai sozinho
    if s[3] = 'membros' then return s[4] = u; end if;
    -- agentes da campanha: quem adicionou ou o dono da ficha
    if s[3] = 'agentes' then
      return coalesce(velho->>'por', d->>'por') = u
          or exists (select 1 from public.docs f where f.path = 'fichas/' || s[4] and f.dados->>'dono' = u);
    end if;
    -- publico/* (combate, pistas, relatórios, homebrew da campanha): só o mestre
    return false;
  end if;

  -- qualquer outro caminho continua como antes
  return true;
end $$;

-- leitura: igual a antes, mas a atividade de cada conta só ela e o administrador veem
drop policy if exists "docs: ler" on public.docs;
create policy "docs: ler" on public.docs for select to authenticated
  using (
    (public.pode_acessar(path) or (path like 'mestre/%' and public.eh_admin()))
    and (path not like 'atividade/%' or split_part(path, '/', 2) = auth.uid()::text or public.eh_admin())
  );

drop policy if exists "docs: criar" on public.docs;
create policy "docs: criar" on public.docs for insert to authenticated
  with check (public.caminho_valido(path, colecao) and criado_por = auth.uid() and public.pode_escrever(path, dados));

drop policy if exists "docs: alterar" on public.docs;
create policy "docs: alterar" on public.docs for update to authenticated
  using (public.pode_escrever(path, dados))
  with check (public.caminho_valido(path, colecao) and public.pode_escrever(path, dados));

drop policy if exists "docs: apagar" on public.docs;
create policy "docs: apagar" on public.docs for delete to authenticated
  using (public.pode_escrever(path, null));
