// Cliente da API da Wikipedia/Commons com espera entre pedidos (evita bloqueio por excesso de requisicoes).
const UA = 'MMA-Carreira-beta/1.0 (projeto pessoal; contato via usuario local)';
const INTERVALO_MS = 1300;
let ultimo = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarVez() {
  const falta = ultimo + INTERVALO_MS - Date.now();
  ultimo = Date.now() + Math.max(0, falta);
  if (falta > 0) await sleep(falta);
}

async function pedir(url, opcoes) {
  for (let t = 0; t < 6; t++) {
    await esperarVez();
    try {
      const r = await fetch(url, Object.assign({ headers: { 'User-Agent': UA } }, opcoes || {}));
      if (r.ok) return r;
      if (r.status === 429 || r.status >= 500) {
        const espera = parseInt(r.headers.get('retry-after') || '0', 10) * 1000 || 20000 * (t + 1);
        console.log('  (limite de pedidos: aguardando ' + Math.round(espera / 1000) + 's)');
        await sleep(espera);
        continue;
      }
      return r;
    } catch (e) {
      await sleep(5000 * (t + 1));
    }
  }
  throw new Error('pedido falhou: ' + String(url).slice(0, 100));
}

async function api(base, params) {
  const u = new URL(base);
  Object.entries(Object.assign({ format: 'json', formatversion: '2' }, params)).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await pedir(u);
  if (!r.ok) throw new Error('API ' + r.status);
  return r.json();
}

module.exports = { api, pedir, sleep, UA };
