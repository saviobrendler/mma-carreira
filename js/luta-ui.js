// Luta em rounds, como numa transmissao: antes de cada round voce escolhe a estrategia, o motor simula o
// round (o mesmo motor do "Ver resultado") e voce le o resumo, as estatisticas e a condicao dos lutadores
// antes de ajustar o plano. Sem animacao de combate e sem audio. Toda a regra fica em engine.js.
(function () {
  'use strict';

  const LutaUI = {};
  let token = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduz = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const iniciaisDe = (nome) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const mmss = (seg) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}`;

  // Duas etiquetas curtas por estrategia: o que ela ganha e o que ela custa.
  const ETIQUETAS = {
    trocacao: ['Ataque em pé', 'Se expõe'],
    contra: ['Poupa fôlego', 'Cede iniciativa'],
    pressao: ['Cansa o rival', 'Gasta fôlego'],
    quedas: ['Busca o chão', 'Gasta fôlego'],
    wrestling: ['Controle', 'Pouco risco'],
    finalizacao: ['Busca finalização', 'Se expõe'],
    equilibrada: ['Adaptável', 'Lê o rival'],
    resistencia: ['Poupa fôlego', 'Menos ofensiva'],
  };

  const condicao = (stam) => (stam >= 75 ? 'Inteiro' : stam >= 55 ? 'Bem' : stam >= 35 ? 'Cansado' : 'Esgotado');

  LutaUI.montar = function (raiz, ctx) {
    const meu = ++token;
    const MMA = ctx.MMA;
    const luta = ctx.luta;
    const vivo = () => meu === token && raiz.isConnected;
    const nomes = [ctx.nomeA, ctx.nomeB];
    const total = luta.rodadasTotais;
    const ESTR = MMA.ESTRATEGIAS_ROUND;
    const ordem = ['trocacao', 'contra', 'pressao', 'quedas', 'wrestling', 'finalizacao', 'equilibrada', 'resistencia'].filter((id) => ESTR[id]);
    let selecionada = luta.estrategia[0] || ctx.sugestao || 'equilibrada';
    if (!ESTR[selecionada]) selecionada = 'equilibrada';
    let ocupado = false;

    const foto = (n, cls) => {
      const f = n === 0 ? ctx.fotoA : ctx.fotoB;
      return f
        ? `<div class="foto-l ${cls || ''}"><img src="${esc(f)}" alt="${esc(nomes[n])}"></div>`
        : `<div class="foto-l sem ${cls || ''}" style="--cor:${n === 0 ? ctx.corIniA : ctx.corIniB}"><span>${esc(iniciaisDe(nomes[n]))}</span></div>`;
    };
    const sobre = (n) => nomes[n].split(' ').slice(-1)[0];
    const primeiro = (n) => nomes[n].split(' ').slice(0, -1).join(' ');

    // ---------- pecas ----------

    function faixaEvento() {
      return `<div class="tv-faixa"><b>${esc(ctx.eventoNome || 'Noite de luta')}</b>${ctx.bloco ? `<span>${esc(ctx.bloco)}</span>` : ''}<span>${total} rounds de 5 minutos</span>${ctx.titulo ? '<span class="selo-ouro">Cinturão em jogo</span>' : ''}</div>`;
    }

    function lutador(n, grande) {
      const apel = n === 0 ? ctx.apelidoA : ctx.apelidoB;
      const sub = n === 0 ? ctx.subA : ctx.subB;
      return `<div class="tv-lutador ${n === 0 ? 'eu' : 'ele'}${grande ? ' grande' : ''}">
        ${foto(n, grande ? 'alta' : 'mini')}
        <div class="tv-nome"><small>${esc(primeiro(n))}</small><b>${esc(sobre(n))}</b>${apel ? `<em>“${esc(apel)}”</em>` : ''}<span>${esc(sub || '')}</span></div>
      </div>`;
    }

    function duelo(grande) {
      const feitos = luta.rodadas.length;
      const placar = feitos
        ? `<div class="tv-placar"><b>${luta.totais[0]}</b><i>–</i><b>${luta.totais[1]}</b><small>após ${feitos} ${feitos === 1 ? 'round' : 'rounds'}</small></div>`
        : '<div class="tv-placar vs"><b>VS</b></div>';
      return `<div class="tv-duelo${grande ? ' grande' : ''}">${lutador(0, grande)}${placar}${lutador(1, grande)}</div>`;
    }

    function cartoesEstrategia(sug) {
      return `<div class="estrategias" role="radiogroup" aria-label="Estratégia do round">${ordem.map((id, i) => {
        const e = ESTR[id];
        const marcada = id === selecionada;
        return `<button type="button" class="estr${marcada ? ' sel' : ''}${id === sug ? ' sug' : ''}" role="radio" aria-checked="${marcada}" data-estr="${id}">
          <kbd>${i + 1}</kbd>
          ${id === sug ? '<span class="estr-sug">Sugerida</span>' : ''}
          <b>${esc(e.nome)}</b>
          <p>${esc(e.descr)}</p>
          <div class="estr-tags">${(ETIQUETAS[id] || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
        </button>`;
      }).join('')}</div>`;
    }

    // Sugestao para o proximo round, olhando o placar, o folego e as fases da luta.
    function sugerir() {
      if (!luta.rodadas.length) return { id: ctx.sugestao || 'equilibrada', motivo: ctx.sugestaoMotivo || 'Leitura do seu córner antes da luta.' };
      const f = luta.f;
      const restam = total - luta.rodadas.length;
      const dif = luta.totais[0] - luta.totais[1];
      if (f[0].stam < 38) return { id: 'resistencia', motivo: 'Seu fôlego está baixo: poupe energia.' };
      if (dif < 0 && restam <= 1) return { id: f[0].attr.bjj > f[1].attr.bjj + 6 ? 'finalizacao' : 'pressao', motivo: 'Você perde no placar e só resta um round: vá atrás da luta.' };
      if (dif < 0) return { id: f[0].attr.wrestling > f[1].attr.defesa ? 'quedas' : 'pressao', motivo: 'Você está atrás: mude o ritmo e tire o rival da zona de conforto.' };
      if (dif > 0 && restam <= 2) return { id: 'wrestling', motivo: 'Você está na frente: controle os rounds e evite riscos.' };
      return { id: luta.estrategia[0] || 'equilibrada', motivo: 'O plano está funcionando: mantenha.' };
    }

    // Clima da luta nos cartoes dos juizes e o que o corner diz olhando o round que acabou.
    function climaRound() {
      const feitos = luta.rodadas.length;
      const restam = total - feitos;
      const m = luta.cartoes.map((c) => c[0] - c[1]);
      const meus = m.filter((x) => x > 0).length;
      const dele = m.filter((x) => x < 0).length;
      let txt;
      let tom = 'neutro';
      if (restam === 1) {
        if (dele === 3) { txt = 'Round decisivo: você perde nos três cartões. Para virar, precisa vencer este round com folga ou buscar a finalização.'; tom = 'alerta'; }
        else if (meus === 3) { txt = 'Round decisivo: você está na frente nos três cartões. Um round de cuidado garante a decisão.'; tom = 'bom'; }
        else { txt = 'Round decisivo: o placar está apertado e este round decide a luta.'; tom = 'alerta'; }
      } else if (dele === 3) { txt = 'Você perde nos três cartões. O córner quer mais volume e mais risco.'; tom = 'alerta'; }
      else if (meus === 3) { txt = 'Você lidera nos três cartões. Mantenha o plano e não se exponha à toa.'; tom = 'bom'; }
      else if (meus === 0 && dele === 0) txt = 'Luta empatada nos cartões: quem tomar a iniciativa agora abre vantagem.';
      else txt = 'Cartões divididos: o próximo round pode virar a luta.';
      return { txt: txt, tom: tom, decisivo: restam === 1 };
    }

    function falasCorner(rodada) {
      const f = luta.f;
      const e = rodada.est;
      const falas = [];
      if (e[1].quedasOk >= 1 && e[1].quedasOk >= e[0].quedasOk) falas.push('Ele já levou você ao chão ' + e[1].quedasOk + (e[1].quedasOk === 1 ? ' vez' : ' vezes') + ': reforce a defesa ou leve a luta para onde você manda (Wrestling e controle).');
      if (e[1].acertos - e[0].acertos >= 3) falas.push('Ele acerta mais em pé (' + e[1].acertos + ' a ' + e[0].acertos + '): tente o Contra-ataque ou tire a luta da trocação.');
      if (e[0].acertos - e[1].acertos >= 3) falas.push('Você domina a trocação (' + e[0].acertos + ' a ' + e[1].acertos + '): insista nela.');
      if (f[0].stam < 45) falas.push('Seu fôlego está acabando: Administrar resistência ou o córner Respirar.');
      if (f[1].stam < 40) falas.push('Ele está cansado: é hora de Pressão constante.');
      if (f[0].corte) falas.push('Seu corte preocupa: use o conselho de tratar o corte para evitar a parada médica.');
      if (f[1].corte) falas.push('Ele está cortado: golpes no rosto podem render uma parada médica.');
      if (rodada.ctrl && rodada.ctrl[1] - rodada.ctrl[0] >= 2) falas.push('Ele controlou o chão por mais tempo: prepare a escapada ou impeça a queda.');
      if (!falas.length) falas.push(rodada.placar[0] > rodada.placar[1] ? 'Bom round. Continue assim.' : rodada.placar[1] > rodada.placar[0] ? 'Round perdido. Precisamos mudar alguma coisa.' : 'Round parelho. Ajuste um detalhe e abra vantagem.');
      return falas.slice(0, 3);
    }

    function blocoCorner(rodada) {
      const c = climaRound();
      return `<section class="tv-clima ${c.tom}${c.decisivo ? ' decisivo' : ''}"><div class="clima-topo">${c.decisivo ? '<span class="clima-selo">Round decisivo</span>' : ''}<p>${esc(c.txt)}</p></div><div class="corner-fala"><span class="kicker">Seu córner diz</span><ul>${falasCorner(rodada).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></section>`;
    }

    function tabela(rodada) {
      const e = rodada.est;
      const ctrl = rodada.ctrl || [0, 0];
      const cmp = (x, y) => (x === y ? '' : x > y ? ' a' : ' b');
      const linha = (rot, a, b, cls) => `<div class="te-linha${cls || ''}"><b>${a}</b><span>${rot}</span><b>${b}</b></div>`;
      const danoPct = (d) => Math.round((d * 100) / 160);
      return `<div class="tab-est" role="table" aria-label="Estatísticas do round">
        <div class="te-linha cab"><b>${esc(sobre(0))}</b><span>Round ${rodada.num}</span><b>${esc(sobre(1))}</b></div>
        ${linha('Golpes significativos', e[0].acertos, e[1].acertos, cmp(e[0].acertos, e[1].acertos))}
        ${linha('Quedas (feitas/tentadas)', e[0].quedasOk + '/' + e[0].quedasTent, e[1].quedasOk + '/' + e[1].quedasTent, cmp(e[0].quedasOk, e[1].quedasOk))}
        ${linha('Tentativas de finalização', e[0].subTent, e[1].subTent, cmp(e[0].subTent, e[1].subTent))}
        ${linha('Controle no chão', mmss(ctrl[0] * 37.5), mmss(ctrl[1] * 37.5), cmp(ctrl[0], ctrl[1]))}
        ${linha('Dano causado', danoPct(rodada.dano[0]) + '%', danoPct(rodada.dano[1]) + '%', cmp(rodada.dano[0], rodada.dano[1]))}
      </div>`;
    }

    function condicaoLutadores() {
      const f = luta.f;
      const bloco = (n) => {
        const dano = 100 - MMA.vidaPct(f[n]);
        return `<div class="cond ${n === 0 ? 'eu' : 'ele'}"><b>${esc(sobre(n))}</b>
          <div class="cond-linha"><span>Condição</span><em>${condicao(f[n].stam)}</em></div>
          <div class="cond-linha"><span>Resistência</span><div class="cond-barra"><i style="width:${clamp(Math.round(f[n].stam), 0, 100)}%"></i></div><em>${Math.round(f[n].stam)}%</em></div>
          <div class="cond-linha"><span>Dano acumulado</span><div class="cond-barra dano"><i style="width:${clamp(dano, 0, 100)}%"></i></div><em>${dano}%</em></div>
          ${f[n].corte ? `<div class="cond-linha"><span>Corte</span><em class="alerta">${f[n].corte >= 2 ? 'Grave' : 'Aberto'}</em></div>` : ''}
        </div>`;
      };
      return `<div class="condicao">${bloco(0)}${bloco(1)}</div>`;
    }

    function destaques(rodada) {
      // lances de destaque; se o round foi quieto, completa com os primeiros lances para o relato nao ficar vazio
      const marcados = new Set(rodada.eventos.filter((e) => e.tipo === 'destaque'));
      for (let i = 0; i < rodada.eventos.length && marcados.size < 4; i++) marcados.add(rodada.eventos[i]);
      const lista = rodada.eventos.filter((e) => marcados.has(e)).slice(0, 9);
      if (!lista.length) return '<p class="vazio">Um round de estudo, sem grandes momentos.</p>';
      return `<ol class="destaques">${lista.map((e) => `<li class="${e.ator === 0 ? 'eu' : e.ator === 1 ? 'ele' : ''}">${esc(e.texto)}</li>`).join('')}</ol>`;
    }

    function placarRound(rodada) {
      const juizes = rodada.juizes || [rodada.placar, rodada.placar, rodada.placar];
      const acabou = rodada.ko || rodada.sub;
      const quem = rodada.placar[0] > rodada.placar[1] ? 'Você levou o round' : rodada.placar[1] > rodada.placar[0] ? 'O rival levou o round' : 'Round parelho';
      return `<div class="rd-placar${acabou ? ' fim' : ''}">
        <div class="rd-num"><small>Round</small><b>${rodada.num}</b><small class="rd-tempo">${acabou && luta.resultado && luta.resultado.round === rodada.num ? 'Fim aos ' + esc(luta.resultado.tempo || '') : 'Tempo 5:00'}</small></div>
        <div class="rd-cartao"><b>${rodada.placar[0]}</b><i>–</i><b>${rodada.placar[1]}</b><small>${acabou ? 'Luta encerrada' : quem}</small></div>
        <div class="rd-juizes">${juizes.map((k, i) => `<span><small>Juiz ${i + 1}</small><b>${k[0]}–${k[1]}</b></span>`).join('')}</div>
      </div>`;
    }

    function opcoesCorner() {
      const ops = luta.opcoesConselho(0);
      const cheio = luta.conselhoUsado >= luta.conselhoMax();
      return `<section class="corner"><header><span class="kicker gold">Córner · opcional</span><small>${luta.conselhoMax() > 1 ? 'até dois conselhos' : 'um conselho'} no intervalo</small></header>
        <div class="corner-ops">${ops.map((o) => `<button type="button" data-conselho="${o.id}"${o.ok && !cheio ? '' : ' disabled'} class="${o.usado ? 'escolhido' : ''}"><b>${esc(o.nome)}</b><small>${esc(o.descr)}</small></button>`).join('')}</div></section>`;
    }

    // ---------- telas ----------

    // Apresentacao do locutor: quem entra, de onde vem, o cartel e a pesagem.
    function blocoApresentacao() {
      const a = ctx.apresentacao;
      if (!a || !a.linhas || !a.linhas.length) return '';
      return `<section class="tv-apresentacao" aria-label="Apresentação da luta"><span class="kicker">Na entrada do octógono</span><ol>${a.linhas.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></section>`;
    }

    function telaPlano() {
      const sug = sugerir();
      selecionada = ESTR[sug.id] ? (luta.estrategia[0] || sug.id) : selecionada;
      raiz.innerHTML = `<div class="tv luta-plano">
        ${faixaEvento()}
        ${duelo(true)}
        ${blocoApresentacao()}
        <section class="tv-plano">
          <header><span class="kicker gold">Antes da luta</span><h2>Sua estratégia inicial</h2><p>${esc(sug.motivo)} Você pode mudar o plano a cada round.</p></header>
          ${cartoesEstrategia(sug.id)}
          <div class="tv-acoes">
            <button type="button" class="btn primary grande" id="b-comecar">Simular round 1<span class="btn-seta">→</span></button>
            <button type="button" class="btn secondary" id="b-comandar">Comandar o round<small>Você decide durante o round</small></button>
            <button type="button" class="btn secondary" id="b-resultado">Ver resultado<small>Simula a luta inteira agora</small></button>
          </div>
        </section>
      </div>`;
      ligarEstrategias();
      raiz.querySelector('#b-comecar').addEventListener('click', jogarRound);
      raiz.querySelector('#b-comandar').addEventListener('click', comandarRound);
      raiz.querySelector('#b-resultado').addEventListener('click', verResultado);
      const sel = raiz.querySelector('.estr.sel');
      if (sel) sel.focus({ preventScroll: true });
    }

    // Faixa de encerramento: a luta acabou (nocaute, finalizacao, parada medica ou fim dos rounds).
    function faixaFim() {
      const res = luta.resultado;
      const venceu = res.vencedor === 0;
      const empate = res.vencedor === null;
      const finalizada = res.metodo === 'Nocaute' || res.metodo === 'Finalização';
      const quem = empate ? null : nomes[venceu ? 0 : 1];
      const como = finalizada
        ? `${res.metodo}${res.detalhe ? ' (' + res.detalhe + ')' : ''} no round ${res.round}, aos ${res.tempo || '5:00'}`
        : 'Os juízes vão decidir a luta';
      return `<section class="tv-fim ${empate ? 'empate' : venceu ? 'venceu' : 'perdeu'}">
        <span class="kicker">${finalizada ? 'Luta encerrada' : 'Fim dos rounds'}</span>
        <h2>${esc(como)}</h2>
        <p>${quem ? (finalizada ? esc(quem) + ' vence a luta.' : 'A luta foi até o fim.') : 'A luta foi até o fim.'}</p>
        <button type="button" class="btn primary grande" data-acao="concluir" id="b-oficial">Ver resultado oficial<span class="btn-seta">→</span></button>
      </section>`;
    }

    // Resumo de um round: o que aconteceu, estatisticas e condicao. Entre rounds traz o plano do proximo; no ultimo, o encerramento.
    function telaResumo(rodada, final) {
      const sug = sugerir();
      const proximo = luta.rodadas.length + 1;
      const rodape = final
        ? faixaFim()
        : `${blocoCorner(rodada)}<section class="tv-plano">
          <header><span class="kicker gold">Intervalo</span><h2>Estratégia para o round ${proximo}</h2><p>${esc(sug.motivo)}</p></header>
          ${cartoesEstrategia(sug.id)}
          ${opcoesCorner()}
          <div class="tv-acoes">
            <button type="button" class="btn primary grande" id="b-prox">Simular round ${proximo}<span class="btn-seta">→</span></button>
            <button type="button" class="btn secondary" id="b-comandar">Comandar o round<small>Você decide durante o round</small></button>
            <button type="button" class="btn secondary" id="b-resto">Ver resultado<small>Simula o restante da luta agora</small></button>
          </div>
        </section>`;
      raiz.innerHTML = `<div class="tv luta-resumo${final ? ' final' : ''}">
        ${faixaEvento()}
        ${duelo(false)}
        <section class="tv-resumo">
          ${placarRound(rodada)}
          <div class="resumo-colunas">
            <div class="rc-esq"><h3>O que aconteceu</h3>${destaques(rodada)}</div>
            <div class="rc-dir">${tabela(rodada)}${condicaoLutadores()}</div>
          </div>
        </section>
        ${rodape}
      </div>`;
      if (final) {
        const b = raiz.querySelector('#b-oficial');
        if (b) b.focus({ preventScroll: true });
        return;
      }
      ligarEstrategias();
      raiz.querySelector('#b-prox').addEventListener('click', jogarRound);
      raiz.querySelector('#b-comandar').addEventListener('click', comandarRound);
      raiz.querySelector('#b-resto').addEventListener('click', verResultado);
      raiz.querySelectorAll('[data-conselho]').forEach((b) => b.addEventListener('click', () => {
        if (!vivo() || ocupado) return;
        if (luta.conselho(0, b.dataset.conselho)) {
          ctx.aoSalvar();
          const y = window.scrollY;
          telaResumo(rodada, false);
          window.scrollTo(0, y);
        }
      }));
    }

    function telaSimulando(n) {
      raiz.innerHTML = `<div class="tv luta-sim">${faixaEvento()}${duelo(false)}<section class="tv-sim" role="status" aria-live="polite"><span class="spin" aria-hidden="true"></span><h2>Round ${n}</h2><p>Estratégia: ${esc(ESTR[selecionada].nome)}</p></section></div>`;
    }

    function ligarEstrategias() {
      const grupo = raiz.querySelector('.estrategias');
      const marcar = (id, foco) => {
        selecionada = id;
        grupo.querySelectorAll('.estr').forEach((b) => {
          const on = b.dataset.estr === id;
          b.classList.toggle('sel', on);
          b.setAttribute('aria-checked', String(on));
          if (on && foco) b.focus({ preventScroll: true });
        });
      };
      grupo.addEventListener('click', (e) => {
        const b = e.target.closest('[data-estr]');
        if (b) marcar(b.dataset.estr, false);
      });
      grupo.addEventListener('keydown', (e) => {
        const i = ordem.indexOf(selecionada);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { marcar(ordem[(i + 1) % ordem.length], true); e.preventDefault(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { marcar(ordem[(i + ordem.length - 1) % ordem.length], true); e.preventDefault(); }
      });
    }

    // ---------- comando durante o round ----------

    const DICAS = {
      trocar: (eu, ele) => dica(eu.striking - ele.defesa, 'Seus golpes passam', 'Ele se defende bem', 'Troca equilibrada'),
      pressionar: (eu, ele, st) => (st < 60 ? 'Vai custar fôlego' : 'Pressão total'),
      derrubar: (eu, ele) => dica(eu.wrestling - ele.defesa, 'Vantagem na queda', 'Ele defende bem a queda', 'Queda equilibrada'),
      cautela: () => 'Poupa fôlego e permite contra-golpes',
      contra: (eu, ele) => dica(eu.qi - ele.qi, 'Você lê bem o rival', 'Ele é difícil de ler', 'Pune o erro e poupa fôlego'),
      clinch: (eu, ele) => dica(eu.forca - ele.forca, 'Você é mais forte colado', 'Ele é mais forte colado', 'Joelhos e projeções'),
      raspar: (eu, ele) => dica(eu.grappling - ele.grappling, 'Boa chance de inverter', 'Difícil inverter', 'Pode inverter a posição'),
      controlar: () => 'Equilibrado',
      castigar: (eu, ele) => dica((eu.striking + eu.forca) / 2 - ele.queixo, 'Pode nocautear', 'Queixo duro', 'Dano seguro'),
      finalizar: (eu, ele) => dica(eu.bjj - ele.bjj, 'Vantagem no jiu-jítsu', 'Ele é melhor no chão', 'Jiu-jítsu parelho'),
      escapar: (eu, ele) => dica(eu.grappling - ele.grappling, 'Escape provável', 'Difícil sair', 'Escape possível'),
      proteger: () => 'Reduz o dano que você sofre',
      guarda: (eu, ele) => dica(eu.bjj - ele.bjj, 'Boa chance de finalizar', 'Arriscado', 'Chance razoável'),
    };
    function dica(v, bom, ruim, igual) {
      return v > 8 ? bom : v < -8 ? ruim : igual;
    }

    function chavesDaSituacao() {
      const sit = luta.situacao();
      const extra = (luta.desbloqueios && luta.desbloqueios[0]) || [];
      const base = sit === 'pe'
        ? ['trocar', 'pressionar', 'derrubar', 'cautela'].concat(['contra', 'clinch'].filter((x) => extra.indexOf(x) >= 0))
        : sit === 'cima' ? ['controlar', 'castigar', 'finalizar'] : ['escapar', 'proteger', 'guarda'].concat(extra.indexOf('raspar') >= 0 ? ['raspar'] : []);
      return luta.assinaturaDisponivel(0) ? base.concat(['assinatura']) : base;
    }

    function dadosDoComando(k) {
      if (k === 'assinatura') {
        const sig = luta.assinatura[0];
        return { nome: sig.nome, descr: MMA.ASSINATURAS[sig.id] ? MMA.ASSINATURAS[sig.id].descr : 'Golpe especial, uma vez por round.' };
      }
      return MMA.ESTRATEGIAS[k] || MMA.TATICAS_CHAO[k];
    }

    // Tela do round ao vivo: o relogio, quem esta ganhando, o que acabou de acontecer e o que fazer agora.
    function telaComando(ultimos) {
      const rd = luta.abrirRound();
      const sit = luta.situacao();
      const chaves = chavesDaSituacao();
      const eu = luta.f[0].attr;
      const ele = luta.f[1].attr;
      const resta = Math.max(0, Math.round(300 - (300 * rd.i) / 8));
      const d = luta.parcialRound();
      const pos = clamp(d * 3.2, -48, 48);
      const quem = d > 4 ? 'Você está ganhando o round' : d < -4 ? 'O rival está ganhando o round' : 'Round parelho';
      const titulo = sit === 'pe' ? 'Em pé. O que você faz?' : sit === 'cima' ? 'Você está por cima. Aproveite!' : 'Você está por baixo. Reaja!';
      const lei = luta.leituraRival ? luta.leituraRival() : null;
      const feed = (ultimos && ultimos.length ? ultimos : rd.eventos.slice(-3)).slice(-4);
      raiz.innerHTML = `<div class="tv luta-comando">
        ${faixaEvento()}
        ${duelo(false)}
        <section class="cmd-painel">
          <div class="cmd-topo"><div class="cmd-round"><small>Round</small><b>${rd.num}</b></div><div class="cmd-relogio"><small>Tempo</small><b>${mmss(resta)}</b></div>
            <div class="cmd-momento"><span>${esc(quem)}</span><div class="momento-barra"><i style="width:${50 + pos}%" class="mom-a"></i><i style="width:${50 - pos}%" class="mom-b"></i></div></div></div>
          <div class="cmd-condicao"><span>Seu fôlego <b>${Math.round(luta.f[0].stam)}%</b></span><span>Seu dano <b>${100 - MMA.vidaPct(luta.f[0])}%</b></span><span>Fôlego dele <b>${Math.round(luta.f[1].stam)}%</b></span><span>Dano dele <b>${100 - MMA.vidaPct(luta.f[1])}%</b></span></div>
          ${feed.length ? `<ol class="cmd-feed" aria-live="polite">${feed.map((e) => `<li class="${e.ator === 0 ? 'eu' : e.ator === 1 ? 'ele' : ''}">${esc(e.texto)}</li>`).join('')}</ol>` : '<p class="vazio">O round começou.</p>'}
          <h2 class="cmd-titulo">${titulo}</h2>
          ${lei ? `<p class="cmd-leitura">Leitura do córner: ${esc(lei.texto)}</p>` : ''}
          <div class="cmd-grade n${chaves.length}" role="group" aria-label="Escolha sua ação">${chaves.map((k, i) => {
            const dd = dadosDoComando(k);
            const fn = DICAS[k];
            const dicaTxt = k === 'assinatura' ? 'Uma vez por round' : fn ? fn(eu, ele, luta.f[0].stam) : '';
            return `<button type="button" class="cmd${k === 'assinatura' ? ' ass' : ''}" data-cmd="${k}"><kbd>${i + 1}</kbd><b>${esc(dd.nome)}</b><small>${esc(dd.descr)}</small><em>${esc(dicaTxt)}</em></button>`;
          }).join('')}</div>
          <div class="tv-acoes"><button type="button" class="btn secondary" id="b-auto-round">Deixar o plano decidir o resto do round<small>Segue a estratégia escolhida</small></button></div>
        </section>
      </div>`;
      raiz.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', () => comando(b.dataset.cmd)));
      raiz.querySelector('#b-auto-round').addEventListener('click', terminarRoundNoPlano);
      const primeiro = raiz.querySelector('[data-cmd]');
      if (primeiro) primeiro.focus({ preventScroll: true });
    }

    function aposMomento(m) {
      ctx.aoSalvar();
      ocupado = false;
      if (m.rodada) return telaResumo(m.rodada, luta.encerrada);
      telaComando(m.eventos);
    }

    function comandarRound() {
      if (ocupado || !vivo() || luta.encerrada) return;
      luta.definirEstrategia(0, selecionada);
      luta.abrirRound();
      window.scrollTo(0, 0);
      telaComando([]);
    }

    function comando(chave) {
      if (ocupado || !vivo() || luta.encerrada) return;
      ocupado = true;
      aposMomento(luta.jogarMomento(chave, 2));
    }

    function terminarRoundNoPlano() {
      if (ocupado || !vivo() || luta.encerrada) return;
      ocupado = true;
      luta.definirEstrategia(0, selecionada);
      luta.rodarRound(null);
      ctx.aoSalvar();
      ocupado = false;
      telaResumo(luta.rodadas[luta.rodadas.length - 1], luta.encerrada);
      window.scrollTo(0, 0);
    }

    // ---------- acoes ----------

    async function jogarRound() {
      if (ocupado || !vivo() || luta.encerrada) return;
      ocupado = true;
      const n = luta.rodadas.length + 1;
      luta.definirEstrategia(0, selecionada);
      telaSimulando(n);
      window.scrollTo(0, 0);
      await esperar(reduz() ? 0 : 420);
      if (!vivo()) return;
      luta.rodarRound(null);
      ctx.aoSalvar();
      ocupado = false;
      const rodada = luta.rodadas[luta.rodadas.length - 1];
      telaResumo(rodada, luta.encerrada);
      window.scrollTo(0, 0);
    }

    // Simula a luta inteira (ou o que resta) de uma vez, com o mesmo motor do round a round.
    function verResultado() {
      if (ocupado || !vivo() || luta.encerrada) return;
      ocupado = true;
      luta.simularCompleta({ estrategia: selecionada, auto: true });
      ctx.aoSalvar();
      ocupado = false;
      ctx.aoConcluir();
    }

    // ---------- teclado ----------

    const teclas = (ev) => {
      if (!vivo()) {
        document.removeEventListener('keydown', teclas);
        return;
      }
      if (ocupado || luta.encerrada) return;
      if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
      const nc = Number(ev.key);
      const botoesCmd = raiz.querySelectorAll('[data-cmd]');
      if (botoesCmd.length && nc >= 1 && nc <= botoesCmd.length) { comando(botoesCmd[nc - 1].dataset.cmd); return; }
      if (!raiz.querySelector('.estrategias')) return;
      const n = Number(ev.key);
      if (n >= 1 && n <= ordem.length) {
        selecionada = ordem[n - 1];
        raiz.querySelectorAll('.estr').forEach((b) => {
          const on = b.dataset.estr === selecionada;
          b.classList.toggle('sel', on);
          b.setAttribute('aria-checked', String(on));
          if (on) b.focus({ preventScroll: true });
        });
      }
    };
    document.addEventListener('keydown', teclas);

    // ---------- inicio (ou retomada) ----------

    function iniciar() {
      if (luta.encerrada) return telaResumo(luta.rodadas[luta.rodadas.length - 1], true);
      if (luta.rd && luta.rd.i > 0) return telaComando([]); // round em andamento: volta de onde parou
      if (luta.rodadas.length) return telaResumo(luta.rodadas[luta.rodadas.length - 1], false);
      telaPlano();
    }

    iniciar();
  };

  LutaUI.desmontar = function () {
    token++;
  };

  window.LutaUI = LutaUI;
})();
