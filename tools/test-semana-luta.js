// Semana da luta: etapa de pesagem, resultado da balanca, encarada e os imprevistos (troca de adversario,
// luta cancelada, lesao de ultima hora).
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

function comLuta(seed, extra) {
  const c = MMA.novaCarreira(Object.assign({ nome: 'Semana Luta', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(seed) }, extra || {}));
  c.semDrop = -100;
  const rng = MMA.criarRng(seed + 1000);
  assert.ok(MMA.aceitarOferta(c, c.ofertas[0].id, rng).ok);
  return { c, rng };
}

// Faz o camp ate a etapa pedida (sem executa-la). Devolve false se o camp acabou antes.
function ate(c, rng, tipo) {
  let g = 0;
  while (MMA.etapaAtual(c) && MMA.etapaAtual(c).tipo !== tipo && g++ < 30) {
    const et = MMA.etapaAtual(c);
    if (et.tipo === 'evento') MMA.resolverEvento(c, 0, rng);
    else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
  }
  return !!MMA.etapaAtual(c);
}

teste('o camp tem a etapa de pesagem entre o corte e a coletiva, com 3 jeitos de encarar o rival', () => {
  const { c } = comLuta(1);
  const tipos = c.camp.etapas.map((e) => e.tipo);
  assert.ok(tipos.indexOf('corte') >= 0 && tipos.indexOf('pesagem') === tipos.indexOf('corte') + 1, tipos.join());
  assert.strictEqual(tipos[tipos.length - 1], 'coletiva');
  assert.strictEqual(c.camp.etapas.reduce((s, e) => s + e.semanas, 0), c.camp.total);
  const ok = ate(c, MMA.criarRng(3), 'pesagem');
  if (ok) assert.strictEqual(MMA.opcoesEtapa(c).length, 3);
  assert.deepStrictEqual(MMA.gerarEtapas(3).map((e) => e.tipo), ['plano', 'scouting', 'corte', 'pesagem', 'coletiva']);
  assert.deepStrictEqual(MMA.gerarEtapas(2).map((e) => e.tipo), ['plano', 'scouting', 'coletiva']);
});

teste('pesagem: o corte seguro quase sempre bate o peso; o agressivo arrisca estourar, com multa e fama', () => {
  let seguroFalha = 0;
  let agressivoFalha = 0;
  const N = 300;
  for (let k = 0; k < N; k++) {
    ['seguro', 'agressivo'].forEach((modo) => {
      const { c, rng } = comLuta(100 + k);
      if (!ate(c, rng, 'corte')) return;
      const bolsa0 = c.agendada.bolsa;
      const fama0 = c.fama;
      const r = MMA.decidirCamp(c, modo, rng);
      assert.ok(r.ok);
      const p = c.camp.efeitos.pesagem;
      assert.ok(p && ['no_limite', 'folga', 'estourou'].includes(p.resultado), 'sem resultado da pesagem');
      assert.ok(p.limite > 50 && p.kg > 50);
      if (p.resultado === 'estourou') {
        assert.ok(p.kg > p.limite, 'estourou mas esta abaixo do limite');
        assert.ok(c.agendada.bolsa < bolsa0 && p.multa > 0, 'estourou sem multa');
        assert.ok(c.fama <= fama0, 'estourar o peso nao pode dar fama');
        if (modo === 'seguro') seguroFalha++; else agressivoFalha++;
      } else {
        assert.ok(p.kg <= p.limite, 'bateu mas passou do limite');
        assert.strictEqual(p.multa, 0);
      }
    });
  }
  assert.ok(seguroFalha / N < 0.08, 'corte seguro falha demais: ' + seguroFalha);
  assert.ok(agressivoFalha / N > 0.08 && agressivoFalha / N < 0.35, 'corte agressivo: ' + agressivoFalha);
  assert.ok(agressivoFalha > seguroFalha);
});

teste('na Era das Lendas nao ha pesagem (peso aberto)', () => {
  const { c, rng } = comLuta(7, { periodo: 'eras', divisaoId: 'peso_aberto' });
  if (ate(c, rng, 'corte')) {
    MMA.decidirCamp(c, 'seguro', rng);
    assert.strictEqual(c.camp.efeitos.pesagem.resultado, 'sem');
  }
});

teste('encarada: cada escolha tem efeito proprio e nenhuma quebra o camp', () => {
  ['encarar', 'cumprimentar', 'ignorar'].forEach((id, i) => {
    const { c, rng } = comLuta(300 + i);
    if (!ate(c, rng, 'pesagem')) return;
    const fama0 = c.fama;
    const r = MMA.decidirCamp(c, id, rng);
    assert.ok(r.ok && r.linhas.length > 0);
    if (id !== 'ignorar') assert.ok(c.fama >= fama0);
    if (id === 'ignorar') assert.ok(c.camp.efeitos.attr.defesa >= 2);
    assert.strictEqual(MMA.etapaAtual(c).tipo, 'coletiva');
  });
});

// Sorteia varios camps ate ver cada imprevisto.
function colecionar() {
  const vistos = { substituicao: null, cancelamento: null, lesao: null };
  let camps = 0;
  let comImprevisto = 0;
  for (let k = 0; k < 900; k++) {
    const { c, rng } = comLuta(5000 + k);
    const op0 = c.agendada.op.nome;
    const plano0 = JSON.stringify(c.agendada.plano);
    let g = 0;
    while (MMA.etapaAtual(c) && g++ < 30) {
      const et = MMA.etapaAtual(c);
      if (et.tipo === 'evento') MMA.resolverEvento(c, 0, rng);
      else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
    }
    camps++;
    if (c.imprevisto) { comImprevisto++; if (!vistos.lesao) vistos.lesao = { c, rng, op0, json: JSON.stringify(c) }; }
    else if (c.ultimoImprevisto && c.ultimoImprevisto.tipo === 'substituicao') { comImprevisto++; if (!vistos.substituicao) vistos.substituicao = { c, rng, op0, plano0 }; }
    else if (!c.agendada) { comImprevisto++; if (!vistos.cancelamento) vistos.cancelamento = { c, rng, op0 }; }
  }
  return { vistos, camps, comImprevisto };
}

const col = colecionar();

teste('imprevistos acontecem em cerca de 11% dos camps e aparecem os tres tipos', () => {
  const p = col.comImprevisto / col.camps;
  assert.ok(p > 0.06 && p < 0.17, 'frequencia de imprevistos ' + (100 * p).toFixed(1) + '%');
  assert.ok(col.vistos.substituicao && col.vistos.cancelamento && col.vistos.lesao, 'faltou algum tipo');
});

teste('troca de adversario: o rival muda, o estudo se perde e o card acompanha', () => {
  const { c, op0, plano0 } = col.vistos.substituicao;
  assert.ok(c.agendada && c.agendada.op.nome !== op0, 'adversario nao mudou');
  assert.strictEqual(c.camp.efeitos.scout, false);
  const meu = c.agendada.evento.card.find((l) => l.jogador);
  assert.strictEqual(meu.b.nome, c.agendada.op.nome, 'card nao foi atualizado');
  const nomes = [];
  c.agendada.evento.card.forEach((l) => nomes.push(l.a.nome, l.b.nome));
  assert.strictEqual(new Set(nomes).size, nomes.length, 'lutador repetido no card');
  assert.ok(MMA.diaDeLuta(c));
  assert.ok(c.ultimoImprevisto.texto.includes(op0));
});

teste('luta cancelada: sem luta marcada, compensacao paga e novas ofertas na mesa', () => {
  const { c } = col.vistos.cancelamento;
  assert.strictEqual(c.agendada, null);
  assert.strictEqual(c.camp, null);
  assert.ok(c.ofertas.length > 0 || c.lesao, 'sem ofertas depois do cancelamento (e sem lesao)');
  assert.ok(c.ultimoImprevisto && /cancelad|caiu/i.test(c.ultimoImprevisto.titulo + c.ultimoImprevisto.texto));
  assert.strictEqual(MMA.diaDeLuta(c), false);
});

teste('lesao de ultima hora: o dia da luta fica travado ate decidir; lutar machucado ou adiar', () => {
  const { rng, json } = col.vistos.lesao;
  const c = MMA.migrarCarreira(JSON.parse(json));
  assert.ok(c.imprevisto && c.imprevisto.opcoes.length === 2);
  assert.strictEqual(MMA.diaDeLuta(c), false, 'nao pode lutar antes de decidir');
  assert.strictEqual(MMA.resolverImprevisto(c, 'x', rng).ok, false);
  // caminho 1: lutar machucado
  const copia = JSON.parse(JSON.stringify(c));
  const a = MMA.resolverImprevisto(c, 'lutar', rng);
  assert.ok(a.ok && c.imprevisto === null && MMA.diaDeLuta(c));
  assert.strictEqual(c.camp.efeitos.lesionado, true);
  // caminho 2: adiar (varias sementes: 80% adia, 20% a luta cai)
  let adiadas = 0;
  let caiu = 0;
  for (let k = 0; k < 120; k++) {
    const d = MMA.migrarCarreira(JSON.parse(JSON.stringify(copia)));
    const semana0 = d.semana;
    const r = MMA.resolverImprevisto(d, 'adiar', MMA.criarRng(k + 1));
    assert.ok(r.ok);
    if (r.resultado === 'adiada') {
      adiadas++;
      assert.strictEqual(d.agendada.semanaLuta, semana0 + 4);
      assert.ok(d.camp && !MMA.campConcluido(d) && d.camp.total === 4);
      assert.ok(d.agendada.evento.semana === semana0 + 4);
    } else {
      caiu++;
      assert.strictEqual(d.agendada, null);
      assert.ok(d.lesao);
    }
  }
  assert.ok(adiadas > 70 && caiu > 5 && caiu < 45, 'adiou ' + adiadas + ' caiu ' + caiu);
});

teste('imprevisto pendente sobrevive ao salvar e carregar (migracao nao apaga)', () => {
  const { json } = col.vistos.lesao;
  const volta = MMA.migrarCarreira(JSON.parse(json));
  assert.ok(volta.imprevisto && volta.imprevisto.opcoes.length === 2);
  assert.strictEqual(MMA.diaDeLuta(volta), false);
});

teste('jogo todo: carreira que atravessa imprevistos continua jogavel e coerente', () => {
  for (let k = 0; k < 30; k++) {
    const c = MMA.novaCarreira({ nome: 'Bot', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(k + 1) });
    const rng = MMA.criarRng(k + 77);
    let lutas = 0;
    for (let g = 0; g < 400 && lutas < 6; g++) {
      if (c.imprevisto) { MMA.resolverImprevisto(c, rng() < 0.5 ? 'lutar' : 'adiar', rng); continue; }
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
      MMA.aceitarOferta(c, c.ofertas[0].id, rng);
    }
    assert.strictEqual(c.recorde.v + c.recorde.d + c.recorde.e, c.historico.length);
    assert.ok(lutas >= 1, 'carreira travou');
  }
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes da semana da luta passaram.');
process.exit(falhas ? 1 : 0);
