# Além da Realidade · site com Supabase

Site estático (HTML, CSS e JS puros). O banco, o login e as imagens ficam no projeto Supabase `vjrlldnieqyrqgkctnqr`.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O site inteiro: agentes, campanhas, escudo do mestre, ameaças, grimório, homebrew, patente |
| `banco.js` | Ponte com o Supabase: documentos JSON, consultas e tempo real |
| `config.js` | URL do projeto e chave publishable |
| `schema.sql` | Tabelas, regras de acesso (RLS), bucket de imagens e tempo real |
| `dados/` | Livro do A.R.RPG em JSON, bestiário com fichas de combate, rituais |
| `img/criaturas/` | As 111 imagens do bestiário |

## Colocar no ar

1. **Banco.** No painel do Supabase, abra *SQL Editor*, cole o `schema.sql` inteiro e rode. Pelo CLI:
   ```
   supabase init
   supabase link --project-ref vjrlldnieqyrqgkctnqr
   mkdir -p supabase/migrations && cp schema.sql supabase/migrations/20261028000000_adr.sql
   supabase db push
   ```
2. **Login.** Em *Authentication › URL Configuration*, ponha o endereço onde o site vai ficar em *Site URL* e em *Redirect URLs* (ex.: `https://seu-site.netlify.app`). Para testar no PC, adicione também `http://localhost:3000`.
   - Login por e-mail já vem ligado. O jogador recebe um link, sem senha.
   - Para usar o botão do Discord, ative o provedor em *Authentication › Providers › Discord* com o Client ID e Secret de um app do Discord Developer Portal.
   - Para só a sua mesa entrar: desligue *Allow new users to sign up* e convide cada jogador em *Authentication › Users › Invite user*.
3. **Hospedar.** Suba a pasta inteira em qualquer hospedagem estática: Netlify (arrastar a pasta), Vercel ou GitHub Pages. Não abra o `index.html` direto do arquivo, porque o navegador bloqueia a leitura dos JSON; para testar local use `npx serve .` dentro da pasta.
4. **Virar administrador.** Entre no site uma vez e rode no SQL Editor, com o seu e-mail:
   ```sql
   update public.perfis set papel = 'admin'
   where id = (select id from auth.users where email = 'seu-email@exemplo.com');
   ```
   Administrador vê todos os agentes e edita qualquer homebrew.

## Como os dados ficam guardados

Tudo vai para a tabela `public.docs`, um documento JSON por caminho:

| Caminho | Quem lê | Quem escreve |
|---|---|---|
| `fichas/<id>` | Qualquer pessoa logada | Qualquer pessoa logada (o site só mostra edição para o dono, o mestre da campanha e o admin) |
| `campanhas/<id>` e subcoleções (`agentes`, `membros`, `rolagens`, `publico/*`) | Qualquer pessoa logada | Qualquer pessoa logada |
| `homebrew/<id>` | Qualquer pessoa logada | Qualquer pessoa logada |
| `mestre/<uid>/escudo/<campanha>` | Só o próprio mestre (e admins) | Só o próprio mestre |
| `data/users/<uid>/participacoes` | Só a própria pessoa | Só a própria pessoa |

Pistas escondidas, anotações e PV das ameaças ficam no escudo, então jogador nenhum lê, nem abrindo o console.

Imagens vão para o bucket público `imagens`, cada pessoa na pasta do próprio id.

## Segurança

- A chave `sb_publishable_…` pode ficar no `config.js`: ela só faz o que as regras de RLS deixam.
- **Nunca** coloque no site a chave `secret`/`service_role` nem a senha do banco.
- A senha do banco foi colada no chat: troque em *Project Settings › Database › Reset database password*.

## Ligação de voz (TURN)

A voz vai direto de uma pessoa para a outra. Quando a rede não deixa (4G de algumas operadoras, Wi-Fi de empresa), ela passa por um servidor de retransmissão TURN.
O site já usa o Open Relay da Metered, gratuito até 20 GB por mês, com credencial temporária gerada no navegador.
Para trocar por um TURN próprio (Metered com conta, Cloudflare, coturn), ponha no `config.js`:
```js
turn: [{ urls: ['turn:seu-servidor:3478', 'turns:seu-servidor:443?transport=tcp'], username: '...', credential: '...' }],
```
