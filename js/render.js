// ============================================================
//  RENDU — caméra, fog, dessin du monde
// ============================================================
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
const TAU=Math.PI*2; // constante locale : cercle complet

function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}

function camera(){
  let mx, my;
  if(localMode){
    // Caméra centrée entre les deux joueurs
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
  ctx.fillStyle=css('--space');ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.save();ctx.translate(-cx,-cy);

  // sols
  for(const z of HALLS) rrect(z.x,z.y,z.w,z.h,8,css('--hall'));
  for(const r of ROOMS){
    rrect(r.x,r.y,r.w,r.h,16,css('--floor'));
    ctx.strokeStyle=css('--floor-edge');ctx.lineWidth=2;
    ctx.strokeRect(r.x+2,r.y+2,r.w-4,r.h-4);
    ctx.fillStyle='rgba(238,240,255,.4)';ctx.font='600 14px sans-serif';ctx.textAlign='center';
    ctx.fillText(r.name,r.x+r.w/2,r.y+22);
  }

  // baie médicale (zone de soin)
  ctx.beginPath();ctx.arc(HEAL_ZONE.x,HEAL_ZONE.y,HEAL_ZONE.r,0,TAU);
  ctx.fillStyle='rgba(122,211,255,.18)';ctx.fill();
  ctx.fillStyle=css('--heal');ctx.font='24px sans-serif';ctx.textAlign='center';
  ctx.fillText('✚',HEAL_ZONE.x,HEAL_ZONE.y+8);

  // téléporteurs
  for(const tp of TELEPORTS){
    ctx.beginPath();ctx.arc(tp.x,tp.y,20,0,TAU);
    ctx.fillStyle='rgba(192,140,255,.25)';ctx.fill();
    ctx.fillStyle=css('--teleport');ctx.font='20px sans-serif';ctx.textAlign='center';
    ctx.fillText('🌀',tp.x,tp.y+7);
  }

  // panneau O₂ — clignotant si sabotage actif
  if(frame<S.oxygenUntil){
    const pulse=Math.sin(frame*0.25)*0.3+0.7;
    ctx.beginPath();ctx.arc(OXY_PANEL.x,OXY_PANEL.y,28,0,TAU);
    ctx.fillStyle=`rgba(255,93,108,${(pulse*0.45).toFixed(2)})`;ctx.fill();
    ctx.fillStyle='#ff5d6c';ctx.font='bold 18px sans-serif';ctx.textAlign='center';
    ctx.fillText('O₂',OXY_PANEL.x,OXY_PANEL.y+6);
  }

  // tâches
  for(const t of TASKS){
    const done=S.tasks[t.id];
    const near=!done&&myRole==='innocent'&&dist(S.inno,t)<44;
    // anneau de proximité
    if(near){
      ctx.beginPath();ctx.arc(t.x,t.y,24,0,TAU);
      ctx.strokeStyle='rgba(255,216,77,.6)';ctx.lineWidth=2;ctx.stroke();
    }
    ctx.beginPath();ctx.arc(t.x,t.y,17,0,TAU);
    ctx.fillStyle=done?css('--task-done'):css('--task');ctx.fill();
    ctx.fillStyle=done?'#0a2a14':'#5a4a00';ctx.font='bold 15px sans-serif';ctx.textAlign='center';
    ctx.fillText(done?'✓':'⚙',t.x,t.y+5);
  }

  // personnages
  if(S.impo.present) player(S.impo.x,S.impo.y,css('--imposteur'),'😈');
  player(S.inno.x,S.inno.y,css('--innocent'),S.inno.alive?'😇':'💀');

  ctx.restore();
  if(!localMode) drawFog(cx,cy); // en local les deux voient tout
  drawHud();
  if(S.over) drawBanner();
}

function drawFog(cx,cy){
  const me=myRole==='innocent'?S.inno:S.impo;
  const sx=me.x-cx, sy=me.y-cy;
  const dark=frame<S.sabotageUntil;
  const radius=dark?VISION_DARK:VISION;
  const darkColor=dark?'rgba(3,4,10,0.97)':'rgba(5,6,14,0.95)';

  // 1re passe : dégradé radial pour le bord doux
  const g=ctx.createRadialGradient(sx,sy,radius*0.55,sx,sy,radius);
  g.addColorStop(0,'rgba(7,8,16,0)');
  g.addColorStop(1,darkColor);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,VIEW_W,VIEW_H);

  // 2e passe : noir opaque hors du cercle de vision
  // fill('evenodd') : le rect ET l'arc s'annulent → trou net, pas de shadow résiduelle
  ctx.fillStyle=darkColor;
  ctx.beginPath();
  ctx.rect(0,0,VIEW_W,VIEW_H);
  ctx.arc(sx,sy,radius,0,TAU,true); // true = sens antihoraire → découpe le cercle
  ctx.fill('evenodd');
}

function player(x,y,color,emoji){
  ctx.beginPath();ctx.arc(x,y,PLAYER_R,0,TAU);ctx.fillStyle=color;ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.3)';ctx.stroke();
  ctx.font='17px sans-serif';ctx.textAlign='center';ctx.fillText(emoji,x,y+6);
}
function rrect(x,y,w,h,r,fill){
  ctx.beginPath();ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
}
