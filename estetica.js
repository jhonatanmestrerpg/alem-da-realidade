/* Camada de estética: flutuação 3D dos cards, abas acessíveis pelo teclado,
   link "pular para o conteúdo" e animação de entrada só ao trocar de página. */
(() => {
  const FLUT = '.card-ag, .card-am, .card-it, .atalho, .ars-card, .hab, .mec-card, .mec-mini, .grade-cards > .caixa';
  const fino = matchMedia('(hover: hover) and (pointer: fine)'), calmo = matchMedia('(prefers-reduced-motion: reduce)');
  const pode = () => fino.matches && !calmo.matches;

  // marca os cards e cuida do papel das abas sempre que a página muda
  let pendente = false;
  // caixas do Escudo que dobram: o Escudo deixa de ser um paredão (lembra aberta/fechada)
  const LS = { get: k => { try { return localStorage.getItem('adr-dobra:' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('adr-dobra:' + k, v); } catch (e) {} } };
  const dobrar = cx => {
    if (cx.dataset.dobra) return; cx.dataset.dobra = '1';
    const t = cx.querySelector(':scope > h3, :scope > .btns:first-child > h3, :scope > .sec-f:first-child > h3'); if (!t || cx.children.length < 2) return;
    t.classList.add('dobra-t'); t.tabIndex = 0; t.setAttribute('role', 'button');
    const k = t.textContent.replace(/[^\p{L} ]/gu, '').trim().slice(0, 40), salvo = LS.get(k);
    const por = f => { cx.classList.toggle('dobrada', f); t.setAttribute('aria-expanded', String(!f)); }; por(salvo === '1');
    const alt = e => { if (e.target.closest('button, a, input, select') && e.target !== t) return; const f = !cx.classList.contains('dobrada'); por(f); LS.set(k, f ? '1' : '0'); };
    t.addEventListener('click', alt); t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alt(e); } });
  };
  // seletor de arquivo: o nativo fica escondido, o botão é nosso
  let nArq = 0;
  const arquivo = i => {
    if (i.classList.contains('arq-oculto')) return; if (!i.id) i.id = 'arq-' + (++nArq);
    i.classList.add('arq-oculto');
    const l = document.createElement('span'); l.className = 'arq-linha';
    l.innerHTML = `<label class="btn sec mini arq-botao" for="${i.id}">${window.IC ? IC('imagem') : ''} ${i.multiple ? 'Escolher arquivos' : 'Escolher arquivo'}</label><span class="arq-nome" data-arq="${i.id}">nenhum</span>`;
    i.after(l);
  };
  document.addEventListener('change', e => { const i = e.target; if (i?.type !== 'file' || !i.classList?.contains('arq-oculto')) return; const n = document.querySelector(`.arq-nome[data-arq="${CSS.escape(i.id)}"]`); if (n) n.textContent = [...(i.files || [])].map(f => f.name).join(', ') || 'nenhum'; }, true);
  const arrumar = () => {
    pendente = false;
    document.querySelectorAll('#corpo-e .caixa').forEach(dobrar);
    document.querySelectorAll('input[type=file]:not(.arq-oculto):not([hidden])').forEach(i => { if (!i.closest('.zona-img') && i.style.display !== 'none') arquivo(i); });
    document.querySelectorAll(FLUT).forEach(el => el.classList.add('flut'));
    document.querySelectorAll('.abas').forEach(t => {
      if (!t.hasAttribute('role')) t.setAttribute('role', 'tablist');
      t.querySelectorAll(':scope > button').forEach(b => {
        if (b.getAttribute('role') !== 'tab') b.setAttribute('role', 'tab');
        const sel = b.classList.contains('aqui') ? 'true' : 'false';
        if (b.getAttribute('aria-selected') !== sel) b.setAttribute('aria-selected', sel);
        const ti = sel === 'true' ? '0' : '-1';
        if (b.getAttribute('tabindex') !== ti) b.setAttribute('tabindex', ti);
      });
      // aba ativa visível no trilho que rola de lado (celular)
      const at = t.querySelector('button.aqui');
      if (at && t.scrollWidth > t.clientWidth && !t.dataset.rolou) { t.dataset.rolou = '1'; t.scrollLeft = Math.max(0, at.offsetLeft - 16); }
    });
  };
  new MutationObserver(() => { if (!pendente) { pendente = true; requestAnimationFrame(arrumar); } })
    .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  // inclinação seguindo o ponteiro
  let alvo = null;
  document.addEventListener('pointermove', e => {
    if (!pode()) return;
    const el = e.target.closest?.('.flut');
    if (alvo && alvo !== el) { alvo.style.removeProperty('--rx'); alvo.style.removeProperty('--ry'); }
    alvo = el; if (!el) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', ((x - .5) * 5).toFixed(2) + 'deg');
    el.style.setProperty('--rx', ((.5 - y) * 4).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  }, { passive: true });

  // setas, Home e End movem entre as abas (padrão WAI-ARIA)
  document.addEventListener('keydown', e => {
    const b = e.target.closest?.('[role=tablist] > button, .abas > button'); if (!b) return;
    const lista = [...b.parentElement.querySelectorAll(':scope > button:not([disabled])')], i = lista.indexOf(b);
    const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: lista.length - 1 }[e.key];
    if (j == null) return; e.preventDefault();
    const n = lista[(j + lista.length) % lista.length]; n.focus(); n.click();
    requestAnimationFrame(() => document.querySelector(`[data-aba="${CSS.escape(n.dataset.aba || '')}"]`)?.focus());
  });

  // pular direto para o conteúdo
  addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main'); if (!main) return;
    if (!main.id) main.id = 'conteudo'; main.setAttribute('tabindex', '-1');
    const a = document.createElement('a'); a.className = 'pular'; a.href = '#' + main.id; a.textContent = 'Pular para o conteúdo';
    a.addEventListener('click', e => { e.preventDefault(); main.focus(); }); document.body.prepend(a);
  });

  // animação de entrada só quando troca de rota
  let tm;
  addEventListener('hashchange', () => { document.body.classList.add('rota-nova'); clearTimeout(tm); tm = setTimeout(() => document.body.classList.remove('rota-nova'), 900); });
})();
