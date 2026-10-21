global.window = global;
require(require('path').join(process.cwd(), 'js', 'data.js'));
const MMA = require(require('path').join(process.cwd(), 'js', 'engine.js'));
const rng = MMA.criarRng(5);
const all = [];
MMA.ORDEM_DIVISOES.forEach((div) => {
  const L = window.DADOS.atual[div].lutadores;
  for (let i = 0; i < 250; i++) {
    const a = L[Math.floor(rng() * L.length)], b = L[Math.floor(rng() * L.length)];
    if (a === b) continue;
    const luta = new MMA.Luta(a, b, { rodadas: 3, rng: MMA.criarRng(1000 + i) });
    luta.simularCompleta({ auto: false });
    luta.rodadas.forEach((r) => all.push(r));
  }
});
const dec = all.filter((r) => !r.ko && !r.sub);
const c = { '10-8': 0, '10-9': 0, '10-10': 0 };
dec.forEach((r) => { const m = Math.max(r.placar[0], r.placar[1]), n = Math.min(r.placar[0], r.placar[1]); c[m + '-' + n] = (c[m + '-' + n] || 0) + 1; });
console.log('rounds sem finalizacao:', dec.length, c);
console.log('10-8 %', (100 * (c['10-8'] || 0) / dec.length).toFixed(1));
const df = dec.map((r) => Math.abs(r.dano[0] - r.dano[1])).sort((x, y) => x - y);
const q = (p) => df[Math.floor(df.length * p)].toFixed(1);
console.log('|diff dano| quartis 25/50/75/90/95/99:', q(0.25), q(0.5), q(0.75), q(0.9), q(0.95), q(0.99));
const D = dec.map((r) => {
  const e = r.est;
  return Math.abs(r.dano[0] - r.dano[1] + (r.ctrl[0] - r.ctrl[1]) * 1.5 + (e[0].quedasOk - e[1].quedasOk) * 2.2 + (e[0].subTent - e[1].subTent) * 0.35 + (e[0].acertos - e[1].acertos) * 0.25);
}).sort((x, y) => x - y);
const qq = (p) => D[Math.floor(D.length * p)].toFixed(1);
console.log('|diff total| quantis 2/5/10/25/50/75/90/95/97/99:', [0.02, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.97, 0.99].map(qq).join(' '));
