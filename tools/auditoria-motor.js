// Auditoria do motor: quanto o overall decide a luta e quanto o estilo importa.
global.window = global;
require('../js/data.js');
const MMA = require('../js/engine.js');
const dados = global.DADOS.atual;
const lutas = [];
const divs = Object.keys(dados);
for (const d of divs) {
  const l = dados[d].lutadores;
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) lutas.push([l[i], l[j]]);
}
const N = 40;
let total = 0, favoritoVence = 0, empates = 0;
const faixas = {};
const estiloContra = {};
const metodos = {};
let rounds = {};
for (const [a, b] of lutas) {
  const ra = MMA.ratingExato({ atributos: a.atributos });
  const rb = MMA.ratingExato({ atributos: b.atributos });
  const dif = Math.abs(ra - rb);
  const fav = ra >= rb ? 0 : 1;
  let vf = 0;
  for (let k = 0; k < N; k++) {
    const luta = new MMA.Luta({ nome: a.nome, atributos: a.atributos }, { nome: b.nome, atributos: b.atributos }, { rng: MMA.criarRng(k * 7919 + total), rodadas: 3 });
    const r = luta.simularCompleta();
    total++;
    if (r.vencedor === null) empates++;
    else if (r.vencedor === fav) vf++;
    const m = r.metodo.replace(/Decisão.*/, 'Decisão');
    metodos[m] = (metodos[m] || 0) + 1;
    rounds[r.round] = (rounds[r.round] || 0) + 1;
    const ea = a.estilo, eb = b.estilo;
    if (dif < 2.5 && ea !== eb) {
      const ka = ea + ' x ' + eb;
      const kb = eb + ' x ' + ea;
      const venceuA = r.vencedor === 0;
      const venceuB = r.vencedor === 1;
      estiloContra[ka] = estiloContra[ka] || { n: 0, v: 0 };
      estiloContra[kb] = estiloContra[kb] || { n: 0, v: 0 };
      estiloContra[ka].n++; estiloContra[kb].n++;
      if (venceuA) estiloContra[ka].v++;
      if (venceuB) estiloContra[kb].v++;
    }
  }
  favoritoVence += vf;
  const f = dif < 2 ? '0-2' : dif < 5 ? '2-5' : dif < 8 ? '5-8' : dif < 12 ? '8-12' : '12+';
  faixas[f] = faixas[f] || { n: 0, v: 0 };
  faixas[f].n += N; faixas[f].v += vf;
}
console.log('lutas simuladas', total, 'confrontos', lutas.length);
console.log('favorito (maior overall) vence:', (100 * favoritoVence / total).toFixed(1) + '%', '| empates', (100 * empates / total).toFixed(1) + '%');
console.log('por diferenca de overall:'); Object.entries(faixas).forEach(([k, v]) => console.log('  ', k.padEnd(5), (100 * v.v / v.n).toFixed(1) + '%', '(' + v.n + ')'));
console.log('metodos:', JSON.stringify(Object.fromEntries(Object.entries(metodos).map(([k, v]) => [k, (100 * v / total).toFixed(1) + '%']))));
console.log('rounds de termino:', JSON.stringify(Object.fromEntries(Object.entries(rounds).map(([k, v]) => [k, (100 * v / total).toFixed(1) + '%']))));
console.log('estilo contra estilo (overall parecido, % de vitorias do primeiro):');
Object.entries(estiloContra).sort().forEach(([k, v]) => console.log('  ', k.padEnd(26), (100 * v.v / v.n).toFixed(1) + '%', '(' + v.n + ')'));
