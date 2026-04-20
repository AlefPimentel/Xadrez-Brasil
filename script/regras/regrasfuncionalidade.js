// Script/regras/regrasfuncionalidade.js

/**
 * Flags de configuração extraídas do ambiente local na inicialização do módulo.
 * @constant {boolean} modoPresencial
 * @constant {string} corJogador
 */
export const modoPresencial = localStorage.getItem("modoJogo") === "presencial";
export const corJogador = localStorage.getItem("corJogador") || 'w';

/**
 * Máquina de estados global do motor de xadrez.
 * Controla o fluxo de turnos, término de sessão e a pilha de histórico para a funcionalidade "Desfazer".
 * @type {Object}
 */
export let estadoGlobal = {
    turnoAtual: 'w',
    jogoAcabou: false,
    idOperacao: 0,
    pilhaEstados: []
};

// Funções de mutação de estado (Setters e Controladores)
export function alterarTurno(novoTurno) { estadoGlobal.turnoAtual = novoTurno; }
export function encerrarJogo() { estadoGlobal.jogoAcabou = true; }
export function novaOperacao() { estadoGlobal.idOperacao++; }
export function salvarNaPilha(estadoSalvo) { estadoGlobal.pilhaEstados.push(estadoSalvo); }
export function retirarDaPilha() { return estadoGlobal.pilhaEstados.pop(); }
export function setEstadoGlobalTurno(turno) { estadoGlobal.turnoAtual = turno; }

/**
 * Registo histórico e paramétrico da partida.
 * Necessário para validação de regras avançadas (Roque, 50 movimentos, Repetição e exportação PGN/UCI).
 * @type {Object}
 */
export let historico = {
    ultimoMovimento: null, 
    roque: { wK: true, wQ: true, bK: true, bQ: true },
    uci: [],
    meiosLancesSemCapturaOuPeao: 0, 
    posicoesPassadas: [] 
};

/**
 * Restaura o objeto de histórico a partir de um estado anterior.
 * Utiliza Deep Cloning (`JSON.parse(JSON.stringify)`) para prevenir mutação de referências na memória.
 * @param {Object} novoHistorico - O snapshot do histórico a ser restaurado.
 */
export function setHistorico(novoHistorico) {
    historico.ultimoMovimento = novoHistorico.ultimoMovimento ? JSON.parse(JSON.stringify(novoHistorico.ultimoMovimento)) : null;
    historico.roque = JSON.parse(JSON.stringify(novoHistorico.roque));
    historico.uci = [...novoHistorico.uci];
    historico.meiosLancesSemCapturaOuPeao = novoHistorico.meiosLancesSemCapturaOuPeao;
    historico.posicoesPassadas = [...novoHistorico.posicoesPassadas];
}

/**
 * Regista formalmente a conclusão de um movimento válido, atualizando métricas e direitos do jogador.
 * @param {string} origem - Casa algébrica de origem.
 * @param {string} destino - Casa algébrica de destino.
 * @param {string} peca - Código da peça movida.
 * @param {string|null} codigoPromocao - Letra indicando a peça promovida (ex: 'q'), se aplicável.
 * @param {boolean} foiCaptura - Flag indicativa se o movimento resultou na captura de material.
 */
export function registrarMovimento(origem, destino, peca, codigoPromocao = null, foiCaptura = false) {
    historico.ultimoMovimento = { peca, origem, destino };

    // Concatenação de string no padrão Universal Chess Interface (UCI)
    let lanceUci = origem + destino;
    if (codigoPromocao) { lanceUci += codigoPromocao.toLowerCase(); }
    historico.uci.push(lanceUci); 

    // Reset do contador da regra dos 50 movimentos em caso de captura ou avanço de peão
    if (peca.charAt(1) === 'P' || foiCaptura) {
        historico.meiosLancesSemCapturaOuPeao = 0;
    } else {
        historico.meiosLancesSemCapturaOuPeao++;
    }

    // Revogação de direitos de Roque (Castling rights) caso o Rei ou as Torres se movam
    if (peca === 'wK') { historico.roque.wK = false; historico.roque.wQ = false; }
    if (peca === 'bK') { historico.roque.bK = false; historico.roque.bQ = false; }
    if (peca === 'wR') {
        if (origem === 'h1') historico.roque.wK = false;
        if (origem === 'a1') historico.roque.wQ = false;
    }
    if (peca === 'bR') {
        if (origem === 'h8') historico.roque.bK = false;
        if (origem === 'a8') historico.roque.bQ = false;
    }
}

/**
 * Persiste um snapshot visual/lógico da posição atual no array histórico.
 * @param {string} tabuleiroVirtualStr - Representação em string do estado do tabuleiro.
 */
export function guardarFotografiaPosicao(tabuleiroVirtualStr) {
    historico.posicoesPassadas.push(tabuleiroVirtualStr);
}
