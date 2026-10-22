// Testes da carreira (camp, fama, rivalidade, tracos, academia) e simulador com bots.
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
  c.semFoco = true; // o camp dos testes comeca direto no plano de treino
  c.contrato.lutasRestantes = 9999; // contrato nao vence no meio dos testes
  return c;
};
let semente = 700; // as ofertas aceitas usam semente fixa: o teste nao depende de sorte
const aceitar = (c, i) => {
  const r = MMA.aceitarOferta(c, c.ofertas[i || 0].id, MMA.criarRng(semente++));
  assert.strictEqual(r.ok, true, r.motivo);
  return r;
};
// Resolve a etapa atual do camp (evento ou decisao) escolhendo a primeira opcao disponivel.
function passarEtapa(c, rng, escolha) {
  const et = MMA.etapaAtual(c);
  assert.ok(et, 'sem etapa');
  if (et.tipo === 'evento') {
    for (let i = 0; i < 2; i++) {
      const r = MMA.resolverEvento(c, i, rng);
      if (r.ok) return r;
    }
    throw new Error('evento sem opcao valida');
  }
  const ops = MMA.opcoesEtapa(c).filter((o) => o.ok !== false);
  const op = (escolha && ops.find((o) => escolha(o))) || ops[0];
  const r = MMA.decidirCamp(c, op.id, rng);
  assert.strictEqual(r.ok, true, r.motivo);
  return r;
}
function fazerCamp(c, rng, escolha) {
  let g = 0;
  while (MMA.etapaAtual(c) && g++ < 20) passarEtapa(c, rng, escolha);
  assert.ok(MMA.campConcluido(c));
}

// ---------- camp ----------

teste('etapas do camp: somam as semanas, terminam na coletiva e tem no maximo 2 eventos', () => {
  for (let n = 1; n <= 10; n++) {
    const e = MMA.gerarEtapas(n);
    assert.strictEqual(e.reduce((s, x) => s + x.semanas, 0), n, 'semanas de ' + n);
    assert.strictEqual(e[e.length - 1].tipo, 'coletiva');
    assert.ok(e.filter((x) => x.tipo === 'evento').length <= 2);
  }
  assert.deepStrictEqual(MMA.gerarEtapas(0), []);
});

teste('aceitar oferta marca a luta, cria o camp e NAO passa a semana', () => {
  const c = nova();
  const s0 = c.semana;
  const of = c.ofertas[0];
  const r = aceitar(c);
  assert.strictEqual(c.semana, s0);
  assert.strictEqual(r.semanas, Math.max(MMA.MIN_PREPARO, of.semanasAte));
  assert.ok(c.camp && c.camp.total === r.semanas && c.camp.i === 0);
  assert.ok(c.agendada.plano && c.agendada.plano.texto);
  assert.strictEqual(c.ofertas.length, 0);
});

teste('camp completo: cada etapa passa as semanas dela e termina no dia da luta', () => {
  const c = nova();
  aceitar(c);
  const alvo = c.agendada.semanaLuta;
  fazerCamp(c, MMA.criarRng(3));
  assert.strictEqual(c.semana, alvo, 'o camp deve terminar na semana da luta');
  assert.strictEqual(MMA.diaDeLuta(c), true);
  assert.ok(c.camp.historico.length === c.camp.etapas.length);
});

teste('evento do camp: bloqueia a decisao ate ser resolvido e depois fecha a etapa', () => {
  const c = nova();
  aceitar(c);
  const rng = MMA.criarRng(2);
  // chega ate a etapa de evento (ofertas de 5+ semanas tem evento)
  let g = 0;
  while (MMA.etapaAtual(c) && MMA.etapaAtual(c).tipo !== 'evento' && g++ < 10) passarEtapa(c, rng);
  if (!MMA.etapaAtual(c) || MMA.etapaAtual(c).tipo !== 'evento') return; // camp curto: sem evento
  assert.ok(c.evento, 'o evento deve estar sorteado');
  assert.strictEqual(MMA.decidirCamp(c, 'x').ok, false);
  const i0 = c.camp.i;
  assert.strictEqual(MMA.resolverEvento(c, 1, rng).ok, true);
  assert.strictEqual(c.camp.i, i0 + 1);
  assert.strictEqual(c.evento, null);
});

teste('atividade de treino (boxe): rola 2x, gasta energia, da bonus de luta e exige energia', () => {
  const c = nova();
  aceitar(c);
  c.tetos.striking = 99; c.tetos.defesa = 99;
  const ops = MMA.opcoesEtapa(c);
  const pesado = ops.find((o) => o.id === 'atv:boxe');
  assert.ok(pesado && pesado.custo > 0 && pesado.attr);
  const antes = c.atributos[pesado.attr];
  const e0 = c.energia;
  const r = MMA.decidirCamp(c, pesado.id, () => 0.01);
  assert.strictEqual(r.ok, true);
  assert.ok(c.atributos[pesado.attr] >= antes + 1, 'deve ter evoluido (rng baixo)');
  assert.ok(c.camp.efeitos.attr[pesado.attr] >= 2, 'bonus de luta');
  assert.ok(c.energia < e0 + 30, 'gastou energia');
  const d = nova();
  aceitar(d);
  d.energia = 20;
  const p2 = MMA.opcoesEtapa(d).find((o) => o.id === 'atv:boxe');
  assert.strictEqual(p2.ok, false);
  assert.strictEqual(MMA.decidirCamp(d, p2.id).ok, false);
});

teste('treino respeita o teto de potencial', () => {
  const c = nova();
  aceitar(c);
  const ops = MMA.opcoesEtapa(c);
  const pesado = ops.find((o) => o.id === 'atv:boxe');
  c.tetos[pesado.attr] = c.atributos[pesado.attr];
  const antes = c.atributos[pesado.attr];
  MMA.decidirCamp(c, pesado.id, () => 0.0);
  assert.strictEqual(c.atributos[pesado.attr], antes);
});

teste('scouting: estudar revela o plano e liga a leitura na luta', () => {
  const c = nova();
  aceitar(c);
  const rng = MMA.criarRng(4);
  passarEtapa(c, rng); // plano
  assert.strictEqual(MMA.etapaAtual(c).tipo, 'scouting');
  const r = MMA.decidirCamp(c, 'estudar', rng);
  assert.ok(r.linhas.join(' ').includes(c.agendada.plano.texto));
  assert.strictEqual(c.camp.efeitos.scout, true);
  fazerCamp(c, rng);
  const luta = MMA.prepararLuta(c, c.agendada.op, false, rng);
  assert.strictEqual(luta.leitura[0], true);
  assert.strictEqual(luta.plano.abre, c.agendada.plano.abre, 'a luta segue o plano mostrado');
});

teste('corte agressivo: bonus de atributo e menos folego na luta', () => {
  const mk = (id) => {
    const c = nova();
    aceitar(c);
    const rng = MMA.criarRng(5);
    while (MMA.etapaAtual(c).tipo !== 'corte') passarEtapa(c, rng);
    assert.strictEqual(MMA.decidirCamp(c, id, rng).ok, true);
    fazerCamp(c, rng);
    return MMA.prepararLuta(c, c.agendada.op, false, rng);
  };
  const seguro = mk('seguro');
  const agressivo = mk('agressivo');
  assert.ok(agressivo.f[0].stam < seguro.f[0].stam);
});

teste('coletiva: provocar e humilhar dao fama, rivalidade, bolsa maior e rival agressivo', () => {
  const rodar = (id) => {
    const c = nova();
    aceitar(c);
    const rng = MMA.criarRng(6);
    const bolsa = c.agendada.bolsa;
    while (MMA.etapaAtual(c).tipo !== 'coletiva') passarEtapa(c, rng);
    c.rivais = {}; // eventos do camp podem ter mexido na rivalidade
    const fama = c.fama;
    assert.strictEqual(MMA.decidirCamp(c, id, rng).ok, true);
    return { c: c, dFama: c.fama - fama, bolsa: c.agendada.bolsa / bolsa, heat: (c.rivais[c.agendada.op.nome] || {}).heat || 0, luta: MMA.prepararLuta(c, c.agendada.op, false, rng) };
  };
  const r0 = rodar('respeito');
  const r1 = rodar('provocar');
  const r2 = rodar('humilhar');
  assert.ok(r0.dFama > 0 && r1.dFama > r0.dFama && r2.dFama > r1.dFama);
  assert.ok(r0.heat === 0 && r1.heat === 1 && r2.heat === 2);
  assert.ok(r1.bolsa > 1.05 && r2.bolsa > r1.bolsa);
  assert.ok(r0.luta.provocacao === 0 && r1.luta.provocacao === 1 && r2.luta.provocacao === 2);
});

teste('descansar so quando nao ha luta marcada', () => {
  const c = nova();
  aceitar(c);
  assert.strictEqual(MMA.descansar(c).ok, false);
  const d = nova();
  assert.strictEqual(MMA.descansar(d, MMA.criarRng(1)).ok, true);
  assert.strictEqual(d.semana, 2);
});

teste('dia da luta bloqueia as decisoes do camp e a troca de categoria', () => {
  const c = nova();
  aceitar(c);
  fazerCamp(c, MMA.criarRng(8));
  assert.strictEqual(MMA.decidirCamp(c, 'seguro').ok, false);
  assert.strictEqual(MMA.mudarDivisao(c, 'peso_pena').ok, false);
  assert.strictEqual(MMA.descansar(c).ok, false);
});

teste('lesao no camp: chegar lesionado deixa lutar, com desvantagem', () => {
  const c = nova();
  aceitar(c);
  const rng = MMA.criarRng(9);
  while (MMA.etapaAtual(c) && MMA.etapaAtual(c).tipo !== 'coletiva') passarEtapa(c, rng);
  c.energia = 100; // com pouca energia as duas lutas ja comecam no minimo de folego
  c.lesao = null; // um evento do camp pode ter machucado antes: parte de um estado limpo
  const normal = JSON.parse(JSON.stringify(c)); // mesmo estado, sem lesao
  c.lesao = { nome: 'Entorse', semanas: 3 };
  passarEtapa(c, rng); // coletiva
  assert.strictEqual(c.camp.efeitos.lesionado, true);
  const luta = MMA.prepararLuta(c, c.agendada.op, false, rng);
  passarEtapa(normal, MMA.criarRng(9)); // mesma coletiva
  const ln = MMA.prepararLuta(normal, normal.agendada.op, false, rng);
  assert.ok(luta.f[0].stam < ln.f[0].stam, 'lesionado comeca com menos folego');
});

// ---------- fama ----------

teste('fama: niveis, progresso e aviso ao subir', () => {
  const c = nova();
  assert.strictEqual(MMA.nivelFama(c).nome, 'Desconhecido');
  MMA.ganharFama(c, 80);
  const f = MMA.nivelFama(c);
  assert.strictEqual(f.nome, 'Promessa');
  assert.ok(f.progresso >= 0 && f.progresso < 1);
  assert.ok(c.avisos.some((a) => /fama subiu/.test(a)));
  MMA.ganharFama(c, -999);
  assert.strictEqual(c.fama, 0);
  c.fama = 5000;
  assert.strictEqual(MMA.nivelFama(c).prox, null);
});

teste('showman ganha 25% mais fama', () => {
  const a = nova();
  const b = nova({ traco: 'showman' });
  MMA.ganharFama(a, 40);
  MMA.ganharFama(b, 40);
  assert.strictEqual(a.fama, 40);
  assert.strictEqual(b.fama, 50);
});

teste('fama maior aumenta a bolsa das ofertas', () => {
  const a = nova();
  const b = nova();
  b.fama = 900;
  const op = a.ofertas[0].op;
  assert.ok(MMA.nivelFama(b).nivel > MMA.nivelFama(a).nivel);
  b.ofertas = [];
  MMA.gerarOfertas(b, MMA.criarRng(1));
  const media = (c) => c.ofertas.reduce((s, o) => s + o.bolsa / (500 + o.op.rating * 8), 0) / c.ofertas.length;
  assert.ok(media(b) > media(a) * 1.3);
  void op;
});

teste('luta aplicada: vitoria da fama, derrota tira, e a bolsa nao some', () => {
  const resultado = (venceu) => {
    const c = nova();
    c.fama = 100;
    c.semDrop = -100; // sem recompensa rara aleatoria neste teste
    aceitar(c);
    fazerCamp(c, MMA.criarRng(10));
    c.fama = 100; // depois do camp: coletiva e eventos tambem mexem na fama
    const op = c.agendada.op;
    const luta = MMA.iniciarLutaAtiva(c, op, false, MMA.criarRng(11));
    luta.resultado = { vencedor: venceu ? 0 : 1, metodo: 'Decisão unânime', round: 3 };
    luta.totais = [29, 28];
    const r = MMA.aplicarLuta(c, op, luta, false, MMA.criarRng(12));
    return { c: c, r: r };
  };
  const v = resultado(true);
  const d = resultado(false);
  assert.ok(v.r.fama > 0 && v.c.fama > 100);
  assert.ok(d.r.fama < 0 && d.c.fama < 100);
  assert.ok(v.r.bolsa > d.r.bolsa);
  assert.strictEqual(v.c.camp, null);
  assert.ok(v.c.posLutaPendente && v.c.posLutaPendente.venceu === true);
});

// ---------- rivalidade e trash talk ----------

teste('perder para alguem cria rivalidade (revanche); vencer o rival esfria e rende fama', () => {
  const c = nova();
  c.semDrop = -100;
  aceitar(c);
  fazerCamp(c, MMA.criarRng(13));
  c.rivais = {}; // o camp pode ter provocado o rival: o teste parte de zero
  const op = c.agendada.op;
  const luta = MMA.iniciarLutaAtiva(c, op, false, MMA.criarRng(14));
  luta.resultado = { vencedor: 1, metodo: 'Nocaute', round: 1 };
  MMA.aplicarLuta(c, op, luta, false, MMA.criarRng(15));
  assert.ok(c.rivais[op.nome] && c.rivais[op.nome].heat === 1);
  // revanche: o rival entra nas ofertas
  c.lesao = null; c.evento = null;
  c.ofertas = [];
  MMA.gerarOfertas(c, MMA.criarRng(16));
  c.rivais[op.nome].heat = 2;
  c.ofertas = [];
  MMA.gerarOfertas(c, MMA.criarRng(17));
  const rivalOferta = c.ofertas.find((o) => o.op.nome === op.nome);
  assert.ok(rivalOferta && rivalOferta.rival === 2, 'rival quente deve aparecer nas ofertas');
  const comum = c.ofertas.find((o) => o.op.nome !== op.nome);
  if (comum) assert.ok(rivalOferta.bolsa / (500 + rivalOferta.op.rating * 8) > comum.bolsa / (500 + comum.op.rating * 8));
  MMA.aceitarOferta(c, rivalOferta.id, MMA.criarRng(21));
  fazerCamp(c, MMA.criarRng(18));
  c.rivais[op.nome].heat = 2; // eventos do camp podem ter mexido nisso
  const fama0 = c.fama;
  const l2 = MMA.iniciarLutaAtiva(c, c.agendada.op, false, MMA.criarRng(19));
  l2.resultado = { vencedor: 0, metodo: 'Decisão unânime', round: 3 };
  const r2 = MMA.aplicarLuta(c, op, l2, false, MMA.criarRng(20));
  assert.ok(c.fama - fama0 > 14, 'vencer o rival rende bonus de fama');
  assert.ok(!c.rivais[op.nome] || c.rivais[op.nome].heat === 1);
  assert.ok(r2.rivalidade);
});

teste('pos-luta: respeitar ou provocar muda fama e rivalidade', () => {
  const c = nova();
  c.posLutaPendente = { oponente: 'Fulano', venceu: true, titulo: false };
  const r = MMA.posLuta(c, 'quente');
  assert.strictEqual(r.ok, true);
  assert.ok(c.rivais.Fulano && c.rivais.Fulano.heat === 1);
  assert.strictEqual(c.posLutaPendente, null);
  assert.strictEqual(MMA.posLuta(c, 'respeito').ok, false);
  const d = nova();
  d.posLutaPendente = { oponente: 'Ciclano', venceu: true, titulo: false };
  MMA.posLuta(d, 'respeito');
  assert.ok(!d.rivais.Ciclano);
});

// ---------- tracos e assinaturas ----------

teste('tracos: 1 vaga no inicio, mais vagas com a fama; assinatura idem', () => {
  const c = nova();
  assert.strictEqual(MMA.slotsTracos(c), 1);
  assert.strictEqual(MMA.escolherTraco(c, 'nocauteador').ok, true);
  assert.strictEqual(MMA.escolherTraco(c, 'cardio').ok, false, 'sem vaga');
  c.fama = 480;
  assert.strictEqual(MMA.slotsTracos(c), 2);
  assert.strictEqual(MMA.escolherTraco(c, 'cardio').ok, true);
  assert.strictEqual(MMA.escolherTraco(c, 'cardio').ok, false, 'repetido');
  assert.strictEqual(MMA.escolherTraco(c, 'nao_existe').ok, false);
  assert.strictEqual(MMA.slotsAssinatura(c), 1);
  assert.strictEqual(MMA.escolherAssinatura(c, 'triangulo').ok, true);
  c.fama = 900;
  assert.strictEqual(MMA.slotsAssinatura(c), 2);
  assert.strictEqual(MMA.escolherAssinatura(c, 'double_leg').ok, true);
  assert.strictEqual(MMA.definirAssinaturaAtiva(c, 'double_leg').ok, true);
  assert.strictEqual(MMA.assinaturaEquipada(c).id, 'double_leg');
});

teste('criacao com traco e assinatura; luta usa os dois', () => {
  const c = nova({ traco: 'pressao', assinatura: 'gancho_esquerda' });
  assert.deepStrictEqual(c.tracos, ['pressao']);
  aceitar(c);
  fazerCamp(c, MMA.criarRng(21));
  const luta = MMA.prepararLuta(c, c.agendada.op, false, MMA.criarRng(1));
  assert.deepStrictEqual(luta.tracos[0], ['pressao']);
  assert.strictEqual(luta.assinatura[0].id, 'gancho_esquerda');
});

teste('sugestoes por modalidade existem e referenciam tracos e golpes validos', () => {
  Object.keys(MMA.MODALIDADES).forEach((m) => {
    const s = MMA.SUGESTOES_MODALIDADE[m];
    assert.ok(s, m);
    s.assinaturas.forEach((a) => assert.ok(MMA.ASSINATURAS[a], a));
    s.tracos.forEach((t) => assert.ok(MMA.TRACOS[t], t));
  });
});

// ---------- academia ----------

teste('academia: compra com dinheiro, sobe de nivel e para no maximo', () => {
  const c = nova();
  c.dinheiro = 100000;
  for (let i = 0; i < 3; i++) assert.strictEqual(MMA.comprarAcademia(c, 'ginasio').ok, true);
  assert.strictEqual(c.academia.ginasio, 3);
  assert.strictEqual(MMA.comprarAcademia(c, 'ginasio').ok, false);
  const pobre = nova();
  pobre.dinheiro = 10;
  const r = MMA.comprarAcademia(pobre, 'fisio');
  assert.strictEqual(r.ok, false);
  assert.ok(/Faltam/.test(r.motivo));
  assert.strictEqual(pobre.dinheiro, 10);
});

teste('academia: nutricao da mais energia por semana, fisio cura mais rapido, ginasio evolui mais', () => {
  const a = nova();
  const b = nova();
  b.academia = { nutri: 2 };
  a.energia = 50; b.energia = 50;
  MMA.virarSemana(a, MMA.criarRng(1));
  MMA.virarSemana(b, MMA.criarRng(1));
  assert.strictEqual(b.energia - a.energia, 6);
  const c = nova();
  c.academia = { fisio: 2 };
  c.lesao = { nome: 'Entorse', semanas: 3 };
  MMA.virarSemana(c, MMA.criarRng(1));
  assert.ok(c.lesao === null || c.lesao.semanas <= 1);
  const evo = (nivel) => {
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const d = nova();
      d.academia = { ginasio: nivel };
      d.atributos.striking = d.tetos.striking - 10;
      const antes = d.atributos.striking;
      aceitar(d);
      const pesado = MMA.opcoesEtapa(d).find((o) => o.id === 'atv:boxe');
      if (!pesado) { n += 0; continue; }
      MMA.decidirCamp(d, pesado.id, MMA.criarRng(i + 1));
      n += d.atributos.striking - antes;
    }
    return n;
  };
  assert.ok(evo(3) >= evo(0));
});

// ---------- migracao ----------

teste('save anterior (camp antigo, luta marcada sem camp, sem fama) e migrado', () => {
  const c = nova();
  aceitar(c);
  const velho = JSON.parse(JSON.stringify(c));
  delete velho.fama; delete velho.rivais; delete velho.tracos; delete velho.assinaturas; delete velho.academia;
  velho.camp = { tipo: 'finalizacao', semanas: 1 };
  velho.semana = c.semana + 2;
  delete velho.agendada.plano;
  const m = MMA.migrarCarreira(velho);
  assert.ok(Number.isFinite(m.fama) && m.rivais && Array.isArray(m.tracos) && m.academia);
  assert.ok(m.camp && Array.isArray(m.camp.etapas), 'ganha camp novo');
  assert.ok(m.agendada.plano && m.agendada.plano.texto);
  assert.strictEqual(m.camp.etapas.reduce((s, e) => s + e.semanas, 0), Math.max(0, m.agendada.semanaLuta - m.semana));
});

teste('save sem luta marcada e migrado e ganha ofertas', () => {
  const c = nova();
  const velho = JSON.parse(JSON.stringify(c));
  velho.ofertas = [];
  delete velho.camp;
  const m = MMA.migrarCarreira(velho);
  assert.ok(m.ofertas.length > 0);
});

// ---------- gerais ----------

teste('ofertas: ficam na mesa ate aceitar e voltam depois da luta', () => {
  const c = nova();
  const ids = c.ofertas.map((o) => o.id).join(',');
  for (let i = 0; i < 6; i++) MMA.descansar(c, MMA.criarRng(i));
  assert.strictEqual(c.ofertas.map((o) => o.id).join(','), ids);
  c.ofertas.forEach((o) => assert.ok(o.bolsa > 0 && o.semanasAte >= 4 && o.op && o.op.lutador));
});

teste('circuito: o ranking da IA muda e o campeao e o #1', () => {
  const c = nova();
  const antes = MMA.ranking(c).map((x) => x.nome + ':' + x.pontos).join('|');
  for (let i = 0; i < 12; i++) MMA.rodarCircuito(c, MMA.criarRng(i + 10));
  const depois = MMA.ranking(c).map((x) => x.nome + ':' + x.pontos).join('|');
  assert.notStrictEqual(antes, depois);
  assert.strictEqual(MMA.ranking(c)[0].nome, MMA.campeaoAtual(c));
});

teste('objetivo atual sempre existe e progresso fica entre 0 e 1', () => {
  const c = nova();
  for (let i = 0; i < 6; i++) {
    const o = MMA.objetivoAtual(c);
    assert.ok(o.titulo && o.progresso >= 0 && o.progresso <= 1, JSON.stringify(o));
    c.recorde.v += 2;
    c.pontos += 150;
    c.sequencia = 3;
    c.fama += 200;
  }
});

teste('avisos sao consumidos uma vez', () => {
  const c = nova();
  c.avisos = ['a', 'b'];
  assert.strictEqual(MMA.consumirAvisos(c).length, 2);
  assert.strictEqual(MMA.consumirAvisos(c).length, 0);
});

// ---------- simulador de carreiras ----------

function checarInvariantes(c, ctx) {
  const v = (x) => Number.isFinite(x);
  assert.ok(v(c.dinheiro) && c.dinheiro >= 0, 'dinheiro ' + c.dinheiro + ' ' + ctx);
  assert.ok(v(c.energia) && c.energia >= 0 && c.energia <= 100, 'energia ' + c.energia + ' ' + ctx);
  assert.ok(v(c.fama) && c.fama >= 0, 'fama ' + c.fama + ' ' + ctx);
  assert.ok(v(c.pontos) && c.pontos >= 0, 'pontos ' + c.pontos + ' ' + ctx);
  assert.ok(v(c.xp) && v(c.pontosDisponiveis) && c.pontosDisponiveis >= 0, 'xp/pts ' + ctx);
  MMA.ATRIBUTOS.forEach((k) => {
    assert.ok(v(c.atributos[k]), 'attr NaN ' + k + ' ' + ctx);
    assert.ok(c.atributos[k] <= c.tetos[k], 'attr acima do teto ' + k + ' ' + ctx);
  });
  assert.ok(v(MMA.ratingExato(c)), 'overall NaN ' + ctx);
  assert.ok(MMA.posicaoDoJogador(c) >= 1, 'posicao invalida ' + ctx);
  if (c.agendada) {
    assert.ok(c.ofertas.length === 0, 'oferta e agenda juntas ' + ctx);
    assert.ok(c.camp || c.lutaAtiva, 'luta marcada sem camp ' + ctx);
  } else {
    assert.ok(!c.camp, 'camp sem luta ' + ctx);
  }
  assert.ok(v(c.pontosHab) && c.pontosHab >= 0, 'pontosHab ' + c.pontosHab + ' ' + ctx);
  assert.strictEqual(new Set(c.habilidades).size, c.habilidades.length, 'habilidade repetida ' + ctx);
  Object.keys(MMA.RAMOS).forEach((ramo) => {
    const doRamo = c.habilidades.map((id) => MMA.HABILIDADES[id]).filter((h) => h.ramo === ramo);
    assert.ok(doRamo.filter((h) => h.tier === 2).length <= 1, 'dois caminhos no mesmo ramo ' + ctx);
  });
  assert.ok(c.habilidades.filter((id) => MMA.HABILIDADES[id].tier === 3).length <= 1, 'duas maestrias ' + ctx);
  assert.ok(c.meta === null || MMA.METAS[c.meta], 'meta invalida ' + ctx);
  assert.ok(v(c.semDrop) && v(c.finalizacoes) && c.finalizacoes <= c.recorde.v, 'drops/finalizacoes ' + ctx);
  if (c.lutaBonus) assert.ok(!c.agendada || c.agendada.bonus, 'luta-relampago pendente com outra luta marcada ' + ctx);
  assert.ok(c.tracos.length <= MMA.slotsTracos(c), 'tracos demais ' + ctx);
  assert.ok(c.assinaturas.length <= MMA.slotsAssinatura(c), 'assinaturas demais ' + ctx);
  Object.keys(c.rivais).forEach((n) => assert.ok(c.rivais[n].heat >= 1 && c.rivais[n].heat <= 3, 'heat ' + ctx));
  Object.keys(c.academia).forEach((k) => assert.ok(c.academia[k] >= 0 && c.academia[k] <= 3, 'academia ' + ctx));
  ['slots', 'fadiga', 'campPronto'].forEach((k) => assert.ok(!(k in c), 'campo removido voltou: ' + k));
}

// Joga a luta como um jogador: tatica por situacao, assinatura quando serve, conselho nos intervalos.
function lutarAgora(c, rng, esperto) {
  const ag = c.agendada;
  const titulo = ag.titulo;
  const op = ag.op;
  const luta = MMA.iniciarLutaAtiva(c, op, titulo, rng);
  const pe = ['pressionar', 'trocar', 'derrubar', 'cautela'];
  const cima = ['controlar', 'castigar', 'finalizar'];
  const baixo = ['escapar', 'proteger', 'guarda'];
  let g = 0;
  while (!luta.encerrada && g++ < 200) {
    luta.abrirRound();
    const sit = luta.situacao();
    const extra = MMA.desbloqueios(c);
    const lista = (sit === 'pe' ? pe.concat(extra.filter((x) => x !== 'raspar')) : sit === 'cima' ? cima : baixo.concat(extra.filter((x) => x === 'raspar')));
    let chave = lista[Math.floor(rng() * lista.length)];
    if (esperto && luta.assinaturaDisponivel(0) && rng() < 0.5) chave = 'assinatura';
    const m = luta.jogarMomento(chave, 2);
    if (m.rodada && !luta.encerrada) {
      const ops = luta.opcoesConselho(0).filter((o) => o.ok);
      assert.ok(luta.conselho(0, ops[Math.floor(rng() * ops.length)].id));
    }
  }
  assert.ok(luta.encerrada, 'luta nao terminou');
  const r = MMA.aplicarLuta(c, op, luta, titulo, rng);
  if (r.lesionou) assert.ok(c.lesao && c.lesao.semanas >= 1, 'lesao da luta sumiu na mesma semana');
  if (c.posLutaPendente && rng() < 0.5) MMA.posLuta(c, rng() < 0.5 ? 'quente' : 'respeito');
  return r;
}

function resolverEventoBot(c, rng) {
  if (c.negociacao) {
    // contrato acabou: o bot tenta negociar (as vezes) e assina uma proposta qualquer
    if (rng() < 0.5) MMA.negociarMais(c, rng);
    const ps = c.negociacao.propostas;
    assert.ok(MMA.assinarContrato(c, ps[Math.floor(rng() * ps.length)].id).ok, 'contrato nao assinou');
  }
  (c.ofertasPatrocinio || []).slice().forEach((o) => { if (rng() < 0.7) MMA.aceitarPatrocinio(c, o.id); else MMA.recusarPatrocinio(c, o.id); });
  if (c.imprevisto) {
    // imprevisto da semana da luta: o bot escolhe ao acaso entre lutar machucado e pedir adiamento
    const r0 = MMA.resolverImprevisto(c, rng() < 0.5 ? 'lutar' : 'adiar', rng);
    assert.ok(r0.ok, 'imprevisto nao resolveu');
  }
  if (!c.evento) return;
  const i0 = Math.floor(rng() * 2);
  let r = MMA.resolverEvento(c, i0, rng);
  if (!r.ok) r = MMA.resolverEvento(c, 1 - i0, rng); // sem dinheiro para uma opcao: tenta a outra
  assert.ok(r.ok, 'evento nao resolveu: ' + (r.motivo || ''));
}

function gerirCarreira(c, rng) {
  // vagas de traco e assinatura, pontos e academia
  const livresT = Object.keys(MMA.TRACOS).filter((t) => c.tracos.indexOf(t) < 0);
  while (MMA.tracosPendentes(c) > 0 && livresT.length) MMA.escolherTraco(c, livresT.shift());
  const livresA = Object.keys(MMA.ASSINATURAS).filter((t) => c.assinaturas.indexOf(t) < 0);
  while (MMA.assinaturasPendentes(c) > 0 && livresA.length) MMA.escolherAssinatura(c, livresA.shift());
  if (c.pontosDisponiveis > 0) {
    const k = MMA.ATRIBUTOS.filter((a) => c.atributos[a] < c.tetos[a])[0];
    if (k) MMA.distribuirPonto(c, k);
  }
  // habilidades e meta: escolhe ao acaso entre o que esta livre
  let g = 0;
  while (c.pontosHab > 0 && g++ < 5) {
    const livres = Object.keys(MMA.HABILIDADES).filter((h) => MMA.estadoHab(c, h).estado === 'livre');
    if (!livres.length) break;
    assert.ok(MMA.aprender(c, livres[Math.floor(rng() * livres.length)]).ok);
  }
  if (!c.meta) {
    const ms = MMA.metasDisponiveis(c).filter((m) => m.ok);
    if (ms.length) assert.ok(MMA.escolherMeta(c, ms[Math.floor(rng() * ms.length)].id).ok);
  }
  const ids = Object.keys(MMA.ACADEMIA);
  const id = ids[Math.floor(rng() * ids.length)];
  const custo = MMA.custoAcademia(c, id);
  if (custo !== null && c.dinheiro >= custo + 500) MMA.comprarAcademia(c, id);
}

const BOTS = {
  lutador(c, rng) {
    resolverEventoBot(c, rng);
    if (c.aposentado) return;
    gerirCarreira(c, rng);
    if (c.lutaAtiva || MMA.diaDeLuta(c)) return lutarAgora(c, rng, true);
    if (MMA.podeAposentar(c).ok) { MMA.aposentar(c); return; }
    if (c.agendada) {
      const et = MMA.etapaAtual(c);
      if (et.tipo === 'evento') return passarEtapa(c, rng);
      const ops = MMA.opcoesEtapa(c).filter((o) => o.ok !== false);
      const rec = ops.find((o) => o.recomendado) || ops[0];
      const r = MMA.decidirCamp(c, rec.id, rng);
      assert.ok(r.ok, r.motivo);
      return;
    }
    if (c.ofertas.length && !c.lesao) {
      const ord = c.ofertas.slice().sort((a, b) => (b.titulo ? 1 : 0) - (a.titulo ? 1 : 0) || a.op.rating - b.op.rating);
      assert.ok(MMA.aceitarOferta(c, ord[0].id, rng).ok);
      return;
    }
    const d = MMA.descansar(c, rng);
    assert.ok(d.ok, 'softlock: ' + d.motivo);
  },
  aleatorio(c, rng) {
    resolverEventoBot(c, rng);
    if (c.aposentado) return;
    if (c.lutaAtiva || MMA.diaDeLuta(c)) return lutarAgora(c, rng, false);
    if (c.agendada) {
      const et = MMA.etapaAtual(c);
      if (et.tipo === 'evento') return passarEtapa(c, rng);
      const ops = MMA.opcoesEtapa(c);
      const op = ops[Math.floor(rng() * ops.length)];
      const r = MMA.decidirCamp(c, op.id, rng);
      if (!r.ok) assert.ok(MMA.decidirCamp(c, ops.find((o) => o.ok !== false).id, rng).ok);
      return;
    }
    const x = Math.floor(rng() * 4);
    if (x === 0 && c.ofertas.length) { MMA.aceitarOferta(c, c.ofertas[Math.floor(rng() * c.ofertas.length)].id, rng); return; }
    if (x === 1) {
      const r = MMA.mudarDivisao(c, MMA.ORDEM_DIVISOES[Math.max(0, Math.min(7, MMA.ORDEM_DIVISOES.indexOf(c.divisaoId) + (rng() < 0.5 ? -1 : 1)))], rng);
      if (r.ok) return;
    }
    if (c.ofertas.length && !c.lesao && x === 2) { MMA.aceitarOferta(c, c.ofertas[0].id, rng); return; }
    const d = MMA.descansar(c, rng);
    assert.ok(d.ok || c.agendada, 'softlock aleatorio: ' + d.motivo);
  },
  // Nunca aceita lutas: so deixa o tempo passar.
  ocioso(c, rng) {
    resolverEventoBot(c, rng);
    const d = MMA.descansar(c, rng);
    assert.ok(d.ok, d.motivo);
  },
};

function simular(nomeBot, semente, semanas, periodo, divisaoId, estilo) {
  const rng = MMA.criarRng(semente);
  const c = MMA.novaCarreira({
    nome: 'Bot' + semente, estilo: estilo || 'misto', periodo: periodo || 'atual', divisaoId: divisaoId || 'peso_leve', rng,
    distribuicao: { striking: 4, wrestling: 4, defesa: 4 }, idade: 24, traco: 'cardio', assinatura: 'gancho_esquerda',
  });
  let semAvanco = 0;
  const alvo = c.semana + semanas;
  let passos = 0;
  while (c.semana < alvo && !c.aposentado) {
    const chave = () => JSON.stringify([c.semana, c.energia, c.recorde, !!c.agendada, !!c.lutaAtiva, c.camp ? c.camp.i : -1, !!c.evento, c.dinheiro]);
    const antes = chave();
    BOTS[nomeBot](c, rng);
    checarInvariantes(c, nomeBot + '#' + semente + ' semana ' + c.semana);
    semAvanco = antes === chave() ? semAvanco + 1 : 0;
    assert.ok(semAvanco < 10, 'travado: ' + nomeBot + '#' + semente + ' semana ' + c.semana);
    assert.ok(++passos < 20000, 'passos demais');
    if (passos % 15 === 0) {
      const volta = MMA.migrarCarreira(JSON.parse(JSON.stringify(c)));
      assert.strictEqual(volta.semana, c.semana);
      assert.strictEqual(!!volta.camp, !!c.camp);
    }
  }
  return c;
}

const resumo = (cs) => {
  const m = (f) => cs.reduce((s, c) => s + f(c), 0) / cs.length;
  return {
    n: cs.length,
    lutas: m((c) => c.recorde.v + c.recorde.d + c.recorde.e).toFixed(1),
    vitorias: m((c) => c.recorde.v).toFixed(1),
    overall: m((c) => MMA.ratingExato(c)).toFixed(1),
    pos: m((c) => MMA.posicaoDoJogador(c)).toFixed(1),
    titulos: m((c) => c.titulos).toFixed(2),
    campeoes: cs.filter((c) => c.campeao || c.titulos > 0).length,
    fama: Math.round(m((c) => c.fama)),
    nivelFama: m((c) => MMA.nivelFama(c).nivel).toFixed(1),
    dinheiro: Math.round(m((c) => c.dinheiro)),
    academia: m((c) => Object.values(c.academia).reduce((s, v) => s + v, 0)).toFixed(1),
    rivais: m((c) => Object.keys(c.rivais).length).toFixed(1),
    vitoriaPct: (100 * cs.reduce((s, c) => s + c.recorde.v, 0) / Math.max(1, cs.reduce((s, c) => s + c.recorde.v + c.recorde.d + c.recorde.e, 0))).toFixed(0) + '%',
    semanaTitulo: (() => { const x = cs.map((c) => (c.historico.find((h) => h.titulo && h.resultado === 'Vitória') || {}).semana).filter(Boolean); return x.length ? Math.round(x.reduce((a, b) => a + b, 0) / x.length) : null; })(),
    defesas: m((c) => c.defesasTotal || 0).toFixed(1),
  };
};

const resultados = {};
['lutador', 'aleatorio', 'ocioso'].forEach((bot) => {
  teste('simulador: ' + bot + ' (24 carreiras x 156 semanas) sem erros, NaN ou travas', () => {
    const lista = [];
    for (let s = 1; s <= 24; s++) {
      const p = ['atual', 'auge', 'eras'][s % 3];
      const div = p === 'eras' ? 'peso_aberto' : MMA.ORDEM_DIVISOES[s % 8];
      lista.push(simular(bot, s * 7919, 156, p, div, ['misto', 'striking', 'luta_livre', 'jiu_jitsu'][s % 4]));
    }
    resultados[bot] = resumo(lista);
  });
});

teste('carreira longa: o lutador envelhece, declina e consegue se aposentar no hall', () => {
  const c = simular('lutador', 4242, 900, 'atual', 'peso_meio_medio', 'striking');
  assert.strictEqual(c.aposentado, true, 'deveria ter aposentado, idade ' + MMA.idadeAtual(c));
  assert.ok(MMA.idadeAtual(c) >= 36);
  const h = MMA.entradaHall(c);
  assert.ok(h.nome && h.recorde.v > 0);
});

console.log('\nResumo dos bots (3 anos de jogo):');
Object.keys(resultados).forEach((k) => console.log(' ', k.padEnd(10), JSON.stringify(resultados[k])));

teste('equilibrio: quem nunca luta nao sobe nem ganha fama; quem luta progride', () => {
  const o = resultados.ocioso;
  const l = resultados.lutador;
  assert.ok(o && l, 'simulacao nao rodou');
  assert.strictEqual(Number(o.lutas), 0);
  assert.strictEqual(Number(o.fama), 0);
  assert.ok(Number(l.lutas) >= 12, 'lutador deveria lutar com regularidade: ' + l.lutas);
  assert.ok(Number(l.pos) < Number(o.pos));
  assert.ok(Number(l.fama) > 100, 'lutar deve render fama: ' + l.fama);
});

teste('equilibrio: o dinheiro tem destino (academia) e o titulo nao e garantido', () => {
  const l = resultados.lutador;
  assert.ok(Number(l.academia) >= 1, 'ninguem investiu na academia');
  assert.ok(l.campeoes >= 1, 'ninguem chegou ao titulo em 3 anos');
  assert.ok(l.campeoes < l.n, 'todos viraram campeoes: titulo facil demais');
});

teste('rivalidades aparecem em carreiras longas', () => {
  assert.ok(Number(resultados.lutador.rivais) > 0, 'nenhuma rivalidade surgiu');
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes do mundo passaram.');
process.exit(falhas ? 1 : 0);
