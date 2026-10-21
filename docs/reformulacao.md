# MMA Carreira — reformulação (fases 2 a 8)

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

### Telas (`js/telas.js`, `telas2.js`, `telas3.js`; só apresentação)
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
vira teste de regressão.

## Como testar
```
node tools/test-tudo.js        # todas as suites (engine, luta, combate, progressão, eventos, mundo, integridade, interface)
node tools/serve.js            # jogo em http://localhost:8080
node tools/gerar-save-teste.js atual peso_leve   # gera _save-titulo.json (luta de título no dia) para teste manual
node tools/auditoria-rounds.js | auditoria-ko.js | auditoria-overall.js | auditoria-estilos.js   # medições do motor
```
- `test-integridade`: 60 carreiras nas 3 eras (cartel = histórico, sequência, ranking sem repetição, um campeão por
  divisão, eventos sem lutador repetido, vitória não duplicada) e o save v1 real.
- `test-interface`: arquivos carregados, toda ação `data-acao` tratada, toda tela existe, toda classe tem estilo, sem
  áudio, as 8 estratégias e o resultado instantâneo presentes.

## Validação visual (navegador embutido, com o save v1 real e saves gerados)
Verificado em 1440×900 e 375×812: Carreira, Próxima luta (com e sem luta marcada), Treinamento, Ranking, perfil de
lutador, Legado, plano de estratégia, resumo de round, resultado oficial (derrota por nocaute, vitória por decisão,
vitória de título), retomada de luta após recarregar, as 3 eras, criação de lutador com apelido. As telas secundárias
(Estatísticas, Habilidades, Traços, Distribuir, Academia, Categoria, Hall) foram abertas e renderizam sem erro; só a de
Estatísticas foi conferida visualmente. Sem erros no console e sem rolagem horizontal nas telas do menu principal em 375 px.

## Limitações conhecidas
- O campeão conta como #1 na lista (o #1 "de ranking" é #2 no jogo); a contagem é a mesma do motor.
- Não há teste automatizado de navegador (só as conferências estáticas e a validação manual descrita acima).
- O lutador criado sem foto usa iniciais; a foto é opcional na criação.
