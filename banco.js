/* =====================================================================
   banco.js · ponte entre o site e o Supabase
   Expõe criarBanco(sb), um armazenamento de documentos JSON por caminho
   (fichas/<id>, campanhas/<id>/rolagens/<id>…), com consultas simples e
   atualização em tempo real. Tudo fica na tabela public.docs (ver schema.sql).
   ===================================================================== */
'use strict';
window.criarBanco = function criarBanco(sb) {
  const T = 'docs';
  const pai = p => p.split('/').slice(0, -1).join('/');
  const ultimo = p => p.split('/').pop();
  const SEG = /^[A-Za-z0-9_.~:@+-]{1,200}$/;
  function validar(p, par) {
    const s = String(p).split('/');
    if (!s.every(x => SEG.test(x) && x !== '.' && x !== '..')) throw new TypeError('Caminho inválido: ' + p);
    if ((s.length % 2 === 0) !== par) throw new TypeError(`Caminho com número de partes errado (${s.length}): ${p}`);
  }
  const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const novoId = () => { const a = new Uint8Array(20); crypto.getRandomValues(a); return [...a].map(x => ALFA[x % ALFA.length]).join(''); };
  const erro = e => {
    const msg = e?.message || String(e);
    const code = e?.code === '42501' || /row-level security/i.test(msg) ? 'invalid_argument' : (e?.code === 'PGRST301' ? 'revoked' : 'unavailable');
    return { code, message: msg };
  };
  const snap = (path, row) => ({ id: ultimo(path), exists: !!row, data: () => row ? row.dados : undefined, metadata: { fromCache: false, hasPendingWrites: false } });
  function mesclar(a, b) {
    const out = { ...(a || {}) };
    for (const [k, v] of Object.entries(b || {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) ? mesclar(out[k], v) : v;
    return out;
  }

  /* ---------- ouvintes locais + tempo real ---------- */
  const ouvintes = new Map();
  function disparar(colecao, path) { ouvintes.get('c:' + colecao)?.forEach(f => f()); ouvintes.get('d:' + path)?.forEach(f => f()); }

  // aviso rápido: quem grava manda um "mudou" num canal da coleção (broadcast, sem passar pelo banco);
  // quem está olhando a coleção recarrega na hora. O nome do canal é um hash, então não expõe códigos de campanha.
  const hash = t => { let h = 2166136261; for (const c of t) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const topico = col => 'm-' + hash(col);
  const canais = new Map(); // topico -> { ch, n }
  function entrarCanal(col) {
    const t = topico(col); let c = canais.get(t);
    if (!c) { const ch = sb.channel(t, { config: { broadcast: { self: false } } }).on('broadcast', { event: 'mudou' }, ({ payload }) => { if (payload?.c) disparar(payload.c, payload.p); }).subscribe(); c = { ch, n: 0 }; canais.set(t, c); }
    c.n++;
    return () => { if (--c.n <= 0) { canais.delete(t); sb.removeChannel(c.ch); } };
  }
  function avisar(col, path) {
    const t = topico(col), c = canais.get(t);
    const ch = c?.ch || sb.channel(t);
    Promise.resolve(ch.send({ type: 'broadcast', event: 'mudou', payload: { c: col, p: path } })).catch(() => {}).finally(() => { if (!c) sb.removeChannel(ch); });
  }
  function registrar(chave, fn) {
    if (!ouvintes.has(chave)) ouvintes.set(chave, new Set()); ouvintes.get(chave).add(fn);
    const sairCanal = entrarCanal(chave.startsWith('c:') ? chave.slice(2) : pai(chave.slice(2)));
    return () => { ouvintes.get(chave)?.delete(fn); sairCanal(); };
  }

  let tempoReal = false;
  sb.channel('docs-tempo-real')
    .on('postgres_changes', { event: '*', schema: 'public', table: T }, p => {
      const row = p.new && Object.keys(p.new).length ? p.new : p.old;
      if (row?.path) disparar(row.colecao || pai(row.path), row.path);
    })
    .subscribe(st => { tempoReal = st === 'SUBSCRIBED'; });
  // rede de segurança: com o tempo real de pé, recarrega a cada 30 s; caído, a cada 5 s
  let ultimaVarredura = 0;
  setInterval(() => { if (document.visibilityState !== 'visible') return; const agora = Date.now(); if (agora - ultimaVarredura < (tempoReal ? 30000 : 5000)) return; ultimaVarredura = agora; ouvintes.forEach(set => set.forEach(f => f())); }, 1000);

  /* ---------- documento ---------- */
  function doc(path) {
    validar(path, true);
    const ref = {
      id: ultimo(path), path,
      async get() {
        const { data, error } = await sb.from(T).select('path,dados').eq('path', path).maybeSingle();
        if (error) throw erro(error);
        return snap(path, data);
      },
      async set(dados) {
        const { error } = await sb.from(T).upsert({ path, colecao: pai(path), dados }, { onConflict: 'path' });
        if (error) throw erro(error);
        disparar(pai(path), path); avisar(pai(path), path);
      },
      async update(parcial) {
        const atual = await ref.get();
        if (!atual.exists) throw { code: 'invalid_argument', message: 'O documento não existe.' };
        const { error } = await sb.from(T).update({ dados: mesclar(atual.data(), parcial) }).eq('path', path);
        if (error) throw erro(error);
        disparar(pai(path), path); avisar(pai(path), path);
      },
      async delete() {
        const { error } = await sb.from(T).delete().eq('path', path);
        if (error) throw erro(error);
        disparar(pai(path), path); avisar(pai(path), path);
      },
      onSnapshot(next, falha) {
        // só avisa a tela quando o documento mudou de verdade (evita redesenhar à toa a cada varredura)
        let vivo = true, seq = 0, ultimo, falhas = 0;
        // "não existe" pode ser leitura feita antes da sessão voltar (ou durante a troca do token): confere de novo antes de sumir com o documento
        const rodar = async () => { const n = ++seq; try { let s = await ref.get(); if (!s.exists && vivo && n === seq) { await new Promise(ok => setTimeout(ok, 1500)); if (!vivo || n !== seq) return; s = await ref.get(); } if (!vivo || n !== seq) return; const k = JSON.stringify(s.exists ? s.data() : null); falhas = 0; if (k === ultimo) return; ultimo = k; next(s); } catch (e) { if (!vivo) return; if (++falhas <= 3) { setTimeout(() => vivo && rodar(), 1500 * falhas); return; } falhas = 0; falha?.(e); } };
        rodar();
        const sair = registrar('d:' + path, rodar);
        return () => { vivo = false; sair(); };
      },
      collection(sub) { return colecao(path + '/' + sub); },
    };
    return ref;
  }

  /* ---------- consulta / coleção ---------- */
  const OPS = { '==': 'eq', '!=': 'neq', '<': 'lt', '<=': 'lte', '>': 'gt', '>=': 'gte' };
  function consulta(col, filtros = [], ordem = null, lim = null) {
    const q = {
      where(campo, op, valor) {
        if (!OPS[op] && op !== 'in') throw new TypeError('Operador não suportado: ' + op);
        return consulta(col, [...filtros, [campo, op, valor]], ordem, lim);
      },
      orderBy(campo, dir = 'asc') { return consulta(col, filtros, [campo, dir], lim); },
      limit(n) { return consulta(col, filtros, ordem, n); },
      async get() {
        let r = sb.from(T).select('path,dados').eq('colecao', col);
        for (const [campo, op, valor] of filtros) {
          const numerico = typeof valor === 'number';
          const coluna = numerico ? `dados->${campo}` : `dados->>${campo}`;
          if (op === 'in') r = r.in(`dados->>${campo}`, valor.map(String));
          else r = r[OPS[op]](coluna, numerico ? valor : String(valor));
        }
        if (ordem) r = r.order(`dados->${ordem[0]}`, { ascending: ordem[1] !== 'desc', nullsFirst: false });
        r = r.limit(lim || 1000);
        const { data, error } = await r;
        if (error) throw erro(error);
        const docs = (data || []).map(row => snap(row.path, row));
        return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
      },
      onSnapshot(next, falha) {
        let vivo = true, seq = 0, ultimo, falhas = 0;
        const rodar = async () => { const n = ++seq; try { let s = await q.get(); if (s.empty && ultimo && ultimo !== '[]' && vivo && n === seq) { await new Promise(ok => setTimeout(ok, 1500)); if (!vivo || n !== seq) return; s = await q.get(); } if (!vivo || n !== seq) return; const k = JSON.stringify(s.docs.map(d => [d.id, d.data()])); falhas = 0; if (k === ultimo) return; ultimo = k; next(s); } catch (e) { if (!vivo) return; if (++falhas <= 3) { setTimeout(() => vivo && rodar(), 1500 * falhas); return; } falhas = 0; falha?.(e); } };
        rodar();
        const sair = registrar('c:' + col, rodar);
        return () => { vivo = false; sair(); };
      },
    };
    return q;
  }
  function colecao(path) {
    validar(path, false);
    return Object.assign(consulta(path), {
      path,
      doc(id) { return doc(path + '/' + (id || novoId())); },
      async add(dados) { const r = doc(path + '/' + novoId()); await r.set(dados); return r; },
    });
  }
  return { doc, collection: colecao };
};
