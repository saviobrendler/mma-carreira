// Gera contato.html: uma folha com a foto de cada lutador novo, para conferir de uma vez se alguma esta errada.
// Uso: node tools/contato.js [--todos]
const fs = require('fs');
const path = require('path');
const cred = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fotos', 'creditos.json'), 'utf8'));
const web = Object.entries(cred).filter(([, v]) => process.argv.includes('--todos') || /pesquisa de imagens|google/i.test(v.licenca || ''));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const html = `<!doctype html><meta charset="utf-8"><title>Contato</title>
<style>body{background:#111;color:#eee;font:12px sans-serif;margin:8px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}
figure{margin:0;background:#1b1b1b}img{width:100%;height:150px;object-fit:cover;object-position:center 15%;display:block;background:#333}figcaption{padding:3px;font-size:11px;line-height:1.2}</style>
<h3>${web.length} fotos</h3><div class="g">${web.map(([n, v]) => `<figure><img src="${esc(v.arquivo)}" loading="eager"><figcaption>${esc(n)}</figcaption></figure>`).join('')}</div>`;
fs.writeFileSync(path.join(__dirname, '..', 'contato.html'), html);
console.log('contato.html com', web.length, 'fotos');
