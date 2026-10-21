// Luta como simulacao com decisoes: a cada momento do round voce escolhe a tatica e o relato
// mostra o que aconteceu. Fotos reais, barras de vida e folego, marcador de quem esta ganhando
// o round. Toda a regra fica em engine.js (Luta.jogarMomento).
(function () {
  'use strict';

  const LutaUI = {};
  let token = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  const ICONES = {
    trocar: '<path d="M7 14V6a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-3a1.6 1.6 0 0 1 2.6-1.8L7 14Z"/>',
    pressionar: '<path d="M5 12h12M12 5l7 7-7 7"/>',
    derrubar: '<path d="M4 6l5 5 4-3 7 8M4 18h16"/>',
    cautela: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/>',
    controlar: '<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
    castigar: '<path d="M14 4l6 6-9 9-6-6 9-9ZM4 20l3-3"/>',
    finalizar: '<path d="M7 7c0-2 2-3 4-3s4 2 4 4-2 3-4 3-4 1-4 3 2 4 4 4 4-1 4-3"/>',
    escapar: '<path d="M12 20V5M6 11l6-6 6 6"/>',
    proteger: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/>',
    guarda: '<path d="M4 16c4-8 12-8 16 0M8 16l4-5 4 5"/>',
    contra: '<path d="M4 12h10M10 6l-6 6 6 6M16 7l4 5-4 5"/>',
    clinch: '<path d="M8 4v6a4 4 0 0 0 8 0V4M5 20c2-4 4-6 7-6s5 2 7 6"/>',
    raspar: '<path d="M4 17c4 0 4-10 8-10s4 10 8 10M16 4l4 3-3 4"/>',
    assinatura: '<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.7 6.7 19.6l1.1-6L3.4 9.4l6-.8L12 3Z"/>',
  };

  function icone(nome) {
    return `<svg class="ico" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ICONES.trocar}</svg>`;
  }

  function iniciaisDe(nome) {
    return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  }

  // Etiqueta e destaque de cada tipo de lance no relato.
  const LANCES = {
    golpe: { rotulo: 'GOLPE' },
    erro: { rotulo: 'ERROU', fraco: true },
    queda: { rotulo: 'QUEDA', grande: true },
    queda_defendida: { rotulo: 'DEFENDEU', fraco: true },
    chao_golpe: { rotulo: 'NO CHÃO' },
    controle: { rotulo: 'CONTROLE', fraco: true },
    sub_falha: { rotulo: 'FINALIZAÇÃO', fraco: true },
    guarda: { rotulo: 'GUARDA', fraco: true },
    levanta: { rotulo: 'LEVANTOU' },
    raspa: { rotulo: 'RASPAGEM!', grande: true },
    sub: { rotulo: 'FINALIZAÇÃO!', grande: true },
    ko: { rotulo: 'NOCAUTE!', grande: true },
    corte: { rotulo: 'CORTE', grande: true },
    medico: { rotulo: 'MÉDICO', grande: true },
  };

  LutaUI.montar = function (raiz, ctx) {
    const meu = ++token;
    const MMA = ctx.MMA;
    const luta = ctx.luta;
    const vivo = () => meu === token && raiz.isConnected;
    const nomes = [ctx.nomeA, ctx.nomeB];
    const total = luta.rodadasTotais;
    let ocupado = true;
    let ritmo = 1; // 1 = normal, 0.5 = rapido
    let auto = false;
    let tutorialPendente = !ctx.tutorialVisto;

    const foto = (f, n) => (f ? `<img src="${esc(f)}" alt="">` : `<span class="ini" style="--cor:${ctx[n === 0 ? 'corIniA' : 'corIniB']}">${esc(iniciaisDe(nomes[n]))}</span>`);
    const duelista = (n, lado) => `
      <div class="duelista ${lado}" id="duel-${lado}">
        <div class="foto">${foto(n === 0 ? ctx.fotoA : ctx.fotoB, n)}<span class="foto-flash"></span><span class="corte-tag"></span><span class="posicao">EM PÉ</span></div>
        <div class="duelo-info">
          <div class="duelo-nome"><b>${esc(nomes[n])}</b><small>${esc(n === 0 ? ctx.subA : ctx.subB)}</small></div>
          <div class="barra-vida"><i class="atraso"></i><i class="atual"></i><span class="vida-n">100%</span></div>
          <div class="barra-folego"><i></i><span>Fôlego</span></div>
        </div>
      </div>`;

    raiz.innerHTML = `
    <div class="luta" id="luta">
      <div class="duelo">
        ${duelista(0, 'a')}
        <div class="duelo-centro">
          <div class="d-round">Round <b class="r-n">1</b> de ${total}${ctx.titulo ? ' · <em>Cinturão</em>' : ''}</div>
          <div class="d-relogio">5:00</div>
          <div class="d-placar"><span class="p-a">0</span><i>—</i><span class="p-b">0</span></div>
        </div>
        ${duelista(1, 'b')}
      </div>
      <div class="momento">
        <div class="momento-topo"><span>Quem está ganhando este round</span><b class="momento-txt">Parelho</b></div>
        <div class="momento-barra"><i class="mom-a"></i><i class="mom-b"></i><u></u></div>
      </div>
      <div class="relato-caixa">
        <div class="chamada" id="chamada"></div>
        <ol class="relato" id="relato"><li class="vazio">O round ainda não começou.</li></ol>
        <div class="canto-botoes">
          <button class="mini" id="b-som" aria-label="Som">${Som.ligado ? '🔊' : '🔇'}</button>
          <button class="mini" id="b-ritmo" aria-label="Ritmo do relato">1×</button>
          <button class="mini" id="b-auto" aria-pressed="false" aria-label="Deixar o computador decidir">Auto</button>
          <button class="mini" data-acao="pausar" aria-label="Pausar e sair">Sair</button>
        </div>
      </div>
      <div class="comandos" id="comandos"></div>
      <div class="sobreposicao" id="sobre"></div>
    </div>`;

    const q = (sel) => raiz.querySelector(sel);
    const duel = [q('#duel-a'), q('#duel-b')];
    const relato = q('#relato');
    const chamada = q('#chamada');
    const sobre = q('#sobre');
    const comandos = q('#comandos');

    // ---------- estado visual ----------

    function barras(dano, stam, animar, corte) {
      [0, 1].forEach((i) => {
        const nc = corte ? corte[i] : luta.f[i].corte || 0;
        const tag = duel[i].querySelector('.corte-tag');
        tag.textContent = nc >= 2 ? 'CORTE GRAVE' : nc === 1 ? 'CORTE' : '';
        tag.className = 'corte-tag' + (nc >= 2 ? ' grave' : nc === 1 ? ' leve' : '');
        const v = MMA.vidaPct({ dano: dano[i] });
        const bv = duel[i].querySelector('.barra-vida');
        bv.querySelector('.atual').style.width = v + '%';
        duel[i].querySelector('.vida-n').textContent = v + '%';
        duel[i].classList.toggle('critico', v <= 25);
        const atraso = bv.querySelector('.atraso');
        if (animar) setTimeout(() => { atraso.style.width = v + '%'; }, 450);
        else atraso.style.width = v + '%';
        duel[i].querySelector('.barra-folego i').style.width = clamp(Math.round(stam[i]), 0, 100) + '%';
      });
    }

    function relogio(trocas) {
      const resta = Math.round(300 - (300 * trocas) / 8);
      q('.d-relogio').textContent = `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}`;
    }

    function placar() {
      q('.p-a').textContent = luta.totais[0];
      q('.p-b').textContent = luta.totais[1];
    }

    // Barra de "quem esta ganhando o round": cresce para o lado de quem domina.
    function momento() {
      const d = luta.parcialRound();
      const pos = clamp(d * 3.2, -48, 48);
      q('.mom-a').style.width = 50 + pos + '%';
      q('.mom-b').style.width = 50 - pos + '%';
      q('.momento-txt').textContent = d > 4 ? 'Você está ganhando' : d < -4 ? 'O rival está ganhando' : 'Parelho';
      q('.momento-txt').className = 'momento-txt ' + (d > 4 ? 'bom' : d < -4 ? 'ruim' : '');
    }

    function posicoes() {
      const sit = luta.situacao();
      const a = sit === 'pe' ? 'pe' : sit;
      const b = sit === 'pe' ? 'pe' : sit === 'cima' ? 'baixo' : 'cima';
      [a, b].forEach((s, i) => {
        duel[i].dataset.sit = s;
        duel[i].querySelector('.posicao').textContent = s === 'pe' ? 'EM PÉ' : s === 'cima' ? 'POR CIMA' : 'POR BAIXO';
      });
    }

    function chamar(texto, tipo) {
      chamada.textContent = texto;
      chamada.className = 'chamada ' + (tipo || '');
      void chamada.offsetWidth;
      chamada.classList.add('ativa');
    }

    function piscar(lado, classe, ms) {
      duel[lado].classList.add(classe);
      setTimeout(() => duel[lado].classList.remove(classe), ms);
    }

    function flutuar(lado, texto, forte) {
      const el = document.createElement('div');
      el.className = 'flut' + (forte ? ' forte' : '');
      el.textContent = texto;
      duel[lado].querySelector('.foto').appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }

    function tremer() {
      document.body.classList.add('tremor');
      setTimeout(() => document.body.classList.remove('tremor'), 700);
    }

    function danoPct(e) {
      return e.valor ? Math.max(1, Math.round((e.valor * 100) / 160)) : 0;
    }

    function linha(e) {
      const info = Object.assign({}, LANCES[e.tipo2] || { rotulo: '' });
      if (e.tipo2 === 'golpe' && e.assinatura) info.rotulo = 'ASSINATURA';
      else if (e.tipo2 === 'golpe' && e.contra) info.rotulo = 'CONTRA-GOLPE';
      const li = document.createElement('li');
      const dano = danoPct(e);
      li.className = 'lance' + (e.ator !== undefined ? ' lado-' + (e.ator === 0 ? 'a' : 'b') : '') + (info.grande ? ' grande' : '') + (info.fraco ? ' fraco' : '') + (e.forte ? ' forte' : '');
      li.innerHTML = `${info.rotulo ? `<span class="tag">${info.rotulo}</span>` : ''}<span class="txt">${esc(e.texto)}</span>${dano ? `<span class="dano">−${dano}%</span>` : ''}`;
      const vazio = relato.querySelector('.vazio');
      if (vazio) vazio.remove();
      relato.appendChild(li);
      while (relato.children.length > 40) relato.removeChild(relato.firstChild);
      relato.scrollTop = relato.scrollHeight;
    }

    // ---------- reproducao de cada lance ----------

    async function animar(e) {
      const r = ritmo;
      linha(e);
      const d = e.alvo;
      const dano = danoPct(e);
      switch (e.tipo2) {
        case 'golpe':
          piscar(d, 'reage', 420);
          if (e.arma === 'chute') Som.chute(e.forte); else Som.soco(e.forte);
          flutuar(d, '−' + dano + '%', e.forte);
          barras(e.dano, e.stam, true, e.corte);
          momento();
          if (e.forte) chamar(e.assinatura ? 'ASSINATURA!' : 'GOLPE FORTE!', 'forte');
          await esperar((e.forte ? 900 : 620) * r);
          break;
        case 'erro':
          Som.errou();
          barras(e.dano, e.stam, false);
          await esperar(420 * r);
          break;
        case 'queda_defendida':
          Som.errou();
          chamar('DEFENDEU A QUEDA!', 'defesa');
          barras(e.dano, e.stam, false);
          await esperar(800 * r);
          break;
        case 'queda':
          Som.queda();
          piscar(d, 'reage', 420);
          posicoes();
          chamar('QUEDA!', 'forte');
          barras(e.dano, e.stam, false);
          momento();
          await esperar(1000 * r);
          break;
        case 'chao_golpe':
          piscar(d, 'reage', 420);
          Som.soco(e.forte);
          flutuar(d, '−' + dano + '%', e.forte);
          barras(e.dano, e.stam, true);
          momento();
          if (e.forte) chamar('GROUND AND POUND!', 'forte');
          await esperar((e.forte ? 900 : 640) * r);
          break;
        case 'levanta':
          Som.errou();
          posicoes();
          chamar('LEVANTOU!', 'defesa');
          barras(e.dano, e.stam, false);
          momento();
          await esperar(800 * r);
          break;
        case 'raspa':
          Som.queda();
          piscar(d, 'reage', 420);
          posicoes();
          chamar('RASPAGEM!', 'forte');
          barras(e.dano, e.stam, false);
          momento();
          await esperar(1000 * r);
          break;
        case 'controle':
        case 'sub_falha':
        case 'guarda':
          barras(e.dano, e.stam, false);
          momento();
          await esperar(620 * r);
          break;
        case 'corte':
          piscar(d, 'reage', 420);
          Som.soco(true);
          chamar('CORTE!', 'defesa');
          barras(e.dano, e.stam, false, e.corte);
          await esperar(900 * r);
          break;
        case 'medico':
          Som.ko();
          piscar(d, 'nocaute', 4000);
          chamar('PARADA MÉDICA', 'ko');
          barras(e.dano, e.stam, false, e.corte);
          await esperar(2200);
          break;
        case 'sub':
          Som.tap();
          piscar(d, 'nocaute', 4000);
          chamar('FINALIZAÇÃO!', 'ko');
          Som.grito(1);
          barras(e.dano, e.stam, false);
          await esperar(1800);
          break;
        case 'ko':
          Som.ko();
          tremer();
          piscar(d, 'nocaute', 4000);
          chamar('NOCAUTE!', 'ko');
          barras(e.dano, e.stam, true);
          await esperar(2200);
          break;
        default:
          barras(e.dano, e.stam, true);
          await esperar(300 * r);
      }
    }

    async function reproduzir(eventos) {
      for (const e of eventos) {
        if (!vivo()) return false;
        await animar(e);
      }
      return vivo();
    }

    // ---------- comandos ----------

    function dica(k, eu, ele, stam) {
      const cmp = (v, bom, ruim, igual) => (v > 8 ? bom : v < -8 ? ruim : igual);
      switch (k) {
        case 'trocar': return cmp(eu.striking - ele.defesa, 'Seus golpes passam', 'Ele se defende bem', 'Troca equilibrada');
        case 'pressionar': return stam < 60 ? 'Vai custar fôlego' : 'Pressão total';
        case 'derrubar': return cmp(eu.wrestling - ele.defesa, 'Vantagem na queda', 'Ele defende bem a queda', 'Queda equilibrada');
        case 'cautela': return 'Poupa fôlego';
        case 'contra': return cmp(eu.qi - ele.qi, 'Você lê bem o rival', 'Ele é difícil de ler', 'Pune o erro e poupa fôlego');
        case 'clinch': return cmp(eu.forca - ele.forca, 'Você é mais forte colado', 'Ele é mais forte colado', 'Joelhos e projeções');
        case 'raspar': return cmp(eu.grappling - ele.grappling, 'Boa chance de inverter', 'Difícil inverter', 'Pode inverter a posição');
        case 'controlar': return 'Equilibrado';
        case 'castigar': return cmp((eu.striking + eu.forca) / 2 - ele.queixo, 'Pode nocautear', 'Queixo duro', 'Dano seguro');
        case 'finalizar': return cmp(eu.bjj - ele.bjj, 'Vantagem no jiu-jitsu', 'Ele é melhor no chão', 'Jiu-jitsu parelho');
        case 'escapar': return cmp(eu.grappling - ele.grappling, 'Escape provável', 'Difícil sair', 'Escape possível');
        case 'proteger': return 'Reduz o dano que você sofre';
        case 'guarda': return cmp(eu.bjj - ele.bjj, 'Boa chance de finalizar', 'Arriscado', 'Chance razoável');
        default: return '';
      }
    }

    function chavesDaSituacao(sit) {
      const extra = (luta.desbloqueios && luta.desbloqueios[0]) || [];
      const base = sit === 'pe' ? ['trocar', 'pressionar', 'derrubar', 'cautela'].concat(['contra', 'clinch'].filter((x) => extra.indexOf(x) >= 0)) : sit === 'cima' ? ['controlar', 'castigar', 'finalizar'] : ['escapar', 'proteger', 'guarda'].concat(extra.indexOf('raspar') >= 0 ? ['raspar'] : []);
      return luta.assinaturaDisponivel(0) ? base.concat(['assinatura']) : base;
    }

    function dadosDe2(k) {
      if (k === 'assinatura') {
        const sig = luta.assinatura[0];
        return { nome: sig.nome, descr: MMA.ASSINATURAS[sig.id] ? MMA.ASSINATURAS[sig.id].descr : 'Golpe especial.' };
      }
      return MMA.ESTRATEGIAS[k] || MMA.TATICAS_CHAO[k];
    }

    function mostrarComandos() {
      if (!vivo()) return;
      luta.abrirRound(); // o round precisa estar aberto para a assinatura e a leitura do rival
      const sit = luta.situacao();
      const chaves = chavesDaSituacao(sit);
      const titulo = sit === 'pe' ? 'Em pé. O que você faz?' : sit === 'cima' ? 'Você está POR CIMA. Aproveite!' : 'Você está POR BAIXO. Reaja!';
      const eu = luta.f[0].attr;
      const ele = luta.f[1].attr;
      const lei = luta.leituraRival();
      comandos.className = 'comandos ativo ' + sit;
      comandos.innerHTML = `<div class="cmd-titulo">${titulo}</div>${lei ? `<div class="leitura">${icone('assinatura')}<span>Leitura: ${esc(lei.texto)}</span></div>` : ''}<div class="cmd-grade n${chaves.length}">${chaves.map((k, i) => {
        const dd = dadosDe2(k);
        const ass = k === 'assinatura';
        const nova = k === 'contra' || k === 'clinch' || k === 'raspar';
        return `<button class="cmd ${ass ? 'ass' : ''}${nova ? ' hab' : ''}" data-chave="${k}"><kbd>${i + 1}</kbd><span class="cmd-ico">${icone(k)}</span><span class="cmd-nome">${esc(dd.nome)}</span><small>${esc(dd.descr)}</small><em>${ass ? 'Uma vez por round' : esc(dica(k, eu, ele, luta.f[0].stam))}</em>${nova ? '<u class="tag-hab">Habilidade</u>' : ''}</button>`;
      }).join('')}</div>`;
      ocupado = false;
      if (auto) setTimeout(() => { if (vivo() && !ocupado) escolher(luta.taticaIA(0)); }, 350);
    }

    function esconderComandos() {
      comandos.className = 'comandos';
      comandos.innerHTML = '';
    }

    async function escolher(chave) {
      if (ocupado || !vivo() || tutorialPendente) return;
      ocupado = true;
      esconderComandos();
      Som.destravar();
      const m = luta.jogarMomento(chave, 2);
      ctx.aoSalvar();
      const ok = await reproduzir(m.eventos);
      if (!ok) return;
      relogio(m.rodada ? 8 : m.troca);
      if (m.rodada) {
        await fimDeRound(m.rodada);
      } else {
        posicoes();
        momento();
        mostrarComandos();
      }
    }

    // ---------- round, intervalo e fim ----------

    async function fimDeRound(rodada) {
      placar();
      barras(luta.f.map((x) => x.dano), rodada.stamFim, true);
      if (luta.encerrada) return fimDaLuta();
      posicoes();
      Som.sino(1);
      await esperar(700 * ritmo);
      if (!vivo()) return;
      const [pa, pb] = rodada.placar;
      const juizes = rodada.juizes || [rodada.placar, rodada.placar, rodada.placar];
      const opcoes = luta.opcoesConselho(0);
      sobre.className = 'sobreposicao ativa';
      sobre.innerHTML = `<div class="cartao largo">
        <div class="kicker">Fim do round ${rodada.num}</div>
        <div class="cartao-placar"><b>${pa}</b><i>—</i><b>${pb}</b></div>
        <div class="juizes-linha">${juizes.map((k, i) => `<span><small>Juiz ${i + 1}</small><b>${k[0]}–${k[1]}</b></span>`).join('')}</div>
        <p>${pa > pb ? 'Você levou o round.' : pb > pa ? 'O rival levou o round.' : 'Round parelho.'} Placar da luta: ${luta.totais[0]} – ${luta.totais[1]}.</p>
        <div class="conselho"><div class="kicker gold">Córner · escolha ${luta.conselhoMax() > 1 ? 'até dois conselhos' : 'um conselho'}</div>
          <div class="conselho-grade">${opcoes.map((o) => `<button class="cmd conselho-op" data-conselho="${o.id}"${o.ok ? '' : ' disabled'}><span class="cmd-nome">${esc(o.nome)}</span><small>${esc(o.descr)}</small></button>`).join('')}</div>
          <p class="peq conselho-msg">Sem conselho, você só recupera o fôlego do intervalo.</p></div>
        <button class="btn primary" id="b-prox">Próximo round<span class="btn-seta">→</span></button></div>`;
      sobre.querySelectorAll('[data-conselho]').forEach((b) => b.addEventListener('click', () => {
        if (!vivo()) return;
        if (luta.conselho(0, b.dataset.conselho)) {
          ctx.aoSalvar();
          b.disabled = true;
          b.classList.add('escolhido');
          const cheio = luta.conselhoUsado >= luta.conselhoMax();
          if (cheio) sobre.querySelectorAll('[data-conselho]').forEach((x) => { x.disabled = true; });
          sobre.querySelector('.conselho-msg').textContent = 'Conselho aplicado: ' + b.querySelector('.cmd-nome').textContent + '.' + (cheio ? '' : ' Seu corner afiado permite mais um.');
          barras(luta.f.map((x) => x.dano), luta.f.map((x) => x.stam), false);
        }
      }));
      q('#b-prox').addEventListener('click', () => {
        if (!vivo()) return;
        sobre.className = 'sobreposicao';
        sobre.innerHTML = '';
        proximoRound();
      });
    }

    function proximoRound() {
      Som.sino(1);
      const n = luta.rodadas.length + 1;
      q('.r-n').textContent = n;
      relogio(0);
      barras(luta.f.map((x) => x.dano), luta.f.map((x) => x.stam), false);
      momento();
      chamar('ROUND ' + n, '');
      relato.innerHTML = `<li class="lance divisor"><span class="txt">Round ${n} começa.</span></li>`;
      setTimeout(() => mostrarComandos(), 700);
    }

    async function fimDaLuta() {
      const res = luta.resultado;
      Som.ambiente(false);
      await esperar(res.metodo === 'Nocaute' || res.metodo === 'Finalização' ? 600 : 300);
      if (!vivo()) return;
      const venceu = res.vencedor === 0;
      const empate = res.vencedor === null;
      const decisao = res.metodo !== 'Nocaute' && res.metodo !== 'Finalização';
      if (decisao) {
        Som.sino(3);
        chamar('FIM DA LUTA', '');
        await esperar(1500);
        if (!vivo()) return;
      }
      const tipoF = window.Celebra ? Celebra.tipoFinal({ venceu: venceu, empatou: empate, titulo: ctx.titulo, campeaoAntes: ctx.campeaoAntes }) : venceu ? 'vitoria' : empate ? 'empate' : 'derrota';
      const titulos = { vitoria: 'VITÓRIA', campeao: 'NOVO CAMPEÃO!', defesa: 'TÍTULO DEFENDIDO!', derrota: 'DERROTA', empate: 'EMPATE' };
      if (ctx.cinturoes >= 2) { titulos.campeao = 'DUPLO CAMPEÃO!'; titulos.defesa = 'DUPLO CAMPEÃO DEFENDE!'; }
      const perdeuCinto = !venceu && !empate && ctx.titulo && ctx.campeaoAntes;
      const kicker = tipoF === 'campeao' ? (ctx.cinturoes >= 2 ? 'Campeão em duas categorias' : 'Cinturão conquistado') : tipoF === 'defesa' ? (ctx.cinturoes >= 2 ? 'Campeão em duas categorias' : 'Cinturão defendido') : perdeuCinto ? 'Você perdeu o cinturão' : ctx.titulo ? 'Luta pelo cinturão' : 'Resultado';
      const cls = empate ? 'empate' : venceu ? 'venceu' : 'perdeu';
      const quem = empate ? '' : esc(nomes[venceu ? 0 : 1]);
      const cinto = (tipoF === 'campeao' || tipoF === 'defesa') && !!window.Celebra;
      const duplo = cinto && ctx.cinturoes >= 2;
      sobre.className = 'sobreposicao ativa final cele-' + tipoF;
      sobre.innerHTML = (window.Celebra ? Celebra.camadas(tipoF) : '') + `<div class="cartao cele ${cls}${cinto ? ' com-cinto' : ''}">
        ${cinto ? Celebra.fotoCinturao(ctx.cinturoes, `<div class="kicker">${kicker}</div><h2 class="resultado-grande">${titulos[tipoF]}</h2>`) : `<div class="cele-foto">${foto(ctx.fotoA, 0)}</div><div class="kicker">${kicker}</div><h2 class="resultado-grande">${titulos[tipoF]}</h2>`}
        <p>${quem ? quem + ' vence por ' : ''}${esc(res.metodo.toLowerCase())}${res.detalhe ? ' (' + esc(res.detalhe) + ')' : ''}${!decisao ? ' no round ' + res.round : ''} · Placar ${luta.totais[0]} – ${luta.totais[1]}</p>
        ${res.cartoes ? `<div class="juizes-linha">${res.cartoes.map((k, i) => `<span><small>Juiz ${i + 1}</small><b>${k[0]}–${k[1]}</b></span>`).join('')}</div>` : ''}
        <button class="btn primary" data-acao="concluir">Continuar<span class="btn-seta">→</span></button></div>`;
      if (window.Celebra) Celebra.iniciar(sobre, tipoF);
      else if (venceu) Som.grito(1.2);
      ocupado = true;
    }

    // ---------- eventos de interface ----------

    comandos.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-chave]');
      if (b) escolher(b.dataset.chave);
    });
    const teclas = (ev) => {
      if (!vivo()) {
        document.removeEventListener('keydown', teclas);
        return;
      }
      const n = Number(ev.key);
      if (!n || ocupado || tutorialPendente) return;
      const chaves = chavesDaSituacao(luta.situacao());
      if (chaves[n - 1]) escolher(chaves[n - 1]);
    };
    document.addEventListener('keydown', teclas);

    q('#b-som').addEventListener('click', () => {
      const lig = Som.alternar();
      q('#b-som').textContent = lig ? '🔊' : '🔇';
      if (lig) { Som.destravar(); Som.ambiente(true, 0.04); }
    });
    q('#b-ritmo').addEventListener('click', () => {
      ritmo = ritmo === 1 ? 0.5 : 1;
      q('#b-ritmo').textContent = ritmo === 1 ? '1×' : '2×';
    });
    q('#b-auto').addEventListener('click', () => {
      auto = !auto;
      q('#b-auto').setAttribute('aria-pressed', String(auto));
      if (auto && !ocupado) escolher(luta.taticaIA(0));
    });

    // ---------- inicio ----------

    function mostrarTutorial() {
      sobre.className = 'sobreposicao ativa';
      sobre.innerHTML = `<div class="cartao tutorial">
        <div class="kicker gold">Primeira luta · como funciona</div>
        <ul>
          <li><b>Você decide durante o round.</b> A cada momento escolha uma tática (ou use as teclas 1, 2, 3, 4...). O relato mostra o que aconteceu.</li>
          <li><b>O marcador de round</b> mostra quem está ganhando agora. Três juízes dão o round a quem causou mais dano e controlou mais.</li>
          <li><b>Em pé:</b> trocar, pressionar, buscar a queda ou ter cautela. <b>Cautela</b> defende melhor e permite contra-golpes; <b>derrubar</b> é cortado por quem se defende da queda.</li>
          <li><b>No chão:</b> por cima, controle, castigue ou busque a finalização. Por baixo, escape, proteja-se ou ataque da guarda.</li>
          <li><b>Golpe de assinatura:</b> uma vez por round, forte, mas te expõe se falhar. <b>Cortes</b> podem parar a luta.</li>
          <li><b>Entre os rounds</b> o córner dá um conselho: respirar, ajustar o plano, tratar o corte ou ler o rival.</li>
        </ul>
        <button class="btn primary" id="b-tut">Entendi, vamos lutar<span class="btn-seta">→</span></button></div>`;
      q('#b-tut').addEventListener('click', () => {
        tutorialPendente = false;
        ctx.aoTutorial();
        sobre.className = 'sobreposicao';
        sobre.innerHTML = '';
        mostrarComandos();
      });
    }

    function iniciar() {
      const emCurso = luta.rodadas.length > 0 || (luta.rd && luta.rd.i > 0);
      posicoes();
      barras(luta.f.map((x) => x.dano), luta.f.map((x) => x.stam), false);
      placar();
      momento();
      q('.r-n').textContent = luta.rd ? luta.rd.num : luta.encerrada ? Math.max(1, luta.rodadas.length) : luta.rodadas.length + 1;
      relogio(luta.rd ? luta.rd.i : 0);
      if (luta.encerrada) {
        fimDaLuta();
        return;
      }
      if (emCurso) {
        relato.innerHTML = '<li class="lance divisor"><span class="txt">Retomando a luta…</span></li>';
        ocupado = false;
        if (tutorialPendente) mostrarTutorial(); else mostrarComandos();
        return;
      }
      sobre.className = 'sobreposicao ativa intro';
      sobre.innerHTML = `<div class="intro-vs">
        <div class="kicker">${ctx.titulo ? 'Luta pelo cinturão' : 'Noite de luta'}</div>
        <div class="intro-linha">
          <div class="intro-lutador a"><div class="intro-foto">${foto(ctx.fotoA, 0)}</div><b>${esc(ctx.nomeA)}</b><small>${esc(ctx.subA)}</small></div>
          <div class="intro-vs-txt">VS</div>
          <div class="intro-lutador b"><div class="intro-foto">${foto(ctx.fotoB, 1)}</div><b>${esc(ctx.nomeB)}</b><small>${esc(ctx.subB)}</small></div>
        </div>
        <p class="peq">${total} rounds de 5 minutos. Você decide as táticas durante cada round.</p>
        ${luta.leitura[0] ? `<p class="peq leitura-intro">Leitura do rival: ${esc(luta.plano.texto)}</p>` : ''}
        <button class="btn primary grande pulsa" id="b-comecar">Começar a luta<span class="btn-seta">→</span></button></div>`;
      q('#b-comecar').addEventListener('click', () => {
        Som.destravar();
        Som.ambiente(true, 0.04);
        Som.sino(1);
        Som.grito(0.6);
        sobre.className = 'sobreposicao';
        sobre.innerHTML = '';
        chamar('ROUND 1', '');
        relato.innerHTML = '<li class="lance divisor"><span class="txt">Round 1 começa.</span></li>';
        setTimeout(() => {
          if (!vivo()) return;
          if (tutorialPendente) mostrarTutorial(); else mostrarComandos();
        }, 800);
      });
    }

    iniciar();
  };

  LutaUI.desmontar = function () {
    token++;
    if (window.Som) Som.ambiente(false);
    document.body.classList.remove('tremor');
  };

  window.LutaUI = LutaUI;
})();
