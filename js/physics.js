// ============================================================
//  PHYSIQUE — collisions et déplacement
// ============================================================
function inZone(x,y,z){return x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h;}
function walkable(x,y){return ZONES.some(z=>inZone(x,y,z));}
function canMove(x,y){
  return walkable(x,y)&&walkable(x-PLAYER_R,y)&&walkable(x+PLAYER_R,y)
       &&walkable(x,y-PLAYER_R)&&walkable(x,y+PLAYER_R);
}
function moveEnt(e,inputFn){
  if(minigameActive) return;
  const {dx,dy}=(inputFn||inputVec)();
  const nx=e.x+dx*SPEED, ny=e.y+dy*SPEED;
  if(canMove(nx,e.y)) e.x=nx;
  if(canMove(e.x,ny)) e.y=ny;
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
