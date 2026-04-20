// Script/classe/model_bots.js

export class Bot {
    constructor(id, nome, rating, foto, descricao, frases = "") {
        this.id = id;               
        this.nome = nome;           
        this.rating = rating;       
        this.foto = foto;           
        this.descricao = descricao; 
        this.frases = frases;       
    }
}

// =========================================
// BASE DE DADOS DE BOTS
export const listaDeBots = [
    new Bot(
        1, 
        "GM de Taubaté", 
        250, 
        "/img/img_bots/bottaubate.jpg", 
        "Sou o lendário GM de Taubaté. Meu rating é tão alto que a FIDE decidiu não publicar para não desanimar os outros jogadores.",
        ""
    ),
    new Bot(
        3, 
        "Dois mestres em uma moto", 
        500, 
        "/img/img_bots/2mestres.jpg", 
        "Somos dois mestres em uma moto. Um fica de olho na partida enquanto o outro acelera. Quando você olha de novo pro tabuleiro, algumas peças sumiram e seu rei está em xeque.",
        ""
    ),
    new Bot(
        5, 
        "Tigrinho", 
        750, 
        "/img/img_bots/tigrinho.jpg", 
        "Sou o Bot Tigrinho. A primeira partida parece sorte, a segunda esperança… a terceira já virou estatística.",
        ""
    ),
    new Bot(
        7, 
        "Uninho De Firma", 
        1000, 
        "/img/img_bots/botuno.jpg", 
        `<p><b>Motor:</b> ∞ <br>
        <b>Combustível:</b> Gasolina (de preferência adulterada) <br>
        <b>Óleo:</b> Opcional <br>
        <b>Ocasiões:</b> Asfalto, montanhas, deserto, oceano, Marte… <br>
        <b>Versões:</b> Sem escada / Com escada (modo padrão/modo lendário)</p>`,
        ""
    ),
    new Bot(
        9, 
        "Magnus Calça", 
        1250, 
        "/img/img_bots/Magnuscalca.jpg", 
        "Sou o Magnus Calça. Jogo simples, limpo e direto… o suficiente pra te vencer sem nem precisar parecer difícil.",
        ""
    ),
    new Bot(
        11, 
        "Caramelo", 
        1500, 
        "/img/img_bots/Botcaramelo.jpg", 
        "Olá, sou um vira-lata caramelo que trocou o portão da casa pelo tabuleiro de xadrez. Posso até parecer tranquilo, mas quando a partida começa eu farejo cada blunder até chegar no xeque-mate.",
        ""
    ),
    new Bot(
        13, 
        "Mestre Maromba", 
        1750, 
        "/img/img_bots/botmaromba.jpg", 
        "Bem-vindo ao treino. Eu sou o GM Maromba, cada lance é uma repetição até você falhar e eu dar o xeque-mate.",
        ""
    ),
    new Bot(
        15, 
        "JavaScript", 
        2000, 
        "/img/img_bots/JavaScript.jpg", 
        "Eu sou o JavaScript. Assíncrono na vida, mas implacável no tabuleiro — seu rei cai antes do próximo frame.",
        ""
    ),
    new Bot(
        17, 
        "Bolsula", 
        2250, 
        "/img/img_bots/bolsula.jpg", 
        "Sou o Bolsula. Um experimento político que saiu do controle e veio parar no tabuleiro. Meu plano de governo é simples: dominar o centro e estatizar sua dama.",
        ""
    ),
    new Bot(
        19, 
        "Alef", 
        2500, 
        "/img/img_bots/Alef.jpg", 
        "Olá! Eu sou o Alef. Curtiu minha versão de xadrez? Agora a pergunta é: você consegue fazer como o Kirito em SAO… e derrotar o criador do jogo?",
        ""
    )
];

export function getBotPorNivel(nivelDesejado) {
    const botEncontrado = listaDeBots.find(bot => bot.id === parseInt(nivelDesejado));
    return botEncontrado || listaDeBots[0]; 
}
