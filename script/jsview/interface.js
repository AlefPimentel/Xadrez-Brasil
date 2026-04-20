// Script/jsview/interface.js
import { verificarXeque } from '../regras/regrasmovimento.js';
import { tabuleiroVirtual } from '../regras/regras.js'; 
import { pieceImages } from './pecas.js';
import { getBotPorNivel } from '../../classe/model_bots.js'; 

/**
 * Dicionário de assets de áudio pré-carregados para feedback sonoro das ações do jogo.
 * @constant {Object}
 */
const sons = {
    mover: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3'),
    capturar: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3'),
    xeque: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3'),
    fim: new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3')
};

/**
 * Reproduz um efeito sonoro clonando o nó de áudio original para permitir sobreposição de sons rápidos.
 * @param {string} tipo - Chave correspondente ao áudio no dicionário 'sons'.
 */
export function tocarSom(tipo) {
    const audio = sons[tipo].cloneNode();
    audio.play().catch(erro => console.log("Áudio bloqueado pelo navegador:", erro));
}

/**
 * Injeta no DOM o nó de texto responsável por indicar de quem é o turno atual.
 */
export function criarIndicadorDeTurno() {
    const container = document.querySelector('.game-container');
    const indicador = document.createElement('h2');
    indicador.id = 'turn-indicator';
    indicador.style.color = '#ebecd0';
    indicador.style.textAlign = 'center';
    indicador.style.marginBottom = '15px';
    indicador.style.fontFamily = 'Arial, sans-serif';
    indicador.innerText = 'Vez das Brancas';
    container.insertBefore(indicador, container.firstChild);
}

/**
 * Atualiza o texto e a coloração do indicador de turno baseado no estado do jogo.
 * @param {string} turnoAtual - 'w' para Brancas ou 'b' para Pretas.
 */
export function atualizarIndicadorDeTurno(turnoAtual) {
    const indicador = document.getElementById('turn-indicator');
    if (turnoAtual === 'w') {
        indicador.innerText = 'Vez das Brancas';
        indicador.style.color = '#ebecd0';
    } else {
        indicador.innerText = 'Vez das Pretas';
        indicador.style.color = '#779556'; 
    }
}

/**
 * Varre a matriz lógica em busca de ameaças ao Rei e atualiza a interface com alertas visuais e táteis (vibração).
 * @returns {boolean} Retorna true se houver alguma peça em estado de xeque.
 */
export function atualizarEstadoDoXeque() {
    document.querySelectorAll('.in-check').forEach(casa => casa.classList.remove('in-check'));
    let emXeque = false;
    
    if (verificarXeque('w', tabuleiroVirtual)) { destacarRei('w'); emXeque = true; }
    if (verificarXeque('b', tabuleiroVirtual)) { destacarRei('b'); emXeque = true; }
    
    if (emXeque && navigator.vibrate) navigator.vibrate(200);
    
    return emXeque; 
}

/**
 * Localiza a casa ocupada pelo Rei da cor especificada e aplica a classe CSS de perigo.
 * @param {string} cor - 'w' ou 'b'.
 */
function destacarRei(cor) {
    document.querySelectorAll('.square').forEach(casa => {
        const peca = casa.querySelector('.piece');
        if (peca && peca.alt === cor + 'K') casa.classList.add('in-check');
    });
}

/**
 * Remove classes CSS de highlight de todas as casas do tabuleiro.
 */
export function removerSelecaoVisual() {
    document.querySelectorAll('.selected').forEach(casa => casa.classList.remove("selected"));
    document.querySelectorAll('.valid-move').forEach(casa => casa.classList.remove("valid-move"));
}

/**
 * Renderiza indicadores visuais nas casas do tabuleiro correspondentes aos movimentos legais calculados.
 * @param {Array<string>} movimentos - Array de IDs das casas de destino válidas.
 */
export function desenharPrevisaoMovimentos(movimentos) {
    movimentos.forEach(id => {
        const casaValida = document.getElementById(id);
        if (casaValida) casaValida.classList.add("valid-move");
    });
}

/**
 * Atualiza a interface com o resultado e o motivo do término da partida.
 * @param {string} corDerrotada - Cor do jogador que perdeu ou que provocou o empate.
 * @param {string} razaoFim - Chave descritiva do motivo ('mate', 'afogamento', etc).
 */
export function anunciarFimDeJogo(corDerrotada, razaoFim) {
    const indicador = document.getElementById('turn-indicator');
    const corVencedora = corDerrotada === 'w' ? 'Pretas' : 'Brancas';

    tocarSom('fim');

    if (razaoFim === 'mate') {
        indicador.innerText = `👑 XEQUE-MATE! As ${corVencedora} vencem!`;
        indicador.style.color = 'gold'; 
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500]);
        
    } else if (razaoFim === 'afogamento') {
        indicador.innerText = '🤝 AFOGAMENTO! O jogo empatou.';
        indicador.style.color = 'orange';
        
    } else if (razaoFim === '50-movimentos') {
        indicador.innerText = '🤝 EMPATE! (Regra dos 50 movimentos)';
        indicador.style.color = 'orange';
        
    } else if (razaoFim === 'repeticao') {
        indicador.innerText = '🤝 EMPATE! (Por tripla repetição)';
        indicador.style.color = 'orange';
        
    } else if (razaoFim === 'material') {
        indicador.innerText = '🤝 EMPATE! (Material Insuficiente)';
        indicador.style.color = 'orange';
    }
}

/**
 * Instancia e exibe um modal modal interativo para seleção de peça em caso de promoção de peão.
 * @param {string} corPeca - Cor do peão sendo promovido ('w' ou 'b').
 * @param {Function} callback - Função engatilhada após a seleção do utilizador.
 */
export function abrirMenuPromocao(corPeca, callback) {
    const container = document.querySelector('.game-container');
    container.style.pointerEvents = 'none'; 

    const modal = document.createElement('div');
    modal.classList.add('promotion-modal');
    modal.style.pointerEvents = 'auto'; 

    const opcoes = ['Q', 'R', 'B', 'N'];

    opcoes.forEach(tipo => {
        const img = document.createElement('img');
        img.src = pieceImages[corPeca + tipo];
        img.classList.add('promotion-piece');
        
        img.addEventListener('click', () => {
            container.removeChild(modal); 
            container.style.pointerEvents = 'auto'; 
            callback(tipo); 
        });
        
        modal.appendChild(img);
    });

    container.appendChild(modal);
}

/**
 * Estrutura de dados para ordenação hierárquica das peças capturadas nos HUDs.
 */
const pesoPecas = { 'Q': 9, 'R': 5, 'B': 3, 'N': 3, 'P': 1 };
let capturadasBrancas = []; 
let capturadasPretas = [];  

export function getCapturadas() { return { w: [...capturadasBrancas], b: [...capturadasPretas] }; }
export function setCapturadas(w, b) { capturadasBrancas = w; capturadasPretas = b; }

/**
 * Regista uma peça eliminada e re-renderiza o HUD de material capturado, mantendo a ordenação de valor.
 * @param {string} codigoPeca - Código algébrico da peça eliminada (Ex: 'bQ').
 */
export function adicionarPecaCapturada(codigoPeca) {
    const cor = codigoPeca.charAt(0);
    
    if (cor === 'b') {
        capturadasPretas.push(codigoPeca);
        capturadasPretas.sort((a, b) => pesoPecas[b.charAt(1)] - pesoPecas[a.charAt(1)]);
    } else {
        capturadasBrancas.push(codigoPeca);
        capturadasBrancas.sort((a, b) => pesoPecas[b.charAt(1)] - pesoPecas[a.charAt(1)]);
    }
    
    redesenharCaixaCapturas('captured-by-w', capturadasPretas);
    redesenharCaixaCapturas('captured-by-b', capturadasBrancas);
}

/**
 * Limpa e reconstrói as imagens dentro do container de peças capturadas.
 */
function redesenharCaixaCapturas(idContainer, arrayDePecas) {
    const container = document.getElementById(idContainer);
    if (!container) return;
    container.innerHTML = ''; 
    
    arrayDePecas.forEach(codigo => {
        const img = document.createElement('img');
        img.src = pieceImages[codigo];
        container.appendChild(img);
    });
}

/**
 * Aciona os protocolos de fim de jogo provocados por ação explícita (resign).
 * @param {string} corVencedora - Cor do jogador adversário ao que desistiu.
 */
export function anunciarDesistencia(corVencedora) {
    const indicador = document.getElementById('turn-indicator');
    tocarSom('fim');
    indicador.innerText = `🏳️ DESISTÊNCIA! As ${corVencedora} vencem!`;
    indicador.style.color = '#eb6150'; 
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500]);
}

/**
 * Aplica transformações CSS iniciais para inverter o tabuleiro caso o jogador local escolha jogar com as Pretas.
 * @param {string} corJogador - Cor base selecionada pelo utilizador.
 * @param {boolean} modoPresencial - Sinaliza se a partida alterna perspetivas a cada lance.
 */
export function orientarTabuleiroInicial(corJogador, modoPresencial) {
    if (corJogador === 'w') return;

    const tabuleiro = document.getElementById("chessboard");
    const pecas = document.querySelectorAll(".piece");
    const coordenadas = document.querySelectorAll(".coordinate");

    tabuleiro.style.transition = "none";
    pecas.forEach(peca => peca.style.transition = "none");
    coordenadas.forEach(coord => coord.style.transition = "none");

    tabuleiro.style.transform = `rotate(180deg)`;
    pecas.forEach(peca => peca.style.transform = `rotate(180deg)`);
    coordenadas.forEach(coord => coord.style.transform = `rotate(180deg)`);

    void tabuleiro.offsetHeight; // Força o reflow do navegador

    tabuleiro.style.transition = "";
    pecas.forEach(peca => peca.style.transition = "");
    coordenadas.forEach(coord => coord.style.transition = "");
}

/**
 * Animação e reestruturação do DOM para inverter o ponto de vista em modo presencial (Pass-and-Play).
 * @param {string} turnoAtual - Cor do jogador que efetuará o próximo lance.
 * @param {boolean} modoPresencial - Condicional ativadora da rotação.
 */
export function rotacionarTabuleiro(turnoAtual, modoPresencial) {
    if (!modoPresencial) return;

    const tabuleiro = document.getElementById("chessboard");
    const pecas = document.querySelectorAll(".piece");
    const coordenadas = document.querySelectorAll(".coordinate");

    const anguloAntigo = turnoAtual === 'b' ? 0 : 180;
    const anguloNovo = turnoAtual === 'b' ? 180 : 0;

    tabuleiro.style.opacity = "0";
    tabuleiro.style.transform = `scale(0.92) rotate(${anguloAntigo}deg)`;

    trocarDadosHudsPresencial(turnoAtual);

    setTimeout(() => {
        pecas.forEach(peca => peca.style.transform = `rotate(${anguloNovo}deg)`);
        coordenadas.forEach(coord => coord.style.transform = `rotate(${anguloNovo}deg)`);

        tabuleiro.style.transform = `scale(1) rotate(${anguloNovo}deg)`;
        tabuleiro.style.opacity = "1";
    }, 250); 
}

/**
 * Transfere elementos DOM (Relógios e Caixas de Captura) entre os HUDs superior e inferior para acompanhar a rotação.
 */
function trocarDadosHudsPresencial(turnoAtual) {
    const avatarPadrao = '/img/img_padrao.jpg'; 
    let myName = localStorage.getItem('nomeJogador') || 'Convidado';
    let myRating = localStorage.getItem('ratingJogador') || '(800)';
    let myImg = localStorage.getItem('imgJogador') || avatarPadrao;

    let oppName = 'Jogador 2';
    let oppRating = '(800)';
    let oppImg = avatarPadrao;

    const nomeBottom = document.getElementById('name-bottom');
    const ratingBottom = document.getElementById('rating-bottom');
    const imgBottom = document.getElementById('avatar-bottom');
    
    const relogioW = document.getElementById('clock-w');
    const relogioB = document.getElementById('clock-b');
    const boxW = document.getElementById('captured-by-w');
    const boxB = document.getElementById('captured-by-b');
    
    const nomeTop = document.getElementById('name-top');
    const ratingTop = document.getElementById('rating-top');
    const imgTop = document.getElementById('avatar-top');

    const divDirTop = document.getElementById('hud-top-container').lastElementChild;
    const divDirBottom = document.getElementById('hud-bottom-container').lastElementChild;

    if (!nomeBottom || !nomeTop) return;

    const todosHUDs = document.querySelectorAll('.player-hud');
    todosHUDs.forEach(hud => { hud.style.transition = "opacity 0.2s"; hud.style.opacity = "0"; });

    setTimeout(() => {
        if (turnoAtual === 'w') {
            nomeBottom.innerText = myName; ratingBottom.innerText = myRating; imgBottom.src = myImg;
            nomeTop.innerText = oppName; ratingTop.innerText = oppRating; imgTop.src = oppImg;
            
            divDirBottom.appendChild(boxW);
            divDirBottom.appendChild(relogioW);
            divDirTop.appendChild(boxB);
            divDirTop.appendChild(relogioB);

        } else {
            nomeBottom.innerText = oppName; ratingBottom.innerText = oppRating; imgBottom.src = oppImg;
            nomeTop.innerText = myName; ratingTop.innerText = myRating; imgTop.src = myImg;

            divDirBottom.appendChild(boxB);
            divDirBottom.appendChild(relogioB);
            divDirTop.appendChild(boxW);
            divDirTop.appendChild(relogioW);
        }
        
        todosHUDs.forEach(hud => hud.style.opacity = "1");
    }, 200);
}

/**
 * Lê a configuração do utilizador (localStorage) e injeta ou oculta a EvalBar.
 */
export function configurarBarraAvaliacao() {
    const evalContainer = document.getElementById('eval-container');
    const mostrarBarra = localStorage.getItem('mostrarBarra');
    if (mostrarBarra === 'on') evalContainer.style.display = 'flex';
    else evalContainer.style.display = 'none';
}

/**
 * Converte a pontuação algorítmica do motor numa representação em altura CSS (%).
 * @param {string} tipo - 'cp' (Centipawns) ou 'mate'.
 * @param {number} vantagem - A pontuação relativa à perspetiva atual.
 * @param {string} melhorLinha - Principal variation (não instanciada visualmente no momento, mas mantida no payload).
 */
export function atualizarBarraVisual(tipo, vantagem, melhorLinha) {
    const evalFill = document.getElementById('eval-bar-fill');
    const evalText = document.getElementById('eval-text');
    if (document.getElementById('eval-container').style.display === 'none') return;

    let alturaPercentagem = 50; 
    let textoVantagem = "0.0";

    if (tipo === 'mate') {
        if (vantagem > 0) { alturaPercentagem = 100; textoVantagem = `M${vantagem}`; } 
        else { alturaPercentagem = 0; textoVantagem = `M${Math.abs(vantagem)}`; }
    } else {
        let peoes = vantagem / 100;
        if (peoes > 0) textoVantagem = `+${peoes.toFixed(1)}`;
        else if (peoes < 0) textoVantagem = `${peoes.toFixed(1)}`;
        else textoVantagem = "0.0";
        // Mapeamento linear para visualização da escala
        alturaPercentagem = 50 + (peoes * 6);
        alturaPercentagem = Math.max(5, Math.min(95, alturaPercentagem)); 
    }

    evalFill.style.height = `${alturaPercentagem}%`;
    evalText.innerText = textoVantagem;

    // Garante legibilidade do texto invertendo a cor quando a barra comprime
    if (alturaPercentagem < 20) { evalText.style.top = "10px"; evalText.style.color = "#fff"; } 
    else { evalText.style.top = "10px"; evalText.style.color = "#000"; }
}

/**
 * Configura os dados dos avatares e estatísticas no cabeçalho e rodapé.
 * Resolve dinamicamente os parâmetros da instância (Model) do Bot caso não seja modo presencial.
 * @param {boolean} modoPresencial - Define se o oponente é o utilizador local ou a engine.
 * @param {string} corJogador - Determina a disposição (Top/Bottom) das informações.
 */
export function configurarPerfisJogador(modoPresencial, corJogador) {
    const avatarPadrao = '/img/img_padrao.jpg'; 
    
    let myName = localStorage.getItem('nomeJogador') || 'Convidado';
    let myRating = localStorage.getItem('ratingJogador') || '(800)';
    let myImg = localStorage.getItem('imgJogador') || avatarPadrao;

    let oppName = 'Jogador 2';
    let oppRating = '(800)';
    let oppImg = avatarPadrao;

    // Resolução polimórfica da entidade oponente baseada no modo de jogo configurado
    if (!modoPresencial) {
        const nivel = parseInt(localStorage.getItem('nivelBotXadrez')) || 1;
        const botEscolhido = getBotPorNivel(nivel); 
        
        oppName = botEscolhido.nome;
        oppRating = `(${botEscolhido.rating})`; 
        oppImg = botEscolhido.foto;             
    }

    const nomeBottom = document.getElementById('name-bottom');
    const ratingBottom = document.getElementById('rating-bottom');
    const imgBottom = document.getElementById('avatar-bottom');
    
    const nomeTop = document.getElementById('name-top');
    const ratingTop = document.getElementById('rating-top');
    const imgTop = document.getElementById('avatar-top');
    
    if (!nomeBottom || !nomeTop) return;

    // População inicial das áreas base
    nomeBottom.innerText = myName; ratingBottom.innerText = myRating; imgBottom.src = myImg;
    nomeTop.innerText = oppName; ratingTop.innerText = oppRating; imgTop.src = oppImg;

    // Tratamento de exceções (Fallback) caso as imagens não carreguem
    imgTop.onerror = function() { this.src = avatarPadrao; };
    imgBottom.onerror = function() { this.src = avatarPadrao; };

    // Orientação hierárquica dos elementos do DOM com base na preferência de cor
    const divDirTop = document.getElementById('hud-top-container')?.lastElementChild;
    const divDirBottom = document.getElementById('hud-bottom-container')?.lastElementChild;

    const relogioW = document.getElementById('clock-w');
    const relogioB = document.getElementById('clock-b');
    const boxW = document.getElementById('captured-by-w');
    const boxB = document.getElementById('captured-by-b');

    if (divDirTop && divDirBottom && relogioW && relogioB && boxW && boxB) {
        if (!modoPresencial && corJogador === 'b') {
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
}
