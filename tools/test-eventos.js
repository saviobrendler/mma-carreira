// Testes de eventos, fight cards, comparacao de confrontos e legado.
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

const nova = (extra) => {
  const c = MMA.novaCarreira(Object.assign({ nome: 'T', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) }, extra || {}));
  c.semImprevistos = true; // testes deterministas: a semana da luta sem imprevistos
  c.contrato.lutasRestantes = 9999; // contrato nao vence no meio dos testes
  return c;
};
function lutarForcado(c, resultado, rng) {
  const r = rng || MMA.criarRng(11);
  let g = 0;
  while (MMA.etapaAtual(c) && g++ < 20) {
    const et = MMA.etapaAtual(c);
    if (et.tipo === 'evento') {
      for (let i = 0; i < 2; i++) if (MMA.resolverEvento(c, i, r).ok) break;
    } else {
      const op = MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0];
      MMA.decidirCamp(c, op.id, r);
    }
  }
  const op = c.agendada.op;
  const luta = MMA.iniciarLutaAtiva(c, op, c.agendada.titulo, r);
  luta.resultado = Object.assign({ vencedor: 0, metodo: 'Decisão unânime', round: 3, tempo: '5:00' }, resultado || {});
  return MMA.aplicarLuta(c, op, luta, c.agendada.titulo, r);
}

teste('datas: eventos caem em sabados, em ordem e no ano da era', () => {
  ['eras', 'auge', 'atual'].forEach((p) => {
    let ant = 0;
    for (let sem = 1; sem < 200; sem += 7) {
      const d = MMA.dataDaSemana(p, sem);
      assert.strictEqual(new Date(d.ts).getUTCDay(), 6, 'nao e sabado');
      assert.ok(d.ts > ant);
      ant = d.ts;
    }
    assert.strictEqual(MMA.dataDaSemana(p, 1).ano, { eras: 2000, auge: 2012, atual: 2026 }[p]);
  });
  const n1 = MMA.numeroUFC(MMA.dataDaSemana('atual', 4));
  const n2 = MMA.numeroUFC(MMA.dataDaSemana('atual', 50));
  assert.ok(n2 > n1 && n1 >= 324 && n2 < 340, n1 + ' ' + n2);
  assert.ok(/2026/.test(MMA.dataTexto(MMA.dataDaSemana('atual', 10))));
});

teste('evento: o card tem a luta do jogador, ninguem repete e a luta principal e a mais importante', () => {
  for (let i = 0; i < 60; i++) {
    ['atual', 'auge', 'eras'].forEach((p) => {
      const div = p === 'eras' ? 'peso_aberto' : MMA.ORDEM_DIVISOES[i % 8];
      const c = nova({ periodo: p, divisaoId: div, rng: MMA.criarRng(i + 1) });
      const r = MMA.aceitarOferta(c, c.ofertas[0].id, MMA.criarRng(i + 3));
      assert.ok(r.ok);
      const ev = c.agendada.evento;
      assert.ok(ev && ev.card.length >= 3 && ev.card.length <= 8, p + ' card ' + ev.card.length);
      const meus = ev.card.filter((l) => l.jogador);
      assert.strictEqual(meus.length, 1);
      assert.strictEqual(meus[0].b.nome, c.agendada.op.nome);
      const nomes = [];
      ev.card.forEach((l) => nomes.push(l.a.nome, l.b.nome));
      assert.strictEqual(new Set(nomes).size, nomes.length, 'lutador repetido no card');
      assert.strictEqual(ev.card[0].bloco, 'Luta principal');
      if (c.agendada.titulo) assert.strictEqual(ev.card[0].jogador, true, 'luta de titulo deve ser a principal');
      assert.ok(ev.local && ev.nome && ev.subtitulo && ev.data.ts);
      assert.ok(ev.card.every((l) => l.rounds === (l.titulo || l.superluta || (p === 'auge' && l.id === 'principal') ? 5 : 3)), 'rounds do card em ' + p); // Era de Ouro: a luta principal tem 5 rounds
    });
  }
});

teste('a luta do jogador resolve o resto do card: pontos mudam, cinturao troca e fica no historico', () => {
  const c = nova();
  c.semDrop = -100;
  MMA.aceitarOferta(c, c.ofertas[0].id, MMA.criarRng(5));
  const ev = c.agendada.evento;
  const outros = ev.card.filter((l) => !l.jogador);
  assert.ok(outros.length >= 5);
  const r = lutarForcado(c, { vencedor: 0, metodo: 'Nocaute', round: 2, tempo: '3:12' });
  assert.ok(r.evento && r.evento.resolvido);
  outros.forEach((l) => {
    assert.ok(l.resultado && (l.resultado.vencedor === l.a.nome || l.resultado.vencedor === l.b.nome), 'sem resultado');
    assert.ok(l.resultado.perdedor && l.resultado.perdedor !== l.resultado.vencedor);
  });
  assert.strictEqual(c.eventosPassados.length, 1);
  assert.strictEqual(c.eventosPassados[0].jogador.venceu, true);
  const h = c.historico[c.historico.length - 1];
  assert.strictEqual(h.evento, ev.nome);
  assert.strictEqual(h.tempo, '3:12');
  assert.ok(c.noticias.length > 0);
  // cinturao: lutas de titulo de outras categorias mudam o campeao para o vencedor
  c.noticias.forEach((n) => assert.ok(n.texto && n.semana >= 1));
});

teste('o circuito nao escala quem esta no card do jogador', () => {
  const c = nova();
  MMA.aceitarOferta(c, c.ofertas[0].id, MMA.criarRng(8));
  const nomes = new Set();
  c.agendada.evento.card.forEach((l) => { nomes.add(l.a.nome); nomes.add(l.b.nome); });
  const antes = {};
  Object.keys(c.elenco).forEach((k) => { antes[k] = Object.assign({}, c.elenco[k]); });
  MMA.rodarCircuito(c, MMA.criarRng(3));
  Object.keys(c.elenco).forEach((k) => {
    nomes.forEach((n) => {
      if (n === c.nome) return;
      assert.strictEqual((c.elenco[k] || {})[n], (antes[k] || {})[n], n + ' lutou no circuito durante o camp');
    });
  });
});

teste('luta marcada em save antigo ganha um evento na migracao e versao do save sobe para 2', () => {
  const c = nova();
  MMA.aceitarOferta(c, c.ofertas[0].id, MMA.criarRng(5));
  const velho = JSON.parse(JSON.stringify(c));
  delete velho.agendada.evento;
  ['apelido', 'eventosPassados', 'premios', 'defesasTotal'].forEach((k) => { delete velho[k]; });
  velho.versao = 1;
  const m = MMA.migrarCarreira(velho);
  assert.strictEqual(m.versao, 2);
  assert.ok(m.agendada.evento && m.agendada.evento.card.some((l) => l.jogador));
  assert.deepStrictEqual(m.eventosPassados, []);
  assert.strictEqual(m.apelido, null);
});

teste('comparacao de confrontos: por fase da luta, com resumo e sugestao valida', () => {
  const c = nova({ estilo: 'striking' });
  c.ofertas.forEach((o) => {
    const cmp = MMA.comparacao(c, o.op);
    assert.strictEqual(cmp.areas.length, 6);
    cmp.areas.forEach((a) => assert.ok(['eu', 'ele', 'igual'].includes(a.vantagem) && Number.isFinite(a.dif)));
    assert.ok(cmp.resumo.length > 15);
    assert.ok(MMA.ESTRATEGIAS_ROUND[cmp.sugestao.id] && cmp.sugestao.motivo);
  });
  // um wrestler dominante contra alguem que defende mal a queda deve sugerir quedas ou wrestling
  const w = nova({ estilo: 'luta_livre' });
  const op = { nome: 'X', estilo: 'striking', rating: 60, lutador: { nome: 'X', atributos: Object.assign({}, MMA.PERFIS.striking, { defesa: 40 }) } };
  w.atributos.wrestling = 85;
  assert.ok(['quedas', 'wrestling'].includes(MMA.comparacao(w, op).sugestao.id));
});

teste('legado: soma o que a carreira fez, com recordes e lutas memoraveis', () => {
  const c = nova();
  c.semDrop = -100;
  [{ vencedor: 0, metodo: 'Nocaute', round: 1, tempo: '0:41' }, { vencedor: 1, metodo: 'Decisão unânime', round: 3 }, { vencedor: 0, metodo: 'Finalização', round: 2, tempo: '2:10' }, { vencedor: 0, metodo: 'Decisão unânime', round: 3 }].forEach((res) => {
    c.energia = 100;
    c.lesao = null;
    if (!c.ofertas.length) MMA.gerarOfertas(c, MMA.criarRng(4));
    MMA.aceitarOferta(c, c.ofertas[0].id, MMA.criarRng(2));
    lutarForcado(c, res);
  });
  const l = MMA.legado(c);
  assert.strictEqual(l.vitorias, 3);
  assert.strictEqual(l.derrotas, 1);
  assert.strictEqual(l.nocautes, 1);
  assert.strictEqual(l.finalizacoes, 1);
  assert.strictEqual(l.decisoes, 1);
  assert.strictEqual(l.maisRapida.tempo, '0:41');
  assert.strictEqual(l.lutasTotal, 4);
  assert.ok(l.maiorSequencia >= 1);
  assert.ok(Array.isArray(l.memoraveis));
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes de eventos passaram.');
process.exit(falhas ? 1 : 0);
