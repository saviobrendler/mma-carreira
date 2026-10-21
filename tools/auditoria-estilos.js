// Estilo contra estilo com os perfis-base (mesmo overall aproximado). Mostra vitorias e como a luta acontece.
global.window = global;
require('../js/data.js');
const MMA = require('../js/engine.js');
const P = MMA.PERFIS;
const pares = [['striking', 'luta_livre'], ['luta_livre', 'grappling'], ['grappling', 'striking'], ['misto', 'striking'], ['misto', 'luta_livre'], ['misto', 'grappling'], ['striking', 'striking'], ['luta_livre', 'luta_livre']];
const N = 3000;
console.log('overall:', Object.keys(P).map((k) => k + ' ' + MMA.ratingExato({ atributos: P[k] }).toFixed(1)).join(' | '));
for (const [ea, eb] of pares) {
  let v = 0, ko = 0, sub = 0, dec = 0, qOk = 0, qTent = 0, chaoA = 0, chaoB = 0, rounds = 0, dA = 0, dB = 0;
  for (let i = 0; i < N; i++) {
    const l = new MMA.Luta({ nome: 'A', atributos: P[ea] }, { nome: 'B', atributos: P[eb] }, { rng: MMA.criarRng(i * 31 + 7), rodadas: 3 });
    const r = l.simularCompleta();
    if (r.vencedor === 0) v++;
    if (r.metodo === 'Nocaute') ko++;
    else if (r.metodo === 'Finalização') sub++;
    else dec++;
    qOk += l.estatisticas[0].quedasOk + l.estatisticas[1].quedasOk;
    qTent += l.estatisticas[0].quedasTent + l.estatisticas[1].quedasTent;
    chaoA += l.estatisticas[0].chaoTempo; chaoB += l.estatisticas[1].chaoTempo;
    rounds += l.rodadas.length;
    dA += l.f[1].dano; dB += l.f[0].dano;
  }
  console.log((ea + ' x ' + eb).padEnd(24), 'A vence', (100 * v / N).toFixed(1) + '%', '| KO', (100 * ko / N).toFixed(0) + '% SUB', (100 * sub / N).toFixed(0) + '% DEC', (100 * dec / N).toFixed(0) + '%', '| quedas ok/tent por luta', (qOk / N).toFixed(1), '/', (qTent / N).toFixed(1), '| chao A', (chaoA / N).toFixed(1), 'chao B', (chaoB / N).toFixed(1), '| dano A→B', (dA / N).toFixed(0), 'B→A', (dB / N).toFixed(0));
}
