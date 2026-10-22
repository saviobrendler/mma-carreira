// Negocios: contrato com a organizacao, patrocinios e staff. So apresentacao: toda regra vem do engine.
(function () {
  'use strict';

  const T = {};
  const dinheiro = (n) => '$' + Number(n).toLocaleString('pt-BR');
  const iniciais = (nome) => nome.replace(/^(Dr\.|Dra\.|Mestre|Coach|Sensei|Seu)\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  function pontosContrato(UI, ct) {
    const feitas = ct.lutasTotal - ct.lutasRestantes;
    return Array.from({ length: ct.lutasTotal }, (_, i) => `<i class="${i < feitas ? 'feita' : ''}"></i>`).join('');
  }

  function blocoContrato(UI) {
    const c = UI.carreira;
    const ct = c.contrato;
    const e = UI.esc;
    if (!ct) return '';
    const pct = Math.round((ct.multiplicador - 1) * 100);
    const multTxt = pct === 0 ? 'Bolsa no valor base' : pct > 0 ? `Bolsa ${pct}% acima do valor base` : `Bolsa ${Math.abs(pct)}% abaixo do valor base`;
    return `<section class="bloco-j contrato">
      <header><h3>Contrato com a organização</h3><span>${e(ct.organizacao)}</span></header>
      <div class="ct-grade">
        <div class="ct-nome"><b>${e(ct.nome)}</b><small>${e(multTxt)}</small></div>
        <div class="ct-lutas"><span class="ct-pontos" aria-label="${ct.lutasTotal - ct.lutasRestantes} de ${ct.lutasTotal} lutas feitas">${pontosContrato(UI, ct)}</span><small>${ct.lutasRestantes} ${UI.plural(ct.lutasRestantes, 'luta restante', 'lutas restantes')}</small></div>
        <div class="ct-bonus"><div><small>Bônus por vitória</small><b>${dinheiro(ct.bonusVitoria)}</b></div><div><small>Bônus por finalização</small><b>+${dinheiro(ct.bonusFinalizacao)}</b></div></div>
      </div>
      <p class="sub">Quando as lutas do contrato acabam, a organização apresenta uma renovação. Quem vale mais (fama, sequência, cinturão) recebe propostas melhores.</p>
    </section>`;
  }

  function blocoNegociacao(UI) {
    const c = UI.carreira;
    const n = c.negociacao;
    if (!n) return '';
    const e = UI.esc;
    const cards = n.propostas.map((p) => {
      const pct = Math.round((p.mult - 1) * 100);
      return `<article class="proposta${p.id === 'campeao' ? ' campeao' : ''}">
        <h4>${e(p.nome)}</h4><p>${e(p.descr)}</p>
        <ul><li><b>${p.lutas}</b> lutas</li><li>Bolsa <b>${pct >= 0 ? '+' : '−'}${Math.abs(pct)}%</b> sobre o valor base</li><li>Vitória <b>+${dinheiro(p.bonusVitoria)}</b></li><li>Finalização <b>+${dinheiro(p.bonusFinalizacao)}</b></li></ul>
        ${UI.btn({ texto: 'Assinar', acao: 'assinar', data: { id: p.id }, tipo: 'primary', trailing: 'seta' })}
      </article>`;
    }).join('');
    const p = Math.round((0.35 + 0.08 * UI.MMA.nivelFama(c).nivel + (c.campeao ? 0.1 : 0)) * 100);
    return `<section class="negociacao" role="alert"><header><span class="kicker">Seu contrato acabou</span><h2>Renove para continuar lutando</h2><p>${e(n.motivo)} Você não pode marcar outra luta até assinar uma das propostas.</p></header>
      <div class="propostas">${cards}</div>
      <div class="neg-acoes">${n.tentou ? `<p class="neg-res">${e(n.resultado || 'Você já tentou negociar.')}</p>` : UI.btn({ texto: 'Pedir mais dinheiro', acao: 'negociar-mais', icone: 'dinheiro' }) + `<small>Uma tentativa: cerca de ${p}% de chance de melhorar todas as propostas em 10%; se falhar, elas pioram.</small>`}</div></section>`;
  }

  function blocoPatrocinios(UI) {
    const c = UI.carreira;
    const e = UI.esc;
    const slots = UI.MMA.slotsPatrocinio(c);
    const atuais = c.patrocinios || [];
    const linha = (p) => `<li class="pat-ativo"><span class="pat-marca">${e(p.marca.slice(0, 2).toUpperCase())}</span><div><b>${e(p.marca)}</b><small>${e(p.setor)} · ${e(p.condicao)}</small></div><div class="pat-valor"><b>${dinheiro(p.pagamento)}</b><small>por luta · ${p.lutasRestantes} ${UI.plural(p.lutasRestantes, 'restante', 'restantes')}</small></div></li>`;
    const vazias = Array.from({ length: Math.max(0, slots - atuais.length) }, () => '<li class="pat-vaga"><span class="pat-marca">+</span><div><b>Vaga livre</b><small>Espere uma proposta ou ganhe mais fama.</small></div></li>').join('');
    const ofertas = (c.ofertasPatrocinio || []).map((o) => `<li class="pat-oferta"><span class="pat-marca">${e(o.marca.slice(0, 2).toUpperCase())}</span><div><b>${e(o.marca)}</b><small>${e(o.setor)} · ${e(o.condicao)} · ${o.lutas} lutas</small></div><div class="pat-valor"><b>${dinheiro(o.pagamento)}</b><small>por luta</small></div><div class="pat-botoes">${UI.btn({ texto: 'Aceitar', acao: 'patro-aceitar', data: { id: o.id }, tipo: 'primary' })}${UI.btn({ texto: 'Recusar', acao: 'patro-recusar', data: { id: o.id }, tipo: 'ghost' })}</div></li>`).join('');
    return `<section class="bloco-j"><header><h3>Patrocínios</h3><span>${atuais.length} de ${slots} ${UI.plural(slots, 'vaga', 'vagas')}</span></header>
      <ul class="patrocinios">${atuais.map(linha).join('')}${vazias}</ul>
      ${ofertas ? `<h4 class="mini-tit">Propostas na mesa</h4><ul class="patrocinios">${ofertas}</ul>` : '<p class="sub">Nenhuma proposta agora. As marcas aparecem conforme a sua fama cresce e depois de cada luta.</p>'}
      <p class="sub">Cada vaga a mais abre com um nível de fama (a cada dois níveis). Sequência de derrotas assusta patrocinadores.</p></section>`;
  }

  function blocoStaff(UI) {
    const c = UI.carreira;
    const e = UI.esc;
    const linhas = UI.MMA.staffDaCarreira(c).map((s) => `<li class="${s.contratado ? '' : 'vago'}"><span class="st-face" aria-hidden="true">${e(iniciais(s.nome))}</span><div><b>${e(s.nome)}</b><small>${e(s.funcao)} · nível ${s.nivel} de 3</small><p>“${e(s.fala)}”</p></div></li>`).join('');
    return `<section class="bloco-j"><header><h3>Equipe</h3><span>quem trabalha com você</span></header><ul class="staff">${linhas}</ul>
      <div class="acoes-linha">${UI.btn({ texto: 'Melhorar a equipe (academia)', acao: 'ir', data: { tela: 'academia' }, icone: 'dinheiro' })}</div></section>`;
  }

  T.negocios = function (UI) {
    const c = UI.carreira;
    return `<header class="cab-j"><span class="kicker">Negócios</span><h1>Contrato, patrocínios e equipe</h1><p>Dinheiro não é só bolsa: o contrato define quanto você ganha por luta, os patrocinadores pagam por resultado e a equipe é quem te prepara.</p>
      <div class="neg-resumo"><div><small>Dinheiro</small><b>${dinheiro(c.dinheiro)}</b></div><div><small>Seguidores</small><b>${(c.seguidores || 0).toLocaleString('pt-BR')}</b></div><div><small>Valor de mercado</small><b>${Math.round(UI.MMA.valorDeMercado(c) * 100)}%</b></div></div></header>
      ${blocoNegociacao(UI)}
      <div class="duas-col"><div class="coluna">${blocoContrato(UI)}${blocoPatrocinios(UI)}</div><div class="coluna">${blocoStaff(UI)}</div></div>`;
  };

  // Aviso curto (Carreira e Proxima luta) quando ha contrato vencido ou proposta de patrocinio esperando.
  T.avisoNegocios = function (UI) {
    const c = UI.carreira;
    if (c.negociacao) return `<aside class="aviso-imp cancelamento" role="alert"><div><b>Seu contrato acabou</b><p>Renove com a organização para continuar marcando lutas.</p></div>${UI.btn({ texto: 'Renovar contrato', acao: 'ir', data: { tela: 'negocios' }, tipo: 'primary' })}</aside>`;
    const n = (c.ofertasPatrocinio || []).length;
    if (n) return `<aside class="aviso-imp"><div><b>${n} ${UI.plural(n, 'proposta de patrocínio', 'propostas de patrocínio')}</b><p>Uma marca quer patrociná-lo. Veja as condições antes que a proposta expire.</p></div>${UI.btn({ texto: 'Ver propostas', acao: 'ir', data: { tela: 'negocios' } })}</aside>`;
    return '';
  };

  window.TELAS = Object.assign(window.TELAS || {}, T);
})();
