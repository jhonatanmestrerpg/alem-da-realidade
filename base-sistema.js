/* =================================================================
   BASE DO SISTEMA EDITÁVEL (administradores)
   - O livro (dados/*.json) continua sendo a origem. Por cima dele vêm
     "remendos" guardados no banco e aplicados para o site inteiro:
       sistema/base        → coisas comuns (itens, melhorias, rituais...)
       sistema/fundamental → fundamentos (classes, perícias, patentes...)
   - Fundamentos começam travados para administradores: pedem liberação
     ao dono do site, que libera por 24 horas (sistema-liberacoes/<uid>).
   - Editar um item dentro da ficha continua sendo só daquela ficha.
   ================================================================= */
const BASE_AREAS = [
  // chave, nome, onde mora, fundamental?, grupo
  ['itens', 'Itens e armas', 'sis', false, 'Equipamento'],
  ['melhorias', 'Melhorias', 'sis', false, 'Equipamento'],
  ['bencaos', 'Bênçãos', 'sis', false, 'Equipamento'],
  ['alquimia', 'Alquimia', 'sis', false, 'Equipamento'],
  ['maldicoes', 'Maldições', 'sis', false, 'Regras'],
  ['condicoes', 'Condições', 'sis', false, 'Regras'],
  ['passivas', 'Passivas', 'sis', false, 'Regras'],
  ['rituais', 'Rituais', 'rit', false, 'Oculto'],
  ['feiticos', 'Feitiços', 'feit', false, 'Oculto'],
  ['classes', 'Classes e subclasses', 'sis', true, 'Fundamentos'],
  ['pericias', 'Perícias', 'sis', true, 'Fundamentos'],
  ['alinhamentos', 'Alinhamentos', 'sis', true, 'Fundamentos'],
  ['vontades', 'Vontades', 'sis', true, 'Fundamentos'],
  ['patentes', 'Patentes', 'sis', true, 'Fundamentos'],
  ['carga', 'Carga', 'sis', true, 'Fundamentos'],
];
const AREA = k => BASE_AREAS.find(a => a[0] === k);
const ehFund = k => !!AREA(k)?.[3];
const DOC_DE = k => 'sistema/' + (ehFund(k) ? 'fundamental' : 'base');
const H24 = 24 * 60 * 60 * 1000;

// remendos em memória: { base: {cols:{...}}, fundamental: {cols:{...}} }
let BASE_PATCH = { base: { cols: {} }, fundamental: { cols: {} } };
let BASE_LIB = null; // { ate, por } da minha liberação

const ehDonoSite = () => { const e = (typeof SESSAO !== 'undefined' && SESSAO?.user?.email || '').toLowerCase(); return !!e && e === String(window.ADR_CONFIG?.dono || '').toLowerCase(); };
const liberadoAte = () => (BASE_LIB?.ate || 0);
const fundLiberado = () => ehDonoSite() || liberadoAte() > Date.now();
const restante = ms => { const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`; };

/* aplica os remendos numa lista do livro (chave: nome) */
function remendarLista(lista, patch) {
  if (!patch || !Object.keys(patch).length) return lista;
  const out = [], vistos = new Set();
  for (const x of lista || []) { const p = patch[x.nome]; vistos.add(x.nome); if (p?.__apagar) continue; out.push(p ? { ...p, nome: p.nome || x.nome } : x); }
  for (const [nome, p] of Object.entries(patch)) if (!vistos.has(nome) && !p?.__apagar) out.push({ ...p, nome: p.nome || nome, __novo: true });
  return out;
}
function patchDe(k) { return { ...(BASE_PATCH.base.cols?.[k] || {}), ...(BASE_PATCH.fundamental.cols?.[k] || {}) }; }

/* lê os remendos do banco (chamado no carregarCanon, antes do homebrew canônico) */
async function lerBasePatch() {
  if (typeof db === 'undefined' || !db) return;
  const ler = async p => { try { const s = await db.doc(p).get(); return (s.exists && s.data()) || { cols: {} }; } catch (e) { return { cols: {} }; } };
  const [b, f] = await Promise.all([ler('sistema/base'), ler('sistema/fundamental')]);
  BASE_PATCH = { base: { cols: {}, ...b }, fundamental: { cols: {}, ...f } };
  try { const l = await db.doc('sistema-liberacoes/' + ME).get(); BASE_LIB = l.exists ? l.data() : null; } catch (e) { BASE_LIB = null; }
}
/* devolve SIS/RIT/FEIT do livro já com os remendos */
function aplicarBasePatch(SISorig, RITorig, FEITorig) {
  const S = structuredClone(SISorig);
  for (const [k, , onde] of BASE_AREAS) if (onde === 'sis' && Array.isArray(S[k])) S[k] = remendarLista(S[k], patchDe(k));
  return { S, R: remendarLista(RITorig, patchDe('rituais')), F: remendarLista(FEITorig, patchDe('feiticos')) };
}

/* ---------- itens da ficha ligados ao livro ----------
   Item que veio do livro (e não foi mexido na ficha) acompanha a base: se o admin
   muda a Lança, todas as Lanças "do livro" mudam. Editou na ficha, vira só daquela ficha. */
const ITEM_VELHOS = { 'Lança': [{ dano: '1d6+2', mult: 1 }], 'Lança Pesada': [{ dano: '1d8+2', mult: 2 }] };
const CAMPOS_ITEM = it => Object.keys(it || {}).filter(k => !['nome', 'canon', 'qtd', '__novo', 'mods', 'melhorias', 'bencaos', 'fav'].includes(k));
function vincularItens(F) {
  if (!F || !Array.isArray(F.equipamentos) || typeof SIS === 'undefined' || !SIS?.itens) return F;
  const orig = typeof BASE_ORIG !== 'undefined' ? BASE_ORIG?.itens || [] : [];
  F.equipamentos = F.equipamentos.map(it => {
    if (!it || it.proprio || it.ataque || it.natural) return it;
    const nome = it.base || it.nome, atual = SIS.itens.find(x => x.nome === nome); if (!atual) return it;
    if (!it.base) {
      const o = orig.find(x => x.nome === nome), CMP = ['dano', 'mult', 'margem', 'rd', 'alivio', 'alcance', 'municao'], norm = v => v === false || v == null ? '' : String(v), igual = ref => ref && CMP.every(c => norm(ref[c]) === norm(it[c]));
      const velhos = (ITEM_VELHOS[nome] || []).map(v => ({ ...o, ...v }));
      if (!(igual(o) || igual(atual) || velhos.some(igual))) return it; // mexido à mão no passado: fica pessoal
    }
    const novo = { ...it }; CAMPOS_ITEM(atual).forEach(c => { novo[c] = atual[c]; }); novo.base = nome; return novo;
  });
  return F;
}

/* ---------- liberação dos fundamentos ---------- */
let ESPERA = null;
function pedirLiberacao(area, depois) {
  const nomeArea = AREA(area)?.[1] || 'Fundamentos';
  abrirModal('Fundamento travado', `<p style="margin:0">${IC('travar')} <b>${esc(nomeArea)}</b> é fundamento do sistema. Para mexer, o dono do site precisa liberar sua conta. A liberação vale <b>24 horas</b>.</p>
    <div class="campo"><label class="rotulo" for="lib-mot">O que você quer mudar (o dono vê)</label><textarea id="lib-mot" rows="3" maxlength="300" placeholder="Ex.: ajustar o PV da classe Bruxa"></textarea></div>
    <div class="espera-lib" hidden><span class="giro-roda" aria-hidden="true"></span><span>Pedido enviado. Esta janela fecha sozinha quando o dono liberar.</span></div>
    <div class="btns"><button class="btn" id="lib-ok">${IC('aviso')} Pedir liberação</button></div>`, (m, fechar) => {
    const espera = m.querySelector('.espera-lib'), ok = m.querySelector('#lib-ok');
    const aguardar = () => { espera.hidden = false; ok.disabled = true; ok.textContent = 'Aguardando o dono…';
      ESPERA?.(); const parar = [];
      parar.push(db.doc('sistema-liberacoes/' + ME).onSnapshot(s => { const d = s.exists ? s.data() : null; if (d && d.ate > Date.now()) { BASE_LIB = d; parar.forEach(f => f?.()); ESPERA = null; fechar(); toast(`Liberado por 24 horas. Pode editar.`); depois?.(); desenharBaseSeAberta(); } }));
      parar.push(db.doc('sistema-pedidos/' + ME).onSnapshot(s => { const d = s.exists ? s.data() : null; if (d?.status === 'negado') { espera.innerHTML = `<span>${IC('cadeado')} O dono negou este pedido.</span>`; ok.disabled = false; ok.textContent = 'Pedir de novo'; } }));
      ESPERA = () => parar.forEach(f => f?.()); };
    db.doc('sistema-pedidos/' + ME).get().then(s => { const d = s.exists ? s.data() : null; if (d?.status === 'pendente' && Date.now() - (d.t || 0) < H24) aguardar(); }).catch(() => {});
    ok.onclick = async () => {
      try { await db.doc('sistema-pedidos/' + ME).set({ uid: ME, nome: PERFIL?.nome || 'Administrador', area, nomeArea, motivo: m.querySelector('#lib-mot').value.trim(), t: Date.now(), status: 'pendente' }); aguardar(); }
      catch (e) { toast('Não enviou: ' + (e.message || e.code)); }
    };
  });
}
/* precisa de liberação? se sim, pede; se não, segue */
function comLiberacao(area, fazer) { if (!ehFund(area) || fundLiberado()) return fazer(); pedirLiberacao(area, fazer); }

/* ---------- o dono: aviso insistente de pedido pendente ---------- */
let VIGIA_DONO = null, ADIADO = {}, TITULO0 = document.title;
function vigiarPedidos() {
  if (VIGIA_DONO || !ehDonoSite() || typeof db === 'undefined' || !db) return;
  let pend = [];
  const mostrar = () => {
    pend = pend.filter(p => p.status === 'pendente' && Date.now() - (p.t || 0) < H24 * 3);
    document.title = pend.length ? `(${pend.length}) Pedido de liberação · ${TITULO0}` : TITULO0;
    const badge = document.querySelector('[data-sec="base"]'); if (badge) badge.dataset.pend = pend.length || '';
    const p = pend.find(x => !(ADIADO[x.uid] > Date.now())); if (!p || document.querySelector('#camada .modal')) return;
    try { if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') new Notification('Pedido de liberação', { body: `${p.nome} quer editar ${p.nomeArea}.`, tag: 'adr-lib-' + p.uid }); } catch (e) {}
    try { navigator.vibrate?.([120, 60, 120]); } catch (e) {}
    abrirModal('Pedido de liberação', `<p style="margin:0"><b>${esc(p.nome)}</b> quer editar um fundamento do sistema: <b>${esc(p.nomeArea || p.area)}</b>.</p>
      ${p.motivo ? `<blockquote class="motivo-lib">${esc(p.motivo)}</blockquote>` : ''}
      <p class="faint" style="margin:0">Liberando, a conta dele edita qualquer fundamento por 24 horas. Depois disso, ele pede de novo.</p>
      <div class="btns"><button class="btn ouro" id="lib-sim">${IC('chave')} Liberar 24 horas</button><button class="btn sec perigo" id="lib-nao">Negar</button><button class="btn sec" id="lib-dep">Depois</button></div>`, (m, fechar) => {
      m.querySelector('#lib-sim').onclick = async () => { try { await db.doc('sistema-liberacoes/' + p.uid).set({ uid: p.uid, ate: Date.now() + H24, por: ME, t: Date.now() }); await db.doc('sistema-pedidos/' + p.uid).set({ ...p, status: 'aceito', decidido: Date.now() }); fechar(); toast(`${p.nome} liberado por 24 horas.`); } catch (e) { toast('Não liberou: ' + (e.message || e.code)); } };
      m.querySelector('#lib-nao').onclick = async () => { try { await db.doc('sistema-pedidos/' + p.uid).set({ ...p, status: 'negado', decidido: Date.now() }); fechar(); toast('Pedido negado.'); } catch (e) { toast('Não salvou: ' + (e.message || e.code)); } };
      m.querySelector('#lib-dep').onclick = () => { ADIADO[p.uid] = Date.now() + 2 * 60 * 1000; fechar(); toast('Volto a avisar em 2 minutos.'); };
    });
  };
  VIGIA_DONO = db.collection('sistema-pedidos').where('status', '==', 'pendente').onSnapshot(s => { pend = s.docs.map(d => d.data()); mostrar(); });
  setInterval(mostrar, 30000); // insiste enquanto houver pedido pendente
  if ('Notification' in window && Notification.permission === 'default') document.addEventListener('click', () => { try { Notification.requestPermission(); } catch (e) {} }, { once: true });
}

/* ---------- tela: Base do sistema ---------- */
let BASE_UI = { area: 'itens', busca: '' };
function desenharBaseSeAberta() { if (location.hash === '#base') ROTAS.base?.(); }
function resumoBase(k, x) {
  if (k === 'itens') return [x.categoria, x.dano && `${x.dano}${x.mult ? ' ×' + x.mult : ''}`, x.rd && `RD ${x.rd}`, x.peso != null && `${x.peso} kg`].filter(Boolean).join(' · ');
  if (k === 'classes') return `PV ${x.pv} · PS ${x.ps} · PST ${x.pst} · ${(x.subclasses || []).length} subclasses`;
  if (k === 'rituais' || k === 'feiticos') return [x.elemento || x.divindade, x.circulo && `${x.circulo}º círculo`, x.nivel && `nível ${x.nivel}`, x.custo].filter(Boolean).join(' · ');
  const t = x.texto || x.efeito || x.descricao || x.desc || ''; return String(t).slice(0, 110) + (String(t).length > 110 ? '…' : '');
}
function listaOriginal(k) {
  const o = typeof BASE_SIS !== 'undefined' ? BASE_SIS : SIS;
  if (k === 'rituais') return BASE_ORIG?.RIT || RIT; if (k === 'feiticos') return BASE_ORIG?.FEIT || FEIT; return o[k] || [];
}
async function salvarRemendo(k, nome, valor) {
  const caminho = DOC_DE(k), alvo = ehFund(k) ? 'fundamental' : 'base';
  const atual = structuredClone(BASE_PATCH[alvo] || { cols: {} }); atual.cols ||= {}; atual.cols[k] ||= {};
  if (valor === undefined) delete atual.cols[k][nome]; else atual.cols[k][nome] = valor;
  atual.t = Date.now(); atual.por = ME;
  await db.doc(caminho).set(atual);
  BASE_PATCH[alvo] = atual; await carregarCanon();
}
function editorObjeto(obj, modelo) {
  const chaves = [...new Set([...Object.keys(modelo || {}), ...Object.keys(obj || {})])].filter(c => !c.startsWith('__') && c !== 'canon');
  return chaves.map(c => { const v = obj?.[c] ?? (typeof modelo?.[c] === 'number' ? 0 : typeof modelo?.[c] === 'boolean' ? false : Array.isArray(modelo?.[c]) ? [] : ''), id = 'be-' + c;
    if (typeof v === 'boolean') return `<label class="chk"><input type="checkbox" id="${id}" data-c="${esc(c)}" data-t="b" ${v ? 'checked' : ''}> ${esc(c)}</label>`;
    if (typeof v === 'number') return `<div class="campo"><label class="rotulo" for="${id}">${esc(c)}</label><input type="number" step="any" id="${id}" data-c="${esc(c)}" data-t="n" value="${v}"></div>`;
    if (typeof v === 'object' && v) return `<div class="campo"><label class="rotulo" for="${id}">${esc(c)} <span class="faint">(estrutura: edite com cuidado)</span></label><textarea id="${id}" data-c="${esc(c)}" data-t="j" rows="${Math.min(18, 4 + JSON.stringify(v).length / 90 | 0)}" spellcheck="false" class="json-ed">${esc(JSON.stringify(v, null, 2))}</textarea></div>`;
    const longo = String(v).length > 70 || /texto|efeito|descricao|desc|obs/.test(c);
    return `<div class="campo"><label class="rotulo" for="${id}">${esc(c)}</label>${longo ? `<textarea id="${id}" data-c="${esc(c)}" data-t="s" rows="4">${esc(v)}</textarea>` : `<input type="text" id="${id}" data-c="${esc(c)}" data-t="s" value="${esc(v)}">`}</div>`; }).join('');
}
function lerEditor(m, base) {
  const out = { ...base };
  for (const el of m.querySelectorAll('[data-c]')) { const c = el.dataset.c, t = el.dataset.t;
    if (t === 'b') out[c] = el.checked; else if (t === 'n') out[c] = el.value === '' ? null : Number(el.value);
    else if (t === 'j') { try { out[c] = JSON.parse(el.value || 'null'); } catch (e) { throw new Error(`"${c}" não é uma estrutura válida: ${e.message}`); } }
    else out[c] = el.value; }
  return out;
}
function abrirEditorBase(k, nome, novo) {
  comLiberacao(k, () => {
    const atual = (k === 'rituais' ? RIT : k === 'feiticos' ? FEIT : SIS[k] || []).find(x => x.nome === nome), orig = listaOriginal(k).find(x => x.nome === nome);
    const modelo = listaOriginal(k)[0] || {}, obj = novo ? { nome: '' } : { ...(atual || orig) };
    abrirModal(novo ? `Novo: ${AREA(k)[1]}` : `Base: ${nome}`, `<p class="aviso-base">${IC('aviso')} Vale para o <b>site inteiro</b>. ${k === 'itens' ? 'Fichas com este item do livro mudam junto; quem editou o item dentro da própria ficha mantém a versão dele.' : 'Todas as fichas e telas passam a usar esta versão.'}</p>
      <div class="ed-base">${editorObjeto(obj, modelo)}</div>
      <div class="btns"><button class="btn" id="be-ok">Salvar na base</button>${!novo && patchDe(k)[nome] && orig ? `<button class="btn sec" id="be-rest">Voltar ao livro</button>` : ''}${!novo ? `<button class="btn sec perigo" id="be-del">${IC('apagar')} ${orig ? 'Tirar do site' : 'Apagar'}</button>` : ''}</div>`, (m, fechar) => {
      m.querySelector('#be-ok').onclick = async () => {
        let v; try { v = lerEditor(m, obj); } catch (e) { toast(e.message); return; }
        v.nome = String(v.nome || '').trim(); if (!v.nome) { toast('Dê um nome.'); return; }
        delete v.__novo;
        try { if (!novo && v.nome !== nome) await salvarRemendo(k, nome, orig ? { __apagar: true } : undefined); await salvarRemendo(k, v.nome, v); fechar(); toast('Base atualizada para todo o site.'); desenharBaseSeAberta(); }
        catch (e) { toast('Não salvou: ' + (e.message || e.code)); }
      };
      m.querySelector('#be-rest')?.addEventListener('click', async () => { try { await salvarRemendo(k, nome, undefined); fechar(); toast('Voltou ao que está no livro.'); desenharBaseSeAberta(); } catch (e) { toast('Não salvou: ' + (e.message || e.code)); } });
      m.querySelector('#be-del')?.addEventListener('click', async () => { if (!await confirmar(`Tirar "${nome}" do site? Dá para voltar depois com "Voltar ao livro".`, { ok: 'Tirar' })) return;
        try { await salvarRemendo(k, nome, orig ? { __apagar: true } : undefined); fechar(); desenharBaseSeAberta(); } catch (e) { toast('Não salvou: ' + (e.message || e.code)); } });
    });
  });
}
function rotaBase() {
  const app = document.querySelector('#app');
  if (!DONO) { app.innerHTML = '<div class="vazio">Só administradores mexem na base do sistema.</div>'; return; }
  const k = BASE_UI.area, fund = ehFund(k), lib = fundLiberado(), area = AREA(k);
  const lista = k === 'rituais' ? RIT : k === 'feiticos' ? FEIT : SIS[k] || [], P = patchDe(k), orig = listaOriginal(k);
  const apagados = Object.entries(P).filter(([, v]) => v?.__apagar).map(([n]) => n);
  const q = BASE_UI.busca.trim().toLowerCase(), vis = lista.filter(x => !q || x.nome.toLowerCase().includes(q));
  const grupos = [...new Set(BASE_AREAS.map(a => a[4]))];
  app.className = 'pagina';
  app.innerHTML = `<div class="cab-pagina"><div><span class="rotulo">Administração</span><h1>Base do sistema</h1><p class="faint" style="margin:4px 0 0; max-width:62ch">O que muda aqui vale para o site inteiro. Para mudar só a sua ficha, edite o item dentro dela.</p></div></div>
    <div class="caixa estado-lib ${ehDonoSite() ? 'dono' : lib ? 'livre' : 'travado'}">${ehDonoSite() ? `${IC('chave')} <span>Você é o dono do site: fundamentos sempre liberados. Pedidos de outros administradores aparecem para você na hora.</span>` : lib ? `${IC('chave')} <span>Fundamentos liberados por mais <b>${restante(liberadoAte() - Date.now())}</b>.</span>` : `${IC('travar')} <span>Fundamentos travados. Itens, melhorias, rituais e o resto você edita livre; para classes, perícias e patentes, peça liberação.</span><button class="btn mini" id="lib-pedir">Pedir liberação</button>`}</div>
    <div class="base-wrap">
      <nav class="base-areas" aria-label="Partes da base">${grupos.map(g => `<div class="base-grupo"><span class="rotulo">${esc(g)}</span>${BASE_AREAS.filter(a => a[4] === g).map(a => { const n = Object.keys(patchDe(a[0])).length; return `<button class="${a[0] === k ? 'aqui' : ''}" data-area="${a[0]}">${a[3] ? IC(lib ? 'chave' : 'travar') : ''}<span>${esc(a[1])}</span>${n ? `<small title="Mudanças em relação ao livro">${n}</small>` : ''}</button>`; }).join('')}</div>`).join('')}</nav>
      <section class="base-lista">
        <div class="base-topo"><h2>${esc(area[1])}${fund ? ` <span class="tag">${IC('travar')} fundamento</span>` : ''}</h2><input type="search" id="base-busca" placeholder="Buscar…" value="${esc(BASE_UI.busca)}" aria-label="Buscar em ${esc(area[1])}"><button class="btn" id="base-novo">+ Novo</button></div>
        <div class="lista">${vis.map(x => { const mud = P[x.nome] && !P[x.nome].__apagar, novo = mud && !orig.some(o => o.nome === x.nome);
          return `<div class="item base-item"><div class="cab"><span class="nm">${esc(x.nome)}${novo ? ' <span class="tag crit">Novo</span>' : mud ? ' <span class="tag tag-mud">Alterado</span>' : ''}${x.canon ? ' <span class="tag">Homebrew canônico</span>' : ''}</span><span class="btns">${x.canon ? '' : `<button class="btn mini sec" data-ed="${esc(x.nome)}">${IC('editar')} Editar</button>`}</span></div><div class="faint base-res">${esc(resumoBase(k, x))}</div></div>`; }).join('') || '<div class="vazio">Nada encontrado.</div>'}
        ${apagados.length ? `<div class="caixa"><span class="rotulo">Tirados do site</span><div class="btns">${apagados.map(n => `<button class="btn mini sec" data-volta="${esc(n)}">${esc(n)} · voltar</button>`).join('')}</div></div>` : ''}</div>
      </section></div>`;
  app.querySelectorAll('[data-area]').forEach(b => b.onclick = () => { BASE_UI = { area: b.dataset.area, busca: '' }; rotaBase(); });
  const busca = app.querySelector('#base-busca'); busca.oninput = debounce(() => { BASE_UI.busca = busca.value; const pos = busca.selectionStart; rotaBase(); const n = document.querySelector('#base-busca'); n.focus(); n.setSelectionRange(pos, pos); }, 200);
  app.querySelector('#base-novo').onclick = () => abrirEditorBase(k, '', true);
  app.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => abrirEditorBase(k, b.dataset.ed, false));
  app.querySelectorAll('[data-volta]').forEach(b => b.onclick = () => comLiberacao(k, async () => { try { await salvarRemendo(k, b.dataset.volta, undefined); rotaBase(); } catch (e) { toast('Não salvou: ' + (e.message || e.code)); } }));
  app.querySelector('#lib-pedir')?.addEventListener('click', () => pedirLiberacao(k, rotaBase));
}
