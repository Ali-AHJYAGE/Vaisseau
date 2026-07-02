// ============================================================
//  PHYSIQUE — collisions, portes, déplacement (v13)
// ============================================================
function inZone(x,y,z){return x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h;}

function doorsClosed(){ return Date.now()<S.doorsUntil; }
function inClosedDoor(x,y){
  if(!doorsClosed()) return false;
  return DOORS.some(d=>inZone(x,y,d));
}

// respectDoors : seul l'innocent est bloqué par les portes (l'imposteur les contrôle)
function walkable(x,y,respectDoors){
  if(!ZONES.some(z=>inZone(x,y,z))) return false;
  if(respectDoors && inClosedDoor(x,y)) return false;
  return true;
}
function canMove(x,y,respectDoors){
  return walkable(x,y,respectDoors)
      && walkable(x-PLAYER_R,y,respectDoors) && walkable(x+PLAYER_R,y,respectDoors)
      && walkable(x,y-PLAYER_R,respectDoors) && walkable(x,y+PLAYER_R,respectDoors);
}
function moveEnt(e,inputFn,speed,respectDoors){
  if(minigameActive) return;
  const {dx,dy}=(inputFn||inputVec)();
  const sp=speed||SPEED;
  const nx=e.x+dx*sp, ny=e.y+dy*sp;
  if(canMove(nx,e.y,respectDoors)) e.x=nx;
  if(canMove(e.x,ny,respectDoors)) e.y=ny;
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
