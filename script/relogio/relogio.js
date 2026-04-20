// Script/relogio/relogio.js
import { dispararFimDeJogo } from '../acoes.js';
import { corJogador, modoPresencial } from '../regras/regrasfuncionalidade.js'; 

/**
 * Estado global do módulo de processamento cronométrico.
 */
let tempoW = 0; 
let tempoB = 0; 
let acrescimoSegundos = 0;
let intervalo = null;
let turnoAtual = 'w';
let relogioAtivo = false;
let onTempoEsgotado = null; 
let modoSemTempo = false; 

/**
 * Inicializa o estado base do relógio com os parâmetros definidos pelo utilizador.
 * @param {number} minutos - Tempo base em minutos para cada jogador.
 * @param {number} acrescimo - Incremento em segundos adicionado após cada lance (Fischer).
 * @param {Function} callbackFimDeJogo - Handler a ser executado caso o tempo de um jogador se esgote.
 */
export function configurarRelogio(minutos, acrescimo, callbackFimDeJogo) {
    // Configuração estrutural para partidas de tempo infinito
    if (minutos === 0 && acrescimo === 0) {
        modoSemTempo = true;
        atualizarVisores();
        return; 
    }

    modoSemTempo = false;
    tempoW = minutos * 60;
    tempoB = minutos * 60;
    acrescimoSegundos = acrescimo;
    turnoAtual = 'w';
    relogioAtivo = false;
    onTempoEsgotado = callbackFimDeJogo;
    
    atualizarVisores();
}

/**
 * Ativa o loop de decremento do tempo através da API setInterval.
 * Protegido contra execuções paralelas para evitar double-counting.
 */
export function iniciarRelogio() {
    if (modoSemTempo || relogioAtivo) return; 
    
    relogioAtivo = true;
    
    intervalo = setInterval(() => {
        if (turnoAtual === 'w') {
            tempoW--;
            if (tempoW <= 0) finalizarPorTempo('w'); 
        } else {
            tempoB--;
            if (tempoB <= 0) finalizarPorTempo('b'); 
        }
        atualizarVisores();
    }, 1000); 
}

/**
 * Interrompe o processo assíncrono de decremento, mantendo o estado de memória intacto.
 */
export function pausarRelogio() {
    relogioAtivo = false;
    clearInterval(intervalo);
}

/**
 * Transfere o turno ativo do relógio, aplicando eventuais incrementos de tempo definidos no Setup.
 * @param {string} novoTurno - Facção que tomará posse do relógio ('w' ou 'b').
 */
export function passarTurnoRelogio(novoTurno) {
    if (modoSemTempo) {
        turnoAtual = novoTurno;
        return;
    }

    // Garante que o cronómetro inicie automaticamente na concretização do primeiro lance
    if (!relogioAtivo) iniciarRelogio(); 

    // Aplicação da regra de incremento de Fischer
    if (turnoAtual === 'w') {
        tempoW += acrescimoSegundos;
    } else {
        tempoB += acrescimoSegundos;
    }

    turnoAtual = novoTurno;
    atualizarVisores();
}

/**
 * Rotina utilitária de formatação cronométrica (MM:SS).
 * @param {number} segundosTotal - Valor escalar em segundos a ser formatado.
 * @returns {string} String representativa do tempo formatado.
 */
export function formatarTempo(segundosTotal) {
    if (segundosTotal < 0) segundosTotal = 0; 
    
    const m = Math.floor(segundosTotal / 60);
    const s = segundosTotal % 60;
    // Garante o preenchimento zero à esquerda (Padding) para formatação consistente
    return `${m}:${s.toString().padStart(2, '0')}`; 
}

/**
 * Sincroniza a camada visual (DOM) com a camada lógica de tempo atual.
 */
export function atualizarVisores() {
    const visorW = document.getElementById('clock-w');
    const visorB = document.getElementById('clock-b');

    // Renderização de fallback visual para partidas casuais/sem timer
    if (modoSemTempo) {
        if (visorW) visorW.innerText = "∞";
        if (visorB) visorB.innerText = "∞";
        return;
    }

    if (visorW) visorW.innerText = formatarTempo(tempoW);
    if (visorB) visorB.innerText = formatarTempo(tempoB);
}

/**
 * Interrompe a cronometragem e delega o término do jogo por esgotamento de tempo ao controlador.
 * @param {string} corPerdedora - Cor da facção cujo relógio estourou.
 */
function finalizarPorTempo(corPerdedora) {
    pausarRelogio();
    if (onTempoEsgotado) {
        onTempoEsgotado(corPerdedora); 
    }
}

/**
 * Gera um snapshot estruturado dos tempos cronométricos, essencial para o histórico de revisões.
 * @returns {Object|null} Tempos atuais empacotados ou null em modo infinito.
 */
export function getTempo() {
    if (modoSemTempo) return null;
    return { w: tempoW, b: tempoB };
}

/**
 * Restaura forçosamente os valores cronométricos após uma operação de manipulação temporal (Undo/Redo).
 * @param {number} w - Segundos restaurados para a facção das Brancas.
 * @param {number} b - Segundos restaurados para a facção das Pretas.
 * @param {string} turno - O turno em vigência após a reconstrução do estado.
 */
export function setTempo(w, b, turno) {
    if (modoSemTempo) return;
    tempoW = w;
    tempoB = b;
    turnoAtual = turno;
    atualizarVisores();
}
