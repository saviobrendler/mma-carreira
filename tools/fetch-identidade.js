// Coleta apelido e nacionalidade de cada lutador na caixa de informacoes da Wikipedia (texto bruto da pagina).
// Grava em pesquisa/identidade.json: { "Nome": { apelido, nacionalidade } }. Retoma de onde parou.
// Uso: node tools/fetch-identidade.js
const fs = require('fs');
const path = require('path');
const wiki = require('./wikiapi');

const RAIZ = path.join(__dirname, '..', '..', 'dados');
const SAIDA = path.join(__dirname, '..', 'pesquisa', 'identidade.json');
const TITULOS = fs.existsSync(path.join(__dirname, 'wiki-titulos.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'wiki-titulos.json'), 'utf8')) : {};

async function wikitext(titulo, prof) {
  const url = 'https://en.wikipedia.org/w/index.php?title=' + encodeURIComponent(titulo.replace(/ /g, '_')) + '&action=raw';
  const r = await wiki.pedir(url);
  if (!r || !r.ok) return null;
  const texto = await r.text();
  const red = texto.match(/^\s*#REDIRECT\s*\[\[([^\]|#]+)/i);
  if (red && (prof || 0) < 3) return wikitext(red[1].trim(), (prof || 0) + 1);
  return texto;
}
const ehLutador = (t) => /\{\{\s*Infobox martial artist/i.test(t) && /\|\s*mma_/i.test(t);
function campo(t, nome) {
  const m = t.match(new RegExp('^\\s*\\|\\s*' + nome + '\\s*=(.*)$', 'im'));
  return m ? m[1] : '';
}
// Tira refs, comentarios, wikilinks e templates simples.
function limpar(s) {
  return (s || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '')
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/''+/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function buscar(nome) {
  const base = TITULOS[nome] || nome;
  for (const c of [base, base + ' (fighter)', base + ' (mixed martial artist)']) {
    const t = await wikitext(c);
    if (t && ehLutador(t)) return t;
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
  const saida = fs.existsSync(SAIDA) ? JSON.parse(fs.readFileSync(SAIDA, 'utf8')) : {};
  const pend = [...nomes].filter((n) => !saida[n] || (!saida[n].apelido && !saida[n].conferido));
  console.log('pendentes:', pend.length);
  for (const nome of pend) {
    try {
      const t = await buscar(nome);
      if (!t) {
        saida[nome] = { apelido: null, nacionalidade: null, nota: 'sem pagina' };
        console.log('FALTA', nome);
      } else {
        const outros = limpar(campo(t, 'other_names')).split(/;|,| \/ /)[0].replace(/^["“”']+|["“”']+$/g, '').trim();
        const apelido = limpar(campo(t, 'nickname')).replace(/^["“”']+|["“”']+$/g, '') || (outros && outros.length < 28 ? outros : null);
        const nac = limpar(campo(t, 'nationality')) || limpar(campo(t, 'citizenship')) || null;
        const lugar = limpar(campo(t, 'birth_place')) || null;
        saida[nome] = { apelido: apelido, nacionalidade: nac, nascimento_local: lugar, conferido: true };
        console.log('ok  ', nome.padEnd(26), '|', apelido || '-', '|', nac || '-', '|', (lugar || '-').slice(0, 40));
      }
    } catch (e) {
      console.log('ERRO ', nome, e.message);
    }
    fs.writeFileSync(SAIDA, JSON.stringify(saida, null, 1) + '\n');
  }
  console.log('\nfim');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
