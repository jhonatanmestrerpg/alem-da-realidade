/* =================================================================
   Mapa da mesa: cenas salvas (vários mapas), troca rápida, pinos e névoa.
   A Diretora/Mestre prepara cada cena, escolhe qual a mesa vê e revela
   o mapa aos poucos com o pincel de sombreamento.
   Usa os globais da página: esc, toast, abrirModal, confirmar, enviarImagem, iniciais, ESP.
   Dados no documento da mesa: mapas: [{ id, nome, img, pinos, nevoa: { on, cols, rows, v } }], mapaAtivo
   ================================================================= */
'use strict';
(() => {
  const T = {}; const rotulos = () => Object.assign(T, window.MAPA_ROTULOS ? window.MAPA_ROTULOS : window.CLASSICO ? { dir: 'Diretora', ass: 'Assassino', quem: 'Sobreviventes', a: 'a' } : { dir: 'Mestre', ass: 'Culpado', quem: 'Detetives', a: 'o' });
  const ICONES = ['alfinete', 'pessoas', 'faca', 'gota', 'caveira', 'mascara', 'fantasma', 'lanterna', 'chave', 'porta', 'carro', 'casa', 'vela', 'machado', 'armadilha', 'olho', 'alvo', 'cadeado', 'documento', 'caixa', 'coracao', 'estrela', 'raio', 'dado', 'cadeira', 'bomba', 'ovo', 'frasco'];
  // pinos antigos guardaram emoji: cada um vira o desenho mais parecido
  const EMO = { '📍': 'alfinete', '🔪': 'faca', '🩸': 'gota', '💀': 'caveira', '👻': 'fantasma', '🔦': 'lanterna', '🗝️': 'chave', '🗝': 'chave', '🚪': 'porta', '🚗': 'carro', '🏚️': 'casa', '🏚': 'casa', '⛪': 'casa', '🏥': 'casa', '🎭': 'mascara', '🕯️': 'vela', '🕯': 'vela', '📜': 'documento', '🔮': 'olho', '⚰️': 'caixa', '🧿': 'olho', '🐺': 'caveira', '🦇': 'fantasma', '🕷️': 'armadilha', '🧟': 'caveira', '⭐': 'estrela', '❤️': 'coracao', '🛡️': 'cadeado', '📦': 'caixa', '☠️': 'caveira', '🪓': 'machado', '🕵️': 'pessoas', '🐾': 'alvo', '🧪': 'frasco', '🔥': 'raio', '💧': 'gota', '⚡': 'raio' };
  const REGUA = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.8 16.2 16.2 2.8l5 5L7.8 21.2zM6.4 12.6l1.8 1.8M8.9 10.1l1.2 1.2M11.4 7.6l1.8 1.8M13.9 5.1l1.2 1.2"/></svg>';
  const icPino = v => v === 'regua' ? REGUA : (window.IC && IC(EMO[v] || v)) || esc(v || '');
  const TEMA = () => window.MAPA_TEMA || 'brutal';
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
  const OPT = { getPos: () => ({}), podeMover: () => false, salvarPos: null, eu: null, sala: '', vivo: null };
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
    let q = el.querySelector('.pino-quem'); if (!q) { q = document.createElement('span'); q.className = 'pino-quem'; el.prepend(q); } q.innerHTML = icPino('mao') + ' ' + esc(m.nome || 'Alguém');
    clearTimeout(el._luz); el._luz = setTimeout(() => { el.classList.remove('movendo'); q.remove(); }, 4000);
  }
  let ultimoEnvio = 0;
  // quem arrasta também vê a própria luz (igual a mesa vê), e a mesa recebe pelo canal
  const avisarMov = (pino, x, y, fim) => { const m = { pino, x: +x.toFixed(2), y: +y.toFixed(2), fim: !!fim, nome: OPT.eu?.nome || 'Alguém', cor: OPT.eu?.cor || '#3ddc84' };
    document.querySelectorAll(`.mapa-palco [data-pino="${CSS.escape(pino)}"]`).forEach(el => luz(el, m));
    const ch = canal(OPT.sala); if (!ch) return; const agora = Date.now(); if (!fim && agora - ultimoEnvio < 70) return; ultimoEnvio = agora;
    Promise.resolve(ch.send({ type: 'broadcast', event: 'mv', payload: m })).catch(() => {}); };

  /* ---------- grade: todo mapa tem; cada quadro vale ~1,5 m; os bonecos ficam dentro dos quadros ----------
     cena.grade = { px, ox, oy, W, H, ver, auto } em pixels da imagem original. Se o mapa já vem com grade
     desenhada, ela é detectada e a nossa assenta em cima dela. */
  const METROS = 1.5;
  // cada cena escolhe quanto vale um quadro (ex.: Little Fears com bonecos de 30 cm num mundo gigante)
  const metrosDe = cena => { const m = +cena?.grade?.m; return m > 0 ? m : METROS; };
  const fmtM = v => v < 1 ? `${Math.round(v * 100)} cm` : `${(Math.round(v * 100) / 100).toString().replace('.', ',')} m`;
  const gradeDe = cena => { const g = cena?.grade; return g && +g.px > 2 && +g.W > 0 && +g.H > 0 ? g : null; };
  const gradePadrao = (W, H) => ({ px: +(Math.max(W, H) / 24).toFixed(2), ox: 0, oy: 0, W, H, ver: true, auto: false });
  function encaixar(g, x, y, tam = 1) {
    const n = Math.max(1, Math.round(+tam || 1)), px = +g.px, X = x / 100 * g.W, Y = y / 100 * g.H;
    const ox = ((+g.ox % px) + px) % px, oy = ((+g.oy % px) + px) % px;
    const cmax = Math.max(0, Math.floor((g.W - ox) / px) - n), rmax = Math.max(0, Math.floor((g.H - oy) / px) - n);
    const c = Math.min(cmax, Math.max(0, Math.round((X - ox) / px - n / 2))), r = Math.min(rmax, Math.max(0, Math.round((Y - oy) / px - n / 2)));
    return [+((ox + (c + n / 2) * px) / g.W * 100).toFixed(3), +((oy + (r + n / 2) * px) / g.H * 100).toFixed(3)];
  }
  function gradeSVG(g) {
    if (!g || g.ver === false) return '';
    const px = +g.px, ox = ((+g.ox % px) + px) % px, oy = ((+g.oy % px) + px) % px; let d = '';
    for (let x = ox; x <= g.W + .5; x += px) d += `M${x.toFixed(1)} 0V${g.H}`;
    for (let y = oy; y <= g.H + .5; y += px) d += `M0 ${y.toFixed(1)}H${g.W}`;
    return `<svg class="mapa-grade ${g.auto ? 'sobre' : ''}" viewBox="0 0 ${g.W} ${g.H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" class="gl-e"/><path d="${d}" class="gl-c"/></svg>`;
  }
  // acha a grade que já está desenhada na imagem (perfil de linhas finas + periodicidade)
  const DETECT = {};
  function detectarGrade(url) {
    if (DETECT[url]) return DETECT[url];
    return DETECT[url] = new Promise(res => {
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => {
        const W = im.naturalWidth, H = im.naturalHeight, base = gradePadrao(W, H);
        try {
          const k = Math.min(1, 1800 / Math.max(W, H)), w = Math.max(8, Math.round(W * k)), h = Math.max(8, Math.round(H * k));
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0, w, h);
          const d = cx.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
          for (let i = 0; i < w * h; i++) L[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
          const col = new Float32Array(w), lin = new Float32Array(h);
          for (let y = 0; y < h; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, v = Math.abs(2 * L[i] - L[i - 1] - L[i + 1]); col[x] += v; }
          for (let y = 1; y < h - 1; y++) for (let x = 0; x < w; x++) { const i = y * w + x, v = Math.abs(2 * L[i] - L[i - w] - L[i + w]); lin[y] += v; }
          const realce = P => { const n = P.length, o = new Float32Array(n), R = 6; let acc = 0; const pre = new Float32Array(n + 1); for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + P[i];
            for (let i = 0; i < n; i++) { const a = Math.max(0, i - R), b = Math.min(n, i + R + 1), m = (pre[b] - pre[a]) / (b - a); o[i] = Math.max(0, P[i] - m); acc += o[i]; } o.media = acc / n || 1; return o; };
          // para cada período (fracionário) e fase: que fração dos pontos da rede cai numa linha forte?
          const periodo = P => { const n = P.length, ord = Float32Array.from(P).sort(), lim = Math.max(1e-6, ord[Math.floor(n * .9)]), Tmax = Math.min(n / 6, 420);
            const forte = new Uint8Array(n); for (let i = 1; i < n - 1; i++) forte[i] = (P[i - 1] > lim || P[i] > lim || P[i + 1] > lim) ? 1 : 0;
            const nota = T => { let best = 0, fase = 0, soma = 0; for (let f = 0; f < T; f++) { let h = 0, c = 0, s2 = 0; for (let p = f; p < n - 1; p += T) { const i = Math.round(p); h += forte[i]; s2 += P[i]; c++; } if (c < 6) continue; const r = h / c; if (r > best || (r === best && s2 > soma)) { best = r; fase = f; soma = s2; } } return [best, fase]; };
            const L = []; for (let T = 8; T <= Tmax; T += .25) { const [h, f] = nota(T); L.push([T, h, f]); }
            if (!L.length) return null;
            const max = Math.max(...L.map(x => x[1])); if (max < .72) return null;
            const ok = L.filter(x => x[1] >= Math.max(.72, max * .92)); let [T, h] = ok[0];
            // afina o período em volta do escolhido
            const [, f0] = nota(T); let fino = [-1, T, f0];
            for (let t = T - .45; t <= T + .45; t += .01) for (let f = f0 - 2; f <= f0 + 2; f += .25) { if (f < 0) continue; let s2 = 0, c = 0; for (let p = f; p < n - 1; p += t) { s2 += P[Math.round(p)]; c++; } const m = s2 / c; if (m > fino[0]) fino = [m, t, f]; }
            return { nota: h, T: fino[1], fase: fino[2] }; };
          const a = periodo(realce(col)), b = periodo(realce(lin));
          if (a && b && Math.abs(a.T - b.T) / Math.max(a.T, b.T) < .06) {
            const T = (a.T + b.T) / 2 / k; return res({ px: +T.toFixed(2), ox: +(a.fase / k).toFixed(2), oy: +(b.fase / k).toFixed(2), W, H, ver: false, auto: true });
          }
        } catch (e) { /* imagem sem CORS: fica a grade padrão */ }
        res(base);
      };
      im.onerror = () => res(null);
      im.src = url;
    });
  }
  window.detectarGrade = detectarGrade;
  const cel = (palco, g) => { if (!palco || !g) return; palco.style.setProperty('--cel', (palco.clientWidth * g.px / g.W).toFixed(2) + 'px'); };
  /* grupos de cenas (ex.: Nave › Ponte, Hangar). cena.grupo guarda o nome; abrir e fechar fica salvo neste aparelho */
  const gruposDe = cenas => { const m = new Map(); cenas.forEach(c => { const g = (c.grupo || '').trim(); if (!g) return; if (!m.has(g)) m.set(g, []); m.get(g).push(c); }); return [...m]; };
  const assinaCenas = cenas => cenas.map(c => c.id + ':' + (c.grupo || '') + ':' + c.nome + ':' + (c.img ? 1 : 0)).join('|');
  const chaveFech = id => 'mapa-grupos-fechados:' + id;
  const gruposFechados = id => { try { return new Set(JSON.parse(localStorage.getItem(chaveFech(id)) || '[]')); } catch (e) { return new Set(); } };
  const guardarFechados = (id, set) => { try { localStorage.setItem(chaveFech(id), JSON.stringify([...set])); } catch (e) {} };
  const SEL = { id: null }; // token selecionado (alças de tamanho e giro, barra do mestre)
  const rotDe = (cena, p) => { const o = OPT.getPos()?.[cena?.id]?.[p.id]; return o && o.rot != null ? +o.rot : +p.rot || 0; };
  const BARRA = [['vis', 'olho', 'Mostrar ou esconder da mesa'], ['trava', 'cadeado', 'Travar ou destravar'], ['frente', '⬆', 'Trazer para a frente'], ['tras', '⬇', 'Mandar para trás'], ['dup', '⧉', 'Duplicar'], ['nome', 'Aa', 'Mostrar ou esconder o nome'], ['medir', 'regua', 'Medir distância'], ['del', 'lixeira', 'Apagar'], ['mais', '⋯', 'Editar tudo']];
  const pinoHTML = (p0, mestre, escondido, cena, movel) => { const v = p0.ficha && OPT.vivo ? OPT.vivo(p0) : null, p = v ? { ...p0, nome: v.nome || p0.nome, foto: v.foto || p0.foto, cor: v.cor || p0.cor } : p0; const q0 = posDe(cena, p), g0 = gradeDe(cena), q = g0 ? (([x, y]) => ({ x, y }))(encaixar(g0, +q0.x || 50, +q0.y || 50, p.tam)) : q0, r = REMOTO[p.id] && Date.now() - REMOTO[p.id].t < 4000 ? REMOTO[p.id] : null, sel = SEL.id === p.id && (mestre || movel);
    return `<div class="pino ${p.oculto ? 'oculto' : ''} ${escondido ? 'na-nevoa' : ''} ${(mestre || movel) && !(p.travado && !mestre) ? 'mov' : ''} ${p.travado ? 'travado' : ''} ${r ? 'movendo' : ''} ${sel ? 'sel' : ''} ${p.semNome ? 'sem-nome' : ''}" data-pino="${esc(p.id)}" style="left:${+q.x || 50}%;top:${+q.y || 50}%;--pc:${esc(p.cor || '#c4000d')};--tam:${+p.tam || 1};--rot:${rotDe(cena, p)}deg${r ? `;--mv:${esc(r.cor)}` : ''}" title="${esc(p.nome)}">${r ? `<span class="pino-quem"><i data-ic="mao"></i> ${esc(r.nome)}</span>` : ''}
    <span class="pino-nome">${esc(p.nome)}${p.oculto ? ' ' + icPino('olhoCortado') : ''}${p.travado ? ' ' + icPino('cadeado') : ''}${escondido ? ' ' + icPino('nevoa') : ''}</span><span class="pino-alvo"><span class="pino-cab" style="${p.foto ? `background-image:url('${esc(p.foto)}')` : ''}">${p.foto ? '' : icPino(p.ic || 'alfinete')}</span>${sel ? `<span class="pino-h girar" data-h="girar" title="Girar (Shift: de 15 em 15°)"></span>${mestre ? ['nw', 'ne', 'sw', 'se'].map(c => `<span class="pino-h canto ${c}" data-h="tam" title="Arraste para aumentar ou diminuir"></span>`).join('') : ''}` : ''}</span>
    ${sel && mestre ? `<div class="pino-barra">${BARRA.map(([k, ic, t]) => `<button type="button" data-pb="${k}" title="${t}" aria-label="${t}" class="${(k === 'vis' && p.oculto) || (k === 'trava' && p.travado) || (k === 'nome' && p.semNome) ? 'on' : ''}">${icPino(ic)}</button>`).join('')}</div>` : ''}<button type="button" class="pino-medir" data-medir="${esc(p.id)}" title="Medir distância" aria-label="Medir distância a partir de ${esc(p.nome || 'este token')}">${REGUA}</button></div>`; };
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

  /* ---------- Brutal: posições num documento da mesa que os jogadores podem gravar ({mesas}/{id}/mapa/pos) ---------- */
  const SITE = /\/starwars\//.test(location.pathname) ? ['sw-mesas', 'sw-personagens'] : /\/oblivio\//.test(location.pathname) ? ['obl-mesas', 'obl-personas'] : /\/invazores\//.test(location.pathname) ? ['inv-mesas', 'inv-negociantes'] : /\/colonia\//.test(location.pathname) ? ['col-mesas', 'col-protagonistas'] : /\/cthulhu\//.test(location.pathname) ? ['coc-mesas', 'coc-investigadores'] : /\/fate\//.test(location.pathname) ? ['fate-mesas', 'fate-personagens'] : /\/botoes\//.test(location.pathname) ? ['eb-mesas', 'eb-funcionarios'] : /\/medos\//.test(location.pathname) ? ['lf-mesas', 'lf-criancas'] : /\/scp\//.test(location.pathname) ? ['scp-mesas', 'scp-agentes'] : /\/bichos\//.test(location.pathname) ? ['bichos-casos', 'bichos-detetives'] : ['brutal-mesas', 'brutal-sobreviventes'];
  const POS = {}; // mesa -> { dados, un, redes: Set }
  const MEUS = { ids: new Set(), quem: null, carregando: false };
  const euAgora = () => (typeof ME !== 'undefined' ? ME : null);
  const corUid = u => { let h = 0; for (const c of String(u || 'x')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 75% 60%)`; };
  function autoOpts(mesaId, mestre, refazer) {
    const me = euAgora(); if (!me || typeof db === 'undefined' || !db || !mesaId) return {};
    if (MEUS.quem !== me && !MEUS.carregando) { MEUS.carregando = true; MEUS.quem = me; db.collection(SITE[1]).where('dono', '==', me).get().then(sn => { MEUS.ids = new Set(sn.docs.map(d => d.id)); MEUS.carregando = false; refazer(); }).catch(() => { MEUS.carregando = false; }); }
    let P = POS[mesaId];
    if (!P) { P = POS[mesaId] = { dados: {}, refazer: null };
      P.un = db.doc(`${SITE[0]}/${mesaId}/mapa/pos`).onSnapshot(sn => { P.dados = sn.exists ? sn.data() : {}; const f = P.refazer; if (f) setTimeout(() => { try { f(); } catch (e) {} }, 0); }, () => {}); }
    P.refazer = refazer;
    return {
      getPos: () => P.dados.pinos || {},
      podeMover: p => mestre || !!p.livre || (!!p.ficha && MEUS.ids.has(p.ficha)),
      eu: { nome: mestre ? (typeof MEU_NOME !== 'undefined' && MEU_NOME ? MEU_NOME + ' (mestre)' : 'Mestre') : (typeof MEU_NOME !== 'undefined' && MEU_NOME) || 'Alguém', cor: mestre ? 'var(--ambar)' : corUid(me) },
      sala: SITE[0] + '-' + mesaId,
      salvarPos: async (cena, pino, xy) => {
        const v = { ...xy, t: Date.now(), uid: me }, pins = JSON.parse(JSON.stringify(P.dados.pinos || {}));
        pins[cena] = { ...(pins[cena] || {}), [pino]: { ...(pins[cena]?.[pino] || {}), ...v } };
        P.dados = { ...P.dados, pinos: pins }; await db.doc(`${SITE[0]}/${mesaId}/mapa/pos`).set({ pinos: pins });
      },
    };
  }

  /* ---------- quem é: tocar num pino mostra quem ele é ---------- */
  const ID = { opts: null, getC: null, mestre: false };
  const linhaVida = x => [['est', 'lim', 'Estresse'], ['dano', 'fer', 'Ferimentos'], ['fer', 'ferMax', 'Ferimentos'], ['pv', 'pvMax', 'PV'], ['vida', 'vidaMax', 'Vida'], ['estresse', 'estresseMax', 'Estresse']]
    .filter(([a, b]) => x && x[a] != null && x[b] != null && typeof x[a] !== 'object').map(([a, b, n]) => `${n} ${x[a]}/${x[b]}`)[0] || '';
  function idDe(p) {
    const C = ID.getC?.() || {}, o = ID.opts || {}, m = ID.mestre;
    const v = p.ficha && OPT.vivo ? OPT.vivo(p) : null, det = p.ficha ? (o.DETS || []).find(f => f.id === p.ficha) : null;
    if (p.ficha) { const f = { ...(det || {}), ...(v || {}) }; return { tipo: T.quem ? T.quem.replace(/s$/, '') : 'Personagem', nome: f.nome || p.nome, foto: f.foto || p.foto, linhas: [f.donoNome ? 'Jogado por ' + f.donoNome : '', f.papel || f.classe || '', f.fora ? 'Fora de cena' : ''].filter(Boolean), txt: p.desc || '' }; }
    if (p.npc) { const n = (C.npcs || []).find(x => x.id === p.npc) || {}, sus = (C.suspeitos || []).some(x => x.id === p.npc || x.npc === p.npc);
      return { tipo: sus ? 'NPC · Suspeito' : 'NPC', nome: n.nome || p.nome, foto: n.foto || p.foto, linhas: [n.papel || ''].filter(Boolean), txt: [p.desc, n.txt].filter(Boolean).join('\n'), sec: m ? n.segredo || '' : '' }; }
    if (p.ameaca || p.assassino) { const a = (o.ameacas || []).find(x => x.id === (p.ameaca || 'principal')) || {};
      return { tipo: a.tipo || T.ass, nome: a.nome || p.nome, foto: a.foto || p.foto, linhas: m ? [a.vida || linhaVida(a), a.fora ? 'Fora de combate' : ''].filter(Boolean) : [], txt: p.desc || '', sec: m ? a.txt || '' : '' }; }
    return { tipo: 'Marcador', nome: p.nome, foto: p.foto, linhas: [], txt: p.desc || '' };
  }
  function mostrarId(raiz, cena, pid) {
    const box = raiz.closest('.mapa-caixa')?.querySelector('.mapa-id'); if (!box) return;
    const p = (cena?.pinos || []).find(x => x.id === pid);
    if (!p || box.dataset.pino === pid && !box.hidden) { box.hidden = true; box.dataset.pino = ''; return; }
    const q = idDe(p); box.dataset.pino = pid; box.hidden = false; box.style.setProperty('--pc', p.cor || '#c4000d');
    box.innerHTML = `<span class="mi-foto" style="${q.foto ? `background-image:url('${esc(q.foto)}')` : ''}">${q.foto ? '' : icPino(p.ic || 'alfinete')}</span>
      <div class="mi-txt"><small>${esc(q.tipo)}${ID.mestre && p.oculto ? ' · escondido da mesa' : ''}</small><b>${esc(q.nome || 'Sem nome')}</b>${q.linhas.map(l => `<span>${esc(l)}</span>`).join('')}${q.txt ? `<p>${esc(q.txt).replace(/\n/g, '<br>')}</p>` : ''}${q.sec ? `<p class="mi-sec">${esc(q.sec)}</p>` : ''}</div>
      <div class="mi-acoes"><button type="button" class="btn mini sec" data-mi-medir>${REGUA} Medir distância</button><button type="button" class="mi-x" aria-label="Fechar">×</button></div>`;
    box.querySelector('[data-mi-medir]').onclick = () => { const v = box.closest('.mapa-caixa')?.querySelector('.mapa-vista'); box.hidden = true; box.dataset.pino = ''; v?._medir?.(pid); };
    box.querySelector('.mi-x').onclick = () => { box.hidden = true; box.dataset.pino = ''; };
  }
  function desenharMapa(A, getC, opts) {
    if (!opts.getPos) { const C0 = getC() || {}, mid = C0.id || (location.hash.match(/(?:escudo|caso|mesa)-([^/?#]+)/) || [])[1]; opts = { ...opts, ...autoOpts(mid, !!opts.mestre, () => { if (A.isConnected) desenharMapa(A, getC, opts.__orig || opts); }), __orig: opts }; }
    const { mestre, salvarC, DETS = [], E = null, getPos, podeMover, salvarPos, eu, sala } = opts;
    rotulos(); Object.assign(ID, { opts, getC, mestre: !!mestre }); Object.assign(OPT, { getPos: getPos || (() => ({})), podeMover: podeMover || (() => false), salvarPos: salvarPos || null, eu: eu || null, sala: sala || '', vivo: opts.vivo || OPT.vivo || null }); canal(OPT.sala);
    const C = getC(), cenas = cenasDe(C), ativo = ativoDe(C), mesaId = C.id || C.nome || 'm';
    const ui = UI[mesaId] = UI[mesaId] || { ver: null, modo: 'mover', pincel: 2 };
    if (!mestre) ui.ver = null;
    const cena = (mestre && cenas.find(x => x.id === ui.ver)) || ativo;
    if (mestre && cena) ui.ver = cena.id;
    const palco0 = A.querySelector('.mapa-palco');
    if (palco0?.dataset.ocupado === '1') return; // pintando ou arrastando: não redesenha por cima
    // atualização leve: mesma cena e mesma imagem, só pinos e névoa
    // jogador não tem a fileira de cenas: para ele basta ser a mesma cena e a mesma imagem
    if (palco0 && palco0.dataset.cena === (cena?.id || '') && palco0.dataset.img === (cena?.img || '') && (!mestre || (A.querySelector('.mapa-cenas')?.dataset.n === assinaCenas(cenas) && A.querySelector('[data-ativo]')?.dataset.ativo === (ativo?.id || '')))) {
      palco0._cena = cena; const gl = gradeDe(cena), gk = JSON.stringify(gl || 0); if (palco0.dataset.gk !== gk) { palco0.dataset.gk = gk; palco0.classList.toggle('com-grade', !!gl); palco0.querySelector('.mapa-grade-w').innerHTML = gradeSVG(gl); cel(palco0, gl); const es = A.querySelector('.mapa-escala'); if (es) es.textContent = '▢ ' + fmtM(metrosDe(cena)); }
      palco0.querySelector('.pinos').innerHTML = pinosVisiveis(cena, mestre);
      pintarNevoa(palco0.querySelector('.nevoa'), cena.nevoa, mestre); return;
    }
    const ehAtivo = cena && ativo && cena.id === ativo.id;
    const fech = gruposFechados(mesaId);
    if (A.offsetHeight) { const h0 = A.offsetHeight; A.style.minHeight = h0 + 'px'; setTimeout(() => { A.style.minHeight = ''; }, 1500); }
    A.innerHTML = `<div class="caixa bloco mapa-caixa">
      ${mestre ? `<div class="mapa-cenas" data-n="${esc(assinaCenas(cenas))}"><span data-ativo="${esc(ativo?.id || '')}" hidden></span>
        ${(() => { const tab = c => `<button type="button" class="cena-tab ${c.id === cena?.id ? 'aqui' : ''} ${c.id === ativo?.id ? 'ativa' : ''}" data-cena="${esc(c.id)}" style="${c.img ? `--ci:url('${esc(c.img)}')` : ''}" title="${c.id === ativo?.id ? 'A mesa está vendo esta' : 'Só você está vendo'}"><b>${esc(c.nome)}</b>${c.id === ativo?.id ? '<small><i data-ic="olho"></i> a mesa vê</small>' : ''}</button>`;
          const gs = gruposDe(cenas), soltas = cenas.filter(c => !(c.grupo || '').trim());
          return `${gs.length > 1 ? `<div class="cg-topo"><button type="button" class="btn mini sec" data-cg-todos="0">Fechar todos</button><button type="button" class="btn mini sec" data-cg-todos="1">Abrir todos</button></div>` : ''}
          ${gs.map(([g, l]) => { const f = fech.has(g), tem = l.some(c => c.id === cena?.id), vê = l.some(c => c.id === ativo?.id);
            return `<div class="cena-grupo ${f ? 'fechado' : ''}" data-cg="${esc(g)}"><div class="cg-cab"><button type="button" class="cg-nome" data-cg-alt="${esc(g)}" aria-expanded="${!f}"><span class="cg-seta" aria-hidden="true">▸</span><b>${esc(g)}</b><small>${l.length} ${l.length === 1 ? 'cena' : 'cenas'}</small>${vê ? '<small class="cg-ve"><i data-ic="olho"></i> a mesa vê</small>' : ''}${tem && f ? '<small class="cg-aqui">você está aqui</small>' : ''}</button><button type="button" class="cg-mais" data-cg-ed="${esc(g)}" aria-label="Editar o grupo ${esc(g)}">⋯</button></div>
              ${f ? '' : `<div class="cg-cenas">${l.map(tab).join('')}<button type="button" class="cena-tab nova" data-m="nova" data-cg-novo="${esc(g)}" title="Nova cena neste grupo">＋ Cena</button></div>`}</div>`; }).join('')}
          <div class="cg-cenas cg-soltas">${soltas.map(tab).join('')}<button type="button" class="cena-tab nova" data-m="nova" title="Nova cena">＋ Cena</button><button type="button" class="cena-tab nova grupo" data-m="novogrupo" title="Novo grupo de cenas">＋ Grupo</button></div>`; })()}</div>` : ''}
      <div class="btns" style="justify-content:space-between;align-items:center"><h3><i data-ic="mapa"></i> ${cena ? esc(cena.nome) : 'Mapa'}${mestre && cena && !ehAtivo ? ' <span class="tag">só você vê</span>' : ''}</h3>
        ${mestre && cena ? `<div class="btns">${ehAtivo ? '' : '<button class="btn mini perigo" data-m="mostrar"><i data-ic="olho"></i> Mostrar para a mesa</button>'}<button class="btn mini sec" data-m="img">${cena.img ? 'Trocar imagem' : 'Subir imagem'}</button><button class="btn mini sec" data-m="ren">Renomear</button><button class="btn mini sec" data-m="grupo">${cena.grupo ? 'Grupo: ' + esc(cena.grupo) : 'Pôr em grupo'}</button><button class="btn mini sec" data-m="dup">Duplicar</button><button class="btn mini sec" data-m="apagar">Apagar cena</button></div>` : ''}</div>
      ${mestre && cena?.img ? `<div class="mapa-ferr">
          <span class="seg"><button type="button" data-modo="mover" class="${ui.modo === 'mover' ? 'aqui' : ''}"><i data-ic="mao"></i> Pinos</button><button type="button" data-modo="revelar" class="${ui.modo === 'revelar' ? 'aqui' : ''}"><i data-ic="lanterna"></i> Revelar</button><button type="button" data-modo="cobrir" class="${ui.modo === 'cobrir' ? 'aqui' : ''}"><i data-ic="nevoa"></i> Cobrir</button></span>
          <label class="pincel" ${ui.modo === 'mover' ? 'hidden' : ''}>Pincel <input type="range" min="0" max="5" step="1" value="${ui.pincel}" data-pincel></label>
          <span class="btns">${cena.nevoa?.on ? '<button class="btn mini sec" data-m="tudo1">Revelar tudo</button><button class="btn mini sec" data-m="tudo0">Cobrir tudo</button><button class="btn mini sec" data-m="semnevoa">Tirar névoa</button>' : '<button class="btn mini" data-m="comnevoa"><i data-ic="nevoa"></i> Ligar névoa</button>'}
          <button class="btn mini ${ui.gradeCtl ? '' : 'sec'}" data-m="grade" title="Tamanho e posição dos quadros">▦ Grade</button><button class="btn mini sec" data-m="sobs">+ ${T.quem}</button><button class="btn mini sec" data-m="npc">+ NPC</button><button class="btn mini sec" data-m="ass" title="Coloca no mapa as ameaças que estão no combate">+ ${T.ass}</button><button class="btn mini sec" data-m="novo">+ Pino</button></span></div>` : ''}
      ${mestre && cena?.img && ui.gradeCtl ? (() => { const g = gradeDe(cena); return g ? `<div class="mapa-grade-ctl">
          <div class="campo"><label class="rotulo">Tamanho do quadro <b data-gv="px">${(+g.px).toFixed(1)} px</b></label><div class="gc-l"><button type="button" class="btn mini sec" data-gd="px|-1">−</button><button type="button" class="btn mini sec" data-gd="px|-0.1">−·</button><input type="range" data-g="px" min="8" max="${Math.round(Math.min(g.W, g.H) / 3)}" step="0.1" value="${g.px}"><button type="button" class="btn mini sec" data-gd="px|0.1">+·</button><button type="button" class="btn mini sec" data-gd="px|1">+</button></div></div>
          <div class="duas" style="gap:10px"><div class="campo"><label class="rotulo">Mover para o lado <b data-gv="ox">${(+g.ox).toFixed(1)}</b></label><div class="gc-l"><button type="button" class="btn mini sec" data-gd="ox|-0.5">−</button><input type="range" data-g="ox" min="0" max="${g.px}" step="0.1" value="${((+g.ox % g.px) + g.px) % g.px}"><button type="button" class="btn mini sec" data-gd="ox|0.5">+</button></div></div>
            <div class="campo"><label class="rotulo">Mover para cima/baixo <b data-gv="oy">${(+g.oy).toFixed(1)}</b></label><div class="gc-l"><button type="button" class="btn mini sec" data-gd="oy|-0.5">−</button><input type="range" data-g="oy" min="0" max="${g.px}" step="0.1" value="${((+g.oy % g.px) + g.px) % g.px}"><button type="button" class="btn mini sec" data-gd="oy|0.5">+</button></div></div></div>
          <div class="campo"><label class="rotulo" for="g-m">Cada quadro vale <b data-gv="m">${fmtM(metrosDe(cena))}</b></label><div class="gc-l gc-m"><input type="number" id="g-m" data-g="m" min="0.01" max="1000" step="0.05" value="${metrosDe(cena)}" inputmode="decimal" aria-label="Metros por quadro"><span class="tag">m</span>${[[0.3, '30 cm'], [1.5, '1,5 m'], [3, '3 m'], [5, '5 m'], [10, '10 m']].map(([v, t]) => `<button type="button" class="btn mini ${metrosDe(cena) === v ? '' : 'sec'}" data-gm="${v}">${t}</button>`).join('')}</div><span class="tag">Bonecos pequenos num mundo grande (Little Fears): use 30 cm. Mapa de cidade: 5 ou 10 m.</span></div>
          <label class="chk"><input type="checkbox" data-g="ver" ${g.ver === false ? '' : 'checked'}> Mostrar as linhas da grade</label>
          <div class="btns"><button class="btn mini" data-gs="salvar">Salvar grade</button><button class="btn mini sec" data-gs="detectar">Reconhecer no mapa</button><button class="btn mini sec" data-gs="padrao">Grade padrão</button><button class="btn mini sec" data-gs="fechar">Fechar</button></div>
          <p class="tag" style="margin:0">${g.auto ? 'Encaixada na grade que o mapa já tinha.' : 'Ajuste até os quadros baterem com o mapa.'} Os bonecos sempre param dentro de um quadro.</p></div>` : '<div class="mapa-grade-ctl"><p class="tag">Calculando a grade…</p></div>'; })() : ''}
      ${cena?.img ? `<div class="mapa-vista"><div class="mapa-palco ${mestre ? 'modo-' + ui.modo : ''} ${gradeDe(cena) ? 'com-grade' : ''}" data-cena="${esc(cena.id)}" data-img="${esc(cena.img)}"><img src="${esc(cena.img)}" alt="${esc(cena.nome)}" draggable="false" decoding="async"><div class="mapa-grade-w">${gradeSVG(gradeDe(cena))}</div><canvas class="nevoa ${mestre ? '' : 'jog'}"></canvas><div class="pinos">${pinosVisiveis(cena, mestre)}</div></div>
        <div class="mapa-zoom" role="toolbar" aria-label="Zoom do mapa"><span class="mapa-escala" title="Cada quadro da grade">▢ ${fmtM(metrosDe(cena))}</span><button type="button" data-z="mais" title="Aproximar" aria-label="Aproximar">＋</button><span data-z-n>1×</span><button type="button" data-z="menos" title="Afastar" aria-label="Afastar">－</button><button type="button" data-z="foco" title="Foco: toque num ponto do mapa para aproximar ali" aria-label="Foco"><i data-ic="alvo"></i></button><button type="button" data-z="pinos" title="Focar num pino" aria-label="Focar num pino"><i data-ic="alfinete"></i></button><button type="button" data-z="reset" title="Ver o mapa inteiro" aria-label="Ver o mapa inteiro">⤢</button><button type="button" data-z="dobra" class="z-dobra" title="Esconder a barra (toque de novo para trazer)" aria-label="Esconder ou mostrar a barra do zoom"><span class="zd-fecha">›</span><span class="zd-abre"><i data-ic="lupa"></i></span></button></div>
        <div class="mapa-zoom-lista" hidden></div></div>
        <div class="mapa-id" hidden aria-live="polite"></div>
        <p class="tag" style="margin:0">${mestre ? (ui.modo === 'mover' ? 'Arraste os pinos. Clique num pino para editar, esconder ou remover. <i data-ic="olhoCortado"></i> só você vê; <i data-ic="nevoa"></i> está na névoa (a mesa não vê).' : `Passe o dedo ou o mouse sobre o mapa para ${ui.modo === 'revelar' ? 'revelar' : 'cobrir'}. A mesa vê na hora em que você solta.`) : 'O que a sua personagem consegue ver agora.'}</p>`
      : `<div class="vazio">${mestre ? (cena ? 'Suba a imagem desta cena: planta da casa, sala, porão, mapa da cidade…' : 'Crie a primeira cena com ＋ Cena. Dá para ter uma por prédio, sala ou andar e trocar na hora.') : `${T.a === 'a' ? 'A' : 'O'} ${T.dir} ainda não mostrou nenhum mapa.`}</div>`}</div>`;
    const palco = A.querySelector('.mapa-palco');
    if (palco) {
      palco._cena = cena; const cv = palco.querySelector('.nevoa'), img = palco.querySelector('img');
      palco.dataset.gk = JSON.stringify(gradeDe(cena) || 0);
      const pintar = () => { pintarNevoa(cv, cena.nevoa, mestre); cel(palco, gradeDe(palco._cena || cena)); };
      if (img.complete) pintar(); else img.onload = pintar;
      new ResizeObserver(pintar).observe(palco);
      ligarZoom(A.querySelector('.mapa-vista'), ui, cena, () => (cenasDe(getC()).find(x => x.id === cena.id) || cena), mestre);
      ligarRegua(A.querySelector('.mapa-vista'));
    }
    if (!mestre) { if (palco) ligarArrastoJog(palco, cena); return; }

    /* ---------- ações da Diretora ---------- */
    const refazer = () => { const p = A.querySelector('.mapa-palco'); if (p) p.dataset.img = '-'; desenharMapa(A, getC, opts); };
    const salvarCenas = async (l, extra = {}) => { await salvarC({ mapas: l, ...(getC().mapa ? { mapa: null } : {}), ...extra }); };
    const cenasAt = () => cenasDe(getC()).map(x => ({ ...x }));
    const atual = () => cenasAt().find(x => x.id === ui.ver);
    const trocarCena = async (fn) => { const l = cenasAt(), i = l.findIndex(x => x.id === ui.ver); if (i < 0) return; l[i] = fn({ ...l[i] }); await salvarCenas(l); };
    const subir = (aoTerminar) => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => { if (!inp.files[0]) return; toast('Enviando a imagem…'); const u = await enviarImagem(inp.files[0], 4096); if (u) aoTerminar(u); }; inp.click(); };
    const comGrade = async u => { const g = await detectarGrade(u); await trocarCena(x => ({ ...x, img: u, grade: g || null })); refazer(); if (g?.auto) toast('O mapa já tinha grade: a nossa encaixou nela.'); };
    A.querySelectorAll('[data-cena]').forEach(b => b.onclick = () => { ui.ver = b.dataset.cena; refazer(); });
    const perguntarNome = (tit, val) => new Promise(res => abrirModal(tit, `<div class="campo"><label class="rotulo" for="cn-n">Nome da cena</label><input type="text" id="cn-n" maxlength="50" value="${esc(val || '')}" placeholder="Ex.: Porão da casa, 2º andar, Ginásio"></div><button class="btn" id="cn-ok">OK</button>`, (m, fechar) => {
      const ok = () => { const v = m.querySelector('#cn-n').value.trim(); fechar(); res(v || null); };
      m.querySelector('#cn-ok').onclick = ok; m.querySelector('#cn-n').onkeydown = e => { if (e.key === 'Enter') ok(); }; setTimeout(() => m.querySelector('#cn-n').focus(), 50); }));
    A.querySelectorAll('[data-m="nova"]').forEach(b => b.addEventListener('click', async () => {
      const g = b.dataset.cgNovo || '';
      const nome = await perguntarNome(g ? `Nova cena em ${g}` : 'Nova cena', `Cena ${cenas.length + 1}`); if (!nome) return;
      const c = { id: novoId('cena-'), nome, img: '', pinos: [], nevoa: null, ...(g ? { grupo: g } : {}) };
      ui.ver = c.id; await salvarCenas([...cenasAt(), c], cenas.length ? {} : { mapaAtivo: c.id }); refazer();
      subir(comGrade);
    }));
    // grupos: abrir/fechar, criar, editar
    A.querySelectorAll('[data-cg-alt]').forEach(b => b.onclick = () => { const g = b.dataset.cgAlt, f = gruposFechados(mesaId); f.has(g) ? f.delete(g) : f.add(g); guardarFechados(mesaId, f); refazer(); });
    A.querySelectorAll('[data-cg-todos]').forEach(b => b.onclick = () => { guardarFechados(mesaId, b.dataset.cgTodos === '1' ? new Set() : new Set(gruposDe(cenas).map(([g]) => g))); refazer(); });
    const escolherGrupo = (tit, atual, txtOk = 'OK') => new Promise(res => { const gs = gruposDe(cenasAt()).map(([g]) => g);
      abrirModal(tit, `${gs.length ? `<div class="campo"><span class="rotulo">Grupos que já existem</span><div class="btns">${gs.map(g => `<button type="button" class="btn mini ${g === atual ? '' : 'sec'}" data-gx="${esc(g)}">${esc(g)}</button>`).join('')}</div></div>` : ''}
        <div class="campo"><label class="rotulo" for="cg-n">Nome do grupo</label><input type="text" id="cg-n" maxlength="40" value="${esc(atual || '')}" placeholder="Ex.: Nave, Cidade, Masmorra"></div>
        <div class="btns"><button class="btn" id="cg-ok">${txtOk}</button>${atual !== undefined ? '<button class="btn sec" id="cg-sem">Tirar do grupo</button>' : ''}</div>`, (m, fechar) => {
        const inp = m.querySelector('#cg-n'), ok = () => { const v = inp.value.trim(); fechar(); res(v === '' ? null : v); };
        m.querySelectorAll('[data-gx]').forEach(x => x.onclick = () => { inp.value = x.dataset.gx; ok(); });
        m.querySelector('#cg-ok').onclick = ok; inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
        m.querySelector('#cg-sem')?.addEventListener('click', () => { fechar(); res(''); }); setTimeout(() => inp.focus(), 50); }); });
    A.querySelector('[data-m="grupo"]')?.addEventListener('click', async () => { const a = atual(); if (!a) return; const g = await escolherGrupo(`Grupo de "${a.nome}"`, a.grupo || ''); if (g === null && !a.grupo) return; if (g === null) return;
      await trocarCena(x => { const y = { ...x }; if (g) y.grupo = g; else delete y.grupo; return y; }); if (g) { const f = gruposFechados(mesaId); f.delete(g); guardarFechados(mesaId, f); } refazer(); });
    A.querySelector('[data-m="novogrupo"]')?.addEventListener('click', async () => {
      const g = await escolherGrupo('Novo grupo', undefined, 'Criar e pôr a primeira cena'); if (!g) return;
      const nome = await perguntarNome(`Primeira cena de ${g}`, 'Cena 1'); if (!nome) return;
      const c = { id: novoId('cena-'), nome, img: '', pinos: [], nevoa: null, grupo: g };
      ui.ver = c.id; await salvarCenas([...cenasAt(), c], cenas.length ? {} : { mapaAtivo: c.id }); refazer(); subir(comGrade); });
    A.querySelectorAll('[data-cg-ed]').forEach(b => b.onclick = () => { const g = b.dataset.cgEd;
      abrirModal(`Grupo ${g}`, `<div class="campo"><label class="rotulo" for="cg-r">Nome do grupo</label><input type="text" id="cg-r" maxlength="40" value="${esc(g)}"></div>
        <div class="btns"><button class="btn" id="cg-r-ok">Renomear</button><button class="btn sec" id="cg-sobe">Subir na lista</button><button class="btn sec" id="cg-desc">Desfazer o grupo</button></div><p class="tag">Desfazer não apaga as cenas: elas só saem do grupo.</p>`, (m, fechar) => {
        const muda = async fn => { fechar(); await salvarCenas(cenasAt().map(fn)); refazer(); };
        m.querySelector('#cg-r-ok').onclick = () => { const v = m.querySelector('#cg-r').value.trim(); if (!v || v === g) return fechar(); const f = gruposFechados(mesaId); if (f.delete(g)) { f.add(v); guardarFechados(mesaId, f); } muda(c => c.grupo === g ? { ...c, grupo: v } : c); };
        m.querySelector('#cg-desc').onclick = () => muda(c => { if (c.grupo !== g) return c; const y = { ...c }; delete y.grupo; return y; });
        m.querySelector('#cg-sobe').onclick = async () => { fechar(); const l = cenasAt(), ordem = gruposDe(l).map(([x]) => x), i = ordem.indexOf(g); if (i <= 0) return;
          const prev = ordem[i - 1], dentro = l.filter(c => c.grupo === g), resto = l.filter(c => c.grupo !== g), j = resto.findIndex(c => c.grupo === prev);
          resto.splice(j, 0, ...dentro); await salvarCenas(resto); refazer(); };
      }); });
    A.querySelector('[data-m="img"]')?.addEventListener('click', () => subir(comGrade));
    // cena antiga sem grade: reconhece uma vez e grava
    if (cena?.img && !cena.grade) { ui.gd = ui.gd || {}; if (!ui.gd[cena.id + cena.img]) { ui.gd[cena.id + cena.img] = 1; detectarGrade(cena.img).then(async g => { if (!g) return; const l = cenasAt(), i = l.findIndex(x => x.id === cena.id && x.img === cena.img && !x.grade); if (i < 0) return; l[i] = { ...l[i], grade: g }; await salvarCenas(l); refazer(); }); } }
    // painel da grade (prévia ao vivo, grava no Salvar)
    A.querySelector('[data-m="grade"]')?.addEventListener('click', () => { ui.gradeCtl = !ui.gradeCtl; refazer(); });
    const ctl = A.querySelector('.mapa-grade-ctl');
    if (ctl && gradeDe(cena)) {
      const gt = { ...gradeDe(cena) }, pal = () => A.querySelector('.mapa-palco');
      const previa = () => { const p = pal(); if (!p) return; const c2 = { ...(p._cena || cena), grade: gt }; p.classList.add('com-grade'); p.querySelector('.mapa-grade-w').innerHTML = gradeSVG(gt); cel(p, gt); p.querySelector('.pinos').innerHTML = pinosVisiveis(c2, true);
        ctl.querySelector('[data-gv="px"]').textContent = (+gt.px).toFixed(1) + ' px'; ctl.querySelector('[data-gv="ox"]').textContent = (+gt.ox).toFixed(1); ctl.querySelector('[data-gv="oy"]').textContent = (+gt.oy).toFixed(1);
        const rx = ctl.querySelector('[data-g="ox"]'), ry = ctl.querySelector('[data-g="oy"]'); rx.max = ry.max = gt.px; };
      const pôr = (k, v) => { if (k === 'px') gt.px = Math.max(4, Math.min(Math.min(gt.W, gt.H) / 2, +(+v).toFixed(2))); else gt[k] = +(((+v % gt.px) + gt.px) % gt.px).toFixed(2); gt.auto = false; const r = ctl.querySelector(`[data-g="${k}"]`); if (r && r.type === 'range') r.value = gt[k]; previa(); };
      ctl.querySelectorAll('input[type=range][data-g]').forEach(r => r.oninput = () => pôr(r.dataset.g, r.value));
      ctl.querySelectorAll('[data-gd]').forEach(b => b.onclick = () => { const [k, dv] = b.dataset.gd.split('|'); pôr(k, +gt[k] + +dv); });
      ctl.querySelector('[data-g="ver"]').onchange = e => { gt.ver = e.target.checked; previa(); };
      const pôrM = v => { v = +String(v).replace(',', '.'); if (!(v > 0)) return; gt.m = +v.toFixed(3); ctl.querySelector('[data-gv="m"]').textContent = fmtM(gt.m); const i = ctl.querySelector('[data-g="m"]'); if (+i.value !== gt.m) i.value = gt.m; ctl.querySelectorAll('[data-gm]').forEach(b => b.classList.toggle('sec', +b.dataset.gm !== gt.m)); };
      ctl.querySelector('[data-g="m"]').oninput = e => pôrM(e.target.value);
      ctl.querySelectorAll('[data-gm]').forEach(b => b.onclick = () => pôrM(b.dataset.gm));
      ctl.querySelector('[data-gs="salvar"]').onclick = async () => { await trocarCena(x => ({ ...x, grade: { ...gt } })); toast('Grade salva.'); refazer(); };
      ctl.querySelector('[data-gs="fechar"]').onclick = () => { ui.gradeCtl = false; refazer(); };
      ctl.querySelector('[data-gs="padrao"]').onclick = () => { Object.assign(gt, gradePadrao(gt.W, gt.H), gt.m ? { m: gt.m } : {}); ['px', 'ox', 'oy'].forEach(k => { const r = ctl.querySelector(`[data-g="${k}"]`); r.value = gt[k]; }); previa(); };
      ctl.querySelector('[data-gs="detectar"]').onclick = async () => { delete DETECT[cena.img]; toast('Procurando a grade no mapa…'); const g = await detectarGrade(cena.img); if (!g) return toast('Não deu para ler a imagem.'); Object.assign(gt, g, gt.m ? { m: gt.m } : {}); ['px', 'ox', 'oy'].forEach(k => { const r = ctl.querySelector(`[data-g="${k}"]`); r.max = k === 'px' ? r.max : g.px; r.value = gt[k]; }); previa(); toast(g.auto ? 'Achei a grade do mapa. Confira e salve.' : 'O mapa não tem grade clara. Ficou a padrão.'); };
    }
    A.querySelector('[data-m="mostrar"]')?.addEventListener('click', async () => { await salvarC({ mapaAtivo: ui.ver }); toast('A mesa agora vê ' + (atual()?.nome || 'esta cena') + '.'); refazer(); });
    A.querySelector('[data-m="ren"]')?.addEventListener('click', async () => { const n = await perguntarNome('Renomear cena', atual()?.nome); if (!n) return; await trocarCena(x => ({ ...x, nome: n })); refazer(); });
    A.querySelector('[data-m="dup"]')?.addEventListener('click', async () => { const a = atual(); if (!a) return; const c = { ...JSON.parse(JSON.stringify(a)), id: novoId('cena-'), nome: a.nome + ' (cópia)' }; ui.ver = c.id; await salvarCenas([...cenasAt(), c]); refazer(); });
    A.querySelector('[data-m="apagar"]')?.addEventListener('click', async () => { const a = atual(); if (!a || !await confirmar(`Apagar a cena "${a.nome}" com pinos e névoa?`, { titulo: 'Apagar cena' })) return;
      const l = cenasAt().filter(x => x.id !== a.id); ui.ver = l[0]?.id || null; await salvarCenas(l, getC().mapaAtivo === a.id ? { mapaAtivo: l[0]?.id || null } : {}); refazer(); });
    // névoa
    const grade = () => { const im = A.querySelector('.mapa-palco img'), rows = Math.max(6, Math.round(COLS * (im?.naturalHeight || 3) / (im?.naturalWidth || 4))); return [COLS, rows]; };
    A.querySelector('[data-m="comnevoa"]')?.addEventListener('click', async () => { const [c, r] = grade(); await trocarCena(x => ({ ...x, nevoa: nevoaCheia(c, r) })); ui.modo = 'revelar'; refazer(); toast('Tudo coberto. Use Revelar para abrir o que a mesa vê.'); });
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
      DETS.filter(f => !f.fora && !l.some(p => p.ficha === f.id)).forEach((f, i) => { n++; l.push({ id: novoId('p'), ficha: f.id, nome: f.nome, foto: f.foto || '', cor: (typeof ESP !== 'undefined' && ESP[f.especie]?.cor) || '#4fc3b5', ic: 'pessoas', x: 12 + (i % 6) * 8, y: 88, fixo: true, ...(f.oculto ? { oculto: true } : {}) }); });
      if (!n) return toast(`Todo mundo já tem pino nesta cena.`); await salvarPinos(l); refazer(); });
    A.querySelector('[data-m="npc"]')?.addEventListener('click', () => {
      const npcs = (getC().npcs || []).slice().sort((a, b) => (b.t || 0) - (a.t || 0)), ja = new Set(pinosAt().filter(p => p.npc).map(p => p.npc));
      const susp = n => (getC().suspeitos || []).some(x => x.id === n.id || x.npc === n.id);
      if (!npcs.length) return toast('Nenhum NPC criado ainda. Crie na aba NPCs.');
      abrirModal('Colocar NPC no mapa', `<p class="tag">Escolha quem está nesta cena. Quem já tem pino aqui aparece marcado.</p>
        <div class="npc-escolha">${npcs.map(n => `<label class="npc-op ${ja.has(n.id) ? 'ja' : ''}"><input type="checkbox" value="${esc(n.id)}" ${ja.has(n.id) ? 'disabled checked' : ''}>
          <span class="foto-s p" style="${n.foto ? `background-image:url('${esc(n.foto)}')` : ''}">${n.foto ? '' : esc(iniciais(n.nome))}</span><span><b>${esc(n.nome)}</b>${n.papel ? `<small>${esc(n.papel)}</small>` : ''}${susp(n) ? '<small class="sus">Suspeito</small>' : ''}${ja.has(n.id) ? '<small>já está aqui</small>' : ''}</span></label>`).join('')}</div>
        <label class="chk"><input type="checkbox" id="npc-oc"> Colocar escondido da mesa</label>
        <button class="btn" id="npc-ok">Colocar no mapa</button>`, (m, fechar) => {
        m.querySelector('#npc-ok').onclick = async () => {
          const ids = [...m.querySelectorAll('.npc-escolha input:checked:not(:disabled)')].map(i => i.value); if (!ids.length) { toast('Marque pelo menos um.'); return; }
          const oc = m.querySelector('#npc-oc').checked, l = pinosAt();
          ids.forEach((id, i) => { const n = npcs.find(x => x.id === id); l.push({ id: novoId('p'), npc: n.id, nome: n.nome, foto: n.foto || '', ic: 'mascara', cor: susp(n) ? '#c4000d' : '#9a86f0', oculto: oc, x: 40 + (i % 5) * 5, y: 45 + Math.floor(i / 5) * 6 }); });
          fechar(); await salvarPinos(l); refazer(); toast(ids.length > 1 ? `${ids.length} NPCs no mapa. Arraste para o lugar.` : 'NPC no mapa. Arraste para o lugar.'); };
      });
    });
    A.querySelector('[data-m="ass"]')?.addEventListener('click', async () => {
      if (typeof opts.combate === 'function') { // ADR: pega na hora as ameaças do combate (com foto e nome)
        const noCombate = opts.combate().filter(x => x && x.tipo !== 'agente' && x.nome);
        if (noCombate.length) {
          const l = pinosAt(), ja = new Set(l.filter(p => p.combate).map(p => p.combate)), novas = noCombate.filter(x => !ja.has(x.nome));
          if (!novas.length) return toast('Todas as ameaças do combate já estão nesta cena.');
          novas.forEach((x, i) => l.push({ id: novoId('p'), combate: x.nome, nome: x.nome, ic: x.tipo === 'npc' ? 'pessoas' : 'faca', cor: x.tipo === 'npc' ? '#9a86f0' : '#c4000d', foto: x.imagem || '', x: Math.min(90, 30 + (i % 6) * 8), y: 20 + Math.floor(i / 6) * 8 }));
          await salvarPinos(l); refazer(); toast(novas.length > 1 ? `${novas.length} ameaças do combate no mapa. Arraste para o lugar.` : `${novas[0].nome} no mapa. Arraste para o lugar.`); return;
        }
        const l = pinosAt(); if (l.some(p => p.assassino)) return toast('Nenhuma ameaça no combate, e o pino genérico de Ameaça já está nesta cena.');
        l.push({ id: novoId('p'), assassino: true, nome: T.ass, ic: 'faca', cor: '#8e0010', foto: '', oculto: true, x: 50, y: 12 });
        await salvarPinos(l); refazer(); toast('Nenhuma ameaça no combate: criei um pino genérico escondido. Toque nele para mostrar à mesa.'); return;
      }
      const lista = (opts.ameacas || []).filter(a => a && a.id);
      if (!lista.length) {
        const l = pinosAt(); if (l.some(p => p.assassino)) return toast(`${T.ass === 'Assassino' ? 'O Assassino' : 'O Culpado'} já tem pino nesta cena.`);
        const nome = E?.pronto === 'rosto-oco' ? 'Rosto Oco' : (E?.nome || T.ass);
        l.push({ id: novoId('p'), assassino: true, nome, ic: 'faca', cor: '#8e0010', foto: E && typeof fotoAss === 'function' ? fotoAss(E.pronto) : '', oculto: true, x: 50, y: 12 });
        await salvarPinos(l); refazer(); toast('Pino criado escondido. Clique nele para mostrar à mesa.'); return;
      }
      const ja = new Set(pinosAt().map(p => p.ameaca || (p.assassino ? 'principal' : '')).filter(Boolean));
      abrirModal(`Colocar ${T.ass} no mapa`, `<p class="tag">Marque quem entra nesta cena. Nasce escondido da mesa; toque no pino para mostrar.</p>
        <div class="npc-escolha">${lista.map(a => `<label class="npc-op ${ja.has(a.id) ? 'ja' : ''}"><input type="checkbox" value="${esc(a.id)}" ${ja.has(a.id) ? 'disabled checked' : ''}>
          <span class="foto-s p" style="${a.foto ? `background-image:url('${esc(a.foto)}')` : ''}">${a.foto ? '' : esc(iniciais(a.nome))}</span><span><b>${esc(a.nome)}</b>${a.tipo ? `<small>${esc(a.tipo)}</small>` : ''}${a.fora ? '<small>fora de combate</small>' : ''}${ja.has(a.id) ? '<small>já está aqui</small>' : ''}</span></label>`).join('')}</div>
        <button class="btn" id="am-ok">Colocar no mapa</button>`, (m, fechar) => {
        m.querySelector('#am-ok').onclick = async () => {
          const ids = [...m.querySelectorAll('.npc-escolha input:checked:not(:disabled)')].map(i => i.value); if (!ids.length) { toast('Marque pelo menos um.'); return; }
          const l = pinosAt();
          ids.forEach((aid, i) => { const a = lista.find(x => x.id === aid); l.push({ id: novoId('p'), ameaca: a.id, ...(a.principal ? { assassino: true } : {}), nome: a.nome, foto: a.foto || '', ic: a.ic || (a.principal ? 'faca' : 'caveira'), cor: a.cor || '#8e0010', oculto: true, x: 40 + (i % 5) * 5, y: 14 + Math.floor(i / 5) * 6 }); });
          fechar(); await salvarPinos(l); refazer(); toast(ids.length > 1 ? `${ids.length} no mapa, escondidos. Arraste e mostre quando quiser.` : 'No mapa, escondido. Arraste e mostre quando quiser.'); };
      });
    });
    const editar = (pino, novo) => abrirModal(novo ? 'Novo pino' : 'Editar pino', `<div class="campo"><label class="rotulo" for="pn-n">Nome</label><input type="text" id="pn-n" maxlength="40" value="${esc(pino.nome || '')}"></div>
        <div class="campo"><span class="rotulo">Ícone</span><div class="pino-ics">${ICONES.map(ic => `<button type="button" class="${ic === (pino.ic || 'alfinete') ? 'aqui' : ''}" data-pic="${ic}">${icPino(ic)}</button>`).join('')}</div></div>
        <div class="duas"><div class="campo"><label class="rotulo" for="pn-c">Cor</label><input type="color" id="pn-c" value="${esc(pino.cor || '#c4000d')}" style="height:40px;padding:2px"></div>
        <label class="chk" style="align-self:end"><input type="checkbox" id="pn-o" ${pino.oculto ? 'checked' : ''}> Esconder da mesa</label></div>
        <div class="campo"><label class="rotulo" for="pn-t">Tamanho <b id="pn-tv">${Math.round((+pino.tam || 1) * 100)}%</b></label><input type="range" id="pn-t" min="0.5" max="4" step="0.25" value="${+pino.tam || 1}"></div>
        <div class="campo"><label class="rotulo" for="pn-d">O que a mesa lê ao tocar no pino</label><textarea id="pn-d" maxlength="400" style="min-height:60px" placeholder="Ex.: O dono do bar. Parece nervoso.">${esc(pino.desc || '')}</textarea></div>
        <label class="chk"><input type="checkbox" id="pn-fx" ${pino.fixo ? 'checked' : ''}> Aparece mesmo na névoa (personagem da mesa)</label>
        <label class="chk"><input type="checkbox" id="pn-lv" ${pino.livre ? 'checked' : ''}> Qualquer jogador pode mover${pino.ficha ? ' (a dona da ficha já pode)' : ''}</label>
        ${pino.foto ? `<label class="chk"><input type="checkbox" id="pn-f" checked> Usar a foto no lugar do ícone</label>` : ''}
        ${cenas.length > 1 && !novo ? `<div class="campo"><label class="rotulo" for="pn-mv">Levar para outra cena</label><select id="pn-mv"><option value="">Fica aqui</option>${(() => { const op = c => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`, outras = cenas.filter(c => c.id !== ui.ver); return outras.filter(c => !c.grupo).map(op).join('') + gruposDe(outras).map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(op).join('')}</optgroup>`).join(''); })()}</select></div>` : ''}
        <div class="btns"><button class="btn" id="pn-ok">${novo ? 'Colocar' : 'Salvar'}</button>${novo ? '' : '<button class="btn perigo" id="pn-x">Remover</button>'}</div>`, (m, fechar) => {
      let ic = pino.ic || 'alfinete';
      m.querySelector('#pn-t').oninput = e => { m.querySelector('#pn-tv').textContent = Math.round(e.target.value * 100) + '%'; };
      m.querySelectorAll('[data-pic]').forEach(b => b.onclick = () => { ic = b.dataset.pic; m.querySelectorAll('[data-pic]').forEach(x => x.classList.toggle('aqui', x === b)); });
      m.querySelector('#pn-ok').onclick = async () => {
        const p2 = { ...pino, desc: m.querySelector('#pn-d').value.trim(), nome: m.querySelector('#pn-n').value.trim() || 'Pino', ic, cor: m.querySelector('#pn-c').value, oculto: m.querySelector('#pn-o').checked, fixo: m.querySelector('#pn-fx').checked, livre: m.querySelector('#pn-lv').checked, tam: +m.querySelector('#pn-t').value || 1, foto: m.querySelector('#pn-f') && !m.querySelector('#pn-f').checked ? '' : pino.foto || '' };
        const destino = m.querySelector('#pn-mv')?.value; fechar();
        const l = cenasAt(), i = l.findIndex(x => x.id === ui.ver); if (i < 0) return;
        const ps = [...(l[i].pinos || [])], j = ps.findIndex(p => p.id === pino.id);
        if (destino) { ps.splice(j, 1); const k = l.findIndex(x => x.id === destino); l[k] = { ...l[k], pinos: [...(l[k].pinos || []).filter(p => p.id !== pino.id), { ...p2, x: 50, y: 50 }] }; toast(`${p2.nome} foi para ${l[k].nome}.`); }
        else if (j < 0) ps.push(p2); else ps[j] = p2;
        l[i] = { ...l[i], pinos: ps }; await salvarCenas(l); refazer(); };
      m.querySelector('#pn-x')?.addEventListener('click', async () => { fechar(); await salvarPinos(pinosAt().filter(p => p.id !== pino.id)); refazer(); });
    });
    A.querySelector('[data-m="novo"]')?.addEventListener('click', () => editar({ id: novoId('p'), nome: '', ic: 'pessoas', cor: '#f2c14e', x: 50, y: 50 }, true));
    if (!palco) return;

    // arrastar pinos ou pintar a névoa
    let arr = null, pint = null;
    (palco._cancelar ||= []).push(() => { if (arr) { arr.el.classList.remove('arrastando'); arr = null; palco.dataset.ocupado = ''; } });
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
      if (k === 'medir') { palco.closest('.mapa-vista')?._medir?.(p.id); return; }
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
      [arr.x, arr.y] = pos(e); const gm = gradeDe(palco._cena || cena); if (gm) { const pp = (palco._cena || cena).pinos?.find(x => x.id === arr.id); [arr.x, arr.y] = encaixar(gm, arr.x, arr.y, pp?.tam); } arr.el.style.left = arr.x + '%'; arr.el.style.top = arr.y + '%'; avisarMov(arr.id, arr.x, arr.y); });
    const soltar = async () => {
      if (pint) { const nv = pint.nv; pint = null; palco.dataset.ocupado = ''; await trocarCena(x => ({ ...x, nevoa: nv })); return; }
      if (!arr) return; const a = arr; arr = null; a.el.classList.remove('arrastando'); palco.dataset.ocupado = '';
      const l = pinosAt(), p = l.find(x => x.id === a.id); if (!p) return;
      if (!a.moveu) { SEL.id = SEL.id === p.id ? null : p.id; repintar(); mostrarId(palco, palco._cena || cena, p.id); return; }
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
      palco.style.willChange = 'transform'; clearTimeout(palco._nitido); palco._nitido = setTimeout(() => { palco.style.willChange = 'auto'; }, anim ? 400 : 220);
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
    // a barra some e volta com um toque nela (fica lembrado neste aparelho)
    const barra = vista.querySelector('.mapa-zoom'), lerDobra = () => { try { return localStorage.getItem('mapa-zoom-recolhida') === '1'; } catch (e) { return false; } };
    const dobrar = v => { barra.classList.toggle('recolhida', v); lista.hidden = true; try { localStorage.setItem('mapa-zoom-recolhida', v ? '1' : '0'); } catch (e) {} };
    barra.classList.toggle('recolhida', lerDobra());
    barra.addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.z !== 'dobra') return; if (!b && !barra.classList.contains('recolhida') && e.target.closest('[data-z-n], .mapa-escala') == null && e.target !== barra) return; dobrar(!barra.classList.contains('recolhida')); });
    const bFoco = vista.querySelector('[data-z="foco"]');
    bFoco.onclick = () => { ui.focar = !ui.focar; bFoco.classList.toggle('aqui', ui.focar); vista.classList.toggle('focando', ui.focar); lista.hidden = true; if (ui.focar) toast('Toque no ponto do mapa que quer ver de perto.'); };
    vista.querySelector('[data-z="pinos"]').onclick = () => {
      if (!lista.hidden) { lista.hidden = true; return; }
      const c = getCena(), ps = (c.pinos || []).filter(p => mestre || (!p.oculto && (p.fixo || revelado(c.nevoa, +p.x || 50, Math.min(99.9, +p.y || 50)))));
      lista.innerHTML = ps.length ? ps.map(p => `<button type="button" data-zp="${esc(p.id)}"><span>${icPino(p.ic || 'alfinete')}</span>${esc(p.nome || 'Pino')}</button>`).join('') : '<span class="tag">Nenhum pino nesta cena.</span>';
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

  /* ---------- régua: segurar o token (ou passar o mouse e tocar na régua) e arrastar mostra a seta com a distância ---------- */
  const RG = { pid: null, ativo: false, toque: false, seg: false, fim: null, t: 0, ult: 'mouse', vista: null };
  function ligarRegua(vista) {
    if (!vista || vista._regua) return; vista._regua = true;
    // o estado mora fora da tela: se o mapa redesenhar no meio da medida, a seta continua
    const R = RG, V = () => (R.vista?.isConnected ? R.vista : vista), palco = () => V().querySelector('.mapa-palco'); let LP = null;
    if (R.vista && R.vista !== vista && !R.vista.isConnected && R.pid) setTimeout(() => { if (!vista.isConnected || !vista.querySelector(`.pino[data-pino="${CSS.escape(R.pid)}"]`)) return; if (R.ativo) vista.classList.add('medindo'); desenhar(); }, 0);
    R.vista = vista;
    const grade = pc => { const im = pc.querySelector('img'), c = pc._cena; return gradeDe(c) || (im?.naturalWidth ? gradePadrao(im.naturalWidth, im.naturalHeight) : null); };
    const pto = (pc, e) => { const r = pc.getBoundingClientRect(); return [Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)), Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100))]; };
    const camada = pc => { let sv = pc.querySelector(':scope > .mapa-regua'); if (!sv) { pc.insertAdjacentHTML('beforeend', '<svg class="mapa-regua" preserveAspectRatio="none" aria-hidden="true"></svg><div class="regua-rot" role="status"></div>'); sv = pc.querySelector(':scope > .mapa-regua'); } return [sv, pc.querySelector(':scope > .regua-rot')]; };
    const limpar = () => { const pc = palco(); pc?.querySelector(':scope > .mapa-regua')?.remove(); pc?.querySelector(':scope > .regua-rot')?.remove(); };
    const fim = () => { clearTimeout(R.t); R.ativo = R.seg = false; R.pid = null; V().classList.remove('medindo'); limpar(); };
    const desenhar = () => {
      const pc = palco(), g = pc && grade(pc), el = pc?.querySelector(`.pino[data-pino="${CSS.escape(R.pid || '')}"]`); if (!g || !el) return fim();
      if (!R.fim) { limpar(); return; }
      const px = +g.px, ox = ((+g.ox % px) + px) % px, oy = ((+g.oy % px) + px) % px, p = (pc._cena?.pinos || []).find(x => x.id === R.pid) || {}, n = Math.max(1, Math.round(+p.tam || 1));
      const X0 = parseFloat(el.style.left) / 100 * g.W, Y0 = parseFloat(el.style.top) / 100 * g.H, X1 = R.fim[0] / 100 * g.W, Y1 = R.fim[1] / 100 * g.H;
      const c0 = Math.round((X0 - ox) / px - n / 2), r0 = Math.round((Y0 - oy) / px - n / 2), c1 = Math.floor((X1 - ox) / px), r1 = Math.floor((Y1 - oy) / px);
      const fora = (v, a) => v < a ? a - v : v > a + n - 1 ? v - (a + n - 1) : 0, q = Math.max(fora(c1, c0), fora(r1, r0)), m = q * metrosDe(pc._cena || { grade: g });
      const xA = ox + (c1 + .5) * px, yA = oy + (r1 + .5) * px, ang = Math.atan2(yA - Y0, xA - X0), L = Math.hypot(xA - X0, yA - Y0), w = Math.max(px * .11, g.W / 500), cab = Math.max(px * .42, w * 3.2);
      const [sv, rot] = camada(pc); sv.setAttribute('viewBox', `0 0 ${g.W} ${g.H}`);
      const xB = L > cab ? xA - Math.cos(ang) * cab * .8 : X0, yB = L > cab ? yA - Math.sin(ang) * cab * .8 : Y0;
      const ponta = [[xA, yA], [xA - Math.cos(ang - .45) * cab, yA - Math.sin(ang - .45) * cab], [xA - Math.cos(ang + .45) * cab, yA - Math.sin(ang + .45) * cab]].map(v => v.map(k => k.toFixed(1)).join(',')).join(' ');
      sv.innerHTML = `<rect class="rg-cel" x="${(ox + c1 * px).toFixed(1)}" y="${(oy + r1 * px).toFixed(1)}" width="${px}" height="${px}"/>${q ? `<line class="rg-som" x1="${X0}" y1="${Y0}" x2="${xB}" y2="${yB}" stroke-width="${w * 2.2}"/><line class="rg-lin" x1="${X0}" y1="${Y0}" x2="${xB}" y2="${yB}" stroke-width="${w}"/><polygon class="rg-pta" points="${ponta}" stroke-width="${w * .6}"/>` : ''}<circle class="rg-ori" cx="${X0}" cy="${Y0}" r="${w * 1.4}"/>`;
      rot.style.left = (xA / g.W * 100) + '%'; rot.style.top = (yA / g.H * 100) + '%'; rot.classList.toggle('baixo', yA / g.H < .14);
      const fx = xA / g.W; rot.classList.toggle('esq', fx < .2); rot.classList.toggle('dir', fx > .8);
      rot.innerHTML = `<b>${q} ${q === 1 ? 'quadro' : 'quadros'}</b><span>${fmtM(m)}</span>${R.toque ? '<button type="button" data-regua-x aria-label="Parar de medir">×</button>' : ''}`;
    };
    const iniciar = (pid, toque) => { fim(); Object.assign(R, { pid, ativo: true, toque, seg: false, fim: null }); V().classList.add('medindo'); (palco()?._cancelar || []).forEach(f => f()); SEL.id = null; V().querySelectorAll('.pino.sel').forEach(x => x.classList.remove('sel')); V().querySelector('.pino-barra')?.remove(); };
    const esperar = () => { clearTimeout(R.t); if (R.toque) R.t = setTimeout(fim, 4000); };
    vista._medir = pid => { iniciar(pid, R.ult !== 'mouse'); if (R.toque) { toast('Arraste o dedo pelo mapa: a seta mostra a distância.'); esperar(); } };
    vista.addEventListener('pointerdown', e => {
      R.ult = e.pointerType || 'mouse'; const pc = palco(); if (!pc) return;
      const bm = e.target.closest('[data-medir]');
      if (bm) { e.preventDefault(); e.stopPropagation(); iniciar(bm.dataset.medir, e.pointerType !== 'mouse'); if (R.toque) { R.seg = true; try { vista.setPointerCapture(e.pointerId); } catch (x) {} } R.fim = pto(pc, e); desenhar(); return; }
      if (R.ativo) {
        if (e.target.closest('[data-regua-x]')) { e.preventDefault(); e.stopPropagation(); fim(); return; }
        if (e.target.closest('.mapa-zoom, .mapa-zoom-lista')) return;
        e.preventDefault(); e.stopPropagation();
        if (!R.toque) { R.fim = pto(pc, e); desenhar(); R.ativo = false; V().classList.remove('medindo'); R.t = setTimeout(fim, 2200); return; } // mouse: o clique crava a medida e ela some sozinha
        clearTimeout(R.t); R.seg = true; try { vista.setPointerCapture(e.pointerId); } catch (x) {} R.fim = pto(pc, e); desenhar(); return;
      }
      if (!R.ativo && R.pid) fim();
      const pq = e.target.closest('.pino'); if (!pq || e.pointerType === 'mouse' || e.button > 0 || e.target.closest('button, .pino-h')) return;
      // segurar o token parado (sem arrastar) liga a régua
      clearTimeout(LP?.t); LP = { x0: e.clientX, y0: e.clientY, id: e.pointerId, t: setTimeout(() => { if (!LP) return; const pid = pq.dataset.pino; LP = null; iniciar(pid, true); R.seg = true; try { vista.setPointerCapture(e.pointerId); } catch (x) {} navigator.vibrate?.(12); }, 480) };
    }, true);
    vista.addEventListener('pointermove', e => {
      if (LP && Math.hypot(e.clientX - LP.x0, e.clientY - LP.y0) > 8) { clearTimeout(LP.t); LP = null; }
      if (!R.ativo || (R.toque && !R.seg)) return; const pc = palco(); if (!pc) return;
      if (R.seg) { e.preventDefault(); e.stopPropagation(); }
      R.fim = pto(pc, e); desenhar();
    }, true);
    const solta = e => { if (LP) { clearTimeout(LP.t); LP = null; } if (!R.ativo || !R.seg) return; R.seg = false; e.stopPropagation(); esperar(); };
    vista.addEventListener('pointerup', solta, true); vista.addEventListener('pointercancel', solta, true);
    vista.addEventListener('contextmenu', e => { if (e.target.closest('.pino') && e.pointerType !== 'mouse') e.preventDefault(); });
    vista.addEventListener('pointerleave', e => { if (R.ativo && !R.toque && e.pointerType === 'mouse') { R.fim = null; limpar(); } });
    if (!window._reguaEsc) { window._reguaEsc = true; document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.mapa-vista.medindo').forEach(v => v._medirFim?.()); }); }
    vista._medirFim = fim;
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
    (palco._cancelar ||= []).push(() => { if (arr) { arr.el.classList.remove('arrastando'); arr = null; palco.dataset.ocupado = ''; } });
    const pos = e => { const r = palco.getBoundingClientRect(); return [Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)), Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100))]; };
    const repintar = () => { const c = palco._cena || cena; palco.querySelector('.pinos').innerHTML = pinosVisiveis(c, false); };
    palco.addEventListener('pointerdown', e => {
      if (OPT.salvarPos && gestoAlca(e, palco, async g => { const c = palco._cena || cena, p = (c.pinos || []).find(x => x.id === g.id); if (p && g.rot != null) await salvarGiro(c, p, g.rot); })) return;
      const el = e.target.closest('.pino.mov'); if (!el || !OPT.salvarPos) { const pq = e.target.closest('.pino'); if (pq) { const x0 = e.clientX, y0 = e.clientY; palco.addEventListener('pointerup', ev => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) mostrarId(palco, palco._cena || cena, pq.dataset.pino); }, { once: true }); } if (SEL.id && !pq) { SEL.id = null; repintar(); } return; }
      e.preventDefault(); e.stopPropagation(); palco.dataset.ocupado = '1';
      arr = { el, id: el.dataset.pino, x0: e.clientX, y0: e.clientY, moveu: false }; el.setPointerCapture(e.pointerId); el.classList.add('arrastando');
    });
    palco.addEventListener('pointermove', e => {
      if (!arr) return; if (Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) > 4) arr.moveu = true; if (!arr.moveu) return;
      [arr.x, arr.y] = pos(e); const gj = gradeDe(palco._cena || cena); if (gj) { const pp = (palco._cena || cena).pinos?.find(x => x.id === arr.id); [arr.x, arr.y] = encaixar(gj, arr.x, arr.y, pp?.tam); } arr.el.style.left = arr.x + '%'; arr.el.style.top = arr.y + '%'; avisarMov(arr.id, arr.x, arr.y);
    });
    const soltar = async () => { if (!arr) return; const a = arr; arr = null; a.el.classList.remove('arrastando'); palco.dataset.ocupado = '';
      if (!a.moveu) { SEL.id = SEL.id === a.id ? null : a.id; repintar(); mostrarId(palco, palco._cena || cena, a.id); return; } avisarMov(a.id, a.x, a.y, true); await OPT.salvarPos(palco.dataset.cena, a.id, { x: +a.x.toFixed(2), y: +a.y.toFixed(2) }); };
    palco.addEventListener('pointerup', soltar); palco.addEventListener('pointercancel', soltar);
  }

  /* ---------- mapa flutuante: abre por cima de qualquer tela (ficha, mesa), arrasta, aumenta, diminui e fecha no X ---------- */
  const POP = { el: null, unsub: null, chave: '' };
  function fecharPop() { try { POP.unsub?.(); } catch (e) {} POP.unsub = null; POP.el?.remove(); POP.el = null; POP.chave = ''; }
  function abrirMapaFlutuante(col, mesaId) {
    if (typeof db === 'undefined' || !db) return;
    if (POP.el && POP.chave === col + '|' + mesaId) { POP.el.classList.add('pisca'); setTimeout(() => POP.el?.classList.remove('pisca'), 400); return; }
    fecharPop(); POP.chave = col + '|' + mesaId;
    const salvo = (() => { try { return JSON.parse(localStorage.getItem(TEMA() + '-mapa-pop') || 'null'); } catch (e) { return null; } })() || {};
    const el = document.createElement('section'); el.className = 'mapa-pop'; el.setAttribute('aria-label', 'Mapa da mesa');
    const w = Math.min(salvo.w || 460, innerWidth - 16), x = Math.min(Math.max(8, salvo.x ?? innerWidth - w - 16), innerWidth - 120), y = Math.min(Math.max(8, salvo.y ?? 80), innerHeight - 80);
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px`;
    el.innerHTML = `<header class="mapa-pop-cab"><b><i data-ic="mapa"></i> <span data-pop-tit>Mapa</span></b><span class="btns"><button type="button" data-pop="menos" title="Diminuir" aria-label="Diminuir">−</button><button type="button" data-pop="mais" title="Aumentar" aria-label="Aumentar">+</button><button type="button" data-pop="x" title="Fechar" aria-label="Fechar">✕</button></span></header><div class="mapa-pop-corpo"><div class="vazio">Abrindo o mapa…</div></div>`;
    document.body.appendChild(el); POP.el = el;
    const guardar = () => { const r = el.getBoundingClientRect(); try { localStorage.setItem(TEMA() + '-mapa-pop', JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) })); } catch (e) {} };
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
.mapa-cenas { display: grid; gap: 8px; min-width: 0; }
.cg-cenas { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 8px; min-width: 0; scroll-snap-type: x proximity; }
.cg-cenas > * { scroll-snap-align: start; }
.cg-topo { display: flex; gap: 6px; justify-content: flex-end; }
.cena-grupo { border: 2px solid #000; border-radius: 12px; background: color-mix(in srgb, var(--tabua, #1a1a1a) 70%, transparent); padding: 6px 8px 0; box-shadow: 2px 2px 0 #000; min-width: 0; }
.cena-grupo.fechado { padding-bottom: 6px; }
.cg-cab { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.cena-grupo.fechado .cg-cab { margin-bottom: 0; }
.cg-nome { flex: 1; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; background: none; border: 0; color: var(--texto, #eee); cursor: pointer; text-align: left; padding: 4px 2px; min-height: 36px; }
.cg-nome b { font: 800 15px var(--f-disp, inherit); letter-spacing: .04em; text-transform: uppercase; }
.cg-nome small { font-size: 12px; color: var(--texto-dim, #aaa); }
.cg-nome .cg-ve { color: #8ff0c4; } .cg-nome .cg-aqui { color: var(--ambar, #e8b54a); }
.cg-seta { display: inline-block; transition: transform .2s; color: var(--ambar, #e8b54a); } .cena-grupo:not(.fechado) .cg-seta { transform: rotate(90deg); }
.cg-mais { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #000; background: var(--tabua, #222); color: var(--texto, #eee); font-size: 18px; line-height: 1; cursor: pointer; flex: none; }
.cena-tab.nova.grupo { width: 100px; }
.cena-tab { flex: none; position: relative; width: 140px; height: 64px; border: 2px solid #000; border-radius: 10px; box-shadow: 2px 2px 0 #000; cursor: pointer; overflow: hidden; display: grid; align-content: end; justify-items: start; padding: 6px 8px; color: #fff; text-align: left;
  background: linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.8)), var(--ci, linear-gradient(135deg, #3a2a2c, #120607)) center/cover; }
.cena-tab b { font-size: 13px; text-shadow: 0 1px 3px #000; line-height: 1.1; } .cena-tab small { font-size: 10.5px; color: #8ff0c4; text-shadow: 0 1px 2px #000; }
.cena-tab.aqui { outline: 3px solid var(--ambar); outline-offset: -3px; } .cena-tab.ativa::after { content: ''; position: absolute; top: 6px; right: 6px; width: 9px; height: 9px; border-radius: 50%; background: #3ddc84; box-shadow: 0 0 8px #3ddc84; }
.cena-tab.nova { width: 90px; place-content: center; justify-items: center; background: var(--tabua); color: var(--texto-dim); font-weight: 800; }
.mapa-ferr { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.mapa-ferr .seg { display: inline-flex; border: 2px solid #000; border-radius: 8px; overflow: hidden; }
.mapa-ferr .seg button { background: var(--tabua); border: 0; border-right: 1px solid #000; padding: 6px 10px; font-weight: 800; color: var(--texto-dim); cursor: pointer; } .mapa-ferr .seg button:last-child { border-right: 0; }
.mapa-ferr .seg button.aqui { background: var(--ambar); color: #1a0f05; }
.mapa-ferr .pincel { display: flex; gap: 6px; align-items: center; font-size: 12px; color: var(--texto-dim); }
.mapa-palco .nevoa { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.mapa-palco .nevoa.jog { filter: blur(10px); transform: scale(1.03); }
.mapa-palco .pinos { z-index: 2; }
.mapa-grade-w { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.mapa-grade { position: absolute; inset: 0; width: 100%; height: 100%; }
.mapa-grade path { fill: none; vector-effect: non-scaling-stroke; }
.mapa-grade .gl-e { stroke: rgba(0,0,0,.45); stroke-width: 2.2; } .mapa-grade .gl-c { stroke: rgba(255,255,255,.42); stroke-width: 1; }
.mapa-grade.sobre .gl-e { stroke: rgba(0,0,0,.18); } .mapa-grade.sobre .gl-c { stroke: rgba(255,255,255,.22); }
.mapa-palco.com-grade .pino, .mapa-vista .mapa-palco.com-grade .pino { transform: translate(-50%, -50%); gap: 0; }
.mapa-palco.com-grade .pino::after { display: none; }
.mapa-palco.com-grade .pino-cab { width: calc(var(--cel, 34px) * .86 * var(--tam, 1)); height: calc(var(--cel, 34px) * .86 * var(--tam, 1)); font-size: calc(var(--cel, 34px) * .42 * var(--tam, 1)); border-width: max(1.5px, calc(var(--cel, 34px) * .07)); }
.mapa-palco.com-grade .pino-nome { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 1px; font-size: clamp(7px, calc(var(--cel, 34px) * .26), 11.5px); padding: 1px 5px; }
.mapa-palco.com-grade .pino-quem { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); }
.mapa-palco.com-grade .pino { transition: left .12s, top .12s; }
.mapa-grade-ctl { display: grid; gap: 8px; padding: 10px 12px; border: 2px solid #000; border-radius: 10px; background: var(--tabua, #1a1a1a); }
.mapa-grade-ctl .gc-l { display: flex; gap: 6px; align-items: center; } .mapa-grade-ctl .gc-l input[type=range] { flex: 1; min-width: 0; }
.mapa-escala { font: 800 11px var(--f-maq, monospace); color: #fff; padding: 0 6px; white-space: nowrap; opacity: .85; }
.pino.movendo { z-index: 6; transition: left .08s linear, top .08s linear; } .pino.movendo .pino-cab { box-shadow: 0 0 0 3px var(--mv), 0 0 18px 6px var(--mv); animation: pinoLuz 1s ease-in-out infinite; }
@keyframes pinoLuz { 50% { box-shadow: 0 0 0 3px var(--mv), 0 0 28px 10px var(--mv); } }
.pino-quem { background: var(--mv); color: #0b0507; font: 800 10.5px/1.2 var(--f-body); padding: 1px 6px; border-radius: 999px; white-space: nowrap; }
.mapa-palco .pino.mov { cursor: grab; touch-action: none; }
.pino-alvo { position: relative; display: grid; place-items: center; }
.pino-cab { transform: rotate(var(--rot, 0deg)); }
.pino.travado .pino-cab { cursor: default; } .pino.sem-nome .pino-nome { display: none; } .mapa-palco.modo-mover .pino.sem-nome.sel .pino-nome { display: none; }
.pino.sel { z-index: 7; } .pino.sel .pino-nome { display: none; }
.pino.sel .pino-alvo::before { content: ''; position: absolute; inset: -5px; border: 2px dashed var(--ambar); border-radius: 6px; pointer-events: none; }
.pino-h { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 2px solid #0b0507; box-shadow: 0 1px 4px rgba(0,0,0,.6); touch-action: none; z-index: 3; }
.pino-h.canto.nw { left: -11px; top: -11px; cursor: nwse-resize; } .pino-h.canto.se { right: -11px; bottom: -11px; cursor: nwse-resize; }
.pino-h.canto.ne { right: -11px; top: -11px; cursor: nesw-resize; } .pino-h.canto.sw { left: -11px; bottom: -11px; cursor: nesw-resize; }
.pino-h.girar { left: 50%; top: -30px; margin-left: -7px; width: 14px; height: 14px; background: var(--ambar); cursor: grab; }
.pino-h.girar::after { content: ''; position: absolute; left: 50%; top: 100%; width: 2px; height: 12px; margin-left: -1px; background: var(--ambar); }
@media (pointer: coarse) { .pino-h { width: 18px; height: 18px; } .pino-h.girar { width: 20px; height: 20px; margin-left: -10px; top: -36px; } }
.pino-barra { position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%); display: flex; gap: 2px; padding: 4px; background: rgba(14,8,8,.96); border: 1px solid #000; border-radius: 999px; box-shadow: 0 6px 18px rgba(0,0,0,.6); white-space: nowrap; z-index: 8; }
.pino-barra button { width: 30px; height: 30px; border: 0; border-radius: 50%; background: transparent; color: var(--texto); font: 700 14px/1 var(--f-body); cursor: pointer; display: grid; place-items: center; }
.pino-barra button:hover { background: var(--tabua-2); } .pino-barra button.on { background: var(--ambar); color: #0b0507; }
.pino-ics { display: flex; flex-wrap: wrap; gap: 4px; } .pino-ics button { font-size: 20px; width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid #000; background: var(--painel-2); cursor: pointer; } .pino-ics button.aqui { background: var(--ambar); }
.pino-cab { width: calc(34px * var(--tam, 1)); height: calc(34px * var(--tam, 1)); font-size: calc(17px * var(--tam, 1)); }
.mapa-palco.modo-revelar, .mapa-palco.modo-cobrir { cursor: crosshair; } .mapa-palco.modo-revelar .pino, .mapa-palco.modo-cobrir .pino { pointer-events: none; }
.pino.na-nevoa { opacity: .5; filter: grayscale(.6); }
.mapa-vista { position: relative; overflow: hidden; border: 2px solid #000; border-radius: 10px; background: #000; touch-action: pan-y; }
.mapa-vista.ampliado { touch-action: none; cursor: grab; } .mapa-vista.arrastando { cursor: grabbing; } .mapa-vista.focando, .mapa-vista.focando .pino { cursor: zoom-in; }
.mapa-vista .mapa-palco { border: 0; border-radius: 0; transform-origin: 0 0; }
.mapa-vista .pino { transform: translate(-50%, -100%) scale(var(--zs, 1)); transform-origin: 50% 100%; }
.mapa-zoom { position: absolute; right: 8px; top: 8px; z-index: 4; display: flex; gap: 4px; align-items: center; padding: 4px; background: rgba(0,0,0,.72); border: 2px solid #000; border-radius: 10px; }
.mapa-zoom button { width: 32px; height: 32px; border: 2px solid #000; border-radius: 8px; background: var(--tabua-2, #2a2a2a); color: #fff; font: 800 16px/1 sans-serif; cursor: pointer; display: grid; place-items: center; }
.mapa-zoom button:hover { background: var(--ambar); color: #1a0f05; } .mapa-zoom button.aqui { background: var(--ambar); color: #1a0f05; box-shadow: 0 0 10px var(--ambar); }
.mapa-zoom [data-z-n] { font: 800 11px var(--f-maq, monospace); color: #fff; min-width: 30px; text-align: center; }
.mapa-zoom-lista { position: absolute; right: 8px; top: 52px; z-index: 4; display: grid; gap: 4px; max-height: calc(100% - 60px); min-width: 150px; overflow-y: auto; padding: 6px; background: rgba(8,6,6,.94); border: 2px solid #000; border-radius: 10px; }
.mapa-zoom-lista button { display: flex; gap: 6px; align-items: center; text-align: left; padding: 6px 8px; border: 1px solid #000; border-radius: 7px; background: var(--tabua, #222); color: #fff; font-weight: 700; cursor: pointer; } .mapa-zoom-lista button:hover { background: var(--ambar); color: #1a0f05; }
.mapa-pop-corpo .mapa-zoom button { width: 28px; height: 28px; font-size: 14px; }
.mapa-id { --pc: #c4000d; display: grid; grid-template-columns: 54px 1fr auto; gap: 10px; align-items: start; padding: 10px 12px; border: 2px solid #000; border-left: 5px solid var(--pc); border-radius: 10px; background: var(--madeira-2, rgba(0,0,0,.6)); }
.mapa-id .mi-foto { width: 54px; height: 54px; border-radius: 50%; border: 3px solid var(--pc); background: #120607 center/cover no-repeat; display: grid; place-items: center; color: #fff; font-size: 22px; }
.mapa-id .mi-txt { display: grid; gap: 2px; min-width: 0; } .mapa-id small { font: 800 11px var(--f-body); letter-spacing: .08em; text-transform: uppercase; color: var(--texto-faint); }
.mapa-id b { font-size: 17px; } .mapa-id span { font-size: 13.5px; color: var(--texto-dim); } .mapa-id p { margin: 4px 0 0; font-size: 14px; } .mapa-id p.mi-sec { padding: 4px 8px; border: 1px dashed var(--ambar); border-radius: 6px; color: var(--texto-dim); }
.mapa-id .mi-x { width: 30px; height: 30px; border: 2px solid #000; border-radius: 8px; background: var(--tabua-2, #2a2a2a); color: #fff; font: 800 16px/1 sans-serif; cursor: pointer; }
.npc-escolha { display: grid; gap: 6px; max-height: 50vh; overflow-y: auto; }
.npc-op { display: flex; gap: 10px; align-items: center; padding: 6px 10px; border: 2px solid #000; border-radius: 10px; background: var(--madeira-2); cursor: pointer; }
.npc-op:has(input:checked:not(:disabled)) { border-color: var(--ambar); background: color-mix(in srgb, var(--ambar) 18%, var(--madeira-2)); }
.npc-op.ja { opacity: .55; cursor: default; } .npc-op > span:last-child { display: grid; } .npc-op small { font-size: 11.5px; color: var(--texto-faint); } .npc-op small.sus { color: var(--vermelho); font-weight: 800; }
.npc-op .foto-s.p { width: 44px; height: 44px; font-size: 15px; }
.mapa-pop { position: fixed; z-index: 95; display: grid; grid-template-rows: auto 1fr; min-width: 240px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); background: var(--tabua); border: 2px solid #000; border-radius: 12px; box-shadow: 6px 6px 0 #000, 0 10px 40px rgba(0,0,0,.6); overflow: hidden; resize: horizontal; transition: box-shadow .2s; }
.mapa-pop.pisca { box-shadow: 0 0 0 3px var(--ambar), 6px 6px 0 #000; }
.mapa-pop-cab { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 8px 6px 12px; background: var(--madeira); border-bottom: 2px solid #000; cursor: move; touch-action: none; user-select: none; }
.mapa-pop-cab b { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mapa-pop-cab button { width: 30px; height: 30px; border: 2px solid #000; border-radius: 8px; background: var(--tabua-2); color: #fff; font: 800 16px/1 sans-serif; cursor: pointer; }
.mapa-pop-cab button[data-pop="x"] { background: var(--vermelho); }
.mapa-pop-corpo { overflow: auto; } .mapa-pop-corpo .caixa { border: 0; border-radius: 0; box-shadow: none; margin: 0; padding: 8px; } .mapa-pop-corpo .mapa-caixa > .btns { display: none; }
.mapa-pop-corpo .mapa-caixa > p.tag { display: none; }
.mapa-caixa > * { min-width: 0; }
.mapa-caixa [hidden], .mapa-pop [hidden] { display: none !important; }
/* barra do zoom recolhida */
.mapa-zoom .z-dobra .zd-abre { display: none; } .mapa-zoom.recolhida { padding: 3px; gap: 0; background: rgba(0,0,0,.5); }
.mapa-zoom.recolhida > :not(.z-dobra) { display: none; } .mapa-zoom.recolhida .z-dobra .zd-fecha { display: none; } .mapa-zoom.recolhida .z-dobra .zd-abre { display: grid; }
.mapa-zoom .z-dobra { font-size: 20px; } .mapa-zoom.recolhida .z-dobra { opacity: .75; } .mapa-zoom.recolhida .z-dobra:hover { opacity: 1; }
.mapa-zoom .z-dobra .ic { width: 17px; height: 17px; }
/* régua */
.pino { -webkit-touch-callout: none; }
.pino-medir { position: absolute; left: 100%; top: 50%; margin: -13px 0 0 2px; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #000; background: var(--ambar); color: #1a0f05; display: none; place-items: center; padding: 0; cursor: crosshair; z-index: 4; box-shadow: 0 2px 6px rgba(0,0,0,.5); }
.pino-medir .ic { width: 15px; height: 15px; }
@media (hover: hover) and (pointer: fine) { .pino:hover > .pino-medir { display: grid; } }
.mapa-palco.modo-revelar .pino-medir, .mapa-palco.modo-cobrir .pino-medir, .pino.arrastando > .pino-medir, .mapa-vista.medindo .pino-medir { display: none !important; }
.mapa-vista.medindo, .mapa-vista.medindo .pino { cursor: crosshair; }
.mapa-regua { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3; overflow: visible; }
.mapa-regua .rg-cel { fill: color-mix(in srgb, var(--ambar) 30%, transparent); stroke: var(--ambar); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.mapa-regua .rg-som { stroke: rgba(0,0,0,.55); stroke-linecap: round; }
.mapa-regua .rg-lin { stroke: var(--ambar); stroke-linecap: round; stroke-dasharray: 0; }
.mapa-regua .rg-pta { fill: var(--ambar); stroke: rgba(0,0,0,.6); stroke-linejoin: round; }
.mapa-regua .rg-ori { fill: var(--ambar); stroke: #000; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.regua-rot { position: absolute; z-index: 6; transform: translate(-50%, calc(-100% - 12px)) scale(var(--zs, 1)); transform-origin: 50% 100%; display: flex; gap: 6px; align-items: center; padding: 4px 10px; border: 2px solid #000; border-radius: 999px; background: rgba(10,6,6,.92); color: #fff; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,.55); pointer-events: none; }
.regua-rot.baixo { transform: translate(-50%, 12px) scale(var(--zs, 1)); transform-origin: 50% 0; }
.regua-rot.esq { transform: translate(-14px, calc(-100% - 12px)) scale(var(--zs, 1)); transform-origin: 0 100%; } .regua-rot.dir { transform: translate(calc(-100% + 14px), calc(-100% - 12px)) scale(var(--zs, 1)); transform-origin: 100% 100%; }
.regua-rot.baixo.esq { transform: translate(-14px, 12px) scale(var(--zs, 1)); transform-origin: 0 0; } .regua-rot.baixo.dir { transform: translate(calc(-100% + 14px), 12px) scale(var(--zs, 1)); transform-origin: 100% 0; }
.mapa-zoom { flex-wrap: wrap; justify-content: flex-end; max-width: calc(100% - 16px); }
.mapa-grade-ctl .gc-m { flex-wrap: wrap; } .mapa-grade-ctl .gc-m input[type=number] { width: 84px; flex: none; }
.regua-rot b { font: 800 14px var(--f-body, sans-serif); color: var(--ambar); } .regua-rot span { font: 700 13px var(--f-body, sans-serif); }
.regua-rot button { pointer-events: auto; width: 24px; height: 24px; margin-right: -4px; border: 0; border-radius: 50%; background: rgba(255,255,255,.14); color: #fff; font: 800 15px/1 sans-serif; cursor: pointer; }
.mapa-id .mi-acoes { display: flex; gap: 6px; align-items: center; } .mapa-id .mi-acoes .btn .ic { width: 15px; height: 15px; }`;
  // ADR: a base visual de lá (as outras páginas trazem a própria) e as mesmas regras com as cores e bordas do tema
  const BASE_ADR = `.mapa-caixa { display: grid; gap: 10px; } .mapa-caixa h3 { margin: 0; font: 400 22px var(--f-disp); }
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
  if (TEMA() === 'adr') css.textContent = BASE_ADR + '\n' + css.textContent
    .replace(/var\(--ambar(?:, [^)]*)?\)/g, 'var(--ouro)').replace(/var\(--tabua-2(?:, [^)]*)?\)/g, 'var(--painel-3)').replace(/var\(--tabua(?:, [^)]*)?\)/g, 'var(--painel-2)')
    .replace(/var\(--madeira-2(?:, [^)]*)?\)/g, 'var(--painel)').replace(/var\(--madeira(?:, [^)]*)?\)/g, 'var(--painel-3)')
    .replace(/var\(--texto-dim(?:, [^)]*)?\)/g, 'var(--lua-dim)').replace(/var\(--texto-faint(?:, [^)]*)?\)/g, 'var(--lua-faint)').replace(/var\(--texto(?:, [^)]*)?\)/g, 'var(--lua)')
    .replace(/var\(--vermelho(?:, [^)]*)?\)/g, 'var(--sangue)').replace(/var\(--f-maq(?:, [^)]*)?\)/g, 'var(--f-mono)')
    .replace(/2px solid #000/g, '1px solid var(--linha-2)').replace(/box-shadow: 2px 2px 0 #000;?/g, '').replace(/6px 6px 0 #000/g, '0 16px 40px rgba(0,0,0,.55)').replace(/, 2px 2px 0 #000/g, '');
  document.head.appendChild(css);
  /* ---------- o bicho entra em cena: pino dele aparece perto dos jogadores ----------
     Chamado quando a Diretora aperta Aparecer. Se já existe pino dele, ele é
     movido e revelado; se não existe, nasce ali mesmo. Sem mapa aberto, não faz nada. */
  const IC_ENTRADA = { fita: 'olho', faca: 'faca', sangue: 'gota', anomalia: 'alvo', bicho: 'caveira', boneca: 'estrela',
    vulto: 'fantasma', glitch: 'raio', apagao: 'vela', brasa: 'bomba', nevoa: 'fantasma', afogar: 'gota', motosserra: 'machado', sino: 'caveira' };

  async function surgirAssassino(getC, salvarC, { nome = 'O Assassino', foto = '', cor = '#8e0010', estilo = '', ic = '', chave = '' } = {}) {
    const C = getC() || {}, cenas = cenasDe(C), cena = ativoDe(C);
    if (!cena || !cena.img) return 'sem-mapa';
    const pinos = [...(cena.pinos || [])];
    const jog = pinos.filter(p => p.ficha && !p.oculto);
    let x = 50, y = 34;
    if (jog.length) {
      x = jog.reduce((a, p) => a + (+p.x || 50), 0) / jog.length;
      y = jog.reduce((a, p) => a + (+p.y || 50), 0) / jog.length;
      const ang = Math.random() * Math.PI * 2, raio = 10 + Math.random() * 5;
      x += Math.cos(ang) * raio; y += Math.sin(ang) * raio;
    }
    const trava = v => Math.min(94, Math.max(6, +v.toFixed(2)));
    const novo = { assassino: true, nome, foto: foto || '', cor: cor || '#8e0010',
      ic: ic || IC_ENTRADA[estilo] || 'faca', oculto: false, tam: 1.35, x: trava(x), y: trava(y), t: Date.now() };
    const i = chave ? pinos.findIndex(p => p.ameaca === chave) : pinos.findIndex(p => p.assassino && (!p.ameaca || p.ameaca === 'principal'));
    if (chave) { delete novo.assassino; novo.ameaca = chave; }
    if (i >= 0) pinos[i] = { ...pinos[i], ...novo }; else pinos.push({ id: novoId('p'), ...novo });
    const l = cenas.map(c => c.id === cena.id ? { ...c, pinos } : c);
    await salvarC({ mapas: l, ...(C.mapa ? { mapa: null } : {}) });
    return jog.length ? 'perto' : 'centro';
  }

  window.desenharMapa = desenharMapa; window.abrirMapaFlutuante = abrirMapaFlutuante; window.surgirAssassino = surgirAssassino;
})();
