/* =================================================================
   Mapa da mesa: cenas salvas (vários mapas), troca rápida, pinos e névoa.
   A Diretora/Mestre prepara cada cena, escolhe qual a mesa vê e revela
   o mapa aos poucos com o pincel de sombreamento.
   Usa os globais da página: esc, toast, abrirModal, confirmar, enviarImagem, iniciais, ESP.
   Dados no documento da mesa: mapas: [{ id, nome, img, pinos, nevoa: { on, cols, rows, v } }], mapaAtivo
   ================================================================= */
'use strict';
(() => {
  const T = {}; const rotulos = () => Object.assign(T, { dir: 'Mestre', ass: 'Ameaça', quem: 'Agentes', a: 'o' });
  const ICONES = ['📍', '🔪', '🩸', '💀', '👻', '🔦', '🗝️', '🚪', '🚗', '🏚️', '⛪', '🏥', '🎭', '🕯️', '📜', '🔮', '⚰️', '🧿', '🐺', '🦇', '🕷️', '🧟', '⭐', '❤️', '🛡️', '📦', '☠️', '🪓', '🕵️', '🐾', '🧪', '🔥', '💧', '⚡'];
  const COLS = 36; // largura da grade da névoa; a altura segue a proporção da imagem
  const UI = {}; // estado local por mesa: { ver, modo, pincel }
  const novoId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // lê as cenas do documento (e converte o mapa único antigo na primeira cena)
  function cenasDe(C) {
    if (Array.isArray(C.mapas) && C.mapas.length) return C.mapas;
    if (C.mapa?.img) return [{ id: 'cena-1', nome: C.mapa.nome || 'Cena 1', img: C.mapa.img, pinos: C.mapa.pinos || [], nevoa: null }];
    return [];
  }
  const ativoDe = C => { const l = cenasDe(C); return l.find(x => x.id === C.mapaAtivo) || l[0] || null; };

  /* ---------- névoa: grade de 0 (coberto) e 1 (revelado) ---------- */
  const nevoaCheia = (cols, rows, v = '0') => ({ on: true, cols, rows, v: v.repeat(cols * rows) });
  const revelado = (nv, x, y) => { if (!nv?.on) return true; const c = Math.min(nv.cols - 1, Math.floor(x / 100 * nv.cols)), r = Math.min(nv.rows - 1, Math.floor(y / 100 * nv.rows)); return nv.v[r * nv.cols + c] === '1'; };
  function pintarNevoa(cv, nv, mestre) {
    const box = cv.parentElement.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(box.width * dpr)); cv.height = Math.max(1, Math.round(box.height * dpr));
    const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    if (!nv?.on) return;
    const cw = cv.width / nv.cols, ch = cv.height / nv.rows;
    g.fillStyle = mestre ? 'rgba(8,4,6,.62)' : '#050304';
    for (let r = 0; r < nv.rows; r++) for (let c = 0; c < nv.cols; c++) if (nv.v[r * nv.cols + c] !== '1') g.fillRect(Math.floor(c * cw), Math.floor(r * ch), Math.ceil(cw) + 1, Math.ceil(ch) + 1);
    if (mestre) { // hachura para a Diretora saber o que a mesa não vê
      g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
      for (let r = 0; r < nv.rows; r++) for (let c = 0; c < nv.cols; c++) if (nv.v[r * nv.cols + c] !== '1') { g.beginPath(); g.moveTo(c * cw, (r + 1) * ch); g.lineTo((c + 1) * cw, r * ch); g.stroke(); }
    }
  }

  /* ---------- posições: quem move (mestre ou jogador) grava em quadro/estado.pinos[cena][pino]; a luz de quem está arrastando vai por broadcast ---------- */
  const OPT = { getPos: () => ({}), podeMover: () => false, salvarPos: null, eu: null, sala: '' };
  const REMOTO = {}; // pino -> { x, y, nome, cor, t }
  const posDe = (cena, p) => { const o = OPT.getPos()?.[cena?.id]?.[p.id], r = REMOTO[p.id]; if (r && Date.now() - r.t < 4000) return { x: r.x, y: r.y }; return o && (o.t || 0) >= (p.t || 0) ? o : p; };
  const CANAIS = {};
  function canal(sala) {
    if (!sala || typeof sb === 'undefined' || !sb) return null;
    if (CANAIS[sala]) return CANAIS[sala];
    const ch = sb.channel('mapa-' + sala, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'mv' }, ({ payload: m }) => { if (!m?.pino) return;
      if (m.fim) delete REMOTO[m.pino]; else REMOTO[m.pino] = { x: m.x, y: m.y, nome: m.nome, cor: m.cor, t: Date.now() };
      document.querySelectorAll(`.mapa-palco [data-pino="${CSS.escape(m.pino)}"]`).forEach(el => luz(el, m));
    }).subscribe();
    return (CANAIS[sala] = ch);
  }
  function luz(el, m) {
    if (m.fim) { el.style.left = m.x + '%'; el.style.top = m.y + '%'; el.classList.remove('movendo'); el.querySelector('.pino-quem')?.remove(); return; }
    el.style.left = m.x + '%'; el.style.top = m.y + '%'; el.classList.add('movendo'); el.style.setProperty('--mv', m.cor || '#3ddc84');
    let q = el.querySelector('.pino-quem'); if (!q) { q = document.createElement('span'); q.className = 'pino-quem'; el.prepend(q); } q.textContent = '✋ ' + (m.nome || 'Alguém');
    clearTimeout(el._luz); el._luz = setTimeout(() => { el.classList.remove('movendo'); q.remove(); }, 4000);
  }
  let ultimoEnvio = 0;
  // quem arrasta também vê a própria luz (igual a mesa vê), e a mesa recebe pelo canal
  const avisarMov = (pino, x, y, fim) => { const m = { pino, x: +x.toFixed(2), y: +y.toFixed(2), fim: !!fim, nome: OPT.eu?.nome || 'Alguém', cor: OPT.eu?.cor || '#3ddc84' };
    document.querySelectorAll(`.mapa-palco [data-pino="${CSS.escape(pino)}"]`).forEach(el => luz(el, m));
    const ch = canal(OPT.sala); if (!ch) return; const agora = Date.now(); if (!fim && agora - ultimoEnvio < 70) return; ultimoEnvio = agora;
    Promise.resolve(ch.send({ type: 'broadcast', event: 'mv', payload: m })).catch(() => {}); };
  const SEL = { id: null }; // token selecionado (alças de tamanho e giro, barra do mestre)
  const rotDe = (cena, p) => { const o = OPT.getPos()?.[cena?.id]?.[p.id]; return o && o.rot != null ? +o.rot : +p.rot || 0; };
  const BARRA = [['vis', '👁', 'Mostrar ou esconder da mesa'], ['trava', '🔒', 'Travar ou destravar'], ['frente', '⬆', 'Trazer para a frente'], ['tras', '⬇', 'Mandar para trás'], ['dup', '⧉', 'Duplicar'], ['nome', 'Aa', 'Mostrar ou esconder o nome'], ['del', '🗑', 'Apagar'], ['mais', '⋯', 'Editar tudo']];
  const pinoHTML = (p, mestre, escondido, cena, movel) => { const q = posDe(cena, p), r = REMOTO[p.id] && Date.now() - REMOTO[p.id].t < 4000 ? REMOTO[p.id] : null, sel = SEL.id === p.id && (mestre || movel);
    return `<div class="pino ${p.oculto ? 'oculto' : ''} ${escondido ? 'na-nevoa' : ''} ${(mestre || movel) && !(p.travado && !mestre) ? 'mov' : ''} ${p.travado ? 'travado' : ''} ${r ? 'movendo' : ''} ${sel ? 'sel' : ''} ${p.semNome ? 'sem-nome' : ''}" data-pino="${esc(p.id)}" style="left:${+q.x || 50}%;top:${+q.y || 50}%;--pc:${esc(p.cor || '#c4000d')};--tam:${+p.tam || 1};--rot:${rotDe(cena, p)}deg${r ? `;--mv:${esc(r.cor)}` : ''}" title="${esc(p.nome)}">${r ? `<span class="pino-quem">✋ ${esc(r.nome)}</span>` : ''}
    <span class="pino-nome">${esc(p.nome)}${p.oculto ? ' 🙈' : ''}${p.travado ? ' 🔒' : ''}${escondido ? ' 🌫' : ''}</span><span class="pino-alvo"><span class="pino-cab" style="${p.foto ? `background-image:url('${esc(p.foto)}')` : ''}">${p.foto ? '' : esc(p.ic || '📍')}</span>${sel ? `<span class="pino-h girar" data-h="girar" title="Girar (Shift: de 15 em 15°)"></span>${mestre ? ['nw', 'ne', 'sw', 'se'].map(c => `<span class="pino-h canto ${c}" data-h="tam" title="Arraste para aumentar ou diminuir"></span>`).join('') : ''}` : ''}</span>
    ${sel && mestre ? `<div class="pino-barra">${BARRA.map(([k, ic, t]) => `<button type="button" data-pb="${k}" title="${t}" aria-label="${t}" class="${(k === 'vis' && p.oculto) || (k === 'trava' && p.travado) || (k === 'nome' && p.semNome) ? 'on' : ''}">${ic}</button>`).join('')}</div>` : ''}</div>`; };
  // alças: girar e mudar o tamanho arrastando (mostra ao vivo, grava ao soltar)
  function gestoAlca(e, palco, aoFim) {
    const h = e.target.closest('[data-h]'); if (!h) return false;
    const el = h.closest('.pino'), cab = el.querySelector('.pino-cab'); e.preventDefault(); e.stopPropagation();
    const r = cab.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const g = { tipo: h.dataset.h, id: el.dataset.pino, d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, tam0: parseFloat(el.style.getPropertyValue('--tam')) || 1, rot: null, tam: null };
    palco.dataset.ocupado = '1'; try { h.setPointerCapture(e.pointerId); } catch (x) {}
    const mover = ev => { ev.stopPropagation();
      if (g.tipo === 'girar') { let a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90; if (ev.shiftKey) a = Math.round(a / 15) * 15; g.rot = Math.round((a + 360) % 360); el.style.setProperty('--rot', g.rot + 'deg'); }
      else { g.tam = Math.round(Math.min(6, Math.max(0.5, g.tam0 * Math.hypot(ev.clientX - cx, ev.clientY - cy) / g.d0)) * 20) / 20; el.style.setProperty('--tam', g.tam); } };
    const fim = async ev => { ev?.stopPropagation(); h.removeEventListener('pointermove', mover); h.removeEventListener('pointerup', fim); h.removeEventListener('pointercancel', fim); palco.dataset.ocupado = ''; if (g.rot != null || g.tam != null) await aoFim(g); };
    h.addEventListener('pointermove', mover); h.addEventListener('pointerup', fim); h.addEventListener('pointercancel', fim);
    return true;
  }
  const salvarGiro = async (cena, p, rot, salvarPinosFn) => { const q = posDe(cena, p);
    if (OPT.salvarPos) return OPT.salvarPos(cena.id, p.id, { x: +(+q.x || 50).toFixed(2), y: +(+q.y || 50).toFixed(2), rot });
    if (salvarPinosFn) return salvarPinosFn(rot); };

  function desenharMapa(A, getC, opts) {
    const { mestre, salvarC, DETS = [], E = null, getPos, podeMover, salvarPos, eu, sala } = opts;
    rotulos(); Object.assign(OPT, { getPos: getPos || (() => ({})), podeMover: podeMover || (() => false), salvarPos: salvarPos || null, eu: eu || null, sala: sala || '' }); canal(OPT.sala);
    const C = getC(), cenas = cenasDe(C), ativo = ativoDe(C), mesaId = C.id || C.nome || 'm';
    const ui = UI[mesaId] = UI[mesaId] || { ver: null, modo: 'mover', pincel: 2 };
    if (!mestre) ui.ver = null;
    const cena = (mestre && cenas.find(x => x.id === ui.ver)) || ativo;
    if (mestre && cena) ui.ver = cena.id;
    const palco0 = A.querySelector('.mapa-palco');
    if (palco0?.dataset.ocupado === '1') return; // pintando ou arrastando: não redesenha por cima
    // atualização leve: mesma cena e mesma imagem, só pinos e névoa
    // jogador não tem a fileira de cenas: para ele basta ser a mesma cena e a mesma imagem
    if (palco0 && palco0.dataset.cena === (cena?.id || '') && palco0.dataset.img === (cena?.img || '') && (!mestre || (A.querySelector('.mapa-cenas')?.dataset.n === String(cenas.length) && A.querySelector('[data-ativo]')?.dataset.ativo === (ativo?.id || '')))) {
      palco0._cena = cena; palco0.querySelector('.pinos').innerHTML = pinosVisiveis(cena, mestre);
      pintarNevoa(palco0.querySelector('.nevoa'), cena.nevoa, mestre); return;
    }
    const ehAtivo = cena && ativo && cena.id === ativo.id;
    if (A.offsetHeight) { const h0 = A.offsetHeight; A.style.minHeight = h0 + 'px'; setTimeout(() => { A.style.minHeight = ''; }, 1500); }
    A.innerHTML = `<div class="caixa bloco mapa-caixa">
      ${mestre ? `<div class="mapa-cenas" data-n="${cenas.length}"><span data-ativo="${esc(ativo?.id || '')}" hidden></span>${cenas.map(c => `<button type="button" class="cena-tab ${c.id === cena?.id ? 'aqui' : ''} ${c.id === ativo?.id ? 'ativa' : ''}" data-cena="${esc(c.id)}" style="${c.img ? `--ci:url('${esc(c.img)}')` : ''}" title="${c.id === ativo?.id ? 'A mesa está vendo esta' : 'Só você está vendo'}"><b>${esc(c.nome)}</b>${c.id === ativo?.id ? '<small>👁 a mesa vê</small>' : ''}</button>`).join('')}<button type="button" class="cena-tab nova" data-m="nova" title="Nova cena">＋ Cena</button></div>` : ''}
      <div class="btns" style="justify-content:space-between;align-items:center"><h3>🗺 ${cena ? esc(cena.nome) : 'Mapa'}${mestre && cena && !ehAtivo ? ' <span class="tag">só você vê</span>' : ''}</h3>
        ${mestre && cena ? `<div class="btns">${ehAtivo ? '' : '<button class="btn mini perigo" data-m="mostrar">👁 Mostrar para a mesa</button>'}<button class="btn mini sec" data-m="img">${cena.img ? 'Trocar imagem' : 'Subir imagem'}</button><button class="btn mini sec" data-m="ren">Renomear</button><button class="btn mini sec" data-m="dup">Duplicar</button><button class="btn mini sec" data-m="apagar">Apagar cena</button></div>` : ''}</div>
      ${mestre && cena?.img ? `<div class="mapa-ferr">
          <span class="seg"><button type="button" data-modo="mover" class="${ui.modo === 'mover' ? 'aqui' : ''}">✋ Pinos</button><button type="button" data-modo="revelar" class="${ui.modo === 'revelar' ? 'aqui' : ''}">🔦 Revelar</button><button type="button" data-modo="cobrir" class="${ui.modo === 'cobrir' ? 'aqui' : ''}">🌫 Cobrir</button></span>
          <label class="pincel" ${ui.modo === 'mover' ? 'hidden' : ''}>Pincel <input type="range" min="0" max="5" step="1" value="${ui.pincel}" data-pincel></label>
          <span class="btns">${cena.nevoa?.on ? '<button class="btn mini sec" data-m="tudo1">Revelar tudo</button><button class="btn mini sec" data-m="tudo0">Cobrir tudo</button><button class="btn mini sec" data-m="semnevoa">Tirar névoa</button>' : '<button class="btn mini" data-m="comnevoa">🌫 Ligar névoa</button>'}
          <button class="btn mini sec" data-m="sobs">+ ${T.quem}</button><button class="btn mini sec" data-m="npc">+ NPC</button><button class="btn mini sec" data-m="ass">+ ${T.ass}</button><button class="btn mini sec" data-m="novo">+ Pino</button></span></div>` : ''}
      ${cena?.img ? `<div class="mapa-vista"><div class="mapa-palco ${mestre ? 'modo-' + ui.modo : ''}" data-cena="${esc(cena.id)}" data-img="${esc(cena.img)}"><img src="${esc(cena.img)}" alt="${esc(cena.nome)}" draggable="false"><canvas class="nevoa ${mestre ? '' : 'jog'}"></canvas><div class="pinos">${pinosVisiveis(cena, mestre)}</div></div>
        <div class="mapa-zoom" role="toolbar" aria-label="Zoom do mapa"><button type="button" data-z="mais" title="Aproximar" aria-label="Aproximar">＋</button><span data-z-n>1×</span><button type="button" data-z="menos" title="Afastar" aria-label="Afastar">－</button><button type="button" data-z="foco" title="Foco: toque num ponto do mapa para aproximar ali" aria-label="Foco">🎯</button><button type="button" data-z="pinos" title="Focar num pino" aria-label="Focar num pino">📍</button><button type="button" data-z="reset" title="Ver o mapa inteiro" aria-label="Ver o mapa inteiro">⤢</button></div>
        <div class="mapa-zoom-lista" hidden></div></div>
        <p class="tag" style="margin:0">${mestre ? (ui.modo === 'mover' ? 'Arraste os pinos. Clique num pino para editar, esconder ou remover. 🙈 só você vê; 🌫 está na névoa (a mesa não vê).' : `Passe o dedo ou o mouse sobre o mapa para ${ui.modo === 'revelar' ? 'revelar' : 'cobrir'}. A mesa vê na hora em que você solta.`) : 'O que a sua personagem consegue ver agora.'}</p>`
      : `<div class="vazio">${mestre ? (cena ? 'Suba a imagem desta cena: planta do local, sala, porão, mapa da cidade…' : 'Crie a primeira cena com ＋ Cena. Dá para ter uma por prédio, sala ou andar e trocar na hora.') : `O Mestre ainda não mostrou nenhum mapa.`}</div>`}</div>`;
    const palco = A.querySelector('.mapa-palco');
    if (palco) {
      palco._cena = cena; const cv = palco.querySelector('.nevoa'), img = palco.querySelector('img');
      const pintar = () => pintarNevoa(cv, cena.nevoa, mestre);
      if (img.complete) pintar(); else img.onload = pintar;
      new ResizeObserver(pintar).observe(palco);
      ligarZoom(A.querySelector('.mapa-vista'), ui, cena, () => (cenasDe(getC()).find(x => x.id === cena.id) || cena), mestre);
    }
    if (!mestre) { if (palco) ligarArrastoJog(palco, cena); return; }

    /* ---------- ações da Diretora ---------- */
    const refazer = () => { const p = A.querySelector('.mapa-palco'); if (p) p.dataset.img = '-'; desenharMapa(A, getC, opts); };
    const salvarCenas = async (l, extra = {}) => { await salvarC({ mapas: l, ...(getC().mapa ? { mapa: null } : {}), ...extra }); };
    const cenasAt = () => cenasDe(getC()).map(x => ({ ...x }));
    const atual = () => cenasAt().find(x => x.id === ui.ver);
    const trocarCena = async (fn) => { const l = cenasAt(), i = l.findIndex(x => x.id === ui.ver); if (i < 0) return; l[i] = fn({ ...l[i] }); await salvarCenas(l); };
    const subir = (aoTerminar) => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => { if (!inp.files[0]) return; toast('Enviando a imagem…'); const u = await enviarImagem(inp.files[0]); if (u) aoTerminar(u); }; inp.click(); };
    A.querySelectorAll('[data-cena]').forEach(b => b.onclick = () => { ui.ver = b.dataset.cena; refazer(); });
    const perguntarNome = (tit, val) => new Promise(res => abrirModal(tit, `<div class="campo"><label class="rotulo" for="cn-n">Nome da cena</label><input type="text" id="cn-n" maxlength="50" value="${esc(val || '')}" placeholder="Ex.: Porão da mansão, 2º andar, Cemitério"></div><button class="btn" id="cn-ok">OK</button>`, (m, fechar) => {
      const ok = () => { const v = m.querySelector('#cn-n').value.trim(); fechar(); res(v || null); };
      m.querySelector('#cn-ok').onclick = ok; m.querySelector('#cn-n').onkeydown = e => { if (e.key === 'Enter') ok(); }; setTimeout(() => m.querySelector('#cn-n').focus(), 50); }));
    A.querySelector('[data-m="nova"]')?.addEventListener('click', async () => {
      const nome = await perguntarNome('Nova cena', `Cena ${cenas.length + 1}`); if (!nome) return;
      const c = { id: novoId('cena-'), nome, img: '', pinos: [], nevoa: null };
      ui.ver = c.id; await salvarCenas([...cenasAt(), c], cenas.length ? {} : { mapaAtivo: c.id }); refazer();
      subir(async u => { await trocarCena(x => ({ ...x, img: u })); refazer(); });
    });
    A.querySelector('[data-m="img"]')?.addEventListener('click', () => subir(async u => { await trocarCena(x => ({ ...x, img: u })); refazer(); }));
    A.querySelector('[data-m="mostrar"]')?.addEventListener('click', async () => { await salvarC({ mapaAtivo: ui.ver }); toast('A mesa agora vê ' + (atual()?.nome || 'esta cena') + '.'); refazer(); });
    A.querySelector('[data-m="ren"]')?.addEventListener('click', async () => { const n = await perguntarNome('Renomear cena', atual()?.nome); if (!n) return; await trocarCena(x => ({ ...x, nome: n })); refazer(); });
    A.querySelector('[data-m="dup"]')?.addEventListener('click', async () => { const a = atual(); if (!a) return; const c = { ...JSON.parse(JSON.stringify(a)), id: novoId('cena-'), nome: a.nome + ' (cópia)' }; ui.ver = c.id; await salvarCenas([...cenasAt(), c]); refazer(); });
    A.querySelector('[data-m="apagar"]')?.addEventListener('click', async () => { const a = atual(); if (!a || !await confirmar(`Apagar a cena "${a.nome}" com pinos e névoa?`, { titulo: 'Apagar cena' })) return;
      const l = cenasAt().filter(x => x.id !== a.id); ui.ver = l[0]?.id || null; await salvarCenas(l, getC().mapaAtivo === a.id ? { mapaAtivo: l[0]?.id || null } : {}); refazer(); });
    // névoa
    const grade = () => { const im = A.querySelector('.mapa-palco img'), rows = Math.max(6, Math.round(COLS * (im?.naturalHeight || 3) / (im?.naturalWidth || 4))); return [COLS, rows]; };
    A.querySelector('[data-m="comnevoa"]')?.addEventListener('click', async () => { const [c, r] = grade(); await trocarCena(x => ({ ...x, nevoa: nevoaCheia(c, r) })); ui.modo = 'revelar'; refazer(); toast('Tudo coberto. Use 🔦 Revelar para abrir o que a mesa vê.'); });
    A.querySelector('[data-m="semnevoa"]')?.addEventListener('click', async () => { await trocarCena(x => ({ ...x, nevoa: null })); ui.modo = 'mover'; refazer(); });
    A.querySelector('[data-m="tudo1"]')?.addEventListener('click', async () => { await trocarCena(x => ({ ...x, nevoa: { ...x.nevoa, v: '1'.repeat(x.nevoa.cols * x.nevoa.rows) } })); refazer(); });
    A.querySelector('[data-m="tudo0"]')?.addEventListener('click', async () => { await trocarCena(x => ({ ...x, nevoa: { ...x.nevoa, v: '0'.repeat(x.nevoa.cols * x.nevoa.rows) } })); refazer(); });
    A.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => { ui.modo = b.dataset.modo; if (ui.modo !== 'mover' && !cena.nevoa?.on) { toast('Ligue a névoa primeiro.'); ui.modo = 'mover'; } refazer(); });
    A.querySelector('[data-pincel]')?.addEventListener('input', e => { ui.pincel = +e.target.value; });
    // pinos
    const salvarPinos = l => trocarCena(x => ({ ...x, pinos: l }));
    const pinosAt = () => [...(atual()?.pinos || [])];
    A.querySelector('[data-m="sobs"]')?.addEventListener('click', async () => {
      const l = pinosAt(); let n = 0;
      DETS.filter(f => !f.fora && !l.some(p => p.ficha === f.id)).forEach((f, i) => { n++; l.push({ id: novoId('p'), ficha: f.id, nome: f.nome, foto: f.foto || '', cor: '#5d86c4', ic: '📍', x: 12 + (i % 6) * 8, y: 88, fixo: true, ...(f.oculto ? { oculto: true } : {}) }); });
      if (!n) return toast(`Todo mundo já tem pino nesta cena.`); await salvarPinos(l); refazer(); });
    A.querySelector('[data-m="npc"]')?.addEventListener('click', () => {
      const npcs = (getC().npcs || []).slice().sort((a, b) => (b.t || 0) - (a.t || 0)), ja = new Set(pinosAt().filter(p => p.npc).map(p => p.npc));
      const susp = n => !!n.suspeito;
      if (!npcs.length) return toast('Nenhum NPC criado ainda. Crie na aba NPCs.');
      abrirModal('Colocar NPC no mapa', `<p class="tag">Escolha quem está nesta cena. Quem já tem pino aqui aparece marcado.</p>
        <div class="npc-escolha">${npcs.map(n => `<label class="npc-op ${ja.has(n.id) ? 'ja' : ''}"><input type="checkbox" value="${esc(n.id)}" ${ja.has(n.id) ? 'disabled checked' : ''}>
          <span class="foto-s p" style="${n.foto ? `background-image:url('${esc(n.foto)}')` : ''}">${n.foto ? '' : esc(iniciais(n.nome))}</span><span><b>${esc(n.nome)}</b>${n.papel ? `<small>${esc(n.papel)}</small>` : ''}${susp(n) ? '<small class="sus">Suspeito</small>' : ''}${ja.has(n.id) ? '<small>já está aqui</small>' : ''}</span></label>`).join('')}</div>
        <label class="chk"><input type="checkbox" id="npc-oc"> Colocar escondido da mesa</label>
        <button class="btn" id="npc-ok">Colocar no mapa</button>`, (m, fechar) => {
        m.querySelector('#npc-ok').onclick = async () => {
          const ids = [...m.querySelectorAll('.npc-escolha input:checked:not(:disabled)')].map(i => i.value); if (!ids.length) { toast('Marque pelo menos um.'); return; }
          const oc = m.querySelector('#npc-oc').checked, l = pinosAt();
          ids.forEach((id, i) => { const n = npcs.find(x => x.id === id); l.push({ id: novoId('p'), npc: n.id, nome: n.nome, foto: n.foto || '', ic: '🎭', cor: susp(n) ? '#c4000d' : '#9a86f0', oculto: oc, x: 40 + (i % 5) * 5, y: 45 + Math.floor(i / 5) * 6 }); });
          fechar(); await salvarPinos(l); refazer(); toast(ids.length > 1 ? `${ids.length} NPCs no mapa. Arraste para o lugar.` : 'NPC no mapa. Arraste para o lugar.'); };
      });
    });
    A.querySelector('[data-m="ass"]')?.addEventListener('click', async () => {
      const l = pinosAt(); if (l.some(p => p.assassino)) return toast('A Ameaça já tem pino nesta cena.');
      const nome = E?.nome || T.ass;
      l.push({ id: novoId('p'), assassino: true, nome, ic: '🔪', cor: '#8e0010', foto: E?.foto || '', oculto: true, x: 50, y: 12 });
      await salvarPinos(l); refazer(); toast('Pino criado escondido. Clique nele para mostrar à mesa.'); });
    const editar = (pino, novo) => abrirModal(novo ? 'Novo pino' : 'Editar pino', `<div class="campo"><label class="rotulo" for="pn-n">Nome</label><input type="text" id="pn-n" maxlength="40" value="${esc(pino.nome || '')}"></div>
        <div class="campo"><span class="rotulo">Ícone</span><div class="pino-ics">${ICONES.map(ic => `<button type="button" class="${ic === (pino.ic || '📍') ? 'aqui' : ''}" data-ic="${ic}">${ic}</button>`).join('')}</div></div>
        <div class="duas"><div class="campo"><label class="rotulo" for="pn-c">Cor</label><input type="color" id="pn-c" value="${esc(pino.cor || '#c4000d')}" style="height:40px;padding:2px"></div>
        <label class="chk" style="align-self:end"><input type="checkbox" id="pn-o" ${pino.oculto ? 'checked' : ''}> Esconder da mesa</label></div>
        <div class="campo"><label class="rotulo" for="pn-t">Tamanho <b id="pn-tv">${Math.round((+pino.tam || 1) * 100)}%</b></label><input type="range" id="pn-t" min="0.5" max="4" step="0.25" value="${+pino.tam || 1}"></div>
        <label class="chk"><input type="checkbox" id="pn-fx" ${pino.fixo ? 'checked' : ''}> Aparece mesmo na névoa (personagem da mesa)</label>
        <label class="chk"><input type="checkbox" id="pn-lv" ${pino.livre ? 'checked' : ''}> Qualquer jogador pode mover${pino.ficha ? ' (o dono do agente já pode)' : ''}</label>
        ${pino.foto ? `<label class="chk"><input type="checkbox" id="pn-f" checked> Usar a foto no lugar do ícone</label>` : ''}
        ${cenas.length > 1 && !novo ? `<div class="campo"><label class="rotulo" for="pn-mv">Levar para outra cena</label><select id="pn-mv"><option value="">Fica aqui</option>${cenas.filter(c => c.id !== ui.ver).map(c => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('')}</select></div>` : ''}
        <div class="btns"><button class="btn" id="pn-ok">${novo ? 'Colocar' : 'Salvar'}</button>${novo ? '' : '<button class="btn perigo" id="pn-x">Remover</button>'}</div>`, (m, fechar) => {
      let ic = pino.ic || '📍';
      m.querySelector('#pn-t').oninput = e => { m.querySelector('#pn-tv').textContent = Math.round(e.target.value * 100) + '%'; };
      m.querySelectorAll('[data-ic]').forEach(b => b.onclick = () => { ic = b.dataset.ic; m.querySelectorAll('[data-ic]').forEach(x => x.classList.toggle('aqui', x === b)); });
      m.querySelector('#pn-ok').onclick = async () => {
        const p2 = { ...pino, nome: m.querySelector('#pn-n').value.trim() || 'Pino', ic, cor: m.querySelector('#pn-c').value, oculto: m.querySelector('#pn-o').checked, fixo: m.querySelector('#pn-fx').checked, livre: m.querySelector('#pn-lv').checked, tam: +m.querySelector('#pn-t').value || 1, foto: m.querySelector('#pn-f') && !m.querySelector('#pn-f').checked ? '' : pino.foto || '' };
        const destino = m.querySelector('#pn-mv')?.value; fechar();
        const l = cenasAt(), i = l.findIndex(x => x.id === ui.ver); if (i < 0) return;
        const ps = [...(l[i].pinos || [])], j = ps.findIndex(p => p.id === pino.id);
        if (destino) { ps.splice(j, 1); const k = l.findIndex(x => x.id === destino); l[k] = { ...l[k], pinos: [...(l[k].pinos || []).filter(p => p.id !== pino.id), { ...p2, x: 50, y: 50 }] }; toast(`${p2.nome} foi para ${l[k].nome}.`); }
        else if (j < 0) ps.push(p2); else ps[j] = p2;
        l[i] = { ...l[i], pinos: ps }; await salvarCenas(l); refazer(); };
      m.querySelector('#pn-x')?.addEventListener('click', async () => { fechar(); await salvarPinos(pinosAt().filter(p => p.id !== pino.id)); refazer(); });
    });
    A.querySelector('[data-m="novo"]')?.addEventListener('click', () => editar({ id: novoId('p'), nome: '', ic: '📍', cor: '#f2c14e', x: 50, y: 50 }, true));
    if (!palco) return;

    // arrastar pinos ou pintar a névoa
    let arr = null, pint = null;
    const pos = e => { const r = palco.getBoundingClientRect(); return [Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)), Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100))]; };
    const pincelar = (x, y) => { const nv = pint.nv, c0 = Math.floor(x / 100 * nv.cols), r0 = Math.floor(y / 100 * nv.rows), rad = ui.pincel, val = ui.modo === 'revelar' ? '1' : '0'; let mudou = false;
      const arr2 = nv.v.split('');
      for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) { if (r < 0 || c < 0 || r >= nv.rows || c >= nv.cols || (r - r0) ** 2 + (c - c0) ** 2 > rad * rad + rad) continue; const k = r * nv.cols + c; if (arr2[k] !== val) { arr2[k] = val; mudou = true; } }
      if (mudou) { nv.v = arr2.join(''); pintarNevoa(palco.querySelector('.nevoa'), nv, true); } };
    const repintar = () => { const c = palco._cena || cena; palco.querySelector('.pinos').innerHTML = pinosVisiveis(c, true); };
    palco.addEventListener('pointerdown', e => {
      if (ui.modo !== 'mover' && cena.nevoa?.on) { e.preventDefault(); palco.dataset.ocupado = '1'; palco.setPointerCapture(e.pointerId); pint = { nv: { ...cena.nevoa } }; pincelar(...pos(e)); return; }
      if (e.target.closest('.pino-barra')) return;
      if (gestoAlca(e, palco, async g => { const l = pinosAt(), p = l.find(x => x.id === g.id); if (!p) return;
        if (g.tam != null) { p.tam = g.tam; await salvarPinos(l); } else await salvarGiro(palco._cena || cena, p, g.rot, async rot => { p.rot = rot; await salvarPinos(l); }); })) return;
      const el = e.target.closest('.pino'); if (!el) { if (SEL.id) { SEL.id = null; repintar(); } return; } e.preventDefault(); palco.dataset.ocupado = '1';
      arr = { el, id: el.dataset.pino, x0: e.clientX, y0: e.clientY, moveu: false, trav: el.classList.contains('travado') }; el.setPointerCapture(e.pointerId); if (!arr.trav) el.classList.add('arrastando'); });
    palco.addEventListener('click', async e => {
      const b = e.target.closest('[data-pb]'); if (!b) return; e.stopPropagation();
      const l = pinosAt(), i = l.findIndex(x => x.id === SEL.id), p = l[i]; if (!p) return; const k = b.dataset.pb;
      if (k === 'mais') return editar(p, false);
      if (k === 'del') { if (!await confirmar(`Apagar o token "${esc(p.nome || 'Pino')}"?`, { titulo: 'Apagar token', ok: 'Apagar' })) return; SEL.id = null; await salvarPinos(l.filter(x => x.id !== p.id)); return desenharMapa(A, getC, opts); }
      if (k === 'vis') p.oculto = !p.oculto;
      if (k === 'trava') p.travado = !p.travado;
      if (k === 'nome') p.semNome = !p.semNome;
      if (k === 'frente') l.push(l.splice(i, 1)[0]);
      if (k === 'tras') l.unshift(l.splice(i, 1)[0]);
      if (k === 'dup') { const q = posDe(palco._cena || cena, p), c = { ...JSON.parse(JSON.stringify(p)), id: novoId('p'), ficha: undefined, x: Math.min(97, (+q.x || 50) + 3), y: Math.min(97, (+q.y || 50) + 3), rot: rotDe(palco._cena || cena, p) }; delete c.ficha; l.push(c); SEL.id = c.id; }
      await salvarPinos(l); desenharMapa(A, getC, opts); });
    palco.addEventListener('pointermove', e => {
      if (pint) { pincelar(...pos(e)); return; }
      if (!arr || arr.trav) return; if (Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) > 4) arr.moveu = true; if (!arr.moveu) return;
      [arr.x, arr.y] = pos(e); arr.el.style.left = arr.x + '%'; arr.el.style.top = arr.y + '%'; avisarMov(arr.id, arr.x, arr.y); });
    const soltar = async () => {
      if (pint) { const nv = pint.nv; pint = null; palco.dataset.ocupado = ''; await trocarCena(x => ({ ...x, nevoa: nv })); return; }
      if (!arr) return; const a = arr; arr = null; a.el.classList.remove('arrastando'); palco.dataset.ocupado = '';
      const l = pinosAt(), p = l.find(x => x.id === a.id); if (!p) return;
      if (!a.moveu) { SEL.id = SEL.id === p.id ? null : p.id; repintar(); return; }
      avisarMov(a.id, a.x, a.y, true);
      if (OPT.salvarPos) { await OPT.salvarPos(cena.id, p.id, { x: +a.x.toFixed(2), y: +a.y.toFixed(2) }); return; }
      p.x = +a.x.toFixed(2); p.y = +a.y.toFixed(2); await salvarPinos(l); };
    palco.addEventListener('pointerup', soltar); palco.addEventListener('pointercancel', soltar);
  }
  /* ---------- zoom: aproximar, afastar, arrastar o mapa e focar num ponto ou pino ---------- */
  const ZMAX = 5;
  function ligarZoom(vista, ui, cena, getCena, mestre) {
    if (!vista) return;
    const palco = vista.querySelector('.mapa-palco'), lista = vista.querySelector('.mapa-zoom-lista');
    if (!ui.zoom || ui.zoom.cena !== cena.id) ui.zoom = { cena: cena.id, s: 1, x: 50, y: 50 };
    const z = ui.zoom;
    const aplicar = (anim = true) => {
      z.s = Math.min(ZMAX, Math.max(1, z.s));
      const meia = 50 / z.s; z.x = Math.min(100 - meia, Math.max(meia, z.x)); z.y = Math.min(100 - meia, Math.max(meia, z.y));
      palco.style.transition = anim ? 'transform .28s ease' : 'none';
      palco.style.transform = z.s === 1 ? '' : `translate(${50 - z.s * z.x}%, ${50 - z.s * z.y}%) scale(${z.s})`;
      palco.style.setProperty('--zs', (1 / Math.sqrt(z.s)).toFixed(3));
      vista.classList.toggle('ampliado', z.s > 1);
      vista.querySelector('[data-z-n]').textContent = (Math.round(z.s * 10) / 10).toString().replace('.', ',') + '×';
    };
    const ponto = e => { const r = palco.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100]; };
    const focar = (x, y, s) => { z.x = x; z.y = y; z.s = Math.max(z.s, s || 2.5); aplicar(); };
    aplicar(false);
    vista.querySelector('[data-z="mais"]').onclick = () => { z.s *= 1.4; aplicar(); };
    vista.querySelector('[data-z="menos"]').onclick = () => { z.s /= 1.4; if (z.s < 1.05) z.s = 1; aplicar(); };
    vista.querySelector('[data-z="reset"]').onclick = () => { z.s = 1; z.x = z.y = 50; aplicar(); };
    const bFoco = vista.querySelector('[data-z="foco"]');
    bFoco.onclick = () => { ui.focar = !ui.focar; bFoco.classList.toggle('aqui', ui.focar); vista.classList.toggle('focando', ui.focar); lista.hidden = true; if (ui.focar) toast('Toque no ponto do mapa que quer ver de perto.'); };
    vista.querySelector('[data-z="pinos"]').onclick = () => {
      if (!lista.hidden) { lista.hidden = true; return; }
      const c = getCena(), ps = (c.pinos || []).filter(p => mestre || (!p.oculto && (p.fixo || revelado(c.nevoa, +p.x || 50, Math.min(99.9, +p.y || 50)))));
      lista.innerHTML = ps.length ? ps.map(p => `<button type="button" data-zp="${esc(p.id)}"><span>${esc(p.ic || '📍')}</span>${esc(p.nome || 'Pino')}</button>`).join('') : '<span class="tag">Nenhum pino nesta cena.</span>';
      lista.hidden = false;
      lista.querySelectorAll('[data-zp]').forEach(b => b.onclick = () => { const p = (getCena().pinos || []).find(x => x.id === b.dataset.zp); lista.hidden = true; if (p) focar(+p.x || 50, Math.max(0, (+p.y || 50) - 4), 3); });
    };
    // foco por toque: captura antes dos pinos e do pincel
    vista.addEventListener('pointerdown', e => {
      if (!ui.focar || !e.target.closest('.mapa-palco')) return;
      e.preventDefault(); e.stopPropagation(); ui.focar = false; bFoco.classList.remove('aqui'); vista.classList.remove('focando');
      const [x, y] = ponto(e); focar(x, y, 2.5);
    }, true);
    // arrastar o mapa quando ampliado (fora dos pinos e fora do pincel)
    let pan = null;
    vista.addEventListener('pointerdown', e => {
      if (z.s <= 1 || e.target.closest('.pino, .mapa-zoom, .mapa-zoom-lista') || (mestre && ui.modo !== 'mover')) return;
      e.preventDefault(); pan = { x0: e.clientX, y0: e.clientY, x: z.x, y: z.y }; vista.setPointerCapture(e.pointerId); vista.classList.add('arrastando');
    });
    vista.addEventListener('pointermove', e => { if (!pan) return; const r = vista.getBoundingClientRect(); z.x = pan.x - (e.clientX - pan.x0) / (r.width * z.s) * 100; z.y = pan.y - (e.clientY - pan.y0) / (r.height * z.s) * 100; aplicar(false); });
    const fim = () => { pan = null; vista.classList.remove('arrastando'); }; vista.addEventListener('pointerup', fim); vista.addEventListener('pointercancel', fim);
    // rodinha do mouse aproxima no ponto do cursor
    vista.addEventListener('wheel', e => {
      if (z.s === 1 && !e.ctrlKey) return;
      e.preventDefault(); const [px, py] = ponto(e), s0 = z.s; z.s = Math.min(ZMAX, Math.max(1, z.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      z.x = px + (z.x - px) * s0 / z.s; z.y = py + (z.y - py) * s0 / z.s; aplicar(false);
    }, { passive: false });
    // pinça no celular
    let pin = null;
    vista.addEventListener('touchstart', e => { if (e.touches.length === 2) { const [a, b] = e.touches; pin = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), s: z.s }; pan = null; } }, { passive: true });
    vista.addEventListener('touchmove', e => { if (!pin || e.touches.length !== 2) return; e.preventDefault(); const [a, b] = e.touches; z.s = pin.s * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pin.d; aplicar(false); }, { passive: false });
    vista.addEventListener('touchend', () => { pin = null; });
  }

  function pinosVisiveis(cena, mestre) {
    return (cena?.pinos || []).filter(p => mestre || !p.oculto).map(p => {
      const q = posDe(cena, p), naNevoa = !p.fixo && !revelado(cena.nevoa, +q.x || 50, Math.min(99.9, (+q.y || 50)));
      return mestre ? pinoHTML(p, true, naNevoa, cena) : naNevoa ? '' : pinoHTML(p, false, false, cena, OPT.podeMover(p));
    }).join('');
  }
  // jogador arrasta o próprio agente (ou um pino liberado pelo mestre)
  function ligarArrastoJog(palco, cena) {
    if (palco.dataset.jog === '1') return; palco.dataset.jog = '1';
    let arr = null;
    const pos = e => { const r = palco.getBoundingClientRect(); return [Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)), Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100))]; };
    const repintar = () => { const c = palco._cena || cena; palco.querySelector('.pinos').innerHTML = pinosVisiveis(c, false); };
    palco.addEventListener('pointerdown', e => {
      if (OPT.salvarPos && gestoAlca(e, palco, async g => { const c = palco._cena || cena, p = (c.pinos || []).find(x => x.id === g.id); if (p && g.rot != null) await salvarGiro(c, p, g.rot); })) return;
      const el = e.target.closest('.pino.mov'); if (!el || !OPT.salvarPos) { if (SEL.id && !e.target.closest('.pino')) { SEL.id = null; repintar(); } return; }
      e.preventDefault(); e.stopPropagation(); palco.dataset.ocupado = '1';
      arr = { el, id: el.dataset.pino, x0: e.clientX, y0: e.clientY, moveu: false }; el.setPointerCapture(e.pointerId); el.classList.add('arrastando');
    });
    palco.addEventListener('pointermove', e => {
      if (!arr) return; if (Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) > 4) arr.moveu = true; if (!arr.moveu) return;
      [arr.x, arr.y] = pos(e); arr.el.style.left = arr.x + '%'; arr.el.style.top = arr.y + '%'; avisarMov(arr.id, arr.x, arr.y);
    });
    const soltar = async () => { if (!arr) return; const a = arr; arr = null; a.el.classList.remove('arrastando'); palco.dataset.ocupado = '';
      if (!a.moveu) { SEL.id = SEL.id === a.id ? null : a.id; repintar(); return; } avisarMov(a.id, a.x, a.y, true); await OPT.salvarPos(palco.dataset.cena, a.id, { x: +a.x.toFixed(2), y: +a.y.toFixed(2) }); };
    palco.addEventListener('pointerup', soltar); palco.addEventListener('pointercancel', soltar);
  }

  /* ---------- mapa flutuante: abre por cima de qualquer tela (ficha, mesa), arrasta, aumenta, diminui e fecha no X ---------- */
  const POP = { el: null, unsub: null, chave: '' };
  function fecharPop() { try { POP.unsub?.(); } catch (e) {} POP.unsub = null; POP.el?.remove(); POP.el = null; POP.chave = ''; }
  function abrirMapaFlutuante(col, mesaId) {
    if (typeof db === 'undefined' || !db) return;
    if (POP.el && POP.chave === col + '|' + mesaId) { POP.el.classList.add('pisca'); setTimeout(() => POP.el?.classList.remove('pisca'), 400); return; }
    fecharPop(); POP.chave = col + '|' + mesaId;
    const salvo = (() => { try { return JSON.parse(localStorage.getItem('adr-mapa-pop') || 'null'); } catch (e) { return null; } })() || {};
    const el = document.createElement('section'); el.className = 'mapa-pop'; el.setAttribute('aria-label', 'Mapa da mesa');
    const w = Math.min(salvo.w || 460, innerWidth - 16), x = Math.min(Math.max(8, salvo.x ?? innerWidth - w - 16), innerWidth - 120), y = Math.min(Math.max(8, salvo.y ?? 80), innerHeight - 80);
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px`;
    el.innerHTML = `<header class="mapa-pop-cab"><b>🗺 <span data-pop-tit>Mapa</span></b><span class="btns"><button type="button" data-pop="menos" title="Diminuir" aria-label="Diminuir">−</button><button type="button" data-pop="mais" title="Aumentar" aria-label="Aumentar">+</button><button type="button" data-pop="x" title="Fechar" aria-label="Fechar">✕</button></span></header><div class="mapa-pop-corpo"><div class="vazio">Abrindo o mapa…</div></div>`;
    document.body.appendChild(el); POP.el = el;
    const guardar = () => { const r = el.getBoundingClientRect(); try { localStorage.setItem('adr-mapa-pop', JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) })); } catch (e) {} };
    const tamanho = d => { const r = el.getBoundingClientRect(), nw = Math.min(innerWidth - 16, Math.max(240, r.width * d)); el.style.width = nw + 'px'; if (r.left + nw > innerWidth - 8) el.style.left = Math.max(8, innerWidth - nw - 8) + 'px'; guardar(); };
    el.querySelector('[data-pop="x"]').onclick = fecharPop;
    el.querySelector('[data-pop="mais"]').onclick = () => tamanho(1.25);
    el.querySelector('[data-pop="menos"]').onclick = () => tamanho(0.8);
    // arrastar pelo cabeçalho
    const cab = el.querySelector('.mapa-pop-cab'); let ini = null;
    cab.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; const r = el.getBoundingClientRect(); ini = { dx: e.clientX - r.left, dy: e.clientY - r.top }; cab.setPointerCapture(e.pointerId); });
    cab.addEventListener('pointermove', e => { if (!ini) return; el.style.left = Math.min(innerWidth - 80, Math.max(-el.offsetWidth + 80, e.clientX - ini.dx)) + 'px'; el.style.top = Math.min(innerHeight - 40, Math.max(0, e.clientY - ini.dy)) + 'px'; });
    const soltar = () => { if (ini) { ini = null; guardar(); } }; cab.addEventListener('pointerup', soltar); cab.addEventListener('pointercancel', soltar);
    new ResizeObserver(() => { if (POP.el === el) guardar(); }).observe(el);
    const corpo = el.querySelector('.mapa-pop-corpo');
    POP.unsub = db.doc(`${col}/${mesaId}`).onSnapshot(sn => {
      if (!sn.exists) { corpo.innerHTML = '<div class="vazio">Mesa não encontrada.</div>'; return; }
      const C = { id: mesaId, ...sn.data() }, a = ativoDe(C);
      el.querySelector('[data-pop-tit]').textContent = a ? a.nome : (C.nome || 'Mapa');
      POP.C = C; desenharPop();
    });
    const camp = col.startsWith('campanhas/') ? col.split('/')[1] : '';
    POP.Q = {};
    const desenharPop = () => { if (!POP.C) return; const ex = typeof window.mapaExtra === 'function' ? window.mapaExtra(camp, () => POP.Q, () => desenharPop()) : {}; desenharMapa(corpo, () => POP.C, { mestre: false, ...ex }); };
    if (camp) { const u2 = db.doc(`campanhas/${camp}/quadro/estado`).onSnapshot(sq => { POP.Q = sq.exists ? sq.data() || {} : {}; desenharPop(); }); const u1 = POP.unsub; POP.unsub = () => { u1?.(); u2(); }; }
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-abrir-mapa]'); if (!b) return; e.preventDefault(); const [col, id] = b.dataset.abrirMapa.split('|'); abrirMapaFlutuante(col, id); });

  const css = document.createElement('style');
  css.textContent = `
.mapa-caixa { display: grid; gap: 10px; } .mapa-caixa h3 { margin: 0; font: 400 22px var(--f-disp); }
.mapa-palco { position: relative; overflow: hidden; background: #000; touch-action: none; user-select: none; }
.mapa-palco > img { display: block; width: 100%; height: auto; pointer-events: none; }
.mapa-palco .pinos { position: absolute; inset: 0; }
.pino { position: absolute; transform: translate(-50%, -100%); display: grid; justify-items: center; gap: 2px; z-index: 2; transition: left .25s, top .25s; }
.pino.mov { cursor: grab; } .pino.arrastando { cursor: grabbing; transition: none; z-index: 5; } .pino.oculto { opacity: .55; }
.pino-nome { background: rgba(0,0,0,.82); color: #fff; font: 700 11.5px/1.2 var(--f-body); padding: 2px 7px; border-radius: 6px; border: 1px solid var(--pc); white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.pino-cab { width: calc(34px * var(--tam, 1)); height: calc(34px * var(--tam, 1)); border-radius: 50%; border: 3px solid var(--pc); background: #0b0d14 center/cover no-repeat; display: grid; place-items: center; font-size: calc(17px * var(--tam, 1)); box-shadow: 0 3px 6px rgba(0,0,0,.6); transition: box-shadow .2s; }
.pino.movendo { z-index: 6; transition: left .08s linear, top .08s linear; } .pino.movendo .pino-cab { box-shadow: 0 0 0 3px var(--mv), 0 0 18px 6px var(--mv); animation: pinoLuz 1s ease-in-out infinite; }
@keyframes pinoLuz { 50% { box-shadow: 0 0 0 3px var(--mv), 0 0 28px 10px var(--mv); } }
.pino-quem { background: var(--mv); color: #0b0d14; font: 800 10.5px/1.2 var(--f-body); padding: 1px 6px; border-radius: 999px; white-space: nowrap; }
.mapa-palco .pino.mov { cursor: grab; touch-action: none; }
.pino-alvo { position: relative; display: grid; place-items: center; }
.pino-cab { transform: rotate(var(--rot, 0deg)); }
.pino.travado .pino-cab { cursor: default; } .pino.sem-nome .pino-nome { display: none; } .mapa-palco.modo-mover .pino.sem-nome.sel .pino-nome { display: none; }
.pino.sel { z-index: 7; } .pino.sel .pino-nome { display: none; }
.pino.sel .pino-alvo::before { content: ''; position: absolute; inset: -5px; border: 2px dashed var(--ouro); border-radius: 6px; pointer-events: none; }
.pino-h { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 2px solid #0b0d14; box-shadow: 0 1px 4px rgba(0,0,0,.6); touch-action: none; z-index: 3; }
.pino-h.canto.nw { left: -11px; top: -11px; cursor: nwse-resize; } .pino-h.canto.se { right: -11px; bottom: -11px; cursor: nwse-resize; }
.pino-h.canto.ne { right: -11px; top: -11px; cursor: nesw-resize; } .pino-h.canto.sw { left: -11px; bottom: -11px; cursor: nesw-resize; }
.pino-h.girar { left: 50%; top: -30px; margin-left: -7px; width: 14px; height: 14px; background: var(--ouro); cursor: grab; }
.pino-h.girar::after { content: ''; position: absolute; left: 50%; top: 100%; width: 2px; height: 12px; margin-left: -1px; background: var(--ouro); }
@media (pointer: coarse) { .pino-h { width: 18px; height: 18px; } .pino-h.girar { width: 20px; height: 20px; margin-left: -10px; top: -36px; } }
.pino-barra { position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%); display: flex; gap: 2px; padding: 4px; background: rgba(18,22,36,.96); border: 1px solid var(--linha-2); border-radius: 999px; box-shadow: 0 6px 18px rgba(0,0,0,.6); white-space: nowrap; z-index: 8; }
.pino-barra button { width: 30px; height: 30px; border: 0; border-radius: 50%; background: transparent; color: var(--lua); font: 700 14px/1 var(--f-body); cursor: pointer; display: grid; place-items: center; }
.pino-barra button:hover { background: var(--painel-3); } .pino-barra button.on { background: var(--ouro); color: #0b0d14; }
.pino-ics { display: flex; flex-wrap: wrap; gap: 4px; } .pino-ics button { font-size: 20px; width: 38px; height: 38px; border: 1px solid var(--linha-2); background: var(--painel-2); cursor: pointer; } .pino-ics button.aqui { background: var(--ouro); }

.mapa-cenas { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 8px; }
.cena-tab { flex: none; position: relative; width: 140px; height: 64px; border: 1px solid var(--linha-2); border-radius: 10px; cursor: pointer; overflow: hidden; display: grid; align-content: end; justify-items: start; padding: 6px 8px; color: #fff; text-align: left;
  background: linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.8)), var(--ci, linear-gradient(135deg, #3a2a2c, #120607)) center/cover; }
.cena-tab b { font-size: 13px; text-shadow: 0 1px 3px #000; line-height: 1.1; } .cena-tab small { font-size: 10.5px; color: #8ff0c4; text-shadow: 0 1px 2px #000; }
.cena-tab.aqui { outline: 3px solid var(--ouro); outline-offset: -3px; } .cena-tab.ativa::after { content: ''; position: absolute; top: 6px; right: 6px; width: 9px; height: 9px; border-radius: 50%; background: #3ddc84; box-shadow: 0 0 8px #3ddc84; }
.cena-tab.nova { width: 90px; place-content: center; justify-items: center; background: var(--painel-2); color: var(--lua-dim); font-weight: 800; }
.mapa-ferr { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.mapa-ferr .seg { display: inline-flex; border: 1px solid var(--linha-2); border-radius: 8px; overflow: hidden; }
.mapa-ferr .seg button { background: var(--painel-2); border: 0; border-right: 1px solid #000; padding: 6px 10px; font-weight: 800; color: var(--lua-dim); cursor: pointer; } .mapa-ferr .seg button:last-child { border-right: 0; }
.mapa-ferr .seg button.aqui { background: var(--ouro); color: #1a0f05; }
.mapa-ferr .pincel { display: flex; gap: 6px; align-items: center; font-size: 12px; color: var(--lua-dim); }
.mapa-palco .nevoa { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.mapa-palco .nevoa.jog { filter: blur(10px); transform: scale(1.03); }
.mapa-palco .pinos { z-index: 2; }
.mapa-palco.modo-revelar, .mapa-palco.modo-cobrir { cursor: crosshair; } .mapa-palco.modo-revelar .pino, .mapa-palco.modo-cobrir .pino { pointer-events: none; }
.pino.na-nevoa { opacity: .5; filter: grayscale(.6); }
.mapa-vista { position: relative; overflow: hidden; border: 1px solid var(--linha-2); border-radius: 10px; background: #000; touch-action: pan-y; }
.mapa-vista.ampliado { touch-action: none; cursor: grab; } .mapa-vista.arrastando { cursor: grabbing; } .mapa-vista.focando, .mapa-vista.focando .pino { cursor: zoom-in; }
.mapa-vista .mapa-palco { border: 0; border-radius: 0; transform-origin: 0 0; will-change: transform; }
.mapa-vista .pino { transform: translate(-50%, -100%) scale(var(--zs, 1)); transform-origin: 50% 100%; }
.mapa-zoom { position: absolute; right: 8px; top: 8px; z-index: 4; display: flex; gap: 4px; align-items: center; padding: 4px; background: rgba(0,0,0,.72); border: 1px solid var(--linha-2); border-radius: 10px; }
.mapa-zoom button { width: 32px; height: 32px; border: 1px solid var(--linha-2); border-radius: 8px; background: var(--painel-3); color: #fff; font: 800 16px/1 sans-serif; cursor: pointer; display: grid; place-items: center; }
.mapa-zoom button:hover { background: var(--ouro); color: #1a0f05; } .mapa-zoom button.aqui { background: var(--ouro); color: #1a0f05; box-shadow: 0 0 10px var(--ouro); }
.mapa-zoom [data-z-n] { font: 800 11px var(--f-mono); color: #fff; min-width: 30px; text-align: center; }
.mapa-zoom-lista { position: absolute; right: 8px; top: 52px; z-index: 4; display: grid; gap: 4px; max-height: calc(100% - 60px); min-width: 150px; overflow-y: auto; padding: 6px; background: rgba(8,6,6,.94); border: 1px solid var(--linha-2); border-radius: 10px; }
.mapa-zoom-lista button { display: flex; gap: 6px; align-items: center; text-align: left; padding: 6px 8px; border: 1px solid #000; border-radius: 7px; background: var(--painel-2); color: #fff; font-weight: 700; cursor: pointer; } .mapa-zoom-lista button:hover { background: var(--ouro); color: #1a0f05; }
.mapa-pop-corpo .mapa-zoom button { width: 28px; height: 28px; font-size: 14px; }
.npc-escolha { display: grid; gap: 6px; max-height: 50vh; overflow-y: auto; }
.npc-op { display: flex; gap: 10px; align-items: center; padding: 6px 10px; border: 1px solid var(--linha-2); border-radius: 10px; background: var(--painel); cursor: pointer; }
.npc-op:has(input:checked:not(:disabled)) { border-color: var(--ouro); background: color-mix(in srgb, var(--ouro) 18%, var(--painel)); }
.npc-op.ja { opacity: .55; cursor: default; } .npc-op > span:last-child { display: grid; } .npc-op small { font-size: 11.5px; color: var(--lua-faint); } .npc-op small.sus { color: var(--sangue); font-weight: 800; }
.npc-op .foto-s.p { width: 44px; height: 44px; font-size: 15px; }
.mapa-pop { position: fixed; z-index: 95; display: grid; grid-template-rows: auto 1fr; min-width: 240px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); background: var(--painel-2); border: 1px solid var(--linha-2); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,.7); overflow: hidden; resize: horizontal; transition: box-shadow .2s; }
.mapa-pop.pisca { box-shadow: 0 0 0 3px var(--ouro); }
.mapa-pop-cab { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 8px 6px 12px; background: var(--painel-3); border-bottom: 2px solid #000; cursor: move; touch-action: none; user-select: none; }
.mapa-pop-cab b { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mapa-pop-cab button { width: 30px; height: 30px; border: 1px solid var(--linha-2); border-radius: 8px; background: var(--painel-3); color: #fff; font: 800 16px/1 sans-serif; cursor: pointer; }
.mapa-pop-cab button[data-pop="x"] { background: var(--sangue); }
.mapa-pop-corpo { overflow: auto; } .mapa-pop-corpo .caixa { border: 0; border-radius: 0; box-shadow: none; margin: 0; padding: 8px; } .mapa-pop-corpo .mapa-caixa > .btns { display: none; }
.mapa-pop-corpo .mapa-caixa > p.tag { display: none; }`;
  document.head.appendChild(css);
  window.desenharMapa = desenharMapa; window.abrirMapaFlutuante = abrirMapaFlutuante;
})();
