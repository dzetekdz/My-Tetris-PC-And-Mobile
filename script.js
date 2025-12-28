const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.scale(30,30);

const ROWS=20, COLS=10;
let score=0, level=1, dropSpeed=750;
const COLORS=[null,"#00ffff","#3a5eff","#ff9f1c","#ffd700","#3cff3c","#b84dff","#ff3c3c"];
const SHAPES=[[],[[1,1,1,1]],[[2,0,0],[2,2,2]],[[0,0,3],[3,3,3]],[[4,4],[4,4]],[[0,5,5],[5,5,0]],[[0,6,0],[6,6,6]],[[7,7,0],[0,7,7]]];

const board=Array.from({length:ROWS},()=>Array(COLS).fill(0));
const player={pos:{x:0,y:0},matrix:null};

let nextQueue=[];
for(let i=0;i<3;i++) nextQueue.push(SHAPES[Math.floor(Math.random()*7)+1]);

let gameOver = false;
let gameRunning = false;

function drawMatrix(matrix,offset,alpha=1,ctxTarget=ctx){
  ctxTarget.globalAlpha=alpha;
  matrix.forEach((row,y)=>row.forEach((v,x)=>{
    if(v){ctxTarget.fillStyle=COLORS[v]; ctxTarget.fillRect(x+offset.x,y+offset.y,1,1);}
  }));
  ctxTarget.globalAlpha=1;
}

function collide(board,player){ return player.matrix.some((row,y)=>row.some((v,x)=>v && (board[y+player.pos.y]?.[x+player.pos.x]!==0))); }
function merge(){ player.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v) board[player.pos.y+y][player.pos.x+x]=v;})); }
function rotate(matrix){ return matrix[0].map((_,i)=>matrix.map(row=>row[i]).reverse()); }

function resetPlayer(){
  player.matrix = nextQueue.shift();
  nextQueue.push(SHAPES[Math.floor(Math.random()*7)+1]);
  player.pos.y=0;
  player.pos.x=(COLS/2|0)-(player.matrix[0].length/2|0);
  if(collide(board,player)){
    gameOver = true;
    gameRunning = false;
    drawGameOver();
    return;
  }
  drawNext();
}

function sweep(){
  let lines=0;
  for(let y=ROWS-1;y>=0;y--){ if(board[y].every(v=>v!==0)){ board.splice(y,1); board.unshift(Array(COLS).fill(0)); lines++; } }
  if(lines>0){ score += 100*lines*lines; if(score%600===0){level++; dropSpeed*=0.9;} flash(); updateUI(); }
}

function flash(){ canvas.style.boxShadow="0 0 40px gold"; setTimeout(()=>canvas.style.boxShadow="",150); }
function drop(){ 
  if(!gameRunning) return; 
  player.pos.y++; 
  if(collide(board,player)){player.pos.y--; merge(); sweep(); resetPlayer(); } 
}

function drawGhost(){
  let y=player.pos.y;
  while(!collide(board,{...player,pos:{x:player.pos.x,y}})) y++;
  y--;
  drawMatrix(player.matrix,{x:player.pos.x,y},0.3);
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawMatrix(board,{x:0,y:0});
  drawGhost();
  drawMatrix(player.matrix,player.pos);
}

function drawGameOver(){
  draw(); // vykreslí stav hry
  ctx.fillStyle="rgba(0,0,0,0.7)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="red";
  ctx.font="bold 40px Arial";
  ctx.textAlign="center";
  ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
}

function update(time=0){
  if(!gameRunning) return;
  if(!update.lastTime) update.lastTime=time;
  const delta=time-update.lastTime;
  update.lastTime=time;
  drop.counter=(drop.counter||0)+delta;
  if(drop.counter>dropSpeed){ drop(); drop.counter=0; }
  draw();
  requestAnimationFrame(update);
}

function updateUI(){ document.getElementById("score").textContent=score; document.getElementById("level").textContent=level; }

// Pohyb po blocích a blokování scrollu
document.addEventListener("keydown",e=>{
  if(["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"].includes(e.key)) e.preventDefault();
  if(!gameRunning) return;
  if(e.key==="ArrowLeft"){player.pos.x--; if(collide(board,player)) player.pos.x++;}
  if(e.key==="ArrowRight"){player.pos.x++; if(collide(board,player)) player.pos.x--;}
  if(e.key==="ArrowDown") drop();
  if(e.key==="ArrowUp") player.matrix=rotate(player.matrix);
});

// Mobilní ovládání
document.getElementById("left").onclick=()=>{ if(gameRunning){player.pos.x--; if(collide(board,player)) player.pos.x++;}};
document.getElementById("right").onclick=()=>{ if(gameRunning){player.pos.x++; if(collide(board,player)) player.pos.x--; }};
document.getElementById("down").onclick=()=>{ if(gameRunning) drop(); };
document.getElementById("rotate").onclick=()=>{ if(gameRunning) player.matrix=rotate(player.matrix); };

// Next pieces sidebar
const nextCanvases = [document.getElementById("next1"),document.getElementById("next2"),document.getElementById("next3")];
nextCanvases.forEach(c=>c.getContext("2d").scale(30,30));
function drawNext(){ nextQueue.forEach((piece,i)=>{ const ctxNext=nextCanvases[i].getContext("2d"); ctxNext.clearRect(0,0,nextCanvases[i].width,nextCanvases[i].height); drawMatrix(piece,{x:0,y:0},1,ctxNext); }); }

// Start hry
document.getElementById("startBtn").onclick=()=>{
  if(gameRunning) return; // nelze kliknout během hry
  // reset hry
  board.forEach(r=>r.fill(0));
  score=0; level=1; dropSpeed=750;
  gameOver=false;
  gameRunning = true;
  update.lastTime=0; drop.counter=0;
  resetPlayer();
  update();
};
