// Gera varios saves (campeao, torneio, contrato vencido, lesao grave, camp no inicio) em _saves.json para conferir as telas no navegador.
global.window = global;
const path = require('path');
require(path.join(process.cwd(), 'js', 'data.js'));
const MMA = require(path.join(process.cwd(), 'js', 'engine.js'));
const out = {};
const base = (periodo, div, seed, extra) => {
  const c = MMA.novaCarreira(Object.assign({ nome: 'Rafael Duarte', primeiroNome: 'Rafael', sobrenome: 'Duarte', apelido: 'O Trovão', pais: 'Brasil', cidade: 'Recife', estilo: 'misto', modalidade: 'mma', periodo, divisaoId: div, rng: MMA.criarRng(seed) }, extra || {}));
  c.semImprevistos = true;
  return c;
};
const camp = (c, rng) => { let g = 0; while (MMA.etapaAtual(c) && g++ < 30) { if (MMA.etapaAtual(c).tipo === 'evento') MMA.resolverEvento(c, 0, rng); else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng); } };

// 1) campeao com ofertas (manutencao, ex-campeao, superluta)
{
  const c = base('atual', 'peso_leve', 3);
  Object.keys(c.atributos).forEach((k) => { c.atributos[k] = 92; c.tetos[k] = 95; });
  c.pontos = 9000; c.sequencia = 3; c.recorde = { v: 5, d: 0, e: 0 }; c.semana = 30; c.semDrop = -100;
  const rng = MMA.criarRng(9);
  MMA.gerarOfertas(c, rng);
  MMA.aceitarOferta(c, c.ofertas.find((o) => o.titulo).id, rng);
  camp(c, rng);
  const a = c.agendada;
  const luta = MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
  luta.resultado = { vencedor: 0, metodo: 'Nocaute', round: 2, tempo: '1:30' };
  MMA.aplicarLuta(c, a.op, luta, a.titulo, rng);
  c.fama = 400; c.ofertas = []; c.ultimaSuperluta = -99;
  for (let i = 0; i < 40 && !c.ofertas.some((o) => o.superluta); i++) { c.ofertas = []; MMA.gerarOfertas(c, MMA.criarRng(i)); }
  c.imprevisto = null;
  out.campeao = c;
}
// 2) Era das Lendas: torneio aceito, camp pronto
{
  const c = base('eras', 'peso_aberto', 5);
  const rng = MMA.criarRng(1);
  let t = null;
  for (let i = 0; i < 60 && !t; i++) { c.ofertas = []; c.semana += 15; MMA.gerarOfertas(c, MMA.criarRng(100 + i)); t = c.ofertas.find((o) => o.torneio); }
  MMA.aceitarOferta(c, t.id, rng);
  camp(c, rng);
  out.torneio = c;
}
// 3) contrato vencido + proposta de patrocinio
{
  const c = base('atual', 'peso_leve', 7);
  c.fama = 320; c.semDrop = -100; c.contrato.lutasRestantes = 1;
  const rng = MMA.criarRng(2);
  for (let i = 0; i < 60 && !c.ofertasPatrocinio.length; i++) { c.energia = 100; MMA.descansar(c, rng); }
  c.negociacao = null;
  MMA.aceitarOferta(c, c.ofertas[0].id, rng);
  camp(c, rng);
  const a = c.agendada;
  const luta = MMA.iniciarLutaAtiva(c, a.op, a.titulo, rng);
  luta.resultado = { vencedor: 0, metodo: 'Finalização', round: 1, tempo: '3:00' };
  MMA.aplicarLuta(c, a.op, luta, a.titulo, rng);
  c.ofertasPatrocinio = c.ofertasPatrocinio.length ? c.ofertasPatrocinio : [{ id: 'px', marca: 'Vortex Energy', setor: 'Bebida energética', pagamento: 900, tipo: 'vitoria', extra: 0.6, condicao: 'Paga um bônus extra de 60% quando você vence.', lutas: 4, lutasRestantes: 0, semana: c.semana }];
  out.negocios = c;
}
// 4) lesao grave pendente
{
  const c = base('atual', 'peso_leve', 9);
  c.historico.push({ resultado: 'Vitória', oponente: 'X', metodo: 'Nocaute', round: 1, semana: 3 });
  c.lesao = { nome: 'Ruptura de ligamento do joelho', semanas: 10, grave: true, historia: 'Seu joelho cedeu em um treino de queda e o médico viu a ruptura no exame.' };
  c.ofertas = [];
  c.decisaoLesao = { nome: c.lesao.nome, historia: c.lesao.historia, semanas: 10, opcoes: [{ id: 'operar', rotulo: 'Operar', resumo: 'Recuperação mais longa (+3 semanas), mas cura de vez e pode voltar mais forte.' }, { id: 'tratar', rotulo: 'Tratar sem cirurgia', resumo: 'Volta no prazo normal, com 40% de chance de a lesão voltar e deixar uma sequela.' }] };
  out.lesao = c;
}
// 5) camp recem aceito (etapa de foco) em 8 semanas
{
  const c = base('auge', 'peso_leve', 11);
  c.semFoco = false;
  const rng = MMA.criarRng(3);
  MMA.aceitarOferta(c, c.ofertas[0].id, rng);
  out.foco = c;
}
// 6) aposentavel com hall
{
  const c = base('atual', 'peso_leve', 13);
  c.titulos = 3; c.defesasTotal = 4; c.recorde = { v: 24, d: 4, e: 0 }; c.titulosPor = { 'atual|peso_leve': true };
  for (let i = 0; i < 24; i++) c.historico.push({ resultado: 'Vitória', metodo: i % 2 ? 'Nocaute' : 'Decisão unânime', round: 2, tempo: '1:20', oponente: 'Rival ' + i, semana: i * 6 + 1, titulo: i % 8 === 7 });
  for (let i = 0; i < 4; i++) c.historico.push({ resultado: 'Derrota', metodo: 'Decisão unânime', round: 3, oponente: 'Algoz ' + i, semana: 200 + i });
  c.idadeInicial = 40; c.semana = 300; c.sequencia = 3;
  out.veterano = c;
}
require('fs').writeFileSync(path.join(process.cwd(), '_saves.json'), JSON.stringify(out));
console.log(Object.keys(out).join(', '));
