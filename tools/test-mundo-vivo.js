// Mundo vivo: forma recente, aposentadorias, prospectos, historias dos rivais, manchetes e redes.
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

// Deixa o mundo andar: so semanas passando (o jogador nao luta).
function mundo(seed, semanas, periodo) {
  const c = MMA.novaCarreira({ nome: 'Observador', estilo: 'misto', periodo: periodo || 'atual', divisaoId: periodo === 'eras' ? 'peso_aberto' : 'peso_leve', rng: MMA.criarRng(seed) });
  c.semImprevistos = true;
  const rng = MMA.criarRng(seed + 99);
  for (let i = 0; i < semanas; i++) {
    c.energia = 100;
    MMA.descansar(c, rng);
    if (c.evento) MMA.resolverEvento(c, 0, rng);
    if (c.agendada) { c.agendada = null; c.camp = null; }
  }
  return c;
}

const c3 = mundo(1, 52 * 4);

teste('quatro anos depois: veteranos se aposentam, prospectos chegam e o ranking continua valido', () => {
  const ap = Object.keys(c3.aposentadosIA || {});
  const nov = Object.values(c3.novatos || {}).reduce((s, l) => s + l.length, 0);
  assert.ok(ap.length >= 3, 'poucas aposentadorias: ' + ap.length);
  assert.ok(nov >= 3, 'poucos prospectos: ' + nov);
  MMA.ORDEM_DIVISOES.forEach((div) => {
    const lista = MMA.ranking(c3, 'atual', div);
    assert.ok(lista.length >= 14, div + ' ficou com ' + lista.length);
    assert.strictEqual(new Set(lista.map((x) => x.nome)).size, lista.length, 'nome repetido em ' + div);
    lista.forEach((x) => assert.ok(!c3.aposentadosIA[x.nome], x.nome + ' aposentado aparece no ranking'));
    const camp = MMA.campeaoAtual(c3, 'atual', div);
    assert.ok(camp && lista.some((x) => x.nome === camp), 'campeao de ' + div + ' ausente do ranking: ' + camp);
    assert.ok(!c3.aposentadosIA[camp], 'campeao aposentado: ' + camp);
  });
});

teste('prospectos: jovens, com teto, nomes unicos e atributos validos que crescem devagar', () => {
  const todos = [];
  Object.values(c3.novatos).forEach((l) => l.forEach((x) => todos.push(x)));
  assert.ok(todos.length > 0);
  assert.strictEqual(new Set(todos.map((x) => x.nome)).size, todos.length);
  todos.forEach((x) => {
    const idade = MMA.idadeDoLutador(c3, x);
    assert.ok(idade >= 19 && idade <= 29, 'idade de prospecto ' + idade);
    MMA.ATRIBUTOS.forEach((a) => assert.ok(x.atributos[a] >= 35 && x.atributos[a] <= x.potencial, a + ' fora do intervalo ' + x.atributos[a]));
    assert.ok(x.nome.includes(' ') && x.nacionalidade);
    assert.ok(MMA.historiaLutador(c3, x.nome).some((h) => /Prospecto|promessa|Jovem/.test(h)), 'sem historia de prospecto');
    assert.ok(MMA.buscarLutador(c3, x.nome), 'prospecto nao e achado pelo nome');
  });
  // nenhum prospecto colide com lutador real
  const reais = new Set();
  ['atual'].forEach((p) => Object.values(window.DADOS[p]).forEach((d) => d.lutadores.forEach((l) => reais.add(l.nome))));
  todos.forEach((x) => assert.ok(!reais.has(x.nome), 'nome de lutador real: ' + x.nome));
});

teste('forma e cartel dos outros lutadores andam com o circuito; historias falam de forma, idade e titulo', () => {
  const comForma = Object.keys(c3.forma);
  assert.ok(comForma.length >= 20, 'poucos lutadores com forma: ' + comForma.length);
  comForma.forEach((n) => {
    assert.ok(c3.forma[n].length <= 6);
    c3.forma[n].forEach((x) => assert.ok(['V', 'D'].includes(x.r) && x.op && x.semana >= 1));
  });
  const n = comForma.find((x) => MMA.buscarLutador(c3, x));
  const l = MMA.buscarLutador(c3, n);
  const reg = c3.registroIA[n];
  const base = (l.cartel && l.cartel.vitorias) || 0;
  assert.strictEqual(MMA.cartelIA(c3, l).v, base + reg.v);
  assert.ok(MMA.formaDe(c3, n).length >= 1);
  // alguem tem historia com "vem de" ou "perdeu"
  const historias = comForma.map((x) => MMA.historiaLutador(c3, x).join(' '));
  assert.ok(historias.some((h) => /Vem de \d vit|Perdeu as últimas|Venceu a última|Perdeu a última/.test(h)));
  assert.ok(historias.some((h) => /Campeão da categoria|Veterano|Ex-campeão|Jovem|Vitórias por nocaute|Finaliza/.test(h)));
});

teste('aposentadoria do campeao deixa o cinturao com o primeiro colocado (nunca vago) e vira manchete', () => {
  let achou = false;
  for (let seed = 1; seed <= 12 && !achou; seed++) {
    const c = mundo(100 + seed, 52 * 5);
    if ((c.imprensa || []).some((i) => /vago com a aposentadoria/.test(i.texto))) {
      achou = true;
      MMA.ORDEM_DIVISOES.forEach((div) => assert.ok(MMA.campeaoAtual(c, 'atual', div)));
    }
  }
  assert.ok(achou, 'nenhum campeao se aposentou em 12 mundos de 5 anos');
});

teste('Era das Lendas: sem aposentadoria nem prospectos (o mundo antigo e fixo)', () => {
  const c = mundo(5, 52 * 3, 'eras');
  assert.strictEqual(Object.keys(c.aposentadosIA || {}).length, 0);
  assert.strictEqual(Object.keys(c.novatos || {}).length, 0);
});

teste('imprensa: manchete e reacao dos fas depois de cada luta, seguidores sobem na vitoria e caem na derrota', () => {
  const c = MMA.novaCarreira({ nome: 'Rafael Duarte', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(2) });
  c.semImprevistos = true;
  c.semDrop = -100;
  const rng = MMA.criarRng(3);
  const resultados = [{ vencedor: 0, metodo: 'Nocaute', round: 2, tempo: '1:00' }, { vencedor: 1, metodo: 'Decisão unânime', round: 3, tempo: '5:00' }, { vencedor: 0, metodo: 'Decisão unânime', round: 3, tempo: '5:00' }];
  resultados.forEach((res, i) => {
    c.energia = 100;
    c.lesao = null;
    if (!c.ofertas.length) MMA.gerarOfertas(c, rng);
    MMA.aceitarOferta(c, c.ofertas[0].id, rng);
    let g = 0;
    while (MMA.etapaAtual(c) && g++ < 30) {
      if (MMA.etapaAtual(c).tipo === 'evento') MMA.resolverEvento(c, 0, rng);
      else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
    }
    const seg0 = c.seguidores;
    const a = c.agendada;
    const luta = MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
    luta.resultado = Object.assign({ rounds: 3 }, res);
    MMA.aplicarLuta(c, a.op, luta, a.titulo, rng);
    const novos = c.imprensa.slice(0, 2);
    assert.ok(novos.some((x) => x.tipo === 'manchete') && novos.some((x) => x.tipo === 'rede'), 'sem manchete/rede apos a luta ' + i);
    assert.ok(c.imprensa[1].texto.includes('Duarte') || c.imprensa[0].texto.includes('Duarte'));
    if (res.vencedor === 0) assert.ok(c.seguidores > seg0, 'vitoria nao subiu seguidores'); else assert.ok(c.seguidores < seg0, 'derrota nao baixou seguidores');
    assert.ok(c.imprensa.length <= 40 && c.seguidores >= 0);
  });
  assert.ok(c.imprensa.some((x) => /nocauteia/.test(x.texto)));
});

teste('save antigo sem os campos novos carrega, joga e passa meses sem erro', () => {
  const c = MMA.novaCarreira({ nome: 'Antigo', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(8) });
  ['exCampeoes', 'forma', 'registroIA', 'novatos', 'aposentadosIA', 'imprensa', 'seguidores', 'imprevisto', 'ultimoImprevisto'].forEach((k) => { delete c[k]; });
  const m = MMA.migrarCarreira(JSON.parse(JSON.stringify(c)));
  assert.deepStrictEqual(m.forma, {});
  assert.ok(Array.isArray(m.imprensa) && m.imprevisto === null);
  const rng = MMA.criarRng(1);
  for (let i = 0; i < 80; i++) { m.energia = 100; MMA.descansar(m, rng); if (m.evento) MMA.resolverEvento(m, 0, rng); if (m.agendada) { m.agendada = null; m.camp = null; } }
  assert.ok(Object.keys(m.forma).length > 0);
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes do mundo vivo passaram.');
process.exit(falhas ? 1 : 0);
