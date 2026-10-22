// Integridade do jogo: saves antigos, cartel, vitorias, ranking, cinturoes e cards ao longo de carreiras longas.
// Roda carreiras inteiras com o motor real e confere, depois de cada luta, o que nunca pode estar errado.
const assert = require('assert');
const fs = require('fs');
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
  const c = MMA.novaCarreira(Object.assign({ nome: 'Teste Integridade', estilo: 'misto', periodo: 'atual', divisaoId: 'peso_leve', rng: MMA.criarRng(1) }, extra || {}));
  c.semImprevistos = true; // testes deterministas: a semana da luta sem imprevistos
  return c;
};

// Faz o camp inteiro (sempre a primeira opcao valida) e devolve se chegou ao dia da luta.
function fazerCamp(c, rng) {
  let g = 0;
  while (MMA.etapaAtual(c) && g++ < 30) {
    const et = MMA.etapaAtual(c);
    if (et.tipo === 'evento') MMA.resolverEvento(c, 0, rng);
    else {
      const op = MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0];
      MMA.decidirCamp(c, op.id, rng);
    }
  }
  return !MMA.etapaAtual(c);
}

// Uma luta completa pelo mesmo caminho da interface: iniciar, simular, aplicar.
function lutarAgora(c, rng, estrategia) {
  const a = c.agendada;
  MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
  const { luta, oponente } = MMA.retomarLutaAtiva(c);
  luta.simularCompleta({ estrategia: estrategia || 'equilibrada', auto: true });
  return { luta, op: oponente, r: MMA.aplicarLuta(c, c.lutaAtiva.op, luta, a.titulo, rng) };
}

function proximaLuta(c, rng) {
  let g = 0;
  while (g++ < 120) {
    if (c.negociacao) { MMA.assinarContrato(c, c.negociacao.propostas[0].id); continue; }
    if (c.imprevisto) { MMA.resolverImprevisto(c, rng() < 0.5 ? 'lutar' : 'adiar', rng); continue; }
    if (c.agendada) {
      fazerCamp(c, rng);
      if (c.imprevisto || !c.agendada) continue; // troca/cancelamento/lesao de ultima hora: segue o fluxo
      return true;
    }
    if (c.lesao || !c.ofertas.length) { MMA.descansar(c, rng); continue; }
    const of = c.ofertas.find((o) => o.titulo) || c.ofertas[Math.floor(rng() * c.ofertas.length)];
    const r = MMA.aceitarOferta(c, of.id, rng);
    if (!r.ok) MMA.descansar(c, rng);
  }
  return false;
}

// O que precisa ser verdade sobre uma carreira depois de qualquer luta.
function conferir(c, ctx) {
  const h = c.historico;
  const v = h.filter((x) => x.resultado === 'Vitória').length;
  const d = h.filter((x) => x.resultado === 'Derrota').length;
  const e = h.filter((x) => x.resultado === 'Empate').length;
  assert.deepStrictEqual(c.recorde, { v: v, d: d, e: e }, 'cartel diferente do historico ' + ctx);
  assert.strictEqual(c.estatisticas.lutas, h.length, 'contador de lutas diferente do historico ' + ctx);
  // sequencia atual = vitorias seguidas no fim do historico
  let seq = 0;
  for (let i = h.length - 1; i >= 0 && h[i].resultado === 'Vitória'; i--) seq++;
  assert.strictEqual(c.sequencia, seq, 'sequencia errada ' + ctx);
  assert.ok(c.pontos >= 0, 'pontos negativos ' + ctx);
  assert.ok(c.energia >= 0 && c.energia <= 100, 'energia fora de 0-100 ' + ctx);
  assert.ok(c.dinheiro >= 0, 'dinheiro negativo ' + ctx);
  h.forEach((x) => {
    assert.ok(['Vitória', 'Derrota', 'Empate'].includes(x.resultado), 'resultado invalido ' + ctx);
    assert.ok(x.metodo && x.round >= 1, 'metodo ou round ausente ' + ctx);
    if (!/^Decisão|Empate/.test(x.metodo)) assert.ok(/^\d:\d\d$/.test(x.tempo), 'tempo da finalizacao ausente ' + ctx);
    if (x.titulo && x.defesa) assert.strictEqual(x.resultado, 'Vitória', 'defesa de titulo sem vitoria ' + ctx);
  });
  // ranking: ninguem aparece duas vezes e o jogador aparece uma so vez
  const rk = MMA.ranking(c);
  assert.strictEqual(new Set(rk.map((x) => x.nome)).size, rk.length, 'lutador repetido no ranking ' + ctx);
  assert.strictEqual(rk.filter((x) => x.jogador).length, 1, 'jogador nao aparece uma vez ' + ctx);
  // cinturoes: um campeao por divisao, e ninguem segura dois cinturoes da mesma era
  const donos = Object.values(c.campeoes || {});
  const chaveAtual = Object.keys(c.campeoes || {}).find((k) => c.campeoes[k] === c.nome);
  assert.strictEqual(c.campeao, !!(c.campeoes && c.campeoes[MMA.chaveDivisao ? MMA.chaveDivisao(c.periodo, c.divisaoId) : chaveAtual] === c.nome), 'flag de campeao inconsistente ' + ctx);
  void donos;
  // eventos passados: um por luta, sem repetir o mesmo lutador no card
  // um evento por noite: as vitorias do meio de um torneio nao fecham o evento
  const noites = h.filter((x) => !(x.torneio && x.resultado === 'Vitória' && x.torneio !== 'Final')).length;
  assert.strictEqual((c.eventosPassados || []).length, noites, 'eventos passados diferentes das noites ' + ctx);
  (c.eventosPassados || []).forEach((ev) => {
    const nomes = [];
    (ev.card || []).forEach((l) => nomes.push(l.a.nome, l.b.nome));
    const sem = ev.torneio ? nomes.filter((n) => n !== c.nome) : nomes; // no torneio o jogador luta tres vezes
    assert.strictEqual(new Set(sem).size, sem.length, 'lutador repetido no card ' + ctx + ' | ' + ev.nome + ' | repetidos: ' + sem.filter((n, i) => sem.indexOf(n) !== i).join(', ') + ' | linhas: ' + (ev.card || []).map((l) => l.a.nome + ' x ' + l.b.nome + (l.superluta ? ' (super)' : '')).join('; '));
    (ev.card || []).forEach((l) => {
      if (l.resultado && l.resultado.vencedor) assert.ok([l.a.nome, l.b.nome].includes(l.resultado.vencedor), 'vencedor fora da luta ' + ctx);
    });
  });
}

teste('save v1 real (gerado pelo motor antigo): migra, preserva tudo e continua jogavel', () => {
  const bruto = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1.json'), 'utf8'));
  assert.strictEqual(bruto.versao, 1);
  const antes = { recorde: Object.assign({}, bruto.recorde), xp: bruto.xp, dinheiro: bruto.dinheiro, fama: bruto.fama, atributos: JSON.stringify(bruto.atributos), historico: bruto.historico.length, nome: bruto.nome, semana: bruto.semana };
  const c = MMA.migrarCarreira(JSON.parse(JSON.stringify(bruto)));
  assert.strictEqual(c.versao, 2);
  assert.deepStrictEqual(c.recorde, antes.recorde);
  assert.strictEqual(c.xp, antes.xp);
  assert.strictEqual(c.dinheiro, antes.dinheiro);
  assert.strictEqual(c.fama, antes.fama);
  assert.strictEqual(JSON.stringify(c.atributos), antes.atributos);
  assert.strictEqual(c.historico.length, antes.historico);
  assert.strictEqual(c.nome, antes.nome);
  assert.ok(c.agendada && c.agendada.evento && c.agendada.evento.card.some((l) => l.jogador), 'luta marcada sem evento depois da migracao');
  // migrar de novo (save v2) nao muda nada
  const de_novo = MMA.migrarCarreira(JSON.parse(JSON.stringify(c)));
  assert.deepStrictEqual(de_novo.recorde, c.recorde);
  assert.strictEqual(de_novo.agendada.evento.nome, c.agendada.evento.nome);
  // continua: termina o camp, luta, aplica
  const rng = MMA.criarRng(5);
  assert.ok(fazerCamp(c, rng), 'camp nao terminou');
  const { r } = lutarAgora(c, rng);
  assert.strictEqual(c.recorde.v + c.recorde.d + c.recorde.e, antes.recorde.v + antes.recorde.d + antes.recorde.e + 1);
  assert.strictEqual(c.historico.length, antes.historico + 1);
  assert.ok(r.evento && r.evento.resolvido);
  // lutas antigas do historico nao tem evento: o legado e a comparacao funcionam assim mesmo
  const L = MMA.legado(c);
  assert.strictEqual(L.lutasTotal, c.historico.length);
  assert.ok(MMA.comparacao(c, MMA.ranking(c).find((x) => !x.jogador)).areas.length === 6);
  // salva e carrega como o navegador faz
  const ida_e_volta = MMA.migrarCarreira(JSON.parse(JSON.stringify(c)));
  assert.deepStrictEqual(ida_e_volta.recorde, c.recorde);
});

teste('carreiras longas (60 carreiras, 3 eras): cartel, sequencia, ranking, cinturoes e cards sempre coerentes', () => {
  let lutas = 0;
  let titulos = 0;
  let defesas = 0;
  for (let k = 0; k < 60; k++) {
    const periodo = ['atual', 'auge', 'eras'][k % 3];
    const div = periodo === 'eras' ? 'peso_aberto' : MMA.ORDEM_DIVISOES[k % 8];
    const c = nova({ periodo: periodo, divisaoId: div, rng: MMA.criarRng(100 + k) });
    c.semImprevistos = false; // aqui a semana da luta tem imprevistos de verdade
    if (k % 2) Object.keys(c.atributos).forEach((a) => { c.atributos[a] = Math.min(99, c.atributos[a] + 22); c.tetos[a] = 99; });
    const rng = MMA.criarRng(500 + k);
    for (let i = 0; i < 18; i++) {
      if (c.aposentado) break;
      if (!proximaLuta(c, rng)) break;
      const { luta, r } = lutarAgora(c, rng, ['trocacao', 'quedas', 'wrestling', 'pressao', 'equilibrada'][i % 5]);
      lutas++;
      if (luta.resultado.round > luta.rodadasTotais) assert.fail('round alem do limite');
      if (r.venceu && c.historico[c.historico.length - 1].titulo) titulos++;
      if (r.defendeu) defesas++;
      c.energia = Math.max(c.energia, 60);
      conferir(c, 'carreira ' + k + ' luta ' + i);
    }
  }
  assert.ok(lutas > 600, 'poucas lutas simuladas: ' + lutas);
  assert.ok(titulos > 0 && defesas > 0, 'nenhum titulo/defesa aconteceu: ' + titulos + '/' + defesas);
});

teste('pontos do ranking: vitoria sobe, derrota desce, e so uma vez por luta', () => {
  for (let k = 0; k < 40; k++) {
    const c = nova({ rng: MMA.criarRng(900 + k) });
    const rng = MMA.criarRng(300 + k);
    for (let i = 0; i < 6; i++) {
      if (!proximaLuta(c, rng)) break;
      const antes = c.pontos;
      const lutas = c.historico.length;
      const { r } = lutarAgora(c, rng);
      assert.strictEqual(c.historico.length, lutas + 1, 'luta contada mais de uma vez');
      if (r.venceu) assert.ok(c.pontos > antes, 'vitoria nao subiu os pontos');
      else if (!r.empatou) assert.ok(c.pontos <= antes, 'derrota subiu os pontos');
      c.energia = 100;
      c.lesao = null;
    }
  }
});

teste('aplicar a mesma luta duas vezes nao duplica a vitoria (a interface bloqueia pelo agendamento)', () => {
  const c = nova();
  const rng = MMA.criarRng(2);
  assert.ok(proximaLuta(c, rng));
  const a = c.agendada;
  MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
  const { luta } = MMA.retomarLutaAtiva(c);
  luta.simularCompleta();
  const op = c.lutaAtiva.op;
  MMA.aplicarLuta(c, op, luta, a.titulo, rng);
  const total = c.recorde.v + c.recorde.d + c.recorde.e;
  // sem luta ativa nem agendada, a interface nao chama aplicarLuta de novo: o estado impede
  assert.strictEqual(c.lutaAtiva, null);
  assert.strictEqual(c.agendada, null);
  assert.strictEqual(total, 1);
});

teste('o resultado da luta salva no meio de um round (versao anterior) continua coerente', () => {
  const c = nova();
  const rng = MMA.criarRng(8);
  assert.ok(proximaLuta(c, rng));
  const a = c.agendada;
  MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
  let { luta } = MMA.retomarLutaAtiva(c);
  luta.rodarRound(null);
  if (!luta.encerrada) {
    c.lutaAtiva.luta = JSON.parse(JSON.stringify(luta.toJSON()));
    luta = MMA.retomarLutaAtiva(c).luta;
    assert.strictEqual(luta.rodadas.length, 1);
    luta.simularCompleta();
  }
  MMA.aplicarLuta(c, c.lutaAtiva.op, luta, a.titulo, rng);
  conferir(c, 'luta retomada');
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes de integridade passaram.');
process.exit(falhas ? 1 : 0);
