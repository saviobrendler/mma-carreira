// Baixa as fotos das URLs que o Google Imagens devolveu (tools/candidatas.json) e registra em fotos/creditos.json.
// Preferencia: foto de perfil do UFC (corpo inteiro com fundo transparente), depois retratos, depois o resto.
const fs = require('fs');
const path = require('path');
const SAIDA = path.join(__dirname, '..', 'fotos');
const CRED = path.join(SAIDA, 'creditos.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const slug = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const cand = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidatas.json'), 'utf8'));
const cred = JSON.parse(fs.readFileSync(CRED, 'utf8'));

const nota = (u) => (/athlete_bio_full_body/.test(u) ? 10 : /tapology.*letterbox|sherdog.*image_crop|fighter_images/.test(u) ? 6 : /ufc\.com.*(inline|card_advance)/.test(u) ? 4 : 2);

async function baixar(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://www.google.com/' }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) return null;
    const tipo = (r.headers.get('content-type') || '').toLowerCase();
    if (!tipo.startsWith('image/') || /svg|gif/.test(tipo)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 8000 || buf.length > 4000000) return null;
    return { buf, tipo };
  } catch (e) {
    return null;
  }
}

async function um(nome) {
  const urls = (cand[nome] || []).slice().sort((a, b) => nota(b) - nota(a));
  for (const u of urls) {
    const b = await baixar(u);
    if (!b) continue;
    const ext = /png/.test(b.tipo) ? '.png' : /webp/.test(b.tipo) ? '.webp' : '.jpg';
    const arq = slug(nome) + ext;
    fs.writeFileSync(path.join(SAIDA, arq), b.buf);
    cred[nome] = { arquivo: 'fotos/' + arq, autor: new URL(u).hostname.replace(/^www\./, ''), licenca: 'Uso pessoal (Google Imagens)', licencaUrl: '', fonte: u.slice(0, 300), pagina: nome, bytes: b.buf.length };
    return Math.round(b.buf.length / 1024) + 'KB ' + new URL(u).hostname;
  }
  return null;
}

(async () => {
  const nomes = Object.keys(cand);
  const faltou = [];
  for (let i = 0; i < nomes.length; i += 4) {
    const lote = nomes.slice(i, i + 4);
    const res = await Promise.all(lote.map(um));
    lote.forEach((n, k) => {
      console.log(res[k] ? 'ok   ' : 'FALTA', n.padEnd(26), res[k] || '');
      if (!res[k]) faltou.push(n);
    });
    fs.writeFileSync(CRED, JSON.stringify(cred, null, 2), 'utf8');
  }
  console.log('\nainda sem foto:', faltou.length ? faltou.join(', ') : 'nenhum');
})();
