// Gera js/data.js a partir de dados/ e de pesquisa/ (Wikipedia, via agentes).
//
// Calibragem v2 (formula documentada aqui; ajuste os pesos neste arquivo):
// - Cada atributo parte do perfil do estilo (PERFIS) e e substituido ou ajustado
//   pelo dado real quando ele existe. Sem dado real, o perfil do estilo fica.
// - striking:  KO em vitorias + alcance + precisao de golpes (se citada)
// - bjj:       finalizacoes em vitorias (menos as sofridas)
// - grappling: controle de chao, guiado pelas finalizacoes
// - defesa:    defesa de queda (se citada)
// - queixo:    derrotas por nocaute em relacao ao total de lutas
// - resistencia: vitorias por decisao (sinal de fôlego)
// - forca:     categoria + altura
// - qi:        experiencia (total de lutas)
// Lutadores com dado real ficam com provisoria: false.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..', 'dados');
const PESQUISA = path.join(__dirname, '..', 'pesquisa');
const SAIDA = path.join(__dirname, '..', 'js', 'data.js');

const DIVISOES_NOME = {
  peso_aberto: 'Peso Aberto',
  peso_pesado: 'Peso Pesado',
  peso_mosca: 'Peso Mosca',
  peso_galo: 'Peso Galo',
  peso_pena: 'Peso Pena',
  peso_leve: 'Peso Leve',
  peso_meio_medio: 'Peso Meio-Médio',
  peso_medio: 'Peso Médio',
  peso_meio_pesado: 'Peso Meio-Pesado',
};

const ORDEM = ['peso_mosca', 'peso_galo', 'peso_pena', 'peso_leve', 'peso_meio_medio', 'peso_medio', 'peso_meio_pesado', 'peso_pesado'];

const PERFIS = {
  striking: { forca: 62, velocidade: 72, resistencia: 60, queixo: 60, striking: 78, grappling: 40, bjj: 35, wrestling: 40, defesa: 66, qi: 60 },
  luta_livre: { forca: 70, velocidade: 58, resistencia: 66, queixo: 64, striking: 45, grappling: 55, bjj: 45, wrestling: 80, defesa: 62, qi: 60 },
  grappling: { forca: 62, velocidade: 60, resistencia: 64, queixo: 58, striking: 42, grappling: 82, bjj: 88, wrestling: 58, defesa: 60, qi: 66 },
  misto: { forca: 64, velocidade: 64, resistencia: 66, queixo: 62, striking: 64, grappling: 62, bjj: 60, wrestling: 62, defesa: 64, qi: 66 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

// Le todos os arquivos de pesquisa e indexa por nome.
function carregarPesquisa() {
  const mapa = {};
  if (!fs.existsSync(PESQUISA)) return mapa;
  for (const arq of fs.readdirSync(PESQUISA)) {
    if (!arq.endsWith('.json')) continue;
    const lista = JSON.parse(fs.readFileSync(path.join(PESQUISA, arq), 'utf8'));
    for (const p of lista) {
      if (p.encontrado) mapa[p.nome] = p;
    }
  }
  return mapa;
}

function calibrar(lutador, p, divIndex, periodo) {
  const base = PERFIS[lutador.estilo] || PERFIS.misto;
  const a = Object.assign({}, base);
  if (!p) return { attrs: a, provisoria: true };

  const v = num(p.vitorias) || 0;
  const d = num(p.derrotas) || 0;
  const total = v + d;
  // Dado ausente vira null (desconhecido), nunca zero.
  const proporcao = (campo) => (v > 0 && num(p[campo]) !== null ? p[campo] / v : null);
  const ko = proporcao('vitorias_ko');
  const sub = proporcao('vitorias_sub');
  const dec = proporcao('vitorias_dec');
  const precisao = num(p.precisao_golpes_pct);
  const defQueda = num(p.defesa_queda_pct);
  const alcance = num(p.alcance_cm);
  const altura = num(p.altura_cm);

  if (ko !== null) {
    let st = 45 + ko * 45;
    if (alcance !== null) st += clamp((alcance - 180) / 6, -6, 6);
    if (precisao !== null) st = 0.5 * st + 0.5 * (precisao * 1.2 + 10);
    a.striking = clamp(st, 20, 95);
  }
  // BJJ: finalizacoes em vitorias, descontando finalizacoes sofridas.
  const derrotaSub = d > 0 && num(p.derrotas_sub) !== null ? p.derrotas_sub / d : 0;
  if (sub !== null) {
    a.grappling = clamp(40 + sub * 60, 30, 95);
    a.bjj = clamp(35 + sub * 110 - derrotaSub * 20, 20, 95);
  }
  if (defQueda !== null) a.defesa = clamp(defQueda, 20, 95);
  if (total > 0) a.queixo = clamp(80 - ((num(p.derrotas_ko) || 0) / total) * 120, 30, 95);
  if (dec !== null) a.resistencia = clamp(50 + dec * 45, 35, 95);
  const alturaBonus = altura !== null ? clamp((altura - 178) / 6, -5, 5) : 0;
  a.forca = clamp((50 + divIndex * 5 + a.forca) / 2 + alturaBonus, 20, 95);
  if (ko !== null) a.velocidade = clamp(a.velocidade + ko * 8, 20, 95);
  a.qi = clamp(50 + Math.min(25, total / 2), 30, 95);

  const completo = ko !== null && sub !== null && dec !== null;
  return { attrs: a, provisoria: !completo };
}

// Fotos baixadas por tools/fetch-photos.js (com autor e licenca).
const CAMINHO_FOTOS = path.join(__dirname, '..', 'fotos', 'creditos.json');
const fotos = fs.existsSync(CAMINHO_FOTOS) ? JSON.parse(fs.readFileSync(CAMINHO_FOTOS, 'utf8')) : {};

const pesquisa = carregarPesquisa();
const dados = {};
let total = 0;
let reais = 0;
const semPesquisa = [];

for (const periodo of ['eras', 'auge', 'atual']) {
  dados[periodo] = {};
  const pasta = path.join(RAIZ, periodo);
  for (const arq of fs.readdirSync(pasta)) {
    if (!arq.endsWith('.json')) continue;
    const div = JSON.parse(fs.readFileSync(path.join(pasta, arq), 'utf8'));
    const divIndex = Math.max(0, ORDEM.indexOf(div.divisao));
    dados[periodo][div.divisao] = {
      id: div.divisao,
      nome: DIVISOES_NOME[div.divisao] || div.divisao,
      limiteKg: div.limite_kg,
      lutadores: div.lutadores.map((l) => {
        const p = pesquisa[l.nome] || null;
        const { attrs, provisoria } = calibrar(l, p, divIndex, periodo);
        total++;
        if (p) reais++; else semPesquisa.push(l.nome);
        return {
          nome: l.nome,
          lenda: !!l.lenda,
          estilo: l.estilo,
          nascimento_ano: p ? num(p.nascimento_ano) : null,
          altura_cm: p ? num(p.altura_cm) : null,
          alcance_cm: p ? num(p.alcance_cm) : null,
          atributos: attrs,
          provisoria: provisoria,
          fonte: p ? p.fonte : null,
          foto: fotos[l.nome] ? fotos[l.nome].arquivo : null,
          cartel: p ? { vitorias: num(p.vitorias), vitorias_ko: num(p.vitorias_ko), vitorias_sub: num(p.vitorias_sub), vitorias_dec: num(p.vitorias_dec), derrotas: num(p.derrotas), derrotas_ko: num(p.derrotas_ko), derrotas_sub: num(p.derrotas_sub) } : null,
          credito: fotos[l.nome] || null,
        };
      }),
    };
  }
}

const conteudo =
  '// Gerado por tools/build-data.js a partir de dados/ e pesquisa/. Nao editar a mao.\n' +
  'window.DADOS = ' + JSON.stringify(dados, null, 1) + ';\n';
fs.writeFileSync(SAIDA, conteudo, 'utf8');

console.log('data.js gerado: ' + total + ' entradas, ' + reais + ' com pesquisa real.');
if (semPesquisa.length) console.log('Sem pesquisa (perfil do estilo): ' + [...new Set(semPesquisa)].join(', '));
