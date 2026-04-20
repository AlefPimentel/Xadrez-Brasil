// Script/historico/historico.js

/**
 * Controlador de exibição do histórico de partidas.
 * Responsável por extrair o payload da memória, processar o JSON e renderizar a lista no DOM via interpolação de strings.
 */
document.addEventListener('DOMContentLoaded', () => {
    const listaContainer = document.getElementById('lista-historico');
    const stringHistorico = localStorage.getItem('historicoPartidas');

    // Cláusulas de guarda (Early Return) para otimização se o histórico estiver vazio
    if (!stringHistorico) return; 

    const historico = JSON.parse(stringHistorico);
    if (historico.length === 0) return;

    listaContainer.innerHTML = '';
    const meuNomeFallback = localStorage.getItem('nomeJogador') || "Visitante";

    // Iteração sobre o array de partidas para construção dos cartões (Cards)
    historico.forEach((partida, index) => {
        const card = document.createElement('div');
        
        // Mapeamento semântico de classes CSS com base no desfecho da partida
        let classeResultado = "empate"; 
        if (partida.resultado === "Vitória") classeResultado = "vitoria";
        if (partida.resultado === "Derrota") classeResultado = "derrota";
        
        card.className = `card-partida ${classeResultado}`;

        // Construção condicional do bloco de precisão métrica (apenas se a análise do Stockfish existir)
        let precisaoHTML = '';
        if (partida.analisada) {
            precisaoHTML = `
                <div class="precisao-bloco">
                    <div class="p-branca">⬜ ${partida.precisaoW}%</div>
                    <div class="p-preta">⬛ ${partida.precisaoB}%</div>
                </div>
            `;
        }

        // Resolução de referências de UI com fallbacks dinâmicos
        const fallbackImg = "/img/img_padrao.jpg";
        const imgP = partida.imgPlayer || fallbackImg;
        const imgO = partida.imgOponente || fallbackImg;
        const nomeP = partida.nomePlayer || meuNomeFallback;
        const nomeO = partida.oponente || "Jogador 2";

        let nomeBrancas, nomePretas, imgBrancas, imgPretas;

        // Distribuição das peças e metadados com base na cor controlada pelo utilizador
        if (partida.corJogador === 'w') {
            nomeBrancas = nomeP; imgBrancas = imgP;
            nomePretas = nomeO;  imgPretas = imgO;
        } else {
            nomeBrancas = nomeO; imgBrancas = imgO;
            nomePretas = nomeP;  imgPretas = imgP;
        }

        // Injeção do template literal no DOM
        card.innerHTML = `
            <div class="info-jogo">
                <div class="historico-jogadores">
                    <div class="hist-jogador">
                        <img src="${imgBrancas}" class="hist-avatar" onerror="this.src='${fallbackImg}'">
                        <span>${nomeBrancas} ⬜</span>
                    </div>
                    <span class="hist-vs">VS</span>
                    <div class="hist-jogador">
                        <img src="${imgPretas}" class="hist-avatar" onerror="this.src='${fallbackImg}'">
                        <span>${nomePretas} ⬛</span>
                    </div>
                </div>
                <small>${partida.resultado} • ${partida.data}</small>
            </div>
            
            <div class="acoes-partida">
                ${precisaoHTML}
                <button class="btn-analisar btn-detalhes" data-index="${index}">Ver Detalhes</button>
            </div>
        `;
        listaContainer.appendChild(card);
    });

    /**
     * Delegação de eventos para os botões "Ver Detalhes".
     * Prepara a engine injetando os dados estruturais da partida alvo na cache global e aciona o roteamento.
     */
    document.querySelectorAll('.btn-detalhes').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            const partida = historico[index];
            
            // Persiste o snapshot da partida no LocalStorage para que o motor de revisão possa consumi-lo
            localStorage.setItem('partidaEmRevisao', JSON.stringify(partida));
            localStorage.setItem('indexHistoricoAnalisado', index);
            window.location.href = 'jogo.html'; 
        });
    });
});
