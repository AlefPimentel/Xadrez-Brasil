// Script/bot/bot.js

import { historico } from '../regras/regrasfuncionalidade.js';
import { tabuleiroVirtual, calcularMovimentosLegais } from '../regras/regras.js';

/**
 * Instância do Web Worker responsável pela execução assíncrona do motor Stockfish.
 */
const stockfish = new Worker(new URL('../analisador/stockfish.js', import.meta.url).href);

stockfish.postMessage('uci'); 

let nivelAtual = parseInt(localStorage.getItem("nivelBotXadrez")) || 1; 
let callbackJogada = null; 
let contadorJogadasBot = 0; 

/**
 * Configura o nível de dificuldade do motor de xadrez.
 * Níveis inferiores a 6 utilizam o nível base do motor (Skill 0), 
 * com a variância de imprecisão injetada via lógica pseudo-aleatória externa.
 * @param {number|string} nivel - O identificador numérico da dificuldade desejada.
 */
export function definirNivelBot(nivel) {
    nivelAtual = parseInt(nivel); 
    let uciSkill = nivelAtual <= 5 ? 0 : nivelAtual; 
    stockfish.postMessage(`setoption name Skill Level value ${uciSkill}`);
    contadorJogadasBot = 0; 
}

/**
 * Escuta de eventos do motor Stockfish.
 * Processa a resposta contendo a melhor jogada prevista ('bestmove') e aciona o callback associado.
 */
stockfish.onmessage = function(evento) {
    const mensagem = evento.data;
    
    if (mensagem.includes("bestmove")) {
        const partes = mensagem.split(" ");
        const melhorJogadaUci = partes[1]; 
        
        if (melhorJogadaUci && melhorJogadaUci !== "(none)" && callbackJogada) {
            const origem = melhorJogadaUci.substring(0, 2);
            const destino = melhorJogadaUci.substring(2, 4);
            const promocao = melhorJogadaUci.length > 4 ? melhorJogadaUci.charAt(4) : null;
            
            callbackJogada({ origem, destino, promocao });
        }
    }
};

/**
 * Solicita ao motor a computação da próxima jogada baseada no estado atual.
 * Incorpora uma lógica de injeção de erros propositais (blunders) para simular adversários de baixo rating.
 * @param {Function} callback - Função de retorno a ser executada com o movimento calculado.
 */
export function calcularJogadaBot(callback) {
    callbackJogada = callback;
    contadorJogadasBot++; 
    
    let jogarAleatorio = false;

    // Determinação determinística de erros baseada na frequência de lances
    if (nivelAtual === 1) { 
        if (contadorJogadasBot % 6 !== 1) jogarAleatorio = true; 
    } else if (nivelAtual === 3) { 
        if (contadorJogadasBot % 2 === 0) jogarAleatorio = true;
    } else if (nivelAtual === 5) { 
        if (contadorJogadasBot % 3 === 0) jogarAleatorio = true;
    }

    if (jogarAleatorio) {
        fazerJogadaTotalmenteAleatoria();
        return; 
    }

    // Definição do parâmetro de skill nativo do motor
    let uciSkill = nivelAtual <= 5 ? 0 : nivelAtual; 
    stockfish.postMessage(`setoption name Skill Level value ${uciSkill}`);
    
    const historicoUci = historico.uci.join(" ");
    stockfish.postMessage(`position startpos moves ${historicoUci}`);
    
    let depth = 1; 
    
    // Parametrização da profundidade de análise da árvore de possibilidades (ply depth)
    if (nivelAtual <= 5) depth = 1;        
    else if (nivelAtual === 7) depth = 1;  
    else if (nivelAtual === 9) depth = 2;  
    else if (nivelAtual === 11) depth = 3; 
    else if (nivelAtual === 13) depth = 4; 
    else if (nivelAtual === 15) depth = 5; 
    else if (nivelAtual === 17) depth = 7; 
    else if (nivelAtual >= 19) depth = 10; 
    
    stockfish.postMessage(`go depth ${depth}`);
}

/**
 * Algoritmo de fallback para simulação de baixa proficiência.
 * Mapeia todos os movimentos legais do estado atual e seleciona um pseudo-aleatoriamente.
 */
function fazerJogadaTotalmenteAleatoria() {

    const corBot = historico.uci.length % 2 === 0 ? 'w' : 'b'; 
    let jogadasPossiveis = [];

    // Identifica as peças ativas sob o controlo computacional
    for (let idOrigem in tabuleiroVirtual) {
        const peca = tabuleiroVirtual[idOrigem];
        if (peca.charAt(0) === corBot) {
            
            const destinos = calcularMovimentosLegais(idOrigem, peca, tabuleiroVirtual);
            
            destinos.forEach(idDestino => {
                let promocao = null;
                // Força a promoção estática para Dama (Queen) na extremidade do tabuleiro
                if (peca.charAt(1) === 'P' && (idDestino.charAt(1) === '1' || idDestino.charAt(1) === '8')) {
                    promocao = 'q'; 
                }
                jogadasPossiveis.push({ origem: idOrigem, destino: idDestino, promocao });
            });
        }
    }

    // Seleção de um nó arbitrário na pool de jogadas legais
    if (jogadasPossiveis.length > 0) {
        const jogadaEscolhida = jogadasPossiveis[Math.floor(Math.random() * jogadasPossiveis.length)];
        
        // Aplicação de atraso artificial para mimetizar o tempo de processamento humano
        setTimeout(() => {
            if(callbackJogada) callbackJogada(jogadaEscolhida);
        }, 400);
    }
}
