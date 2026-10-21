// Baixa a foto principal de cada lutador da Wikipedia (inglesa) e da Wikimedia Commons.
// So aceita imagens com licenca aberta (dominio publico ou Creative Commons / GFDL).
// Grava em fotos/ e um creditos.json com autor, licenca e link da pagina de origem.
// Uso: node tools/fetch-photos.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..', 'dados');
const SAIDA = path.join(__dirname, '..', 'fotos');
const UA = 'MMA-Carreira-beta/1.0 (projeto pessoal; contato via usuario local)';
const API = 'https://en.wikipedia.org/w/api.php';
const LICENCA_OK = /public domain|^pd|cc[ -]?by|cc0|gfdl|creative commons/i;

const TITULOS = fs.existsSync(path.join(__dirname, 'wiki-titulos.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'wiki-titulos.json'), 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const wiki = require('./wikiapi');
const api = (params) => wiki.api(API, params);

const semHtml = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// Tenta o nome puro e os sufixos usados para desambiguar lutadores.
async function arquivoPrincipal(nome) {
  const base = TITULOS[nome] || nome;
  for (const t of [base, base + ' (fighter)', base + ' (mixed martial artist)']) {
    const j = await api({ action: 'query', titles: t, prop: 'pageimages', piprop: 'name', redirects: '1' });
    const p = j.query.pages[0];
    if (!p || p.missing) continue;
    if (p.pageimage) return { pagina: p.title, arquivo: p.pageimage };
  }
  return null;
}

async function infoLicenca(arquivo) {
  const j = await api({ action: 'query', titles: 'File:' + arquivo, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '480' });
  const ii = j.query.pages[0] && j.query.pages[0].imageinfo && j.query.pages[0].imageinfo[0];
  if (!ii) return null;
  const m = ii.extmetadata || {};
  return {
    miniatura: ii.thumburl,
    paginaArquivo: ii.descriptionurl,
    licenca: m.LicenseShortName ? m.LicenseShortName.value : '',
    licencaUrl: m.LicenseUrl ? m.LicenseUrl.value : '',
    autor: semHtml(m.Artist ? m.Artist.value : ''),
  };
}

// Busca direta na Wikimedia Commons: pega a primeira imagem com licenca aberta
// que cite o sobrenome do lutador.
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
async function fotoCommons(nome) {
  const sobrenome = nome.split(/\s+/).pop();
  const u = new URL(COMMONS);
  Object.entries({ action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: process.env.CONSULTA || (nome + ' mixed martial artist'), gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '480' })
    .forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await wiki.pedir(u);
  if (!r.ok) return null;
  const j = await r.json();
  const paginas = Object.values((j.query && j.query.pages) || {});
  for (const p of paginas) {
    const ii = p.imageinfo && p.imageinfo[0];
    if (!ii || !ii.thumburl) continue;
    if (!p.title.toLowerCase().includes(sobrenome.toLowerCase())) continue;
    const m = ii.extmetadata || {};
    const licenca = m.LicenseShortName ? m.LicenseShortName.value : '';
    if (!LICENCA_OK.test(licenca)) continue;
    return { pagina: p.title, arquivo: p.title.replace(/^File:/, ''), info: { miniatura: ii.thumburl, paginaArquivo: ii.descriptionurl, licenca, licencaUrl: m.LicenseUrl ? m.LicenseUrl.value : '', autor: semHtml(m.Artist ? m.Artist.value : '') } };
  }
  return null;
}

function slug(nome) {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function main() {
  fs.mkdirSync(SAIDA, { recursive: true });
  const nomes = new Set();
  for (const periodo of ['eras', 'auge', 'atual']) {
    for (const arq of fs.readdirSync(path.join(RAIZ, periodo))) {
      const div = JSON.parse(fs.readFileSync(path.join(RAIZ, periodo, arq), 'utf8'));
      div.lutadores.forEach((l) => nomes.add(l.nome));
    }
  }

  // Retoma: reaproveita o que ja foi baixado e grava a cada foto.
  const CAMINHO_CRED = path.join(SAIDA, 'creditos.json');
  const creditos = fs.existsSync(CAMINHO_CRED) ? JSON.parse(fs.readFileSync(CAMINHO_CRED, 'utf8')) : {};
  const semFoto = [];
  for (const nome of nomes) {
    if (creditos[nome] && fs.existsSync(path.join(__dirname, '..', creditos[nome].arquivo))) continue;
    try {
      let achado = null;
      let info = null;
      try {
        achado = await arquivoPrincipal(nome);
        info = achado ? await infoLicenca(achado.arquivo) : null;
      } catch (e) {
        info = null;
      }
      if (!info || !info.miniatura || !LICENCA_OK.test(info.licenca || '')) {
        const alt = await fotoCommons(nome);
        if (alt) {
          achado = { pagina: alt.pagina };
          info = alt.info;
        }
      }
      if (!info || !info.miniatura || !LICENCA_OK.test(info.licenca || '')) {
        semFoto.push(nome + (info ? ' (licenca: ' + (info.licenca || 'desconhecida') + ')' : ''));
        
        continue;
      }
      const ext = path.extname(new URL(info.miniatura).pathname).toLowerCase() || '.jpg';
      const nomeArq = slug(nome) + ext;
      const r = await wiki.pedir(info.miniatura);
      if (!r.ok) throw new Error('download ' + r.status);
      fs.writeFileSync(path.join(SAIDA, nomeArq), Buffer.from(await r.arrayBuffer()));
      creditos[nome] = {
        arquivo: 'fotos/' + nomeArq,
        autor: info.autor,
        licenca: info.licenca,
        licencaUrl: info.licencaUrl,
        fonte: info.paginaArquivo,
        pagina: achado.pagina,
      };
      fs.writeFileSync(CAMINHO_CRED, JSON.stringify(creditos, null, 2), 'utf8');
      console.log('ok   ', nome, '·', info.licenca);
    } catch (e) {
      semFoto.push(nome + ' (erro: ' + e.message + ')');
    }
    
  }

  fs.writeFileSync(CAMINHO_CRED, JSON.stringify(creditos, null, 2), 'utf8');
  console.log('\nCom foto: ' + Object.keys(creditos).length + ' de ' + nomes.size);
  if (semFoto.length) console.log('Sem foto livre:\n  - ' + semFoto.join('\n  - '));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
