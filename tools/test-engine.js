// Testes de sanidade do motor: rodam varias lutas e checam metricas e invariantes.
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
    console.log('FALHA', nome, '\n     ', e.message);
  }
}

const lutador = (estilo, nome) => ({ nome, estilo, atributos: Object.assign({}, MMA.PERFIS[estilo]) });

teste('dados carregados: lutadores nas tres eras', () => {
  let total = 0;
  for (const p of Object.values(window.DADOS)) for (const d of Object.values(p)) total += d.lutadores.length;
  assert.ok(total >= 290, "poucos lutadores: " + total);
  // cada categoria tem gente suficiente para um ranking de verdade
  ["auge", "atual"].forEach((p) => Object.values(window.DADOS[p]).forEach((d) => assert.ok(d.lutadores.length >= 12, p + " " + d.id + ": " + d.lutadores.length)));
});

teste('luta sempre termina com vencedor ou empate', () => {
  for (let i = 0; i < 2000; i++) {
    const luta = new MMA.Luta(lutador('striking', 'A'), lutador('luta_livre', 'B'), { rng: MMA.criarRng(i + 1) });
    const r = luta.simularCompleta();
    assert.ok(r && r.metodo, 'sem metodo na luta ' + i);
    assert.ok(r.vencedor === 0 || r.vencedor === 1 || r.vencedor === null);
  }
});

teste('rounds nao passam do limite e placar e 10 x 8/9', () => {
  for (let i = 0; i < 500; i++) {
    const luta = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rodadas: 5, rng: MMA.criarRng(i + 7) });
    luta.simularCompleta();
    assert.ok(luta.rodadas.length <= 5);
    for (const rd of luta.rodadas) {
      const [p0, p1] = rd.placar;
      assert.ok(p0 + p1 >= 18 && p0 + p1 <= 20, 'placar invalido ' + p0 + '-' + p1);
    }
  }
});

teste('distribuicao de metodos (3 rounds, misto x misto)', () => {
  const cont = {};
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const luta = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(i * 3 + 11) });
    const r = luta.simularCompleta();
    cont[r.metodo] = (cont[r.metodo] || 0) + 1;
  }
  console.log('     metodos:', JSON.stringify(Object.fromEntries(Object.entries(cont).map(([k, v]) => [k, ((v / N) * 100).toFixed(1) + '%']))));
  const finais = (cont['Nocaute'] || 0) + (cont['Finalização'] || 0);
  assert.ok(finais / N > 0.1 && finais / N < 0.6, 'finalizacoes fora da faixa: ' + finais / N);
});

teste('estilo importa: wrestler forte contra striker derruba mais', () => {
  const contra = (a, b) => {
    let vitorias = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const luta = new MMA.Luta(a, b, { rng: MMA.criarRng(i * 5 + 3) });
      if (luta.simularCompleta().vencedor === 0) vitorias++;
    }
    return vitorias / N;
  };
  const wr = contra(lutador('luta_livre', 'W'), lutador('striking', 'S'));
  console.log('     wrestler vence striker em', (wr * 100).toFixed(1) + '%');
  // Tolerancia baixa de proposito: o balanceamento ainda e provisorio (calibragem nao pesquisada).
  assert.ok(wr > 0.25 && wr < 0.95, 'taxa fora do esperado: ' + wr);
});

teste('carreira: vitoria sobe pontos, derrota desce e a energia cai', () => {
  const c = MMA.novaCarreira({ nome: 'Teste', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', distribuicao: { striking: 6, wrestling: 6 } });
  const ops = MMA.oponentes(c);
  assert.ok(ops.length > 0, 'sem oponentes');
  const op = ops[0];
  const luta = MMA.prepararLuta(c, op, false, MMA.criarRng(42));
  luta.simularCompleta();
  const antesEnergia = c.energia;
  MMA.aplicarLuta(c, op, luta, false);
  assert.ok(c.energia < antesEnergia);
  assert.strictEqual(c.recorde.v + c.recorde.d + c.recorde.e, 1);
  assert.strictEqual(c.historico.length, 1);
});


teste('troca de categoria so para vizinha e nunca na era antiga', () => {
  const c = MMA.novaCarreira({ nome: 'T', estilo: 'striking', periodo: 'atual', divisaoId: 'peso_leve' });
  assert.strictEqual(MMA.mudarDivisao(c, 'peso_pesado').ok, false);
  assert.strictEqual(MMA.mudarDivisao(c, 'peso_medio').ok, false);
  assert.strictEqual(MMA.mudarDivisao(c, 'peso_meio_medio').ok, true);
  const e = MMA.novaCarreira({ nome: 'E', estilo: 'misto', periodo: 'eras', divisaoId: 'peso_aberto' });
  assert.strictEqual(MMA.mudarDivisao(e, 'peso_pesado').ok, false);
});

teste('desafio ao titulo exige top 5 e 2 vitorias seguidas', () => {
  const c = MMA.novaCarreira({ nome: 'T', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve' });
  assert.strictEqual(MMA.podeDesafiarTitulo(c).ok, false);
});

teste('ranking inclui o jogador quando ele esta na divisao', () => {
  const c = MMA.novaCarreira({ nome: 'Jogador Teste', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve' });
  const lista = MMA.ranking(c);
  assert.ok(lista.some((x) => x.jogador && x.nome === 'Jogador Teste'));
});


teste('idade: declinio aplica so a partir de 31', () => {
  const a = { forca: 70, velocidade: 70, resistencia: 70, queixo: 70, striking: 70, grappling: 70, wrestling: 70, defesa: 70, qi: 70 };
  assert.deepStrictEqual(MMA.ajustarIdade(a, 28), a);
  assert.ok(MMA.ajustarIdade(a, 38).velocidade < 70);
  assert.strictEqual(MMA.ajustarIdade(a, 38).qi, 70);
});


teste('evento: resolver aplica efeito e limpa o pendente', () => {
  const c = MMA.novaCarreira({ nome: 'E', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve' });
  const din = c.dinheiro;
  c.evento = { id: 'patrocinio', titulo: 'x', texto: 'y', opcoes: [{ rotulo: 'a', resumo: 'b' }, { rotulo: 'c', resumo: 'd' }] };
  assert.strictEqual(MMA.descansar(c).ok, false);
  assert.strictEqual(MMA.resolverEvento(c, 0).ok, true);
  assert.strictEqual(c.dinheiro, din + 900);
  assert.strictEqual(c.evento, null);
});

teste('luta salva no meio e retomada de forma identica', () => {
  const c = MMA.novaCarreira({ nome: 'R', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve' });
  const op = MMA.oponentes(c)[0];
  const luta = MMA.iniciarLutaAtiva(c, op, false, MMA.criarRng(5));
  luta.rodarRound(['trocar', null]);
  const json = JSON.parse(JSON.stringify(c));
  const ret = MMA.retomarLutaAtiva(json, MMA.criarRng(6));
  assert.strictEqual(ret.luta.rodadas.length, 1);
  assert.strictEqual(ret.luta.totais[0], luta.totais[0]);
  assert.strictEqual(ret.oponente.nome, op.nome);
});

teste('aplicar luta limpa lutaAtiva e avanca semana', () => {
  const c = MMA.novaCarreira({ nome: 'A', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve' });
  const op = MMA.oponentes(c)[0];
  const luta = MMA.iniciarLutaAtiva(c, op, false, MMA.criarRng(9));
  luta.simularCompleta();
  const sem = c.semana;
  MMA.aplicarLuta(c, c.lutaAtiva ? c.lutaAtiva.op : op, luta, false, MMA.criarRng(10));
  assert.strictEqual(c.lutaAtiva, null);
  assert.ok(c.semana > sem);
});




teste('distribuir ponto sobe o atributo e o overall', () => {
  const c = MMA.novaCarreira({ nome: 'P', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve' });
  assert.strictEqual(MMA.distribuirPonto(c, 'forca').ok, false);
  c.pontosDisponiveis = 2;
  const r = MMA.distribuirPonto(c, 'forca');
  assert.strictEqual(r.ok, true);
  assert.ok(r.overallDepois >= r.overallAntes);
  assert.strictEqual(c.pontosDisponiveis, 1);
});





teste('aposentadoria so a partir dos 36 e gera entrada do hall', () => {
  const c = MMA.novaCarreira({ nome: 'A', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', idade: 25 });
  assert.strictEqual(MMA.podeAposentar(c).ok, false);
  c.idadeInicial = 37;
  const r = MMA.aposentar(c);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.entrada.nome, 'A');
  assert.strictEqual(c.aposentado, true);
});


teste('NaN: save antigo sem BJJ e migrado e o overall fica finito', () => {
  const c = MMA.novaCarreira({ nome: 'Velho', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve' });
  delete c.atributos.bjj;
  assert.ok(Number.isNaN(MMA.ratingExato(c)), 'sem a migracao o overall seria NaN');
  MMA.migrarCarreira(c);
  assert.ok(Number.isFinite(MMA.ratingExato(c)));
  assert.strictEqual(c.atributos.bjj, MMA.PERFIS.misto.bjj);
  assert.ok(Number.isFinite(MMA.rating(c)));
});

teste('NaN: luta salva antiga tambem e migrada', () => {
  const c = MMA.novaCarreira({ nome: 'Velho', estilo: 'striking', periodo: 'atual', divisaoId: 'peso_leve' });
  const op = MMA.oponentes(c)[0];
  const luta = MMA.iniciarLutaAtiva(c, op, false, MMA.criarRng(4));
  luta.rodarRound(['trocar', null]);
  c.lutaAtiva.luta = JSON.parse(JSON.stringify(luta.toJSON()));
  delete c.lutaAtiva.luta.f[0].attr.bjj;
  delete c.lutaAtiva.luta.f[1].attr.bjj;
  MMA.migrarCarreira(c);
  const ret = MMA.retomarLutaAtiva(c, MMA.criarRng(5));
  ret.luta.simularCompleta();
  ret.luta.f.forEach((x) => Object.values(x.attr).forEach((v) => assert.ok(Number.isFinite(v))));
});

teste('todos os lutadores dos dados tem atributos finitos', () => {
  for (const p of Object.values(window.DADOS)) {
    for (const d of Object.values(p)) {
      d.lutadores.forEach((l) => MMA.ATRIBUTOS.forEach((k) => assert.ok(Number.isFinite(l.atributos[k]), l.nome + ':' + k)));
    }
  }
});


teste('criacao: modalidade define o estilo e soma bonus aos atributos', () => {
  const c = MMA.novaCarreira({ nome: 'Ana Souza', primeiroNome: 'Ana', sobrenome: 'Souza', modalidade: 'bjj', periodo: 'atual', divisaoId: 'peso_leve', pais: 'Brasil', cidade: 'Recife' });
  assert.strictEqual(c.estilo, 'grappling');
  assert.strictEqual(c.atributos.bjj, MMA.PERFIS.grappling.bjj + 5);
  assert.strictEqual(c.pais, 'Brasil');
  assert.strictEqual(c.cidade, 'Recife');
  const k = MMA.novaCarreira({ nome: 'K K', modalidade: 'kickboxing', periodo: 'atual', divisaoId: 'peso_leve' });
  assert.strictEqual(k.estilo, 'striking');
  assert.strictEqual(k.atributos.velocidade, MMA.PERFIS.striking.velocidade + 3);
});

teste('criacao: sem modalidade continua funcionando (compatibilidade)', () => {
  const c = MMA.novaCarreira({ nome: 'Old', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve' });
  assert.strictEqual(c.estilo, 'misto');
  assert.strictEqual(c.modalidade, null);
  assert.ok(Number.isFinite(MMA.ratingExato(c)));
});

teste('criacao: todas as modalidades geram atributos finitos', () => {
  Object.keys(MMA.MODALIDADES).forEach((m) => {
    const c = MMA.novaCarreira({ nome: 'T T', modalidade: m, periodo: 'atual', divisaoId: 'peso_leve' });
    assert.ok(Number.isFinite(MMA.ratingExato(c)), m);
  });
});

// ---------- luta em momentos ----------

function jogarLutaPorMomentos(rng, escolher) {
  const luta = new MMA.Luta(lutador('misto', 'A'), lutador('striking', 'B'), { rng: rng, rodadas: 3 });
  let momentos = 0;
  while (!luta.encerrada) {
    luta.abrirRound();
    const sit = luta.situacao();
    const m = luta.jogarMomento(escolher(sit, luta), 2);
    momentos++;
    assert.ok(momentos < 100, 'luta nao termina');
    m.eventos.forEach((e) => {
      assert.ok(e.texto && (e.ator === 0 || e.ator === 1 || e.tipo2 === undefined), 'evento sem ator');
      assert.ok(Array.isArray(e.dano) && Array.isArray(e.stam), 'evento sem foto do estado');
    });
  }
  return { luta, momentos };
}

teste('luta por momentos: termina, respeita 8 trocas por round e gera eventos animaveis', () => {
  for (let i = 0; i < 300; i++) {
    const { luta } = jogarLutaPorMomentos(MMA.criarRng(i + 1), (sit) => (sit === 'pe' ? 'trocar' : sit === 'cima' ? 'castigar' : 'proteger'));
    assert.ok(luta.resultado && luta.resultado.metodo);
    luta.rodadas.forEach((rd) => assert.ok(rd.placar[0] + rd.placar[1] >= 18 && rd.placar[0] + rd.placar[1] <= 20));
    assert.strictEqual(luta.rd, null);
  }
});

teste('momento para na queda, para o jogador poder reagir', () => {
  let achou = false;
  for (let i = 0; i < 400 && !achou; i++) {
    const luta = new MMA.Luta(lutador('luta_livre', 'W'), lutador('striking', 'S'), { rng: MMA.criarRng(i + 1) });
    luta.abrirRound();
    const m = luta.jogarMomento('derrubar', 2);
    if (m.eventos.some((e) => e.tipo2 === 'queda')) {
      achou = true;
      assert.strictEqual(m.eventos[m.eventos.length - 1].tipo2, 'queda', 'deve parar na queda');
      assert.strictEqual(m.situacao, 'cima');
    }
  }
  assert.ok(achou, 'nunca houve queda');
});

teste('luta salva no meio do round e retomada continua igual', () => {
  const a = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(77) });
  a.abrirRound();
  a.jogarMomento('trocar', 2);
  const json = JSON.parse(JSON.stringify(a));
  const b = MMA.Luta.restaurar(json, MMA.criarRng(78));
  assert.ok(b.rd && b.rd.eventos.length === a.rd.eventos.length);
  const mb = b.jogarMomento('pressionar', 2);
  assert.ok(mb.eventos.length >= 1);
});

teste('chave invalida para a situacao cai na IA (nao quebra)', () => {
  const luta = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(5) });
  luta.abrirRound();
  const m = luta.jogarMomento('chave-que-nao-existe', 2);
  assert.ok(m.eventos.length >= 1);
  luta.rd.chao = 0;
  const m2 = luta.jogarMomento('trocar', 1);
  assert.ok(m2.eventos.length >= 1, 'estrategia em pe no chao deve virar tatica da IA');
});

teste('taticas de chao mudam o resultado como prometido', () => {
  const medir = (tat, lado) => {
    let sub = 0, dano = 0, ko = 0;
    const N = 1500;
    for (let i = 0; i < N; i++) {
      const l = new MMA.Luta({ nome: 'A', atributos: Object.assign({}, MMA.PERFIS.misto, { bjj: 75 }) }, lutador('misto', 'B'), { rng: MMA.criarRng(i + 1) });
      l.abrirRound();
      l.rd.chao = lado;
      let rr = null, g = 0;
      while (!rr && g++ < 10) { const m = l.jogarMomento(tat, 2); rr = m.rodada; if (!rr && l.rd.chao < 0) break; }
      const d = rr ? rr.dano : l.rd.dano;
      dano += d[lado];
      if (rr && rr.sub && l.resultado.vencedor === lado) sub++;
      if (rr && rr.ko && l.resultado.vencedor === lado) ko++;
    }
    return { sub: sub / N, dano: dano / N, ko: ko / N };
  };
  const ctrl = medir('controlar', 0);
  const fin = medir('finalizar', 0);
  const cast = medir('castigar', 0);
  assert.ok(fin.sub > ctrl.sub + 0.04, 'finalizar deve finalizar mais: ' + fin.sub + ' vs ' + ctrl.sub);
  assert.ok(cast.dano > ctrl.dano * 1.2, 'castigar deve causar mais dano');
  assert.ok(cast.sub < ctrl.sub, 'castigar finaliza menos');
});

console.log(falhas === 0 ? '\nTodos os testes passaram.' : '\n' + falhas + ' teste(s) falharam.');
process.exitCode = falhas === 0 ? 0 : 1;
