// classe/player.js

export class Player {
    constructor(id = "player_1") {
        this.id = id;
        this.nome = localStorage.getItem('nomeJogador') || "Visitante";
        this.rating = parseInt(localStorage.getItem('ratingJogador')) || 100;
        
        // Caminho absoluto para nunca quebrar nas trocas de ecrã
        this.imgFoto = localStorage.getItem('imgJogador') || "/img/img_padrao.jpg";
    }

    salvarPerfil() {
        localStorage.setItem('nomeJogador', this.nome);
        localStorage.setItem('ratingJogador', this.rating.toString());
        localStorage.setItem('imgJogador', this.imgFoto);
    }

    mudarNome(novoNome) {
        if (novoNome && novoNome.trim() !== "") {
            this.nome = novoNome.trim();
            this.salvarPerfil();
        }
    }

    mudarFoto(novoCaminhoImg) {
        this.imgFoto = novoCaminhoImg;
        this.salvarPerfil();
    }

    alterarRating(pontos) {
        this.rating += pontos;
        if (this.rating < 100) this.rating = 100; 
        this.salvarPerfil();
    }
}
