// Publica o jogo na Vercel, mas so quando algum arquivo publicavel mudou desde a ultima publicacao.
// Chamado pelo hook "Stop" (.claude/settings.json) ao fim de cada resposta; tambem pode rodar na mao:
//   node tools/publicar.js          (publica se mudou)
//   node tools/publicar.js --forcar (publica sempre)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const MARCA = path.join(RAIZ, '.vercel', 'ultimo-deploy.hash');
const SITE = 'https://mma-carreira.vercel.app';
// Mesma lista do .vercelignore (mais pastas internas): nada disso vai ao ar, entao nao conta como mudanca.
const IGNORAR = new Set(['.git', '.gitignore', 'docs', 'tools', 'pesquisa', 'design-referencia', 'contato.html', 'receber.html', 'node_modules', '.vercel', '.claude', '.vercelignore']);

function arquivos(dir, base) {
  let lista = [];
  for (const nome of fs.readdirSync(dir).sort()) {
    const rel = base ? base + '/' + nome : nome;
    if (!base && IGNORAR.has(nome)) continue;
    const abs = path.join(dir, nome);
    const st = fs.statSync(abs);
    if (st.isDirectory()) lista = lista.concat(arquivos(abs, rel));
    else lista.push(rel);
  }
  return lista;
}

function impressao() {
  const h = crypto.createHash('md5');
  for (const rel of arquivos(RAIZ, '')) {
    h.update(rel + '\0');
    h.update(fs.readFileSync(path.join(RAIZ, rel)));
  }
  return h.digest('hex');
}

function saida(msg) {
  process.stdout.write(JSON.stringify({ systemMessage: msg }) + '\n');
}

const atual = impressao();
const anterior = fs.existsSync(MARCA) ? fs.readFileSync(MARCA, 'utf8').trim() : '';
if (atual === anterior && !process.argv.includes('--forcar')) process.exit(0);

const r = spawnSync('vercel deploy --prod --yes', { cwd: RAIZ, shell: true, encoding: 'utf8', timeout: 8 * 60 * 1000 });
if (r.status === 0) {
  fs.mkdirSync(path.dirname(MARCA), { recursive: true });
  fs.writeFileSync(MARCA, atual);
  saida('Jogo publicado na Vercel: ' + SITE);
} else {
  const erro = ((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-3).join(' | ');
  saida('Não consegui publicar na Vercel (' + (erro || 'erro desconhecido') + '). Rode: node tools/publicar.js');
}
