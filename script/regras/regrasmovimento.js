// Script/regras/regrasmovimento.js

import { historico } from './regrasfuncionalidade.js';

/**
 * Mapeamento do eixo horizontal (Ficheiros/Files) do tabuleiro.
 * @constant {Array<string>}
 */
const colunas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/**
 * Motor principal de geração de movimentos pseudo-legais.
 * Encaminha o cálculo para os sub-algoritmos específicos baseados na assinatura (tipo) da peça.
 * @param {string} casaOrigemId - Coordenada algébrica da casa atual (ex: 'e2').
 * @param {string} pecaCodigo - Código identificador da peça (ex: 'wP').
 * @param {Object} estado - O snapshot (estado) do tabuleiro a ser avaliado.
 * @param {boolean} [ignorandoRoque=false] - Flag de segurança para prevenir recursão infinita durante a validação de ameaças.
 * @returns {Array<string>} Array contendo as casas de destino possíveis para a peça.
 */
export function calcularMovimentosValidos(casaOrigemId, pecaCodigo, estado, ignorandoRoque = false) {
    const colunaOrigem = casaOrigemId.charAt(0); 
    const linhaOrigem = parseInt(casaOrigemId.charAt(1));
    const corPeca = pecaCodigo.charAt(0); 
    const tipoPeca = pecaCodigo.charAt(1); 
    const indexColuna = colunas.indexOf(colunaOrigem);

    // Roteamento algorítmico baseado na cinemática da peça
    switch (tipoPeca) {
        case 'P': return calcularPeao(indexColuna, linhaOrigem, corPeca, colunaOrigem, estado);
        case 'R': return calcularDeslizantes(indexColuna, linhaOrigem, corPeca, [{c:0, l:1}, {c:0, l:-1}, {c:1, l:0}, {c:-1, l:0}], estado);
        case 'B': return calcularDeslizantes(indexColuna, linhaOrigem, corPeca, [{c:1, l:1}, {c:1, l:-1}, {c:-1, l:1}, {c:-1, l:-1}], estado);
        case 'Q': return calcularDeslizantes(indexColuna, linhaOrigem, corPeca, [{c:0, l:1}, {c:0, l:-1}, {c:1, l:0}, {c:-1, l:0}, {c:1, l:1}, {c:1, l:-1}, {c:-1, l:1}, {c:-1, l:-1}], estado);
        case 'N': return calcularSaltos(indexColuna, linhaOrigem, corPeca, [{c: 1, l: 2}, {c: 2, l: 1}, {c: 2, l: -1}, {c: 1, l: -2}, {c: -1, l: -2}, {c: -2, l: -1}, {c: -2, l: 1}, {c: -1, l: 2}], estado);
        case 'K': return calcularRei(indexColuna, linhaOrigem, corPeca, estado, ignorandoRoque);
        default: return [];
    }
}

/**
 * Avalia se o Rei de uma determinada cor encontra-se sob ameaça direta (Xeque).
 * @param {string} corRei - A cor do Rei a ser avaliado ('w' ou 'b').
 * @param {Object} estado - O estado do tabuleiro a ser analisado.
 * @returns {boolean} Retorna true se a casa do Rei estiver no raio de ataque inimigo.
 */
export function verificarXeque(corRei, estado) {
    let idRei = null;
    
    // Varredura linear para localizar as coordenadas atuais do Rei
    for (let id in estado) {
        if (estado[id] === corRei + 'K') { idRei = id; break; }
    }
    
    if (!idRei) return false; // Fallback estrutural
    
    return isCasaAtacada(idRei, corRei, estado);
}

/**
 * Valida se uma casa específica está na linha de visão/ataque de qualquer peça inimiga.
 * @param {string} idCasa - Coordenada algébrica do alvo.
 * @param {string} corDefensor - Cor da facção a defender a casa.
 * @param {Object} estado - O estado do tabuleiro a ser analisado.
 * @returns {boolean} Retorna true se houver uma intersecção de ataque inimigo.
 */
function isCasaAtacada(idCasa, corDefensor, estado) {
    for (let id in estado) {
        const peca = estado[id];
        if (peca.charAt(0) !== corDefensor) {
            // Invoca a geração de movimentos da peça inimiga (ignorando Roque para evitar recursão cíclica)
            const movimentosInimiga = calcularMovimentosValidos(id, peca, estado, true);
            if (movimentosInimiga.includes(idCasa)) return true;
        }
    }
    return false;
}

/**
 * Computa a cinemática do Peão, incluindo avanços duplos, capturas diagonais e a regra de En Passant.
 * @returns {Array<string>} Destinos válidos para o Peão.
 */
function calcularPeao(indexColuna, linhaOrigem, corPeca, colunaOrigem, estado) {
    const movs = [];
    const direcao = corPeca === 'w' ? 1 : -1; 
    const linhaFrente = linhaOrigem + direcao;
    
    // 1. Verificação de avanço ortogonal
    if (linhaFrente >= 1 && linhaFrente <= 8) {
        const idFrente = `${colunaOrigem}${linhaFrente}`;
        if (!estado[idFrente]) {
            movs.push(idFrente); 
            const linhaInicial = corPeca === 'w' ? 2 : 7;
            
            // 2. Verificação de avanço duplo (apenas a partir da rank inicial)
            if (linhaOrigem === linhaInicial) {
                const linhaFrenteDupla = linhaOrigem + (direcao * 2);
                const idFrenteDupla = `${colunaOrigem}${linhaFrenteDupla}`;
                if (!estado[idFrenteDupla]) movs.push(idFrenteDupla);
            }
        }
    }
    
    // 3. Verificação de capturas diagonais e En Passant
    const colunasCaptura = [indexColuna - 1, indexColuna + 1];
    for (let c of colunasCaptura) {
        if (c >= 0 && c <= 7) {
            const colunaDestino = colunas[c];
            const idDiagonal = `${colunaDestino}${linhaOrigem + direcao}`;
            
            const pecaDestino = estado[idDiagonal];
            if (pecaDestino && pecaDestino.charAt(0) !== corPeca) {
                movs.push(idDiagonal); // Captura padrão
            }
            else if (!pecaDestino && historico.ultimoMovimento) {
                // Avaliação lógica da janela de oportunidade do En Passant
                const ultimo = historico.ultimoMovimento;
                if (ultimo.peca.charAt(1) === 'P' && ultimo.peca.charAt(0) !== corPeca) {
                    if (Math.abs(parseInt(ultimo.origem.charAt(1)) - parseInt(ultimo.destino.charAt(1))) === 2) {
                        if (ultimo.destino === `${colunaDestino}${linhaOrigem}`) {
                            movs.push(idDiagonal); 
                        }
                    }
                }
            }
        }
    }
    return movs;
}

/**
 * Computa a cinemática do Rei, incorporando os limites adjacentes e os privilégios de Roque (Castling).
 * @returns {Array<string>} Destinos válidos para o Rei.
 */
function calcularRei(indexColuna, linhaOrigem, corPeca, estado, ignorandoRoque) {
    const passos = [{c:0, l:1}, {c:0, l:-1}, {c:1, l:0}, {c:-1, l:0}, {c:1, l:1}, {c:1, l:-1}, {c:-1, l:1}, {c:-1, l:-1}];
    const movs = calcularSaltos(indexColuna, linhaOrigem, corPeca, passos, estado);

    // Avaliação de Castling (Apenas se não estiver em Xeque e se os direitos no Histórico permitirem)
    if (!ignorandoRoque && !verificarXeque(corPeca, estado)) {
        const linha = corPeca === 'w' ? 1 : 8;
        
        // Roque Menor (Kingside)
        if (historico.roque[`${corPeca}K`] && estado[`h${linha}`] === `${corPeca}R`) {
            if (!estado[`f${linha}`] && !estado[`g${linha}`]) {
                if (!isCasaAtacada(`f${linha}`, corPeca, estado) && !isCasaAtacada(`g${linha}`, corPeca, estado)) {
                    movs.push(`g${linha}`); 
                }
            }
        }

        // Roque Maior (Queenside)
        if (historico.roque[`${corPeca}Q`] && estado[`a${linha}`] === `${corPeca}R`) {
            if (!estado[`b${linha}`] && !estado[`c${linha}`] && !estado[`d${linha}`]) {
                if (!isCasaAtacada(`c${linha}`, corPeca, estado) && !isCasaAtacada(`d${linha}`, corPeca, estado)) {
                    movs.push(`c${linha}`); 
                }
            }
        }
    }
    return movs;
}

/**
 * Algoritmo de projeção de raios (Ray-casting) para peças deslizantes (Torres, Bispos e Damas).
 * Itera ao longo de vetores direcionais até encontrar o limite do tabuleiro ou uma obstrução (amiga ou inimiga).
 * @param {Array<Object>} direcoes - Vetores de deslocamento (ex: [{c:1, l:1}] para diagonal superior direita).
 * @returns {Array<string>} Destinos válidos processados.
 */
function calcularDeslizantes(indexColuna, linhaOrigem, corPeca, direcoes, estado) {
    const movs = [];
    for (let dir of direcoes) {
        let c = indexColuna + dir.c; let l = linhaOrigem + dir.l; 
        while (c >= 0 && c <= 7 && l >= 1 && l <= 8) {
            const idDestino = `${colunas[c]}${l}`;
            const pecaDestino = estado[idDestino];
            
            if (pecaDestino) {
                // Se a obstrução for inimiga, a casa é incluída como captura possível antes da interrupção do raio
                if (pecaDestino.charAt(0) !== corPeca) movs.push(idDestino);
                break; 
            } else {
                movs.push(idDestino);
            }
            c += dir.c; l += dir.l;
        }
    }
    return movs;
}

/**
 * Processador de translações discretas para peças de salto (Cavalo e Rei).
 * Diferente do Ray-casting, avalia apenas os vetores finais fixos.
 * @param {Array<Object>} saltos - Diferenciais de coordenadas de destino.
 * @returns {Array<string>} Destinos válidos processados.
 */
function calcularSaltos(indexColuna, linhaOrigem, corPeca, saltos, estado) {
    const movs = [];
    for (let salto of saltos) {
        let c = indexColuna + salto.c; let l = linhaOrigem + salto.l;
        
        // Valida se as coordenadas finais se mantêm dentro das delimitações da grelha (8x8)
        if (c >= 0 && c <= 7 && l >= 1 && l <= 8) {
            const idDestino = `${colunas[c]}${l}`;
            const pecaDestino = estado[idDestino];
            
            // Permite movimento para casas vazias ou ocupadas por peças oponentes
            if (!pecaDestino || pecaDestino.charAt(0) !== corPeca) movs.push(idDestino);
        }
    }
    return movs;
}
