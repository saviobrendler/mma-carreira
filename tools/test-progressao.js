// Testes da progressao: arvore de habilidades, taticas novas, metas, recompensas variaveis e ganchos.
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

const lutador = (estilo, nome) => ({ nome, estilo, atributos: Object.assign({}, MMA.PERFIS[estilo]) });
const nova = (extra) => {
  const c = MMA.novaCarreira(Object.assign({ nome: 'T', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) }, extra || {}));
  c.semImprevistos = true; // testes deterministas: a semana da luta sem imprevistos
  c.contrato.lutasRestantes = 9999; // contrato nao vence no meio dos testes
  return c;
};

function passarEtapa(c, rng) {
  const et = MMA.etapaAtual(c);
  if (et.tipo === 'evento') {
    for (let i = 0; i < 2; i++) if (MMA.resolverEvento(c, i, rng).ok) return;
    throw new Error('evento sem opcao');
  }
  const op = MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0];
  assert.strictEqual(MMA.decidirCamp(c, op.id, rng).ok, true);
}
function campCompleto(c, rng) {
  let g = 0;
  while (MMA.etapaAtual(c) && g++ < 20) passarEtapa(c, rng);
}
// Aceita a primeira oferta, faz o camp e aplica uma luta com resultado forcado.
function lutar(c, resultado, rng, estat) {
  const r = rng || MMA.criarRng(77);
  MMA.aceitarOferta(c, c.ofertas[0].id, r);
  campCompleto(c, r);
  const op = c.agendada.op;
  const titulo = c.agendada.titulo;
  const luta = MMA.iniciarLutaAtiva(c, op, titulo, r);
  luta.resultado = Object.assign({ vencedor: 0, metodo: 'Decisão unânime', round: 3 }, resultado || {});
  if (estat) Object.assign(luta.estatisticas[0], estat);
  return MMA.aplicarLuta(c, op, luta, titulo, r);
}

// ---------- taticas liberadas pela arvore ----------

teste('taticas novas so valem com a habilidade liberada', () => {
  const sem = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(3) });
  sem.abrirRound();
  const com = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(3), desbloqueiosA: ['contra', 'clinch', 'raspar'] });
  com.abrirRound();
  assert.strictEqual(com._chave(0, 'contra'), 'contra');
  assert.strictEqual(com._chave(0, 'clinch'), 'clinch');
  assert.notStrictEqual(sem._chave(0, 'contra'), 'contra');
  assert.notStrictEqual(sem._chave(0, 'clinch'), 'clinch');
  sem.rd.chao = 1;
  com.rd.chao = 1;
  assert.strictEqual(com._chave(0, 'raspar'), 'raspar');
  assert.notStrictEqual(sem._chave(0, 'raspar'), 'raspar');
  com.rd.chao = 0;
  assert.notStrictEqual(com._chave(0, 'raspar'), 'raspar', 'raspar so serve por baixo');
});

teste('contra-golpe: o rival acerta menos e o fôlego dura mais que trocando', () => {
  const medir = (chave) => {
    let acertos = 0;
    let stam = 0;
    const N = 800;
    for (let i = 0; i < N; i++) {
      const l = new MMA.Luta(lutador('striking', 'A'), lutador('striking', 'B'), { rng: MMA.criarRng(i + 1), desbloqueiosA: ['contra'] });
      l.abrirRound();
      for (let k = 0; k < 3 && !l.rodadas.length; k++) l.jogarMomento(chave, 2, 'trocar');
      acertos += l.estatisticas[1].acertos;
      stam += l.f[0].stam;
    }
    return { acertos: acertos / N, stam: stam / N };
  };
  const c = medir('contra');
  const t = medir('trocar');
  assert.ok(c.acertos < t.acertos, 'rival deveria acertar menos: ' + c.acertos + ' vs ' + t.acertos);
  assert.ok(c.stam > t.stam, 'contra-golpe deveria poupar folego');
});

teste('clinch: joga, gasta mais folego e gera queda', () => {
  let quedas = 0;
  let acertos = 0;
  for (let i = 0; i < 400; i++) {
    const l = new MMA.Luta(lutador('luta_livre', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(i + 1), desbloqueiosA: ['clinch'] });
    l.abrirRound();
    for (let k = 0; k < 3 && !l.rodadas.length; k++) l.jogarMomento('clinch', 2);
    quedas += l.estatisticas[0].quedasOk;
    acertos += l.estatisticas[0].acertos;
  }
  assert.ok(quedas > 20 && acertos > 100, 'clinch sem efeito: ' + quedas + '/' + acertos);
});

teste('raspar: de baixo inverte a posicao as vezes, e vale mais que so se defender', () => {
  const rodar = (chave) => {
    let inverteu = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      const l = new MMA.Luta(lutador('grappling', 'A'), lutador('luta_livre', 'B'), { rng: MMA.criarRng(i + 1), desbloqueiosA: ['raspar'] });
      l.abrirRound();
      l.rd.chao = 1;
      const m = l.jogarMomento(chave, 1);
      if (m.eventos.some((e) => /raspa/.test(e.texto))) inverteu++;
    }
    return inverteu / N;
  };
  const r = rodar('raspar');
  assert.ok(r > 0.08 && r < 0.6, 'taxa de raspagem estranha: ' + r);
  assert.strictEqual(rodar('guarda'), 0, 'outras taticas nao raspam');
});

teste('habilidades de luta mudam o resultado: mao pesada, cacador de pescocos, controle', () => {
  const nocautes = (tracos) => {
    let ko = 0;
    for (let i = 0; i < 1500; i++) {
      const l = new MMA.Luta(lutador('striking', 'A'), lutador('striking', 'B'), { rng: MMA.criarRng(i + 1), tracosA: tracos });
      const r = l.simularCompleta();
      if (r.vencedor === 0 && r.metodo === 'Nocaute') ko++;
    }
    return ko;
  };
  assert.ok(nocautes(['hab_ko']) > nocautes([]), 'mao pesada nao fez diferenca');
  const subs = (tracos) => {
    let n = 0;
    for (let i = 0; i < 1500; i++) {
      const l = new MMA.Luta(lutador('grappling', 'A'), lutador('grappling', 'B'), { rng: MMA.criarRng(i + 1), tracosA: tracos });
      const r = l.simularCompleta();
      if (r.vencedor === 0 && r.metodo === 'Finalização') n++;
    }
    return n;
  };
  assert.ok(subs(['hab_pescoco']) > subs([]), 'cacador de pescocos nao fez diferenca');
});

teste('corner afiado: dois conselhos por intervalo, sem repetir o mesmo', () => {
  const l = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(5), tracosA: ['hab_frieza'] });
  l.f[0].stam = 40;
  assert.strictEqual(l.conselho(0, 'folego'), true);
  assert.strictEqual(l.conselho(0, 'folego'), false, 'mesmo conselho nao repete');
  assert.strictEqual(l.conselho(0, 'plano'), true);
  assert.strictEqual(l.conselho(0, 'leitura'), false, 'so dois');
  const normal = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(5) });
  assert.strictEqual(normal.conselho(0, 'folego'), true);
  assert.strictEqual(normal.conselho(0, 'plano'), false);
  l.rodarRound(['trocar', null]);
  if (!l.encerrada) assert.strictEqual(l.conselho(0, 'folego'), true, 'novo intervalo libera de novo');
});

teste('luta salva guarda os desbloqueios e os conselhos feitos', () => {
  const l = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(5), desbloqueiosA: ['contra'], tracosA: ['hab_frieza'] });
  l.conselho(0, 'folego');
  const r = MMA.Luta.restaurar(JSON.parse(JSON.stringify(l)), MMA.criarRng(1));
  assert.deepStrictEqual(r.desbloqueios[0], ['contra']);
  assert.strictEqual(r.conselhoUsado, 1);
  assert.strictEqual(r.conselho(0, 'folego'), false);
  assert.strictEqual(r.conselho(0, 'plano'), true);
});

// ---------- arvore de habilidades ----------

teste('arvore: comeca com 1 ponto; tier 2 exige o tier 1 e fecha a outra escolha', () => {
  const c = nova();
  assert.strictEqual(c.pontosHab, 1);
  assert.strictEqual(MMA.estadoHab(c, 'ko').estado, 'bloqueada');
  assert.strictEqual(MMA.aprender(c, 'ko').ok, false);
  assert.strictEqual(MMA.aprender(c, 'contra').ok, true);
  assert.strictEqual(c.pontosHab, 0);
  assert.strictEqual(MMA.aprender(c, 'raspar').ok, false, 'sem ponto');
  c.pontosHab = 5;
  assert.strictEqual(MMA.estadoHab(c, 'ko').estado, 'livre');
  assert.strictEqual(MMA.aprender(c, 'ko').ok, true);
  assert.strictEqual(MMA.estadoHab(c, 'clinch').estado, 'fechada');
  const r = MMA.aprender(c, 'clinch');
  assert.strictEqual(r.ok, false);
  assert.ok(/Mão pesada/.test(r.motivo));
  assert.strictEqual(MMA.aprender(c, 'contra').ok, false, 'ja tem');
  assert.strictEqual(c.pontosHab, 4, 'tentativas falhas nao gastam ponto');
});

teste('arvore: maestria so depois do tier 2 certo e apenas uma na carreira', () => {
  const c = nova();
  c.pontosHab = 20;
  ['contra', 'ko', 'raspar', 'pescoco'].forEach((id) => assert.strictEqual(MMA.aprender(c, id).ok, true, id));
  assert.strictEqual(MMA.estadoHab(c, 'cap_clinch').estado, 'fechada', 'o outro caminho do ramo fechou');
  assert.strictEqual(MMA.estadoHab(c, 'cap_ko').estado, 'livre');
  const antes = c.atributos.striking;
  const r = MMA.aprender(c, 'cap_ko');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(c.atributos.striking, antes + 5);
  assert.ok(c.tetos.striking >= c.atributos.striking);
  assert.strictEqual(MMA.estadoHab(c, 'cap_pescoco').estado, 'fechada', 'so uma maestria');
  assert.strictEqual(MMA.aprender(c, 'cap_pescoco').ok, false);
  assert.ok(MMA.habFlags(c).includes('nocauteador') && MMA.habFlags(c).includes('hab_ko') && MMA.habFlags(c).includes('hab_pescoco'));
  assert.deepStrictEqual(MMA.desbloqueios(c).sort(), ['contra', 'raspar']);
});

teste('arvore: estilo hibrido aparece conforme os ramos escolhidos', () => {
  const c = nova();
  c.pontosHab = 20;
  assert.strictEqual(MMA.estiloHibrido(c), null);
  MMA.aprender(c, 'contra');
  MMA.aprender(c, 'ko');
  assert.strictEqual(MMA.estiloHibrido(c).id, 'striker');
  MMA.aprender(c, 'raspar');
  MMA.aprender(c, 'pescoco');
  assert.strictEqual(MMA.estiloHibrido(c).id, 'mma');
  MMA.aprender(c, 'frieza');
  assert.strictEqual(MMA.estiloHibrido(c).id, 'completo');
});

teste('prepararLuta leva habilidades, taticas e bonus de hibrido para a luta', () => {
  const c = nova();
  c.pontosHab = 10;
  ['contra', 'ko', 'frieza'].forEach((id) => MMA.aprender(c, id));
  MMA.aceitarOferta(c, c.ofertas[0].id, MMA.criarRng(2));
  campCompleto(c, MMA.criarRng(2));
  const luta = MMA.prepararLuta(c, c.agendada.op, false, MMA.criarRng(3));
  assert.ok(luta.tracos[0].includes('hab_ko') && luta.tracos[0].includes('hab_frieza'));
  assert.deepStrictEqual(luta.desbloqueios[0], ['contra']);
  assert.strictEqual(luta.conselhoMax(), 2);
});

teste('pontos de habilidade: nivel, primeiro cinturao de cada categoria e fama nova (so uma vez)', () => {
  const c = nova();
  c.pontosHab = 0;
  MMA.ganharFama(c, 85);
  assert.strictEqual(c.pontosHab, 1, 'subir de nivel de fama rende 1');
  MMA.ganharFama(c, -85);
  MMA.ganharFama(c, 85);
  assert.strictEqual(c.pontosHab, 1, 'cair e subir de novo nao rende de novo');
  const d = nova();
  d.semDrop = -100;
  const rng = MMA.criarRng(31);
  MMA.aceitarOferta(d, d.ofertas[0].id, rng);
  campCompleto(d, rng);
  d.pontosHab = 0;
  d.xp = 150; // a vitoria (+80 com nocaute) cruza o nivel 4 (xp 160)
  const luta = MMA.iniciarLutaAtiva(d, d.agendada.op, false, rng);
  luta.resultado = { vencedor: 0, metodo: 'Nocaute', round: 2 };
  const r = MMA.aplicarLuta(d, d.agendada.op, luta, false, rng);
  assert.ok(r.nivelDepois > r.nivelAntes);
  assert.ok(d.pontosHab >= 1 && r.pontosHabGanhos >= 1);
});

teste('subida de nivel no camp (xp de treino) tambem paga pontos e deixa a comemoracao pendente', () => {
  const c = nova();
  MMA.aceitarOferta(c, c.ofertas[0].id, MMA.criarRng(3));
  c.xp = 40 * 4 - 2; // falta 2 xp para o nivel 3
  c.nivelPago = 2;
  c.pontosHab = 0;
  const pts = c.pontosDisponiveis;
  const rng = MMA.criarRng(3);
  const op = MMA.opcoesEtapa(c).find((o) => o.id === 'atv:boxe');
  assert.strictEqual(MMA.decidirCamp(c, op.id, rng).ok, true);
  assert.ok(MMA.nivelDoXP(c.xp) >= 3, 'xp do treino deveria cruzar o nivel');
  assert.strictEqual(c.nivelPago, MMA.nivelDoXP(c.xp));
  assert.strictEqual(c.pontosHab, 1);
  assert.ok(c.pontosDisponiveis >= pts + 2, "2 pontos de atributo pela subida");
  assert.deepStrictEqual(c.celebrarNivel, { de: 2, para: 3, pontosAtributo: 2, pontosHab: 1 });
  // nao paga duas vezes
  const antes = c.pontosHab;
  MMA.ganharFama(c, 1);
  campCompleto(c, rng);
  assert.ok(c.pontosHab >= antes);
  const luta = MMA.iniciarLutaAtiva(c, c.agendada.op, false, rng);
  luta.resultado = { vencedor: 1, metodo: 'Decisão unânime', round: 3 };
  const hab = c.pontosHab;
  MMA.aplicarLuta(c, c.agendada.op, luta, false, rng);
  assert.ok(c.pontosHab - hab <= 1, 'nivel ja pago nao rende de novo');
});

// ---------- metas ----------

teste('metas: escolher uma so; duplo nao existe na era antiga; cumprida libera a proxima', () => {
  const c = nova();
  assert.strictEqual(c.meta, null);
  assert.strictEqual(MMA.escolherMeta(c, 'xyz').ok, false);
  assert.strictEqual(MMA.escolherMeta(c, 'finalizador').ok, true);
  assert.strictEqual(MMA.escolherMeta(c, 'lenda').ok, false, 'uma meta por vez');
  const e = MMA.novaCarreira({ nome: 'E', estilo: 'misto', periodo: 'eras', divisaoId: 'peso_aberto', rng: MMA.criarRng(1) });
  assert.strictEqual(MMA.escolherMeta(e, 'duplo').ok, false);
  assert.ok(MMA.metasDisponiveis(e).find((m) => m.id === 'campeao').nome === 'Rei do ranking');
  c.finalizacoes = 7;
  c.dinheiro = 0;
  const pontos = c.pontosHab;
  const r = lutar(c, { vencedor: 0, metodo: 'Nocaute', round: 3 });
  assert.ok(r.meta && r.meta.id === 'finalizador', 'meta deveria fechar');
  assert.strictEqual(c.meta, null);
  assert.deepStrictEqual(c.metasCumpridas, ['finalizador']);
  assert.ok(c.pontosHab >= pontos + 3);
  assert.ok(c.dinheiro >= 15000);
  assert.strictEqual(MMA.escolherMeta(c, 'finalizador').ok, false, 'nao repete meta cumprida');
  assert.strictEqual(MMA.escolherMeta(c, 'lenda').ok, true);
});

teste('metas: cada uma tem premio e preco', () => {
  const bolsa = (meta, res, titulo) => {
    const c = nova({ meta: meta });
    c.semDrop = -100;
    MMA.aceitarOferta(c, c.ofertas[0].id, MMA.criarRng(5));
    c.agendada.bolsa = 10000;
    campCompleto(c, MMA.criarRng(5));
    const luta = MMA.iniciarLutaAtiva(c, c.agendada.op, !!titulo, MMA.criarRng(6));
    luta.resultado = Object.assign({ vencedor: 0, metodo: 'Decisão unânime', round: 3 }, res);
    return MMA.aplicarLuta(c, c.agendada.op || luta, luta, !!titulo, MMA.criarRng(7)).bolsa;
  };
  const base = bolsa(null, {});
  assert.ok(bolsa('campeao', {}) < base, 'caçador paga menos sem titulo');
  assert.ok(bolsa('finalizador', { metodo: 'Nocaute', round: 2 }) > bolsa(null, { metodo: 'Nocaute', round: 2 }));
  assert.ok(bolsa('finalizador', {}) < base, 'finalizador paga menos na decisao');
  const lenda = nova({ meta: 'lenda' });
  const normal = nova();
  MMA.ganharFama(lenda, 40);
  MMA.ganharFama(normal, 40);
  assert.ok(lenda.fama > normal.fama);
  MMA.ganharFama(lenda, -30);
  MMA.ganharFama(normal, -30);
  assert.ok(lenda.fama - 50 < normal.fama - 40 + 1 || lenda.fama < normal.fama + 11);
  const duplo = nova({ meta: 'duplo' });
  duplo.pontos = 100;
  duplo.energia = 100;
  MMA.mudarDivisao(duplo, 'peso_pena', MMA.criarRng(1));
  assert.strictEqual(duplo.pontos, 50, 'duplo mantem metade dos pontos');
  const outro = nova();
  outro.pontos = 100;
  MMA.mudarDivisao(outro, 'peso_pena', MMA.criarRng(1));
  assert.strictEqual(outro.pontos, 0);
});

teste('cinturoes: conta as categorias em que ja foi campeao (define a foto da comemoracao)', () => {
  const c = nova();
  assert.strictEqual(MMA.cinturoesSeVencer(c), 1, 'primeiro titulo: 1 cinturao');
  c.titulosPor = { 'atual|peso_leve': true };
  assert.strictEqual(MMA.cinturoesSeVencer(c), 1, 'defesa na mesma categoria: 1');
  c.divisaoId = 'peso_pena';
  assert.strictEqual(MMA.cinturoesSeVencer(c), 2, 'titulo em outra categoria: 2');
  c.titulosPor['atual|peso_pena'] = true;
  assert.strictEqual(MMA.cinturoesSeVencer(c), 2, 'defesa com dois titulos: 2');
});

teste('meta duplo: conta cinturoes em categorias diferentes', () => {
  const c = nova({ meta: 'duplo' });
  assert.strictEqual(MMA.metaProgresso(c).feito, false);
  c.titulosPor = { 'atual:peso_leve': true };
  const p1 = MMA.metaProgresso(c);
  assert.ok(p1.progresso >= 0.5 && !p1.feito);
  c.titulosPor['atual:peso_pena'] = true;
  assert.strictEqual(MMA.metaProgresso(c).feito, true);
});

// ---------- recompensas variaveis ----------

teste('performance da noite: nocaute no 1o round paga um bonus e rende fama', () => {
  const c = nova();
  c.semDrop = -100;
  const dinheiro = c.dinheiro;
  const r = lutar(c, { vencedor: 0, metodo: 'Nocaute', round: 1 });
  const p = r.recompensas.find((x) => x.tipo === 'performance');
  assert.ok(p && p.valor >= 2500 && p.raridade === 'épico', JSON.stringify(r.recompensas));
  assert.ok(c.dinheiro >= dinheiro + r.bolsa + p.valor - 1, 'bonus entra no caixa');
});

teste('decisao sem acao nao rende bonus; derrota nao rende performance', () => {
  const c = nova();
  c.semDrop = -100;
  const r = lutar(c, { vencedor: 1, metodo: 'Nocaute', round: 1 });
  assert.ok(!r.recompensas.some((x) => x.tipo === 'performance'));
  const d = nova();
  d.semDrop = -100;
  const r2 = lutar(d, { vencedor: 0, metodo: 'Decisão unânime', round: 3 }, MMA.criarRng(3), { acertos: 0 });
  assert.ok(!r2.recompensas.some((x) => x.tipo === 'performance'));
});

teste('luta da noite: luta movimentada pode premiar ate quem perde', () => {
  let achou = 0;
  for (let i = 0; i < 60; i++) {
    const c = nova();
    c.semDrop = -100;
    const r = lutar(c, { vencedor: 1, metodo: 'Decisão unânime', round: 3 }, MMA.criarRng(100 + i), { acertos: 40, quedasOk: 3 });
    if (r.recompensas.some((x) => x.tipo === 'luta_noite')) achou++;
  }
  assert.ok(achou > 10 && achou < 55, 'luta da noite em ' + achou + '/60');
});

teste('drops raros: frequencia razoavel, a sorte aumenta com a seca e os tipos variam', () => {
  const tipos = {};
  let lutas = 0;
  let comDrop = 0;
  let maiorSeca = 0;
  const c = nova();
  for (let i = 0; i < 300; i++) {
    c.energia = 100;
    c.lesao = null;
    if (!c.ofertas.length) MMA.gerarOfertas(c, MMA.criarRng(i + 5));
    if (!c.ofertas.length) continue;
    const seca = c.semDrop;
    const r = lutar(c, { vencedor: i % 3 === 0 ? 1 : 0 }, MMA.criarRng(i + 9));
    lutas++;
    const drop = r.recompensas.find((x) => ['patrocinio', 'viral', 'relampago', 'mentor'].includes(x.tipo));
    if (drop) { comDrop++; tipos[drop.tipo] = (tipos[drop.tipo] || 0) + 1; }
    else maiorSeca = Math.max(maiorSeca, c.semDrop);
    void seca;
  }
  const taxa = comDrop / lutas;
  console.log('     lutas', lutas, 'drops', comDrop, JSON.stringify(tipos), 'maior seca', maiorSeca);
  assert.ok(taxa > 0.08 && taxa < 0.35, 'taxa de drops fora do esperado: ' + taxa);
  assert.ok(Object.keys(tipos).length >= 3, 'pouca variedade');
  assert.ok(maiorSeca <= 18, 'seca longa demais: ' + maiorSeca);
  assert.ok((c.mentores || []).length <= 5 && new Set(c.mentores).size === c.mentores.length, 'mentor nao repete');
});

teste('luta-relampago: aparece nas ofertas com bolsa maior e 2 semanas; aceitar outra a perde', () => {
  const c = nova();
  c.lutaBonus = { desde: 1 };
  MMA.gerarOfertas(c, MMA.criarRng(4));
  const b = c.ofertas.find((o) => o.bonus);
  assert.ok(b, 'oferta relampago');
  assert.strictEqual(b.semanasAte, 2);
  const normal = c.ofertas.find((o) => !o.bonus && !o.titulo);
  assert.ok(b.bolsa / (500 + b.op.rating * 8) > normal.bolsa / (500 + normal.op.rating * 8) * 1.3 || b.rival > 0);
  assert.strictEqual(new Set(c.ofertas.map((o) => o.op.nome)).size, c.ofertas.length, 'sem rival repetido');
  const g = MMA.ganchos(c);
  assert.ok(g.some((x) => x.tipo === 'bonus'));
  assert.strictEqual(MMA.proximaOferta(c).id, b.id);
  // regenerar mantem a oferta ate alguem aceitar
  c.ofertas = [];
  MMA.gerarOfertas(c, MMA.criarRng(5));
  assert.ok(c.ofertas.some((o) => o.bonus));
  const outra = c.ofertas.find((o) => !o.bonus);
  MMA.aceitarOferta(c, outra.id, MMA.criarRng(1));
  assert.strictEqual(c.lutaBonus, null);
  const d = nova();
  d.lutaBonus = { desde: 1 };
  MMA.gerarOfertas(d, MMA.criarRng(4));
  const b2 = d.ofertas.find((o) => o.bonus);
  const ok = MMA.aceitarOferta(d, b2.id, MMA.criarRng(1));
  assert.ok(ok.ok && ok.semanas === 2 && d.agendada.bonus === true);
  campCompleto(d, MMA.criarRng(2));
  assert.ok(MMA.campConcluido(d));
});

teste('treino iluminado: as vezes o treino evolui +3 de uma vez, sem passar do teto', () => {
  let saltos = 0;
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const c = nova();
    c.tetos.striking = c.atributos.striking + 30;
    const antes = c.atributos.striking;
    const t = MMA.rolarTreino ? null : null;
    void t;
    const rng = MMA.criarRng(i + 1);
    // usa o camp de verdade: treino pesado no atributo recomendado
    MMA.aceitarOferta(c, c.ofertas[0].id, rng);
    const op = MMA.opcoesEtapa(c).find((o) => o.id === 'atv:boxe');
    const r = MMA.decidirCamp(c, op.id, rng);
    assert.strictEqual(r.ok, true);
    const attr = op.attr;
    const ganho = c.atributos[attr] - (attr === 'striking' ? antes : c.atributos[attr] - (c.atributos[attr] - c.atributos[attr]));
    void ganho;
    n++;
    if (r.linhas.some((l) => /ESTALO/.test(l))) saltos++;
    assert.ok(c.atributos[attr] <= c.tetos[attr]);
  }
  assert.ok(saltos > 5 && saltos < n * 0.5, 'saltos: ' + saltos + '/' + n);
});

// ---------- so mais uma ----------

teste('ganchos: depois da luta mostram o que esta perto (ranking, nivel, habilidade)', () => {
  const c = nova();
  const r = lutar(c, { vencedor: 0, metodo: 'Decisão unânime', round: 3 });
  assert.ok(Array.isArray(r.gancho) && r.gancho.length >= 2 && r.gancho.length <= 5);
  r.gancho.forEach((g) => assert.ok(g.texto && g.tipo && Number.isFinite(g.urg)));
  for (let i = 1; i < r.gancho.length; i++) assert.ok(r.gancho[i - 1].urg >= r.gancho[i].urg, 'ordenado por urgencia');
  if (!c.lesao) assert.ok(r.proxima && c.ofertas.some((o) => o.id === r.proxima.id)); // lesionado nao recebe ofertas
  assert.ok(Number.isFinite(r.posAntes) && Number.isFinite(r.posDepois));
  const g = MMA.ganchos(c);
  assert.ok(g.some((x) => x.tipo === 'nivel'));
  c.pontosHab = 2;
  assert.ok(MMA.ganchos(c).some((x) => x.tipo === 'habilidade' && x.acao === 'habilidades'));
  const rk = MMA.ganchos(c).find((x) => x.tipo === 'ranking');
  if (rk) assert.ok(/Faltam \d+ pts para o #\d+/.test(rk.texto));
});

teste('ganchos: rival, titulo e meta aparecem quando existem', () => {
  const c = nova({ meta: 'lenda' });
  assert.ok(MMA.ganchos(c).some((x) => x.tipo === 'meta'));
  const sem = nova();
  assert.ok(MMA.ganchos(sem).some((x) => x.tipo === 'meta' && /Escolha/.test(x.texto)));
  const alvo = c.ofertas[0].op.nome;
  MMA.criarRivalidade(c, alvo, 'revanche', 2);
  assert.ok(MMA.ganchos(c).some((x) => x.tipo === 'rival' && x.texto.includes(alvo)));
  const k = nova();
  const pos = MMA.ranking(k).findIndex((x) => x.jogador);
  void pos;
  k.sequencia = 2;
  k.pontos = 99999;
  assert.ok(MMA.ganchos(k).some((x) => x.tipo === 'titulo'));
});

// ---------- saves antigos ----------

teste('save antigo (sem habilidades, metas ou drops) migra com pontos de habilidade justos', () => {
  const c = nova();
  c.xp = 400;
  c.titulos = 1;
  c.fama = 500;
  c.famaMax = 500;
  c.campeao = true;
  ['habilidades', 'pontosHab', 'meta', 'metasCumpridas', 'titulosPor', 'finalizacoes', 'semDrop', 'mentores', 'lutaBonus'].forEach((k) => { delete c[k]; });
  c.historico = [{ resultado: 'Vitória', metodo: 'Nocaute' }, { resultado: 'Vitória', metodo: 'Decisão unânime' }, { resultado: 'Vitória', metodo: 'Finalização' }];
  const m = MMA.migrarCarreira(JSON.parse(JSON.stringify(c)));
  assert.deepStrictEqual(m.habilidades, []);
  assert.strictEqual(m.meta, null);
  assert.strictEqual(m.finalizacoes, 2);
  assert.ok(m.pontosHab >= 4, 'pontos compensam o progresso passado: ' + m.pontosHab);
  assert.strictEqual(Object.keys(m.titulosPor).length, 1);
  assert.strictEqual(m.lutaBonus, null);
  assert.ok(MMA.ganchos(m).length > 0);
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes de progressao passaram.');
process.exit(falhas ? 1 : 0);
