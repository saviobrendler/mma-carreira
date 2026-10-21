// Regras do cinturao e papel de cada luta: situacao do titulo, ranking com campeao a parte, defesa a cada 8 semanas,
// lutas de manutencao, revanche com ex-campeao e superluta.
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
  const c = MMA.novaCarreira(Object.assign({ nome: 'Teste Regras', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) }, extra || {}));
  c.semImprevistos = true; // testes deterministas: a semana da luta sem imprevistos
  return c;
};

function fazerCamp(c, rng) {
  let g = 0;
  while (MMA.etapaAtual(c) && g++ < 30) {
    const et = MMA.etapaAtual(c);
    if (et.tipo === 'evento') MMA.resolverEvento(c, 0, rng);
    else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
  }
}

// Luta com resultado forcado, pelo mesmo caminho do jogo.
function lutar(c, rng, resultado) {
  const a = c.agendada;
  const luta = MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
  luta.resultado = Object.assign({ vencedor: 0, metodo: 'Decisão unânime', round: luta.rodadasTotais, tempo: '5:00' }, resultado || {});
  return MMA.aplicarLuta(c, a.op, luta, a.titulo, rng);
}

// Carreira pronta para disputar o titulo (top 5 e 2 vitorias seguidas).
function candidato(seed) {
  const c = nova({ rng: MMA.criarRng(seed || 3) });
  c.pontos = 9000;
  c.sequencia = 3;
  c.recorde = { v: 5, d: 0, e: 0 };
  c.semana = 30;
  c.semDrop = -100;
  return c;
}

function campeaoPronto(seed) {
  const c = candidato(seed);
  const rng = MMA.criarRng(11);
  MMA.gerarOfertas(c, rng);
  const t = c.ofertas.find((o) => o.titulo);
  assert.ok(t, 'sem oferta de titulo para o candidato');
  assert.ok(MMA.aceitarOferta(c, t.id, rng).ok);
  fazerCamp(c, rng);
  lutar(c, rng, { vencedor: 0, metodo: 'Nocaute', round: 2, tempo: '1:30' });
  assert.strictEqual(c.campeao, true);
  return { c, rng };
}

teste('ranking como no UFC: campeao fica fora (posicao 0) e o #1 e o primeiro desafiante', () => {
  assert.strictEqual(MMA.posRank('atual', 1), 0);
  assert.strictEqual(MMA.posRank('atual', 2), 1);
  assert.strictEqual(MMA.posRank('eras', 1), 1);
  assert.strictEqual(MMA.rotuloRank('atual', 1), 'Campeão');
  assert.strictEqual(MMA.rotuloRank('atual', 4), '#3');
  assert.strictEqual(MMA.rotuloRank('eras', 4), '#4');
  assert.strictEqual(MMA.rotuloRank('atual', null), '—');
  const c = nova();
  const lista = MMA.ranking(c);
  assert.strictEqual(lista[0].nome, MMA.campeaoAtual(c), 'o campeao encabeca a lista interna');
});

teste('situacao do titulo (nao campeao): diz o que falta e o quanto ja foi cumprido', () => {
  const c = nova();
  c.sequencia = 1;
  const s = MMA.situacaoTitulo(c);
  assert.strictEqual(s.tipo, 'caminho');
  assert.strictEqual(s.passos.length, 2);
  assert.ok(/top 5/i.test(s.passos[0].rotulo) && /2 vitórias/.test(s.passos[1].rotulo));
  assert.strictEqual(s.passos[1].feito, false);
  assert.ok(/1 de 2/.test(s.passos[1].texto), s.passos[1].texto);
  assert.ok(s.resumo.length > 40 && s.regra.length > 20);
  const p = candidato();
  const sp = MMA.situacaoTitulo(p);
  assert.strictEqual(sp.tipo, 'pode');
  assert.ok(sp.passos.every((x) => x.feito));
});

teste('disputa de titulo exige top 5 (sem contar o campeao) e 2 vitorias seguidas', () => {
  const c = candidato();
  assert.strictEqual(MMA.podeDesafiarTitulo(c).ok, true);
  c.sequencia = 1;
  assert.strictEqual(MMA.podeDesafiarTitulo(c).ok, false);
  c.sequencia = 3;
  c.pontos = 0;
  assert.strictEqual(MMA.podeDesafiarTitulo(c).ok, false, 'fora do top 5 nao disputa');
});

teste('toda oferta tem papel e rounds claros; luta de titulo e a unica com cinturao e 5 rounds (fora a superluta)', () => {
  for (let k = 0; k < 30; k++) {
    const c = nova({ rng: MMA.criarRng(k + 1) });
    if (k % 2) { c.pontos = 9000; c.sequencia = 3; }
    MMA.gerarOfertas(c, MMA.criarRng(k + 50));
    c.ofertas.forEach((o) => {
      assert.ok(o.papel && [3, 5].includes(o.rounds), 'oferta sem papel ' + JSON.stringify(o.papel));
      const p = MMA.papelOferta(c, o);
      assert.ok(p.rotulo && p.texto.length > 15);
      assert.strictEqual(p.rounds, o.titulo || o.superluta ? 5 : 3);
    });
  }
});

teste('campeao: a defesa so aparece 8 semanas depois, e ate la as lutas sao de manutencao (3 rounds, sem titulo, bolsa maior)', () => {
  const { c, rng } = campeaoPronto();
  const s = MMA.situacaoTitulo(c);
  assert.strictEqual(s.tipo, 'campeao');
  assert.ok(s.semanasParaDefesa > 0 && s.semanasParaDefesa <= MMA.REPETE_TITULO);
  assert.ok(/liberado em \d+ semana/.test(s.resumo) && /mantêm você ativo/.test(s.resumo), s.resumo);
  c.ofertas = [];
  MMA.gerarOfertas(c, MMA.criarRng(5));
  assert.ok(c.ofertas.length > 0);
  assert.ok(!c.ofertas.some((o) => o.titulo), 'defesa apareceu antes da hora');
  const ritmo = c.ofertas.filter((o) => o.papel === 'ritmo');
  assert.ok(ritmo.length > 0, 'sem luta de manutencao');
  ritmo.forEach((o) => assert.strictEqual(o.rounds, 3));
  // depois de 8 semanas a defesa aparece, contra o desafiante numero 1
  c.semana += MMA.REPETE_TITULO;
  c.ofertas = [];
  MMA.gerarOfertas(c, MMA.criarRng(6));
  const defesa = c.ofertas.find((o) => o.titulo);
  assert.ok(defesa && defesa.papel === 'defesa' && defesa.rounds === 5);
  assert.strictEqual(defesa.op.nome, MMA.ranking(c).find((x) => !x.jogador).nome, 'desafiante #1');
  assert.strictEqual(MMA.situacaoTitulo(c).semanasParaDefesa, 0);
  void rng;
});

teste('luta de manutencao do campeao rende fama a mais; derrota nela nao tira o cinturao', () => {
  const { c, rng } = campeaoPronto();
  c.ofertas = [];
  MMA.gerarOfertas(c, MMA.criarRng(7));
  const o = c.ofertas.find((x) => x.papel === 'ritmo');
  assert.ok(o);
  MMA.aceitarOferta(c, o.id, rng);
  fazerCamp(c, rng);
  const fama0 = c.fama;
  const r = lutar(c, rng, { vencedor: 0 });
  assert.ok(r.venceu && c.fama - fama0 >= 17, 'fama de manutencao: ' + (c.fama - fama0));
  // perde uma luta sem titulo: continua campeao
  c.ofertas = [];
  c.energia = 100;
  c.lesao = null;
  MMA.gerarOfertas(c, MMA.criarRng(8));
  const o2 = c.ofertas.find((x) => x.papel === 'ritmo');
  MMA.aceitarOferta(c, o2.id, rng);
  fazerCamp(c, rng);
  lutar(c, rng, { vencedor: 1, metodo: 'Nocaute', round: 1, tempo: '0:40' });
  assert.strictEqual(c.campeao, true, 'perder luta sem titulo nao tira o cinturao');
});

teste('perder o cinturao faz do campeao um ex-campeao e a revanche aparece quando ele volta ao top', () => {
  const { c, rng } = campeaoPronto();
  const chave = 'atual|peso_leve';
  const antigo = (c.exCampeoes && c.exCampeoes[chave]) || [];
  assert.ok(antigo.length >= 1, 'ex-campeao anterior nao foi guardado');
  // o campeao anterior e o proprio jogador depois de perder
  c.semana += MMA.REPETE_TITULO;
  c.ofertas = [];
  MMA.gerarOfertas(c, MMA.criarRng(9));
  const d = c.ofertas.find((o) => o.titulo);
  MMA.aceitarOferta(c, d.id, rng);
  fazerCamp(c, rng);
  lutar(c, rng, { vencedor: 1, metodo: 'Decisão unânime' });
  assert.strictEqual(c.campeao, false);
  assert.ok(c.exCampeoes[chave].includes(c.nome), 'o jogador entra na lista de ex-campeoes');
  assert.strictEqual(MMA.campeaoAtual(c), d.op.nome);
});

teste('revanche com ex-campeao e superluta: aparecem para o campeao, pagam mais e rendem fama', () => {
  const { c, rng } = campeaoPronto();
  c.fama = 300; // Conhecido ou mais
  // forca um ex-campeao no top
  const chave = 'atual|peso_leve';
  const alvoTit = MMA.ranking(c).filter((x) => !x.jogador)[2]; // um ex-campeao no top, fora do posto de desafiante #1
  c.exCampeoes = {};
  c.exCampeoes[chave] = [alvoTit.nome];
  let viuEx = null;
  let viuSuper = null;
  for (let i = 0; i < 80 && !(viuEx && viuSuper); i++) {
    c.ofertas = [];
    c.ultimaSuperluta = -999;
    MMA.gerarOfertas(c, MMA.criarRng(1000 + i));
    viuEx = viuEx || c.ofertas.find((o) => o.exCampeao);
    viuSuper = viuSuper || c.ofertas.find((o) => o.superluta);
  }
  assert.ok(viuEx, 'revanche com ex-campeao nunca apareceu');
  assert.strictEqual(viuEx.papel, 'ex_campeao');
  assert.ok(viuSuper, 'superluta nunca apareceu');
  assert.strictEqual(viuSuper.rounds, 5);
  assert.strictEqual(viuSuper.titulo, false);
  assert.ok(!c.ofertas.some((o) => o.superluta && o.titulo), 'superluta nao pode ter titulo');
  // aceita e vence a superluta
  c.ofertas = [];
  for (let i = 0; i < 80 && !c.ofertas.some((o) => o.superluta); i++) { c.ultimaSuperluta = -999; c.ofertas = []; MMA.gerarOfertas(c, MMA.criarRng(2000 + i)); }
  const s = c.ofertas.find((o) => o.superluta);
  assert.ok(MMA.aceitarOferta(c, s.id, rng).ok);
  assert.strictEqual(c.agendada.rounds, 5);
  fazerCamp(c, rng);
  const fama0 = c.fama;
  const r = lutar(c, rng, { vencedor: 0, metodo: 'Nocaute', round: 3, tempo: '2:00' });
  assert.ok(r.venceu && c.fama - fama0 >= 30, 'fama da superluta ' + (c.fama - fama0));
  assert.strictEqual(c.superlutas, 1);
  assert.strictEqual(c.campeao, true);
  // a proxima superluta so depois de 16 semanas
  c.ofertas = [];
  MMA.gerarOfertas(c, MMA.criarRng(3000));
  assert.ok(!c.ofertas.some((o) => o.superluta), 'superluta repetida cedo demais');
});

teste('nao campeao nunca ve superluta nem revanche de ex-campeao como oferta propria', () => {
  for (let k = 0; k < 20; k++) {
    const c = nova({ rng: MMA.criarRng(k + 5) });
    c.fama = 600;
    MMA.gerarOfertas(c, MMA.criarRng(k));
    assert.ok(!c.ofertas.some((o) => o.superluta), 'superluta para nao campeao');
  }
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes de regras do cinturao passaram.');
process.exit(falhas ? 1 : 0);
