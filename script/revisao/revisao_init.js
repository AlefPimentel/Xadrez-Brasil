// Script/revisao/revisao_init.js

import { createBoard } from '../jsview/tabuleiro.js';
import { travarTabuleiro } from '../movimento.js';
import { historico } from '../regras/regrasfuncionalidade.js';
import { iniciarModoRevisao } from './revisao.js';
import { iniciarAnaliseCompleta } from '../analisador/analisador_partida.js';

/**
 * Inicializa o ambiente de revisão, orquestrando a montagem do tabuleiro e a restauração do estado histórico.
 * Configura o contexto global para garantir que o motor de renderização respeita os parâmetros da partida importada.
 * @param {Object} partida - Payload serializado contendo metadados, lances UCI e snapshots da partida.
 */
export function carregarModoRevisao(partida) {
    // Injeção de configuração global estática para orientar o renderizador presencial/perspetiva
    window.configHistorico = {
        corJogador: partida.corJogador,
        modoPresencial: partida.modoPresencial
    };
    
    // Instanciação e bloqueio interativo do tabuleiro (Read-only mode)
    createBoard();
    travarTabuleiro();
    
    // População da estrutura de dados do histórico na memória global
    historico.uci = partida.lancesUCI;
    historico.posicoesPassadas = partida.posicoes;
    historico.temposPassados = partida.tempos || []; 
    
    // Sincronização assíncrona do DOM para garantir a renderização prévia dos nós de UI
    setTimeout(() => {
        const nomeTop = document.getElementById('name-top');
        const imgTop = document.getElementById('avatar-top');
        const ratingTop = document.getElementById('rating-top');
        const nomeBottom = document.getElementById('name-bottom');
        const imgBottom = document.getElementById('avatar-bottom');
        const ratingBottom = document.getElementById('rating-bottom');

        // Resolução e injeção de metadados dos jogadores
        if (nomeBottom) nomeBottom.innerText = partida.nomePlayer;
        if (imgBottom && partida.imgPlayer) imgBottom.src = partida.imgPlayer;
        if (ratingBottom) ratingBottom.innerText = partida.ratingPlayer || "(800)";

        if (nomeTop) nomeTop.innerText = partida.oponente;
        if (imgTop && partida.imgOponente) imgTop.src = partida.imgOponente;
        if (ratingTop) ratingTop.innerText = partida.ratingOponente || "(?)";

        // Mapeamento e transposição estrutural dos elementos do HUD com base na perspetiva
        const divDirTop = document.getElementById('hud-top-container')?.lastElementChild;
        const divDirBottom = document.getElementById('hud-bottom-container')?.lastElementChild;
        const relogioW = document.getElementById('clock-w');
        const relogioB = document.getElementById('clock-b');
        const boxW = document.getElementById('captured-by-w');
        const boxB = document.getElementById('captured-by-b');

        if (divDirTop && divDirBottom && relogioW && relogioB && boxW && boxB) {
            if (!partida.modoPresencial && partida.corJogador === 'b') {
                divDirBottom.appendChild(boxB);
                divDirBottom.appendChild(relogioB);
                divDirTop.appendChild(boxW);
                divDirTop.appendChild(relogioW);
            } else {
                divDirBottom.appendChild(boxW);
                divDirBottom.appendChild(relogioW);
                divDirTop.appendChild(boxB);
                divDirTop.appendChild(relogioB);
            }
        }
    }, 150);

    abrirModalRevisao(partida);
}

/**
 * Controla a máquina de estados do Modal de Revisão/Relatório.
 * Gere o roteamento dinâmico entre o sumário de uma partida já analisada e a orquestração do Web Worker para novas análises.
 * @param {Object} partida - Objeto de dados da partida carregada.
 */
function abrirModalRevisao(partida) {
    const modal = document.getElementById('modal-fim-jogo');
    const tituloModal = document.getElementById('titulo-fim-jogo');
    const motivoModal = document.getElementById('motivo-fim-jogo');
    const painelPre = document.getElementById('painel-pre-analise');
    const painelProg = document.getElementById('painel-progresso');
    const painelRel = document.getElementById('painel-relatorio');

    if (modal) modal.style.display = 'flex';
    if (tituloModal) tituloModal.innerText = "Detalhes da Partida";
    if (motivoModal) motivoModal.innerText = `${partida.resultado} contra ${partida.oponente}`;

    // Configuração do protocolo de roteamento de saída
    const sairParaHistorico = (e) => { e.preventDefault(); window.location.href = 'historico.html'; };
    document.querySelectorAll('.btn-modal-sair, .btn-voltar').forEach(btn => {
        btn.removeAttribute('href');
        btn.onclick = sairParaHistorico;
    });

    // Reset aos estados de visibilidade dos subcomponentes
    if (painelPre) painelPre.style.display = 'none';
    if (painelProg) painelProg.style.display = 'none';
    if (painelRel) painelRel.style.display = 'none';

    // Ramificação lógica: Fluxo de Exibição (Partida já processada) vs Fluxo de Análise (Partida virgem)
    if (partida.analisada) {
        if (painelRel) painelRel.style.display = 'block';
        
        let wCounts = { brilhante: 0, uau: 0, otima: 0, ok: 0, impreciso: 0, mal: 0, pessima: 0 };
        let bCounts = { brilhante: 0, uau: 0, otima: 0, ok: 0, impreciso: 0, mal: 0, pessima: 0 };

        // Agregação iterativa do vetor de classificações
        if (partida.memoriaNotas) {
            partida.memoriaNotas.forEach((nota, index) => {
                if (!nota) return;
                if (index % 2 === 0) wCounts[nota] = (wCounts[nota] || 0) + 1;
                else bCounts[nota] = (bCounts[nota] || 0) + 1;
            });
        }

        const resPorCor = { 
            w: { precisaoFinal: partida.precisaoW, ...wCounts }, 
            b: { precisaoFinal: partida.precisaoB, ...bCounts } 
        };

        // Carregamento assíncrono do módulo de View do Analisador
        import('../analisador/analisador_view.js').then(m => m.exibirRelatorioFinal(resPorCor, partida.memoriaNotas, partida.memoriaAvaliacoes));

        const btnVerTabuleiro = document.getElementById('btn-rever-lances');
        if (btnVerTabuleiro) {
            btnVerTabuleiro.onclick = () => {
                modal.style.display = 'none'; 
                iniciarModoRevisao(partida.memoriaNotas, partida.memoriaAvaliacoes); 
            };
        }

    } else {
        if (painelPre) painelPre.style.display = 'block';

        const btnAnalisarVerde = document.getElementById('btn-iniciar-analise');
        if (btnAnalisarVerde) {
            btnAnalisarVerde.onclick = () => {
                if (painelPre) painelPre.style.display = 'none';
                if (painelProg) painelProg.style.display = 'block';
                
                if (tituloModal) tituloModal.innerText = "A analisar...";
                if (motivoModal) motivoModal.innerText = "Processamento do motor heurístico em curso...";

                import('../analisador/analisador_view.js').then(m => m.iniciarVisualizacaoProgresso());
                setTimeout(() => { iniciarAnaliseCompleta(historico.uci); }, 500);

                // Polling assíncrono para monitorização da conclusão do pipeline de análise
                const checkFim = setInterval(() => {
                    if (painelProg && painelProg.style.display === 'none') {
                        clearInterval(checkFim);
                        if (tituloModal) tituloModal.innerText = "Relatório de Precisão";
                        if (motivoModal) motivoModal.innerText = "Avaliação algorítmica concluída com sucesso!";
                        
                        // Atualização em tempo real do estado a partir da persistência local
                        const histAtualizado = JSON.parse(localStorage.getItem('historicoPartidas'));
                        const pAtual = histAtualizado[localStorage.getItem('indexHistoricoAnalisado') || 0];
                        
                        const btnVerTabuleiro = document.getElementById('btn-rever-lances');
                        if (btnVerTabuleiro) {
                            btnVerTabuleiro.onclick = () => {
                                modal.style.display = 'none';
                                iniciarModoRevisao(pAtual.memoriaNotas, pAtual.memoriaAvaliacoes);
                            };
                        }
                    }
                }, 500);
            };
        }
    }
}
