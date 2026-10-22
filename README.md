# MMA Carreira

Jogo de carreira no MMA, em português. Você cria seu lutador, monta o camp de treino, define a estratégia de cada round e sobe no ranking até disputar o cinturão.

**Jogar:** https://mma-carreira.vercel.app

## O que tem

- Quase 300 lutadores reais em três eras (Lendas, Ouro e Atual), com oito categorias de peso
- Camp de treino semana a semana: boxe, muay thai, wrestling, jiu-jítsu, sparring, condicionamento, corte de peso
- Combate com estratégia por round, juízes, nocautes, finalizações e decisões
- Ranking por categoria, perfis dos adversários, eventos com card completo
- Legado: cinturões, defesas, recordes, rivalidades e Hall da Fama

## Como rodar

Site estático, sem build e sem dependências. Abra `index.html` no navegador ou rode:

```bash
node tools/serve.js
```

Testes do motor: `node tools/test-tudo.js`.

## Estrutura

| Pasta | O que tem |
|---|---|
| `js/engine.js` | Regras: luta, carreira, ranking, camp, fama, habilidades |
| `js/telas*.js`, `js/app.js` | Interface |
| `js/data.js` | Lutadores, gerado por `tools/build-data.js` |
| `fotos/` | Fotos dos lutadores; autores e fontes em `fotos/creditos.json` |
| `tools/` | Coleta de dados, testes e publicação |
| `docs/` | Auditoria e notas da reformulação |
