// Roda todas as suites de teste em sequencia: node tools/test-tudo.js
const { spawnSync } = require('child_process');
const path = require('path');

const suites = ['test-engine', 'test-luta', 'test-combate', 'test-progressao', 'test-eventos', 'test-mundo', 'test-integridade', 'test-regras', 'test-semana-luta', 'test-mundo-vivo', 'test-negocios', 'test-eras', 'test-interface'];
let ruins = 0;
suites.forEach((s) => {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, s + '.js')], { encoding: 'utf8' });
  const ok = r.status === 0;
  if (!ok) ruins++;
  console.log((ok ? 'ok   ' : 'FALHA') + ' ' + s + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
  if (!ok) console.log((r.stdout || '').split('\n').filter((l) => /FALHA|Error|falharam/.test(l)).join('\n'));
});
console.log(ruins ? '\n' + ruins + ' suite(s) com falha.' : '\nTodas as suites passaram.');
process.exit(ruins ? 1 : 0);
