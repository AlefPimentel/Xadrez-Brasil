// Script/acoes.js

import { estadoGlobal, encerrarJogo, novaOperacao, retirarDaPilha, salvarNaPilha, modoPresencial, corJogador, setHistorico, historico, setEstadoGlobalTurno } from './regras/regrasfuncionalidade.js';
import { atualizarTabuleiroVirtual } from './regras/regras.js';
import { pausarRelogio, getTempo, setTempo } from './relogio/relogio.js';
import { rotacionarTabuleiro, atualizarIndicadorDeTurno, getCapturadas, setCapturadas, atualizarBarraVisual, configurarPerfisJogador } from './jsview/interface.js';
import { iniciarAvaliacaoDaPosicao, pararAnalise } from './analisador/analisador.js';
import { exibirModalFimDeJogo, configurarBotaoAnalise, injetarViewAnalisador } from './analisador/analisador_view.js';
import { iniciarAnaliseCompleta, prepararAnalisadorSombra, sincronizarHistoricoAposDesfazer } from './analisador/analisador_partida.js';

import { getBotPorNivel } from '../classe/model_bots.js'; 
import { Player } from '../classe/player.js'; 
import { calcularVariacaoRating } from './regras/rating.js'; 

// Variáveis de controlo de estado local e callbacks de injeção
let callbackLimparEstado = null; 
let callbackChamarBot = null; 
let modalDisparado = false; 
let emViagemNoTempo = false; 

/**
 * Bootstrapper do módulo de Ações. 
 * Conecta os Event Listeners da UI aos manipuladores de estado global e injeta dependências assíncronas.
 * @param {Function} funcaoLimparEstado - Callback para purgar o estado visual de seleção no DOM.
 * @param {Function} funcaoChamarBot - Callback para acionar a engine iterativa (Stockfish) no turno do bot.
 */
export function inicializarBotoesAcoes(funcaoLimparEstado, funcaoChamarBot) {
    injetarViewAnalisador(); 
    prepararAnalisadorSombra(); 
    configurarPerfisJogador(modoPresencial, corJogador);

    callbackLimparEstado = funcaoLimparEstado;
    callbackChamarBot = funcaoChamarBot;
    
    // Vinculação de eventos via Optional Chaining para tolerância a falhas na UI
    document.getElementById("btn-undo")?.addEventListener("click", desfazerJogada);
    document.getElementById("btn-resign")?.addEventListener("click", desistir);
}

/**
 * Compila a telemetria da partida atual, executa o motor de cálculo Elo (se aplicável)
 * e persiste o payload final no vetor histórico do LocalStorage.
 * @param {string} motivo - Descritivo textual da condição de término da partida.
 */
function salvarPartidaNoHistorico(motivo) {
    const nomeJogador = localStorage.getItem('nomeJogador') || "Visitante";
    const imgJogador = localStorage.getItem('imgJogador') || "/img/img_padrao.jpg";

    let nomeAdversario = "Jogador 2";
    let imgAdversario = "/img/img_padrao.jpg";
    let ratingAdversario = "(800)";
    let ratingJogadorExibicao = `(${localStorage.getItem('ratingJogador') || "100"})`;

    // 1. Resolução do Vencedor (Match Outcome)
    let corJogLocal = modoPresencial ? 'w' : corJogador;
    let resultado = "Empate";

    if (motivo.includes("Vitória das Brancas") || motivo.includes("Xeque-Mate! Vitória das Brancas")) {
        resultado = (corJogLocal === 'w') ? "Vitória" : "Derrota";
    } else if (motivo.includes("Vitória das Pretas") || motivo.includes("Xeque-Mate! Vitória das Pretas")) {
        resultado = (corJogLocal === 'b') ? "Vitória" : "Derrota";
    }

    // 2. Aplicação de Algoritmo de Rating Elo (Exclusivo para Single Player)
    if (!modoPresencial) {
        const nivel = parseInt(localStorage.getItem('nivelBotXadrez')) || 1;
        const bot = getBotPorNivel(nivel); 
        
        nomeAdversario = bot.nome;
        imgAdversario = bot.foto; 
        ratingAdversario = `(${bot.rating})`; 

        // Normalização semântica do resultado para consumo na fórmula Elo
        let resultadoParaElo = "empate";
        if (resultado === "Vitória") resultadoParaElo = "vitoria";
        else if (resultado === "Derrota") resultadoParaElo = "derrota";

        // Instanciação do modelo Player e mutação do score persistente
        const jogador = new Player();
        const variacao = calcularVariacaoRating(jogador.rating, bot.rating, resultadoParaElo);
        
        jogador.alterarRating(variacao);
        
        // Atualização da string cacheada para exibição estática no Histórico
        ratingJogadorExibicao = `(${jogador.rating})`; 
    }

    // Sincronização e serialização do histórico temporal (Timestamps)
    let temposParaSalvar = historico.temposPassados ? [...historico.temposPassados] : [];
    if (temposParaSalvar.length > 0) {
        temposParaSalvar[temposParaSalvar.length - 1] = getTempo(); 
    }

    // Construção do Payload (Data Transfer Object) da partida
    const novaPartida = {
        id: Date.now().toString(), 
        data: new Date().toLocaleDateString('pt-PT'),
        nomePlayer: nomeJogador,
        oponente: nomeAdversario,
        imgPlayer: imgJogador,       
        imgOponente: imgAdversario, 
        ratingPlayer: ratingJogadorExibicao,
        ratingOponente: ratingAdversario,
        resultado: resultado, 
        corJogador: corJogLocal,
        modoPresencial: modoPresencial,
        lancesUCI: [...historico.uci], 
        posicoes: [...historico.posicoesPassadas], 
        tempos: temposParaSalvar,
        analisada: false, 
        precisaoW: null,
        precisaoB: null,
        memoriaNotas: null,
        memoriaAvaliacoes: null
    };

    // Commit no LocalStorage empurrando o nó para o início da stack (unshift)
    let listaHistorico = JSON.parse(localStorage.getItem('historicoPartidas')) || [];
    listaHistorico.unshift(novaPartida); 
    localStorage.setItem('historicoPartidas', JSON.stringify(listaHistorico));
}

/**
 * Interrompe globalmente o fluxo de execução (Relógio, Motor, Turnos),
 * aciona a persistência e exibe a interface de pós-jogo.
 * @param {string} titulo - Título do Modal de fim de jogo.
 * @param {string} motivo - Descritivo do desfecho.
 */
export function dispararFimDeJogo(titulo, motivo) {
    if (modalDisparado) return; 
    modalDisparado = true; 

    encerrarJogo();
    pausarRelogio();
    pararAnalise(); 

    salvarPartidaNoHistorico(motivo);

    exibirModalFimDeJogo(titulo, motivo);
    
    // Acoplamento do callback para inicialização da análise massiva
    configurarBotaoAnalise(() => {
        iniciarAnaliseCompleta(historico.uci);
    });
}

/**
 * Handler acionado explicitamente pelo utilizador para término prematuro da partida.
 */
function desistir() {
    if (modalDisparado) return; 
    let vct = (modoPresencial ? estadoGlobal.turnoAtual : corJogador) === 'w' ? 'Pretas' : 'Brancas';
    dispararFimDeJogo("Fim de Partida", `Vitória das ${vct} por desistência.`);
}

/**
 * Rotina de Reversão de Estado (Undo / Time Travel).
 * Faz pop à pilha de snapshots, reconstruindo o DOM e realinhando os motores heurísticos e temporais.
 */
function desfazerJogada() {
    // Cláusula de guarda para prevenir operações concorrentes ou chamadas vazias
    if (estadoGlobal.pilhaEstados.length === 0 || estadoGlobal.jogoAcabou || emViagemNoTempo) return;
    
    emViagemNoTempo = true; 
    novaOperacao(); 
    pararAnalise(); 

    let estadoSalvo = null;

    // Em modo Single Player, retrocede até encontrar o estado correspondente ao turno do humano
    if (!modoPresencial) {
        while (estadoGlobal.pilhaEstados.length > 0) {
            estadoSalvo = retirarDaPilha();
            if (estadoSalvo.turno === corJogador) { break; }
        }
    } else {
        estadoSalvo = retirarDaPilha();
    }

    if (!estadoSalvo) { emViagemNoTempo = false; return; }

    // Restauro da Árvore DOM (Tabuleiro e Inventário de Capturas)
    document.getElementById("chessboard").innerHTML = estadoSalvo.board;
    document.getElementById("captured-by-b").innerHTML = estadoSalvo.hudB;
    document.getElementById("captured-by-w").innerHTML = estadoSalvo.hudW;

    // Restauro da Máquina de Estados Lógica
    setEstadoGlobalTurno(estadoSalvo.turno);
    setHistorico(estadoSalvo.historico);
    setCapturadas(estadoSalvo.capturadas.w, estadoSalvo.capturadas.b);
    
    if (estadoSalvo.tempo) setTempo(estadoSalvo.tempo.w, estadoSalvo.tempo.b, estadoSalvo.turno);

    // Sincronização dos Web Workers e validação matemática do tabuleiro
    sincronizarHistoricoAposDesfazer(historico.uci);
    atualizarTabuleiroVirtual();
    atualizarIndicadorDeTurno(estadoGlobal.turnoAtual);
    
    if (modoPresencial) rotacionarTabuleiro(estadoGlobal.turnoAtual, modoPresencial); 
    
    if (callbackLimparEstado) callbackLimparEstado();

    // Reativa a barra de avaliação assíncrona caso esteja habilitada pelo utilizador
    if (localStorage.getItem('mostrarBarra') === 'on') {
        iniciarAvaliacaoDaPosicao(historico.uci, estadoGlobal.turnoAtual, (dadosDaAnalise) => {
            atualizarBarraVisual(dadosDaAnalise.tipo, dadosDaAnalise.vantagem, dadosDaAnalise.melhorLinha);
        });
    }

    // Libertação do Lock (Mutex) e delegação de turno, se aplicável
    setTimeout(() => {
        emViagemNoTempo = false;
        if (!modoPresencial && estadoGlobal.turnoAtual !== corJogador && callbackChamarBot) {
            callbackChamarBot();
        }
    }, 400);
}

/**
 * Serializa os elementos do DOM e o estado lógico num objeto de Snapshot (Memento Pattern).
 * Empurra a cópia profunda (Deep Copy) para a pilha de histórico (Stack).
 */
export function salvarInstantaneoDoJogo() {
    salvarNaPilha({
        board: document.getElementById("chessboard").innerHTML,
        hudB: document.getElementById("captured-by-b").innerHTML,
        hudW: document.getElementById("captured-by-w").innerHTML,
        turno: estadoGlobal.turnoAtual,
        historico: JSON.parse(JSON.stringify(historico)),
        capturadas: JSON.parse(JSON.stringify(getCapturadas())),
        tempo: getTempo() 
    });
}
