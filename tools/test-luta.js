// Testes da luta mais funda: juizes, cortes, assinatura, corner, leitura do rival e tracos.
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

teste('juizes: tres cartoes por round de decisao e decisao coerente com os votos', () => {
  let decisoes = 0;
  for (let i = 0; i < 400; i++) {
    const l = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(i + 1) });
    const r = l.simularCompleta();
    if (!/^Decisão/.test(r.metodo)) continue;
    decisoes++;
    l.rodadas.forEach((rd) => {
      assert.strictEqual(rd.juizes.length, 3);
      rd.juizes.forEach((c) => assert.ok(c[0] + c[1] >= 18 && c[0] + c[1] <= 20));
    });
    const des = l.vitoriasRodada[0] > l.vitoriasRodada[1] ? 0 : l.vitoriasRodada[1] > l.vitoriasRodada[0] ? 1 : null;
    const votos = l.cartoes.map((c) => (c[0] > c[1] ? 0 : c[1] > c[0] ? 1 : des));
    const votosA = votos.filter((v) => v === 0).length;
    const votosB = votos.filter((v) => v === 1).length;
    if (votosA >= 2) assert.strictEqual(r.vencedor, 0, 'maioria A mas venceu outro');
    if (votosB >= 2) assert.strictEqual(r.vencedor, 1, 'maioria B mas venceu outro');
    if (r.metodo === 'Decisão unânime') assert.ok(votosA === 3 || votosB === 3);
    if (r.metodo === 'Decisão dividida') assert.ok(votosA >= 1 && votosB >= 1);
  }
  assert.ok(decisoes > 100);
});

teste('cortes: aparecem em golpes fortes e podem encerrar a luta por parada medica', () => {
  let cortes = 0;
  let medicos = 0;
  for (let i = 0; i < 2500; i++) {
    const l = new MMA.Luta(lutador('striking', 'A'), lutador('striking', 'B'), { rng: MMA.criarRng(i + 1) });
    const r = l.simularCompleta();
    if (l.f[0].corte + l.f[1].corte > 0) cortes++;
    assert.ok(l.f[0].corte <= 2 && l.f[1].corte <= 2);
    if (r.detalhe === 'parada médica') {
      medicos++;
      assert.strictEqual(r.metodo, 'Nocaute');
    }
  }
  assert.ok(cortes > 50, 'poucos cortes: ' + cortes);
  assert.ok(medicos >= 1, 'nenhuma parada medica em 2500 lutas');
  console.log('     cortes em', cortes, 'lutas; paradas medicas:', medicos);
});

teste('assinatura: uma vez por round, so quando serve para a situacao', () => {
  const l = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(3), assinaturaA: { id: 'triangulo', nome: 'Triângulo', tipo: 'finalizacao' } });
  l.abrirRound();
  assert.strictEqual(l.assinaturaDisponivel(0), false, 'finalizacao nao serve em pe');
  l.rd.chao = 0;
  assert.strictEqual(l.assinaturaDisponivel(0), true);
  l.rd.chao = 1;
  assert.strictEqual(l.assinaturaDisponivel(0), true, 'da guarda serve');
  const m = l.jogarMomento('assinatura', 2);
  assert.ok(m.eventos.length >= 1);
  const l2 = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(4), assinaturaA: { id: 'gancho_esquerda', nome: 'Gancho de esquerda', tipo: 'golpe' } });
  l2.abrirRound();
  assert.strictEqual(l2.assinaturaDisponivel(0), true);
  l2.jogarMomento('assinatura', 2);
  if (l2.rd) assert.strictEqual(l2.assinaturaDisponivel(0), false, 'so uma vez por round');
});

teste('assinatura de golpe nao rende menos dano que trocar', () => {
  const medir = (chave) => {
    let dano = 0;
    const N = 1500;
    for (let i = 0; i < N; i++) {
      const l = new MMA.Luta(lutador('striking', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(i + 1), assinaturaA: { id: 'gancho_esquerda', nome: 'Gancho de esquerda', tipo: 'golpe' } });
      l.abrirRound();
      l.jogarMomento(chave, 1);
      dano += l.rd ? l.rd.dano[0] : l.rodadas[0].dano[0];
    }
    return dano / N;
  };
  assert.ok(medir('assinatura') > medir('trocar') * 0.9);
});

teste('plano do rival: gerado, serializado e revelado so com leitura', () => {
  const l = new MMA.Luta(lutador('luta_livre', 'W'), lutador('luta_livre', 'B'), { rng: MMA.criarRng(9) });
  assert.ok(l.plano && l.plano.abre && l.plano.texto.length > 10);
  l.abrirRound();
  assert.strictEqual(l.leituraRival(), null, 'sem scouting nao ha leitura');
  const l2 = new MMA.Luta(lutador('misto', 'A'), lutador('luta_livre', 'B'), { rng: MMA.criarRng(9), scoutA: true });
  l2.abrirRound();
  const lei = l2.leituraRival();
  assert.ok(lei && lei.texto);
  const rest = MMA.Luta.restaurar(JSON.parse(JSON.stringify(l2)), MMA.criarRng(1));
  assert.strictEqual(rest.plano.abre, l2.plano.abre);
  assert.strictEqual(rest.leitura[0], true);
});

teste('o rival abre o round seguindo o plano (em maioria)', () => {
  let segue = 0;
  let total = 0;
  for (let i = 0; i < 300; i++) {
    const l = new MMA.Luta(lutador('misto', 'A'), lutador('luta_livre', 'B'), { rng: MMA.criarRng(i + 1) });
    l.abrirRound();
    for (let k = 0; k < 20; k++) {
      total++;
      if (l.taticaIA(1) === l.plano.abre) segue++;
    }
  }
  assert.ok(segue / total > 0.55, 'plano pouco seguido: ' + segue / total);
});

teste('conselho do corner: um por intervalo, cada opcao faz o que promete', () => {
  const l = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(5) });
  l.f[0].stam = 50;
  assert.strictEqual(l.conselho(0, 'folego'), true);
  assert.strictEqual(l.f[0].stam, 68);
  assert.strictEqual(l.conselho(0, 'plano'), false, 'so um conselho por intervalo');
  l.conselhoUsado = false;
  const antes = l.f[0].attr.striking;
  assert.strictEqual(l.conselho(0, 'plano'), true);
  assert.strictEqual(l.f[0].attr.striking, antes + 4);
  l.rodarRound(['trocar', null]);
  assert.strictEqual(l.f[0].attr.striking, antes, 'o ajuste vale so 1 round');
  if (l.encerrada) return;
  l.f[0].corte = 2;
  l.conselhoUsado = false;
  assert.strictEqual(l.conselho(0, 'corte'), true);
  assert.strictEqual(l.f[0].corte, 1);
  l.conselhoUsado = false;
  assert.strictEqual(l.conselho(0, 'leitura'), true);
  assert.strictEqual(l.leitura[0], true);
  assert.strictEqual(l.opcoesConselho(0).find((o) => o.id === 'leitura').ok, false);
});

teste('tracos mudam a luta: nocauteador bate mais forte, queixo de aco aguenta mais', () => {
  const rodar = (tracos) => {
    let d = 0;
    let koPro = 0;
    let koContra = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const l = new MMA.Luta(lutador('striking', 'A'), lutador('striking', 'B'), { rng: MMA.criarRng(i + 1), tracosA: tracos });
      const r = l.simularCompleta();
      d += l.f[1].dano;
      if (r.metodo === 'Nocaute' && r.vencedor === 0) koPro++;
      if (r.metodo === 'Nocaute' && r.vencedor === 1) koContra++;
    }
    return { d: d / N, koPro: koPro / N, koContra: koContra / N };
  };
  const base = rodar([]);
  const noc = rodar(['nocauteador']);
  assert.ok(noc.koPro > base.koPro, 'nocauteador nao fez diferenca');
  assert.ok(rodar(['queixo_de_aco']).koContra < base.koContra, 'queixo de aco nao protegeu');
});

teste('cautela defende melhor: o atacante acerta menos contra quem esta em cautela', () => {
  const acertos = (defesa) => {
    let a = 0;
    const N = 1500;
    for (let i = 0; i < N; i++) {
      const l = new MMA.Luta(lutador('striking', 'A'), lutador('striking', 'B'), { rng: MMA.criarRng(i + 1) });
      l.abrirRound();
      for (let k = 0; k < 3 && !l.rodadas.length; k++) l.jogarMomento('trocar', 2, defesa);
      a += l.estatisticas[0].acertos;
    }
    return a / N;
  };
  assert.ok(acertos('cautela') < acertos('trocar'), 'cautela deveria reduzir os acertos do rival');
});

teste('luta salva por versao anterior (round sem ass/exp, sem cartoes) continua jogavel', () => {
  const l = new MMA.Luta(lutador('misto', 'A'), lutador('misto', 'B'), { rng: MMA.criarRng(3) });
  l.abrirRound();
  l.jogarMomento('trocar', 1);
  const velho = JSON.parse(JSON.stringify(l));
  ['cartoes', 'tracos', 'assinatura', 'provocacao', 'leitura', 'plano', 'buff', 'conselhoUsado'].forEach((k) => delete velho[k]);
  delete velho.rd.ass; delete velho.rd.exp; delete velho.rd.medico;
  velho.f.forEach((x) => delete x.corte);
  const r = MMA.Luta.restaurar(velho, MMA.criarRng(4));
  let g = 0;
  while (!r.encerrada && g++ < 60) r.jogarMomento('trocar', 2);
  assert.ok(r.encerrada);
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes da luta passaram.');
process.exit(falhas ? 1 : 0);
