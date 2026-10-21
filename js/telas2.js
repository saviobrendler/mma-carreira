// Proxima luta (evento, card e analise do confronto) e Treinamento (o camp semana a semana).
(function () {
  'use strict';

  const T = {};
  const U = () => window.TELAS_UTIL;

  // ---------------------------------------------------------------------------
  // PROXIMA LUTA
  // ---------------------------------------------------------------------------

  function linhaComparacao(UI, a) {
    const txt = a.vantagem === 'eu' ? 'vantagem sua' : a.vantagem === 'ele' ? 'vantagem dele' : 'equilibrado';
    return `<li class="${a.vantagem}"><span class="cmp-v eu">${Math.round(a.eu)}</span><div class="cmp-meio"><b>${UI.esc(a.nome)}</b><small>${txt}</small></div><span class="cmp-v ele">${Math.round(a.ele)}</span></li>`;
  }

  // Bloco "analise do confronto": usado na proxima luta e no perfil do adversario.
  T.analise = function (UI, op) {
    const c = UI.carreira;
    const M = UI.MMA;
    const cmp = M.comparacao(c, op);
    const sug = M.ESTRATEGIAS_ROUND[cmp.sugestao.id];
    const eu = U().info(UI, c.nome);
    const ele = U().info(UI, op.nome);
    return `<div class="analise">
      <div class="analise-cab"><span>${UI.esc(c.nome.split(' ').slice(-1)[0])}</span><span>${UI.esc(op.nome.split(' ').slice(-1)[0])}</span></div>
      <ul class="cmp">${cmp.areas.map((a) => linhaComparacao(UI, a)).join('')}</ul>
      <p class="analise-resumo">${UI.esc(cmp.resumo)}</p>
      <div class="sugestao"><span class="kicker gold">Sugestão do córner</span><b>${UI.esc(sug.nome)}</b><small>${UI.esc(cmp.sugestao.motivo)}</small></div>
    </div>`;
    void eu; void ele;
  };

  function cardDoEvento(UI, ev) {
    const c = UI.carreira;
    let atual = '';
    const linhas = ev.card.map((l) => {
      const cab = l.bloco !== atual ? `<div class="card-bloco">${UI.esc(l.bloco)}</div>` : '';
      atual = l.bloco;
      const lado = (x) => `<span class="cb-lado">${U().foto(UI, x.nome, 'mini')}<b>${UI.esc(x.nome)}</b></span>`;
      const res = l.resultado ? `<small class="cb-res">${UI.esc(l.resultado.vencedor || 'Empate')} · ${UI.esc(l.resultado.metodo || '')}</small>` : `<small>${UI.esc(UI.nomeDivisao(c.periodo, l.a.div))} · ${l.rounds} rounds</small>`;
      return `${cab}<div class="card-luta${l.jogador ? ' meu' : ''}${l.titulo ? ' titulo' : ''}">${lado(l.a)}<i>vs</i>${lado(l.b)}<div class="cb-info">${l.titulo ? '<span class="selo-ouro mini">Cinturão</span>' : ''}${res}</div></div>`;
    }).join('');
    return `<div class="card-evento">${linhas}</div>`;
  }

  function desafioCard(UI, o, i) {
    const c = UI.carreira;
    const M = UI.MMA;
    const op = o.op;
    const inf = U().info(UI, op.nome);
    const cmp = M.comparacao(c, op);
    const ch = UI.chance(op);
    const pos = M.posicaoDoJogador(c);
    const semanas = Math.max(M.MIN_PREPARO, o.semanasAte);
    const sobe = !o.titulo && pos && o.rank < pos;
    const tags = [
      o.titulo ? '<span class="selo-ouro">Cinturão</span>' : '',
      o.bonus ? '<span class="selo-azul">Luta-relâmpago</span>' : '',
      o.rival ? `<span class="selo-fogo">${(c.rivais[op.nome] || {}).motivo === 'revanche' ? 'Revanche' : 'Rivalidade'}</span>` : '',
      sobe ? '<span class="selo-verde">Sobe no ranking</span>' : '',
      op.lenda ? '<span class="selo-lenda">Lenda</span>' : '',
    ].join('');
    const partes = op.nome.split(' ');
    return `<article class="desafio ${o.titulo ? 'titulo' : ''}${o.bonus ? ' bonus' : ''}${o.rival ? ' rival' : ''}" style="--i:${i}">
      <div class="d-foto">${U().foto(UI, op.nome, 'alta')}<span class="d-rank">#${o.rank}</span></div>
      <div class="d-corpo">
        <div class="d-tags">${tags}</div>
        <h3><span>${UI.esc(partes.length > 1 ? partes[0] : '')}</span><b>${UI.esc(partes.length > 1 ? partes.slice(1).join(' ') : partes[0])}</b></h3>
        ${inf.apelido ? `<p class="d-apelido">“${UI.esc(inf.apelido)}”</p>` : ''}
        <p class="d-meta">${UI.esc([inf.nac, inf.cartel, M.ESTILOS[op.estilo] || ''].filter(Boolean).join(' · '))}</p>
        <p class="d-leitura">${UI.esc(cmp.resumo)}</p>
        <div class="d-rodape">
          <div class="d-dado"><small>Luta em</small><b>${semanas} sem.</b></div>
          <div class="d-dado"><small>Bolsa</small><b>$${o.bolsa.toLocaleString('pt-BR')}</b></div>
          <div class="d-dado">${UI.badge(ch.rotulo, ch.cls)}</div>
          <div class="d-botoes">
            ${UI.btn({ texto: 'Ver perfil', acao: 'ver-lutador', data: { nome: op.nome }, tipo: 'secondary' })}
            ${UI.btn({ texto: 'Aceitar luta', acao: 'aceitar-oferta', data: { id: o.id }, tipo: 'primary', trailing: 'seta' })}
          </div>
        </div>
      </div>
    </article>`;
  }

  function listaDesafios(UI) {
    const c = UI.carreira;
    const ofs = c.ofertas || [];
    if (c.aposentado) return `<section class="vazio-j"><h2>Carreira encerrada</h2><p>Não há mais lutas a marcar.</p>${UI.btn({ texto: 'Ver legado', acao: 'ir', data: { tela: 'legado' }, tipo: 'primary' })}</section>`;
    if (c.lesao) {
      return `<section class="vazio-j alerta"><span class="kicker">Em recuperação</span><h2>${UI.esc(c.lesao.nome)}</h2><p>Faltam ${c.lesao.semanas} ${UI.plural(c.lesao.semanas, 'semana', 'semanas')} para voltar a lutar. Quando você se recuperar, as ofertas aparecem aqui.</p>${UI.btn({ texto: 'Recuperar uma semana', acao: 'descansar', icone: 'lua', tipo: 'primary' })}</section>`;
    }
    return `<header class="cab-j"><span class="kicker">Próxima luta</span><h1>Escolha seu próximo desafio</h1><p>Ao aceitar, o evento é marcado e o camp de treino começa. Olhe a análise de cada adversário antes de decidir.</p></header>
      <div class="lista-desafios">${ofs.map((o, i) => desafioCard(UI, o, i)).join('') || '<section class="vazio-j"><h2>Nenhuma oferta agora</h2><p>As ofertas voltam com o tempo.</p>' + UI.btn({ texto: 'Esperar uma semana', acao: 'descansar', icone: 'lua', tipo: 'primary' }) + '</section>'}</div>`;
  }

  T.proxima = function (UI) {
    const c = UI.carreira;
    const M = UI.MMA;
    if (c.lutaAtiva) {
      return `<section class="vazio-j quente"><span class="kicker">Luta em andamento</span><h2>Contra ${UI.esc(c.lutaAtiva.op.nome)}</h2><p>Você parou no meio do combate.</p>${UI.btn({ texto: 'Retomar luta', acao: 'retomar', tipo: 'primary', trailing: 'seta', cls: 'grande' })}</section>`;
    }
    if (!c.agendada) return listaDesafios(UI);
    const a = c.agendada;
    const ev = a.evento;
    const dia = M.diaDeLuta(c);
    const sc = c.camp && c.camp.efeitos && c.camp.efeitos.scout;
    const risco = M.riscoLuta(c, a.op);
    const cta = dia
      ? UI.btn({ texto: 'Subir no octógono', acao: 'lutar-agora', tipo: 'primary', icone: 'luta', trailing: 'seta', cls: 'grande' })
      : UI.btn({ texto: 'Continuar o camp', acao: 'ir', data: { tela: 'treino' }, tipo: 'primary', icone: 'peso', trailing: 'seta', cls: 'grande' });
    return `${U().cartazLuta(UI, true)}
      <div class="acao-principal">${cta}<small>${dia ? 'O camp acabou. Defina sua estratégia na entrada do octógono.' : 'Faça as escolhas de cada semana de treino antes da luta.'}</small></div>
      <div class="duas-col">
        <section class="bloco-j"><header><h3>Card do evento</h3><span>${UI.esc(UI.MMA.dataTexto(ev.data))} · ${UI.esc(ev.local)}</span></header>${cardDoEvento(UI, ev)}</section>
        <section class="bloco-j"><header><h3>Análise do confronto</h3><span>${UI.esc(M.ESTILOS[a.op.estilo] || '')} · overall ${a.op.rating}</span></header>
          ${T.analise(UI, a.op)}
          <p class="risco ${risco.nivel}">${UI.esc(risco.texto)}</p>
          ${sc ? `<p class="leitura-rival">${UI.icone('lupa', 16)}<span>${UI.esc(a.plano.texto)}</span></p>` : '<p class="leitura-rival vazio">Estude o adversário no camp para descobrir o plano dele.</p>'}
        </section>
      </div>`;
  };

  // ---------------------------------------------------------------------------
  // TREINAMENTO
  // ---------------------------------------------------------------------------

  const ICONE_ETAPA = { plano: 'peso', scouting: 'lupa', evento: 'calendario', corte: 'balanca', coletiva: 'pessoas' };

  function stepper(UI) {
    const c = UI.carreira;
    const camp = c.camp;
    const itens = camp.etapas.map((e, i) => {
      const cls = i < camp.i ? 'feita' : i === camp.i ? 'atual' : '';
      return `<li class="${cls}"><span class="st-ico">${i < camp.i ? UI.icone('check', 16) : UI.icone(ICONE_ETAPA[e.tipo], 16)}</span><b>${UI.esc(UI.etapaNome(e.tipo))}</b><small>${e.semanas ? e.semanas + ' ' + UI.plural(e.semanas, 'sem.', 'sem.') : 'pré-luta'}</small></li>`;
    }).join('');
    const fim = `<li class="luta ${UI.MMA.campConcluido(c) ? 'atual' : ''}"><span class="st-ico">${UI.icone('luta', 16)}</span><b>Luta</b><small>sem. ${c.agendada.semanaLuta}</small></li>`;
    return `<ol class="camp-passos" aria-label="Etapas do camp">${itens}${fim}</ol>`;
  }

  function cartaoAtividade(UI, o, etapa) {
    const e = UI.esc;
    const chip = o.custo > 0 ? `<span class="chip neg">−${o.custo} energia</span>` : o.custo < 0 ? `<span class="chip pos">+${-o.custo} energia</span>` : '';
    const rcls = /alto/i.test(o.risco || '') ? 'alto' : /médio/i.test(o.risco || '') ? 'medio' : /baixo/i.test(o.risco || '') ? 'baixo' : 'zero';
    return `<button class="atv${o.recomendado ? ' rec' : ''}" data-acao="camp-decidir" data-id="${e(o.id)}"${o.ok === false ? ' disabled' : ''}>
      <span class="atv-ico">${UI.icone(o.icone || ICONE_ETAPA[etapa] || 'luta', 26)}</span>
      ${o.recomendado ? '<span class="atv-rec">Sugerido</span>' : ''}
      <b>${e(o.titulo)}</b>
      <p>${e(o.descr)}</p>
      ${o.ganhos && o.ganhos.length ? `<ul class="atv-ganhos">${o.ganhos.map((g) => `<li>${e(g)}</li>`).join('')}</ul>` : ''}
      <div class="atv-rodape">${chip}${o.risco ? `<span class="chip risco ${rcls}">${e(o.risco)}</span>` : ''}</div>
      ${o.motivo ? `<small class="atv-motivo">${e(o.motivo)}</small>` : ''}
      ${o.ok === false ? `<em class="razao">${e(o.razao)}</em>` : ''}
    </button>`;
  }

  function semCamp(UI) {
    const c = UI.carreira;
    const e = Math.round(c.energia);
    const cor = e < 30 ? 'vida' : e < 60 ? 'aviso' : 'ok';
    return `<header class="cab-j"><span class="kicker">Treinamento</span><h1>Sem camp em andamento</h1><p>O camp começa quando você aceita uma luta: cada semana vira uma decisão de treino, com ganhos e riscos.</p></header>
      <div class="duas-col">
        <section class="bloco-j"><header><h3>Seu corpo</h3><span>energia ${e} de 100</span></header>
          ${UI.barraAnim(e, cor, 'energia')}
          ${c.lesao ? `<p class="aviso-j">Lesão: ${UI.esc(c.lesao.nome)}, faltam ${c.lesao.semanas} ${UI.plural(c.lesao.semanas, 'semana', 'semanas')}.</p>` : '<p class="sub">Descanse entre as lutas para começar o próximo camp inteiro.</p>'}
          <div class="acoes-linha">${UI.btn({ texto: c.lesao ? 'Recuperar uma semana' : 'Esperar uma semana', acao: 'descansar', icone: 'lua' })}${UI.btn({ texto: 'Procurar desafio', acao: 'ir', data: { tela: 'proxima' }, tipo: 'primary', trailing: 'seta' })}</div>
        </section>
        <section class="bloco-j"><header><h3>Estrutura</h3><span>entre as lutas</span></header>
          <div class="lista-atalhos">
            <button data-acao="ir" data-tela="academia">${UI.icone('dinheiro', 20)}<span><b>Academia</b><small>Invista as bolsas em melhorias permanentes</small></span>${UI.icone('chevronDir', 16)}</button>
            <button data-acao="ir" data-tela="distribuir">${UI.icone('mais', 20)}<span><b>Distribuir pontos</b><small>${c.pontosDisponiveis || 0} ${UI.plural(c.pontosDisponiveis || 0, 'ponto', 'pontos')} de atributo</small></span>${UI.icone('chevronDir', 16)}</button>
            <button data-acao="ir" data-tela="habilidades">${UI.icone('arvore', 20)}<span><b>Habilidades</b><small>${c.pontosHab || 0} ${UI.plural(c.pontosHab || 0, 'ponto', 'pontos')} de habilidade</small></span>${UI.icone('chevronDir', 16)}</button>
          </div>
        </section>
      </div>`;
  }

  T.treino = function (UI) {
    const c = UI.carreira;
    const M = UI.MMA;
    if (c.lutaAtiva) return `<section class="vazio-j quente"><h2>Luta em andamento</h2><p>Termine o combate antes de treinar.</p>${UI.btn({ texto: 'Retomar luta', acao: 'retomar', tipo: 'primary' })}</section>`;
    if (!c.agendada || !c.camp) return semCamp(UI);
    const a = c.agendada;
    const ev = a.evento;
    const et = M.etapaAtual(c);
    const dia = M.diaDeLuta(c);
    const energia = Math.round(c.energia);
    const cor = energia < 30 ? 'vida' : energia < 60 ? 'aviso' : 'ok';
    const topo = `<header class="camp-topo">
      <div class="camp-quem">${U().foto(UI, c.nome, 'mini')}<span class="vs">vs</span>${U().foto(UI, a.op.nome, 'mini')}<div><span class="kicker">Camp · ${UI.esc(ev.nome)}</span><h1>${UI.esc(a.op.nome)}</h1><small>${UI.esc(UI.MMA.dataTexto(ev.data, true))} · ${UI.esc(U().semanasTxt(UI, a.semanaLuta - c.semana).toLowerCase())}</small></div></div>
      <div class="camp-energia"><span>Energia</span>${UI.barraAnim(c.energia, cor, 'energia')}<b>${energia}</b></div>
    </header>`;
    let corpo;
    if (dia || !et) {
      corpo = `<section class="vazio-j ok"><span class="kicker gold">Camp concluído</span><h2>Chegou a hora</h2><p>Você completou a preparação. Veja a análise final e suba no octógono.</p>${UI.btn({ texto: 'Ir para a próxima luta', acao: 'ir', data: { tela: 'proxima' }, tipo: 'primary', trailing: 'seta', cls: 'grande' })}</section>`;
    } else if (et.tipo === 'evento') {
      corpo = UI.blocoEvento();
    } else {
      const ops = M.opcoesEtapa(c);
      const sub = { plano: 'Escolha a atividade da semana. Cada uma melhora algo diferente, gasta energia e tem seu risco.', scouting: 'Estudar o adversário ou treinar mais?', corte: 'A pesagem está chegando.', coletiva: 'Como você trata o rival diante das câmeras?' }[et.tipo];
      corpo = `<section class="decisao"><header><span class="kicker">Etapa ${c.camp.i + 1} de ${c.camp.etapas.length} · ${et.semanas ? et.semanas + ' ' + UI.plural(et.semanas, 'semana', 'semanas') : 'pré-luta'}</span><h2>${UI.esc(UI.etapaTitulo(et.tipo))}</h2><p>${UI.esc(sub)}</p></header><div class="atividades n${ops.length}">${ops.map((o) => cartaoAtividade(UI, o, et.tipo)).join('')}</div></section>`;
    }
    const ult = c.camp.historico.slice().reverse().slice(0, 4);
    const historico = ult.length ? `<section class="bloco-j"><header><h3>O que já aconteceu no camp</h3></header><ul class="log-camp">${ult.map((h) => `<li><b>${UI.esc(h.titulo)}</b><span>${(h.linhas || []).map((l) => UI.esc(l)).join(' · ')}</span></li>`).join('')}</ul></section>` : '';
    return `${topo}${stepper(UI)}${corpo}${historico}`;
  };

  window.TELAS = Object.assign(window.TELAS || {}, T);
})();
