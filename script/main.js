// Script/main.js

import { injetarViewAnalisador } from './analisador/analisador_view.js';
import { iniciarNovoJogo } from './jogo_init.js';
import { carregarModoRevisao } from './revisao/revisao_init.js';

/**
 * Application Bootstrap (Ponto de Entrada Global).
 * Orquestra o carregamento de dependências DOM e o roteamento baseado na hidratação de estado.
 */
document.addEventListener("DOMContentLoaded", async () => {
    
    // Injeção assíncrona dos componentes de interface do Analisador no DOM principal
    if (typeof injetarViewAnalisador === 'function') {
        await injetarViewAnalisador(); 
    }

    // Leitura e hidratação do estado persistente (Local Storage)
    const partidaRevisaoStr = localStorage.getItem('partidaEmRevisao');
    
    // Roteamento condicional (Controller Logic)
    if (partidaRevisaoStr) {
        // Transita a aplicação para o módulo de Playback/Revisão Visual
        const partida = JSON.parse(partidaRevisaoStr);
        localStorage.removeItem('partidaEmRevisao'); 
        carregarModoRevisao(partida);
    } else {
        // Inicializa o fluxo padrão de jogo interativo
        iniciarNovoJogo();
    }
});
