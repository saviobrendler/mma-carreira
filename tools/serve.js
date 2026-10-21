// Servidor estatico minimo para testar o beta no navegador: node tools/serve.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PORTA = Number(process.env.PORTA) || 8080;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

http
  .createServer((req, res) => {
    const pedido = decodeURIComponent((req.url || '/').split('?')[0]);
    const alvo = path.join(RAIZ, pedido === '/' ? 'index.html' : pedido);
    if (!alvo.startsWith(RAIZ)) {
      res.writeHead(403);
      return res.end();
    }
    fs.readFile(alvo, (err, buf) => {
      if (err) {
        res.writeHead(404);
        return res.end('nao encontrado');
      }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo)] || 'application/octet-stream' });
      res.end(buf);
    });
  })
  .listen(PORTA, () => console.log('Beta rodando em http://localhost:' + PORTA));
