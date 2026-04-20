// Script/modoplayer.js

/**
 * Controlador de Setup para o modo Multijogador Local (Pass-and-Play).
 * Gere a seleção do controlo temporal e a configuração de auxílios visuais (Barra de Avaliação).
 */
document.addEventListener("DOMContentLoaded", () => {
    const btnJogar = document.getElementById("btn-jogar");
    
    // Delegação de eventos e gestão de estado local para a matriz de controlo cronométrico
    const timeButtons = document.querySelectorAll(".time-btn");
    let tempoEscolhido = "0|0";
    
    timeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            timeButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            tempoEscolhido = btn.getAttribute("data-time");
        });
    });

    // Delegação de eventos e gestão de estado local para ativação/desativação do Motor de Avaliação Visual
    const evalButtons = document.querySelectorAll(".eval-option-btn[data-eval]");
    let barraAtiva = "off";  

    evalButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            evalButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            barraAtiva = btn.getAttribute("data-eval");
        });
    });

    // Handler de submissão do formulário virtual
    btnJogar.addEventListener("click", () => {
        
        // Empacotamento e persistência das definições do utilizador (State Hydration)
        localStorage.setItem("tempoJogo", tempoEscolhido);
        localStorage.setItem("mostrarBarra", barraAtiva); 
        localStorage.setItem("modoJogo", "presencial");

        // Disparo do roteamento para a arena principal
        window.location.href = "jogo.html";
    });
});
