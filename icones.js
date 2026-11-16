/* A.R. (vindo do RPGs): ícones da interface, desenhados em SVG (nada de emoji).
   Uso: IC('faca')  ·  IC('mapa', 'g')  ·  no HTML: <i data-ic="mapa"></i> */
(() => {
  const P = {
    /* navegação e cenas */
    cena: 'M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9l1.6-4.2h14.8L21 9M8.4 4.8 7 9M13.4 4.8 12 9M18.4 4.8 17 9',
    faca: 'M3 20.8 7.8 16M7.4 12.2h9.2a4 4 0 0 1 0 8H11zM7.4 12.2 13 6.6M20.2 3.4 15 8.6',
    anomalia: 'M12 3.2 2.6 19.4a1 1 0 0 0 .9 1.5h17a1 1 0 0 0 .9-1.5zM12 9.4v4.8M12 17.3v.1',
    mascara: 'M3.5 6.5h17v3.8a7.5 7.5 0 0 1-4.6 6.9l-2.6 1.1a3.4 3.4 0 0 1-2.6 0l-2.6-1.1a7.5 7.5 0 0 1-4.6-6.9zM8 11h2M14 11h2',
    lupa: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16.2 16.2 21 21',
    pessoas: 'M9 11a3.4 3.4 0 1 0 0-6.8A3.4 3.4 0 0 0 9 11zM2.8 20.2c0-3 2.8-5.2 6.2-5.2s6.2 2.2 6.2 5.2M16.4 4.6a3.4 3.4 0 0 1 0 6.6M18 14.6c2 .7 3.4 2.3 3.4 4.3',
    mapa: 'M9 4.2 3 6.6v13.2l6-2.4 6 2.4 6-2.4V4.2l-6 2.4zM9 4.2v13.2M15 6.6v13.2',
    engrenagem: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 14h-.3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.5 7.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z',
    /* dados e combate */
    dado: 'M4 7.3 12 3l8 4.3v9.4L12 21l-8-4.3zM12 11.6 4 7.3M12 11.6l8-4.3M12 11.6V21M8.2 9.4l7.6-4.1',
    espadas: 'M5.5 3h3l8 11.5M18.5 3h-3l-8 11.5M4.5 17.5l3.6-3.6M19.5 17.5l-3.6-3.6M5 21l3-3 1.5 1.5L6.5 22.5zM19 21l-3-3-1.5 1.5 3 3z',
    estouro: 'M12 2.8 14 8l5.4-1.8-3 4.8 4.8 3L15 15.4 16.8 21 12 17.8 7.2 21 9 15.4l-6.2-1.4 4.8-3-3-4.8L10 8z',
    gota: 'M12 3.2c3.4 4 6 7 6 9.8a6 6 0 1 1-12 0c0-2.8 2.6-5.8 6-9.8z',
    cadeado: 'M6 10.6h12a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.4a1 1 0 0 1 1-1zM8.2 10.6V7.4a3.8 3.8 0 0 1 7.6 0v3.2',
    caveira: 'M12 2.6a8 8 0 0 0-5 14.2V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3.2a8 8 0 0 0-5-14.2zM9 11.4v.1M15 11.4v.1M10.4 21v-3M13.6 21v-3',
    raio: 'M13.6 2.4 4.8 13.2h6l-1.4 8.4 9-11h-6.2z',
    estrela: 'M12 2.8 14.9 9l6.5.9-4.7 4.7 1.1 6.6-5.8-3.1-5.8 3.1 1.1-6.6L2.6 9.9 9.1 9z',
    /* mesa e investigação */
    armadilha: 'M3 12.4h18M6 12.4a6 6 0 0 1 12 0M6 12.4a6 6 0 0 0 12 0M8.4 12.4l1.4-2.2M12 12.4V9.8M15.6 12.4l-1.4-2.2M8.4 12.4l1.4 2.2M12 12.4V15M15.6 12.4l-1.4 2.2M3 12.4v4M21 12.4v4',
    chave: 'M15.2 3.2a5.6 5.6 0 1 0-4.4 9l1.3 1.3-1 1 1.4 1.4-1.4 1.4 1.4 1.4-2.2 2.1-2.8-2.8 7.3-7.3a5.6 5.6 0 0 0 .4-7.5zM16 7.6v.1',
    porta: 'M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3.4 21h17.2M15 12.4v.1',
    martelo: 'M13.4 7 7.2 13.2a2 2 0 0 0 0 2.8l.8.8a2 2 0 0 0 2.8 0L17 10.6M11.6 5.2l7.2 7.2 2.4-2.4-7.2-7.2zM9 15 3 21',
    carta: 'M6.4 4.6h8.2a1 1 0 0 1 1 1v13.8a1 1 0 0 1-1 1H6.4a1 1 0 0 1-1-1V5.6a1 1 0 0 1 1-1zM17.4 7.2l2.3.6a1 1 0 0 1 .7 1.2l-2.6 9.8M10.5 9.5v5M9 12h3',
    documento: 'M6 3h7.6L19 8.4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM13.4 3v5.4H19M8.4 13h7.2M8.4 16.6h7.2',
    pasta: 'M3.4 6.4a1 1 0 0 1 1-1h4.2l2 2.6h8a1 1 0 0 1 1 1v9.6a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1z',
    calendario: 'M4.4 6.2h15.2a1 1 0 0 1 1 1v12.4a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1V7.2a1 1 0 0 1 1-1zM3.4 10.6h17.2M8 3.4v4M16 3.4v4',
    prancheta: 'M9 4.4H6.4a1 1 0 0 0-1 1v14.2a1 1 0 0 0 1 1h11.2a1 1 0 0 0 1-1V5.4a1 1 0 0 0-1-1H15M9 4.4a3 3 0 0 1 6 0v1.4H9zM8.6 12h6.8M8.6 15.6h6.8',
    alfinete: 'M12 21v-6.6M8 3.4h8l-1 5.2 2.4 2.6a1 1 0 0 1-.7 1.7H7.3a1 1 0 0 1-.7-1.7L9 8.6z',
    barbante: 'M5.6 18.4a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM18.4 11.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM7.8 14.2l8.4-5.6',
    tesoura: 'M6.6 8.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2zM6.6 20.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2zM8.8 7.4 20 18.6M8.8 16.6 20 5.4',
    obstaculo: 'M7.6 4.6h8.8L19 19.4H5zM5 19.4h14M9.4 10.4h5.2M8.6 15h6.8',
    /* visibilidade e mídia */
    olho: 'M2.4 12S5.8 5.6 12 5.6 21.6 12 21.6 12 18.2 18.4 12 18.4 2.4 12 2.4 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    olhoCortado: 'M4 4l16 16M9.5 9.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M6.4 6.7C3.9 8.3 2.4 12 2.4 12s3.4 6.4 9.6 6.4c1.7 0 3.2-.5 4.4-1.2M10 5.8c.6-.1 1.3-.2 2-.2 6.2 0 9.6 6.4 9.6 6.4s-.8 1.6-2.4 3.1',
    nevoa: 'M3.6 8.4h11.2M17.4 8.4h3M3.6 12h3.2M9.4 12h11M3.6 15.6h8.6M15 15.6h5.4',
    mao: 'M9 11V5.4a1.6 1.6 0 1 1 3.2 0V11M12.2 11V4.6a1.6 1.6 0 1 1 3.2 0V11M15.4 11.4V7.6a1.6 1.6 0 1 1 3.2 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3l-2.2-3.8a1.6 1.6 0 0 1 2.6-1.9L9 14.6V8.6',
    alvo: 'M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2zM12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zM12 1.6v3.2M12 19.2v3.2M1.6 12h3.2M19.2 12h3.2',
    imagem: 'M4.4 4.4h15.2a1 1 0 0 1 1 1v13.2a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1V5.4a1 1 0 0 1 1-1zM8.6 10.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM3.4 16.6l5-4.6 4.4 4 3-2.6 4.8 4.2',
    lixeira: 'M4.4 6.6h15.2M9.4 6.6V4.4a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1v2.2M6.6 6.6 7.4 20a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9l.8-13.4M10.4 10.6v6M13.6 10.6v6',
    lapis: 'M4 17.4 16.8 4.6a2.3 2.3 0 0 1 3.2 0l.4.4a2.3 2.3 0 0 1 0 3.2L7.6 21 3 21.4z',
    balao: 'M4.4 3.6h15.2a1 1 0 0 1 1 1v10.6a1 1 0 0 1-1 1H9.8L5 20.6v-4.4H4.4a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1z',
    microfone: 'M12 2.8a3.2 3.2 0 0 0-3.2 3.2v6a3.2 3.2 0 0 0 6.4 0V6A3.2 3.2 0 0 0 12 2.8zM5.4 11.4a6.6 6.6 0 0 0 13.2 0M12 18v3.2M8.6 21.2h6.8',
    som: 'M4 9.4h3.4L12 5.2v13.6L7.4 14.6H4zM15.6 9.6a3.4 3.4 0 0 1 0 4.8M18.2 7a7 7 0 0 1 0 10',
    semSom: 'M4 9.4h3.4L12 5.2v13.6L7.4 14.6H4zM16 10l5 4M21 10l-5 4',
    fone: 'M4 14.4V12a8 8 0 0 1 16 0v2.4M4 13.6h2.4a1 1 0 0 1 1 1v4.2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM20 13.6h-2.4a1 1 0 0 0-1 1v4.2a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1z',
    telefone: 'M15.6 21a13.6 13.6 0 0 1-12.6-12.6V5.6a1 1 0 0 1 1-1h3l1.4 4-2 1.4a11 11 0 0 0 5.2 5.2l1.4-2 4 1.4v3a1 1 0 0 1-1 1z',
    lanterna: 'M9 3.4h6v3.2l2 3V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9.6l2-3zM7 12.6h10M12 15v2.4',
    /* outros */
    ampulheta: 'M7 3.4h10M7 20.6h10M7.6 3.4v3.2L12 11l4.4-4.4V3.4M7.6 20.6v-3.2L12 13l4.4 4.4v3.2',
    frasco: 'M9.4 3.4v6.2L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3l-4.8-8.4V3.4M8.4 3.4h7.2M7.6 14.6h8.8',
    sino: 'M12 2.8a6 6 0 0 0-6 6c0 5.2-2 6.8-2 6.8h16s-2-1.6-2-6.8a6 6 0 0 0-6-6zM10.2 19.4a2 2 0 0 0 3.6 0',
    credencial: 'M3.4 5.4h17.2a1 1 0 0 1 1 1v11.2a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1V6.4a1 1 0 0 1 1-1zM8.6 12.4a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2zM5 16.2c0-1.8 1.6-2.8 3.6-2.8s3.6 1 3.6 2.8M15 9.6h4M15 12.8h4',
    maos: 'M3.4 8.2h13.2M13 4.6l3.6 3.6-3.6 3.6M20.6 15.8H7.4M11 12.2l-3.6 3.6 3.6 3.6',
    cadeira: 'M6.6 3.4h10.8v9H6.6zM5 12.4h14M7.4 12.4V21M16.6 12.4V21M7.4 17h9.2',
    casa: 'M3.4 10.6 12 3.4l8.6 7.2M5.8 12.6V20a1 1 0 0 0 1 1h10.4a1 1 0 0 0 1-1v-7.4M9.8 21v-6h4.4v6',
    bomba: 'M10.4 20.6a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM15 8.4l2.4-2.4M17 4.2l1.8 1.8M19.4 3.4v.1M21.4 6.2v.1',
    arma: 'M3.4 9h11.8l2.6 3h3.8M3.4 9v4.4h4.2L9 17.4h3.2l1.4-4.4h4M6.6 13.4 5 18.6H3.4',
    confete: 'M4 20.4 9.4 7l7.6 7.6zM13.6 3.6v2.2M18.6 8.6h2.2M16.4 5.2l1.6-1.6M19.6 13.4l1.4 1.4M12.4 9.6l2.6-2.6',
    trofeu: 'M7 4h10v5.4a5 5 0 0 1-10 0zM7 5.6H4.2v1.6A3.2 3.2 0 0 0 7.4 10.4M17 5.6h2.8v1.6a3.2 3.2 0 0 1-3.2 3.2M12 14.4V18M8.6 20.6h6.8l-.8-2.6H9.4z',
    brilho: 'M12 2.8 13.8 9l6.2 1.8L13.8 12.6 12 18.8 10.2 12.6 4 10.8 10.2 9zM18.4 16.4l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7zM5 2.4l.5 1.7 1.7.5-1.7.5L5 6.8l-.5-1.7-1.7-.5 1.7-.5z',
    fita: 'M3.4 6.6h17.2a1 1 0 0 1 1 1v8.8a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1V7.6a1 1 0 0 1 1-1zM8 13.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM16 13.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM9.6 17.4l1.4-2.4h2l1.4 2.4',
    controle: 'M7.4 7.4h9.2a4.6 4.6 0 0 1 4.5 3.7l.7 4a3 3 0 0 1-5.4 2.3L15.2 15H8.8l-1.2 2.4A3 3 0 0 1 2.2 15l.7-4a4.6 4.6 0 0 1 4.5-3.6zM6.4 11.4v2.4M5.2 12.6h2.4M16 11.6v.1M18 13.4v.1',
    fantasma: 'M5 20.4V10a7 7 0 0 1 14 0v10.4l-2.3-1.8-2.3 1.8-2.4-1.8-2.4 1.8-2.3-1.8zM9.6 9.6v.1M14.4 9.6v.1',
    carro: 'M4.6 12.6 6.2 7.8a1 1 0 0 1 1-.7h9.6a1 1 0 0 1 1 .7l1.6 4.8M3.4 12.6h17.2v4.6a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1zM7 15.4v.1M17 15.4v.1',
    coracao: 'M12 20.4 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 0 1 19.8 13z',
    caixa: 'M3.4 7.6 12 3.4l8.6 4.2v8.8L12 20.6l-8.6-4.2zM3.4 7.6 12 11.8l8.6-4.2M12 11.8v8.8',
    vela: 'M9.6 9.4h4.8v11.2H9.6zM12 9.4V7M12 7c1.4-1.2 1.4-2.6 0-4-1.4 1.4-1.4 2.8 0 4zM7.4 20.6h9.2',
    machado: 'M4 20.4 13 11.4M13.6 3.4c3.4 0 6 2.2 7 5.4-3 1.6-6 1.6-8.6 0 .2-2 .6-3.8 1.6-5.4zM11.4 9.6l2.6 2.6M10.6 10.4 13 12.8',
    ovo: 'M12 2.8c3.4 0 6.4 5.4 6.4 10a6.4 6.4 0 1 1-12.8 0c0-4.6 3-10 6.4-10z',
  };
  const AL = { // apelidos: mesmo desenho, nomes diferentes
    mesa: 'cena', assassino: 'faca', culpado: 'mascara', investigacao: 'lupa', npcs: 'pessoas',
    mais: 'engrenagem', rolar: 'dado', atacar: 'espadas', dano: 'estouro', resistencia: 'gota',
    travar: 'cadeado', morte: 'caveira', habilidade: 'raio', fraqueza: 'chave', barricada: 'porta',
    forcar: 'martelo', truque: 'carta', papel: 'documento', regras: 'documento', arquivo: 'pasta',
    pista: 'alfinete', pino: 'alfinete', esconder: 'olhoCortado', ver: 'olho', pincel: 'mao',
    foco: 'alvo', foto: 'imagem', apagar: 'lixeira', editar: 'lapis', roleplay: 'balao', voz: 'microfone',
    audio: 'fone', sair: 'telefone', aguardando: 'ampulheta', homebrew: 'frasco', aviso: 'sino',
    zoacao: 'confete', vencedor: 'trofeu', reverencia: 'brilho', entregar: 'maos', objeto: 'cadeira',
    cenario: 'casa', explosivo: 'bomba', fogo: 'arma', bichos: 'ovo', scp: 'anomalia', jogador: 'mascara',
    suspeito: 'lupa', quadro: 'barbante', cortar: 'tesoura', calendario2: 'calendario', notas: 'prancheta',
  };
  const caminho = n => P[n] || P[AL[n]] || '';
  window.IC = (n, cls) => { const d = caminho(n); return d ? `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>` : ''; };
  window.ICONES_UI = P;
  // <i data-ic="nome"></i> em HTML estático
  const encher = r => { if (r.nodeType !== 1) return; if (r.matches?.('i[data-ic]') && !r.firstChild) r.innerHTML = IC(r.dataset.ic); r.querySelectorAll?.('i[data-ic]:empty').forEach(i => { i.innerHTML = IC(i.dataset.ic); }); };
  const trocar = () => encher(document.documentElement);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', trocar); else trocar();
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) encher(n); }).observe(document.documentElement, { childList: true, subtree: true });
})();
