// Script/relogio/selecaodetempo.js

/**
 * Inicialização do módulo de configuração pré-jogo.
 * Responsável por capturar as preferências do utilizador (controlo de tempo, cor, e auxílios visuais)
 * e persisti-las no LocalStorage antes do roteamento para a interface do tabuleiro.
 */
document.addEventListener("DOMContentLoaded", () => {
    const btnJogar = document.getElementById("btn-jogar");

    // Estado interno padrão (Fallback)
    let tempoEscolhido = "0|0"; 
    let corEscolhida = "random"; 
    let barraAtiva = "off"; 

    // Delegação e gestão de estado da grelha de tempos (Time Control)
    const timeButtons = document.querySelectorAll(".time-btn");
    timeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            timeButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            tempoEscolhido = btn.getAttribute("data-time");
        });
    });

    // Delegação e gestão de estado da seleção de cor/facção
    const colorButtons = document.querySelectorAll(".side-btn[data-color]");
    colorButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            colorButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            corEscolhida = btn.getAttribute("data-color");
        });
    });

    // Delegação e gestão de estado da Barra de Avaliação (Eval Bar)
    const evalButtons = document.querySelectorAll(".eval-option-btn[data-eval]");
    evalButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            evalButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            barraAtiva = btn.getAttribute("data-eval");
        });
    });

    // Persistência de dados e Roteamento
    btnJogar.addEventListener("click", () => {
        localStorage.setItem("tempoJogo", tempoEscolhido);
        localStorage.setItem("mostrarBarra", barraAtiva); 

        // Resolução de aleatoriedade (RNG) para atribuição de cor, se necessário
        let corFinal = corEscolhida;
        if (corEscolhida === "random") {
            corFinal = Math.random() < 0.5 ? 'w' : 'b';
        }
        localStorage.setItem("corJogador", corFinal);

        // Roteamento da aplicação para a view principal do jogo
        window.location.href = "jogo.html";
    });
});
