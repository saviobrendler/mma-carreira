// Conferencias estaticas da interface (sem navegador): arquivos carregados, acoes ligadas, classes com estilo,
// telas registradas e nenhuma referencia a audio. O teste visual e feito no navegador (docs/reformulacao.md).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

let falhas = 0;
function teste(nome, fn) {
  try {
    fn();
    console.log('ok  ', nome);
  } catch (e) {
    falhas++;
    console.log('FALHA', nome, '\n     ', e.stack.split('\n').slice(0, 4).join('\n      '));
  }
}

const html = ler('index.html');
const jsArquivos = fs.readdirSync(path.join(RAIZ, 'js')).filter((f) => f.endsWith('.js') && f !== 'data.js');
const cssArquivos = fs.readdirSync(path.join(RAIZ, 'css')).filter((f) => f.endsWith('.css'));
const fontes = Object.fromEntries(jsArquivos.map((f) => [f, ler('js/' + f)]));
const todoCss = cssArquivos.map((f) => ler('css/' + f)).join('\n');

teste('index.html carrega so arquivos que existem e todo js/css do projeto esta carregado', () => {
  const refs = [];
  html.replace(/(?:src|href)="([^"]+)"/g, (m, r) => { refs.push(r); return m; });
  refs.filter((r) => !/^https?:/.test(r)).forEach((r) => assert.ok(fs.existsSync(path.join(RAIZ, r)), 'arquivo ausente: ' + r));
  jsArquivos.forEach((f) => assert.ok(refs.includes('js/' + f), 'js nao carregado no index: ' + f));
  cssArquivos.forEach((f) => assert.ok(refs.includes('css/' + f), 'css nao carregado no index: ' + f));
  // ordem: dados e motor antes da interface; telas antes do app
  const pos = (x) => refs.indexOf(x);
  assert.ok(pos('js/data.js') < pos('js/engine.js') && pos('js/engine.js') < pos('js/luta-ui.js') && pos('js/luta-ui.js') < pos('js/app.js'));
  ['js/telas.js', 'js/telas2.js', 'js/telas3.js'].forEach((f) => assert.ok(pos(f) < pos('js/app.js'), f + ' depois do app'));
});

teste('sem audio: nenhum js, html ou css fala em Som, AudioContext, Audio ou arquivos de som', () => {
  Object.entries(fontes).forEach(([f, s]) => {
    assert.ok(!/AudioContext|new Audio\(|\bSom\./.test(s), 'audio em ' + f);
  });
  assert.ok(!/som\.js|<audio/.test(html), 'audio no index');
  assert.ok(!fs.existsSync(path.join(RAIZ, 'js', 'som.js')));
});

teste('toda acao data-acao usada nas telas tem um case em app.js', () => {
  const usadas = new Set();
  Object.values(fontes).forEach((s) => {
    s.replace(/data-acao="([a-z-]+)"/g, (m, a) => { usadas.add(a); return m; });
    s.replace(/acao: '([a-z-]+)'/g, (m, a) => { usadas.add(a); return m; });
  });
  const tratadas = new Set();
  fontes['app.js'].replace(/case '([a-z-]+)':/g, (m, a) => { tratadas.add(a); return m; });
  const faltam = [...usadas].filter((a) => !tratadas.has(a));
  assert.deepStrictEqual(faltam, [], 'acoes sem tratamento: ' + faltam.join(', '));
});

teste('toda tela chamada por data-tela existe no render', () => {
  const destinos = new Set();
  Object.values(fontes).forEach((s) => {
    s.replace(/data-tela="([a-z]+)"/g, (m, a) => { destinos.add(a); return m; });
    s.replace(/data: \{ tela: '([a-z]+)' \}/g, (m, a) => { destinos.add(a); return m; });
    s.replace(/ir\('([a-z]+)'\)/g, (m, a) => { destinos.add(a); return m; });
  });
  const mapa = fontes['app.js'].slice(fontes['app.js'].indexOf('const telas = {'), fontes['app.js'].indexOf('const fn = telas'));
  const faltam = [...destinos].filter((t) => !new RegExp('\\b' + t + ':').test(mapa) && t !== 'inicio');
  assert.deepStrictEqual(faltam, [], 'telas sem funcao no render: ' + faltam.join(', '));
});

teste('as telas novas registram window.TELAS e usam so o que o app entrega em UI', () => {
  const T = ['hub', 'proxima', 'treino', 'ranking', 'lutador', 'legado', 'analise'];
  global.window = global;
  ['telas.js', 'telas2.js', 'telas3.js'].forEach((f) => require(path.join(RAIZ, 'js', f)));
  T.forEach((t) => assert.strictEqual(typeof global.TELAS[t], 'function', 'tela ausente: ' + t));
  const usados = new Set();
  ['telas.js', 'telas2.js', 'telas3.js'].forEach((f) => fontes[f].replace(/\bUI\.([a-zA-Z]+)/g, (m, k) => { usados.add(k); return m; }));
  const bloco = fontes['app.js'].slice(fontes['app.js'].indexOf('const UI = {'));
  const entregues = new Set();
  bloco.slice(0, bloco.indexOf('};')).replace(/(?:^|[\s,{])(?:get\s+)?([a-zA-Z]+)\s*(?:[:,(]|$)/gm, (m, k) => { entregues.add(k); return m; });
  const faltam = [...usados].filter((k) => !entregues.has(k));
  assert.deepStrictEqual(faltam, [], 'UI sem: ' + faltam.join(', '));
});

teste('toda classe usada nos templates das telas e do combate tem estilo', () => {
  const alvo = ['telas.js', 'telas2.js', 'telas3.js', 'luta-ui.js'].map((f) => fontes[f]).join('\n');
  const usadas = new Set();
  alvo.replace(/class="([^"]*)"/g, (m, c) => {
    c.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).forEach((t) => { if (t && /^[a-z][a-z0-9-]*$/i.test(t) && !/-$/.test(t)) usadas.add(t); });
    return m;
  });
  const definidas = new Set();
  todoCss.replace(/\.([a-zA-Z][\w-]*)/g, (m, c) => { definidas.add(c); return m; });
  // classes que so marcam estado ou ganchos de teste, sem estilo proprio
  const livres = new Set(['luta-plano', 'luta-resumo', 'luta-sim', 'luta-fim', 'eu', 'ele', 'a', 'b', 'v', 'd', 'e', 'luta', 'rd-tempo', 'oculto', 'alta', 'mini', 'hero', 'sem']);
  const faltam = [...usadas].filter((t) => !definidas.has(t) && !livres.has(t));
  assert.deepStrictEqual(faltam, [], 'classes sem estilo: ' + faltam.join(', '));
});

teste('combate: as 8 estrategias do pedido estao na tela e o resultado instantaneo existe', () => {
  const s = fontes['luta-ui.js'];
  ['trocacao', 'contra', 'pressao', 'quedas', 'wrestling', 'finalizacao', 'equilibrada', 'resistencia'].forEach((id) => assert.ok(s.includes("'" + id + "'"), 'estrategia ausente: ' + id));
  assert.ok(s.includes('Ver resultado') && s.includes('simularCompleta'), 'sem resultado instantaneo');
  assert.ok(s.includes('rodarRound'), 'sem simulacao round a round');
  assert.ok(!/setInterval/.test(s), 'combate com relogio em tempo real');
});

console.log(falhas ? '\n' + falhas + ' teste(s) falharam.' : '\nTodos os testes de interface passaram.');
process.exit(falhas ? 1 : 0);
