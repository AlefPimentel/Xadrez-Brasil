// Script/bot/regrasbot.js

/**
 * Flag determinística do tipo de partida baseada na persistência local.
 * Determina se a sessão atual é multijogador local ('presencial') ou Computador vs Jogador.
 * @constant {boolean}
 */
export const modoPresencial = localStorage.getItem("modoJogo") === "presencial";

/**
 * Designação da cor associada à perspetiva do jogador humano.
 * Essencial para a sincronização de turnos da máquina nos jogos single-player.
 * @constant {string} (Ex: 'w' para Brancas, 'b' para Pretas)
 */
export const corJogador = localStorage.getItem("corJogador") || 'w';
