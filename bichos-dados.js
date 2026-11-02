/* =====================================================================
   Deu a Louca nos Bichos · Faro Rápido
   Conteúdo do sistema: adaptação do Brutal: Corte Rápido para um mistério
   investigativo com bichos detetives. Usado por bichos.html.
   ===================================================================== */
'use strict';
window.BICHOS = (() => {
  const ESTILOS = {
    desenrolado: { nome: 'Desenrolado', cor: '#3fb8a3', txt: 'Reagir a surpresas, encarar situações incômodas e trabalhar junto com os colegas no meio da bagunça.' },
    firme:       { nome: 'Firme',       cor: '#8a7cf0', txt: 'Aguentar o tranco, manter a pose em situações tensas e impor sua vontade sobre os outros.' },
    ligeiro:     { nome: 'Ligeiro',     cor: '#f2b632', txt: 'Acrobacias, passar despercebido e enganar os outros, seja numa conversa ou numa perseguição.' },
    potente:     { nome: 'Potente',     cor: '#e4574d', txt: 'Manobras brutas, intimidar suspeitos e derrubar barreiras, sociais e físicas, na base da força.' },
    sagaz:       { nome: 'Sagaz',       cor: '#5aa8e8', txt: 'Resolver enigmas, desatar complicações e convencer os outros numa discussão.' },
  };

  /* espécies: ordem = iniciativa na Acareação */
  const ESPECIES = [
    { id: 'texugo', nome: 'Texugo', papel: 'Inspetor', tags: 'Altruísta · Confiante · Teimoso', cor: '#c9c3b5', estilos: ['potente', 'sagaz'], grito: 'Deixa que eu resolvo!',
      desc: 'Ninguém te nomeou chefe, mas quando o ninho aparece vazio é para você que todo mundo olha. Você é o bigode que segura a investigação de pé. Às vezes guia o grupo para a verdade, às vezes direto para o buraco.',
      hab: { nome: 'Deixa Comigo', frase: 'Enquanto eu tiver bigode, o caso tá de pé!', cena: 'Acareação', recarga: 'Sem restrição', txt: 'Ao Se Jogar na Frente, você pode manter um único dado na sua Pilha de Compostura em vez de descartar todos.' } },
    { id: 'cavalo', nome: 'Cavalo', papel: 'Patrulheiro', tags: 'Leal · Forte · Estabanado', cor: '#b0703c', estilos: ['desenrolado', 'potente'], grito: 'Sobe na garupa!',
      desc: 'Você conhece cada porteira do condado e já levou meio mundo nas costas. Grande demais para se esconder e leal demais para deixar alguém para trás, você resolve as coisas no galope e no coice.',
      hab: { nome: 'Pode tirar o cavalinho da chuva', frase: 'Segura firme que lá vem poeira!', cena: 'Acareação', recarga: 'Fim de uma Acareação', txt: 'Uma vez por Acareação, ao Dar Cobertura, os dados de sucesso que você doa vão direto para a Pilha de Dedução do aliado em vez da Pilha de Compostura dele.' } },
    { id: 'lontra', nome: 'Lontra', papel: 'Mergulhadora', tags: 'Energética · Esportista · Competitiva', cor: '#7a5a3a', estilos: ['ligeiro', 'potente'], grito: 'Ninguém nada mais rápido que eu!',
      desc: 'Você cresceu ouvindo que perder é para os fracos e transformou o lago do condado na sua pista de treino. Ninguém percebe a pressão que você carrega nas costas. Talvez seja justamente ela que te faça chegar primeiro na pista.',
      hab: { nome: 'Fôlego de Lontra', frase: 'Eu nunca canso!', cena: 'Sem restrição', recarga: 'Fim de uma Acareação', txt: 'Uma vez por Acareação, você pode trocar o resultado de um dado que rolou pelo valor de um dos seus Dados de Encrenca.' } },
    { id: 'tatu', nome: 'Tatu-bola', papel: 'Farejador', tags: 'Casca-grossa · Rabugento · Rebelde', cor: '#a08a6a', estilos: ['firme', 'potente'], grito: 'Ninguém mexe comigo!',
      desc: 'Você fareja mentira de longe e nunca soube respeitar autoridade, nem a da Baronesa. Para a maioria você é um rabugento completo. Quem te conhece sabe que tem um coração mole debaixo dessa carapaça.',
      hab: { nome: 'Virar Bola', frase: 'Pode bater, eu nem sinto!', cena: 'Acareação', recarga: 'Início de uma Acareação', txt: 'Uma vez por Acareação, ao receber um Galo, role um dado da sua Pilha de Compostura. Num sucesso, você descarta um dado da sua Pilha de Dedução em vez de receber o Galo. Numa falha, o dado é descartado e o Galo vem normalmente.' } },
    { id: 'raposa', nome: 'Raposa', papel: 'Interrogadora', tags: 'Charmosa · Vaidosa · Ardilosa', cor: '#e07a2e', estilos: ['desenrolado', 'firme'], grito: 'Ninguém mente pra essa cara!',
      desc: 'Charme, lábia e um rabo impecável: As fofocas do condado chegam primeiro nas suas orelhas. Todo mundo quer ser seu amigo e ninguém confia em você, e é exatamente assim que você gosta. Suspeito nenhum resiste a uma conversa com você.',
      hab: { nome: 'Olha Pra Mim', frase: 'Eu sou a melhor!', cena: 'Sem restrição', recarga: 'Sem restrição', txt: 'Você recebe 1 Ponto de Faro para cada 6 tirado numa rolagem sua.' } },
    { id: 'guaxinim', nome: 'Guaxinim', papel: 'Gatuno', tags: 'Mão-leve · Curioso · Noturno', cor: '#6f7480', estilos: ['ligeiro', 'sagaz'], grito: 'Achado não é roubado!',
      desc: 'Você revira lixo, celeiro e gaveta alheia desde filhote. Tem máscara de bandido e passado de bandido, e justamente por isso entende como bandido pensa. A Baronesa nem sabe que você está na equipe.',
      hab: { nome: 'Revirar o Lixo', frase: 'Uma pessoa joga fora, eu reaproveito!', cena: 'Cena Livre ou Suspense', recarga: 'Início de uma sessão', txt: 'Uma vez por sessão, role um teste Ligeiro. Cada sucesso puxa um dado do Palheiro para a sua Pilha de Compostura, até o máximo de 6. As falhas são sacrificadas normalmente.' } },
    { id: 'pato', nome: 'Pato', papel: 'Estagiário', tags: 'Ingênuo · Prestativo · Puro', cor: '#f2d24b', estilos: ['desenrolado', 'sagaz'], grito: 'Alguém me ajuda?',
      desc: 'Primo de terceiro grau da Baronesa e estagiário não remunerado da investigação. Confiável, bondoso e ingênuo: Até o mais casca-grossa do condado amolece o coração do seu lado. Quando a coisa apertar, alguém vai estar lá por você.',
      hab: { nome: 'Carência', frase: 'Não custa nada ajudar, né?', cena: 'Acareação', recarga: 'Início de uma sessão', txt: 'Uma vez por sessão, quando você for o alvo de Dar Cobertura, quem te ajuda não perde os dados doados: Eles saem do Palheiro.' } },
    { id: 'coelho', nome: 'Coelho', papel: 'Analista', tags: 'Engenhoso · Inteligente · Ansioso', cor: '#e8e4dc', estilos: ['ligeiro', 'sagaz'], grito: 'Eu já fiz a planilha!',
      desc: 'Você nunca teve tempo para os populares do condado: Sua cabeça vive enfiada em mapas, tabelas e cronogramas. Saber demais parecia um presente. Agora parece uma maldição, porque um erro no seu raciocínio pode afundar o caso inteiro.',
      hab: { nome: 'Memória Fotográfica', frase: 'Eu lembro de tudo e de todos!', cena: 'Acareação', recarga: 'Início de uma sessão', txt: 'Uma vez por sessão, durante uma Acareação, você pode perguntar ao Mestre quantos dados faltam para completar a sua Pilha de Dedução.' } },
    { id: 'gamba', nome: 'Gambá', papel: 'Infiltrado', tags: 'Dramático · Esquivo · Fedido', cor: '#9a9aa8', estilos: ['firme', 'ligeiro'], grito: 'Ai, morri. Brincadeira!',
      desc: 'Você se infiltra onde ninguém quer entrar e sai antes que alguém sinta o cheiro. Ou depois, aí é pior. Dramático de nascença, você já fingiu desmaio em três velórios e duas audiências.',
      hab: { nome: 'Fingir de Morto', frase: 'Aqui jaz um detetive... ou não.', cena: 'Acareação', recarga: 'Fim de uma Acareação', txt: 'Uma vez por Acareação, quando o Culpado tentar te Tirar do Caso, role um dado da sua Pilha de Compostura. Num sucesso, ele acredita que você caiu: Você sai da Acareação sem completar a Pilha de Dedução, mas continua no caso. Numa falha, o dado é descartado e nada acontece.' } },
    { id: 'corvo', nome: 'Corvo', papel: 'Investigador', tags: 'Desligado · Curioso · Colecionador', cor: '#3a3f55', estilos: ['desenrolado', 'ligeiro'], grito: 'Uh? Olha, brilhante!',
      desc: 'Um galho alto, uma brisa fresca e algo brilhando lá embaixo: Você sempre foi de boa com a vida. Sua cabeça vive nas nuvens, literalmente. Tanta leveza, porém, pode te transformar no primeiro detetive a levar uma panelada.',
      hab: { nome: 'Olha, Brilhante!', frase: 'Se liga nos movimentos!', cena: 'Sem restrição', recarga: 'Fim de uma Acareação', txt: 'Uma vez por Acareação, ao receber um Galo, você pode rolar o Dado de Encrenca de novo e ficar com o novo resultado.' } },
    { id: 'coruja', nome: 'Coruja', papel: 'Perita', tags: 'Centrada · Inquisitiva · Sensata', cor: '#8a5a32', estilos: ['firme', 'sagaz'], grito: 'Isso tem explicação!',
      desc: 'Você já viu de tudo e nunca caiu em lenda de assombração. Para você, todo mistério tem uma explicação lógica, comprovável com lupa e monóculo. Talvez isso te derrube no fim. Ou talvez seja o que te mantém acordada até o último interrogatório.',
      hab: { nome: 'Só Acredito Vendo', frase: 'Só pode ser pegadinha!', cena: 'Sem restrição', recarga: 'Sem restrição', txt: 'Você pode repetir cada Teste de Espanto uma vez.' } },
  ];

  const VANT_GERAIS = [
    { id: 'cafe', nome: 'Cafezinho Forte', custo: 6, recarga: 'Acareação, Cena Livre', txt: 'Você recebe um dado adicional para a sua Pilha de Compostura.' },
    { id: 'recompor', nome: 'Se Recompor', custo: 3, recarga: 'Sem restrição', txt: 'Você recupera um Estilo Desmoralizado seu ou de outro detetive.' },
    { id: 'gelo', nome: 'Gelo no Galo', custo: '1 por ponto', recarga: 'Fim de uma Acareação', txt: 'Para cada Ponto de Faro gasto, o Galo de um detetive diminui em 1. Ele nunca fica abaixo do Tique Nervoso daquele detetive.' },
  ];
  const VANT_ESTILO = {
    sagaz:       { id: 'celeiro', nome: 'Revirar o Celeiro', custo: 'Sem restrição', recarga: '3 PF', txt: 'Você encontra um Recurso que não estava na cena nem com você, desde que faça sentido na história. Recursos têm um uso e reduzem a dificuldade de um teste em 1.' },
    desenrolado: { id: 'bilhete', nome: 'Passar o Bilhete', custo: 'Os PF transferidos', recarga: 'Fim de uma Acareação', txt: 'Você transfere quantos Pontos de Faro quiser para outro detetive.' },
    ligeiro:     { id: 'tese', nome: 'Montar a Tese', custo: 3, recarga: '6 PF', txt: 'No começo da próxima Acareação, você pode mover um dado da sua Pilha de Compostura para a sua Pilha de Dedução.' },
    firme:       { id: 'pose', nome: 'Manter a Pose', custo: 2, recarga: 'Fim de uma Acareação', txt: 'Você recebe um dado adicional para a sua Pilha de Compostura.' },
    potente:     { id: 'prensa', nome: 'Dar a Prensa', custo: 3, recarga: 'Fim de uma Acareação', txt: 'No seu próximo Apertar, você rola dois dados extras vindos do Palheiro. Depois da rolagem, eles voltam para o Palheiro.' },
  };

  const PERFIS = {
    fantasma: { nome: 'Fantasma do Moinho', tags: 'Etéreo · Teatral · Arrepiante', acoes: ['casca', 'desmoralizar', 'aliciar'],
      txt: 'Lençol branco, corrente arrastando e um gemido no meio do milharal. Todo condado tem sua assombração, e toda assombração tem alguém debaixo do lençol. O Fantasma vive de susto e persiste contra qualquer tentativa de desmascará-lo.',
      intento: 'Ao Pregar Peça, você recebe PL igual ao número de detetives que falharem no Teste de Espanto.' },
    grandalhao: { nome: 'Grandalhão', tags: 'Intimidador · Bruto · Resistente', acoes: ['desmoralizar', 'agarrar'],
      txt: 'Grande, forte e cabeça-dura, o Grandalhão resolve tudo no peito. Raramente poupa esforço para atropelar quem chega perto demais da verdade. Se o assoalho do celeiro começou a ranger, já é tarde.',
      intento: 'Quando um detetive falha num teste de Apertar, você recebe 2 PL.' },
    trambiqueiro: { nome: 'Trambiqueiro', tags: 'Calculista · Paciente · Debochado', acoes: ['casca', 'zombar', 'desmoralizar', 'enrolar'],
      txt: 'O Trambiqueiro sabe exatamente o que quer, quando quer e como quer. Planta pista falsa, monta álibi e arma ratoeira com uma paciência irritante. E o pior: Ele se diverte.',
      intento: 'Você recebe 1 PL para cada Armadilha ativada num Suspense.' },
    mandante: { nome: 'Mandante', tags: 'Influente · Líder · Manipulador', acoes: ['agarrar', 'aliciar', 'zombar', 'desmoralizar'],
      txt: 'Não tema o Mandante. Tema o que os capangas dele fazem. Ele pode ser um figurão da nobreza, um clube secreto de chá ou uma fofoca que saiu do controle, e quase nunca suja as próprias penas.',
      intento: 'Você recebe 1 PL sempre que um detetive ganha o primeiro Tique Nervoso da sessão.' },
  };

  /* custo em PL; alvo = precisa escolher detetive */
  const ACOES_GERAIS = [
    { id: 'sumir', nome: 'Sumir no Mato', cena: 'Acareação', custo: 0, txt: 'Você já aprontou o que queria. No seu turno, você se retira da Acareação, encerrando a cena e recebendo 1 dado na sua Pilha.' },
    { id: 'galo', nome: 'Dar um Galo', cena: 'Acareação', custo: 0, alvo: true, txt: 'Você acerta uma panelada, uma bengalada ou um coice no detetive. Escolha um alvo e role um dado da sua Pilha. 6: o detetive está Fora do Caso. 1 a 5: o detetive recebe um Dado de Encrenca de Galo com o valor rolado. Todo Galo dá 1 Tique Nervoso ao alvo. Se ele já tinha um Galo, os valores somam. O dado rolado vai para o Palheiro.' },
    { id: 'peca', nome: 'Pregar Peça', cena: 'Acareação, Cena Livre', custo: 0, txt: 'Você assusta com pegadas falsas, bilhetes anônimos e barulhos no sótão: Os detetives fazem um Teste de Espanto. A quantidade de Peças por Acareação está na ficha do Culpado. Se algum jogador der um pulo ou soltar um grito de verdade, você recebe 1 PL.' },
    { id: 'tirar', nome: 'Tirar do Caso', cena: 'Acareação, Cena Livre', custo: 0, alvo: true, txt: 'Você tira um detetive da investigação: Trancado no galinheiro, desacreditado na frente da Baronesa ou preso por engano. Numa Acareação, só funciona contra um detetive com menos dados que a sua Pilha. Em qualquer cena, também funciona por Aliciar.' },
    { id: 'rastros', nome: 'Apagar Rastros', cena: 'Acareação, Cena Livre', custo: 0, txt: 'Você varre pegadas e some com pistas. No início de uma Acareação, aumenta em 1 o tamanho da Pilha de Dedução.' },
    { id: 'atropelar', nome: 'Atropelar', cena: 'Acareação', custo: 4, txt: 'Ao tirar 6 em Dar um Galo, você pode deixar o detetive no caso, todo estropiado: Ele recebe 3 Tiques Nervosos e uma última chance de seguir a pista.' },
  ];
  const ACOES_UNICAS = {
    casca: { id: 'casca', nome: 'Casca de Banana', cena: 'Cena Livre', custo: 4, alvo: true, txt: 'Um susto bem dado derruba os mais frágeis. Ao Pregar Peça fora de uma Acareação, você pode Dar um Galo num detetive que falhou no Teste de Espanto.' },
    zombar: { id: 'zombar', nome: 'Zombar', cena: 'Acareação, Cena Livre', custo: 0, txt: 'Você se alimenta da empolgação dos detetives. Quando um detetive anunciar um 6 num teste, você ri da cara dele e recebe 1 PL. O detetive mantém o sucesso.' },
    enrolar: { id: 'enrolar', nome: 'Enrolar', cena: 'Acareação', custo: 0, alvo: true, txt: 'Rede de pesca, papelada da prefeitura ou um interrogatório sem fim. Você dá ao alvo um Dado de Encrenca Enrolado de valor 3. Enquanto ele existir, todos os testes do detetive são Complexos. O detetive se solta com testes Ligeiros ou Sagazes: cada sucesso reduz o valor em 1. Se falhar, o valor sobe 1 e ele leva Galo igual ao valor do Enrolado. Em 0, a encrenca acaba.' },
    desmoralizar: { id: 'desmoralizar', nome: 'Desmoralizar', cena: 'Acareação', custo: 4, alvo: true, txt: 'Quem escapa das suas garras não conta com nada nem ninguém. Ao Dar um Galo num detetive, você pode Desmoralizar um dos Estilos dele. Ele também perde a Vantagem ligada ao Estilo até Se Recompor.' },
    aliciar: { id: 'aliciar', nome: 'Aliciar', cena: 'Acareação', custo: 0, alvo: true, txt: 'Nada mais sádico do que fazer um detetive trabalhar para você. Você dá ao alvo um Dado de Encrenca Aliciado de valor 1, que sobe 1 a cada dado falho que ele rolar. Em 6, você pode Tirar do Caso alguém através do detetive aliciado, sem cumprir as condições de Tirar do Caso. Numa Acareação, isso acontece no turno dele e ele perde a vez. O Dado de Encrenca é descartado depois.' },
    agarrar: { id: 'agarrar', nome: 'Agarrar', cena: 'Acareação', custo: 5, alvo: true, txt: 'Ao Dar um Galo sem tirar o detetive do caso, você pode agarrá-lo. Agarrado, ele não move dados para a Pilha de Dedução e o Galo dele sobe 1 no começo de cada turno dele. Os outros detetives podem tentar soltá-lo com Testes Complexos.' },
  };
  const GOLPES = {
    cadeovo: { id: 'cadeovo', nome: 'Cadê o Ovo?!', cena: 'Cena Livre', custo: 4, recarga: 'Cena Livre', frase: 'Os corações disparam com a aparição repentina.', txt: 'No início de uma Acareação, todos os detetives presentes fazem um Teste de Espanto. Isso não gasta Peças.' },
    cheiro: { id: 'cheiro', nome: 'Cheiro de Medo', cena: 'Acareação', custo: '2 por jogador', recarga: 'Início de uma Acareação', frase: 'Ver um colega cair te deixa ainda mais animado.', txt: 'Ao Tirar do Caso um detetive pela primeira vez numa Acareação, os detetives restantes descartam 1 dado cada.' },
    planob: { id: 'planob', nome: 'Plano B', cena: 'Cena Livre', custo: 5, recarga: 'Fim de uma Acareação', frase: 'Seu repertório de trapaças é grande demais para uma só.', txt: 'Logo depois de uma Acareação, você troca uma Ação Única por outra dos seus Perfis.' },
    tanahora: { id: 'tanahora', nome: 'Tá na Hora!', cena: 'Acareação', custo: 3, recarga: 'Fim de uma Acareação', frase: 'A encrenca de alguém sempre pode piorar.', txt: 'No início de uma Acareação, você aumenta em 1 qualquer Dado de Encrenca da mesa, menos Galo.' },
  };

  const INTENTOS = [
    ['Dois detetives flertam em cena.', 1],
    ['Um detetive fica Fora do Caso numa Acareação.', 1],
    ['Um detetive sai de uma Acareação com Galo.', 1],
    ['Um detetive usa Cafezinho Forte.', 1],
    ['Um detetive falha num Teste de Espanto.', 1],
    ['Um detetive cai numa Armadilha.', 2],
    ['Todos os detetives só Seguem o Rastro no primeiro turno.', 4],
  ];

  /* culpados prontos: também servem de suspeitos no condado */
  const PRONTOS = [
    { id: 'javali', nome: 'Seu Bartolomeu', especie: 'Javali', perfis: ['grandalhao', 'trambiqueiro'], dados: 6, pl: 3, pecas: 1, acoes: ['desmoralizar', 'agarrar'], golpe: 'cheiro', alvo: 5,
      frase: 'Ovo? Que ovo? Eu só como trufa!',
      txt: 'Dono da fazenda de trufas do outro lado do lago, Seu Bartolomeu briga com a Baronesa há dez anos por causa de uma cerca torta. Dois metros de javali, uma pá enferrujada no ombro e pouquíssima paciência para bisbilhoteiro. Jura que estava dormindo na madrugada do crime, mas tem lama fresca no casco.' },
    { id: 'fantasma', nome: 'O Fantasma do Moinho', especie: 'Desconhecida', perfis: ['fantasma', 'mandante'], dados: 4, pl: 2, pecas: 3, acoes: ['casca', 'aliciar'], golpe: 'cadeovo', alvo: 4,
      frase: 'Devolvaaam meu ninhooo...',
      txt: 'Diz a lenda que, nas noites de lua cheia, um vulto de lençol arrasta correntes pelo moinho abandonado e geme por um ninho perdido há cem anos. Desde o sumiço dos ovos, três testemunhas juram ter visto o vulto voando baixo sobre o celeiro da Baronesa. Quem está debaixo do lençol é segredo do Mestre.' },
    { id: 'doninha', nome: 'Dona Valdirene', especie: 'Doninha', perfis: ['trambiqueiro', 'fantasma'], dados: 3, pl: 1, pecas: 4, acoes: ['casca', 'enrolar'], golpe: 'planob', alvo: 4,
      frase: 'Para um bom bolo, é preciso quebrar alguns ovos, querida.',
      txt: 'Confeiteira oficial do condado, Dona Valdirene recebeu a maior encomenda da vida dela: O pão de ló gigante do Festival do Trigo. Curiosamente, o fornecedor de ovos dela cancelou a entrega na semana do crime. Sorriso doce, avental impecável e uma agenda cheia de horários que não batem.' },
    { id: 'cobra', nome: 'Madame Serpentina', especie: 'Cobra', perfis: ['mandante', 'trambiqueiro'], dados: 3, pl: 1, pecas: 3, acoes: ['zombar', 'aliciar'], golpe: 'tanahora', alvo: 5,
      frase: 'Por que sujar as escamas se outros fazem por mim?',
      txt: 'Presidente do Clube de Chá de GansoTopolópis e dona de uma rede de informantes que vai do moinho à prefeitura. Todo mundo aponta para ela, afinal cobra come ovo. Justamente por ser óbvia demais, ninguém consegue provar nada. Ela adora isso.' },
  ];

  /* ---------- regras (texto) ---------- */
  const t = (titulo, corpo) => `<h3>${titulo}</h3>${corpo}`;
  const REGRAS = [
    { id: 'caso', titulo: 'O caso', html: `
      <p class="lead">Deu a Louca nos Bichos é um RPG de mistério investigativo inspirado no Brutal: Corte Rápido. Os jogadores vivem bichos detetives convocados às pressas para resolver um crime que abalou a nobreza animal, enquanto o Mestre controla o Culpado e todo o condado.</p>
      ${t('O mistério dos ovos desaparecidos', '<p>Na manhã fria de terça-feira, a Baronesa Gansa Cleusa, soberana do Condado de GansoTopolópis, acordou para o horror: O ninho estava vazio. Os ovos, herdeiros legítimos do título baronial, sumiram sem deixar rastro. Sem penas. Sem testemunhas. Sem explicação.</p><p>GansoTopolópis parece pacato, com campos de trigo e lagos tranquilos. Conforme a investigação avança, porém, segredos antigos sobem à superfície: Rivalidades entre vizinhos, alianças suspeitas e depoimentos que não batem. Nem todo bicho é tão inocente quanto parece.</p>')}
      ${t('O que muda em relação ao Brutal', '<p>No Brutal, sobreviventes fogem de um assassino. Aqui, detetives perseguem um Culpado que quer sumir com as provas. Ninguém morre: Quem cai sai do caso. As pilhas de dados, os Estilos, as Vantagens e o ritmo de cenas continuam iguais, com nomes do condado.</p>')}
      <div class="glossario">
        <div><b>Mestre</b><span>Diretora</span></div><div><b>Detetive</b><span>Sobrevivente</span></div><div><b>Caso</b><span>Thriller</span></div>
        <div><b>Acareação</b><span>Encontro</span></div><div><b>Culpado</b><span>Assassino</span></div><div><b>Espécie</b><span>Arquétipo</span></div>
        <div><b>Pilha de Compostura</b><span>Pilha Comum</span></div><div><b>Pilha de Dedução</b><span>Pilha de Fuga</span></div><div><b>Palheiro</b><span>Pilha de Descarte</span></div>
        <div><b>Dado de Encrenca</b><span>Dado Marcador</span></div><div><b>Galo</b><span>Ferida</span></div><div><b>Tique Nervoso</b><span>Sequela</span></div>
        <div><b>Pontos de Faro (PF)</b><span>Pontos de Tensão</span></div><div><b>Pontos de Lorota (PL)</b><span>Pontos de Horror</span></div><div><b>Fora do Caso</b><span>Morte</span></div>
        <div><b>Teste de Espanto</b><span>Teste de Susto</span></div><div><b>Golpe Baixo</b><span>Apavoro</span></div><div><b>Perfil</b><span>Ameaça</span></div>
      </div>` },
    { id: 'pilhas', titulo: 'Pilhas de dados', html: `
      <p class="lead">Tudo no jogo roda em dados de seis lados empilhados. As pilhas sobem e descem durante o caso e mostram quem está segurando as pontas.</p>
      ${t('Pilha de Compostura', '<p>Cada detetive tem a própria Pilha de Compostura. Ela mede o quanto ele ainda está inteiro: Quanto mais dados, mais segurança. No início do caso, cada jogador recebe seis dados e nunca pode passar desse limite.</p>')}
      ${t('Pilha do Culpado', '<p>O Mestre também tem uma pilha, que mede o poder do Culpado. A quantidade inicial está na ficha do Culpado. Ela cresce cada vez que os detetives vacilam fora de uma Acareação.</p>')}
      ${t('Palheiro', '<p>O Palheiro é a pilha de descarte, uma só para a mesa toda. Todo dado descartado vai para lá, e é de lá que alguns efeitos puxam dados de volta. Procurar dado no Palheiro é como procurar agulha: Às vezes dá certo.</p>')}
      ${t('Pilha de Dedução', '<p>Cada detetive monta uma Pilha de Dedução durante uma Acareação. Ela representa o raciocínio dele fechando o cerco. O tamanho que ela precisa ter está na ficha do Culpado e é segredo do Mestre. Ao completar a Pilha de Dedução, o detetive amarra a sua linha de investigação, sai da Acareação e leva uma Pista Quente. No fim da Acareação, os dados da Pilha de Dedução voltam para a Pilha de Compostura.</p>')}
      ${t('Dados de Encrenca', '<p>Dados de Encrenca marcam condições que o Culpado causa: <b>Galo</b> (pancada), <b>Enrolado</b> (preso numa enrascada) e <b>Aliciado</b> (trabalhando para o Culpado sem perceber). O número na face mostra a gravidade: Quanto maior, pior. Eles não contam como dados da Pilha de Compostura e não podem ser rolados em testes. Ao receber uma Encrenca que já tem, troque o dado antigo pelo novo. Galo é a exceção: Os valores somam.</p>')}` },
    { id: 'testes', titulo: 'Arriscando dados', html: `
      <p class="lead">Quando um detetive tenta algo arriscado, ele aposta dados da própria Pilha de Compostura.</p>
      ${t('Como testar', '<p>Anuncie quantos dados da sua Pilha de Compostura quer arriscar e role todos juntos. Por padrão, cada dado com resultado 4 ou mais é um sucesso. Se a ação usa um dos seus dois Estilos, a dificuldade cai em 1 e o sucesso passa a ser 3 ou mais. Dado que falha sempre é perdido de algum jeito.</p>')}
      ${t('Testes Comuns e Complexos', '<p>Testes Comuns pedem um sucesso. Testes Complexos pedem dois.</p>')}
      ${t('Sacrificar e descartar', '<p><b>Sacrificar:</b> Em Cena Livre e Suspense, enquanto o Culpado ainda não se revelou, todo dado falho é sacrificado e vai da sua pilha para a Pilha do Culpado. Cada vacilo dá tempo para ele.</p><p><b>Descartar:</b> Em Acareações e Testes de Espanto, todo dado falho é descartado e vai para o Palheiro.</p>')}
      ${t('Teste de Espanto', '<p>Pegada gigante no barro, um grito no milharal, a porta do celeiro batendo sozinha: O Mestre pode pedir um Teste de Espanto. O jogador rola um único dado da Pilha de Compostura. Numa falha, o dado é descartado.</p>')}
      ${t('Cenas', '<p><b>Cena Livre:</b> Investigação, conversa e vida no condado. <b>Suspense:</b> Algo está errado e todos sentem, mas o Culpado ainda não apareceu. <b>Acareação:</b> O Culpado age às claras, e cada detetive precisa amarrar a própria dedução antes que as provas sumam.</p>')}` },
    { id: 'faro', titulo: 'Pontos de Faro', html: `
      <p class="lead">Pontos de Faro (PF) são a intuição de detetive borbulhando. Servem para comprar Vantagens fora da Acareação.</p>
      <p>Todo detetive começa o caso com 0 PF e acumula no máximo 10. Ninguém ganha PF de graça: o jogador precisa colocar o detetive em risco com uma atitude estúpida ou colocar em jogo a própria dignidade na mesa.</p>
      ${t('Desafios', '<ul><li><b>Clichê de detetive:</b> Entrar sozinho no celeiro escuro, seguir o vulto no milharal, abrir o baú que está claramente armado. O Mestre define quantos PF vale.</li><li><b>Voz do bicho:</b> Interpretar uma fala inteira na voz e no jeito da sua espécie.</li><li><b>Palpite em voz alta:</b> Acusar um suspeito na frente de todo mundo, sem prova nenhuma.</li><li><b>Shot:</b> Para quem bebe, o clássico do Brutal continua valendo. A mesa combina quantos PF cada dose rende.</li></ul>')}` },
    { id: 'especies', titulo: 'Espécies e Estilos', html: `
      <p class="lead">Cada detetive é de uma espécie, que define seus dois Estilos, sua habilidade e sua posição na iniciativa.</p>
      ${t('Estilos', Object.values(ESTILOS).map(e => `<p><b style="color:${e.cor}">${e.nome}:</b> ${e.txt}</p>`).join('') + '<p>Quando você testa usando um dos seus Estilos, a dificuldade do teste cai em 1.</p>')}
      ${t('As onze espécies', '<div data-especies></div>')}` },
    { id: 'apegos', titulo: 'Apegos', html: `
      <p class="lead">Apegos são o que prende o detetive ao mundo quando o caso fica feio. Usá-los rende Pontos de Faro.</p>
      ${t('Item Icônico', '<p>Um objeto que acompanha o detetive para todo lado: A lupa do avô, o cachimbo, o caderninho. Não some nem quebra, a não ser que você queira, e não serve como Recurso. Se for roubado ou perdido, volta antes do fim do caso. Usar o Item Icônico numa ação rende <b>2 PF</b>, uma vez por sessão e só pelo dono.</p>')}
      ${t('Relação Afetiva', '<p>Um laço com outro bicho que serve de porto seguro: A mãe, o melhor amigo, o bichinho de estimação. Passar tempo com ele numa sessão rende <b>2 PF</b>, uma vez por sessão.</p>')}
      ${t('Rabo Preso', '<p>Um segredo que o detetive guarda a sete chaves, com medo do que acontece se vier à tona. Revelar o Rabo Preso durante o caso rende <b>3 PF</b>. Depois de revelado, não pode ser usado de novo.</p>')}` },
    { id: 'vantagens', titulo: 'Vantagens', html: `
      <p class="lead">Fora da Acareação, detetives usam Vantagens: ações especiais pagas com Pontos de Faro. Cada uma tem Custo e Recarga.</p>
      <p>Todo detetive tem as Vantagens Gerais e as duas Vantagens dos seus Estilos. Um Estilo Desmoralizado bloqueia a Vantagem dele até o detetive Se Recompor. Vantagens não podem ser usadas durante uma Acareação, a não ser que algo diga o contrário.</p>
      ${t('Vantagens Gerais', '<div data-vant="gerais"></div>')}
      ${t('Vantagens de Estilo', '<div data-vant="estilo"></div>')}` },
    { id: 'culpado', titulo: 'O Culpado', html: `
      <p class="lead">O Culpado é quem levou os ovos. O Mestre o monta e o guarda até o melhor momento de bagunçar a mesa.</p>
      ${t('Perfis', '<p>Todo Culpado tem dois Perfis. O Perfil Principal é o cerne do personagem. Cada Perfil libera Ações Únicas e um Intento Único que rende Pontos de Lorota.</p><div data-perfis></div>')}
      ${t('Pontos de Lorota', '<p>Pontos de Lorota (PL) são a moeda do Culpado para Ações e Golpes Baixos. O valor inicial está na ficha. O Culpado ganha mais com Intentos Malandros, válidos para todos, e com os Intentos Únicos dos seus Perfis, sem limite.</p><div data-intentos></div>')}
      ${t('Ações Gerais', '<p>No turno do Culpado numa Acareação, o Mestre escolhe uma Ação. Ações Gerais são de todo Culpado.</p><div data-acoes="gerais"></div>')}
      ${t('Ações Únicas', '<p>Ações Únicas vêm dos Perfis e mostram o jeito particular do Culpado.</p><div data-acoes="unicas"></div>')}
      ${t('Golpes Baixos', '<p>Golpes Baixos são truques que o Culpado ativa em momentos certos, pagando PL. Um Culpado recém-criado tem um só.</p><div data-golpes></div>')}` },
    { id: 'acareacao', titulo: 'Acareação', html: `
      <p class="lead">Em algum momento, os detetives percebem que o Culpado está agindo bem debaixo do bico deles. Uma Acareação começou.</p>
      <p>O Mestre pode iniciar uma Acareação quando a Pilha do Culpado tiver mais dados que a Pilha de Compostura de qualquer detetive. Pode ser uma perseguição no milharal, um apagão no moinho, um suspeito tentando queimar o diário. Cada detetive tem dois objetivos: completar a própria Pilha de Dedução e atrapalhar o Culpado.</p>
      ${t('Iniciativa', '<p>A iniciativa é fixa e segue a espécie. O Culpado é sempre o último.</p><ol data-iniciativa></ol>')}
      ${t('Ações de Acareação', `<p>Na sua vez, escolha uma ação. Vantagens ficam proibidas aqui, mas habilidades de espécie valem.</p>
        <p><b>Seguir o Rastro (Ligeiro):</b> Cada sucesso vai para a sua Pilha de Dedução. Cada 6 é uma sacada genial: puxe mais um dado da Pilha de Compostura para a Dedução. Se a Compostura estiver vazia, ele vem do Palheiro.</p>
        <p><b>Apertar (Potente):</b> Você enquadra o Culpado. Com ao menos um sucesso, ele descarta um dado da Pilha dele.</p>
        <p><b>Fazer Cena (Complexo Desenrolado):</b> Você faz um escândalo para distrair o Culpado. Se superar, para Tirar do Caso alguém no turno dele o Mestre precisa gastar um dado e 3 PL a mais. Isso acumula.</p>
        <p><b>Dar Cobertura:</b> Role um teste no Estilo que fizer sentido. Os sucessos vão para a Pilha de Compostura de outro detetive. Os dados falhos não são descartados.</p>
        <p><b>Respirar Fundo:</b> Você recebe 1 dado na Pilha de Compostura.</p>
        <p><b>Se Jogar na Frente:</b> Escolha um detetive, você inclusive, que completa a Pilha de Dedução na hora. Para isso, descarte todos os seus dados. Só um detetive por Acareação e uma vez por sessão. Não vale se você for o último detetive na cena.</p>`)}
      ${t('O turno do Culpado', '<p>O Mestre gasta dados e PL em Ações e Golpes Baixos. É aqui que galos nascem e detetives saem do caso. Os jogadores devem fazer de tudo para continuar na investigação, mas ninguém se surpreenda se não der.</p>')}
      ${t('Fim da Acareação', '<ol><li>O Culpado Some no Mato no turno dele.</li><li>A Pilha do Culpado zera.</li><li>Todos os detetives completam a Pilha de Dedução.</li><li>Todos os detetives ainda presentes saem do caso.</li></ol>')}` },
    { id: 'solucao', titulo: 'Pistas e acusação', html: `
      <p class="lead">Regras novas desta adaptação, porque mistério sem solução é só fofoca.</p>
      ${t('A solução', '<p>Antes do primeiro jogo, o Mestre define em segredo três respostas: <b>Quem</b> pegou os ovos, <b>Por quê</b> e <b>Onde</b> eles estão agora.</p>')}
      ${t('Pistas', '<p>Investigar um local ou pressionar um suspeito numa Cena Livre é um teste no Estilo que fizer sentido. Pista comum pede um sucesso, pista bem escondida pede um Teste Complexo. As falhas são sacrificadas para o Culpado, então todo palpite tem preço. O Mestre revela as pistas no Mural do Caso.</p>')}
      ${t('Pista Quente', '<p>O detetive que completa a Pilha de Dedução numa Acareação recebe uma Pista Quente: O Mestre revela uma pista nova ou confirma que um suspeito é inocente.</p>')}
      ${t('Acusação Final', '<p>Quando o grupo quiser, ele anuncia Quem, Por quê e Onde. O Mestre diz quantas respostas estão certas, sem dizer quais.</p><p><b>Quem certo:</b> Começa a Acareação Final. O Culpado tenta fugir com os ovos. Se todos os detetives restantes completarem a Pilha de Dedução, ele é pego e os ovos voltam para o ninho. Se ele Sumir no Mato, escapa e o caso termina sem os herdeiros.</p><p><b>Quem errado:</b> O condado fica de mal com a equipe. O Culpado recebe um dado por detetive e 3 PL, e cada detetive perde 2 PF. O caso continua.</p>')}` },
  ];

  return { ESTILOS, ESPECIES, VANT_GERAIS, VANT_ESTILO, PERFIS, ACOES_GERAIS, ACOES_UNICAS, GOLPES, INTENTOS, PRONTOS, REGRAS };
})();
