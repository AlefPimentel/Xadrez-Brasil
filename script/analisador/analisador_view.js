// Script/analisador/analisador_view.js

import { iniciarModoRevisao } from '../revisao/revisao.js';

/**
 * Injeta dinamicamente os ficheiros de estilo (CSS) e estrutura (HTML) do modal do analisador no documento.
 * @returns {Promise<void>}
 */
export async function injetarViewAnalisador() {
    // Interrompe a execução caso o modal já esteja renderizado no DOM.
    if (document.getElementById('modal-fim-jogo')) return;

    try {
        // Carregamento dinâmico da folha de estilos
        const linkCSS = document.createElement('link');
        linkCSS.rel = 'stylesheet';
        linkCSS.href = new URL('/Estilo/analisador.css', import.meta.url).href;
        document.head.appendChild(linkCSS);

        // Obtenção assíncrona e injeção do markup HTML
        const resposta = await fetch(new URL('/view/analisador.html', import.meta.url).href);
        const html = await resposta.text();
        document.body.insertAdjacentHTML('beforeend', html);

        // Criação e configuração dinâmica do botão de fechar (X)
        const modalContent = document.querySelector('#modal-fim-jogo .modal-content');
        if (modalContent) {
            modalContent.style.position = 'relative'; 
            
            const btnX = document.createElement('a');
            btnX.innerHTML = '&#x2715;'; 
            btnX.href = '../index.html'; 
            
            btnX.style.position = 'absolute';
            btnX.style.top = '10px';
            btnX.style.right = '15px';
            btnX.style.color = '#888'; 
            btnX.style.fontSize = '20px';
            btnX.style.fontWeight = 'bold';
            btnX.style.textDecoration = 'none';
            btnX.style.cursor = 'pointer';
            btnX.style.transition = 'color 0.2s';
            
            btnX.onmouseover = () => btnX.style.color = '#fff';
            btnX.onmouseout = () => btnX.style.color = '#888';
            
            modalContent.appendChild(btnX);
        }

        // Configura o fechamento do modal ao clicar no botão de revisão
        const btnRever = document.getElementById('btn-rever-lances');
        if (btnRever) {
            btnRever.addEventListener('click', () => {
                document.getElementById('modal-fim-jogo').style.display = 'none';
            });
        }

    } catch (erro) {
        console.error("Erro ao carregar a View do Analisador:", erro);
    }
}

/**
 * Renderiza o modal de fim de jogo e exibe o painel de pré-análise.
 * @param {string} titulo - O título a ser exibido no cabeçalho do modal.
 * @param {string} motivo - O texto descritivo com a causa do fim da partida.
 */
export function exibirModalFimDeJogo(titulo, motivo) {
    const modal = document.getElementById('modal-fim-jogo');
    if (!modal) return;

    const tituloEl = document.getElementById('titulo-fim-jogo');
    const motivoEl = document.getElementById('motivo-fim-jogo');
    
    if (tituloEl) tituloEl.innerText = titulo;
    if (motivoEl) motivoEl.innerText = motivo;
    
    // Configura a visibilidade dos painéis de fluxo
    document.getElementById('painel-pre-analise').style.display = 'block';
    document.getElementById('painel-progresso').style.display = 'none';
    document.getElementById('painel-relatorio').style.display = 'none';

    modal.style.display = 'flex';
}

/**
 * Oculta o painel de pré-análise e exibe a barra de progresso do motor Stockfish.
 */
export function iniciarVisualizacaoProgresso() {
    document.getElementById('painel-pre-analise').style.display = 'none';
    document.getElementById('painel-progresso').style.display = 'block';
    atualizarProgresso(0, 1);
}

/**
 * Atualiza visualmente o indicador de progresso da análise da partida.
 * @param {number} lancesAnalisados - Quantidade de lances processados até o momento.
 * @param {number} totalLances - Quantidade total de lances na partida.
 */
export function atualizarProgresso(lancesAnalisados, totalLances) {
    const percentagem = Math.round((lancesAnalisados / totalLances) * 100);
    const barra = document.getElementById('barra-progresso-fill');
    const texto = document.getElementById('texto-progresso');
    
    if (barra) barra.style.width = percentagem + '%';
    if (texto) texto.innerText = `${lancesAnalisados} / ${totalLances} lances analisados`;
}

/**
 * Apresenta o relatório final formatado com a precisão e classificação de todos os lances avaliados.
 * @param {Object} resultadosPorCor - Objeto particionado (w, b) contendo as agregações estatísticas.
 * @param {Array<string>} classificacaoPassoAPasso - Array com as categorias (brilhante, erro, etc.) de cada lance.
 * @param {Array<number>} avaliacoesAbsolutas - Histórico de variações de score centipawn por lance.
 */
export function exibirRelatorioFinal(resultadosPorCor, classificacaoPassoAPasso, avaliacoesAbsolutas) {
    const painelRelatorio = document.getElementById('painel-relatorio');
    
    // Prevenção de falha: Verifica se o DOM do analisador já foi devidamente injetado
    if (!painelRelatorio) {
        console.error("Erro: O HTML do analisador ainda não foi carregado.");
        return;
    }

    const painelProgresso = document.getElementById('painel-progresso');
    const painelPre = document.getElementById('painel-pre-analise');
    
    if (painelProgresso) painelProgresso.style.display = 'none';
    if (painelPre) painelPre.style.display = 'none';
    
    painelRelatorio.style.display = 'block';

    // Tratamento defensivo (Fallback): Prevenção contra objetos vazios ou propriedades indefinidas
    const resW = (resultadosPorCor && resultadosPorCor.w) ? resultadosPorCor.w : { precisaoFinal: 0, brilhante: 0, uau: 0, otima: 0, ok: 0, impreciso: 0, mal: 0, pessima: 0 };
    const resB = (resultadosPorCor && resultadosPorCor.b) ? resultadosPorCor.b : { precisaoFinal: 0, brilhante: 0, uau: 0, otima: 0, ok: 0, impreciso: 0, mal: 0, pessima: 0 };

    // Inserção da precisão global formatada
    const wPreEl = document.getElementById('w-precisao');
    const bPreEl = document.getElementById('b-precisao');
    if (wPreEl) wPreEl.innerText = resW.precisaoFinal + '%';
    if (bPreEl) bPreEl.innerText = resB.precisaoFinal + '%';

    // Inserção iterativa dos contadores por categoria
    const categorias = ['brilhante', 'uau', 'otima', 'ok', 'impreciso', 'mal', 'pessima'];
    
    categorias.forEach(cat => {
        const elW = document.getElementById(`w-${cat}`);
        const elB = document.getElementById(`b-${cat}`);
        if (elW) elW.innerText = resW[cat] || 0;
        if (elB) elB.innerText = resB[cat] || 0;
    });

    // Configuração do gatilho para o modo de revisão interativa
    const btnRever = document.getElementById('btn-rever-lances');
    if (btnRever) {
        btnRever.onclick = () => {
            document.getElementById('modal-fim-jogo').style.display = 'none';
            iniciarModoRevisao(classificacaoPassoAPasso || [], avaliacoesAbsolutas || []);
        };
    }
}

/**
 * Conecta o callback de execução da análise profunda ao botão correspondente na UI.
 * @param {Function} callbackAnalisar - Função de callback disparada quando a análise é solicitada.
 */
export function configurarBotaoAnalise(callbackAnalisar) {
    const btnIniciar = document.getElementById('btn-iniciar-analise');
    if (btnIniciar) {
        btnIniciar.onclick = () => {
            iniciarVisualizacaoProgresso();
            callbackAnalisar();
        };
    }
}
