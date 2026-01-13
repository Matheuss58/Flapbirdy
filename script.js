document.addEventListener("DOMContentLoaded", () => {

  /* ===================== CONFIG ===================== */
  const LEVELS = {
    1: { speed: 3, gap: 200, pass: 5 },
    2: { speed: 3.5, gap: 190, pass: 10 },
    3: { speed: 4, gap: 180, pass: 15 },
    4: { speed: 4.5, gap: 170, pass: 20 },
    5: { speed: 5, gap: 160, pass: 25 },
    6: { speed: 5.5, gap: 150, pass: 30 },
    7: { speed: 6, gap: 140, pass: 35 },
    8: { speed: 6.5, gap: 130, pass: 40 },
    9: { speed: 7, gap: 120, pass: 45 },
    10:{ speed: 8, gap: 110, pass: 50 }
  };

  const GRAVITY = 2000;
  const JUMP = -600;
  const PIPE_WIDTH = 80;
  const PIPE_INTERVAL = 1.6;

  /* ===================== ELEMENTS ===================== */
  const board = document.getElementById("game-board");
  const birdEl = document.getElementById("bird");
  const scoreEl = document.getElementById("score-display");
  const levelEl = document.getElementById("level-display");

  const startScreen = document.getElementById("start-screen");
  const gameOverScreen = document.getElementById("game-over");
  const pauseScreen = document.getElementById("pause-screen");

  const highScoreEl = document.getElementById("high-score-display");
  const finalScoreEl = document.getElementById("final-score");
  const finalHighScoreEl = document.getElementById("final-high-score");

  /* ===================== AUDIO ===================== */
  const sounds = {
    jump: document.getElementById("jump-sound"),
    score: document.getElementById("score-sound"),
    hit: document.getElementById("collision-sound"),
    level: document.getElementById("levelup-sound"),
    music: document.getElementById("background-music")
  };

  /* ===================== STATE ===================== */
  const game = {
    running: false,
    paused: false,
    level: 1,
    score: 0,
    highScore: Number(localStorage.getItem("flappyHigh") || 0),
    lastTime: 0,
    pipeTimer: 0
  };

  const bird = {
    x: 80,
    y: 0,
    vy: 0,
    w: 0,
    h: 0
  };

  let pipes = [];

  /* ===================== INIT ===================== */
  function init() {
    resize();
    reset();

    highScoreEl.textContent = game.highScore;

    Object.values(sounds).forEach(a => a.load());

    window.addEventListener("resize", resize);
    document.addEventListener("keydown", onKey);

    board.addEventListener("click", jump);
    board.addEventListener("touchstart", e => {
      e.preventDefault();
      jump();
    }, { passive: false });

    document.getElementById("start-btn").onclick = jump;
    document.getElementById("restart-btn").onclick = start;
    document.getElementById("resume-btn").onclick = togglePause;
    document.getElementById("restart-from-pause").onclick = start;
  }

  function resize() {
    bird.w = birdEl.offsetWidth;
    bird.h = birdEl.offsetHeight;
    bird.y = board.clientHeight / 2;
  }

  /* ===================== GAME FLOW ===================== */
  function start() {
    reset();

    startScreen.style.display = "none";
    gameOverScreen.style.display = "none";
    pauseScreen.style.display = "none";

    game.running = true;
    game.paused = false;
    game.lastTime = performance.now(); // 🔑 evita engasgo

    sounds.music.volume = 0.3;
    sounds.music.play().catch(()=>{});

    requestAnimationFrame(loop);
  }

  function reset() {
    pipes.forEach(p => {
      p.elTop.remove();
      p.elBot.remove();
    });
    pipes = [];

    game.score = 0;
    game.level = 1;
    game.pipeTimer = 0;

    bird.vy = 0;
    bird.y = board.clientHeight / 2;

    scoreEl.textContent = "0";
    levelEl.textContent = "FASE 1";
  }

  function gameOver() {
    if (!game.running) return;

    game.running = false;

    sounds.hit.play().catch(()=>{});
    sounds.music.pause();

    finalScoreEl.textContent = game.score;

    if (game.score > game.highScore) {
      game.highScore = game.score;
      localStorage.setItem("flappyHigh", game.highScore);
    }

    finalHighScoreEl.textContent = game.highScore;
    highScoreEl.textContent = game.highScore;

    gameOverScreen.style.display = "flex";
  }

  function togglePause() {
    if (!game.running) return;

    game.paused = !game.paused;
    pauseScreen.style.display = game.paused ? "flex" : "none";

    if (!game.paused) {
      game.lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  /* ===================== LOOP ===================== */
  function loop(time) {
    if (!game.running || game.paused) return;

    const dt = (time - game.lastTime) / 1000;
    game.lastTime = time;

    updateBird(dt);
    updatePipes(dt);
    checkCollisions();

    requestAnimationFrame(loop);
  }

  /* ===================== BIRD ===================== */
  function updateBird(dt) {
    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;

    if (bird.y < 0) bird.y = 0;

    if (bird.y + bird.h > board.clientHeight) {
      gameOver();
      return;
    }

    birdEl.style.transform =
      `translateY(${bird.y}px) rotate(${Math.min(bird.vy / 6, 90)}deg)`;
  }

  function jump() {
    if (!game.running) {
      start();
      bird.vy = JUMP;
      return;
    }

    bird.vy = JUMP;
    sounds.jump.currentTime = 0;
    sounds.jump.play().catch(()=>{});
  }

  /* ===================== PIPES ===================== */
  function updatePipes(dt) {
    game.pipeTimer += dt;

    if (game.pipeTimer >= PIPE_INTERVAL) {
      spawnPipe();
      game.pipeTimer = 0;
    }

    pipes.forEach(p => {
      p.x -= LEVELS[game.level].speed * 100 * dt;
      p.elTop.style.left = p.x + "px";
      p.elBot.style.left = p.x + "px";

      if (!p.scored && p.x + PIPE_WIDTH < bird.x) {
        p.scored = true;
        game.score++;
        scoreEl.textContent = game.score;
        sounds.score.play().catch(()=>{});

        if (game.score >= LEVELS[game.level].pass && game.level < 10) {
          game.level++;
          levelEl.textContent = `FASE ${game.level}`;
          sounds.level.play().catch(()=>{});
        }
      }
    });

    pipes = pipes.filter(p => {
      if (p.x < -PIPE_WIDTH) {
        p.elTop.remove();
        p.elBot.remove();
        return false;
      }
      return true;
    });
  }

  function spawnPipe() {
    const gap = LEVELS[game.level].gap;
    const min = 50;
    const max = board.clientHeight - gap - 150;
    const topH = Math.random() * (max - min) + min;

    const top = document.createElement("div");
    const bot = document.createElement("div");

    top.className = "pipe pipe-top";
    bot.className = "pipe pipe-bottom";

    top.style.height = topH + "px";
    bot.style.height = board.clientHeight - topH - gap + "px";

    top.style.left = board.clientWidth + "px";
    bot.style.left = board.clientWidth + "px";

    board.appendChild(top);
    board.appendChild(bot);

    pipes.push({
      x: board.clientWidth,
      elTop: top,
      elBot: bot,
      scored: false,
      topH
    });
  }

  /* ===================== COLLISION ===================== */
  function checkCollisions() {
    const bx = bird.x + 10;
    const by = bird.y + 10;
    const bw = bird.w - 20;
    const bh = bird.h - 20;

    pipes.forEach(p => {
      if (bx < p.x + PIPE_WIDTH && bx + bw > p.x) {
        if (by < p.topH || by + bh > p.topH + LEVELS[game.level].gap) {
          gameOver();
        }
      }
    });
  }

  /* ===================== INPUT ===================== */
  function onKey(e) {
    if (e.code === "Space") jump();
    if (e.code === "KeyP") togglePause();
    if (e.code === "KeyR") start();
  }

  init();
});