// Script/interface/tabuleiro.js

import { initialBoard, pieceImages } from './pecas.js';

/** * Mapeamento algébrico das colunas (ficheiros) do tabuleiro. 
 * @constant {Array<string>} 
 */
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']; 

/**
 * Renderiza dinamicamente a grelha estrutural do tabuleiro (8x8) manipulando o DOM.
 * Instancia os nós visuais das casas, injeta as coordenadas (Notação Algébrica) e distribui os assets iniciais.
 */
export function createBoard() {
    const board = document.getElementById("chessboard");
    board.innerHTML = ""; // Limpeza da árvore DOM interna para prevenir duplicações de nós

    // Iteração matricial O(n^2) sobre as 64 casas lógicas
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            
            const square = document.createElement("div");
            square.classList.add("square");

            // Construção do identificador algébrico único (ex: 'e4', 'a8')
            const squareId = `${files[col]}${8 - row}`;
            square.id = squareId;

            // Aplicação da coloração alternada via paridade da soma de índices
            const isLight = (row + col) % 2 === 0;
            if (isLight) {
                square.classList.add("light");
            } else {
                square.classList.add("dark");
            }

            // Injeção da coordenada de linha (Rank) exclusivamente na primeira coluna (File A)
            if (col === 0) {
                const rank = document.createElement("span");
                rank.classList.add("coordinate", "rank");
                rank.innerText = 8 - row; 
                square.appendChild(rank);
            }

            // Injeção da coordenada de coluna (File) exclusivamente na última linha (Rank 1)
            if (row === 7) {
                const file = document.createElement("span");
                file.classList.add("coordinate", "file");
                file.innerText = files[col]; 
                square.appendChild(file);
            }

            // Instanciação e injeção do nó de imagem associado à peça lógica da matriz estática
            const pieceCode = initialBoard[row][col];
            if (pieceCode !== '') {
                const pieceImg = document.createElement("img");
                pieceImg.src = pieceImages[pieceCode]; 
                pieceImg.classList.add("piece"); 
                pieceImg.alt = pieceCode;
                
                square.appendChild(pieceImg);
            }

            board.appendChild(square);
        }
    }
}
