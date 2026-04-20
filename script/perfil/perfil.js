// Script/perfil/perfil.js

import { Player } from '../../classe/player.js';

/**
 * Instância global do perfil do utilizador ativo.
 * Encapsula a lógica de negócio, leitura e persistência de dados no LocalStorage.
 */
const meuJogador = new Player();

/**
 * Inicializa a interface de perfil após o carregamento completo da árvore DOM.
 * Sincroniza o estado em memória (objeto Player) com os elementos visuais.
 */
document.addEventListener('DOMContentLoaded', () => {
    const inputNome = document.getElementById('input-nome');
    const displayRating = document.getElementById('display-rating');
    const imgPreview = document.getElementById('avatar-preview');

    // Popula os campos com os dados persistidos
    inputNome.value = meuJogador.nome;
    displayRating.innerText = meuJogador.rating;
    
    // Fallback de segurança: Caso a imagem esteja corrompida ou o caminho seja inválido
    imgPreview.onerror = () => { imgPreview.src = "/img/img_padrao.jpg"; };
    imgPreview.src = meuJogador.imgFoto;

    carregarGaleriaDeFotos();
});

/**
 * Renderiza dinamicamente a grelha de avatares disponíveis.
 * Adiciona os event listeners para atualização do estado visual e mutação do objeto Player.
 */
function carregarGaleriaDeFotos() {
    const galeria = document.getElementById('galeria-fotos');
    const imgPreview = document.getElementById('avatar-preview');

    // Dicionário estático de assets disponíveis para o utilizador
    const fotosDisponiveis = [
       "/img/img_perfil/Icone1.jpg",
       "/img/img_perfil/Icone2.jpg",
       "/img/img_perfil/Icone3.jpg"
    ];

    fotosDisponiveis.forEach(caminho => {
        const imgEl = document.createElement('img');
        imgEl.src = caminho;
        imgEl.className = 'foto-opcao';
        
        // Oculta a imagem da galeria se o asset não for encontrado no servidor/diretório
        imgEl.onerror = () => { imgEl.style.display = 'none'; };
        
        // Identifica e destaca o avatar atualmente em uso
        if (meuJogador.imgFoto === caminho) {
            imgEl.classList.add('selecionada');
        }

        // Handler de seleção: Atualiza a UI e o estado da instância provisória
        imgEl.onclick = () => {
            document.querySelectorAll('.foto-opcao').forEach(el => el.classList.remove('selecionada'));
            imgEl.classList.add('selecionada');
            imgPreview.src = caminho;
            meuJogador.imgFoto = caminho;
        };

        galeria.appendChild(imgEl);
    });
}

/**
 * Handler de persistência de dados.
 * Ouve o evento de clique no botão "Salvar", persiste as mutações no perfil e engatilha o feedback visual.
 */
document.getElementById('btn-salvar').addEventListener('click', () => {
    const novoNome = document.getElementById('input-nome').value;
    
    // Invoca os métodos da classe Player para atualizar e gravar no LocalStorage
    meuJogador.mudarNome(novoNome);
    meuJogador.mudarFoto(meuJogador.imgFoto); 
    
    // Feedback visual assíncrono de sucesso (Microinteração)
    const btn = document.getElementById('btn-salvar');
    btn.innerText = "Salvo com Sucesso!";
    btn.style.backgroundColor = "#5c8bb0"; 
    
    setTimeout(() => {
        btn.innerText = "Salvar Alterações";
        btn.style.backgroundColor = "#779556";
    }, 1500);
});
