// Script/jogo_init.js

import { createBoard } from './jsview/tabuleiro.js';
import { iniciarInteratividade, travarTabuleiro } from './movimento.js';
import { definirNivelBot } from './bot/bot.js';
import { configurarRelogio } from './relogio/relogio.js';
import { dispararFimDeJogo } from './acoes.js';

/**
 * Bootstrapper da sessão de jogo interativa.
 * Orquestra a montagem da interface, inicializa os motores lógicos (Bot e Cronómetro) 
 * e liberta o tabuleiro para interação do utilizador com base no payload persistido.
 */
export function iniciarNovoJogo() {
    const modoJogo = localStorage.getItem("modoJogo");

    // Desperta e configura a instância do Web Worker heurístico (Stockfish) em partidas Single Player.
    if (modoJogo === "bot") {
        const nivelGuardado = localStorage.getItem("nivelBotXadrez") || "10";
        definirNivelBot(nivelGuardado);
    }

    // Extração e parsing dos parâmetros cronométricos (Time Control)
    const tempoGuardado = localStorage.getItem("tempoJogo") || "10|5"; 
    const partesTempo = tempoGuardado.split('|');
    const minutos = parseInt(partesTempo[0]);
    const acrescimo = parseInt(partesTempo[1]);

    // Instanciação da máquina de estados do relógio e injeção do callback de término por timeout
    configurarRelogio(minutos, acrescimo, (corPerdedora) => {
        travarTabuleiro(); 
        const corVencedora = corPerdedora === 'w' ? 'Pretas' : 'Brancas';
        
        // Manipulação direta do DOM para feedback visual de esgotamento temporal
        const indicador = document.getElementById('turn-indicator');
        if (indicador) {
            indicador.innerText = `⏳ TEMPO ESGOTADO! As ${corVencedora} vencem!`;
            indicador.style.color = '#eb6150'; 
        }
        
        // Feedback tátil (Haptic Feedback) suportado por dispositivos móveis
        if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);

        // Delegação do evento de encerramento ao Controlador Central
        dispararFimDeJogo("Tempo Esgotado", `Vitória das ${corVencedora} pelo tempo.`);
    });

    // Renderização matricial do tabuleiro e ativação dos Event Listeners de drag-and-drop
    createBoard();
    iniciarInteratividade();
}
