// Script/regras/rating.js

/**
 * Calcula a variação de pontos baseada no sistema de rating Elo.
 * * @param {number} ratingJogador - Rating atual do jogador em foco.
 * @param {number} ratingOponente - Rating atual do adversário.
 * @param {string} resultado - O resultado da partida ("vitoria", "derrota" ou "empate").
 * @returns {number} O valor do ajuste a ser aplicado ao rating do jogador (ex: +14, -12, 0).
 */
export function calcularVariacaoRating(ratingJogador, ratingOponente, resultado) {
    // Fator de desenvolvimento (K-Factor): Determina o peso e a volatilidade das alterações de rating.
    const K = 32;

    // Calcula a probabilidade de vitória (valor esperado) do jogador segundo a fórmula de distribuição logística do Elo.
    const expectativaJogador = 1 / (1 + Math.pow(10, (ratingOponente - ratingJogador) / 400));

    // Atribui o valor numérico correspondente ao desfecho real da partida.
    let pontuacaoReal = 0;
    if (resultado === "vitoria") pontuacaoReal = 1;
    else if (resultado === "empate") pontuacaoReal = 0.5;
    else if (resultado === "derrota") pontuacaoReal = 0;

    // Calcula o delta de pontuação multiplicando o Fator K pela diferença entre o resultado real e o esperado.
    let variacao = Math.round(K * (pontuacaoReal - expectativaJogador));

    // Aplica limites de segurança para garantir que vitórias e derrotas gerem variações estritamente não nulas.
    if (resultado === "vitoria" && variacao < 1) variacao = 1;
    if (resultado === "derrota" && variacao > -1) variacao = -1;

    return variacao;
}
