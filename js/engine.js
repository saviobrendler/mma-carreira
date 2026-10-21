// Motor do jogo: simulacao de luta por rounds, carreira, idade, lesoes, eventos e ranking.
// Funciona no navegador (window.MMA) e no Node (module.exports), para testes.
(function (raiz) {
  'use strict';

  const ATRIBUTOS = ['forca', 'velocidade', 'resistencia', 'queixo', 'striking', 'grappling', 'bjj', 'wrestling', 'defesa', 'qi'];

  const ROTULOS = {
    forca: 'Força',
    velocidade: 'Velocidade',
    resistencia: 'Resistência',
    queixo: 'Queixo',
    striking: 'Striking',
    grappling: 'Grappling',
    bjj: 'BJJ',
    wrestling: 'Wrestling',
    defesa: 'Defesa de queda',
    qi: 'QI de luta',
  };

  // Perfis base por estilo: usados so para lutadores sem dado de pesquisa.
  const PERFIS = {
    striking: { forca: 62, velocidade: 72, resistencia: 60, queixo: 60, striking: 78, grappling: 40, bjj: 35, wrestling: 40, defesa: 66, qi: 60 },
    luta_livre: { forca: 70, velocidade: 58, resistencia: 66, queixo: 64, striking: 45, grappling: 55, bjj: 45, wrestling: 80, defesa: 62, qi: 60 },
    grappling: { forca: 62, velocidade: 60, resistencia: 64, queixo: 58, striking: 42, grappling: 82, bjj: 88, wrestling: 58, defesa: 60, qi: 66 },
    misto: { forca: 64, velocidade: 64, resistencia: 66, queixo: 62, striking: 64, grappling: 62, bjj: 60, wrestling: 62, defesa: 64, qi: 66 },
  };

  const ESTILOS = {
    striking: 'Striker',
    luta_livre: 'Wrestler',
    grappling: 'Grappler',
    misto: 'Completo',
  };

  // Modalidade favorita do lutador: define o estilo-base e da um bonus inicial pequeno.
  const MODALIDADES = {
    bjj: { nome: 'Jiu-jitsu', estilo: 'grappling', bonus: { bjj: 5, grappling: 2 }, descr: 'Arte suave: finalizações e controle no chão.' },
    judo: { nome: 'Judô', estilo: 'luta_livre', bonus: { grappling: 4, forca: 2 }, descr: 'Projeções, pegada e domínio de quimono.' },
    wrestling: { nome: 'Wrestling', estilo: 'luta_livre', bonus: { wrestling: 5, defesa: 2 }, descr: 'Quedas fortes e defesa de queda sólida.' },
    boxe: { nome: 'Boxe', estilo: 'striking', bonus: { striking: 3, velocidade: 2, queixo: 2 }, descr: 'Mãos rápidas, esquiva e queixo duro.' },
    kickboxing: { nome: 'Kickboxing', estilo: 'striking', bonus: { striking: 3, velocidade: 3, resistencia: 1 }, descr: 'Socos e chutes em volume, com boa mobilidade.' },
    muaythai: { nome: 'Muay Thai', estilo: 'striking', bonus: { striking: 3, forca: 2, queixo: 2 }, descr: 'Joelhos, cotoveladas e clinch.' },
    karate: { nome: 'Karatê', estilo: 'striking', bonus: { velocidade: 4, qi: 3, defesa: 1 }, descr: 'Distância, timing e contra-ataque.' },
    mma: { nome: 'MMA completo', estilo: 'misto', bonus: { qi: 3, resistencia: 2 }, descr: 'Sem especialidade: equilíbrio entre as fases.' },
  };

  const ESTRATEGIAS = {
    trocar: { nome: 'Trocar em pé', descr: 'Troca golpes em pé, sem buscar a queda.', striking: 1.15, custo: 1.2, derrubada: 0, dano: 1 },
    pressionar: { nome: 'Pressionar', descr: 'Ataque constante. Mais dano, mais desgaste.', striking: 1.1, custo: 1.5, derrubada: 0.1, dano: 1.1 },
    derrubar: { nome: 'Derrubar', descr: 'Busca a queda e leva a luta ao chão.', striking: 0.85, custo: 1.3, derrubada: 0.72, dano: 0.95 },
    cautela: { nome: 'Cautela', descr: 'Poupa energia e foca em defesa.', striking: 0.9, custo: 0.7, derrubada: 0.05, dano: 0.8 },
    contra: { nome: 'Contra-golpe', descr: 'Espera o rival e pune o erro dele. Poupa fôlego.', striking: 0.85, custo: 0.8, derrubada: 0, dano: 0.9, req: 'contra' },
    clinch: { nome: 'Clinch', descr: 'Colado no rival: joelhadas e projeções.', striking: 0.95, custo: 1.3, derrubada: 0.3, dano: 0.95, req: 'clinch' },
  };

  // Taticas no chao. "cima" = quem domina a posicao; "baixo" = quem esta por baixo.
  // As bases (controlar e escapar) reproduzem o comportamento antigo; as outras trocam risco por ganho.
  const TATICAS_CHAO = {
    controlar: { nome: 'Controlar', descr: 'Segura a posição e cansa o rival. Equilibrado.', lado: 'cima', custo: 1.3, dano: 1, golpe: 0.5, sub: 1, fuga: 1 },
    castigar: { nome: 'Castigar', descr: 'Soca e cotovela por cima. Mais dano, menos chance de finalizar.', lado: 'cima', custo: 2.0, dano: 1.1, golpe: 0.8, sub: 0.45, fuga: 1.2 },
    finalizar: { nome: 'Buscar finalização', descr: 'Ataca o braço ou o pescoço. Arriscado e cansativo.', lado: 'cima', custo: 2.4, dano: 0.6, golpe: 0.12, sub: 1.8, fuga: 0.95 },
    escapar: { nome: 'Escapar', descr: 'Tenta levantar ou virar a posição.', lado: 'baixo', custo: 1.3, dano: 1, fuga: 1, subSofrida: 1, subPropria: 0 },
    proteger: { nome: 'Proteger', descr: 'Cobre o rosto e segura. Sofre menos dano, mas escapa menos.', lado: 'baixo', custo: 0.8, dano: 0.5, fuga: 0.6, subSofrida: 0.8, subPropria: 0 },
    guarda: { nome: 'Atacar da guarda', descr: 'Procura uma finalização de baixo.', lado: 'baixo', custo: 1.8, dano: 1, fuga: 0.8, subSofrida: 1, subPropria: 1 },
    raspar: { nome: 'Raspar', descr: 'Tenta inverter a posição e sair por cima.', lado: 'baixo', custo: 2.0, dano: 1, fuga: 0.5, subSofrida: 1.1, subPropria: 0, raspa: true, req: 'raspar' },
  };

  const ORDEM_DIVISOES = ['peso_mosca', 'peso_galo', 'peso_pena', 'peso_leve', 'peso_meio_medio', 'peso_medio', 'peso_meio_pesado', 'peso_pesado'];
  const DIVISOES_ERAS = ['peso_aberto', 'peso_pesado'];
  const PONTOS_CRIACAO = 12;
  const CUSTO_LUTA = 35; // energia gasta em cada luta
  const ENERGIA_MIN_LUTA = 30; // energia minima para aceitar uma luta

  // Contadores de uma luta (por lutador) e acumulados da carreira.
  const ESTAT_VAZIA = { tentativas: 0, acertos: 0, acertosPe: 0, acertosChao: 0, quedasTent: 0, quedasOk: 0, subTent: 0, subOk: 0, chaoTempo: 0 };
  function novasEstatisticas() {
    return [Object.assign({}, ESTAT_VAZIA), Object.assign({}, ESTAT_VAZIA)];
  }
  const IDADE_PADRAO = 25;

  // Ano de referencia de cada periodo, para calcular a idade dos lutadores reais.
  const ANO_PERIODO = { eras: 2000, auge: 2012, atual: 2026 };

  const LESOES = [
    { nome: 'Corte', semanas: 1 },
    { nome: 'Entorse', semanas: 2 },
    { nome: 'Concussão', semanas: 3 },
    { nome: 'Lesão no joelho', semanas: 4 },
  ];

  // Eventos de carreira. Os valores seguem a economia: treino $100, vida $60 por semana, bolsa ~$1.000.
  // Eventos de carreira. Os valores seguem a economia: treino $100, vida $60 por semana, bolsa ~$1.000.
  // Eventos de carreira. Os valores seguem a economia: treino $100, vida $60 por semana, bolsa ~$1.000.
  // Eventos de carreira. Os valores seguem a economia: treino $100, vida $60 por semana, bolsa ~$1.000.
  // Eventos de carreira. Os valores seguem a economia: treino $100, vida $60 por semana, bolsa ~$1.000.
  // Eventos de carreira. Os valores seguem a economia: treino $100, vida $60 por semana, bolsa ~$1.000.
  const EVENTOS = [
    {
      id: 'patrocinio',
      titulo: 'Proposta de patrocínio',
      texto: 'Uma marca local quer seu nome no short em troca de um contrato.',
      opcoes: [
        { rotulo: 'Aceitar', resumo: '+$900 e +5 de fama', efeito: { dinheiro: 900, fama: 5 } },
        { rotulo: 'Recusar', resumo: '+10 de energia', efeito: { energia: 10 } },
      ],
    },
    {
      id: 'treinador',
      titulo: 'Treinador especialista',
      texto: 'Um treinador de renome oferece uma semana intensiva de graça. Cansa, mas rende.',
      opcoes: [
        { rotulo: 'Treinar com ele', resumo: '+2 em um atributo (até o teto) e -30 de energia', efeito: { atributoAleatorio: 2, energia: -30 } },
        { rotulo: 'Recusar', resumo: 'Sem efeito', efeito: {} },
      ],
    },
    {
      id: 'provocacao',
      titulo: 'Provocação na coletiva',
      texto: 'Um rival te provoca em público. Responder rende atenção, mas desgasta.',
      opcoes: [
        { rotulo: 'Responder', resumo: '+10 pts de ranking, +8 de fama e -10 de energia', efeito: { pontos: 10, fama: 8, energia: -10 } },
        { rotulo: 'Ignorar', resumo: '+5 de energia', efeito: { energia: 5 } },
      ],
    },
    {
      id: 'ombro',
      titulo: 'Dor no ombro',
      texto: 'Uma dor chata no ombro. Dá para treinar, mas o risco de lesão sobe.',
      opcoes: [
        { rotulo: 'Treinar mesmo assim', resumo: '+10 XP, risco de lesão de 15%', efeito: { xp: 10, riscoLesao: 0.15 } },
        { rotulo: 'Descansar', resumo: '+25 de energia', efeito: { energia: 25 } },
      ],
    },
    {
      id: 'rival',
      titulo: 'Rival na coletiva',
      texto: 'Um rival aceita um duelo de palavras diante das câmeras. A torcida adora.',
      opcoes: [
        { rotulo: 'Aceitar o duelo', resumo: '+15 pts de ranking, +12 de fama e -5 de energia', efeito: { pontos: 15, fama: 12, energia: -5 } },
        { rotulo: 'Manter o foco', resumo: '+10 de energia', efeito: { energia: 10 } },
      ],
    },
    {
      id: 'convite',
      titulo: 'Participação extra',
      texto: 'Uma promotora menor oferece uma participação extra, sem efeito no ranking, por um bom cachê.',
      opcoes: [
        { rotulo: 'Aceitar o cachê', resumo: '+$450, +8 XP, -15 de energia', efeito: { dinheiro: 450, xp: 8, energia: -15 } },
        { rotulo: 'Recusar', resumo: 'Sem efeito', efeito: {} },
      ],
    },
    {
      id: 'midia',
      titulo: 'Entrevista exclusiva',
      texto: 'Um canal grande quer uma entrevista exclusiva com você.',
      opcoes: [
        { rotulo: 'Dar a entrevista', resumo: '+$300 e +10 de fama', efeito: { dinheiro: 300, fama: 10 } },
        { rotulo: 'Recusar', resumo: '+5 de energia', efeito: { energia: 5 } },
      ],
    },
    {
      id: 'redes',
      titulo: 'O rival te provoca nas redes',
      texto: 'O seu próximo adversário postou uma provocação sobre você. A torcida espera uma resposta.',
      opcoes: [
        { rotulo: 'Responder à altura', resumo: '+10 de fama, rivalidade mais quente e -5 de energia', efeito: { fama: 10, heat: 1, energia: -5 } },
        { rotulo: 'Ignorar', resumo: '+5 de energia', efeito: { energia: 5 } },
      ],
    },
    {
      id: 'fas',
      titulo: 'Fãs na porta da academia',
      texto: 'Um grupo de fãs espera você depois do treino.',
      opcoes: [
        { rotulo: 'Tirar fotos e dar autógrafos', resumo: '+8 de fama e -10 de energia', efeito: { fama: 8, energia: -10 } },
        { rotulo: 'Seguir o treino', resumo: '+10 XP', efeito: { xp: 10 } },
      ],
    },
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function criarRng(semente) {
    let t = semente >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rating(lutador) {
    const soma = ATRIBUTOS.reduce((s, k) => s + lutador.atributos[k], 0);
    return Math.round(soma / ATRIBUTOS.length);
  }

  // Overall exato (com casas decimais), para mostrar a evolucao do lutador.
  function ratingExato(lutador) {
    const soma = ATRIBUTOS.reduce((s, k) => s + lutador.atributos[k], 0);
    return soma / ATRIBUTOS.length;
  }

  function estrategia(chave) {
    return ESTRATEGIAS[chave] || ESTRATEGIAS.trocar;
  }

  // Declinio com a idade: a partir dos 31, perde velocidade, fôlego e força.
  function ajustarIdade(attrs, idade) {
    const extra = Math.max(0, idade - 31);
    const out = Object.assign({}, attrs);
    if (extra > 0) {
      out.velocidade = clamp(out.velocidade - extra * 1.2, 1, 99);
      out.resistencia = clamp(out.resistencia - extra * 1.0, 1, 99);
      out.forca = clamp(out.forca - extra * 0.6, 1, 99);
    }
    return out;
  }

  function preparar(lutador, penalidade) {
    return {
      nome: lutador.nome,
      attr: Object.assign({}, lutador.atributos),
      dano: 0,
      corte: 0,
      stam: clamp(100 - (penalidade || 0), 10, 100),
    };
  }

  function fadiga(f) {
    return clamp(f.stam / 100, 0.45, 1);
  }

  function ev(texto, tipo, extra) {
    return Object.assign({ texto: texto, tipo: tipo || 'normal' }, extra || {});
  }

  const TEXTOS_SOCO = ['acerta um jab limpo', 'conecta um direto', 'encaixa um cruzado', 'acerta um gancho', 'castiga com uma sequência'];
  const TEXTOS_CHUTE = ['acerta um low kick', 'acerta um chute no corpo', 'acerta um chute alto'];
  const TEXTOS_JOELHO = ['acerta um joelho'];

  // Escolha de tatica em pe: olha o proprio ponto forte e a fraqueza do rival (um wrestler contra quem
  // defende mal a queda insiste nela; contra quem defende bem, volta para a trocacao).
  function escolherIA(f, r, opp) {
    if (f.stam < 35) return 'cautela';
    const a = f.attr;
    const o = opp ? opp.attr : null;
    const queda = a.wrestling + a.grappling * 0.4 - (o ? o.defesa * 0.6 + o.wrestling * 0.2 : 40);
    const troca = a.striking + a.velocidade * 0.3 - (o ? o.defesa * 0.6 + o.striking * 0.15 : 45);
    let pQueda = clamp(0.36 + (queda - troca) / 100, 0.04, 0.78);
    if (o && o.bjj - a.bjj > 14 && a.wrestling < 70) pQueda *= 0.6; // nao leva o grappler para onde ele quer
    const p = r();
    if (p < pQueda) return 'derrubar';
    const q = r();
    if (troca > 10) return q < 0.5 ? 'pressionar' : q < 0.92 ? 'trocar' : 'cautela';
    if (troca < -8) return q < 0.38 ? 'cautela' : q < 0.82 ? 'trocar' : 'pressionar';
    return q < 0.33 ? 'pressionar' : q < 0.66 ? 'trocar' : 'cautela';
  }

  // Tracos do lutador (ate 3 na carreira) e golpes de assinatura (ate 2).
  const TRACOS = {
    nocauteador: { nome: 'Nocauteador', descr: '+10% de dano nos golpes e nocaute mais provável.' },
    queixo_de_aco: { nome: 'Queixo de aço', descr: 'Aguenta bem mais dano antes de ir a nocaute.' },
    mestre_finalizacao: { nome: 'Mestre da finalização', descr: '+25% de chance de finalizar e escapa melhor das finalizações.' },
    pressao: { nome: 'Pressão constante', descr: 'Pressionar gasta menos fôlego e dá +8% de dano.' },
    contra_ataque: { nome: 'Contra-atacador', descr: 'Quando o rival erra, você devolve o golpe com mais frequência.' },
    wrestler_dominante: { nome: 'Wrestler dominante', descr: '+10% de chance de queda e mais difícil de ser escapado por baixo.' },
    cardio: { nome: 'Cardio de aço', descr: 'Gasta 20% menos fôlego e recupera mais entre os rounds.' },
    resiliente: { nome: 'Resiliente', descr: 'Sofre menos cortes e cura lesões mais rápido.' },
    showman: { nome: 'Showman', descr: 'Ganha 25% mais fama em tudo o que faz.' },
  };

  // tipo: golpe (em pe ou por cima), queda (em pe) ou finalizacao (por cima ou da guarda).
  const ASSINATURAS = {
    gancho_esquerda: { nome: 'Gancho de esquerda', tipo: 'golpe', descr: 'Golpe pesado: muito dano se acertar, mas te expõe se errar.' },
    chute_alto: { nome: 'Chute alto', tipo: 'golpe', descr: 'Golpe pesado: muito dano se acertar, mas te expõe se errar.' },
    joelhada_voadora: { nome: 'Joelhada voadora', tipo: 'golpe', descr: 'Golpe pesado: muito dano se acertar, mas te expõe se errar.' },
    double_leg: { nome: 'Double leg explosivo', tipo: 'queda', descr: 'Queda quase certa, mas te expõe se o rival defender.' },
    triangulo: { nome: 'Triângulo', tipo: 'finalizacao', descr: 'Finalização muito mais provável, por cima ou da guarda.' },
    mata_leao: { nome: 'Mata-leão', tipo: 'finalizacao', descr: 'Finalização muito mais provável, por cima ou da guarda.' },
    chave_de_braco: { nome: 'Chave de braço', tipo: 'finalizacao', descr: 'Finalização muito mais provável, por cima ou da guarda.' },
  };

  // Estrategias de round: o jogador escolhe uma antes de cada round e o motor decide as taticas de cada
  // momento seguindo os pesos. pe / cima / baixo = onde a luta esta (em pe, por cima, por baixo).
  const ESTRATEGIAS_ROUND = {
    trocacao: {
      nome: 'Trocação agressiva', curta: 'Trocação', descr: 'Vai para a trocação e busca o nocaute. Bate mais, mas se expõe.',
      pe: { trocar: 5, pressionar: 3.5, cautela: 1, derrubar: 0.5 }, cima: { castigar: 6, controlar: 3, finalizar: 1 }, baixo: { escapar: 5, proteger: 3, guarda: 2 },
    },
    contra: {
      nome: 'Contra-ataque', curta: 'Contra-ataque', descr: 'Espera o rival errar e pune. Poupa fôlego, mas cede a iniciativa.',
      pe: { contra: 5, cautela: 3.5, trocar: 2.5, derrubar: 0.5, pressionar: 0.5 }, cima: { controlar: 5, castigar: 4, finalizar: 1 }, baixo: { escapar: 5, proteger: 4, guarda: 1 },
    },
    pressao: {
      nome: 'Pressão constante', curta: 'Pressão', descr: 'Avança o tempo todo, cansa o rival e acumula rounds. Gasta fôlego.',
      pe: { pressionar: 6, trocar: 2, clinch: 1, derrubar: 1 }, cima: { castigar: 5, controlar: 4, finalizar: 1 }, baixo: { escapar: 6, proteger: 3, guarda: 1 },
    },
    quedas: {
      nome: 'Priorizar quedas', curta: 'Quedas', descr: 'Insiste na queda para tirar o rival da zona de conforto.',
      pe: { derrubar: 6, pressionar: 1.5, trocar: 1.5, clinch: 1 }, cima: { controlar: 5, castigar: 4, finalizar: 1 }, baixo: { escapar: 6, proteger: 3, guarda: 1 },
    },
    wrestling: {
      nome: 'Wrestling e controle', curta: 'Controle', descr: 'Derruba e segura: ganha rounds com controle, sem se arriscar.',
      pe: { derrubar: 4.5, clinch: 2, pressionar: 1.5, cautela: 1, trocar: 1 }, cima: { controlar: 7, castigar: 2.5, finalizar: 0.5 }, baixo: { escapar: 7, proteger: 2, guarda: 1 },
    },
    finalizacao: {
      nome: 'Buscar finalização', curta: 'Finalização', descr: 'Leva para o chão e ataca submissões, mesmo por baixo.',
      pe: { derrubar: 4, clinch: 1.5, trocar: 2, cautela: 1.5, pressionar: 1 }, cima: { finalizar: 6, controlar: 3, castigar: 1 }, baixo: { guarda: 6, raspar: 1.5, escapar: 2, proteger: 0.5 },
    },
    equilibrada: { nome: 'Estratégia equilibrada', curta: 'Equilibrada', descr: 'Lê o rival e alterna as ferramentas conforme a situação.', adaptativa: true },
    resistencia: {
      nome: 'Administrar resistência', curta: 'Resistência', descr: 'Poupa fôlego e dano para vir forte nos rounds finais.',
      pe: { cautela: 4, trocar: 3, contra: 1.5, derrubar: 1, pressionar: 0.5 }, cima: { controlar: 6, castigar: 3, finalizar: 1 }, baixo: { proteger: 4, escapar: 4, guarda: 2 },
      custo: 0.82,
    },
  };

  // Efeito da tatica de quem se defende sobre o ataque do rival (pedra-papel-tesoura leve).
  const CONTRA = {
    trocar: { acerto: 1.0, queda: 1.1 },
    pressionar: { acerto: 1.05, queda: 1.0 },
    derrubar: { acerto: 1.1, queda: 0.8 },
    cautela: { acerto: 0.8, queda: 0.7 },
    contra: { acerto: 0.75, queda: 0.85 },
    clinch: { acerto: 1.0, queda: 0.9 },
  };

  // Plano de luta do rival: como ele abre e como fecha os rounds (o scouting revela).
  function gerarPlano(attr, r) {
    const ataque = attr.striking + attr.velocidade * 0.3;
    const luta = attr.wrestling + attr.grappling * 0.5;
    const lutaMais = luta >= ataque - 4;
    const abre = r() < 0.75 ? (lutaMais ? 'derrubar' : 'pressionar') : (lutaMais ? 'pressionar' : 'trocar');
    const fecha = attr.resistencia < 62 ? 'cautela' : (r() < 0.6 ? 'pressionar' : 'trocar');
    const nomes = { derrubar: 'tentando a queda', pressionar: 'pressionando', trocar: 'trocando em pé', cautela: 'com cautela, poupando fôlego' };
    return { abre: abre, fecha: fecha, texto: 'Costuma abrir os rounds ' + nomes[abre] + ' e fechar ' + nomes[fecha] + '.' };
  }

  // Uma luta em rounds. Pode ser serializada no meio para retomar depois.
  class Luta {
    constructor(a, b, opcoes) {
      const o = opcoes || {};
      this.f = [preparar(a, o.penalidadeA), preparar(b, o.penalidadeB)];
      this.rodadasTotais = o.rodadas || 3;
      this.rng = o.rng || Math.random;
      this.rodadas = [];
      this.totais = [0, 0];
      this.cartoes = [[0, 0], [0, 0], [0, 0]]; // total de cada juiz: [A, B]
      this.vitoriasRodada = [0, 0];
      this.resultado = null;
      this.estatisticas = novasEstatisticas();
      this.rd = null; // round em andamento (momentos ja jogados)
      this.tracos = [o.tracosA || [], o.tracosB || []];
      this.assinatura = [o.assinaturaA || null, null]; // { id, nome, tipo }
      this.provocacao = o.provocacao || 0; // 0, 1 ou 2: o rival fica mais agressivo
      this.leitura = [!!o.scoutA, false]; // lado 0 conhece o plano do rival?
      this.plano = gerarPlano(this.f[1].attr, this.rng);
      this.buff = [null, null]; // ajuste de atributos do intervalo, vale 1 round
      this.conselhoUsado = 0; // conselhos do corner usados neste intervalo
      this.conselhoIds = []; // quais (o mesmo nao repete no intervalo)
      this.desbloqueios = [o.desbloqueiosA || [], []]; // taticas extras liberadas pela arvore
      this.estrategia = [o.estrategiaA && ESTRATEGIAS_ROUND[o.estrategiaA] ? o.estrategiaA : null, null]; // estrategia de round de cada lado
    }

    get encerrada() {
      return this.resultado !== null;
    }

    toJSON() {
      return {
        f: this.f,
        rodadasTotais: this.rodadasTotais,
        rodadas: this.rodadas,
        totais: this.totais,
        cartoes: this.cartoes,
        vitoriasRodada: this.vitoriasRodada,
        resultado: this.resultado,
        estatisticas: this.estatisticas,
        rd: this.rd,
        tracos: this.tracos,
        assinatura: this.assinatura,
        provocacao: this.provocacao,
        leitura: this.leitura,
        plano: this.plano,
        buff: this.buff,
        conselhoUsado: this.conselhoUsado,
        conselhoIds: this.conselhoIds,
        desbloqueios: this.desbloqueios,
        estrategia: this.estrategia,
      };
    }

    static restaurar(j, rng) {
      const l = Object.create(Luta.prototype);
      l.f = j.f;
      l.f.forEach((x) => { if (!Number.isFinite(x.corte)) x.corte = 0; });
      l.rodadasTotais = j.rodadasTotais;
      l.rodadas = j.rodadas;
      l.totais = j.totais;
      l.cartoes = j.cartoes || [[0, 0], [0, 0], [0, 0]];
      l.vitoriasRodada = j.vitoriasRodada;
      l.resultado = j.resultado;
      l.estatisticas = j.estatisticas || novasEstatisticas();
      l.rd = j.rd || null;
      if (l.rd) {
        // round salvo por uma versao anterior: completa o que falta
        if (!Array.isArray(l.rd.ass)) l.rd.ass = [false, false];
        if (!Array.isArray(l.rd.exp)) l.rd.exp = [0, 0];
        if (!Number.isFinite(l.rd.medico)) l.rd.medico = -1;
      }
      l.tracos = j.tracos || [[], []];
      l.assinatura = j.assinatura || [null, null];
      l.provocacao = j.provocacao || 0;
      l.leitura = j.leitura || [false, false];
      l.plano = j.plano || gerarPlano(l.f[1].attr, rng || Math.random);
      l.buff = j.buff || [null, null];
      l.conselhoUsado = Number(j.conselhoUsado) || 0;
      l.conselhoIds = j.conselhoIds || [];
      l.desbloqueios = j.desbloqueios || [[], []];
      l.estrategia = j.estrategia || [null, null];
      l.rng = rng || Math.random;
      return l;
    }

    // Quantos conselhos o corner pode dar por intervalo (frieza dobra).
    conselhoMax() {
      return this.tem(0, 'hab_frieza') ? 2 : 1;
    }

    tem(lado, traco) {
      return this.tracos[lado].indexOf(traco) >= 0;
    }

    iniciativa(r) {
      const a = this.f[0].attr;
      const b = this.f[1].attr;
      const w0 = a.velocidade * 0.6 + a.qi * 0.4;
      const w1 = b.velocidade * 0.6 + b.qi * 0.4;
      return r() < w0 / (w0 + w1) ? 0 : 1;
    }

    // ---- Luta em momentos: o jogador decide durante o round ----

    abrirRound() {
      if (this.resultado) throw new Error('Luta já encerrada.');
      if (!this.rd) {
        this.rd = { num: this.rodadas.length + 1, eventos: [], dano: [0, 0], ctrl: [0, 0], chao: -1, ko: -1, sub: -1, medico: -1, i: 0, ass: [false, false], exp: [0, 0], est0: JSON.parse(JSON.stringify(this.estatisticas)) };
      }
      return this.rd;
    }

    // Define a estrategia de round de um lado (null volta a IA adaptativa).
    definirEstrategia(lado, id) {
      if (id !== null && !ESTRATEGIAS_ROUND[id]) return false;
      this.estrategia[lado] = id;
      return true;
    }

    // Estatisticas do round em andamento (diferenca desde a abertura do round).
    estatisticasRound() {
      const rd = this.rd;
      const campos = ['tentativas', 'acertos', 'acertosPe', 'acertosChao', 'quedasTent', 'quedasOk', 'subTent', 'subOk', 'chaoTempo'];
      return [0, 1].map((i) => {
        const o = {};
        campos.forEach((k) => { o[k] = this.estatisticas[i][k] - (rd && rd.est0 ? rd.est0[i][k] : 0); });
        return o;
      });
    }

    // Tatica de um momento para quem segue uma estrategia de round (sorteio por pesos, so taticas liberadas).
    taticaPlano(lado) {
      const id = this.estrategia[lado];
      const plano = ESTRATEGIAS_ROUND[id];
      if (!plano || plano.adaptativa) return this.taticaIA(lado);
      const rd = this.rd;
      const f = this.f[lado];
      const sit = !rd || rd.chao < 0 ? 'pe' : rd.chao === lado ? 'cima' : 'baixo';
      let pesos = Object.assign({}, plano[sit]);
      if (sit === 'pe' && f.stam < 30) pesos = { cautela: 3, trocar: 1 };
      if (sit === 'baixo' && f.dano > 95) pesos.proteger = (pesos.proteger || 0) + 3;
      const livres = this.desbloqueios[lado] || [];
      ['contra', 'clinch', 'raspar'].forEach((k) => {
        if (pesos[k] && livres.indexOf(k) < 0) {
          const alvo = k === 'raspar' ? 'escapar' : k === 'contra' ? 'cautela' : 'pressionar';
          pesos[alvo] = (pesos[alvo] || 0) + pesos[k];
          delete pesos[k];
        }
      });
      const chaves = Object.keys(pesos);
      const total = chaves.reduce((t, k) => t + pesos[k], 0);
      let x = this.rng() * total;
      for (const k of chaves) {
        x -= pesos[k];
        if (x <= 0) return k;
      }
      return chaves[chaves.length - 1];
    }

    // Onde esta o lutador 0 (o jogador): 'pe', 'cima' (por cima no chao) ou 'baixo'.
    situacao() {
      const rd = this.rd;
      if (!rd || rd.chao < 0) return 'pe';
      return rd.chao === 0 ? 'cima' : 'baixo';
    }

    // Quem esta ganhando o round agora (mesma conta dos juizes). Positivo = jogador na frente.
    parcialRound() {
      const rd = this.rd;
      if (!rd) return 0;
      const e = this.estatisticasRound();
      return rd.dano[0] - rd.dano[1] + (rd.ctrl[0] - rd.ctrl[1]) * 1.5 + (e[0].quedasOk - e[1].quedasOk) * 2.2 + (e[0].subTent - e[1].subTent) * 0.35 + (e[0].acertos - e[1].acertos) * 0.25;
    }

    // A assinatura do lado e usavel agora? (uma vez por round, e precisa servir para a situacao)
    assinaturaDisponivel(lado) {
      const sig = this.assinatura[lado];
      const rd = this.rd;
      if (!sig || !rd || rd.ass[lado]) return false;
      if (rd.chao < 0) return sig.tipo === 'golpe' || sig.tipo === 'queda';
      if (rd.chao === lado) return sig.tipo === 'golpe' || sig.tipo === 'finalizacao';
      return sig.tipo === 'finalizacao';
    }

    // O que o jogador sabe do rival (so com scouting ou conselho do corner).
    leituraRival() {
      if (!this.leitura[0] || !this.rd) return null;
      const rd = this.rd;
      if (rd.chao >= 0) return { texto: rd.chao === 1 ? 'Ele está por cima e deve castigar ou buscar a finalização.' : 'Ele está por baixo e deve tentar escapar.', chave: null };
      const chave = rd.i < 2 ? this.plano.abre : rd.i >= 6 ? this.plano.fecha : null;
      if (!chave) return { texto: 'No meio do round ele alterna as táticas.', chave: null };
      const t = { derrubar: 'tentar a queda', pressionar: 'pressionar', trocar: 'trocar golpes em pé', cautela: 'ter cautela' };
      return { texto: 'Deve ' + t[chave] + ' agora.', chave: chave };
    }

    // Tatica da IA para um lado, conforme a situacao.
    taticaIA(lado) {
      const rd = this.rd;
      const f = this.f;
      const r = this.rng;
      if (!rd || rd.chao < 0) {
        if (lado === 1) {
          const p = r();
          if (rd && rd.i < 2 && p < 0.6) return this.plano.abre;
          if (rd && rd.i >= 6 && p < 0.6) return this.plano.fecha;
          if (this.provocacao > 0 && r() < 0.22 * this.provocacao) return 'pressionar';
        }
        return escolherIA(f[lado], r, f[1 - lado]);
      }
      const eu = f[lado].attr;
      const ele = f[1 - lado].attr;
      if (rd.chao === lado) {
        const p = r();
        if (eu.bjj > ele.bjj + 8 && p < 0.55) return 'finalizar';
        if (eu.striking + eu.forca > ele.striking + ele.forca && p < 0.7) return 'castigar';
        return 'controlar';
      }
      if (f[lado].stam < 40 || f[lado].dano > 70) return 'proteger';
      if ((eu.bjj > ele.bjj + 6 && r() < 0.8) || (eu.bjj >= 76 && r() < 0.5)) return 'guarda';
      return 'escapar';
    }

    // Aceita a chave do jogador so se ela vale para a situacao atual; senao, decide a IA.
    _chave(lado, chave) {
      const rd = this.rd;
      if (!chave) return this.estrategia[lado] ? this.taticaPlano(lado) : this.taticaIA(lado);
      if (chave === 'assinatura') return this.assinaturaDisponivel(lado) ? 'assinatura' : this.taticaIA(lado);
      const liberada = (x) => !x.req || this.desbloqueios[lado].indexOf(x.req) >= 0;
      if (rd.chao < 0) return ESTRATEGIAS[chave] && liberada(ESTRATEGIAS[chave]) ? chave : this.taticaIA(lado);
      const t = TATICAS_CHAO[chave];
      const ladoChao = rd.chao === lado ? 'cima' : 'baixo';
      return t && t.lado === ladoChao && liberada(t) ? chave : this.taticaIA(lado);
    }

    // Uma troca (golpes em pe, queda ou um instante no chao). Devolve os eventos novos.
    _troca(k0, k1) {
      const rd = this.rd;
      const f = this.f;
      const r = this.rng;
      const novos = [];
      const push = (texto, tipo, extra) => {
        const e = ev(texto, tipo, extra);
        e.dano = [f[0].dano, f[1].dano];
        e.stam = [f[0].stam, f[1].stam];
        e.corte = [f[0].corte, f[1].corte];
        rd.eventos.push(e);
        novos.push(e);
        return e;
      };
      const chaves = [this._chave(0, k0), this._chave(1, k1)];
      if (chaves[0] === 'assinatura') rd.ass[0] = true;

      // Efeitos dos tracos de quem ataca (a) e de quem defende (d).
      const queixoDe = (d) => f[d].attr.queixo * (this.tem(d, 'queixo_de_aco') ? 1.15 : 1) * (1 - f[d].dano / 160);
      const golpear = (a, d, fator, mult, texto, extra, kind) => {
        // No chao o golpe depende mais de grappling (cotovelada, socos por cima).
        const habilidade = fator < 1 ? f[a].attr.striking * 0.4 + f[a].attr.grappling * 0.6 : f[a].attr.striking;
        const base = ((f[a].attr.forca * 0.3 + habilidade * 0.45 + f[a].attr.velocidade * 0.2) / 100) * 10.7;
        let m = mult;
        if (this.tem(a, 'nocauteador')) m *= 1.07;
        if (this.tem(a, 'pressao') && kind === 'pressionar') m *= 1.08;
        if (this.provocacao > 0) m *= 1 + 0.04 * this.provocacao;
        const d0 = base * (0.7 + r() * 0.6) * m * fator * (1 - f[d].attr.defesa / 250) * fadiga(f[a]);
        const valor = Math.max(0.5, d0);
        f[d].dano += valor;
        rd.dano[a] += valor;
        const est0 = this.estatisticas[a];
        est0.tentativas++;
        est0.acertos++;
        if (fator < 1) est0.acertosChao++;
        else est0.acertosPe++;
        push(`${f[a].nome} ${texto}`, valor > 6.4 ? 'destaque' : 'normal', Object.assign({ ator: a, alvo: d, valor: valor, forte: valor > 6.4 }, extra || {}));
        // Corte no rosto: golpes fortes abrem cortes que podem parar a luta.
        if (valor > 6.4 && f[d].corte < 2 && r() < 0.16 * (this.tem(d, 'resiliente') ? 0.5 : 1)) {
          f[d].corte++;
          push(`Corte! ${f[d].nome} sangra no rosto.`, 'destaque', { ator: a, alvo: d, tipo2: 'corte' });
        }
        const pKO = clamp((valor - queixoDe(d) / 12) / 10 + (this.tem(a, 'nocauteador') ? 0.02 : 0) + (this.tem(a, 'hab_ko') ? 0.04 : 0), 0, 0.4);
        if (r() < pKO) {
          rd.ko = d;
          push(`Nocaute! ${f[d].nome} vai ao chão.`, 'destaque', { ator: a, alvo: d, tipo2: 'ko' });
        }
      };
      const gasto = (lado, custo, chave) => {
        let c = custo;
        if (this.tem(lado, 'cardio')) c *= 0.8;
        if (this.tem(lado, 'pressao') && chave === 'pressionar') c *= 0.85;
        const plano = ESTRATEGIAS_ROUND[this.estrategia[lado]];
        if (plano && plano.custo) c *= plano.custo;
        return c;
      };
      const desgaste = (a, ca, ka, d, cd, kd) => {
        f[a].stam = Math.max(0, f[a].stam - 1.8 * gasto(a, ca, ka) * (1.15 - f[a].attr.resistencia / 200));
        f[d].stam = Math.max(0, f[d].stam - 1.0 * gasto(d, cd, kd) * (1.15 - f[d].attr.resistencia / 200));
      };

      if (rd.chao >= 0) {
        const t = rd.chao;
        const b = 1 - t;
        const sigT = chaves[t] === 'assinatura' ? this.assinatura[t] : null;
        const sigB = chaves[b] === 'assinatura' ? this.assinatura[b] : null;
        const tt = sigT ? (sigT.tipo === 'golpe' ? { custo: 2.6, dano: 1.6, golpe: 1, sub: 0.3, fuga: 1.1 } : { custo: 3, dano: 0.4, golpe: 0.05, sub: 3.2, fuga: 0.95 }) : TATICAS_CHAO[chaves[t]];
        const bb = sigB ? { custo: 2.4, dano: 1, fuga: 0.8, subSofrida: 1, subPropria: 2.4 } : TATICAS_CHAO[chaves[b]];
        rd.ctrl[t]++;
        this.estatisticas[t].chaoTempo++;
        const buscando = chaves[t] === 'finalizar' || (sigT && sigT.tipo === 'finalizacao');
        if (buscando) this.estatisticas[t].subTent++;
        const subT = (this.tem(t, 'mestre_finalizacao') ? 1.25 : 1) * (this.tem(b, 'mestre_finalizacao') ? 0.8 : 1) * (this.tem(t, 'hab_pescoco') ? 1.2 : 1) * (this.tem(b, 'hab_pescoco') ? 0.8 : 1);
        const pSub = clamp(0.04 + (f[t].attr.bjj - f[b].attr.bjj) / 300 + (f[t].attr.bjj / 100) * 0.04, 0.005, 0.25) * fadiga(f[b]) * 0.46 * tt.sub * bb.subSofrida * subT;
        if (r() < pSub) {
          rd.sub = t;
          if (!buscando) this.estatisticas[t].subTent++;
          this.estatisticas[t].subOk++;
          push(`${f[t].nome} encaixa ${sigT ? 'o ' + sigT.nome.toLowerCase() : 'a finalização'}! ${f[b].nome} bate.`, 'destaque', { ator: t, alvo: b, tipo2: 'sub' });
          return novos;
        }
        if (bb.subPropria) {
          const pS = clamp(0.015 + (f[b].attr.bjj - f[t].attr.bjj) / 450 + (f[b].attr.bjj / 100) * 0.02, 0.003, 0.1) * fadiga(f[b]) * (this.tem(b, 'mestre_finalizacao') ? 1.25 : 1) * (bb.subPropria > 1 ? bb.subPropria : 1);
          this.estatisticas[b].subTent++;
          if (r() < Math.min(pS, 0.4)) {
            rd.sub = b;
            this.estatisticas[b].subOk++;
            push(`${f[b].nome} finaliza de baixo${sigB ? ' com ' + sigB.nome.toLowerCase() : ''}! ${f[t].nome} bate.`, 'destaque', { ator: b, alvo: t, tipo2: 'sub' });
            return novos;
          }
          push(`${f[b].nome} ataca da guarda, mas ${f[t].nome} escapa do bote.`, 'normal', { ator: b, alvo: t, tipo2: 'guarda' });
        }
        if (bb.raspa) {
          const pR = clamp(0.14 + (f[b].attr.grappling - f[t].attr.grappling) / 200 + (f[b].attr.bjj - f[t].attr.bjj) / 300, 0.05, 0.4) * fadiga(f[b]);
          if (r() < pR) {
            rd.chao = b;
            push(`${f[b].nome} raspa e fica por cima!`, 'destaque', { ator: b, alvo: t, tipo2: 'raspa' });
            desgaste(t, tt.custo, null, b, bb.custo, null);
            return novos;
          }
        }
        if (r() < tt.golpe) {
          golpear(t, b, 0.9, tt.dano * bb.dano, sigT ? 'solta ' + sigT.nome.toLowerCase() + ' no chão' : 'castiga por cima', { tipo2: 'chao_golpe' }, 'chao');
        } else if (chaves[t] === 'finalizar' || (sigT && sigT.tipo === 'finalizacao')) {
          push(`${f[t].nome} busca a finalização, mas ${f[b].nome} resiste.`, 'normal', { ator: t, alvo: b, tipo2: 'sub_falha' });
        } else if (!bb.subPropria) {
          push(`${f[t].nome} controla por cima.`, 'normal', { ator: t, alvo: b, tipo2: 'controle' });
        }
        if (rd.ko < 0) {
          const dom = (this.tem(t, 'wrestler_dominante') ? 0.85 : 1) * (this.tem(t, 'hab_controle') ? 0.85 : 1);
          // Quem segura por cima usa wrestling e grappling; quem escapa usa jiu-jitsu, grappling e wrestling.
          const controle = f[t].attr.wrestling * 0.45 + f[t].attr.grappling * 0.4 + f[t].attr.forca * 0.15;
          const escape = f[b].attr.bjj * 0.35 + f[b].attr.grappling * 0.35 + f[b].attr.wrestling * 0.3;
          const pFuga = clamp((0.2 + (escape - controle) / 70 + (f[b].stam / 100 - 0.5) * 0.2) * tt.fuga * bb.fuga * dom, 0.03, 0.75);
          if (r() < pFuga) {
            rd.chao = -1;
            push(`${f[b].nome} levanta.`, 'normal', { ator: b, alvo: t, tipo2: 'levanta' });
          }
        }
        desgaste(t, tt.custo, null, b, bb.custo, null);
        return novos;
      }

      // Em pe. Quem usa a assinatura toma a iniciativa.
      let a = this.iniciativa(r);
      if (chaves[0] === 'assinatura') a = 0;
      else if (chaves[1] === 'assinatura') a = 1;
      const d = 1 - a;
      const ka = chaves[a];
      const kd = chaves[d];
      const sig = ka === 'assinatura' ? this.assinatura[a] : null;
      const ea = sig ? ESTRATEGIAS.trocar : estrategia(ka);
      const ed = kd === 'assinatura' ? ESTRATEGIAS.trocar : estrategia(kd);
      const cd = CONTRA[kd === 'assinatura' ? 'trocar' : kd] || CONTRA.trocar;
      const expo = rd.exp[d] > 0 ? 1.25 : 1;
      if (rd.exp[d] > 0) rd.exp[d]--;
      const tentaQueda = sig ? sig.tipo === 'queda' : ea.derrubada > 0 && r() < ea.derrubada;
      if (tentaQueda) {
        this.estatisticas[a].quedasTent++;
        const wr = this.tem(a, 'wrestler_dominante') ? 1.1 : 1;
        const pQueda = clamp((0.46 + (f[a].attr.wrestling * 0.75 + f[a].attr.grappling * 0.25 - f[d].attr.defesa) / 62 + (f[a].attr.grappling - f[d].attr.grappling) / 300) * cd.queda * expo * wr * (sig ? 1.3 : 1), 0.1, 0.92) * fadiga(f[a]);
        if (r() < pQueda) {
          rd.chao = a;
          this.estatisticas[a].quedasOk++;
          push(`${f[a].nome} derruba ${f[d].nome}${sig ? ' com ' + sig.nome.toLowerCase() : ''}!`, 'destaque', { ator: a, alvo: d, tipo2: 'queda' });
        } else {
          push(`${f[a].nome} tenta a queda, mas ${f[d].nome} defende.`, 'normal', { ator: a, alvo: d, tipo2: 'queda_defendida' });
          if (sig) rd.exp[a] = 1;
        }
      } else {
        const pAcerto = clamp(0.45 + (f[a].attr.striking - f[d].attr.defesa) / 140, 0.1, 0.85) * ea.striking * fadiga(f[a]) * cd.acerto * expo * (sig ? 0.8 : 1);
        if (r() < pAcerto) {
          const sorte = r();
          const arma = sig ? (/chute/i.test(sig.nome) ? 'chute' : /joelh/i.test(sig.nome) ? 'joelho' : 'soco') : sorte < 0.55 ? 'soco' : sorte < 0.88 ? 'chute' : 'joelho';
          const lista = arma === 'soco' ? TEXTOS_SOCO : arma === 'chute' ? TEXTOS_CHUTE : TEXTOS_JOELHO;
          const texto = sig ? 'acerta ' + sig.nome.toLowerCase() : lista[Math.floor(r() * lista.length)];
          golpear(a, d, 1, ea.dano * (sig ? 1.9 : 1), texto, { tipo2: 'golpe', arma: arma, assinatura: !!sig }, ka);
        } else {
          this.estatisticas[a].tentativas++;
          push(`${f[a].nome} erra${sig ? ' ' + sig.nome.toLowerCase() : ''}, ${f[d].nome} se defende.`, 'normal', { ator: a, alvo: d, tipo2: 'erro' });
          if (sig) rd.exp[a] = 1;
          // Contra-ataque: quem esta em cautela (ou e contra-atacador) pune o erro.
          const pContra = (kd === 'cautela' ? 0.25 : kd === 'contra' ? 0.45 : 0.05) + (this.tem(d, 'contra_ataque') ? 0.2 : 0);
          if (rd.ko < 0 && r() < pContra) {
            golpear(d, a, 1, 0.9, 'contra-ataca', { tipo2: 'golpe', arma: 'soco', contra: true }, kd);
          }
        }
      }
      desgaste(a, ea.custo, ka, d, ed.custo, kd);
      return novos;
    }

    // Joga um momento: ate 'trocas' trocas, parando antes se algo importante acontecer (queda,
    // nocaute, finalizacao ou fim do round). chave0 e a escolha do jogador; chave1, a do rival.
    jogarMomento(chave0, trocas, chave1) {
      const rd = this.abrirRound();
      const novos = [];
      const n = chave0 === 'assinatura' && this.assinaturaDisponivel(0) ? 1 : trocas || 2;
      for (let k = 0; k < n; k++) {
        if (rd.i >= 8 || rd.ko >= 0 || rd.sub >= 0) break;
        const chaoAntes = rd.chao;
        const eventos = this._troca(chave0, chave1);
        rd.i++;
        if ((rd.ko >= 0 || rd.sub >= 0) && rd.tempoSeg === undefined) rd.tempoSeg = clamp(Math.round((300 * (rd.i - this.rng())) / 8), 5, 299);
        eventos.forEach((e) => novos.push(e));
        if (rd.chao !== chaoAntes || rd.ko >= 0 || rd.sub >= 0) break;
      }
      const acabou = rd.i >= 8 || rd.ko >= 0 || rd.sub >= 0;
      const rodada = acabou ? this._fecharRound() : null;
      return { eventos: novos, rodada: rodada, situacao: this.situacao(), troca: rd.i };
    }

    _tempoTxt(seg) {
      const t = Number.isFinite(seg) ? seg : 300;
      return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    }

    _desfazerBuff() {
      [0, 1].forEach((i) => {
        const b = this.buff[i];
        if (!b) return;
        Object.keys(b).forEach((k) => { this.f[i].attr[k] -= b[k]; });
        this.buff[i] = null;
      });
    }

    _fecharRound() {
      const rd = this.rd;
      const f = this.f;
      const r = this.rng;
      const dano = rd.dano;
      const ctrl = rd.ctrl;
      let ko = rd.ko;
      const sub = rd.sub;
      const num = rd.num;
      this._desfazerBuff();

      // Medico: cortes serios podem encerrar a luta no fim do round.
      let medico = -1;
      if (ko < 0 && sub < 0) {
        [0, 1].forEach((i) => {
          if (medico < 0 && f[i].corte >= 2 && r() < 0.3) medico = i;
        });
        if (medico >= 0) {
          ko = medico;
          rd.eventos.push(Object.assign(ev(`O médico para a luta: o corte de ${f[medico].nome} é grave demais.`, 'destaque', { ator: 1 - medico, alvo: medico, tipo2: 'medico' }), { dano: [f[0].dano, f[1].dano], stam: [f[0].stam, f[1].stam], corte: [f[0].corte, f[1].corte] }));
        }
      }

      const estRound = this.estatisticasRound();
      const rodada = { num: num, eventos: rd.eventos, dano: dano.slice(), placar: [10, 10], ko: ko >= 0, sub: sub >= 0, juizes: null, est: estRound, ctrl: ctrl.slice() };

      // Folego sentido no fim do round, antes da recuperacao do intervalo (e o que a interface mostra).
      rodada.stamFim = [f[0].stam, f[1].stam];

      f.forEach((x, i) => {
        x.stam = Math.min(100, x.stam + 15 + x.attr.resistencia * 0.1 + (this.tem(i, 'cardio') ? 5 : 0));
      });

      if (ko >= 0) {
        const vencedor = 1 - ko;
        rodada.placar = vencedor === 0 ? [10, 8] : [8, 10];
        this.resultado = { vencedor: vencedor, metodo: 'Nocaute', round: num, detalhe: medico >= 0 ? 'parada médica' : null, tempo: this._tempoTxt(medico >= 0 ? 300 : rd.tempoSeg) };
      } else if (sub >= 0) {
        rodada.placar = sub === 0 ? [10, 8] : [8, 10];
        this.resultado = { vencedor: sub, metodo: 'Finalização', round: num, tempo: this._tempoTxt(rd.tempoSeg) };
      } else {
        // Tres juizes: em round parelho eles podem discordar.
        // Alem do dano e do controle, os juizes contam quedas, ameacas de finalizacao e quem tomou a iniciativa.
        const quedas = (estRound[0].quedasOk - estRound[1].quedasOk) * 2.2;
        const ameacas = (estRound[0].subTent - estRound[1].subTent) * 0.35;
        const ritmo = (estRound[0].acertos - estRound[1].acertos) * 0.25;
        const diff = dano[0] - dano[1] + (ctrl[0] - ctrl[1]) * 1.5 + quedas + ameacas + ritmo + (r() - 0.5) * 0.6;
        const card = (d) => (d > 0 ? [10, d > 6 ? 8 : 9] : [d < -6 ? 8 : 9, 10]);
        rodada.placar = card(diff);
        rodada.juizes = [0, 1, 2].map(() => card(diff + (r() - 0.5) * 4.6));
        rodada.juizes.forEach((c, j) => {
          this.cartoes[j][0] += c[0];
          this.cartoes[j][1] += c[1];
        });
      }
      if (ko >= 0 || sub >= 0) {
        for (let j = 0; j < 3; j++) {
          this.cartoes[j][0] += rodada.placar[0];
          this.cartoes[j][1] += rodada.placar[1];
        }
      }

      this.totais[0] += rodada.placar[0];
      this.totais[1] += rodada.placar[1];
      if (rodada.placar[0] > rodada.placar[1]) this.vitoriasRodada[0]++;
      if (rodada.placar[1] > rodada.placar[0]) this.vitoriasRodada[1]++;
      this.rodadas.push(rodada);
      this.rd = null;
      this.conselhoUsado = 0;
      this.conselhoIds = [];

      if (!this.encerrada && num >= this.rodadasTotais) {
        this.resultado = this.decisao();
      }
      return rodada;
    }

    // ---- Corner entre os rounds ----

    opcoesConselho(lado) {
      const l = lado || 0;
      const f = this.f[l];
      return [
        { id: 'folego', nome: 'Respirar', descr: 'Recupera +18 de fôlego.', ok: true },
        { id: 'plano', nome: 'Ajustar o plano', descr: '+4 em golpes, queda e defesa no próximo round.', ok: true },
        { id: 'corte', nome: f.corte > 0 ? 'Tratar o corte' : 'Recuperar o rosto', descr: f.corte > 0 ? 'Estanca o corte (reduz o risco de parada médica).' : 'Tira um pouco do dano acumulado.', ok: true },
        { id: 'leitura', nome: 'Ler o rival', descr: 'O córner explica o plano dele para o resto da luta.', ok: !this.leitura[l] },
      ].map((o) => Object.assign(o, { usado: (this.conselhoIds || []).indexOf(o.id) >= 0, ok: o.ok && (this.conselhoIds || []).indexOf(o.id) < 0 }));
    }

    conselho(lado, id) {
      const l = lado || 0;
      if (this.conselhoUsado >= this.conselhoMax() || this.rd || (this.conselhoIds || []).indexOf(id) >= 0) return false;
      const f = this.f[l];
      if (id === 'folego') f.stam = Math.min(100, f.stam + 18);
      else if (id === 'plano') {
        const b = { striking: 4, wrestling: 4, defesa: 3 };
        Object.keys(b).forEach((k) => { f.attr[k] += b[k]; });
        this.buff[l] = b;
      } else if (id === 'corte') {
        if (f.corte > 0) f.corte -= 1;
        else f.dano = Math.max(0, f.dano - 7);
      } else if (id === 'leitura') {
        this.leitura[l] = true;
      } else return false;
      this.conselhoUsado += 1;
      (this.conselhoIds || (this.conselhoIds = [])).push(id);
      return true;
    }

    // Round inteiro de uma vez (simulacoes, IA contra IA). escolhas[0] vale para o jogador em pe.
    rodarRound(escolhas) {
      this.abrirRound();
      let rodada = null;
      while (!rodada) {
        rodada = this.jogarMomento(escolhas && escolhas[0] ? escolhas[0] : null, 2, escolhas && escolhas[1] ? escolhas[1] : null).rodada;
      }
      return rodada;
    }

    // Decisao dos juizes: cada um soma seus cartoes; vence quem tem a maioria dos votos.
    decisao() {
      const desempate = this.vitoriasRodada[0] > this.vitoriasRodada[1] ? 0 : this.vitoriasRodada[1] > this.vitoriasRodada[0] ? 1 : null;
      const votos = this.cartoes.map((c) => (c[0] > c[1] ? 0 : c[1] > c[0] ? 1 : desempate));
      const a = votos.filter((v) => v === 0).length;
      const b = votos.filter((v) => v === 1).length;
      const e = votos.length - a - b;
      let vencedor = null;
      let metodo = 'Empate';
      if (a >= 2 || b >= 2) {
        vencedor = a >= 2 ? 0 : 1;
        const pro = vencedor === 0 ? a : b;
        const contra = vencedor === 0 ? b : a;
        metodo = pro === 3 ? 'Decisão unânime' : contra === 1 ? 'Decisão dividida' : 'Decisão majoritária';
      } else if (a === 1 && b === 1 && e === 1) {
        // Um juiz empatou e os outros discordam: cai para o total de pontos.
        vencedor = this.totais[0] > this.totais[1] ? 0 : this.totais[1] > this.totais[0] ? 1 : null;
        metodo = vencedor === null ? 'Empate' : 'Decisão dividida';
      }
      return { vencedor: vencedor, metodo: metodo, round: this.rodadasTotais, tempo: '5:00', cartoes: this.cartoes.map((c) => c.slice()) };
    }

    // Quem manda no "Ver resultado": segue a estrategia escolhida e, entre os rounds, ajusta como um corner
    // faria (atras no placar vai para cima; na frente administra; sem folego poupa).
    _ajusteAuto() {
      const f = this.f;
      const atual = this.estrategia[0];
      if (f[0].stam < 38 && atual !== 'resistencia') return this.definirEstrategia(0, 'resistencia');
      const restam = this.rodadasTotais - this.rodadas.length;
      const placar = this.totais[0] - this.totais[1];
      if (restam <= 1 && placar < 0) return this.definirEstrategia(0, f[0].attr.bjj > f[1].attr.bjj + 6 ? 'finalizacao' : 'pressao');
      if (placar > 0 && restam <= 2 && atual !== 'wrestling') return this.definirEstrategia(0, f[0].attr.wrestling > f[1].attr.defesa ? 'wrestling' : 'resistencia');
      return false;
    }

    // Luta inteira de uma vez. opcoes: { estrategia, auto } (o jogador no lado 0). Mesmas regras do round a round.
    simularCompleta(opcoes) {
      const o = opcoes || {};
      if (o.estrategia) this.definirEstrategia(0, o.estrategia);
      while (!this.encerrada) {
        if (o.auto && this.rodadas.length > 0) this._ajusteAuto();
        this.rodarRound(null);
      }
      return this.resultado;
    }
  }

  // ---- Carreira ----
  //
  // Cada semana voce faz UMA coisa (treinar, descansar, fazer campo ou mudar de categoria) e a
  // semana passa na hora. Lutas tem data marcada: voce aceita uma oferta e se prepara ate la.
  // A unica barra de recurso e a energia. O circuito (IA contra IA) roda a cada 4 semanas.

  const SEMANAS_CIRCUITO = 4;
  const MIN_PREPARO = 2; // semanas minimas entre aceitar e lutar
  const REPETE_TITULO = 8; // semanas entre duas lutas de titulo do mesmo campeao
  const ENERGIA_SEMANA = 15; // energia que volta sozinha a cada semana
  const ENERGIA_MIN_TREINO = 30; // abaixo disso nao da para treinar

  function criarAtributos(estilo, distribuicao, bonus) {
    const base = PERFIS[estilo] || PERFIS.misto;
    const attrs = {};
    ATRIBUTOS.forEach((k) => {
      attrs[k] = clamp(base[k] + ((bonus && bonus[k]) || 0) + ((distribuicao && distribuicao[k]) || 0), 1, 99);
    });
    return attrs;
  }

  // Teto de cada atributo: o potencial do lutador, ou o valor atual + 6 se ja passou dele.
  function calcularTetos(attrs, potencial) {
    const tetos = {};
    ATRIBUTOS.forEach((k) => {
      tetos[k] = clamp(Math.max(potencial, attrs[k] + 6), 1, 99);
    });
    return tetos;
  }

  function potencialRotulo(p) {
    return p >= 88 ? 'Excelente' : p >= 84 ? 'Alto' : p >= 80 ? 'Bom' : 'Regular';
  }

  function novaCarreira(opcoes) {
    const rng = opcoes.rng || Math.random;
    const distribuicao = opcoes.distribuicao || {};
    const gasto = Object.values(distribuicao).reduce((s, v) => s + Math.max(0, v), 0);
    if (gasto > PONTOS_CRIACAO) throw new Error('Pontos de criação acima do limite.');
    const idade = clamp(Math.round(opcoes.idade || IDADE_PADRAO), 18, 40);
    const modalidade = MODALIDADES[opcoes.modalidade] ? opcoes.modalidade : null;
    const estilo = modalidade ? MODALIDADES[modalidade].estilo : opcoes.estilo;
    const atributos = criarAtributos(estilo, distribuicao, modalidade ? MODALIDADES[modalidade].bonus : null);
    const potencial = 78 + Math.floor(rng() * 14); // 78 a 91
    const c = {
      versao: 2,
      nome: opcoes.nome || 'Sem nome',
      apelido: opcoes.apelido ? String(opcoes.apelido).slice(0, 24) : null,
      primeiroNome: opcoes.primeiroNome || null,
      sobrenome: opcoes.sobrenome || null,
      pais: opcoes.pais || null,
      cidade: opcoes.cidade || '',
      foto: opcoes.foto || null,
      modalidade: modalidade,
      estilo: estilo,
      periodo: opcoes.periodo,
      divisaoId: opcoes.divisaoId,
      idadeInicial: idade,
      atributos: atributos,
      potencial: potencial,
      tetos: calcularTetos(atributos, potencial),
      semana: 1,
      energia: 100,
      xp: 0,
      dinheiro: 1000,
      fama: 0,
      famaMax: 0,
      pontos: 0,
      recorde: { v: 0, d: 0, e: 0 },
      sequencia: 0,
      campeao: false,
      defesas: 0,
      penalidadeCorte: 0,
      lesao: null, // { nome, semanas }
      evento: null, // evento pendente de decisao
      lutaAtiva: null, // luta em andamento, para retomar depois
      ofertas: [], // ofertas de luta na mesa
      agendada: null, // luta marcada: { op, titulo, semanaLuta, bolsa, plano }
      camp: null, // camp de treino da luta marcada
      posLutaPendente: null, // o que dizer depois da luta
      rivais: {}, // nome -> { heat 1..3, motivo, desde }
      tracos: [],
      assinaturas: [],
      assinaturaAtiva: 0,
      academia: {},
      noticias: [], // resultados do circuito
      resumo: null, // o que aconteceu na ultima etapa (texto, preenchido pela interface)
      ultimaLutaSemana: 1,
      ultimaTituloSemana: -99,
      circuitoN: 0,
      dicasVistas: {},
      avisos: [],
      elenco: {},
      campeoes: {},
      historico: [],
      eventosVistos: [],
      estatisticas: Object.assign({ lutas: 0 }, ESTAT_VAZIA),
      xpAtributos: {},
      pontosDisponiveis: opcoes.adiarPontos ? PONTOS_CRIACAO : 0, // criacao rapida: distribui depois
      titulos: 0,
      aposentado: false,
      tutorialLuta: false,
      pontosHab: 1, // pontos da arvore de habilidades
      eventosPassados: [], // eventos de que o jogador participou, com o card e os resultados
      premios: [], // bonus de desempenho (Performance da Noite etc.)
      defesasTotal: 0, // defesas de titulo na carreira inteira
      nivelPago: 1, // nivel cujas recompensas ja foram pagas
      celebrarNivel: null, // subida de nivel que a interface ainda vai comemorar
      habilidades: [],
      meta: null,
      metasCumpridas: [],
      titulosPor: {}, // divisoes em que ja foi campeao
      finalizacoes: 0,
      semDrop: 0, // lutas seguidas sem recompensa rara (aumenta a chance)
      mentores: [],
      lutaBonus: null,
    };
    if (opcoes.meta && METAS[opcoes.meta] && !(opcoes.meta === 'duplo' && opcoes.periodo === 'eras')) c.meta = opcoes.meta;
    if (opcoes.traco && TRACOS[opcoes.traco]) c.tracos.push(opcoes.traco);
    if (opcoes.assinatura && ASSINATURAS[opcoes.assinatura]) c.assinaturas.push(opcoes.assinatura);
    fixarCampeoes(c);
    gerarOfertas(c, rng);
    return c;
  }

  function idadeAtual(carreira) {
    return carreira.idadeInicial + Math.floor((carreira.semana - 1) / 52);
  }

  function chaveDivisao(periodo, divId) {
    return periodo + '|' + divId;
  }

  function divisaoDados(periodo, divId) {
    const p = raiz.DADOS && raiz.DADOS[periodo];
    return p && p[divId] ? p[divId] : null;
  }

  function lutadoresDaDivisao(periodo, divId) {
    const d = divisaoDados(periodo, divId);
    return d ? d.lutadores : [];
  }

  function pontosDe(carreira, periodo, divId, lutador) {
    const mapa = carreira.elenco[chaveDivisao(periodo, divId)] || {};
    return mapa[lutador.nome] !== undefined ? mapa[lutador.nome] : rating(lutador) * 2;
  }

  // Ranking da divisao. Desempate por overall exato e depois por nome, para ser estavel.
  function ranking(carreira, periodo, divId) {
    periodo = periodo || carreira.periodo;
    divId = divId || carreira.divisaoId;
    const lista = lutadoresDaDivisao(periodo, divId).map((l) => ({
      nome: l.nome,
      estilo: l.estilo,
      lenda: l.lenda,
      rating: rating(l),
      ratingExato: ratingExato(l),
      pontos: pontosDe(carreira, periodo, divId, l),
      jogador: false,
      lutador: l,
    }));
    if (carreira.periodo === periodo && carreira.divisaoId === divId) {
      lista.push({
        nome: carreira.nome,
        estilo: carreira.estilo,
        lenda: false,
        rating: rating({ atributos: carreira.atributos }),
        ratingExato: ratingExato({ atributos: carreira.atributos }),
        pontos: carreira.pontos,
        jogador: true,
        lutador: { nome: carreira.nome, atributos: carreira.atributos, estilo: carreira.estilo },
      });
    }
    lista.sort((x, y) => (y.pontos - x.pontos) || (y.ratingExato - x.ratingExato) || x.nome.localeCompare(y.nome));
    // O campeao e sempre o #1 da divisao, mesmo que os pontos dele tenham caido.
    const nomeCampeao = carreira.campeoes && carreira.campeoes[chaveDivisao(periodo, divId)];
    const iC = nomeCampeao ? lista.findIndex((x) => x.nome === nomeCampeao) : -1;
    if (iC > 0) lista.unshift(lista.splice(iC, 1)[0]);
    return lista;
  }

  function posicaoDoJogador(carreira) {
    const idx = ranking(carreira).findIndex((x) => x.jogador);
    return idx < 0 ? null : idx + 1;
  }

  // Congela quem e o campeao de cada divisao (sem isso o campeao mudaria junto com os pontos).
  function fixarCampeoes(carreira) {
    if (carreira.periodo === 'eras') return;
    Object.keys((raiz.DADOS && raiz.DADOS[carreira.periodo]) || {}).forEach((divId) => {
      const chave = chaveDivisao(carreira.periodo, divId);
      if (carreira.campeoes[chave]) return;
      const ia = ranking(carreira, carreira.periodo, divId).find((x) => !x.jogador);
      if (ia) carreira.campeoes[chave] = ia.nome;
    });
  }

  // Quantas categorias o jogador tera vencido o cinturao se vencer esta luta de titulo (1 ou mais).
  function cinturoesSeVencer(c) {
    const t = Object.assign({}, c.titulosPor || {});
    t[chaveDivisao(c.periodo, c.divisaoId)] = true;
    return Object.keys(t).length;
  }

  function campeaoAtual(carreira, periodo, divId) {
    periodo = periodo || carreira.periodo;
    divId = divId || carreira.divisaoId;
    const salvo = carreira.campeoes[chaveDivisao(periodo, divId)];
    if (salvo) return salvo;
    const ia = ranking(carreira, periodo, divId).find((x) => !x.jogador);
    return ia ? ia.nome : null;
  }

  function podeDesafiarTitulo(carreira) {
    if (carreira.periodo === 'eras') return { ok: false, motivo: 'Não há cinturão na era antiga.' };
    if (carreira.lesao) return { ok: false, motivo: 'Lesionado: recupere-se antes de lutar.' };
    const pos = posicaoDoJogador(carreira);
    if (carreira.campeao) return { ok: true, motivo: 'Defesa de título.' };
    if (!pos || pos > 5) return { ok: false, motivo: 'Precisa estar no top 5 da divisão.' };
    if (carreira.sequencia < 2) return { ok: false, motivo: 'Precisa de 2 vitórias seguidas.' };
    return { ok: true, motivo: 'Desafio ao campeão.' };
  }

  function oponentes(carreira) {
    const lista = ranking(carreira);
    const pos = lista.findIndex((x) => x.jogador);
    const ias = lista.filter((x) => !x.jogador);
    if (pos < 0) return ias.slice(-4);
    const janela = [];
    for (let i = 1; i <= 3; i++) {
      if (pos - i >= 0) janela.push(lista[pos - i]);
      if (pos + i < lista.length) janela.push(lista[pos + i]);
    }
    return janela.filter((x) => !x.jogador).slice(0, 4);
  }

  function oponenteTitulo(carreira) {
    if (carreira.campeao) return ranking(carreira).find((x) => !x.jogador) || null;
    const campeao = campeaoAtual(carreira);
    return ranking(carreira).find((x) => x.nome === campeao) || null;
  }

  // ---- Calendario e semanas ----

  function diaDeLuta(c) {
    if (!c.agendada) return false;
    if (c.camp) return campConcluido(c);
    return c.semana >= c.agendada.semanaLuta;
  }

  // Motivo geral pelo qual nenhuma acao de preparo pode ser feita agora (ou null).
  function bloqueioAcao(c) {
    if (c.aposentado) return 'Carreira encerrada.';
    if (c.lutaAtiva) return 'Termine a luta em andamento primeiro.';
    if (diaDeLuta(c)) return 'É o dia da luta: suba no octógono.';
    if (c.evento) return 'Resolva o evento pendente antes.';
    return null;
  }

  function curarLesao(c) {
    if (!c.lesao) return;
    const n = 1 + (nivelAcademia(c, 'fisio') >= 2 ? 1 : 0) + ((c.tracos || []).indexOf('resiliente') >= 0 ? 1 : 0);
    c.lesao.semanas -= Math.min(3, n);
    if (c.lesao.semanas <= 0) c.lesao = null;
  }

  function aviso(c, texto) {
    if (!c.avisos) c.avisos = [];
    c.avisos.push(texto);
    if (c.avisos.length > 8) c.avisos.shift();
  }

  function consumirAvisos(c) {
    const a = (c.avisos || []).slice();
    c.avisos = [];
    return a;
  }

  function marcarDica(c, id) {
    if (!c.dicasVistas) c.dicasVistas = {};
    c.dicasVistas[id] = true;
  }

  function sortearEvento(r) {
    const e = EVENTOS[Math.floor(r() * EVENTOS.length)];
    return {
      id: e.id,
      titulo: e.titulo,
      texto: e.texto,
      opcoes: e.opcoes.map((o) => ({ rotulo: o.rotulo, resumo: o.resumo, custo: o.efeito.dinheiro < 0 ? -o.efeito.dinheiro : 0 })),
    };
  }

  function sortearLesao(r) {
    const l = LESOES[Math.floor(r() * LESOES.length)];
    return { nome: l.nome, semanas: l.semanas };
  }

  // Aplica uma lesao DEPOIS de a semana virar, para ela durar o tempo inteiro (a semana que
  // passa ja cura 1). Sem ofertas enquanto machucado; luta marcada para hoje e cancelada.
  function aplicarLesao(c, lesao) {
    c.lesao = lesao;
    c.ofertas = [];
    if (c.agendada && !c.camp && c.semana >= c.agendada.semanaLuta) cancelarLuta(c, 'lesão');
  }

  function cancelarLuta(c, motivo) {
    aviso(c, 'Luta cancelada (' + motivo + ').');
    c.agendada = null;
    c.camp = null;
  }

  // Passa uma semana: recuperacao, circuito, dia da luta, ofertas e eventos.
  function virarSemana(c, rng) {
    const r = rng || Math.random;
    c.semana += 1;
    c.energia = Math.min(100, c.energia + ENERGIA_SEMANA + 3 * nivelAcademia(c, 'nutri'));
    curarLesao(c);

    // Inatividade: sem lutar, o ranking cai.
    const semLutar = c.semana - c.ultimaLutaSemana;
    if (semLutar > 12 && c.pontos > 0 && !c.agendada) {
      c.pontos = Math.max(0, c.pontos - 3);
      if (semLutar === 13) aviso(c, 'Você está há muito tempo sem lutar e perdendo pontos de ranking.');
    }

    if (c.semana % SEMANAS_CIRCUITO === 0) rodarCircuito(c, r);

    // Luta marcada sem camp (saves antigos): o dia chega pela data.
    if (c.agendada && !c.camp && c.semana >= c.agendada.semanaLuta) {
      if (c.lesao) cancelarLuta(c, 'lesão');
      else aviso(c, 'Dia da luta!');
    }

    if (!c.agendada && !c.lutaAtiva && !c.aposentado) {
      if (c.lesao) c.ofertas = [];
      else if (!c.ofertas || c.ofertas.length === 0) gerarOfertas(c, r);
    }
  }

  // ---- Ofertas de luta ----

  function calcularBolsa(c, op, titulo, heat) {
    let b = 500 + op.rating * 8;
    if (op.lenda) b += 150;
    if (titulo) b += 1500;
    b *= 1 + 0.1 * nivelFama(c).nivel;
    if (heat) b *= 1 + 0.15 * heat;
    return Math.round(b / 10) * 10;
  }

  // Snapshot do adversario: so o que e preciso para exibir e simular, e serializavel.
  function snapshotOponente(op) {
    return { nome: op.nome, estilo: op.estilo, lenda: !!op.lenda, rating: op.rating, pontos: op.pontos, lutador: op.lutador };
  }

  function embaralhar(lista, r) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // Monta as ofertas da mesa: ate 3 adversarios vizinhos e, se voce merece, a luta de titulo.
  // As ofertas ficam na mesa ate voce aceitar uma (a data conta a partir do aceite).
  function gerarOfertas(c, rng) {
    const r = rng || Math.random;
    c.ofertas = [];
    if (c.aposentado || c.agendada || c.lutaAtiva || c.lesao) return c.ofertas;
    const lista = ranking(c);
    const alvoTitulo = podeDesafiarTitulo(c).ok && (!c.campeao || c.semana - c.ultimaTituloSemana >= REPETE_TITULO) ? oponenteTitulo(c) : null;
    const maxOfertas = nivelFama(c).nivel >= 3 ? 4 : 3;
    let bonusOp = null;
    if (c.lutaBonus) {
      const pool = oponentes(c).filter((x) => !alvoTitulo || x.nome !== alvoTitulo.nome);
      bonusOp = pool.length ? embaralhar(pool, r)[0] : null;
      if (!bonusOp) c.lutaBonus = null;
    }
    const rival = rivalPrincipal(c);
    const rivalRow = rival && (!alvoTitulo || alvoTitulo.nome !== rival.nome) && (!bonusOp || bonusOp.nome !== rival.nome) ? lista.find((x) => !x.jogador && x.nome === rival.nome) : null;
    let escolhidos = embaralhar(oponentes(c).filter((x) => (!alvoTitulo || x.nome !== alvoTitulo.nome) && (!rivalRow || x.nome !== rivalRow.nome) && (!bonusOp || x.nome !== bonusOp.nome)), r).slice(0, maxOfertas - (rivalRow ? 1 : 0) - (bonusOp ? 1 : 0));
    if (rivalRow && (rival.heat >= 2 || r() < 0.6)) escolhidos = [rivalRow].concat(escolhidos);
    escolhidos.forEach((op, i) => {
      const heat = c.rivais && c.rivais[op.nome] ? c.rivais[op.nome].heat : 0;
      c.ofertas.push({
        id: 'o' + c.semana + '-' + i,
        op: snapshotOponente(op),
        titulo: false,
        rival: heat,
        rank: lista.findIndex((x) => x.nome === op.nome) + 1,
        semanasAte: 4 + Math.floor(r() * 3),
        bolsa: calcularBolsa(c, op, false, heat),
      });
    });
    if (bonusOp) {
      const hb = c.rivais && c.rivais[bonusOp.nome] ? c.rivais[bonusOp.nome].heat : 0;
      c.ofertas.unshift({
        id: 'o' + c.semana + '-b',
        op: snapshotOponente(bonusOp),
        titulo: false,
        bonus: true,
        rival: hb,
        rank: lista.findIndex((x) => x.nome === bonusOp.nome) + 1,
        semanasAte: 2,
        bolsa: Math.round((calcularBolsa(c, bonusOp, false, hb) * 1.6) / 10) * 10,
      });
    }
    if (alvoTitulo) {
      c.ofertas.unshift({
        id: 'o' + c.semana + '-t',
        op: snapshotOponente(alvoTitulo),
        titulo: true,
        rival: c.rivais && c.rivais[alvoTitulo.nome] ? c.rivais[alvoTitulo.nome].heat : 0,
        rank: lista.findIndex((x) => x.nome === alvoTitulo.nome) + 1,
        semanasAte: 8,
        bolsa: calcularBolsa(c, alvoTitulo, true, c.rivais && c.rivais[alvoTitulo.nome] ? c.rivais[alvoTitulo.nome].heat : 0),
      });
    }
    return c.ofertas;
  }

  // Aceita uma oferta: a luta fica marcada para daqui a N semanas e as outras ofertas somem.
  function aceitarOferta(c, id, rng) {
    if (c.aposentado) return { ok: false, motivo: 'Carreira encerrada.' };
    if (c.agendada) return { ok: false, motivo: 'Você já tem uma luta marcada.' };
    if (c.lutaAtiva) return { ok: false, motivo: 'Termine a luta em andamento primeiro.' };
    if (c.lesao) return { ok: false, motivo: 'Lesionado: não dá para marcar luta agora.' };
    if (c.evento) return { ok: false, motivo: 'Resolva o evento pendente antes.' };
    const of = (c.ofertas || []).find((o) => o.id === id);
    if (!of) return { ok: false, motivo: 'Essa oferta não está mais disponível.' };
    if (of.titulo && !c.campeao && campeaoAtual(c) !== of.op.nome) {
      gerarOfertas(c, rng);
      return { ok: false, motivo: 'O campeão mudou. As ofertas foram atualizadas.' };
    }
    const semanas = Math.max(MIN_PREPARO, of.semanasAte);
    const semanaLuta = c.semana + semanas;
    // O plano do rival e sorteado agora: o scouting do camp revela esse plano e a luta o segue.
    const plano = gerarPlano(of.op.lutador.atributos, rng || Math.random);
    c.agendada = Object.assign({}, of, { semanaLuta: semanaLuta, semanaAceite: c.semana, plano: plano });
    c.agendada.evento = gerarEvento(c, of, semanaLuta, rng || Math.random);
    c.lutaBonus = null; // aceitar outra luta deixa a relampago passar
    c.ofertas = [];
    c.camp = novoCamp(semanas);
    entrarEtapa(c, rng || Math.random);
    return { ok: true, semanaLuta: semanaLuta, semanas: semanas };
  }

  // ---- Circuito: a IA luta entre si e o ranking muda ----

  function atributosIA(lutador, periodo, semana) {
    if (!lutador.nascimento_ano) return lutador.atributos;
    const idade = ANO_PERIODO[periodo] + Math.floor(((semana || 1) - 1) / 52) - lutador.nascimento_ano;
    return ajustarIdade(lutador.atributos, idade);
  }

  function rodarCircuito(c, rng) {
    const r = rng || Math.random;
    const periodo = c.periodo;
    c.circuitoN = (c.circuitoN || 0) + 1;
    fixarCampeoes(c);
    const noticias = [];
    Object.keys((raiz.DADOS && raiz.DADOS[periodo]) || {}).forEach((divId) => {
      const chave = chaveDivisao(periodo, divId);
      const mapa = c.elenco[chave] || (c.elenco[chave] = {});
      const lista = ranking(c, periodo, divId).filter((x) => !x.jogador);
      if (lista.length < 2) return;
      const ocupados = new Set();
      if (c.agendada && divId === c.divisaoId) ocupados.add(c.agendada.op.nome);
      nomesDoCard(c).forEach((n) => ocupados.add(n));
      const nomeCampeao = campeaoAtual(c, periodo, divId);
      const campeaoIA = lista.find((x) => x.nome === nomeCampeao);
      const disputas = [];
      if (campeaoIA && !ocupados.has(campeaoIA.nome) && c.circuitoN % 3 === 0) {
        const desafiante = lista.find((x) => x.nome !== campeaoIA.nome && !ocupados.has(x.nome));
        if (desafiante) {
          disputas.push([campeaoIA, desafiante, true]);
          ocupados.add(campeaoIA.nome);
          ocupados.add(desafiante.nome);
        }
      }
      const resto = lista.filter((x) => !ocupados.has(x.nome) && !(campeaoIA && x.nome === campeaoIA.nome)).slice(0, 14);
      for (let i = 0; i + 1 < resto.length; i += 2) disputas.push([resto[i], resto[i + 1], false]);

      disputas.forEach(([a, b, titulo]) => {
        const luta = new Luta(
          { nome: a.nome, atributos: atributosIA(a.lutador, periodo, c.semana) },
          { nome: b.nome, atributos: atributosIA(b.lutador, periodo, c.semana) },
          { rodadas: titulo ? 5 : 3, rng: r }
        );
        const res = luta.simularCompleta();
        const vencedor = res.vencedor === null ? (r() < 0.5 ? 0 : 1) : res.vencedor;
        const v = vencedor === 0 ? a : b;
        const p = vencedor === 0 ? b : a;
        const pv = mapa[v.nome] !== undefined ? mapa[v.nome] : v.pontos;
        const pp = mapa[p.nome] !== undefined ? mapa[p.nome] : p.pontos;
        mapa[v.nome] = clamp(pv + (titulo ? 12 : 10), 20, 400);
        mapa[p.nome] = clamp(pp - 10, 20, 400);
        if (titulo) c.campeoes[chave] = v.nome;
        const div = divisaoDados(periodo, divId);
        if (titulo || divId === c.divisaoId) {
          const fim = res.metodo === 'Nocaute' || res.metodo === 'Finalização' ? ' por ' + res.metodo.toLowerCase() : '';
          noticias.push({
            semana: c.semana,
            titulo: !!titulo,
            texto: v.nome + ' venceu ' + p.nome + fim + (titulo ? (v.nome === campeaoIA.nome ? ' e defendeu o cinturão' : ' e conquistou o cinturão') : '') + ' (' + (div ? div.nome : divId) + ').',
          });
        }
      });
    });
    c.noticias = noticias.concat(c.noticias || []).slice(0, 12);
  }

  // ---- Acoes da semana ----

  const FOCOS_TREINO = {
    forca: 'forca',
    striking: 'striking',
    grappling: 'grappling',
    bjj: 'bjj',
    wrestling: 'wrestling',
    cardio: 'resistencia',
    defesa: 'defesa',
  };

  // Cada atributo tem sua propria barra de XP. Ao encher, vira 1 ponto para distribuir.
  const XP_TREINO = 20;
  const CUSTO_TREINO = 20; // energia gasta em cada treino
  const RECUPERA_DESCANSO = 40; // energia recuperada ao descansar (alem dos 15 da semana)
  function limiteAtributo(valor) {
    return 30 + Math.round(valor * 0.5);
  }

  // Chance de o treino subir o atributo: cai perto do teto e com pouca energia.
  function chanceTreino(c, attr) {
    const teto = (c.tetos && c.tetos[attr]) || 99;
    const gap = teto - c.atributos[attr];
    const base = gap >= 20 ? 1 : gap >= 8 ? 0.6 : gap > 0 ? 0.3 : 0;
    const cansado = c.energia < 60;
    return { chance: cansado ? base * 0.5 : base, base: base, teto: teto, gap: gap, cansado: cansado };
  }

  // Gasta 1 ponto para subir um atributo, respeitando o teto de potencial.
  function distribuirPonto(carreira, attr) {
    if (!ATRIBUTOS.includes(attr)) return { ok: false, motivo: 'Atributo inválido.' };
    if ((carreira.pontosDisponiveis || 0) <= 0) return { ok: false, motivo: 'Sem pontos para distribuir.' };
    if (carreira.atributos[attr] >= carreira.tetos[attr]) return { ok: false, motivo: 'Esse atributo já está no teto do seu potencial.' };
    const antes = ratingExato(carreira);
    carreira.atributos[attr] += 1;
    carreira.pontosDisponiveis -= 1;
    return { ok: true, overallAntes: antes, overallDepois: ratingExato(carreira) };
  }

  function descansar(carreira, rng) {
    const b = bloqueioAcao(carreira);
    if (b) return { ok: false, motivo: b };
    if (carreira.agendada) return { ok: false, motivo: 'Há uma luta marcada: siga o camp de treino.' };
    carreira.energia = Math.min(100, carreira.energia + RECUPERA_DESCANSO);
    // Descanso e fisioterapia: cura uma semana extra de lesao.
    curarLesao(carreira);
    virarSemana(carreira, rng);
    return { ok: true };
  }

  function mudarDivisao(carreira, novaDiv, rng) {
    const r = rng || Math.random;
    if (carreira.periodo === 'eras') return { ok: false, motivo: 'A era antiga não tem troca de categoria.' };
    const bl = bloqueioAcao(carreira);
    if (bl) return { ok: false, motivo: bl };
    if (carreira.lesao) return { ok: false, motivo: 'Lesionado: não dá para mudar de categoria agora.' };
    if (carreira.agendada) return { ok: false, motivo: 'Você tem uma luta marcada: lute antes de trocar de categoria.' };
    const atual = ORDEM_DIVISOES.indexOf(carreira.divisaoId);
    const nova = ORDEM_DIVISOES.indexOf(novaDiv);
    if (atual < 0 || nova < 0) return { ok: false, motivo: 'Categoria inválida.' };
    if (Math.abs(atual - nova) !== 1) return { ok: false, motivo: 'Só dá para trocar para a categoria vizinha.' };
    if (carreira.energia < 15) return { ok: false, motivo: 'Energia insuficiente para o corte ou a mudança.' };
    const descendo = nova < atual;
    carreira.energia -= 15;
    if (descendo) {
      carreira.penalidadeCorte = 15;
    } else {
      carreira.atributos.forca = clamp(carreira.atributos.forca + 2, 1, 99);
      carreira.atributos.queixo = clamp(carreira.atributos.queixo + 2, 1, 99);
      carreira.atributos.velocidade = clamp(carreira.atributos.velocidade - 2, 1, 99);
      carreira.atributos.resistencia = clamp(carreira.atributos.resistencia - 2, 1, 99);
    }
    if (carreira.campeao) {
      // Ao sair da categoria o cinturao fica vago: passa ao melhor da fila.
      const ia = ranking(carreira).find((x) => !x.jogador);
      if (ia) carreira.campeoes[chaveDivisao(carreira.periodo, carreira.divisaoId)] = ia.nome;
    }
    ATRIBUTOS.forEach((k) => { carreira.tetos[k] = Math.max(carreira.tetos[k], carreira.atributos[k]); });
    carreira.divisaoId = novaDiv;
    carreira.pontos = carreira.meta === 'duplo' ? Math.floor(carreira.pontos / 2) : 0;
    carreira.sequencia = 0;
    carreira.campeao = false;
    carreira.ofertas = [];
    gerarOfertas(carreira, r);
    virarSemana(carreira, r);
    return { ok: true, descendo: descendo };
  }

  // Campo de preparacao: ocupa a semana e da um bonus so na luta marcada.
  // ---- Analise do adversario ----

  function atributosDoOponente(c, op) {
    return atributosIA(op.lutador, c.periodo, c.semana);
  }

  // Qual treino mais ajuda contra o adversario da luta marcada. Retorna null se nada urgente.
  function recomendarTreino(c, op) {
    op = op || (c.agendada && c.agendada.op);
    if (!op) return null;
    const ele = atributosDoOponente(c, op);
    const eu = c.atributos;
    const nome = op.nome.split(' ').pop();
    const opcoes = [
      { attr: 'defesa', score: ele.wrestling - eu.defesa, motivo: nome + ' busca a queda e sua defesa de queda está abaixo da dele' },
      { attr: 'wrestling', score: ele.defesa - eu.wrestling, motivo: nome + ' defende bem as quedas: seu wrestling precisa subir' },
      { attr: 'striking', score: ele.defesa - eu.striking, motivo: nome + ' defende bem em pé: seus golpes precisam de mais precisão' },
      { attr: 'bjj', score: ele.bjj - eu.bjj, motivo: nome + ' é perigoso no chão: reforce o jiu-jitsu' },
      { attr: 'grappling', score: ele.grappling - eu.grappling, motivo: nome + ' controla bem no chão: reforce o grappling' },
      { attr: 'forca', score: ele.queixo - eu.forca, motivo: nome + ' tem queixo duro: mais força ajuda a decidir' },
      { attr: 'resistencia', score: (ele.resistencia - eu.resistencia) * 0.7, motivo: nome + ' tem mais fôlego: o cardio vai pesar nos rounds finais' },
    ].filter((o) => o.score > 3 && c.atributos[o.attr] < c.tetos[o.attr]);
    if (!opcoes.length) return null;
    opcoes.sort((a, b) => b.score - a.score);
    const foco = Object.keys(FOCOS_TREINO).find((k) => FOCOS_TREINO[k] === opcoes[0].attr);
    return { attr: opcoes[0].attr, foco: foco, motivo: opcoes[0].motivo, score: opcoes[0].score };
  }

  // Frase de risco da luta: onde o adversario te ameaca (ou por que voce e favorito).
  function riscoLuta(c, op) {
    const ele = atributosDoOponente(c, op);
    const eu = c.atributos;
    const queda = ele.wrestling - eu.defesa;
    const chao = ele.bjj - eu.bjj;
    const ko = (ele.striking + ele.forca) / 2 - eu.queixo;
    const maior = Math.max(queda, chao, ko);
    if (maior > 8) {
      if (maior === queda) return { nivel: 'alto', texto: 'Ele derruba bem e sua defesa de queda é o ponto fraco' };
      if (maior === chao) return { nivel: 'alto', texto: 'No chão ele é mais perigoso que você: cuidado com finalizações' };
      return { nivel: 'alto', texto: 'Ele bate forte e seu queixo é o ponto fraco' };
    }
    if (maior < -5) return { nivel: 'baixo', texto: 'Você leva vantagem nos pontos que decidem a luta' };
    return { nivel: 'medio', texto: 'Luta parelha: preparo e energia decidem' };
  }

  // ---- Luta ----

  function prepararLuta(carreira, oponente, titulo, rng) {
    const eu = ajustarIdade(carreira.atributos, idadeAtual(carreira));
    const ef = carreira.camp && carreira.camp.efeitos ? carreira.camp.efeitos : null;
    if (ef) Object.keys(ef.attr).forEach((k) => { eu[k] = clamp(eu[k] + ef.attr[k], 1, 99); });
    if (ef && ef.lesionado) ATRIBUTOS.forEach((k) => { eu[k] = clamp(eu[k] - 3, 1, 99); });
    const hib = estiloHibrido(carreira);
    if (hib) Object.keys(hib.attr).forEach((k) => { eu[k] = clamp(eu[k] + hib.attr[k], 1, 99); });
    // Comeca a luta com menos folego se estiver com pouca energia, vindo de corte ou lesionado.
    let penalidade = carreira.penalidadeCorte;
    penalidade += Math.max(0, 70 - carreira.energia) * 0.6;
    penalidade -= 4 * nivelAcademia(carreira, 'preparador');
    if (ef) penalidade -= ef.stamBonus;
    if (ef && ef.lesionado) penalidade += 15;
    penalidade = clamp(penalidade, 0, 40);
    const ele = Object.assign({}, atributosIA(oponente.lutador, carreira.periodo, carreira.semana));
    if (ef && ef.provocacao >= 2) {
      ele.striking = clamp(ele.striking + 2, 1, 99);
      ele.forca = clamp(ele.forca + 2, 1, 99);
    }
    const plano = carreira.agendada && carreira.agendada.plano;
    const luta = new Luta(
      { nome: carreira.nome, atributos: eu },
      { nome: oponente.nome, atributos: ele },
      {
        penalidadeA: penalidade,
        rodadas: titulo ? 5 : 3,
        rng: rng,
        tracosA: (carreira.tracos || []).concat(habFlags(carreira)),
        desbloqueiosA: desbloqueios(carreira),
        assinaturaA: assinaturaEquipada(carreira),
        scoutA: !!(ef && ef.scout),
        provocacao: ef ? ef.provocacao : 0,
      }
    );
    if (plano) luta.plano = plano;
    return luta;
  }

  // Aposentadoria: so depois dos 36, sem luta marcada nem em andamento.
  function podeAposentar(carreira) {
    if (carreira.aposentado) return { ok: false, motivo: 'Você já se aposentou.' };
    if (carreira.lutaAtiva) return { ok: false, motivo: 'Termine a luta em andamento primeiro.' };
    if (carreira.agendada) return { ok: false, motivo: 'Cumpra a luta marcada antes de se aposentar.' };
    if (idadeAtual(carreira) < 36) return { ok: false, motivo: 'A aposentadoria libera a partir dos 36 anos.' };
    return { ok: true };
  }

  // Entrada do hall da fama: resumo da carreira e as lutas mais marcantes.
  function entradaHall(carreira) {
    const marcantes = carreira.historico
      .filter((h) => h.titulo || h.metodo === 'Nocaute' || h.metodo === 'Finalização')
      .slice(-5)
      .reverse();
    return {
      nome: carreira.nome,
      estilo: carreira.estilo,
      periodo: carreira.periodo,
      categoria: carreira.periodo === 'eras' ? 'Peso aberto' : carreira.divisaoId,
      idade: idadeAtual(carreira),
      recorde: carreira.recorde,
      titulos: carreira.titulos || 0,
      modalidade: carreira.modalidade || null,
      origem: carreira.cidade && carreira.pais ? carreira.cidade + ', ' + carreira.pais : carreira.pais || '',
      marcantes: marcantes,
      metas: (carreira.metasCumpridas || []).map((id) => (METAS[id] ? METAS[id].nome : id)),
      habilidades: (carreira.habilidades || []).map((id) => (HABILIDADES[id] ? HABILIDADES[id].nome : id)),
      data: new Date().toISOString().slice(0, 10),
    };
  }

  function aposentar(carreira) {
    const r = podeAposentar(carreira);
    if (!r.ok) return r;
    const entrada = entradaHall(carreira);
    carreira.aposentado = true;
    carreira.ofertas = [];
    return { ok: true, entrada: entrada };
  }

  function iniciarLutaAtiva(carreira, op, titulo, rng) {
    const luta = prepararLuta(carreira, op, titulo, rng);
    carreira.lutaAtiva = { op: snapshotOponente(op), titulo: !!titulo, luta: luta.toJSON() };
    return luta;
  }

  function retomarLutaAtiva(carreira, rng) {
    const s = carreira.lutaAtiva;
    if (!s) return null;
    return { luta: Luta.restaurar(s.luta, rng), oponente: s.op, titulo: s.titulo };
  }

  // Porcentagem de vida mostrada na luta: ligada ao dano real acumulado (o mesmo que decide o nocaute).
  function vidaPct(f) {
    return clamp(Math.round(100 * (1 - f.dano / 160)), 0, 100);
  }

  function aplicarLuta(carreira, oponente, luta, titulo, rng) {
    const r = rng || Math.random;
    const res = luta.resultado;
    const venceu = res.vencedor === 0;
    const empatou = res.vencedor === null;
    const chave = chaveDivisao(carreira.periodo, carreira.divisaoId);
    const mapa = carreira.elenco[chave] || (carreira.elenco[chave] = {});
    const pontosOp = mapa[oponente.nome] !== undefined ? mapa[oponente.nome] : oponente.pontos;
    const finalizou = res.metodo === 'Nocaute' || res.metodo === 'Finalização';
    const nivelAntes = nivelDoXP(carreira.xp);
    const pontosHabAntes = carreira.pontosHab || 0;
    const eraCampeao = carreira.campeao;
    const agend = carreira.agendada;
    const heat = carreira.rivais && carreira.rivais[oponente.nome] ? carreira.rivais[oponente.nome].heat : 0;
    const prov = carreira.camp && carreira.camp.efeitos ? carreira.camp.efeitos.provocacao : 0;
    const bolsaBase = agend ? agend.bolsa : calcularBolsa(carreira, oponente, titulo, heat);
    const posAntes = posicaoDoJogador(carreira);
    const rankOp = agend ? agend.rank : null;
    const nivelFamaAntes = nivelFama(carreira).nivel;

    let bolsa;
    let fama = 0;
    if (venceu) {
      carreira.recorde.v++;
      carreira.sequencia++;
      carreira.pontos += (oponente.lenda || oponente.rating >= 70 ? 40 : 25) + (titulo ? 30 : 0);
      mapa[oponente.nome] = Math.max(0, pontosOp - 15);
      carreira.xp += 60 + (finalizou ? 20 : 0) + (titulo ? 80 : 0);
      bolsa = bolsaVitoria(bolsaBase, finalizou);
      fama = 11 + (finalizou ? 6 : 0) + (titulo ? 28 : 0) + (oponente.lenda ? 6 : 0);
      if (rankOp && posAntes && rankOp < posAntes) fama += 3 * Math.min(5, posAntes - rankOp);
      if (heat) fama += 12 * heat;
      fama += 8 * prov;
      if (agend && agend.bonus) fama += 10;
      if (finalizou) carreira.finalizacoes = (carreira.finalizacoes || 0) + 1;
    } else if (empatou) {
      carreira.recorde.e++;
      carreira.sequencia = 0;
      carreira.xp += 25;
      bolsa = Math.round(bolsaBase * 0.7);
      fama = 3;
    } else {
      carreira.recorde.d++;
      carreira.sequencia = 0;
      carreira.pontos = Math.max(0, carreira.pontos - 20);
      mapa[oponente.nome] = pontosOp + 5;
      carreira.xp += 25;
      bolsa = Math.round(bolsaBase * 0.4);
      fama = -6 - (eraCampeao && titulo ? 20 : 0) - 10 * prov;
    }
    bolsa = ajusteMetaBolsa(carreira, bolsa, titulo, finalizou, venceu);
    carreira.dinheiro += bolsa;
    const famaGanha = ganharFama(carreira, fama);

    // Rivalidade: vencer o rival esfria a disputa; perder para alguem cria uma revanche.
    let rivalidade = null;
    if (venceu && heat) {
      const rest = esfriarRivalidade(carreira, oponente.nome, 1);
      rivalidade = rest ? 'A rivalidade com ' + oponente.nome + ' continua, mas você levou a melhor.' : 'Rivalidade com ' + oponente.nome + ' encerrada: você venceu.';
    } else if (!venceu && !empatou) {
      criarRivalidade(carreira, oponente.nome, 'revanche', 1);
      rivalidade = heat ? 'A rivalidade com ' + oponente.nome + ' ficou mais quente.' : oponente.nome + ' agora é um rival: peça a revanche.';
    }
    carreira.posLutaPendente = empatou ? null : { oponente: oponente.nome, venceu: venceu, titulo: !!titulo };

    if (venceu) carreira.pontosDisponiveis = (carreira.pontosDisponiveis || 0) + 1;
    pagarNivel(carreira);

    let defendeu = false;
    if (titulo) {
      carreira.ultimaTituloSemana = carreira.semana;
      if (venceu) {
        defendeu = eraCampeao;
        carreira.defesas = eraCampeao ? (carreira.defesas || 0) + 1 : 0;
        carreira.campeoes[chave] = carreira.nome;
        carreira.campeao = true;
        if (!carreira.titulosPor) carreira.titulosPor = {};
        if (!carreira.titulosPor[chave]) carreira.pontosHab = (carreira.pontosHab || 0) + 1; // 1o cinturao de cada categoria
        carreira.titulosPor[chave] = true;
      } else if (carreira.campeao) {
        carreira.campeoes[chave] = oponente.nome;
        carreira.campeao = false;
        carreira.defesas = 0;
      }
    }

    // Lesao: chance maior quando o jogador perde por nocaute ou finalizacao.
    let chanceLesao = 0.05;
    if (!venceu && !empatou && res.metodo === 'Nocaute') chanceLesao = 0.25;
    if (!venceu && !empatou && res.metodo === 'Finalização') chanceLesao = 0.15;
    if (luta.f[0].corte >= 2) chanceLesao += 0.1;
    chanceLesao *= 1 - 0.3 * nivelAcademia(carreira, 'fisio');
    const lesaoNova = r() < chanceLesao ? sortearLesao(r) : null;
    const lesionou = !!lesaoNova;

    const recompensas = sortearRecompensas(carreira, { venceu: venceu, finalizou: finalizou, round: res.round, metodo: res.metodo, luta: luta, bolsaBase: bolsaBase }, r);
    const evento = agend && agend.evento ? agend.evento : null;
    const premioNoite = recompensas.find((x) => x.tipo === 'performance' || x.tipo === 'luta_noite');
    if (premioNoite) {
      if (!carreira.premios) carreira.premios = [];
      carreira.premios.unshift({ tipo: premioNoite.tipo, titulo: premioNoite.titulo, semana: carreira.semana, oponente: oponente.nome, valor: premioNoite.valor || 0, evento: evento ? evento.nome : null });
    }
    if (defendeu) carreira.defesasTotal = (carreira.defesasTotal || 0) + 1;
    carreira.historico.push({
      semana: carreira.semana,
      divisao: carreira.divisaoId,
      oponente: oponente.nome,
      resultado: venceu ? 'Vitória' : empatou ? 'Empate' : 'Derrota',
      metodo: res.metodo,
      round: res.round,
      tempo: res.tempo || null,
      titulo: !!titulo,
      defesa: !!defendeu,
      rankOp: rankOp || null,
      rivalidade: heat > 0,
      premio: premioNoite ? premioNoite.titulo : null,
      evento: evento ? evento.nome : null,
      data: evento ? evento.data : null,
      lesao: lesaoNova ? lesaoNova.nome : null,
      bolsa: bolsa,
    });
    if (evento) {
      // o resto do card acontece: ranking e cinturoes dos outros mudam junto
      const lutaJog = evento.card.find((x) => x.jogador);
      if (lutaJog) lutaJog.resultado = { vencedor: venceu ? carreira.nome : empatou ? null : oponente.nome, perdedor: venceu ? oponente.nome : empatou ? null : carreira.nome, metodo: res.metodo, round: res.round, tempo: res.tempo || '5:00', titulo: !!titulo };
      resolverCard(carreira, evento, r);
      registrarEvento(carreira, evento, { venceu: venceu, empatou: empatou, oponente: oponente.nome, metodo: res.metodo, round: res.round, tempo: res.tempo || null, titulo: !!titulo });
    }

    if (!carreira.estatisticas) carreira.estatisticas = Object.assign({ lutas: 0 }, ESTAT_VAZIA);
    const est = luta.estatisticas[0];
    Object.keys(ESTAT_VAZIA).forEach((k) => { carreira.estatisticas[k] += est[k]; });
    carreira.estatisticas.lutas++;

    if (titulo && venceu) carreira.titulos = (carreira.titulos || 0) + 1;
    carreira.camp = null;
    carreira.energia = Math.max(0, carreira.energia - CUSTO_LUTA);
    carreira.penalidadeCorte = 0;
    carreira.lutaAtiva = null;
    carreira.agendada = null;
    carreira.ofertas = [];
    carreira.ultimaLutaSemana = carreira.semana;
    virarSemana(carreira, r);
    if (lesaoNova) aplicarLesao(carreira, lesaoNova);
    const meta = verificarMeta(carreira);
    return {
      venceu: venceu, empatou: empatou, lesionou: lesionou, bolsa: bolsa, defendeu: defendeu,
      fama: famaGanha, nivelFamaSubiu: nivelFama(carreira).nivel > nivelFamaAntes, rivalidade: rivalidade,
      recompensas: recompensas, meta: meta, evento: evento, tempo: res.tempo || null,
      nivelAntes: nivelAntes, nivelDepois: nivelDoXP(carreira.xp),
      pontosHabGanhos: Math.max(0, (carreira.pontosHab || 0) - pontosHabAntes),
      posAntes: posAntes, posDepois: posicaoDoJogador(carreira),
      gancho: ganchos(carreira), proxima: proximaOferta(carreira),
    };
  }

  // Bonus de 15% da bolsa por vitoria antes do limite (nocaute/finalizacao).
  function bolsaVitoria(base, finalizou) {
    return Math.round(base * (finalizou ? 1.15 : 1));
  }

  // ---- Fama, rivalidade, tracos, academia e camp ----

  const NIVEIS_FAMA = [
    { nome: 'Desconhecido', min: 0 },
    { nome: 'Promessa', min: 80 },
    { nome: 'Conhecido', min: 220 },
    { nome: 'Estrela', min: 480 },
    { nome: 'Superstar', min: 900 },
    { nome: 'Lenda', min: 1600 },
  ];

  const ACADEMIA = {
    ginasio: { nome: 'Ginásio', descr: 'Mais evolução nos treinos: +10% de chance por nível.' },
    tecnico: { nome: 'Treinador principal', descr: 'Camps rendem bônus maiores na luta (+1 por nível).' },
    fisio: { nome: 'Fisioterapia', descr: 'Menos lesões no camp e cura mais rápida.' },
    nutri: { nome: 'Nutrição', descr: '+3 de energia por semana por nível e corte de peso mais leve.' },
    preparador: { nome: 'Preparação física', descr: 'Camps gastam menos energia e você começa a luta com mais fôlego.' },
  };
  const CUSTOS_ACADEMIA = [1500, 4000, 9000];

  function nivelFama(c) {
    const pts = Math.max(0, c.fama || 0);
    let n = 0;
    NIVEIS_FAMA.forEach((x, i) => { if (pts >= x.min) n = i; });
    const atual = NIVEIS_FAMA[n];
    const prox = NIVEIS_FAMA[n + 1] || null;
    return { nivel: n, nome: atual.nome, pts: pts, min: atual.min, prox: prox ? prox.min : null, proxNome: prox ? prox.nome : null, progresso: prox ? (pts - atual.min) / (prox.min - atual.min) : 1 };
  }

  // Muda a fama (showman ganha mais). Devolve quanto realmente mudou.
  function ganharFama(c, valor) {
    let v = valor;
    if (v > 0 && (c.tracos || []).indexOf('showman') >= 0) v *= 1.25;
    if (c.meta === 'lenda') v = v > 0 ? v * 1.25 : v * 1.5;
    if (c.meta === 'duplo' && v > 0) v *= 0.85;
    v = Math.round(v);
    const antes = nivelFama(c).nivel;
    const maxAntes = nivelFamaMax(c);
    const pts = c.fama || 0;
    c.fama = Math.max(0, pts + v);
    c.famaMax = Math.max(c.famaMax || 0, c.fama);
    const depois = nivelFama(c).nivel;
    if (depois > antes) aviso(c, 'Sua fama subiu: agora você é ' + NIVEIS_FAMA[depois].nome + '!');
    const maxDepois = nivelFamaMax(c);
    if (maxDepois > maxAntes) c.pontosHab = (c.pontosHab || 0) + (maxDepois - maxAntes); // fama nova rende habilidade
    return c.fama - pts;
  }

  function nivelAcademia(c, id) {
    return (c.academia && c.academia[id]) || 0;
  }

  function custoAcademia(c, id) {
    const n = nivelAcademia(c, id);
    return n >= CUSTOS_ACADEMIA.length ? null : CUSTOS_ACADEMIA[n];
  }

  function comprarAcademia(c, id) {
    if (!ACADEMIA[id]) return { ok: false, motivo: 'Melhoria inválida.' };
    const custo = custoAcademia(c, id);
    if (custo === null) return { ok: false, motivo: 'Já está no nível máximo.' };
    if (c.dinheiro < custo) return { ok: false, motivo: 'Faltam $' + (custo - c.dinheiro).toLocaleString('pt-BR') + '.' };
    c.dinheiro -= custo;
    if (!c.academia) c.academia = {};
    c.academia[id] = nivelAcademia(c, id) + 1;
    return { ok: true, nivel: c.academia[id], custo: custo };
  }

  // ---- Tracos e assinaturas ----

  // As vagas seguem a MAIOR fama ja alcancada: perder fama nao tira traco nem golpe.
  function nivelFamaMax(c) {
    const m = Math.max(c.fama || 0, c.famaMax || 0);
    let n = 0;
    NIVEIS_FAMA.forEach((x, i) => { if (m >= x.min) n = i; });
    return n;
  }

  function slotsTracos(c) {
    const n = nivelFamaMax(c);
    return 1 + (n >= 3 ? 1 : 0) + (n >= 5 ? 1 : 0);
  }

  function slotsAssinatura(c) {
    return 1 + (nivelFamaMax(c) >= 4 ? 1 : 0);
  }

  function tracosPendentes(c) {
    return Math.max(0, slotsTracos(c) - (c.tracos || []).length);
  }

  function assinaturasPendentes(c) {
    return Math.max(0, slotsAssinatura(c) - (c.assinaturas || []).length);
  }

  function escolherTraco(c, id) {
    if (!TRACOS[id]) return { ok: false, motivo: 'Traço inválido.' };
    if (!c.tracos) c.tracos = [];
    if (c.tracos.indexOf(id) >= 0) return { ok: false, motivo: 'Você já tem esse traço.' };
    if (tracosPendentes(c) <= 0) return { ok: false, motivo: 'Sem vaga de traço agora. Suba de fama.' };
    c.tracos.push(id);
    return { ok: true };
  }

  function escolherAssinatura(c, id) {
    if (!ASSINATURAS[id]) return { ok: false, motivo: 'Golpe inválido.' };
    if (!c.assinaturas) c.assinaturas = [];
    if (c.assinaturas.indexOf(id) >= 0) return { ok: false, motivo: 'Você já tem esse golpe.' };
    if (assinaturasPendentes(c) <= 0) return { ok: false, motivo: 'Sem vaga de assinatura agora. Suba de fama.' };
    c.assinaturas.push(id);
    return { ok: true };
  }

  function definirAssinaturaAtiva(c, id) {
    const i = (c.assinaturas || []).indexOf(id);
    if (i < 0) return { ok: false, motivo: 'Você não tem esse golpe.' };
    c.assinaturaAtiva = i;
    return { ok: true };
  }

  function assinaturaEquipada(c) {
    const id = (c.assinaturas || [])[c.assinaturaAtiva || 0];
    return id && ASSINATURAS[id] ? { id: id, nome: ASSINATURAS[id].nome, tipo: ASSINATURAS[id].tipo } : null;
  }

  // Sugestoes para a criacao: golpes e tracos que combinam com a modalidade.
  const SUGESTOES_MODALIDADE = {
    bjj: { assinaturas: ['triangulo', 'mata_leao', 'chave_de_braco'], tracos: ['mestre_finalizacao', 'cardio', 'resiliente'] },
    judo: { assinaturas: ['double_leg', 'chave_de_braco', 'gancho_esquerda'], tracos: ['wrestler_dominante', 'mestre_finalizacao', 'queixo_de_aco'] },
    wrestling: { assinaturas: ['double_leg', 'gancho_esquerda', 'mata_leao'], tracos: ['wrestler_dominante', 'cardio', 'pressao'] },
    boxe: { assinaturas: ['gancho_esquerda', 'joelhada_voadora', 'chute_alto'], tracos: ['nocauteador', 'queixo_de_aco', 'contra_ataque'] },
    kickboxing: { assinaturas: ['chute_alto', 'gancho_esquerda', 'joelhada_voadora'], tracos: ['pressao', 'cardio', 'nocauteador'] },
    muaythai: { assinaturas: ['joelhada_voadora', 'chute_alto', 'gancho_esquerda'], tracos: ['nocauteador', 'pressao', 'queixo_de_aco'] },
    karate: { assinaturas: ['chute_alto', 'joelhada_voadora', 'double_leg'], tracos: ['contra_ataque', 'cardio', 'showman'] },
    mma: { assinaturas: ['gancho_esquerda', 'double_leg', 'triangulo'], tracos: ['showman', 'cardio', 'resiliente'] },
  };

  // ---- Rivalidade ----

  function criarRivalidade(c, nome, motivo, heat) {
    if (!c.rivais) c.rivais = {};
    const r = c.rivais[nome] || { heat: 0, motivo: motivo, desde: c.semana };
    r.heat = clamp(r.heat + (heat || 1), 1, 3);
    c.rivais[nome] = r;
    return r;
  }

  function esfriarRivalidade(c, nome, n) {
    const r = c.rivais && c.rivais[nome];
    if (!r) return null;
    r.heat -= n || 1;
    if (r.heat <= 0) {
      delete c.rivais[nome];
      return null;
    }
    return r;
  }

  // O rival mais quente que esta na categoria atual (ou null).
  function rivalPrincipal(c) {
    if (!c.rivais) return null;
    const lista = ranking(c);
    let melhor = null;
    Object.keys(c.rivais).forEach((nome) => {
      const x = lista.find((y) => !y.jogador && y.nome === nome);
      if (x && (!melhor || c.rivais[nome].heat > melhor.heat)) melhor = { nome: nome, heat: c.rivais[nome].heat, motivo: c.rivais[nome].motivo, rating: x.rating, pos: lista.indexOf(x) + 1 };
    });
    return melhor;
  }

  // Depois da luta: elogiar o rival ou botar lenha na rivalidade.
  function posLuta(c, tipo) {
    const p = c.posLutaPendente;
    if (!p) return { ok: false, motivo: 'Nada a dizer agora.' };
    const quente = tipo === 'quente';
    let fama = 0;
    if (p.venceu) fama = quente ? 14 : 6;
    else fama = quente ? 5 : 2;
    const ganho = ganharFama(c, fama);
    let texto;
    if (quente) {
      criarRivalidade(c, p.oponente, p.venceu ? 'provocacao' : 'revanche', 1);
      texto = p.venceu ? 'Você provocou ' + p.oponente + ' depois da vitória: a rivalidade esquentou.' : 'Você exigiu a revanche contra ' + p.oponente + '.';
    } else {
      texto = 'Você respeitou ' + p.oponente + ' diante das câmeras.';
    }
    c.posLutaPendente = null;
    return { ok: true, fama: ganho, texto: texto };
  }

  // ---- Camp de treino: o tempo ate a luta vira poucas decisoes ----

  // Atividades de uma semana de camp. rolls: [atributo, quantas chances de evoluir]; luta: bonus so na luta marcada.
  const ATIVIDADES = {
    boxe: { nome: 'Boxe', icone: 'luva', descr: 'Jab, esquiva e mãos rápidas. Afina a trocação.', rolls: [['striking', 2]], luta: { striking: 2, velocidade: 1 }, custo: 25, risco: 0.04 },
    muaythai: { nome: 'Muay Thai', icone: 'pressao', descr: 'Chutes, joelhos e clinch. Mais potência nos golpes.', rolls: [['striking', 1], ['forca', 1]], luta: { striking: 2, forca: 2 }, custo: 28, risco: 0.05 },
    wrestling: { nome: 'Wrestling', icone: 'queda', descr: 'Quedas e defesa de quedas. Decide quem manda onde a luta acontece.', rolls: [['wrestling', 2]], luta: { wrestling: 2, defesa: 2 }, custo: 28, risco: 0.05 },
    jiujitsu: { nome: 'Jiu-jítsu', icone: 'chao', descr: 'Posições, passagens e finalizações. Desgasta menos.', rolls: [['bjj', 1], ['grappling', 1]], luta: { bjj: 2, grappling: 2 }, custo: 22, risco: 0.02 },
    sparring: { nome: 'Sparring', icone: 'luta', descr: 'O mais parecido com a luta: ganha timing e leitura, mas o risco de lesão é o maior.', rolls: [['qi', 1]], luta: { striking: 3, wrestling: 2, qi: 2 }, custo: 30, risco: 0.1 },
    condicionamento: { nome: 'Condicionamento', icone: 'folego', descr: 'Corrida, circuitos e tiros. Você chega com mais fôlego aos rounds finais.', rolls: [['resistencia', 2]], luta: {}, stam: 6, custo: 25, risco: 0.03 },
    recuperacao: { nome: 'Recuperação', icone: 'lua', descr: 'Fisioterapia, sono e massagem. Sem treino, mas o corpo agradece.', recupera: 30, custo: 0, risco: 0 },
  };
  const ATIVIDADE_DO_ATRIBUTO = { striking: 'boxe', velocidade: 'boxe', forca: 'muaythai', wrestling: 'wrestling', defesa: 'wrestling', bjj: 'jiujitsu', grappling: 'jiujitsu', resistencia: 'condicionamento', qi: 'sparring', queixo: 'sparring' };

  function custoEnergia(c, base) {
    return Math.max(5, base - 3 * nivelAcademia(c, 'preparador'));
  }

  function gerarEtapas(n) {
    const E = (tipo, semanas) => ({ tipo: tipo, semanas: semanas });
    if (n <= 0) return [];
    if (n < 4) {
      const lista = [E('plano', 1)];
      if (n >= 2) lista.push(E('scouting', 1));
      if (n >= 3) lista.push(E('corte', 1));
      lista.push(E('coletiva', 0));
      return lista;
    }
    const lista = [E('plano', 2), E('scouting', 1)];
    let resto = n - 4;
    let eventos = 0;
    while (resto > 0) {
      if (eventos < 2) {
        lista.push(E('evento', 1));
        eventos++;
        resto--;
      }
      if (resto > 0) {
        const w = Math.min(2, resto);
        lista.push(E('plano', w));
        resto -= w;
      }
    }
    lista.push(E('corte', 1), E('coletiva', 0));
    return lista;
  }

  function novoCamp(n) {
    return { total: n, etapas: gerarEtapas(n), i: 0, efeitos: { attr: {}, stamBonus: 0, scout: false, provocacao: 0, lesionado: false }, historico: [] };
  }

  function etapaAtual(c) {
    return c.camp && c.camp.i < c.camp.etapas.length ? c.camp.etapas[c.camp.i] : null;
  }

  function campConcluido(c) {
    return !!(c.camp && c.camp.i >= c.camp.etapas.length);
  }

  // Pontuacao de cada atributo de treino para a luta marcada (ou so pelo espaco ate o teto).
  function listaRecomendacao(c, op) {
    const alvo = op || (c.agendada && c.agendada.op);
    const out = [];
    const ele = alvo ? atributosDoOponente(c, alvo) : null;
    const eu = c.atributos;
    const nome = alvo ? alvo.nome.split(' ').pop() : '';
    const pares = [
      ['defesa', ele ? ele.wrestling - eu.defesa : 0, nome + ' busca a queda e sua defesa está abaixo da dele'],
      ['wrestling', ele ? ele.defesa - eu.wrestling : 0, nome + ' defende bem as quedas: seu wrestling precisa subir'],
      ['striking', ele ? ele.defesa - eu.striking : 0, nome + ' defende bem em pé: seus golpes precisam de mais precisão'],
      ['bjj', ele ? ele.bjj - eu.bjj : 0, nome + ' é perigoso no chão: reforce o jiu-jitsu'],
      ['grappling', ele ? ele.grappling - eu.grappling : 0, nome + ' controla bem no chão: reforce o grappling'],
      ['forca', ele ? ele.queixo - eu.forca : 0, nome + ' tem queixo duro: mais força ajuda a decidir'],
      ['resistencia', ele ? (ele.resistencia - eu.resistencia) * 0.7 : 0, nome + ' tem mais fôlego: o cardio vai pesar nos rounds finais'],
    ];
    pares.forEach(([attr, score, motivo]) => {
      const gap = c.tetos[attr] - c.atributos[attr];
      if (gap <= 0) return;
      out.push({ attr: attr, score: score + Math.min(gap, 20) / 5, motivo: score > 3 ? motivo : 'Espaço para evoluir antes do teto', necessario: score > 3 });
    });
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  function candidatosTreino(c) {
    const l = listaRecomendacao(c);
    return l.slice(0, 2).map((x, i) => ({ attr: x.attr, motivo: x.motivo, recomendado: i === 0 && x.necessario }));
  }

  // Paga a subida de nivel onde quer que o XP tenha vindo (luta, camp ou evento): pontos de atributo e de
  // habilidade, e deixa a comemoracao pendente para a interface.
  function pagarNivel(c) {
    const n = nivelDoXP(c.xp);
    const de = Number.isFinite(c.nivelPago) ? c.nivelPago : n;
    if (n <= de) {
      c.nivelPago = Math.max(de, n);
      return 0;
    }
    const subiu = n - de;
    c.nivelPago = n;
    c.pontosDisponiveis = (c.pontosDisponiveis || 0) + 2 * subiu;
    c.pontosHab = (c.pontosHab || 0) + subiu;
    const antes = c.celebrarNivel;
    c.celebrarNivel = { de: antes ? antes.de : de, para: n, pontosAtributo: (antes ? antes.pontosAtributo : 0) + 2 * subiu, pontosHab: (antes ? antes.pontosHab : 0) + subiu };
    aviso(c, 'Você subiu para o nível ' + n + '!');
    return subiu;
  }

  // Um teste de evolucao de atributo (o mesmo do treino antigo, agora dentro do camp).
  function rolarTreino(c, attr, r) {
    const ch = chanceTreino(c, attr);
    const chance = Math.min(1, ch.chance * (1 + 0.1 * nivelAcademia(c, 'ginasio')));
    const ganhou = r() < chance;
    let pontos = 0;
    let salto = false;
    let inc = 0;
    if (ganhou) {
      if (!c.xpAtributos) c.xpAtributos = {};
      // as vezes o treino da um estalo: evolui 3 de uma vez
      salto = r() < 0.08 + 0.02 * nivelAcademia(c, 'ginasio') && c.tetos[attr] - c.atributos[attr] >= 2;
      inc = salto ? Math.min(3, c.tetos[attr] - c.atributos[attr]) : 1;
      c.atributos[attr] += inc;
      c.xpAtributos[attr] = (c.xpAtributos[attr] || 0) + XP_TREINO * (salto ? 2 : 1);
      while (c.atributos[attr] < c.tetos[attr] && c.xpAtributos[attr] >= limiteAtributo(c.atributos[attr])) {
        c.xpAtributos[attr] -= limiteAtributo(c.atributos[attr]);
        c.pontosDisponiveis = (c.pontosDisponiveis || 0) + 1;
        pontos++;
      }
    }
    c.xp += 3;
    return { attr: attr, ganhou: ganhou, chance: chance, pontos: pontos, salto: salto, ganho: inc };
  }

  function riscoLesaoCamp(c, base) {
    let p = base * (c.energia < 40 ? 2.5 : 1) * (1 - 0.3 * nivelAcademia(c, 'fisio'));
    if ((c.tracos || []).indexOf('resiliente') >= 0) p *= 0.7;
    return Math.max(0, p);
  }

  // Opcoes da etapa atual do camp (ja com custos, riscos e se esta disponivel).
  function opcoesEtapa(c) {
    const et = etapaAtual(c);
    if (!et) return [];
    const energia = c.energia;
    const tec = nivelAcademia(c, 'tecnico');
    const nutri = nivelAcademia(c, 'nutri');
    const chanceTxt = (attr) => Math.round(Math.min(1, chanceTreino(c, attr).chance * (1 + 0.1 * nivelAcademia(c, 'ginasio'))) * 100) + '%';
    if (et.tipo === 'plano') {
      const rec0 = listaRecomendacao(c)[0];
      let recId = rec0 && rec0.necessario ? ATIVIDADE_DO_ATRIBUTO[rec0.attr] : null;
      if (energia < 45) recId = 'recuperacao';
      if (!recId && rec0) recId = ATIVIDADE_DO_ATRIBUTO[rec0.attr];
      return Object.keys(ATIVIDADES).map((id) => {
        const a = ATIVIDADES[id];
        const custo = a.recupera ? -a.recupera : custoEnergia(c, a.custo);
        const ganhos = [];
        (a.rolls || []).forEach(([attr, n]) => ganhos.push((n > 1 ? n + ' chances' : '1 chance') + ' de evoluir ' + ROTULOS[attr] + ' (' + chanceTxt(attr) + ')'));
        const bonus = Object.keys(a.luta || {}).map((k, i) => '+' + (a.luta[k] + (i === 0 ? tec : 0)) + ' ' + ROTULOS[k]);
        if (bonus.length) ganhos.push(bonus.join(', ') + ' na luta');
        if (a.stam) ganhos.push('começa a luta com +' + a.stam + ' de fôlego');
        if (a.recupera) ganhos.push('recupera ' + a.recupera + ' de energia e acelera a cura');
        const risco = a.risco >= 0.09 ? 'Risco de lesão alto' : a.risco >= 0.045 ? 'Risco de lesão médio' : a.risco > 0 ? 'Risco de lesão baixo' : 'Sem risco';
        const atr = a.rolls && a.rolls[0] ? a.rolls[0][0] : null;
        return {
          id: 'atv:' + id, atv: id, attr: atr, titulo: a.nome, icone: a.icone, descr: a.descr, ganhos: ganhos,
          custo: custo, risco: risco, recomendado: id === recId, motivo: id === recId && rec0 && energia >= 45 ? rec0.motivo : id === recId ? 'Energia baixa: o corpo pede descanso' : '',
          ok: a.recupera ? true : energia >= Math.max(30, custo + 5), razao: 'Energia baixa para treinar assim (precisa de ' + Math.max(30, custo + 5) + ').',
        };
      });
    }
    if (et.tipo === 'scouting') {
      const cand = candidatosTreino(c);
      const A = cand[0] || { attr: 'striking' };
      const op = [
        { id: 'estudar', titulo: 'Estudar o adversário', descr: 'Revela o plano dele e mostra o que ele vai tentar durante a luta. +' + (3 + tec) + ' de QI e +' + (2 + tec) + ' de defesa na luta.', custo: 0, risco: 'Sem risco', recomendado: true, ok: true },
        { id: 'extra', titulo: 'Treinar mais: ' + ROTULOS[A.attr], descr: '1 chance extra de evoluir (' + chanceTxt(A.attr) + ').', attr: A.attr, custo: custoEnergia(c, 10), risco: 'Risco de lesão baixo', ok: energia >= 15, razao: 'Energia baixa.' },
        { id: 'sparring', titulo: 'Sparring pesado', descr: '+3 em golpes e queda na luta, mas desgasta e arrisca lesão.', custo: custoEnergia(c, 20), risco: 'Risco de lesão médio', ok: energia >= 25, razao: 'Energia baixa para o sparring.' },
      ];
      return op;
    }
    if (et.tipo === 'corte') {
      return [
        { id: 'seguro', titulo: 'Corte de peso seguro', descr: 'Dieta controlada: bate o peso sem sacrifício. Você chega com o fôlego que tiver.', custo: 0, risco: 'Sem risco', recomendado: true, ok: true },
        { id: 'agressivo', titulo: 'Corte de peso agressivo', descr: '+3 em força e +2 em queixo na luta, mas começa com menos fôlego (' + Math.max(4, 12 - 3 * nutri) + ' a menos).', custo: 0, risco: 'Fôlego menor na luta', ok: true },
      ];
    }
    if (et.tipo === 'coletiva') {
      const alvo = c.agendada ? c.agendada.op.nome : 'o rival';
      return [
        { id: 'respeito', titulo: 'Ser respeitoso', descr: 'Elogia ' + alvo + '. Fama +3, sem rivalidade.', custo: 0, risco: 'Sem risco', recomendado: true, ok: true },
        { id: 'provocar', titulo: 'Provocar', descr: 'Fama +8 e bolsa +10%. A rivalidade esquenta e ele vem mais agressivo.', custo: 0, risco: 'Rival mais agressivo', ok: true },
        { id: 'humilhar', titulo: 'Humilhar', descr: 'Fama +16 e bolsa +20%. Rivalidade forte, rival ainda mais forte e agressivo. Se perder, a queda de fama dói.', custo: 0, risco: 'Alto risco', ok: true },
      ];
    }
    return [];
  }

  function bloqueioCamp(c) {
    if (c.aposentado) return 'Carreira encerrada.';
    if (c.lutaAtiva) return 'Termine a luta em andamento primeiro.';
    if (!c.agendada || !c.camp) return 'Sem luta marcada.';
    if (campConcluido(c)) return 'O camp acabou: é a hora da luta.';
    return null;
  }

  function concluirCamp(c) {
    if (c.lesao) {
      c.camp.efeitos.lesionado = true;
      aviso(c, 'Você chegou lesionado (' + c.lesao.nome + '). Pode lutar, mas com desvantagem.');
    }
    aviso(c, 'Camp concluído. Dia da luta!');
  }

  // Entra na proxima etapa: o evento do camp sorteia o que aconteceu na semana.
  function entrarEtapa(c, r) {
    const et = etapaAtual(c);
    if (et && et.tipo === 'evento' && !c.evento) c.evento = sortearEvento(r);
  }

  function fecharEtapa(c, linhas, titulo, r) {
    const et = etapaAtual(c);
    c.camp.historico.push({ tipo: et.tipo, titulo: titulo, linhas: linhas });
    c.camp.i += 1;
    entrarEtapa(c, r);
    if (campConcluido(c)) concluirCamp(c);
  }

  // Aplica a decisao do jogador na etapa atual e deixa o tempo da etapa passar.
  function decidirCamp(c, id, rng) {
    const r = rng || Math.random;
    const b = bloqueioCamp(c);
    if (b) return { ok: false, motivo: b };
    const et = etapaAtual(c);
    if (et.tipo === 'evento') return { ok: false, motivo: 'Resolva o evento da semana.' };
    if (c.evento) return { ok: false, motivo: 'Resolva o evento pendente antes.' };
    const op = opcoesEtapa(c).find((o) => o.id === id);
    if (!op) return { ok: false, motivo: 'Opção inválida.' };
    if (op.ok === false) return { ok: false, motivo: op.razao || 'Opção indisponível.' };
    const ef = c.camp.efeitos;
    const tec = nivelAcademia(c, 'tecnico');
    const linhas = [];
    let lesaoNova = null;
    const somaAttr = (k, v) => { ef.attr[k] = (ef.attr[k] || 0) + v; };
    const tentarLesao = (base) => {
      if (!lesaoNova && r() < riscoLesaoCamp(c, base)) lesaoNova = sortearLesao(r);
    };
    const rolar = (attr) => {
      const t = rolarTreino(c, attr, r);
      linhas.push(t.ganhou ? (t.salto ? 'ESTALO! ' + ROTULOS[attr] + ' deu um salto: +' + t.ganho + '.' : ROTULOS[attr] + ' evoluiu: +1.') + (t.pontos ? ' Ponto para distribuir!' : '') : ROTULOS[attr] + ': sem evolução desta vez.');
      if (t.salto) ef.salto = (ef.salto || 0) + 1;
      return t;
    };

    if (et.tipo === 'plano') {
      const a = ATIVIDADES[op.atv];
      if (a.recupera) {
        c.energia = Math.min(100, c.energia + a.recupera);
        curarLesao(c);
        linhas.push('Semana de recuperação. Energia em ' + Math.round(c.energia) + '.');
      } else {
        c.energia = clamp(c.energia - op.custo, 0, 100);
        a.rolls.forEach(([attr, n]) => { for (let k = 0; k < n; k++) rolar(attr); });
        const bonus = [];
        Object.keys(a.luta || {}).forEach((k, i) => {
          const v = a.luta[k] + (i === 0 ? tec : 0);
          somaAttr(k, v);
          bonus.push('+' + v + ' ' + ROTULOS[k]);
        });
        if (a.stam) ef.stamBonus += a.stam;
        if (bonus.length || a.stam) linhas.push('Bônus na luta: ' + bonus.concat(a.stam ? ['+' + a.stam + ' de fôlego'] : []).join(', ') + '.');
        tentarLesao(a.risco);
      }
    } else if (et.tipo === 'scouting') {
      if (op.id === 'estudar') {
        ef.scout = true;
        somaAttr('qi', 3 + tec);
        somaAttr('defesa', 2 + tec);
        linhas.push('Você estudou as lutas dele. Plano do rival: ' + c.agendada.plano.texto);
      } else if (op.id === 'extra') {
        c.energia = clamp(c.energia - op.custo, 0, 100);
        rolar(op.attr);
        tentarLesao(0.03);
      } else {
        c.energia = clamp(c.energia - op.custo, 0, 100);
        somaAttr('striking', 3);
        somaAttr('wrestling', 3);
        linhas.push('Sparring pesado: +3 em golpes e queda na luta.');
        tentarLesao(0.05);
      }
    } else if (et.tipo === 'corte') {
      if (op.id === 'agressivo') {
        somaAttr('forca', 3);
        somaAttr('queixo', 2);
        ef.stamBonus -= Math.max(4, 12 - 3 * nivelAcademia(c, 'nutri'));
        linhas.push('Corte agressivo: +3 de força e +2 de queixo, com menos fôlego na luta.');
      } else {
        linhas.push('Você bateu o peso sem problemas.');
      }
    } else if (et.tipo === 'coletiva') {
      const alvo = c.agendada.op.nome;
      if (op.id === 'respeito') {
        const g = ganharFama(c, 3);
        linhas.push('Coletiva respeitosa. Fama ' + (g >= 0 ? '+' : '') + g + '.');
      } else if (op.id === 'provocar') {
        const g = ganharFama(c, 8);
        criarRivalidade(c, alvo, 'provocacao', 1);
        ef.provocacao = 1;
        c.agendada.bolsa = Math.round((c.agendada.bolsa * 1.1) / 10) * 10;
        linhas.push('Você provocou ' + alvo + '. Fama +' + g + ', bolsa +10%. Ele vem mais agressivo.');
      } else {
        const g = ganharFama(c, 16);
        criarRivalidade(c, alvo, 'provocacao', 2);
        ef.provocacao = 2;
        c.agendada.bolsa = Math.round((c.agendada.bolsa * 1.2) / 10) * 10;
        linhas.push('Você humilhou ' + alvo + ' diante das câmeras. Fama +' + g + ', bolsa +20%. Ele quer sangue.');
      }
    }

    pagarNivel(c);
    for (let k = 0; k < et.semanas; k++) virarSemana(c, r);
    if (lesaoNova) {
      aplicarLesao(c, lesaoNova);
      linhas.push('Você se machucou: ' + lesaoNova.nome + ' (' + lesaoNova.semanas + ' ' + (lesaoNova.semanas === 1 ? 'semana' : 'semanas') + ').');
    }
    const extra = consumirAvisos(c);
    extra.forEach((x) => linhas.push(x));
    fecharEtapa(c, linhas, op.titulo, r);
    return { ok: true, linhas: linhas, etapa: et.tipo, concluido: campConcluido(c), lesionou: !!lesaoNova };
  }

  // ---- Arvore de habilidades: cada escolha abre um caminho e fecha outro ----

  const RAMOS = {
    pe: { nome: 'Em pé', descr: 'Poder, leitura e distância.' },
    chao: { nome: 'No chão', descr: 'Controle, raspagem e finalização.' },
    mente: { nome: 'Mente e corpo', descr: 'Corner, cardio e queixo.' },
  };

  // tier 1: livre. tier 2: escolha entre duas (a outra fecha). tier 3: maestria (so uma na carreira).
  const HABILIDADES = {
    contra: { ramo: 'pe', tier: 1, nome: 'Contra-golpista', descr: 'Libera a tática Contra-golpe: espera o rival errar e pune, poupando fôlego.', tatica: 'contra' },
    ko: { ramo: 'pe', tier: 2, nome: 'Mão pesada', descr: '+4% de chance de nocaute em todo golpe limpo.', flag: 'hab_ko' },
    clinch: { ramo: 'pe', tier: 2, nome: 'Mestre do clinch', descr: 'Libera a tática Clinch: joelhadas e projeções colado no rival.', tatica: 'clinch' },
    cap_ko: { ramo: 'pe', tier: 3, req: 'ko', nome: 'Máquina de nocautes', descr: 'Vira Nocauteador e ganha +5 em golpes e +3 em força.', traco: 'nocauteador', attr: { striking: 5, forca: 3 } },
    cap_clinch: { ramo: 'pe', tier: 3, req: 'clinch', nome: 'Rei do clinch', descr: 'Ganha Pressão constante, +4 em wrestling e +3 em força.', traco: 'pressao', attr: { wrestling: 4, forca: 3 } },

    raspar: { ramo: 'chao', tier: 1, nome: 'Raspador', descr: 'Libera a tática Raspar: de baixo, tenta inverter e ficar por cima.', tatica: 'raspar' },
    pescoco: { ramo: 'chao', tier: 2, nome: 'Caçador de pescoços', descr: '+20% de chance de finalizar e você se defende melhor.', flag: 'hab_pescoco' },
    controle: { ramo: 'chao', tier: 2, nome: 'Controle absoluto', descr: 'Quem você domina por cima escapa bem menos.', flag: 'hab_controle' },
    cap_pescoco: { ramo: 'chao', tier: 3, req: 'pescoco', nome: 'Faixa-preta de finalizações', descr: 'Vira Mestre da finalização e ganha +5 em jiu-jitsu e +3 em grappling.', traco: 'mestre_finalizacao', attr: { bjj: 5, grappling: 3 } },
    cap_controle: { ramo: 'chao', tier: 3, req: 'controle', nome: 'Rolo compressor', descr: 'Vira Wrestler dominante e ganha +5 em wrestling e +3 em grappling.', traco: 'wrestler_dominante', attr: { wrestling: 5, grappling: 3 } },

    frieza: { ramo: 'mente', tier: 1, nome: 'Corner afiado', descr: 'O corner pode dar 2 conselhos por intervalo, em vez de 1.', flag: 'hab_frieza' },
    motor: { ramo: 'mente', tier: 2, nome: 'Motor diesel', descr: 'Ganha Cardio de aço: gasta menos fôlego e recupera mais.', traco: 'cardio' },
    blindado: { ramo: 'mente', tier: 2, nome: 'Queixo blindado', descr: 'Ganha Queixo de aço: aguenta muito mais dano.', traco: 'queixo_de_aco' },
    cap_motor: { ramo: 'mente', tier: 3, req: 'motor', nome: 'Máquina de guerra', descr: '+6 em resistência, +3 em velocidade e +3 em QI de luta.', attr: { resistencia: 6, velocidade: 3, qi: 3 } },
    cap_blindado: { ramo: 'mente', tier: 3, req: 'blindado', nome: 'Imortal', descr: 'Vira Resiliente e ganha +6 em queixo, +3 em defesa e +3 em QI.', traco: 'resiliente', attr: { queixo: 6, defesa: 3, qi: 3 } },
  };

  const HIBRIDOS = {
    completo: { nome: 'Lutador completo', descr: 'Sabe de tudo um pouco: +2 em QI e defesa na luta.', attr: { qi: 2, defesa: 2 } },
    mma: { nome: 'Striker-grappler (MMA moderno)', descr: 'Mistura pé e chão: +1 em golpes, wrestling e grappling.', attr: { striking: 1, wrestling: 1, grappling: 1 } },
    estrategista: { nome: 'Contra-atacador estrategista', descr: 'Pé e cabeça: +3 em QI e +2 em golpes.', attr: { qi: 3, striking: 2 } },
    sufocador: { nome: 'Sufocador', descr: 'Chão e fôlego: +3 em resistência e +2 em grappling.', attr: { resistencia: 3, grappling: 2 } },
    striker: { nome: 'Especialista em pé', descr: '+2 em golpes na luta.', attr: { striking: 2 } },
    grappler: { nome: 'Especialista de chão', descr: '+2 em grappling e jiu-jitsu na luta.', attr: { grappling: 2, bjj: 2 } },
    guerreiro: { nome: 'Guerreiro de resistência', descr: '+2 em resistência e queixo na luta.', attr: { resistencia: 2, queixo: 2 } },
  };

  function ramoContagem(c) {
    const n = { pe: 0, chao: 0, mente: 0 };
    (c.habilidades || []).forEach((id) => { if (HABILIDADES[id]) n[HABILIDADES[id].ramo]++; });
    return n;
  }

  // Estado de cada habilidade: tem | livre | bloqueada | fechada (outra escolha a fechou).
  function estadoHab(c, id) {
    const h = HABILIDADES[id];
    const tem = c.habilidades || [];
    if (!h) return { estado: 'bloqueada', motivo: 'Habilidade inválida.' };
    if (tem.indexOf(id) >= 0) return { estado: 'tem' };
    if (h.tier === 1) return { estado: 'livre' };
    const doRamo = (t) => tem.find((x) => HABILIDADES[x].ramo === h.ramo && HABILIDADES[x].tier === t);
    if (h.tier === 2) {
      if (!doRamo(1)) return { estado: 'bloqueada', motivo: 'Aprenda a habilidade inicial do ramo antes.' };
      const outro = doRamo(2);
      if (outro) return { estado: 'fechada', motivo: 'Você escolheu ' + HABILIDADES[outro].nome + ' neste ramo.' };
      return { estado: 'livre' };
    }
    if (tem.indexOf(h.req) < 0) {
      const outro = doRamo(2);
      if (outro) return { estado: 'fechada', motivo: 'Seu caminho neste ramo é ' + HABILIDADES[outro].nome + '.' };
      return { estado: 'bloqueada', motivo: 'Aprenda ' + HABILIDADES[h.req].nome + ' antes.' };
    }
    const cap = tem.find((x) => HABILIDADES[x].tier === 3);
    if (cap) return { estado: 'fechada', motivo: 'Sua maestria já é ' + HABILIDADES[cap].nome + '.' };
    return { estado: 'livre' };
  }

  function aprender(c, id) {
    const h = HABILIDADES[id];
    if (!h) return { ok: false, motivo: 'Habilidade inválida.' };
    if ((c.pontosHab || 0) <= 0) return { ok: false, motivo: 'Sem pontos de habilidade. Suba de nível, vença títulos e ganhe fama.' };
    const e = estadoHab(c, id);
    if (e.estado === 'tem') return { ok: false, motivo: 'Você já tem essa habilidade.' };
    if (e.estado !== 'livre') return { ok: false, motivo: e.motivo || 'Indisponível.' };
    if (!c.habilidades) c.habilidades = [];
    c.habilidades.push(id);
    c.pontosHab -= 1;
    const ganhos = [];
    if (h.attr) {
      Object.keys(h.attr).forEach((k) => {
        c.atributos[k] = Math.min(99, c.atributos[k] + h.attr[k]);
        c.tetos[k] = Math.max(c.tetos[k], c.atributos[k]);
        ganhos.push('+' + h.attr[k] + ' ' + ROTULOS[k]);
      });
    }
    return { ok: true, hab: h, ganhos: ganhos, hibrido: estiloHibrido(c) };
  }

  // Marcas que o motor da luta le (flags hab_* e tracos concedidos).
  function habFlags(c) {
    const out = [];
    (c.habilidades || []).forEach((id) => {
      const h = HABILIDADES[id];
      if (!h) return;
      if (h.flag) out.push(h.flag);
      if (h.traco) out.push(h.traco);
    });
    return out;
  }

  // Taticas extras liberadas pela arvore.
  function desbloqueios(c) {
    const out = [];
    (c.habilidades || []).forEach((id) => {
      const h = HABILIDADES[id];
      if (h && h.tatica) out.push(h.tatica);
    });
    return out;
  }

  function estiloHibrido(c) {
    const n = ramoContagem(c);
    const total = n.pe + n.chao + n.mente;
    let id = null;
    if (n.pe >= 1 && n.chao >= 1 && n.mente >= 1 && total >= 4) id = 'completo';
    else if (n.pe >= 2 && n.chao >= 2) id = 'mma';
    else if (n.pe >= 2 && n.mente >= 2) id = 'estrategista';
    else if (n.chao >= 2 && n.mente >= 2) id = 'sufocador';
    else if (n.pe >= 2) id = 'striker';
    else if (n.chao >= 2) id = 'grappler';
    else if (n.mente >= 2) id = 'guerreiro';
    return id ? Object.assign({ id: id }, HIBRIDOS[id]) : null;
  }

  // ---- Metas de carreira: cada uma tem um premio e um preco ----

  const METAS = {
    campeao: { nome: 'Caçador de cinturão', descr: 'Ser o campeão da categoria.', bonus: 'Bolsas de título +30%.', preco: 'Lutas sem título pagam 10% menos.' },
    duplo: { nome: 'Duplo campeão', descr: 'Ganhar o cinturão em duas categorias.', bonus: 'Ao mudar de categoria você mantém metade dos pontos de ranking.', preco: 'Você ganha 15% menos fama.' },
    lenda: { nome: 'Carreira lendária', descr: 'Chegar a Lenda e somar 15 vitórias.', bonus: 'Ganha 25% mais fama.', preco: 'Derrotas custam 50% mais fama.' },
    finalizador: { nome: 'Finalizador', descr: 'Vencer 8 lutas por nocaute ou finalização.', bonus: 'Vitórias antes do limite pagam 30% mais.', preco: 'Vitórias por decisão pagam 15% menos.' },
  };

  function metasDisponiveis(c) {
    const feitas = c.metasCumpridas || [];
    return Object.keys(METAS).map((id) => {
      const m = METAS[id];
      let ok = true;
      let motivo = '';
      if (feitas.indexOf(id) >= 0) { ok = false; motivo = 'Meta já cumprida.'; }
      else if (id === 'duplo' && c.periodo === 'eras') { ok = false; motivo = 'Não há cinturão na era antiga.'; }
      const nome = id === 'campeao' && c.periodo === 'eras' ? 'Rei do ranking' : m.nome;
      const descr = id === 'campeao' && c.periodo === 'eras' ? 'Chegar ao #1 do ranking.' : m.descr;
      return { id: id, nome: nome, descr: descr, bonus: m.bonus, preco: m.preco, ok: ok, motivo: motivo };
    });
  }

  function escolherMeta(c, id) {
    if (c.meta) return { ok: false, motivo: 'Você já tem uma meta em andamento.' };
    const m = metasDisponiveis(c).find((x) => x.id === id);
    if (!m) return { ok: false, motivo: 'Meta inválida.' };
    if (!m.ok) return { ok: false, motivo: m.motivo };
    c.meta = id;
    return { ok: true, meta: m };
  }

  function metaProgresso(c) {
    const id = c.meta;
    if (!id || !METAS[id]) return null;
    const frac = (n, de) => clamp(n / de, 0, 1);
    const nome = metasDisponiveis(c).find((x) => x.id === id).nome;
    const pos = posicaoDoJogador(c);
    const total = ranking(c).length;
    let progresso = 0;
    let texto = '';
    let feito = false;
    if (id === 'campeao') {
      if (c.periodo === 'eras') {
        feito = pos === 1;
        progresso = pos ? frac(total - pos, Math.max(1, total - 1)) : 0;
        texto = feito ? 'Você é o #1!' : 'chegue ao #1 do ranking (você: #' + (pos || '?') + ')';
      } else {
        feito = !!c.campeao || (c.titulos || 0) > 0;
        progresso = feito ? 1 : pos && pos <= 5 ? 0.5 + 0.2 * Math.min(2, c.sequencia) : 0.5 * frac(total - (pos || total), Math.max(1, total - 5));
        texto = feito ? 'Cinturão conquistado!' : 'conquiste o cinturão (você: #' + (pos || '?') + ')';
      }
    } else if (id === 'duplo') {
      const n = Object.keys(c.titulosPor || {}).length;
      feito = n >= 2;
      progresso = n >= 2 ? 1 : n === 1 ? 0.5 + (c.campeao ? 0 : 0.1) : 0.2 * frac(total - (pos || total), Math.max(1, total - 5));
      texto = 'cinturões: ' + Math.min(n, 2) + '/2' + (n === 1 ? ' — mude de categoria e conquiste o segundo' : '');
    } else if (id === 'lenda') {
      const f = Math.max(c.famaMax || 0, c.fama || 0);
      feito = f >= NIVEIS_FAMA[5].min && c.recorde.v >= 15;
      progresso = 0.5 * Math.min(1, f / NIVEIS_FAMA[5].min) + 0.5 * Math.min(1, c.recorde.v / 15);
      texto = 'fama ' + Math.min(f, NIVEIS_FAMA[5].min) + '/' + NIVEIS_FAMA[5].min + ' · vitórias ' + Math.min(c.recorde.v, 15) + '/15';
    } else {
      const n = c.finalizacoes || 0;
      feito = n >= 8;
      progresso = Math.min(1, n / 8);
      texto = 'vitórias antes do limite: ' + Math.min(n, 8) + '/8';
    }
    return { id: id, nome: nome, progresso: clamp(progresso, 0, 1), texto: texto, feito: feito };
  }

  // Cumpriu a meta? Entrega o premio e libera a escolha da proxima.
  function verificarMeta(c) {
    const p = metaProgresso(c);
    if (!p || !p.feito) return null;
    c.metasCumpridas = (c.metasCumpridas || []).concat(c.meta);
    c.meta = null;
    c.pontosHab = (c.pontosHab || 0) + 3;
    c.dinheiro += 15000;
    const fama = ganharFama(c, 120);
    aviso(c, 'Meta cumprida: ' + p.nome + '! +3 pontos de habilidade.');
    return { id: p.id, nome: p.nome, pontosHab: 3, dinheiro: 15000, fama: fama };
  }

  function ajusteMetaBolsa(c, bolsa, titulo, antesDoLimite, venceu) {
    let m = 1;
    if (c.meta === 'campeao') m = titulo ? 1.3 : 0.9;
    else if (c.meta === 'finalizador') m = venceu ? (antesDoLimite ? 1.3 : 0.85) : 1;
    return Math.round((bolsa * m) / 10) * 10;
  }

  // ---- Recompensas variaveis: nem toda luta paga igual ----

  const MARCAS = ['Venum', 'Hayabusa', 'Monster Energy', 'Under Armour', 'Reebok', 'Engage'];
  const MENTORES = [
    { nome: 'Greg Jackson', attr: 'qi', txt: 'ensina a ler o rival antes do primeiro golpe' },
    { nome: 'Javier Mendez', attr: 'wrestling', txt: 'refina a sua luta de queda' },
    { nome: 'Freddie Roach', attr: 'striking', txt: 'lapida o seu boxe' },
    { nome: 'Rickson Gracie', attr: 'bjj', txt: 'mostra detalhes do jiu-jitsu que ninguém vê' },
    { nome: 'Firas Zahabi', attr: 'defesa', txt: 'monta a sua defesa peça por peça' },
  ];
  const ACAO_LUTA_DA_NOITE = 17; // acertos + 3 x quedas dos dois lutadores (cerca de 15% das lutas passam)

  function arredondar10(v) {
    return Math.round(v / 10) * 10;
  }

  function sortearRecompensas(c, x, r) {
    const out = [];
    const e0 = x.luta.estatisticas[0];
    const e1 = x.luta.estatisticas[1];
    const acao = e0.acertos + e1.acertos + 3 * (e0.quedasOk + e1.quedasOk);
    let bonus = null;
    if (x.venceu && x.finalizou) {
      const p = x.round <= 1 ? 1 : x.round === 2 ? 0.6 : 0.35;
      if (r() < p) {
        bonus = {
          tipo: 'performance', raridade: x.round <= 1 ? 'épico' : 'raro', titulo: 'Performance da Noite',
          texto: x.round <= 1 ? 'Vitória relâmpago no primeiro round: a empresa premiou o seu show.' : 'Vitória por ' + (x.metodo === 'Nocaute' ? 'nocaute' : 'finalização') + ' no round ' + x.round + ': prêmio extra.',
          valor: arredondar10(Math.max(2500, x.bolsaBase * (x.round <= 1 ? 0.6 : 0.35))), fama: x.round <= 1 ? 15 : 8,
        };
      }
    }
    if (!bonus && acao >= ACAO_LUTA_DA_NOITE && r() < 0.55) {
      bonus = { tipo: 'luta_noite', raridade: 'raro', titulo: 'Luta da Noite', texto: 'A arena veio abaixo: a luta mais emocionante do evento.', valor: arredondar10(Math.max(2000, x.bolsaBase * 0.4)), fama: 12 };
    }
    if (bonus) {
      c.dinheiro += bonus.valor;
      bonus.famaGanha = ganharFama(c, bonus.fama);
      out.push(bonus);
    }

    const chance = Math.min(0.5, 0.1 + 0.05 * (c.semDrop || 0));
    if (r() < chance) {
      c.semDrop = 0;
      const sorte = r();
      const lutas = c.recorde.v + c.recorde.d + c.recorde.e;
      const mentoresLivres = MENTORES.filter((m) => (c.mentores || []).indexOf(m.nome) < 0);
      let tipo = sorte < 0.5 ? 'patrocinio' : sorte < 0.75 ? 'viral' : sorte < 0.9 ? 'relampago' : 'mentor';
      if (tipo === 'mentor' && (lutas < 3 || !mentoresLivres.length)) tipo = 'patrocinio';
      if (tipo === 'relampago' && c.lutaBonus) tipo = 'patrocinio';
      if (tipo === 'patrocinio') {
        const mult = 0.8 + r() * 1.7;
        const marca = MARCAS[Math.floor(r() * MARCAS.length)];
        const valor = arredondar10(x.bolsaBase * mult);
        c.dinheiro += valor;
        out.push({ tipo: 'patrocinio', raridade: mult > 2 ? 'épico' : mult > 1.4 ? 'raro' : 'comum', titulo: 'Patrocinador surpresa', texto: marca + ' viu a sua luta e quer o seu nome no calção.', valor: valor });
      } else if (tipo === 'viral') {
        const g = 40 + Math.floor(r() * 80);
        const real = ganharFama(c, g);
        out.push({ tipo: 'viral', raridade: g > 85 ? 'raro' : 'comum', titulo: 'Momento viral', texto: 'O lance da luta bombou nas redes.', famaGanha: real });
      } else if (tipo === 'relampago') {
        c.lutaBonus = { desde: c.semana };
        out.push({ tipo: 'relampago', raridade: 'raro', titulo: 'Luta-relâmpago', texto: 'Um rival topou lutar logo: bolsa 60% maior e só 2 semanas de camp. Está nas suas ofertas.' });
      } else {
        const m = mentoresLivres[Math.floor(r() * mentoresLivres.length)];
        if (!c.mentores) c.mentores = [];
        c.mentores.push(m.nome);
        const antes = c.atributos[m.attr];
        c.atributos[m.attr] = Math.min(99, antes + 2);
        c.tetos[m.attr] = Math.max(c.tetos[m.attr], c.atributos[m.attr]);
        c.pontosHab = (c.pontosHab || 0) + 1;
        out.push({ tipo: 'mentor', raridade: 'lendário', titulo: m.nome + ' apareceu', texto: m.nome + ' passou pela academia e ' + m.txt + ': +' + (c.atributos[m.attr] - antes) + ' em ' + ROTULOS[m.attr] + ' e +1 ponto de habilidade.' });
      }
    } else {
      c.semDrop = (c.semDrop || 0) + 1;
    }
    return out;
  }

  // ---- "So mais uma": o que esta perto de acontecer ----

  function ganchos(c) {
    const out = [];
    const add = (urg, tipo, texto, acao) => out.push({ urg: urg, tipo: tipo, texto: texto, acao: acao || null });
    if (c.aposentado) return out;
    const lista = ranking(c);
    const idx = lista.findIndex((x) => x.jogador);
    const riv = rivalPrincipal(c);
    if (riv) add(6 + riv.heat * 0.5, 'rival', riv.motivo === 'revanche' ? 'Revanche contra ' + riv.nome + ' (#' + riv.pos + ') na mesa' : 'Rivalidade com ' + riv.nome + ' (#' + riv.pos + ') pegando fogo');
    if (c.lutaBonus && (c.ofertas || []).some((o) => o.bonus)) add(9.8, 'bonus', 'Luta-relâmpago na mesa: bolsa 60% maior');
    if (idx > 0) {
      const acima = lista[idx - 1];
      if (acima.pontos > c.pontos) {
        const gap = Math.round(acima.pontos - c.pontos) + 1;
        add(gap <= 30 ? 9 : gap <= 60 ? 8 : 4, 'ranking', 'Faltam ' + gap + ' pts para o #' + idx + ' (' + acima.nome + ')');
      }
    }
    if (c.periodo !== 'eras') {
      const pode = podeDesafiarTitulo(c);
      if (!c.campeao && pode.ok) add(9.5, 'titulo', 'Você já pode desafiar o campeão ' + campeaoAtual(c));
      else if (c.campeao) add(5.5, 'titulo', 'Defenda o cinturão: ' + (c.defesas || 0) + ' defesa(s) até aqui');
      else if (idx >= 0 && idx < 5 && c.sequencia < 2) add(8.5, 'titulo', 'Mais ' + (2 - c.sequencia) + ' vitória(s) seguida(s) e você disputa o cinturão');
    }
    const n = nivelDoXP(c.xp);
    const faltaXP = 40 * n * n - c.xp;
    add(faltaXP <= 40 ? 9.2 : faltaXP <= 120 ? 7.5 : 2, 'nivel', 'Faltam ' + faltaXP + ' XP para o nível ' + (n + 1));
    const f = nivelFama(c);
    if (f.prox !== null) {
      const falta = f.prox - f.pts;
      add(falta <= 60 ? 7 : 2, 'fama', 'Faltam ' + falta + ' de fama para ' + f.proxNome);
    }
    if ((c.pontosHab || 0) > 0) add(8, 'habilidade', (c.pontosHab === 1 ? '1 ponto' : c.pontosHab + ' pontos') + ' de habilidade esperando', 'habilidades');
    if ((c.pontosDisponiveis || 0) > 0) add(7.8, 'pontos', (c.pontosDisponiveis === 1 ? '1 ponto' : c.pontosDisponiveis + ' pontos') + ' de atributo para distribuir', 'distribuir');
    if (tracosPendentes(c) > 0 || assinaturasPendentes(c) > 0) add(8.2, 'traco', 'Você tem uma vaga nova de traço ou golpe', 'tracos');
    const m = metaProgresso(c);
    if (m) add(3 + 4 * m.progresso, 'meta', m.nome + ': ' + m.texto);
    else add(6, 'meta', 'Escolha uma meta de carreira', 'habilidades');
    out.sort((a, b) => b.urg - a.urg);
    return out.slice(0, 5);
  }

  // A proxima luta que mais puxa o jogador (usada no botao "so mais uma").
  function proximaOferta(c) {
    const of = c.ofertas || [];
    if (!of.length) return null;
    const peso = (o) => (o.titulo ? 100 : 0) + (o.bonus ? 60 : 0) + (o.rival || 0) * 10 - (o.rank || 99) * 0.1;
    return of.slice().sort((a, b) => peso(b) - peso(a))[0];
  }

  // ---- Datas, eventos e fight cards ----

  // Numero aproximado do primeiro UFC numerado de cada ano (o evento do jogo cai no ano da carreira).
  const INICIO_NUMERADOS = { 1993: 1, 1994: 2, 1995: 4, 1996: 8, 1997: 11, 1998: 13, 1999: 18, 2000: 23, 2001: 29, 2002: 34, 2003: 40, 2004: 44, 2005: 49, 2006: 56, 2007: 66, 2008: 79, 2009: 92, 2010: 106, 2011: 125, 2012: 141, 2013: 155, 2014: 168, 2015: 182, 2016: 195, 2017: 207, 2018: 218, 2019: 233, 2020: 246, 2021: 257, 2022: 270, 2023: 283, 2024: 296, 2025: 311, 2026: 324, 2027: 337, 2028: 350, 2029: 363, 2030: 376 };

  const LOCAIS = {
    eras: ['Mammoth Gardens, Denver', 'Mark of the Quad Cities, Moline', 'Hammerstein Ballroom, Nova York', 'Trump Taj Mahal, Atlantic City', 'Mandalay Bay Events Center, Las Vegas', 'Ginásio Ibirapuera, São Paulo', 'Nippon Budokan, Tóquio'],
    auge: ['MGM Grand Garden Arena, Las Vegas', 'Madison Square Garden, Nova York', 'Ginásio do Ibirapuera, São Paulo', 'Rod Laver Arena, Melbourne', 'Air Canada Centre, Toronto', 'TD Garden, Boston', 'Staples Center, Los Angeles', 'Barclays Center, Nova York', 'O2 Arena, Londres', 'Maracanãzinho, Rio de Janeiro'],
    atual: ['T-Mobile Arena, Las Vegas', 'Madison Square Garden, Nova York', 'UFC APEX, Las Vegas', 'Rogers Arena, Vancouver', 'O2 Arena, Londres', 'Etihad Arena, Abu Dhabi', 'Farmasi Arena, Rio de Janeiro', 'Scotiabank Arena, Toronto', 'Accor Arena, Paris', 'Qudos Bank Arena, Sydney', 'Climate Pledge Arena, Seattle', 'Kaseya Center, Miami', 'Ginásio do Ibirapuera, São Paulo'],
  };

  // Os eventos acontecem aos sabados: semana 1 do periodo = primeiro sabado do ano-base.
  function dataDaSemana(periodo, semana) {
    const base = Date.UTC(ANO_PERIODO[periodo] || 2026, 0, 1) + (Math.max(1, semana) - 1) * 7 * 86400000;
    const d0 = new Date(base);
    const d = new Date(base + ((6 - d0.getUTCDay() + 7) % 7) * 86400000);
    return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate(), ts: d.getTime() };
  }

  function dataTexto(d, curta) {
    if (!d) return '';
    const dt = new Date(d.ts);
    return dt.toLocaleDateString('pt-BR', curta ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' } : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  function numeroUFC(d) {
    const ini = INICIO_NUMERADOS[d.ano];
    if (!ini) return null;
    const prox = INICIO_NUMERADOS[d.ano + 1] || ini + 12;
    const inicioAno = Date.UTC(d.ano, 0, 1);
    const frac = (d.ts - inicioAno) / (365 * 86400000);
    return clamp(Math.floor(ini + (prox - ini) * frac), ini, prox - 1);
  }

  function sobrenome(nome) {
    return String(nome).split(' ').slice(-1)[0];
  }

  function lutadorPorNome(periodo, divId, nome) {
    return lutadoresDaDivisao(periodo, divId).find((l) => l.nome === nome) || null;
  }

  // Resolve uma luta entre dois lutadores do computador (mesmas regras de qualquer luta) e atualiza pontos e cinturao.
  function lutaDaIA(c, periodo, divId, a, b, titulo, r) {
    const chave = chaveDivisao(periodo, divId);
    const mapa = c.elenco[chave] || (c.elenco[chave] = {});
    const luta = new Luta(
      { nome: a.nome, atributos: atributosIA(a.lutador || a, periodo, c.semana) },
      { nome: b.nome, atributos: atributosIA(b.lutador || b, periodo, c.semana) },
      { rodadas: titulo ? 5 : 3, rng: r }
    );
    const res = luta.simularCompleta();
    const vencedor = res.vencedor === null ? (r() < 0.5 ? 0 : 1) : res.vencedor;
    const v = vencedor === 0 ? a : b;
    const p = vencedor === 0 ? b : a;
    const pontosDe = (x) => (mapa[x.nome] !== undefined ? mapa[x.nome] : x.pontos !== undefined ? x.pontos : rating(x.lutador || x) * 2);
    mapa[v.nome] = clamp(pontosDe(v) + (titulo ? 12 : 10), 20, 400);
    mapa[p.nome] = clamp(pontosDe(p) - 10, 20, 400);
    if (titulo) c.campeoes[chave] = v.nome;
    return { vencedor: v.nome, perdedor: p.nome, metodo: res.metodo, round: res.round, tempo: res.tempo, titulo: !!titulo };
  }

  // Monta as outras lutas do card (de outras categorias e, as vezes, da mesma), sem repetir ninguem.
  function outrasLutasDoCard(c, ocupados, alvo, numerado, r) {
    const periodo = c.periodo;
    const dados = (raiz.DADOS && raiz.DADOS[periodo]) || {};
    const divs = embaralhar(Object.keys(dados), r);
    const lutas = [];
    const usar = (a, b, divId, titulo, ra, rb) => {
      ocupados.add(a.nome);
      ocupados.add(b.nome);
      lutas.push({ a: { nome: a.nome, div: divId }, b: { nome: b.nome, div: divId }, titulo: !!titulo, rounds: titulo ? 5 : 3, rank: [ra, rb] });
    };
    if (periodo !== 'eras' && numerado) {
      let titulos = 0;
      divs.forEach((divId) => {
        if (titulos >= 2 || divId === c.divisaoId || r() < 0.45) return;
        const lista = ranking(c, periodo, divId).filter((x) => !x.jogador);
        const nomeC = campeaoAtual(c, periodo, divId);
        const camp = lista.find((x) => x.nome === nomeC);
        const cont = lista.find((x) => x.nome !== nomeC && !ocupados.has(x.nome));
        if (camp && cont && !ocupados.has(camp.nome)) {
          usar(camp, cont, divId, true, 1, lista.indexOf(cont) + 1);
          titulos++;
        }
      });
    }
    let k = 0;
    let tentativas = 0;
    while (lutas.length < alvo && tentativas++ < 80) {
      const divId = divs[k++ % divs.length];
      const lista = ranking(c, periodo, divId).filter((x) => !x.jogador);
      const livres = lista.filter((x) => !ocupados.has(x.nome));
      if (livres.length < 2) continue;
      const i = Math.floor(r() * Math.min(livres.length - 1, 10));
      const a = livres[i];
      const b = livres[i + 1];
      usar(a, b, divId, false, lista.indexOf(a) + 1, lista.indexOf(b) + 1);
    }
    return lutas;
  }

  // O evento da luta marcada: nome, data, local e o card completo (a luta do jogador entra no lugar que merece).
  function gerarEvento(c, of, semanaLuta, rng) {
    const r = rng || Math.random;
    const periodo = c.periodo;
    const data = dataDaSemana(periodo, semanaLuta);
    const numerado = !!of.titulo || r() < 0.55;
    const numero = numerado ? numeroUFC(data) : null;
    const locais = LOCAIS[periodo] || LOCAIS.atual;
    const local = locais[Math.floor(r() * locais.length)];
    const ocupados = new Set([c.nome, of.op.nome]);
    const total = periodo === 'eras' ? 4 : periodo === 'auge' ? 7 : 8;
    const outras = outrasLutasDoCard(c, ocupados, total - 1, numerado, r);
    const pos = posicaoDoJogador(c) || 10;
    const meu = { a: { nome: c.nome, div: c.divisaoId, jogador: true }, b: { nome: of.op.nome, div: c.divisaoId }, titulo: !!of.titulo, rounds: of.titulo ? 5 : 3, jogador: true, rank: [pos, of.rank || 10] };
    const valor = (l) => (l.jogador ? (l.titulo ? 2000 : 0) + 40 - (pos + (of.rank || 10)) / 2 + 6 : (l.titulo ? 1000 : 0) + 40 - (l.rank[0] + l.rank[1]) / 2);
    const card = outras.concat([meu]).sort((x, y) => valor(y) - valor(x));
    card.forEach((l, i) => {
      l.id = i === 0 ? 'principal' : 'l' + i;
      l.bloco = i === 0 ? 'Luta principal' : i === 1 ? 'Co-principal' : i <= 4 ? 'Card principal' : 'Card preliminar';
      delete l.rank;
    });
    const mainEv = card[0];
    const subtitulo = sobrenome(mainEv.a.nome) + ' vs ' + sobrenome(mainEv.b.nome);
    return {
      numero: numero,
      nome: numero ? 'UFC ' + numero : 'UFC Fight Night',
      subtitulo: subtitulo,
      semana: semanaLuta,
      data: data,
      local: local,
      card: card,
    };
  }

  // Quando a luta do jogador termina, o resto do card acontece e mexe no ranking e nos cinturoes.
  function resolverCard(c, ev, r) {
    if (!ev || ev.resolvido) return ev;
    const periodo = c.periodo;
    ev.card.forEach((l) => {
      if (l.jogador) return;
      const a = lutadorPorNome(periodo, l.a.div, l.a.nome);
      const b = lutadorPorNome(periodo, l.b.div, l.b.nome);
      if (!a || !b) return;
      const linhaA = ranking(c, periodo, l.a.div).find((x) => x.nome === a.nome) || a;
      const linhaB = ranking(c, periodo, l.b.div).find((x) => x.nome === b.nome) || b;
      l.resultado = lutaDaIA(c, periodo, l.a.div, linhaA, linhaB, l.titulo, r);
    });
    ev.resolvido = true;
    const destaque = ev.card.filter((l) => l.resultado && (l.titulo || l.id === 'principal')).slice(0, 3);
    const noticias = destaque.map((l) => ({
      semana: c.semana,
      titulo: !!l.titulo,
      texto: ev.nome + ': ' + l.resultado.vencedor + ' venceu ' + l.resultado.perdedor + (/Nocaute|Finalização/.test(l.resultado.metodo) ? ' por ' + l.resultado.metodo.toLowerCase() : '') + (l.titulo ? ' e ' + (l.resultado.vencedor === l.a.nome ? 'defendeu' : 'conquistou') + ' o cinturão' : '') + '.',
    }));
    c.noticias = noticias.concat(c.noticias || []).slice(0, 12);
    return ev;
  }

  function registrarEvento(c, ev, resumoJogador) {
    if (!c.eventosPassados) c.eventosPassados = [];
    c.eventosPassados.unshift({ nome: ev.nome, subtitulo: ev.subtitulo, data: ev.data, local: ev.local, semana: ev.semana, jogador: resumoJogador, card: ev.card });
    c.eventosPassados = c.eventosPassados.slice(0, 24);
  }

  // Quem esta em atividade no card: usado para o circuito nao escalar o mesmo atleta duas vezes.
  function nomesDoCard(c) {
    const ev = c.agendada && c.agendada.evento;
    const s = new Set();
    if (ev) ev.card.forEach((l) => { s.add(l.a.nome); s.add(l.b.nome); });
    return s;
  }

  // ---- Comparacao de confrontos (por fase da luta, nao so pelo overall) ----

  function comparacao(c, op) {
    const eu = ajustarIdade(c.atributos, idadeAtual(c));
    const ele = atributosDoOponente(c, op);
    const lutasEu = c.recorde.v + c.recorde.d + c.recorde.e;
    const k = op.lutador && op.lutador.cartel ? (op.lutador.cartel.vitorias || 0) + (op.lutador.cartel.derrotas || 0) : 12;
    const areas = [
      { id: 'trocacao', nome: 'Trocação', eu: eu.striking * 0.55 + eu.velocidade * 0.25 + eu.forca * 0.2, ele: ele.striking * 0.55 + ele.velocidade * 0.25 + ele.forca * 0.2 },
      { id: 'wrestling', nome: 'Wrestling e quedas', eu: eu.wrestling * 0.75 + eu.forca * 0.25 - ele.defesa * 0.1, ele: ele.wrestling * 0.75 + ele.forca * 0.25 - eu.defesa * 0.1 },
      { id: 'chao', nome: 'Jiu-jítsu e chão', eu: eu.bjj * 0.6 + eu.grappling * 0.4, ele: ele.bjj * 0.6 + ele.grappling * 0.4 },
      { id: 'defesa', nome: 'Defesa', eu: eu.defesa * 0.7 + eu.queixo * 0.3, ele: ele.defesa * 0.7 + ele.queixo * 0.3 },
      { id: 'resistencia', nome: 'Resistência', eu: eu.resistencia, ele: ele.resistencia },
      { id: 'experiencia', nome: 'Experiência', eu: eu.qi * 0.7 + Math.min(30, lutasEu) * 0.5, ele: ele.qi * 0.7 + Math.min(30, k) * 0.5 },
    ].map((a) => {
      const d = a.eu - a.ele;
      return Object.assign(a, { dif: d, vantagem: Math.abs(d) < 3.5 ? 'igual' : d > 0 ? 'eu' : 'ele' });
    });
    const melhores = areas.filter((a) => a.vantagem === 'eu').sort((x, y) => y.dif - x.dif);
    const piores = areas.filter((a) => a.vantagem === 'ele').sort((x, y) => x.dif - y.dif);
    const nomes = (l) => l.slice(0, 2).map((a) => a.nome.toLowerCase()).join(' e ');
    let resumo = '';
    if (melhores.length && piores.length) resumo = 'Você leva vantagem em ' + nomes(melhores) + '; ele é melhor em ' + nomes(piores) + '.';
    else if (melhores.length) resumo = 'Você leva vantagem em ' + nomes(melhores) + ' e não vê pontos fracos claros.';
    else if (piores.length) resumo = 'Ele é melhor em ' + nomes(piores) + '. Você precisa de um plano para escondê-los.';
    else resumo = 'Confronto parelho em todas as fases: o plano e a resistência decidem.';
    // Sugestao de estrategia
    const por = (id) => areas.find((a) => a.id === id);
    let sugestao = { id: 'equilibrada', motivo: 'Nenhuma fase decide sozinha: leia o rival e alterne.' };
    const w = por('wrestling');
    const t = por('trocacao');
    const g = por('chao');
    const rs = por('resistencia');
    if (w.dif > 8 && ele.defesa < eu.wrestling) sugestao = { id: eu.wrestling > 70 ? 'wrestling' : 'quedas', motivo: 'Seu wrestling passa pela defesa de queda dele.' };
    else if (g.dif > 10 && ele.wrestling < 62) sugestao = { id: 'finalizacao', motivo: 'No chão você é bem melhor e ele não tem como te segurar em pé.' };
    else if (t.dif > 8) sugestao = { id: eu.velocidade > ele.velocidade + 5 ? 'contra' : 'trocacao', motivo: 'Em pé você tem a melhor ferramenta.' };
    else if (rs.dif > 8) sugestao = { id: 'pressao', motivo: 'Você tem mais fôlego: pressione e cobre nos rounds finais.' };
    else if (t.dif < -8 && w.dif > -3) sugestao = { id: 'quedas', motivo: 'Ele é perigoso em pé: leve a luta para onde ele é menos forte.' };
    else if (g.dif < -10) sugestao = { id: 'trocacao', motivo: 'No chão ele é mais perigoso: mantenha a luta em pé.' };
    else if (rs.dif < -8) sugestao = { id: 'resistencia', motivo: 'Ele tem mais fôlego: poupe energia e escolha os momentos.' };
    return { areas: areas, resumo: resumo, sugestao: sugestao };
  }

  // ---- Legado: tudo o que a carreira ja fez ----

  function legado(c) {
    const h = c.historico || [];
    const vit = h.filter((x) => x.resultado === 'Vitória');
    const ko = vit.filter((x) => x.metodo === 'Nocaute');
    const sub = vit.filter((x) => x.metodo === 'Finalização');
    const dec = vit.filter((x) => /^Decisão/.test(x.metodo));
    let seq = 0;
    let maior = 0;
    h.forEach((x) => {
      seq = x.resultado === 'Vitória' ? seq + 1 : 0;
      maior = Math.max(maior, seq);
    });
    const seg = (x) => {
      const m = /^(\d+):(\d+)$/.exec(x.tempo || '');
      return (x.round || 1) * 300 - 300 + (m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 300);
    };
    const rapido = ko.concat(sub).sort((x, y) => seg(x) - seg(y))[0] || null;
    const pontuacao = (x) => (x.titulo ? 6 : 0) + (x.resultado === 'Vitória' ? 2 : 0) + (x.metodo === 'Nocaute' || x.metodo === 'Finalização' ? 2 : 0) + (x.round === 1 && x.resultado === 'Vitória' && x.metodo !== 'Decisão unânime' ? 2 : 0) + (x.premio ? 3 : 0) + (x.rivalidade ? 2 : 0) + (x.rankOp && x.rankOp <= 3 ? 2 : 0);
    const memoraveis = h.slice().map((x) => Object.assign({ pontos: pontuacao(x) }, x)).filter((x) => x.pontos >= 5).sort((x, y) => y.pontos - x.pontos || y.semana - x.semana).slice(0, 6);
    const campeoes = Object.keys(c.titulosPor || {}).map((k) => {
      const [per, div] = k.split('|');
      const d = divisaoDados(per, div);
      return d ? d.nome : div;
    });
    return {
      titulos: c.titulos || 0,
      categoriasCampeao: campeoes,
      defesas: Math.max(c.defesasTotal || 0, c.defesas || 0),
      vitorias: c.recorde.v,
      derrotas: c.recorde.d,
      empates: c.recorde.e,
      nocautes: ko.length,
      finalizacoes: sub.length,
      decisoes: dec.length,
      maiorSequencia: maior,
      sequenciaAtual: c.sequencia || 0,
      maisRapida: rapido,
      memoraveis: memoraveis,
      premios: (c.premios || []).slice(0, 20),
      rivalidades: Object.keys(c.rivais || {}).map((n) => ({ nome: n, heat: c.rivais[n].heat, motivo: c.rivais[n].motivo })),
      lutasTotal: h.length,
      fama: nivelFama(c),
    };
  }

  // ---- Objetivos ----

  function objetivoAtual(c) {
    const lutas = c.recorde.v + c.recorde.d + c.recorde.e;
    const pos = posicaoDoJogador(c);
    const total = ranking(c).length;
    const frac = (n, de) => clamp(n / de, 0, 1);
    if (c.aposentado) return { id: 'fim', titulo: 'Carreira encerrada', descr: 'Sua história está no hall da fama.', progresso: 1 };
    if (lutas === 0) {
      return { id: 'estreia', titulo: 'Faça sua primeira luta', descr: 'Aceite uma oferta, faça o camp de treino e suba no octógono.', progresso: c.agendada ? 0.5 : 0 };
    }
    if (!pos || pos > 10) {
      return { id: 'top10', titulo: 'Entre no top 10', descr: 'Vença adversários do seu ranking para ganhar pontos.', progresso: pos ? frac(total - pos, Math.max(1, total - 10)) : 0 };
    }
    if (pos > 5) {
      return { id: 'top5', titulo: 'Entre no top 5', descr: 'O top 5 abre a porta para o cinturão.', progresso: frac(11 - pos, 6) };
    }
    if (c.periodo === 'eras') {
      if (pos > 1) return { id: 'topo', titulo: 'Chegue ao topo do ranking', descr: 'Na era antiga não há cinturão: o #1 é a glória.', progresso: frac(6 - pos, 5) };
    } else if (!c.campeao && !c.titulos) {
      const progresso = 0.5 + 0.25 * frac(c.sequencia, 2) + (c.agendada && c.agendada.titulo ? 0.25 : 0);
      return { id: 'titulo', titulo: 'Conquiste o cinturão', descr: 'Fique no top 5 com 2 vitórias seguidas para ser desafiante.', progresso: clamp(progresso, 0, 1) };
    } else if (c.campeao && (c.defesas || 0) < 2) {
      return { id: 'defesas', titulo: 'Defenda o título 2 vezes', descr: 'Campeões são medidos pelas defesas.', progresso: frac(c.defesas || 0, 2) };
    }
    const f = nivelFama(c);
    if (f.prox !== null) return { id: 'fama', titulo: 'Vire ' + f.proxNome, descr: 'Vitórias, finalizações, rivalidades e coletivas aumentam a sua fama.', progresso: f.progresso };
    return { id: 'legado', titulo: 'Construa seu legado', descr: 'Chegue aos 36 anos em alta e entre para o hall da fama.', progresso: frac(idadeAtual(c), 36) };
  }

  // ---- Eventos de carreira ----

  // Aplica a escolha do jogador em um evento pendente.
  function resolverEvento(carreira, indice, rng) {
    const r = rng || Math.random;
    const ev0 = carreira.evento;
    if (!ev0) return { ok: false, motivo: 'Nenhum evento pendente.' };
    const def = EVENTOS.find((e) => e.id === ev0.id);
    const opcao = def && def.opcoes[indice];
    if (!opcao) return { ok: false, motivo: 'Opção inválida.' };
    const ef = opcao.efeito;
    if (ef.dinheiro < 0 && carreira.dinheiro < -ef.dinheiro) return { ok: false, motivo: 'Dinheiro insuficiente para essa opção.' };
    const log = [];
    if (ef.dinheiro) {
      carreira.dinheiro = Math.max(0, carreira.dinheiro + ef.dinheiro);
      log.push((ef.dinheiro > 0 ? '+$' : '-$') + Math.abs(ef.dinheiro));
    }
    if (ef.energia) {
      carreira.energia = clamp(carreira.energia + ef.energia, 0, 100);
      log.push((ef.energia > 0 ? '+' : '') + ef.energia + ' de energia');
    }
    if (ef.fama) {
      const g = ganharFama(carreira, ef.fama);
      log.push((g >= 0 ? '+' : '') + g + ' de fama');
    }
    if (ef.heat && carreira.agendada) {
      criarRivalidade(carreira, carreira.agendada.op.nome, 'provocacao', ef.heat);
      log.push('rivalidade com ' + carreira.agendada.op.nome + ' esquentou');
    }
    if (ef.pontos) carreira.pontos += ef.pontos;
    if (ef.xp) carreira.xp += ef.xp;
    if (ef.atributoAleatorio) {
      const livres = ATRIBUTOS.filter((k) => carreira.atributos[k] < carreira.tetos[k]);
      if (livres.length) {
        const k = livres[Math.floor(r() * livres.length)];
        const ganho = Math.min(ef.atributoAleatorio, carreira.tetos[k] - carreira.atributos[k]);
        carreira.atributos[k] += ganho;
        log.push('+' + ganho + ' em ' + ROTULOS[k]);
      }
    }
    let lesaoNova = null;
    if (ef.riscoLesao && r() < ef.riscoLesao) {
      lesaoNova = sortearLesao(r);
      carreira.lesao = lesaoNova;
      carreira.ofertas = [];
      log.push('Lesão: ' + lesaoNova.nome);
    }
    pagarNivel(carreira);
    carreira.eventosVistos.push(ev0.id);
    carreira.evento = null;
    // Evento do camp: resolver a decisao fecha a etapa e deixa a semana passar.
    const et = etapaAtual(carreira);
    if (carreira.camp && et && et.tipo === 'evento') {
      for (let k = 0; k < et.semanas; k++) virarSemana(carreira, r);
      fecharEtapa(carreira, [opcao.rotulo + ': ' + (log.join(' · ') || 'sem efeito')], ev0.titulo, r);
    }
    return { ok: true, log: log.join(' · ') || 'Sem efeito.' };
  }

  // Saves criados antes de um atributo existir (ex.: BJJ) nao o tem, e a media do overall
  // vira NaN. Completa o que falta a partir do perfil do estilo.
  function completarAtributos(attrs, estilo) {
    const base = PERFIS[estilo] || PERFIS.misto;
    ATRIBUTOS.forEach((k) => {
      if (!Number.isFinite(attrs[k])) attrs[k] = base[k];
    });
    return attrs;
  }

  function migrarCarreira(c) {
    completarAtributos(c.atributos, c.estilo);
    if (!c.xpAtributos) c.xpAtributos = {};
    if (!Number.isFinite(c.pontosDisponiveis)) c.pontosDisponiveis = 0;
    if (!Number.isFinite(c.titulos)) c.titulos = 0;
    if (c.aposentado === undefined) c.aposentado = false;
    if (c.tutorialLuta === undefined) c.tutorialLuta = false;
    if (c.modalidade === undefined) c.modalidade = null;
    if (c.pais === undefined) c.pais = null;
    if (c.cidade === undefined) c.cidade = '';
    if (c.foto === undefined) c.foto = null;
    if (!c.estatisticas) c.estatisticas = Object.assign({ lutas: 0 }, ESTAT_VAZIA);
    if (!c.eventosVistos) c.eventosVistos = [];
    // Regras antigas: campos removidos sao descartados.
    ['slots', 'fadiga', 'rival', 'recusasSeguidas', 'entrevistaSemana', 'campPronto'].forEach((k) => { delete c[k]; });
    if (!Number.isFinite(c.potencial)) c.potencial = 85;
    if (!c.tetos) c.tetos = calcularTetos(c.atributos, c.potencial);
    ATRIBUTOS.forEach((k) => {
      if (!Number.isFinite(c.tetos[k]) || c.tetos[k] < c.atributos[k]) c.tetos[k] = clamp(Math.max(c.potencial, c.atributos[k] + 6), 1, 99);
    });
    if (!c.campeoes) c.campeoes = {};
    fixarCampeoes(c);
    if (!Array.isArray(c.ofertas)) c.ofertas = [];
    if (c.agendada === undefined) c.agendada = null;
    if (!Array.isArray(c.noticias)) c.noticias = [];
    if (c.resumo === undefined) c.resumo = null;
    if (!Number.isFinite(c.ultimaLutaSemana)) c.ultimaLutaSemana = c.semana;
    if (!Number.isFinite(c.ultimaTituloSemana)) c.ultimaTituloSemana = -99;
    if (!Number.isFinite(c.circuitoN)) c.circuitoN = Math.floor(c.semana / SEMANAS_CIRCUITO);
    if (!c.dicasVistas) c.dicasVistas = {};
    if (!Array.isArray(c.avisos)) c.avisos = [];
    // Fama, rivalidade, tracos e academia (saves anteriores nao tem).
    if (!Number.isFinite(c.fama)) c.fama = Math.min(120, (c.recorde.v + c.recorde.d + c.recorde.e) * 8 + (c.titulos || 0) * 30);
    if (!Number.isFinite(c.famaMax)) c.famaMax = c.fama;
    if (!c.rivais) c.rivais = {};
    if (!Array.isArray(c.tracos)) c.tracos = [];
    if (!Array.isArray(c.assinaturas)) c.assinaturas = [];
    if (!Number.isFinite(c.assinaturaAtiva)) c.assinaturaAtiva = 0;
    if (!c.academia) c.academia = {};
    if (c.posLutaPendente === undefined) c.posLutaPendente = null;
    // Camp: o antigo (tipo + semanas) some; luta marcada ganha um camp novo com as semanas que faltam.
    if (c.camp && !c.camp.etapas) c.camp = null;
    if (c.camp === undefined) c.camp = null;
    if (c.agendada) {
      if (!c.agendada.plano) c.agendada.plano = gerarPlano(c.agendada.op.lutador.atributos, Math.random);
      if (!Number.isFinite(c.agendada.semanaAceite)) c.agendada.semanaAceite = Math.min(c.semana, c.agendada.semanaLuta);
      if (!c.camp && !c.lutaAtiva) {
        const falta = Math.max(0, c.agendada.semanaLuta - c.semana);
        c.camp = novoCamp(falta);
        c.camp.total = falta;
        if (falta === 0) c.camp.i = c.camp.etapas.length;
      }
    }
    // Ofertas antigas tinham data fixa e validade: passam a contar a partir do aceite.
    c.ofertas.forEach((o) => { if (!Number.isFinite(o.semanasAte)) o.semanasAte = 5; if (!Number.isFinite(o.rival)) o.rival = 0; });
    // Luta salva no meio: os dois lutadores tambem podem estar sem o atributo novo.
    if (c.lutaAtiva) {
      const op = c.lutaAtiva.op;
      if (op && op.lutador && op.lutador.atributos) completarAtributos(op.lutador.atributos, op.estilo);
      const f = c.lutaAtiva.luta && c.lutaAtiva.luta.f;
      if (f && f[0]) completarAtributos(f[0].attr, c.estilo);
      if (f && f[1]) completarAtributos(f[1].attr, op ? op.estilo : 'misto');
    }
    // Habilidades, metas e recompensas (saves anteriores nao tem).
    if (!Array.isArray(c.habilidades)) c.habilidades = [];
    if (!Number.isFinite(c.pontosHab)) c.pontosHab = Math.max(1, nivelDoXP(c.xp) - 1 + (c.titulos || 0) + nivelFamaMax(c));
    if (c.meta === undefined) c.meta = null;
    if (!Array.isArray(c.metasCumpridas)) c.metasCumpridas = [];
    if (!c.titulosPor) {
      c.titulosPor = {};
      if (c.campeao) c.titulosPor[chaveDivisao(c.periodo, c.divisaoId)] = true;
    }
    if (!Number.isFinite(c.finalizacoes)) c.finalizacoes = (c.historico || []).filter((h) => h.resultado === 'Vitória' && (h.metodo === 'Nocaute' || h.metodo === 'Finalização')).length;
    if (!Number.isFinite(c.semDrop)) c.semDrop = 0;
    if (!Array.isArray(c.mentores)) c.mentores = [];
    if (c.lutaBonus === undefined) c.lutaBonus = null;
    if (c.apelido === undefined) c.apelido = null;
    if (!Array.isArray(c.eventosPassados)) c.eventosPassados = [];
    if (!Array.isArray(c.premios)) c.premios = [];
    if (!Number.isFinite(c.defesasTotal)) c.defesasTotal = c.defesas || 0;
    if (c.agendada && !c.agendada.evento) c.agendada.evento = gerarEvento(c, c.agendada, c.agendada.semanaLuta, Math.random);
    c.versao = 2;
    if (!Number.isFinite(c.nivelPago)) c.nivelPago = nivelDoXP(c.xp);
    if (c.celebrarNivel === undefined) c.celebrarNivel = null;
    if (!c.agendada && !c.lutaAtiva && !c.aposentado && !c.lesao && c.ofertas.length === 0) gerarOfertas(c);
    return c;
  }

  function nivelDoXP(xp) {
    return Math.floor(Math.sqrt(xp / 40)) + 1;
  }

  const api = {
    ATRIBUTOS: ATRIBUTOS,
    ROTULOS: ROTULOS,
    PERFIS: PERFIS,
    ESTILOS: ESTILOS,
    MODALIDADES: MODALIDADES,
    ESTRATEGIAS: ESTRATEGIAS,
    TATICAS_CHAO: TATICAS_CHAO,
    ESTRATEGIAS_ROUND: ESTRATEGIAS_ROUND,
    TRACOS: TRACOS,
    ASSINATURAS: ASSINATURAS,
    NIVEIS_FAMA: NIVEIS_FAMA,
    ACADEMIA: ACADEMIA,
    CUSTOS_ACADEMIA: CUSTOS_ACADEMIA,
    SUGESTOES_MODALIDADE: SUGESTOES_MODALIDADE,
    RAMOS: RAMOS,
    HABILIDADES: HABILIDADES,
    HIBRIDOS: HIBRIDOS,
    METAS: METAS,
    MENTORES: MENTORES,
    estadoHab: estadoHab,
    aprender: aprender,
    habFlags: habFlags,
    desbloqueios: desbloqueios,
    estiloHibrido: estiloHibrido,
    ramoContagem: ramoContagem,
    metasDisponiveis: metasDisponiveis,
    escolherMeta: escolherMeta,
    metaProgresso: metaProgresso,
    ganchos: ganchos,
    cinturoesSeVencer: cinturoesSeVencer,
    dataDaSemana: dataDaSemana,
    dataTexto: dataTexto,
    numeroUFC: numeroUFC,
    gerarEvento: gerarEvento,
    comparacao: comparacao,
    legado: legado,
    sobrenome: sobrenome,
    LOCAIS: LOCAIS,
    proximaOferta: proximaOferta,
    nivelFama: nivelFama,
    ganharFama: ganharFama,
    nivelAcademia: nivelAcademia,
    custoAcademia: custoAcademia,
    comprarAcademia: comprarAcademia,
    slotsTracos: slotsTracos,
    slotsAssinatura: slotsAssinatura,
    tracosPendentes: tracosPendentes,
    assinaturasPendentes: assinaturasPendentes,
    escolherTraco: escolherTraco,
    escolherAssinatura: escolherAssinatura,
    definirAssinaturaAtiva: definirAssinaturaAtiva,
    assinaturaEquipada: assinaturaEquipada,
    criarRivalidade: criarRivalidade,
    rivalPrincipal: rivalPrincipal,
    posLuta: posLuta,
    etapaAtual: etapaAtual,
    opcoesEtapa: opcoesEtapa,
    decidirCamp: decidirCamp,
    campConcluido: campConcluido,
    gerarEtapas: gerarEtapas,
    listaRecomendacao: listaRecomendacao,
    ATIVIDADES: ATIVIDADES,
    ORDEM_DIVISOES: ORDEM_DIVISOES,
    DIVISOES_ERAS: DIVISOES_ERAS,
    PONTOS_CRIACAO: PONTOS_CRIACAO,
    EVENTOS: EVENTOS,
    LESOES: LESOES,
    ANO_PERIODO: ANO_PERIODO,
    SEMANAS_CIRCUITO: SEMANAS_CIRCUITO,
    MIN_PREPARO: MIN_PREPARO,
    REPETE_TITULO: REPETE_TITULO,
    CUSTO_LUTA: CUSTO_LUTA,
    CUSTO_TREINO: CUSTO_TREINO,
    ENERGIA_SEMANA: ENERGIA_SEMANA,
    ENERGIA_MIN_TREINO: ENERGIA_MIN_TREINO,
    XP_TREINO: XP_TREINO,
    RECUPERA_DESCANSO: RECUPERA_DESCANSO,
    ENERGIA_MIN_LUTA: ENERGIA_MIN_LUTA,
    criarRng: criarRng,
    rating: rating,
    ratingExato: ratingExato,
    ajustarIdade: ajustarIdade,
    idadeAtual: idadeAtual,
    Luta: Luta,
    novaCarreira: novaCarreira,
    migrarCarreira: migrarCarreira,
    ranking: ranking,
    posicaoDoJogador: posicaoDoJogador,
    campeaoAtual: campeaoAtual,
    podeDesafiarTitulo: podeDesafiarTitulo,
    oponentes: oponentes,
    oponenteTitulo: oponenteTitulo,
    diaDeLuta: diaDeLuta,
    bloqueioAcao: bloqueioAcao,
    virarSemana: virarSemana,
    gerarOfertas: gerarOfertas,
    aceitarOferta: aceitarOferta,
    rodarCircuito: rodarCircuito,
    chanceTreino: chanceTreino,
    recomendarTreino: recomendarTreino,
    riscoLuta: riscoLuta,
    potencialRotulo: potencialRotulo,
    descansar: descansar,
    mudarDivisao: mudarDivisao,
    distribuirPonto: distribuirPonto,
    limiteAtributo: limiteAtributo,
    podeAposentar: podeAposentar,
    aposentar: aposentar,
    entradaHall: entradaHall,
    prepararLuta: prepararLuta,
    iniciarLutaAtiva: iniciarLutaAtiva,
    retomarLutaAtiva: retomarLutaAtiva,
    aplicarLuta: aplicarLuta,
    vidaPct: vidaPct,
    resolverEvento: resolverEvento,
    objetivoAtual: objetivoAtual,
    consumirAvisos: consumirAvisos,
    marcarDica: marcarDica,
    nivelDoXP: nivelDoXP,
    lutadoresDaDivisao: lutadoresDaDivisao,
    divisaoDados: divisaoDados,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    raiz.MMA = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
