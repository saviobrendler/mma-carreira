// Lutadores que entram nas listas da Era de Ouro (auge) e da Era Atual.
// Formato: [nome, estilo, lenda?, titulo na Wikipedia (se diferente do nome)]
// Uso: node tools/novos-lutadores.js   (acrescenta em ../../dados/<periodo>/<divisao>.json, sem duplicar)
const fs = require('fs');
const path = require('path');

const S = 'striking';
const L = 'luta_livre';
const G = 'grappling';
const M = 'misto';

const NOVOS = {
  auge: {
    peso_mosca: [
      ['Kyoji Horiguchi', S], ['Jussier Formiga', G], ['Ray Borg', G], ['Tim Elliott', G], ['Wilson Reis', G],
      ['Ali Bagautinov', L], ['Sergio Pettis', S], ['Louis Smolka', G],
    ],
    peso_galo: [
      ['Raphael Assunção', G], ['Michael McDonald', S], ['Bryan Caraway', G], ['Eddie Wineland', S], ['Rob Font', S],
      ['Pedro Munhoz', M], ['Jimmie Rivera', S], ['Thomas Almeida', S], ['John Lineker', S],
    ],
    peso_pena: [
      ['Max Holloway', S, true], ['Ricardo Lamas', L], ['Cub Swanson', S], ['Chan Sung Jung', M], ['Dustin Poirier', M, true],
      ['Charles Oliveira', G], ['Jeremy Stephens', S], ['Dennis Bermudez', L], ['Darren Elkins', L], ['Zabit Magomedsharipov', S],
      ['Brian Ortega', G],
    ],
    peso_leve: [
      ['Benson Henderson', M, true], ['Gilbert Melendez', M], ['Nate Diaz', G, true], ['Gray Maynard', L], ['Tony Ferguson', G],
      ['Edson Barboza', S], ['Jim Miller', G], ['Clay Guida', L], ['Dustin Poirier', M, true], ['Kevin Lee', L],
      ['Joe Lauzon', G], ['Al Iaquinta', S], ['Gleison Tibau', G],
    ],
    peso_meio_medio: [
      ['Josh Koscheck', L], ['Jon Fitch', L], ['Thiago Alves', S], ['Martin Kampmann', S], ['Dan Hardy', S],
      ['Stephen Thompson', S], ['Demian Maia', G], ['Jake Shields', G], ['Colby Covington', L], ['Neil Magny', M],
      ['Gunnar Nelson', G], ['Jorge Masvidal', S],
    ],
    peso_medio: [
      ['Luke Rockhold', M, true], ['Rich Franklin', M, true], ['Ronaldo Souza', G], ['Gegard Mousasi', M], ['Kelvin Gastelum', M],
      ['Derek Brunson', L], ['Jared Cannonier', S], ['Uriah Hall', S], ['Brad Tavares', S], ['Yushin Okami', L],
      ['Nate Marquardt', M],
    ],
    peso_meio_pesado: [
      ['Glover Teixeira', G, true], ['Alexander Gustafsson', S], ['Anthony Johnson', S, true], ['Phil Davis', L], ['Dominick Reyes', S],
      ['Thiago Santos', S], ['Corey Anderson', L], ['Ovince Saint Preux', M], ['Antônio Rogério Nogueira', S],
    ],
    peso_pesado: [
      ['Stipe Miocic', M, true], ['Rodrigo Minotauro', G, true, 'Antônio Rodrigo Nogueira'], ['Antônio Silva', S], ['Travis Browne', S], ['Gabriel Gonzaga', G],
      ['Matt Mitrione', S], ['Stefan Struve', G], ['Francis Ngannou', S], ['Derrick Lewis', S], ['Alexander Volkov', S],
      ['Curtis Blaydes', L],
    ],
  },
  atual: {
    peso_mosca: [
      ['Tatsuro Taira', G], ['Amir Albazi', G], ['Kai Kara-France', S], ['Manel Kape', S], ['Muhammad Mokaev', G],
      ['Steve Erceg', M], ['Alex Perez', G], ['Asu Almabayev', L], ['Joshua Van', S],
    ],
    peso_galo: [
      ['Henry Cejudo', L, true], ['Rob Font', S], ['Song Yadong', S], ['Mario Bautista', G], ['Cody Garbrandt', S],
      ['Raoni Barcelos', G], ['Payton Talbott', S], ['Said Nurmagomedov', L],
    ],
    peso_pena: [
      ['Diego Lopes', M], ['Jean Silva', S], ['Josh Emmett', S], ['Arnold Allen', S], ['Calvin Kattar', S],
      ['Lerone Murphy', M], ['Dan Ige', S],
    ],
    peso_leve: [
      ['Dustin Poirier', M, true], ['Michael Chandler', L], ['Dan Hooker', S], ['Bobby Green', S], ['Jalin Turner', S],
      ['Grant Dawson', G], ['Ignacio Bahamondes', S], ['Mauricio Ruffy', S], ['Chase Hooper', G], ['Tony Ferguson', G],
    ],
    peso_meio_medio: [
      ['Ian Machado Garry', S], ['Sean Brady', G], ['Michael Morales', S], ['Gilbert Burns', G], ['Colby Covington', L],
      ['Stephen Thompson', S], ['Joaquin Buckley', S], ['Carlos Prates', S], ['Geoff Neal', S], ['Michael Page', S],
      ['Neil Magny', M], ['Vicente Luque', M], ['Kevin Holland', S],
    ],
    peso_medio: [
      ['Robert Whittaker', S, true], ['Jared Cannonier', S], ['Marvin Vettori', G], ['Caio Borralho', M], ['Jack Hermansson', G],
      ['Brendan Allen', G], ['Reinier de Ridder', G], ['Anthony Hernandez', G], ['Roman Dolidze', G], ['Kelvin Gastelum', M],
      ['Bo Nickal', L], ['Joe Pyfer', S], ['Michel Pereira', S],
    ],
    peso_meio_pesado: [
      ['Aleksandar Rakić', S], ['Nikita Krylov', G], ['Anthony Smith', M], ['Volkan Oezdemir', S], ['Johnny Walker', S],
      ['Azamat Murzakanov', S], ['Dominick Reyes', S], ['Bogdan Guskov', S], ['Ryan Spann', G],
    ],
    peso_pesado: [
      ['Jon Jones', L, true], ['Stipe Miocic', M, true], ['Marcin Tybura', G], ['Waldo Cortes-Acosta', S], ['Jairzinho Rozenstruik', S],
      ['Alexandr Romanov', L], ['Mick Parkin', S], ['Marcos Rogério de Lima', M],
    ],
  },
  eras: {
    peso_pesado: [['Rodrigo Minotauro', G, true, 'Antônio Rodrigo Nogueira']],
  },
};

// Correcao de categoria: Masvidal nunca lutou no medio.
const REMOVER = { auge: { peso_medio: ['Jorge Masvidal'] } };

const RAIZ = path.join(__dirname, '..', '..', 'dados');
const titulos = {};
let novos = 0;
let jaTinha = 0;

for (const [periodo, divs] of Object.entries(REMOVER)) {
  for (const [div, nomes] of Object.entries(divs)) {
    const arq = path.join(RAIZ, periodo, div + '.json');
    const d = JSON.parse(fs.readFileSync(arq, 'utf8'));
    d.lutadores = d.lutadores.filter((l) => !nomes.includes(l.nome));
    fs.writeFileSync(arq, JSON.stringify(d, null, 2) + '\n');
  }
}

for (const [periodo, divs] of Object.entries(NOVOS)) {
  for (const [div, lista] of Object.entries(divs)) {
    const arq = path.join(RAIZ, periodo, div + '.json');
    const d = JSON.parse(fs.readFileSync(arq, 'utf8'));
    for (const [nome, estilo, lenda, wiki] of lista) {
      if (wiki) titulos[nome] = wiki;
      if (d.lutadores.some((l) => l.nome === nome)) { jaTinha++; continue; }
      d.lutadores.push({ nome: nome, lenda: !!lenda, estilo: estilo, calibragem: null });
      novos++;
    }
    fs.writeFileSync(arq, JSON.stringify(d, null, 2) + '\n');
  }
}

fs.writeFileSync(path.join(__dirname, 'wiki-titulos.json'), JSON.stringify(titulos, null, 2) + '\n');
console.log('novos:', novos, '· ja existiam:', jaTinha);
