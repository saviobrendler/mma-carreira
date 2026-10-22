// Regras proprias de cada era: Lendas (sem juizes, torneios de uma noite), Ouro (5 rounds na luta principal, PPV)
// e Atual (seguidores valem bolsa).
const assert = require('assert');
const path = require('path');

global.window = global;
require(path.join(__dirname, '..', 'js', 'data.js'));
const MMA = require(path.join(__dirname, '..', 'js', 'engine.js'));

let falhas = 0;
function teste(nome, fn) {
  try {
    fn();
    console.log('ok  ', nome);
  } catch (e) {
    falhas++;
    console.log('FALHA', nome, '\n     ', e.stack.split('\n').slice(0, 4).join('\n      '));
  }
}

const nova = (periodo, seed) => {
  const c = MMA.novaCarreira({ nome: 'Era Teste', estilo: 'misto', periodo: periodo, divisaoId: periodo === 'eras' ? 'peso_aberto' : 'peso_leve', rng: MMA.criarRng(seed || 1) });
  c.semImprevistos = true;
  c.semDrop = -100;
  c.contrato.lutasRestantes = 999;
  return c;
};

function camp(c, rng) {
  let g = 0;
  while (MMA.etapaAtual(c) && g++ < 30) {
    if (MMA.etapaAtual(c).tipo === 'evento') MMA.resolverEvento(c, 0, rng);
    else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
  }
}

function lutaForcada(c, rng, resultado) {
  const a = c.agendada;
  const luta = MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
  luta.resultado = Object.assign({ vencedor: 0, metodo: 'Decisão unânime', round: 3, tempo: '5:00' }, resultado || {});
  return { luta, r: MMA.aplicarLuta(c, a.op, luta, a.titulo, rng) };
}

function oferecerTorneio(c, seed) {
  for (let i = 0; i < 60; i++) {
    c.ofertas = [];
    c.semana += 15;
    MMA.gerarOfertas(c, MMA.criarRng(seed + i));
    const t = c.ofertas.find((o) => o.torneio);
    if (t) return t;
  }
  return null;
}

teste('regras de cada era descritas em frases (5 por era)', () => {
  ['eras', 'auge', 'atual'].forEach((p) => {
    const r = MMA.regrasDaEra(p);
    assert.ok(r.nome && r.resumo && r.linhas.length === 5);
    r.linhas.forEach((l) => assert.ok(l.length > 20));
  });
  assert.ok(/juízes|árbitro/.test(MMA.regrasDaEra('eras').linhas.join(' ')));
  assert.ok(/pay-per-view|PPV/i.test(MMA.regrasDaEra('auge').linhas.join(' ')));
  assert.ok(/seguidores/.test(MMA.regrasDaEra('atual').linhas.join(' ')));
});

teste('Lendas: luta sem juizes (decide o arbitro) e corte nao para a luta; as outras eras seguem com juizes e medico', () => {
  const L = (nome, estilo) => ({ nome: nome, atributos: Object.assign({}, MMA.PERFIS[estilo]) });
  let medicoLendas = 0;
  let medicoNormal = 0;
  let arbitro = 0;
  for (let i = 0; i < 400; i++) {
    const a = new MMA.Luta(L('A', 'striking'), L('B', 'striking'), { rodadas: 3, regra: 'lendas', rng: MMA.criarRng(i + 1) });
    a.simularCompleta();
    if (a.resultado.detalhe === 'parada médica') medicoLendas++;
    if (a.resultado.metodo === 'Decisão do árbitro') { arbitro++; assert.strictEqual(a.resultado.cartoes, null); assert.ok(a.resultado.vencedor === 0 || a.resultado.vencedor === 1); }
    assert.ok(!/^Decisão (unânime|dividida|majoritária)$/.test(a.resultado.metodo), 'juizes em luta das Lendas');
    const b = new MMA.Luta(L('A', 'striking'), L('B', 'striking'), { rodadas: 3, rng: MMA.criarRng(i + 1) });
    b.simularCompleta();
    if (b.resultado.detalhe === 'parada médica') medicoNormal++;
  }
  assert.strictEqual(medicoLendas, 0);
  assert.ok(medicoNormal > 0, 'paradas medicas deveriam existir nas outras eras');
  assert.ok(arbitro > 20, 'decisoes do arbitro: ' + arbitro);
  // salva e restaura mantendo a regra
  const l = new MMA.Luta(L('A', 'misto'), L('B', 'misto'), { rodadas: 3, regra: 'lendas', rng: MMA.criarRng(3) });
  l.rodarRound(null);
  assert.strictEqual(MMA.Luta.restaurar(JSON.parse(JSON.stringify(l)), MMA.criarRng(1)).regra, 'lendas');
});

teste('Lendas: a luta do jogador usa a regra das Lendas e o resultado nao tem cartoes', () => {
  const c = nova('eras', 2);
  const rng = MMA.criarRng(3);
  MMA.aceitarOferta(c, c.ofertas[0].id, rng);
  camp(c, rng);
  const a = c.agendada;
  const luta = MMA.iniciarLutaAtiva(c, a.op, false, rng);
  assert.strictEqual(MMA.retomarLutaAtiva(c).luta.regra, 'lendas');
  luta.simularCompleta();
  assert.ok(luta.resultado.cartoes === null || luta.resultado.metodo === 'Nocaute' || luta.resultado.metodo === 'Finalização');
});

teste('Lendas: torneio de uma noite aparece a cada 14 semanas, no fim da lista, com tres adversarios do mais fraco ao mais forte', () => {
  const c = nova('eras', 5);
  const t = oferecerTorneio(c, 100);
  assert.ok(t, 'o torneio nunca apareceu');
  assert.strictEqual(t.chaves.length, 3);
  assert.ok(t.chaves[0].rating <= t.chaves[1].rating && t.chaves[1].rating <= t.chaves[2].rating);
  assert.strictEqual(new Set(t.chaves.map((x) => x.nome)).size, 3);
  assert.ok(t.premio > t.bolsa * 2);
  assert.notStrictEqual(c.ofertas[0].id, t.id, 'o torneio nao deve ser a primeira oferta');
  assert.strictEqual(MMA.papelOferta(c, t).papel, 'torneio');
  // nas outras eras nunca
  ['auge', 'atual'].forEach((p) => {
    const d = nova(p, 6);
    for (let i = 0; i < 20; i++) { d.ofertas = []; d.semana += 15; MMA.gerarOfertas(d, MMA.criarRng(i)); assert.ok(!d.ofertas.some((o) => o.torneio)); }
  });
});

teste('torneio completo: tres vitorias seguidas na mesma noite, dano e cansaco passam adiante, premio no fim', () => {
  const c = nova('eras', 7);
  const rng = MMA.criarRng(8);
  const t = oferecerTorneio(c, 200);
  assert.ok(MMA.aceitarOferta(c, t.id, rng).ok);
  assert.ok(c.agendada.torneio && c.agendada.torneio.etapa === 0);
  const ev = c.agendada.evento;
  assert.ok(ev.torneio && ev.card.length === 3 && ev.card.every((l) => l.jogador) && /Torneio/.test(ev.nome));
  assert.deepStrictEqual(ev.card.map((l) => l.bloco), MMA.ETAPAS_TORNEIO);
  camp(c, rng);
  const semana0 = c.semana;
  const dinheiro0 = c.dinheiro;
  // quartas
  let { r } = lutaForcada(c, rng, { vencedor: 0, metodo: 'Nocaute', round: 1, tempo: '1:00' });
  assert.ok(r.torneio && r.torneio.proxima && r.torneio.nome === 'Quartas de final' && !r.torneio.campeao);
  assert.ok(c.agendada && c.agendada.torneio.etapa === 1 && c.agendada.op.nome === t.chaves[1].nome, 'proximo adversario');
  assert.strictEqual(c.lutaAtiva, null);
  assert.strictEqual(c.semana, semana0, 'a noite nao pode passar semanas entre as lutas');
  assert.ok(c.camp, 'camp continua durante a noite');
  assert.strictEqual((c.eventosPassados || []).length, 0, 'evento so fecha no fim da noite');
  assert.strictEqual(c.recorde.v, 1);
  // semifinal: o jogador chega com dano e cansaco
  c.agendada.torneio.estado = { dano: 60, stam: 40 };
  const luta2 = MMA.iniciarLutaAtiva(c, c.agendada.op, false, rng);
  assert.ok(luta2.f[0].dano > 30 && luta2.f[0].dano < 40, 'dano acumulado nao passou: ' + luta2.f[0].dano);
  assert.ok(luta2.f[0].stam >= 55 && luta2.f[0].stam <= 65, 'folego da noite: ' + luta2.f[0].stam);
  assert.ok(luta2.f[1].dano > 0);
  luta2.resultado = { vencedor: 0, metodo: 'Decisão do árbitro', round: 3, tempo: '5:00', cartoes: null };
  r = MMA.aplicarLuta(c, c.agendada.op, luta2, false, rng);
  assert.ok(r.torneio.proxima && r.torneio.nome === 'Semifinal');
  // final
  ({ r } = lutaForcada(c, rng, { vencedor: 0, metodo: 'Finalização', round: 2, tempo: '2:00' }));
  assert.ok(r.torneio.campeao && r.torneio.premio === t.premio && r.torneio.proxima === null);
  assert.strictEqual(c.agendada, null);
  assert.strictEqual(c.torneios, 1);
  assert.ok(c.dinheiro - dinheiro0 >= t.premio, 'premio nao foi pago');
  assert.strictEqual(c.recorde.v, 3);
  assert.strictEqual(c.eventosPassados.length, 1);
  assert.ok(c.eventosPassados[0].torneio && c.eventosPassados[0].card.every((l) => l.resultado));
  assert.ok(c.historico.filter((h) => h.torneio).map((h) => h.torneio).join() === 'Quartas de final,Semifinal,Final');
  assert.ok(c.semana > semana0, 'depois da noite a semana passa');
  assert.ok(MMA.legado(c).torneios === 1);
  assert.ok(c.imprensa.some((x) => /CAMPEÃO DO TORNEIO/.test(x.texto)));
});

teste('torneio: derrota elimina na hora, fecha a noite sem premio e o contrato conta uma luta so', () => {
  const c = nova('eras', 9);
  c.contrato.lutasRestantes = 4;
  const rng = MMA.criarRng(10);
  const t = oferecerTorneio(c, 300);
  MMA.aceitarOferta(c, t.id, rng);
  camp(c, rng);
  lutaForcada(c, rng, { vencedor: 0 });
  assert.strictEqual(c.contrato.lutasRestantes, 4, 'luta do meio da noite nao gasta contrato');
  const d0 = c.dinheiro;
  const { r } = lutaForcada(c, rng, { vencedor: 1, metodo: 'Nocaute', round: 2, tempo: '1:30' });
  assert.ok(r.torneio.eliminado && !r.torneio.campeao && r.torneio.premio === 0);
  assert.strictEqual(c.agendada, null);
  assert.ok(c.dinheiro - d0 < t.premio);
  assert.strictEqual(c.eventosPassados.length, 1);
  assert.strictEqual(c.contrato.lutasRestantes, 3, 'a noite inteira conta uma luta');
  assert.strictEqual(c.torneios || 0, 0);
  assert.strictEqual(c.recorde.v + c.recorde.d, 2);
});

teste('Ouro: a luta principal tem 5 rounds (mesmo sem titulo) e paga bonus de PPV; Atual: seguidores somam na bolsa', () => {
  let achouPrincipal = false;
  for (let k = 0; k < 60 && !achouPrincipal; k++) {
    const c = nova('auge', 100 + k);
    c.fama = 600;
    c.pontos = 9000; // no topo do ranking: a luta dele costuma ser a principal do card
    c.sequencia = 0; // sem direito a titulo: luta principal sem cinturao
    const rng = MMA.criarRng(k);
    MMA.gerarOfertas(c, rng);
    const o = c.ofertas.find((x) => !x.titulo && !x.superluta) || c.ofertas[0];
    MMA.aceitarOferta(c, o.id, rng);
    const meu = c.agendada.evento.card.find((l) => l.jogador);
    if (meu.bloco === 'Luta principal') {
      achouPrincipal = true;
      assert.strictEqual(meu.rounds, 5);
      assert.strictEqual(c.agendada.rounds, 5);
      camp(c, rng);
      const luta = MMA.iniciarLutaAtiva(c, c.agendada.op, false, rng);
      assert.strictEqual(luta.rodadasTotais, 5);
      luta.resultado = { vencedor: 0, metodo: 'Decisão unânime', round: 5, tempo: '5:00', cartoes: [[50, 45], [50, 45], [50, 45]] };
      const r = MMA.aplicarLuta(c, c.agendada.op, luta, false, rng);
      assert.ok(r.ppv > 0, 'sem bonus de PPV');
    } else {
      // luta que nao e a principal tem 3 rounds
      assert.strictEqual(meu.rounds, 3);
    }
  }
  assert.ok(achouPrincipal, 'nunca foi luta principal');
  const a = nova('atual', 3);
  const b = nova('atual', 3);
  a.seguidores = 400000;
  b.seguidores = 0;
  const rng = MMA.criarRng(5);
  [a, b].forEach((c) => { MMA.aceitarOferta(c, c.ofertas[0].id, MMA.criarRng(1)); camp(c, MMA.criarRng(2)); });
  const ra = lutaForcada(a, rng, { vencedor: 0 }).r;
  const rb = lutaForcada(b, MMA.criarRng(5), { vencedor: 0 }).r;
  assert.ok(ra.bonusSocial > 0 && rb.bonusSocial === 0, 'bonus social ' + ra.bonusSocial + '/' + rb.bonusSocial);
  assert.ok(ra.bonusSocial <= rb.bolsa * 0.26);
  // PPV so na Era de Ouro
  assert.strictEqual(ra.ppv, 0);
});

teste('saves antigos e as tres eras seguem coerentes depois das regras novas (simulacao curta)', () => {
  ['eras', 'auge', 'atual'].forEach((p, k) => {
    const c = nova(p, 40 + k);
    c.semImprevistos = false;
    const rng = MMA.criarRng(k + 3);
    let lutas = 0;
    for (let g = 0; g < 500 && lutas < 8; g++) {
      if (c.negociacao) { MMA.assinarContrato(c, c.negociacao.propostas[0].id); continue; }
      if (c.imprevisto) { MMA.resolverImprevisto(c, 'lutar', rng); continue; }
      if (c.evento) { MMA.resolverEvento(c, 0, rng); continue; }
      if (c.agendada && MMA.etapaAtual(c)) { MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng); continue; }
      if (c.agendada && MMA.diaDeLuta(c)) {
        const a = c.agendada;
        const luta = MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
        luta.simularCompleta();
        MMA.aplicarLuta(c, a.op, luta, a.titulo, rng);
        c.energia = 100;
        lutas++;
        continue;
      }
      if (c.lesao || !c.ofertas.length) { MMA.descansar(c, rng); continue; }
      const o = c.ofertas.find((x) => x.torneio && p === 'eras') || c.ofertas[0];
      MMA.aceitarOferta(c, o.id, rng);
    }
    assert.ok(lutas >= 4, p + ' travou com ' + lutas + ' lutas');
    assert.strictEqual(c.recorde.v + c.recorde.d + c.recorde.e, c.historico.length);
  });
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes de eras passaram.');
process.exit(falhas ? 1 : 0);
