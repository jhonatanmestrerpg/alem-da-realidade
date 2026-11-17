/* Perfil do personagem: o dono da ficha deixa o perfil com a cara que quiser
   (cores, fundo, padrão, caixas, nome, retrato, capa e efeitos), com prévia ao vivo na própria ficha.
   O tema fica salvo na ficha (campo "perfil") e todo mundo que abre a ficha vê.
   Mesmo arquivo no site RPGs e no ADR. Cada página só chama:
     PerfilPersonagem.ligar({ rota: 'personagem', col: 'fate-personagens', raiz: '#app > .ficha' }) */
(function () {
  'use strict';
  if (window.PerfilPersonagem) return;

  /* ---------- catálogo ---------- */
  const FONTES = [
    ['', 'A do sistema'], ['Cinzel', 'Cinzel (épica)'], ['Cinzel Decorative', 'Cinzel Decorativa'], ['IM Fell English SC', 'Fell (antiga)'], ['UnifrakturMaguntia', 'Gótica'],
    ['Pirata One', 'Pirata'], ['Uncial Antiqua', 'Celta'], ['Cormorant Garamond', 'Cormorant (elegante)'], ['Playfair Display', 'Playfair'], ['Abril Fatface', 'Abril (cartaz)'],
    ['Creepster', 'Creepster (terror)'], ['Nosifer', 'Nosifer (sangrando)'], ['Metal Mania', 'Metal'], ['Special Elite', 'Máquina de escrever'], ['Rubik Glitch', 'Glitch'],
    ['Orbitron', 'Orbitron (sci-fi)'], ['Audiowide', 'Audiowide'], ['Exo 2', 'Exo 2'], ['Rajdhani', 'Rajdhani'], ['Share Tech Mono', 'Terminal'], ['VT323', 'VT323 (retrô)'], ['Press Start 2P', 'Pixel'],
    ['Bangers', 'Bangers (gibi)'], ['Permanent Marker', 'Marcador'], ['Gochi Hand', 'Letra de criança'], ['Mystery Quest', 'Mistério'], ['Fredoka', 'Fredoka (redonda)'], ['Righteous', 'Righteous'],
    ['Monoton', 'Monoton (neon)'], ['Lobster', 'Lobster'], ['Great Vibes', 'Caligrafia'], ['Satisfy', 'Satisfy'], ['Oswald', 'Oswald'], ['Bebas Neue', 'Bebas'], ['Barlow', 'Barlow'], ['Nunito', 'Nunito'], ['Alegreya Sans', 'Alegreya'], ['Spectral', 'Spectral'],
  ];
  const FORMAS = [['', 'A do sistema'], ['circulo', 'Círculo'], ['arredondado', 'Arredondado'], ['quadrado', 'Quadrado'], ['hexagono', 'Hexágono'], ['losango', 'Losango'], ['escudo', 'Escudo'], ['estrela', 'Estrela'], ['octogono', 'Octógono'], ['gota', 'Gota']];
  const PADROES = [['', 'Nenhum'], ['pontos', 'Pontos'], ['listras', 'Listras'], ['grade', 'Grade'], ['xadrez', 'Xadrez'], ['hex', 'Colmeia'], ['ondas', 'Ondas'], ['ruido', 'Granulado'], ['runas', 'Cruzes'], ['linhas', 'Pautado']];
  const EFEITOS = [['', 'Nenhum'], ['brasas', 'Brasas subindo'], ['vagalumes', 'Vaga-lumes'], ['neve', 'Neve'], ['chuva', 'Chuva'], ['estrelas', 'Estrelas piscando'], ['nevoa', 'Névoa'], ['scan', 'Holograma'], ['pulso', 'Pulso na borda'], ['sangue', 'Gotas de sangue']];
  const NOMES = [['', 'Normal'], ['brilho', 'Brilho'], ['neon', 'Neon'], ['gradiente', 'Gradiente'], ['contorno', 'Contorno'], ['sombra', 'Sombra dura'], ['metal', 'Metal'], ['glitch', 'Glitch'], ['fogo', 'Fogo']];
  const TAMS = [['', 'Do sistema'], ['p', 'Pequeno'], ['g', 'Grande'], ['gg', 'Enorme']];

  // temas prontos: ponto de partida, tudo pode ser mudado depois
  const PRESETS = {
    padrao: { nome: 'Do sistema', p: {} },
    sangue: { nome: 'Sangue', p: { cor: { acento: '#ff2a3b', acento2: '#ff8a5c', texto: '#f6e9e9', suave: '#c9a0a4', painel: '#1c0709', borda: '#5a1016' }, fundo: { tipo: 'gradiente', c1: '#2a0508', c2: '#070102', ang: 160 }, caixa: { opac: 88, brilho: 8 }, nome: { estilo: 'sombra', fonte: 'Creepster' }, efeito: { tipo: 'sangue' } } },
    noite: { nome: 'Noite roxa', p: { cor: { acento: '#b06bff', acento2: '#ff6bd5', texto: '#efe7ff', suave: '#b9a7d9', painel: '#160a26', borda: '#3d2463' }, fundo: { tipo: 'gradiente', c1: '#1e0b36', c2: '#07030f', ang: 180 }, caixa: { opac: 82, brilho: 10, vidro: true }, nome: { estilo: 'gradiente' }, efeito: { tipo: 'estrelas' } } },
    floresta: { nome: 'Floresta', p: { cor: { acento: '#6fdc84', acento2: '#e6d36b', texto: '#e8f3e6', suave: '#a8c4a6', painel: '#0b1a0f', borda: '#25502e' }, fundo: { tipo: 'gradiente', c1: '#0f2a15', c2: '#030a05', ang: 170, padrao: 'ondas', forca: 18 }, caixa: { opac: 86, raio: 14 }, nome: { fonte: 'Uncial Antiqua', estilo: 'brilho' }, efeito: { tipo: 'vagalumes' } } },
    oceano: { nome: 'Abismo', p: { cor: { acento: '#3fd0ff', acento2: '#7affd6', texto: '#e3f4fb', suave: '#9cc3d4', painel: '#05192a', borda: '#174a6a' }, fundo: { tipo: 'gradiente', c1: '#062a44', c2: '#01060c', ang: 180, padrao: 'ondas', forca: 22 }, caixa: { opac: 78, vidro: true, raio: 16 }, nome: { estilo: 'brilho' }, efeito: { tipo: 'nevoa' } } },
    ouro: { nome: 'Ouro velho', p: { cor: { acento: '#e9b949', acento2: '#fff1b8', texto: '#f6ecd6', suave: '#cdb98c', painel: '#1b1306', borda: '#5e4718' }, fundo: { tipo: 'gradiente', c1: '#2a1d07', c2: '#0a0602', ang: 150, padrao: 'runas', forca: 12 }, caixa: { opac: 90, borda: 2 }, nome: { fonte: 'Cinzel Decorative', estilo: 'metal', maiusc: true }, retrato: { forma: 'escudo', moldura: '#e9b949', esp: 3, brilho: 12 } } },
    inferno: { nome: 'Inferno', p: { cor: { acento: '#ff7a1a', acento2: '#ffd23f', texto: '#fff0e0', suave: '#d8a888', painel: '#1e0a03', borda: '#6a2408' }, fundo: { tipo: 'gradiente', c1: '#3a0e02', c2: '#0b0300', ang: 0 }, caixa: { opac: 86, brilho: 14 }, nome: { fonte: 'Metal Mania', estilo: 'fogo' }, efeito: { tipo: 'brasas', forca: 3 } } },
    gelo: { nome: 'Gelo', p: { cor: { acento: '#8fe3ff', acento2: '#ffffff', texto: '#eef9ff', suave: '#a9c7d6', painel: '#0b1a26', borda: '#2f5a74' }, fundo: { tipo: 'gradiente', c1: '#16354a', c2: '#050b12', ang: 200, padrao: 'hex', forca: 14 }, caixa: { opac: 72, vidro: true, raio: 10 }, nome: { estilo: 'brilho', fonte: 'Cinzel' }, retrato: { forma: 'hexagono', moldura: '#8fe3ff', esp: 2, brilho: 16 }, efeito: { tipo: 'neve' } } },
    neon: { nome: 'Neon', p: { cor: { acento: '#39ff9c', acento2: '#ff2bd6', texto: '#ecfff6', suave: '#9fd8bf', painel: '#05110b', borda: '#14593a' }, fundo: { tipo: 'cor', c1: '#020805', padrao: 'grade', forca: 26 }, caixa: { opac: 84, brilho: 18, raio: 4 }, nome: { fonte: 'Monoton', estilo: 'neon' }, efeito: { tipo: 'pulso' } } },
    holo: { nome: 'Holograma', p: { cor: { acento: '#5fd3ff', acento2: '#c8f1ff', texto: '#e2f4ff', suave: '#8fb6cc', painel: '#06142a', borda: '#1f4f78' }, fundo: { tipo: 'gradiente', c1: '#0a1f3d', c2: '#01040b', ang: 180, padrao: 'linhas', forca: 20 }, caixa: { opac: 70, vidro: true, brilho: 12, raio: 6 }, nome: { fonte: 'Orbitron', estilo: 'glitch', maiusc: true, esp: 4 }, retrato: { forma: 'octogono', moldura: '#5fd3ff', esp: 2, brilho: 20 }, efeito: { tipo: 'scan' } } },
    chiclete: { nome: 'Chiclete', p: { cor: { acento: '#ff5fb2', acento2: '#7ad7ff', texto: '#fff0f8', suave: '#e3b3cf', painel: '#2a0a1c', borda: '#7a2a5a' }, fundo: { tipo: 'gradiente', c1: '#3a0c2a', c2: '#12061f', ang: 135, padrao: 'pontos', forca: 22 }, caixa: { opac: 84, raio: 22 }, nome: { fonte: 'Fredoka', estilo: 'sombra' }, retrato: { forma: 'circulo', moldura: '#ff5fb2', esp: 4 } } },
    sakura: { nome: 'Sakura', p: { cor: { acento: '#ff9ec7', acento2: '#ffd6e8', texto: '#fff4f8', suave: '#e2bccb', painel: '#24101a', borda: '#6a3550' }, fundo: { tipo: 'gradiente', c1: '#3a1626', c2: '#0e0509', ang: 190 }, caixa: { opac: 80, raio: 18, vidro: true }, nome: { fonte: 'Great Vibes', estilo: 'brilho', tam: 'g' }, efeito: { tipo: 'neve' } } },
    vampiro: { nome: 'Vampiro', p: { cor: { acento: '#c4142c', acento2: '#e8d6b0', texto: '#f3e6e6', suave: '#b89a9e', painel: '#120508', borda: '#4a0f19' }, fundo: { tipo: 'gradiente', c1: '#1f0409', c2: '#030001', ang: 180, padrao: 'xadrez', forca: 8 }, caixa: { opac: 92, borda: 1, raio: 2 }, nome: { fonte: 'UnifrakturMaguntia', estilo: 'brilho', tam: 'g' }, retrato: { forma: 'gota', moldura: '#c4142c', esp: 2, brilho: 18 }, efeito: { tipo: 'nevoa' } } },
    cinzas: { nome: 'Cinzas', p: { cor: { acento: '#d8d8d8', acento2: '#8a8a8a', texto: '#eeeeee', suave: '#a8a8a8', painel: '#141414', borda: '#3a3a3a' }, fundo: { tipo: 'gradiente', c1: '#262626', c2: '#050505', ang: 180, padrao: 'ruido', forca: 40 }, caixa: { opac: 88, raio: 0 }, nome: { fonte: 'Special Elite', estilo: 'contorno', maiusc: true }, efeito: { tipo: 'chuva' } } },
    pergaminho: { nome: 'Pergaminho (claro)', p: { cor: { acento: '#8a3b12', acento2: '#3a5a8a', texto: '#2b1d10', suave: '#5e4a33', painel: '#f3e6c4', borda: '#b8955a' }, fundo: { tipo: 'gradiente', c1: '#e9d6a8', c2: '#c9ad74', ang: 160, padrao: 'ruido', forca: 30 }, caixa: { opac: 92, raio: 6, borda: 1 }, nome: { fonte: 'IM Fell English SC' } } },
  };

  /* ---------- utilidades ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o || {}));
  const pegar = (o, k) => k.split('.').reduce((a, x) => a?.[x], o);
  const pôr = (o, k, v) => { const ps = k.split('.'); let a = o; ps.slice(0, -1).forEach(x => { if (!a[x] || typeof a[x] !== 'object') a[x] = {}; a = a[x]; }); if (v === '' || v == null) delete a[ps.at(-1)]; else a[ps.at(-1)] = v; };
  const limpo = o => { if (!o || typeof o !== 'object') return o; Object.keys(o).forEach(k => { const v = limpo(o[k]); if (v == null || v === '' || (typeof v === 'object' && !Object.keys(v).length)) delete o[k]; else o[k] = v; }); return o; };
  const hex = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : null;
  const mix = (c, pct, com = 'transparent') => `color-mix(in srgb, ${c} ${pct}%, ${com})`;
  const url = u => { u = String(u || '').trim(); return /^(https?:|\/|\.\.?\/)/i.test(u) ? u.replace(/[\n\r]/g, '').replace(/["\\]/g, '\\$&') : ''; };
  const fonteCSS = f => f ? `'${f.replace(/'/g, '')}', var(--pf-fonte-reserva, serif)` : '';
  const carregadas = new Set();
  function carregarFonte(f) {
    if (!f || carregadas.has(f) || !FONTES.some(([n]) => n === f)) return; carregadas.add(f);
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@400;700&display=swap'; document.head.appendChild(l);
  }
  const meuId = () => { try { return typeof ME !== 'undefined' ? ME : window.ME; } catch (e) { return window.ME; } };
  const banco = () => { try { return typeof db !== 'undefined' ? db : window.db; } catch (e) { return window.db; } };
  const avisar = m => { try { (typeof toast === 'function' ? toast : window.toast)?.(m); } catch (e) {} };

  // nomes de variável de cada site que o tema sobrescreve (só dentro da ficha)
  const VARS = {
    acento: ['--ambar', '--p-caneta', '--p-ouro', '--holo', '--ouro', '--acento-f', '--chama'],
    acentoHi: ['--ambar-hi', '--holo-hi'],
    acento2: ['--fita'],
    texto: ['--texto', '--p-tinta', '--lua', '--branco'],
    suave: ['--texto-dim', '--p-sub', '--lua-dim'],
    fraco: ['--texto-faint', '--lua-faint'],
    painel: ['--tabua', '--p-fundo', '--painel', '--painel-2', '--casco'],
    painel2: ['--tabua-2', '--p-fundo-2', '--painel-3', '--casco-2'],
    campo: ['--p-campo'],
    borda: ['--p-borda', '--linha-2'],
    bordaFraca: ['--linha'],
    titulo: ['--f-disp', '--f-terror'],
    corpo: ['--f-body'],
  };

  /* ---------- aplicar na ficha ---------- */
  function varsDe(P, cfg) {
    const v = {}, c = P.cor || {}, cx = P.caixa || {}, extra = cfg.vars || {};
    const lista = k => [...(VARS[k] || []), ...(extra[k] || [])];
    const set = (k, val) => lista(k).forEach(n => { v[n] = val; });
    if (hex(c.acento)) { set('acento', c.acento); set('acentoHi', mix(c.acento, 62, '#fff')); v['--pf-a'] = c.acento; }
    if (hex(c.acento2)) { set('acento2', c.acento2); v['--pf-a2'] = c.acento2; }
    if (hex(c.texto)) { set('texto', c.texto); set('fraco', mix(c.texto, 48)); v['--pf-tx'] = c.texto; }
    if (hex(c.suave)) { set('suave', c.suave); }
    const op = cx.opac != null ? Math.max(0, Math.min(100, +cx.opac)) : null;
    if (hex(c.painel)) { const p = op != null ? mix(c.painel, op) : c.painel; set('painel', p); set('painel2', op != null ? mix(mix(c.painel, 88, c.texto || '#fff'), op) : mix(c.painel, 88, c.texto || '#fff')); set('campo', mix(c.painel, 55, '#000')); v['--pf-pn'] = p; }
    else if (op != null) v['--pf-pn-op'] = op / 100;
    if (hex(c.borda)) { set('borda', c.borda); set('bordaFraca', mix(c.borda, 60)); v['--pf-bd'] = c.borda; }
    const n = P.nome || {}, t = P.texto || {};
    if (t.titulo) set('titulo', fonteCSS(t.titulo));
    if (t.corpo) set('corpo', fonteCSS(t.corpo));
    if (n.fonte) v['--pf-nome-f'] = fonteCSS(n.fonte);
    if (hex(n.cor)) v['--pf-nome-c'] = n.cor;
    if (n.esp != null && +n.esp) v['--pf-nome-esp'] = (+n.esp / 100) + 'em';
    if (cx.raio != null && cx.raio !== '') v['--pf-raio'] = (+cx.raio) + 'px';
    if (cx.borda != null && cx.borda !== '') v['--pf-bw'] = (+cx.borda) + 'px';
    if (+cx.brilho) v['--pf-glow'] = `0 0 ${+cx.brilho}px ${mix(c.acento || 'currentColor', 45)}`;
    const f = P.fundo || {};
    if (f.tipo === 'cor' && hex(f.c1)) v['--pf-bg'] = f.c1;
    if (f.tipo === 'gradiente' && hex(f.c1)) v['--pf-bg'] = `linear-gradient(${+f.ang || 0}deg, ${f.c1}, ${hex(f.c2) || '#000'})`;
    if (f.tipo === 'radial' && hex(f.c1)) v['--pf-bg'] = `radial-gradient(ellipse at 50% 0%, ${f.c1}, ${hex(f.c2) || '#000'} 75%)`;
    if (f.tipo === 'imagem' && url(f.img)) { v['--pf-bg'] = hex(f.c1) || '#000'; v['--pf-img'] = `url("${url(f.img)}")`; v['--pf-img-pos'] = `50% ${f.pos ?? 50}%`; v['--pf-img-esc'] = ((+f.escuro || 0) / 100); v['--pf-img-blur'] = (+f.desfoque || 0) + 'px'; }
    if (f.padrao) v['--pf-pd-c'] = mix(c.acento || '#ffffff', Math.max(4, Math.min(80, +f.forca || 18)));
    const r = P.retrato || {};
    if (hex(r.moldura)) v['--pf-rt-c'] = r.moldura;
    if (r.esp != null) v['--pf-rt-w'] = (+r.esp) + 'px';
    if (+r.brilho) v['--pf-rt-glow'] = (+r.brilho) + 'px';
    const cp = P.capa || {};
    if (url(cp.img)) { v['--pf-capa'] = `url("${url(cp.img)}")`; v['--pf-capa-h'] = (+cp.alt || 170) + 'px'; v['--pf-capa-pos'] = `50% ${cp.pos ?? 50}%`; }
    const e = P.efeito || {};
    if (e.tipo) { v['--pf-fx'] = hex(e.cor) || c.acento2 || c.acento || '#ffffff'; v['--pf-fx-o'] = [0, .35, .6, .9][+e.forca || 2] || .6; }
    return v;
  }

  function aplicar(root, P, cfg = {}) {
    if (!root) return;
    P = P || {};
    const ativo = !!limpo(clone(P)) && Object.keys(limpo(clone(P))).length > 0;
    // tira o que tinha antes
    (root._pfVars || []).forEach(n => root.style.removeProperty(n)); root._pfVars = [];
    root.querySelectorAll(':scope > .pf-cam, :scope > .pf-capa').forEach(x => x.remove());
    root.querySelectorAll('.pf-nome, .pf-ret, .pf-ret-w').forEach(x => x.classList.remove('pf-nome', 'pf-ret', 'pf-ret-w'));
    ['pf-on', 'pf-fundo', 'pf-vidro', 'pf-capa-on'].forEach(c => root.classList.remove(c));
    Object.keys(root.dataset).filter(k => k.startsWith('pf')).forEach(k => delete root.dataset[k]);
    if (!ativo) return;
    root.classList.add('pf-on');
    const v = varsDe(P, cfg);
    Object.entries(v).forEach(([k, val]) => { root.style.setProperty(k, val); root._pfVars.push(k); });
    [P.nome?.fonte, P.texto?.titulo, P.texto?.corpo].forEach(carregarFonte);
    const f = P.fundo || {}, e = P.efeito || {}, cx = P.caixa || {};
    if (v['--pf-bg'] || f.padrao || e.tipo) root.classList.add('pf-fundo');
    if (cx.vidro) root.classList.add('pf-vidro');
    if (f.padrao) root.dataset.pfPadrao = f.padrao;
    if (e.tipo) root.dataset.pfFx = e.tipo;
    if (P.nome?.estilo) root.dataset.pfNome = P.nome.estilo;
    if (P.nome?.tam) root.dataset.pfNomeTam = P.nome.tam;
    if (P.nome?.maiusc) root.dataset.pfMaiusc = '1';
    if (P.retrato?.forma) root.dataset.pfForma = P.retrato.forma;
    // camadas de fundo (imagem, padrão, efeito) atrás de tudo
    if (root.classList.contains('pf-fundo')) root.insertAdjacentHTML('afterbegin', `<div class="pf-cam" aria-hidden="true">${v['--pf-img'] ? '<i class="pf-img"></i>' : ''}${f.padrao ? '<i class="pf-pd"></i>' : ''}${e.tipo ? '<i class="pf-fx1"></i><i class="pf-fx2"></i>' : ''}</div>`);
    if (v['--pf-capa']) { root.classList.add('pf-capa-on'); root.insertAdjacentHTML('afterbegin', '<div class="pf-capa" aria-hidden="true"></div>'); }
    const nome = root.querySelector(cfg.nome || 'h1, .ficha-topo h2, .este h2, .cracha h2, h2');
    if (nome) { nome.classList.add('pf-nome'); nome.dataset.pfTxt = nome.textContent.trim(); }
    const ret = root.querySelector(cfg.retrato || '.retrato, .ava.g, .polaroid .ft, .ava, .foto');
    if (ret) { ret.classList.add('pf-ret'); ret.parentElement?.classList.add('pf-ret-w'); }
  }

  /* ---------- painel de edição ---------- */
  const EST = { cfg: null, id: null, dados: null, un: null, rasc: null, aberto: false, aba: 'temas' };
  const lerP = () => EST.rasc || EST.dados?.perfil || {};

  const campoCor = (k, rot, dica = '') => `<div class="pf-c pf-cor"><label for="pf-${k.replace('.', '-')}">${rot}</label><span><input type="color" id="pf-${k.replace('.', '-')}" data-k="${k}"><button type="button" class="pf-x" data-zera="${k}" title="Voltar ao do sistema" aria-label="${rot}: voltar ao do sistema">↺</button></span>${dica ? `<small>${dica}</small>` : ''}</div>`;
  const campoFaixa = (k, rot, min, max, passo = 1, uni = '') => `<div class="pf-c pf-faixa"><label for="pf-${k.replace('.', '-')}">${rot} <b data-vk="${k}"></b><button type="button" class="pf-x mini" data-zera="${k}" title="Voltar ao do sistema" aria-label="${rot}: voltar ao do sistema">↺</button></label><input type="range" id="pf-${k.replace('.', '-')}" data-k="${k}" data-uni="${uni}" min="${min}" max="${max}" step="${passo}"></div>`;
  const campoSel = (k, rot, ops, fonte = false) => `<div class="pf-c"><label for="pf-${k.replace('.', '-')}">${rot}</label><select id="pf-${k.replace('.', '-')}" data-k="${k}">${ops.map(([v, t]) => `<option value="${esc(v)}" ${fonte && v ? `style="font-family:'${esc(v)}'"` : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  const campoChk = (k, rot) => `<label class="pf-chk"><input type="checkbox" data-k="${k}"> ${rot}</label>`;
  const campoImg = (k, rot, dica) => `<div class="pf-c"><label for="pf-${k.replace('.', '-')}">${rot}</label><input type="text" inputmode="url" id="pf-${k.replace('.', '-')}" data-k="${k}" placeholder="Link da imagem (https://…)"><span class="pf-l"><label class="pf-bt sec"><input type="file" accept="image/*" data-up="${k}" hidden> Enviar imagem</label><button type="button" class="pf-bt sec" data-zera="${k}">Tirar</button></span>${dica ? `<small>${dica}</small>` : ''}</div>`;

  const ABAS = [
    ['temas', 'Temas'], ['cores', 'Cores'], ['fundo', 'Fundo'], ['caixas', 'Caixas'], ['nome', 'Nome e letras'], ['retrato', 'Retrato'], ['capa', 'Capa'], ['efeitos', 'Efeitos'],
  ];
  const corpoAba = {
    temas: () => `<p class="pf-dica">Escolha um ponto de partida. Depois ajuste qualquer detalhe nas outras abas.</p>
      <div class="pf-temas">${Object.entries(PRESETS).map(([k, t]) => { const c = t.p.cor || {}, f = t.p.fundo || {}; return `<button type="button" class="pf-tema" data-preset="${k}" style="--a:${c.acento || '#888'};--a2:${c.acento2 || c.acento || '#888'};--f:${f.c1 || '#222'};--f2:${f.c2 || f.c1 || '#111'};--t:${c.texto || '#eee'}"><i></i><span>${esc(t.nome)}</span></button>`; }).join('')}</div>`,
    cores: () => `<div class="pf-grade">${campoCor('cor.acento', 'Destaque', 'Títulos, botões e detalhes')}${campoCor('cor.acento2', 'Segundo destaque', 'Gradientes, efeitos e brilhos')}${campoCor('cor.texto', 'Texto')}${campoCor('cor.suave', 'Texto suave')}${campoCor('cor.painel', 'Caixas')}${campoCor('cor.borda', 'Bordas')}</div>`,
    fundo: () => `${campoSel('fundo.tipo', 'Tipo de fundo', [['', 'O do sistema'], ['cor', 'Cor lisa'], ['gradiente', 'Degradê'], ['radial', 'Degradê de holofote'], ['imagem', 'Imagem']])}
      <div class="pf-grade">${campoCor('fundo.c1', 'Cor 1')}${campoCor('fundo.c2', 'Cor 2')}</div>${campoFaixa('fundo.ang', 'Ângulo do degradê', 0, 360, 5, '°')}
      <div class="pf-sub" data-so="fundo.tipo=imagem">${campoImg('fundo.img', 'Imagem de fundo', 'Fica atrás da ficha inteira. A cor 1 aparece enquanto ela carrega.')}${campoFaixa('fundo.escuro', 'Escurecer', 0, 90, 5, '%')}${campoFaixa('fundo.desfoque', 'Desfoque', 0, 16, 1, 'px')}${campoFaixa('fundo.pos', 'Posição vertical', 0, 100, 5, '%')}</div>
      ${campoSel('fundo.padrao', 'Padrão por cima', PADROES)}${campoFaixa('fundo.forca', 'Força do padrão', 4, 80, 2, '%')}`,
    caixas: () => `${campoFaixa('caixa.opac', 'Opacidade das caixas', 0, 100, 5, '%')}${campoFaixa('caixa.raio', 'Arredondamento', 0, 32, 1, 'px')}${campoFaixa('caixa.borda', 'Espessura da borda', 0, 4, 1, 'px')}${campoFaixa('caixa.brilho', 'Brilho em volta', 0, 40, 2, 'px')}
      ${campoChk('caixa.vidro', 'Efeito de vidro fosco (desfoca o fundo atrás das caixas)')}`,
    nome: () => `${campoSel('nome.fonte', 'Fonte do nome', FONTES, true)}${campoSel('nome.estilo', 'Efeito do nome', NOMES)}${campoSel('nome.tam', 'Tamanho do nome', TAMS)}
      <div class="pf-grade">${campoCor('nome.cor', 'Cor do nome')}</div>${campoFaixa('nome.esp', 'Espaço entre letras', 0, 30, 1, '')}${campoChk('nome.maiusc', 'Nome em MAIÚSCULAS')}
      <hr>${campoSel('texto.titulo', 'Fonte dos títulos da ficha', FONTES, true)}${campoSel('texto.corpo', 'Fonte do texto', FONTES, true)}`,
    retrato: () => `${campoSel('retrato.forma', 'Formato', FORMAS)}<div class="pf-grade">${campoCor('retrato.moldura', 'Moldura')}</div>${campoFaixa('retrato.esp', 'Espessura da moldura', 0, 10, 1, 'px')}${campoFaixa('retrato.brilho', 'Brilho do retrato', 0, 40, 2, 'px')}`,
    capa: () => `${campoImg('capa.img', 'Imagem de capa', 'Uma faixa larga no topo do perfil, como capa de rede social.')}${campoFaixa('capa.alt', 'Altura da capa', 80, 320, 10, 'px')}${campoFaixa('capa.pos', 'Parte da imagem que aparece', 0, 100, 5, '%')}`,
    efeitos: () => `${campoSel('efeito.tipo', 'Efeito animado', EFEITOS)}${campoFaixa('efeito.forca', 'Intensidade', 1, 3, 1, '')}<div class="pf-grade">${campoCor('efeito.cor', 'Cor do efeito')}</div><p class="pf-dica">Quem pede menos movimento no aparelho vê o efeito parado.</p>`,
  };
  const PADRAO_FAIXA = { 'fundo.ang': 160, 'fundo.escuro': 40, 'fundo.desfoque': 0, 'fundo.pos': 50, 'fundo.forca': 18, 'caixa.opac': 100, 'caixa.raio': 8, 'caixa.borda': 1, 'caixa.brilho': 0, 'nome.esp': 0, 'retrato.esp': 3, 'retrato.brilho': 0, 'capa.alt': 170, 'capa.pos': 50, 'efeito.forca': 2 };

  function preencher(pn) {
    const P = lerP(), root = raiz(), cs = root ? getComputedStyle(root) : null;
    const corSistema = k => { const n = { 'cor.acento': VARS.acento, 'cor.acento2': VARS.acento2, 'cor.texto': VARS.texto, 'cor.suave': VARS.suave, 'cor.painel': VARS.painel, 'cor.borda': VARS.borda }[k] || []; for (const x of n) { const s = cs?.getPropertyValue(x).trim(); if (/^#[0-9a-f]{6}$/i.test(s)) return s; } return '#888888'; };
    pn.querySelectorAll('[data-k]').forEach(i => {
      const k = i.dataset.k, v = pegar(P, k);
      if (i.type === 'checkbox') i.checked = !!v;
      else if (i.type === 'color') { i.value = hex(v) || (k === 'nome.cor' ? (hex(pegar(P, 'cor.acento')) || corSistema('cor.acento')) : k.startsWith('fundo.') ? '#111111' : k === 'retrato.moldura' || k === 'efeito.cor' ? (hex(pegar(P, 'cor.acento')) || '#ffffff') : corSistema(k)); i.closest('.pf-cor')?.classList.toggle('vazio', !hex(v)); }
      else if (i.type === 'range') { i.value = v ?? PADRAO_FAIXA[k] ?? i.min; const b = pn.querySelector(`[data-vk="${k}"]`); if (b) b.textContent = v == null ? '(sistema)' : i.value + (i.dataset.uni || ''); }
      else i.value = v ?? '';
    });
    pn.querySelectorAll('[data-so]').forEach(el => { const [k, val] = el.dataset.so.split('='); el.hidden = pegar(P, k) !== val; });
    pn.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('aqui', (P._preset || 'padrao') === b.dataset.preset));
  }

  function raiz() { return EST.cfg ? document.querySelector(EST.cfg.raiz) : null; }
  function previa() { const r = raiz(); if (r) { aplicar(r, lerP(), EST.cfg); r._pfSig = 'rasc'; } }

  function abrirPainel() {
    if (EST.aberto) return; EST.aberto = true; EST.rasc = clone(EST.dados?.perfil || {});
    const pn = document.createElement('aside'); pn.className = 'pf-painel'; pn.setAttribute('role', 'dialog'); pn.setAttribute('aria-label', 'Perfil do personagem');
    pn.innerHTML = `<header><b>Perfil do personagem</b><button type="button" class="pf-fechar" aria-label="Fechar sem salvar">×</button></header>
      <nav class="pf-abas" role="tablist">${ABAS.map(([k, t]) => `<button type="button" role="tab" data-aba="${k}" aria-selected="${EST.aba === k}">${t}</button>`).join('')}</nav>
      <div class="pf-corpo"></div>
      <footer><button type="button" class="pf-bt sec" data-acao="zerar" title="Tira todo o tema e volta ao visual do sistema">Restaurar</button><button type="button" class="pf-bt sec" data-acao="copiar" title="Copia o tema para colar em outra ficha">Copiar tema</button><button type="button" class="pf-bt sec" data-acao="colar">Colar tema</button><span></span><button type="button" class="pf-bt sec" data-acao="cancelar">Cancelar</button><button type="button" class="pf-bt" data-acao="salvar">Salvar</button></footer>`;
    document.body.appendChild(pn); document.documentElement.classList.add('pf-editando');
    const corpo = pn.querySelector('.pf-corpo');
    const mostrar = aba => { EST.aba = aba; pn.querySelectorAll('[data-aba]').forEach(b => b.setAttribute('aria-selected', b.dataset.aba === aba)); corpo.innerHTML = corpoAba[aba](); preencher(pn); corpo.scrollTop = 0; };
    pn.querySelector('.pf-abas').onclick = e => { const b = e.target.closest('[data-aba]'); if (b) mostrar(b.dataset.aba); };
    const mudou = (k, val) => { pôr(EST.rasc, k, val); delete EST.rasc._preset; limpo(EST.rasc); previa(); preencher(pn); };
    corpo.addEventListener('input', e => {
      const i = e.target.closest('[data-k]'); if (!i) return;
      const k = i.dataset.k; let v = i.type === 'checkbox' ? (i.checked || null) : i.type === 'range' ? +i.value : i.value;
      if (k.endsWith('.fonte') || k.startsWith('texto.')) carregarFonte(v);
      mudou(k, v);
    });
    corpo.addEventListener('click', async e => {
      const pr = e.target.closest('[data-preset]');
      if (pr) { const t = PRESETS[pr.dataset.preset]; const capa = EST.rasc.capa, img = EST.rasc.fundo?.tipo === 'imagem' ? EST.rasc.fundo : null; EST.rasc = clone(t.p); if (capa) EST.rasc.capa = capa; if (img) EST.rasc.fundo = { ...EST.rasc.fundo, ...img }; EST.rasc._preset = pr.dataset.preset; [t.p.nome?.fonte].forEach(carregarFonte); previa(); preencher(pn); return; }
      const z = e.target.closest('[data-zera]'); if (z) { mudou(z.dataset.zera, null); return; }
    });
    corpo.addEventListener('change', async e => {
      const up = e.target.closest('[data-up]'); if (!up || !up.files[0]) return;
      const enviar = typeof enviarImagem === 'function' ? enviarImagem : window.enviarImagem;
      if (!enviar) { avisar('Este site não envia imagens daqui. Cole o link da imagem.'); return; }
      const rot = up.closest('label'); rot.classList.add('enviando');
      try { const u = await enviar(up.files[0], 2400); if (u) mudou(up.dataset.up, u); } catch (x) { avisar('Não deu para enviar a imagem.'); }
      rot.classList.remove('enviando'); up.value = '';
    });
    const fechar = (salvo) => { pn.remove(); document.documentElement.classList.remove('pf-editando'); EST.aberto = false; EST.rasc = null; const r = raiz(); if (r) { r._pfSig = null; checar(); } if (!salvo) avisar('Perfil sem mudanças.'); document.removeEventListener('keydown', tecla); };
    const tecla = e => { if (e.key === 'Escape') fechar(false); };
    document.addEventListener('keydown', tecla);
    pn.querySelector('.pf-fechar').onclick = () => fechar(false);
    pn.querySelector('footer').onclick = async e => {
      const a = e.target.closest('[data-acao]')?.dataset.acao; if (!a) return;
      if (a === 'cancelar') return fechar(false);
      if (a === 'zerar') { EST.rasc = {}; previa(); preencher(pn); return; }
      if (a === 'copiar') { const t = JSON.stringify({ perfilPersonagem: 1, ...limpo(clone(EST.rasc)) }); try { await navigator.clipboard.writeText(t); avisar('Tema copiado. Abra outra ficha e toque em Colar tema.'); } catch (x) { prompt('Copie o tema:', t); } return; }
      if (a === 'colar') { let t = ''; try { t = await navigator.clipboard.readText(); } catch (x) { t = prompt('Cole aqui o tema copiado:') || ''; } try { const o = JSON.parse(t); if (!o.perfilPersonagem) throw 0; delete o.perfilPersonagem; EST.rasc = o; previa(); preencher(pn); avisar('Tema colado. Salve para guardar.'); } catch (x) { avisar('Isso não é um tema copiado do Perfil do personagem.'); } return; }
      if (a === 'salvar') {
        const b = e.target.closest('button'); b.disabled = true; b.textContent = 'Salvando…';
        const perfil = limpo(clone(EST.rasc)); perfil._v = 1; perfil._t = Date.now();
        try { await banco().doc(`${EST.cfg.col}/${EST.id}`).update({ perfil }); EST.dados = { ...(EST.dados || {}), perfil }; avisar('Perfil salvo. Todo mundo que abrir a ficha vê assim.'); fechar(true); }
        catch (x) { avisar('Não salvou: ' + (x.message || x)); b.disabled = false; b.textContent = 'Salvar'; }
      }
    };
    mostrar(EST.aba);
  }

  /* ---------- ligar na página ---------- */
  const CFGS = [];
  function rotaAtual() {
    const h = decodeURIComponent(location.hash.slice(1)).split(/[?#/]/)[0];
    for (const c of CFGS) if (h.startsWith(c.rota + '-')) return { cfg: c, id: h.slice(c.rota.length + 1) };
    return null;
  }
  function podeEditar(d) { const me = meuId(); if (!me || !d) return false; if (EST.cfg.pode) { try { return !!EST.cfg.pode(d, me); } catch (e) { return false; } } return d.dono === me || (Array.isArray(d.donos) && d.donos.includes(me)); }

  function checar() {
    const r = rotaAtual();
    if (!r) { if (EST.un) { try { EST.un(); } catch (e) {} EST.un = null; } EST.id = null; EST.dados = null; return; }
    if (r.id !== EST.id || r.cfg !== EST.cfg) {
      if (EST.un) { try { EST.un(); } catch (e) {} EST.un = null; }
      EST.cfg = r.cfg; EST.id = r.id; EST.dados = null;
      const B = banco(); if (!B?.doc) { EST.id = null; EST.cfg = null; return; } // banco ainda não ficou pronto: tenta na próxima mudança da tela
      try { EST.un = B.doc(`${r.cfg.col}/${r.id}`).onSnapshot(s => { if (EST.id !== r.id) return; EST.dados = s.exists ? (s.data() || {}) : null; const root = raiz(); if (root && !EST.aberto) root._pfSig = null; agendar(); }, () => {}); } catch (e) {}
      return;
    }
    const root = raiz(); if (!root || !EST.dados) return;
    // a página pode trocar o perfil por um estado (ex.: Ashura aberto no ADR) sem mexer no perfil salvo
    const P = EST.aberto ? lerP() : ((EST.cfg.perfilEf ? EST.cfg.perfilEf(EST.dados) : null) || EST.dados.perfil || {});
    const sig = EST.aberto ? 'rasc' : JSON.stringify(P);
    const perdeu = root.classList.contains('pf-on') && ((root.classList.contains('pf-fundo') && !root.querySelector(':scope > .pf-cam')) || (root.classList.contains('pf-capa-on') && !root.querySelector(':scope > .pf-capa')) || (!root.querySelector('.pf-nome') && root.querySelector('h1, h2')));
    if (root._pfSig !== sig || perdeu) { aplicar(root, P, EST.cfg); root._pfSig = sig; }
    if (podeEditar(EST.dados) && !root.querySelector(':scope > .pf-barra')) {
      root.insertAdjacentHTML('afterbegin', `<div class="pf-barra"><button type="button" class="pf-abrir" title="Cores, fundo, fontes, retrato, capa e efeitos do perfil"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.3"/><circle cx="10.5" cy="7.3" r="1.3"/><circle cx="15" cy="7.6" r="1.3"/></svg> Perfil do personagem</button></div>`);
      root.querySelector(':scope > .pf-barra .pf-abrir').onclick = abrirPainel;
    }
  }
  let agendado = 0;
  const agendar = () => { if (agendado) return; agendado = requestAnimationFrame(() => { agendado = 0; try { checar(); } catch (e) { console.warn('perfil', e); } }); };

  function ligar(cfg) {
    CFGS.push({ raiz: '#app > .ficha', ...cfg });
    if (CFGS.length > 1) return;
    injetarCSS();
    window.addEventListener('hashchange', () => { if (EST.aberto) { document.querySelector('.pf-painel')?.remove(); document.documentElement.classList.remove('pf-editando'); EST.aberto = false; EST.rasc = null; } agendar(); });
    const vigiar = () => { new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true }); agendar(); };
    if (document.body) vigiar(); else document.addEventListener('DOMContentLoaded', vigiar, { once: true });
  }

  /* ---------- visual ---------- */
  function injetarCSS() {
    if (document.getElementById('pf-css')) return;
    const s = document.createElement('style'); s.id = 'pf-css';
    const svg = d => `url("data:image/svg+xml,${encodeURIComponent(d)}")`;
    const RUIDO = svg(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`);
    const HEX = svg(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='48'><path d='M14 0 28 8v16L14 32 0 24V8zM14 32v16' fill='none' stroke='#fff' stroke-width='1.2'/></svg>`);
    const RUNA = svg(`<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><path d='M18 10v16M10 18h16' stroke='#fff' stroke-width='1.3'/></svg>`);
    const ONDA = svg(`<svg xmlns='http://www.w3.org/2000/svg' width='60' height='24'><path d='M0 12q15-12 30 0t30 0' fill='none' stroke='#fff' stroke-width='1.3'/></svg>`);
    s.textContent = `
.pf-on { position: relative; isolation: isolate; }
.pf-on.pf-fundo, .pf-on.pf-capa-on { padding: 14px; border-radius: var(--pf-raio-f, 16px); }
.pf-on.pf-fundo { background: var(--pf-bg, transparent); }
.pf-cam { position: absolute; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; border-radius: inherit; }
.pf-cam > i { position: absolute; inset: 0; display: block; }
.pf-img { background: var(--pf-img) var(--pf-img-pos, center) / cover no-repeat; filter: blur(var(--pf-img-blur, 0)); transform: scale(1.04); }
.pf-img::after { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,var(--pf-img-esc, .4)); }
.pf-pd { background-color: var(--pf-pd-c); -webkit-mask-repeat: repeat; mask-repeat: repeat; }
[data-pf-padrao="pontos"] .pf-pd { -webkit-mask-image: radial-gradient(circle, #000 1.3px, transparent 1.8px); mask-image: radial-gradient(circle, #000 1.3px, transparent 1.8px); -webkit-mask-size: 16px 16px; mask-size: 16px 16px; }
[data-pf-padrao="listras"] .pf-pd { -webkit-mask-image: repeating-linear-gradient(45deg, #000 0 2px, transparent 2px 14px); mask-image: repeating-linear-gradient(45deg, #000 0 2px, transparent 2px 14px); }
[data-pf-padrao="grade"] .pf-pd { -webkit-mask-image: linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px); mask-image: linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px); -webkit-mask-size: 26px 26px; mask-size: 26px 26px; }
[data-pf-padrao="linhas"] .pf-pd { -webkit-mask-image: repeating-linear-gradient(#000 0 1px, transparent 1px 6px); mask-image: repeating-linear-gradient(#000 0 1px, transparent 1px 6px); }
[data-pf-padrao="xadrez"] .pf-pd { -webkit-mask-image: conic-gradient(#000 25%, transparent 0 50%, #000 0 75%, transparent 0); mask-image: conic-gradient(#000 25%, transparent 0 50%, #000 0 75%, transparent 0); -webkit-mask-size: 40px 40px; mask-size: 40px 40px; }
[data-pf-padrao="hex"] .pf-pd { -webkit-mask-image: ${HEX}; mask-image: ${HEX}; }
[data-pf-padrao="runas"] .pf-pd { -webkit-mask-image: ${RUNA}; mask-image: ${RUNA}; }
[data-pf-padrao="ondas"] .pf-pd { -webkit-mask-image: ${ONDA}; mask-image: ${ONDA}; }
[data-pf-padrao="ruido"] .pf-pd { -webkit-mask-image: ${RUIDO}; mask-image: ${RUIDO}; }
/* capa */
.pf-on > .pf-capa, .pf-on > .pf-barra { grid-column: 1 / -1; align-self: stretch; }
.pf-capa { height: var(--pf-capa-h, 170px); margin: -14px -14px 14px; border-radius: var(--pf-raio-f, 16px) var(--pf-raio-f, 16px) 0 0; background: var(--pf-capa) var(--pf-capa-pos, center) / cover no-repeat; -webkit-mask-image: linear-gradient(#000 55%, transparent); mask-image: linear-gradient(#000 55%, transparent); }
.pf-capa-on > .pf-barra { position: absolute; right: 14px; top: 14px; margin: 0; }
/* caixas */
.pf-on[style*="--pf-raio"] :is(.caixa, .bloco, .papel) { border-radius: var(--pf-raio) !important; }
.pf-on[style*="--pf-bw"] :is(.caixa, .bloco, .papel) { border-width: var(--pf-bw) !important; border-style: solid; }
.pf-on[style*="--pf-bd"] :is(.caixa, .bloco, .papel) { border-color: var(--pf-bd) !important; }
.pf-on[style*="--pf-glow"] :is(.caixa, .bloco, .papel) { box-shadow: var(--pf-glow) !important; }
.pf-on[style*="--pf-pn"] :is(.caixa, .bloco) { background-color: var(--pf-pn) !important; }
.pf-on.pf-vidro :is(.caixa, .bloco, .papel) { -webkit-backdrop-filter: blur(10px) saturate(1.2); backdrop-filter: blur(10px) saturate(1.2); }
.pf-on[style*="--pf-a"] :is(h2, h3, .rotulo, .cab-p b) { color: var(--pf-a); }
.pf-on[style*="--pf-tx"] { color: var(--pf-tx); }
/* nome */
.pf-on[style*="--pf-nome-f"] .pf-nome { font-family: var(--pf-nome-f) !important; line-height: 1.1; }
.pf-on[style*="--pf-nome-c"] .pf-nome { color: var(--pf-nome-c) !important; }
.pf-on[style*="--pf-nome-esp"] .pf-nome { letter-spacing: var(--pf-nome-esp) !important; }
.pf-on[data-pf-maiusc] .pf-nome { text-transform: uppercase; }
.pf-on[data-pf-nome-tam="p"] .pf-nome { font-size: clamp(20px, 2.6vw, 28px) !important; }
.pf-on[data-pf-nome-tam="g"] .pf-nome { font-size: clamp(34px, 5.4vw, 56px) !important; }
.pf-on[data-pf-nome-tam="gg"] .pf-nome { font-size: clamp(42px, 8vw, 80px) !important; }
.pf-on[data-pf-nome="brilho"] .pf-nome { text-shadow: 0 0 18px ${mix('var(--pf-nome-c, var(--pf-a, currentColor))', 70)}, 0 0 4px ${mix('var(--pf-nome-c, var(--pf-a, currentColor))', 60)} !important; }
.pf-on[data-pf-nome="neon"] .pf-nome { color: #fff; text-shadow: 0 0 4px #fff, 0 0 10px var(--pf-nome-c, var(--pf-a, #0ff)), 0 0 22px var(--pf-nome-c, var(--pf-a, #0ff)), 0 0 44px var(--pf-nome-c, var(--pf-a, #0ff)) !important; }
.pf-on[data-pf-nome="gradiente"] .pf-nome { background: linear-gradient(90deg, var(--pf-nome-c, var(--pf-a, currentColor)), var(--pf-a2, #fff)); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; text-shadow: none !important; }
.pf-on[data-pf-nome="metal"] .pf-nome { background: linear-gradient(180deg, #fff 0%, var(--pf-nome-c, var(--pf-a, #ccc)) 45%, ${mix('var(--pf-nome-c, var(--pf-a, #888))', 50, '#000')} 55%, var(--pf-nome-c, var(--pf-a, #ccc)) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; text-shadow: none !important; }
.pf-on[data-pf-nome="fogo"] .pf-nome { background: linear-gradient(0deg, var(--pf-nome-c, var(--pf-a, #f60)) 10%, var(--pf-a2, #ffd23f) 60%, #fff 95%); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; text-shadow: none !important; }
.pf-on[data-pf-nome="contorno"] .pf-nome { color: transparent; -webkit-text-fill-color: transparent; text-shadow: none !important; -webkit-text-stroke: 1.4px var(--pf-nome-c, var(--pf-a, currentColor)); }
.pf-on[data-pf-nome="sombra"] .pf-nome { text-shadow: 3px 3px 0 var(--pf-a2, rgba(0,0,0,.8)), 6px 6px 0 rgba(0,0,0,.45) !important; }
.pf-on[data-pf-nome="glitch"] .pf-nome { position: relative; text-shadow: 2px 0 #ff2a6d, -2px 0 #05d9e8; animation: pf-glitch 2.6s steps(1) infinite; }
@keyframes pf-glitch { 0%, 86%, 100% { text-shadow: 2px 0 #ff2a6d, -2px 0 #05d9e8; transform: none; } 88% { text-shadow: -3px 1px #ff2a6d, 3px -1px #05d9e8; transform: translateX(2px) skewX(-6deg); } 92% { text-shadow: 3px -1px #ff2a6d, -3px 1px #05d9e8; transform: translateX(-2px); } }
/* retrato */
.pf-on .pf-ret { --rt: var(--pf-rt-c, var(--pf-a, #fff)); }
.pf-on[style*="--pf-rt-w"] .pf-ret, .pf-on[style*="--pf-rt-glow"] .pf-ret { box-shadow: 0 0 0 var(--pf-rt-w, 0) var(--rt), 0 0 var(--pf-rt-glow, 0) ${mix('var(--rt)', 70)}; border-color: var(--rt) !important; }
.pf-on[data-pf-forma="circulo"] .pf-ret { border-radius: 50% !important; }
.pf-on[data-pf-forma="arredondado"] .pf-ret { border-radius: 22% !important; }
.pf-on[data-pf-forma="quadrado"] .pf-ret { border-radius: 0 !important; }
.pf-on:is([data-pf-forma="hexagono"], [data-pf-forma="losango"], [data-pf-forma="escudo"], [data-pf-forma="estrela"], [data-pf-forma="octogono"], [data-pf-forma="gota"]) .pf-ret { border-radius: 0 !important; box-shadow: none !important; }
.pf-on:is([data-pf-forma="hexagono"], [data-pf-forma="losango"], [data-pf-forma="escudo"], [data-pf-forma="estrela"], [data-pf-forma="octogono"], [data-pf-forma="gota"]) .pf-ret-w { filter: drop-shadow(var(--pf-rt-w, 0px) 0 0 var(--rt, var(--pf-rt-c, var(--pf-a, #fff)))) drop-shadow(calc(-1 * var(--pf-rt-w, 0px)) 0 0 var(--pf-rt-c, var(--pf-a, #fff))) drop-shadow(0 var(--pf-rt-w, 0px) 0 var(--pf-rt-c, var(--pf-a, #fff))) drop-shadow(0 calc(-1 * var(--pf-rt-w, 0px)) 0 var(--pf-rt-c, var(--pf-a, #fff))) drop-shadow(0 0 var(--pf-rt-glow, 0px) var(--pf-rt-c, var(--pf-a, #fff))); }
.pf-on[data-pf-forma="hexagono"] .pf-ret { clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%); }
.pf-on[data-pf-forma="losango"] .pf-ret { clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }
.pf-on[data-pf-forma="escudo"] .pf-ret { clip-path: polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%); }
.pf-on[data-pf-forma="estrela"] .pf-ret { clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
.pf-on[data-pf-forma="octogono"] .pf-ret { clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%); }
.pf-on[data-pf-forma="gota"] .pf-ret { border-radius: 50% 50% 50% 0 !important; clip-path: none; }
/* efeitos */
.pf-fx1, .pf-fx2 { opacity: var(--pf-fx-o, .6); }
[data-pf-fx="brasas"] .pf-fx1, [data-pf-fx="brasas"] .pf-fx2, [data-pf-fx="vagalumes"] .pf-fx1, [data-pf-fx="vagalumes"] .pf-fx2, [data-pf-fx="neve"] .pf-fx1, [data-pf-fx="neve"] .pf-fx2, [data-pf-fx="sangue"] .pf-fx1 { inset: -100% 0 0; background-image: radial-gradient(circle at 12% 30%, var(--pf-fx) 1.5px, transparent 2.5px), radial-gradient(circle at 37% 70%, var(--pf-fx) 1px, transparent 2px), radial-gradient(circle at 63% 15%, var(--pf-fx) 2px, transparent 3px), radial-gradient(circle at 85% 55%, var(--pf-fx) 1.2px, transparent 2.2px), radial-gradient(circle at 50% 90%, var(--pf-fx) 1.6px, transparent 2.6px); background-size: 220px 260px; }
[data-pf-fx="brasas"] .pf-fx1 { animation: pf-sobe 9s linear infinite; filter: drop-shadow(0 0 3px var(--pf-fx)); }
[data-pf-fx="brasas"] .pf-fx2 { animation: pf-sobe 14s linear infinite; background-size: 300px 340px; opacity: calc(var(--pf-fx-o) * .7); }
[data-pf-fx="vagalumes"] .pf-fx1 { animation: pf-sobe 26s linear infinite, pf-pisca 3s ease-in-out infinite alternate; filter: drop-shadow(0 0 5px var(--pf-fx)) drop-shadow(0 0 2px var(--pf-fx)); }
[data-pf-fx="vagalumes"] .pf-fx2 { animation: pf-desce 34s linear infinite, pf-pisca 4.4s ease-in-out infinite alternate-reverse; background-size: 340px 300px; filter: drop-shadow(0 0 5px var(--pf-fx)); }
[data-pf-fx="neve"] .pf-fx1 { --pf-fx: #fff; animation: pf-desce 16s linear infinite; }
[data-pf-fx="neve"] .pf-fx2 { --pf-fx: #fff; animation: pf-desce 24s linear infinite; background-size: 300px 320px; opacity: calc(var(--pf-fx-o) * .6); }
[data-pf-fx="sangue"] .pf-fx1 { background-image: radial-gradient(ellipse 2px 5px at 20% 30%, var(--pf-fx) 60%, transparent 70%), radial-gradient(ellipse 1.6px 4px at 70% 60%, var(--pf-fx) 60%, transparent 70%), radial-gradient(ellipse 2.2px 6px at 45% 85%, var(--pf-fx) 60%, transparent 70%); background-size: 180px 300px; animation: pf-desce 7s linear infinite; }
[data-pf-fx="chuva"] .pf-fx1 { background: repeating-linear-gradient(105deg, transparent 0 18px, ${mix('var(--pf-fx)', 55)} 18px 19px, transparent 19px 41px); inset: -100% -20% 0; animation: pf-desce 1.1s linear infinite; }
[data-pf-fx="chuva"] .pf-fx2 { background: repeating-linear-gradient(105deg, transparent 0 31px, ${mix('var(--pf-fx)', 35)} 31px 32px, transparent 32px 57px); inset: -100% -20% 0; animation: pf-desce 1.7s linear infinite; }
[data-pf-fx="estrelas"] .pf-fx1, [data-pf-fx="estrelas"] .pf-fx2 { background-image: radial-gradient(circle at 10% 20%, #fff 1px, transparent 1.6px), radial-gradient(circle at 30% 65%, var(--pf-fx) 1.3px, transparent 2px), radial-gradient(circle at 55% 35%, #fff .8px, transparent 1.4px), radial-gradient(circle at 80% 80%, var(--pf-fx) 1px, transparent 1.7px), radial-gradient(circle at 90% 10%, #fff 1.2px, transparent 1.9px); background-size: 190px 170px; animation: pf-pisca 3.5s ease-in-out infinite alternate; }
[data-pf-fx="estrelas"] .pf-fx2 { background-size: 260px 230px; background-position: 70px 40px; animation-delay: -1.7s; }
[data-pf-fx="nevoa"] .pf-fx1, [data-pf-fx="nevoa"] .pf-fx2 { inset: 0 -50%; background: radial-gradient(ellipse 30% 40% at 20% 70%, ${mix('var(--pf-fx)', 40)}, transparent 70%), radial-gradient(ellipse 35% 30% at 70% 30%, ${mix('var(--pf-fx)', 30)}, transparent 70%); filter: blur(18px); animation: pf-deriva 30s ease-in-out infinite alternate; }
[data-pf-fx="nevoa"] .pf-fx2 { animation-duration: 44s; animation-direction: alternate-reverse; transform: scaleX(-1); }
[data-pf-fx="scan"] .pf-fx1 { background: repeating-linear-gradient(transparent 0 3px, ${mix('var(--pf-fx)', 18)} 3px 4px); animation: pf-tremor 5s steps(1) infinite; }
[data-pf-fx="scan"] .pf-fx2 { background: linear-gradient(transparent, ${mix('var(--pf-fx)', 30)}, transparent); height: 120px; inset: auto 0 auto; top: -120px; animation: pf-varre 6s linear infinite; }
[data-pf-fx="pulso"].pf-on { animation: pf-pulso 3.2s ease-in-out infinite; }
@keyframes pf-sobe { to { transform: translateY(50%); } }
@keyframes pf-desce { from { transform: translateY(0); } to { transform: translateY(50%); } }
@keyframes pf-pisca { from { opacity: calc(var(--pf-fx-o, .6) * .25); } to { opacity: var(--pf-fx-o, .6); } }
@keyframes pf-deriva { to { transform: translateX(22%); } }
@keyframes pf-tremor { 0%, 94%, 100% { opacity: var(--pf-fx-o); } 96% { opacity: calc(var(--pf-fx-o) * .3); } }
@keyframes pf-varre { to { transform: translateY(calc(100vh + 240px)); } }
@keyframes pf-pulso { 0%, 100% { box-shadow: inset 0 0 0 1px ${mix('var(--pf-fx)', 40)}, 0 0 0 transparent; } 50% { box-shadow: inset 0 0 0 1px var(--pf-fx), 0 0 26px ${mix('var(--pf-fx)', 45)}; } }
[data-pf-fx="brasas"] .pf-fx1 { animation-name: pf-sobe-r; } [data-pf-fx="brasas"] .pf-fx2 { animation-name: pf-sobe-r; } [data-pf-fx="vagalumes"] .pf-fx1 { animation-name: pf-sobe-r, pf-pisca; }
@keyframes pf-sobe-r { from { transform: translateY(50%); } to { transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .pf-on, .pf-on *, .pf-cam > i { animation: none !important; } }
/* botão e painel */
.pf-barra { display: flex; justify-content: flex-end; margin: 0 0 8px; position: relative; z-index: 3; }
.pf-abrir { display: inline-flex; gap: 6px; align-items: center; min-height: 36px; padding: 6px 14px; border-radius: 999px; border: 1px solid ${mix('var(--pf-a, #fff)', 45)}; background: rgba(0,0,0,.45); color: #fff; font: 700 13px system-ui, sans-serif; cursor: pointer; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.pf-abrir:hover { background: rgba(0,0,0,.65); }
.pf-abrir svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.pf-abrir svg circle { fill: currentColor; stroke: none; }
html.pf-editando .pf-barra { visibility: hidden; }
.pf-painel { position: fixed; z-index: 9000; right: 12px; top: 12px; bottom: 12px; width: min(400px, calc(100vw - 24px)); display: grid; grid-template-rows: auto auto 1fr auto; background: rgba(14,14,20,.97); color: #eee; border: 1px solid rgba(255,255,255,.16); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.6); font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; overflow: hidden; }
@media (max-width: 720px) { .pf-painel { left: 0; right: 0; top: auto; bottom: 0; width: auto; height: 58vh; border-radius: 16px 16px 0 0; } html.pf-editando body { padding-bottom: 58vh; } }
.pf-painel header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 6px; } .pf-painel header b { font-size: 16px; }
.pf-fechar { width: 34px; height: 34px; border-radius: 50%; border: 0; background: rgba(255,255,255,.1); color: #fff; font-size: 20px; cursor: pointer; }
.pf-abas { display: flex; gap: 4px; overflow-x: auto; padding: 4px 12px 8px; border-bottom: 1px solid rgba(255,255,255,.1); scrollbar-width: thin; }
.pf-abas button { flex: none; min-height: 34px; padding: 4px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: transparent; color: #ccc; font: 600 13px inherit; font-family: inherit; cursor: pointer; }
.pf-abas button[aria-selected="true"] { background: #fff; color: #111; border-color: #fff; }
.pf-corpo { overflow-y: auto; padding: 12px 14px 18px; display: grid; gap: 12px; align-content: start; }
.pf-c { display: grid; gap: 5px; } .pf-c > label { font-weight: 700; font-size: 13px; color: #ddd; } .pf-c > label b { font-weight: 600; color: #9fd0ff; margin-left: 4px; }
.pf-c small, .pf-dica { color: #9a9aa8; font-size: 12.5px; margin: 0; }
.pf-c select, .pf-c input[type=text] { min-height: 38px; padding: 6px 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,.18); background: #1b1b24; color: #eee; font: inherit; width: 100%; }
.pf-c input[type=range] { width: 100%; accent-color: #9fd0ff; }
.pf-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.pf-cor > span { display: flex; gap: 6px; align-items: center; } .pf-cor input[type=color] { width: 100%; height: 38px; border: 1px solid rgba(255,255,255,.2); border-radius: 9px; background: #1b1b24; padding: 2px; cursor: pointer; }
.pf-cor.vazio input[type=color] { opacity: .45; } .pf-cor.vazio > label::after { content: ' (sistema)'; font-weight: 400; color: #8a8a98; }
.pf-faixa > label { display: flex; align-items: center; gap: 4px; } .pf-x.mini { width: 26px; height: 26px; margin-left: auto; font-size: 13px; }
.pf-x { flex: none; width: 34px; height: 34px; border-radius: 8px; border: 1px solid rgba(255,255,255,.18); background: transparent; color: #ccc; cursor: pointer; }
.pf-chk { display: flex; gap: 8px; align-items: center; font-weight: 600; cursor: pointer; } .pf-chk input { width: 18px; height: 18px; accent-color: #9fd0ff; }
.pf-l { display: flex; gap: 6px; flex-wrap: wrap; }
.pf-bt { min-height: 36px; padding: 6px 14px; border-radius: 9px; border: 1px solid #fff; background: #fff; color: #111; font: 700 13px inherit; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; }
.pf-bt.sec { background: transparent; color: #eee; border-color: rgba(255,255,255,.25); } .pf-bt:disabled { opacity: .6; } .pf-bt.enviando { opacity: .6; pointer-events: none; }
.pf-painel footer { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px 12px; border-top: 1px solid rgba(255,255,255,.1); } .pf-painel footer span { flex: 1; }
.pf-painel hr { border: 0; border-top: 1px solid rgba(255,255,255,.1); margin: 4px 0; width: 100%; }
.pf-temas { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
.pf-tema { display: grid; gap: 6px; padding: 6px; border-radius: 12px; border: 2px solid transparent; background: rgba(255,255,255,.05); color: #ddd; font: 600 12.5px inherit; font-family: inherit; cursor: pointer; text-align: center; }
.pf-tema i { height: 52px; border-radius: 8px; background: linear-gradient(160deg, var(--f), var(--f2)); position: relative; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.pf-tema i::before { content: 'Aa'; position: absolute; left: 8px; top: 6px; font: 800 18px Georgia, serif; color: var(--a); text-shadow: 0 0 8px var(--a2); }
.pf-tema i::after { content: ''; position: absolute; right: 8px; bottom: 8px; width: 36px; height: 14px; border-radius: 4px; background: color-mix(in srgb, var(--t) 18%, transparent); box-shadow: inset 0 0 0 1px var(--a); }
.pf-tema.aqui { border-color: #9fd0ff; } .pf-tema[data-preset="padrao"] i { background: repeating-linear-gradient(45deg, #2a2a33 0 8px, #22222a 8px 16px); }
`;
    document.head.appendChild(s);
  }

  window.PerfilPersonagem = { ligar, aplicar, PRESETS };
})();
