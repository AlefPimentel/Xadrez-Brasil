// Script/revisao/simulador.js

import { calcularMovimentosLegais } from '../regras/regras.js';

/**
 * Motor de Simulação PGN. Processa um array de lances em notação algébrica (SAN),
 * converte-os para notação universal (UCI) e gera snapshots do estado do tabuleiro em cada iteração.
 * @param {Array<string>} lancesSAN - Array contendo a sequência de lances (ex: ['e4', 'e5', 'Nf3']).
 * @returns {Object} Payload contendo o histórico em UCI e o array de fotografias de estado.
 */
export function simularPartidaPGN(lancesSAN) {
    // 1. Instanciação do mapa de estado virtual (Base do Tabuleiro)
    let estado = {
        a8:'bR', b8:'bN', c8:'bB', d8:'bQ', e8:'bK', f8:'bB', g8:'bN', h8:'bR',
        a7:'bP', b7:'bP', c7:'bP', d7:'bP', e7:'bP', f7:'bP', g7:'bP', h7:'bP',
        a2:'wP', b2:'wP', c2:'wP', d2:'wP', e2:'wP', f2:'wP', g2:'wP', h2:'wP',
        a1:'wR', b1:'wN', c1:'wB', d1:'wQ', e1:'wK', f1:'wB', g1:'wN', h1:'wR'
    };

    let turnoAtual = 'w';
    let roque = { wK: true, wQ: true, bK: true, bQ: true };
    
    let lancesUCI = [];
    let posicoes = [gerarFoto(estado, turnoAtual, roque)]; 

    for (let san of lancesSAN) {
        // Sanitização de tokens redundantes (Xeques, Mates, Capturas)
        let limpo = san.replace(/[+#x]/g, '');
        let promocao = '';
        
        // Extração de sufixo de promoção
        if (limpo.includes('=')) {
            promocao = limpo.split('=')[1].toLowerCase();
            limpo = limpo.split('=')[0];
        }

        let destino = '';
        let pecaBusca = 'P';
        let desambiguacao = '';

        // Resolução de Castling (Roque)
        if (limpo === 'O-O' || limpo === 'O-O-O') {
            let linha = turnoAtual === 'w' ? '1' : '8';
            let origemK = `e${linha}`;
            destino = limpo === 'O-O' ? `g${linha}` : `c${linha}`;
            
            lancesUCI.push(`${origemK}${destino}`);
            executarMovimentoSimulado(estado, origemK, destino, roque, turnoAtual);
            
            turnoAtual = turnoAtual === 'w' ? 'b' : 'w';
            posicoes.push(gerarFoto(estado, turnoAtual, roque));
            continue;
        }

        // Parsing Algébrico (Identificação de Peça e Desambiguação de Origem)
        if (/[A-Z]/.test(limpo[0])) {
            pecaBusca = limpo[0];
            destino = limpo.slice(-2);
            if (limpo.length > 3) desambiguacao = limpo.slice(1, -2); 
        } else {
            destino = limpo.slice(-2);
            if (limpo.length === 3) desambiguacao = limpo[0]; 
        }

        const codigoBusca = turnoAtual + pecaBusca;
        let origemEncontrada = null;

        // Varredura da matriz de estado para localização do nó de origem válido
        for (let casa in estado) {
            if (estado[casa] === codigoBusca) {
                // Aplica filtro de desambiguação geométrica (ficheiro ou rank)
                if (desambiguacao && !casa.includes(desambiguacao)) continue;

                // Valida a legalidade cinemática através da pipeline central de regras
                const legais = calcularMovimentosLegais(casa, codigoBusca, estado);
                if (legais.includes(destino)) {
                    origemEncontrada = casa;
                    break;
                }
            }
        }

        // Tratamento de falha sistémica (Error Boundary interno)
        if (!origemEncontrada) {
            console.error(`Erro estrutural na simulação: O nó de origem para o token ${san} não pôde ser resolvido.`);
            break; 
        }

        // Registo da transação UCI e invocação do mutador de estado
        let lanceUCIFinal = `${origemEncontrada}${destino}${promocao}`;
        lancesUCI.push(lanceUCIFinal);
        
        executarMovimentoSimulado(estado, origemEncontrada, destino, roque, turnoAtual, promocao);
        
        // Transição de estado e serialização do frame
        turnoAtual = turnoAtual === 'w' ? 'b' : 'w';
        posicoes.push(gerarFoto(estado, turnoAtual, roque));
    }

    return { uci: lancesUCI, fotografias: posicoes };
}

/**
 * Mutador de Estado (State Mutator). Atualiza a matriz virtual após a resolução cinemática de um lance.
 * Gere ramificações lógicas secundárias, como movimentação da torre no roque e atualização de privilégios.
 * @param {Object} estado - Referência ao mapa virtual do tabuleiro.
 * @param {string} origem - Coordenada de partida.
 * @param {string} destino - Coordenada de chegada.
 * @param {Object} roque - Objeto de rastreamento de privilégios de castling.
 * @param {string} turno - Cor da fação executante.
 * @param {string} [promocao] - Código da peça promovida, se aplicável.
 */
function executarMovimentoSimulado(estado, origem, destino, roque, turno, promocao) {
    let peca = estado[origem];
    
    // Resolução de interdependências geométricas no Roque (Acoplamento da Torre)
    if (peca.charAt(1) === 'K' && Math.abs(origem.charCodeAt(0) - destino.charCodeAt(0)) === 2) {
        let linha = origem.charAt(1);
        if (destino.charAt(0) === 'g') {
            estado[`f${linha}`] = estado[`h${linha}`];
            delete estado[`h${linha}`];
        } else {
            estado[`d${linha}`] = estado[`a${linha}`];
            delete estado[`a${linha}`];
        }
    }

    // Sobrescrita de identificador em caso de promoção
    if (promocao) peca = turno + promocao.toUpperCase();

    // Revogação de privilégios de estado (Castling Rights)
    if (peca === 'wK') { roque.wK = false; roque.wQ = false; }
    if (peca === 'bK') { roque.bK = false; roque.bQ = false; }
    if (origem === 'h1' || destino === 'h1') roque.wK = false;
    if (origem === 'a1' || destino === 'a1') roque.wQ = false;
    if (origem === 'h8' || destino === 'h8') roque.bK = false;
    if (origem === 'a8' || destino === 'a8') roque.bQ = false;

    // Mutação final no mapa de endereços
    estado[destino] = peca;
    delete estado[origem];
}

/**
 * Serializador de Estado. Comprime a matriz de objetos e propriedades numa string formatada
 * baseada num pseudo-FEN para armazenamento e renderização retroativa eficientes.
 * @returns {string} String codificada do estado do tabuleiro.
 */
function gerarFoto(estado, turno, roque) {
    let foto = `${turno}|${roque.wK?1:0}${roque.wQ?1:0}${roque.bK?1:0}${roque.bQ?1:0}|`;
    const colunas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let linha = 8; linha >= 1; linha--) {
        for (let c of colunas) {
            let casa = c + linha;
            foto += estado[casa] ? estado[casa] : "-";
        }
    }
    return foto;
}
