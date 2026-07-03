// ============================================================
//  RENDU (v14) — style cartoon coloré, particules, caméra
// ============================================================
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
const TAU=Math.PI*2;

const C={
  space:'#0b1030', space2:'#191d47',
  hall:'#3a4a86', floor:'#3d4f96', floorHi:'#5566bb', edge:'#7f96e8',
  innocent:'#3fd0c9', imposteur:'#ff5d8f', task:'#ffd23f', taskDone:'#5fe08a',
  heal:'#5cc8ff', teleport:'#c77dff', vent:'#aab4e8', weapon:'#ffab3d', gadget:'#5cc8ff',
  visor:'#bfefff', ink:'rgba(230,235,255,0.55)',
};
const GADGET_ICON={scanner:'📡', shield:'🛡️'};

// Étoiles (parallax) — générées une fois
const STARS=Array.from({length:130},()=>({x:Math.random()*VIEW_W, y:Math.random()*VIEW_H, z:0.2+Math.random()*0.6, r:Math.random()*1.6+0.4}));

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
  updateFX();
  const {cx,cy}=camera();

  // Fond spatial + étoiles parallax
  const bg=ctx.createLinearGradient(0,0,0,VIEW_H);
  bg.addColorStop(0,C.space2); bg.addColorStop(1,C.space);
  ctx.fillStyle=bg; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  if(!hasImg('space')) drawStars(cx,cy); else drawImg('space',VIEW_W/2,VIEW_H/2,VIEW_W,VIEW_H);

  const sh=shakeOffset();
  ctx.save(); ctx.translate(-cx+sh.x,-cy+sh.y);

  const iAmInno=(myRole==='innocent'||localMode), iAmImpo=(myRole==='imposteur'||localMode);

  // Couloirs
  for(const z of HALLS){ rpath(z.x,z.y,z.w,z.h,10); ctx.fillStyle=C.hall; ctx.fill(); }
  // Salles — sol thématique + décor par pièce (clippé à la salle)
  for(const r of ROOMS){
    const th=ROOM_FLOOR[r.name]||ROOM_FLOOR._def;
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.35)'; ctx.shadowBlur=12; ctx.shadowOffsetY=5;
    rpath(r.x,r.y,r.w,r.h,20);
    const g=ctx.createLinearGradient(0,r.y,0,r.y+r.h); g.addColorStop(0,th.hi); g.addColorStop(1,th.lo);
    ctx.fillStyle=g; ctx.fill(); ctx.restore();

    ctx.save(); rpath(r.x,r.y,r.w,r.h,20); ctx.clip();
    drawFloorPattern(r,th);
    drawRoomScene(r,th);
    ctx.restore();

    rpath(r.x+3,r.y+3,r.w-6,r.h-6,17); ctx.strokeStyle=th.edge; ctx.lineWidth=3; ctx.stroke();
    ctx.fillStyle=th.ink; ctx.font='800 12px sans-serif'; ctx.textAlign='center'; ctx.letterSpacing='1px';
    ctx.fillText(r.name.toUpperCase(),r.x+r.w/2,r.y+20); ctx.letterSpacing='0px';
  }

  // Portes
  const dShut=doorsClosed();
  for(const d of DOORS){ rpath(d.x,d.y,d.w,d.h,5); ctx.fillStyle=dShut?'rgba(255,90,110,0.95)':'rgba(150,165,220,0.3)'; ctx.fill();
    if(dShut){ ctx.strokeStyle='#ffd0d6'; ctx.lineWidth=2; ctx.stroke(); } }

  // Zone de soin
  glowCircle(HEAL_ZONE.x,HEAL_ZONE.y,HEAL_ZONE.r,'rgba(92,200,255,.16)');
  ctx.fillStyle=C.heal; ctx.font='26px sans-serif'; ctx.textAlign='center'; ctx.fillText('✚',HEAL_ZONE.x,HEAL_ZONE.y+9);

  // Panneau O₂
  const oxyOn=Date.now()<S.oxygenUntil;
  if(oxyOn){ const p=Math.sin(frame*0.25)*0.3+0.7; glowCircle(OXY_PANEL.x,OXY_PANEL.y,30,`rgba(255,93,108,${(p*0.5).toFixed(2)})`); }
  else glowCircle(OXY_PANEL.x,OXY_PANEL.y,20,'rgba(120,140,220,0.18)');
  ctx.fillStyle=oxyOn?'#ff5d6c':'#9fb0e8'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center'; ctx.fillText('O₂',OXY_PANEL.x,OXY_PANEL.y+6);

  // Téléporteurs (innocent)
  if(iAmInno) for(const tp of TELEPORTS){
    const p=Math.sin(frame*0.1+tp.x)*3;
    glowCircle(tp.x,tp.y,20,'rgba(199,125,255,.28)');
    ctx.fillStyle=C.teleport; ctx.font='22px sans-serif'; ctx.textAlign='center'; ctx.fillText('🌀',tp.x,tp.y+7+p*0.2);
  }
  // Vents (imposteur)
  if(iAmImpo) for(const v of VENTS) drawVent(v.x,v.y);

  // Pickups
  if(iAmImpo) for(const w of WEAPON_PICKUPS) if(!takenWeapons.has(w.id)) drawPickup(w.x,w.y,WEAPON_TYPES[w.type].icon,C.weapon);
  if(iAmInno) for(const g of GADGET_PICKUPS) if(!takenGadgets.has(g.id)) drawPickup(g.x,g.y,GADGET_ICON[g.type],C.gadget);

  // Tâches
  for(const t of TASKS){
    const done=S.tasks[t.id]; const near=!done&&iAmInno&&dist(S.inno,t)<44;
    if(near){ const p=Math.sin(frame*0.2)*2; glowCircle(t.x,t.y,24+p,'rgba(255,210,63,.18)'); }
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.4)'; ctx.shadowBlur=6; ctx.shadowOffsetY=2;
    ctx.beginPath(); ctx.arc(t.x,t.y,16,0,TAU); ctx.fillStyle=done?C.taskDone:C.task; ctx.fill(); ctx.restore();
    ctx.fillStyle=done?'#0a3018':'#5a4a00'; ctx.font='bold 15px sans-serif'; ctx.textAlign='center'; ctx.fillText(done?'✓':'⚙',t.x,t.y+5);
  }

  // Particules (sous les persos)
  drawParticles();

  // Personnages
  if(S.impo.present) drawBean(S.impo,C.imposteur,false,'imposteur');
  if(iAmInno||S.inno.synced) drawBean(S.inno,C.innocent,!S.inno.alive,'innocent');

  ctx.restore();

  if(!localMode) drawFog(cx,cy);
  drawScanReveal(cx,cy);
  drawFlash();
  drawMinimap();
  drawStamina();
  drawHud();
  if(S.over) drawBanner();
  _drawDebug();
}

function drawStars(cx,cy){
  ctx.fillStyle='#fff';
  for(const s of STARS){
    let x=(s.x - cx*s.z)%VIEW_W; if(x<0)x+=VIEW_W;
    let y=(s.y - cy*s.z)%VIEW_H; if(y<0)y+=VIEW_H;
    ctx.globalAlpha=0.3+s.z*0.6; ctx.beginPath(); ctx.arc(x,y,s.r,0,TAU); ctx.fill();
  }
  ctx.globalAlpha=1;
}

// Personnage style Among Us : ombre + corps + visière + rebond + orientation
function drawBean(e,color,dead,slot){
  if(e._rx===undefined){ e._rx=e.x; e._ry=e.y; e._lx=e.x; e._ly=e.y; e._face=1; }
  const k=isRemote(e)?0.28:1;
  e._rx+=(e.x-e._rx)*k; e._ry+=(e.y-e._ry)*k;
  const dx=e._rx-e._lx, dy=e._ry-e._ly; const spd=Math.hypot(dx,dy);
  if(dx>0.3)e._face=1; else if(dx<-0.3)e._face=-1;
  e._lx=e._rx; e._ly=e._ry;
  const x=e._rx, y=e._ry, moving=spd>0.4;
  const bob=moving?Math.sin(frame*0.35)*2.2:Math.sin(frame*0.06)*0.8;

  // ombre
  ctx.fillStyle='rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(x,y+PLAYER_R*0.92,PLAYER_R*0.85,PLAYER_R*0.36,0,0,TAU); ctx.fill();

  // ── Skins fournis (assets/) — priorité au rendu par code ──
  const size=PLAYER_R*2.6;
  if(dead){
    if(drawImg(slot+'_dead',x,y-bob,size)) return;  // sinon → bean mort ci-dessous
  } else if(hasImg(slot+'_walk')){
    // feuille de marche : idle à l'arrêt, cycle en mouvement, retourné selon le sens
    let idx, sx=1;
    if(!moving){ idx=SKIN_ANIM.idle; }
    else {
      const s=SKIN_ANIM.walk; idx=s[Math.floor(frame/SKIN_ANIM.step)%s.length];
      sx = SKIN_ANIM.faceRight ? e._face : -e._face;
    }
    ctx.save(); ctx.translate(x,y-bob); ctx.scale(sx,1);
    drawSheet(slot+'_walk', idx, 0,0, SKIN_ANIM.dispH, SKIN_ANIM.frames, SKIN_ANIM.yOff);
    ctx.restore(); return;
  } else if(hasImg(slot)){
    // sprite unique : marche simulée (rebond + squash & stretch + balancement)
    const t=frame*0.35, squash=moving?1+Math.sin(t)*0.08:1, sway=moving?Math.sin(t)*0.09:0;
    ctx.save(); ctx.translate(x,y-bob); ctx.rotate(sway*e._face); ctx.scale(e._face,squash);
    drawImg(slot,0,0,size); ctx.restore(); return;
  }

  const cy0=y+bob;
  if(dead){
    // bean tombé + yeux ✕
    ctx.save(); ctx.translate(x,y+4); ctx.rotate(Math.PI/2*0.72);
    beanBody(0,0,'#7d86a8',e._face); ctx.restore();
    ctx.fillStyle='#2a2f52'; ctx.font='bold 12px sans-serif'; ctx.textAlign='center'; ctx.fillText('✕',x-2,y-2);
    return;
  }

  beanBody(x,cy0,color,e._face);
  // pattes qui gigotent
  const lw=PLAYER_R*0.42, step=moving?Math.sin(frame*0.35)*2:0;
  ctx.fillStyle=shade(color,-40);
  rpath(x-lw-1,cy0+PLAYER_R*0.75+step,lw,7,3); ctx.fill();
  rpath(x+1,cy0+PLAYER_R*0.75-step,lw,7,3); ctx.fill();
  // corps par-dessus les pattes déjà dessiné ? on redessine le corps
  beanBody(x,cy0,color,e._face);
  // visière
  const vx=x+e._face*3, vy=cy0-PLAYER_R*0.35;
  ctx.beginPath(); ctx.ellipse(vx,vy,PLAYER_R*0.62,PLAYER_R*0.44,0,0,TAU);
  ctx.fillStyle=C.visor; ctx.fill(); ctx.strokeStyle=shade(color,-50); ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(vx+e._face*3,vy-3,3,4,0,0,TAU); ctx.fill();

  // bouclier
  if(e===S.inno && S.inno.shield>0){
    ctx.beginPath(); ctx.arc(x,cy0,PLAYER_R+6,0,TAU);
    ctx.strokeStyle='rgba(92,200,255,.9)'; ctx.lineWidth=2.5; ctx.stroke();
  }
}
function beanBody(x,y,color,face){
  const w=PLAYER_R*1.5, h=PLAYER_R*2.05;
  ctx.save(); ctx.shadowColor='rgba(0,0,0,0.25)'; ctx.shadowBlur=6; ctx.shadowOffsetY=3;
  ctx.beginPath();
  ctx.moveTo(x-w/2, y-h/2+w/2);
  ctx.arc(x, y-h/2+w/2, w/2, Math.PI, 0);
  ctx.lineTo(x+w/2, y+h/2-w/3);
  ctx.arc(x, y+h/2-w/3, w/2, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle=color; ctx.fill(); ctx.restore();
  ctx.strokeStyle=shade(color,-50); ctx.lineWidth=2.5; ctx.stroke();
  // reflet
  ctx.fillStyle='rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.ellipse(x-face*w*0.18,y-h*0.12,w*0.16,h*0.28,0,0,TAU); ctx.fill();
}

// ============================================================
//  DÉCOR THÉMATIQUE PAR SALLE
// ============================================================
const ROOM_FLOOR={
  'Réacteur':      {lo:'#5a3a22', hi:'#7d5230', edge:'#d0862f', ink:'rgba(255,220,180,.7)', light:false},
  'Soute':         {lo:'#524632', hi:'#6d5b40', edge:'#ad8c52', ink:'rgba(255,240,210,.6)',  light:false},
  'Pont':          {lo:'#1f2c5a', hi:'#324a8c', edge:'#5f7fd8', ink:'rgba(200,220,255,.75)', light:false},
  'Hub':           {lo:'#39457e', hi:'#4d5da8', edge:'#7f96e8', ink:'rgba(220,228,255,.7)',  light:false},
  'Baie médicale': {lo:'#cfe8dd', hi:'#eff9f4', edge:'#7cc3ac', ink:'rgba(24,80,64,.75)',    light:true},
  'Communications':{lo:'#2b2360', hi:'#443a8c', edge:'#8a7de0', ink:'rgba(224,214,255,.72)', light:false},
  'Quartiers':     {lo:'#3f2e58', hi:'#57426f', edge:'#9a7dc8', ink:'rgba(235,220,255,.72)', light:false},
  'Stockage':      {lo:'#2c3a32', hi:'#3d4d44', edge:'#6f8a7a', ink:'rgba(220,235,225,.62)', light:false},
  _def:            {lo:'#3d4f96', hi:'#5566bb', edge:'#7f96e8', ink:'rgba(230,235,255,.6)',  light:false},
};

function drawFloorPattern(r,th){
  ctx.strokeStyle=th.light?'rgba(20,90,70,0.07)':'rgba(255,255,255,0.045)';
  ctx.lineWidth=1;
  for(let x=r.x+20;x<r.x+r.w;x+=38){ ctx.beginPath(); ctx.moveTo(x,r.y); ctx.lineTo(x,r.y+r.h); ctx.stroke(); }
  for(let y=r.y+20;y<r.y+r.h;y+=38){ ctx.beginPath(); ctx.moveTo(r.x,y); ctx.lineTo(r.x+r.w,y); ctx.stroke(); }
}

// ── petites primitives de déco ─────────────────────────────
function fRR(x,y,w,h,rad,color){ rpath(x,y,w,h,rad); ctx.fillStyle=color; ctx.fill(); }
function oRR(x,y,w,h,rad,color,lw){ rpath(x,y,w,h,rad); ctx.strokeStyle=color; ctx.lineWidth=lw||2; ctx.stroke(); }
function dot2(x,y,r,c){ ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); }
function screen(x,y,w,h,glow){                 // moniteur avec courbe animée
  fRR(x,y,w,h,3,'#0c1230'); oRR(x,y,w,h,3,'#3a4680',1.5);
  ctx.save(); rpath(x+2,y+2,w-4,h-4,2); ctx.clip();
  ctx.globalAlpha=0.22; ctx.fillStyle=glow; ctx.fillRect(x,y,w,h); ctx.globalAlpha=1;
  ctx.strokeStyle=glow; ctx.lineWidth=1.5; ctx.beginPath();
  for(let i=0;i<=w;i+=3){ const yy=y+h/2+Math.sin(frame*0.12+(x+i)*0.35)*(h*0.24); i===0?ctx.moveTo(x+i,yy):ctx.lineTo(x+i,yy); }
  ctx.stroke(); ctx.restore();
}
function blinks(x,y,n,cols){ for(let i=0;i<n;i++){ const on=(Math.floor(frame*0.08)+i)%3!==0; dot2(x+i*8,y,2.3,on?cols[i%cols.length]:'#2a3357'); } }
function bed(x,y,c){                            // lit (infirmerie/quartiers)
  fRR(x-24,y-15,48,30,6,c); oRR(x-24,y-15,48,30,6,shade(c,-45),2);
  fRR(x-21,y-11,15,22,3,'#eef4ff');             // oreiller
}
function crateBox(x,y,s,c){ fRR(x-s/2,y-s/2,s,s,4,c); oRR(x-s/2,y-s/2,s,s,4,shade(c,-45),2);
  ctx.strokeStyle=shade(c,-30); ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x-s/2,y-s/2); ctx.lineTo(x+s/2,y+s/2); ctx.moveTo(x+s/2,y-s/2); ctx.lineTo(x-s/2,y+s/2); ctx.stroke(); }
function locker(x,y,c){ fRR(x-13,y-22,26,44,4,c); oRR(x-13,y-22,26,44,4,shade(c,-45),2);
  ctx.strokeStyle=shade(c,-45); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y-22); ctx.lineTo(x,y+22); ctx.stroke();
  dot2(x-4,y,1.8,'#dfeaff'); dot2(x+4,y,1.8,'#dfeaff'); }
function hazard(x,y,w,h){ ctx.save(); rpath(x,y,w,h,2); ctx.clip(); for(let i=-h;i<w;i+=12){ ctx.fillStyle=((i/12)|0)%2? '#e6b422':'#20242e'; ctx.beginPath(); ctx.moveTo(x+i,y); ctx.lineTo(x+i+6,y); ctx.lineTo(x+i+6-h,y+h); ctx.lineTo(x+i-h,y+h); ctx.closePath(); ctx.fill(); } ctx.restore(); }

function drawRoomScene(r,th){
  const X=r.x,Y=r.y,W=r.w,H=r.h, midX=X+W/2;
  switch(r.name){

    case 'Réacteur': {   // cœur nucléaire + cuves + tuyaux + bandes danger
      hazard(X+12,Y+H-14,W-24,7);
      fRR(X+14,Y+36,W-28,7,4,'#5a6699'); fRR(X+14,Y+48,W*0.55,7,4,'#5a6699');
      for(const cxp of [X+30,X+W-30]){ fRR(cxp-11,Y+H-64,22,40,6,'#6a7099'); oRR(cxp-11,Y+H-64,22,40,6,'#3f4877',2); dot2(cxp,Y+H-54,3,th.accent); }
      const p=Math.sin(frame*0.08)*0.25+0.75, cxR=midX, cyR=Y+H*0.5;
      glowCircle(cxR,cyR,32,`rgba(255,140,60,${(p*0.4).toFixed(2)})`);
      dot2(cxR,cyR,17,'#ff9a3c'); ctx.strokeStyle='#ffd08a'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cxR,cyR,17,0,TAU); ctx.stroke();
      ctx.save(); ctx.translate(cxR,cyR); ctx.rotate(frame*0.02); ctx.strokeStyle='rgba(255,190,120,.7)'; ctx.lineWidth=2;
      for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(0,0,25,i*2.1,i*2.1+1.1); ctx.stroke(); } ctx.restore();
      break;
    }

    case 'Soute': {      // caisses/conteneurs empilés + palette
      crateBox(X+34,Y+52,34,'#b0793f'); crateBox(X+30,Y+90,26,'#9c6a38');
      crateBox(X+W-40,Y+60,36,'#a9743f'); crateBox(X+W-46,Y+100,24,'#b0793f');
      crateBox(X+W-34,Y+H-46,30,'#9c6a38');
      fRR(X+30,Y+H-30,90,10,2,'#6e5638'); // palette
      fRR(X+50,Y+H-60,54,30,4,'#7a8a52'); oRR(X+50,Y+H-60,54,30,4,'#586636',2); // conteneur vert
      break;
    }

    case 'Pont': {       // baie vitrée + planète + consoles pilotes + siège
      fRR(X+70,Y+14,W-140,34,8,'#070c26');
      ctx.save(); rpath(X+70,Y+14,W-140,34,8); ctx.clip();
      ctx.fillStyle='rgba(255,255,255,.85)'; for(let i=0;i<26;i++){ dot2(X+80+((i*83)%(W-160)),Y+18+((i*37)%30),1,'#fff'); }
      dot2(X+W-130,Y+30,12,'#c77dff'); dot2(X+W-126,Y+26,4,'rgba(255,255,255,.5)'); // planète
      ctx.restore(); oRR(X+70,Y+14,W-140,34,8,'#5f7fd8',3);
      screen(X+60,Y+H-56,58,34,'#5cc8ff'); screen(X+W-118,Y+H-56,58,34,'#5fe08a');
      fRR(midX-16,Y+H-52,32,20,5,'#2f3d70'); fRR(midX-9,Y+H-64,18,16,5,'#3a4a86'); // siège capitaine
      blinks(midX-14,Y+H-20,4,['#ff5d6c','#ffd23f','#5cc8ff']);
      break;
    }

    case 'Hub': {        // console ronde centrale + emblème au sol
      ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=10; ctx.beginPath(); ctx.arc(midX,Y+H*0.42,60,0,TAU); ctx.stroke();
      ctx.lineWidth=2; ctx.strokeStyle='rgba(138,211,255,.25)'; ctx.beginPath(); ctx.arc(midX,Y+H*0.42,60,0,TAU); ctx.stroke();
      const cyH=Y+52; dot2(midX,cyH,20,'#2f3d70'); ctx.strokeStyle='#7f96e8'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(midX,cyH,20,0,TAU); ctx.stroke();
      const hp=Math.sin(frame*0.1)*0.2+0.8; glowCircle(midX,cyH,14,`rgba(138,211,255,${(hp*0.5).toFixed(2)})`);
      blinks(midX-30,cyH+30,6,['#8ad3ff','#5fe08a','#ffd23f']);
      break;
    }

    case 'Baie médicale': {  // 2 lits + moniteurs cardiaques + croix + armoire
      bed(X+42,Y+H-52,'#cfe0ff'); bed(X+W-44,Y+H-52,'#cfe0ff');
      screen(X+24,Y+40,50,30,'#ff6b6b'); screen(X+W-74,Y+40,50,30,'#5fe08a');
      // grande croix médicale
      ctx.fillStyle='#ff5a66'; fRR(midX-6,Y+30,12,40,3,'#ff5a66'); fRR(midX-20,Y+44,40,12,3,'#ff5a66');
      // armoire à pharmacie
      fRR(X+W-40,Y+H-30,30,20,3,'#eaf4ee'); oRR(X+W-40,Y+H-30,30,20,3,'#8fc9b6',2); dot2(X+W-25,Y+H-20,2,'#ff5a66');
      break;
    }

    case 'Communications': { // grande parabole + baies serveurs + écrans signal
      ctx.save(); ctx.translate(X+W-46,Y+56); ctx.rotate(-0.5);
      fRR(-4,0,8,26,3,'#5a6699');
      ctx.beginPath(); ctx.arc(0,0,22,Math.PI*0.12,Math.PI*0.88,false); ctx.lineTo(0,0); ctx.closePath(); ctx.fillStyle='#aab4e8'; ctx.fill(); ctx.strokeStyle='#8a7de0'; ctx.lineWidth=2; ctx.stroke();
      dot2(-6,-6,3,'#ff5d6c'); ctx.restore();
      for(const sx of [X+28,X+58]){ fRR(sx-11,Y+H-70,22,54,4,'#241d50'); oRR(sx-11,Y+H-70,22,54,4,'#5a4d9a',2);
        for(let k=0;k<5;k++) blinks(sx-7,Y+H-58+k*11,3,['#5fe08a','#c77dff','#ffd23f']); }
      screen(X+W-92,Y+H-52,58,34,'#c77dff');
      break;
    }

    case 'Quartiers': {   // lits + casiers + tapis + lampe + poster
      bed(X+40,Y+52,'#6a5a9a'); bed(X+W-44,Y+52,'#6a5a9a');
      locker(X+30,Y+H-46,'#5a4a80'); locker(X+58,Y+H-46,'#5a4a80');
      ctx.globalAlpha=0.5; fRR(midX-30,Y+H-40,80,34,10,'#8a5a4a'); ctx.globalAlpha=1; // tapis
      fRR(X+W-40,Y+H-58,6,30,2,'#6f86d8'); dot2(X+W-37,Y+H-58,7,'#ffd23f'); // lampe
      fRR(X+W-70,Y+28,26,18,2,'#c77dff'); oRR(X+W-70,Y+28,26,18,2,'#8a7de0',1.5); // poster
      break;
    }

    case 'Stockage': {    // étagères garnies + fûts + caisses
      for(const sx of [X+34,X+W-40]){ fRR(sx-15,Y+40,30,H-80,3,'#3a473f'); oRR(sx-15,Y+40,30,H-80,3,'#5f7a6a',2);
        for(let k=0;k<3;k++){ ctx.strokeStyle='#5f7a6a'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(sx-15,Y+40+(k+1)*(H-80)/4); ctx.lineTo(sx+15,Y+40+(k+1)*(H-80)/4); ctx.stroke();
          dot2(sx-6,Y+40+(k)*(H-80)/4+18,4,['#b0793f','#74e08a','#5cc8ff'][k%3]); dot2(sx+6,Y+40+(k)*(H-80)/4+18,4,'#a9743f'); } }
      crateBox(midX,Y+H-40,30,'#9c6a38');
      fRR(midX+26,Y+H-52,22,28,6,'#d98a3f'); oRR(midX+26,Y+H-52,22,28,6,'#8a5222',2); // fût
      break;
    }
  }
}

function drawVent(x,y){
  rpath(x-13,y-13,26,26,6); ctx.fillStyle='#20264a'; ctx.fill(); ctx.strokeStyle=C.vent; ctx.lineWidth=2; ctx.stroke();
  ctx.strokeStyle=C.vent; ctx.lineWidth=1.6;
  for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(x-8,y+i*6); ctx.lineTo(x+8,y+i*6); ctx.stroke(); }
}
function drawPickup(x,y,icon,ring){
  const p=Math.sin(frame*0.12)*2.5;
  glowCircle(x,y-p,16,'rgba(255,255,255,0.06)');
  ctx.beginPath(); ctx.arc(x,y-p,15,0,TAU); ctx.fillStyle='rgba(20,24,46,0.85)'; ctx.fill();
  ctx.strokeStyle=ring; ctx.lineWidth=2.5; ctx.stroke();
  ctx.font='17px sans-serif'; ctx.textAlign='center'; ctx.fillText(icon,x,y-p+6);
}

function drawScanReveal(cx,cy){
  if(localMode||myRole!=='innocent') return;
  if(Date.now()>=scanUntil||!S.impo.present) return;
  const sx=S.impo.x-cx, sy=S.impo.y-cy, p=Math.sin(frame*0.3)*3+10;
  ctx.beginPath(); ctx.arc(sx,sy,p+8,0,TAU); ctx.strokeStyle='rgba(92,200,255,.9)'; ctx.lineWidth=2.5; ctx.stroke();
  ctx.font='18px sans-serif'; ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.fillText('😈',sx,sy+6);
}

function drawStamina(){
  const w=110,h=7,x=12,y=VIEW_H-32;
  const r=Math.max(0,Math.min(1,stamina/STAMINA_MAX));
  rpath(x-2,y-2,w+4,h+4,4); ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fill();
  rpath(x,y,w*r,h,3); ctx.fillStyle=r<0.25?'#ff8a5d':'#5cc8ff'; ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='9px monospace'; ctx.textAlign='left'; ctx.fillText('⚡ SPRINT',x,y-5);
}

function drawMinimap(){
  const w=150, scale=w/WORLD_W, h=WORLD_H*scale, x0=(VIEW_W-w)/2, y0=8;
  rpath(x0-4,y0-4,w+8,h+8,8); ctx.fillStyle='rgba(10,12,28,0.82)'; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.lineWidth=1; ctx.strokeRect(x0-4,y0-4,w+8,h+8);
  const px=v=>x0+v*scale, py=v=>y0+v*scale;
  const dot=(x,y,r)=>{ ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); };
  ctx.save(); ctx.beginPath(); ctx.rect(x0,y0,w,h); ctx.clip();
  for(const z of HALLS){ ctx.fillStyle=C.hall;  ctx.fillRect(px(z.x),py(z.y),z.w*scale,z.h*scale); }
  for(const r of ROOMS){ ctx.fillStyle=C.floor; ctx.fillRect(px(r.x),py(r.y),r.w*scale,r.h*scale); }
  const iAmInno=(myRole==='innocent'||localMode), iAmImpo=(myRole==='imposteur'||localMode);
  const blind=myRole==='innocent'&&Date.now()<S.sabotageUntil;
  if(blind){ ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(x0,y0,w,h);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center'; ctx.fillText('⚡',x0+w/2,y0+h/2+6); ctx.restore(); return; }
  ctx.fillStyle=Date.now()<S.oxygenUntil?'#ff5d6c':'rgba(120,140,220,.5)'; dot(px(OXY_PANEL.x),py(OXY_PANEL.y),2);
  ctx.fillStyle=C.heal; dot(px(HEAL_ZONE.x),py(HEAL_ZONE.y),2);
  if(iAmInno){ ctx.fillStyle=C.teleport; for(const tp of TELEPORTS) dot(px(tp.x),py(tp.y),1.8); }
  if(iAmImpo){ ctx.fillStyle=C.vent; for(const v of VENTS) dot(px(v.x),py(v.y),1.8); }
  for(const t of TASKS){ ctx.fillStyle=S.tasks[t.id]?C.taskDone:C.task; dot(px(t.x),py(t.y),2.4); }
  if(localMode){ ctx.fillStyle=C.imposteur; dot(px(S.impo.x),py(S.impo.y),3.2); ctx.fillStyle=C.innocent; dot(px(S.inno.x),py(S.inno.y),3.2); }
  else { const me=myRole==='imposteur'?S.impo:S.inno; ctx.fillStyle=myRole==='imposteur'?C.imposteur:C.innocent; dot(px(me.x),py(me.y),3.4);
    ctx.lineWidth=1.2; ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.stroke();
    if(myRole==='innocent'&&Date.now()<scanUntil&&S.impo.present){ ctx.fillStyle=C.imposteur; dot(px(S.impo.x),py(S.impo.y),3); } }
  ctx.restore();
}

function _drawDebug(){
  ctx.save(); ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(VIEW_W-66,VIEW_H-15,66,15);
  ctx.fillStyle='rgba(255,255,255,.45)'; ctx.font='10px monospace'; ctx.textAlign='right';
  ctx.fillText(`[${VERSION}] ws:${wsReady()}`,VIEW_W-4,VIEW_H-4); ctx.restore();
}

function drawFog(cx,cy){
  const me=myRole==='imposteur'?S.impo:S.inno;
  const sx=(me._rx??me.x)-cx, sy=(me._ry??me.y)-cy;
  const dark=myRole==='innocent'&&Date.now()<S.sabotageUntil;
  const radius=dark?VISION_DARK:VISION;
  const darkColor=dark?'rgba(3,4,10,0.97)':'rgba(6,8,20,0.92)';
  const g=ctx.createRadialGradient(sx,sy,radius*0.55,sx,sy,radius);
  g.addColorStop(0,'rgba(9,10,22,0)'); g.addColorStop(1,darkColor);
  ctx.fillStyle=g; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.fillStyle=darkColor; ctx.beginPath(); ctx.rect(0,0,VIEW_W,VIEW_H); ctx.arc(sx,sy,radius,0,TAU,true); ctx.fill('evenodd');
}

// Helpers
function isRemote(e){ if(localMode) return false; return myRole==='innocent'?e===S.impo:e===S.inno; }
function glowCircle(x,y,r,fill){ ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fillStyle=fill; ctx.fill(); }
function rpath(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function shade(hex,amt){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)+amt, g=((n>>8)&255)+amt, b=(n&255)+amt;
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  return `rgb(${r},${g},${b})`;
}
