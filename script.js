const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");
ctx.scale(20, 20);

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
nextCtx.scale(20, 20);

const scoreElement = document.getElementById("score");
const timeElement = document.getElementById("time");
const menu = document.getElementById("menu");
const leaderboardElement = document.getElementById("leaderboard");

let gameRunning = false;
let startTime = 0;
let gameOverAnim = false;
let showTop10Msg = false;
let gameOverLocked = false; // zabraňuje vícenásobnému Game Over

const arena = createMatrix(12, 20);

const colors = [
    null,
    "#00ffff",
    "#0000ff",
    "#ff7f00",
    "#ffff00",
    "#00ff00",
    "#800080",
    "#ff0000"
];

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    next: null,
    score: 0
};

// Leaderboard
function loadLeaderboard() {
    let data = localStorage.getItem("tetrisLeaderboard");
    if (!data) return [];
    return JSON.parse(data);
}

function saveLeaderboard(board) {
    localStorage.setItem("tetrisLeaderboard", JSON.stringify(board));
}

function updateLeaderboardHTML() {
    const board = loadLeaderboard();
    leaderboardElement.innerHTML = "";
    board.forEach(entry => {
        const li = document.createElement("li");
        li.textContent = `${entry.name}: ${entry.score}`;
        leaderboardElement.appendChild(li);
    });
}

// Přidání skóre do TOP10
function tryAddLeaderboard(score) {
    let board = loadLeaderboard();
    if (board.length < 10 || score > board[board.length-1].score) {
        showTop10Msg = true; // zobrazí se jednou
        setTimeout(() => {
            let name = prompt("Gratulujeme! Jste v TOP 10. Zadejte své jméno:");
            if (!name) name = "Anon";
            board.push({name, score});
            board.sort((a,b)=>b.score - a.score);
            if (board.length > 10) board.pop();
            saveLeaderboard(board);
            updateLeaderboardHTML();
            showTop10Msg = false;
            menu.style.display = "block";
        }, 2000);
    } else {
        menu.style.display = "block";
    }
}

// Funkce hry
function createMatrix(w, h) {
    const m = [];
    while (h--) m.push(new Array(w).fill(0));
    return m;
}

function createPiece(type) {
    if (type === 'I') return [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]];
    if (type === 'J') return [[2,0,0],[2,2,2],[0,0,0]];
    if (type === 'L') return [[0,0,3],[3,3,3],[0,0,0]];
    if (type === 'O') return [[4,4],[4,4]];
    if (type === 'S') return [[0,5,5],[5,5,0],[0,0,0]];
    if (type === 'T') return [[0,6,0],[6,6,6],[0,0,0]];
    if (type === 'Z') return [[7,7,0],[0,7,7],[0,0,0]];
}

function randomPiece() {
    const pieces = 'IJLOSTZ';
    return createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
}

function drawMatrix(matrix, offset, context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// Barevný Game Over
function drawGameOver() {
    if (!gameOverAnim) return;

    const letters = ["#ff0000","#ff7f00","#ffff00","#00ff00","#00ffff","#0000ff","#800080"];
    const color = letters[Math.floor(Date.now()/200) % letters.length];

    ctx.fillStyle = color;
    ctx.font = "1px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width/40, canvas.height/20);
}

function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, {x:0,y:0}, ctx);
    drawMatrix(player.matrix, player.pos, ctx);

    drawGameOver();
}

function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    drawMatrix(player.next, {x:0,y:0}, nextCtx);
}

function collide(arena, player) {
    for (let y = 0; y < player.matrix.length; y++) {
        for (let x = 0; x < player.matrix[y].length; x++) {
            if (
                player.matrix[y][x] !== 0 &&
                (arena[y + player.pos.y] &&
                arena[y + player.pos.y][x + player.pos.x]) !== 0
            ) return true;
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y >= 0; y--) {
        for (let x = 0; x < arena[y].length; x++) {
            if (arena[y][x] === 0) continue outer;
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        y++;

        player.score += rowCount * 10;
        rowCount *= 2;
    }
}

function rotate(matrix) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < y; x++) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    matrix.forEach(row => row.reverse());
}

function playerRotate() {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix);

    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix);
            rotate(player.matrix);
            rotate(player.matrix);
            player.pos.x = pos;
            return;
        }
    }
}

function resetGame() {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    startTime = Date.now();
    player.matrix = null;
    player.next = null;
    playerReset();
    updateScore();
}

function playerReset() {
    if (!player.next) {
        player.matrix = randomPiece();
        player.next = randomPiece();
    } else {
        player.matrix = player.next;
        player.next = randomPiece();
    }

    player.pos.y = 0;
    player.pos.x = Math.floor(arena[0].length / 2 - player.matrix[0].length / 2);

    if (collide(arena, player)) {
        if (!gameOverLocked) {
            gameRunning = false;
            gameOverAnim = true;
            gameOverLocked = true;

            setTimeout(() => {
                gameOverAnim = false;
                tryAddLeaderboard(player.score); // TOP 10 pouze jednou
                resetGame();
                gameOverLocked = false;
            }, 2000);
        }
        return;
    }

    drawNext();
    updateScore();
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        arenaSweep();
        playerReset();
    }
    dropCounter = 0;
}

function updateScore() {
    scoreElement.innerText = player.score;
}

function updateTime() {
    if (!gameRunning) return;
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    timeElement.innerText = seconds;
}

// Ovládání
document.addEventListener("keydown", e => {
    // Zamezení scrollování stránky šipkami a mezerníkem
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code)) {
        e.preventDefault();
    }

    if (e.code === "Space") {
        if (!gameRunning) {
            gameRunning = true;
            menu.style.display = "none";
            if (!startTime) startTime = Date.now();
            if (!player.matrix) playerReset();
        } else {
            gameRunning = false;
            menu.style.display = "block";
        }
    }

    if (!gameRunning) return;

    if (e.key === "ArrowLeft") {
        player.pos.x--;
        if (collide(arena, player)) player.pos.x++;
    }
    if (e.key === "ArrowRight") {
        player.pos.x++;
        if (collide(arena, player)) player.pos.x--;
    }
    if (e.key === "ArrowDown") {
        playerDrop();
    }
    if (e.key === "ArrowUp") {
        playerRotate();
    }
});

// Loop
let dropCounter = 0;
let dropInterval = 500;
let lastTime = 0;

function update(time = 0) {
    requestAnimationFrame(update);
    if (!gameRunning && !gameOverAnim) return;

    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;

    if (dropCounter > dropInterval) playerDrop();

    draw();
    updateTime();
}

// Inicializace
updateLeaderboardHTML();
update();
