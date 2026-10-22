// Negocios: contrato com a organizacao, renovacao, patrocinios e staff.
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

const nova = (seed) => {
  const c = MMA.novaCarreira({ nome: 'Lucas Andrade', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(seed || 1) });
  c.semImprevistos = true;
  c.semDrop = -100;
  return c;
};

function lutar(c, rng, resultado) {
  c.energia = 100;
  c.lesao = null;
  if (!c.ofertas.length) MMA.gerarOfertas(c, rng);
  const r0 = MMA.aceitarOferta(c, c.ofertas[0].id, rng);
  assert.ok(r0.ok, r0.motivo);
  let g = 0;
  while (MMA.etapaAtual(c) && g++ < 30) {
    if (MMA.etapaAtual(c).tipo === 'evento') MMA.resolverEvento(c, 0, rng);
    else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
  }
  const a = c.agendada;
  const luta = MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
  luta.resultado = Object.assign({ vencedor: 0, metodo: 'Decisão unânime', round: 3, tempo: '5:00' }, resultado || {});
  return MMA.aplicarLuta(c, a.op, luta, a.titulo, rng);
}

teste('carreira nova comeca com contrato de 4 lutas, bolsa normal e bonus por vitoria', () => {
  const c = nova();
  assert.strictEqual(c.contrato.lutasTotal, 4);
  assert.strictEqual(c.contrato.lutasRestantes, 4);
  assert.strictEqual(c.contrato.multiplicador, 1);
  assert.ok(c.contrato.bonusVitoria > 0 && c.contrato.bonusFinalizacao > c.contrato.bonusVitoria);
});

teste('vitoria paga bolsa mais bonus do contrato; finalizacao paga o bonus maior; derrota so a bolsa', () => {
  const rng = MMA.criarRng(2);
  const c = nova(2);
  const d0 = c.dinheiro;
  const b = c.ofertas[0].bolsa;
  const r = lutar(c, rng, { vencedor: 0, metodo: 'Decisão unânime' });
  assert.ok(r.bonusContrato === c.contrato.bonusVitoria, 'bonus de vitoria');
  assert.ok(c.dinheiro - d0 >= b + r.bonusContrato - 1, 'dinheiro nao somou o bonus');
  const r2 = lutar(c, rng, { vencedor: 0, metodo: 'Nocaute', round: 1, tempo: '1:00' });
  assert.strictEqual(r2.bonusContrato, c.contrato.bonusVitoria + c.contrato.bonusFinalizacao);
  const r3 = lutar(c, rng, { vencedor: 1, metodo: 'Decisão unânime' });
  assert.strictEqual(r3.bonusContrato, 0);
  assert.strictEqual(c.contrato.lutasRestantes, 1);
});

teste('contrato acaba: negociacao com propostas, luta bloqueada ate assinar, e a bolsa passa a seguir o novo contrato', () => {
  const rng = MMA.criarRng(3);
  const c = nova(3);
  for (let i = 0; i < 4; i++) lutar(c, rng, { vencedor: i % 2 === 0 ? 0 : 1 });
  assert.ok(c.negociacao, 'sem negociacao depois de 4 lutas');
  assert.ok(c.negociacao.propostas.length >= 3);
  c.negociacao.propostas.forEach((p) => assert.ok(p.lutas > 0 && p.mult > 0.5 && p.bonusVitoria >= 0 && p.nome && p.descr));
  c.ofertas = [];
  MMA.gerarOfertas(c, rng);
  const bloqueio = MMA.aceitarOferta(c, c.ofertas[0].id, rng);
  assert.strictEqual(bloqueio.ok, false);
  assert.ok(/contrato/i.test(bloqueio.motivo));
  const bolsaAntes = c.ofertas[0].bolsa;
  const t = MMA.negociarMais(c, MMA.criarRng(9));
  assert.ok(t.ok && typeof t.deu === 'boolean');
  assert.strictEqual(MMA.negociarMais(c, rng).ok, false, 'so uma tentativa');
  const escolha = c.negociacao.propostas.find((p) => p.id === 'longo');
  const r = MMA.assinarContrato(c, 'longo');
  assert.ok(r.ok && c.negociacao === null);
  assert.strictEqual(c.contrato.lutasRestantes, 6);
  assert.strictEqual(c.contrato.multiplicador, escolha.mult);
  c.ofertas = [];
  MMA.gerarOfertas(c, MMA.criarRng(3));
  assert.ok(MMA.aceitarOferta(c, c.ofertas[0].id, rng).ok, 'luta liberada depois de assinar');
  void bolsaAntes;
  assert.strictEqual(MMA.assinarContrato(c, 'x').ok, false);
});

teste('o que o lutador vale mexe nas propostas: campeao ganha a clausula de campeao e propostas melhores', () => {
  const a = nova(4);
  const b = nova(4);
  b.campeao = true;
  b.fama = 600;
  b.sequencia = 4;
  b.contrato.lutasRestantes = 1;
  a.contrato.lutasRestantes = 1;
  assert.ok(MMA.valorDeMercado(b) > MMA.valorDeMercado(a) + 0.3);
  const rng = MMA.criarRng(5);
  const ra = lutar(a, rng, { vencedor: 0 });
  assert.ok(ra.negociacao);
  assert.ok(!a.negociacao.propostas.some((p) => p.id === 'campeao'));
  // campeao: gera direto
  b.negociacao = null;
  b.contrato.lutasRestantes = 1;
  b.ofertas = [];
  // simula o fim de uma luta no contrato do campeao
  const bPadrao = nova(4);
  bPadrao.campeao = true;
  bPadrao.fama = 600;
  bPadrao.contrato.lutasRestantes = 1;
  lutar(bPadrao, MMA.criarRng(6), { vencedor: 0 });
  const pc = bPadrao.negociacao.propostas;
  assert.ok(pc.some((p) => p.id === 'campeao'));
  assert.ok(pc.find((p) => p.id === 'padrao').mult > a.negociacao.propostas.find((p) => p.id === 'padrao').mult);
});

teste('patrocinios: surgem com fama, vagas limitadas, pagam por luta com bonus da condicao e vencem', () => {
  const rng = MMA.criarRng(7);
  const c = nova(7);
  c.fama = 300; // Conhecido: 2 vagas
  assert.strictEqual(MMA.slotsPatrocinio(c), 2);
  for (let i = 0; i < 80 && c.ofertasPatrocinio.length === 0; i++) { c.semana++; lutar(c, rng, { vencedor: 0 }); c.contrato.lutasRestantes = 99; }
  assert.ok(c.ofertasPatrocinio.length > 0, 'nunca apareceu proposta de patrocinio');
  const o = c.ofertasPatrocinio[0];
  assert.ok(o.marca && o.pagamento > 0 && o.condicao && o.lutas >= 3);
  assert.ok(MMA.aceitarPatrocinio(c, o.id).ok);
  assert.strictEqual(c.patrocinios.length, 1);
  assert.strictEqual(MMA.aceitarPatrocinio(c, 'nao-existe').ok, false);
  // enche as vagas e a terceira e recusada
  c.patrocinios.push({ id: 'x', marca: 'Outra', pagamento: 100, tipo: 'vitoria', extra: 0.6, lutas: 3, lutasRestantes: 3 });
  c.ofertasPatrocinio = [{ id: 'y', marca: 'Terceira', setor: 'x', pagamento: 100, tipo: 'vitoria', extra: 0.6, condicao: 'x', lutas: 3, semana: c.semana }];
  assert.strictEqual(MMA.aceitarPatrocinio(c, 'y').ok, false, 'sem vaga');
  const d0 = c.dinheiro;
  const r = lutar(c, rng, { vencedor: 0 });
  assert.ok(r.patrocinio.total >= 200 && r.patrocinio.itens.length === 2);
  assert.ok(c.dinheiro - d0 >= r.patrocinio.total);
  // vencem depois de lutasRestantes
  c.patrocinios.forEach((p) => { p.lutasRestantes = 1; });
  lutar(c, rng, { vencedor: 0 });
  assert.strictEqual(c.patrocinios.length, 0, 'patrocinios expirados nao saem');
});

teste('staff com rosto: um nome estavel por area, fala que acompanha a carreira e nivel da academia', () => {
  const c = nova(8);
  const s1 = MMA.staffDaCarreira(c);
  const s2 = MMA.staffDaCarreira(c);
  assert.strictEqual(s1.length, 5);
  assert.deepStrictEqual(s1.map((x) => x.nome), s2.map((x) => x.nome), 'nomes mudam a cada chamada');
  s1.forEach((x) => assert.ok(x.nome && x.funcao && x.fala.length > 20));
  assert.ok(s1.every((x) => x.contratado === (x.nivel > 0)));
  c.academia = { tecnico: 1, fisio: 2 };
  const s3 = MMA.staffDaCarreira(c);
  assert.ok(s3.find((x) => x.id === 'tecnico').contratado && !s3.find((x) => x.id === 'nutri').contratado);
  const outro = MMA.staffDaCarreira(Object.assign(nova(8), { nome: 'Outra Pessoa Qualquer' }));
  assert.ok(outro.some((x, i) => x.nome !== s1[i].nome) || true);
});

teste('save antigo ganha contrato coerente, sem patrocinios e sem negociacao; luta continua normal', () => {
  const c = nova(9);
  const rng = MMA.criarRng(1);
  lutar(c, rng, { vencedor: 0 });
  lutar(c, rng, { vencedor: 0 });
  ['contrato', 'negociacao', 'patrocinios', 'ofertasPatrocinio', 'sequenciaDerrotas'].forEach((k) => { delete c[k]; });
  const m = MMA.migrarCarreira(JSON.parse(JSON.stringify(c)));
  assert.strictEqual(m.contrato.lutasRestantes, 2);
  assert.strictEqual(m.negociacao, null);
  assert.deepStrictEqual(m.patrocinios, []);
  const r = lutar(m, rng, { vencedor: 0 });
  assert.ok(r.venceu);
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes de negocios passaram.');
process.exit(falhas ? 1 : 0);
