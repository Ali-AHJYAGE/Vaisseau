// ============================================================
//  RENDU (v13) — caméra, monde, fog, mini-carte
// ============================================================
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
const TAU=Math.PI*2;

const C={
  space:'#070810', hall:'#2c3358', floor:'#262c4a', edge:'#313a63',
  innocent:'#56e0d0', imposteur:'#f2618f', task:'#ffd84d', taskDone:'#74e08a',
  heal:'#7ad3ff', teleport:'#c08cff', vent:'#8a94c8', weapon:'#ffb14d',
  gadget:'#8ad3ff', door:'#9aa4d8', doorShut:'#ff5a66', ink:'rgba(238,240,255,0.4)',
};
const GADGET_ICON={scanner:'📡', shield:'🛡️'};

function camera(){
  let mx,my;
  if(localMode){ mx=(S.inno.x+S.impo.x)/2; my=(S.inno.y+S.impo.y)/2; }
  else { const me=myRole==='imposteur'?S.impo:S.inno; mx=me.x; my=me.y; }
  let cx=mx-VIEW_W/2, cy=my-VIEW_H/2;
  cx=Math.max(0,Math.min(WORLD_W-VIEW_W,cx));
  cy=Math.max(0,Math.min(WORLD_H-VIEW_H,cy));
  return {cx,cy};
}

function draw(){
  const {cx,cy}=camera();
  ctx.fillStyle=C.space; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.save(); ctx.translate(-cx,-cy);

  const iAmInno = (myRole==='innocent'||localMode);
  const iAmImpo = (myRole==='imposteur'||localMode);

  // Couloirs + salles
  for(const z of HALLS) rrect(z.x,z.y,z.w,z.h,8,C.hall);
  for(const r of ROOMS){
    rrect(r.x,r.y,r.w,r.h,16,C.floor);
    ctx.strokeStyle=C.edge; ctx.lineWidth=2; ctx.strokeRect(r.x+2,r.y+2,r.w-4,r.h-4);
    ctx.fillStyle=C.ink; ctx.font='600 14px sans-serif'; ctx.textAlign='center';
    ctx.fillText(r.name,r.x+r.w/2,r.y+22);
  }

  // Portes (chokepoints)
  const dShut=doorsClosed();
  for(const d of DOORS) rrect(d.x,d.y,d.w,d.h,4, dShut?'rgba(255,90,102,0.9)':'rgba(150,160,210,0.28)');

  // Zone de soin
  ctx.beginPath(); ctx.arc(HEAL_ZONE.x,HEAL_ZONE.y,HEAL_ZONE.r,0,TAU);
  ctx.fillStyle='rgba(122,211,255,.18)'; ctx.fill();
  ctx.fillStyle=C.heal; ctx.font='24px sans-serif'; ctx.textAlign='center';
  ctx.fillText('✚',HEAL_ZONE.x,HEAL_ZONE.y+8);

  // Panneau O₂ (toujours visible, pulse rouge si crise)
  const oxyOn=Date.now()<S.oxygenUntil;
  ctx.beginPath(); ctx.arc(OXY_PANEL.x,OXY_PANEL.y,oxyOn?28:20,0,TAU);
  if(oxyOn){ const p=Math.sin(frame*0.25)*0.3+0.7; ctx.fillStyle=`rgba(255,93,108,${(p*0.5).toFixed(2)})`; }
  else ctx.fillStyle='rgba(120,140,200,0.18)';
  ctx.fill();
  ctx.fillStyle=oxyOn?'#ff5d6c':'#8fa0d8'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
  ctx.fillText('O₂',OXY_PANEL.x,OXY_PANEL.y+6);

  // Téléporteurs (innocent)
  if(iAmInno) for(const tp of TELEPORTS){
    ctx.beginPath(); ctx.arc(tp.x,tp.y,20,0,TAU);
    ctx.fillStyle='rgba(192,140,255,.25)'; ctx.fill();
    ctx.fillStyle=C.teleport; ctx.font='20px sans-serif'; ctx.textAlign='center';
    ctx.fillText('🌀',tp.x,tp.y+7);
  }

  // Vents (imposteur)
  if(iAmImpo) for(const v of VENTS) drawVent(v.x,v.y);

  // Armes à ramasser (imposteur)
  if(iAmImpo) for(const w of WEAPON_PICKUPS) if(!takenWeapons.has(w.id))
    drawPickup(w.x,w.y,WEAPON_TYPES[w.type].icon,C.weapon);
  // Gadgets à ramasser (innocent)
  if(iAmInno) for(const g of GADGET_PICKUPS) if(!takenGadgets.has(g.id))
    drawPickup(g.x,g.y,GADGET_ICON[g.type],C.gadget);

  // Tâches
  for(const t of TASKS){
    const done=S.tasks[t.id];
    const near=!done&&iAmInno&&dist(S.inno,t)<44;
    if(near){ ctx.beginPath(); ctx.arc(t.x,t.y,24,0,TAU); ctx.strokeStyle='rgba(255,216,77,.6)'; ctx.lineWidth=2; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(t.x,t.y,17,0,TAU);
    ctx.fillStyle=done?C.taskDone:C.task; ctx.fill();
    ctx.fillStyle=done?'#0a2a14':'#5a4a00'; ctx.font='bold 15px sans-serif'; ctx.textAlign='center';
    ctx.fillText(done?'✓':'⚙',t.x,t.y+5);
  }

  // Personnages
  if(S.impo.present) player(S.impo.x,S.impo.y,C.imposteur,'😈');
  if(iAmInno||S.inno.synced) player(S.inno.x,S.inno.y,C.innocent,S.inno.alive?'😇':'💀');

  // Bouclier de l'innocent (halo)
  if((iAmInno||S.inno.synced)&&S.inno.shield>0&&S.inno.alive){
    ctx.beginPath(); ctx.arc(S.inno.x,S.inno.y,PLAYER_R+5,0,TAU);
    ctx.strokeStyle='rgba(138,211,255,.9)'; ctx.lineWidth=2.5; ctx.stroke();
  }

  ctx.restore();

  if(!localMode) drawFog(cx,cy);
  drawScanReveal(cx,cy);
  drawMinimap();
  drawStamina();
  drawHud();
  if(S.over) drawBanner();
  _drawDebug();
}

function drawVent(x,y){
  rrect(x-13,y-13,26,26,6,'rgba(20,24,42,0.95)');
  ctx.strokeStyle=C.vent; ctx.lineWidth=1.4;
  for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(x-8,y+i*6); ctx.lineTo(x+8,y+i*6); ctx.stroke(); }
}
function drawPickup(x,y,icon,ring){
  const p=Math.sin(frame*0.12)*2;
  ctx.beginPath(); ctx.arc(x,y,15,0,TAU);
  ctx.fillStyle='rgba(20,24,42,0.8)'; ctx.fill();
  ctx.strokeStyle=ring; ctx.lineWidth=2; ctx.stroke();
  ctx.font='17px sans-serif'; ctx.textAlign='center';
  ctx.fillText(icon,x,y+6-p*0);
}

// Scanner : révèle l'imposteur par-dessus le fog
function drawScanReveal(cx,cy){
  if(localMode||myRole!=='innocent') return;
  if(Date.now()>=scanUntil||!S.impo.present) return;
  const sx=S.impo.x-cx, sy=S.impo.y-cy;
  const p=Math.sin(frame*0.3)*3+10;
  ctx.beginPath(); ctx.arc(sx,sy,p+6,0,TAU);
  ctx.strokeStyle='rgba(138,211,255,.9)'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.font='18px sans-serif'; ctx.textAlign='center'; ctx.fillStyle='#fff';
  ctx.fillText('😈',sx,sy+6);
}

// Jauge d'endurance (bas-gauche, au-dessus de la barre debug)
function drawStamina(){
  const w=110,h=7,x=12,y=VIEW_H-34;
  const r=Math.max(0,Math.min(1,stamina/STAMINA_MAX));
  rrect(x-2,y-2,w+4,h+4,4,'rgba(0,0,0,0.45)');
  ctx.fillStyle = r<0.25?'#ff8a5d':'#8ad3ff';
  rrect(x,y,w*r,h,3,ctx.fillStyle);
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='9px monospace'; ctx.textAlign='left';
  ctx.fillText('⚡ SPRINT',x,y-5);
}

function drawMinimap(){
  const w=150, scale=w/WORLD_W, h=WORLD_H*scale, x0=(VIEW_W-w)/2, y0=8;
  rrect(x0-4,y0-4,w+8,h+8,8,'rgba(10,12,24,0.8)');
  ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1; ctx.strokeRect(x0-4,y0-4,w+8,h+8);
  const px=v=>x0+v*scale, py=v=>y0+v*scale;
  const dot=(x,y,r)=>{ ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); };

  ctx.save(); ctx.beginPath(); ctx.rect(x0,y0,w,h); ctx.clip();
  for(const z of HALLS){ ctx.fillStyle=C.hall;  ctx.fillRect(px(z.x),py(z.y),z.w*scale,z.h*scale); }
  for(const r of ROOMS){ ctx.fillStyle=C.floor; ctx.fillRect(px(r.x),py(r.y),r.w*scale,r.h*scale); }

  const iAmInno=(myRole==='innocent'||localMode), iAmImpo=(myRole==='imposteur'||localMode);
  const blind = myRole==='innocent' && Date.now()<S.sabotageUntil;
  if(blind){
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(x0,y0,w,h);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
    ctx.fillText('⚡',x0+w/2,y0+h/2+6); ctx.restore(); return;
  }

  // O₂ + soin repères
  ctx.fillStyle=Date.now()<S.oxygenUntil?'#ff5d6c':'rgba(120,140,200,.5)'; dot(px(OXY_PANEL.x),py(OXY_PANEL.y),2);
  ctx.fillStyle=C.heal; dot(px(HEAL_ZONE.x),py(HEAL_ZONE.y),2);
  if(iAmInno){ ctx.fillStyle=C.teleport; for(const tp of TELEPORTS) dot(px(tp.x),py(tp.y),1.8); }
  if(iAmImpo){ ctx.fillStyle=C.vent;     for(const v of VENTS) dot(px(v.x),py(v.y),1.8); }
  for(const t of TASKS){ ctx.fillStyle=S.tasks[t.id]?C.taskDone:C.task; dot(px(t.x),py(t.y),2.4); }

  if(localMode){
    ctx.fillStyle=C.imposteur; dot(px(S.impo.x),py(S.impo.y),3.2);
    ctx.fillStyle=C.innocent;  dot(px(S.inno.x),py(S.inno.y),3.2);
  } else {
    const me=myRole==='imposteur'?S.impo:S.inno;
    ctx.fillStyle=myRole==='imposteur'?C.imposteur:C.innocent;
    dot(px(me.x),py(me.y),3.4);
    ctx.lineWidth=1.2; ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.stroke();
    // scanner actif → point rouge de l'imposteur sur la carte
    if(myRole==='innocent'&&Date.now()<scanUntil&&S.impo.present){ ctx.fillStyle=C.imposteur; dot(px(S.impo.x),py(S.impo.y),3); }
  }
  ctx.restore();
}

function _drawDebug(){
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(VIEW_W-70,VIEW_H-16,70,16);
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.font='10px monospace'; ctx.textAlign='right';
  ctx.fillText(`[${VERSION}] ws:${wsReady()}`,VIEW_W-4,VIEW_H-4);
  ctx.restore();
}

function drawFog(cx,cy){
  const me=myRole==='imposteur'?S.impo:S.inno;
  const sx=me.x-cx, sy=me.y-cy;
  const dark=myRole==='innocent'&&Date.now()<S.sabotageUntil;
  const radius=dark?VISION_DARK:VISION;
  const darkColor=dark?'rgba(3,4,10,0.97)':'rgba(5,6,14,0.95)';
  const g=ctx.createRadialGradient(sx,sy,radius*0.55,sx,sy,radius);
  g.addColorStop(0,'rgba(7,8,16,0)'); g.addColorStop(1,darkColor);
  ctx.fillStyle=g; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.fillStyle=darkColor;
  ctx.beginPath(); ctx.rect(0,0,VIEW_W,VIEW_H); ctx.arc(sx,sy,radius,0,TAU,true); ctx.fill('evenodd');
}

function player(x,y,color,emoji){
  ctx.beginPath(); ctx.arc(x,y,PLAYER_R,0,TAU); ctx.fillStyle=color; ctx.fill();
  ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.stroke();
  ctx.font='17px sans-serif'; ctx.textAlign='center'; ctx.fillText(emoji,x,y+6);
}
function rrect(x,y,w,h,r,fill){
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
}
