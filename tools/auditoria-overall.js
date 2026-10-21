global.window = global;
const path = require('path');
require(path.join(process.cwd(), 'js', 'data.js'));
const MMA = require(path.join(process.cwd(), 'js', 'engine.js'));
const rng = MMA.criarRng(31);
const buckets = { '0-2': [0, 0], '2-4': [0, 0], '4-6': [0, 0], '6-9': [0, 0], '9+': [0, 0] };
const estilosVence = {};
for (const per of ['atual', 'auge']) {
  for (const div of MMA.ORDEM_DIVISOES) {
    const L = window.DADOS[per][div].lutadores;
    for (let i = 0; i < 500; i++) {
      const a = L[Math.floor(rng() * L.length)], b = L[Math.floor(rng() * L.length)];
      if (a === b) continue;
      const ra = MMA.ratingExato(a), rb = MMA.ratingExato(b);
      const [fav, zaz] = ra >= rb ? [a, b] : [b, a];
      const dif = Math.abs(ra - rb);
      const luta = new MMA.Luta(fav, zaz, { rodadas: 3, rng: MMA.criarRng(i * 7 + 3) });
      luta.simularCompleta();
      const k = dif < 2 ? '0-2' : dif < 4 ? '2-4' : dif < 6 ? '4-6' : dif < 9 ? '6-9' : '9+';
      buckets[k][1]++;
      if (luta.resultado.vencedor === 0) buckets[k][0]++;
    }
  }
}
Object.entries(buckets).forEach(([k, [v, n]]) => console.log('diferenca de overall ' + k + ': favorito vence ' + (100 * v / n).toFixed(0) + '% (n=' + n + ')'));
