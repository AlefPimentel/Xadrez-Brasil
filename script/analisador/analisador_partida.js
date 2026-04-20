// Script/analisador/analisador_partida.js

import { atualizarProgresso, exibirRelatorioFinal } from './analisador_view.js';

let workerAnalisador = null;
let historicoUCI = []; 
let avaliacoesAbsolutas = [0]; 
let lanceAtualParaAnalisar = 1;
let ultimaNotaCalculada = 0; 
let esperandoBestmove = false;
let watchdogTimer = null;
let analiseFimDeJogoAtiva = false; 

/**
 * Inicializa silenciosamente o worker do Stockfish se a barra de avaliação estiver desativada,
 * preparando-o para análise futura.
 */
export function prepararAnalisadorSombra() {
    const mostrarBarra = localStorage.getItem('mostrarBarra') === 'on';
    if (mostrarBarra) return; 

    if (!workerAnalisador) {
        workerAnalisador = new Worker(new URL('./stockfish.js', import.meta.url).href);
        workerAnalisador.onmessage = processarRespostaStockfish;
        workerAnalisador.postMessage('uci'); 
    }
}

/**
 * Adiciona uma sequência de lances para a fila de análise do motor assíncrono.
 * @param {Array<string>} arrayDeLancesUCI - Histórico completo de lances UCI atuais.
 */
export function adicionarLanceParaAnalise(arrayDeLancesUCI) {
    const mostrarBarra = localStorage.getItem('mostrarBarra') === 'on';
    if (mostrarBarra) return; 

    historicoUCI = [...arrayDeLancesUCI];

    if (!workerAnalisador) prepararAnalisadorSombra();

    if (!esperandoBestmove && workerAnalisador) {
        pedirAnaliseDaPosicao();
    }
}

/**
 * Sincroniza a fila de lances do analisador após o utilizador desfazer uma jogada.
 * @param {Array<string>} novoHistoricoUCI - O histórico retificado após o "undo".
 */
export function sincronizarHistoricoAposDesfazer(novoHistoricoUCI) {
    historicoUCI = [...novoHistoricoUCI];
    
    if (avaliacoesAbsolutas.length > historicoUCI.length + 1) {
        avaliacoesAbsolutas.length = historicoUCI.length + 1;
    }
    
    lanceAtualParaAnalisar = avaliacoesAbsolutas.length;

    if (esperandoBestmove && workerAnalisador) {
        workerAnalisador.postMessage("stop");
        esperandoBestmove = false;
        clearTimeout(watchdogTimer);
    }
}

/**
 * Inicia uma análise profunda sequencial de toda a partida (Relatório de Fim de Jogo).
 * @param {Array<string>} arrayDeLancesUCI - Histórico completo a ser iterado.
 */
export function iniciarAnaliseCompleta(arrayDeLancesUCI) {
    historicoUCI = [...arrayDeLancesUCI];
    analiseFimDeJogoAtiva = true;

    if (!workerAnalisador) {
        workerAnalisador = new Worker(new URL('./stockfish.js', import.meta.url).href);
        workerAnalisador.onmessage = processarRespostaStockfish;
        workerAnalisador.postMessage('uci'); 
        avaliacoesAbsolutas = [0];
        lanceAtualParaAnalisar = 1;
    }

    if (!esperandoBestmove) {
        pedirAnaliseDaPosicao();
    } else {
        atualizarProgresso(lanceAtualParaAnalisar - 1, historicoUCI.length);
    }
}

/**
 * Emite o comando para o Stockfish analisar a posição do índice atual.
 */
function pedirAnaliseDaPosicao() {
    if (lanceAtualParaAnalisar > historicoUCI.length) {
        if (analiseFimDeJogoAtiva) calcularEstatisticasFinais();
        return; 
    }

    ultimaNotaCalculada = 0; 
    esperandoBestmove = true;
    
    let movesString = historicoUCI.slice(0, lanceAtualParaAnalisar).join(" ");
    workerAnalisador.postMessage(`position startpos moves ${movesString}`);
    workerAnalisador.postMessage("go depth 14"); 

    resetarWatchdog();
}

/**
 * Temporizador de segurança para forçar o avanço caso o cálculo demore em excesso.
 */
function resetarWatchdog() {
    clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(() => { 
        if (esperandoBestmove) {
            if (workerAnalisador) workerAnalisador.postMessage("stop");
            avancarAnalise(); 
        }
    }, 3000); 
}

/**
 * Trata os dados contínuos do Worker durante o processamento do array completo.
 */
function processarRespostaStockfish(event) {
    const linha = event.data;
    if (!esperandoBestmove) return; 
    
    resetarWatchdog();

    if (linha.includes("score")) {
        ultimaNotaCalculada = extrairScore(linha);
        if (linha.includes("mate 0")) { 
            if (workerAnalisador) workerAnalisador.postMessage("stop");
            avancarAnalise(); 
            return; 
        }
    }
    
    if (linha.includes("bestmove")) avancarAnalise();
}

/**
 * Regista o resultado avaliado do lance atual e requisita o próximo.
 */
function avancarAnalise() {
    esperandoBestmove = false;
    clearTimeout(watchdogTimer); 

    let turnoDasBrancas = (lanceAtualParaAnalisar % 2 === 0);
    let scoreAbsoluto = ultimaNotaCalculada;
    
    if (!turnoDasBrancas) scoreAbsoluto = -scoreAbsoluto; 
    
    avaliacoesAbsolutas[lanceAtualParaAnalisar] = scoreAbsoluto;
    
    if (analiseFimDeJogoAtiva) atualizarProgresso(lanceAtualParaAnalisar, historicoUCI.length);

    lanceAtualParaAnalisar++;
    pedirAnaliseDaPosicao(); 
}

/**
 * Normaliza os valores de score reportados pelo Motor.
 */
function extrairScore(linha) {
    if (linha.includes("score mate")) {
        let mate = parseInt(linha.split("score mate ")[1].split(" ")[0]);
        return mate === 0 ? -10000 : (mate > 0 ? 10000 - mate : -10000 - mate);
    }
    return linha.includes("score cp") ? parseInt(linha.split("score cp ")[1].split(" ")[0]) : 0;
}

/**
 * Regista a análise concluída no objeto global de Histórico.
 */
function salvarAnaliseNoHistorico(precisaoW, precisaoB, notasCores, pontosBarra) {
    let listaHistorico = JSON.parse(localStorage.getItem('historicoPartidas')) || [];
    
    let indexAlvo = localStorage.getItem('indexHistoricoAnalisado');
    let index = indexAlvo !== null ? parseInt(indexAlvo) : 0; 

    if (listaHistorico.length > index) {
        listaHistorico[index].analisada = true;
        listaHistorico[index].precisaoW = precisaoW;
        listaHistorico[index].precisaoB = precisaoB;
        listaHistorico[index].memoriaNotas = notasCores;
        listaHistorico[index].memoriaAvaliacoes = pontosBarra;
        
        localStorage.setItem('historicoPartidas', JSON.stringify(listaHistorico));
    }
    
    localStorage.removeItem('indexHistoricoAnalisado');
}

/**
 * Compila todas as notas provisórias e calcula estatísticas unificadas.
 */
function calcularEstatisticasFinais() {
    let resPorCor = { 
        w: { brilhante: 0, uau: 0, otima: 0, ok: 0, impreciso: 0, mal: 0, pessima: 0, somaPrecisao: 0, totalLances: 0, precisaoFinal: 0 },
        b: { brilhante: 0, uau: 0, otima: 0, ok: 0, impreciso: 0, mal: 0, pessima: 0, somaPrecisao: 0, totalLances: 0, precisaoFinal: 0 }
    };

    let classificacaoPassoAPasso = [];

    for (let i = 1; i <= historicoUCI.length; i++) {
        let evalAntes = avaliacoesAbsolutas[i - 1];
        let evalDepois = avaliacoesAbsolutas[i];
        let turnoBrancas = (i % 2 !== 0); 
        let cor = turnoBrancas ? 'w' : 'b';
        let eJogadorAntes = turnoBrancas ? evalAntes : -evalAntes;
        let eJogadorDepois = turnoBrancas ? evalDepois : -evalDepois;
        let perda = eJogadorAntes - eJogadorDepois;

        let categoria = classificarLance(perda, eJogadorAntes, eJogadorDepois, cor, resPorCor);
        classificacaoPassoAPasso.push(categoria);

        let prec = calcularPrecisaoDoLance(perda);
        resPorCor[cor].somaPrecisao += prec;
        resPorCor[cor].totalLances++;
    }

    ['w', 'b'].forEach(c => {
        let r = resPorCor[c];
        r.precisaoFinal = r.totalLances > 0 ? (r.somaPrecisao / r.totalLances).toFixed(1) : 0;
    });

    salvarAnaliseNoHistorico(resPorCor.w.precisaoFinal, resPorCor.b.precisaoFinal, classificacaoPassoAPasso, avaliacoesAbsolutas);

    exibirRelatorioFinal(resPorCor, classificacaoPassoAPasso, avaliacoesAbsolutas);
    
    if (workerAnalisador) { 
        workerAnalisador.terminate(); 
        workerAnalisador = null; 
    }
}

/**
 * Converte a delta de centipawns perdidos numa percentagem linear.
 */
function calcularPrecisaoDoLance(p) {
    if (p >= 0) {
        if (p <= 15) return 100; if (p <= 25) return 100; if (p <= 45) return 90;
        if (p <= 60) return 80; if (p <= 80) return 72; if (p <= 120) return 62;
        if (p <= 150) return 47; if (p <= 175) return 35; if (p <= 200) return 30; return 15;
    } else {
        let g = Math.abs(p);
        if (g <= 15) return 100; if (g <= 30) return 99; if (g <= 60) return 96;
        if (g <= 120) return 92; if (g <= 160) return 89; if (g <= 200) return 85;
        if (g <= 250) return 80; return 75;
    }
}

/**
 * Categoriza descritivamente o nível de um lance com base nas perdas absolutas.
 */
function classificarLance(p, eA, eD, cor, res) {
    if (p < 0) p = 0; 
    let r = res[cor];
    let categoria = "";
    
    if (p <= 15) {
        if (p === 0 && eD >= 400 && eA < 10) { r.brilhante++; categoria = 'brilhante'; } 
        else if (p <= 0 && ((eD - eA >= 200) || (eA <= -200 && eD >= -10))) { r.uau++; categoria = 'uau'; } 
        else { r.otima++; categoria = 'otima'; }
    } else if (p <= 120) { r.ok++; categoria = 'ok'; } 
    else if (p <= 180) { r.impreciso++; categoria = 'impreciso'; } 
    else if (p <= 320) { r.mal++; categoria = 'mal'; } 
    else { r.pessima++; categoria = 'pessima'; }

    return categoria;
}
