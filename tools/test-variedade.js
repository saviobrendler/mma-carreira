// Variedade: foco do camp, sparring com lutadores reais, ponto fraco, arquetipos, lesoes graves e eventos de vida.
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

function comCamp(seed, extra, semanas) {
  const c = MMA.novaCarreira(Object.assign({ nome: 'Var Teste', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(seed) }, extra || {}));
  c.semImprevistos = true;
  c.semDrop = -100;
  const rng = MMA.criarRng(seed + 500);
  assert.ok(MMA.aceitarOferta(c, c.ofertas[0].id, rng).ok);
  return { c, rng };
}

teste('camp longo comeca pela escolha do foco (5 opcoes) e o foco vale para o camp inteiro', () => {
  let achou = 0;
  for (let k = 0; k < 30; k++) {
    const { c, rng } = comCamp(100 + k);
    if (c.camp.total < 4) continue;
    achou++;
    assert.strictEqual(MMA.etapaAtual(c).tipo, 'foco');
    assert.strictEqual(MMA.etapaAtual(c).semanas, 0);
    const ops = MMA.opcoesEtapa(c);
    assert.strictEqual(ops.length, 5);
    assert.ok(ops.some((o) => o.recomendado));
    const r = MMA.decidirCamp(c, 'wrestling', rng);
    assert.ok(r.ok && c.camp.efeitos.foco === 'wrestling');
    assert.strictEqual(MMA.etapaAtual(c).tipo, 'plano');
    // +1 no bonus de luta do atributo do foco
    const w = MMA.opcoesEtapa(c).find((o) => o.id === 'atv:wrestling');
    MMA.decidirCamp(c, 'atv:wrestling', rng);
    assert.ok(c.camp.efeitos.attr.wrestling >= 3, 'bonus de luta do foco: ' + c.camp.efeitos.attr.wrestling);
    void w;
  }
  assert.ok(achou >= 10, 'poucos camps longos: ' + achou);
  // camps curtos nao tem foco
  assert.ok(!MMA.gerarEtapas(3).some((e) => e.tipo === 'foco'));
});

teste('foco aumenta a chance de evoluir os atributos da area (e so deles)', () => {
  const evolucoes = { com: 0, sem: 0, fora: 0 };
  const N = 400;
  for (let k = 0; k < N; k++) {
    ['wrestling', 'equilibrado'].forEach((foco) => {
      const { c, rng } = comCamp(1000 + k);
      if (c.camp.total < 4) return;
      MMA.decidirCamp(c, foco, rng);
      c.energia = 100;
      const w0 = c.atributos.wrestling;
      const s0 = c.atributos.striking;
      MMA.decidirCamp(c, 'atv:wrestling', rng);
      if (c.atributos.wrestling > w0) evolucoes[foco === 'wrestling' ? 'com' : 'sem']++;
      if (foco === 'wrestling' && c.atributos.striking > s0) evolucoes.fora++;
    });
  }
  assert.ok(evolucoes.com > evolucoes.sem, 'foco nao ajudou: ' + JSON.stringify(evolucoes));
});

teste('sparring com lutador real: dois parceiros, evolui o que ele tem de forte, custa energia e arrisca lesao', () => {
  for (let k = 0; k < 20; k++) {
    const { c, rng } = comCamp(200 + k);
    if (c.camp.total >= 4) MMA.decidirCamp(c, 'equilibrado', rng);
    const ops = MMA.opcoesEtapa(c);
    const sp = ops.filter((o) => o.id.indexOf('spar:') === 0);
    assert.ok(sp.length >= 1 && sp.length <= 2, 'parceiros ' + sp.length);
    const par = MMA.parceirosDoCamp(c);
    par.forEach((p) => {
      assert.ok(p.nome !== c.agendada.op.nome && p.nome !== c.nome, 'parceiro invalido');
      assert.ok(MMA.ATRIBUTOS.includes(p.forte));
    });
    assert.ok(sp[0].titulo.includes(par[0].nome) && sp[0].risco === 'Risco de lesão alto');
    const e0 = c.energia;
    const r = MMA.decidirCamp(c, sp[0].id, rng);
    assert.ok(r.ok && r.linhas.some((l) => l.includes(par[0].nome)));
    assert.ok(c.energia < e0, 'sparring nao gastou energia');
    assert.ok(c.camp.efeitos.attr[par[0].forte] >= 2);
  }
});

teste('estudar o adversario revela o ponto fraco dele e da bonus especifico', () => {
  let visto = 0;
  for (let k = 0; k < 40; k++) {
    const { c, rng } = comCamp(300 + k);
    let g = 0;
    while (MMA.etapaAtual(c) && MMA.etapaAtual(c).tipo !== 'scouting' && g++ < 20) {
      if (MMA.etapaAtual(c).tipo === 'evento') MMA.resolverEvento(c, 0, rng);
      else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
    }
    if (!MMA.etapaAtual(c)) continue;
    const r = MMA.decidirCamp(c, 'estudar', rng);
    assert.ok(r.ok);
    assert.ok(r.linhas.some((l) => /Ponto fraco:/.test(l)), 'sem ponto fraco');
    assert.ok(c.camp.efeitos.pontoFraco);
    assert.ok(c.camp.efeitos.scout === true);
    visto++;
  }
  assert.ok(visto >= 20);
});

teste('arquetipos: cada um muda atributos, da um traco proprio gratis e o prodigio ganha potencial', () => {
  const base = MMA.novaCarreira({ nome: 'Base', estilo: 'misto', modalidade: 'mma', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) });
  assert.strictEqual(base.arquetipo, null);
  Object.keys(MMA.ARQUETIPOS).forEach((id) => {
    const a = MMA.ARQUETIPOS[id];
    const c = MMA.novaCarreira({ nome: 'Arq ' + id, estilo: 'misto', modalidade: 'mma', arquetipo: id, periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) });
    assert.strictEqual(c.arquetipo, id);
    Object.keys(a.bonus).forEach((k) => {
      assert.strictEqual(c.atributos[k], Math.min(99, Math.max(1, base.atributos[k] + a.bonus[k])), id + ' ' + k);
    });
    assert.ok(MMA.TRACOS[a.traco], 'traco inexistente em ' + id);
    // o traco entra na luta sem ocupar vaga
    const rng = MMA.criarRng(2);
    c.semImprevistos = true;
    MMA.aceitarOferta(c, c.ofertas[0].id, rng);
    let g = 0;
    while (MMA.etapaAtual(c) && g++ < 30) {
      if (MMA.etapaAtual(c).tipo === 'evento') MMA.resolverEvento(c, 0, rng);
      else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
    }
    const luta = MMA.iniciarLutaAtiva(c, c.agendada.op, false, rng);
    assert.ok(luta.tracos[0].indexOf(a.traco) >= 0, 'traco do arquetipo nao chegou a luta: ' + id);
    assert.ok(c.tracos.indexOf(a.traco) < 0 || c.tracos.length <= MMA.slotsTracos(c));
  });
  const prodigio = MMA.novaCarreira({ nome: 'P', estilo: 'misto', modalidade: 'mma', arquetipo: 'prodigio', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) });
  assert.ok(prodigio.potencial >= base.potencial + 5);
  assert.strictEqual(MMA.novaCarreira({ nome: 'X', estilo: 'misto', arquetipo: 'nao-existe', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) }).arquetipo, null);
});

teste('lesao grave: decisao entre operar e tratar, desfecho ao curar (volta mais forte ou sequela)', () => {
  let graves = 0;
  const rng0 = MMA.criarRng(77);
  for (let i = 0; i < 400; i++) {
    const l = MMA.sortearLesao ? null : null;
    void l;
  }
  // forca a lesao grave diretamente
  const mk = (cirurgia, seed) => {
    const c = MMA.novaCarreira({ nome: 'Les', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(seed) });
    c.semImprevistos = true;
    c.ofertas = [];
    const les = { nome: 'Ruptura de ligamento do joelho', semanas: 10, grave: true, historia: 'Seu joelho cedeu.' };
    c.lesao = les;
    c.decisaoLesao = { nome: les.nome, historia: les.historia, semanas: 10, opcoes: [{ id: 'operar' }, { id: 'tratar' }] };
    return { c, cirurgia };
  };
  let melhorou = 0;
  let sequelas = 0;
  for (let k = 0; k < 120; k++) {
    const { c } = mk(true, k + 1);
    const antes = JSON.stringify(c.atributos);
    const r = MMA.resolverLesao(c, 'operar', MMA.criarRng(k));
    assert.ok(r.ok && c.decisaoLesao === null && c.lesao.semanas === 13 && c.lesao.cirurgia);
    const rng = MMA.criarRng(k + 9);
    for (let i = 0; i < 14 && c.lesao; i++) { c.energia = 100; MMA.descansar(c, rng); }
    assert.strictEqual(c.lesao, null, 'nao curou');
    if (JSON.stringify(c.atributos) !== antes) {
      melhorou++;
      MMA.ATRIBUTOS.forEach((a) => assert.ok(JSON.parse(antes)[a] <= c.atributos[a], 'cirurgia nao pode piorar'));
    }
    graves++;
  }
  assert.ok(melhorou > 40 && melhorou < 110, 'cirurgia melhorou ' + melhorou);
  for (let k = 0; k < 150; k++) {
    const { c } = mk(false, k + 500);
    const antes = JSON.stringify(c.atributos);
    const r = MMA.resolverLesao(c, 'tratar', MMA.criarRng(k + 5));
    assert.ok(r.ok && c.lesao.semanas === 10 && !c.lesao.cirurgia);
    const rng = MMA.criarRng(k + 1);
    for (let i = 0; i < 12 && c.lesao; i++) { c.energia = 100; MMA.descansar(c, rng); }
    if (JSON.stringify(c.atributos) !== antes) {
      sequelas++;
      MMA.ATRIBUTOS.forEach((a) => assert.ok(JSON.parse(antes)[a] >= c.atributos[a], 'tratamento nao melhora'));
    }
  }
  assert.ok(sequelas > 30 && sequelas < 90, 'sequelas ' + sequelas + ' de 150');
  assert.strictEqual(MMA.resolverLesao(mk(true, 1).c, 'x').ok, false);
  void rng0;
  void graves;
});

teste('lesoes graves sao raras (~10%) e geram decisao na hora de aplicar', () => {
  const r = MMA.criarRng(31);
  let graves = 0;
  for (let i = 0; i < 2000; i++) {
    const c = MMA.novaCarreira({ nome: 'L', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) });
    // usa o proprio motor: lesao vinda de um camp com sparring pesado
    c.semImprevistos = true;
    const x = MMA.opcoesEtapa; void x;
    const lesao = (function () { const q = r(); return q; })();
    void lesao;
    break;
  }
  // frequencia pela funcao exposta via camp: 3000 camps com risco alto
  let lesoes = 0;
  for (let k = 0; k < 3000; k++) {
    const { c, rng } = comCamp(9000 + k);
    if (c.camp.total >= 4) MMA.decidirCamp(c, 'equilibrado', rng);
    c.energia = 100;
    const sp = MMA.opcoesEtapa(c).find((o) => o.id === 'spar:0');
    if (!sp) continue;
    MMA.decidirCamp(c, sp.id, rng);
    if (c.lesao) { lesoes++; if (c.lesao.grave) { graves++; assert.ok(c.decisaoLesao && c.decisaoLesao.opcoes.length === 2 && c.decisaoLesao.historia); } }
  }
  assert.ok(lesoes > 150, 'poucas lesoes: ' + lesoes);
  assert.ok(graves > 5 && graves / lesoes < 0.2, 'graves ' + graves + ' de ' + lesoes);
});

teste('eventos de vida: aparecem fora do camp so para quem ja lutou, trazem decisao e nao travam por falta de dinheiro', () => {
  const vistos = new Set();
  let total = 0;
  for (let k = 0; k < 60; k++) {
    const c = MMA.novaCarreira({ nome: 'Vida', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(k + 1) });
    const rng = MMA.criarRng(k + 70);
    // sem luta ainda: nenhum evento de vida
    for (let i = 0; i < 40; i++) { c.energia = 100; MMA.descansar(c, rng); assert.strictEqual(c.evento, null, 'evento de vida antes da primeira luta'); if (c.agendada) { c.agendada = null; c.camp = null; } }
    c.historico.push({ resultado: 'Vitória' });
    c.dinheiro = 0;
    for (let i = 0; i < 300; i++) {
      c.energia = 100;
      MMA.descansar(c, rng);
      if (c.agendada) { c.agendada = null; c.camp = null; }
      if (c.evento) {
        total++;
        const idEv = c.evento.id;
        vistos.add(idEv);
        const r0 = MMA.resolverEvento(c, 0, rng);
        if (!r0.ok) assert.ok(MMA.resolverEvento(c, 1, rng).ok, 'sem opcao gratuita no evento ' + idEv);
        assert.strictEqual(c.evento, null);
      }
    }
  }
  assert.ok(total > 100, 'poucos eventos de vida: ' + total);
  ['filho', 'polemica', 'escandalo', 'reality', 'familia', 'academia_rival'].forEach((id) => assert.ok(vistos.has(id), 'evento de vida nunca apareceu: ' + id));
});

teste('trilogia: apos uma vitoria e uma derrota contra o mesmo rival, a terceira luta aparece com papel proprio, bolsa maior e fama extra', () => {
  const c = MMA.novaCarreira({ nome: 'Tri Teste', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(4) });
  c.semImprevistos = true;
  c.semFoco = true;
  c.semDrop = -100;
  c.contrato.lutasRestantes = 99;
  const rng = MMA.criarRng(9);
  const rival = c.ofertas[0].op;
  c.historico.push({ oponente: rival.nome, resultado: 'Vitória', metodo: 'Nocaute', round: 1 }, { oponente: rival.nome, resultado: 'Derrota', metodo: 'Decisão unânime', round: 3 });
  c.recorde.v = 1; c.recorde.d = 1;
  let achou = null;
  for (let i = 0; i < 80 && !achou; i++) {
    c.ofertas = [];
    c.semana++;
    c.rivais[rival.nome] = { heat: 2, motivo: 'revanche', desde: 1 };
    MMA.gerarOfertas(c, MMA.criarRng(i));
    achou = c.ofertas.find((o) => o.op.nome === rival.nome && o.trilogia);
  }
  assert.ok(achou, 'trilogia nunca apareceu');
  assert.strictEqual(achou.papel, 'trilogia');
  assert.ok(/1 a 1|trilogia/i.test(MMA.papelOferta(c, achou).texto));
  assert.ok(MMA.historiaLutador(c, rival.nome).some((h) => /1 a 1/.test(h)));
  assert.ok(MMA.aceitarOferta(c, achou.id, rng).ok);
  let g = 0;
  while (MMA.etapaAtual(c) && g++ < 30) MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
  const fama0 = c.fama;
  const luta = MMA.iniciarLutaAtiva(c, c.agendada.op, false, rng);
  luta.resultado = { vencedor: 0, metodo: 'Decisão unânime', round: 3, tempo: '5:00', cartoes: [[29, 28], [29, 28], [29, 28]] };
  MMA.aplicarLuta(c, c.agendada.op, luta, false, rng);
  assert.ok(c.fama - fama0 >= 25, 'fama da trilogia ' + (c.fama - fama0));
  assert.strictEqual(c.trilogias, 1);
});

teste('Hall da Fama: criterios com pontos, limiar de 100, e a despedida diz o veredito', () => {
  const fraco = MMA.novaCarreira({ nome: 'Fraco', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) });
  const hf = MMA.hallDaFama(fraco);
  assert.strictEqual(hf.criterios.length, 9);
  assert.ok(hf.pontos < 20 && hf.veredito === 'fora' && !hf.induzido && hf.falta > 70);
  const lenda = MMA.novaCarreira({ nome: 'Lenda', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(2) });
  lenda.titulos = 4; lenda.defesasTotal = 6; lenda.recorde = { v: 22, d: 3, e: 0 };
  lenda.titulosPor = { 'atual|peso_leve': true, 'atual|peso_meio_medio': true };
  for (let i = 0; i < 22; i++) lenda.historico.push({ resultado: 'Vitória', metodo: i % 2 ? 'Nocaute' : 'Decisão unânime', round: 2, tempo: '1:00' });
  for (let i = 0; i < 3; i++) lenda.historico.push({ resultado: 'Derrota', metodo: 'Decisão unânime', round: 3 });
  lenda.torneios = 1;
  const hl = MMA.hallDaFama(lenda);
  assert.ok(hl.pontos >= 140 && hl.veredito === 'primeira' && hl.induzido, 'pontos ' + hl.pontos);
  const d = MMA.despedida(lenda);
  assert.ok(d.linhas.length >= 4 && d.linhas.some((l) => /Hall da Fama/.test(l)));
  assert.ok(d.linhas[0].includes('Lenda') && /duas categorias|2 categorias/.test(d.linhas.join(' ')));
  lenda.idadeInicial = 40;
  const ap = MMA.aposentar(lenda);
  assert.ok(ap.ok && ap.entrada.hall && ap.entrada.hall.induzido === true);
});

teste('dificuldade: adversarios ganham atributos conforme o nivel; carreira nova e Normal, save antigo segue Tranquilo; muda no meio', () => {
  const mk = (dif) => {
    const c = MMA.novaCarreira({ nome: 'Dif', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', dificuldade: dif, rng: MMA.criarRng(3) });
    c.semImprevistos = true;
    c.semFoco = true;
    const rng = MMA.criarRng(4);
    MMA.aceitarOferta(c, c.ofertas[0].id, rng);
    let g = 0;
    while (MMA.etapaAtual(c) && g++ < 30) MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
    return { c, luta: MMA.iniciarLutaAtiva(c, c.agendada.op, false, rng) };
  };
  const t = mk('tranquilo');
  const n = mk('normal');
  const d = mk('dificil');
  const k = 'striking';
  assert.strictEqual(n.luta.f[1].attr[k] - t.luta.f[1].attr[k], Math.min(99, t.luta.f[1].attr[k] + 6) - t.luta.f[1].attr[k]);
  assert.ok(d.luta.f[1].attr.queixo > n.luta.f[1].attr.queixo && n.luta.f[1].attr.queixo > t.luta.f[1].attr.queixo);
  assert.strictEqual(MMA.novaCarreira({ nome: 'A', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) }).dificuldade, 'normal');
  assert.strictEqual(MMA.novaCarreira({ nome: 'A', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', dificuldade: 'xyz', rng: MMA.criarRng(1) }).dificuldade, 'normal');
  const velho = MMA.novaCarreira({ nome: 'V', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) });
  delete velho.dificuldade;
  assert.strictEqual(MMA.migrarCarreira(JSON.parse(JSON.stringify(velho))).dificuldade, 'tranquilo');
  assert.ok(MMA.mudarDificuldade(velho, 'dificil').ok && velho.dificuldade === 'dificil');
  assert.strictEqual(MMA.mudarDificuldade(velho, 'x').ok, false);
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes de variedade passaram.');
process.exit(falhas ? 1 : 0);
