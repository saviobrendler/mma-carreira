# MMA Carreira — auditoria (fase 1)

Feita antes da reformulação. Ponto de restauração: tag git `restauracao-v1` (`git checkout restauracao-v1 -- .` volta tudo).

## Estrutura confirmada
- `index.html` carrega `css/style.css`, `luta.css`, `carreira.css`, `progressao.css`, `celebra.css` e os scripts `data.js`, `engine.js`, `som.js`, `celebra.js`, `luta-ui.js`, `app.js`. Sem build, sem dependências, sem framework.
- `js/engine.js` (~2900 linhas): regras (classe `Luta`, carreira, ranking, camp, fama, habilidades, metas, recompensas). Exporta `window.MMA` / `module.exports`, por isso roda igual no navegador e nos testes de Node.
- `js/app.js` (~1770 linhas): interface em strings de template, estado em variáveis do IIFE, eventos por delegação (`data-acao`).
- `js/luta-ui.js`: tela de combate (decisão a cada "momento" do round).
- `js/data.js`: gerado por `tools/build-data.js` (a partir de `../dados/`, `pesquisa/` e `fotos/creditos.json`). 296 lutadores nas 3 eras, todos com foto.
- Testes: `tools/test-engine.js`, `test-luta.js`, `test-mundo.js` (bots), `test-progressao.js`.

## Save
- Chave `mma-beta-save-v1` (carreira) e `mma-hall-v1`. O save tem `versao: 1` fixa e é migrado "no lugar" por `migrarCarreira`, que só acrescenta campos que faltam. Não existe migração versionada — será criada (`versao: 2`).
- Luta em andamento é salva em `lutaAtiva.luta` (`Luta.toJSON()`), com o round em curso (`rd`).

## Motor — o que a simulação mostrou (41 mil lutas, todos os confrontos da Era Atual)
- O favorito pelo overall vence 56,6% (0–2 pontos de diferença: 50,7%; 5–8: 64%; 8–12: 67,8%). O overall pesa pouco, o que combina com o pedido de "não deixar o overall decidir sozinho".
- Estilo contra estilo (overall parecido, % de vitórias do primeiro): striker x wrestler 64,6%; grappler x wrestler 59,8%; striker x grappler 54,9%. **O wrestler perde para todo mundo** (35% contra striker). Falta um "pedra-papel-tesoura" equilibrado: wrestler deveria incomodar o striker.
- Métodos: nocaute 30%, finalização 28%, decisão 42%. Fim no round 1: 24%, 2: 19%, 3: 57% (lutas de 3 rounds).
- A IA escolhe a tática só pelos próprios atributos, sem olhar o adversário (`escolherIA`). Por isso um wrestler contra alguém com defesa de queda alta insiste em quedas, e vice-versa.
- Os juízes pontuam por dano + controle. Quedas, ameaças de finalização e ritmo não entram.
- Falta no resultado: tempo do encerramento (m:ss) e estatísticas por round.

## Interface — problemas reais
- A tela inicial tem muitos blocos concorrendo (faixa de fama, faixa de progresso, 2–3 banners, palco, chips). Não responde rápido a "quem sou / onde estou / quem enfrento / o que faço".
- A navegação tem 4 abas (Carreira, Estatísticas, Ranking, Menu) e 8 "chips" de atalho; não reflete as áreas pedidas (Carreira, Próxima luta, Treinamento, Ranking, Legado).
- Combate: o jogador decide a cada momento (tática por troca). O pedido novo é estratégia por round + "Ver resultado" instantâneo, sem áudio.
- Áudio (`som.js`) e partículas/confete nas comemorações contrariam a direção nova.
- Sem apelido nem nacionalidade nos lutadores; sem eventos/fight cards; as lutas dos outros só aparecem como notícia a cada 4 semanas.
- O ranking é uma tabela, sem perfil do adversário nem comparação por estilo.

## O que será reaproveitado
Motor de combate (`Luta`), camp, fama, habilidades, metas, recompensas, ranking, dados, fotos, créditos, hall, migração. A reformulação acrescenta camadas (estratégia por round, eventos, identidade) e reescreve a apresentação.
