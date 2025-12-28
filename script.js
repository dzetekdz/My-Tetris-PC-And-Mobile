const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");
ctx.scale(20,20);

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
nextCtx.scale(20,20);

const menu = document.getElementById("menu");
const leaderboardElement = document.getElementById("leaderboard");

let gameRunning = false;
let startTime = 0;
let gameOverAnim = false;
let gameOverLocked = false;

const arena = createMatrix(12,20);

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

const player = { pos:{x:0,y:0}, matrix:null, next:null, score:0 };

// Leaderboard
function loadLeaderboard(){ let data=localStorage.getItem("tetrisLeaderboard"); return data?JSON.parse(data):[]; }
function saveLeaderboard(board){ localStorage.setItem("tetrisLeaderboard",JSON.stringify(board)); }
function updateLeaderboardHTML(){ const board=loadLeaderboard(); leaderboardElement.innerHTML=""; board.forEach(e=>{ const li=document.createElement("li"); li.textContent=`${e.name}: ${e.score}`; leaderboardElement.appendChild(li); }); }
function tryAddLeaderboard(score){
    let board=loadLeaderboard();
    if(board.length<10||score>board[board.length-1].score){
        setTimeout(()=>{
            let name=prompt("Gratulujeme! Jste v TOP 10. Zadejte své jméno:");
            if(!name)name="Anon";
            board.push({name,score});
            board.sort((a,b)=>b.score-b.score);
            if(board.length>10) board.pop();
            saveLeaderboard(board);
            updateLeaderboardHTML();
            menu.style.display="block";
        },2000);
    } else menu.style.display="block";
}

// Matice a kostky
function createMatrix(w,h){ const m=[]; while(h--) m.push(new Array(w).fill(0)); return m; }
function createPiece(type){
    if(type==='I') return [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]];
    if(type==='J') return [[2,0,0],[2,2,2],[0,0,0]];
    if(type==='L') return [[0,0,3],[3,3,3],[0,0,0]];
    if(type==='O') return [[4,4],[4,4]];
    if(type==='S') return [[0,5,5],[5,5,0],[0,0,0]];
    if(type==='T') return [[0,6,0],[6,6,6],[0,0,0]];
    if(type==='Z') return [[7,7,0],[0,7,7],[0,0,0]];
}
function randomPiece(){ return createPiece('IJLOSTZ'[Math.floor(Math.random()*7)]); }

// Vykreslování kostek s gradientem a stínem
function drawMatrix(matrix, offset, context){
    matrix.forEach((row,y)=>{
        row.forEach((value,x)=>{
            if(value!==0){
                const gradient=context.createLinearGradient(x+offset.x,y+offset.y,x+offset.x+1,y+offset.y+1);
                gradient.addColorStop(0,colors[value]);
                gradient.addColorStop(1,"#000");
                context.fillStyle=gradient;
                context.fillRect(x+offset.x,y+offset.y,1,1);
                context.strokeStyle="#fff2";
                context.lineWidth=0.05;
                context.strokeRect(x+offset.x,y+offset.y,1,1);
            }
        });
    });
}

// Game Over animace
function drawGameOver(){
    if(!gameOverAnim) return;
    const gradient=ctx.createLinearGradient(0,0,canvas.width/20,canvas.height/20);
    gradient.addColorStop(0,"#ff0000");
    gradient.addColorStop(0.5,"#ffff00");
    gradient.addColorStop(1,"#00ffff");
    ctx.fillStyle=gradient;
    ctx.font="1.2px Arial";
    ctx.textAlign="center";
    ctx.fillText("GAME OVER", canvas.width/40, canvas.height/20);
}

function draw(){
    ctx.fillStyle="#000";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    drawMatrix(arena,{x:0,y:0},ctx);
    drawMatrix(player.matrix,player.pos,ctx);
    drawGameOver();
}

function drawNext(){ nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height); drawMatrix(player.next,{x:0,y:0},nextCtx); }

function collide(arena,player){ for(let y=0;y<player.matrix.length;y++){ for(let x=0;x<player.matrix[y].length;x++){ if(player.matrix[y][x]!==0&&(arena[y+player.pos.y]&&arena[y+player.pos.y][x+player.pos.x])!==0) return true; } } return false; }
function merge(arena,player){ player.matrix.forEach((row,y)=>{ row.forEach((value,x)=>{ if(value!==0) arena[y+player.pos.y][x+player.pos.x]=value; }); }); }
function arenaSweep(){ let rowCount=1; outer: for(let y=arena.length-1;y>=0;y--){ for(let x=0;x<arena[y].length;x++){ if(arena[y][x]===0) continue outer; } const row=arena.splice(y,1)[0].fill(0); arena.unshift(row); y++; player.score+=rowCount*10; rowCount*=2; } }
function rotate(matrix){ for(let y=0;y<matrix.length;y++){ for(let x=0;x<y;x++){ [matrix[x][y],matrix[y][x]]=[matrix[y][x],matrix[x][y]]; } } matrix.forEach(row=>row.reverse()); }
function playerRotate(){ const pos=player.pos.x; let offset=1; rotate(player.matrix); while(collide(arena,player)){ player.pos.x+=offset; offset=-(offset+(offset>0?1:-1)); if(offset>player.matrix[0].length){ rotate(player.matrix); rotate(player.matrix); rotate(player.matrix); player.pos.x=pos; return; } } }

function resetGame(){ arena.forEach(row=>row.fill(0)); player.score=0; startTime=Date.now(); player.matrix=null; player.next=null; playerReset(); }
function playerReset(){ if(!player.next){ player.matrix=randomPiece(); player.next=randomPiece(); } else{ player.matrix=player.next; player.next=randomPiece(); } player.pos.y=0; player.pos.x=Math.floor(arena[0].length/2-player.matrix[0].length/2); if(collide(arena,player)){ if(!gameOverLocked){ gameRunning=false; gameOverAnim=true; gameOverLocked=true; setTimeout(()=>{ gameOverAnim=false; tryAddLeaderboard(player.score); resetGame(); gameOverLocked=false; },2000); } return; } drawNext(); }
function playerDrop(){ player.pos.y++; if(collide(arena,player)){ player.pos.y--; merge(arena,player); arenaSweep(); playerReset(); } dropCounter=0; }

// Hlavní loop
let dropCounter=0, dropInterval=500,lastTime=0;
function update(time=0){ requestAnimationFrame(update); if(!gameRunning&&!gameOverAnim) return; const delta=time-lastTime; lastTime=time; dropCounter+=delta; if(dropCounter>dropInterval) playerDrop(); draw(); }
updateLeaderboardHTML();
update();

// Ovládání klávesami
document.addEventListener("keydown", e=>{
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code)) e.preventDefault();
    if(e.code==="Space"){ if(!gameRunning){ gameRunning=true; menu.style.display="none"; if(!player.matrix) playerReset(); } else{ gameRunning=false; menu.style.display="block"; } }
    if(!gameRunning) return;
    if(e.key==="ArrowLeft"){ player.pos.x--; if(collide(arena,player)) player.pos.x++; }
    if(e.key==="ArrowRight"){ player.pos.x++; if(collide(arena,player)) player.pos.x--; }
    if(e.key==="ArrowDown"){ playerDrop(); }
    if(e.key==="ArrowUp"){ playerRotate(); }
});

// Mobilní ovládání
document.getElementById("left").addEventListener("touchstart", e=>{ e.preventDefault(); player.pos.x--; if(collide(arena,player)) player.pos.x++; });
document.getElementById("right").addEventListener("touchstart", e=>{ e.preventDefault(); player.pos.x++; if(collide(arena,player)) player.pos.x--; });
document.getElementById("down").addEventListener("touchstart", e=>{ e.preventDefault(); playerDrop(); });
document.getElementById("rotate").addEventListener("touchstart", e=>{ e.preventDefault(); playerRotate(); });
document.getElementById("start").addEventListener("touchstart", e=>{ e.preventDefault(); if(!gameRunning){ gameRunning=true; menu.style.display="none"; if(!player.matrix) playerReset(); } else{ gameRunning=false; menu.style.display="block"; } });

// Inicializace
updateLeaderboardHTML();
update();

