// ============================================================
//  RENDU — caméra, fog, dessin du monde
// ============================================================
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
const TAU=Math.PI*2;

// Couleurs figées (plus fiable que lire les CSS vars à chaque frame)
const C={
  space:    '#070810',
  hall:     '#2c3358',
  floor:    '#262c4a',
  edge:     '#313a63',
  innocent: '#56e0d0',
  imposteur:'#f2618f',
  task:     '#ffd84d',
  taskDone: '#74e08a',
  heal:     '#7ad3ff',
  teleport: '#c08cff',
  ink:      'rgba(238,240,255,0.4)',
};

function camera(){
  let mx, my;
  if(localMode){
    mx=(S.inno.x+S.impo.x)/2;
    my=(S.inno.y+S.impo.y)/2;
  } else {
    const me=myRole==='innocent'?S.inno:S.impo;
    mx=me.x; my=me.y;
  }
  let cx=mx-VIEW_W/2, cy=my-VIEW_H/2;
  cx=Math.max(0,Math.min(WORLD_W-VIEW_W,cx));
  cy=Math.max(0,Math.min(WORLD_H-VIEW_H,cy));
  return {cx,cy};
}

function draw(){
  const {cx,cy}=camera();
  ctx.fillStyle=C.space; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.save(); ctx.translate(-cx,-cy);

  // Couloirs
  for(const z of HALLS) rrect(z.x,z.y,z.w,z.h,8,C.hall);

  // Salles
  for(const r of ROOMS){
    rrect(r.x,r.y,r.w,r.h,16,C.floor);
    ctx.strokeStyle=C.edge; ctx.lineWidth=2;
    ctx.strokeRect(r.x+2,r.y+2,r.w-4,r.h-4);
    ctx.fillStyle=C.ink; ctx.font='600 14px sans-serif'; ctx.textAlign='center';
    ctx.fillText(r.name,r.x+r.w/2,r.y+22);
  }

  // Zone de soin
  ctx.beginPath(); ctx.arc(HEAL_ZONE.x,HEAL_ZONE.y,HEAL_ZONE.r,0,TAU);
  ctx.fillStyle='rgba(122,211,255,.18)'; ctx.fill();
  ctx.fillStyle=C.heal; ctx.font='24px sans-serif'; ctx.textAlign='center';
  ctx.fillText('✚',HEAL_ZONE.x,HEAL_ZONE.y+8);

  // Téléporteurs
  for(const tp of TELEPORTS){
    ctx.beginPath(); ctx.arc(tp.x,tp.y,20,0,TAU);
    ctx.fillStyle='rgba(192,140,255,.25)'; ctx.fill();
    ctx.fillStyle=C.teleport; ctx.font='20px sans-serif'; ctx.textAlign='center';
    ctx.fillText('🌀',tp.x,tp.y+7);
  }

  // Panneau O₂ (si sabotage actif)
  if(frame<S.oxygenUntil){
    const pulse=Math.sin(frame*0.25)*0.3+0.7;
    ctx.beginPath(); ctx.arc(OXY_PANEL.x,OXY_PANEL.y,28,0,TAU);
    ctx.fillStyle=`rgba(255,93,108,${(pulse*0.45).toFixed(2)})`; ctx.fill();
    ctx.fillStyle='#ff5d6c'; ctx.font='bold 18px sans-serif'; ctx.textAlign='center';
    ctx.fillText('O₂',OXY_PANEL.x,OXY_PANEL.y+6);
  }

  // Tâches
  for(const t of TASKS){
    const done=S.tasks[t.id];
    const near=!done&&myRole==='innocent'&&dist(S.inno,t)<44;
    if(near){
      ctx.beginPath(); ctx.arc(t.x,t.y,24,0,TAU);
      ctx.strokeStyle='rgba(255,216,77,.6)'; ctx.lineWidth=2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(t.x,t.y,17,0,TAU);
    ctx.fillStyle=done?C.taskDone:C.task; ctx.fill();
    ctx.fillStyle=done?'#0a2a14':'#5a4a00';
    ctx.font='bold 15px sans-serif'; ctx.textAlign='center';
    ctx.fillText(done?'✓':'⚙',t.x,t.y+5);
  }

  // Personnages
  if(S.impo.present) player(S.impo.x,S.impo.y,C.imposteur,'😈');
  player(S.inno.x,S.inno.y,C.innocent,S.inno.alive?'😇':'💀');

  ctx.restore();
  if(!localMode) drawFog(cx,cy);
  drawHud();
  if(S.over) drawBanner();
}

function drawFog(cx,cy){
  const me=myRole==='innocent'?S.inno:S.impo;
  const sx=me.x-cx, sy=me.y-cy;
  const dark=frame<S.sabotageUntil;
  const radius=dark?VISION_DARK:VISION;
  const darkColor=dark?'rgba(3,4,10,0.97)':'rgba(5,6,14,0.95)';

  const g=ctx.createRadialGradient(sx,sy,radius*0.55,sx,sy,radius);
  g.addColorStop(0,'rgba(7,8,16,0)');
  g.addColorStop(1,darkColor);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,VIEW_W,VIEW_H);

  ctx.fillStyle=darkColor;
  ctx.beginPath();
  ctx.rect(0,0,VIEW_W,VIEW_H);
  ctx.arc(sx,sy,radius,0,TAU,true);
  ctx.fill('evenodd');
}

function player(x,y,color,emoji){
  ctx.beginPath(); ctx.arc(x,y,PLAYER_R,0,TAU);
  ctx.fillStyle=color; ctx.fill();
  ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.stroke();
  ctx.font='17px sans-serif'; ctx.textAlign='center';
  ctx.fillText(emoji,x,y+6);
}
function rrect(x,y,w,h,r,fill){
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
}
