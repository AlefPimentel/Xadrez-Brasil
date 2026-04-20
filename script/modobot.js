// Script/modobot.js

import { listaDeBots } from '../../classe/model_bots.js';

/**
 * Controlador da View de Seleção de Adversários Computadorizados.
 * Responsável por consumir o modelo de dados (Model) e gerar os cartões interativos (View) dinamicamente.
 */
document.addEventListener("DOMContentLoaded", () => {
    const containerBots = document.getElementById('container-bots');

    // Iteração sobre o modelo de dados para geração declarativa e injeção de componentes DOM (Cards)
    if (containerBots) {
        listaDeBots.forEach(bot => {
            const card = document.createElement('div');
            card.className = 'bot-card';
            card.setAttribute('data-level', bot.id);
            
            // Injeção via Template Literal (Interpolação de Strings) com fallback seguro para imagens
            card.innerHTML = `
                <div class="bot-avatar">
                    <img src="${bot.foto}" alt="${bot.nome}" onerror="this.src='/img/img_padrao.jpg'">
                </div>
                <div class="bot-info">
                    <h3>${bot.nome} <span class="bot-rating">(${bot.rating})</span></h3>
                    <p>${bot.descricao}</p>
                </div>
            `;
            containerBots.appendChild(card);
        });
    }

    // Vinculação de eventos de roteamento e mutação de estado baseada no clique
    const botCards = document.querySelectorAll(".bot-card");

    botCards.forEach(card => {
        card.addEventListener("click", () => {
            const nivelEscolhido = card.getAttribute("data-level");
            
            // Persistência de parâmetros de matchmaking na Local Storage
            localStorage.setItem("nivelBotXadrez", nivelEscolhido);
            localStorage.setItem("modoJogo", "bot");

            // Roteamento condicional para o pipeline de setup (Seleção de Tempo)
            window.location.href = "selecaodetempo.html";
        });
    });
});
