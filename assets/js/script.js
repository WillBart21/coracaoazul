// Compatibilidade com diferentes navegadores para requestAnimationFrame
window.requestAnimationFrame =
    window.__requestAnimationFrame ||
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    (function () {
        return function (callback, element) {
            // Fallback com setTimeout se não houver suporte a requestAnimationFrame
            var lastTime = element.__lastTime || 0;
            var currTime = Date.now();
            var timeToCall = Math.max(1, 33 - (currTime - lastTime));
            window.setTimeout(callback, timeToCall);
            element.__lastTime = currTime + timeToCall;
        };
    })();

// Detecta se o dispositivo é mobile
window.isDevice = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
    .test(((navigator.userAgent || navigator.vendor || window.opera)).toLowerCase()));

var loaded = false;

// Função principal de inicialização
var init = function () {
    if (loaded) return;
    loaded = true;

    // Pega o canvas e contexto 2D
    var canvas = document.getElementById('heart');
    var ctx = canvas.getContext('2d');

    // Função para ajustar o tamanho do canvas à tela
    function resizeCanvas() {
        var mobile = window.innerWidth <= 768;
        var koef = mobile ? 1 : 1; // Se for celular, usa um fator de escala menor
        canvas.width = koef * window.innerWidth;
        canvas.height = koef * window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Chama no carregamento

    // Preenche o fundo com preto
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Função que retorna uma coordenada (x, y) de ponto no formato de coração
    var heartPosition = function (rad) {
        return [
            Math.pow(Math.sin(rad), 3),
            -(15 * Math.cos(rad) - 5 * Math.cos(2 * rad) - 2 * Math.cos(3 * rad) - Math.cos(4 * rad))
        ];
    };

    // Aplica escala e deslocamento aos pontos do coração
    var scaleAndTranslate = function (pos, sx, sy, dx, dy) {
        return [dx + pos[0] * sx, dy + pos[1] * sy];
    };

    // Número de rastros das partículas (menos em mobile para performance)
    var traceCount = window.isDevice ? 20 : 50;
    var pointsOrigin = [];
    var dr = window.isDevice ? 0.3 : 0.1;

    // Gera pontos para três camadas do coração (tamanhos diferentes)
    for (var i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), 210, 13, 0, 0));
    for (i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), 150, 9, 0, 0));
    for (i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), 90, 5, 0, 0));

    var heartPointsCount = pointsOrigin.length;

    // Define os pontos-alvo animados
    var targetPoints = [];

    // Atualiza as posições-alvo do coração em cada frame com efeito de "pulsar"
    var pulse = function (kx, ky) {
        for (i = 0; i < pointsOrigin.length; i++) {
            targetPoints[i] = [
                kx * pointsOrigin[i][0] + canvas.width / 2,
                ky * pointsOrigin[i][1] + canvas.height / 2
            ];
        }
    };

    // Partículas animadas que vão se mover entre os pontos do coração
    var e = [];
    for (i = 0; i < heartPointsCount; i++) {
        var x = Math.random() * canvas.width;
        var y = Math.random() * canvas.height;
        e[i] = {
            vx: 0, // Velocidade x
            vy: 0, // Velocidade y
            R: 2, // Raio
            speed: Math.random() + 5,
            q: ~~(Math.random() * heartPointsCount), // índice de ponto-alvo
            D: 2 * (i % 2) - 1, // direção da animação
            force: 0.2 * Math.random() + 0.7, // força de movimento
            f: "hsla(240,100%,50%,.3)", // cor azul em HSLA
            trace: [] // trilha de movimento
        };

        // Cria a trilha da partícula
        for (var k = 0; k < traceCount; k++)
            e[i].trace[k] = { x: x, y: y };
    }

    // Configurações da animação
    var config = {
        traceK: 0.4, // suavidade do traço
        timeDelta: 0.01 // velocidade geral da animação
    };

    var time = 0;

    // Função de loop da animação
    var loop = function () {
        var n = -Math.cos(time);
        pulse((1 + n) * 0.5, (1 + n) * 0.5); // atualiza posição com pulsação
        time += ((Math.sin(time)) < 0 ? 9 : (n > 0.8) ? 0.2 : 1) * config.timeDelta;

        // Desenha um fundo semi-transparente pra criar rastro
        ctx.fillStyle = "rgba(0,0,0,.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Atualiza cada partícula
        for (i = e.length; i--;) {
            var u = e[i];
            var q = targetPoints[u.q];
            var dx = u.trace[0].x - q[0];
            var dy = u.trace[0].y - q[1];
            var length = Math.sqrt(dx * dx + dy * dy);

            // Troca o ponto-alvo se chegou perto
            if (length < 10) {
                if (Math.random() > 0.95) {
                    u.q = ~~(Math.random() * heartPointsCount);
                } else {
                    if (Math.random() > 0.99) {
                        u.D *= -1;
                    }
                    u.q += u.D;
                    u.q %= heartPointsCount;
                    if (u.q < 0) u.q += heartPointsCount;
                }
            }

            // Aplica física: move a partícula
            u.vx += -dx / length * u.speed;
            u.vy += -dy / length * u.speed;
            u.trace[0].x += u.vx;
            u.trace[0].y += u.vy;
            u.vx *= u.force;
            u.vy *= u.force;

            // Suaviza a trilha da partícula
            for (k = 0; k < u.trace.length - 1;) {
                var T = u.trace[k];
                var N = u.trace[++k];
                N.x -= config.traceK * (N.x - T.x);
                N.y -= config.traceK * (N.y - T.y);
            }

            // Desenha cada ponto da trilha
            ctx.fillStyle = u.f;
            for (k = 0; k < u.trace.length; k++) {
                ctx.fillRect(u.trace[k].x, u.trace[k].y, 1, 1);
            }
        }

        // Loop contínuo
        window.requestAnimationFrame(loop, canvas);
    };

    loop(); // Inicia animação
};

// Quando o DOM estiver pronto, inicia a animação
var s = document.readyState;
if (s === 'complete' || s === 'loaded' || s === 'interactive') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init, false);
}

