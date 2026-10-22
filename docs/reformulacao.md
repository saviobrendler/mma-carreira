# MMA Carreira — reformulação (fases 2 a 9)

Trabalho feito sobre o projeto existente (nada recriado). Ponto de restauração: tag git `restauracao-v1`
(`git checkout restauracao-v1` volta ao jogo publicado antes da reformulação). A auditoria da fase 1 está em
`auditoria.md`.

## O que mudou

### Identidade e design system (`css/jogo.css`)
- Paleta mantida: `#080A0D` fundo, `#161B22` superfície, vermelho `#E11D35` só para ação principal e confronto,
  `#F5F5F5`/`#9CA3AF` texto, dourado `#E8B84A` só para cinturão, campeão e recordes. Barlow Condensed (títulos, nomes,
  números) + Barlow (texto).
- Tokens de espaçamento (`--s1`…`--s6`), componentes: `foto-l` (recorte padronizado, rosto no terço superior, sem
  filtro), selos (`selo-ouro/azul/fogo/verde/lenda/eu`), `bloco-j`, `tile`, cartaz de luta, linha de ranking, cartão de
  estratégia.
- **Ambientação por era** (`body[data-era]`): Lendas (tom quente e granulado leve), Ouro (neutro, fio dourado no topo),
  Atual (frio, malha discreta). As eras não se misturam na carreira normal.
- Sem brilho, neon, partículas ou sombras coloridas. `prefers-reduced-motion` desliga animações e a espera do round.

### Navegação
Carreira · Próxima luta · Treinamento · Ranking · Legado. O menu do lutador guarda o resto (Estatísticas, Habilidades,
Traços e golpes, Distribuir pontos, Academia, Mudar categoria, Hall da fama, Pendurar as luvas, Menu inicial). Ponto
vermelho na aba quando há algo esperando uma decisão. No celular as abas viram a barra inferior.

### Telas (`js/telas.js`, `telas2.js`, `telas3.js`, `telas4.js`; só apresentação)
- **Carreira**: foto grande, nome, apelido, origem, categoria, cartel, ranking, fama, status e o cartaz da próxima luta
  (as duas fotos, evento, data, local, bloco do card, contagem) com **Preparar luta** ou **Procurar próximo desafio**.
  Atalhos para treino, evolução, dinheiro e últimas lutas.
- **Próxima luta**: cartaz, card completo do evento (principal, co-principal, card principal, preliminar) e análise do
  confronto por fase da luta (trocação, wrestling e quedas, jiu-jítsu e chão, defesa, resistência, experiência) com
  sugestão do córner. Sem luta marcada, lista os desafios com foto, apelido, nacionalidade, cartel, leitura e bolsa.
- **Treinamento**: camp semana a semana (boxe, muay thai, wrestling, jiu-jítsu, sparring, condicionamento, recuperação,
  estudo do adversário, corte de peso, coletiva), com ganhos, custo de energia, risco e sugestão.
- **Ranking**: abas por categoria, campeão em destaque, linhas com foto, apelido, nacionalidade, estilo, cartel e status
  (próximo adversário, no seu card, rival). Clicar abre o **perfil do lutador** (atributos por grupo, métodos de vitória,
  comparação por fase com o jogador, notícias, crédito da foto).
- **Legado**: cinturões, defesas, recordes, vitórias mais rápidas, lutas memoráveis, premiações, rivalidades e o
  histórico completo.
- **Resultado oficial**: vencedor, método, round, tempo, cartões dos juízes, estatísticas, o que mudou (cartel, ranking,
  pontos, bolsa, fama, XP, nível, energia, condição física), recompensas, resultado do resto do card e a pós-luta. Vitória
  de título abre a tela do campeão com a foto real do cinturão (1 ou 2 cinturões), o lutador e a história da conquista.

### Combate (`js/luta-ui.js`)
Sem animação de lutadores e sem áudio (`som.js` removido). Antes da luta o jogador escolhe a estratégia inicial entre 8
(Trocação agressiva, Contra-ataque, Pressão constante, Priorizar quedas, Wrestling e controle, Buscar finalização,
Estratégia equilibrada, Administrar resistência; teclas 1–8 e setas). Dois caminhos, **o mesmo motor**:
- **Simular round**: o round roda e aparece o resumo (cartão e cartões dos 3 juízes, lances de destaque em texto, golpes
  significativos, quedas, finalizações, controle, dano, condição, resistência e corte). No intervalo o jogador troca a
  estratégia e pode usar o córner. Nocaute, finalização ou parada médica encerram a luta na hora; respeita 3 ou 5 rounds.
- **Ver resultado**: simula a luta (ou o que resta) sem espera nem relógio e vai direto ao resultado oficial. Com a mesma
  estratégia e a mesma semente dá exatamente a mesma luta do round a round (teste `test-combate`).
Luta salva no meio é retomada de onde parou; luta salva por versão anterior (round em andamento) é concluída.

### Motor (`js/engine.js`) — ajustes medidos por simulação
| Problema encontrado | Antes | Depois |
|---|---|---|
| Rounds de decisão com cartão 10-8 | 63% | 3,8% |
| Rounds 10-10 | 0% | 1,7% |
| Nocaute com menos de 10% de dano acumulado (flash KO) | 35% | 19% |
| Lutas terminando em nocaute / finalização / decisão | 26 / 25 / 49% | 24 / 26 / 50% |
- Cartões: 10-8 só para domínio claro e sustentado (`LIM_10_8`), 10-10 para round realmente parelho; o cartão oficial do
  round é o do juiz do meio e os totais por juiz fecham com os rounds.
- Nocaute depende do dano acumulado (`KO_BASE`, `KO_ACUMULADO`, `KO_DANO_REF`).
- Overall não decide sozinho: favorito com +0–2 de overall vence 51%, +6–9 vence 65%, +9 ou mais vence 76%.
- Estratégia por round, estatísticas por round, tempo da finalização, eventos e cards com resolução das outras lutas,
  comparação por fase, legado e treino semanal foram adicionados na etapa anterior (commits do motor).

### Saves
`mma-beta-save-v1` continua sendo a chave; o conteúdo ganhou `versao: 2` com migração no lugar (`migrarCarreira`). Saves
v1 são lidos, migrados e regravados sem perder cartel, atributos, XP, dinheiro, fama, histórico, rivalidades nem o camp em
andamento (luta marcada ganha um evento/card). `tools/fixtures/save-v1.json` é um save real gerado pelo motor antigo e
vira teste de regressão. Os campos da fase 9 (contrato, patrocínios, equipe, redes, dificuldade, arquétipo, torneio, lesão
grave, Hall) entram com valor padrão em `novaCarreira` e em `migrarCarreira`, sem mudar o número de versão nem apagar nada.

## Fase 9 — imersão de UFC e jogabilidade (tudo, menos som)

Tudo roda no mesmo motor (`js/engine.js`), sem build e sem dependência nova. Cada regra tem teste; as telas só apresentam.

### Regras do cinturão, ditas na tela
- **Situação do cinturão** (Carreira e Próxima luta): campeão e há quanto tempo, quanto falta para a próxima defesa, e, para
  quem não é campeão, o caminho até o título (top 5 da categoria + 2 vitórias seguidas, com o progresso de cada um).
  Regras do motor: `TOP_DESAFIANTE = 5`, `VITORIAS_PARA_TITULO = 2`, `SEMANAS_ENTRE_SUPERLUTAS = 16`.
- **Papel de cada oferta**, em texto no cartão: Defesa de título, Candidato ao cinturão, Luta para manter o ritmo,
  Superluta (categoria acima, 5 rounds, sem cinturão em jogo), Revanche com ex-campeão, Trilogia. Cada uma explica por que
  existe e por que paga o que paga (`BOLSA_CAMPEAO 1,15`, `BOLSA_EX_CAMPEAO 1,5`, `BOLSA_TRILOGIA 1,3`, `BOLSA_SUPERLUTA 2,4`).
- **Ranking**: o campeão fica separado ("Campeão", posição 0); o #1 é o primeiro desafiante. A lista interna continua com o
  campeão no índice 0; `posRank/rotuloRank` convertem na apresentação.
- Rounds (3 ou 5) e "luta de título" aparecem sempre no cartaz, na oferta e na entrada do octógono.

### Semana de luta
Etapas do camp: **foco → treino → scouting/sparring → evento → corte de peso → pesagem e encarada → coletiva → luta.**
- **Foco do camp** (trocação, wrestling e defesa, jiu-jítsu e chão, cardio e queixo, equilibrado): +30% de chance de evoluir
  os atributos da área e +1 de bônus de luta nas atividades dela; a sugestão vem do ponto fraco do adversário.
- **Sparring real**: parceiro com nome, risco de lesão, ganhos específicos; **estudar o adversário** revela o ponto fraco e
  dá bônus na luta contra ele.
- **Corte de peso** com consequência: seguro (sem risco) ou agressivo (+força/+queixo, menos fôlego). A balança pode falhar.
- **Pesagem, encarada e coletiva**: a pesagem pode estourar o peso; na encarada o jogador escolhe entre encarar (+4 de fama, +2 de QI se levar a
  melhor), cumprimentar (+2 de fama, +2 de fôlego) ou ignorar (+2 de defesa); a coletiva alimenta a imprensa e a rivalidade.
- **Imprevistos** (`IMPREVISTO_CHANCE = 0,11` por luta): lesão no camp, troca de adversário, luta cancelada. Título e torneio não
  trocam de adversário. Aparecem num aviso com decisão do jogador.

### Transmissão e combate
- **Apresentação do anunciador** na entrada: evento, local, cartéis, cantos.
- **Clima de round** (equilibrado, pressão, perigo, decisivo) e **leitura do córner** em cada pausa.
- **Comandar o round**: a cada momento o jogador escolhe entre trocar em pé, pressionar, derrubar, cautela (no chão: castigar, controlar,
  finalizar por cima; escapar, proteger, guarda por baixo) ou "deixar o plano decidir o resto". Teclas 1–N. É o mesmo motor: o round simulado e o comandado
  usam a mesma resolução.
- **KO e finalizações descrevem a arma** (textos por golpe) e o resultado oficial traz **melhores momentos** por round.
- **Regras por era**: Lendas sem juízes e sem parada por corte (luta vai até o fim ou o árbitro decide), **torneio de uma noite**
  (quartas, semi e final no mesmo dia; dano e cansaço passam de uma luta para a outra; quem perde está fora; prêmio no final);
  Ouro e Atual com juízes e 3/5 rounds.

### Mundo vivo e bastidores
- **Elenco que evolui**: rivais envelhecem, sobem, caem e se aposentam; novatos entram; piso de 14 lutadores por divisão.
  Cartel e forma recente de cada um (`cartelIA`, `formaDe`, `historiaLutador`) aparecem no ranking e no perfil.
- **Imprensa e redes** (`postar`, `imprensaDaLuta`): manchetes e seguidores; seguidores viram bônus nas lutas grandes (PPV).
- **Contrato** (lutas restantes, bolsa, bônus de vitória e de finalização), com propostas de renovação (padrão, curto com
  salário alto, longo e seguro), **"pedir mais dinheiro"** (pode piorar as propostas) e tela de Negócios.
  Contrato vencido bloqueia marcar luta até assinar.
- **Patrocínios** por resultado (slots por fama) e **equipe** (treinador principal, preparador físico, fisioterapeuta, nutricionista,
  gerente do ginásio) que depende do nível da academia e comenta a semana; **valor de mercado** calculado do cartel e da fama.

### Variedade e profundidade
- **Arquétipos** na criação (Nocauteador, Máquina de cardio, Caçador de finalizações, Estrategista, Queixo de ferro, Prodígio)
  com bônus e custo próprios e um traço grátis.
- **Lesões graves** com decisão (operar × tratar sem cirurgia), recuperação diferente e sequela possível.
- **Eventos de vida** (nascimento do filho, polêmica nas redes, escândalo com ex-treinador, convite de reality, rival na academia,
  doença na família), cada um com duas saídas e custo; só ocorrem depois da primeira luta.
- **Pós-título**: superluta, trilogia, **Hall da Fama** por pontos (`HALL_LIMIAR 100`, `HALL_PRIMEIRA 140`) com a conta mostrada no
  Legado ("Rumo ao Hall da Fama") e **aposentadoria como momento** (despedida com resumo e veredito do Hall).
- **Dificuldade** (Tranquilo / Normal / Difícil: adversários +0 / +6 / +9 de força), na criação e mudável depois nas
  Estatísticas; vale para as próximas lutas.

### Calibração medida (bot, 3 anos de jogo, 24 carreiras — `node tools/test-mundo.js`)
| Perfil do bot | Vitórias | Lutas | Títulos | 1º título | Defesas |
|---|---|---|---|---|---|
| lutador (escolhe bem) | 78% | 23,5 | 15 de 24 carreiras campeãs | semana 72 | 1,7 |
| aleatório | 47% | 20,4 | 0 | — | 0 |
| ocioso (não luta) | — | 0 | 0 | — | 0 |
São números de bot, não de jogador humano: indicam que o título não é garantido e que treinar e lutar compensa; o ritmo para
uma pessoa real ainda depende de teste de jogo.

## Como testar
```
node tools/test-tudo.js        # as 14 suites, em sequência
node tools/serve.js            # jogo em http://localhost:8080
node tools/gerar-save-teste.js atual peso_leve   # gera _save-titulo.json (luta de título no dia) para teste manual
node tools/gerar-saves-visuais.js                # gera _saves.json (campeão, torneio, contrato vencido, lesão grave, camp, veterano)
node tools/auditoria-rounds.js | auditoria-ko.js | auditoria-overall.js | auditoria-estilos.js | auditoria-motor.js   # medições do motor
```
Suites: `test-engine`, `test-luta`, `test-combate`, `test-progressao`, `test-eventos`, `test-mundo` (inclui o resumo dos bots),
`test-integridade`, `test-regras`, `test-semana-luta`, `test-mundo-vivo`, `test-negocios`, `test-eras`, `test-variedade`, `test-interface`.
- `test-integridade`: 60 carreiras nas 3 eras (cartel = histórico, sequência, ranking sem repetição, um campeão por
  divisão, eventos sem lutador repetido, vitória não duplicada) e o save v1 real.
- `test-regras`: situação do cinturão, papéis das ofertas, ranking com campeão à parte, superluta e trilogia.
- `test-semana-luta`: etapas do camp, foco, sparring, pesagem, imprevistos. `test-eras`: Lendas sem juízes e torneio de uma noite.
- `test-negocios`: contrato, renovação, "pedir mais", patrocínios, equipe. `test-variedade`: arquétipos, lesões graves, eventos de
  vida, Hall da Fama, aposentadoria, dificuldade. `test-mundo-vivo`: elenco, novatos, aposentadorias, imprensa.
- `test-interface`: arquivos carregados, toda ação `data-acao` tratada, toda tela existe, toda classe tem estilo, sem
  áudio, as 8 estratégias e o resultado instantâneo presentes.
- Para manter os testes determinísticos, a carreira aceita três chaves só de teste: `semImprevistos`, `semFoco` e
  `contrato.lutasRestantes = 9999`. O jogo normal não usa nenhuma delas.

## Validação visual (navegador embutido)
Conferido à mão, em 1440×900 e 375×812, com o save v1 real e com saves gerados por `gerar-saves-visuais.js`:
- Carreira do campeão (situação do cinturão, ranking "Campeão", imprensa e redes, regras da era); Próxima luta com defesa liberada
  em semanas, "Luta para manter o ritmo" e "Superluta"; Negócios com contrato vencido e as três propostas, "pedir mais" (propostas
  pioraram) e assinatura; torneio de uma noite (chave, entrada, comando do round, eliminação com o bloco do torneio no resultado);
  lesão grave com a decisão operar × tratar; camp completo (foco, treino, scouting, evento, corte de peso, pesagem, coletiva);
  Legado com "Rumo ao Hall da Fama"; aposentadoria, Hall da fama; criação de lutador com apelido, arquétipo e dificuldade
  (valores gravados no save e bônus aplicados); Estatísticas com o painel de dificuldade.
- Em 375 px: Carreira, Próxima luta, Treinamento, Ranking, Legado, Negócios, cada etapa do camp, luta com comando do round,
  resultado oficial e o aviso de nível. Sem rolagem horizontal em nenhuma e sem erros no console.
- Correção feita na validação: a data do Hall da fama aparecia como `2026-10-22`; agora sai `22/10/2026`.
- Não conferido visualmente: troca de adversário por imprevisto na tela, patrocínio recusado, trilogia, Hall com "Fora do Hall",
  resultado de luta de título com a nova camada de bônus. Estão cobertos pelos testes de motor, não por olhar a tela.

## Limitações conhecidas
- Não há teste automatizado de navegador (só as conferências estáticas, os testes de motor e a validação manual acima).
- A calibração é medida com bots. O ritmo para uma pessoa real (quanto demora o primeiro título, se Difícil é difícil demais) ainda
  precisa de partidas reais.
- O bot que luta bem termina 3 anos com muito dinheiro acumulado (~US$ 147 mil): o dinheiro tem destino (academia, equipe), mas não há
  um grande gasto de fim de carreira.
- "Pedir mais dinheiro" é uma única tentativa por renovação: chance de 35% + 8% por nível de fama (+10% se campeão); se der certo as
  propostas sobem 10%, se falhar caem 7% no valor e 10% no bônus de vitória. Não há negociação em várias rodadas.
- O lutador criado sem foto usa iniciais; a foto é opcional na criação.
- Sem som: pedido explícito, nada de áudio foi adicionado.
