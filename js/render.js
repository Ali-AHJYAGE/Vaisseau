// ============================================================
//  RENDU (v14) — style cartoon coloré, particules, caméra
// ============================================================
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
const TAU=Math.PI*2;

const C={
  space:'#241a26', space2:'#3a2b3c',                       // ambiance maison (nuit chaleureuse)
  hall:'#6b4f38', floor:'#7a5a40', floorHi:'#8f6c4c', edge:'#b0855a', // plancher bois
  innocent:'#c9c2b6', imposteur:'#e8893e', task:'#ffd23f', taskDone:'#8bd46a', // souris grise / chat roux
  heal:'#ffcf4d', teleport:'#7a5038', vent:'#5a4432', weapon:'#ff9a4d', gadget:'#7ac8e0',
  visor:'#ffd9b0', ink:'rgba(255,244,228,0.6)',
};
const GADGET_ICON={scanner:'🔔', shield:'📦'};

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
  if(!hasImg('space')) drawWallpaper(cx,cy); else drawImg('space',VIEW_W/2,VIEW_H/2,VIEW_W,VIEW_H);

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

  // Coin fromage — la souris y regagne une vie
  const hpz=Math.sin(frame*0.12)*0.15+0.85;
  glowCircle(HEAL_ZONE.x,HEAL_ZONE.y,HEAL_ZONE.r,`rgba(255,207,77,${(hpz*0.22).toFixed(2)})`);
  fRR(HEAL_ZONE.x-26,HEAL_ZONE.y+2,52,18,9,'#c88a5a'); oRR(HEAL_ZONE.x-26,HEAL_ZONE.y+2,52,18,9,'#8a5a30',2.5);
  cheeseWheel(HEAL_ZONE.x-9,HEAL_ZONE.y-2,12); cheese(HEAL_ZONE.x+13,HEAL_ZONE.y-3,9);
  ctx.font='15px sans-serif'; ctx.textAlign='center'; ctx.fillText('❤️',HEAL_ZONE.x,HEAL_ZONE.y-24+Math.sin(frame*0.1)*3);

  // Piège à souris (ex-O₂)
  const oxyOn=Date.now()<S.oxygenUntil;
  if(oxyOn){ const p=Math.sin(frame*0.25)*0.3+0.7; glowCircle(OXY_PANEL.x,OXY_PANEL.y,30,`rgba(255,93,108,${(p*0.5).toFixed(2)})`); }
  drawTrap(OXY_PANEL.x,OXY_PANEL.y,oxyOn);

  // Trous de souris (souris)
  if(iAmInno) for(const tp of TELEPORTS) drawMouseHole(tp.x,tp.y);
  // Passages du chat (chat)
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
    ctx.font='15px sans-serif'; ctx.textAlign='center';
    if(done){ ctx.fillStyle='#0a3018'; ctx.font='bold 15px sans-serif'; ctx.fillText('✓',t.x,t.y+5); }
    else ctx.fillText('🧀',t.x,t.y+5);
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
  drawAlarm();
  drawMinimap();
  drawStamina();
  drawHud();
  if(S.over) drawBanner();
  _drawDebug();
}

function drawWallpaper(cx,cy){
  // rayures verticales douces (papier peint) + petits motifs, léger parallax
  const off=((cx*0.15)%48+48)%48;
  ctx.fillStyle='rgba(255,255,255,0.02)';
  for(let x=-off;x<VIEW_W;x+=48) ctx.fillRect(x,0,24,VIEW_H);
  const ox=((cx*0.15)%64+64)%64, oy=((cy*0.15)%64+64)%64;
  ctx.fillStyle='rgba(255,215,170,0.05)';
  for(let y=-oy;y<VIEW_H;y+=64) for(let x=-ox;x<VIEW_W;x+=64){ ctx.beginPath(); ctx.arc(x+32,y+32,2,0,TAU); ctx.fill(); }
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

  const cy0=y+bob, isCat=(slot==='imposteur');
  if(isCat) drawCat(x,cy0,color,e._face,dead); else drawMouse(x,cy0,color,e._face,dead);
  if(!dead && e===S.inno && S.inno.shield>0){
    ctx.beginPath(); ctx.arc(x,cy0,PLAYER_R+7,0,TAU); ctx.strokeStyle='rgba(122,200,224,.9)'; ctx.lineWidth=2.5; ctx.stroke();
  }
}
function xEye(x,y){ ctx.beginPath(); ctx.moveTo(x-2.5,y-2.5); ctx.lineTo(x+2.5,y+2.5); ctx.moveTo(x+2.5,y-2.5); ctx.lineTo(x-2.5,y+2.5); ctx.stroke(); }

// Souris (par défaut, tant qu'aucun skin fourni)
function drawMouse(x,y,color,face,dead){
  const r=PLAYER_R;
  ctx.strokeStyle=shade(color,-25); ctx.lineWidth=2.5; ctx.beginPath();
  ctx.moveTo(x-face*r*0.7,y+r*0.5); ctx.quadraticCurveTo(x-face*r*1.7,y+r*0.3,x-face*r*1.5,y-r*0.5); ctx.stroke();
  for(const s of [-1,1]){ dot2(x+s*r*0.72,y-r*0.72,r*0.55,color); dot2(x+s*r*0.72,y-r*0.72,r*0.3,'#f7b8c8');
    ctx.strokeStyle=shade(color,-30); ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x+s*r*0.72,y-r*0.72,r*0.55,0,TAU); ctx.stroke(); }
  dot2(x,y,r,color); ctx.strokeStyle=shade(color,-32); ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.stroke();
  dot2(x+face*r*0.55,y+r*0.2,r*0.42,shade(color,14));
  dot2(x+face*r*0.9,y+r*0.2,2.4,'#f7889c');
  if(dead){ ctx.strokeStyle='#3a2f34'; ctx.lineWidth=2; xEye(x-3,y-r*0.1); xEye(x+6,y-r*0.1); }
  else { dot2(x-2+face,y-r*0.12,2.1,'#241a22'); dot2(x+6+face,y-r*0.12,2.1,'#241a22'); }
  ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=1; for(const dy of [-2,2]){ ctx.beginPath(); ctx.moveTo(x+face*r*0.6,y+r*0.2); ctx.lineTo(x+face*r*1.35,y+r*0.2+dy); ctx.stroke(); }
}

// Chat (par défaut)
function drawCat(x,y,color,face,dead){
  const r=PLAYER_R*1.12;
  ctx.strokeStyle=shade(color,-22); ctx.lineWidth=3.5; ctx.beginPath();
  ctx.moveTo(x-face*r*0.7,y+r*0.5); ctx.quadraticCurveTo(x-face*r*1.9,y+r*0.5,x-face*r*1.7,y-r*0.6); ctx.stroke();
  for(const s of [-1,1]){ ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(x+s*r*0.5,y-r*0.55); ctx.lineTo(x+s*r*1.05,y-r*1.15); ctx.lineTo(x+s*r*0.95,y-r*0.35); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=shade(color,-30); ctx.lineWidth=1.5; ctx.stroke(); ctx.fillStyle='#f7b8c8'; ctx.beginPath(); ctx.moveTo(x+s*r*0.62,y-r*0.6); ctx.lineTo(x+s*r*0.9,y-r*0.95); ctx.lineTo(x+s*r*0.85,y-r*0.5); ctx.closePath(); ctx.fill(); }
  dot2(x,y,r,color); ctx.strokeStyle=shade(color,-30); ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.stroke();
  // museau
  dot2(x+face*r*0.4,y+r*0.28,r*0.36,shade(color,14)); dot2(x+face*r*0.72,y+r*0.24,2.6,'#f7889c');
  if(dead){ ctx.strokeStyle='#3a2622'; ctx.lineWidth=2; xEye(x-4,y-r*0.05); xEye(x+7,y-r*0.05); }
  else { dot2(x-3+face,y-r*0.05,2.6,'#2a1c14'); dot2(x+7+face,y-r*0.05,2.6,'#2a1c14');
    dot2(x-3+face,y-r*0.05-1,1,'#fff'); dot2(x+7+face,y-r*0.05-1,1,'#fff'); }
  ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=1; for(const dy of [-3,0,3]){ ctx.beginPath(); ctx.moveTo(x+face*r*0.5,y+r*0.25); ctx.lineTo(x+face*r*1.5,y+r*0.25+dy); ctx.stroke(); }
}

// ============================================================
//  DÉCOR THÉMATIQUE PAR SALLE
// ============================================================
const ROOM_FLOOR={
  'Cuisine':       {lo:'#d3c3a2', hi:'#efe3c6', edge:'#b89b6c', ink:'rgba(90,60,28,.75)',  light:true},  // carrelage
  'Garde-manger':  {lo:'#6e5236', hi:'#8a663f', edge:'#a8804a', ink:'rgba(255,238,210,.65)',light:false}, // bois
  'Salle à manger':{lo:'#7a4638', hi:'#9c604a', edge:'#c88050', ink:'rgba(255,232,214,.7)', light:false}, // parquet chaud
  'Salon':         {lo:'#8a6746', hi:'#a8845a', edge:'#caa066', ink:'rgba(255,238,214,.7)', light:false}, // tapis/bois
  'Chambre':       {lo:'#7a5876', hi:'#9c7498', edge:'#c492be', ink:'rgba(255,235,250,.72)',light:false}, // moquette
  'Bureau':        {lo:'#4a5266', hi:'#606a86', edge:'#8a98b6', ink:'rgba(224,232,255,.7)', light:false}, // bois/bleu
  'Salle de bain': {lo:'#a9cad2', hi:'#d6edf2', edge:'#84b2be', ink:'rgba(20,70,80,.72)',   light:true},  // carrelage bleu
  'Buanderie':     {lo:'#8c9298', hi:'#b0b6be', edge:'#c6ced6', ink:'rgba(40,50,60,.7)',    light:true},  // carrelage gris
  _def:            {lo:'#7a5a40', hi:'#8f6c4c', edge:'#b0855a', ink:'rgba(255,240,220,.6)', light:false},
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

// ── meubles maison ─────────────────────────────────────────
function cheese(x,y,s){ ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.moveTo(x-s,y+s*0.5); ctx.lineTo(x+s,y+s*0.5); ctx.lineTo(x,y-s*0.6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#c9a01f'; ctx.lineWidth=1.5; ctx.stroke(); dot2(x-s*0.3,y+s*0.15,1.5,'#f2c024'); dot2(x+s*0.35,y,1.3,'#f2c024'); }
function cheeseWheel(x,y,r){ dot2(x,y,r,'#ffd23f'); ctx.strokeStyle='#c9a01f'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.stroke();
  ctx.fillStyle='#f2c024'; ctx.beginPath(); ctx.moveTo(x,y); ctx.arc(x,y,r,-0.6,0.1); ctx.closePath(); ctx.fill(); }
function plantPot(x,y){ fRR(x-8,y,16,14,3,'#c86a3a'); for(const o of [[-5,-4],[5,-4],[0,-11]]) dot2(x+o[0],y+o[1],7,'#4fbf6a'); }
function rug(x,y,w,h,c){ ctx.globalAlpha=0.5; fRR(x-w/2,y-h/2,w,h,10,c); ctx.globalAlpha=1; oRR(x-w/2,y-h/2,w,h,10,shade(c,-40),2); }
function tvSet(x,y,w){ fRR(x-w/2,y-w*0.32,w,w*0.62,4,'#1a1420'); oRR(x-w/2,y-w*0.32,w,w*0.62,4,'#0a0810',2);
  ctx.save(); rpath(x-w/2+3,y-w*0.32+3,w-6,w*0.62-6,2); ctx.clip(); ctx.globalAlpha=0.5; ctx.fillStyle='#5cc8ff'; ctx.fillRect(x-w/2,y-w*0.32,w,w*0.62); ctx.globalAlpha=1; ctx.restore(); }
function sofa(x,y,w,c){ fRR(x-w/2,y-20,w,14,6,shade(c,12)); fRR(x-w/2-4,y-16,9,28,4,shade(c,-6)); fRR(x+w/2-5,y-16,9,28,4,shade(c,-6)); fRR(x-w/2,y-8,w,20,6,c); oRR(x-w/2,y-8,w,20,6,shade(c,-40),2); }
function fridge(x,y){ fRR(x-16,y-30,32,60,5,'#eef2f5'); oRR(x-16,y-30,32,60,5,'#b0bcc8',2); ctx.strokeStyle='#b0bcc8'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x-16,y); ctx.lineTo(x+16,y); ctx.stroke(); fRR(x+9,y-24,3,14,1,'#9aa8b4'); fRR(x+9,y+6,3,14,1,'#9aa8b4'); }
function stove(x,y){ fRR(x-20,y-16,40,36,4,'#c8ccd2'); oRR(x-20,y-16,40,36,4,'#8a909a',2); for(const o of [[-10,-6],[10,-6],[-10,8],[10,8]]) dot2(x+o[0],y+o[1],5,'#3a3f48'); fRR(x-16,y-16,32,6,2,'#9aa0aa'); }
function table(x,y,w){ fRR(x-w/2,y-6,w,12,4,'#8a5a3a'); oRR(x-w/2,y-6,w,12,4,'#5e3c26',2); fRR(x-w/2+4,y+4,5,16,1,'#6e4a30'); fRR(x+w/2-9,y+4,5,16,1,'#6e4a30'); }
function chair(x,y,c){ fRR(x-7,y-4,14,10,2,c); fRR(x-7,y-16,14,12,2,shade(c,12)); }
function tub(x,y,w){ fRR(x-w/2,y-14,w,30,12,'#eef6fa'); oRR(x-w/2,y-14,w,30,12,'#9cc0cc',2); ctx.globalAlpha=0.6; fRR(x-w/2+5,y-9,w-10,18,8,'#bfe4ee'); ctx.globalAlpha=1; dot2(x-w/2+5,y-10,2,'#88aacc'); }
function washer(x,y){ fRR(x-16,y-18,32,40,4,'#e6eaee'); oRR(x-16,y-18,32,40,4,'#a8b0ba',2); dot2(x,y+2,11,'#1a2430'); ctx.strokeStyle='#8fb0d0'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y+2,11,0,TAU); ctx.stroke(); const a=frame*0.15; ctx.strokeStyle='rgba(140,200,255,.6)'; ctx.beginPath(); ctx.arc(x,y+2,6,a,a+2); ctx.stroke(); dot2(x-10,y-13,2,'#5fe08a'); dot2(x-4,y-13,2,'#ffd23f'); }
function shelfFood(x,y,w,h){ fRR(x-w/2,y,w,h,3,'#6e4a2e'); oRR(x-w/2,y,w,h,3,'#4e341f',2); for(let k=1;k<=2;k++){ const yy=y+k*h/3; ctx.strokeStyle='#4e341f'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x-w/2,yy); ctx.lineTo(x+w/2,yy); ctx.stroke(); } cheeseWheel(x-w/4,y+h/6,7); dot2(x+w/6,y+h/6,6,'#e06a4a'); cheeseWheel(x+w/5,y+h/2,6); dot2(x-w/5,y+h/2,5,'#74c86a'); }

function drawRoomScene(r,th){
  const X=r.x,Y=r.y,W=r.w,H=r.h, midX=X+W/2;
  switch(r.name){

    case 'Cuisine':
      fridge(X+28,Y+H-34); stove(X+W-32,Y+H-28); table(midX+14,Y+H-22,66);
      cheese(X+W-58,Y+52,10); plantPot(X+W-22,Y+38);
      break;

    case 'Garde-manger':
      shelfFood(X+40,Y+44,52,H-96); shelfFood(X+W-42,Y+44,52,H-96);
      cheeseWheel(midX,Y+H-42,14); cheese(midX+30,Y+H-38,10);
      fRR(midX-18,Y+H-24,34,18,4,'#b58a58'); oRR(midX-18,Y+H-24,34,18,4,'#7a5a38',2); // sac
      break;

    case 'Salle à manger':
      table(midX,Y+H*0.52,150);
      chair(midX-74,Y+H*0.52,'#8a5a3a'); chair(midX+74,Y+H*0.52,'#8a5a3a');
      chair(midX-34,Y+H*0.52+22,'#8a5a3a'); chair(midX+34,Y+H*0.52+22,'#8a5a3a');
      dot2(midX-24,Y+H*0.52-8,6,'#eef4ff'); dot2(midX+24,Y+H*0.52-8,6,'#eef4ff');
      fRR(midX-2,Y+H*0.52-16,4,10,1,'#fff'); dot2(midX,Y+H*0.52-18,2,'#ffb14d'); // bougie
      break;

    case 'Salon':
      rug(midX,Y+H*0.56,130,64,'#b5623f'); table(midX,Y+H*0.56,60);
      sofa(X+64,Y+H-38,84,'#c8683f'); tvSet(X+W-48,Y+58,60);
      plantPot(X+W-24,Y+H-38);
      fRR(X+30,Y+42,6,30,2,'#8a6a4a'); dot2(X+33,Y+40,9,'#ffe08a'); // lampe
      break;

    case 'Chambre':
      bed(X+52,Y+H-46,'#d8a0c8'); locker(X+W-40,Y+H-44,'#a07850'); // lit + armoire
      rug(midX,Y+H*0.5,96,46,'#b57fae'); plantPot(X+34,Y+44);
      fRR(X+W-84,Y+H-40,16,16,2,'#8a6a4a'); dot2(X+W-76,Y+H-46,7,'#ffe08a'); // chevet+lampe
      break;

    case 'Bureau':
      fRR(X+28,Y+H-46,84,14,3,'#6e4a30'); oRR(X+28,Y+H-46,84,14,3,'#4e341f',2); // bureau
      screen(X+52,Y+H-72,40,26,'#7ac8e0'); chair(X+70,Y+H-24,'#3a4658');
      fRR(X+W-46,Y+42,34,H-96,3,'#6e4a30'); oRR(X+W-46,Y+42,34,H-96,3,'#4e341f',2); // bibliothèque
      for(let k=0;k<4;k++) fRR(X+W-59+k*7,Y+58,5,22,1,['#e06a4a','#5fbf6a','#5c8fe0','#ffd23f'][k]);
      plantPot(X+W-24,Y+H-38);
      break;

    case 'Salle de bain':
      tub(X+W-52,Y+H-38,80);
      fRR(X+34,Y+H-42,30,16,4,'#eef6fa'); oRR(X+34,Y+H-42,30,16,4,'#9cc0cc',2); dot2(X+49,Y+H-35,4,'#bfe4ee'); // lavabo
      fRR(X+34,Y+50,22,22,7,'#eef6fa'); oRR(X+34,Y+50,22,22,7,'#9cc0cc',2); // WC
      fRR(X+78,Y+34,26,20,3,'#cfeef8'); oRR(X+78,Y+34,26,20,3,'#8fbfcc',2); // miroir
      break;

    case 'Buanderie':
      washer(X+42,Y+H-38); washer(X+84,Y+H-38);
      fRR(midX+38,Y+H-32,26,22,4,'#c8a86a'); oRR(midX+38,Y+H-32,26,22,4,'#8a6a3a',2); // panier
      dot2(midX+34,Y+H-38,5,'#e06a6a'); dot2(midX+46,Y+H-40,5,'#5c8fe0');
      ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(X+20,Y+42); ctx.lineTo(X+W-20,Y+50); ctx.stroke();
      for(let k=0;k<3;k++) fRR(X+60+k*58-6,Y+46+k*3,12,16,2,['#e06a6a','#5c8fe0','#5fbf6a'][k]); // linge
      break;
  }
}

// Passage du chat : trappe/gap sombre avec empreinte de patte
function drawVent(x,y){
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x,y,15,12,0,0,TAU); ctx.fillStyle='#1c130e'; ctx.fill();
  ctx.strokeStyle=shade(C.imposteur,-10); ctx.lineWidth=2.5; ctx.stroke();
  // empreinte de patte
  ctx.fillStyle='rgba(232,137,62,0.85)'; dot2(x,y+1,3.4); for(const o of [[-4,-4],[0,-5],[4,-4]]) dot2(x+o[0],y+o[1]-1,1.5,'rgba(232,137,62,0.85)');
  ctx.restore();
}
// Trou de souris : arche noire dans la plinthe
function drawMouseHole(x,y){
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x-14,y+9); ctx.lineTo(x-14,y-2); ctx.arc(x,y-2,14,Math.PI,0); ctx.lineTo(x+14,y+9); ctx.closePath();
  ctx.fillStyle='#140d0a'; ctx.fill(); ctx.strokeStyle=shade(C.teleport,20); ctx.lineWidth=2.5; ctx.stroke();
  ctx.fillStyle='rgba(255,235,210,0.12)'; ctx.beginPath(); ctx.ellipse(x,y+3,8,4,0,0,TAU); ctx.fill();
  ctx.restore();
}
// Piège à souris : socle bois + barre métallique + appât
function drawTrap(x,y,armed){
  fRR(x-16,y-9,32,18,3,'#b58a52'); oRR(x-16,y-9,32,18,3,'#7a5a30',2);
  ctx.strokeStyle=armed?'#ff5d6c':'#c8ccd2'; ctx.lineWidth=3;
  ctx.beginPath();
  if(armed){ ctx.moveTo(x-12,y+6); ctx.lineTo(x-12,y-14); ctx.lineTo(x+10,y-14); } // barre armée (relevée)
  else { ctx.moveTo(x-12,y+6); ctx.lineTo(x+12,y+6); }                              // barre à plat
  ctx.stroke();
  dot2(x+8,y-1,3,'#ffd23f'); // appât (fromage)
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

// État d'alerte plein écran pendant un sabotage dangereux
function drawAlarm(){
  const now=Date.now();
  const trapOn=now<S.oxygenUntil, darkOn=now<S.sabotageUntil&&(myRole==='innocent'||localMode);
  if(!trapOn && !darkOn) return;
  const p=Math.sin(frame*0.25)*0.5+0.5;
  ctx.save();
  ctx.strokeStyle=`rgba(255,60,70,${(0.35+p*0.5).toFixed(2)})`; ctx.lineWidth=12;
  ctx.strokeRect(6,6,VIEW_W-12,VIEW_H-12);
  ctx.globalAlpha=0.55+p*0.4; ctx.fillStyle='#ff3b46'; ctx.font='800 22px sans-serif'; ctx.textAlign='center';
  ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=4;
  const txt=trapOn?'⚠ PIÈGE ARMÉ !':'⚠ PANNE DE COURANT';
  ctx.strokeText(txt,VIEW_W/2,VIEW_H-56); ctx.fillText(txt,VIEW_W/2,VIEW_H-56);
  ctx.restore();
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
