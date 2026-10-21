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

    function telaPlano() {
      const sug = sugerir();
      selecionada = ESTR[sug.id] ? (luta.estrategia[0] || sug.id) : selecionada;
      raiz.innerHTML = `<div class="tv luta-plano">
        ${faixaEvento()}
        ${duelo(true)}
        <section class="tv-plano">
          <header><span class="kicker gold">Antes da luta</span><h2>Sua estratégia inicial</h2><p>${esc(sug.motivo)} Você pode mudar o plano a cada round.</p></header>
          ${cartoesEstrategia(sug.id)}
          <div class="tv-acoes">
            <button type="button" class="btn primary grande" id="b-comecar">Simular round 1<span class="btn-seta">→</span></button>
            <button type="button" class="btn secondary" id="b-resultado">Ver resultado<small>Simula a luta inteira agora</small></button>
          </div>
        </section>
      </div>`;
      ligarEstrategias();
      raiz.querySelector('#b-comecar').addEventListener('click', jogarRound);
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
        : `<section class="tv-plano">
          <header><span class="kicker gold">Intervalo</span><h2>Estratégia para o round ${proximo}</h2><p>${esc(sug.motivo)}</p></header>
          ${cartoesEstrategia(sug.id)}
          ${opcoesCorner()}
          <div class="tv-acoes">
            <button type="button" class="btn primary grande" id="b-prox">Simular round ${proximo}<span class="btn-seta">→</span></button>
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
      if (ocupado || luta.encerrada || !raiz.querySelector('.estrategias')) return;
      if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
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
      if (luta.rd && luta.rd.i > 0) {
        // luta salva no meio de um round por uma versao anterior: termina o round e mostra o resumo
        luta.definirEstrategia(0, selecionada);
        luta.rodarRound(null);
        ctx.aoSalvar();
        return telaResumo(luta.rodadas[luta.rodadas.length - 1], luta.encerrada);
      }
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
