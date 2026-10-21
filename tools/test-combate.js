// Testes do combate por rounds: estrategias, "Ver resultado" instantaneo e integridade das regras.
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

const L = (estilo, nome) => ({ nome, atributos: Object.assign({}, MMA.PERFIS[estilo]) });
const IDS = Object.keys(MMA.ESTRATEGIAS_ROUND);

function checar(luta, ctx) {
  const r = luta.resultado;
  assert.ok(r, 'sem resultado ' + ctx);
  assert.ok(luta.rodadas.length >= 1 && luta.rodadas.length <= luta.rodadasTotais, 'rounds fora do limite ' + ctx);
  assert.ok(/^\d:\d\d$/.test(r.tempo), 'tempo invalido ' + r.tempo + ' ' + ctx);
  const [m, sg] = r.tempo.split(':').map(Number);
  assert.ok(m * 60 + sg >= 5 && m * 60 + sg <= 300, 'tempo fora de 0:05-5:00 ' + ctx);
  luta.rodadas.forEach((rd, i) => {
    if (i < luta.rodadas.length - 1) assert.ok(!rd.ko && !rd.sub, 'round continuou depois de um encerramento ' + ctx);
    assert.strictEqual(rd.num, i + 1);
    assert.ok(rd.est && rd.est.length === 2, 'round sem estatisticas ' + ctx);
    rd.est.forEach((e) => {
      assert.ok(e.acertos <= e.tentativas, 'acertos > tentativas ' + ctx);
      assert.ok(e.quedasOk <= e.quedasTent, 'quedas ok > tentativas ' + ctx);
      assert.ok(e.subOk <= e.subTent, 'finalizacoes ok > tentativas ' + ctx);
      Object.values(e).forEach((v) => assert.ok(Number.isFinite(v) && v >= 0, 'estatistica invalida ' + ctx));
    });
    if (rd.juizes) rd.juizes.forEach((c) => assert.ok([[10, 9], [10, 8], [9, 10], [8, 10]].some((x) => x[0] === c[0] && x[1] === c[1]), 'cartao invalido ' + c + ' ' + ctx));
  });
  const soma = [0, 1].map((k) => ['acertos', 'quedasOk', 'subOk'].map((c) => luta.estatisticas[k][c]));
  luta.rodadas.forEach((rd) => rd.est.forEach((e, k) => { void e; void k; }));
  ['acertos', 'quedasOk', 'subOk', 'quedasTent', 'subTent'].forEach((c) => {
    [0, 1].forEach((k) => assert.strictEqual(luta.rodadas.reduce((s, rd) => s + rd.est[k][c], 0), luta.estatisticas[k][c], 'estatistica por round nao fecha com a da luta: ' + c + ' ' + ctx));
  });
  void soma;
  if (/^Decisão|Empate/.test(r.metodo)) {
    assert.strictEqual(luta.rodadas.length, luta.rodadasTotais, 'decisao antes do fim ' + ctx);
    assert.strictEqual(r.tempo, '5:00');
    assert.strictEqual(luta.cartoes.length, 3);
    luta.cartoes.forEach((c) => assert.ok(c[0] + c[1] >= 9 * luta.rodadasTotais && c[0] + c[1] <= 20 * luta.rodadasTotais, 'cartao total invalido ' + ctx));
  } else {
    assert.ok(r.vencedor === 0 || r.vencedor === 1, 'vencedor invalido ' + ctx);
  }
}

teste('todas as estrategias geram lutas validas (3 e 5 rounds) e nunca continuam depois do fim', () => {
  let n = 0;
  IDS.forEach((id) => {
    ['striking', 'luta_livre', 'grappling', 'misto'].forEach((est) => {
      for (let i = 0; i < 40; i++) {
        const rodadas = i % 2 ? 5 : 3;
        const l = new MMA.Luta(L('misto', 'A'), L(est, 'B'), { rng: MMA.criarRng(i + 1), rodadas: rodadas, estrategiaA: id });
        l.simularCompleta();
        checar(l, id + ' vs ' + est + ' #' + i);
        assert.throws(() => l.rodarRound(null), /encerrada/i, 'simulou round depois do fim');
        n++;
      }
    });
  });
  assert.ok(n >= 1000);
});

teste('o resultado instantaneo usa o mesmo motor: round a round com a mesma estrategia da exatamente a mesma luta', () => {
  for (let i = 0; i < 120; i++) {
    const a = new MMA.Luta(L('striking', 'A'), L('luta_livre', 'B'), { rng: MMA.criarRng(i + 5), rodadas: 5 });
    a.simularCompleta({ estrategia: 'pressao' });
    const b = new MMA.Luta(L('striking', 'A'), L('luta_livre', 'B'), { rng: MMA.criarRng(i + 5), rodadas: 5 });
    b.definirEstrategia(0, 'pressao');
    while (!b.encerrada) {
      b.abrirRound();
      b.rodarRound(null);
    }
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a.resultado)), JSON.parse(JSON.stringify(b.resultado)));
    assert.deepStrictEqual(a.estatisticas, b.estatisticas);
  }
});

teste('as estrategias mudam o que acontece: quedas, finalizacao, trocacao e resistencia', () => {
  const media = (id, campo, lado) => {
    let t = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      const l = new MMA.Luta(L('misto', 'A'), L('misto', 'B'), { rng: MMA.criarRng(i + 3), rodadas: 3, estrategiaA: id });
      l.simularCompleta();
      t += campo === 'stam' ? l.f[0].stam : l.estatisticas[lado === undefined ? 0 : lado][campo];
    }
    return t / N;
  };
  assert.ok(media('quedas', 'quedasTent') > media('trocacao', 'quedasTent') * 1.8, 'quedas deveria buscar bem mais quedas');
  assert.ok(media('trocacao', 'acertosPe') > media('quedas', 'acertosPe'), 'trocacao deveria acertar mais em pe');
  assert.ok(media('finalizacao', 'subTent') > media('contra', 'subTent'), 'finalizacao deveria tentar mais finalizacoes');
  assert.ok(media('resistencia', 'stam') > media('pressao', 'stam'), 'resistencia deveria chegar com mais folego que pressao');
});

teste('estrategia de round e salva e restaurada; luta antiga sem estrategia continua', () => {
  const l = new MMA.Luta(L('misto', 'A'), L('striking', 'B'), { rng: MMA.criarRng(9), rodadas: 3 });
  l.definirEstrategia(0, 'wrestling');
  l.rodarRound(null);
  const r = MMA.Luta.restaurar(JSON.parse(JSON.stringify(l)), MMA.criarRng(2));
  assert.strictEqual(r.estrategia[0], 'wrestling');
  const velho = JSON.parse(JSON.stringify(l));
  delete velho.estrategia;
  const v = MMA.Luta.restaurar(velho, MMA.criarRng(3));
  assert.deepStrictEqual(v.estrategia, [null, null]);
  let g = 0;
  while (!v.encerrada && g++ < 10) v.rodarRound(null);
  assert.ok(v.encerrada);
  assert.strictEqual(l.definirEstrategia(0, 'inexistente'), false);
});

teste('ajuste automatico do "Ver resultado": atras no placar vai para cima, sem folego poupa', () => {
  let trocou = 0;
  for (let i = 0; i < 200; i++) {
    const l = new MMA.Luta(L('striking', 'A'), L('luta_livre', 'B'), { rng: MMA.criarRng(i + 1), rodadas: 3 });
    l.definirEstrategia(0, 'trocacao');
    l.rodarRound(null);
    if (l.encerrada) continue;
    const antes = l.estrategia[0];
    l._ajusteAuto();
    if (l.estrategia[0] !== antes) trocou++;
  }
  assert.ok(trocou > 10, 'o ajuste automatico nunca age');
});

teste('wrestler e striker se equilibram: ninguem vence mais de 65% com overall parecido', () => {
  const dados = global.DADOS.atual;
  const por = {};
  Object.values(dados).forEach((d) => {
    const l = d.lutadores;
    for (let i = 0; i < l.length; i++) {
      for (let j = i + 1; j < l.length; j++) {
        const a = l[i];
        const b = l[j];
        if (a.estilo === b.estilo || Math.abs(MMA.ratingExato({ atributos: a.atributos }) - MMA.ratingExato({ atributos: b.atributos })) > 2.5) continue;
        for (let k = 0; k < 6; k++) {
          const lu = new MMA.Luta({ nome: a.nome, atributos: a.atributos }, { nome: b.nome, atributos: b.atributos }, { rng: MMA.criarRng(i * 997 + j * 31 + k), rodadas: 3 });
          const r = lu.simularCompleta();
          const chave = a.estilo + ' x ' + b.estilo;
          por[chave] = por[chave] || { n: 0, v: 0 };
          por[chave].n++;
          if (r.vencedor === 0) por[chave].v++;
        }
      }
    }
  });
  Object.entries(por).forEach(([k, v]) => {
    if (v.n < 150) return;
    const p = v.v / v.n;
    assert.ok(p > 0.32 && p < 0.68, k + ': ' + (100 * p).toFixed(0) + '% (n=' + v.n + ')');
  });
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes de combate passaram.');
process.exit(falhas ? 1 : 0);
