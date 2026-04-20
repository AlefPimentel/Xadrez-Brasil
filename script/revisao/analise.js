// Script/revisao/Analise.js

import { interpretarPGNExterno, extrairMetadadosPGN } from './pgn.js'; 
import { simularPartidaPGN } from './simulador.js'; 

/**
 * Módulo de Input e Parsing de Portable Game Notation (PGN).
 * Orquestra o ciclo de vida do componente de importação textual, validando a integridade sintática 
 * e transformando o texto bruto num payload de partida simulada pronto para injeção de estado.
 */
document.addEventListener("DOMContentLoaded", () => {
    
    const btnNovaAnalise = document.getElementById("btn-nova-analise");
    const modalPgn = document.getElementById("modal-pgn");
    const btnFecharModal = document.getElementById("btn-fechar-modal");
    const btnIniciarPgn = document.getElementById("btn-iniciar-pgn");
    const pgnInput = document.getElementById("pgn-input");

    if (!btnNovaAnalise || !modalPgn) return;

    // Configuração dos Event Listeners para acionamento do Modal
    btnNovaAnalise.addEventListener("click", () => {
        modalPgn.style.display = "flex";
        pgnInput.value = ""; 
        pgnInput.focus();
    });

    btnFecharModal.addEventListener("click", () => {
        modalPgn.style.display = "none";
    });

    // Encerramento via clique exterior (Overlay click)
    window.addEventListener("click", (evento) => {
        if (evento.target === modalPgn) modalPgn.style.display = "none";
    });

    // Pipeline principal de extração, simulação e roteamento do PGN
    btnIniciarPgn.addEventListener("click", () => {
        const textoPgnBruto = pgnInput.value.trim();

        if (textoPgnBruto === "") {
            alert("Por favor, introduza um PGN válido.");
            return;
        }

        modalPgn.style.display = "none";

        // 1. Extração estruturada via RegEx dos metadados (Tags) do PGN
        const metadados = extrairMetadadosPGN(textoPgnBruto);

        // 2. Sanitização e conversão do corpo do PGN para Standard Algebraic Notation (SAN)
        const arrayDeLancesSAN = interpretarPGNExterno(textoPgnBruto);

        if (arrayDeLancesSAN.length === 0) {
            alert("Não foram identificados lances válidos no PGN fornecido.");
            return;
        }

        let partidaSimulada;
        
        // Tratamento de exceções (Error Boundary) durante a simulação em memória virtual
        try {
            partidaSimulada = simularPartidaPGN(arrayDeLancesSAN);
        } catch (erro) {
            console.error("Exceção na simulação da árvore de lances do PGN:", erro);
            alert("Erro sintático ou lógico ao interpretar a partida. Verifique a integridade do PGN.");
            return;
        }

        // 3. Montagem do Payload (Mock Object) compatível com a interface de Histórico/Jogo
        const partidaImportada = {
            lancesUCI: partidaSimulada.uci,          
            posicoes: partidaSimulada.fotografias,   
            tempos: [],   
            
            // Mapeamento dos metadados extraídos para o modelo de dados interno
            nomePlayer: metadados.white,
            oponente: metadados.black,
            ratingPlayer: `(${metadados.whiteElo})`,
            ratingOponente: `(${metadados.blackElo})`,
            resultado: metadados.result === "1-0" ? "Vitória das Brancas" : 
                       metadados.result === "0-1" ? "Vitória das Pretas" : 
                       metadados.result === "1/2-1/2" ? "Empate" : metadados.result,
            
            corJogador: "w", // Determinação de perspetiva default para o renderizador
            modoPresencial: true,
            analisada: false
        };

        // Persistência do payload e disparo de transição de rota para renderização
        localStorage.setItem('partidaEmRevisao', JSON.stringify(partidaImportada));
        window.location.href = 'jogo.html'; 
    });
});
