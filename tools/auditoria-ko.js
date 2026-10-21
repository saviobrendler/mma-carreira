global.window = global;
const path = require('path');
require(path.join(process.cwd(), 'js', 'data.js'));
const MMA = require(path.join(process.cwd(), 'js', 'engine.js'));
const rng = MMA.criarRng(11);
let n = 0, ko = 0, sub = 0, dec = 0;
const danos = [], rounds = {};
for (const div of MMA.ORDEM_DIVISOES) {
  const L = window.DADOS.atual[div].lutadores;
  for (let i = 0; i < 400; i++) {
    const a = L[Math.floor(rng() * L.length)], b = L[Math.floor(rng() * L.length)];
    if (a === b) continue;
    const luta = new MMA.Luta(a, b, { rodadas: 3, rng: MMA.criarRng(77 + i) });
    luta.simularCompleta({ auto: false });
    n++;
    const r = luta.resultado;
    if (r.metodo === 'Nocaute') {
      ko++;
      const perdedor = 1 - r.vencedor;
      danos.push(MMA.vidaPct(luta.f[perdedor]));
      rounds[r.round] = (rounds[r.round] || 0) + 1;
    } else if (r.metodo === 'Finalização') sub++; else dec++;
  }
}
danos.sort((x, y) => x - y);
const vida = danos.map((v) => 100 - v);
console.log('lutas', n, 'KO', (100 * ko / n).toFixed(1) + '%', 'sub', (100 * sub / n).toFixed(1) + '%', 'dec', (100 * dec / n).toFixed(1) + '%');
const q = (p) => vida[Math.floor(vida.length * p)];
console.log('dano acumulado (%) do nocauteado: quantis 5/10/25/50/75/90:', [0.05, 0.1, 0.25, 0.5, 0.75, 0.9].map(q).join(' '));
console.log('KO por round', JSON.stringify(rounds));
console.log('KO com dano acumulado < 10%:', (100 * vida.filter((v) => v < 10).length / vida.length).toFixed(1) + '%', ' < 20%:', (100 * vida.filter((v) => v < 20).length / vida.length).toFixed(1) + '%');
