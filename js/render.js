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
  // Salles (dégradé + contour cartoon + ombre + étiquette)
  for(const r of ROOMS){
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.35)'; ctx.shadowBlur=12; ctx.shadowOffsetY=5;
    rpath(r.x,r.y,r.w,r.h,20);
    const g=ctx.createLinearGradient(0,r.y,0,r.y+r.h); g.addColorStop(0,C.floorHi); g.addColorStop(1,C.floor);
    ctx.fillStyle=g; ctx.fill(); ctx.restore();
    rpath(r.x+3,r.y+3,r.w-6,r.h-6,17); ctx.strokeStyle=C.edge; ctx.lineWidth=3; ctx.stroke();
    ctx.fillStyle=C.ink; ctx.font='700 14px sans-serif'; ctx.textAlign='center';
    ctx.fillText(r.name,r.x+r.w/2,r.y+24);
  }

  // Décors (visuels)
  drawDecor();

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
    // feuille de marche animée : ~10 fps en mouvement, frame 0 à l'arrêt
    const idx = moving ? Math.floor(frame/6) : 0;
    ctx.save(); ctx.translate(x,y-bob); ctx.scale(e._face,1);
    drawSheet(slot+'_walk', idx, 0,0, size); ctx.restore(); return;
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

// ── Décors procéduraux (cartoon, sans collision) ───────────
function drawDecor(){
  for(const d of DECOR){
    const x=d.x, y=d.y;
    switch(d.type){
      case 'core': {
        const p=Math.sin(frame*0.08)*0.25+0.75;
        glowCircle(x,y,34,`rgba(255,140,60,${(p*0.4).toFixed(2)})`);
        ctx.beginPath(); ctx.arc(x,y,18,0,TAU); ctx.fillStyle='#ff9a3c'; ctx.fill();
        ctx.strokeStyle='#ffd08a'; ctx.lineWidth=2; ctx.stroke();
        ctx.save(); ctx.translate(x,y); ctx.rotate(frame*0.02);
        ctx.strokeStyle='rgba(255,190,120,0.7)'; ctx.lineWidth=2;
        for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(0,0,26,i*2.1,i*2.1+1.1); ctx.stroke(); }
        ctx.restore(); break;
      }
      case 'pipe':
        rpath(x,y,d.w,d.h,7); ctx.fillStyle='#5a6699'; ctx.fill();
        ctx.strokeStyle='#3f4877'; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle='#7f8bc0'; for(let i=x+14;i<x+d.w-6;i+=26){ ctx.beginPath(); ctx.arc(i,y+d.h/2,2.2,0,TAU); ctx.fill(); }
        break;
      case 'crate': {
        const s=d.s||30; rpath(x-s/2,y-s/2,s,s,5); ctx.fillStyle='#a9743f'; ctx.fill();
        ctx.strokeStyle='#6e4a28'; ctx.lineWidth=2.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x-s/2,y-s/2); ctx.lineTo(x+s/2,y+s/2); ctx.moveTo(x+s/2,y-s/2); ctx.lineTo(x-s/2,y+s/2); ctx.stroke();
        break;
      }
      case 'barrel':
        rpath(x-13,y-16,26,32,8); ctx.fillStyle='#d98a3f'; ctx.fill(); ctx.strokeStyle='#8a5222'; ctx.lineWidth=2.5; ctx.stroke();
        ctx.strokeStyle='#8a5222'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x-13,y-4); ctx.lineTo(x+13,y-4); ctx.moveTo(x-13,y+6); ctx.lineTo(x+13,y+6); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x,y-16,13,5,0,0,TAU); ctx.fillStyle='#e6a763'; ctx.fill();
        break;
      case 'window': {
        rpath(x,y,d.w,d.h,8); ctx.fillStyle='#0a1030'; ctx.fill();
        ctx.save(); ctx.beginPath(); rpath(x,y,d.w,d.h,8); ctx.clip();
        ctx.fillStyle='rgba(255,255,255,0.8)';
        for(let i=0;i<14;i++){ const sx=x+((i*97)%d.w), sy=y+((i*53)%d.h); ctx.beginPath(); ctx.arc(sx,sy,1.2,0,TAU); ctx.fill(); }
        ctx.restore(); ctx.strokeStyle='#6f86d8'; ctx.lineWidth=3; ctx.stroke();
        break;
      }
      case 'panel':
      case 'screen': {
        rpath(x-24,y-16,48,32,5); ctx.fillStyle='#131a38'; ctx.fill(); ctx.strokeStyle='#3a4680'; ctx.lineWidth=2; ctx.stroke();
        if(d.type==='screen'){
          ctx.strokeStyle='#5fe08a'; ctx.lineWidth=1.6; ctx.beginPath();
          for(let i=0;i<=44;i+=4){ const yy=y+Math.sin((frame*0.1)+(x+i)*0.3)*5; i===0?ctx.moveTo(x-22+i,yy):ctx.lineTo(x-22+i,yy); }
          ctx.stroke();
        } else {
          const cols=['#ff5d6c','#ffd23f','#5cc8ff','#5fe08a'];
          for(let i=0;i<4;i++){ const on=(Math.floor(frame*0.08)+i)%3!==0; ctx.fillStyle=on?cols[i]:'#2a3357'; ctx.beginPath(); ctx.arc(x-15+i*10,y,2.6,0,TAU); ctx.fill(); }
        }
        break;
      }
      case 'bed':
        rpath(x-22,y-14,44,28,6); ctx.fillStyle='#3f5aa0'; ctx.fill(); ctx.strokeStyle='#2a3d73'; ctx.lineWidth=2; ctx.stroke();
        rpath(x-18,y-10,14,20,4); ctx.fillStyle='#cfe0ff'; ctx.fill();
        break;
      case 'locker':
        rpath(x-14,y-22,28,44,5); ctx.fillStyle='#4a5a94'; ctx.fill(); ctx.strokeStyle='#2f3d70'; ctx.lineWidth=2; ctx.stroke();
        ctx.strokeStyle='#2f3d70'; ctx.beginPath(); ctx.moveTo(x,y-22); ctx.lineTo(x,y+22); ctx.stroke();
        ctx.fillStyle='#cfe0ff'; ctx.beginPath(); ctx.arc(x-4,y,2,0,TAU); ctx.arc(x+4,y,2,0,TAU); ctx.fill();
        break;
      case 'dish':
        rpath(x-4,y,8,20,3); ctx.fillStyle='#5a6699'; ctx.fill();
        ctx.save(); ctx.translate(x,y); ctx.rotate(-0.5);
        ctx.beginPath(); ctx.arc(0,0,16,Math.PI*0.15,Math.PI*0.85,false); ctx.lineTo(0,0); ctx.closePath();
        ctx.fillStyle='#aab4e8'; ctx.fill(); ctx.strokeStyle='#6f86d8'; ctx.lineWidth=2; ctx.stroke();
        ctx.restore(); break;
      case 'plant':
        rpath(x-8,y,16,14,3); ctx.fillStyle='#a9743f'; ctx.fill();
        ctx.fillStyle='#4fbf6a';
        for(const o of [[-5,-4],[5,-4],[0,-10]]){ ctx.beginPath(); ctx.arc(x+o[0],y+o[1],7,0,TAU); ctx.fill(); }
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
