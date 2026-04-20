// Script/analisador/analisador.js

/**
 * Instância global do motor de análise Stockfish (Web Worker).
 */
const motorAnalise = new Worker(new URL('./stockfish.js', import.meta.url).href);
motorAnalise.postMessage('uci');

let profundidadeAlvo = 15;
let callbackAtualizacao = null;
let analisando = false;

/**
 * Escuta as mensagens emitidas pelo Web Worker do Stockfish em tempo real.
 */
motorAnalise.onmessage = function(evento) {
    const msg = evento.data;

    // Filtra apenas as linhas de informação relevantes contendo a pontuação da posição.
    if (msg.startsWith("info") && msg.includes("score")) {
        processarDadosDaAnalise(msg);
    }
};

/**
 * Processa a string bruta retornada pelo Stockfish e extrai métricas relevantes.
 * @param {string} msg - Linha de log do Stockfish.
 */
function processarDadosDaAnalise(msg) {
    if (!callbackAtualizacao) return;

    // Extrai a profundidade alcançada no cálculo atual
    const depthMatch = msg.match(/depth (\d+)/);
    const depthAtual = depthMatch ? parseInt(depthMatch[1]) : 0;

    // Extrai a pontuação em centipawns ou xeque-mate iminente
    let pontuacao = 0;
    let tipo = 'cp'; 
    
    if (msg.includes("score cp")) {
        const cpMatch = msg.match(/score cp (-?\d+)/);
        if (cpMatch) pontuacao = parseInt(cpMatch[1]);
    } else if (msg.includes("score mate")) {
        tipo = 'mate'; 
        const mateMatch = msg.match(/score mate (-?\d+)/);
        if (mateMatch) pontuacao = parseInt(mateMatch[1]);
    }

    // Extrai a linha principal (Principal Variation - melhores jogadas previstas)
    const pvMatch = msg.match(/pv (.*)/);
    const linhaDeJogadas = pvMatch ? pvMatch[1] : "";

    callbackAtualizacao({
        depth: depthAtual,
        tipo: tipo,
        pontuacaoOriginal: pontuacao,
        melhorLinha: linhaDeJogadas
    });
}

/**
 * Altera a profundidade alvo da análise contínua.
 * @param {number|string} novaProfundidade - Nível de profundidade desejado.
 */
export function configurarProfundidadeAnalise(novaProfundidade) {
    profundidadeAlvo = parseInt(novaProfundidade);
}

/**
 * Inicia a avaliação de uma posição específica no tabuleiro para alimentar a interface.
 * @param {Array<string>} historicoUci - Array contendo os movimentos até a posição atual.
 * @param {string} turnoAtual - 'w' (Brancas) ou 'b' (Pretas).
 * @param {Function} callbackReceberDados - Callback que recebe os dados processados.
 */
export function iniciarAvaliacaoDaPosicao(historicoUci, turnoAtual, callbackReceberDados) {
    pararAnalise(); 
    
    analisando = true;

    callbackAtualizacao = (dadosBrutos) => {
        let pontuacaoAbsoluta = dadosBrutos.pontuacaoOriginal;
        
        // Inverte a pontuação se for a vez das pretas, garantindo a perspetiva correta na barra de avaliação.
        if (turnoAtual === 'b') {
            pontuacaoAbsoluta = -pontuacaoAbsoluta; 
        }

        callbackReceberDados({
            profundidadeAtual: dadosBrutos.depth,
            profundidadeMaxima: profundidadeAlvo,
            tipo: dadosBrutos.tipo,
            vantagem: pontuacaoAbsoluta,
            melhorLinha: dadosBrutos.melhorLinha
        });
    };

    const uciString = historicoUci.join(" ");
    motorAnalise.postMessage(`position startpos moves ${uciString}`);
    motorAnalise.postMessage(`go depth ${profundidadeAlvo}`);
}

/**
 * Interrompe a análise em andamento.
 */
export function pararAnalise() {
    if (analisando) {
        motorAnalise.postMessage("stop");
        analisando = false;
    }
}
