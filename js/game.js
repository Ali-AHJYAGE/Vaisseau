// ============================================================
//  LOGIQUE DE JEU (v13) — boucle, mouvement, actions, manches
// ============================================================

function loop(){
  requestAnimationFrame(loop);
  frame++; update(); draw();
}

function update(){
  if(partnerGoneAt && frame-partnerGoneAt>PARTNER_TIMEOUT && !S.over) S.over='disconnect';
  if(roundBanner>0) roundBanner--;
  if(S.over) return;

  if(attackReady>0) attackReady--;
  if(healReady>0)   healReady--;
  if(sabReady>0)    sabReady--;
  if(oxyReady>0)    oxyReady--;
  if(doorReady>0)   doorReady--;
  if(ventCooldown>0)ventCooldown--;
  if(tpCooldown>0)  tpCooldown--;

  // Sirène d'alerte pendant un sabotage dangereux
  const now=Date.now();
  const trapOn=now<S.oxygenUntil, darkOn=now<S.sabotageUntil&&(myRole==='innocent'||localMode);
  if((trapOn||darkOn) && frame%44===0 && typeof Sfx!=='undefined') Sfx.alarm();

  if(localMode){
    moveLocal();
  } else if(myRole==='innocent'){
    if(S.inno.alive) moveEnt(S.inno, inputVec, localSpeed(inputVec), true);
    handleHeal(); handleOxyRepair(); handleInnoPickups(); checkWin();
    if(frame%NET_EVERY===0){ sendInno(); sendWorld(); }
  } else {
    moveImpo();
    handleImpoPickups();
    if(frame%NET_EVERY===0) sendImpo();
  }
}

// Déplacement du chat : élan (bond) prioritaire, sinon marche normale
function moveImpo(){
  if(dashFrames>0){
    const nx=S.impo.x+dashVX, ny=S.impo.y+dashVY;
    if(canMove(nx,S.impo.y,false)) S.impo.x=nx;
    if(canMove(S.impo.x,ny,false)) S.impo.y=ny;
    emit(S.impo.x,S.impo.y,C.imposteur,3,1.4,14);
    dashFrames--;
  } else {
    moveEnt(S.impo, inputVec, localSpeed(inputVec), false);
  }
}

// ── Vitesse locale (gère l'endurance/sprint du joueur) ──────
function localSpeed(vecFn){
  const v=(vecFn||inputVec)();
  const moving = v.dx!==0 || v.dy!==0;
  const sprint = isSprinting() && stamina>0 && moving;
  if(sprint) stamina=Math.max(0, stamina-STAMINA_DRAIN);
  else       stamina=Math.min(STAMINA_MAX, stamina+STAMINA_REGEN);
  return SPEED*(sprint?SPRINT_MULT:1);
}

function moveLocal(){
  const vi=inputVecInno();
  const movingI = vi.dx!==0||vi.dy!==0;
  const sprintI = isSprinting() && stamina>0 && movingI;
  if(sprintI) stamina=Math.max(0,stamina-STAMINA_DRAIN);
  else        stamina=Math.min(STAMINA_MAX,stamina+STAMINA_REGEN);
  if(S.inno.alive) moveEnt(S.inno, inputVecInno, SPEED*(sprintI?SPRINT_MULT:1), true);
  if(dashFrames>0){
    const nx=S.impo.x+dashVX, ny=S.impo.y+dashVY;
    if(canMove(nx,S.impo.y,false)) S.impo.x=nx;
    if(canMove(S.impo.x,ny,false)) S.impo.y=ny;
    emit(S.impo.x,S.impo.y,C.imposteur,3,1.4,14); dashFrames--;
  } else moveEnt(S.impo, inputVecImpo, SPEED, false);
  handleHeal(); handleOxyRepair(); handleInnoPickups(); handleImpoPickups(); checkWin();
}

// ── Ramassages ──────────────────────────────────────────────
function handleInnoPickups(){
  for(const g of GADGET_PICKUPS){
    if(takenGadgets.has(g.id)) continue;
    if(dist(S.inno,g)<28){
      takenGadgets.add(g.id);
      if(g.type==='scanner') scanCharges++;
      else if(g.type==='shield') S.inno.shield += SHIELD_ABSORB;
      Sfx.pickup(); sparkle(g.x,g.y,C.gadget);
    }
  }
}
function handleImpoPickups(){
  for(const w of WEAPON_PICKUPS){
    if(takenWeapons.has(w.id)) continue;
    if(dist(S.impo,w)<28){ takenWeapons.add(w.id); S.impo.weapon=w.type; Sfx.pickup(); sparkle(w.x,w.y,C.weapon); }
  }
}

// ── Soin / O₂ ──────────────────────────────────────────────
function handleHeal(){
  if(S.inno.hearts>=HEARTS_MAX) return;
  if(dist(S.inno,HEAL_ZONE)<HEAL_ZONE.r && healReady<=0){
    S.inno.hearts++; healReady=HEAL_CD;
    Sfx.heal(); sparkle(S.inno.x,S.inno.y,'#ff6b6b'); floatText(S.inno.x,S.inno.y-22,'+1 ❤️','#ff6b6b');
  }
}
function handleOxyRepair(){
  if(Date.now()>=S.oxygenUntil) return;
  if(dist(S.inno,OXY_PANEL)<38){ S.oxygenUntil=0; if(!localMode) sendOxyFix(); }
}

// ── Victoire / fin de manche ───────────────────────────────
function checkWin(){
  if(S.oxygenUntil>0 && Date.now()>=S.oxygenUntil){ S.inno.alive=false; S.oxygenUntil=0; }
  if(Object.values(S.tasks).every(Boolean)) S.over='innocent';
  else if(!S.inno.alive) S.over='imposteur';
  if(S.over && !roundReported){
    roundReported=true;
    if(!localMode) send({type:'round-end', winner:S.over});
  }
}

function applyHit(dmg){
  if(!S.inno.alive) return;
  if(S.inno.shield>0){ S.inno.shield--; Sfx.heal(); sparkle(S.inno.x,S.inno.y,C.gadget); flash('rgba(92,200,255,0.35)',200); return; }
  S.inno.hearts=Math.max(0, S.inno.hearts-(dmg||1));
  Sfx.hurt(); shake(7,320); flash('rgba(255,60,80,0.5)',260); emit(S.inno.x,S.inno.y,C.imposteur,16,3.4,32);
  if(S.inno.hearts<=0){ S.inno.alive=false; burst(S.inno.x,S.inno.y,'#ff5d8f'); }
}

// ============================================================
//  ACTIONS
// ============================================================
function doTask(){
  if(S.over||minigameActive) return false;
  if(!(myRole==='innocent'||localMode)) return false;
  for(const t of TASKS) if(!S.tasks[t.id] && dist(S.inno,t)<40){ openMinigame(t); return true; }
  return false;
}

// INNOCENT — téléporteur
function doTeleport(){
  if(S.over) return false;
  if(!(myRole==='innocent'||localMode)) return false;
  for(const tp of TELEPORTS){
    if(dist(S.inno,tp)<40 && tpCooldown<=0){
      const dest=TELEPORTS.find(o=>o.id===tp.link);
      sparkle(S.inno.x,S.inno.y,C.teleport);
      S.inno.x=dest.x; S.inno.y=dest.y; S.inno._rx=dest.x; S.inno._ry=dest.y; tpCooldown=45;
      Sfx.teleport(); sparkle(dest.x,dest.y,C.teleport); return true;
    }
  }
  return false;
}

// INNOCENT — scanner
function doScan(){
  if(S.over) return false;
  if(!(myRole==='innocent'||localMode)) return false;
  if(scanCharges<=0) return false;
  scanCharges--; scanUntil=Date.now()+SCAN_DURATION_MS; Sfx.pickup(); return true;
}

// IMPOSTEUR — vent (anneau)
function doVent(){
  if(S.over) return false;
  if(!(myRole==='imposteur'||localMode)) return false;
  for(let i=0;i<VENTS.length;i++){
    if(dist(S.impo,VENTS[i])<40 && ventCooldown<=0){
      const next=VENTS[(i+1)%VENTS.length];
      Sfx.vent(); puff(S.impo.x,S.impo.y);
      S.impo.x=next.x; S.impo.y=next.y; S.impo._rx=next.x; S.impo._ry=next.y; ventCooldown=40;
      puff(next.x,next.y); return true;
    }
  }
  return false;
}

// IMPOSTEUR — attaque (selon l'arme équipée)
function doAttack(){
  if(S.over) return false;
  const wp=WEAPON_TYPES[S.impo.weapon]||WEAPON_TYPES.knife;
  if(attackReady>0 || !S.inno.alive || dist(S.impo,S.inno)>=wp.range) return false;
  Sfx.hit(); shake(4,180);
  if(S.impo.weapon==='blaster'){ // BOND : le chat s'élance vers la souris
    const a=Math.atan2(S.inno.y-S.impo.y, S.inno.x-S.impo.x);
    dashVX=Math.cos(a)*DASH_SPEED; dashVY=Math.sin(a)*DASH_SPEED; dashFrames=DASH_FRAMES;
    if(typeof Sfx!=='undefined') Sfx.whoosh(); shake(6,260);
  }
  if(localMode){ applyHit(wp.dmg); attackReady=wp.cd; return true; }
  else if(myRole==='imposteur'){ sendAttack(wp.dmg); attackReady=wp.cd; return true; }
  return false;
}

function doSabLights(){
  if(S.over||sabReady>0) return false;
  if(!(myRole==='imposteur'||localMode)) return false;
  S.sabotageUntil=Date.now()+SAB_DURATION_MS; sabReady=SAB_CD; Sfx.sabotage();
  if(!localMode) sendSabotage(); return true;
}
function doSabOxy(){
  if(S.over||oxyReady>0||Date.now()<S.oxygenUntil) return false;
  if(!(myRole==='imposteur'||localMode)) return false;
  S.oxygenUntil=Date.now()+OXY_DURATION_MS; oxyReady=OXY_CD; Sfx.sabotage();
  if(!localMode) sendOxygen(); return true;
}
function doSabDoors(){
  if(S.over||doorReady>0) return false;
  if(!(myRole==='imposteur'||localMode)) return false;
  S.doorsUntil=Date.now()+DOOR_DURATION_MS; doorReady=DOOR_CD; Sfx.door();
  if(!localMode) sendDoors(); return true;
}

// ── Raccourci clavier (Espace) ─────────────────────────────
function onAction(){
  if(S.over) return;
  if(localMode||myRole==='innocent') doTask()||doTeleport()||doScan();
  else doAttack()||doVent()||doSabLights()||doSabOxy()||doSabDoors();
}
function onActionImpo(){ // Entrée = imposteur en mode local
  if(S.over||!localMode) return;
  doAttack()||doVent()||doSabLights()||doSabOxy()||doSabDoors();
}

// ============================================================
//  MANCHES
// ============================================================
function startRound(role, round){
  myRole = role;
  roundNum = round;
  S.inno = { x:820, y:610, hearts:HEARTS_MAX, alive:true, shield:0, synced:false };
  S.impo = { x:820, y:540, present:(role==='imposteur'), weapon:'knife' };
  S.tasks = { t1:false, t2:false, t3:false, t4:false };
  S.sabotageUntil=0; S.oxygenUntil=0; S.doorsUntil=0; S.over=null;
  attackReady=healReady=sabReady=oxyReady=doorReady=0;
  ventCooldown=tpCooldown=0;
  stamina=STAMINA_MAX; scanUntil=0; scanCharges=0; dashFrames=0;
  takenWeapons=new Set(); takenGadgets=new Set();
  minigameActive=null; partnerGoneAt=0; roundReported=false; _bannerSounded=false;
  _lastWorld='';
  roundBanner=150;
  const mg=document.getElementById('minigame'); if(mg) mg.style.display='none';
  const b=document.getElementById('banner'); if(b) b.style.display='none';
}
