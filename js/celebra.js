// Momentos de destaque: tipo de resultado, foto real do cinturao e subida de nivel.
// Sem audio, sem particulas e sem efeitos de brilho: so tipografia, foto e uma entrada curta.
(function () {
  'use strict';

  const Celebra = {};

  const reduz = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Que destaque a luta merece.
  Celebra.tipoFinal = function (o) {
    if (o.empatou) return 'empate';
    if (!o.venceu) return 'derrota';
    if (o.titulo) return o.campeaoAntes ? 'defesa' : 'campeao';
    return 'vitoria';
  };

  // Foto real do campeao: 1 cinturao (vitoria ou defesa) ou 2 (campeao em duas categorias).
  // O conteudo (kicker + titulo) entra na legenda da foto.
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

  // Subida de nivel: numero novo e o que ela rendeu. opcoes: { de, para, pontosAtributo, pontosHab }.
  // Devolve uma Promise que resolve ao fechar (botao, Enter ou Esc).
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
      el.innerHTML = `<div class="cn-card">
          <div class="kicker gold">Subiu de nível</div>
          <div class="cn-num"><small>${o.de}</small><i aria-hidden="true">→</i><b>${o.para}</b></div>
          <h2 class="cn-titulo">Nível ${o.para}</h2>
          <ul class="cn-ganhos">${ganhos.join('')}</ul>
          <button class="btn primary" id="cn-ok">Continuar<span class="btn-seta">→</span></button>
        </div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('ativo'));
      let fechado = false;
      const fechar = () => {
        if (fechado) return;
        fechado = true;
        document.removeEventListener('keydown', tecla);
        el.classList.remove('ativo');
        setTimeout(() => { el.remove(); resolve(); }, reduz() ? 0 : 200);
      };
      const tecla = (ev) => { if (ev.key === 'Escape' || ev.key === 'Enter') fechar(); };
      document.addEventListener('keydown', tecla);
      el.querySelector('#cn-ok').addEventListener('click', fechar);
      el.addEventListener('click', (ev) => { if (ev.target === el) fechar(); });
      setTimeout(() => { const b = el.querySelector('#cn-ok'); if (b) b.focus({ preventScroll: true }); }, 100);
    });
  };

  Celebra.reduz = reduz;
  window.Celebra = Celebra;
})();
