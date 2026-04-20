// Script/menu.js

/**
 * Inicialização do módulo de navegação do menu principal.
 * Responsável por higienizar estados residuais na memória e configurar o roteamento primário.
 */
document.addEventListener("DOMContentLoaded", () => {
    
    // Sanitização do LocalStorage: Evita que o jogador seja redirecionado acidentalmente 
    // para um estado de revisão ao iniciar uma nova sessão.
    localStorage.removeItem('partidaEmRevisao');
    localStorage.removeItem('indexHistoricoAnalisado');

    // Vinculação do evento de roteamento (Event Delegation) para a view de seleção de modos
    const btnJogar = document.getElementById("btn-jogar-menu");
    if (btnJogar) {
        btnJogar.addEventListener("click", () => {
            window.location.href = "view/mododejogo.html";
        });
    }
});
