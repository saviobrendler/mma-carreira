// Segundo passe de fotos, para quem nao tem foto de licenca livre.
// Usa a imagem principal da pagina da Wikipedia mesmo quando ela e "nao livre" (uso pessoal, projeto
// que nao sera publicado) e, se faltar, a melhor imagem da Commons que cite o sobrenome.
// Registra isso no creditos.json como "Uso pessoal (imagem da Wikipedia)".
// Uso: node tools/fetch-photos-extra.js
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..', 'dados');
const SAIDA = path.join(__dirname, '..', 'fotos');
const CAMINHO_CRED = path.join(SAIDA, 'creditos.json');
const UA = 'MMA-Carreira-beta/1.0 (projeto pessoal; contato via usuario local)';
const TITULOS = fs.existsSync(path.join(__dirname, 'wiki-titulos.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'wiki-titulos.json'), 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const wiki = require('./wikiapi');
const api = (base, params) => wiki.api(base, params);
const WIKI = 'https://en.wikipedia.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const semHtml = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const slug = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Pagina com infobox de lutador e a imagem principal (qualquer licenca).
async function imagemDaPagina(nome) {
  const base = TITULOS[nome] || nome;
  for (const t of [base, base + ' (fighter)', base + ' (mixed martial artist)']) {
    const j = await api(WIKI, { action: 'query', titles: t, prop: 'pageimages|revisions', piprop: 'thumbnail|name', pithumbsize: '480', rvprop: 'content', rvslots: 'main', redirects: '1' });
    const p = j.query && j.query.pages && j.query.pages[0];
    if (!p || p.missing || !p.revisions) continue;
    if (!/Infobox martial artist/i.test(p.revisions[0].slots.main.content)) continue;
    if (p.thumbnail && p.thumbnail.source) return { pagina: p.title, arquivo: p.pageimage, url: p.thumbnail.source };
  }
  return null;
}

async function infoArquivo(arquivo) {
  const j = await api(WIKI, { action: 'query', titles: 'File:' + arquivo, prop: 'imageinfo', iiprop: 'url|extmetadata' });
  const ii = j.query && j.query.pages && j.query.pages[0] && j.query.pages[0].imageinfo && j.query.pages[0].imageinfo[0];
  if (!ii) return {};
  const m = ii.extmetadata || {};
  return { fonte: ii.descriptionurl, autor: semHtml(m.Artist ? m.Artist.value : ''), licenca: m.LicenseShortName ? m.LicenseShortName.value : '' };
}

// Commons: qualquer imagem que cite o sobrenome no nome do arquivo (preferindo .jpg/.png grandes).
async function imagemCommons(nome) {
  const sobrenome = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).pop().toLowerCase();
  const consultas = [nome + ' UFC', nome + ' mixed martial artist', nome];
  for (const q of consultas) {
    const j = await api(COMMONS, { action: 'query', generator: 'search', gsrsearch: q, gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '480' });
    const paginas = Object.values((j.query && j.query.pages) || {});
    for (const p of paginas) {
      const ii = p.imageinfo && p.imageinfo[0];
      const titulo = p.title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      if (!ii || !ii.thumburl || !titulo.includes(sobrenome)) continue;
      if (!/\.(jpe?g|png|webp)$/i.test(p.title)) continue;
      const m = ii.extmetadata || {};
      return { pagina: p.title, url: ii.thumburl, fonte: ii.descriptionurl, autor: semHtml(m.Artist ? m.Artist.value : ''), licenca: m.LicenseShortName ? m.LicenseShortName.value : '' };
    }
    
  }
  return null;
}

async function baixar(url, nomeArq) {
  const r = await wiki.pedir(url);
  if (!r.ok) throw new Error('download ' + r.status);
  fs.writeFileSync(path.join(SAIDA, nomeArq), Buffer.from(await r.arrayBuffer()));
}

async function main() {
  const nomes = new Set();
  for (const p of ['eras', 'auge', 'atual']) {
    for (const f of fs.readdirSync(path.join(RAIZ, p))) {
      JSON.parse(fs.readFileSync(path.join(RAIZ, p, f), 'utf8')).lutadores.forEach((l) => nomes.add(l.nome));
    }
  }
  const cred = fs.existsSync(CAMINHO_CRED) ? JSON.parse(fs.readFileSync(CAMINHO_CRED, 'utf8')) : {};
  const faltam = [...nomes].filter((n) => !(cred[n] && fs.existsSync(path.join(__dirname, '..', cred[n].arquivo))));
  console.log('sem foto:', faltam.length);
  const semFoto = [];
  for (const nome of faltam) {
    try {
      let achou = null;
      const pag = await imagemDaPagina(nome);
      if (pag) {
        const info = await infoArquivo(pag.arquivo);
        const ext = (path.extname(new URL(pag.url).pathname) || '.jpg').toLowerCase();
        const nomeArq = slug(nome) + ext;
        await baixar(pag.url, nomeArq);
        achou = { arquivo: 'fotos/' + nomeArq, autor: info.autor || 'Autor desconhecido', licenca: /cc|public|gfdl/i.test(info.licenca || '') ? info.licenca : 'Uso pessoal (imagem da Wikipedia)', licencaUrl: '', fonte: info.fonte || '', pagina: pag.pagina };
      } else {
        const c = await imagemCommons(nome);
        if (c) {
          const ext = (path.extname(new URL(c.url).pathname) || '.jpg').toLowerCase();
          const nomeArq = slug(nome) + ext;
          await baixar(c.url, nomeArq);
          achou = { arquivo: 'fotos/' + nomeArq, autor: c.autor || 'Autor desconhecido', licenca: c.licenca || 'Uso pessoal (Wikimedia Commons)', licencaUrl: '', fonte: c.fonte || '', pagina: c.pagina };
        }
      }
      if (achou) {
        cred[nome] = achou;
        fs.writeFileSync(CAMINHO_CRED, JSON.stringify(cred, null, 2), 'utf8');
        console.log('ok   ', nome, '·', achou.licenca);
      } else {
        semFoto.push(nome);
        console.log('FALTA', nome);
      }
    } catch (e) {
      semFoto.push(nome);
      console.log('ERRO ', nome, e.message);
    }
    
  }
  console.log('\nainda sem foto:', semFoto.length ? semFoto.join(', ') : 'nenhum');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
