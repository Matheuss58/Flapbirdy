document.addEventListener('DOMContentLoaded', () => {
    // Configurações do jogo
    const config = {
        width: 400,
        height: 600,
        gravity: 0.5,
        jumpForce: -8,
        pipeWidth: 60,
        pipeGap: 180,
        pipeSpeed: 3,
        levels: {
            1: { scoreToPass: 5, speed: 3, gap: 180 },
            2: { scoreToPass: 10, speed: 3.5, gap: 170 },
            3: { scoreToPass: 15, speed: 4, gap: 160 },
            4: { scoreToPass: 20, speed: 4.5, gap: 150 },
            5: { scoreToPass: 25, speed: 5, gap: 140 },
            6: { scoreToPass: 30, speed: 5.5, gap: 130 },
            7: { scoreToPass: 35, speed: 6, gap: 120 },
            8: { scoreToPass: 40, speed: 6.5, gap: 110 },
            9: { scoreToPass: 45, speed: 7, gap: 100 },
            10: { scoreToPass: 50, speed: 8, gap: 90 }
        }
    };

    // Estado do jogo
    const state = {
        gameIsRunning: false,
        score: 0,
        highScore: 0,
        currentLevel: 1,
        bird: {
            x: 50,
            y: 300,
            width: 40,
            height: 30,
            velocity: 0,
            rotation: 0
        },
        pipes: [],
        lastPipeTime: 0,
        frameCount: 0,
        lastTimestamp: 0,
        animationFrameId: null
    };

    // Elementos do DOM
    const elements = {
        gameBoard: document.getElementById('game-board'),
        bird: document.getElementById('bird'),
        scoreDisplay: document.getElementById('score-display'),
        levelDisplay: document.getElementById('level-display'),
        gameOverDisplay: document.getElementById('game-over'),
        startScreen: document.getElementById('start-screen'),
        phaseElements: document.querySelectorAll('.phase'),
        highScoreDisplay: document.createElement('div')
    };

    // Inicialização
    function init() {
        // Configurar high score display
        elements.highScoreDisplay.id = 'high-score-display';
        elements.highScoreDisplay.style.position = 'absolute';
        elements.highScoreDisplay.style.top = '120px';
        elements.highScoreDisplay.style.left = '0';
        elements.highScoreDisplay.style.right = '0';
        elements.highScoreDisplay.style.textAlign = 'center';
        elements.highScoreDisplay.style.fontSize = '14px';
        elements.highScoreDisplay.style.color = 'white';
        elements.highScoreDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        elements.highScoreDisplay.style.zIndex = '5';
        elements.gameBoard.appendChild(elements.highScoreDisplay);

        // Carregar high score do localStorage
        state.highScore = localStorage.getItem('flappyBirdHighScore') || 0;
        updateHighScoreDisplay();

        // Event listeners
        document.addEventListener('keydown', handleKeyDown);
        elements.gameBoard.addEventListener('click', handleClick);
        
        // Seleção de fases
        elements.phaseElements.forEach(phase => {
            phase.addEventListener('click', () => {
                if (!state.gameIsRunning) {
                    selectLevel(parseInt(phase.dataset.level));
                }
            });
        });

        // Selecionar primeira fase por padrão
        selectLevel(1);
    }

    // Selecionar nível
    function selectLevel(level) {
        state.currentLevel = level;
        const levelConfig = config.levels[level];
        config.pipeSpeed = levelConfig.speed;
        config.pipeGap = levelConfig.gap;
        
        elements.levelDisplay.textContent = `Fase ${level}`;
        
        // Atualizar UI de seleção de fase
        elements.phaseElements.forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.level) === level);
        });
    }

    // Iniciar jogo
    function startGame() {
        // Resetar estado
        state.gameIsRunning = true;
        state.score = 0;
        state.frameCount = 0;
        state.lastPipeTime = 0;
        state.bird = {
            x: 50,
            y: 300,
            width: 40,
            height: 30,
            velocity: 0,
            rotation: 0
        };
        state.pipes = [];
        
        // Limpar canos existentes
        document.querySelectorAll('.pipe').forEach(pipe => pipe.remove());
        
        // Atualizar UI
        elements.scoreDisplay.textContent = '0';
        elements.gameOverDisplay.style.display = 'none';
        elements.startScreen.style.display = 'none';
        
        // Iniciar game loop
        state.lastTimestamp = performance.now();
        if (state.animationFrameId) {
            cancelAnimationFrame(state.animationFrameId);
        }
        gameLoop();
    }

    // Game loop otimizado
    function gameLoop(timestamp = 0) {
        if (!state.gameIsRunning) return;
        
        // Calcular delta time para suavizar animação
        const deltaTime = timestamp - state.lastTimestamp;
        state.lastTimestamp = timestamp;
        
        // Atualizar estado do jogo
        updateBird(deltaTime);
        updatePipes(deltaTime);
        checkCollisions();
        checkLevelUp();
        
        // Renderizar
        render();
        
        // Continuar o loop
        state.animationFrameId = requestAnimationFrame(gameLoop);
    }

    // Atualizar pássaro
    function updateBird(deltaTime) {
        // Aplicar gravidade com delta time
        state.bird.velocity += config.gravity * (deltaTime / 16);
        state.bird.y += state.bird.velocity * (deltaTime / 16);
        
        // Limitar posição
        if (state.bird.y < 0) {
            state.bird.y = 0;
            state.bird.velocity = 0;
        }
        
        if (state.bird.y > config.height - state.bird.height) {
            state.bird.y = config.height - state.bird.height;
            gameOver();
        }
        
        // Calcular rotação
        state.bird.rotation = Math.min(Math.max(state.bird.velocity * 5, -30), 30);
    }

    // Atualizar canos
    function updatePipes(deltaTime) {
        // Criar novos canos
        state.frameCount++;
        if (state.frameCount - state.lastPipeTime >= 120) { // ~2 segundos
            createPipe();
            state.lastPipeTime = state.frameCount;
        }
        
        // Mover e verificar canos
        for (let i = state.pipes.length - 1; i >= 0; i--) {
            const pipe = state.pipes[i];
            
            // Mover cano
            pipe.x -= config.pipeSpeed * (deltaTime / 16);
            pipe.element.style.left = `${pipe.x}px`;
            pipe.topElement.style.left = `${pipe.x}px`;
            
            // Verificar se passou pelo cano
            if (!pipe.passed && pipe.x + config.pipeWidth < state.bird.x) {
                pipe.passed = true;
                state.score++;
                elements.scoreDisplay.textContent = state.score;
                playScoreSound();
            }
            
            // Remover canos fora da tela
            if (pipe.x < -config.pipeWidth) {
                pipe.element.remove();
                pipe.topElement.remove();
                state.pipes.splice(i, 1);
            }
        }
    }

    // Criar cano
    function createPipe() {
        const minHeight = 50;
        const maxHeight = config.height - config.pipeGap - minHeight;
        const pipeHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
        
        // Cano inferior
        const pipeElement = document.createElement('div');
        pipeElement.className = 'pipe pipe-bottom';
        pipeElement.style.height = `${config.height - pipeHeight - config.pipeGap}px`;
        pipeElement.style.width = `${config.pipeWidth}px`;
        pipeElement.style.left = `${config.width}px`;
        elements.gameBoard.appendChild(pipeElement);
        
        // Cano superior
        const pipeTopElement = document.createElement('div');
        pipeTopElement.className = 'pipe pipe-top';
        pipeTopElement.style.height = `${pipeHeight}px`;
        pipeTopElement.style.width = `${config.pipeWidth}px`;
        pipeTopElement.style.left = `${config.width}px`;
        elements.gameBoard.appendChild(pipeTopElement);
        
        state.pipes.push({
            element: pipeElement,
            topElement: pipeTopElement,
            x: config.width,
            height: pipeHeight,
            passed: false
        });
    }

    // Verificar colisões
    function checkCollisions() {
        const bird = state.bird;
        
        // Verificar colisão com cada cano
        for (const pipe of state.pipes) {
            // Cano superior
            if (
                bird.x + bird.width > pipe.x &&
                bird.x < pipe.x + config.pipeWidth &&
                bird.y < pipe.height
            ) {
                gameOver();
                return;
            }
            
            // Cano inferior
            if (
                bird.x + bird.width > pipe.x &&
                bird.x < pipe.x + config.pipeWidth &&
                bird.y + bird.height > pipe.height + config.pipeGap
            ) {
                gameOver();
                return;
            }
        }
    }

    // Verificar subida de nível
    function checkLevelUp() {
        const currentLevelConfig = config.levels[state.currentLevel];
        
        if (state.score >= currentLevelConfig.scoreToPass && state.currentLevel < 10) {
            state.currentLevel++;
            const newLevelConfig = config.levels[state.currentLevel];
            config.pipeSpeed = newLevelConfig.speed;
            config.pipeGap = newLevelConfig.gap;
            
            elements.levelDisplay.textContent = `Fase ${state.currentLevel}`;
            selectLevel(state.currentLevel);
            playLevelUpSound();
        }
    }

    // Renderizar elementos
    function render() {
        // Atualizar posição e rotação do pássaro
        elements.bird.style.transform = `translateY(${state.bird.y}px) rotate(${state.bird.rotation}deg)`;
    }

    // Game over
    function gameOver() {
        state.gameIsRunning = false;
        
        // Atualizar high score
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('flappyBirdHighScore', state.highScore);
            updateHighScoreDisplay();
        }
        
        // Mostrar tela de game over
        elements.gameOverDisplay.style.display = 'flex';
        cancelAnimationFrame(state.animationFrameId);
        playCollisionSound();
    }

    // Atualizar high score display
    function updateHighScoreDisplay() {
        elements.highScoreDisplay.textContent = `Recorde: ${state.highScore}`;
    }

    // Pular
    function jump() {
        if (!state.gameIsRunning) {
            startGame();
            return;
        }
        
        state.bird.velocity = config.jumpForce;
        elements.bird.classList.add('flap-animation');
        setTimeout(() => {
            elements.bird.classList.remove('flap-animation');
        }, 300);
    }

    // Handlers de eventos
    function handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            jump();
        }
    }

    function handleClick() {
        jump();
    }

    // Efeitos sonoros
    function playScoreSound() {
        // Implementação simplificada - na prática use arquivos de áudio
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.stop(audioCtx.currentTime + 0.1);
    }

    function playCollisionSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 150;
        gainNode.gain.value = 0.2;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.stop(audioCtx.currentTime + 0.5);
    }

    function playLevelUpSound() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.stop(audioCtx.currentTime + 0.3);
    }

    // Inicializar o jogo
    init();
});