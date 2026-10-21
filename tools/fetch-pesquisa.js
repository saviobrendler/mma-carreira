// Coleta o cartel (vitorias/derrotas por metodo), altura, alcance e ano de nascimento dos lutadores
// que ainda nao tem pesquisa, lendo a caixa de informacoes (Infobox martial artist) da Wikipedia.
// Usa o texto bruto da pagina (index.php?action=raw). Grava em pesquisa/novos.json. Retoma de onde parou.
// Uso: node tools/fetch-pesquisa.js
const fs = require('fs');
const path = require('path');
const wiki = require('./wikiapi');

const RAIZ = path.join(__dirname, '..', '..', 'dados');
const PESQUISA = path.join(__dirname, '..', 'pesquisa');
const SAIDA = path.join(PESQUISA, 'novos.json');
const TITULOS = fs.existsSync(path.join(__dirname, 'wiki-titulos.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'wiki-titulos.json'), 'utf8')) : {};

async function wikitext(titulo, profundidade) {
  const url = 'https://en.wikipedia.org/w/index.php?title=' + encodeURIComponent(titulo.replace(/ /g, '_')) + '&action=raw';
  const r = await wiki.pedir(url);
  if (!r || !r.ok) return null;
  const texto = await r.text();
  const red = texto.match(/^\s*#REDIRECT\s*\[\[([^\]|#]+)/i);
  if (red && (profundidade || 0) < 3) return wikitext(red[1].trim(), (profundidade || 0) + 1);
  return { titulo: titulo, texto: texto };
}

const infoboxOk = (t) => /\{\{\s*Infobox martial artist/i.test(t) && /\|\s*mma_(ko|sub|dec)_win\s*=/i.test(t);

function linha(texto, campo) {
  const m = texto.match(new RegExp('^\\s*\\|\\s*' + campo + '\\s*=(.*)$', 'im'));
  return m ? m[1] : '';
}
const inteiro = (s) => {
  const m = (s || '').replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};
const arred = (x) => Math.round(x * 10) / 10;

// Altura e alcance: cm direto, ft/in ou polegadas. Devolve cm.
function comprimento(s, ehAlcance) {
  if (!s) return null;
  let m = s.match(/(\d{3}(?:\.\d+)?)\s*(?:cm|\|cm)/i);
  if (m) return parseFloat(m[1]);
  m = s.match(/\{\{\s*(?:convert|cvt)\s*\|\s*(\d)\s*\|\s*ft\s*\|\s*(\d{1,2})(?:\.\d+)?\s*\|\s*in/i);
  if (m) return arred(parseInt(m[1], 10) * 30.48 + parseFloat(m[2]) * 2.54);
  m = s.match(/\{\{\s*(?:height|hgt)\s*\|[^}]*?ft\s*=\s*(\d)[^}]*?in\s*=\s*(\d{1,2})/i);
  if (m) return arred(parseInt(m[1], 10) * 30.48 + parseFloat(m[2]) * 2.54);
  m = s.match(/(\d)\s*(?:ft|′|')\s*(\d{1,2})\s*(?:in|″|")/i);
  if (m) return arred(parseInt(m[1], 10) * 30.48 + parseFloat(m[2]) * 2.54);
  m = s.match(/(?:convert|cvt)\s*\|\s*(\d{2,3}(?:\.\d+)?)\s*\|\s*in/i);
  if (m) return arred(parseFloat(m[1]) * 2.54);
  m = s.match(/(1\.\d{2})\s*(?:m\b|\|m)/i);
  if (m) return arred(parseFloat(m[1]) * 100);
  m = s.match(/(\d{2,3}(?:\.\d+)?)\s*in\b/i);
  if (m && ehAlcance) return arred(parseFloat(m[1]) * 2.54);
  return null;
}

// Nome do arquivo da foto principal na caixa de informacoes ("File:" e colchetes removidos).
function arquivoImagem(s) {
  let v = (s || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '').trim();
  const m = v.match(/\[\[\s*(?:File|Image|Arquivo):([^|\]]+)/i);
  if (m) v = m[1];
  v = v.replace(/^(?:File|Image):/i, '').trim();
  return /\.(jpe?g|png|webp|gif)$/i.test(v) ? v : null;
}

function interpretar(nome, achado) {
  const t = achado.texto;
  const n = (c) => inteiro(linha(t, c));
  const ko = n('mma_ko_win') || 0;
  const sub = n('mma_sub_win') || 0;
  const dec = n('mma_dec_win') || 0;
  const dq = n('mma_dq_win') || 0;
  const kol = n('mma_ko_loss') || 0;
  const subl = n('mma_sub_loss') || 0;
  const decl = n('mma_dec_loss') || 0;
  const dql = n('mma_dq_loss') || 0;
  const nasc = (linha(t, 'birth_date').match(/(1[89]\d{2}|20\d{2})/) || [])[1];
  const v = ko + sub + dec + dq;
  const d = kol + subl + decl + dql;
  return {
    nome: nome,
    encontrado: v > 0,
    altura_cm: comprimento(linha(t, 'height'), false),
    alcance_cm: comprimento(linha(t, 'reach'), true),
    nascimento_ano: nasc ? parseInt(nasc, 10) : null,
    vitorias: v,
    vitorias_ko: ko,
    vitorias_sub: sub,
    vitorias_dec: dec,
    derrotas: d,
    derrotas_ko: kol,
    derrotas_sub: subl,
    precisao_golpes_pct: null,
    defesa_queda_pct: null,
    imagem: arquivoImagem(linha(t, 'image')),
    fonte: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(achado.titulo.replace(/ /g, '_')),
    observacao: 'Caixa de informacoes da Wikipedia (' + achado.titulo + ').',
  };
}

async function buscar(nome) {
  const base = TITULOS[nome] || nome;
  for (const c of [base, base + ' (fighter)', base + ' (mixed martial artist)']) {
    const w = await wikitext(c);
    if (w && infoboxOk(w.texto)) return w;
  }
  return null;
}

async function main() {
  const nomes = new Set();
  for (const p of ['eras', 'auge', 'atual']) {
    for (const f of fs.readdirSync(path.join(RAIZ, p))) {
      JSON.parse(fs.readFileSync(path.join(RAIZ, p, f), 'utf8')).lutadores.forEach((l) => nomes.add(l.nome));
    }
  }
  const tem = new Set();
  for (const f of fs.readdirSync(PESQUISA)) {
    if (!f.endsWith('.json') || f === 'novos.json') continue;
    JSON.parse(fs.readFileSync(path.join(PESQUISA, f), 'utf8')).forEach((x) => { if (x.encontrado) tem.add(x.nome); });
  }
  const feitos = fs.existsSync(SAIDA) ? JSON.parse(fs.readFileSync(SAIDA, 'utf8')) : [];
  const jaFeito = new Set(feitos.filter((x) => x.encontrado).map((x) => x.nome));
  const pendentes = [...nomes].filter((n) => !tem.has(n) && !jaFeito.has(n));
  console.log('pendentes:', pendentes.length);
  const saida = feitos.filter((x) => x.encontrado);
  const falhou = [];
  for (const nome of pendentes) {
    try {
      const w = await buscar(nome);
      const r = w ? interpretar(nome, w) : null;
      if (r && r.encontrado) {
        saida.push(r);
        console.log('ok  ', nome.padEnd(26), r.vitorias + '-' + r.derrotas, 'KO', r.vitorias_ko, 'SUB', r.vitorias_sub, 'DEC', r.vitorias_dec, 'alt', r.altura_cm, 'alc', r.alcance_cm, 'nasc', r.nascimento_ano);
      } else {
        falhou.push(nome);
        console.log('FALTA', nome);
      }
    } catch (e) {
      falhou.push(nome);
      console.log('ERRO ', nome, e.message);
    }
    fs.writeFileSync(SAIDA, JSON.stringify(saida, null, 1) + '\n');
  }
  console.log('\nsem dados:', falhou.length ? falhou.join(', ') : 'nenhum');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
