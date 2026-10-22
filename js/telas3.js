// Ranking (exploracao de adversarios), perfil do lutador e Legado (memorial da carreira).
(function () {
  'use strict';

  const T = {};
  const U = () => window.TELAS_UTIL;

  const idadeDe = (UI, l) => {
    const c = UI.carreira;
    const base = UI.MMA.ANO_PERIODO[c.periodo];
    return l && l.nascimento_ano ? base + Math.floor((c.semana - 1) / 52) - l.nascimento_ano : null;
  };

  // ---------------------------------------------------------------------------
  // RANKING
  // ---------------------------------------------------------------------------

  function statusDe(UI, x, noCard) {
    const c = UI.carreira;
    const out = [];
    if (x.jogador) out.push('<span class="selo-eu">Você</span>');
    if (!x.jogador && c.agendada && c.agendada.op.nome === x.nome) out.push('<span class="selo-fogo">Próximo adversário</span>');
    else if (!x.jogador && noCard.has(x.nome)) out.push('<span class="selo-azul">No seu card</span>');
    if (!x.jogador && c.rivais && c.rivais[x.nome]) out.push('<span class="selo-fogo">Rival</span>');
    if (x.lenda) out.push('<span class="selo-lenda">Lenda</span>');
    return out.join('');
  }

  function linhaRanking(UI, x, pos, divId, campeao, noCard) {
    const inf = U().info(UI, x.nome);
    const e = UI.esc;
    const est = UI.MMA.ESTILOS[x.estilo] || '';
    return `<button class="r-linha${x.jogador ? ' eu' : ''}${campeao ? ' campeao' : ''}" data-acao="ver-lutador" data-nome="${e(x.nome)}" data-div="${e(divId)}">
      <span class="r-pos">${campeao ? 'C' : UI.MMA.posRank(UI.carreira.periodo, pos)}</span>
      ${U().foto(UI, x.nome, 'mini')}
      <span class="r-nome"><b>${e(x.nome)}</b><small>${inf.apelido ? '“' + e(inf.apelido) + '”' : ''}${inf.apelido && inf.nac ? ' · ' : ''}${e(inf.nac)}</small></span>
      <span class="r-estilo">${e(est)}</span>
      <span class="r-cartel">${e(inf.cartel || '—')}${inf.forma && inf.forma.length ? `<span class="forma mini">${inf.forma.slice(0, 3).map((x) => `<i class="${x === 'V' ? 'v' : 'd'}">${x}</i>`).join('')}</span>` : ''}</span>
      <span class="r-status">${statusDe(UI, x, noCard)}</span>
      <span class="r-pts"><b>${Math.round(x.pontos)}</b><small>pts</small></span>
      ${UI.icone('chevronDir', 16)}
    </button>`;
  }

  T.ranking = function (UI) {
    const c = UI.carreira;
    const M = UI.MMA;
    const e = UI.esc;
    const divs = UI.divisoesDoPeriodo(c.periodo);
    const divId = UI.estado.rankDiv && divs.includes(UI.estado.rankDiv) ? UI.estado.rankDiv : c.divisaoId;
    const filtro = UI.estado.rankFiltro || 'geral';
    const noCard = new Set();
    if (c.agendada && c.agendada.evento) c.agendada.evento.card.forEach((l) => { noCard.add(l.a.nome); noCard.add(l.b.nome); });
    const todos = M.ranking(c, c.periodo, divId);
    let lista = todos;
    if (filtro === 'lendas') lista = lista.filter((x) => x.lenda);
    const ehMinha = divId === c.divisaoId;
    const pos = (x) => todos.indexOf(x) + 1; // posicao interna (campeao = 1); o rotulo vem de rotuloRank
    const mostrar = filtro === 'lendas' ? lista : lista.slice(0, 16);
    const euFora = ehMinha && filtro !== 'lendas' && !mostrar.some((x) => x.jogador) ? lista.find((x) => x.jogador) : null;
    const campeao = filtro === 'lendas' ? null : mostrar[0];
    const abas = divs.map((d) => `<button class="aba-div${d === divId ? ' ativa' : ''}" data-acao="rank-div" data-valor="${d}">${e(UI.nomeDivisao(c.periodo, d))}</button>`).join('');
    const linhas = mostrar.map((x, i) => (campeao && i === 0 ? '' : linhaRanking(UI, x, pos(x), divId, false, noCard))).join('') + (euFora ? '<div class="r-corte">···</div>' + linhaRanking(UI, euFora, pos(euFora), divId, false, noCard) : '');
    let heroC = '';
    if (campeao && c.periodo !== 'eras') {
      const inf = U().info(UI, campeao.nome);
      heroC = `<button class="campeao-card" data-acao="ver-lutador" data-nome="${e(campeao.nome)}" data-div="${e(divId)}">
        <div class="cc-foto">${U().foto(UI, campeao.nome, 'alta')}</div>
        <div class="cc-corpo"><span class="selo-ouro">Campeão</span><h2>${U().nomeEmDuasLinhas(UI, campeao.nome)}</h2>${inf.apelido ? `<p>“${e(inf.apelido)}”</p>` : ''}<small>${e([inf.nac, inf.cartel, M.ESTILOS[campeao.estilo]].filter(Boolean).join(' · '))}</small>${statusDe(UI, campeao, noCard) ? `<div class="cc-status">${statusDe(UI, campeao, noCard)}</div>` : ''}</div>
      </button>`;
    } else if (campeao) {
      heroC = '';
    }
    const minhaPos = M.posicaoDoJogador(c);
    return `<header class="cab-j"><span class="kicker">Ranking · ${e(UI.PERIODOS[c.periodo].nome)}</span><h1>${e(UI.nomeDivisao(c.periodo, divId))}</h1><p>Toque em um lutador para ver o perfil, o estilo e como ele se compara com você.</p></header>
      <div class="abas-div" role="tablist">${abas}</div>
      <div class="rank-layout">
        <section class="rank-lista">
          <div class="rank-filtro"><button class="${filtro === 'geral' ? 'ativa' : ''}" data-acao="rank-filtro" data-valor="geral">Todos</button><button class="${filtro === 'lendas' ? 'ativa' : ''}" data-acao="rank-filtro" data-valor="lendas">Lendas</button>${ehMinha && minhaPos ? `<span class="rank-minha">Você: ${M.rotuloRank(c.periodo, minhaPos).toLowerCase() === 'campeão' ? 'campeão' : M.rotuloRank(c.periodo, minhaPos)}</span>` : ''}</div>
          ${heroC}
          <div class="r-grade">${linhas || '<p class="vazio">Ninguém para mostrar.</p>'}</div>
        </section>
        <aside class="rank-lado">
          ${UI.painelNoticias(c, 1)}
          ${UI.painelRivais(c, 2)}
        </aside>
      </div>`;
  };

  // ---------------------------------------------------------------------------
  // PERFIL DO LUTADOR
  // ---------------------------------------------------------------------------

  const GRUPOS = [
    { nome: 'Em pé', chaves: ['striking', 'velocidade', 'qi'] },
    { nome: 'Chão e luta', chaves: ['grappling', 'bjj', 'wrestling', 'defesa'] },
    { nome: 'Corpo', chaves: ['forca', 'resistencia', 'queixo'] },
  ];

  T.lutador = function (UI) {
    const c = UI.carreira;
    const M = UI.MMA;
    const e = UI.esc;
    const sel = UI.estado.lutadorSel;
    if (!sel) return '<section class="vazio-j"><h2>Escolha um lutador no ranking</h2></section>';
    const divs = UI.divisoesDoPeriodo(c.periodo);
    let row = null;
    let divId = sel.div;
    [divId].concat(divs).some((d) => {
      if (!d) return false;
      const r = M.ranking(c, c.periodo, d).find((x) => x.nome === sel.nome);
      if (r) { row = r; divId = d; return true; }
      return false;
    });
    if (!row) return '<section class="vazio-j"><h2>Lutador não encontrado</h2>' + UI.btn({ texto: 'Voltar ao ranking', acao: 'ir', data: { tela: 'ranking' } }) + '</section>';
    const lista = M.ranking(c, c.periodo, divId);
    const pos = lista.findIndex((x) => x.nome === row.nome) + 1;
    const l = row.lutador;
    const inf = U().info(UI, row.nome);
    const eMeu = !!row.jogador;
    const idade = eMeu ? M.idadeAtual(c) : idadeDe(UI, l);
    const attr = eMeu ? c.atributos : M.ajustarIdade(l.atributos, idade || 28);
    const k = l && l.cartel ? l.cartel : null;
    const historia = eMeu ? [] : M.historiaLutador(c, row.nome);
    const oferta = (c.ofertas || []).find((o) => o.op.nome === row.nome);
    const campeaoDaDivisao = c.periodo !== 'eras' && M.campeaoAtual(c, c.periodo, divId) === row.nome;
    const noCard = c.agendada && c.agendada.evento ? c.agendada.evento.card.some((x) => x.a.nome === row.nome || x.b.nome === row.nome) : false;
    const situacao = [];
    if (campeaoDaDivisao) situacao.push('Campeão da categoria');
    else situacao.push(M.rotuloRank(c.periodo, pos) + ' do ranking');
    if (c.agendada && c.agendada.op.nome === row.nome) situacao.push('Seu próximo adversário');
    else if (noCard) situacao.push('Luta no seu evento');
    if (c.rivais && c.rivais[row.nome]) situacao.push('Rival (' + (c.rivais[row.nome].motivo === 'revanche' ? 'revanche pendente' : 'provocações') + ')');
    const blocoAttr = GRUPOS.map((g) => `<div class="pf-grupo"><h4>${g.nome}</h4>${g.chaves.map((kk) => `<div class="pf-attr"><span>${e(M.ROTULOS[kk])}</span><div class="pf-barra"><i style="width:${Math.max(4, Math.min(100, attr[kk]))}%"></i></div><b>${Math.round(attr[kk])}</b></div>`).join('')}</div>`).join('');
    const estilosTxt = { striking: 'Prefere a trocação em pé e usa golpes técnicos.', luta_livre: 'Busca a queda e domina o controle por cima.', grappling: 'Procura o chão e as finalizações.', misto: 'Equilibrado: se adapta ao que o rival oferece.' };
    const metodos = k && k.vitorias ? `<div class="pf-metodos"><div><b>${k.vitorias_ko ?? '—'}</b><small>Nocautes</small></div><div><b>${k.vitorias_sub ?? '—'}</b><small>Finalizações</small></div><div><b>${k.vitorias_dec ?? '—'}</b><small>Decisões</small></div></div>` : '';
    const noticias = (c.noticias || []).filter((n) => n.texto.includes(row.nome)).slice(0, 3);
    const partes = row.nome.split(' ');
    return `<div class="voltar-linha">${UI.btn({ texto: 'Ranking', acao: 'ir', data: { tela: 'ranking' }, icone: 'setaEsq', tipo: 'ghost' })}</div>
      <section class="perfil-hero${campeaoDaDivisao ? ' campeao' : ''}">
        <div class="ph-foto">${U().foto(UI, row.nome, 'hero')}</div>
        <div class="ph-corpo">
          <div class="hl-topo">${campeaoDaDivisao ? '<span class="selo-ouro">Campeão</span>' : `<span class="org">${e(M.rotuloRank(c.periodo, pos))}</span>`}<span>${e(UI.nomeDivisao(c.periodo, divId))}</span>${row.lenda ? '<span class="selo-lenda">Lenda</span>' : ''}</div>
          <h1 class="hl-nome"><span>${e(partes.length > 1 ? partes[0] : '')}</span><b>${e(partes.length > 1 ? partes.slice(1).join(' ') : partes[0])}</b></h1>
          ${inf.apelido ? `<p class="hl-apelido">“${e(inf.apelido)}”</p>` : ''}
          <ul class="hl-meta"><li>${e(inf.nac || 'Origem desconhecida')}</li>${idade ? `<li>${idade} anos</li>` : ''}<li>${e(M.ESTILOS[row.estilo] || '')}</li>${l && l.altura_cm ? `<li>${l.altura_cm} cm${l.alcance_cm ? ' · alcance ' + l.alcance_cm : ''}</li>` : ''}</ul>
          <div class="hl-numeros"><div><small>Cartel</small><b>${e(inf.cartel || '—')}</b></div><div><small>Overall</small><b>${Math.round(M.ratingExato({ atributos: attr }))}</b></div><div><small>Pontos</small><b>${Math.round(row.pontos)}</b></div></div>
          <p class="hl-status ok">${e(situacao.join(' · '))}</p>
          ${historia.length ? `<ul class="hl-historia">${historia.map((h) => `<li>${e(h)}</li>`).join('')}</ul>` : ''}${inf.forma && inf.forma.length ? `<div class="forma"><span>Forma recente</span>${inf.forma.map((x) => `<i class="${x === 'V' ? 'v' : 'd'}">${x}</i>`).join('')}</div>` : ''}
          <div class="ph-acoes">${oferta ? UI.btn({ texto: 'Aceitar luta · $' + oferta.bolsa.toLocaleString('pt-BR'), acao: 'aceitar-oferta', data: { id: oferta.id, volta: 'proxima' }, tipo: 'primary', trailing: 'seta' }) : ''}${UI.btn({ texto: 'Voltar ao ranking', acao: 'ir', data: { tela: 'ranking' } })}</div>
        </div>
      </section>
      <div class="duas-col">
        <section class="bloco-j"><header><h3>Estilo e atributos</h3><span>${e(M.ESTILOS[row.estilo] || '')}</span></header><p class="sub">${e(estilosTxt[row.estilo] || '')}</p>${metodos}<div class="pf-grupos">${blocoAttr}</div></section>
        <section class="bloco-j"><header><h3>${eMeu ? 'Seu perfil' : 'Como ele se compara com você'}</h3><span>por fase da luta</span></header>
          ${eMeu ? '<p class="sub">Este é você. Veja o Legado para o histórico completo.</p>' : window.TELAS.analise(UI, row)}
          ${noticias.length ? `<h4 class="mini-tit">Últimas notícias</h4><ul class="noticias">${noticias.map((n) => `<li class="${n.titulo ? 'titulo' : ''}"><span>Sem. ${n.semana}</span>${e(n.texto)}</li>`).join('')}</ul>` : ''}
        </section>
      </div>
      ${UI.credito(row.nome) ? `<p class="foto-credito">${e(UI.credito(row.nome))}</p>` : ''}`;
  };

  // ---------------------------------------------------------------------------
  // LEGADO
  // ---------------------------------------------------------------------------

  function linhaHistorico(UI, h) {
    const e = UI.esc;
    const cls = h.resultado === 'Vitória' ? 'v' : h.resultado === 'Derrota' ? 'd' : 'e';
    const quando = h.data ? UI.MMA.dataTexto(h.data, true) : 'Sem. ' + h.semana;
    return `<li class="h-linha ${cls}"><span class="h-res">${h.resultado[0]}</span><div class="h-meio"><b>${e(h.oponente)}</b><small>${e(h.evento || quando)}${h.titulo ? ' · Cinturão' : ''}</small></div><span class="h-met">${h.torneio ? e(h.torneio) + ' · ' : ''}${e(h.metodo.replace('Decisão ', 'Dec. '))}${h.round && !/^Decisão/.test(h.metodo) ? ' · R' + h.round + (h.tempo ? ' ' + h.tempo : '') : ''}</span><span class="h-data">${e(quando)}</span></li>`;
  }

  T.legado = function (UI) {
    const c = UI.carreira;
    const M = UI.MMA;
    const e = UI.esc;
    const L = M.legado(c);
    const h = (c.historico || []).slice().reverse();
    const duplo = L.categoriasCampeao.length >= 2;
    const cinto = L.titulos > 0 ? `<figure class="memorial-cinto"><img src="fotos/cinturao-${duplo ? 2 : 1}.webp" alt="${duplo ? 'Campeão em duas categorias' : 'Campeão'}"><figcaption>${duplo ? 'Campeão em duas categorias' : 'Campeão da categoria'}</figcaption></figure>` : '';
    const conquistas = L.titulos > 0 ? `<section class="bloco-j ouro"><header><h3>Cinturões</h3><span>${L.titulos} ${UI.plural(L.titulos, 'conquista', 'conquistas')} · ${L.defesas} ${UI.plural(L.defesas, 'defesa', 'defesas')}</span></header>
      <ul class="lista-cintos">${L.categoriasCampeao.map((n) => `<li><span class="selo-ouro">Cinturão</span><b>${e(n)}</b></li>`).join('')}</ul></section>` : '';
    const mem = L.memoraveis.length ? L.memoraveis.map((x) => {
      const quando = x.data ? M.dataTexto(x.data, true) : 'Sem. ' + x.semana;
      return `<article class="memoravel ${x.resultado === 'Vitória' ? 'v' : 'd'}">${U().foto(UI, x.oponente, 'alta')}<div><div class="d-tags">${x.titulo ? '<span class="selo-ouro">Cinturão</span>' : ''}${x.premio ? `<span class="selo-azul">${e(x.premio)}</span>` : ''}${x.rivalidade ? '<span class="selo-fogo">Rivalidade</span>' : ''}</div><b>${e(x.resultado)} contra ${e(x.oponente)}</b><small>${e(x.metodo)}${x.round && !/^Decisão/.test(x.metodo) ? ' · round ' + x.round + (x.tempo ? ' · ' + x.tempo : '') : ''}</small><small>${e(x.evento || quando)}</small></div></article>`;
    }).join('') : '<p class="vazio">As lutas marcantes aparecem aqui conforme a carreira avança.</p>';
    const rivais = L.rivalidades.length ? L.rivalidades.map((r) => `<li class="heat-${r.heat}">${U().foto(UI, r.nome, 'mini')}<div><b>${e(r.nome)}</b><small>${r.motivo === 'revanche' ? 'Revanche pendente' : 'Provocações'}</small></div><span class="pontos-heat">${[1, 2, 3].map((k) => `<u class="${k <= r.heat ? 'on' : ''}"></u>`).join('')}</span></li>`).join('') : '<li class="vazio">Sem rivalidades abertas.</li>';
    const premios = L.premios.length ? L.premios.map((p) => `<li><b>${e(p.titulo)}</b><small>contra ${e(p.oponente)}${p.evento ? ' · ' + e(p.evento) : ''}${p.valor ? ' · +$' + p.valor.toLocaleString('pt-BR') : ''}</small></li>`).join('') : '<li class="vazio">Nenhuma premiação ainda. Vitórias rápidas e lutas movimentadas rendem bônus.</li>';
    const metas = (c.metasCumpridas || []).map((id) => (M.METAS[id] ? M.METAS[id].nome : id));
    const num = (n, rot, cls) => `<div class="mem-num ${cls || ''}"><b>${n}</b><small>${rot}</small></div>`;
    const taxa = L.vitorias ? Math.round(((L.nocautes + L.finalizacoes) / L.vitorias) * 100) : 0;
    return `<section class="memorial">
        <div class="mem-hero">
          <div class="mem-foto">${U().foto(UI, c.nome, 'hero')}</div>
          <div class="mem-info">
            <span class="kicker gold">Legado</span>
            <h1 class="hl-nome">${c.primeiroNome && c.sobrenome ? `<span>${e(c.primeiroNome)}</span><b>${e(c.sobrenome)}</b>` : U().nomeEmDuasLinhas(UI, c.nome)}</h1>
            ${c.apelido ? `<p class="hl-apelido">“${e(c.apelido)}”</p>` : ''}
            <p class="mem-sub">${c.aposentado ? 'Carreira encerrada' : 'Carreira em andamento'} · ${e(UI.PERIODOS[c.periodo].nome)} · ${M.idadeAtual(c)} anos · fama ${e(L.fama.nome)}</p>
            <div class="mem-nums">${num(c.recorde.v + '-' + c.recorde.d + '-' + c.recorde.e, 'Cartel')}${num(L.titulos, 'Cinturões', L.titulos ? 'ouro' : '')}${num(L.defesas, 'Defesas', L.defesas ? 'ouro' : '')}${num(L.nocautes, 'Nocautes')}${num(L.finalizacoes, 'Finalizações')}</div>
          </div>
          ${cinto}
        </div>
      </section>
      <div class="duas-col">
        <div class="coluna">
          ${conquistas}
          <section class="bloco-j"><header><h3>Recordes</h3><span>da carreira</span></header>
            <ul class="recordes">
              <li><span>Maior sequência de vitórias</span><b>${L.maiorSequencia}</b></li>
              <li><span>Sequência atual</span><b>${L.sequenciaAtual}</b></li>
              <li><span>Vitórias antes do limite</span><b>${taxa}%</b></li>
              <li><span>Vitória mais rápida</span><b>${L.maisRapida ? e(L.maisRapida.tempo ? 'R' + L.maisRapida.round + ' ' + L.maisRapida.tempo : 'R' + L.maisRapida.round) + ' · ' + e(L.maisRapida.oponente) : '—'}</b></li>
              <li><span>Lutas na carreira</span><b>${L.lutasTotal}</b></li>
              ${L.torneios ? `<li><span>Torneios vencidos</span><b>${L.torneios}</b></li>` : ''}
              ${L.superlutas ? `<li><span>Superlutas vencidas</span><b>${L.superlutas}</b></li>` : ''}
              ${metas.length ? `<li><span>Metas cumpridas</span><b>${e(metas.join(', '))}</b></li>` : ''}
            </ul>
          </section>
          <section class="bloco-j"><header><h3>Premiações</h3><span>bônus da noite</span></header><ul class="premios">${premios}</ul></section>
        </div>
        <div class="coluna">
          <section class="bloco-j"><header><h3>Lutas memoráveis</h3><span>as que definiram a carreira</span></header><div class="memoraveis">${mem}</div></section>
          <section class="bloco-j"><header><h3>Rivalidades</h3><span>quanto mais quente, mais fama</span></header><ul class="lista-rivais">${rivais}</ul></section>
        </div>
      </div>
      <section class="bloco-j largo"><header><h3>Histórico completo</h3><span>${h.length} ${UI.plural(h.length, 'luta', 'lutas')}</span></header>
        ${h.length ? `<ul class="historico-j">${h.map((x) => linhaHistorico(UI, x)).join('')}</ul>` : '<p class="vazio">Sua primeira luta ainda não aconteceu.</p>'}
      </section>`;
  };

  window.TELAS = Object.assign(window.TELAS || {}, T);
})();
