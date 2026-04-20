// Script/movimento.js

import { calcularMovimentosLegais, verificarFimDeJogo, atualizarTabuleiroVirtual, getFotografiaTabuleiro } from './regras/regras.js';
import { dispararFimDeJogo } from './acoes.js';
import { registrarMovimento, modoPresencial, corJogador, estadoGlobal, alterarTurno, encerrarJogo, novaOperacao, guardarFotografiaPosicao, historico } from './regras/regrasfuncionalidade.js';
import { criarIndicadorDeTurno, atualizarIndicadorDeTurno, atualizarEstadoDoXeque, removerSelecaoVisual, desenharPrevisaoMovimentos, anunciarFimDeJogo, abrirMenuPromocao, tocarSom, adicionarPecaCapturada, rotacionarTabuleiro, orientarTabuleiroInicial, configurarBarraAvaliacao, atualizarBarraVisual } from './jsview/interface.js';
import { pieceImages } from './jsview/pecas.js';
import { calcularJogadaBot } from './bot/bot.js';
import { passarTurnoRelogio, pausarRelogio, getTempo } from './relogio/relogio.js'; 
import { salvarInstantaneoDoJogo, inicializarBotoesAcoes } from './acoes.js';

import { iniciarAvaliacaoDaPosicao, pararAnalise } from './analisador/analisador.js';
import { prepararAnalisadorSombra, adicionarLanceParaAnalise } from './analisador/analisador_partida.js';

/**
 * Estado efémero de UI (User Interface).
 * Mantém a referência aos nós do DOM atualmente selecionados pelo utilizador.
 */
let pecaSelecionada = null;
let casaSelecionada = null;

/**
 * Trava interações no tabuleiro forçando o encerramento da máquina de estados global.
 */
export function travarTabuleiro() {
    encerrarJogo();
}

/**
 * Bootstrapper de Interatividade do Tabuleiro.
 * Inicializa a escuta de eventos (Event Delegation), prepara a orientação visual
 * e configura o pipeline de renderização paralela (Eval Bar e Shadow Analyzer).
 */
export function iniciarInteratividade() {
    const board = document.getElementById("chessboard");
    criarIndicadorDeTurno();
    atualizarTabuleiroVirtual();
    configurarBarraAvaliacao();
    prepararAnalisadorSombra();

    // Registo do estado zero (Initial State) para validação da regra de tripla repetição
    if (historico.posicoesPassadas.length === 0) {
        guardarFotografiaPosicao(getFotografiaTabuleiro(estadoGlobal.turnoAtual));
        historico.temposPassados = [getTempo()]; 
    }

    orientarTabuleiroInicial(modoPresencial ? 'w' : corJogador, modoPresencial);
   
    // Injeção de dependências bidirecionais nos controladores de ação
    inicializarBotoesAcoes(limparEstado, chamarBot);

    // Bootstrapping assíncrono da Avaliação Heurística (Eval Bar)
    if (localStorage.getItem('mostrarBarra') === 'on') {
        iniciarAvaliacaoDaPosicao(historico.uci, estadoGlobal.turnoAtual, (dadosDaAnalise) => {
            atualizarBarraVisual(dadosDaAnalise.tipo, dadosDaAnalise.vantagem, dadosDaAnalise.melhorLinha);
        });
    }

    // Delegação de eventos de clique centralizada no nó-pai (Board)
    board.addEventListener("click", (evento) => {
        // Bloqueio de inputs caso o jogo tenha terminado ou não seja o turno do humano local
        if (estadoGlobal.jogoAcabou || (!modoPresencial && estadoGlobal.turnoAtual !== corJogador)) return;

        let elementoClicado = evento.target;
        let casaClicada = elementoClicado.classList.contains("square") ? elementoClicado : elementoClicado.parentElement;

        // Prevenção de cliques fora das casas válidas (ex: margens do grid)
        if (!casaClicada || !casaClicada.classList.contains("square")) return;

        // Máquina de estados UI: Fase de Resolução (Destino)
        if (pecaSelecionada) {
            if (casaClicada === casaSelecionada) {
                limparEstado(); // Toggle off
                return;
            }
            if (casaClicada.classList.contains("valid-move")) {
                executarMovimentoFisico(casaSelecionada.id, casaClicada.id, pecaSelecionada);
            } else {
                limparEstado(); // Miss-click
            }
        }
        // Máquina de estados UI: Fase de Seleção (Origem)
        else {
            const peca = casaClicada.querySelector(".piece");
            if (peca) {
                // Validação de posse: Impede a seleção de peças inimigas
                if (peca.alt.charAt(0) !== estadoGlobal.turnoAtual) return;

                pecaSelecionada = peca;
                casaSelecionada = casaClicada;
                casaClicada.classList.add("selected");

                const movimentos = calcularMovimentosLegais(casaClicada.id, peca.alt);
                desenharPrevisaoMovimentos(movimentos);
            }
        }
    });

    // Disparo imediato da IA caso as Pretas iniciem a partida (Edge Case de Setup)
    if (!modoPresencial && corJogador === 'b' && estadoGlobal.turnoAtual === 'w') {
        chamarBot();
    }
}

/**
 * Orquestrador da resposta da Inteligência Artificial.
 * Encapsula a invocação do bot com proteção contra condições de corrida (Race Conditions) e aplica latência artificial.
 */
function chamarBot() {
    let operacaoAtual = estadoGlobal.idOperacao;
    calcularJogadaBot((jogadaDoBot) => {
        // Interrompe a execução caso o contexto do jogo tenha mudado (ex: o utilizador fez Undo)
        if (estadoGlobal.jogoAcabou || operacaoAtual !== estadoGlobal.idOperacao) return;

        // Latência artificial para UX (permite que o utilizador compreenda o fluxo)
        setTimeout(() => {
            if (estadoGlobal.jogoAcabou || operacaoAtual !== estadoGlobal.idOperacao) return;
            const casaOrigemBot = document.getElementById(jogadaDoBot.origem);
            const pecaHTMLDoBot = casaOrigemBot.querySelector('.piece');
            executarMovimentoFisico(jogadaDoBot.origem, jogadaDoBot.destino, pecaHTMLDoBot, jogadaDoBot.promocao);
        }, 600);
    });
}

/**
 * Mutador de DOM (DOM Mutator).
 * Executa as transformações visuais da jogada, trata de exceções geométricas e engatilha o Post-Move Hook.
 * @param {string} origemId - ID algébrico da casa de partida.
 * @param {string} destinoId - ID algébrico da casa alvo.
 * @param {HTMLElement} elementoPeca - O nó da imagem da peça no DOM.
 * @param {string|null} promocaoBot - Letra indicativa da peça de promoção (se aplicável ao Bot).
 */
function executarMovimentoFisico(origemId, destinoId, elementoPeca, promocaoBot = null) {
    salvarInstantaneoDoJogo();
    novaOperacao();

    const casaOrigem = document.getElementById(origemId);
    const casaDestino = document.getElementById(destinoId);
    const pecaCodigo = elementoPeca.alt;
    const ehPeao = pecaCodigo.charAt(1) === 'P';
    const ehRei = pecaCodigo.charAt(1) === 'K';

    let foiCaptura = false;

    // Resolução de Exceção Geométrica 1: Captura En Passant
    const casaDestinoVazia = !casaDestino.querySelector('.piece');
    if (ehPeao && casaDestinoVazia && origemId.charAt(0) !== destinoId.charAt(0)) {
        const idInimigoCapturado = `${destinoId.charAt(0)}${origemId.charAt(1)}`;
        const casaInimigo = document.getElementById(idInimigoCapturado);
        if (casaInimigo && casaInimigo.querySelector('.piece')) {
            const pecaRemovida = casaInimigo.querySelector('.piece');
            casaInimigo.removeChild(pecaRemovida);
            adicionarPecaCapturada(pecaRemovida.alt);
            foiCaptura = true;
        }
    }

    // Resolução de Exceção Geométrica 2: Mutação Acoplada para Roque (Castling)
    if (ehRei && Math.abs(origemId.charCodeAt(0) - destinoId.charCodeAt(0)) === 2) {
        const linha = destinoId.charAt(1);
        if (destinoId.charAt(0) === 'g') {
            document.getElementById(`f${linha}`).appendChild(document.getElementById(`h${linha}`).querySelector('.piece'));
        } else if (destinoId.charAt(0) === 'c') {
            document.getElementById(`d${linha}`).appendChild(document.getElementById(`a${linha}`).querySelector('.piece'));
        }
    }

    // Processamento de Captura Padrão
    const pecaDestino = casaDestino.querySelector(".piece");
    if (pecaDestino) {
        casaDestino.removeChild(pecaDestino);
        adicionarPecaCapturada(pecaDestino.alt);
        foiCaptura = true;
    }
    
    // Mutação Base: Translação do nó da peça
    casaDestino.appendChild(elementoPeca);

    // Resolução de Exceção Geométrica 3: Interceção de Promoção
    const chegouAoFim = (destinoId.charAt(1) === '8' || destinoId.charAt(1) === '1');
    if (ehPeao && chegouAoFim) {
        if (!modoPresencial && estadoGlobal.turnoAtual !== corJogador && promocaoBot) {
            // Resolução automática se for o Bot a promover
            const novoCodigo = estadoGlobal.turnoAtual + promocaoBot.toUpperCase();
            elementoPeca.alt = novoCodigo;
            elementoPeca.src = pieceImages[novoCodigo];
            finalizarJogada(origemId, destinoId, novoCodigo, foiCaptura, promocaoBot.toUpperCase());
        } else {
            // Disparo de UI obstrutiva para resolução manual (Humano)
            abrirMenuPromocao(estadoGlobal.turnoAtual, (escolha) => {
                const novoCodigo = estadoGlobal.turnoAtual + escolha;
                elementoPeca.alt = novoCodigo;
                elementoPeca.src = pieceImages[novoCodigo];
                finalizarJogada(origemId, destinoId, novoCodigo, foiCaptura, escolha);
            });
        }
    } else {
        // Fluxo padrão
        finalizarJogada(origemId, destinoId, pecaCodigo, foiCaptura, null);
    }

    limparEstado();
}

/**
 * Purge de UI State. Limpa os highlights e liberta as referências de memória locais.
 */
function limparEstado() {
    removerSelecaoVisual();
    pecaSelecionada = null;
    casaSelecionada = null;
}

/**
 * Post-Move Hook (State Commit).
 * Atualiza todas as métricas sistémicas subjacentes (memória, relógio, verificação de xeque e avaliação de engine).
 * @param {string} origem - ID da casa inicial.
 * @param {string} destino - ID da casa final.
 * @param {string} pecaFinalCodigo - Código da peça na casa final (pode ter mudado por promoção).
 * @param {boolean} foiCaptura - Flag sinalizadora de eliminação de material.
 * @param {string|null} codigoPromocao - Código de eventual promoção registada.
 */
function finalizarJogada(origem, destino, pecaFinalCodigo, foiCaptura, codigoPromocao) {
    
    // Commit das transações lógicas
    registrarMovimento(origem, destino, pecaFinalCodigo, codigoPromocao, foiCaptura);
    atualizarTabuleiroVirtual();

    // Rastreio visual do último movimento (Highlighter UI)
    document.querySelectorAll('.last-move').forEach(casa => casa.classList.remove('last-move'));
    const casaOrigem = document.getElementById(origem);
    const casaDestino = document.getElementById(destino);
    if (casaOrigem) casaOrigem.classList.add('last-move');
    if (casaDestino) casaDestino.classList.add('last-move');

    // Transição da Máquina de Estados (Turno)
    alterarTurno(estadoGlobal.turnoAtual === 'w' ? 'b' : 'w');
    atualizarIndicadorDeTurno(estadoGlobal.turnoAtual);

    guardarFotografiaPosicao(getFotografiaTabuleiro(estadoGlobal.turnoAtual));
    
    // Evento visual local (Pass-and-Play)
    rotacionarTabuleiro(estadoGlobal.turnoAtual, modoPresencial);
    
    // Delegação temporal
    passarTurnoRelogio(estadoGlobal.turnoAtual); 

    // Registo no snapshot cronométrico
    if (!historico.temposPassados) historico.temposPassados = [];
    historico.temposPassados.push(getTempo());

    // Pipeline de validação de Fim de Jogo e Perigos (Xeques)
    const deuXeque = atualizarEstadoDoXeque();
    const statusFim = verificarFimDeJogo(estadoGlobal.turnoAtual);

    // Alimentação da queue assíncrona do Worker Sombra
    adicionarLanceParaAnalise(historico.uci);

    // Resolução Terminais
    if (statusFim.acabou) {
        let titulo = "Fim de Partida";
        let motivo = "";
        let corVencedora = estadoGlobal.turnoAtual === 'w' ? 'Pretas' : 'Brancas';

        switch (statusFim.razao) {
            case 'mate': motivo = `Xeque-Mate! Vitória das ${corVencedora}.`; break;
            case 'afogamento': motivo = "Empate por Afogamento. O Rei não tem movimentos legais."; break;
            case '50-movimentos': motivo = "Empate: Regra dos 50 movimentos sem captura."; break;
            case 'repeticao': motivo = "Empate por Tripla Repetição de Posição."; break;
            case 'material': motivo = "Empate: Material Insuficiente para Xeque-Mate."; break;
            default: motivo = "A partida terminou.";
        }

        encerrarJogo();
        pausarRelogio();
        pararAnalise(); 
        anunciarFimDeJogo(estadoGlobal.turnoAtual, statusFim.razao);
        dispararFimDeJogo(titulo, motivo);

    } else {
        // Feedback Sonoro Dinâmico (Haptic/Audio)
        if (deuXeque) tocarSom('xeque');
        else if (foiCaptura) tocarSom('capturar');
        else tocarSom('mover');

        // Renovação do processamento da Barra de Avaliação (Eval Bar)
        if (localStorage.getItem('mostrarBarra') === 'on') {
            iniciarAvaliacaoDaPosicao(historico.uci, estadoGlobal.turnoAtual, (dadosDaAnalise) => {
                atualizarBarraVisual(dadosDaAnalise.tipo, dadosDaAnalise.vantagem, dadosDaAnalise.melhorLinha);
            });
        }

        // Loop principal: Se o jogo continua e o próximo é o Bot, dispara o worker.
        if (!modoPresencial && !estadoGlobal.jogoAcabou && estadoGlobal.turnoAtual !== corJogador) {
            chamarBot();
        }
    }
}
