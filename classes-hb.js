/* =================================================================
   CLASSES HOMEBREW E MARCAS (CHAKRAS)
   - Classe criada no Homebrew é só de quem criou. Pode mostrar ao mestre
     de uma campanha; os outros jogadores nunca veem.
   - A ficha guarda uma cópia da classe (classeHb), então o mestre calcula
     a ficha no Escudo mesmo sem acesso ao homebrew.
   - Classe com "chakras": a ficha ganha a aba Marcas. Cada Marca é uma
     ficha de entidade capturada que o agente veste como Vetor.
   ================================================================= */
const HB_CLS = {};  // classes que eu posso escolher (minhas ou mostradas a mim)
const HB_SNAP = {}; // cópias que vieram dentro das fichas abertas
let HB_CLS_OUVINDO = false;
function iniciarClassesHb() {
  if (HB_CLS_OUVINDO || typeof db === 'undefined' || !db || typeof ME === 'undefined' || !ME) return; HB_CLS_OUVINDO = true;
  const pegar = (s, chave) => { for (const k in HB_CLS) if (HB_CLS[k].__via === chave) delete HB_CLS[k];
    s.docs.forEach(d => { const x = d.data(); if (x.tipo === 'classe') HB_CLS[x.nome] = { ...x, hbId: d.id, __via: chave }; }); };
  try { db.collection('homebrew').where('autor', '==', ME).onSnapshot(s => pegar(s, 'meu')); } catch (e) {}
  try { db.collection('homebrew').where('ver_' + ME, '==', true).onSnapshot(s => pegar(s, 'visto')); } catch (e) {}
  // revelada a todos pelo autor: qualquer um pode usar
  try { db.collection('homebrew').where('compartilhado', '==', true).onSnapshot(s => { for (const k in HB_CLS) if (HB_CLS[k].__via === 'todos') delete HB_CLS[k];
    s.docs.forEach(d => { const x = d.data(); if (x.tipo === 'classe' && !HB_CLS[x.nome]) HB_CLS[x.nome] = { ...x, hbId: d.id, __via: 'todos' }; }); }); } catch (e) {}
}
const limparClasse = c => { if (!c) return null; const { __via, autor, compartilhado, criado, tipo, ...r } = c; return JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('ver_'))))); };
const snapshotHb = nome => HB_CLS[nome] ? limparClasse(HB_CLS[nome]) : null;
const classeHbDe = n => HB_CLS[n] || HB_SNAP[n] || null;
const minhasClassesHb = () => Object.values(HB_CLS);
function registrarClasseFicha(f) { if (f?.classeHb?.nome) HB_SNAP[f.classeHb.nome] = f.classeHb; }

/* ---------- Marcas na ficha ---------- */
// Marca vinda da classe acompanha a classe (números, habilidades) até alguém editar ela na mão
const marcaEf = (F, c) => { if (!c || c.proprio) return c; const T = (classe(F?.classe)?.chakras || []).find(t => t && t.nome === (c.tpl || c.nome)); return T ? { ...JSON.parse(JSON.stringify(T)), id: c.id, foto: c.foto || T.foto || '', manifesta: c.manifesta, tpl: T.nome } : c; };
const marcasDe = F => (F?.chakras || []).map(c => marcaEf(F, c));
// quantas Marcas cabem vestidas juntas: 1 fora do Ashura; no Ashura, o que a subclasse diz (campo ou o texto "veste até N Marcas")
const limiteVestir = F => { if (!F?.ashura) return 1; const S = subAtual(F) || {}; return Math.max(1, +(S.ashuraMarcas || (S.habilidades || []).map(h => /veste até (\d+)\s+Marcas/i.exec(h.texto || '')).find(Boolean)?.[1] || 1)); };
const marcasVestidas = F => { const p = typeof chakraVest === 'function' ? chakraVest(F) : null; if (!p) return []; if (!F.ashura) return [p];
  const L = marcasDe(F); return [p, ...(F.chakrasJuntas || []).map(id => L.find(c => c.id === id)).filter(c => c && c.id !== p.id).slice(0, limiteVestir(F) - 1)]; };
const temMarcas = f => !!(classe(f?.classe)?.chakras || (f?.chakras || []).length);
const subAtual = f => classe(f?.classe)?.subclasses?.find(s => s.nome === f?.subclasse) || null;
const NOMES_ATR = { forca: 'FOR', destreza: 'DES', constituicao: 'CON', inteligencia: 'INT', presenca: 'PRE' };
const resumoMarca = c => [c.pv && `+${c.pv} PV`, c.ps && `+${c.ps} PS`, c.pst && `+${c.pst} PST`, c.rd && `RD +${c.rd}`,
  ...Object.entries(c.atributos || {}).filter(([, v]) => +v).map(([k, v]) => `${NOMES_ATR[k] || k} +${v}`),
  ...Object.entries(c.pericias || {}).filter(([, v]) => +v).map(([k, v]) => `${k} +${v}`)].filter(Boolean);
const fotoMarca = (c, cls = 'mk-ft') => `<span class="${cls}" style="--mc:${esc(c.cor || '#b4333b')};${c.foto ? `background-image:url('${esc(c.foto)}')` : ''}">${c.foto ? '' : esc((c.nome || '?').trim()[0] || '?')}</span>`;

/* a roda atrás do retrato: aparece quando o Ashura está ativo */
function rodaMarcas(F) {
  const VS = new Set(marcasVestidas(F).map(c => c.id)), L = marcasDe(F).filter(c => !VS.has(c.id)).slice(0, 12); if (!F?.ashura || !L.length) return '';
  return `<div class="roda-ashura" aria-label="Roda de Marcas ativa" style="--n:${L.length}">${L.map((c, i) => `<span class="roda-m" style="--i:${i};--mc:${esc(c.cor || '#c8a35a')}" title="${esc(c.nome)}">${c.foto ? `<i style="background-image:url('${esc(c.foto)}')"></i>` : `<i>${esc((c.nome || '?')[0])}</i>`}</span>`).join('')}</div>`;
}

function marcasHTML(F, podeEditar) {
  const L = marcasDe(F), S = subAtual(F), C = classe(F.classe), vest = F.chakraVestido, VS = marcasVestidas(F), juntas = new Set(VS.slice(1).map(c => c.id)), lim = limiteVestir(F);
  const cap = S?.marcasMax ? Math.max(1, +(atrEf(F)[S.marcasAtr || 'presenca'] || 0)) : 0;
  const regra = S?.regraMarcas || C?.regraMarcas || '';
  return `<div class="marcas"><div class="cab-pagina"><div><h2 style="margin:0">Marcas</h2><p class="dim" style="margin:4px 0 0; max-width:72ch">${regra ? esc(regra) : 'Entidades presas à sua Roda. Vestir uma Marca é vestir a intenção dela: nome, rosto, bônus e habilidades mudam enquanto durar.'}</p></div>
      ${podeEditar ? `<div class="acoes-topo"><button class="btn ${F.ashura ? 'perigo' : 'sec'}" id="mk-ashura" aria-pressed="${!!F.ashura}">${IC('brilho')} ${F.ashura ? 'Encerrar Ashura' : 'Ashura: abrir a Roda'}</button></div>` : ''}</div>
    <span class="rotulo">${L.length}${cap ? '/' + cap : ''} Marcas${VS.length ? ` · vestindo ${esc(VS.map(c => c.nome).join(' + '))}` : ''}${F.ashura ? ` · Roda aberta, até ${lim} vestida${lim > 1 ? 's' : ''} (${VS.length}/${lim})` : ' · uma vestida por vez'}</span>
    <div class="grade-mk">${L.map((c, i) => `<article class="mk-card ${c.id === vest || juntas.has(c.id) ? 'vestida' : ''}" style="--mc:${esc(c.cor || '#b4333b')}">
        ${fotoMarca(c)}<div class="mk-tx"><b>${esc(c.nome)}</b>${c.titulo ? `<span class="mk-tit">${esc(c.titulo)}</span>` : ''}
          <div class="mk-tags">${resumoMarca(c).map(t => `<span class="tag">${esc(t)}</span>`).join('')}${c.id === vest ? '<span class="tag crit">Vestida</span>' : juntas.has(c.id) ? '<span class="tag crit">Vestida junto</span>' : ''}${c.manifesta ? '<span class="tag">Manifestada</span>' : ''}</div>
          <div class="btns"><button class="btn mini sec" data-mk-ver="${i}">${IC('ver')} Ficha</button>${podeEditar ? `<button class="btn mini ${c.id === vest ? 'sec' : ''}" data-mk-vest="${i}">${c.id === vest ? 'Tirar' : vest ? 'Trocar por esta' : 'Vestir a intenção'}</button>${vest && c.id !== vest && lim > 1 ? (juntas.has(c.id) ? `<button class="btn mini sec" data-mk-junto="${i}">Tirar do Ashura</button>` : `<button class="btn mini" data-mk-junto="${i}" ${VS.length >= lim ? 'disabled title="Já está no limite do Ashura"' : ''}>Vestir junto (${VS.length}/${lim})</button>`) : ''}<button class="btn mini sec" data-mk-man="${i}" title="Fora de combate: a entidade aparece como pessoa ou criatura">${c.manifesta ? 'Recolher' : 'Manifestar'}</button><button class="btn mini sec" data-mk-ed="${i}" aria-label="Editar ${esc(c.nome)}">${IC('editar')}</button><button class="btn-x" data-mk-rm="${i}" aria-label="Soltar ${esc(c.nome)}">${IC('apagar')}</button>` : ''}</div></div></article>`).join('') || '<div class="vazio">Nenhuma Marca na Roda.</div>'}</div>
    ${podeEditar ? `<div class="btns"><button class="btn" id="mk-cap">${IC('caveira')} Selar ameaça</button>${(C?.chakras || []).length ? `<button class="btn sec" id="mk-cls">Marcas da classe (${C.chakras.length})</button>` : ''}<button class="btn sec" id="mk-novo">+ Marca em branco</button></div>` : ''}</div>`;
}

function verMarca(c) {
  abrirModal(c.nome, `<div class="mk-ficha" style="--mc:${esc(c.cor || '#b4333b')}">${fotoMarca(c, 'mk-ft g')}<div>${c.titulo ? `<span class="rotulo">${esc(c.titulo)}</span>` : ''}${c.descricao ? `<p style="font-style:italic; margin:4px 0">${nl(c.descricao)}</p>` : ''}
      <div class="mk-tags">${resumoMarca(c).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></div></div>
    ${(c.habilidades || []).map(h => `<article class="hab hab-vetor" style="--cv:${esc(c.cor || '#b4333b')}"><span class="nm">${esc(h.nome)}</span><p>${nl(h.texto)}</p></article>`).join('')}
    ${(c.ataques || []).length ? `<div class="caixa"><span class="rotulo">Ataques (aparecem na aba Combate enquanto vestida)</span>${c.ataques.map(a => `<div><b>${esc(a.nome)}</b> <span class="mono">${esc(a.dano)} ×${esc(a.mult || 2)}${+a.margem && +a.margem < 20 ? ` · ${a.margem}/20` : ''}</span> <span class="faint">${esc(a.pericia || 'Lutar')}${a.tipoDano ? ' · ' + esc(a.tipoDano) : ''}</span>${a.obs ? `<div class="faint" style="font-size:13px">${esc(a.obs)}</div>` : ''}</div>`).join('')}</div>` : ''}
    ${c.fora ? `<div class="caixa"><span class="rotulo">Fora de combate</span><p style="margin:0">${nl(c.fora)}</p></div>` : ''}`, () => {});
}

const txtHabs = hs => (hs || []).map(h => `${h.nome}\n${h.texto}`).join('\n\n');
const lerHabs = t => String(t || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => { const [n, ...r] = b.split('\n'); return { nome: n.trim(), texto: r.join('\n').trim() }; });
const txtAtq = as => (as || []).map(a => [a.nome, a.dano, '×' + (a.mult || 2), a.margem || 20, a.pericia || 'Lutar', a.tipoDano || '', a.obs || ''].join(' | ')).join('\n');
const lerAtq = t => String(t || '').split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p[0] && p[1]).map(([nome, dano, mult, margem, pericia, tipoDano, obs]) => ({ nome, dano, mult: +String(mult || '2').replace(/[^\d.]/g, '') || 2, margem: +margem || 20, pericia: pericia || 'Lutar', tipoDano: tipoDano || '', obs: obs || '' }));
const txtMap = o => Object.entries(o || {}).filter(([, v]) => +v).map(([k, v]) => `${k} +${v}`).join(', ');
const lerMap = (t, chaves) => { const o = {}; String(t || '').split(',').map(x => x.trim()).filter(Boolean).forEach(x => { const m = x.match(/^(.+?)\s*([+-]?\d+)$/); if (!m) return; let k = m[1].trim(); if (chaves) { const kk = Object.entries(chaves).find(([a, b]) => normBusca(a) === normBusca(k) || normBusca(b) === normBusca(k)); if (kk) k = kk[0]; else return; } o[k] = +m[2]; }); return o; };

function formMarca(c0, aoSalvar) {
  const c = { cor: '#b4333b', ...c0 };
  abrirModal(c0.id ? 'Editar Marca' : 'Nova Marca', `<div class="grade-campos"><div class="campo"><label class="rotulo" for="mk-n">Nome</label><input type="text" id="mk-n" maxlength="60" value="${esc(c.nome || '')}"></div>
      <div class="campo"><label class="rotulo" for="mk-t">Título</label><input type="text" id="mk-t" maxlength="80" value="${esc(c.titulo || '')}"></div>
      <div class="campo"><label class="rotulo" for="mk-c">Cor</label><input type="color" id="mk-c" value="${esc(c.cor)}"></div>
      <div class="campo"><label class="rotulo" for="mk-f">Retrato</label><input type="file" id="mk-f" accept="image/*"></div></div>
    <div class="campo"><label class="rotulo" for="mk-d">Descrição</label><textarea id="mk-d" rows="2">${esc(c.descricao || '')}</textarea></div>
    <div class="grade-campos">${['pv', 'ps', 'pst', 'rd'].map(k => `<div class="campo"><label class="rotulo" for="mk-${k}">${k.toUpperCase()} extra</label><input type="number" id="mk-${k}" value="${+c[k] || ''}" placeholder="0"></div>`).join('')}</div>
    <div class="campo"><label class="rotulo" for="mk-a">Atributos extras</label><input type="text" id="mk-a" value="${esc(txtMap(Object.fromEntries(Object.entries(c.atributos || {}).map(([k, v]) => [NOMES_ATR[k] || k, v]))))}" placeholder="FOR +1, PRE +1"></div>
    <div class="campo"><label class="rotulo" for="mk-p">Perícias extras (dados)</label><input type="text" id="mk-p" value="${esc(txtMap(c.pericias))}" placeholder="Lutar +2, Bruxaria +1"></div>
    <div class="campo"><label class="rotulo" for="mk-h">Habilidades: nome na primeira linha, texto embaixo, linha em branco entre elas</label><textarea id="mk-h" rows="9">${esc(txtHabs(c.habilidades))}</textarea></div>
    <div class="campo"><label class="rotulo" for="mk-q">Ataques, um por linha: nome | dano | ×mult | margem | perícia | tipo | efeito</label><textarea id="mk-q" rows="3" class="json-ed">${esc(txtAtq(c.ataques))}</textarea></div>
    <div class="campo"><label class="rotulo" for="mk-o">Fora de combate (como aparece)</label><textarea id="mk-o" rows="2">${esc(c.fora || '')}</textarea></div>
    <button class="btn" id="mk-ok">Salvar Marca</button>`, (m, fechar) => {
    m.querySelector('#mk-ok').onclick = async () => {
      const b = m.querySelector('#mk-ok'), nome = m.querySelector('#mk-n').value.trim(); if (!nome) return toast('Dê um nome.');
      b.disabled = true; let foto = c.foto || ''; const arq = m.querySelector('#mk-f').files[0]; if (arq) { b.textContent = 'Enviando…'; foto = (await enviarImagem(arq, 'circulo')) || foto; }
      const atr = lerMap(m.querySelector('#mk-a').value, { forca: 'FOR', destreza: 'DES', constituicao: 'CON', inteligencia: 'INT', presenca: 'PRE' });
      const per = lerMap(m.querySelector('#mk-p').value, Object.fromEntries(SIS.pericias.map(p => [p.nome, p.nome])));
      const num = k => +m.querySelector('#mk-' + k).value || 0;
      fechar(); aoSalvar({ ...c, id: c.id || uid8(), nome, titulo: m.querySelector('#mk-t').value.trim(), cor: m.querySelector('#mk-c').value, foto, descricao: m.querySelector('#mk-d').value.trim(),
        pv: num('pv'), ps: num('ps'), pst: num('pst'), rd: num('rd'), atributos: atr, pericias: per, habilidades: lerHabs(m.querySelector('#mk-h').value), ataques: lerAtq(m.querySelector('#mk-q').value), fora: m.querySelector('#mk-o').value.trim() });
    };
  });
}

/* muda o que está vestido e ajusta os vitais pelo novo máximo */
async function mudarVestes(F, patch, { salvar, render }, cor, sair) {
  const antes = { ...F }, depois = { ...F, ...patch }, a0 = calc(antes).max, a1 = calc(depois).max, atual = { ...(antes.atual || a0) };
  for (const k of ['pv', 'ps', 'pst']) atual[k] = Math.max(1, Math.min(a1[k], (atual[k] ?? a0[k]) + (a1[k] - a0[k])));
  if (cor) { const fx = document.createElement('div'); fx.className = 'fx-vetor' + (sair ? ' sair' : ''); fx.style.setProperty('--cv', cor); document.body.appendChild(fx); setTimeout(() => fx.remove(), 1100); }
  Object.assign(F, patch, { atual }); setTimeout(render, cor ? 380 : 0);
  await salvar({ ...patch, atual });
}
/* veste (ou tira, com id vazio) a Marca principal. Fora do Ashura só cabe uma: vestir outra troca */
function vestirMarca(F, id, ops) {
  const c = (F.chakras || []).find(x => x.id === (id || F.chakraVestido));
  return mudarVestes(F, { chakraVestido: id || '', vetorVestido: id ? false : F.vetorVestido, chakrasJuntas: id ? (F.chakrasJuntas || []).filter(x => x !== id) : [] }, ops, c?.cor || '#b4333b', !id);
}
/* no Ashura: veste outra Marca junto da principal, até o limite da subclasse */
function vestirJunto(F, id, ops) {
  const J = (F.chakrasJuntas || []).filter(x => x !== F.chakraVestido), tem = J.includes(id), lim = limiteVestir(F);
  if (!tem && 1 + J.length >= lim) return toast(`No Ashura você veste no máximo ${lim} Marca${lim > 1 ? 's' : ''} ao mesmo tempo.`);
  const c = (F.chakras || []).find(x => x.id === id);
  return mudarVestes(F, { chakrasJuntas: tem ? J.filter(x => x !== id) : [...J, id] }, ops, c?.cor || '#b4333b', tem);
}
/* liga os botões da aba Marcas */
function ligarMarcas(F, { salvar, render }) {
  const L = () => [...(F.chakras || [])];
  const gravar = async (lista, extra = {}) => { F.chakras = lista; Object.assign(F, extra); render(); await salvar({ chakras: lista, ...extra }); };
  const vestir = id => vestirMarca(F, id, { salvar, render });
  $('#mk-ashura')?.addEventListener('click', async () => { const on = !F.ashura; await mudarVestes(F, { ashura: on, chakrasJuntas: on ? F.chakrasJuntas || [] : [] }, { salvar, render }); toast(on ? `A Roda se abriu atrás de você: até ${limiteVestir(F)} Marcas vestidas.` : 'A Roda se fechou: fica só a Marca principal.'); });
  $$('[data-mk-junto]').forEach(b => b.onclick = () => vestirJunto(F, marcasDe(F)[+b.dataset.mkJunto].id, { salvar, render }));
  $$('[data-mk-ver]').forEach(b => b.onclick = () => verMarca(marcasDe(F)[+b.dataset.mkVer]));
  $$('[data-mk-vest]').forEach(b => b.onclick = () => { const c = L()[+b.dataset.mkVest]; vestir(c.id === F.chakraVestido ? '' : c.id); });
  $$('[data-mk-man]').forEach(b => b.onclick = () => { const l = L(), i = +b.dataset.mkMan; l[i] = { ...l[i], manifesta: !l[i].manifesta }; gravar(l); });
  $$('[data-mk-ed]').forEach(b => b.onclick = () => { const i = +b.dataset.mkEd; formMarca(marcasDe(F)[i], c => { const l = L(); l[i] = { ...c, proprio: true }; gravar(l); }); });
  $$('[data-mk-rm]').forEach(b => b.onclick = async () => { const i = +b.dataset.mkRm, c = L()[i]; if (!await confirmar(`Soltar ${esc(c.nome)} da Roda?`, { titulo: 'Soltar Marca', ok: 'Soltar' })) return;
    if (c.id === F.chakraVestido) await vestir(''); gravar(L().filter((_, j) => j !== i)); });
  $('#mk-novo')?.addEventListener('click', () => formMarca({}, c => gravar([...L(), c])));
  $('#mk-cls')?.addEventListener('click', () => { const T = classe(F.classe)?.chakras || [], tem = new Set(L().map(c => c.nome));
    seletor('Marcas da classe', T, c => `${fotoMarca(c, 'mk-ft p')} <b>${esc(c.nome)}</b>${tem.has(c.nome) ? ' <span class="tag">Já na Roda</span>' : ''}${c.titulo ? ` <span class="faint">${esc(c.titulo)}</span>` : ''}`, c => { gravar([...L(), { ...JSON.parse(JSON.stringify(c)), id: uid8(), tpl: c.nome }]); toast(`${c.nome} entrou na Roda.`); }); });
  $('#mk-cap')?.addEventListener('click', async () => { const hb = (await homebrewVisivel('ameaca')).map(x => ({ ...x, id: 'hb' + x.id }));
    seletor('Selar ameaça na Roda', [...CRI.filter(a => !a.npc), ...hb], a => `<b>${esc(a.nome)}</b> ${elTag(a.elemento)} <span class="tag">Nv ${esc(a.nivel)}</span>`, a => {
      const fc = a.ficha || {}, habs = [...(fc.poderes || []), ...(fc.acoes || [])].slice(0, 6).map(p => ({ nome: p.nome || 'Poder', texto: p.texto || p.descricao || p.efeito || '' })).filter(h => h.texto);
      const cor = { Fome: '#c0392b', Morte: '#6f6f7a', Guerra: '#b8860b', Peste: '#6a8f3a', Caos: '#7b4dff' }[a.elemento] || '#b4333b';
      formMarca({ nome: a.nome, titulo: `Selada · ${a.elemento || 'Ameaça'} · Nv ${a.nivel ?? '?'}`, cor, foto: a.imagem || '', ref: String(a.id), descricao: a.descricao || '', habilidades: habs }, c => { gravar([...L(), c]); toast(`${c.nome} foi selada na Roda.`); });
    }); });
}

/* ---------- Homebrew: classe ---------- */
function cardClasseHb(x) {
  const meu = x.autor === ME, vistos = Object.keys(x).filter(k => k.startsWith('ver_') && x[k]).length, recebida = !meu && x['ver_' + ME];
  const status = x.compartilhado ? '<span class="tag crit">Revelada a todos</span>' : meu ? (vistos ? `<span class="tag">Mostrada a ${vistos} mestre${vistos > 1 ? 's' : ''}</span>` : '<span class="tag">Só você</span>') : recebida ? '<span class="tag tag-oculta">Mostrada só a você</span>' : '';
  return `<div class="item hb-classe"><div class="cab"><span class="nm">${esc(x.nome)}</span><span class="btns">${status}
      ${meu ? `<button class="btn mini ouro" data-cls-mestre="${esc(x.id)}">${IC('ver')} Mostrar ao mestre</button><button class="btn mini ${x.compartilhado ? 'sec' : ''}" data-cls-todos="${esc(x.id)}">${x.compartilhado ? `${IC('esconder')} Esconder de novo` : `${IC('ver')} Revelar a todos`}</button><button class="btn mini sec" data-cls-ed="${esc(x.id)}">${IC('editar')} Editar</button><button class="btn-x" data-del="${esc(x.id)}" aria-label="Apagar">×</button>` : ''}
      ${recebida && !x.compartilhado ? `<button class="btn mini ouro" data-cls-mesa="${esc(x.id)}">${IC('ver')} Revelar à mesa</button>` : ''}</span></div>
    ${recebida && !x.compartilhado ? '<p class="faint" style="font-size:13px; margin:4px 0">Só você e o jogador veem e usam esta classe. Os outros jogadores só passam a ver se ela for revelada.</p>' : ''}
    <div class="mk-tags"><span class="tag">PV ${esc(x.pv)} · PST ${esc(x.pst)} · PS ${esc(x.ps)}</span><span class="tag">${esc(x.pericias)} perícias</span>${x.bruxaria ? '<span class="tag">Feitiços e maldições</span>' : ''}${x.chakras ? `<span class="tag">${(x.chakras || []).length} Marcas</span>` : ''}</div>
    ${x.descricao ? `<p class="dim" style="font-size:13.5px">${nl(x.descricao)}</p>` : ''}
    ${(x.subclasses || []).map(s => `<details class="hb-sub"><summary><b>${esc(s.nome)}</b>${s.descricao ? ` <span class="faint">${esc(s.descricao.slice(0, 90))}${s.descricao.length > 90 ? '…' : ''}</span>` : ''}</summary>${(s.habilidades || []).map(h => `<div class="hb-hab"><span class="tag">Nv ${esc(h.nivel)}</span> <b>${esc(h.nome)}</b><p>${nl(h.texto)}</p></div>`).join('')}</details>`).join('')}</div>`;
}
/* o autor revela a classe para todo mundo (ou esconde de novo) */
async function revelarClasseTodos(x) {
  const v = !x.compartilhado;
  if (v && !await confirmar(`Revelar <b>${esc(x.nome)}</b> a todos? Qualquer jogador vai poder ver e usar a classe.`, { titulo: 'Revelar a todos', ok: 'Revelar' })) return;
  try { await db.doc('homebrew/' + x.id).update({ compartilhado: v }); x.compartilhado = v; toast(v ? 'Classe revelada a todos.' : 'Classe escondida de novo: só você e os mestres que você escolheu.'); } catch (e) { toast('Não deu: ' + (e.message || e.code)); }
}
/* o mestre que recebeu a classe revela para os jogadores das campanhas dele (entra no homebrew da campanha) */
async function revelarClasseMesa(x) {
  let camps = []; try { camps = (await db.collection('campanhas').where('mestre', '==', ME).get()).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) {}
  if (!camps.length) return toast('Você não mestra nenhuma campanha.');
  const regras = {}; for (const c of camps) { try { const s = await db.doc(`campanhas/${c.id}/publico/regras`).get(); regras[c.id] = s.exists ? s.data() : {}; } catch (e) { regras[c.id] = {}; } }
  const tem = c => (regras[c]?.ativo?.classes || []).some(k => k.hbId === x.id || k.nome === x.nome);
  abrirModal('Revelar à mesa', `<p class="dim" style="margin:0">Os jogadores das campanhas marcadas passam a ver e usar <b>${esc(x.nome)}</b>. Desmarcar esconde de novo.</p>
    <div class="lista">${camps.map(c => `<label class="chk"><input type="checkbox" data-rm-c="${esc(c.id)}" ${tem(c.id) ? 'checked' : ''}> ${esc(c.nome)}</label>`).join('')}</div><button class="btn" id="rm-ok">Salvar</button>`, (m, fechar) => {
    m.querySelector('#rm-ok').onclick = async () => { const copia = { ...limparClasse(x), hbId: x.id };
      for (const i of m.querySelectorAll('[data-rm-c]')) { const c = i.dataset.rmC, d = regras[c] || {}, quer = i.checked; if (quer === tem(c)) continue;
        const mexer = R => { const L = (R?.classes || []).filter(k => k.hbId !== x.id && k.nome !== x.nome); return { ...(R || {}), classes: quer ? [...L, copia] : L }; };
        const novo = { ...d, ativo: mexer(d.ativo || { classes: [], subExtras: [], mecanicas: [] }) }; if (d.rascunho) novo.rascunho = mexer(d.rascunho);
        try { await db.doc(`campanhas/${c}/publico/regras`).set(novo); } catch (e) { return toast('Não salvou: ' + (e.message || e.code)); } }
      fechar(); toast('Pronto.'); };
  });
}
function editarClasseHb(x, gravar) {
  const base = x.id ? x : { tipo: 'classe', nome: '', descricao: '', pv: 12, pst: 9, ps: 9, pericias: 3, bruxaria: false, chakras: null, subclasses: [{ nome: 'Primeira subclasse', descricao: '', habilidades: [1, 3, 5, 7, 10].map(n => ({ nivel: n, nome: '', texto: '' })) }] };
  const { id, autor, compartilhado, criado, tipo, hbId, ...resto } = base, obj = Object.fromEntries(Object.entries(resto).filter(([k]) => !k.startsWith('ver_') && !k.startsWith('__')));
  abrirModal(x.id ? `Classe: ${x.nome}` : 'Nova classe', `<p class="aviso-base">${IC('aviso')} Classe homebrew é só sua. Fichas que usam ficam com uma cópia e o mestre vê a ficha calculada mesmo assim.</p>
    <div class="ed-base">${editorObjeto(obj, obj)}</div><button class="btn" id="cl-ok">Salvar classe</button>`, (m, fechar) => {
    m.querySelector('#cl-ok').onclick = async () => { let v; try { v = lerEditor(m, obj); } catch (e) { return toast(e.message); } v.nome = String(v.nome || '').trim(); if (!v.nome) return toast('Dê um nome.');
      if (SIS.classes.some(c => c.nome === v.nome)) return toast('Já existe uma classe do livro com esse nome.'); fechar(); await gravar(base, v); };
  });
}
async function mostrarAoMestre(x) {
  let camps = [];
  try { const s = await db.doc(`data/users/${ME}/participacoes`).get(); const ids = s.exists ? s.data().campanhas || [] : [];
    camps = (await Promise.all(ids.map(async c => { try { const d = await db.doc('campanhas/' + c).get(); return d.exists ? { id: c, ...d.data() } : null; } catch (e) { return null; } }))).filter(c => c && c.mestre && c.mestre !== ME); } catch (e) {}
  if (!camps.length) return toast('Você não joga em nenhuma campanha de outro mestre.');
  abrirModal('Mostrar ao mestre', `<p class="dim" style="margin:0">O mestre vê <b>${esc(x.nome)}</b> no Homebrew dele, sem poder mexer. Os outros jogadores não veem.</p>
    <div class="lista">${camps.map(c => `<label class="chk"><input type="checkbox" data-cm="${esc(c.mestre)}" ${x['ver_' + c.mestre] ? 'checked' : ''}> ${esc(c.nome)}</label>`).join('')}</div><button class="btn" id="cm-ok">Salvar</button>`, (m, fechar) => {
    m.querySelector('#cm-ok').onclick = async () => { const up = {}; m.querySelectorAll('[data-cm]').forEach(i => { up['ver_' + i.dataset.cm] = i.checked; });
      try { await db.doc('homebrew/' + x.id).update(up); fechar(); toast('Pronto.'); } catch (e) { toast('Não salvou: ' + (e.message || e.code)); } };
  });
}
/* importar um arquivo .json com classes, habilidades, itens etc. */
function importarHomebrew() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => { const f = i.files[0]; if (!f) return; let L; try { L = JSON.parse(await f.text()); } catch (e) { return toast('Arquivo inválido.'); }
    L = Array.isArray(L) ? L : L.docs || [L]; const ok = L.filter(x => x && x.tipo && x.nome);
    if (!ok.length) return toast('Nada para importar.');
    if (!await confirmar(`Importar ${ok.length} criação${ok.length > 1 ? 'ões' : ''} para o seu Homebrew? ${ok.map(x => esc(x.nome)).join(', ')}. O que já existir com o mesmo nome é atualizado.`, { titulo: 'Importar', ok: 'Importar' })) return;
    let meus = []; try { meus = (await db.collection('homebrew').where('autor', '==', ME).get()).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) {}
    let n = 0, a = 0; for (const x of ok) { const { id, autor, compartilhado, canonico, ...r } = x, ja = meus.find(d => d.tipo === x.tipo && d.nome === x.nome);
      try { if (ja) { await db.doc('homebrew/' + ja.id).update({ ...r, editado: Date.now() }); a++; } else { await db.collection('homebrew').add({ ...r, autor: ME, compartilhado: false, criado: Date.now() }); n++; } } catch (e) { toast(`${x.nome}: ${e.message || e.code}`); } }
    toast([n ? `${n} novo${n > 1 ? 's' : ''}` : '', a ? `${a} atualizado${a > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ') + '.'); };
  i.click();
}
