// Celebracoes: vitoria, campeao, derrota e subida de nivel. So apresentacao: raios, confete,
// brilho, cinturao e sons. Respeita "reduzir movimento" (prefers-reduced-motion).
(function () {
  'use strict';

  const Celebra = {};

  const reduz = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const CORES = {
    vitoria: ['#22C55E', '#86efac', '#E8B84A', '#ffffff', '#4ade80'],
    defesa: ['#E8B84A', '#fde68a', '#ffffff', '#f59e0b', '#22C55E'],
    campeao: ['#E8B84A', '#fde68a', '#fff7d6', '#f59e0b', '#ffffff'],
    derrota: ['#6b7280', '#4b5563', '#9ca3af'],
    nivel: ['#3B82F6', '#93c5fd', '#E8B84A', '#ffffff', '#60a5fa'],
  };

  // Que celebracao a luta merece.
  Celebra.tipoFinal = function (o) {
    if (o.empatou) return 'empate';
    if (!o.venceu) return 'derrota';
    if (o.titulo) return o.campeaoAntes ? 'defesa' : 'campeao';
    return 'vitoria';
  };

  // Camadas de fundo (raios, brilho, vinheta e o palco das particulas).
  Celebra.camadas = function (tipo) {
    return `<div class="fx fx-${tipo}" aria-hidden="true"><i class="fx-raios"></i><i class="fx-brilho"></i><i class="fx-feixes"></i><i class="fx-flash"></i><i class="fx-vinheta"></i><div class="fx-particulas"></div></div>`;
  };

  // Foto real do campeao: 1 cinturao (vitoria ou defesa) ou 2 (campeao em duas categorias).
  // O conteudo (kicker + titulo) entra sobre a foto.
  const FOTOS_CINTO = { 1: 'fotos/cinturao-1.webp', 2: 'fotos/cinturao-2.webp' };
  Celebra.fotoCinturao = function (cintos, conteudo) {
    const n = cintos >= 2 ? 2 : 1;
    const src = FOTOS_CINTO[n];
    return `<figure class="cinto-foto cinto-${n}">
      <div class="cf-area">
        <img class="cf-fundo" src="${src}" alt="" aria-hidden="true">
        <img class="cf-frente" src="${src}" alt="${n === 2 ? 'Campeão com dois cinturões' : 'Campeão com o cinturão'}">
      </div>
      <figcaption>${conteudo || ''}</figcaption>
    </figure>`;
  };

  // Joga confete, faiscas ou cinzas no palco.
  Celebra.particulas = function (palco, tipo, quantidade) {
    if (!palco || reduz()) return;
    const cores = CORES[tipo] || CORES.vitoria;
    const forma = tipo === 'derrota' ? 'cinza' : tipo === 'nivel' ? 'faisca' : 'confete';
    const n = quantidade || (tipo === 'campeao' ? 90 : tipo === 'derrota' ? 26 : 56);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'p p-' + forma;
      const s = p.style;
      s.left = Math.random() * 100 + '%';
      s.setProperty('--dx', (Math.random() - 0.5) * 180 + 'px');
      s.setProperty('--r', Math.random() * 720 - 360 + 'deg');
      s.setProperty('--d', (forma === 'cinza' ? 4.5 : 2.4) + Math.random() * 2.6 + 's');
      s.setProperty('--a', Math.random() * 1.1 + 's');
      s.setProperty('--w', 6 + Math.random() * 7 + 'px');
      s.background = cores[i % cores.length];
      frag.appendChild(p);
    }
    palco.appendChild(frag);
    setTimeout(() => { if (palco.isConnected) palco.querySelectorAll('.p').forEach((x) => x.remove()); }, 8500);
  };

  Celebra.som = function (tipo) {
    if (!window.Som) return;
    if (tipo === 'campeao' || tipo === 'defesa') Som.campeao();
    else if (tipo === 'vitoria') Som.vitoria();
    else if (tipo === 'derrota') Som.derrota();
    else if (tipo === 'nivel') Som.nivel();
  };

  // Dispara tudo de uma vez numa area que ja tem as camadas.
  Celebra.iniciar = function (raiz, tipo) {
    if (tipo === 'empate') return;
    const palco = raiz.querySelector('.fx-particulas');
    Celebra.particulas(palco, tipo);
    if (tipo === 'campeao' || tipo === 'defesa') setTimeout(() => Celebra.particulas(palco, tipo, 60), 1700);
    Celebra.som(tipo);
  };

  // Subida de nivel: anel que enche, numero que vira, ganhos.
  // opcoes: { de, para, pontosAtributo, pontosHab }. Devolve uma Promise que resolve ao fechar.
  Celebra.nivel = function (o) {
    return new Promise((resolve) => {
      const velho = document.querySelector('.cele-nivel');
      if (velho) velho.remove();
      const el = document.createElement('div');
      el.className = 'cele-nivel';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'Você subiu de nível');
      const ganhos = [];
      if (o.pontosAtributo > 0) ganhos.push(`<li><b>+${o.pontosAtributo}</b> ${o.pontosAtributo === 1 ? 'ponto de atributo' : 'pontos de atributo'}</li>`);
      if (o.pontosHab > 0) ganhos.push(`<li class="hab"><b>+${o.pontosHab}</b> ${o.pontosHab === 1 ? 'ponto de habilidade' : 'pontos de habilidade'}</li>`);
      const circ = 2 * Math.PI * 54;
      el.innerHTML = `${Celebra.camadas('nivel')}
        <div class="cn-card">
          <div class="kicker gold">Subiu de nível</div>
          <div class="cn-anel">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="cn-trilho" cx="60" cy="60" r="54"/><circle class="cn-prog" cx="60" cy="60" r="54" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${circ.toFixed(1)}"/></svg>
            <b class="cn-num">${o.de}</b>
          </div>
          <h2 class="cn-titulo">NÍVEL ${o.para}</h2>
          <ul class="cn-ganhos">${ganhos.join('')}</ul>
          <button class="btn primary" id="cn-ok">Continuar<span class="btn-seta">→</span></button>
        </div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('ativo'));
      const prog = el.querySelector('.cn-prog');
      const num = el.querySelector('.cn-num');
      setTimeout(() => { prog.style.strokeDashoffset = '0'; }, 120);
      setTimeout(() => {
        num.textContent = o.para;
        num.classList.add('virou');
      }, reduz() ? 0 : 750);
      Celebra.iniciar(el, 'nivel');
      let fechado = false;
      const fechar = () => {
        if (fechado) return;
        fechado = true;
        document.removeEventListener('keydown', tecla);
        el.classList.remove('ativo');
        setTimeout(() => { el.remove(); resolve(); }, 250);
      };
      const tecla = (ev) => { if (ev.key === 'Escape' || ev.key === 'Enter') fechar(); };
      document.addEventListener('keydown', tecla);
      el.querySelector('#cn-ok').addEventListener('click', fechar);
      el.addEventListener('click', (ev) => { if (ev.target === el) fechar(); });
      setTimeout(() => { const b = el.querySelector('#cn-ok'); if (b) b.focus({ preventScroll: true }); }, 400);
    });
  };

  Celebra.reduz = reduz;
  Celebra.esc = esc;
  window.Celebra = Celebra;
})();
