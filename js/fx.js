// ============================================================
//  FX (v14) — particules, tremblement d'écran, flash plein écran
// ============================================================
const particles = [];
let _shakeUntil=0, _shakeMag=0, _flashUntil=0, _flashColor='rgba(255,80,90,0.4)';

// Émet n particules depuis (x,y) en coordonnées MONDE
function emit(x,y,color,n,speed,life){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, s=speed*(0.4+Math.random()*0.6);
    particles.push({ x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:life||30, max:life||30, color, r:2+Math.random()*2 });
  }
}
function burst(x,y,color){ emit(x,y,color,14,3.2,34); }
function puff(x,y){ emit(x,y,'rgba(180,190,230,0.9)',12,2.4,26); }
function sparkle(x,y,color){ emit(x,y,color,8,1.8,30); }

function updateFX(){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx; p.y+=p.vy; p.vx*=0.92; p.vy*=0.92; p.vy+=0.04; p.life--;
    if(p.life<=0) particles.splice(i,1);
  }
}
function drawParticles(){   // appelé dans le repère MONDE
  for(const p of particles){
    ctx.globalAlpha=Math.max(0,p.life/p.max);
    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
}

function shake(mag,dur){ _shakeUntil=Date.now()+dur; _shakeMag=mag; }
function shakeOffset(){
  if(Date.now()>=_shakeUntil) return {x:0,y:0};
  const k=(_shakeUntil-Date.now())/300; const m=_shakeMag*Math.min(1,k);
  return { x:(Math.random()*2-1)*m, y:(Math.random()*2-1)*m };
}
function flash(color,dur){ _flashUntil=Date.now()+dur; _flashColor=color; }
function drawFlash(){       // appelé en repère ÉCRAN
  if(Date.now()>=_flashUntil) return;
  const k=(_flashUntil-Date.now())/260;
  ctx.save(); ctx.globalAlpha=Math.min(0.55,k*0.55);
  ctx.fillStyle=_flashColor; ctx.fillRect(0,0,VIEW_W,VIEW_H); ctx.restore();
}
