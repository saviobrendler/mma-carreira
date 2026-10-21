// Telas da central de carreira: Carreira, Proxima luta, Treinamento, Ranking (com perfil), Legado.
// Recebem o objeto UI (montado por app.js) com os helpers e o estado. So apresentacao: toda regra vem do engine.
(function () {
  'use strict';

  const T = {};

  // ---------------------------------------------------------------------------
  // Pecas reutilizaveis
  // ---------------------------------------------------------------------------

  const cartel = (c) => `${c.v}-${c.d}-${c.e || 0}`;

  // Dados de apresentacao de um lutador (do jogo ou da base de dados), pelo nome.
  function info(UI, nome) {
    const c = UI.carreira;
    if (c && nome === c.nome) {
      return { nome: nome, foto: c.foto || null, apelido: c.apelido || null, nac: c.pais || '', cartel: cartel(c.recorde), estilo: UI.MMA.ESTILOS[c.estilo] || '', jogador: true };
    }
    const l = UI.dados(nome);
    const k = l && l.cartel ? l.cartel : null;
    return {
      nome: nome,
      foto: UI.fotoSrc(nome),
      apelido: l && l.apelido ? l.apelido : null,
      nac: l && l.nacionalidade ? l.nacionalidade : '',
      cartel: k && k.vitorias != null ? `${k.vitorias}-${k.derrotas}` : '',
      estilo: l ? UI.MMA.ESTILOS[l.estilo] || '' : '',
      lutador: l || null,
    };
  }

  const iniciais = (nome) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  // Foto do lutador, recortada de forma padronizada (rosto no terco superior).
  function foto(UI, nome, cls) {
    const i = info(UI, nome);
    const e = UI.esc;
    if (i.foto) return `<div class="foto-l ${cls || ''}"><img src="${e(i.foto)}" alt="${e(nome)}" loading="lazy"></div>`;
    return `<div class="foto-l sem ${cls || ''}" style="--cor:${UI.corDoNome(nome)}"><span>${e(iniciais(nome))}</span></div>`;
  }

  function nomeEmDuasLinhas(UI, nome) {
    const partes = nome.split(' ');
    const sobre = partes.length > 1 ? partes.slice(1).join(' ') : partes[0];
    const primeiro = partes.length > 1 ? partes[0] : '';
    return `<span>${UI.esc(primeiro)}</span><b>${UI.esc(sobre)}</b>`;
  }

  const semanasTxt = (UI, n) => (n <= 0 ? 'Hoje' : n === 1 ? 'Falta 1 semana' : `Faltam ${n} semanas`);

  function statusAtual(UI) {
    const c = UI.carreira;
    const M = UI.MMA;
    if (c.aposentado) return { txt: 'Aposentado', cls: 'neutro' };
    if (c.lutaAtiva) return { txt: 'Luta em andamento', cls: 'quente' };
    if (c.lesao) return { txt: `Lesionado · ${c.lesao.nome} (${c.lesao.semanas} ${UI.plural(c.lesao.semanas, 'semana', 'semanas')})`, cls: 'alerta' };
    if (c.agendada) return M.diaDeLuta(c) ? { txt: 'Dia da luta', cls: 'quente' } : { txt: `Em camp · ${semanasTxt(UI, c.agendada.semanaLuta - c.semana).toLowerCase()} para lutar`, cls: 'ok' };
    return { txt: c.campeao ? 'Campeão · escolha o próximo desafio' : 'Livre para lutar', cls: 'ok' };
  }

  // ---------------------------------------------------------------------------
  // Cartaz da luta marcada (usado na Carreira e na Proxima luta)
  // ---------------------------------------------------------------------------

  function lado(UI, nome, rank, destaque) {
    const i = info(UI, nome);
    const e = UI.esc;
    return `<figure class="cl-lado ${destaque || ''}">
      ${foto(UI, nome, 'alta')}
      <figcaption>
        <b>${e(nome.split(' ').slice(-1)[0])}</b>
        <small>${e(nome.split(' ').slice(0, -1).join(' '))}</small>
        ${i.apelido ? `<em>“${e(i.apelido)}”</em>` : ''}
        <span class="cl-sub">${[i.cartel, rank ? '#' + rank : ''].filter(Boolean).join(' · ')}</span>
      </figcaption>
    </figure>`;
  }

  function cartazLuta(UI, completo) {
    const c = UI.carreira;
    const a = c.agendada;
    const ev = a.evento;
    const falta = a.semanaLuta - c.semana;
    const dia = UI.MMA.diaDeLuta(c);
    const e = UI.esc;
    const pos = UI.MMA.posicaoDoJogador(c);
    const cat = UI.categoria(c);
    return `<article class="cartaz-luta ${a.titulo ? 'titulo' : ''}${dia ? ' dia' : ''}">
      <header class="cl-topo">
        <div><span class="cl-evento">${e(ev.nome)}</span><b>${e(ev.subtitulo)}</b></div>
        <div class="cl-quando"><b>${e(UI.MMA.dataTexto(ev.data, true))}</b><small>${e(ev.local)}</small></div>
      </header>
      <div class="cl-confronto">
        ${lado(UI, c.nome, c.campeao ? 0 : pos, 'eu')}
        <div class="cl-vs">
          ${a.titulo ? '<span class="selo-ouro">Cinturão</span>' : `<span class="cl-bloco">${e((ev.card.find((l) => l.jogador) || {}).bloco || '')}</span>`}
          <b>VS</b>
          <small>${a.titulo ? 5 : 3} rounds · ${e(cat)}</small>
        </div>
        ${lado(UI, a.op.nome, a.rank, 'ele')}
      </div>
      <footer class="cl-rodape">
        <span class="cl-contagem ${dia ? 'hoje' : ''}">${dia ? 'É hoje' : semanasTxt(UI, falta)}</span>
        ${completo ? '' : UI.btn({ texto: dia ? 'Ir para o octógono' : 'Preparar luta', acao: 'ir', data: { tela: 'proxima' }, tipo: 'primary', trailing: 'seta', cls: 'grande' })}
      </footer>
    </article>`;
  }

  // ---------------------------------------------------------------------------
  // CARREIRA (central)
  // ---------------------------------------------------------------------------

  function painelHero(UI) {
    const c = UI.carreira;
    const M = UI.MMA;
    const e = UI.esc;
    const pos = M.posicaoDoJogador(c);
    const f = M.nivelFama(c);
    const partes = c.nome.split(' ');
    const status = statusAtual(UI);
    const nome = c.primeiroNome && c.sobrenome ? `<span>${e(c.primeiroNome)}</span><b>${e(c.sobrenome)}</b>` : nomeEmDuasLinhas(UI, c.nome);
    void partes;
    return `<article class="hero-l${c.campeao ? ' campeao' : ''}">
      <div class="hl-foto">${foto(UI, c.nome, 'hero')}</div>
      <div class="hl-corpo">
        <div class="hl-topo"><span class="org">UFC</span><span>${e(UI.categoria(c))}</span>${c.campeao ? '<span class="selo-ouro">Campeão</span>' : ''}</div>
        <h1 class="hl-nome">${nome}</h1>
        ${c.apelido ? `<p class="hl-apelido">“${e(c.apelido)}”</p>` : ''}
        <ul class="hl-meta">
          <li>${e([c.cidade, c.pais].filter(Boolean).join(', ') || 'Sem origem')}</li>
          <li>${M.idadeAtual(c)} anos</li>
          <li>${e(M.ESTILOS[c.estilo] || '')}</li>
        </ul>
        <div class="hl-numeros">
          <div><small>Cartel</small><b>${cartel(c.recorde)}</b></div>
          <div><small>Ranking</small><b>${c.campeao ? 'Campeão' : pos ? '#' + pos : '—'}</b></div>
          <div><small>Fama</small><b>${e(f.nome)}</b></div>
        </div>
        <p class="hl-status ${status.cls}">${e(status.txt)}</p>
      </div>
    </article>`;
  }

  function painelProximo(UI) {
    const c = UI.carreira;
    const M = UI.MMA;
    if (c.aposentado) {
      return `<article class="prox-vazio"><span class="kicker">Carreira encerrada</span><h2>Pendurou as luvas</h2><p>Sua história está no hall da fama.</p>${UI.btn({ texto: 'Ver legado', acao: 'ir', data: { tela: 'legado' }, tipo: 'primary' })}</article>`;
    }
    if (c.lutaAtiva) {
      return `<article class="prox-vazio quente"><span class="kicker">Luta em andamento</span><h2>Contra ${UI.esc(c.lutaAtiva.op.nome)}</h2><p>O combate foi interrompido. Volte de onde parou.</p>${UI.btn({ texto: 'Retomar luta', acao: 'retomar', tipo: 'primary', trailing: 'seta', cls: 'grande' })}</article>`;
    }
    if (c.agendada) return cartazLuta(UI, false);
    if (c.lesao) {
      return `<article class="prox-vazio alerta"><span class="kicker">Em recuperação</span><h2>${UI.esc(c.lesao.nome)}</h2><p>Faltam ${c.lesao.semanas} ${UI.plural(c.lesao.semanas, 'semana', 'semanas')}. Sem ofertas até se recuperar${M.nivelAcademia(c, 'fisio') ? '; sua fisioterapia acelera a cura' : ''}.</p>${UI.btn({ texto: 'Recuperar uma semana', acao: 'descansar', icone: 'lua', tipo: 'primary' })}</article>`;
    }
    const of = M.proximaOferta(c);
    const n = (c.ofertas || []).length;
    return `<article class="prox-vazio livre">
      <span class="kicker">Próxima luta</span>
      <h2>${c.campeao ? 'Quem vem atrás do cinturão?' : 'Nenhuma luta marcada'}</h2>
      <p>${n ? `${n} ${UI.plural(n, 'adversário quer', 'adversários querem')} lutar com você${of && of.titulo ? ', e há uma disputa de cinturão na mesa' : ''}.` : 'Sem ofertas agora.'}</p>
      ${n ? UI.btn({ texto: 'Procurar próximo desafio', acao: 'ir', data: { tela: 'proxima' }, tipo: 'primary', trailing: 'seta', cls: 'grande' }) : UI.btn({ texto: 'Esperar uma semana', acao: 'descansar', icone: 'lua', tipo: 'primary' })}
    </article>`;
  }

  function tiles(UI) {
    const c = UI.carreira;
    const M = UI.MMA;
    const camp = c.agendada && c.camp;
    const et = camp ? M.etapaAtual(c) : null;
    const pend = (c.pontosDisponiveis || 0) + (c.pontosHab || 0) + M.tracosPendentes(c) + M.assinaturasPendentes(c);
    const ult = (c.historico || []).slice(-5);
    const tile = (tela, ico, rot, valor, sub, extra) => `<button class="tile${extra ? ' ' + extra : ''}" data-acao="ir" data-tela="${tela}"><span class="tile-ico">${UI.icone(ico, 22)}</span><span class="tile-rot">${rot}</span><b>${valor}</b><small>${sub}</small></button>`;
    const energia = Math.round(c.energia);
    return `<section class="tiles">
      ${tile('treino', 'peso', 'Treinamento', camp ? (et ? 'Etapa ' + (c.camp.i + 1) + ' de ' + c.camp.etapas.length : 'Camp concluído') : 'Energia ' + energia, camp ? (et ? UI.etapaNome(et.tipo) : 'Hora da luta') : c.lesao ? 'Recupere-se' : 'Sem camp ativo', camp && et ? 'foco' : '')}
      ${tile('habilidades', 'arvore', 'Evolução', pend ? pend + ' ' + UI.plural(pend, 'escolha', 'escolhas') : 'Em dia', pend ? 'Pontos e vagas esperando' : 'Nada pendente', pend ? 'foco' : '')}
      ${tile('academia', 'dinheiro', 'Dinheiro', '$' + c.dinheiro.toLocaleString('pt-BR'), 'Academia e estrutura')}
      <button class="tile historico" data-acao="ir" data-tela="legado"><span class="tile-ico">${UI.icone('historico', 22)}</span><span class="tile-rot">Últimas lutas</span>
        <span class="pontos-res">${ult.length ? ult.map((x) => `<i class="${x.resultado === 'Vitória' ? 'v' : x.resultado === 'Derrota' ? 'd' : 'e'}" title="${UI.esc(x.resultado + ' · ' + x.oponente)}">${x.resultado[0]}</i>`).join('') : '<em>Sem lutas</em>'}</span>
        <small>${ult.length ? UI.esc(ult[ult.length - 1].resultado + ' contra ' + ult[ult.length - 1].oponente) : 'Sua história começa aqui'}</small></button>
    </section>`;
  }

  T.hub = function (UI) {
    const c = UI.carreira;
    const g = UI.MMA.ganchos(c).filter((x) => x.tipo !== 'meta' && x.tipo !== 'habilidade' && x.tipo !== 'pontos' && x.tipo !== 'traco')[0];
    return `<div class="central">
        ${painelHero(UI)}
        ${painelProximo(UI)}
      </div>
      ${g && !c.aposentado ? `<p class="passo"><span>${UI.icone('seta', 16)}</span>${UI.esc(g.texto)}</p>` : ''}
      ${tiles(UI)}
      ${UI.blocoEvento ? UI.blocoEvento() : ''}`;
  };

  window.TELAS = Object.assign(window.TELAS || {}, T);
  window.TELAS_UTIL = { info: info, foto: foto, lado: lado, cartazLuta: cartazLuta, nomeEmDuasLinhas: nomeEmDuasLinhas, semanasTxt: semanasTxt, statusAtual: statusAtual, cartel: cartel };
})();
