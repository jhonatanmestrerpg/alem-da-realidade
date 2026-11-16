/* =====================================================================
   APARIÇÃO: entrada do bicho, efeitos sonoros e trilha da perseguição.
   Tudo gerado aqui mesmo (Web Audio + canvas): nenhum arquivo de áudio
   externo, nada baixado. A Diretora escolhe o estilo e a cor de cada
   criatura; a trilha da perseguição é um arquivo que ela mesma envia.
   Usado por classico/, bichos/ e scp/.
   ===================================================================== */
'use strict';
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, pend = null;
  const ler = (k, p) => { try { const v = localStorage.getItem(k); return v === null ? p : v; } catch (e) { return p; } };
  const grav = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  const A = {
    mudo: ler('adr-mudo', '0') === '1',
    vol: Math.min(1, Math.max(0, +ler('adr-vol', '0.8') || 0.8)),
  };

  /* ---------- oficina de som ---------- */
  const audio = () => {
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  const ruidoBuf = (c, seg) => { const b = c.createBuffer(1, Math.max(1, (c.sampleRate * seg) | 0), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  const no = (c, seg) => { const s = c.createBufferSource(); s.buffer = ruidoBuf(c, seg); return s; };
  const env = (c, t, a, d, pico) => { const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(Math.max(.0002, pico), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); return g; };
  const fil = (c, tipo, f, q) => { const b = c.createBiquadFilter(); b.type = tipo; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };
  const curvaDist = (() => { const n = 1024, cv = new Float32Array(n), k = 22; for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; cv[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x)); } return cv; })();
  const dist = c => { const w = c.createWaveShaper(); w.curve = curvaDist; return w; };

  /* cada som: (ctx, t0, volume, saida). Duração aproximada no campo seg. */
  const S = {
    silencio: { nome: 'Nenhum', seg: 0, f() {} },

    faca: { nome: 'Faca raspando', seg: .6, f(c, t, v, o) {
      const n = no(c, .5), bp = fil(c, 'bandpass', 3000, 6), g = env(c, t, .01, .34, v * .5);
      bp.frequency.setValueAtTime(1800, t); bp.frequency.exponentialRampToValueAtTime(6500, t + .3);
      n.connect(bp).connect(g).connect(o); n.start(t); n.stop(t + .5);
      const s = c.createOscillator(), sg = env(c, t + .02, .005, .5, v * .18); s.type = 'triangle';
      s.frequency.setValueAtTime(2600, t + .02); s.frequency.exponentialRampToValueAtTime(1500, t + .5);
      s.connect(sg).connect(o); s.start(t + .02); s.stop(t + .56);
    } },

    impacto: { nome: 'Pancada', seg: .5, f(c, t, v, o) {
      const s = c.createOscillator(), g = env(c, t, .005, .45, v * .9); s.type = 'sine';
      s.frequency.setValueAtTime(120, t); s.frequency.exponentialRampToValueAtTime(32, t + .4);
      s.connect(g).connect(o); s.start(t); s.stop(t + .5);
      const n = no(c, .25), lp = fil(c, 'lowpass', 400), ng = env(c, t, .002, .2, v * .5);
      n.connect(lp).connect(ng).connect(o); n.start(t); n.stop(t + .25);
    } },

    osso: { nome: 'Osso quebrando', seg: .3, f(c, t, v, o) {
      for (let i = 0; i < 3; i++) { const d = t + i * .045, n = no(c, .08), hp = fil(c, 'highpass', 1200), g = env(c, d, .001, .06, v * .55 * (1 - i * .2));
        n.connect(hp).connect(g).connect(o); n.start(d); n.stop(d + .08); }
      const s = c.createOscillator(), g = env(c, t, .002, .18, v * .4); s.type = 'square';
      s.frequency.setValueAtTime(220, t); s.frequency.exponentialRampToValueAtTime(70, t + .15);
      s.connect(g).connect(o); s.start(t); s.stop(t + .2);
    } },

    grito: { nome: 'Grito', seg: 1, f(c, t, v, o) {
      const s = c.createOscillator(), g = env(c, t, .06, .9, v * .3), bp = fil(c, 'bandpass', 1100, 2.2); s.type = 'sawtooth';
      s.frequency.setValueAtTime(380, t); s.frequency.linearRampToValueAtTime(880, t + .22); s.frequency.exponentialRampToValueAtTime(260, t + .95);
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 13; lg.gain.value = 34; l.connect(lg).connect(s.frequency); l.start(t); l.stop(t + 1);
      s.connect(bp).connect(g).connect(o); s.start(t); s.stop(t + 1);
      const n = no(c, 1), nb = fil(c, 'bandpass', 2200, 1.4), ng = env(c, t, .08, .8, v * .12);
      n.connect(nb).connect(ng).connect(o); n.start(t); n.stop(t + 1);
    } },

    corrida: { nome: 'Passos correndo', seg: 1.5, f(c, t, v, o) {
      for (let i = 0; i < 7; i++) { const d = t + i * .2;
        const n = no(c, .12), lp = fil(c, 'lowpass', 700), g = env(c, d, .004, .1, v * .45);
        n.connect(lp).connect(g).connect(o); n.start(d); n.stop(d + .12);
        const s = c.createOscillator(), sg = env(c, d, .003, .1, v * .35); s.type = 'sine';
        s.frequency.setValueAtTime(90, d); s.frequency.exponentialRampToValueAtTime(45, d + .09);
        s.connect(sg).connect(o); s.start(d); s.stop(d + .12); }
    } },

    passoPesado: { nome: 'Passo pesado', seg: 2.2, f(c, t, v, o) {
      for (let i = 0; i < 4; i++) { const d = t + i * .55;
        const s = c.createOscillator(), g = env(c, d, .006, .5, v * .85); s.type = 'sine';
        s.frequency.setValueAtTime(95, d); s.frequency.exponentialRampToValueAtTime(28, d + .45);
        s.connect(g).connect(o); s.start(d); s.stop(d + .55);
        const n = no(c, .3), lp = fil(c, 'lowpass', 300), ng = env(c, d, .003, .26, v * .4);
        n.connect(lp).connect(ng).connect(o); n.start(d); n.stop(d + .3); }
    } },

    corrente: { nome: 'Correntes', seg: 1, f(c, t, v, o) {
      for (let i = 0; i < 14; i++) { const d = t + Math.random() * .9, n = no(c, .05), bp = fil(c, 'bandpass', 3200 + Math.random() * 2600, 9), g = env(c, d, .001, .05, v * .3);
        n.connect(bp).connect(g).connect(o); n.start(d); n.stop(d + .06); }
    } },

    sino: { nome: 'Sino', seg: 2.6, f(c, t, v, o) {
      [1, 2.76, 5.4, 8.93].forEach((m, i) => { const s = c.createOscillator(), g = env(c, t, .004, 2.4 / (1 + i * .7), v * .3 / (1 + i)); s.type = 'sine';
        s.frequency.value = 523.25 * m; s.connect(g).connect(o); s.start(t); s.stop(t + 2.6); });
    } },

    caixinha: { nome: 'Caixinha de música', seg: 2.8, f(c, t, v, o) {
      [0, 3, 7, 3, 0, -2, 0].forEach((st, i) => { const fq = 659.25 * Math.pow(2, st / 12), d = t + i * .34;
        [1, 2.8, 5.1].forEach((m, k) => { const s = c.createOscillator(), g = env(c, d, .004, 1.1 / (1 + k), v * .26 / (1 + k * 1.5)); s.type = 'sine';
          s.frequency.value = fq * m; s.connect(g).connect(o); s.start(d); s.stop(d + 1.3); }); });
    } },

    balido: { nome: 'Balido', seg: .9, f(c, t, v, o) {
      const s = c.createOscillator(), g = env(c, t, .05, .75, v * .3), bp = fil(c, 'bandpass', 900, 1.6); s.type = 'sawtooth';
      s.frequency.setValueAtTime(430, t); s.frequency.linearRampToValueAtTime(360, t + .7);
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 11; lg.gain.value = 48; l.connect(lg).connect(s.frequency); l.start(t); l.stop(t + .8);
      s.connect(bp).connect(g).connect(o); s.start(t); s.stop(t + .8);
    } },

    sirene: { nome: 'Alarme de contenção', seg: 2.6, f(c, t, v, o) {
      const s = c.createOscillator(), g = c.createGain(), lp = fil(c, 'lowpass', 1800); s.type = 'square'; g.gain.value = 0;
      s.connect(lp).connect(g).connect(o);
      for (let k = 0; k < 4; k++) { const d = t + k * .62; s.frequency.setValueAtTime(k % 2 ? 520 : 760, d);
        g.gain.setValueAtTime(0, d); g.gain.linearRampToValueAtTime(v * .22, d + .06); g.gain.setValueAtTime(v * .22, d + .5); g.gain.linearRampToValueAtTime(0, d + .6); }
      s.start(t); s.stop(t + 2.6);
    } },

    rosnado: { nome: 'Rosnado', seg: 1.4, f(c, t, v, o) {
      const n = no(c, 1.3), lp = fil(c, 'lowpass', 320, 3), g = env(c, t, .12, 1.1, v * .65), d_ = dist(c);
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 22; lg.gain.value = .35; l.connect(lg).connect(g.gain); l.start(t); l.stop(t + 1.3);
      n.connect(lp).connect(d_).connect(g).connect(o); n.start(t); n.stop(t + 1.3);
      const s = c.createOscillator(), sg = env(c, t, .1, 1.1, v * .3); s.type = 'sawtooth';
      s.frequency.setValueAtTime(62, t); s.frequency.linearRampToValueAtTime(44, t + 1.2);
      s.connect(sg).connect(o); s.start(t); s.stop(t + 1.3);
    } },

    uivo: { nome: 'Uivo', seg: 2.2, f(c, t, v, o) {
      const s = c.createOscillator(), bp = fil(c, 'bandpass', 700, 2), g = env(c, t, .3, 1.9, v * .3); s.type = 'sawtooth';
      s.frequency.setValueAtTime(230, t); s.frequency.linearRampToValueAtTime(420, t + .7);
      s.frequency.setValueAtTime(420, t + 1.3); s.frequency.linearRampToValueAtTime(180, t + 2.1);
      s.connect(bp).connect(g).connect(o); s.start(t); s.stop(t + 2.2);
    } },

    sussurro: { nome: 'Sussurros', seg: 2.2, f(c, t, v, o) {
      const n = no(c, 2.2), bp = fil(c, 'bandpass', 1500, 3), g = c.createGain(); g.gain.value = 0;
      for (let k = 0; k < 18; k++) { const d = t + k * .12; g.gain.setValueAtTime(Math.random() * v * .22, d); bp.frequency.setValueAtTime(900 + Math.random() * 2200, d); }
      g.gain.linearRampToValueAtTime(0, t + 2.2);
      n.connect(bp).connect(g).connect(o); n.start(t); n.stop(t + 2.2);
    } },

    respiracao: { nome: 'Respiração', seg: 2.2, f(c, t, v, o) {
      [0, 1.15].forEach((d0, i) => { const d = t + d0, n = no(c, 1), bp = fil(c, 'bandpass', i ? 700 : 1100, .9), g = c.createGain();
        g.gain.setValueAtTime(0, d); g.gain.linearRampToValueAtTime(v * .3, d + .3); g.gain.linearRampToValueAtTime(0, d + .95);
        n.connect(bp).connect(g).connect(o); n.start(d); n.stop(d + 1); });
    } },

    estatica: { nome: 'Estática', seg: 2.4, f(c, t, v, o) {
      const n = no(c, 2), bp = fil(c, 'bandpass', 1700, .6), g = env(c, t, .04, 2.2, v * .4); n.loop = true;
      for (let k = 0; k < 16; k++) bp.frequency.setValueAtTime(900 + Math.random() * 2600, t + k / 6);
      n.connect(bp).connect(g).connect(o); n.start(t); n.stop(t + 2.4);
    } },

    coracao: { nome: 'Coração', seg: 3.2, f(c, t, v, o) {
      for (let k = 0; k < 4; k++) [0, .22].forEach((dd, i) => { const d = t + k * .8 + dd, s = c.createOscillator(), g = env(c, d, .02, .25, v * (i ? .5 : .8)); s.type = 'sine';
        s.frequency.setValueAtTime(i ? 48 : 58, d); s.frequency.exponentialRampToValueAtTime(30, d + .18);
        s.connect(g).connect(o); s.start(d); s.stop(d + .3); });
    } },

    motosserra: { nome: 'Motosserra', seg: 2, f(c, t, v, o) {
      const s = c.createOscillator(), d_ = dist(c), lp = fil(c, 'lowpass', 2400), g = env(c, t, .06, 1.8, v * .28); s.type = 'sawtooth';
      s.frequency.setValueAtTime(70, t); s.frequency.linearRampToValueAtTime(150, t + .4);
      s.frequency.linearRampToValueAtTime(95, t + 1); s.frequency.linearRampToValueAtTime(170, t + 1.6);
      s.connect(d_).connect(lp).connect(g).connect(o); s.start(t); s.stop(t + 2);
    } },

    vidro: { nome: 'Vidro quebrando', seg: 1, f(c, t, v, o) {
      const n = no(c, .2), hp = fil(c, 'highpass', 2600), g = env(c, t, .002, .18, v * .4);
      n.connect(hp).connect(g).connect(o); n.start(t); n.stop(t + .2);
      for (let i = 0; i < 16; i++) { const d = t + .02 + Math.random() * .6, s = c.createOscillator(), sg = env(c, d, .002, .12 + Math.random() * .3, v * .12); s.type = 'sine';
        s.frequency.value = 1800 + Math.random() * 4200; s.connect(sg).connect(o); s.start(d); s.stop(d + .5); }
    } },

    tiro: { nome: 'Tiro', seg: .5, f(c, t, v, o) {
      const n = no(c, .4), lp = fil(c, 'lowpass', 3000), g = env(c, t, .001, .3, v * .9);
      n.connect(lp).connect(g).connect(o); n.start(t); n.stop(t + .4);
      const s = c.createOscillator(), sg = env(c, t, .001, .25, v * .6); s.type = 'sine';
      s.frequency.setValueAtTime(140, t); s.frequency.exponentialRampToValueAtTime(40, t + .2);
      s.connect(sg).connect(o); s.start(t); s.stop(t + .3);
    } },

    eletrico: { nome: 'Curto elétrico', seg: .9, f(c, t, v, o) {
      for (let i = 0; i < 12; i++) { const d = t + i * .06 + Math.random() * .03, s = c.createOscillator(), g = env(c, d, .001, .04, v * .28); s.type = 'square';
        s.frequency.value = 600 + Math.random() * 3400; s.connect(g).connect(o); s.start(d); s.stop(d + .05); }
      const n = no(c, .8), hp = fil(c, 'highpass', 3000), ng = env(c, t, .01, .7, v * .18);
      n.connect(hp).connect(ng).connect(o); n.start(t); n.stop(t + .8);
    } },

    porta: { nome: 'Porta rangendo', seg: 1.7, f(c, t, v, o) {
      const s = c.createOscillator(), bp = fil(c, 'bandpass', 900, 14), g = env(c, t, .1, 1.5, v * .3); s.type = 'sawtooth';
      for (let k = 0; k < 22; k++) s.frequency.setValueAtTime(110 + Math.random() * 120 + k * 6, t + k * .07);
      s.connect(bp).connect(g).connect(o); s.start(t); s.stop(t + 1.7);
    } },

    relogio: { nome: 'Relógio', seg: 4, f(c, t, v, o) {
      for (let i = 0; i < 8; i++) { const d = t + i * .5, n = no(c, .03), hp = fil(c, 'highpass', 2200), g = env(c, d, .001, .03, v * .3);
        n.connect(hp).connect(g).connect(o); n.start(d); n.stop(d + .04); }
    } },

    risada: { nome: 'Risada', seg: 1.2, f(c, t, v, o) {
      for (let i = 0; i < 6; i++) { const d = t + i * .17, s = c.createOscillator(), g = env(c, d, .02, .14, v * .26), bp = fil(c, 'bandpass', i % 2 ? 850 : 1250, 2.5); s.type = 'sawtooth';
        s.frequency.setValueAtTime(220 - i * 8, d); s.frequency.linearRampToValueAtTime(150 - i * 6, d + .13);
        s.connect(bp).connect(g).connect(o); s.start(d); s.stop(d + .16); }
    } },

    zumbido: { nome: 'Tensão subindo', seg: 1.9, f(c, t, v, o) {
      const s = c.createOscillator(), g = c.createGain(), lp = fil(c, 'lowpass', 900); s.type = 'sawtooth';
      s.frequency.setValueAtTime(70, t); s.frequency.exponentialRampToValueAtTime(680, t + 1.7);
      lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(5000, t + 1.7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .25, t + 1.6); g.gain.linearRampToValueAtTime(0, t + 1.85);
      s.connect(lp).connect(g).connect(o); s.start(t); s.stop(t + 1.9);
      const n = no(c, 1.9), hp = fil(c, 'highpass', 2000), ng = c.createGain();
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * .14, t + 1.6); ng.gain.linearRampToValueAtTime(0, t + 1.85);
      n.connect(hp).connect(ng).connect(o); n.start(t); n.stop(t + 1.9);
    } },

    agua: { nome: 'Água e sangue', seg: .8, f(c, t, v, o) {
      const n = no(c, .7), lp = fil(c, 'lowpass', 1200, 6), g = env(c, t, .02, .6, v * .5);
      lp.frequency.setValueAtTime(2200, t); lp.frequency.exponentialRampToValueAtTime(260, t + .55);
      n.connect(lp).connect(g).connect(o); n.start(t); n.stop(t + .7);
      for (let i = 0; i < 5; i++) { const d = t + .05 + Math.random() * .5, s = c.createOscillator(), sg = env(c, d, .004, .12, v * .18); s.type = 'sine';
        s.frequency.setValueAtTime(900 + Math.random() * 700, d); s.frequency.exponentialRampToValueAtTime(260, d + .1);
        s.connect(sg).connect(o); s.start(d); s.stop(d + .15); }
    } },
  };

  /* ---------- estilos de entrada ---------- */
  const E = {
    fita:       { nome: 'Fita VHS',             cor: '#d9d9d9', som: 'estatica',   tela: 'ruido',  faixa: 'REC' },
    faca:       { nome: 'Corte',                cor: '#c4000d', som: 'faca',       tela: 'cortes' },
    sangue:     { nome: 'Sangue',               cor: '#8b0000', som: 'impacto',    tela: 'gotas' },
    anomalia:   { nome: 'Quebra de contenção',  cor: '#ffb300', som: 'sirene',     tela: 'alerta', faixa: 'CONTENÇÃO ROMPIDA' },
    bicho:      { nome: 'Garras',               cor: '#8d6e63', som: 'rosnado',    tela: 'garras' },
    boneca:     { nome: 'Caixinha de música',   cor: '#f48fb1', som: 'caixinha',   tela: 'iris' },
    vulto:      { nome: 'Vulto',                cor: '#20232a', som: 'respiracao', tela: 'sombra' },
    glitch:     { nome: 'Falha de imagem',      cor: '#00e5ff', som: 'eletrico',   tela: 'glitch' },
    apagao:     { nome: 'Apagão',               cor: '#101010', som: 'coracao',    tela: 'apagao' },
    brasa:      { nome: 'Brasa',                cor: '#ff6d00', som: 'zumbido',    tela: 'brasa' },
    nevoa:      { nome: 'Névoa',                cor: '#90a4ae', som: 'sussurro',   tela: 'nevoa' },
    afogar:     { nome: 'Afogamento',           cor: '#0277bd', som: 'agua',       tela: 'ondas' },
    motosserra: { nome: 'Motosserra',           cor: '#616161', som: 'motosserra', tela: 'tremor' },
    sino:       { nome: 'Sino',                 cor: '#ffd54f', som: 'sino',       tela: 'pulso' },
  };

  /* ---------- camada na tela ---------- */
  const hosp = el => { const h = document.fullscreenElement || document.webkitFullscreenElement || document.body; if (el.parentNode !== h) h.appendChild(el); return el; };
  const camada = cor => {
    let c = document.getElementById('ap-camada');
    if (!c) { c = document.createElement('div'); c.id = 'ap-camada'; c.className = 'ap'; c.innerHTML = '<canvas></canvas><div class="ap-pecas"></div>'; }
    c.style.setProperty('--apc', cor || '#c4000d');
    c.className = 'ap';
    c.querySelector('.ap-pecas').innerHTML = '';
    hosp(c); return c;
  };
  const limpar = () => { document.getElementById('ap-camada')?.remove(); document.body.classList.remove('ap-treme', 'ap-treme-forte'); };
  const peca = (c, cls, css = '', txt = '') => { const d = document.createElement('div'); d.className = cls; if (css) d.style.cssText = css; if (txt) d.textContent = txt; c.querySelector('.ap-pecas').appendChild(d); return d; };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ruído de TV no canvas */
  function ruidoTela(c, ms, cor) {
    const cv = c.querySelector('canvas'); cv.width = 160; cv.height = 100;
    const g = cv.getContext('2d'), id = g.createImageData(160, 100);
    const rgb = hexRGB(cor), fim = Date.now() + ms;
    c.classList.add('ativo', 'tinge');
    const passo = () => {
      for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255;
        id.data[i] = Math.min(255, v * (.22 + rgb[0] / 255 * .78)); id.data[i + 1] = Math.min(255, v * (.22 + rgb[1] / 255 * .78)); id.data[i + 2] = Math.min(255, v * (.22 + rgb[2] / 255 * .78)); id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0);
      if (Date.now() < fim) requestAnimationFrame(passo); else c.classList.remove('ativo', 'tinge');
    }; passo();
  }
  const hexRGB = h => { const s = String(h || '#c4000d').replace('#', ''); const n = s.length === 3 ? s.split('').map(x => x + x).join('') : s.slice(0, 6); const v = parseInt(n, 16) || 0; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };

  /* partículas no canvas: brasa subindo ou ondas */
  function particulas(c, ms, cor, modo) {
    const cv = c.querySelector('canvas'), L = cv.width = Math.min(900, innerWidth), H = cv.height = Math.min(600, innerHeight);
    const g = cv.getContext('2d'), rgb = hexRGB(cor), fim = Date.now() + ms;
    const ps = Array.from({ length: modo === 'brasa' ? 90 : 7 }, () => modo === 'brasa'
      ? { x: Math.random() * L, y: H + Math.random() * H, vy: rnd(.6, 2.6), r: rnd(.8, 2.6), a: rnd(.3, 1) }
      : { x: L / 2 + rnd(-L / 3, L / 3), y: H / 2 + rnd(-H / 3, H / 3), r: 0, vr: rnd(1.4, 4), a: 1 });
    c.classList.add('ativo');
    const passo = () => {
      g.clearRect(0, 0, L, H);
      ps.forEach(p => {
        if (modo === 'brasa') { p.y -= p.vy; p.x += Math.sin(p.y / 28) * .6; if (p.y < -5) { p.y = H + 5; p.x = Math.random() * L; }
          g.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${p.a})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
        else { p.r += p.vr; p.a = Math.max(0, 1 - p.r / (L / 2)); if (p.a <= .02) { p.r = 0; p.a = 1; p.x = L / 2 + rnd(-L / 3, L / 3); p.y = H / 2 + rnd(-H / 3, H / 3); }
          g.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${p.a * .7})`; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.stroke(); }
      });
      if (Date.now() < fim) requestAnimationFrame(passo); else { c.classList.remove('ativo'); g.clearRect(0, 0, L, H); }
    }; passo();
  }

  /* desenha o efeito escolhido */
  function tela(tipo, cor, faixa) {
    const c = camada(cor), ms = 4200;
    const treme = (forte, t = 3200) => { document.body.classList.add(forte ? 'ap-treme-forte' : 'ap-treme'); setTimeout(() => document.body.classList.remove('ap-treme', 'ap-treme-forte'), t); };
    c.classList.add('vivo');
    if (tipo === 'ruido') { ruidoTela(c, ms, cor); treme(false); for (let i = 0; i < 6; i++) peca(c, 'ap-risada', `${i % 2 ? 'top' : 'bottom'}:${rnd(5, 70)}%;${i % 3 ? 'left' : 'right'}:${rnd(3, 60)}%;--r:${rnd(-14, 14)}deg;font-size:${rnd(18, 44) | 0}px;animation-delay:${(i * .3).toFixed(2)}s`, ['HahahahAhhAHHAHhAH', 'hAhAHaHAHahHAH', 'HAHAHAhahaHAHAH', 'ahAHahHAhaHAHaHAH'][i % 4]); }
    else if (tipo === 'cortes') { c.classList.add('ap-fundo'); for (let i = 0; i < 4; i++) peca(c, 'ap-corte', `top:${rnd(8, 72)}%;--r:${rnd(-38, 38)}deg;--d:${(i * .16).toFixed(2)}s`); treme(true, 1400); }
    else if (tipo === 'garras') { c.classList.add('ap-fundo'); [0, 1, 2, 3].forEach(i => peca(c, 'ap-garra', `left:${18 + i * 17}%;--d:${(i * .07).toFixed(2)}s;--h:${rnd(55, 85)}%`)); treme(true, 1200); }
    else if (tipo === 'gotas') { c.classList.add('ap-fundo'); peca(c, 'ap-sangue-topo'); for (let i = 0; i < 16; i++) peca(c, 'ap-gota', `left:${rnd(1, 97)}%;--d:${rnd(0, 1.6).toFixed(2)}s;--w:${rnd(3, 11) | 0}px;--t:${rnd(1.6, 3.4).toFixed(2)}s`); }
    else if (tipo === 'alerta') { c.classList.add('ap-strobe'); peca(c, 'ap-faixa', '', faixa || 'ALERTA'); peca(c, 'ap-barras'); treme(false, 2600); }
    else if (tipo === 'iris') { c.classList.add('ap-iris'); peca(c, 'ap-brilho'); }
    else if (tipo === 'sombra') { c.classList.add('ap-sombra'); peca(c, 'ap-olhos'); }
    else if (tipo === 'glitch') { c.classList.add('ap-glitch'); ruidoTela(c, 1500, cor); for (let i = 0; i < 7; i++) peca(c, 'ap-fatia', `top:${rnd(0, 92)}%;height:${rnd(4, 28) | 0}px;--x:${rnd(-14, 14)}%;--d:${rnd(0, 1.4).toFixed(2)}s`); treme(true, 1600); }
    else if (tipo === 'apagao') { c.classList.add('ap-apagao'); peca(c, 'ap-vulto'); }
    else if (tipo === 'brasa') { particulas(c, ms, cor, 'brasa'); c.classList.add('ap-vinheta'); }
    else if (tipo === 'ondas') { particulas(c, ms, cor, 'ondas'); c.classList.add('ap-vinheta', 'ap-agua'); }
    else if (tipo === 'nevoa') { c.classList.add('ap-nevoa'); [0, 1, 2].forEach(i => peca(c, 'ap-bruma', `--d:${(i * 1.1).toFixed(2)}s;--y:${20 + i * 26}%`)); }
    else if (tipo === 'tremor') { c.classList.add('ap-vinheta', 'ap-fundo'); ruidoTela(c, 2200, cor); treme(true, 3200); for (let i = 0; i < 5; i++) peca(c, 'ap-corte', `top:${rnd(12, 82)}%;--r:${rnd(-10, 10)}deg;--d:${(i * .32).toFixed(2)}s`); }
    else if (tipo === 'pulso') { c.classList.add('ap-vinheta'); [0, 1, 2, 3].forEach(i => peca(c, 'ap-anel', `--d:${(i * .55).toFixed(2)}s`)); }
    else { ruidoTela(c, ms, cor); treme(false); }
    setTimeout(() => { if (document.getElementById('ap-camada') === c) limpar(); }, ms + 600);
  }

  /* ---------- cinemática: moldura na cor do bicho ---------- */
  function cinematica(ap) {
    return new Promise(res => {
      const cor = ap.cor || E[ap.estilo]?.cor || '#c4000d';
      const el = document.createElement('div'); el.className = 'ap-cine'; el.style.setProperty('--apc', cor);
      const ini = String(ap.nome || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
      el.innerHTML = `<div class="ap-barra t"></div><div class="ap-barra b"></div>
        <div class="ap-moldura"><div class="ap-mc a"></div><div class="ap-mc b"></div><div class="ap-mc c"></div><div class="ap-mc d"></div>
          <div class="ap-retrato"${ap.foto ? ` style="background-image:url('${String(ap.foto).replace(/["'<>]/g, '')}')"` : ''}>${ap.foto ? '' : ini}</div>
          <div class="ap-txt"><span class="ap-rot">${esc(ap.rotulo || 'Apareceu')}</span><b>${esc(ap.nome || '???')}</b>${ap.frase ? `<i>"${esc(ap.frase)}"</i>` : ''}</div>
        </div>`;
      hosp(el);
      requestAnimationFrame(() => el.classList.add('entra'));
      setTimeout(() => el.classList.add('sai'), 2400);
      setTimeout(() => { el.remove(); res(); }, 3000);
    });
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /* ---------- trilha da perseguição ---------- */
  let trilha = null, trilhaUrl = '';
  function trilhaLigar(url, vol) {
    if (!url || A.mudo) return;
    if (trilha && trilhaUrl === url) return;
    trilhaDesligar();
    try {
      const a = new Audio(url); a.loop = true; a.preload = 'auto'; a.crossOrigin = 'anonymous';
      a.volume = 0; trilha = a; trilhaUrl = url;
      const alvo = Math.min(1, Math.max(0, (vol == null ? .45 : vol))) * A.vol;
      const tocar = () => { const p = a.play(); if (p?.catch) p.catch(() => { pend = tocar; }); };
      tocar();
      let v = 0; const sobe = setInterval(() => { v = Math.min(alvo, v + alvo / 20); a.volume = v; if (v >= alvo) clearInterval(sobe); }, 100);
    } catch (e) {}
  }
  function trilhaDesligar() {
    const a = trilha; trilha = null; trilhaUrl = '';
    if (!a) return;
    let v = a.volume; const cai = setInterval(() => { v -= .06; if (v <= 0) { clearInterval(cai); try { a.pause(); a.src = ''; } catch (e) {} } else a.volume = v; }, 60);
  }

  /* ---------- tocar um efeito solto ---------- */
  function tocar(nome, { vol = 1, atraso = 0 } = {}) {
    if (A.mudo) return;
    const s = S[nome]; if (!s || nome === 'silencio') return;
    const c = audio(); if (!c) return;
    const saida = c.createGain(); saida.gain.value = A.vol; saida.connect(c.destination);
    try { s.f(c, c.currentTime + .02 + atraso, Math.max(0, Math.min(1, vol)), saida); } catch (e) {}
  }

  /* ---------- a entrada completa ---------- */
  async function rodar(ap = {}) {
    const est = E[ap.estilo] || E.fita;
    const cor = ap.cor || est.cor;
    const som = ap.som === undefined ? est.som : ap.som;
    try { navigator.vibrate?.(ap.cine ? [60, 2400, 200, 80, 400, 80, 150, 60, 600] : [200, 80, 400, 80, 150, 60, 600]); } catch (e) {}
    if (ap.cine) { tocar('zumbido', { vol: .6 }); await cinematica({ ...ap, cor }); }
    tocar(som);
    if (est.som === 'estatica') tocar('risada', { vol: .5, atraso: .6 });
    tela(est.tela, cor, ap.faixa || est.faixa);
  }

  /* ---------- palpite de som/estilo pelo nome e texto, sem acento e com limite de palavra ---------- */
  const normal = s => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ') + ' ';
  const PISTAS = [
    [/motosserra| serrote| broca | furadeir/, 'motosserra'],
    [/ faca| facao| lamina| navalha| machad| cutelo| cort| talho| lacer| retalh| estripa| esfaque/, 'faca'],
    [/ osso| cranio| pescoc| vertebr| esmag| quebra/, 'osso'],
    [/ tiro| espingard| revolver| pistola| bala | fuzil| arma de fogo/, 'tiro'],
    [/ vidro| espelho| janela| estilhac| caco/, 'vidro'],
    [/ corrente| algema| amarr| prend| restring| segurar| agarr| laco /, 'corrente'],
    [/ sino | sinos | cantig| ninar| cancao| melodi| music| caixinh| brinqued| bonec/, 'caixinha'],
    [/ alarme| contenc| brecha| protocolo| sitio| fundac| evacua| quarenten/, 'sirene'],
    [/ uivo| uiva| lobo | lobos | lua cheia/, 'uivo'],
    [/ rosnad| fera | garra| presa | presas | mordid| devorar| bicho| bestial| animal| chifr| casco/, 'rosnado'],
    [/ sussurr| voz | sopro| mente | psiqu| hipnos| encanta| miragem| ilus/, 'sussurro'],
    [/ folego| respir| asfix| sufoc| afog| estrangul/, 'respiracao'],
    [/ estatic| radio| fita| televis| tv | tela | sinal| transmiss/, 'estatica'],
    [/ eletric| choque| raio | raios | energia| curto| fiac| lampad| luz /, 'eletrico'],
    [/ porta| tranca| barricad| range| dobradic| corredor/, 'porta'],
    [/ relogio| tempo| contagem| hora | horas | prazo| minuto/, 'relogio'],
    [/ risada| riso | gargalh| zomb| deboch| piada/, 'risada'],
    [/ grito| urro | urros | berr| apavor| susto| panico| terror| horror/, 'grito'],
    [/ sangue| sangr| hemorrag| ferid| poca | visce| agua | liquid| mare /, 'agua'],
    [/ sprint| corr| veloz| velocid| persegu| avanc| disparad| ligeir| arranc/, 'corrida'],
    [/ passo| caminh| pisad| peso | pesad| arrast| lentid/, 'passoPesado'],
    [/ arremess| lanc| projetil| golpe| soco | murro| pancad| martelo| marreta| impact| derrub| investid/, 'impacto'],
    [/ tensao| pressagio| aproxima| chega| surge| aparec/, 'zumbido'],
  ];
  const somDeHab = txt => { const s = normal(txt); for (const [re, k] of PISTAS) if (re.test(s)) return k; return 'impacto'; };

  const PISTAS_EST = [
    [/motosserra| serra /, 'motosserra'],
    [/ bonec| brinqued| palhac| crianc| cantig| ovelh| cordeir| lamb/, 'boneca'],
    [/ anomal| scp| fundac| contenc| keter| euclid| objeto de classe/, 'anomalia'],
    [/ fantasma| espirit| vulto| sombra| maldic| assombr/, 'vulto'],
    [/ bicho| fera | lobo | animal| monstr| mutac| garra| besta | bestial| chifr/, 'bicho'],
    [/ maquin| robo | robot| digital| virus| tela | jogo | glitch/, 'glitch'],
    [/ fogo| chama| brasa| queim| incend| forno/, 'brasa'],
    [/ agua | lago| mar | afog| chuva| poca | piscina| rio | abissa| tentacul| cthulhu| dagon| innsmouth| profund/, 'afogar'],
    [/ nevoa| neblina| floresta| mato | noite| bosque/, 'nevoa'],
    [/ fita| vhs| gravac| camer| mascara| video/, 'fita'],
    [/ sino | igreja| ritual| cult| demoni| infern| seita/, 'sino'],
    [/ brutamont| forca| gigante| martelo| acougue| talhad| faca| lamina/, 'faca'],
  ];
  const estiloDe = txt => { const s = normal(txt); for (const [re, k] of PISTAS_EST) if (re.test(s)) return k; return 'faca'; };

  /* ---------- formulário de entrada (para a Diretora) ---------- */
  const opcoesEstilo = (sel) => Object.entries(E).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(v.nome)}</option>`).join('');
  const opcoesSom = (sel) => Object.entries(S).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(v.nome)}</option>`).join('');

  /* ---------- destravar o áudio no primeiro toque ---------- */
  const destravar = () => { if (ctx) audio(); if (pend) { const p = pend; pend = null; try { p(); } catch (e) {} } };
  addEventListener('pointerdown', destravar, { passive: true });
  addEventListener('keydown', destravar);

  /* ---------- ouvir a mesa: dispara entrada nova, sons de habilidade e trilha ---------- */
  let vistoAp = 0, vistoSom = Date.now(), trilhaMesa = '';
  function ouvir(rols, { diretora = false, perseg = null } = {}) {
    if (!Array.isArray(rols)) return;
    const aps = rols.filter(r => r.tipo === 'aparicao').sort((a, b) => (b.t || 0) - (a.t || 0));
    const ap = aps[0];
    if (ap && (ap.t || 0) > vistoAp) {
      const nova = (ap.t || 0) > Date.now() - 25000;
      vistoAp = ap.t || 0;
      const api = window.APAR || {};
      if (nova && !diretora) (api.rodar || rodar)(ap.ap || {});
      else if (nova && diretora) (api.tocar || tocar)((E[(ap.ap || {}).estilo] || E.fita).som, { vol: .35 });
    }
    const sons = rols.filter(r => r.som && (r.t || 0) > vistoSom && (r.t || 0) > Date.now() - 25000).sort((a, b) => a.t - b.t);
    if (sons.length) { vistoSom = Math.max(...sons.map(r => r.t)); const tc = (window.APAR || {}).tocar || tocar; sons.slice(-3).forEach((r, i) => tc(r.som, { atraso: i * .4 })); }
    const url = (ap && ap.ap && ap.ap.trilha) || '';
    if (perseg === true && url) { trilhaMesa = url; trilhaLigar(url, (ap.ap || {}).trilhaVol); }
    if (perseg === false) { trilhaMesa = ''; trilhaDesligar(); }
  }

  /* ---------- painel da Diretora: estilo, cor, cinemática, trilha e som por habilidade ---------- */
  function painelHTML(ent = {}, { nome = 'o bicho', habs = [], perseg = false } = {}) {
    const est = ent.estilo || 'faca', cor = ent.cor || E[est].cor;
    return `<div class="caixa bloco ap-painel" style="--apc:${esc(cor)}">
      <div class="btns" style="justify-content:space-between;align-items:center"><h3><i data-ic="raio"></i> Entrada em cena</h3><span class="tag">Como ${esc(nome)} aparece na tela da mesa</span></div>
      <div class="ap-grade">
        <div class="campo"><label class="rotulo" for="ap-est">Estilo</label><select id="ap-est">${opcoesEstilo(est)}</select></div>
        <div class="campo"><label class="rotulo" for="ap-cor">Cor</label><input type="color" id="ap-cor" value="${esc(cor)}"></div>
        <div class="campo"><label class="rotulo" for="ap-rot">Rótulo em cima do nome</label><input type="text" id="ap-rot" maxlength="30" value="${esc(ent.rotulo || '')}" placeholder="Ele apareceu"></div>
      </div>
      <div class="campo"><label class="rotulo" for="ap-frase">Frase da entrada</label><input type="text" id="ap-frase" maxlength="120" value="${esc(ent.frase || '')}" placeholder="O que ele diz ao aparecer"></div>
      <label class="chk ap-chk"><input type="checkbox" id="ap-cine" ${ent.cine ? 'checked' : ''}> <span>Cinemática antes do efeito: moldura na cor dele, com retrato, nome e frase.</span></label>
      <div class="campo"><span class="rotulo">Trilha da perseguição</span>
        <input type="file" id="ap-tri" accept="audio/*" class="arq-oculto">
        <div class="btns" style="align-items:center"><label class="btn mini sec arq-botao" for="ap-tri"><i data-ic="fone"></i> ${ent.trilha ? 'Trocar o áudio' : 'Enviar áudio'}</label><button class="btn mini sec" id="ap-tri-ouvir">Ouvir</button>${ent.trilha ? '<button class="btn mini sec" id="ap-tri-x">Tirar</button>' : ''}</div>
        <p class="tag" style="margin:0" id="ap-tri-st">${ent.trilha ? 'Tem trilha. Ela toca sozinha na mesa enquanto a perseguição estiver rolando.' : 'Sem trilha. Mande um áudio (até 25 MB) e ele toca em loop durante a perseguição.'}</p></div>
      ${habs.length ? `<details class="ap-det"><summary class="rotulo">Som de cada habilidade (${habs.length})</summary><p class="tag">Só sai som quando ele está visível para a mesa: revelado ou em perseguição.</p>
        <div class="ap-sons">${habs.map((h, i) => `<div class="ap-som-l"><b>${esc(h.nome)}</b><select data-ap-som="${esc(h.nome)}">${opcoesSom((ent.sons || {})[h.nome] || somDeHab(`${h.nome} ${h.txt || ''}`))}</select><button class="btn mini sec" data-ap-ouvir="${i}">Ouvir</button></div>`).join('')}</div></details>` : ''}
      <div class="btns"><button class="btn perigo" id="ap-ir"><i data-ic="raio"></i> Aparecer</button><button class="btn sec" id="ap-fim">Encerrar perseguição</button><button class="btn sec mini" id="ap-ver">Ensaiar só para mim</button><button class="btn sec mini" id="ap-mudo">${A.mudo ? 'Ligar o som' : 'Silenciar aqui'}</button></div>
      ${perseg ? '<p class="tag"><i data-ic="fita"></i> Perseguição rolando agora.</p>' : ''}</div>`;
  }

  function painelLigar(raiz, cfg = {}) {
    const { ent = {}, nome = '', foto = '', habs = [], salvar, aparecer, encerrar, enviar, aviso = (() => {}) } = cfg;
    const q = s => raiz.querySelector(s);
    const lerPainel = () => ({
      estilo: q('#ap-est').value, cor: q('#ap-cor').value, rotulo: q('#ap-rot').value.trim(),
      frase: q('#ap-frase').value.trim(), cine: q('#ap-cine').checked,
      sons: Object.fromEntries([...raiz.querySelectorAll('[data-ap-som]')].map(s => [s.dataset.apSom, s.value])),
    });
    const pacote = () => ({ ...ent, ...lerPainel(), nome, foto, trilha: ent.trilha || '' });
    const guardar = () => salvar?.(lerPainel());
    q('#ap-est').onchange = () => { const e = q('#ap-est').value; q('#ap-cor').value = E[e].cor; raiz.querySelector('.ap-painel').style.setProperty('--apc', E[e].cor); guardar(); };
    q('#ap-cor').onchange = () => { raiz.querySelector('.ap-painel').style.setProperty('--apc', q('#ap-cor').value); guardar(); };
    ['#ap-rot', '#ap-frase'].forEach(s => { q(s).onchange = guardar; });
    q('#ap-cine').onchange = guardar;
    raiz.querySelectorAll('[data-ap-som]').forEach(s => { s.onchange = guardar; });
    raiz.querySelectorAll('[data-ap-ouvir]').forEach(b => b.onclick = () => { const s = raiz.querySelectorAll('[data-ap-som]')[+b.dataset.apOuvir]; tocar(s.value); });
    q('#ap-ver').onclick = () => rodar(pacote());
    q('#ap-ir').onclick = async () => { const b = q('#ap-ir'); b.disabled = true; try { await aparecer?.(pacote()); } finally { b.disabled = false; } };
    q('#ap-fim').onclick = () => encerrar?.();
    q('#ap-mudo').onclick = () => { const m = window.APAR.alternarMudo(); q('#ap-mudo').textContent = m ? 'Ligar o som' : 'Silenciar aqui'; };
    q('#ap-tri-ouvir').onclick = () => { if (!ent.trilha) { aviso('Nenhuma trilha enviada ainda.'); return; } if (trilha) trilhaDesligar(); else trilhaLigar(ent.trilha, .5); };
    q('#ap-tri-x')?.addEventListener('click', () => { trilhaDesligar(); salvar?.({ trilha: '' }); });
    q('#ap-tri').onchange = async () => {
      const f = q('#ap-tri').files[0]; if (!f || !enviar) return;
      q('#ap-tri-st').textContent = `Enviando "${f.name}"…`;
      const url = await enviar(f, 25);
      if (!url) { q('#ap-tri-st').textContent = 'Não deu para enviar.'; return; }
      q('#ap-tri-st').textContent = 'Trilha no lugar.'; salvar?.({ trilha: url });
    };
  }

  window.APAR = {
    SONS: S, ESTILOS: E,
    get mudo() { return A.mudo; },
    get vol() { return A.vol; },
    alternarMudo() { A.mudo = !A.mudo; grav('adr-mudo', A.mudo ? '1' : '0'); if (A.mudo) trilhaDesligar(); return A.mudo; },
    volume(v) { A.vol = Math.min(1, Math.max(0, +v || 0)); grav('adr-vol', String(A.vol)); if (trilha) trilha.volume = Math.min(1, trilha.volume) * 1; return A.vol; },
    tocar, rodar, cinematica, tela, limpar,
    trilhaLigar, trilhaDesligar, get trilhaTocando() { return !!trilha; },
    somDeHab, estiloDe, opcoesEstilo, opcoesSom, ouvir, painelHTML, painelLigar,
    corDe: k => E[k]?.cor || '#c4000d',
  };
})();
