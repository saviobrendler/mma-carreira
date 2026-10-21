// Fotos pela pesquisa de imagens da web (DuckDuckGo Imagens, que usa o indice do Bing), para quem ainda nao tem foto.
// Projeto pessoal e fechado: usa a primeira foto boa que aparecer, sem filtrar por licenca.
// Uso:  node tools/fetch-photos-web.js                       (todos que faltam)
//       node tools/fetch-photos-web.js --so "Nome A;Nome B"   (refaz so esses, mesmo que ja tenham foto)
//       node tools/fetch-photos-web.js --so "Nome A" --pular 2 (usa o 3o melhor resultado)
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..', 'dados');
const SAIDA = path.join(__dirname, '..', 'fotos');
const CAMINHO_CRED = path.join(SAIDA, 'creditos.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = (nome) => semAcento(nome).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const args = process.argv.slice(2);
const opcao = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const SO = opcao('--so') ? opcao('--so').split(';').map((s) => s.trim()).filter(Boolean) : null;
const PULAR = parseInt(opcao('--pular') || '0', 10);
const CONSULTA_EXTRA = opcao('--consulta');

async function comEspera(url, opcoes, tentativas) {
  for (let t = 0; t < (tentativas || 4); t++) {
    try {
      const r = await fetch(url, Object.assign({ headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(20000) }, opcoes || {}));
      if (r.ok) return r;
      if (r.status === 202 || r.status === 429 || r.status === 403) { await sleep(8000 * (t + 1)); continue; }
      return r;
    } catch (e) {
      await sleep(3000 * (t + 1));
    }
  }
  return null;
}

let bloqueado = false; // a busca respondeu com desafio anti-robo (esperamos, nunca contornamos)

async function resultados(consulta) {
  await sleep(6000); // ritmo lento: a busca bloqueia quem pede rapido demais
  const r1 = await comEspera('https://duckduckgo.com/?q=' + encodeURIComponent(consulta) + '&iax=images&ia=images');
  if (!r1) { bloqueado = true; return []; }
  await sleep(5000);
  const h = await r1.text();
  const vqd = (h.match(/vqd=["']?([\d-]+)/) || [])[1];
  if (!vqd) { bloqueado = true; return []; }
  const r2 = await comEspera('https://duckduckgo.com/i.js?l=us-en&o=json&q=' + encodeURIComponent(consulta) + '&vqd=' + vqd + '&f=,,,,,&p=1', { headers: { 'User-Agent': UA, Referer: 'https://duckduckgo.com/' } });
  if (!r2) { bloqueado = true; return []; }
  try {
    const j = await r2.json();
    if (j.challenge || !j.results) { bloqueado = true; return []; }
    return j.results;
  } catch (e) {
    bloqueado = true;
    return [];
  }
}

// Escolhe os melhores candidatos: cita o sobrenome, tamanho decente, proporcao de retrato/quadrada.
function ordenar(lista, nome) {
  const sobrenome = semAcento(nome).split(/\s+/).pop();
  const primeiro = semAcento(nome).split(/\s+/)[0];
  const nota = (x) => {
    const t = semAcento((x.title || '') + ' ' + (x.url || ''));
    let n = 0;
    if (t.includes(sobrenome)) n += 4;
    if (t.includes(primeiro)) n += 2;
    const w = x.width || 0;
    const h = x.height || 0;
    if (w >= 300 && h >= 300) n += 2;
    if (w < 220 || h < 220) n -= 4;
    const prop = w && h ? w / h : 1;
    if (prop >= 0.6 && prop <= 1.5) n += 2;
    if (/ufc|mma/.test(t)) n += 1;
    if (/stock|shutterstock|alamy|getty|poster|wallpaper|vs\b|versus|fight night|odds|prediction|logo/.test(t)) n -= 2;
    return n;
  };
  return lista.map((x) => ({ x: x, n: nota(x) })).filter((o) => o.n >= 2).sort((a, b) => b.n - a.n).map((o) => o.x);
}

async function baixar(url, limiteBytes) {
  const r = await comEspera(url, null, 2);
  if (!r || !r.ok) return null;
  const tipo = (r.headers.get('content-type') || '').toLowerCase();
  if (!tipo.startsWith('image/') || /svg|gif/.test(tipo)) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 8000 || buf.length > (limiteBytes || 4000000)) return { pequeno: buf.length < 8000, grande: buf.length > (limiteBytes || 4000000), buf: null, tipo: tipo };
  return { buf: buf, tipo: tipo };
}

const extDe = (tipo) => (/png/.test(tipo) ? '.png' : /webp/.test(tipo) ? '.webp' : '.jpg');

async function main() {
  const nomes = new Set();
  for (const p of ['eras', 'auge', 'atual']) {
    for (const f of fs.readdirSync(path.join(RAIZ, p))) {
      JSON.parse(fs.readFileSync(path.join(RAIZ, p, f), 'utf8')).lutadores.forEach((l) => nomes.add(l.nome));
    }
  }
  const cred = fs.existsSync(CAMINHO_CRED) ? JSON.parse(fs.readFileSync(CAMINHO_CRED, 'utf8')) : {};
  const faltam = SO || [...nomes].filter((n) => !(cred[n] && fs.existsSync(path.join(__dirname, '..', cred[n].arquivo))));
  console.log('buscando fotos para', faltam.length, 'lutadores');
  const semFoto = [];
  for (const nome of faltam) {
    let ok = null;
    for (let tentativa = 0; tentativa < 4 && !ok; tentativa++) {
    if (tentativa > 0) { console.log('  (busca limitando pedidos: pausa de 5 min e tento de novo ' + nome + ')'); await sleep(300000); }
    bloqueado = false;
    const consultas = CONSULTA_EXTRA ? [CONSULTA_EXTRA] : [nome + ' UFC fighter', nome + ' MMA'];
    for (const q of consultas) {
      const lista = ordenar(await resultados(q), nome).slice(PULAR);
      for (const x of lista.slice(0, 6)) {
        let b = await baixar(x.image, 3000000);
        let usouMiniatura = false;
        if (!b || !b.buf) {
          if (x.thumbnail) { b = await baixar(x.thumbnail, 3000000); usouMiniatura = true; }
        }
        if (b && b.buf) {
          const arq = slug(nome) + extDe(b.tipo);
          fs.writeFileSync(path.join(SAIDA, arq), b.buf);
          ok = { arquivo: 'fotos/' + arq, autor: (x.source || 'Pesquisa de imagens') + '', licenca: 'Uso pessoal (pesquisa de imagens)', licencaUrl: '', fonte: x.url || '', pagina: x.title || '', bytes: b.buf.length, miniatura: usouMiniatura };
          break;
        }
      }
      if (ok) break;
      await sleep(4000);
    }
    if (ok || !bloqueado) break;
    }
    if (ok) {
      cred[nome] = ok;
      fs.writeFileSync(CAMINHO_CRED, JSON.stringify(cred, null, 2), 'utf8');
      console.log('ok   ', nome.padEnd(26), Math.round(ok.bytes / 1024) + 'KB', ok.miniatura ? '(miniatura)' : '', '·', (ok.pagina || '').slice(0, 50));
    } else {
      semFoto.push(nome);
      console.log('FALTA', nome);
    }
    await sleep(15000);
  }
  console.log('\nainda sem foto:', semFoto.length ? semFoto.join(', ') : 'nenhum');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
