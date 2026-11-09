/* =================================================================
   mesa-extra.js · vindo do site do Brutal para o Além da Realidade:
   NPCs, suspeitos, quadro da equipe (barbante), arquivo (papel e áudio),
   calendário de sessões, roleplay em texto com vozes, apagar rolagens.
   Usa os globais do index.html: db, sb, ME, esc, nl, toast, abrirModal, abrirModal2, enviarImagem, iniciais, corDe, horaBR, uid8.
   ================================================================= */
'use strict';
/* ---------- utilidades que o Brutal tinha e o A.R. não ---------- */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function confirmar(msg, { titulo = 'Tem certeza?', ok = 'Sim' } = {}) {
  return new Promise(res => { let feito = false; const fim = v => { if (feito) return; feito = true; res(v); };
    abrirModal2(titulo, `<p>${msg}</p><div class="btns"><button class="btn perigo" data-cf-ok>${esc(ok)}</button><button class="btn sec" data-cf-nao>Cancelar</button></div>`, (m, fechar) => {
      m.querySelector('[data-cf-ok]').onclick = () => { fechar(); fim(true); }; m.querySelector('[data-cf-nao]').onclick = () => { fechar(); fim(false); };
      new MutationObserver((_, o) => { if (!m.isConnected) { o.disconnect(); fim(false); } }).observe(document.body, { childList: true, subtree: true }); }); });
}
function perguntar(titulo, valor = '', { multi = false, ok = 'OK' } = {}) {
  return new Promise(res => { let feito = false; const fim = v => { if (feito) return; feito = true; res(v); };
    abrirModal2(titulo, `${multi ? `<textarea data-pg style="min-height:120px">${esc(valor)}</textarea>` : `<input type="text" data-pg value="${esc(valor)}">`}<div class="btns"><button class="btn" data-pg-ok>${esc(ok)}</button></div>`, (m, fechar) => {
      const i = m.querySelector('[data-pg]'); setTimeout(() => i.focus(), 30);
      m.querySelector('[data-pg-ok]').onclick = () => { const v = i.value; fechar(); fim(v); };
      if (!multi) i.onkeydown = e => { if (e.key === 'Enter') m.querySelector('[data-pg-ok]').click(); };
      new MutationObserver((_, o) => { if (!m.isConnected) { o.disconnect(); fim(null); } }).observe(document.body, { childList: true, subtree: true }); }); });
}
// documento público da mesa (só o mestre grava): mapas, NPCs, sessão, voz automática do roleplay
const refMesa = id => db.doc(`campanhas/${id}/publico/mesa`);
async function salvarMesa(id, parcial) { const r = refMesa(id); try { await r.update(parcial); } catch (e) { if (/não existe/i.test(e.message || '')) await r.set(parcial); else throw e; } }
// estado da equipe (os jogadores mexem): suspeitos inocentados, quadro com posições, barbantes e anotações
const caminhoQ = id => `campanhas/${id}/quadro/estado`;
async function salvarQ(id, parcial) {
  const r = db.doc(caminhoQ(id));
  try { await r.update(parcial); }
  catch (e) {
    if (/não existe/i.test(e.message || '')) { try { await r.set(parcial); return; } catch (e2) { e = e2; } }
    toast(e.code === 'invalid_argument' ? 'Sem permissão para mexer no quadro: o administrador precisa rodar o seguranca.sql de novo no Supabase.' : 'Não salvou: ' + (e.message || e.code));
  }
}
// arquivo qualquer (áudio) no armazenamento de imagens, na pasta da conta
async function enviarArquivo(file, limiteMB = 25) {
  if (!sb || !ME) { toast('Entre na sua conta para enviar arquivos.'); return null; }
  if (file.size > limiteMB * 1024 * 1024) { toast(`Arquivo acima de ${limiteMB} MB.`); return null; }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const caminho = `${ME}/${Date.now()}-${uid8()}.${ext}`;
  const { error } = await sb.storage.from('imagens').upload(caminho, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (error) { toast('Não deu para enviar: ' + error.message); return null; }
  return sb.storage.from('imagens').getPublicUrl(caminho).data.publicUrl;
}

/* ---------- mapa: posições dos pinos ficam no quadro da equipe (jogadores podem mover os próprios agentes) ---------- */
const salaMapa = id => [...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
function opcoesMapa(id, getQ, meus, mestre, nome) {
  return { getPos: () => getQ()?.pinos || {}, podeMover: p => mestre || !!p.livre || (!!p.ficha && meus.includes(p.ficha)), eu: { nome: nome || 'Alguém', cor: mestre ? '#e3c47f' : corDe(ME) }, sala: salaMapa(id),
    salvarPos: async (cena, pino, xy) => { const v = { ...xy, t: Date.now(), uid: ME }, Q = getQ() || {}; Q.pinos = { ...(Q.pinos || {}), [cena]: { ...(Q.pinos?.[cena] || {}), [pino]: v } }; await salvarQ(id, { pinos: { [cena]: { [pino]: v } } }); } };
}
// mapa flutuante: descobre os agentes da pessoa uma vez e libera mover os pinos deles
const MAPA_MEUS = { ids: null, carregando: null };
window.mapaExtra = (camp, getQ, refazer) => {
  if (!camp || !ME) return {};
  if (!MAPA_MEUS.ids && !MAPA_MEUS.carregando) MAPA_MEUS.carregando = db.collection('fichas').where('dono', '==', ME).get().then(sn => { MAPA_MEUS.ids = sn.docs.map(d => d.id); MAPA_MEUS.nome = (sn.docs.find(d => d.id === MEU_PRINCIPAL) || sn.docs[0])?.data()?.nome || ''; MAPA_MEUS.carregando = null; refazer?.(); }).catch(() => { MAPA_MEUS.carregando = null; });
  return opcoesMapa(camp, getQ, MAPA_MEUS.ids || [], false, MAPA_MEUS.nome || 'Alguém');
};

/* ---------- imagem grande: clica na foto de NPC, suspeito ou ameaça e ela abre na tela inteira ---------- */
function verImagem(url, titulo = '', sub = '') {
  if (!url) return; document.querySelector('.zoom-img')?.remove();
  const el = document.createElement('div'); el.className = 'zoom-img'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', titulo || 'Imagem');
  el.innerHTML = `<figure class="moldura"><div class="mold-quadro"><i class="mc a"></i><i class="mc b"></i><i class="mc c"></i><i class="mc d"></i><img src="${esc(url)}" alt="${esc(titulo)}"></div>${titulo || sub ? `<figcaption class="placa">${titulo ? `<b>${esc(titulo)}</b>` : ''}${sub ? `<span>${esc(sub)}</span>` : ''}</figcaption>` : ''}</figure><button type="button" class="zoom-x" aria-label="Fechar">✕</button>`;
  // a moldura abraça a imagem: calcula o tamanho mantendo a proporção (aumenta retrato pequeno também)
  const img = el.querySelector('img'), caber = () => { const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1, k = Math.min(innerWidth * 0.86 / nw, (innerHeight - (titulo || sub ? 190 : 110)) / nh, 4); img.style.width = Math.round(nw * k) + 'px'; img.style.height = Math.round(nh * k) + 'px'; };
  if (img.complete) caber(); else img.onload = caber; addEventListener('resize', caber); const tirar = el.remove.bind(el); el.remove = () => { removeEventListener('resize', caber); tirar(); };
  const fechar = () => { el.remove(); document.removeEventListener('keydown', tecla, true); };
  const tecla = e => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
  el.addEventListener('click', e => { if (!e.target.closest('img')) fechar(); });
  document.addEventListener('keydown', tecla, true); document.body.appendChild(el); el.querySelector('.zoom-x').focus();
}
document.addEventListener('click', e => {
  const z = e.target.closest('[data-zoom-img]'); if (!z) return;
  if (z.closest('#escudo .ini-card')) return; // no Escudo o clique no card do combate seleciona
  e.preventDefault(); e.stopPropagation(); verImagem(z.dataset.zoomImg, z.dataset.zoomTit || '', z.dataset.zoomSub || '');
}, true);
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-zoom-img]')) { e.preventDefault(); e.target.click(); } });

/* ---------- pistas e arquivo: papéis no mural ---------- */
const idPista = p => p.id || 'p' + [...String(p.titulo || '') + String(p.texto || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
const papelPista = p => `<div class="pista">${p.titulo ? `<b>${esc(p.titulo)}</b>` : ''}${p.imagem ? `<img src="${esc(p.imagem)}" alt="" loading="lazy">` : ''}${p.texto ? `<p>${nl(p.texto)}</p>` : ''}${p.audio ? `<audio controls preload="none" src="${esc(p.audio)}"></audio>` : ''}</div>`;
const pedacoHTML = p => p.audio && !p.texto && !p.imagem
  ? `<div class="pista arquivo audio"><b>🎧 ${esc(p.titulo || 'Gravação')}</b><audio controls preload="none" src="${esc(p.audio)}"></audio></div>`
  : `<div class="pista arquivo ${p.audio ? 'audio' : ''}">${p.imagem ? `<img src="${esc(p.imagem)}" alt="" loading="lazy">` : ''}${p.titulo ? `<b>${p.audio ? '🎧 ' : ''}${esc(p.titulo)}</b>` : ''}${p.audio ? `<audio controls preload="none" src="${esc(p.audio)}"></audio>` : ''}${p.texto ? nl(p.texto) : ''}</div>`;

/* ---------- NPCs: quem vai aparecendo na história ---------- */
function desenharNpcs(A, getC, { mestre, salvarC }) {
  const C = getC() || {}, L = (C.npcs || []).slice().sort((a, b) => (b.t || 0) - (a.t || 0));
  A.innerHTML = `<div class="caixa bloco"><div class="btns" style="justify-content:space-between;align-items:center"><h3>🎭 NPCs</h3>${mestre ? '<button class="btn mini" data-npc="novo">+ NPC</button>' : ''}</div>
    <p class="tag" style="margin:0; white-space:normal">${mestre ? 'Poste aqui quem for aparecendo. "Suspeito" manda a pessoa para a aba Suspeitos e para o quadro da equipe.' : 'Quem já apareceu na história.'}</p>
    ${L.length ? `<div class="npc-grade">${L.map(n => `<div class="npc-card ${n.suspeito ? 'susp' : ''}"><span class="foto-s p" ${n.foto ? `data-zoom-img="${esc(n.foto)}" data-zoom-tit="${esc(n.nome)}" data-zoom-sub="${esc(n.papel || '')}" role="button" tabindex="0" title="Ver maior"` : ''} style="${n.foto ? `background-image:url('${esc(n.foto)}')` : ''}">${n.foto ? '' : esc(iniciais(n.nome))}</span>
      <div class="npc-tx"><b>${esc(n.nome)}</b>${n.papel ? `<span class="tag">${esc(n.papel)}</span>` : ''}${n.suspeito ? '<span class="tag tag-sus">Suspeito</span>' : ''}${n.txt ? `<p>${esc(n.txt)}</p>` : ''}
      ${mestre ? `<div class="btns"><button class="btn mini ${n.suspeito ? 'sec' : 'perigo'}" data-npc-s="${esc(n.id)}">${n.suspeito ? 'Tirar dos suspeitos' : '🔎 Suspeito'}</button><button class="btn mini sec" data-npc-e="${esc(n.id)}">Editar</button><button class="btn mini sec" data-npc-x="${esc(n.id)}" aria-label="Tirar ${esc(n.nome)}">✕</button></div>` : ''}</div></div>`).join('')}</div>`
      : '<div class="vazio">Ninguém apareceu ainda.</div>'}</div>`;
  if (!mestre) return;
  const refazer = () => desenharNpcs(A, getC, { mestre, salvarC });
  const form = (n, novo) => abrirModal(novo ? 'Novo NPC' : 'Editar NPC', `<div class="campo"><label class="rotulo" for="np-n">Nome</label><input type="text" id="np-n" maxlength="60" value="${esc(n.nome || '')}"></div>
      <div class="campo"><label class="rotulo" for="np-p">Quem é (curto)</label><input type="text" id="np-p" maxlength="60" value="${esc(n.papel || '')}" placeholder="Ex.: Legista do necrotério"></div>
      <div class="campo"><label class="rotulo" for="np-t">O que a mesa sabe</label><textarea id="np-t" rows="3" maxlength="500">${esc(n.txt || '')}</textarea></div>
      <div class="campo"><label class="rotulo" for="np-f">Retrato (opcional)</label><input type="file" id="np-f" accept="image/*"></div>
      <label class="chk"><input type="checkbox" id="np-s" ${n.suspeito ? 'checked' : ''}> É suspeito</label>
      <button class="btn" id="np-ok">${novo ? 'Postar' : 'Salvar'}</button>`, (m, fechar) => {
    m.querySelector('#np-ok').onclick = async () => {
      const b = m.querySelector('#np-ok'); b.disabled = true;
      const nome = m.querySelector('#np-n').value.trim(); if (!nome) { toast('Dê um nome.'); b.disabled = false; return; }
      let foto = n.foto || ''; const arq = m.querySelector('#np-f').files[0];
      if (arq) { b.textContent = 'Enviando…'; foto = (await enviarImagem(arq, 'circulo')) || foto; }
      const n2 = { ...n, nome, papel: m.querySelector('#np-p').value.trim(), txt: m.querySelector('#np-t').value.trim(), foto, suspeito: m.querySelector('#np-s').checked, t: n.t || Date.now() };
      const l = [...((getC() || {}).npcs || [])], i = l.findIndex(x => x.id === n.id); if (i < 0) l.push(n2); else l[i] = n2;
      fechar(); await salvarC({ npcs: l }); refazer(); };
  });
  A.querySelector('[data-npc="novo"]').onclick = () => form({ id: 'npc-' + Date.now().toString(36) }, true);
  A.querySelectorAll('[data-npc-e]').forEach(b => b.onclick = () => form(((getC() || {}).npcs || []).find(x => x.id === b.dataset.npcE), false));
  A.querySelectorAll('[data-npc-x]').forEach(b => b.onclick = async () => { if (!await confirmar('Tirar este NPC da lista? Ele sai também dos suspeitos e do quadro.', { ok: 'Tirar' })) return; await salvarC({ npcs: ((getC() || {}).npcs || []).filter(x => x.id !== b.dataset.npcX) }); refazer(); });
  A.querySelectorAll('[data-npc-s]').forEach(b => b.onclick = async () => { const l = ((getC() || {}).npcs || []).map(x => x.id === b.dataset.npcS ? { ...x, suspeito: !x.suspeito } : x); await salvarC({ npcs: l }); refazer(); });
}

/* ---------- suspeitos: a equipe inocenta e volta atrás (vale para todos da mesa) ---------- */
const suspeitosDe = C => ((C || {}).npcs || []).filter(n => n.suspeito);
const inocentado = (s, Q) => !!(Q?.inoc && Q.inoc[s.id]);
const cardSusp = (s, Q, acao) => `<div class="suspeito ${inocentado(s, Q) ? 'inocente' : ''} ${s.foto ? 'com-foto' : ''}">${s.foto ? `<span class="foto-s p" data-zoom-img="${esc(s.foto)}" data-zoom-tit="${esc(s.nome)}" data-zoom-sub="${esc(s.papel || '')}" role="button" tabindex="0" title="Ver maior" style="background-image:url('${esc(s.foto)}')"></span>` : ''}<b>${esc(s.nome)}</b><span class="tg">${esc(s.papel || 'NPC')}</span><p>${esc(s.txt || '')}</p>${acao}</div>`;
function desenharSuspeitos(A, getC, getQ, id) {
  const C = getC(), Q = getQ() || {}, L = suspeitosDe(C), sus = L.filter(x => !inocentado(x, Q)), ino = L.filter(x => inocentado(x, Q));
  A.innerHTML = `<div class="caixa bloco"><h3>🕵️ Suspeitos</h3><p class="tag" style="white-space:normal">Quem a equipe ainda acha que pode estar por trás de tudo. Inocentar vale para todos da mesa.</p>
    <div class="lista-sus">${sus.map(x => cardSus2(x, Q, false)).join('') || '<div class="vazio">Ninguém sob suspeita.</div>'}</div>
    ${ino.length ? `<h3 style="margin-top:8px">😇 Inocentados</h3><div class="lista-sus">${ino.map(x => cardSus2(x, Q, true)).join('')}</div>` : ''}</div>`;
  A.querySelectorAll('[data-inoc]').forEach(b => b.onclick = async () => { const v = b.dataset.v === '1', Q2 = getQ() || {}; Q2.inoc = { ...(Q2.inoc || {}), [b.dataset.inoc]: v }; desenharSuspeitos(A, getC, getQ, id); await salvarQ(id, { inoc: { [b.dataset.inoc]: v } }); });
}
const cardSus2 = (x, Q, ino) => cardSusp(x, Q, `<div class="btns"><button class="btn mini ${ino ? 'perigo' : ''}" data-inoc="${esc(x.id)}" data-v="${ino ? '0' : '1'}">${ino ? 'Voltar a suspeito' : 'Inocentar'}</button></div>`);

/* ---------- quadro da equipe: suspeitos, pistas e anotações, ligados por barbante ---------- */
function montarQuadro(el, id, getC, getQ, getPistas) {
  let ligando = false, sel = null, arr = null, zTop = 10; const Z = {};
  const itens = () => {
    const C = getC(), Q = getQ() || {}, out = [];
    const sus = suspeitosDe(C), pis = getPistas(), notas = Object.entries(Q.notas || {}).filter(([, v]) => v);
    const linhasS = Math.ceil(sus.length / 8);
    sus.forEach((x, i) => out.push({ k: 's:' + x.id, tipo: 's', x, def: { x: 7 + (i % 8) * 12.2, y: 18 + Math.floor(i / 8) * 26 } }));
    pis.forEach((x, i) => out.push({ k: 'p:' + idPista(x), tipo: 'p', x, def: { x: 9 + (i % 6) * 15.5, y: Math.min(90, 22 + linhasS * 26 + Math.floor(i / 6) * 20) } }));
    notas.forEach(([nid, v], i) => out.push({ k: 'n:' + nid, tipo: 'n', x: { id: nid, ...v }, def: { x: 88, y: 40 + i * 14 } }));
    return out.map(it => ({ ...it, pos: Q.pos?.[it.k] || it.def, r: ((it.k.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 9) - 4) }));
  };
  const txtP = p => [p.titulo, p.texto].filter(Boolean).join(': ');
  const desenhar = () => {
    if (arr) return;
    const Q = getQ() || {}, its = itens(), at = Object.fromEntries(its.map(i => [i.k, i]));
    const fios = Object.entries(Q.fios || {}).filter(([k, v]) => v && k.split('|').every(x => at[x]));
    const ligados = new Set(fios.flatMap(([k]) => k.split('|')));
    el.classList.toggle('ligando', ligando);
    el.innerHTML = `<svg class="fios">${fios.map(([k]) => { const [ka, kb] = k.split('|'), a = at[ka].pos, b = at[kb].pos, d = `data-a="${esc(ka)}" data-b="${esc(kb)}" x1="${a.x}%" y1="${a.y}%" x2="${b.x}%" y2="${b.y}%"`; return `<line class="hit" data-fio="${esc(k)}" ${d}></line><line ${d}></line>`; }).join('')}</svg>
      ${its.map(it => {
        const st = `left:${it.pos.x}%;top:${it.pos.y}%;--r:${it.r}deg${Z[it.k] ? ';z-index:' + Z[it.k] : ''}`, c = `q-item ${sel === it.k ? 'sel' : ''} ${ligados.has(it.k) ? '' : 'solto'}`;
        if (it.tipo === 's') return `<div class="${c} q-pol ${inocentado(it.x, Q) ? 'inoc' : ''}" data-k="${esc(it.k)}" style="${st}" title="${esc(it.x.txt || '')}"><div class="ft" style="${it.x.foto ? `background-image:url('${esc(it.x.foto)}')` : ''}">${it.x.foto ? '' : esc(iniciais(it.x.nome))}</div><b>${esc(it.x.nome)}</b><span>${esc(it.x.papel || 'NPC')}</span></div>`;
        if (it.tipo === 'p') { const t = txtP(it.x); return `<div class="${c} q-pap" data-k="${esc(it.k)}" style="${st}" title="${esc(t)}"><span class="dia-t">${it.x.sessao ? 'Sessão ' + it.x.sessao : 'Esta sessão'}</span>${esc(t.length > 150 ? t.slice(0, 147) + '…' : t)}</div>`; }
        return `<div class="${c} q-nota" data-k="${esc(it.k)}" style="${st}" title="Toque para ler ou editar">${esc(it.x.txt)}</div>`;
      }).join('')}`;
  };
  el.addEventListener('pointerdown', e => {
    const it = e.target.closest('.q-item'); if (!it || e.button > 0 || ligando) return;
    e.preventDefault(); const r = el.getBoundingClientRect();
    arr = { el: it, k: it.dataset.k, r, moveu: false, dx: e.clientX, dy: e.clientY };
    document.body.classList.add('arrastando-q'); Z[it.dataset.k] = ++zTop; it.style.zIndex = zTop; it.setPointerCapture(e.pointerId); it.classList.add('arrastando');
  });
  el.addEventListener('pointermove', e => {
    if (!arr) return;
    if (Math.abs(e.clientX - arr.dx) + Math.abs(e.clientY - arr.dy) > 3) arr.moveu = true;
    const x = clamp((e.clientX - arr.r.left) / arr.r.width * 100, 3, 97), y = clamp((e.clientY - arr.r.top) / arr.r.height * 100, 5, 95);
    arr.el.style.left = x + '%'; arr.el.style.top = y + '%'; arr.x = x; arr.y = y;
    el.querySelectorAll('line').forEach(l => { if (l.dataset.a === arr.k) { l.setAttribute('x1', x + '%'); l.setAttribute('y1', y + '%'); } if (l.dataset.b === arr.k) { l.setAttribute('x2', x + '%'); l.setAttribute('y2', y + '%'); } });
  });
  const soltar = async () => {
    if (!arr) return; const a = arr; arr = null; a.el.classList.remove('arrastando'); document.body.classList.remove('arrastando-q');
    if (a.moveu && a.x != null) { const Q = getQ() || {}; Q.pos = { ...(Q.pos || {}), [a.k]: { x: +a.x.toFixed(2), y: +a.y.toFixed(2) } }; desenhar(); await salvarQ(id, { pos: { [a.k]: Q.pos[a.k] } }); }
    else { desenhar(); abrirItem(a.k); }
  };
  const achar = k => { const t = k[0], i = k.slice(2); if (t === 's') return suspeitosDe(getC()).find(x => x.id === i); if (t === 'p') return getPistas().find(y => idPista(y) === i); return null; };
  const rotulo = k => { const Q = getQ() || {}, t = k[0]; if (t === 's') return '🖼️ ' + (achar(k)?.nome || '?'); if (t === 'p') { const x = txtP(achar(k) || {}) || '?'; return '📄 ' + (x.length > 50 ? x.slice(0, 48) + '…' : x); } const n = Q.notas?.[k.slice(2)]?.txt || '?'; return '📝 ' + (n.length > 50 ? n.slice(0, 48) + '…' : n); };
  const fiosDe = k => Object.entries((getQ() || {}).fios || {}).filter(([f, v]) => v && f.split('|').includes(k)).map(([f]) => f);
  const cortar = async lista => { const Q = getQ() || {}, p = Object.fromEntries(lista.map(f => [f, null])); Q.fios = { ...(Q.fios || {}), ...p }; desenhar(); await salvarQ(id, { fios: p }); };
  const blocoFios = k => { const l = fiosDe(k); return `<div class="fios-lista"><span class="rotulo">🧶 Barbantes (${l.length})</span>${l.map(f => `<div class="linha"><span>${esc(rotulo(f.split('|').find(x => x !== k)))}</span><button class="btn mini perigo" data-cortar="${esc(f)}">✂️ Cortar</button></div>`).join('') || '<span class="tag">Nada ligado aqui. Use "Ligar com barbante".</span>'}${l.length > 1 ? '<button class="btn mini perigo" data-cortar-todos style="justify-self:start">✂️ Cortar todos</button>' : ''}</div>`; };
  const ligarCortes = (m, k, reabrir) => {
    m.querySelectorAll('[data-cortar]').forEach(b => b.onclick = async () => { await cortar([b.dataset.cortar]); reabrir(); });
    m.querySelector('[data-cortar-todos]')?.addEventListener('click', async () => { if (!await confirmar('Cortar todos os barbantes deste item?', { ok: 'Cortar' })) return; await cortar(fiosDe(k)); reabrir(); });
  };
  const abrirItem = k => {
    const Q = getQ() || {}, t = k[0], iid = k.slice(2), reabrir = () => abrirItem(k), x = achar(k);
    if (t === 's') { if (!x) return; abrirModal(x.nome, `<div class="btns" style="align-items:center"><span class="foto-s g" ${x.foto ? `data-zoom-img="${esc(x.foto)}" data-zoom-tit="${esc(x.nome)}" role="button" tabindex="0" title="Ver maior"` : ''} style="${x.foto ? `background-image:url('${esc(x.foto)}')` : ''}">${x.foto ? '' : esc(iniciais(x.nome))}</span><div><span class="tag">${esc(x.papel || 'NPC')}</span>${inocentado(x, Q) ? ' <span class="tag" style="color:var(--fole)">Inocentado</span>' : ''}</div></div><p>${nl(x.txt || '')}</p>${blocoFios(k)}`, m => ligarCortes(m, k, reabrir)); return; }
    if (t === 'p') { if (!x) return; abrirModal(x.sessao ? `Pista da sessão ${x.sessao}` : 'Pista desta sessão', `<div class="mural">${papelPista(x)}</div>${blocoFios(k)}`, m => ligarCortes(m, k, reabrir)); return; }
    const atual = Q.notas?.[iid]?.txt || '';
    abrirModal('Anotação', `<textarea id="nt-t" style="min-height:120px">${esc(atual)}</textarea><div class="btns"><button class="btn" id="nt-ok">Salvar</button><button class="btn perigo" id="nt-del">Arrancar do quadro</button></div>${blocoFios(k)}`, (m, fechar) => {
      ligarCortes(m, k, reabrir);
      const gravar = async v => { const Q2 = getQ() || {}; Q2.notas = { ...(Q2.notas || {}), [iid]: v }; fechar(); desenhar(); await salvarQ(id, { notas: { [iid]: v } }); };
      m.querySelector('#nt-ok').onclick = () => { const v = m.querySelector('#nt-t').value.trim(); gravar(v ? { txt: v } : null); };
      m.querySelector('#nt-del').onclick = async () => { const l = fiosDe(k); if (l.length) await cortar(l); gravar(null); };
    });
  };
  el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
  el.addEventListener('click', async e => {
    const fio = e.target.closest('[data-fio]');
    if (fio) { const [fa, fb] = fio.dataset.fio.split('|'); if (!await confirmar(`${esc(rotulo(fa))}  ↔  ${esc(rotulo(fb))}`, { titulo: '✂️ Cortar este barbante?', ok: 'Cortar' })) return; const Q = getQ() || {}; Q.fios = { ...(Q.fios || {}), [fio.dataset.fio]: null }; desenhar(); await salvarQ(id, { fios: { [fio.dataset.fio]: null } }); return; }
    if (!ligando) return;
    const it = e.target.closest('.q-item'); if (!it) return;
    if (!sel) { sel = it.dataset.k; desenhar(); return; }
    if (sel === it.dataset.k) { sel = null; desenhar(); return; }
    const k = [sel, it.dataset.k].sort().join('|'); sel = null;
    const Q = getQ() || {}; Q.fios = { ...(Q.fios || {}), [k]: true }; desenhar(); await salvarQ(id, { fios: { [k]: true } });
  });
  return {
    desenhar,
    ligar(v) { ligando = v; sel = null; desenhar(); },
    async nota() { const txt = await perguntar('O que escrever no papelzinho?', '', { multi: true, ok: 'Pregar no quadro' }); if (!txt?.trim()) return; const nid = uid8(), Q = getQ() || {}; Q.notas = { ...(Q.notas || {}), [nid]: { txt: txt.trim() } }; desenhar(); await salvarQ(id, { notas: { [nid]: { txt: txt.trim() } } }); },
  };
}
// aba Quadro inteira: barra, zoom, tela cheia (no iPhone imita com position: fixed)
function abrirAbaQuadro(A, id, getC, getQ, getPistas) {
  A.innerHTML = `<div class="caixa bloco"><div class="quadro-bar"><button class="btn mini" id="q-ligar" data-ligar>🧶 Ligar com barbante</button><button class="btn mini sec" data-nota>📝 Anotação</button><button class="btn mini sec" id="q-cheia">⛶ Tela cheia</button><span class="quadro-zoom"><button class="btn mini sec" data-zoom="-1" aria-label="Diminuir">−</button><span id="q-zv">100%</span><button class="btn mini sec" data-zoom="1" aria-label="Aumentar">+</button><button class="btn mini sec" data-zoom="0">Ajustar</button></span>
      <span class="tag" style="white-space:normal">Arraste fotos e papéis. Toque num item para ler e ver ou cortar os barbantes dele. Para ligar, ative o barbante e toque em dois itens.</span></div>
    <div class="quadro-wrap" id="q-wrap"><div class="quadro-palco" id="q-palco"><div class="quadro" id="q-quadro"></div></div><div class="q-fs-bar" id="q-fs-bar"><button class="btn mini sec" data-recolher title="Recolher o painel" aria-label="Recolher o painel">»</button><button class="btn mini" data-ligar title="Ligar com barbante" aria-label="Ligar com barbante">🧶</button><button class="btn mini sec" data-nota title="Anotação" aria-label="Anotação">📝</button><button class="btn mini sec" data-zoom="-1" aria-label="Diminuir">−</button><button class="btn mini sec" data-zoom="1" aria-label="Aumentar">+</button><button class="btn mini sec" data-zoom="0" title="Ver o quadro inteiro" aria-label="Ajustar">⤢</button><button class="btn mini perigo" id="q-sair">✕ Sair</button></div></div>
    <p class="tag" style="white-space:normal">O quadro é da equipe toda: o que um agente mexe, os outros veem. Suspeitos vêm da aba NPCs; pistas, das pistas reveladas.</p></div>`;
  const Q = montarQuadro(A.querySelector('#q-quadro'), id, getC, getQ, getPistas);
  let lig = false;
  A.querySelectorAll('[data-ligar]').forEach(b => b.onclick = () => { lig = !lig; Q.ligar(lig); A.querySelectorAll('[data-ligar]').forEach(x => { x.textContent = x.id ? (lig ? '✋ Parar de ligar' : '🧶 Ligar com barbante') : (lig ? '✋' : '🧶'); x.classList.toggle('perigo', lig); }); });
  A.querySelectorAll('[data-nota]').forEach(b => b.onclick = () => Q.nota());
  let zoom = null, manual = false;
  const wrap = A.querySelector('#q-wrap'), palco = A.querySelector('#q-palco'), qd = A.querySelector('#q-quadro');
  const cheio = () => document.fullscreenElement === wrap || wrap.classList.contains('tela-cheia');
  const caber = () => { const w = wrap.clientWidth - 6, h = (cheio() ? wrap.clientHeight - 60 : Infinity) - 6; return Math.max(.2, Math.min(w / 1600, h / 1000, 1.4)); };
  const aplicar = z => { zoom = Math.max(.2, Math.min(2, z)); qd.style.transform = `scale(${zoom})`; palco.style.width = 1600 * zoom + 'px'; palco.style.height = 1000 * zoom + 'px'; const zv = A.querySelector('#q-zv'); if (zv) zv.textContent = Math.round(zoom * 100) + '%'; };
  const inicial = () => cheio() ? Math.max(.3, Math.min(1.4, (wrap.clientHeight - 8) / 1000)) : Math.max(caber(), .55);
  aplicar(inicial());
  A.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => { const d = +b.dataset.zoom; manual = d !== 0; aplicar(d ? zoom * (d > 0 ? 1.25 : 0.8) : caber()); });
  const reajustar = () => { if (!manual && wrap.isConnected) aplicar(inicial()); };
  if (window.ResizeObserver) { const ro = new ResizeObserver(reajustar); ro.observe(wrap); assinar(() => ro.disconnect()); }
  const pseudo = v => { wrap.classList.toggle('tela-cheia', v); document.body.classList.toggle('quadro-cheio', v); manual = false; setTimeout(reajustar, 30); };
  const barra = A.querySelector('#q-fs-bar'), rec = barra.querySelector('[data-recolher]');
  const recolher = v => { barra.classList.toggle('recolhida', v); rec.textContent = v ? '☰' : '»'; try { localStorage.setItem('adr-painel-q', v ? '1' : ''); } catch (e) {} };
  try { recolher(!!localStorage.getItem('adr-painel-q')); } catch (e) {}
  rec.onclick = () => recolher(!barra.classList.contains('recolhida'));
  A.querySelector('#q-cheia').onclick = async () => { const f = wrap.requestFullscreen || wrap.webkitRequestFullscreen; if (f) { try { await f.call(wrap); return; } catch (e) {} } pseudo(true); };
  A.querySelector('#q-sair').onclick = () => { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); pseudo(false); };
  assinar(() => { document.body.classList.remove('quadro-cheio'); if (document.fullscreenElement) document.exitFullscreen?.(); });
  Q.desenhar();
  return Q;
}

/* ---------- a mestre/o mestre apaga rolagens (uma por uma ou o histórico inteiro) ---------- */
const comLixeira = (html, rid) => rid ? html.replace(/^(<div class="rol[^"]*"[^>]*>)/, `$1<button class="apagar-rol" data-del-rol="${esc(rid)}" title="Apagar esta rolagem" aria-label="Apagar esta rolagem">🗑</button>`) : html;
async function apagarRolagem(camp, rid) {
  if (!await confirmar('Apagar esta rolagem do histórico? Some para todo mundo.', { titulo: 'Apagar rolagem', ok: 'Apagar' })) return;
  try { await db.doc(`campanhas/${camp}/rolagens/${rid}`).delete(); toast('Rolagem apagada.'); } catch (e) { toast('Não deu: ' + (e.message || e.code)); }
}
async function limparHistorico(camp) {
  const s = await db.collection(`campanhas/${camp}/rolagens`).get(), ids = s.docs.map(d => d.id);
  if (!ids.length) { toast('O histórico já está vazio.'); return false; }
  if (!await confirmar(`Apagar TODAS as ${ids.length} rolagens desta campanha? Não tem volta.`, { titulo: 'Limpar histórico', ok: 'Limpar tudo' })) return false;
  let n = 0; for (const rid of ids) { try { await db.doc(`campanhas/${camp}/rolagens/${rid}`).delete(); n++; } catch (e) {} }
  toast(`${n} rolagem(ns) apagada(s).`); return true;
}

/* =================================================================
   Roleplay em texto: — fala, *ação*, o resto é narração.
   O mestre libera a voz por trecho (ou liga a voz automática) e todos ouvem.
   ================================================================= */
const RPX = (() => {
  const ME_ = () => ME, DB = () => db, ES = s => esc(s), TOAST = m => toast(m);
  const cor = id => corDe(id), hora = t => t ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const LS = { get(k, p) { try { const v = localStorage.getItem(k); return v == null ? p : v; } catch (e) { return p; } }, set(k, v) { try { v == null || v === '' ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  const fmt = t => ES(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/\n/g, '<br>');
  const avHTML = (p, id, cls = '') => `<span class="ms-av ${cls}" style="${p.foto ? `background-image:url('${ES(p.foto)}')` : `background-color:${ES(p.cor || cor(id))}`}">${p.foto ? '' : ES(iniciais(p.nome))}</span>`;
  const temVoz = () => 'speechSynthesis' in window;
  const nota = v => (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/pt-BR/i.test(v.lang) ? 3 : 0);
  let CTX = null; const CHAT = { msgs: [] };
  const euAgora = () => { const p = CTX?.persona?.() || {}; return { nome: p.nome || 'Alguém', foto: p.foto || '', cor: cor(ME_()), jogador: p.jogador || '' }; };
  /* =================================================================
     Roleplay em texto: — fala, *ação*, o resto é narração.
     A Diretora autoriza e a voz lê para a mesa toda, respeitando a pontuação.
     ================================================================= */
  // quebra o texto em trechos: { tipo: 'fala' | 'acao' | 'narra', txt }
  function partesRP(texto) {
    const out = [];
    for (const linha0 of String(texto || '').split(/\n+/)) {
      let linha = linha0.trim(); if (!linha) continue;
      const fala = /^[—–-]\s*/.test(linha); if (fala) linha = linha.replace(/^[—–-]\s*/, '');
      const re = /\*([^*]+)\*/g; let i = 0, m;
      while ((m = re.exec(linha))) {
        const antes = linha.slice(i, m.index).trim(); if (antes) out.push({ tipo: fala ? 'fala' : 'narra', txt: antes.replace(/^[—–-]\s*/, '') });
        out.push({ tipo: 'acao', txt: m[1].trim() }); i = m.index + m[0].length;
      }
      const resto = linha.slice(i).trim().replace(/^[—–-]\s*/, ''); if (resto) out.push({ tipo: fala ? 'fala' : 'narra', txt: resto });
    }
    return out;
  }
  const VOZ_PADRAO = { fala: { preset: 'jovem-f', lang: 'pt-BR', gen: 'f', nome: '', tom: 1.12, vel: 1.04 }, acao: { preset: 'narrador', lang: 'pt-BR', gen: 'm', nome: '', tom: 0.45, vel: 0.82 } };
  const minhasVozes = () => { try { return { ...VOZ_PADRAO, ...JSON.parse(LS.get('adr-vozes|' + ME_(), '{}')) }; } catch (e) { return VOZ_PADRAO; } };
  const FALAS_TOCADAS = new Set(), RP = { auto: false, desde: Date.now() };
  function marcarAuto() { const b = document.querySelector('[data-rp-auto]'), t = document.querySelector('[data-rp-auto-tag]'); if (b) { b.textContent = RP.auto ? '🔓 Voz automática: ligada' : '🔒 Voz automática: desligada'; b.classList.toggle('sec', !RP.auto); } if (t) t.hidden = !RP.auto || CTX?.mestre === ME_(); }
  const temBloco = (t, i) => RP.auto || !!(t?.blocos && t.blocos[i]);
  function blocoHTML(p, i, m, dir) {
    const lib = m.id !== 'previa' && temBloco(m.tocar, i), btn = m.id === 'previa' ? '' : dir ? `<button type="button" class="rp-lib ${lib ? 'on' : ''}" data-rp-b="${i}" data-id="${ES(m.id)}" title="${lib ? 'Liberado: tocar de novo para todos' : 'Liberar a voz deste trecho para a mesa'}">${lib ? '🔊' : p.tipo === 'fala' ? '🗣' : '🎬'}</button>`
      : lib ? `<button type="button" class="rp-lib on" data-rp-ouvir-b="${i}" data-id="${ES(m.id)}" title="Ouvir de novo">🔊</button>` : '';
    if (p.tipo === 'fala') return `<div class="rp-bloco rp-fala" data-bloco="${ES(m.id)}|${i}"><div class="rp-balao"><span class="rp-aspas">“</span>${fmt(p.txt)}<span class="rp-aspas fim">”</span></div>${btn}</div>`;
    if (p.tipo === 'acao') return `<div class="rp-bloco rp-acao" data-bloco="${ES(m.id)}|${i}"><span class="rp-rotulo">ação</span><p>${fmt(p.txt)}</p>${btn}</div>`;
    return `<div class="rp-bloco rp-narra" data-bloco="${ES(m.id)}|${i}"><p>${fmt(p.txt)}</p>${btn}</div>`;
  }
  function rpHTML(m) {
    const meu = m.uid === ME_(), dir = CTX.mestre === ME_(), pode = dir, partes = partesRP(m.texto);
    const todos = partes.length && partes.every((_, i) => temBloco(m.tocar, i));
    return `<article class="rp-msg ${meu ? 'meu' : ''}" style="--rc:${ES(m.cor || cor(m.uid))}">
      <div class="rp-retrato">${avHTML({ nome: m.autor, foto: m.foto, cor: m.cor }, m.uid)}</div>
      <div class="rp-cena">
        <header><b>${ES(m.autor || 'Alguém')}</b>${m.jogador && !String(m.autor).includes(m.jogador) ? `<span class="rp-jog">${ES(m.jogador)}</span>` : ''}<span class="rp-hora">${hora(m.t)}</span>
          <span class="rp-acoes">${dir && partes.length > 1 ? `<button type="button" class="rp-mini ${todos ? 'on' : ''}" data-rp-tudo="${ES(m.id)}" title="Liberar a cena inteira">${todos ? '🔊 Tudo liberado' : '▶ Liberar tudo'}</button>` : ''}${pode ? `<button type="button" class="rp-mini" data-ms-del="${ES(m.id)}" title="Apagar" aria-label="Apagar">✕</button>` : ''}</span></header>
        <div class="rp-corpo">${partes.map((p, i) => blocoHTML(p, i, m, dir)).join('')}</div>
      </div></article>`;
  }
  function desenharRP() {
    const l = document.querySelector('.ms-rp-lista'); if (!l || !CTX) return;
    const noFim = l.scrollHeight - l.scrollTop - l.clientHeight < 80;
    l.innerHTML = CHAT.msgs.filter(m => m.rp).slice().reverse().map(rpHTML).join('') || '<div class="vazio rp-vazio">A página em branco te encara.<br>Escreva a primeira cena.</div>';
    if (noFim || !l.dataset.rolou) { l.scrollTop = l.scrollHeight; l.dataset.rolou = '1'; }
    if (FILA.atual) document.querySelector(`[data-bloco="${CSS.escape(FILA.atual)}"]`)?.classList.add('lendo');
  }
  function previaRP(tx) {
    const ps = partesRP(tx); if (!ps.length) return '';
    return ps.map((p, i) => blocoHTML(p, i, { id: 'previa', tocar: null }, false)).join('');
  }
  function ligarRP(raiz) {
    const form = raiz.querySelector('.ms-rp-form'); if (!form) return;
    const ta = form.querySelector('textarea'), quem = raiz.querySelector('.ms-rp-quem'), prev = raiz.querySelector('.rp-previa');
    const k = 'adr-rasc-rp|' + CTX.col + '|' + CTX.mesa; ta.value = LS.get(k, '');
    const atualizar = () => { LS.set(k, ta.value); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 220) + 'px'; const h = previaRP(ta.value); prev.innerHTML = h; prev.hidden = !h; };
    quem.value = LS.get('adr-rp-quem|' + CTX.mesa, '') || euAgora().nome;
    quem.addEventListener('change', () => LS.set('adr-rp-quem|' + CTX.mesa, quem.value.trim()));
    ta.addEventListener('input', atualizar); atualizar();
    // Enter só quebra linha (dá para juntar fala e ação na mesma cena); Ctrl+Enter posta no teclado físico
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
    // botões que montam a cena: fala, ação e narração em linhas separadas
    raiz.querySelectorAll('[data-rp-ins]').forEach(b => b.onclick = () => {
      const tipo = b.dataset.rpIns, ini = ta.selectionStart, fim = ta.selectionEnd, sel = ta.value.slice(ini, fim);
      const antes = ta.value.slice(0, ini), depois = ta.value.slice(fim), quebra = antes && !antes.endsWith('\n') ? '\n' : '';
      const corpo = tipo === 'fala' ? `— ${sel}` : tipo === 'acao' ? `*${sel || ''}*` : sel;
      ta.value = antes + quebra + corpo + depois;
      const cursor = (antes + quebra).length + (tipo === 'fala' ? 2 + sel.length : tipo === 'acao' ? 1 + sel.length : sel.length);
      ta.focus(); ta.setSelectionRange(cursor, cursor); atualizar();
    });
    form.addEventListener('submit', async e => {
      e.preventDefault(); const tx = ta.value.trim(); if (!tx) return;
      const eu = euAgora(), q = quem.value.trim(), msg = { rp: true, uid: ME_(), autor: q || eu.nome, jogador: eu.jogador, foto: q && q !== eu.nome ? '' : eu.foto || '', cor: eu.cor, t: Date.now(), texto: tx, vozes: minhasVozes() };
      ta.value = ''; atualizar();
      try { await DB().collection(`${CTX.col}/${CTX.mesa}/chat`).add(msg); } catch (er) { TOAST('Não deu para postar: ' + (er.message || er)); ta.value = tx; atualizar(); }
      ta.focus();
    });
    raiz.querySelector('[data-rp-vozes]').onclick = escolherVozes;
    // falas rápidas: um toque posta (e, com voz automática, já fala)
    const AK = 'adr-atalhos|' + ME_();
    const lerAt = () => { try { return JSON.parse(LS.get(AK, 'null')) || ['Sim.', 'Não.', 'Espera!', 'Socorro!', 'Corre!', 'Tô com medo…', 'Eu vou junto.', 'Shhh, silêncio.']; } catch (e) { return []; } };
    let editando = false;
    const desenharAt = () => { const at = lerAt(), el = raiz.querySelector('.rp-atalhos');
      el.innerHTML = at.map((f, i) => `<button type="button" class="rp-at" data-at="${i}">${editando ? '✕ ' : ''}${ES(f)}</button>`).join('') + `<button type="button" class="rp-at mais" data-at-add title="Guardar o que está escrito como fala rápida">＋</button><button type="button" class="rp-at mais" data-at-ed title="Editar falas rápidas">${editando ? '✓' : '✎'}</button>`; };
    raiz.querySelector('.rp-atalhos').addEventListener('click', async e => {
      const b = e.target.closest('[data-at]'), add = e.target.closest('[data-at-add]'), ed = e.target.closest('[data-at-ed]');
      if (ed) { editando = !editando; desenharAt(); return; }
      if (add) { const t = ta.value.trim().replace(/^[—–-]\s*/, ''); if (!t) { TOAST('Escreva a fala no campo e toque em ＋.'); return; } const at = lerAt(); if (!at.includes(t)) LS.set(AK, JSON.stringify([...at, t].slice(-24))); desenharAt(); TOAST('Fala rápida guardada.'); return; }
      if (!b) return; const at = lerAt(), f = at[+b.dataset.at];
      if (editando) { at.splice(+b.dataset.at, 1); LS.set(AK, JSON.stringify(at)); desenharAt(); return; }
      const eu = euAgora(), q = quem.value.trim();
      try { await DB().collection(`${CTX.col}/${CTX.mesa}/chat`).add({ rp: true, rapida: true, uid: ME_(), autor: q || eu.nome, jogador: eu.jogador, foto: q && q !== eu.nome ? '' : eu.foto || '', cor: eu.cor, t: Date.now(), texto: '— ' + f, vozes: minhasVozes() }); }
      catch (er) { TOAST('Não deu: ' + (er.message || er)); }
    });
    desenharAt();
    // voz automática: a Diretora libera tudo de uma vez para a mesa
    const ba = raiz.querySelector('[data-rp-auto]');
    if (CTX.mestre === ME_()) { ba.hidden = false; ba.onclick = async () => { try { await salvarMesa(CTX.mesa, { rpAuto: !RP.auto }); } catch (er) { TOAST('Não deu: ' + (er.message || er)); } }; }
    marcarAuto();
    raiz.querySelector('[data-rp-parar]').onclick = pararRP;
    const liberar = async (m, idxs) => {
      const t = { blocos: { ...(m.tocar?.blocos || {}) }, t: Date.now(), so: idxs };
      idxs.forEach(i => { t.blocos[i] = true; });
      try { await DB().doc(`${CTX.col}/${CTX.mesa}/chat/${m.id}`).update({ tocar: t }); } catch (er) { TOAST('Não deu: ' + (er.message || er)); }
    };
    raiz.querySelector('.ms-rp-lista').addEventListener('click', async e => {
      const del = e.target.closest('[data-ms-del]');
      if (del) { if (!confirm('Apagar essa cena?')) return; try { await DB().doc(`${CTX.col}/${CTX.mesa}/chat/${del.dataset.msDel}`).delete(); } catch (er) { TOAST('Não deu: ' + (er.message || er)); } return; }
      const bb = e.target.closest('[data-rp-b]');
      if (bb) { const m = CHAT.msgs.find(x => x.id === bb.dataset.id); if (m) liberar(m, [+bb.dataset.rpB]); return; }
      const tudo = e.target.closest('[data-rp-tudo]');
      if (tudo) { const m = CHAT.msgs.find(x => x.id === tudo.dataset.rpTudo); if (m) liberar(m, partesRP(m.texto).map((_, i) => i)); return; }
      const o = e.target.closest('[data-rp-ouvir-b]');
      if (o) { const m = CHAT.msgs.find(x => x.id === o.dataset.id); if (m) narrarRP(m, [+o.dataset.rpOuvirB]); }
    });
  }
  // toca o que a Diretora acabou de liberar (em todos os aparelhos)
  function conferirFalas() {
    if (RP.auto) for (const m of CHAT.msgs.slice().reverse()) {
      if (!m.rp || m.t < RP.desde || Date.now() - m.t > 60000) continue; const k = m.id + '|auto'; if (FALAS_TOCADAS.has(k)) continue; FALAS_TOCADAS.add(k);
      narrarRP(m, partesRP(m.texto).map((_, i) => i));
    }
    for (const m of CHAT.msgs) {
      const t = m.tocar; if (!m.rp || !t?.t || !Array.isArray(t.so)) continue;
      const k = m.id + '|' + t.t; if (FALAS_TOCADAS.has(k)) continue; FALAS_TOCADAS.add(k);
      if (Date.now() - t.t < 90000) narrarRP(m, t.so);
    }
  }

  /* --- catálogo de vozes: idades, gêneros, sotaques e efeitos, montados sobre as vozes do aparelho --- */
  const NOMES_F = /francisca|luciana|maria|raquel|fernanda|thalita|leila|joana|camila|vit[oó]ria|yara|elza|manuela|brenda|giovanna|leticia|samantha|zira|hazel|susan|helena|elvira|isabella|denise|hortense|julie|katja|hedda|haruka|ayumi|nanami|irina|svetlana|paulina|sabina|monica|m[oó]nica|paola|elsa|catherine|karen|moira|tessa|fiona|victoria|allison|ava|serena|kate|libby|sonia|jenny|aria|female|feminin|mulher/i;
  const NOMES_M = /antonio|ant[oô]nio|daniel|duarte|ricardo|valerio|julio|j[uú]lio|david|mark|george|pablo|ra[uú]l|diego|cosimo|paul|henri|claude|stefan|conrad|ichiro|keita|pavel|dmitry|jorge|f[aá]bio|donato|humberto|felipe|thomas|alex|fred|ralph|bruce|guy|ryan|eric|davis|tony|male|masculin|homem/i;
  const generoVoz = v => NOMES_F.test(v.name) ? 'f' : NOMES_M.test(v.name) ? 'm' : /google/i.test(v.name) ? 'f' : '?';
  const VOZES_CAT = [
    { g: 'Idades', id: 'menina', nome: 'Menina', d: 'uns 8 anos', ic: '👧', lang: 'pt-BR', gen: 'f', tom: 1.75, vel: 1.12 },
    { g: 'Idades', id: 'menino', nome: 'Menino', d: 'uns 9 anos', ic: '👦', lang: 'pt-BR', gen: 'm', tom: 1.6, vel: 1.12 },
    { g: 'Idades', id: 'adol-f', nome: 'Adolescente', d: 'garota de 15', ic: '🧑‍🎤', lang: 'pt-BR', gen: 'f', tom: 1.35, vel: 1.1 },
    { g: 'Idades', id: 'adol-m', nome: 'Adolescente', d: 'garoto de 15', ic: '🧢', lang: 'pt-BR', gen: 'm', tom: 1.2, vel: 1.1 },
    { g: 'Idades', id: 'jovem-f', nome: 'Jovem', d: 'mulher de 20 e poucos', ic: '👩', lang: 'pt-BR', gen: 'f', tom: 1.12, vel: 1.04 },
    { g: 'Idades', id: 'jovem-m', nome: 'Jovem', d: 'homem de 20 e poucos', ic: '👨', lang: 'pt-BR', gen: 'm', tom: 1.0, vel: 1.04 },
    { g: 'Idades', id: 'adulta', nome: 'Adulta', d: 'mulher de 40', ic: '👩‍💼', lang: 'pt-BR', gen: 'f', tom: 0.98, vel: 0.98 },
    { g: 'Idades', id: 'adulto', nome: 'Adulto', d: 'homem de 40', ic: '👨‍💼', lang: 'pt-BR', gen: 'm', tom: 0.85, vel: 0.98 },
    { g: 'Idades', id: 'senhora', nome: 'Senhora', d: 'uns 65 anos', ic: '👵', lang: 'pt-BR', gen: 'f', tom: 0.9, vel: 0.86 },
    { g: 'Idades', id: 'senhor', nome: 'Senhor', d: 'uns 65 anos', ic: '👴', lang: 'pt-BR', gen: 'm', tom: 0.72, vel: 0.86 },
    { g: 'Idades', id: 'vovo-f', nome: 'Vovó bem velhinha', d: 'devagarinho, voz fina', ic: '🧓', lang: 'pt-BR', gen: 'f', tom: 1.15, vel: 0.74 },
    { g: 'Idades', id: 'vovo-m', nome: 'Vovô rouco', d: 'grave e arrastado', ic: '🦯', lang: 'pt-BR', gen: 'm', tom: 0.55, vel: 0.74 },
    { g: 'Sotaques', id: 'pt-pt-f', nome: 'Portuguesa', d: 'sotaque de Portugal', ic: '🇵🇹', lang: 'pt-PT', gen: 'f', tom: 1.05, vel: 1 },
    { g: 'Sotaques', id: 'pt-pt-m', nome: 'Português', d: 'sotaque de Portugal', ic: '🇵🇹', lang: 'pt-PT', gen: 'm', tom: 0.9, vel: 1 },
    { g: 'Sotaques', id: 'en-us-f', nome: 'Gringa americana', d: 'inglês dos EUA falando português', ic: '🇺🇸', lang: 'en-US', gen: 'f', tom: 1.05, vel: 0.95 },
    { g: 'Sotaques', id: 'en-us-m', nome: 'Gringo americano', d: 'inglês dos EUA falando português', ic: '🇺🇸', lang: 'en-US', gen: 'm', tom: 0.9, vel: 0.95 },
    { g: 'Sotaques', id: 'en-gb-f', nome: 'Britânica', d: 'inglês de Londres', ic: '🇬🇧', lang: 'en-GB', gen: 'f', tom: 1.05, vel: 0.95 },
    { g: 'Sotaques', id: 'en-gb-m', nome: 'Britânico', d: 'inglês de Londres', ic: '🇬🇧', lang: 'en-GB', gen: 'm', tom: 0.88, vel: 0.95 },
    { g: 'Sotaques', id: 'es-es', nome: 'Espanhola', d: 'castelhano', ic: '🇪🇸', lang: 'es-ES', gen: 'f', tom: 1.05, vel: 1 },
    { g: 'Sotaques', id: 'es-es-m', nome: 'Espanhol', d: 'castelhano', ic: '🇪🇸', lang: 'es-ES', gen: 'm', tom: 0.9, vel: 1 },
    { g: 'Sotaques', id: 'es-mx', nome: 'Mexicana', d: 'espanhol latino', ic: '🇲🇽', lang: 'es-MX', gen: 'f', tom: 1.05, vel: 1.02 },
    { g: 'Sotaques', id: 'es-ar', nome: 'Hermano', d: 'espanhol latino, homem', ic: '🧉', lang: 'es-US', gen: 'm', tom: 0.9, vel: 1.02 },
    { g: 'Sotaques', id: 'it', nome: 'Italiana', d: 'com as mãos falando junto', ic: '🇮🇹', lang: 'it-IT', gen: 'f', tom: 1.05, vel: 1.02 },
    { g: 'Sotaques', id: 'it-m', nome: 'Italiano', d: 'cantado', ic: '🇮🇹', lang: 'it-IT', gen: 'm', tom: 0.9, vel: 1.02 },
    { g: 'Sotaques', id: 'fr', nome: 'Francesa', d: 'charmosa', ic: '🇫🇷', lang: 'fr-FR', gen: 'f', tom: 1.05, vel: 0.98 },
    { g: 'Sotaques', id: 'fr-m', nome: 'Francês', d: 'blasé', ic: '🇫🇷', lang: 'fr-FR', gen: 'm', tom: 0.9, vel: 0.98 },
    { g: 'Sotaques', id: 'de', nome: 'Alemã', d: 'seca e firme', ic: '🇩🇪', lang: 'de-DE', gen: 'f', tom: 1.0, vel: 0.96 },
    { g: 'Sotaques', id: 'de-m', nome: 'Alemão', d: 'seco e firme', ic: '🇩🇪', lang: 'de-DE', gen: 'm', tom: 0.85, vel: 0.96 },
    { g: 'Sotaques', id: 'ru', nome: 'Russo', d: 'pesado', ic: '🇷🇺', lang: 'ru-RU', gen: 'm', tom: 0.75, vel: 0.92 },
    { g: 'Sotaques', id: 'ja', nome: 'Japonesa', d: 'educada e rápida', ic: '🇯🇵', lang: 'ja-JP', gen: 'f', tom: 1.2, vel: 1.05 },
    { g: 'Sotaques', id: 'ja-m', nome: 'Japonês', d: 'contido', ic: '🇯🇵', lang: 'ja-JP', gen: 'm', tom: 0.95, vel: 1.0 },
    { g: 'Sotaques', id: 'zh', nome: 'Chinesa', d: 'mandarim', ic: '🇨🇳', lang: 'zh-CN', gen: 'f', tom: 1.15, vel: 1.0 },
    { g: 'Sotaques', id: 'ko', nome: 'Coreana', d: 'doce', ic: '🇰🇷', lang: 'ko-KR', gen: 'f', tom: 1.15, vel: 1.02 },
    { g: 'Sotaques', id: 'nl', nome: 'Holandês', d: 'gutural', ic: '🇳🇱', lang: 'nl-NL', gen: 'm', tom: 0.9, vel: 0.98 },
    { g: 'Sotaques', id: 'ar', nome: 'Árabe', d: 'grave', ic: '🌙', lang: 'ar', gen: 'm', tom: 0.85, vel: 0.95 },
    { g: 'Sotaques', id: 'hi', nome: 'Indiana', d: 'melódica', ic: '🇮🇳', lang: 'hi-IN', gen: 'f', tom: 1.1, vel: 1.04 },
    { g: 'Personagens', id: 'narrador', nome: 'Narrador de trailer', d: 'grave, pausado, épico', ic: '🎬', lang: 'pt-BR', gen: 'm', tom: 0.45, vel: 0.82 },
    { g: 'Personagens', id: 'locutora', nome: 'Locutora de rádio', d: 'animada e clara', ic: '📻', lang: 'pt-BR', gen: 'f', tom: 1.15, vel: 1.15 },
    { g: 'Personagens', id: 'vilao', nome: 'Vilão', d: 'baixo e frio', ic: '🦹', lang: 'pt-BR', gen: 'm', tom: 0.4, vel: 0.85 },
    { g: 'Personagens', id: 'vila', nome: 'Vilã', d: 'calma e venenosa', ic: '🕷️', lang: 'pt-BR', gen: 'f', tom: 0.75, vel: 0.85 },
    { g: 'Personagens', id: 'sussurro', nome: 'Sussurro', d: 'baixinho e lento', ic: '🤫', lang: 'pt-BR', gen: 'f', tom: 0.8, vel: 0.72 },
    { g: 'Personagens', id: 'nervosa', nome: 'Em pânico', d: 'rápida e aguda', ic: '😱', lang: 'pt-BR', gen: 'f', tom: 1.45, vel: 1.35 },
    { g: 'Personagens', id: 'nervoso', nome: 'Desesperado', d: 'rápido e tenso', ic: '😰', lang: 'pt-BR', gen: 'm', tom: 1.15, vel: 1.35 },
    { g: 'Personagens', id: 'bebado', nome: 'Bêbado', d: 'arrastado', ic: '🍺', lang: 'pt-BR', gen: 'm', tom: 0.8, vel: 0.68 },
    { g: 'Personagens', id: 'fofo', nome: 'Bichinho fofo', d: 'esquilo, pelúcia', ic: '🐿️', lang: 'pt-BR', gen: 'f', tom: 2, vel: 1.25 },
    { g: 'Personagens', id: 'gigante', nome: 'Gigante', d: 'enorme e lento', ic: '🧌', lang: 'pt-BR', gen: 'm', tom: 0.1, vel: 0.7 },
    { g: 'Personagens', id: 'fantasma', nome: 'Fantasma', d: 'distante e arrastado', ic: '👻', lang: 'pt-BR', gen: 'f', tom: 0.6, vel: 0.62 },
    { g: 'Personagens', id: 'robo', nome: 'Robô', d: 'monótono', ic: '🤖', lang: 'pt-BR', gen: 'm', tom: 0.3, vel: 0.9 },
    { g: 'Personagens', id: 'demonio', nome: 'Demônio', d: 'do fundo do poço', ic: '😈', lang: 'pt-BR', gen: 'm', tom: 0, vel: 0.65 },
    { g: 'Personagens', id: 'boneca', nome: 'Boneca assustadora', d: 'fininha e lenta', ic: '🪆', lang: 'pt-BR', gen: 'f', tom: 1.9, vel: 0.78 },
  ];
  // acha a voz do aparelho mais perto do pedido: nome exato, depois idioma + gênero, depois idioma, depois português
  function vozResolver(c) {
    const vs = speechSynthesis.getVoices() || []; if (!vs.length) return { voz: null, ajuste: 0 };
    if (c?.nome) { const x = vs.find(v => v.name === c.nome); if (x) return { voz: x, ajuste: 0 }; }
    const lang = (c?.lang || 'pt-BR').toLowerCase(), base = lang.split('-')[0], gen = c?.gen || '';
    const doIdioma = vs.filter(v => v.lang.toLowerCase().replace('_', '-') === lang), daBase = vs.filter(v => v.lang.toLowerCase().startsWith(base));
    const ordena = l => l.slice().sort((a, b) => nota(b) - nota(a));
    for (const l of [doIdioma, daBase]) { if (!l.length) continue; const g = gen && ordena(l).find(v => generoVoz(v) === gen); if (g) return { voz: g, ajuste: 0 };
      const v = ordena(l)[0]; return { voz: v, ajuste: gen && generoVoz(v) !== '?' && generoVoz(v) !== gen ? (gen === 'm' ? -0.3 : 0.3) : 0 }; }
    const pts = ordena(vs.filter(v => /^pt/i.test(v.lang))), g = gen && pts.find(v => generoVoz(v) === gen);
    if (g) return { voz: g, ajuste: 0 };
    const v = pts[0] || null; return { voz: v, ajuste: v && gen && generoVoz(v) !== '?' && generoVoz(v) !== gen ? (gen === 'm' ? -0.3 : 0.3) : 0 };
  }
  const temIdioma = lang => { const b = lang.toLowerCase().split('-')[0], vs = speechSynthesis.getVoices() || []; return !vs.length || vs.some(v => v.lang.toLowerCase().startsWith(b)); };
  /* --- leitura com pausa por pontuação; trecho denso fica mais lento e espaçado --- */
  const FILA = { itens: [], ativa: false, timer: null, atual: '' };
  function pausaDe(fim, denso) { const b = /\.\.\.|…/.test(fim) ? 750 : /[.!?]/.test(fim) ? 480 : /[;:]/.test(fim) ? 360 : /,/.test(fim) ? 220 : /—|–/.test(fim) ? 300 : 120; return Math.round(b * (denso ? 1.45 : 1)); }
  function frasesDe(txt) {
    const limpo = String(txt).replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    return (limpo.match(/[^,;:.!?…—–]+(?:\.\.\.|[,;:.!?…—–]+)?/g) || [limpo]).map(x => x.trim()).filter(Boolean);
  }
  // so: lista de índices dos trechos a ler (null = todos os já liberados)
  function narrarRP(m, so) {
    if (!temVoz()) return TOAST('Este aparelho não tem voz para ler.');
    const cfg = { ...VOZ_PADRAO, ...(m.vozes || {}) };
    partesRP(m.texto).forEach((p, i) => {
      if (so ? !so.includes(i) : !temBloco(m.tocar, i)) return;
      const v = p.tipo === 'fala' ? cfg.fala : cfg.acao, frases = frasesDe(p.txt);
      const virgulas = (p.txt.match(/,/g) || []).length, denso = p.txt.length > 140 || virgulas >= 3 || frases.some(f => f.split(' ').length > 22);
      frases.forEach((f, j) => FILA.itens.push({ bloco: `${m.id}|${i}`, txt: f.replace(/[—–]+$/, ''), voz: v, tom: +v.tom || 1, vel: (+v.vel || 1) * (denso ? 0.88 : 1), pausa: pausaDe(f.slice(-3), denso) + (j === frases.length - 1 ? 260 : 0) }));
    });
    if (!FILA.ativa) proxFala();
  }
  function marcarLendo(b) { document.querySelectorAll('.rp-bloco.lendo').forEach(x => x.classList.remove('lendo')); FILA.atual = b || ''; if (b) document.querySelector(`[data-bloco="${CSS.escape(b)}"]`)?.classList.add('lendo'); const pb = document.querySelector('[data-rp-parar]'); if (pb) pb.hidden = !b; }
  function proxFala() {
    const it = FILA.itens.shift(); if (!it) { FILA.ativa = false; marcarLendo(''); return; }
    FILA.ativa = true; marcarLendo(it.bloco);
    const u = new SpeechSynthesisUtterance(it.txt), r = vozResolver(it.voz); u.lang = r.voz?.lang || 'pt-BR'; if (r.voz) u.voice = r.voz;
    u.pitch = Math.min(2, Math.max(0, it.tom + r.ajuste)); u.rate = Math.min(1.6, Math.max(0.5, it.vel));
    let foi = false; const seguir = () => { if (foi) return; foi = true; FILA.timer = setTimeout(proxFala, it.pausa); };
    u.onend = seguir; u.onerror = seguir; speechSynthesis.speak(u);
    setTimeout(seguir, Math.max(3000, it.txt.length * 110 / u.rate)); // trava de segurança se o aparelho não avisar o fim
  }
  function pararRP() { FILA.itens = []; clearTimeout(FILA.timer); FILA.ativa = false; marcarLendo(''); if (temVoz()) speechSynthesis.cancel(); }
  function escolherVozes() {
    if (!temVoz()) return TOAST('Este aparelho não tem vozes de leitura.');
    const todas = (speechSynthesis.getVoices() || []).slice().sort((a, b) => (/^pt/i.test(b.lang) - /^pt/i.test(a.lang)) || nota(b) - nota(a));
    const cfg = minhasVozes(), cam = document.getElementById('camada') || document.body;
    let aba = 'fala'; const esc = { fala: { ...VOZ_PADRAO.fala, ...cfg.fala }, acao: { ...VOZ_PADRAO.acao, ...cfg.acao } };
    const div = document.createElement('div'); div.className = 'fundo-modal';
    const grupos = [...new Set(VOZES_CAT.map(v => v.g))];
    const desenhar = () => {
      const c = esc[aba];
      div.innerHTML = `<div class="modal largo vz-modal" role="dialog" aria-label="Vozes do roleplay"><div class="cab-m"><h2>Vozes do roleplay</h2><button class="btn-x" data-f>✕</button></div>
        <div class="vz-abas"><button type="button" data-vz-aba="fala" class="${aba === 'fala' ? 'aqui' : ''}">— Falas da personagem<small>${ES(VOZES_CAT.find(v => v.id === esc.fala.preset)?.nome || 'Personalizada')}</small></button><button type="button" data-vz-aba="acao" class="${aba === 'acao' ? 'aqui' : ''}">✦ Ações e narração<small>${ES(VOZES_CAT.find(v => v.id === esc.acao.preset)?.nome || 'Personalizada')}</small></button></div>
        ${grupos.map(gr => `<h3 class="vz-g">${gr}</h3><div class="vz-grade">${VOZES_CAT.filter(v => v.g === gr).map(v => { const tem = temIdioma(v.lang); return `<div class="vz-card ${c.preset === v.id ? 'aqui' : ''} ${tem ? '' : 'falta'}" data-vz-p="${v.id}" role="button" tabindex="0">
          <span class="vz-ic">${v.ic}</span><b>${ES(v.nome)}</b><small>${ES(v.d)}${v.gen ? ` · ${v.gen === 'f' ? '♀' : '♂'}` : ''}</small>${tem ? '' : '<small class="vz-falta">sem esse idioma aqui: usa português</small>'}
          <button type="button" class="vz-play" data-vz-ouvir="${v.id}" title="Ouvir" aria-label="Ouvir ${ES(v.nome)}">▶</button></div>`; }).join('')}</div>`).join('')}
        <details class="vz-av"><summary>Ajuste fino e voz exata do aparelho</summary>
          <label>Voz do aparelho <select data-vz-nome><option value="">Automática pelo estilo escolhido</option>${todas.map(v => `<option value="${ES(v.name)}" ${v.name === c.nome ? 'selected' : ''}>${ES(v.name)} (${ES(v.lang)})</option>`).join('')}</select></label>
          <label>Tom <input type="range" min="0" max="2" step="0.05" value="${c.tom}" data-vz-tom><b>${(+c.tom).toFixed(2)}</b></label>
          <label>Velocidade <input type="range" min="0.5" max="1.6" step="0.02" value="${c.vel}" data-vz-vel><b>${(+c.vel).toFixed(2)}</b></label>
          <button type="button" class="btn mini sec" data-vz-teste>▶ Testar como está</button></details>
        <p class="tag">${todas.length} vozes neste aparelho. Quem ouve usa o mesmo estilo; se o aparelho dela não tiver o idioma, cai no português com o mesmo tom e velocidade.</p>
        <div class="btns"><button class="btn" data-vz-ok>Salvar as duas</button></div></div>`;
    };
    const frase = k => k === 'fala' ? '— Eu não vou descer naquele porão, entendeu? Nem morta.' : '*Ela recua devagar, a lanterna tremendo na mão, e a porta range sozinha atrás dela.*';
    const tocar = c => { pararRP(); narrarRP({ id: 'teste', texto: frase(aba), vozes: { [aba]: c } }, [0]); };
    const escolher = id => { const v = VOZES_CAT.find(x => x.id === id); if (!v) return; esc[aba] = { preset: v.id, lang: v.lang, gen: v.gen, nome: '', tom: v.tom, vel: v.vel }; desenhar(); };
    div.addEventListener('click', e => {
      if (e.target === div || e.target.closest('[data-f]')) { pararRP(); div.remove(); return; }
      const o = e.target.closest('[data-vz-ouvir]'); if (o) { e.stopPropagation(); const v = VOZES_CAT.find(x => x.id === o.dataset.vzOuvir); tocar({ preset: v.id, lang: v.lang, gen: v.gen, tom: v.tom, vel: v.vel }); return; }
      const p = e.target.closest('[data-vz-p]'); if (p) { escolher(p.dataset.vzP); tocar(esc[aba]); return; }
      const ab = e.target.closest('[data-vz-aba]'); if (ab) { aba = ab.dataset.vzAba; desenhar(); return; }
      if (e.target.closest('[data-vz-teste]')) { tocar(esc[aba]); return; }
      if (e.target.closest('[data-vz-ok]')) { LS.set('adr-vozes|' + ME_(), JSON.stringify(esc)); TOAST('Vozes salvas.'); pararRP(); div.remove(); }
    });
    div.addEventListener('keydown', e => { const p = e.target.closest?.('[data-vz-p]'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); escolher(p.dataset.vzP); tocar(esc[aba]); } });
    div.addEventListener('input', e => { const c = esc[aba];
      if (e.target.matches('[data-vz-tom]')) { c.tom = +e.target.value; e.target.nextElementSibling.textContent = c.tom.toFixed(2); c.preset = c.preset || ''; }
      if (e.target.matches('[data-vz-vel]')) { c.vel = +e.target.value; e.target.nextElementSibling.textContent = c.vel.toFixed(2); }
      if (e.target.matches('[data-vz-nome]')) { c.nome = e.target.value; const v = todas.find(x => x.name === c.nome); if (v) { c.lang = v.lang; } } });
    desenhar(); cam.appendChild(div);
    if (!todas.length) speechSynthesis.onvoiceschanged = () => { speechSynthesis.onvoiceschanged = null; if (div.isConnected) { div.remove(); escolherVozes(); } };
  }

  const painel = () => `<div class="ms-chat ms-rp"><div class="ms-rp-topo"><label>Falando como <input type="text" class="ms-rp-quem" maxlength="40"></label><span class="btns"><button type="button" class="btn mini" data-rp-parar hidden>⏹ Parar voz</button><button type="button" class="btn mini sec" data-rp-auto hidden></button><span class="tag" data-rp-auto-tag hidden>🔓 Voz automática</span><button type="button" class="btn mini sec" data-rp-vozes>🎙 Vozes</button></span></div><div class="ms-rp-lista" role="log" aria-live="polite" aria-label="Cenas do roleplay"></div>
    <div class="rp-compor"><div class="rp-atalhos" aria-label="Falas rápidas"></div><div class="rp-previa" hidden></div><div class="rp-ferr"><button type="button" data-rp-ins="fala" title="Nova fala">— Fala</button><button type="button" data-rp-ins="acao" title="Nova ação (ou envolve o texto selecionado)">✦ Ação</button><button type="button" data-rp-ins="narra" title="Nova linha de narração">¶ Narração</button></div>
    <form class="ms-rp-form"><textarea rows="2" enterkeyhint="enter" maxlength="1500" placeholder="— Fala começa com travessão ou hífen.&#10;*Ação vai entre asteriscos.*&#10;O resto é narração." aria-label="Roleplay"></textarea><button class="btn">Postar</button></form><div class="ms-dica">Enter pula linha para continuar a cena. Poste no botão (ou Ctrl+Enter). A prévia mostra como vai ficar.</div></div></div>`;
  let primeira = true;
  // msgs: chat da campanha (mais novo primeiro); mesa: documento público (rpAuto)
  function atualizar(msgs, mesa) {
    CHAT.msgs = msgs || [];
    const a = !!mesa?.rpAuto; if (a !== RP.auto) { RP.auto = a; RP.desde = Date.now(); }
    if (primeira) { CHAT.msgs.forEach(m => { FALAS_TOCADAS.add(m.id + '|auto'); if (m.tocar?.t) FALAS_TOCADAS.add(m.id + '|' + m.tocar.t); }); primeira = false; }
    else conferirFalas();
    desenharRP(); marcarAuto();
  }
  function ligar(raiz, ctx) { CTX = { col: 'campanhas', tituloMestre: 'Mestre', ...ctx }; ligarRP(raiz); desenharRP(); marcarAuto(); }
  function reiniciar(id) { if (CTX?.mesa !== id) { primeira = true; pararRP(); } }
  return { painel, ligar, atualizar, reiniciar, novas: (msgs, desde) => (msgs || []).filter(m => m.rp && m.uid !== ME && m.t > desde).length };
})();

/* ---------- estilos ---------- */
(() => { const st = document.createElement('style'); st.textContent = `
:root { --tabua: var(--painel-2); --tabua-2: var(--painel-3); --madeira: var(--painel-3); --madeira-2: var(--painel); --ambar: var(--ouro); --ambar-hi: #e3c47f; --texto: var(--lua); --texto-dim: var(--lua-dim); --texto-faint: var(--lua-faint); --vermelho: var(--sangue); --teal: var(--fole); --f-maq: var(--f-mono); --papel: #efe4c8; --tinta: #2a1a0e; }
.bloco { display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); min-width: 0; } .bloco > * { min-width: 0; } #aba-viva, #aba-viva-e { min-width: 0; } .caixa.bloco h3 { margin: 0; font: 400 22px var(--f-disp); }
.btns { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.duas { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tag-sus { color: #fff; background: var(--sangue); border-color: var(--sangue); }
.pista b { display: block; margin-bottom: 4px; font-family: var(--f-disp); font-size: 17px; font-weight: 400; } .pista p { margin: 0; } .pista img { max-width: 100%; display: block; margin: 6px 0; } .pista audio { width: 100%; margin-top: 6px; }
.feed-abas .badge[hidden] { display: none; }
.feed .ms-rp { border-left: 0; border-right: 0; border-radius: 0; } .feed .ms-rp-lista { max-height: none; flex: 1; }
.lateral .ms-rp { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.hist-dia { font: 400 18px var(--f-disp); color: var(--ouro); margin: 10px 0 2px; }
.hist-filtros { display: flex; gap: 8px; flex-wrap: wrap; align-items: end; } .hist-filtros .campo { min-width: 180px; }
.rol2 { position: relative; } .rol2 > .apagar-rol { position: absolute; top: 4px; right: 4px; z-index: 2; }
.feed-rodape { padding: 8px 12px; border-top: 1px solid var(--linha); }
.hist-lista { display: grid; gap: 8px; max-width: 760px; }
.ms-av { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--linha-2); background: center/cover no-repeat; display: grid; place-items: center; font: 800 12px var(--f-body); color: #0b0d14; flex: none; }
.feed { min-width: 0; } .ms-rp, .ms-rp > * { min-width: 0; max-width: 100%; } .ms-rp-topo label { flex: 1 1 160px; min-width: 0; } .ms-rp-topo input { width: 100%; min-width: 0; }
.feed .rp-msg { grid-template-columns: 40px minmax(0, 1fr); gap: 8px; } .feed .rp-retrato .ms-av { width: 40px; height: 40px; } .feed .rp-fala { max-width: 100%; } .feed .ms-rp-lista { padding: 14px 10px; }
.feed-abas button { padding: 12px 4px; }
.mapa-caixa [hidden], .ms-rp [hidden], .mapa-pop [hidden], .mapa-zoom-lista[hidden], .rp-previa[hidden] { display: none !important; }
[data-zoom-img] { cursor: zoom-in; }
.zoom-img { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 24px; background: rgba(5,6,10,.9); backdrop-filter: blur(4px); animation: zoomEntra .18s ease-out; cursor: zoom-out; }
@keyframes zoomEntra { from { opacity: 0; } }
.zoom-img figure { margin: 0; display: grid; justify-items: center; animation: zoomImg .25s ease-out; cursor: default; }
@keyframes zoomImg { from { transform: scale(.94); opacity: 0; } }
.mold-quadro { position: relative; padding: 14px; background: linear-gradient(145deg, #3a2c17, #15100a 45%, #2b2012); border: 2px solid #c8a35a;
  box-shadow: 0 0 0 3px #0b0d14, 0 0 0 5px #7d6230, 0 0 0 6px #0b0d14, inset 0 0 0 1px rgba(255,226,160,.35), inset 0 0 18px rgba(0,0,0,.8), 0 30px 80px rgba(0,0,0,.85), 0 0 60px rgba(200,163,90,.12); }
.mold-quadro img { display: block; max-width: 86vw; max-height: 76vh; border: 1px solid rgba(232,200,130,.55); box-shadow: 0 0 0 3px #0b0d14, inset 0 0 30px rgba(0,0,0,.5); }
.mc { position: absolute; width: 22px; height: 22px; border: 2px solid #e3c47f; pointer-events: none; }
.mc::after { content: ''; position: absolute; width: 7px; height: 7px; background: #e3c47f; transform: rotate(45deg); box-shadow: 0 0 6px rgba(227,196,127,.8); }
.mc.a { top: -7px; left: -7px; border-right: 0; border-bottom: 0; } .mc.a::after { top: -5px; left: -5px; }
.mc.b { top: -7px; right: -7px; border-left: 0; border-bottom: 0; } .mc.b::after { top: -5px; right: -5px; }
.mc.c { bottom: -7px; left: -7px; border-right: 0; border-top: 0; } .mc.c::after { bottom: -5px; left: -5px; }
.mc.d { bottom: -7px; right: -7px; border-left: 0; border-top: 0; } .mc.d::after { bottom: -5px; right: -5px; }
.placa { position: relative; z-index: 2; margin-top: -20px; display: grid; justify-items: center; gap: 2px; min-width: 240px; max-width: 86vw; padding: 9px 46px 10px; text-align: center;
  background: linear-gradient(180deg, #f1dba0, #c9a24f 48%, #8f6c2b); color: #1c1307; border: 1px solid #fff0c4;
  clip-path: polygon(16px 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 16px 100%, 0 50%);
  filter: drop-shadow(0 8px 16px rgba(0,0,0,.7)); }
.placa::before { content: ''; position: absolute; inset: 4px 12px; border-top: 1px solid rgba(60,38,10,.45); border-bottom: 1px solid rgba(60,38,10,.45); pointer-events: none; }
.placa b { font: 400 clamp(24px, 3.2vw, 34px)/1.05 var(--f-disp); letter-spacing: .04em; text-shadow: 0 1px 0 rgba(255,245,210,.7); overflow-wrap: anywhere; }
.placa span { font: 700 11.5px/1.2 var(--f-body); letter-spacing: .2em; text-transform: uppercase; color: #3d2a0e; }
.zoom-x { position: fixed; top: 14px; right: 14px; width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--linha-2); background: var(--painel-2); color: var(--lua); font-size: 18px; cursor: pointer; }
.sessao-bar { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.ms-b { background: var(--tabua); border: 2px solid #000; padding: 6px 10px; border-radius: 2px 10px 10px 10px; max-width: 100%; min-width: 0; position: relative; }
.ms-msg.meu .ms-b { background: color-mix(in srgb, var(--ambar) 26%, var(--tabua)); border-radius: 10px 2px 10px 10px; }
.ms-cab { display: flex; gap: 8px; justify-content: space-between; align-items: baseline; font-size: 11.5px; }
.ms-cab b { color: var(--ambar-hi); } .ms-cab span { color: var(--texto-faint); }
.ms-tx { font-size: 14.5px; overflow-wrap: anywhere; white-space: normal; }
.ms-tx.acao { font-style: italic; color: var(--texto-dim); }
.ms-rol { font-family: monospace; } .ms-rol b { color: var(--ambar-hi); }
.ms-del { position: absolute; top: -9px; right: -9px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #000; background: var(--madeira); color: var(--texto-dim); font-size: 12px; line-height: 1; cursor: pointer; display: none; }
.ms-b:hover .ms-del, .ms-b:focus-within .ms-del { display: block; }
@media (hover: none) { .ms-del { display: block; } }
.ms-form { display: flex; gap: 6px; padding: 8px; border-top: 2px solid #000; background: var(--tabua); }
.ms-form textarea { flex: 1; min-width: 0; resize: none; min-height: 40px; max-height: 120px; font: inherit; }
.ms-dica { font-size: 11.5px; color: var(--texto-faint); padding: 0 10px 8px; background: var(--tabua); }
.ms-voz { border: 2px solid #000; border-radius: 10px; background: var(--madeira-2); padding: 14px; display: grid; gap: 12px; }
.ms-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
.ms-tile { display: grid; justify-items: center; gap: 6px; padding: 12px 6px; border: 2px solid #000; border-radius: 10px; background: var(--tabua); text-align: center; position: relative; }
.ms-tile .ms-av { width: 64px; height: 64px; font-size: 20px; transition: box-shadow .12s; }
.ms-tile.falando .ms-av, .ms-pip .ms-av.falando { box-shadow: 0 0 0 3px #3ddc84, 0 0 16px #3ddc84; }
.ms-tile b { font-size: 13px; overflow-wrap: anywhere; } .ms-tile small { color: var(--texto-faint); font-size: 11px; }
.ms-tile .ms-mudo { position: absolute; top: 6px; right: 6px; font-size: 13px; }
.ms-tile .ms-est { font-size: 11px; color: var(--ambar-hi); }
.ms-ctrl { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.ms-vol { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--texto-dim); }
.ms-vol input { flex: 1; }
.ms-pip { position: fixed; z-index: 90; width: 150px; padding: 10px; display: grid; justify-items: center; gap: 6px; background: var(--tabua); border: 2px solid #000; border-radius: 12px; box-shadow: 4px 4px 0 #000; touch-action: none; cursor: grab; }
.ms-pip .ms-av { width: 54px; height: 54px; font-size: 18px; }
.ms-pip .ms-quem { font-size: 12px; font-weight: 800; text-align: center; overflow-wrap: anywhere; }
.ms-pip .ms-ctrl button { padding: 4px 8px; min-width: 0; }
.ms-pip .ms-n { position: absolute; top: -8px; right: -8px; background: #3ddc84; color: #000; border: 2px solid #000; border-radius: 999px; font: 800 11px monospace; padding: 1px 7px; }
.ms-rp-topo { display: flex; gap: 8px; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--tabua); border-bottom: 2px solid #000; flex-wrap: wrap; }
.ms-rp-topo label { display: flex; gap: 6px; align-items: center; font-size: 12px; color: var(--texto-dim); } .ms-rp-topo input { width: 170px; padding: 4px 8px; }
.ms-rp { grid-template-rows: auto 1fr auto; grid-template-columns: minmax(0, 1fr); }
.ms-rp > * { min-width: 0; }
.ms-rp-lista { display: grid; gap: 22px; align-content: start; padding: 18px 14px; overflow-y: auto; max-height: 64vh; min-height: 280px;
  background: radial-gradient(ellipse 120% 60% at 50% 0%, rgba(255,255,255,.045), transparent 70%), repeating-linear-gradient(0deg, rgba(255,255,255,.012) 0 1px, transparent 1px 28px), var(--madeira-2); }
.rp-vazio { font-family: Georgia, serif; font-style: italic; }
.rp-msg { display: grid; grid-template-columns: 54px minmax(0, 1fr); gap: 12px; align-items: start; animation: rpEntra .35s ease-out; }
@keyframes rpEntra { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.rp-retrato { position: sticky; top: 0; }
.rp-retrato .ms-av { width: 54px; height: 54px; font-size: 18px; border: 3px solid var(--rc); box-shadow: 0 0 0 2px #000, 0 6px 14px rgba(0,0,0,.5); }
.rp-cena { min-width: 0; display: grid; gap: 8px; }
.rp-cena header { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; border-bottom: 1px solid color-mix(in srgb, var(--rc) 45%, transparent); padding-bottom: 4px; }
.rp-cena header b { font: 400 20px/1 var(--f-disp); letter-spacing: .04em; color: color-mix(in srgb, var(--rc) 70%, #fff); text-shadow: 0 2px 0 #000; }
.rp-jog { font-size: 11px; color: var(--texto-faint); text-transform: uppercase; letter-spacing: .08em; } .rp-hora { font: 11px monospace; color: var(--texto-faint); }
.rp-acoes { margin-left: auto; display: flex; gap: 4px; }
.rp-mini { background: transparent; border: 1px solid rgba(255,255,255,.15); color: var(--texto-dim); border-radius: 999px; padding: 2px 9px; font-size: 11.5px; cursor: pointer; }
.rp-mini:hover, .rp-mini.on { border-color: var(--rc); color: #fff; background: color-mix(in srgb, var(--rc) 30%, transparent); }
.rp-corpo { display: grid; gap: 10px; }
.rp-bloco { position: relative; font-family: Georgia, 'Times New Roman', serif; font-size: 15.5px; line-height: 1.6; transition: box-shadow .2s, transform .2s; }
.rp-bloco p { margin: 0; overflow-wrap: anywhere; }
.rp-fala { justify-self: start; max-width: 92%; }
.rp-balao { position: relative; background: linear-gradient(180deg, color-mix(in srgb, var(--rc) 22%, #1a0d0f), color-mix(in srgb, var(--rc) 10%, #120709)); border: 1px solid color-mix(in srgb, var(--rc) 55%, #000); border-radius: 4px 16px 16px 16px; padding: 10px 16px 10px 18px; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.35); overflow-wrap: anywhere; }
.rp-balao::before { content: ''; position: absolute; left: -9px; top: 0; border: 9px solid transparent; border-top-color: color-mix(in srgb, var(--rc) 55%, #000); border-right-color: color-mix(in srgb, var(--rc) 55%, #000); border-width: 0 9px 9px 0; }
.rp-aspas { font: 700 26px/0 Georgia, serif; color: color-mix(in srgb, var(--rc) 70%, #fff); vertical-align: -9px; margin-right: 3px; } .rp-aspas.fim { margin: 0 0 0 2px; }
.rp-acao { display: grid; gap: 2px; padding: 8px 14px 8px 16px; border-left: 3px solid color-mix(in srgb, var(--rc) 60%, #555); background: linear-gradient(90deg, rgba(255,255,255,.05), transparent 85%); border-radius: 0 8px 8px 0; }
.rp-acao p { font-style: italic; color: var(--texto-dim); }
.rp-rotulo { font: 700 9.5px/1 var(--f-body, sans-serif); text-transform: uppercase; letter-spacing: .22em; color: color-mix(in srgb, var(--rc) 65%, #aaa); }
.rp-narra { text-align: center; padding: 2px 18px; color: color-mix(in srgb, var(--texto) 80%, var(--ambar)); font-size: 15px; }
.rp-narra p::before, .rp-narra p::after { content: ' ⁂ '; color: var(--texto-faint); font-size: 11px; }
.rp-lib { position: absolute; top: -10px; right: -8px; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #000; background: var(--tabua); font-size: 13px; cursor: pointer; display: grid; place-items: center; opacity: .55; transition: opacity .15s, transform .15s; }
.rp-bloco:hover .rp-lib, .rp-lib.on { opacity: 1; } .rp-lib:hover { transform: scale(1.12); } .rp-lib.on { background: var(--rc); }
.rp-fala .rp-lib { right: -12px; }
.rp-bloco.lendo .rp-balao, .rp-bloco.lendo.rp-acao, .rp-bloco.lendo.rp-narra { box-shadow: 0 0 0 2px var(--rc), 0 0 22px color-mix(in srgb, var(--rc) 60%, transparent); }
.rp-bloco.lendo { transform: translateX(3px); }
.vz-modal { max-height: 90vh; overflow-y: auto; width: min(980px, 96vw) !important; max-width: 96vw !important; }
.vz-abas { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; position: sticky; top: -1px; z-index: 2; background: inherit; padding: 4px 0 8px; }
.vz-abas button { display: grid; gap: 2px; text-align: left; padding: 10px 12px; border: 2px solid #000; border-radius: 10px; background: var(--tabua); color: var(--texto-dim); font-weight: 800; cursor: pointer; }
.vz-abas button small { font-weight: 400; color: var(--texto-faint); } .vz-abas button.aqui { background: var(--ambar); color: #1a0f05; } .vz-abas button.aqui small { color: #2a1a0e; }
.vz-g { margin: 12px 0 6px; font-size: 15px; }
.vz-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.vz-card { position: relative; display: grid; gap: 2px; align-content: start; padding: 10px 10px 10px 12px; border: 2px solid #000; border-radius: 10px; background: var(--madeira-2); cursor: pointer; min-height: 86px; }
.vz-card:hover, .vz-card:focus-visible { border-color: var(--ambar); outline: none; } .vz-card.aqui { background: color-mix(in srgb, var(--ambar) 22%, var(--madeira-2)); box-shadow: 0 0 0 2px var(--ambar); }
.vz-card.falta { opacity: .7; } .vz-ic { font-size: 24px; line-height: 1; } .vz-card b { font-size: 14px; } .vz-card small { font-size: 11.5px; color: var(--texto-faint); } .vz-falta { color: var(--ambar-hi) !important; }
.vz-play { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; border-radius: 50%; border: 2px solid #000; background: var(--ambar); color: #1a0f05; font-size: 12px; cursor: pointer; }
.vz-av { margin-top: 12px; border: 2px solid #000; border-radius: 10px; padding: 8px 12px; display: grid; gap: 8px; } .vz-av summary { cursor: pointer; font-weight: 800; }
.vz-av label { display: grid; grid-template-columns: 110px 1fr 44px; gap: 8px; align-items: center; font-size: 13px; } .vz-av label:first-of-type { grid-template-columns: 110px 1fr; }
.rp-atalhos { display: flex; gap: 6px; overflow-x: auto; padding: 8px 8px 0; scrollbar-width: thin; }
.rp-at { flex: none; background: color-mix(in srgb, var(--ambar) 16%, var(--madeira-2)); border: 1px solid color-mix(in srgb, var(--ambar) 45%, #000); color: #fff; border-radius: 999px; padding: 7px 14px; font: 600 14px Georgia, serif; cursor: pointer; min-height: 36px; }
.rp-at:hover, .rp-at:focus-visible { background: color-mix(in srgb, var(--ambar) 35%, var(--madeira-2)); outline: none; }
.rp-at.mais { background: transparent; color: var(--texto-dim); font-family: inherit; }
.rp-compor { border-top: 2px solid #000; background: var(--tabua); }
.rp-previa { display: grid; gap: 8px; padding: 10px 14px; max-height: 200px; overflow-y: auto; border-bottom: 1px dashed rgba(255,255,255,.12); --rc: var(--ambar); background: rgba(0,0,0,.18); }
.rp-previa::before { content: 'Prévia'; font: 700 9.5px monospace; letter-spacing: .2em; text-transform: uppercase; color: var(--texto-faint); }
.rp-ferr { display: flex; gap: 6px; padding: 8px 8px 0; flex-wrap: wrap; }
.rp-ferr button { background: var(--madeira-2); border: 1px solid rgba(255,255,255,.14); color: var(--texto-dim); border-radius: 999px; padding: 4px 12px; font: 600 12.5px Georgia, serif; cursor: pointer; }
.rp-ferr button:hover { color: #fff; border-color: var(--ambar); }
.ms-rp-form { display: flex; gap: 6px; padding: 8px; }
.ms-rp-form textarea { flex: 1; min-width: 0; resize: none; min-height: 60px; max-height: 220px; font: 15px/1.45 Georgia, serif; }
.rp-vz { border: 2px solid #000; border-radius: 8px; padding: 8px 10px; display: grid; gap: 6px; margin: 0 0 10px; } .rp-vz legend { font-weight: 800; padding: 0 4px; }
.rp-vz label { display: grid; grid-template-columns: 90px 1fr; align-items: center; font-size: 13px; }
@media (max-width: 560px) { .rp-msg { grid-template-columns: 40px minmax(0, 1fr); gap: 8px; } .rp-retrato .ms-av { width: 40px; height: 40px; } .rp-fala { max-width: 100%; } }
.ms-ouvir { background: none; border: 0; cursor: pointer; font-size: 15px; padding: 0 4px; opacity: .75; vertical-align: middle; }
.ms-ouvir:hover, .ms-ouvir.lendo { opacity: 1; }
.ms-ouvir.lendo { color: var(--ambar-hi); }

.pista.falsa { background: repeating-linear-gradient(-45deg, #f3e6c8 0 14px, #f0d9a8 14px 28px); }
.pista.falsa::after { content: "FALSA"; position: absolute; right: 10px; top: 8px; font: 400 18px var(--f-disp); color: var(--vermelho); transform: rotate(8deg); border: 2px solid var(--vermelho); padding: 0 6px; }
.mural { display: grid; gap: 10px; }
.pista { background: var(--papel); color: var(--tinta); padding: 10px 14px; border-radius: 3px; box-shadow: 2px 3px 0 rgba(0,0,0,.5); position: relative; font-size: 15px; }
.pista::before { content: ""; position: absolute; top: -6px; left: 50%; width: 14px; height: 14px; border-radius: 50%; background: var(--vermelho); border: 2px solid #000; transform: translateX(-50%); }
.pista:nth-child(odd) { transform: rotate(-.7deg); } .pista:nth-child(even) { transform: rotate(.6deg); }
.suspeito { display: grid; gap: 4px; background: #120b06; border: 2px dashed var(--texto-faint); border-radius: 8px; padding: 10px 12px; }
.suspeito b { font: 400 18px var(--f-disp); color: var(--ambar-hi); }
.suspeito .tg { font: 12px var(--f-maq); color: var(--texto-dim); }
.suspeito p { margin: 0; font-size: 14px; }
.suspeito.inocente { opacity: .5; } .suspeito.inocente b::after { content: " · inocente"; color: var(--teal); font-size: 13px; }
.foto-s { width: 84px; height: 84px; border-radius: 12px; border: 3px solid #000; background: var(--tabua-2) center/cover no-repeat; display: grid; place-items: center; font: 400 30px var(--f-disp); color: var(--texto-faint); box-shadow: 2px 2px 0 #000; flex: none; }
.foto-s.g { width: 140px; height: 140px; font-size: 48px; }
.foto-s.p { width: 72px; height: 72px; font-size: 24px; border-radius: 10px; }
.suspeito.com-foto { grid-template-columns: auto 1fr; column-gap: 12px; }
.suspeito.com-foto > :not(.foto-s) { grid-column: 2; }
.suspeito.com-foto .foto-s { grid-row: 1 / span 4; }
.lista-sus { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.dia { background: #120b06; border: 2px solid #000; border-radius: 10px; padding: 10px 14px; }
.dia summary { cursor: pointer; font: 400 20px var(--f-disp); color: var(--ambar); list-style: none; display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
.dia summary::-webkit-details-marker { display: none; }
.dia summary::before { content: "▸ "; } .dia[open] summary::before { content: "▾ "; }
.dia summary span { font: 12px var(--f-maq); color: var(--texto-dim); }
.dia .mural { margin-top: 12px; }
.hoje { display: flex; gap: 10px; align-items: center; font: 400 20px var(--f-disp); color: var(--teal); }
body.arrastando-q { user-select: none; -webkit-user-select: none; }
.quadro-bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.quadro-bar .tag { font-size: 12px; }
.quadro-wrap { overflow: auto; border: 3px solid #000; border-radius: 10px; box-shadow: 4px 4px 0 #000; background: #2a190c; max-height: 78vh; -webkit-overflow-scrolling: touch; }
.quadro-wrap:fullscreen, .quadro-wrap.tela-cheia { max-height: none; width: 100vw; height: 100vh; height: 100dvh; border: 0; border-radius: 0; }
.quadro-wrap.tela-cheia { position: fixed; inset: 0; z-index: 40; }
body.quadro-cheio { overflow: hidden; }
.quadro-palco { position: relative; margin: 0 auto; }
.quadro-zoom { display: inline-flex; gap: 4px; align-items: center; }
.quadro-zoom span { font: 12px var(--f-maq); color: var(--texto-dim); min-width: 42px; text-align: center; }
.quadro-wrap:fullscreen .q-fs-bar, .quadro-wrap.tela-cheia .q-fs-bar { position: fixed; right: max(10px, env(safe-area-inset-right)); top: max(10px, env(safe-area-inset-top)); background: rgba(18,11,6,.85); padding: 6px; border-radius: 10px; border: 2px solid #000; z-index: 41; display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.q-fs-bar { flex-wrap: nowrap !important; } .q-fs-bar .btn { min-width: 38px; padding: 6px 9px; font-size: 15px; } .q-fs-bar #q-sair { padding: 6px 12px; }
.q-fs-bar { display: none; }
.q-fs-bar.recolhida > :not([data-recolher]) { display: none; }
.q-fs-bar [data-recolher] { font-size: 17px; }
.quadro { position: absolute; left: 0; top: 0; width: 1600px; height: 1000px; transform-origin: 0 0; user-select: none;
  background: radial-gradient(circle at 20% 30%, rgba(255,255,255,.05) 0 2px, transparent 3px) 0 0 / 14px 14px, radial-gradient(circle at 70% 60%, rgba(0,0,0,.18) 0 2px, transparent 3px) 0 0 / 11px 11px, linear-gradient(135deg, #b98a55, #a77744 50%, #b48552);
  box-shadow: inset 0 0 0 14px #6b4424, inset 0 0 0 17px #000, inset 0 0 60px rgba(0,0,0,.45); }
.quadro svg.fios { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.quadro svg.fios line { stroke: #c0161d; stroke-width: 3; stroke-linecap: round; filter: drop-shadow(1px 2px 1px rgba(0,0,0,.5)); }
.quadro svg.fios line.hit { stroke: transparent; stroke-width: 34; pointer-events: stroke; cursor: pointer; filter: none; }
.quadro.ligando svg.fios line.hit:hover + line, .quadro svg.fios line.hit:hover + line { stroke: #ff5a5f; }
.q-item { position: absolute; z-index: 2; transform: translate(-50%, -50%) rotate(var(--r, 0deg)); cursor: grab; touch-action: none; }
.q-item.arrastando { cursor: grabbing; z-index: 5; filter: drop-shadow(6px 10px 6px rgba(0,0,0,.45)); }
.q-item::before { content: ""; position: absolute; top: -7px; left: 50%; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ff7b7b, #b3141b 60%); border: 1px solid #000; box-shadow: 1px 2px 2px rgba(0,0,0,.5); z-index: 3; }
.q-item.solto::before { background: radial-gradient(circle at 35% 35%, #7a7a7a, #111 60%); }
.q-item.sel { outline: 3px dashed #c0161d; outline-offset: 4px; }
.q-pol { width: 112px; background: #fbf6ea; padding: 7px 7px 6px; box-shadow: 2px 4px 6px rgba(0,0,0,.45); text-align: center; color: var(--tinta); }
.q-pol .ft { width: 98px; height: 98px; background: #3a2716 center/cover no-repeat; display: grid; place-items: center; font: 400 30px var(--f-disp); color: #c9b48e; }
.q-pol b { display: block; font: 400 14px/1.1 var(--f-disp); margin-top: 5px; }
.q-pol span { font: 10px var(--f-maq); color: #7a5a35; }
.q-pol.inoc .ft { filter: grayscale(1); }
.q-pol.inoc::after { content: "INOCENTE"; position: absolute; left: 50%; top: 44%; transform: translate(-50%, -50%) rotate(-18deg); font: 400 17px var(--f-disp); color: var(--teal); border: 3px solid var(--teal); padding: 0 6px; background: rgba(251,246,234,.75); }
.q-pap { width: 168px; max-height: 150px; overflow: hidden; background: #f3e6c8; padding: 12px 10px 10px; box-shadow: 2px 4px 6px rgba(0,0,0,.45); font: 12.5px/1.35 var(--f-maq); color: var(--tinta); }
.q-pap .dia-t { display: block; font-size: 10px; color: #8a6a40; margin-bottom: 3px; }
.q-pap.falsa { background: repeating-linear-gradient(-45deg, #f3e6c8 0 12px, #efd6a0 12px 24px); }
.q-pap.falsa::after { content: "FALSA"; position: absolute; right: 6px; bottom: 4px; font: 400 15px var(--f-disp); color: var(--vermelho); transform: rotate(-8deg); }
.q-nota { width: 140px; min-height: 90px; background: #ffe36e; padding: 12px 10px 10px; box-shadow: 2px 4px 6px rgba(0,0,0,.4); font: italic 14px/1.3 var(--f-body); color: #3a2a00; white-space: pre-wrap; }
.fios-lista { display: grid; gap: 6px; border-top: 2px dashed var(--tabua-2); padding-top: 10px; }
.fios-lista .linha { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 10px; background: #120b06; border-left: 4px solid #c0161d; border-radius: 4px; font-size: 14px; }
.npc-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
.npc-card { display: flex; gap: 10px; align-items: flex-start; padding: 10px; border: 2px solid #000; border-radius: 10px; background: var(--madeira-2); border-left: 5px solid var(--teal); }
.npc-card.susp { border-left-color: var(--vermelho); } .npc-tx { display: grid; gap: 4px; min-width: 0; justify-items: start; } .npc-tx p { margin: 0; font-size: 13.5px; overflow-wrap: anywhere; }

.quadro-wrap .fundo-modal, .quadro-wrap .toast { position: fixed; }
.pista.arquivo { background: #e9dfc4; font-family: Georgia, serif; font-style: italic; border-left: 5px solid #6b4b2a; }
.pista.arquivo img { width: 100%; border-radius: 3px; margin-bottom: 6px; filter: sepia(.35) contrast(1.05); }
.pista.arquivo b { display: block; font-style: normal; margin-bottom: 4px; }
.pista.arquivo.audio { background: #1d1612; color: #f3e6d0; border-left-color: #ff3341; font-style: normal; font-family: inherit; }
.pista.arquivo.audio audio { width: 100%; margin: 4px 0; }
.apagar-rol { background: none; border: 0; cursor: pointer; font-size: 13px; opacity: .45; padding: 0 6px 0 0; } .apagar-rol:hover { opacity: 1; }

`.replace(/border: 2px solid #000/g, 'border: 1px solid var(--linha-2)').replace(/border: 3px solid #000/g, 'border: 1px solid var(--linha-2)').replace(/box-shadow: (2|3|4)px (2|3|4)px 0 #000;?/g, '').replace(/background: #120b06/g, 'background: var(--painel-2)');
document.head.appendChild(st); })();
