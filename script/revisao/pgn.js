// Script/revisao/pgn.js

/**
 * Gera uma string no formato PGN a partir de um histórico de lances.
 * * @param {Array<string>} historicoUCI - Array contendo os lances da partida.
 * @returns {string} String formatada com a numeração e os lances.
 */
export function gerarPGNString(historicoUCI) {
    let pgnTratado = "";
    let numeroLance = 1;

    for (let i = 0; i < historicoUCI.length; i += 2) {
        let jogadaBrancas = historicoUCI[i];
        let jogadaPretas = historicoUCI[i + 1] ? historicoUCI[i + 1] : "";
        pgnTratado += `${numeroLance}. ${jogadaBrancas} ${jogadaPretas} `;
        numeroLance++;
    }
    return pgnTratado.trim();
}

/**
 * Processa e higieniza uma string PGN bruta, extraindo apenas os lances da partida.
 * Remove cabeçalhos, comentários, marcações de tempo e resultados.
 * * @param {string} stringPGN - O conteúdo completo e não tratado do PGN.
 * @returns {Array<string>} Array contendo os lances limpos em notação algébrica (SAN).
 */
export function interpretarPGNExterno(stringPGN) {
    let txt = stringPGN;

    // Remove as tags de cabeçalho (ex: [Event "..."])
    txt = txt.replace(/\[.*?\]/g, '');
    
    // Remove anotações e comentários do transcritor
    txt = txt.replace(/\{.*?\}/g, '');
    
    // Remove marcações de relógio ou de avaliação do motor (ex: [%clk 0:10:00])
    txt = txt.replace(/\[%.*?\]/g, '');
    
    // Remove as flags de resultado ao final da string
    txt = txt.replace(/1-0|0-1|1\/2-1\/2|\*/g, '');
    
    // Remove a numeração dos lances
    txt = txt.replace(/\b\d+\.+/g, '');

    // Normaliza os espaços em branco e quebras de linha
    txt = txt.replace(/\s+/g, ' ').trim();

    if (txt === "") return [];

    return txt.split(' ');
}

/**
 * Analisa o cabeçalho de uma partida PGN e extrai os metadados principais.
 * * @param {string} stringPGN - O conteúdo completo do PGN.
 * @returns {Object} Dicionário contendo os dados dos jogadores, rating e resultado.
 */
export function extrairMetadadosPGN(stringPGN) {

    // Função auxiliar para localizar e extrair dinamicamente o valor de uma tag específica
    const buscarTag = (tag) => {
        const regex = new RegExp(`\\[${tag} "(.*?)"\\]`);
        const resultado = stringPGN.match(regex);
        return resultado ? resultado[1] : null;
    };

    return {
        white: buscarTag("White") || "Brancas",
        black: buscarTag("Black") || "Pretas",
        whiteElo: buscarTag("WhiteElo") || "?",
        blackElo: buscarTag("BlackElo") || "?",
        result: buscarTag("Result") || "Partida Importada"
    };
}
