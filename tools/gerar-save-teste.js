// Gera um save v2 com uma luta de titulo no dia da luta (so para teste manual no navegador).
global.window = global;
const path = require('path');
require(path.join(process.cwd(), 'js', 'data.js'));
const MMA = require(path.join(process.cwd(), 'js', 'engine.js'));
const periodo = process.argv[2] || 'atual';
const div = process.argv[3] || 'peso_leve';
const c = MMA.novaCarreira({ nome: 'Rafael Duarte', primeiroNome: 'Rafael', sobrenome: 'Duarte', apelido: 'O Trovão', pais: 'Brasil', cidade: 'Recife', estilo: 'misto', modalidade: 'mma', periodo, divisaoId: periodo === 'eras' ? 'peso_aberto' : div, rng: MMA.criarRng(3) });
Object.keys(c.atributos).forEach((k) => { c.atributos[k] = 99; c.tetos[k] = 99; });
c.pontos = 9000; c.sequencia = 3; c.recorde = { v: 5, d: 0, e: 0 };
c.semana = 30;
const rng = MMA.criarRng(9);
MMA.gerarOfertas(c, rng);
const t = c.ofertas.find((o) => o.titulo) || c.ofertas[0];
console.log('oferta titulo?', !!t.titulo, t.op.nome);
const r = MMA.aceitarOferta(c, t.id, rng);
console.log('aceitar', r.ok);
let g = 0;
while (MMA.etapaAtual(c) && g++ < 20) {
  const et = MMA.etapaAtual(c);
  if (et.tipo === 'evento') MMA.resolverEvento(c, 0, rng); else MMA.decidirCamp(c, MMA.opcoesEtapa(c).filter((o) => o.ok !== false)[0].id, rng);
}
console.log('dia de luta', MMA.diaDeLuta(c), 'titulo', c.agendada.titulo);
require('fs').writeFileSync(path.join(process.cwd(), '_save-titulo.json'), JSON.stringify(c));
