// Script/revisao/revisao_view.js

/**
 * Injeta o componente de controlo de navegação temporal (Playback Bar) na interface de revisão,
 * ocultando a barra de controlo padrão da partida ativa (Desfazer/Desistir).
 * @param {Function} onInicio - Callback acionado para rebobinar até ao estado inicial do tabuleiro (Ply 0).
 * @param {Function} onVoltar - Callback acionado para retroceder um meio-lance na árvore de histórico.
 * @param {Function} onAvancar - Callback acionado para avançar um meio-lance na árvore de histórico.
 * @param {Function} onFim - Callback acionado para avançar diretamente para o nó final da partida.
 */
export function injetarBarraRevisao(onInicio, onVoltar, onAvancar, onFim) {
    // 1. Oculta o painel de controlo de partida ativa (Gestão de UI State)
    const barraAntiga = document.querySelector('.game-control-bar');
    if (barraAntiga) barraAntiga.style.display = 'none';

    // 2. Instancia e injeta o componente de controlo de navegação, caso não esteja presente no DOM
    let barraRevisao = document.getElementById('review-control-bar');
    
    if (!barraRevisao) {
        barraRevisao = document.createElement('div');
        barraRevisao.id = 'review-control-bar';
        barraRevisao.className = 'game-control-bar'; 
        barraRevisao.style.display = 'flex';
        barraRevisao.style.justifyContent = 'space-between';
        barraRevisao.style.alignItems = 'center';
        barraRevisao.style.padding = '10px';
        barraRevisao.style.backgroundColor = '#262421';
        barraRevisao.style.borderRadius = '8px';

        // Estrutura declarativa (Template Literal) do componente de navegação e display de metadados
        barraRevisao.innerHTML = `
            <button id="btn-rev-inicio" class="game-btn" style="flex: 1; margin: 0 2px; padding: 10px;">⏮️</button>
            <button id="btn-rev-voltar" class="game-btn" style="flex: 1; margin: 0 2px; padding: 10px;">◀️</button>
            
            <div id="rev-indicador" style="flex: 2; text-align: center; font-weight: bold;">
                <div id="rev-lance-num" style="font-size: 12px; color: #aaa;">0 / 0</div>
                <div id="rev-nota-texto" style="font-size: 15px; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;">-</div>
            </div>
            
            <button id="btn-rev-avancar" class="game-btn" style="flex: 1; margin: 0 2px; padding: 10px;">▶️</button>
            <button id="btn-rev-fim" class="game-btn" style="flex: 1; margin: 0 2px; padding: 10px;">⏭️</button>
        `;

        // Injeção estrutural do nó no DOM, mantendo a hierarquia adjacente ao painel substituído
        if (barraAntiga && barraAntiga.parentNode) {
            barraAntiga.parentNode.insertBefore(barraRevisao, barraAntiga.nextSibling);
        }
    }

    barraRevisao.style.display = 'flex';

    // 3. Vinculação dos Event Listeners aos respetivos callbacks de manipulação de estado
    document.getElementById('btn-rev-inicio').onclick = onInicio;
    document.getElementById('btn-rev-voltar').onclick = onVoltar;
    document.getElementById('btn-rev-avancar').onclick = onAvancar;
    document.getElementById('btn-rev-fim').onclick = onFim;
}

/**
 * Atualiza o display do crachá (badge) de avaliação visual, refletindo o índice temporal atual
 * e a classificação semântica do lance calculada pela engine heurística.
 * @param {string|null} notaLance - Chave da classificação algorítmica (ex: 'brilhante', 'mal') ou null para o estado inicial.
 * @param {number} indiceAtual - O ponteiro numérico do meio-lance presentemente renderizado.
 * @param {number} totalLances - O comprimento total do array de histórico da partida.
 */
export function atualizarIndicadorRevisao(notaLance, indiceAtual, totalLances) {
    document.getElementById('rev-lance-num').innerText = `Lance ${indiceAtual} / ${totalLances}`;
    
    const notaEl = document.getElementById('rev-nota-texto');
    
    // Tratamento de edge case: Reset visual para o estado virgem (Início do jogo)
    if (!notaLance) {
        notaEl.innerText = "Início";
        notaEl.style.backgroundColor = "transparent";
        notaEl.style.color = "#aaa";
        return;
    }

    // Dicionário de mapeamento semântico de estilos UI para as métricas avaliativas
    const dicionario = {
        'brilhante': { texto: '!! Brilhante', cor: '#1baca6', txtCor: '#fff' },
        'uau':       { texto: '! Uau',       cor: '#5c8bb0', txtCor: '#fff' },
        'otima':     { texto: 'Ótima',       cor: '#81b64c', txtCor: '#fff' },
        'ok':        { texto: 'OK',          cor: '#9eb47b', txtCor: '#fff' },
        'impreciso': { texto: '? Imprecisão',cor: '#f6b538', txtCor: '#000' },
        'mal':       { texto: '?? Erro',     cor: '#ff7733', txtCor: '#fff' },
        'pessima':   { texto: 'Grave',       cor: '#cc3333', txtCor: '#fff' }
    };

    // Resolução segura do estilo com fallback para tratamento de chaves desconhecidas
    const estilo = dicionario[notaLance] || { texto: notaLance, cor: '#444', txtCor: '#fff' };

    // Mutação das propriedades de renderização
    notaEl.innerText = estilo.texto;
    notaEl.style.backgroundColor = estilo.cor;
    notaEl.style.color = estilo.txtCor;
}
