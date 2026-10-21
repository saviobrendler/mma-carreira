// MMA Carreira: interface. Toda a regra do jogo fica em engine.js; aqui so apresentamos
// o que o motor decide, com componentes reutilizaveis (icone, badge, barra, painel, btn).
(function () {
  'use strict';

  const MMA = window.MMA;
  const CHAVE = 'mma-beta-save-v1';
  const CHAVE_HALL = 'mma-hall-v1';
  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  const usuarioEl = document.getElementById('usuario');
  const toastEl = document.getElementById('toast');

  // ---------------------------------------------------------------------------
  // Dados de apresentacao
  // ---------------------------------------------------------------------------

  const PERIODOS = {
    eras: { nome: 'Era das Lendas', desc: 'As lendas antigas, regras primitivas e peso aberto. Um mundo onde o chão decidia tudo.' },
    auge: { nome: 'Era de Ouro', desc: 'O auge do UFC: categorias consolidadas e os nomes que viraram história.' },
    atual: { nome: 'Era Atual', desc: 'Os atletas de agora, com ritmo alto, cardio e estratégia moderna.' },
  };

  const ESTILO_DESC = {
    striking: 'Ataca em pé com golpes técnicos e velocidade.',
    luta_livre: 'Domina a queda e o controle por cima.',
    grappling: 'Vive no chão, com BJJ e finalizações.',
    misto: 'Equilibrado entre pé, queda e chão.',
  };

  const ARQUETIPO = {
    striking: 'Potência e trocação',
    luta_livre: 'Controle e pressão',
    grappling: 'Finalização e chão',
    misto: 'Equilíbrio total',
  };

  const GRUPOS_ATRIBUTOS = [
    { nome: 'Em pé', chaves: ['striking', 'velocidade', 'qi'] },
    { nome: 'Chão e luta', chaves: ['grappling', 'bjj', 'wrestling', 'defesa'] },
    { nome: 'Corpo', chaves: ['forca', 'resistencia', 'queixo'] },
  ];

  const FRASE_ATRIBUTO = {
    striking: 'Golpes em pé',
    velocidade: 'Velocidade e movimentação',
    resistencia: 'Resistência',
    queixo: 'Queixo',
    grappling: 'Controle no chão',
    bjj: 'Jiu-jitsu e finalização',
    wrestling: 'Quedas',
    defesa: 'Defesa de quedas',
    forca: 'Poder de nocaute',
    qi: 'QI de luta',
  };

  const ESTAT_ZERO = { tentativas: 0, acertos: 0, acertosPe: 0, acertosChao: 0, quedasTent: 0, quedasOk: 0, subTent: 0, subOk: 0, chaoTempo: 0, lutas: 0 };

  // Icones de traco (24x24), sem imagens externas.
  const ICONES = {
    luta: '<path d="M6 6l12 12M18 6L6 18"/><circle cx="12" cy="12" r="2"/>',
    luva: '<path d="M7 12V8a4 4 0 014-4h2a4 4 0 014 4v5a6 6 0 01-6 6H9a2 2 0 01-2-2z"/><path d="M7 21h9M13 8v3"/>',
    pressao: '<path d="M6 13l6-6 6 6M6 19l6-6 6 6"/>',
    queda: '<path d="M6 6l6 6 6-6M6 12l6 6 6-6"/>',
    escudo: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
    chao: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>',
    folego: '<path d="M4 12c3-4 5 4 8 0s5-4 8 0"/><path d="M4 17c3-4 5 4 8 0s5-4 8 0"/>',
    peso: '<path d="M3 10h3v4H3zM18 10h3v4h-3zM6 8h2v8H6zM16 8h2v8h-2zM8 12h8"/>',
    lua: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
    trofeu: '<path d="M8 4h8v5a4 4 0 01-8 0zM6 6H4v1a3 3 0 003 3M18 6h2v1a3 3 0 01-3 3M12 13v4M9 20h6"/>',
    cinturao: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    balanca: '<path d="M12 4v16M6 8h12M8 8l-3 6h6zM16 8l-3 6h6z"/>',
    barras: '<path d="M5 20V12M11 20V6M17 20v-6M3 20h18"/>',
    seta: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    setaEsq: '<path d="M19 12H6M11 6l-6 6 6 6"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    chevronBaixo: '<path d="M6 9l6 6 6-6"/>',
    chevronEsq: '<path d="M15 6l-6 6 6 6"/>',
    chevronDir: '<path d="M9 6l6 6-6 6"/>',
    raio: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    calendario: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
    etiqueta: '<path d="M3 12V4h8l9 9-8 8z"/><path d="M7.5 8.5h.01"/>',
    dinheiro: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5"/>',
    lupa: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alvo: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    cima: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    mais: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    menos: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    historico: '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5"/><path d="M12 8v4l3 2"/>',
    pessoas: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 3-5 6-5s6 1.5 6 5M15 15c3 0 6 1 6 4"/>',
    estrela: '<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.7 6.7 19.6l1.1-6L3.4 9.4l6-.8L12 3Z"/>',
    arvore: '<circle cx="12" cy="5" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M12 7.2v4.3M12 11.5L6 15.8M12 11.5l6 4.3"/>',
    presente: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1zM12 7c1.5-3 5-3 5-1s-3 1-5 1z"/>',
    perfil: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 18c1-2.5 3-3.5 5-3.5s4 1 5 3.5"/>',
  };

  // ---------------------------------------------------------------------------
  // Estado da interface
  // ---------------------------------------------------------------------------

  let carreira = carregar();
  let tela = 'inicio';
  let rascunho = null;
  let oponente = null;
  let titulo = false;
  let luta = null;
  let ultimaLuta = null;
  let detalhesLuta = false;
  const estado = { rankDiv: null, rankFiltro: 'geral', lutadorSel: null }; // selecao do ranking e do perfil do lutador
  let menuUsuario = false;
  let barrasAnteriores = {}; // valores das barras animadas na ultima tela
  let semanaExibida = null; // semana mostrada no hub (para animar a virada)
  let catConfirm = null; // categoria armada para confirmar
  let habConfirm = null; // habilidade armada para confirmar
  let toastTimer = null;
  let ultimaTelaRenderizada = null;

  if (carreira && carreira.lutaAtiva) {
    const ret = MMA.retomarLutaAtiva(carreira);
    luta = ret.luta;
    oponente = ret.oponente;
    titulo = ret.titulo;
    tela = 'luta';
  } else if (carreira) {
    tela = 'hub';
  }

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function pct(v) {
    return Math.max(0, Math.min(100, Math.round(v)));
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function sinal(n) {
    return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  }

  function corDoNome(nome) {
    let h = 0;
    for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
    return `hsl(${h % 360} 42% 36%)`;
  }

  function iniciais(nome) {
    return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  }

  // Lutadores reais indexados pelo nome (dados e fotos). A foto vem de fotos/, com credito quando houver.
  const FOTOS = {};
  const POR_NOME = {};
  Object.values(window.DADOS).forEach((periodo) => {
    Object.values(periodo).forEach((div) => {
      div.lutadores.forEach((l) => {
        if (!POR_NOME[l.nome]) POR_NOME[l.nome] = l;
        if (l.foto) FOTOS[l.nome] = l;
      });
    });
  });

  function nomeDivisao(periodo, id) {
    const d = MMA.divisaoDados(periodo, id);
    return d ? d.nome : id;
  }

  function limite(periodo, id) {
    const d = MMA.divisaoDados(periodo, id);
    return d && d.limiteKg ? d.limiteKg + ' kg' : 'Sem limite de peso';
  }

  function categoriaAtual(c) {
    return c.periodo === 'eras' ? 'Peso aberto' : nomeDivisao(c.periodo, c.divisaoId);
  }

  function estatisticas(c) {
    return Object.assign({}, ESTAT_ZERO, c.estatisticas || {});
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(carreira));
    } catch (e) {
      // Sem armazenamento: o jogo segue, sem salvar.
    }
  }

  function carregar() {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      // Saves antigos podem nao ter atributos criados depois (ex.: BJJ). A migracao
      // completa o que falta para o overall nunca virar NaN.
      return s && (s.versao === 1 || s.versao === 2) ? MMA.migrarCarreira(s) : null;
    } catch (e) {
      return null;
    }
  }

  function apagarSave() {
    try {
      localStorage.removeItem(CHAVE);
    } catch (e) {
      // nada a fazer
    }
  }

  function hallCarregar() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_HALL) || '[]');
    } catch (e) {
      return [];
    }
  }

  function hallSalvar(lista) {
    try {
      localStorage.setItem(CHAVE_HALL, JSON.stringify(lista));
    } catch (e) {
      // sem armazenamento: a entrada nao fica salva
    }
  }

  function toast(msg) {
    toastEl.innerHTML = `<span class="toast-dot"></span>${esc(msg)}`;
    toastEl.classList.add('ativo');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('ativo'), 3000);
  }

  function ir(novaTela) {
    tela = novaTela;
    menuUsuario = false;
    catConfirm = null;
    habConfirm = null;
    render();
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------------------
  // Componentes
  // ---------------------------------------------------------------------------

  function icone(nome, tamanho) {
    const p = ICONES[nome] || ICONES.luta;
    const t = tamanho || 20;
    return `<svg class="ico" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  }

  function badge(texto, tipo) {
    return `<span class="badge ${tipo || ''}">${texto}</span>`;
  }

  function barra(valor, tipo, id) {
    return `<div class="bar ${tipo || ''}"><i ${id ? `id="${id}"` : ''} style="width:${pct(valor)}%"></i></div>`;
  }

  function dataAttrs(data) {
    return Object.entries(data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  }

  // Botao padrao. tipo: primary | secondary | ghost. trailing: icone a direita.
  function btn(o) {
    const cls = ['btn', o.tipo || 'secondary', o.cls || ''].join(' ').trim();
    return `<button class="${cls}" ${o.acao ? `data-acao="${o.acao}"` : ''}${dataAttrs(o.data)}${o.disabled ? ' disabled' : ''}${o.aria ? ` ${o.aria}` : ''}${o.style ? ` style="${o.style}"` : ''}>${o.icone ? icone(o.icone, o.iconeTam || 18) : ''}<span class="btn-txt">${o.texto}</span>${o.trailing ? icone(o.trailing, 18) : ''}</button>`;
  }

  function painel(o) {
    const cab = o.titulo
      ? `<div class="painel-cab"><h3>${o.icone ? icone(o.icone, 18) : ''}<span>${o.titulo}</span></h3>${o.meta ? `<span class="meta">${o.meta}</span>` : ''}</div>`
      : '';
    return `<section class="painel ${o.cls || ''}"${o.i !== undefined ? ` style="--i:${o.i}"` : ''}${o.id ? ` id="${o.id}"` : ''}>${cab}${o.corpo}</section>`;
  }

  // Foto do jogador (enviada na criacao) ou foto livre do lutador real, pelo nome.
  function fotoSrc(nome) {
    if (carreira && carreira.foto && nome === carreira.nome) return carreira.foto;
    return FOTOS[nome] ? FOTOS[nome].foto : null;
  }

  function avatar(nome, tamanho) {
    const src = fotoSrc(nome);
    if (src) return `<div class="avatar com-foto ${tamanho || ''}" title="${esc(nome)}"><img src="${esc(src)}" alt="${esc(nome)}" loading="lazy"></div>`;
    return `<div class="avatar ${tamanho || ''}" style="--cor:${corDoNome(nome)}" aria-hidden="true">${esc(iniciais(nome))}</div>`;
  }

  function creditoFoto(nome) {
    const f = FOTOS[nome];
    if (!f || !f.credito || (carreira && nome === carreira.nome && carreira.foto)) return '';
    return `Foto: ${(f.credito.autor || 'Autor desconhecido').slice(0, 60)} · ${f.credito.licenca || ''}`;
  }

  function retrato(nome, rodape) {
    const src = fotoSrc(nome);
    if (src) {
      const credito = creditoFoto(nome);
      return `<div class="retrato com-foto" role="img" aria-label="Foto de ${esc(nome)}"><img src="${esc(src)}" alt="${esc(nome)}" loading="lazy">${credito ? `<span class="credito-foto">${esc(credito)}</span>` : ''}${rodape ? `<span class="rotulo-base">${esc(rodape)}</span>` : ''}</div>`;
    }
    return `<div class="retrato" style="--cor:${corDoNome(nome)}" role="img" aria-label="Retrato de ${esc(nome)}"><span class="iniciais">${esc(iniciais(nome))}</span>${rodape ? `<span class="rotulo-base">${esc(rodape)}</span>` : ''}</div>`;
  }

  // Recorta a foto em quadrado, reduz para 480px e comprime: cabe com folga no localStorage.
  function processarFoto(arquivo) {
    return new Promise((resolve, reject) => {
      if (!arquivo || !arquivo.type || !arquivo.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
      if (arquivo.size > 12 * 1024 * 1024) return reject(new Error('Imagem grande demais (máximo de 12 MB).'));
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Esse arquivo não é uma imagem válida.'));
        img.onload = () => {
          const lado = Math.min(img.width, img.height);
          const sx = (img.width - lado) / 2;
          const sy = Math.max(0, (img.height - lado) * 0.25); // favorece o topo: rostos
          const tam = 480;
          const canvas = document.createElement('canvas');
          canvas.width = tam;
          canvas.height = tam;
          canvas.getContext('2d').drawImage(img, sx, sy, lado, lado, 0, 0, tam, tam);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function cabecalhoTela(kicker, titulo, sub, direita) {
    return `<header class="tela-cab"><div><div class="kicker">${kicker}</div><h1 class="titulo">${titulo}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${direita || ''}</header>`;
  }

  // ---------------------------------------------------------------------------
  // Render e cabecalho
  // ---------------------------------------------------------------------------

  function render() {
    const T = window.TELAS;
    const telas = {
      inicio: telaInicio, era: telaEra, criar: telaCriar, academia: telaAcademia, tracos: telaTracos,
      hub: () => T.hub(UI), proxima: () => T.proxima(UI), treino: () => T.treino(UI), ranking: () => T.ranking(UI), lutador: () => T.lutador(UI), legado: () => T.legado(UI),
      luta: telaLuta, resultado: telaResultado,
      perfil: telaPerfil, habilidades: telaHabilidades, categoria: telaCategoria, distribuir: telaDistribuir, aposentadoria: telaAposentadoria, hall: telaHall,
    };
    // Sem carreira so existem as telas de entrada; com carreira, as da central.
    if (!carreira && ['hub', 'proxima', 'treino', 'ranking', 'lutador', 'legado', 'luta', 'resultado', 'perfil', 'habilidades', 'categoria', 'distribuir', 'academia', 'tracos', 'aposentadoria'].includes(tela)) tela = 'inicio';
    const fn = telas[tela] || telaInicio;
    const mesmaTela = ultimaTelaRenderizada === tela;
    ultimaTelaRenderizada = tela;
    app.innerHTML = `<div class="tela${mesmaTela ? ' sem-anim' : ''}" data-tela="${tela}">${fn()}</div>`;
    document.body.dataset.era = carreira && tela !== 'inicio' && tela !== 'era' && tela !== 'criar' ? carreira.periodo : (rascunho && rascunho.periodo) || '';
    if (tela === 'luta' && luta && document.getElementById('arena-mount')) montarLuta();
    else LutaUI.desmontar();
    semanaExibida = carreira ? carreira.semana : null;
    renderCabecalho();
    posRender();
    celebrarPendentes();
  }

  // Barras que deslizam do valor antigo ao novo e numeros que contam de zero.
  function posRender() {
    // Timer (e nao so requestAnimationFrame): em aba escondida o frame nao roda e a barra ficaria no valor velho.
    setTimeout(() => {
      document.querySelectorAll('[data-para]').forEach((i) => { i.style.width = i.dataset.para + '%'; });
    }, 30);
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('[data-conta]').forEach((el) => {
      const alvoN = Number(el.dataset.conta);
      const pre = el.dataset.pre || '';
      const t0 = performance.now();
      const passo = (t) => {
        const k = Math.min(1, (t - t0) / 900);
        const v = Math.round(Math.abs(alvoN) * (1 - Math.pow(1 - k, 3)));
        el.textContent = (alvoN < 0 ? '−' : '+') + pre + v.toLocaleString('pt-BR');
        if (k < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
  }

  function renderCabecalho() {
    if (!carreira || tela === 'luta') {
      nav.innerHTML = '';
      usuarioEl.innerHTML = '';
      return;
    }
    const itens = [['hub', 'Carreira', 'perfil'], ['proxima', 'Próxima luta', 'luta'], ['treino', 'Treinamento', 'peso'], ['ranking', 'Ranking', 'trofeu'], ['legado', 'Legado', 'cinturao']];
    // Telas secundarias ficam sob a aba de onde se chega a elas.
    const pai = { lutador: 'ranking', resultado: 'hub', perfil: 'hub', habilidades: 'hub', distribuir: 'hub', academia: 'treino', tracos: 'hub', categoria: 'hub', aposentadoria: 'legado' };
    const atual = pai[tela] || tela;
    const c = carreira;
    const pend = (c.pontosDisponiveis || 0) + (c.pontosHab || 0) + MMA.tracosPendentes(c) + MMA.assinaturasPendentes(c);
    nav.innerHTML = itens.map(([t, rot, ic]) => {
      const ativo = atual === t;
      const aviso = t === 'hub' && pend > 0 ? '<em class="aba-n" aria-hidden="true"></em>' : t === 'proxima' && !c.agendada && !c.lesao && !c.lutaAtiva && (c.ofertas || []).length ? '<em class="aba-n" aria-hidden="true"></em>' : t === 'treino' && c.agendada && MMA.etapaAtual(c) ? '<em class="aba-n" aria-hidden="true"></em>' : '';
      return `<button class="aba" data-acao="ir" data-tela="${t}" aria-current="${ativo ? 'page' : 'false'}" aria-pressed="${ativo}">${icone(ic, 22)}<span>${rot}</span>${aviso}</button>`;
    }).join('');
    const podeCat = c.periodo !== 'eras' && !c.agendada && !c.lesao && !c.lutaAtiva && !c.evento && !c.aposentado;
    const apos = MMA.podeAposentar(c);
    const item = (t, ic, rot, extra) => `<button role="menuitem" data-acao="ir" data-tela="${t}">${icone(ic, 16)} ${rot}${extra || ''}</button>`;
    usuarioEl.innerHTML = `
      <button class="user-btn" data-acao="menu-usuario" aria-expanded="${menuUsuario}" aria-haspopup="menu" aria-label="Menu do lutador">
        ${avatar(c.nome, 'xs')}
        <span class="user-txt"><b>${esc(c.nome)}</b><small>${MMA.ESTILOS[c.estilo]} · Overall ${Math.round(MMA.ratingExato(c))}</small></span>
        ${icone('chevronBaixo', 16)}
      </button>
      ${menuUsuario ? `<div class="user-menu" role="menu">
        ${item('perfil', 'barras', 'Estatísticas')}
        ${item('habilidades', 'arvore', 'Habilidades', (c.pontosHab || 0) > 0 ? `<em class="menu-n">${c.pontosHab}</em>` : '')}
        ${item('tracos', 'cima', 'Traços e golpes', MMA.tracosPendentes(c) + MMA.assinaturasPendentes(c) > 0 ? `<em class="menu-n">${MMA.tracosPendentes(c) + MMA.assinaturasPendentes(c)}</em>` : '')}
        ${item('distribuir', 'mais', 'Distribuir pontos', (c.pontosDisponiveis || 0) > 0 ? `<em class="menu-n">${c.pontosDisponiveis}</em>` : '')}
        ${item('academia', 'dinheiro', 'Academia')}
        ${podeCat ? item('categoria', 'balanca', 'Mudar categoria') : ''}
        ${item('hall', 'trofeu', 'Hall da fama')}
        ${apos.ok ? '<button role="menuitem" data-acao="aposentar">' + icone('cinturao', 16) + ' Pendurar as luvas</button>' : ''}
        ${item('inicio', 'setaEsq', 'Menu inicial')}
      </div>` : ''}`;
  }

  // ---------------------------------------------------------------------------
  // Blocos de dados reutilizados
  // ---------------------------------------------------------------------------

  function rosca(ko, sub, dec, rotulo) {
    const total = ko + sub + dec;
    const raio = 44;
    const circ = 2 * Math.PI * raio;
    const partes = [{ v: ko, cor: '#E11D35' }, { v: sub, cor: '#3B82F6' }, { v: dec, cor: '#D1D5DB' }];
    let acum = 0;
    const arcos = total === 0
      ? `<circle cx="60" cy="60" r="${raio}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="13"></circle>`
      : partes.filter((p) => p.v > 0).map((p) => {
        const tam = (p.v / total) * circ;
        const gap = partes.filter((x) => x.v > 0).length > 1 ? 3 : 0;
        const arco = `<circle cx="60" cy="60" r="${raio}" fill="none" stroke="${p.cor}" stroke-width="13" stroke-dasharray="${Math.max(0, tam - gap).toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-acum).toFixed(2)}" transform="rotate(-90 60 60)"></circle>`;
        acum += tam;
        return arco;
      }).join('');
    return `<svg viewBox="0 0 120 120" width="132" height="132" role="img" aria-label="${total} ${rotulo}">
      ${arcos}
      <text x="60" y="58" text-anchor="middle" class="rosca-n">${total}</text>
      <text x="60" y="75" text-anchor="middle" class="rosca-r">${rotulo}</text>
    </svg>`;
  }

  function contaMetodos(c, resultado) {
    const lista = c.historico.filter((h) => h.resultado === resultado);
    return {
      ko: lista.filter((h) => h.metodo === 'Nocaute').length,
      sub: lista.filter((h) => h.metodo === 'Finalização').length,
      dec: lista.filter((h) => h.metodo && h.metodo.startsWith('Decisão')).length,
      total: lista.length,
    };
  }

  function blocoMetodos(c, resultado, titulo, icon, rotuloRosca, ctx, i) {
    const m = contaMetodos(c, resultado);
    const linha = (sigla, nome, valor, tipo) => `<div class="metodo"><span class="mbadge ${tipo}">${sigla}</span><span class="nome">${nome}</span><b>${valor}</b></div>`;
    return painel({
      titulo, icone: icon, meta: `${m.total} no total`, i,
      corpo: `<div class="metodos-corpo"><div class="rosca">${rosca(m.ko, m.sub, m.dec, rotuloRosca)}</div><div class="metodos-lista">
        ${linha('KO', 'Nocaute', m.ko, ctx === 'v' ? 'ok' : 'red')}
        ${linha('SUB', 'Finalização', m.sub, 'blue')}
        ${linha('DEC', 'Decisão', m.dec, 'gray')}
      </div></div>`,
    });
  }

  function statBarra(rotulo, valor, total, tipo, nota) {
    const p = total > 0 ? pct((valor / total) * 100) : 0;
    return `<div class="stat"><div class="stat-topo"><span>${rotulo}</span><b>${valor} / ${total}</b></div>${barra(p, tipo)}${nota ? `<div class="stat-nota">${nota}</div>` : ''}</div>`;
  }

  function blocoGolpes(c, i) {
    const e = estatisticas(c);
    const aprov = e.tentativas > 0 ? Math.round((e.acertos / e.tentativas) * 100) : 0;
    const pe = e.acertos > 0 ? Math.round((e.acertosPe / e.acertos) * 100) : 0;
    return painel({
      titulo: 'Golpeamento', icone: 'luva', meta: `${e.lutas} luta(s)`, i,
      corpo: `${statBarra('Golpes que acertaram', e.acertos, e.tentativas, '', `Aproveitamento de ${aprov}%`)}
        <div class="stat"><div class="stat-topo"><span>Onde os golpes acertaram</span><b>${e.acertos}</b></div>
          <div class="bar split"><i style="width:${pe}%"></i><i class="cinza" style="width:${e.acertos > 0 ? 100 - pe : 0}%"></i></div>
          <div class="legenda"><span><i class="dot red"></i>Em pé · ${e.acertosPe}</span><span><i class="dot blue"></i>Chão · ${e.acertosChao}</span></div>
        </div>`,
    });
  }

  function blocoChao(c, i) {
    const e = estatisticas(c);
    return painel({
      titulo: 'Luta de chão', icone: 'chao', meta: 'BJJ e queda', i,
      corpo: `${statBarra('Quedas', e.quedasOk, e.quedasTent, '', 'Quedas que levaram o adversário ao chão')}
        ${statBarra('Finalizações', e.subOk, e.subTent, 'claro', 'Tentativas de finalização por cima')}
        <div class="stat"><div class="stat-topo"><span>Controle por cima</span><b>${e.chaoTempo} trocas</b></div></div>`,
    });
  }

  function tabelaHistorico(c, limiteLinhas) {
    const itens = c.historico.slice(-(limiteLinhas || 6)).reverse();
    if (!itens.length) return '<p class="vazio">Nenhuma luta ainda. Seu histórico aparece aqui.</p>';
    return `<div class="tabela-hist">${itens.map((h) => {
      const tipo = h.resultado === 'Vitória' ? 'ok' : h.resultado === 'Derrota' ? 'red' : 'gold';
      const extra = [h.metodo, h.titulo ? 'Título' : null, h.lesao ? 'Lesão: ' + h.lesao : null].filter(Boolean).join(' · ');
      return `<div class="linha-hist"><span class="marca ${tipo}"></span>${badge(h.resultado, tipo)}<span class="contra">contra <b>${esc(h.oponente)}</b></span><span class="metodo-txt">${esc(extra)}</span><span class="sem">Sem. ${h.semana}</span></div>`;
    }).join('')}</div>`;
  }

  function faixaLutador(c, compacta) {
    const pos = MMA.posicaoDoJogador(c);
    const nivel = MMA.nivelDoXP(c.xp);
    const base = 40 * (nivel - 1) * (nivel - 1);
    const prox = 40 * nivel * nivel;
    const p = pct(((c.xp - base) / (prox - base)) * 100);
    return `
      <section class="faixa${compacta ? ' compacta' : ''} entra" style="--i:0">
        <div class="faixa-id">
          ${avatar(c.nome, 'xl')}
          <div class="faixa-nome">
            <h1>${esc(c.nome)} ${c.campeao ? badge('Campeão', 'gold') : ''}</h1>
            <div class="faixa-sub">${c.modalidade ? MMA.MODALIDADES[c.modalidade].nome : MMA.ESTILOS[c.estilo]}${c.pais ? " · " + esc(c.cidade ? c.cidade + ", " + c.pais : c.pais) : ""} · ${PERIODOS[c.periodo].nome} · Semana ${c.semana}</div>
          </div>
        </div>
        <div class="faixa-dados">
          <div class="dado"><b>${c.recorde.v}-${c.recorde.d}-${c.recorde.e}</b><span>Recorde</span></div>
          <div class="dado"><b>${esc(categoriaAtual(c))}</b><span>Categoria</span></div>
          <div class="dado"><b>${pos ? '#' + pos : '—'}</b><span>No ranking</span></div>
        </div>
        <div class="faixa-nivel">
          <div class="nivel-topo"><span>Nível <b>${nivel}</b></span><span class="overall">Overall <b>${MMA.ratingExato(c).toFixed(1)}</b></span></div>
          ${barra(p, 'azul')}
          <div class="nivel-nums"><span>${c.xp} XP</span><span>${prox} XP</span></div>
        </div>
      </section>`;
  }

  function perfilCard(c, rodape, i) {
    const e = estatisticas(c);
    const linha = (ic, rot, val) => `<div class="info"><span>${icone(ic, 16)}${rot}</span><b>${val}</b></div>`;
    return painel({
      titulo: 'Perfil do lutador', icone: 'perfil', i, cls: 'perfil-card',
      corpo: `<div class="perfil-foto">${retrato(c.nome, rodape || `${PERIODOS[c.periodo].nome}`)}<div class="energia-vert" aria-hidden="true"><i style="height:${pct(c.energia)}%"></i></div></div>
        <div class="info-lista">
          ${linha('raio', 'Energia', Math.round(c.energia))}
          ${linha('calendario', 'Idade', MMA.idadeAtual(c) + ' anos')}
          ${c.pais ? linha('pessoas', 'Origem', esc((c.cidade ? c.cidade + ', ' : '') + c.pais)) : ''}
          ${c.modalidade ? linha('luva', 'Modalidade', esc(MMA.MODALIDADES[c.modalidade].nome)) : ''}
          ${linha('etiqueta', 'Categoria', esc(categoriaAtual(c)))}
          ${linha('barras', 'Lutas', e.lutas)}
          ${linha('dinheiro', 'Dinheiro', '$' + c.dinheiro.toLocaleString('pt-BR'))}
          ${linha('cima', 'Potencial', MMA.potencialRotulo(c.potencial))}
          ${linha('pessoas', 'Fama', MMA.nivelFama(c).nome)}
          ${c.tracos && c.tracos.length ? linha('luva', 'Traços', esc(c.tracos.map((t) => MMA.TRACOS[t].nome).join(', '))) : ''}
          ${MMA.assinaturaEquipada(c) ? linha('alvo', 'Assinatura', esc(MMA.assinaturaEquipada(c).nome)) : ''}
          ${linha('trofeu', 'Campeão da categoria', esc(MMA.campeaoAtual(c) || '—'))}
          ${c.pontosDisponiveis ? linha('mais', 'Pontos para distribuir', c.pontosDisponiveis) : ''}
          ${c.lesao ? `<div class="info alerta"><span>${icone('escudo', 16)}Lesão</span><b>${esc(c.lesao.nome)} · ${c.lesao.semanas} sem.</b></div>` : ''}
        </div>`,
    });
  }

  function colunaEstatisticas(c) {
    return `<div class="grade-stats">
      ${blocoMetodos(c, 'Vitória', 'Vitórias', 'trofeu', 'VITÓRIAS', 'v', 1)}
      ${blocoMetodos(c, 'Derrota', 'Derrotas', 'escudo', 'DERROTAS', 'd', 2)}
      ${blocoGolpes(c, 3)}
      ${blocoChao(c, 4)}
    </div>`;
  }

  // Para cada lutador: os dois atributos mais altos (fortes) e os dois mais baixos (fracos).
  function fortesFracos(attrs) {
    const ord = MMA.ATRIBUTOS.slice().sort((a, b) => attrs[b] - attrs[a]);
    return { fortes: ord.slice(0, 2), fracos: ord.slice(-2).reverse() };
  }

  // Leitura rapida de um adversario: favorito ou azarao, plano provavel e cartel real.
  function fichaAdversario(op, c) {
    const diff = MMA.rating(c) - op.rating;
    const chance = diff >= 4 ? { rotulo: 'Você é favorito', cls: 'ok', cor: 'ok' }
      : diff <= -4 ? { rotulo: 'Ele é favorito', cls: 'red', cor: 'red' }
        : { rotulo: 'Luta equilibrada', cls: 'gray', cor: 'gray' };
    const a = op.lutador.atributos;
    const plano = a.wrestling + a.grappling * 0.5 > a.striking + a.velocidade * 0.3 ? 'Deve buscar a queda' : 'Deve trocar em pé';
    const forte = MMA.ATRIBUTOS.reduce((m, k) => (a[k] > a[m] ? k : m), 'forca');
    const k = op.lutador.cartel;
    const cartel = [];
    if (k && k.vitorias) {
      cartel.push(`Finaliza ${Math.round(((k.vitorias_sub || 0) / k.vitorias) * 100)}% das vitórias`);
      if (k.derrotas) cartel.push(`Caiu por nocaute em ${Math.round(((k.derrotas_ko || 0) / k.derrotas) * 100)}% das derrotas`);
    }
    return { chance, plano, forte, cartel, ...fortesFracos(a) };
  }

  // ---------------------------------------------------------------------------
  // Telas: entrada e criacao
  // ---------------------------------------------------------------------------

  function telaInicio() {
    const continuar = carreira ? btn({ texto: `Continuar com ${esc(carreira.nome)}`, acao: 'ir', data: { tela: 'hub' }, tipo: 'primary', trailing: 'seta' }) : '';
    const novo = btn({ texto: carreira ? 'Começar nova carreira' : 'Começar carreira', acao: 'ir', data: { tela: 'era' }, tipo: carreira ? 'secondary' : 'primary', trailing: carreira ? '' : 'seta' });
    const hall = btn({ texto: 'Hall da fama', acao: 'ir', data: { tela: 'hall' }, tipo: 'ghost', icone: 'trofeu' });
    const apagar = carreira ? btn({ texto: 'Apagar carreira salva', acao: 'apagar', tipo: 'ghost' }) : '';
    return `<section class="capa"><div class="capa-texto">
      <div class="kicker entra" style="--i:0">MMA Carreira · Beta</div>
      <h1 class="entra" style="--i:1">Chegue ao <span>cinturão</span></h1>
      <p class="entra" style="--i:2">Crie seu lutador do zero, treine o striking, o BJJ e a luta de chão, enfrente lendas de três eras e defenda o título. Cada luta é decidida round a round, e cada escolha pesa.</p>
      <div class="capa-botoes entra" style="--i:3">${continuar}${novo}</div>
      <div class="capa-botoes entra" style="--i:4">${hall}${apagar}</div>
      <p class="nota-beta">Beta de uso pessoal. Os atributos dos lutadores reais vêm de estatísticas públicas da Wikipédia, com fórmula provisória.</p>
    </div><figure class="capa-foto entra" style="--i:2"><img src="fotos/cinturao-1.webp" alt="Campeão com o cinturão"></figure></section>`;
  }

  function contarLutadores(periodo) {
    let n = 0;
    for (const d of Object.values(window.DADOS[periodo])) n += d.lutadores.length;
    return n;
  }

  function telaEra() {
    const cards = Object.entries(PERIODOS).map(([id, p], i) => `
      <button class="card-era entra" style="--i:${i}" data-acao="escolher-era" data-periodo="${id}">
        ${badge(contarLutadores(id) + ' lutadores')}
        <div><h3>${p.nome}</h3><p>${p.desc}</p></div>
        <span class="card-era-seta">${icone('seta', 20)}</span>
      </button>`).join('');
    return `${cabecalhoTela('Passo 1 de 3', 'Escolha sua era', 'A era define os adversários, as regras e o ranking em que você começa.')}
      <div class="grade-3">${cards}</div>
      <div class="acoes-linha">${btn({ texto: 'Voltar', acao: 'ir', data: { tela: 'inicio' }, icone: 'setaEsq' })}</div>`;
  }

  function divisoesDoPeriodo(periodo) {
    return periodo === 'eras' ? MMA.DIVISOES_ERAS : MMA.ORDEM_DIVISOES;
  }

  const PAISES = [
    'Brasil', 'Argentina', 'Chile', 'Colômbia', 'México', 'Peru', 'Uruguai', 'Venezuela', 'Estados Unidos', 'Canadá',
    'Reino Unido', 'Irlanda', 'França', 'Alemanha', 'Espanha', 'Portugal', 'Itália', 'Holanda', 'Polônia', 'Suécia',
    'Rússia', 'Ucrânia', 'Geórgia', 'Cazaquistão', 'Quirguistão', 'Dagestão', 'Armênia', 'Turquia', 'Japão', 'Coreia do Sul',
    'China', 'Tailândia', 'Filipinas', 'Austrália', 'Nova Zelândia', 'África do Sul', 'Nigéria', 'Camarões', 'Cuba', 'Outro',
  ];

  // Nomes dos lutadores reais do jogo: o jogador nao pode usar um deles (a foto do real apareceria).
  const NOMES_REAIS = new Set(Object.values(window.DADOS).flatMap((p) => Object.values(p).flatMap((d) => d.lutadores.map((l) => l.nome.toLowerCase()))));

  function cardsCategoria(periodo, sel) {
    return divisoesDoPeriodo(periodo).map((id) => {
      const d = MMA.divisaoDados(periodo, id);
      const top = d ? d.lutadores.slice().sort((a, b) => MMA.rating(b) - MMA.rating(a)).slice(0, 3).map((l) => l.nome.split(' ').pop()).join(', ') : '';
      return `<button class="card-opcao cat" aria-pressed="${sel === id}" data-acao="divisao" data-valor="${id}"><b>${esc(nomeDivisao(periodo, id))}</b><small>${esc(limite(periodo, id))}</small><em>${esc(top)}</em></button>`;
    }).join('');
  }

  function cardsTracos(rascunho, mod) {
    const sug = MMA.SUGESTOES_MODALIDADE[rascunho.modalidade] || MMA.SUGESTOES_MODALIDADE.mma;
    return sug.tracos.map((id, i) => `<button class="card-opcao" aria-pressed="${rascunho.traco === id}" data-acao="traco-sel" data-valor="${id}"><b>${esc(MMA.TRACOS[id].nome)}${i === 0 ? ' ★' : ''}</b><small>${esc(MMA.TRACOS[id].descr)}</small></button>`).join('');
  }

  function cardsAssinaturas(rascunho) {
    const sug = MMA.SUGESTOES_MODALIDADE[rascunho.modalidade] || MMA.SUGESTOES_MODALIDADE.mma;
    const tipo = { golpe: 'Golpe', queda: 'Queda', finalizacao: 'Finalização' };
    return sug.assinaturas.map((id, i) => `<button class="card-opcao" aria-pressed="${rascunho.assinatura === id}" data-acao="ass-sel" data-valor="${id}"><b>${esc(MMA.ASSINATURAS[id].nome)}${i === 0 ? ' ★' : ''}</b><small>${tipo[MMA.ASSINATURAS[id].tipo]} · ${esc(MMA.ASSINATURAS[id].descr)}</small></button>`).join('');
  }

  function cardsMetas(rascunho) {
    return Object.keys(MMA.METAS).filter((id) => !(id === 'duplo' && rascunho.periodo === 'eras')).map((id) => {
      const m = MMA.METAS[id];
      const nome = id === 'campeao' && rascunho.periodo === 'eras' ? 'Rei do ranking' : m.nome;
      const descr = id === 'campeao' && rascunho.periodo === 'eras' ? 'Chegar ao #1 do ranking.' : m.descr;
      return `<button class="card-opcao meta-card" aria-pressed="${rascunho.meta === id}" data-acao="meta-sel" data-valor="${id}"><b>${esc(nome)}</b><small>${esc(descr)}</small><span class="mb"><i>Bônus</i> ${esc(m.bonus)}</span><span class="mp"><i>Preço</i> ${esc(m.preco)}</span></button>`;
    }).join('');
  }

  function telaCriar() {
    if (!rascunho) return telaEra();
    const mod = MMA.MODALIDADES[rascunho.modalidade];
    const bonusTxt = Object.entries(mod.bonus).map(([k, v]) => `+${v} ${MMA.ROTULOS[k]}`).join(' · ');
    const modalidades = Object.entries(MMA.MODALIDADES).map(([id, m]) => `
      <button class="card-opcao" aria-pressed="${rascunho.modalidade === id}" data-acao="modalidade" data-valor="${id}">
        <b>${m.nome}</b><small>${m.descr}</small>
      </button>`).join('');
    const opcoesPais = PAISES.map((p) => `<option value="${esc(p)}"${p === rascunho.pais ? ' selected' : ''}>${esc(p)}</option>`).join('');
    const previa = rascunho.foto
      ? `<img src="${rascunho.foto}" alt="Sua foto">`
      : `<span>${icone('usuario', 44)}</span>`;
    return `${cabecalhoTela(`${PERIODOS[rascunho.periodo].nome} · Passo 2 de 2`, 'Crie seu lutador', `Quem ele é, como luta e onde começa. Os ${MMA.PONTOS_CRIACAO} pontos de habilidade você distribui depois, já na carreira.`)}
      <div class="grade-2">
        ${painel({ titulo: '01 · Quem é ele', icone: 'usuario', i: 0, corpo: `
          <div class="campo-duplo">
            <div class="campo"><label for="nome">Nome</label><input id="nome" type="text" maxlength="20" autocomplete="off" value="${esc(rascunho.nome)}" placeholder="Ex.: Rafael"></div>
            <div class="campo"><label for="sobrenome">Sobrenome</label><input id="sobrenome" type="text" maxlength="24" autocomplete="off" value="${esc(rascunho.sobrenome)}" placeholder="Ex.: Duarte"></div>
          </div>
          <div class="campo"><label for="apelido">Apelido (opcional)</label><input id="apelido" type="text" maxlength="24" autocomplete="off" value="${esc(rascunho.apelido || '')}" placeholder="Ex.: O Trovão"></div>
          <div class="campo-duplo">
            <div class="campo"><label for="pais">País</label><select id="pais">${opcoesPais}</select></div>
            <div class="campo"><label for="cidade">Cidade</label><input id="cidade" type="text" maxlength="40" autocomplete="off" value="${esc(rascunho.cidade)}" placeholder="Ex.: Recife"></div>
          </div>
          <details class="opcional"${rascunho.foto ? ' open' : ''}><summary>Foto e idade (opcional)</summary>
            <div class="upload">
              <div class="upload-previa ${rascunho.foto ? 'tem' : ''}">${previa}</div>
              <div class="upload-acoes">
                <label class="btn secondary upload-btn" for="foto-input">${icone('cima', 18)}<span class="btn-txt">${rascunho.foto ? 'Trocar foto' : 'Enviar foto'}</span></label>
                <input id="foto-input" class="oculto" type="file" accept="image/*">
                ${rascunho.foto ? btn({ texto: 'Remover', acao: 'foto-remover', tipo: 'ghost' }) : ''}
                <small>A foto fica só neste navegador.</small>
              </div>
            </div>
            <div class="campo"><label for="idade">Idade (18 a 40)</label><input id="idade" type="number" min="18" max="40" value="${rascunho.idade}"></div>
          </details>` })}
        ${painel({ titulo: '02 · Como ele luta', icone: 'luva', i: 1, corpo: `
          <div class="campo"><span class="rotulo">Modalidade favorita</span><div class="grade-opcoes">${modalidades}</div></div>
          <p class="bonus-mod">Bônus inicial de ${mod.nome}: <b>${bonusTxt}</b> · estilo: <b>${MMA.ESTILOS[mod.estilo]}</b></p>` })}
      </div>
      ${painel({ titulo: '03 · Categoria de peso', icone: 'balanca', i: 2, cls: 'mt', corpo: `<p class="sub">Escolha onde ele começa. Dá para subir ou descer de categoria depois. Entre parênteses, os melhores da divisão.</p><div class="grade-cat">${cardsCategoria(rascunho.periodo, rascunho.divisaoId)}</div>` })}
      <div class="grade-2">
        ${painel({ titulo: '04 · Traço', icone: 'cima', i: 3, cls: 'mt', corpo: `<p class="sub">Muda como ele luta durante toda a carreira. ★ combina com a modalidade.</p><div class="grade-opcoes um">${cardsTracos(rascunho, mod)}</div>` })}
        ${painel({ titulo: '05 · Golpe de assinatura', icone: 'alvo', i: 4, cls: 'mt', corpo: `<p class="sub">Um golpe especial que você usa uma vez por round, na luta.</p><div class="grade-opcoes um">${cardsAssinaturas(rascunho)}</div>` })}
      </div>
      ${painel({ titulo: '06 · Objetivo de carreira', icone: 'alvo', i: 5, cls: 'mt', corpo: `<p class="sub">Uma meta por vez. Cada uma dá um bônus e cobra um preço; cumprir rende pontos de habilidade e dinheiro.</p><div class="grade-opcoes">${cardsMetas(rascunho)}</div>` })}
      <div class="barra-saldo"><div><div class="kicker">Depois</div><div class="saldo-txt">${MMA.PONTOS_CRIACAO} pontos para distribuir</div></div>${btn({ texto: 'Entrar no octógono', acao: 'criar', tipo: 'primary', trailing: 'seta' })}</div>
      <div class="acoes-linha">${btn({ texto: 'Voltar', acao: 'ir', data: { tela: 'era' }, icone: 'setaEsq' })}</div>`;
  }

  // ---------------------------------------------------------------------------
  // Dashboard de carreira
  // ---------------------------------------------------------------------------


  function plural(n, um, varios) {
    return n === 1 ? um : varios;
  }


  // Barra de XP de um atributo (usada na tela de distribuir pontos).
  function barraXp(c, attr) {
    const xp = (c.xpAtributos || {})[attr] || 0;
    const lim = MMA.limiteAtributo(c.atributos[attr]);
    return { xp, lim, p: pct((xp / lim) * 100) };
  }

  function blocoEvento() {
    const e = carreira.evento;
    if (!e) return '';
    const botoes = e.opcoes.map((o, i) => `<button class="card-opcao evento-op" data-acao="evento" data-indice="${i}"><b>${esc(o.rotulo)}</b><small>${esc(o.resumo)}</small></button>`).join('');
    return painel({ cls: 'evento foco entra', i: 3, corpo: `<div class="kicker gold">Semana de camp · decida</div><h3 class="evento-titulo">${esc(e.titulo)}</h3><p class="sub">${esc(e.texto)}</p><div class="grade-opcoes">${botoes}</div>` });
  }

  function painelNoticias(c, i) {
    const l = (c.noticias || []).slice(0, 5);
    if (!l.length) return '';
    return painel({ titulo: 'Circuito · últimas lutas', icone: 'historico', meta: 'o mundo continua lutando', cls: 'entra', i, corpo: `<ul class="noticias">${l.map((n) => `<li class="${n.titulo ? 'titulo' : ''}"><span>Sem. ${n.semana}</span>${esc(n.texto)}</li>`).join('')}</ul>` });
  }

  // Rivalidades abertas (ranking e hub).
  function painelRivais(c, i) {
    const nomes = Object.keys(c.rivais || {});
    if (!nomes.length) return '';
    const linhas = nomes.sort((a, b) => c.rivais[b].heat - c.rivais[a].heat).map((n) => {
      const r = c.rivais[n];
      return `<li class="heat-${r.heat}">${avatar(n, 'sm')}<div><b>${esc(n)}</b><small>${r.motivo === 'revanche' ? 'Revanche pendente' : 'Provocações'} · desde a sem. ${r.desde}</small></div><span class="pontos-heat" title="Intensidade ${r.heat} de 3">${[1, 2, 3].map((k) => `<u class="${k <= r.heat ? 'on' : ''}"></u>`).join('')}</span></li>`;
    }).join('');
    return painel({ titulo: 'Rivalidades', icone: 'luta', meta: 'quanto mais quente, mais fama e bolsa', cls: 'entra', i, corpo: `<ul class="lista-rivais">${linhas}</ul>` });
  }


  // Barra que anima do valor anterior para o novo (a tela e redesenhada a cada acao).
  function barraAnim(valor, tipo, chave) {
    const de = barrasAnteriores[chave];
    barrasAnteriores[chave] = valor;
    const ini = de === undefined ? valor : de;
    return `<div class="bar ${tipo || ''}"><i style="width:${pct(ini)}%" data-para="${pct(valor)}"></i></div>`;
  }


  // Foto do lutador com o recorte padrao do jogo (sem filtro). O segundo argumento e mantido por compatibilidade.
  function fotoDuo(nome) {
    return window.TELAS_UTIL.foto(UI, nome, 'alta');
  }





  const ETAPA_UI = {
    plano: { nome: 'Treino', icone: 'peso', titulo: 'Plano de treino', sub: 'Onde você põe o esforço antes da luta.' },
    scouting: { nome: 'Scouting', icone: 'lupa', titulo: 'O adversário', sub: 'Estudar ou treinar mais?' },
    evento: { nome: 'Evento', icone: 'calendario', titulo: 'Aconteceu algo', sub: '' },
    corte: { nome: 'Peso', icone: 'balanca', titulo: 'Corte de peso', sub: 'A pesagem está chegando.' },
    pesagem: { nome: 'Pesagem', icone: 'balanca', titulo: 'Pesagem oficial e encarada', sub: 'A balança decide o corte; o resto é jogo mental.' },
    coletiva: { nome: 'Coletiva', icone: 'pessoas', titulo: 'Coletiva de imprensa', sub: 'Como você trata o rival diante das câmeras?' },
  };






  // ---------------------------------------------------------------------------
  // Meta, ganchos ("so mais uma"), recompensas e habilidades
  // ---------------------------------------------------------------------------

  const RARIDADE = { comum: 'comum', raro: 'raro', 'épico': 'epico', 'lendário': 'lendario' };
  const ICONE_RECOMPENSA = { performance: 'raio', luta_noite: 'estrela', patrocinio: 'dinheiro', viral: 'pessoas', relampago: 'raio', mentor: 'estrela', meta: 'trofeu' };
  const ICONE_GANCHO = { rival: 'luta', bonus: 'raio', ranking: 'cima', titulo: 'cinturao', nivel: 'estrela', fama: 'pessoas', habilidade: 'arvore', pontos: 'mais', traco: 'alvo', meta: 'alvo' };


  // Recompensas da noite (bonus de desempenho, drops raros e meta cumprida).
  function painelRecompensas(u) {
    const lista = (u.recompensas || []).slice();
    if (u.meta) lista.push({ tipo: 'meta', raridade: 'épico', titulo: 'Meta cumprida: ' + u.meta.nome, texto: 'Prêmio da meta: +' + u.meta.pontosHab + ' pontos de habilidade.', valor: u.meta.dinheiro, famaGanha: u.meta.fama });
    if (!lista.length) return '';
    const cards = lista.map((r, i) => {
      const rar = RARIDADE[r.raridade] || 'comum';
      const partes = [];
      if (r.valor) partes.push(`<b class="rec-valor">+$${r.valor.toLocaleString('pt-BR')}</b>`);
      if (r.famaGanha) partes.push(`<b class="rec-fama">+${r.famaGanha} de fama</b>`);
      return `<article class="rec-card rar-${rar}" style="--i:${i}">
        <span class="rec-ico">${icone(ICONE_RECOMPENSA[r.tipo] || 'estrela', 26)}</span>
        <div class="rec-corpo"><span class="rec-rar">${esc(r.raridade)}</span><h4>${esc(r.titulo)}</h4><p>${esc(r.texto || '')}</p>${partes.length ? `<div class="rec-ganhos">${partes.join('')}</div>` : ''}</div>
      </article>`;
    }).join('');
    return painel({ cls: 'recompensas entra', i: 2, titulo: 'Recompensas da noite', icone: 'presente', meta: 'nem toda luta paga igual', corpo: `<div class="rec-lista">${cards}</div>` });
  }

  // "So mais uma": o que ficou perto e a proxima luta, a um toque do camp.
  function painelProximo(u, c) {
    if (c.aposentado) return '';
    const ganchos = MMA.ganchos(c);
    if (!ganchos.length) return '';
    const prin = ganchos[0];
    const resto = ganchos.slice(1, 4);
    const prox = !c.agendada && !c.lesao ? MMA.proximaOferta(c) : null;
    let cartaz = '';
    if (prox) {
      const f = fichaAdversario(prox.op, c);
      const semanas = Math.max(MMA.MIN_PREPARO, prox.semanasAte);
      const tags = [prox.titulo ? '<span class="tag-ouro">Cinturão</span>' : '', prox.bonus ? '<span class="tag-raio">Luta-relâmpago</span>' : '', prox.rival ? `<span class="tag-fogo">${(c.rivais[prox.op.nome] || {}).motivo === 'revanche' ? 'Revanche' : 'Rivalidade'}</span>` : ''].join('');
      cartaz = `<div class="prox-luta${prox.titulo ? ' titulo' : ''}${prox.bonus ? ' bonus' : ''}">
        <div class="prox-foto">${fotoDuo(prox.op.nome, 'b')}<span class="oc-rank">#${prox.rank}</span></div>
        <div class="prox-corpo"><div class="oc-tags">${tags}</div><h4>${esc(prox.op.nome)}</h4><small>${MMA.ESTILOS[prox.op.estilo] || ''} · Overall ${prox.op.rating} · ${badge(f.chance.rotulo, f.chance.cls)} · luta em ${semanas} sem. · bolsa <b>$${prox.bolsa.toLocaleString('pt-BR')}</b></small></div>
        ${btn({ texto: 'Aceitar e começar o camp', acao: 'proxima-luta', data: { id: prox.id }, tipo: 'primary', icone: 'luta', trailing: 'seta', cls: 'pulsa' })}
      </div>`;
    } else if (c.lesao) {
      cartaz = `<div class="prox-luta recupera"><div class="prox-corpo"><h4>Em recuperação</h4><small>${esc(c.lesao.nome)}: faltam ${c.lesao.semanas} ${plural(c.lesao.semanas, 'semana', 'semanas')}. A academia de fisioterapia acelera a cura.</small></div></div>`;
    }
    const mais = resto.map((x) => (x.acao
      ? `<li class="t-${x.tipo}"><button data-acao="ir" data-tela="${x.acao}">${icone(ICONE_GANCHO[x.tipo] || 'alvo', 16)}<span>${esc(x.texto)}</span>${icone('chevronDir', 14)}</button></li>`
      : `<li class="t-${x.tipo}"><div>${icone(ICONE_GANCHO[x.tipo] || 'alvo', 16)}<span>${esc(x.texto)}</span></div></li>`)).join('');
    return `<section class="painel so-mais-uma foco entra" style="--i:4">
      <div class="kicker gold">Só mais uma</div>
      <h3 class="smu-titulo">${esc(prin.texto)}</h3>
      ${mais ? `<ul class="smu-lista">${mais}</ul>` : ''}
      ${cartaz}
    </section>`;
  }

  // Um no da arvore de habilidades.
  function noHab(id) {
    const c = carreira;
    const h = MMA.HABILIDADES[id];
    const e = MMA.estadoHab(c, id);
    const armado = habConfirm === id && e.estado === 'livre';
    const tipoNo = h.tier === 1 ? 'Início do ramo' : h.tier === 2 ? 'Escolha uma' : 'Maestria';
    const tat = h.tatica ? `<u class="tag-hab">Nova tática: ${esc(MMA.ESTRATEGIAS[h.tatica] ? MMA.ESTRATEGIAS[h.tatica].nome : MMA.TATICAS_CHAO[h.tatica].nome)}</u>` : '';
    const estado = e.estado === 'tem' ? '<em class="est tem">Aprendida</em>'
      : e.estado === 'livre' ? (armado ? '<em class="est armado">Toque de novo para confirmar (1 ponto)</em>' : `<em class="est livre">${(c.pontosHab || 0) > 0 ? 'Disponível · 1 ponto' : 'Disponível · sem pontos'}</em>`)
        : `<em class="est ${e.estado}">${esc(e.motivo || '')}</em>`;
    return `<button class="no-hab ${e.estado}${armado ? ' armado' : ''}" data-acao="aprender" data-id="${id}" aria-label="${esc(h.nome)}"><span class="no-tier">${tipoNo}</span><b>${esc(h.nome)}</b><p>${esc(h.descr)}</p>${tat}${estado}</button>`;
  }

  function painelMeta(c) {
    const p = MMA.metaProgresso(c);
    const feitas = (c.metasCumpridas || []).map((id) => MMA.METAS[id] ? MMA.METAS[id].nome : id);
    const rodape = feitas.length ? `<p class="metas-feitas">Metas cumpridas: ${feitas.map(esc).join(', ')}.</p>` : '';
    if (p) {
      const m = MMA.metasDisponiveis(c).find((x) => x.id === p.id);
      return painel({ cls: 'entra', i: 1, titulo: 'Meta de carreira', icone: 'alvo', meta: 'uma por vez', corpo: `<div class="meta-atual"><div><b class="meta-nome">${esc(p.nome)}</b><small>${esc(m.descr)}</small></div><div class="meta-barra">${barra(p.progresso * 100, 'aviso')}<small>${esc(p.texto)}</small></div></div><div class="meta-dupla"><div class="meta-bonus"><span>Bônus</span>${esc(m.bonus)}</div><div class="meta-preco"><span>Preço</span>${esc(m.preco)}</div></div><p class="sub">Ao cumprir: +3 pontos de habilidade, +$15.000 e fama. Depois você escolhe outra meta.</p>${rodape}` });
    }
    const cards = MMA.metasDisponiveis(c).map((m) => `<button class="card-opcao meta-card" data-acao="meta-escolher" data-id="${m.id}"${m.ok ? '' : ' disabled'}><b>${esc(m.nome)}</b><small>${esc(m.descr)}</small><span class="mb"><i>Bônus</i> ${esc(m.bonus)}</span><span class="mp"><i>Preço</i> ${esc(m.preco)}</span>${m.ok ? '' : `<em class="razao">${esc(m.motivo)}</em>`}</button>`).join('');
    return painel({ cls: 'entra', i: 1, titulo: 'Escolha sua meta de carreira', icone: 'alvo', meta: 'cada meta dá um bônus e cobra um preço', corpo: `<div class="grade-opcoes">${cards}</div>${rodape}` });
  }

  function telaHabilidades() {
    const c = carreira;
    const pts = c.pontosHab || 0;
    const hib = MMA.estiloHibrido(c);
    const ramos = Object.keys(MMA.RAMOS).map((ramo, ri) => {
      const ids = Object.keys(MMA.HABILIDADES).filter((id) => MMA.HABILIDADES[id].ramo === ramo);
      const t1 = ids.filter((id) => MMA.HABILIDADES[id].tier === 1);
      const t2 = ids.filter((id) => MMA.HABILIDADES[id].tier === 2);
      const t3 = t2.map((id) => ids.find((x) => MMA.HABILIDADES[x].req === id));
      return `<section class="ramo entra" style="--i:${ri}"><header><h3>${esc(MMA.RAMOS[ramo].nome)}</h3><small>${esc(MMA.RAMOS[ramo].descr)}</small></header>
        <div class="ramo-arvore"><div class="nivel t1">${t1.map(noHab).join('')}</div><i class="liga"></i><div class="nivel t2">${t2.map(noHab).join('')}</div><i class="liga"></i><div class="nivel t3">${t3.map(noHab).join('')}</div></div></section>`;
    }).join('');
    const estilo = hib
      ? `<div class="hibrido"><span>Seu estilo</span><b>${esc(hib.nome)}</b><small>${esc(hib.descr)}</small></div>`
      : `<div class="hibrido vazio"><span>Seu estilo</span><b>Ainda sem rótulo</b><small>Aprenda 2 habilidades no mesmo ramo, ou combine ramos, para virar um estilo híbrido.</small></div>`;
    return `${cabecalhoTela('Evolução de estilo', 'Habilidades', 'Cada escolha abre um caminho e fecha outro. Táticas novas aparecem durante a luta; as maestrias são para uma só por carreira.')}
      <section class="hab-topo entra">
        <div class="hab-pontos"><span>Pontos de habilidade</span><b class="pts-hab">${pts}</b><small>Ganhe subindo de nível, no 1º cinturão de cada categoria, subindo de fama e cumprindo metas.</small></div>
        ${estilo}
      </section>
      ${painelMeta(c)}
      <div class="grade-ramos">${ramos}</div>
      <div class="acoes-linha">${btn({ texto: 'Voltar', acao: 'ir', data: { tela: 'hub' }, icone: 'setaEsq' })}</div>`;
  }

  // Subida de nivel pendente (de luta, camp ou evento): aparece depois que a tela atual foi lida.
  let celebrando = false;
  function celebrarPendentes() {
    const c = carreira;
    if (!c || tela === 'luta' || celebrando) return;
    const nivel = c.celebrarNivel;
    if (nivel && window.Celebra) {
      c.celebrarNivel = null;
      salvar();
      celebrando = true;
      setTimeout(() => {
        Celebra.nivel(nivel).then(() => { celebrando = false; });
      }, tela === 'resultado' ? 900 : 350);
    }
  }


  // ---------------------------------------------------------------------------
  // Combate
  // ---------------------------------------------------------------------------

  function telaHub() {
    return window.TELAS.hub(UI);
  }

  function telaLuta() {
    if (!luta) return telaHub();
    return '<div id="arena-mount" class="arena-mount"></div>';
  }

  // Monta a luta ao vivo (js/luta-ui.js) depois que a tela foi desenhada.
  function montarLuta() {
    const c = carreira;
    const k = oponente.lutador && oponente.lutador.cartel;
    const ev = c.agendada && c.agendada.evento;
    const meuCard = ev ? ev.card.find((l) => l.jogador) : null;
    const cmp = MMA.comparacao(c, oponente);
    const dadosB = POR_NOME[oponente.nome];
    LutaUI.montar(document.getElementById('arena-mount'), {
      MMA: MMA,
      luta: luta,
      titulo: titulo,
      nomeA: c.nome,
      nomeB: oponente.nome,
      apelidoA: c.apelido || null,
      apelidoB: dadosB && dadosB.apelido ? dadosB.apelido : null,
      subA: `${categoriaAtual(c)} · ${c.recorde.v}-${c.recorde.d}-${c.recorde.e}`,
      subB: `${categoriaAtual(c)}${k && k.vitorias != null && k.derrotas != null ? ` · ${k.vitorias}-${k.derrotas}` : ''}`,
      fotoA: fotoSrc(c.nome),
      fotoB: fotoSrc(oponente.nome),
      corIniA: corDoNome(c.nome), corIniB: corDoNome(oponente.nome),
      eventoNome: ev ? ev.nome + (ev.subtitulo ? ' · ' + ev.subtitulo : '') : 'Noite de luta',
      apresentacao: MMA.apresentacaoLuta(c, oponente, titulo),
      bloco: meuCard ? meuCard.bloco : '',
      sugestao: cmp.sugestao.id,
      sugestaoMotivo: cmp.sugestao.motivo,
      campeaoAntes: !!c.campeao,
      cinturoes: MMA.cinturoesSeVencer(c),
      aoSalvar: () => { c.lutaAtiva.luta = luta.toJSON(); salvar(); },
      aoConcluir: () => acao('concluir', {}),
    });
  }

  // Revela os eventos do round um a um, com golpe e impacto nos combatentes.
  // ---------------------------------------------------------------------------
  // Resultado da luta
  // ---------------------------------------------------------------------------

  function resumoLuta(u) {
    const itens = [];
    u.rodadas.forEach((rd) => {
      rd.eventos.forEach((e, idx) => {
        if (e.tipo === 'destaque' || idx === 0) itens.push({ round: rd.num, texto: e.texto, destaque: e.tipo === 'destaque' });
      });
    });
    return itens;
  }

  function tabelaEstatLuta(u) {
    const linha = (rot, a, b, melhor) => `<div class="est-linha${melhor === 1 ? ' a' : melhor === -1 ? ' b' : ''}"><b>${a}</b><span>${rot}</span><b>${b}</b></div>`;
    const [ea, eb] = u.est;
    const apr = (e) => (e.tentativas ? Math.round((e.acertos / e.tentativas) * 100) : 0);
    const cmp = (x, y) => (x === y ? 0 : x > y ? 1 : -1);
    return `<div class="est-comparacao"><div class="est-linha cab"><b>${esc(u.nomeA.split(' ').slice(-1)[0])}</b><span>Estatísticas da luta</span><b>${esc(u.nomeB.split(' ').slice(-1)[0])}</b></div>
      ${linha('Golpes significativos', `${ea.acertos}/${ea.tentativas} (${apr(ea)}%)`, `${eb.acertos}/${eb.tentativas} (${apr(eb)}%)`, cmp(ea.acertos, eb.acertos))}
      ${linha('Quedas (feitas/tentadas)', `${ea.quedasOk}/${ea.quedasTent}`, `${eb.quedasOk}/${eb.quedasTent}`, cmp(ea.quedasOk, eb.quedasOk))}
      ${linha('Finalizações (feitas/tentadas)', `${ea.subOk}/${ea.subTent}`, `${eb.subOk}/${eb.subTent}`, cmp(ea.subTent, eb.subTent))}
      ${linha('Controle no chão (trocas)', ea.chaoTempo, eb.chaoTempo, cmp(ea.chaoTempo, eb.chaoTempo))}
    </div>`;
  }

  function roundARound(u) {
    return `<div class="rounds-detalhe">${u.rodadas.map((rd) => `<div class="round-bloco"><h4><span>Round ${rd.num}</span><span>${rd.placar[0]} – ${rd.placar[1]}</span></h4><ol>${rd.eventos.map((e) => `<li class="${e.tipo === 'destaque' ? 'destaque' : ''}">${esc(e.texto)}</li>`).join('')}</ol></div>`).join('')}</div>`;
  }

  // Replay em texto: os lances mais importantes da luta, em ordem, com o round de cada um.
  function melhoresMomentos(u) {
    const pontos = (e) => {
      if (e.tipo2 === 'ko') return 100;
      if (e.tipo2 === 'sub') return 95;
      if (e.tipo2 === 'medico') return 85;
      if (e.tipo2 === 'corte') return 60;
      if (e.tipo2 === 'raspa') return 55;
      if (e.tipo2 === 'queda') return 45;
      if (e.tipo2 === 'golpe' || e.tipo2 === 'chao_golpe') return (e.valor || 0) * 6 + (e.assinatura ? 25 : 0) + (e.contra ? 8 : 0);
      return 0;
    };
    const todos = [];
    u.rodadas.forEach((rd) => rd.eventos.forEach((e, i) => { const p = pontos(e); if (p >= 30) todos.push({ rd: rd.num, i: i, e: e, p: p }); }));
    if (!todos.length) return '';
    const top = todos.slice().sort((a, b) => b.p - a.p).slice(0, 5).sort((a, b) => a.rd - b.rd || a.i - b.i);
    const lista = top.map((m) => `<li class="${m.e.ator === 0 ? 'eu' : m.e.ator === 1 ? 'ele' : ''}${m.p >= 85 ? ' decisivo' : ''}"><span class="mm-r">R${m.rd}</span><span class="mm-t">${esc(m.e.texto)}</span></li>`).join('');
    return painel({ cls: 'entra', i: 3, titulo: 'Melhores momentos', icone: 'estrela', meta: 'os lances que marcaram a luta', corpo: `<ol class="momentos">${lista}</ol>` });
  }

  // Cartoes dos juizes, um por linha de juiz com o total e quem eles deram.
  function cartoesJuizes(u) {
    if (!u.cartoes || !/^Decisão|Empate/.test(u.metodo)) return '';
    return `<div class="juizes">${u.cartoes.map((k, i) => `<span class="${k[0] > k[1] ? 'a' : k[1] > k[0] ? 'b' : ''}"><small>Juiz ${i + 1}</small><b>${k[0]}–${k[1]}</b></span>`).join('')}</div>`;
  }

  // Resultado de cada luta do card (a do jogador e as simuladas).
  function cardResultados(u) {
    const ev = u.evento;
    if (!ev || !ev.card) return '';
    const linhas = ev.card.filter((l) => l.resultado).map((l) => {
      const r = l.resultado;
      const venc = r.vencedor;
      const a = l.a.nome;
      const b = l.b.nome;
      return `<li class="${l.jogador ? 'meu' : ''}"><span class="rc-nomes"><b class="${venc === a ? 'v' : ''}">${esc(a)}</b><i>vs</i><b class="${venc === b ? 'v' : ''}">${esc(b)}</b></span><small>${esc(venc ? 'Vence ' + venc.split(' ').slice(-1)[0] : 'Empate')} · ${esc(r.metodo || '')}${r.titulo ? ' · Cinturão' : ''}</small></li>`;
    }).join('');
    if (!linhas) return '';
    return painel({ cls: 'entra', i: 3, titulo: esc(ev.nome), icone: 'calendario', meta: esc(MMA.dataTexto(ev.data, true)), corpo: `<ul class="card-res">${linhas}</ul>` });
  }

  function telaResultado() {
    const u = ultimaLuta;
    if (!u) return telaHub();
    const c = carreira;
    const cls = u.venceu ? 'venceu' : u.empatou ? 'empate' : 'perdeu';
    const txt = u.venceu ? 'Vitória' : u.empatou ? 'Empate' : 'Derrota';
    const fim = u.metodo === 'Nocaute' || u.metodo === 'Finalização';
    const quem = u.venceu ? u.nomeA : u.empatou ? null : u.nomeB;
    const sobrenome = (n) => n.split(' ').slice(-1)[0];
    const metodoTxt = esc(u.metodo) + (u.detalhe ? ' (' + esc(u.detalhe) + ')' : '');
    const quando = fim ? `Round ${u.round} · ${esc(u.tempo || '')}` : `${u.rodadasTotais} rounds`;
    const d = u.depois;
    const a = u.antes;
    const stat = (rot, antes, depois, bom) => `<div class="cons"><small>${rot}</small><b>${antes === depois ? depois : `${antes} <i>→</i> ${depois}`}</b>${bom ? `<em class="${bom}"></em>` : ''}</div>`;
    const pos = c.posLutaPendente;
    const posLuta = pos ? painel({
      cls: 'pos-luta entra', i: 3, titulo: 'Depois da luta', icone: 'pessoas', meta: 'as câmeras estão ligadas',
      corpo: `<p class="sub">O que você diz sobre <b>${esc(pos.oponente)}</b>?</p><div class="grade-opcoes">
        <button class="card-opcao" data-acao="pos-luta" data-tipo="respeito"><b>${pos.venceu ? 'Elogiar o rival' : 'Reconhecer a derrota'}</b><small>Fama ${pos.venceu ? '+6' : '+2'}. Sem rivalidade.</small></button>
        <button class="card-opcao" data-acao="pos-luta" data-tipo="quente"><b>${pos.venceu ? 'Provocar o rival' : 'Exigir a revanche'}</b><small>Fama ${pos.venceu ? '+14' : '+5'} e a rivalidade esquenta.</small></button></div>` }) : '';
    const campeaoNovo = u.titulo && u.venceu;
    const f = MMA.nivelFama(c);

    // Vitoria de titulo: a tela do campeao com a foto real do cinturao e a historia da conquista.
    const L = campeaoNovo ? MMA.legado(c) : null;
    const duplo = campeaoNovo && L.categoriasCampeao.length >= 2;
    const historia = campeaoNovo
      ? `${esc(u.nomeA)} ${u.defendeu ? 'defendeu o cinturão' : 'conquistou o cinturão'} da categoria ${esc(categoriaAtual(c))} ao vencer ${esc(u.nomeB)} por ${metodoTxt.toLowerCase()}${fim ? ` no round ${u.round}, aos ${esc(u.tempo || '')}` : ''}${u.evento ? `, no ${esc(u.evento.nome)}` : ''}. ${u.defendeu ? `É a ${c.defesas}ª defesa seguida.` : `Cartel agora: ${c.recorde.v}-${c.recorde.d}-${c.recorde.e}.`}`
      : '';
    const heroCampeao = campeaoNovo && window.Celebra
      ? `<section class="res-campeao entra">${Celebra.fotoCinturao(duplo ? 2 : 1, `<div class="kicker">${u.defendeu ? 'Cinturão defendido' : 'Cinturão conquistado'}</div><h2 class="resultado-grande">${duplo ? 'Campeão em duas categorias' : u.defendeu ? 'Título defendido' : 'Novo campeão'}</h2>`)}<div class="rc-quem">${fotoDuo(u.nomeA)}<div><b>${esc(u.nomeA)}</b>${c.apelido ? `<small>“${esc(c.apelido)}”</small>` : ''}<span>${duplo ? esc(L.categoriasCampeao.join(' e ')) : esc(categoriaAtual(c))} · ${c.recorde.v}-${c.recorde.d}-${c.recorde.e}${c.defesas ? ` · ${c.defesas} ${plural(c.defesas, 'defesa', 'defesas')}` : ''}</span></div></div><p class="res-historia">${historia}</p></section>`
      : '';

    return `${heroCampeao}<section class="res-oficial ${cls}${campeaoNovo ? ' campeao' : ''} entra">
        <div class="ro-topo"><span class="kicker">${u.titulo ? 'Luta pelo cinturão' : 'Resultado oficial'}</span>${u.evento ? `<span>${esc(u.evento.nome)} · ${esc(MMA.dataTexto(u.evento.data, true))}</span>` : ''}</div>
        <div class="ro-duelo">
          <figure class="ro-lado${u.venceu ? ' vencedor' : ''}">${fotoDuo(u.nomeA, 'a')}<figcaption><b>${esc(sobrenome(u.nomeA))}</b><small>${esc(u.cartelA)}</small>${u.venceu ? '<span class="ro-selo">Vencedor</span>' : ''}</figcaption></figure>
          <div class="ro-meio"><h2>${txt}</h2><p class="ro-metodo">${quem ? esc(sobrenome(quem)) + ' vence por ' : 'Luta termina '}${metodoTxt.toLowerCase()}</p><p class="ro-quando">${quando}</p><div class="res-placar">${u.totais[0]} – ${u.totais[1]}</div></div>
          <figure class="ro-lado${!u.venceu && !u.empatou ? ' vencedor' : ''}">${fotoDuo(u.nomeB, 'b')}<figcaption><b>${esc(sobrenome(u.nomeB))}</b><small>${esc(u.cartelB)}</small>${!u.venceu && !u.empatou ? '<span class="ro-selo">Vencedor</span>' : ''}</figcaption></figure>
        </div>
        ${cartoesJuizes(u)}
      </section>
      <div class="res-colunas">
        ${painel({ cls: 'entra', i: 1, titulo: 'Estatísticas', icone: 'barras', corpo: tabelaEstatLuta(u) })}
        ${painel({ cls: 'entra', i: 2, titulo: 'O que mudou', icone: 'historico', corpo: `<div class="consequencias">
          ${stat('Cartel', `${a.recorde.v}-${a.recorde.d}-${a.recorde.e}`, `${d.recorde.v}-${d.recorde.d}-${d.recorde.e}`, u.venceu ? 'sobe' : u.empatou ? '' : 'desce')}
          ${stat('Ranking', MMA.rotuloRank(c.periodo, a.pos), MMA.rotuloRank(c.periodo, d.pos), a.pos && d.pos && d.pos !== a.pos ? (d.pos < a.pos ? 'sobe' : 'desce') : '')}
          ${stat('Pontos no ranking', a.pontos, d.pontos, d.pontos > a.pontos ? 'sobe' : d.pontos < a.pontos ? 'desce' : '')}
          ${stat('Bolsa', '$0', '+$' + (u.bolsa || 0).toLocaleString('pt-BR'), '')}
          ${stat('Fama', f.nome, u.fama ? sinal(u.fama) + ' pts' : 'sem mudança', u.fama > 0 ? 'sobe' : u.fama < 0 ? 'desce' : '')}
          ${stat('Experiência', a.xp, d.xp, d.xp > a.xp ? 'sobe' : '')}
          ${stat('Nível', a.nivel, d.nivel, d.nivel > a.nivel ? 'sobe' : '')}
          ${stat('Energia', Math.round(a.energia), Math.round(d.energia), d.energia < a.energia ? 'desce' : '')}
          ${(() => { const cond = u.lesao ? 'Lesão: ' + esc(u.lesao) : u.dano >= 60 ? 'Muito castigado' : u.dano >= 30 ? 'Castigado' : 'Sem lesões'; return stat('Condição física', cond, cond, u.lesao ? 'desce' : ''); })()}
        </div>
        <div class="res-extras">
          ${u.nivelFamaSubiu ? `<div class="res-destaque ouro">Sua fama subiu: agora você é <b>${f.nome}</b>.</div>` : ''}
          ${u.pontosHabGanhos > 0 ? `<div class="res-destaque azul">+${u.pontosHabGanhos} ${plural(u.pontosHabGanhos, 'ponto', 'pontos')} de habilidade <button class="fp-link" data-acao="ir" data-tela="habilidades">Gastar agora</button></div>` : ''}
          ${d.pontosDist > a.pontosDist ? `<div class="res-destaque azul">+${d.pontosDist - a.pontosDist} ponto para distribuir <button class="fp-link" data-acao="ir" data-tela="distribuir">Distribuir</button></div>` : ''}
          ${u.rivalidade ? `<div class="res-destaque fogo">${esc(u.rivalidade)}</div>` : ''}
          ${u.titulo && !u.venceu ? `<div class="res-destaque alerta">Cinturão: ${u.empatou ? 'mantido pelo campeão' : 'não conquistado'}</div>` : ''}
        </div>` })}
      </div>
      ${melhoresMomentos(u)}
      ${painelRecompensas(u)}
      ${cardResultados(u)}
      ${posLuta}
      ${painelProximo(u, c)}
      <div class="resultado-botoes sozinho">
        ${btn({ texto: 'Ir para a carreira', acao: 'ir', data: { tela: 'hub' }, tipo: carreira.agendada || c.lesao || !MMA.proximaOferta(c) ? 'primary' : 'secondary', trailing: 'seta', cls: 'grande' })}
        ${btn({ texto: detalhesLuta ? 'Ocultar round a round' : 'Ver round a round', acao: 'resultado-detalhes', icone: 'barras', cls: 'bloco', aria: `aria-expanded="${detalhesLuta}"` })}
      </div>
      ${detalhesLuta ? painel({ cls: 'entra', titulo: 'Round a round', icone: 'barras', corpo: `<div class="resumo-luta">${resumoLuta(u).map((r) => `<div class="linha-resumo ${r.destaque ? 'destaque' : ''}"><span class="rr">R${r.round}</span><span class="pt"></span><span class="tx">${esc(r.texto)}</span></div>`).join('')}</div>${roundARound(u)}` }) : ''}`;
  }

  // ---------------------------------------------------------------------------
  // Estatisticas, distribuicao, categoria, hall
  // ---------------------------------------------------------------------------

  const ICONE_ACADEMIA = { ginasio: 'peso', tecnico: 'alvo', fisio: 'escudo', nutri: 'raio', preparador: 'folego' };

  function telaAcademia() {
    const c = carreira;
    const cards = Object.keys(MMA.ACADEMIA).map((id, i) => {
      const a = MMA.ACADEMIA[id];
      const n = MMA.nivelAcademia(c, id);
      const custo = MMA.custoAcademia(c, id);
      const falta = custo !== null && c.dinheiro < custo;
      return `<article class="acad-card entra" style="--i:${i}">
        <div class="acad-ico">${icone(ICONE_ACADEMIA[id], 30)}</div>
        <h3>${a.nome}</h3><p>${a.descr}</p>
        <div class="acad-niveis">${[1, 2, 3].map((k) => `<u class="${k <= n ? 'on' : ''}"></u>`).join('')}<span>Nível ${n} de 3</span></div>
        ${custo === null ? '<div class="acad-max">Nível máximo</div>' : btn({ texto: `Melhorar · $${custo.toLocaleString('pt-BR')}`, acao: 'comprar-academia', data: { id }, tipo: 'primary', disabled: falta })}
        ${falta ? `<small class="motivo">Faltam $${(custo - c.dinheiro).toLocaleString('pt-BR')}</small>` : ''}
      </article>`;
    }).join('');
    return `${cabecalhoTela('Estrutura', 'Academia', `Invista as bolsas em melhorias permanentes. Você tem <b>$${c.dinheiro.toLocaleString('pt-BR')}</b>.`)}
      <div class="grade-acad">${cards}</div>
      <div class="acoes-linha">${btn({ texto: 'Voltar', acao: 'ir', data: { tela: 'hub' }, icone: 'setaEsq' })}</div>`;
  }

  function telaTracos() {
    const c = carreira;
    const livresT = MMA.tracosPendentes(c);
    const livresA = MMA.assinaturasPendentes(c);
    const sug = MMA.SUGESTOES_MODALIDADE[c.modalidade || 'mma'] || MMA.SUGESTOES_MODALIDADE.mma;
    const tipo = { golpe: 'Golpe', queda: 'Queda', finalizacao: 'Finalização' };
    const meusT = c.tracos.map((id) => `<li><b>${esc(MMA.TRACOS[id].nome)}</b><small>${esc(MMA.TRACOS[id].descr)}</small></li>`).join('');
    const vaziosT = Array.from({ length: livresT }, () => '<li class="vazio-slot"><b>Vaga livre</b><small>Escolha um traço abaixo.</small></li>').join('');
    const proxT = MMA.slotsTracos(c) < 3 ? `Próxima vaga de traço com a fama ${MMA.slotsTracos(c) < 2 ? 'Estrela' : 'Lenda'}.` : 'Todas as vagas de traço abertas.';
    const proxA = MMA.slotsAssinatura(c) < 2 ? 'Segundo golpe de assinatura com a fama Superstar.' : 'Todas as vagas de assinatura abertas.';
    const disponiveisT = Object.keys(MMA.TRACOS).filter((id) => c.tracos.indexOf(id) < 0).map((id) => `<article class="traco-card ${sug.tracos.indexOf(id) >= 0 ? 'sug' : ''}"><b>${esc(MMA.TRACOS[id].nome)}${sug.tracos.indexOf(id) >= 0 ? ' ★' : ''}</b><p>${esc(MMA.TRACOS[id].descr)}</p>${btn({ texto: 'Escolher', acao: 'escolher-traco', data: { id }, disabled: livresT <= 0 })}</article>`).join('');
    const minhasA = c.assinaturas.map((id, i) => `<li class="${(c.assinaturaAtiva || 0) === i ? 'ativa' : ''}"><b>${esc(MMA.ASSINATURAS[id].nome)}</b><small>${tipo[MMA.ASSINATURAS[id].tipo]} · ${esc(MMA.ASSINATURAS[id].descr)}</small>${c.assinaturas.length > 1 ? ((c.assinaturaAtiva || 0) === i ? '<em>Equipado na luta</em>' : btn({ texto: 'Equipar', acao: 'assinatura-ativa', data: { id } })) : ''}</li>`).join('');
    const disponiveisA = Object.keys(MMA.ASSINATURAS).filter((id) => c.assinaturas.indexOf(id) < 0).map((id) => `<article class="traco-card ${sug.assinaturas.indexOf(id) >= 0 ? 'sug' : ''}"><b>${esc(MMA.ASSINATURAS[id].nome)}${sug.assinaturas.indexOf(id) >= 0 ? ' ★' : ''}</b><p>${tipo[MMA.ASSINATURAS[id].tipo]} · ${esc(MMA.ASSINATURAS[id].descr)}</p>${btn({ texto: 'Escolher', acao: 'escolher-assinatura', data: { id }, disabled: livresA <= 0 })}</article>`).join('');
    return `${cabecalhoTela('Estilo de luta', 'Traços e golpes', 'Seus traços valem em toda luta. O golpe de assinatura entra uma vez por round.')}
      <div class="grade-2">
        ${painel({ titulo: 'Seus traços', icone: 'cima', i: 0, meta: proxT, corpo: `<ul class="lista-tracos">${meusT}${vaziosT}</ul>` })}
        ${painel({ titulo: 'Golpe de assinatura', icone: 'alvo', i: 1, meta: proxA, corpo: `<ul class="lista-tracos">${minhasA || '<li class="vazio-slot"><b>Vaga livre</b><small>Escolha um golpe abaixo.</small></li>'}${livresA > 0 && minhasA ? '<li class="vazio-slot"><b>Vaga livre</b><small>Escolha mais um golpe abaixo.</small></li>' : ''}</ul>` })}
      </div>
      ${painel({ titulo: 'Traços disponíveis', icone: 'mais', i: 2, cls: 'mt', corpo: `<div class="grade-tracos">${disponiveisT || '<p class="vazio">Você já tem todos os traços.</p>'}</div>` })}
      ${painel({ titulo: 'Golpes disponíveis', icone: 'mais', i: 3, cls: 'mt', corpo: `<div class="grade-tracos">${disponiveisA || '<p class="vazio">Você já tem todos os golpes.</p>'}</div>` })}
      <div class="acoes-linha">${btn({ texto: 'Voltar', acao: 'ir', data: { tela: 'hub' }, icone: 'setaEsq' })}</div>`;
  }

  function telaPerfil() {
    const c = carreira;
    const grupos = GRUPOS_ATRIBUTOS.map((g, gi) => painel({
      titulo: g.nome, i: gi, cls: 'entra',
      corpo: `<div class="lista-attr">${g.chaves.map((k) => `<div class="attr-barra"><div class="rotulo-linha"><span>${MMA.ROTULOS[k]}</span><b>${c.atributos[k]}</b></div>${barra(c.atributos[k], c.atributos[k] >= 75 ? 'ok' : c.atributos[k] < 50 ? 'aviso' : '')}</div>`).join('')}</div>`,
    })).join('');
    return `${faixaLutador(c)}
      <div class="hub-corpo">${perfilCard(c, ESTILO_DESC[c.estilo], 2)}${colunaEstatisticas(c)}</div>
      <div class="grade-3">${grupos}</div>
      ${painel({ cls: 'entra', i: 4, titulo: 'Histórico de lutas', icone: 'historico', meta: `${c.historico.length} luta(s)`, corpo: tabelaHistorico(c, 10) })}
      <div class="acoes-linha">${btn({ texto: 'Voltar à carreira', acao: 'ir', data: { tela: 'hub' }, icone: 'setaEsq' })}</div>`;
  }

  // Efeito, em uma frase, de cada atributo, a partir das formulas do motor.
  function efeitoAtributo(k) {
    const f = {
      striking: 'Golpes em pé: +0,8 p.p. de chance de acerto contra defesa média.',
      velocidade: 'Iniciativa: ganha mais as trocas e acerta mais golpes.',
      resistencia: 'Fôlego: gasta cerca de 0,5% menos fôlego por troca.',
      queixo: 'Queixo: resiste melhor ao nocaute e demora mais para cair.',
      grappling: 'Controle no chão: +0,6 p.p. de chance de manter o adversário preso.',
      bjj: 'Finalização: +0,3 p.p. por tentativa, e escapa melhor das suas.',
      wrestling: 'Quedas: +1,3 p.p. de chance de levar o adversário ao chão.',
      defesa: 'Defesa de queda: o adversário tem 1,3 p.p. menos de chance de te derrubar.',
      forca: 'Potência: +0,03 de dano em cada golpe que acerta.',
      qi: 'QI de luta: melhor leitura, mais chance de iniciar as trocas.',
    };
    return f[k] || '';
  }

  function telaDistribuir() {
    const c = carreira;
    const pts = c.pontosDisponiveis || 0;
    const grupos = GRUPOS_ATRIBUTOS.map((g, gi) => painel({
      titulo: g.nome, i: gi, cls: 'entra',
      corpo: `<div class="lista-attr">${g.chaves.map((k) => {
        const b = barraXp(c, k);
        return `<div class="dist-attr"><div class="dist-info"><div class="rotulo-linha"><span>${MMA.ROTULOS[k]}</span><b>${c.atributos[k]}</b></div>${barra(b.p, 'azul')}<small class="efeito-att">${efeitoAtributo(k)}</small><small>XP ${b.xp} / ${b.lim} · teto ${c.tetos[k]}${c.atributos[k] >= c.tetos[k] ? ' (no limite)' : ''}</small></div>
          ${btn({ texto: '+1', acao: 'distribuir', data: { attr: k }, cls: 'mais', disabled: pts <= 0 || c.atributos[k] >= c.tetos[k], aria: `aria-label="Subir ${MMA.ROTULOS[k]}"` })}</div>`;
      }).join('')}</div>`,
    })).join('');
    return `${cabecalhoTela('Evolução', 'Distribuir pontos', `Pontos disponíveis: <b class="pts-disp">${pts}</b>. Cada ponto sobe um atributo em +1, até o teto do seu potencial, e muda o seu overall, que está em <b>${MMA.ratingExato(c).toFixed(1)}</b>.`)}
      <div class="grade-3">${grupos}</div>
      <div class="acoes-linha">${btn({ texto: 'Voltar', acao: 'ir', data: { tela: 'hub' }, icone: 'setaEsq' })}</div>`;
  }

  function telaCategoria() {
    const c = carreira;
    if (c.periodo === 'eras') return telaHub();
    const i = MMA.ORDEM_DIVISOES.indexOf(c.divisaoId);
    const vizinhas = [MMA.ORDEM_DIVISOES[i - 1], MMA.ORDEM_DIVISOES[i + 1]].filter(Boolean);
    const botoes = vizinhas.map((id, k) => {
      const descendo = MMA.ORDEM_DIVISOES.indexOf(id) < i;
      const desc = descendo ? 'Você corta peso: começa a próxima luta com menos fôlego.' : 'Você ganha massa: mais força e queixo, menos velocidade e cardio.';
      return `<button class="card-treino entra${catConfirm === id ? ' sel' : ''}" style="--i:${k}" data-acao="mudar-para" data-div="${id}"${MMA.bloqueioAcao(c) || c.agendada || c.lesao ? ' disabled' : ''}><span class="card-treino-ico">${icone('balanca', 26)}</span><div class="kicker">${descendo ? 'Descer de peso' : 'Subir de peso'}</div><h3>${nomeDivisao(c.periodo, id)}</h3><p>${limite(c.periodo, id)} · ${desc}</p>${catConfirm === id ? '<p class="confirma-cat">Toque de novo para confirmar: seu ranking volta a zero e 1 semana passa.</p>' : ''}</button>`;
    }).join('');
    return `${cabecalhoTela('Categoria', 'Trocar de peso', `Você está em <b>${esc(categoriaAtual(c))}</b> (${limite(c.periodo, c.divisaoId)}). Só dá para mudar para a categoria vizinha. Custa 15 de energia e passa 1 semana. Seu ranking recomeça do zero.`)}
      ${MMA.bloqueioAcao(c) || c.agendada || c.lesao ? `<p class="motivo bloco">${esc(MMA.bloqueioAcao(c) || (c.agendada ? 'Você tem uma luta marcada: lute antes de trocar de categoria.' : 'Lesionado: não dá para mudar de categoria agora.'))}</p>` : ''}
      <div class="grade-2">${botoes || '<p class="vazio">Sem categorias vizinhas.</p>'}</div>
      <div class="acoes-linha">${btn({ texto: 'Voltar', acao: 'ir', data: { tela: 'hub' }, icone: 'setaEsq' })}</div>`;
  }

  function cartaoHall(e) {
    const marcantes = (e.marcantes || []).map((m) => `<li>${esc(m.resultado)} contra ${esc(m.oponente)} · ${esc(m.metodo)}${m.titulo ? ' · Título' : ''}</li>`).join('') || '<li class="vazio">Nenhuma luta marcante ainda.</li>';
    return painel({ cls: 'entra', corpo: `<div class="kicker">${esc(e.data)} · ${e.modalidade && MMA.MODALIDADES[e.modalidade] ? MMA.MODALIDADES[e.modalidade].nome : MMA.ESTILOS[e.estilo] || ''}${e.origem ? ' · ' + esc(e.origem) : ''}</div><h3 class="hall-nome">${esc(e.nome)}</h3>
      <div class="chips">${badge(`${e.recorde.v}-${e.recorde.d}-${e.recorde.e}`)}${badge(`${e.titulos} título(s)`, 'gold')}${badge(`${e.idade} anos`)}</div>
      <h4 class="hall-sub">Lutas marcantes</h4><ul class="lista-simples">${marcantes}</ul>` });
  }

  function telaAposentadoria() {
    const c = carreira;
    const entrada = MMA.entradaHall(c);
    return `${cabecalhoTela('Fim de carreira', 'Pendurar as luvas', `Depois de ${entrada.idade} anos e ${entrada.recorde.v + entrada.recorde.d + entrada.recorde.e} luta(s), ${esc(c.nome)} se aposenta. A carreira fica encerrada, e a história vai para o hall da fama.`)}
      ${cartaoHall(entrada)}
      <div class="acoes-linha">${btn({ texto: 'Ver hall da fama', acao: 'ir', data: { tela: 'hall' }, tipo: 'primary', icone: 'trofeu' })}${btn({ texto: 'Voltar', acao: 'ir', data: { tela: 'hub' }, icone: 'setaEsq' })}</div>`;
  }

  function telaHall() {
    const lista = hallCarregar();
    return `${cabecalhoTela('Memória', 'Hall da fama', 'Os lutadores que pendurarem as luvas ficam aqui.')}
      <div class="grade-2">${lista.slice().reverse().map(cartaoHall).join('') || '<p class="vazio">Nenhum lutador no hall ainda. Aposente-se com 36 anos ou mais para entrar.</p>'}</div>
      <div class="acoes-linha">${btn({ texto: 'Voltar ao menu', acao: 'ir', data: { tela: 'inicio' }, icone: 'setaEsq' })}</div>`;
  }

  // ---------------------------------------------------------------------------
  // Acoes
  // ---------------------------------------------------------------------------

  function iniciarLuta(op, eTitulo) {
    titulo = eTitulo;
    luta = MMA.iniciarLutaAtiva(carreira, op, eTitulo) && MMA.retomarLutaAtiva(carreira).luta;
    oponente = carreira.lutaAtiva.op;
    ultimaLuta = null;
    detalhesLuta = false;
    salvar();
    ir('luta');
  }

  function fotografia(c) {
    const rk = MMA.ranking(c);
    const ix = rk.findIndex((x) => x.jogador);
    const acima = ix > 0 ? Math.max(1, rk[ix - 1].pontos - c.pontos + 1) : 0;
    return { acima: acima, xp: c.xp, dinheiro: c.dinheiro, pontos: c.pontos, nivel: MMA.nivelDoXP(c.xp), pontosDist: c.pontosDisponiveis || 0, pos: MMA.posicaoDoJogador(c), recorde: Object.assign({}, c.recorde), energia: c.energia };
  }

  function acao(nome, d) {
    switch (nome) {
      case 'ir':
        return ir(d.tela);

      case 'menu-usuario':
        menuUsuario = !menuUsuario;
        return renderCabecalho();

      case 'escolher-era':
        if (carreira && !confirm('Começar uma nova carreira apaga a atual. Continuar?')) return;
        rascunho = { periodo: d.periodo, nome: '', sobrenome: '', pais: 'Brasil', cidade: '', foto: null, idade: 25, modalidade: 'mma', divisaoId: d.periodo === 'eras' ? 'peso_aberto' : 'peso_leve', dist: {}, meta: 'campeao', traco: MMA.SUGESTOES_MODALIDADE.mma.tracos[0], assinatura: MMA.SUGESTOES_MODALIDADE.mma.assinaturas[0] };
        return ir('criar');

      case 'modalidade': {
        rascunho.modalidade = d.valor;
        const sug = MMA.SUGESTOES_MODALIDADE[d.valor] || MMA.SUGESTOES_MODALIDADE.mma;
        rascunho.traco = sug.tracos[0];
        rascunho.assinatura = sug.assinaturas[0];
        return render();
      }

      case 'criar': {
        const nome = (rascunho.nome || '').trim();
        const sobrenome = (rascunho.sobrenome || '').trim();
        const cidade = (rascunho.cidade || '').trim();
        if (!nome || !sobrenome) return toast('Informe o nome e o sobrenome do lutador.');
        if (!cidade) return toast('Informe a cidade de origem.');
        const completo = nome + ' ' + sobrenome;
        if (NOMES_REAIS.has(completo.toLowerCase())) return toast('Esse nome pertence a um lutador do jogo. Escolha outro.');
        carreira = MMA.novaCarreira({
          nome: completo, primeiroNome: nome, sobrenome: sobrenome, apelido: (rascunho.apelido || '').trim() || null, pais: rascunho.pais, cidade: cidade, foto: rascunho.foto,
          idade: rascunho.idade, modalidade: rascunho.modalidade, periodo: rascunho.periodo, divisaoId: rascunho.divisaoId, adiarPontos: true, traco: rascunho.traco, assinatura: rascunho.assinatura, meta: rascunho.meta,
        });
        salvar();
        toast(rascunho.foto && !localStorage.getItem(CHAVE) ? 'Carreira criada, mas a foto não coube no armazenamento do navegador.' : 'Bem-vindo ao circuito. Escolha sua primeira luta.');
        return ir('hub');
      }

      case 'foto-remover':
        rascunho.foto = null;
        return render();

      case 'apagar':
        if (!confirm('Apagar a carreira salva? Essa ação não tem volta.')) return;
        apagarSave();
        carreira = null;
        return ir('inicio');

      case 'aceitar-oferta': {
        const r = MMA.aceitarOferta(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        carreira.resumo = null;
        salvar();
        const ev = carreira.agendada && carreira.agendada.evento;
        toast(`Luta marcada${ev ? ' para o ' + ev.nome : ''}: ${MMA.dataTexto(ev ? ev.data : null, true)}. O camp de treino começou.`);
        return ir('proxima');
      }

      case 'ver-lutador':
        estado.lutadorSel = { nome: d.nome, div: d.div || null };
        return ir('lutador');

      case 'rank-div':
        estado.rankDiv = d.valor;
        return render();

      case 'camp-decidir': {
        const r = MMA.decidirCamp(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        salvar();
        if (r.concluido) {
          if (!carreira.agendada) toast('A luta caiu: veja o aviso.');
          else if (carreira.imprevisto) toast('Imprevisto na semana da luta: decida o que fazer.');
          else toast('Camp concluído. Dia da luta!');
          return ir('proxima');
        }
        return render();
      }

      case 'comprar-academia': {
        const r = MMA.comprarAcademia(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        salvar();
        toast(`${MMA.ACADEMIA[d.id].nome}: nível ${r.nivel}.`);
        return render();
      }

      case 'escolher-traco': {
        const r = MMA.escolherTraco(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        salvar();
        toast(`Traço escolhido: ${MMA.TRACOS[d.id].nome}.`);
        return render();
      }

      case 'escolher-assinatura': {
        const r = MMA.escolherAssinatura(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        salvar();
        toast(`Golpe de assinatura: ${MMA.ASSINATURAS[d.id].nome}.`);
        return render();
      }

      case 'assinatura-ativa': {
        const r = MMA.definirAssinaturaAtiva(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        salvar();
        return render();
      }

      case 'pos-luta': {
        const r = MMA.posLuta(carreira, d.tipo);
        if (!r.ok) return toast(r.motivo);
        salvar();
        toast(r.texto + (r.fama ? ' Fama ' + (r.fama > 0 ? '+' : '') + r.fama + '.' : ''));
        return render();
      }

      case 'divisao':
        rascunho.divisaoId = d.valor;
        return render();

      case 'meta-sel':
        rascunho.meta = d.valor;
        return render();

      case 'meta-escolher': {
        const r = MMA.escolherMeta(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        salvar();
        toast('Meta escolhida: ' + r.meta.nome + '.');
        return render();
      }

      case 'aprender': {
        const e = MMA.estadoHab(carreira, d.id);
        if (e.estado === 'tem') return toast('Você já aprendeu essa habilidade.');
        if (e.estado !== 'livre') return toast(e.motivo || 'Indisponível.');
        if ((carreira.pontosHab || 0) <= 0) return toast('Sem pontos de habilidade. Suba de nível, de fama ou cumpra metas.');
        if (habConfirm !== d.id) {
          habConfirm = d.id;
          return render();
        }
        habConfirm = null;
        const r = MMA.aprender(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        salvar();
        toast('Habilidade aprendida: ' + r.hab.nome + (r.ganhos.length ? ' · ' + r.ganhos.join(', ') : '') + '.');
        return render();
      }

      case 'proxima-luta': {
        const r = MMA.aceitarOferta(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        carreira.resumo = null;
        salvar();
        toast('Luta marcada para a semana ' + r.semanaLuta + '. O camp de treino começou.');
        return ir('proxima');
      }

      case 'traco-sel':
        rascunho.traco = d.valor;
        return render();

      case 'ass-sel':
        rascunho.assinatura = d.valor;
        return render();

      case 'lutar-agora': {
        const a = carreira.agendada;
        if (carreira.lutaAtiva) return ir('luta');
        if (!a || !MMA.diaDeLuta(carreira)) return toast('Ainda não é o dia da luta.');
        return iniciarLuta(a.op, a.titulo);
      }

      case 'distribuir': {
        const r = MMA.distribuirPonto(carreira, d.attr);
        if (!r.ok) return toast(r.motivo);
        salvar();
        toast(`${MMA.ROTULOS[d.attr]} +1 · Overall ${r.overallAntes.toFixed(1)} → ${r.overallDepois.toFixed(1)}`);
        return render();
      }

      case 'descansar': {
        const lesaoAntes = carreira.lesao ? carreira.lesao.semanas : 0;
        const r = MMA.descansar(carreira);
        if (!r.ok) return toast(r.motivo);
        const avisos = MMA.consumirAvisos(carreira);
        salvar();
        toast(lesaoAntes ? 'Você descansou e fez fisioterapia.' : 'Você deixou a semana passar.');
        avisos.forEach((a) => toast(a));
        return render();
      }

      case 'imprevisto': {
        const r = MMA.resolverImprevisto(carreira, d.id);
        if (!r.ok) return toast(r.motivo);
        salvar();
        toast(r.texto);
        return ir(r.resultado === 'lutar' || r.resultado === 'adiada' ? 'proxima' : 'proxima');
      }

      case 'ok-imprevisto':
        carreira.ultimoImprevisto = null;
        salvar();
        return render();

      case 'evento': {
        const r = MMA.resolverEvento(carreira, Number(d.indice));
        if (!r.ok) return toast(r.motivo);
        salvar();
        toast(r.log);
        return render();
      }

      case 'retomar':
        return ir('luta');

      case 'pausar':
        salvar();
        return ir('hub');

      case 'concluir': {
        if (!luta || !luta.encerrada) return;
        const antes = fotografia(carreira);
        const ratingA = MMA.rating(carreira);
        const subA = `${categoriaAtual(carreira)} · ${carreira.recorde.v}-${carreira.recorde.d}-${carreira.recorde.e}`;
        const k = oponente.lutador && oponente.lutador.cartel;
        const subB = `${categoriaAtual(carreira)}${k && k.vitorias != null && k.derrotas != null ? ` · ${k.vitorias}-${k.derrotas}` : ''}`;
        const kB = oponente.lutador && oponente.lutador.cartel;
        const cartelB = kB && kB.vitorias != null && kB.derrotas != null ? `${kB.vitorias}-${kB.derrotas}` : '';
        const cartelA = `${carreira.recorde.v}-${carreira.recorde.d}-${carreira.recorde.e}`;
        const r = MMA.aplicarLuta(carreira, oponente, luta, titulo);
        ultimaLuta = {
          nomeA: carreira.nome, nomeB: oponente.nome, estiloA: carreira.estilo, estiloB: oponente.estilo,
          ratingA, ratingB: oponente.rating, subA, subB, cartelA, cartelB,
          tempo: luta.resultado.tempo || r.tempo || null, evento: r.evento || null, dano: 100 - MMA.vidaPct(luta.f[0]),
          venceu: r.venceu, empatou: r.empatou, metodo: luta.resultado.metodo, round: luta.resultado.round,
          rodadasTotais: luta.rodadasTotais, totais: luta.totais.slice(), rodadas: luta.rodadas, f: luta.f, est: luta.estatisticas,
          titulo, antes, depois: fotografia(carreira), bolsa: r.bolsa, defendeu: r.defendeu,
          fama: r.fama, nivelFamaSubiu: r.nivelFamaSubiu, rivalidade: r.rivalidade, cartoes: luta.resultado.cartoes || null, detalhe: luta.resultado.detalhe || null,
          lesao: r.lesionou ? carreira.historico[carreira.historico.length - 1].lesao : null,
          recompensas: r.recompensas || [], meta: r.meta || null, nivelAntes: r.nivelAntes, nivelDepois: r.nivelDepois, pontosHabGanhos: r.pontosHabGanhos || 0,
        };
        carreira.resumo = null;
        salvar();
        luta = null;
        oponente = null;
        detalhesLuta = false;
        return ir('resultado');
      }

      case 'resultado-detalhes':
        detalhesLuta = !detalhesLuta;
        return render();

      case 'mudar-para': {
        if (catConfirm !== d.div) {
          catConfirm = d.div;
          return render();
        }
        catConfirm = null;
        const r = MMA.mudarDivisao(carreira, d.div);
        if (!r.ok) return toast(r.motivo);
        salvar();
        estado.rankDiv = null;
        carreira.resumo = { titulo: 'Nova categoria', linhas: ['Ranking recomeçando do zero. Novas ofertas na mesa.'] };
        salvar();
        return ir('hub');
      }

      case 'rank-filtro':
        estado.rankFiltro = d.valor;
        return render();

      case 'aposentar': {
        if (!confirm('Pendurar as luvas? A carreira será encerrada e a história vai para o hall da fama.')) return;
        const r = MMA.aposentar(carreira);
        if (!r.ok) return toast(r.motivo);
        const lista = hallCarregar();
        lista.push(r.entrada);
        hallSalvar(lista);
        salvar();
        return ir('aposentadoria');
      }

      default:
        return;
    }
  }

  document.addEventListener('click', (e) => {
    if (menuUsuario && !e.target.closest('#usuario')) {
      menuUsuario = false;
      renderCabecalho();
    }
    const b = e.target.closest('[data-acao]');
    if (!b || b.disabled) return;
    acao(b.dataset.acao, b.dataset);
  });

  document.addEventListener('input', (e) => {
    if (!rascunho) return;
    const campos = { nome: 'nome', sobrenome: 'sobrenome', cidade: 'cidade', apelido: 'apelido' };
    if (campos[e.target.id]) rascunho[campos[e.target.id]] = e.target.value;
    if (e.target.id === 'idade') {
      const v = Number(e.target.value);
      if (v >= 18 && v <= 40) rascunho.idade = v;
    }
  });

  document.addEventListener('change', (e) => {
    if (rascunho && e.target.id === 'pais') rascunho.pais = e.target.value;
    if (rascunho && e.target.id === 'divisao') rascunho.divisaoId = e.target.value;
    if (rascunho && e.target.id === 'foto-input') {
      const arquivo = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!arquivo) return;
      processarFoto(arquivo).then((url) => {
        rascunho.foto = url;
        render();
      }).catch((erro) => toast(erro.message));
    }
  });

  // Interface entregue as telas de js/telas*.js: so apresentacao, toda regra vem do motor.
  const UI = {
    MMA, esc, icone, btn, badge, plural, fotoSrc, corDoNome, nomeDivisao, divisoesDoPeriodo, barraAnim, blocoEvento, painelNoticias, painelRivais, estado, PERIODOS,
    get carreira() { return carreira; },
    dados: (nome) => POR_NOME[nome] || (carreira ? MMA.buscarLutador(carreira, nome) : null),
    credito: creditoFoto,
    categoria: categoriaAtual,
    etapaNome: (t) => ETAPA_UI[t].nome,
    etapaTitulo: (t) => ETAPA_UI[t].titulo,
    chance: (op) => fichaAdversario(op, carreira).chance,
  };

  render();
})();
