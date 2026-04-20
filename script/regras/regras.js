// Script/regras/regras.js

import { calcularMovimentosValidos, verificarXeque } from './regrasmovimento.js';
import { historico } from './regrasfuncionalidade.js'; 

/**
 * Matriz virtual que atua como a única fonte de verdade (Single Source of Truth) para o estado das peças.
 * É exportada como constante para garantir que a referência de memória seja partilhada globalmente por todos os módulos.
 * @constant {Object}
 */
export const tabuleiroVirtual = {}; 

/**
 * Sincroniza a memória virtual com o estado atual da Árvore DOM.
 * Limpa o objeto atual e reconstrói o mapeamento com base nas peças renderizadas na interface.
 */
export function atualizarTabuleiroVirtual() {
    for (const key in tabuleiroVirtual) {
        delete tabuleiroVirtual[key];
    }
    
    document.querySelectorAll('.square').forEach(casa => {
        const peca = casa.querySelector('.piece');
        if (peca) tabuleiroVirtual[casa.id] = peca.alt;
    });
}

/**
 * Gera uma string serializada (semelhante à notação FEN) que representa o estado exato do tabuleiro, 
 * incluindo o turno e os direitos de roque. Utilizada para deteção de empate por tripla repetição.
 * @param {string} turno - O jogador a mover ('w' ou 'b').
 * @returns {string} Snapshot do estado atual do jogo.
 */
export function getFotografiaTabuleiro(turno) {
    const r = historico.roque;
    let foto = `${turno}|${r.wK ? 1:0}${r.wQ ? 1:0}${r.bK ? 1:0}${r.bQ ? 1:0}|`;
    
    const colunas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for(let linha = 8; linha >= 1; linha--) {
        for(let c of colunas) {
            let casa = c + linha;
            foto += tabuleiroVirtual[casa] ? tabuleiroVirtual[casa] : "-";
        }
    }
    return foto;
}

/**
 * Filtra os movimentos pseudo-legais, retornando apenas os movimentos estritamente legais.
 * Um movimento é considerado legal se, após a sua simulação, o Rei do jogador não ficar em Xeque.
 * @param {string} casaOrigemId - Identificador algébrico da casa de origem (ex: 'e2').
 * @param {string} pecaCodigo - Código identificador da peça (ex: 'wP').
 * @param {Object} [estadoAtual=tabuleiroVirtual] - O estado do tabuleiro a avaliar (permite injeção de dependência para simulações).
 * @returns {Array<string>} Lista de casas de destino legais.
 */
export function calcularMovimentosLegais(casaOrigemId, pecaCodigo, estadoAtual = tabuleiroVirtual) {
    const movimentosPossiveis = calcularMovimentosValidos(casaOrigemId, pecaCodigo, estadoAtual, false);
    const movimentosLegais = []; 
    const corPeca = pecaCodigo.charAt(0);

    for (let idDestino of movimentosPossiveis) {
        // Cria um clone raso (shallow copy) para simulação de movimento
        const estadoSimulado = { ...estadoAtual }; 

        // Simulação especial para captura En Passant (remove o peão inimigo capturado ortogonalmente)
        if (pecaCodigo.charAt(1) === 'P' && idDestino.charAt(0) !== casaOrigemId.charAt(0) && !estadoSimulado[idDestino]) {
            const linhaInimigo = casaOrigemId.charAt(1);
            const colunaInimigo = idDestino.charAt(0);
            delete estadoSimulado[`${colunaInimigo}${linhaInimigo}`];
        }

        // Aplica a mutação simulada
        estadoSimulado[idDestino] = pecaCodigo;
        delete estadoSimulado[casaOrigemId];

        // Valida a integridade do Rei na posição resultante
        if (!verificarXeque(corPeca, estadoSimulado)) {
            movimentosLegais.push(idDestino);
        }
    }
    return movimentosLegais;
}

/**
 * Valida o estado global do tabuleiro para detetar condições de término de partida (Regras FIDE).
 * @param {string} corJogador - A cor do jogador que detém o turno atual ('w' ou 'b').
 * @returns {Object} Objeto indicando se o jogo terminou (`acabou`) e a respetiva `razao`.
 */
export function verificarFimDeJogo(corJogador) {
    
    // 1. Verificação de Xeque-Mate ou Afogamento (Stalemate)
    let temMovimentoLegais = false;
    for (let id in tabuleiroVirtual) {
        if (tabuleiroVirtual[id].charAt(0) === corJogador) {
            if (calcularMovimentosLegais(id, tabuleiroVirtual[id]).length > 0) {
                temMovimentoLegais = true;
                break;
            }
        }
    }
    
    if (!temMovimentoLegais) {
        if (verificarXeque(corJogador, tabuleiroVirtual)) return { acabou: true, razao: 'mate' };
        else return { acabou: true, razao: 'afogamento' };
    }

    // 2. Regra dos 50 Movimentos (100 meios-lances sem captura ou movimento de peão)
    if (historico.meiosLancesSemCapturaOuPeao >= 100) {
        return { acabou: true, razao: '50-movimentos' };
    }

    // 3. Regra da Tripla Repetição de Posição
    const fotoAtual = getFotografiaTabuleiro(corJogador);
    const repeticoes = historico.posicoesPassadas.filter(foto => foto === fotoAtual).length;
    
    if (repeticoes >= 3) {
        return { acabou: true, razao: 'repeticao' };
    }

    // 4. Material Insuficiente para Xeque-Mate
    let pecasNoTabuleiro = Object.values(tabuleiroVirtual);
    if (pecasNoTabuleiro.length <= 3) {
        let peçasPesadas = pecasNoTabuleiro.filter(p => !p.includes('K') && !p.includes('N') && !p.includes('B'));
        if (peçasPesadas.length === 0) {
            return { acabou: true, razao: 'material' };
        }
    }

    return { acabou: false }; 
}
