// Baixa a foto principal da pagina da Wikipedia (arquivo citado na caixa de informacoes, guardado em
// pesquisa/novos.json pelo fetch-pesquisa.js), mesmo quando a licenca nao e livre (projeto pessoal, fechado).
// Usa Special:FilePath (pagina normal, fora do limite da API). Retoma de onde parou.
// Uso: node tools/fetch-photos-wp.js
const fs = require('fs');
const path = require('path');
const wiki = require('./wikiapi');

const SAIDA = path.join(__dirname, '..', 'fotos');
const CAMINHO_CRED = path.join(SAIDA, 'creditos.json');
const NOVOS = path.join(__dirname, '..', 'pesquisa', 'novos.json');
const slug = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

async function main() {
  const cred = fs.existsSync(CAMINHO_CRED) ? JSON.parse(fs.readFileSync(CAMINHO_CRED, 'utf8')) : {};
  const lista = JSON.parse(fs.readFileSync(NOVOS, 'utf8')).filter((x) => x.imagem);
  const faltam = lista.filter((x) => !(cred[x.nome] && fs.existsSync(path.join(__dirname, '..', cred[x.nome].arquivo))));
  console.log('fotos da Wikipedia a baixar:', faltam.length);
  const semFoto = [];
  for (const x of faltam) {
    try {
      const url = 'https://en.wikipedia.org/wiki/Special:FilePath/' + encodeURIComponent(x.imagem.replace(/ /g, '_')) + '?width=500';
      const r = await wiki.pedir(url);
      const tipo = r && r.ok ? (r.headers.get('content-type') || '') : '';
      if (!r || !r.ok || !tipo.startsWith('image/') || /svg|gif/.test(tipo)) {
        semFoto.push(x.nome);
        console.log('FALTA', x.nome, '(' + (r ? r.status : 'sem resposta') + ' ' + tipo + ')');
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      const ext = /png/.test(tipo) ? '.png' : /webp/.test(tipo) ? '.webp' : '.jpg';
      const arq = slug(x.nome) + ext;
      fs.writeFileSync(path.join(SAIDA, arq), buf);
      cred[x.nome] = { arquivo: 'fotos/' + arq, autor: 'Wikipedia', licenca: 'Uso pessoal (imagem da Wikipedia)', licencaUrl: '', fonte: 'https://en.wikipedia.org/wiki/File:' + encodeURIComponent(x.imagem.replace(/ /g, '_')), pagina: x.nome, bytes: buf.length };
      fs.writeFileSync(CAMINHO_CRED, JSON.stringify(cred, null, 2), 'utf8');
      console.log('ok   ', x.nome.padEnd(26), Math.round(buf.length / 1024) + 'KB', x.imagem);
    } catch (e) {
      semFoto.push(x.nome);
      console.log('ERRO ', x.nome, e.message);
    }
  }
  console.log('\nsem foto da Wikipedia:', semFoto.length ? semFoto.join(', ') : 'nenhum');
  const semImagem = JSON.parse(fs.readFileSync(NOVOS, 'utf8')).filter((x) => !x.imagem && !(cred[x.nome])).map((x) => x.nome);
  if (semImagem.length) console.log('pagina sem imagem na caixa:', semImagem.join(', '));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
