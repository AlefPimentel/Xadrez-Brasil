// Script/revisao/revisao.js

import { historico, modoPresencial, corJogador } from '../regras/regrasfuncionalidade.js';
import { injetarBarraRevisao, atualizarIndicadorRevisao } from './revisao_view.js';
import { pieceImages } from '../jsview/pecas.js'; 
import { atualizarBarraVisual, tocarSom } from '../jsview/interface.js'; 
import { verificarXeque } from '../regras/regrasmovimento.js';
import { formatarTempo } from '../relogio/relogio.js'; 

/**
 * Estado global do Módulo de Revisão.
 * Mantém os arrays de avaliação, o ponteiro de navegação e a cache do estado material.
 */
let classificacoes = [];
let avaliacoes = []; 
let indiceAtual = 0;
let totalLances = 0;
let pecasVivasAnterior = null; 

/**
 * Mapeamento hierárquico do valor relativo das peças.
 * Utilizado para a ordenação visual das peças capturadas nos HUDs.
 * @constant {Object}
 */
const pesoPecas = { 'Q': 9, 'R': 5, 'B': 3, 'N': 3, 'P': 1 };

/**
 * Inicializa a máquina de estados do Modo Revisão e adapta a interface do utilizador.
 * @param {Array<string>} classificacaoPassoAPasso - Array com as categorias avaliativas de cada lance.
 * @param {Array<number>} avaliacoesAbsolutas - Array com as pontuações do motor em centipawns.
 */
export function iniciarModoRevisao(classificacaoPassoAPasso, avaliacoesAbsolutas) {
    classificacoes = classificacaoPassoAPasso;
    avaliacoes = avaliacoesAbsolutas; 
    
    totalLances = historico.posicoesPassadas.length - 1;
    indiceAtual = 0; 
    pecasVivasAnterior = null; 

    // Avaliação condicional: Determina se a partida a ser revista é local (Pass-and-Play) 
    // com base na injeção global (configHistorico) ou no estado do jogo atual.
    const isPresencial = window.configHistorico ? window.configHistorico.modoPresencial : modoPresencial;

    if (isPresencial) {
        const nomeBottom = document.getElementById('name-bottom');
        const imgBottom = document.getElementById('avatar-bottom');
        const ratingBottom = document.getElementById('rating-bottom');
        const relogioW = document.getElementById('clock-w');
        const boxW = document.getElementById('captured-by-w');
        
        const nomeTop = document.getElementById('name-top');
        const imgTop = document.getElementById('avatar-top');
        const ratingTop = document.getElementById('rating-top');
        const relogioB = document.getElementById('clock-b');
        const boxB = document.getElementById('captured-by-b');
        
        const divDirTop = document.getElementById('hud-top-container')?.lastElementChild;
        const divDirBottom = document.getElementById('hud-bottom-container')?.lastElementChild;

        if (nomeBottom && nomeTop && divDirTop && divDirBottom) {
            
            // Salvaguarda de identidade: Protege a renderização dos nomes reais 
            // caso a partida seja importada via PGN ou carregada do Histórico.
            if (!window.configHistorico) {
                let myName = localStorage.getItem('nomeJogador') || 'Convidado';
                let myRating = localStorage.getItem('ratingJogador') || '(800)';
                let myImg = localStorage.getItem('imgJogador') || '/img/img_padrao.jpg';
                
                nomeBottom.innerText = myName; 
                if (ratingBottom) ratingBottom.innerText = myRating; 
                imgBottom.src = myImg;
                
                nomeTop.innerText = 'Jogador 2'; 
                if (ratingTop) ratingTop.innerText = '(800)'; 
                imgTop.src = '/img/img_padrao.jpg';
            }

            // Reposicionamento estrutural dos nós do DOM para refletir a perspetiva correta
            divDirBottom.appendChild(boxW);
            divDirBottom.appendChild(relogioW);
            divDirTop.appendChild(boxB);
            divDirTop.appendChild(relogioB);
        }
    }

    // Injeção dos controlos de navegação e renderização do estado inicial (Ply 0)
    injetarBarraRevisao(irParaInicio, voltarLance, avancarLance, irParaFim);
    mostrarPosicaoAtual();

    // Registo do listener de roteamento de saída
    const btnVoltar = document.querySelector('.btn-voltar');
    if (btnVoltar) {
        btnVoltar.onclick = (e) => {
            e.preventDefault();
            sairModoRevisaoParaRelatorio();
        };
    }
}

/**
 * Desmonta a interface do Modo Revisão e restaura a visibilidade do Relatório de Análise.
 * Gere o roteamento final caso o utilizador decida fechar o modal.
 */
function sairModoRevisaoParaRelatorio() {
    const modal = document.getElementById('modal-fim-jogo');
    if (modal) modal.style.display = 'flex'; 

    const barraRevisao = document.getElementById('review-control-bar');
    if (barraRevisao) barraRevisao.style.display = 'none'; 

    const voltarDefinitivo = (e) => {
        e.preventDefault();
        // Roteamento condicional baseado na origem de navegação
        if(localStorage.getItem('indexHistoricoAnalisado') !== null) {
            window.location.href = 'historico.html';
        } else {
            window.location.href = '../index.html';
        }
    };

    const btnVoltar = document.querySelector('.btn-voltar');
    if (btnVoltar) btnVoltar.onclick = voltarDefinitivo;

    const btnSairModal = document.querySelector('.btn-modal-sair');
    if (btnSairModal) btnSairModal.onclick = voltarDefinitivo;

    // Reposiciona o ponteiro no final da partida ao sair
    indiceAtual = totalLances;
    mostrarPosicaoAtual();
}

/**
 * Sincroniza a camada visual (Tabuleiro, Avaliação e Relógios) com o estado lógico 
 * indexado pelo ponteiro atual de navegação.
 */
function mostrarPosicaoAtual() {
    let perspetiva = modoPresencial ? 'w' : corJogador;
    
    if (window.configHistorico) {
        perspetiva = window.configHistorico.modoPresencial ? 'w' : window.configHistorico.corJogador;
    }

    const fotoString = historico.posicoesPassadas[indiceAtual];
    
    if (fotoString) {
        desenharTabuleiroPelaFotografia(fotoString, perspetiva);
    }

    // Alinhamento geométrico do tabuleiro consoante a facção do utilizador local
    const board = document.getElementById("chessboard");
    if (board) {
        if (perspetiva === 'b') board.style.transform = "rotate(180deg)";
        else board.style.transform = "rotate(0deg)";
    }

    let nota = null;
    if (indiceAtual > 0) nota = classificacoes[indiceAtual - 1]; 

    atualizarIndicadorRevisao(nota, indiceAtual, totalLances);

    // Gestão dinâmica de renderização cronométrica do estado passado
    const relogioW = document.getElementById('clock-w');
    const relogioB = document.getElementById('clock-b');
    
    if (relogioW && relogioB) {
        relogioW.style.display = 'block'; 
        relogioB.style.display = 'block';

        if (historico.temposPassados && historico.temposPassados[indiceAtual]) {
            const tempoAgora = historico.temposPassados[indiceAtual];
            if (tempoAgora === null) {
                relogioW.innerText = "∞";
                relogioB.innerText = "∞";
            } else {
                relogioW.innerText = formatarTempo(tempoAgora.w);
                relogioB.innerText = formatarTempo(tempoAgora.b);
            }
        } else {
            relogioW.innerText = "∞";
            relogioB.innerText = "∞";
        }
    }

    // Processamento matemático do score e renderização da barra de avaliação (Eval Bar)
    let evalScore = avaliacoes[indiceAtual] || 0;
    let tipo = 'cp'; 
    let vantagem = evalScore;

    if (Math.abs(evalScore) > 9000) {
        tipo = 'mate';
        vantagem = evalScore > 0 ? (10000 - evalScore) : (-10000 - evalScore);
    }

    document.getElementById('eval-container').style.display = 'flex';
    atualizarBarraVisual(tipo, vantagem, "");
}

/**
 * Reconstrói o DOM do tabuleiro interpretando uma string codificada (snapshot).
 * Calcula dinamicamente o material capturado por diferencial cruzado e aciona eventos sonoros baseados na transição de estado.
 * @param {string} fotoStr - O snapshot estruturado (ex: 'w|1111|rnbqk...').
 * @param {string} perspetiva - Orientação visual necessária para rotação interna das peças ('w' ou 'b').
 */
function desenharTabuleiroPelaFotografia(fotoStr, perspetiva) {
    const partes = fotoStr.split('|');
    if (partes.length < 3) return; 
    
    const turnoAtual = partes[0]; 
    const posicoes = partes[2]; 
    let cursorStr = 0;
    const colunas = ['a','b','c','d','e','f','g','h'];

    // Sanitização das classes de interação (Reset da UI)
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('last-move', 'selected', 'valid-move', 'in-check', 'check', 'xeque');
        sq.style.backgroundColor = ''; 
    });

    const rotacaoPeca = perspetiva === 'b' ? 'rotate(180deg)' : 'rotate(0deg)';

    // Inventário do material ativo na iteração atual
    let pecasVivasAtuais = {
        'wQ': 0, 'wR': 0, 'wB': 0, 'wN': 0, 'wP': 0,
        'bQ': 0, 'bR': 0, 'bB': 0, 'bN': 0, 'bP': 0
    };

    let estadoSimulado = {};

    // Reconstrução matricial a partir da string linear
    for (let linha = 8; linha >= 1; linha--) {
        for (let col = 0; col < 8; col++) {
            const id = colunas[col] + linha;
            const casa = document.getElementById(id);
            if (casa) {
                if (posicoes[cursorStr] === '-') {
                    casa.innerHTML = '';
                    cursorStr += 1;
                } else {
                    const pecaCodigo = posicoes.substr(cursorStr, 2);
                    casa.innerHTML = `<img src="${pieceImages[pecaCodigo]}" class="piece" style="transform: ${rotacaoPeca};" alt="${pecaCodigo}">`;
                    
                    estadoSimulado[id] = pecaCodigo; 

                    if (pecaCodigo[1] !== 'K') {
                        if (!pecasVivasAtuais[pecaCodigo]) pecasVivasAtuais[pecaCodigo] = 0;
                        pecasVivasAtuais[pecaCodigo]++;
                    }
                    
                    cursorStr += 2;
                }
            }
        }
    }

    // Cálculo do material capturado via Diferencial Estático (Exército Base vs Inventário Atual)
    const exercitoBase = { 'Q': 1, 'R': 2, 'B': 2, 'N': 2, 'P': 8 };
    let mortosBrancos = [];
    let mortosPretos = [];

    Object.keys(exercitoBase).forEach(tipo => {
        let baixasW = Math.max(0, exercitoBase[tipo] - (pecasVivasAtuais['w' + tipo] || 0));
        let baixasB = Math.max(0, exercitoBase[tipo] - (pecasVivasAtuais['b' + tipo] || 0));

        for(let i=0; i<baixasW; i++) mortosBrancos.push('w' + tipo);
        for(let i=0; i<baixasB; i++) mortosPretos.push('b' + tipo);
    });

    // Ordenação semântica baseada no peso do material capturado
    mortosBrancos.sort((a, b) => pesoPecas[b.charAt(1)] - pesoPecas[a.charAt(1)]);
    mortosPretos.sort((a, b) => pesoPecas[b.charAt(1)] - pesoPecas[a.charAt(1)]);

    redesenharCaixaRevisao('captured-by-w', mortosPretos);
    redesenharCaixaRevisao('captured-by-b', mortosBrancos);

    // Validação de Xeque para aplicação de formatação de perigo na UI
    const emXeque = verificarXeque(turnoAtual, estadoSimulado);

    if (emXeque) {
        for (let idCasa in estadoSimulado) {
            if (estadoSimulado[idCasa] === turnoAtual + 'K') {
                const casaRei = document.getElementById(idCasa);
                if (casaRei) casaRei.classList.add('in-check');
                break;
            }
        }
    }

    // Motor de Feedback Auditivo: Aciona o som correspondente comparando o estado anterior com o atual
    if (indiceAtual > 0 && pecasVivasAnterior) {
        let houveCaptura = false;
        Object.keys(pecasVivasAtuais).forEach(peca => {
            let vivosAntes = pecasVivasAnterior[peca] || 0;
            let vivosAgora = pecasVivasAtuais[peca] || 0;
            if (vivosAgora < vivosAntes) houveCaptura = true;
        });

        const ehUltimoLance = (indiceAtual === totalLances);

        if (ehUltimoLance && emXeque) {
            tocarSom('fim'); 
        } else if (emXeque) {
            tocarSom('xeque'); 
        } else if (houveCaptura) {
            tocarSom('capturar');
        } else {
            tocarSom('mover');
        }
    }

    // Persiste o inventário visual da iteração atual para permitir análise diferencial no próximo passo
    pecasVivasAnterior = JSON.parse(JSON.stringify(pecasVivasAtuais));
}

/**
 * Rotina utilitária de injeção no DOM para renderização do inventário de material capturado.
 * @param {string} idContainer - ID do nó de destino.
 * @param {Array<string>} arrayDePecas - Lista contendo os identificadores das peças eliminadas.
 */
function redesenharCaixaRevisao(idContainer, arrayDePecas) {
    const container = document.getElementById(idContainer);
    if (!container) return;
    container.innerHTML = ''; 
    arrayDePecas.forEach(codigo => {
        const img = document.createElement('img');
        img.src = pieceImages[codigo];
        container.appendChild(img);
    });
}

// Controladores de navegação temporal do visualizador de partida
function irParaInicio() { indiceAtual = 0; mostrarPosicaoAtual(); }
function voltarLance() { if (indiceAtual > 0) { indiceAtual--; mostrarPosicaoAtual(); } }
function avancarLance() { if (indiceAtual < totalLances) { indiceAtual++; mostrarPosicaoAtual(); } }
function irParaFim() { indiceAtual = totalLances; mostrarPosicaoAtual(); }
