# Deu a Louca nos Bichos

RPG de investigação com bichos detetives, adaptado do Brutal: Corte Rápido. O caso de estreia é **o mistério dos ovos desaparecidos da Baronesa Cleusa**.

Site estático (HTML, CSS e JS puros). O banco, o login e as imagens usam o mesmo projeto Supabase do Além da Realidade (`vjrlldnieqyrqgkctnqr`), então contas, detetives, mesas, fotos e quadros continuam valendo.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O site inteiro: caso, regras, detetives, mesas, escudo do mestre, quadro criminal, conta |
| `bichos-dados.js` | Conteúdo do sistema: espécies, estilos, vantagens, perfis e ações do Culpado, suspeitos prontos, regras |
| `banco.js` | Ponte com o Supabase: documentos JSON, consultas e tempo real |
| `config.js` | URL do projeto Supabase e chave publishable |
| `versao.txt` | Número da publicação. Quando muda, quem está com o site aberto recebe o aviso "O site foi atualizado" |
| `img/` | Capa, ícones e favicon |

## Onde está no ar

Este site mora na pasta `deu-a-louca-nos-bichos/` do repositório `alem-da-realidade` e sai junto com ele no Render:
**https://alem-da-realidade.onrender.com/deu-a-louca-nos-bichos/**

Como fica no mesmo endereço do A.R., quem já está logado lá entra direto, sem logar de novo.

### Endereço próprio (opcional)

Para ter `https://deu-a-louca-nos-bichos.onrender.com`:
1. **Render** › *New* › *Static Site* › repositório `alem-da-realidade`, Name `deu-a-louca-nos-bichos`, Build Command vazio, **Publish Directory `deu-a-louca-nos-bichos`**.
2. **Supabase** › *Authentication* › *URL Configuration* › em *Redirect URLs*, adicione `https://deu-a-louca-nos-bichos.onrender.com/**`. Sem isso, o link de login do e-mail volta para o A.R.

Para testar no PC: `npx serve .` dentro da pasta (não abra o `index.html` direto do arquivo).

## Dados

Tudo fica na tabela `public.docs` do Supabase, um documento JSON por caminho:

| Caminho | O que é |
|---|---|
| `bichos-detetives/<id>` | Ficha de detetive |
| `bichos-casos/<id>` | Caso (mesa): fase, Pilha do Culpado, Palheiro, pistas, suspeitos públicos, dia, local de investigação, sala de interrogatório |
| `bichos-casos/<id>/rolagens/<id>` | Rolagens, ações do Culpado e interrogatórios |
| `bichos-casos/<id>/membros/<uid>` | Quem entrou na mesa |
| `bichos-casos/<id>/detetives/<id>` | Detetives levados para a mesa |
| `bichos-casos/<id>/quadro/estado` | Quadro criminal da equipe e suspeitos inocentados |
| `mestre/<uid>/bichos/<caso>` | Escudo do Mestre: Culpado, PL, solução, pistas escondidas, fichas secretas de suspeitos, tipos das respostas dos interrogatórios. Só o próprio mestre lê |
| `data/users/<uid>/bichos` | Lista de mesas de cada pessoa |

As regras de quem escreve o quê estão no `seguranca.sql` do repositório `alem-da-realidade`, que já foi rodado nesse mesmo Supabase.

## Publicar uma versão nova

Troque o número em `versao.txt` e a constante `BUILD` no `index.html` pelo mesmo valor (data e hora, ex.: `20261103080000`).
