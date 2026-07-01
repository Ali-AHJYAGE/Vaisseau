// ============================================================
//  LOGIQUE DE JEU — boucle, actions, victoire
// ============================================================

function loop(){
  requestAnimationFrame(loop); // schedulé en premier : une erreur ne coupe pas la boucle
  frame++; update(); draw();
}

function update(){
  if(S.over) return;
  if(attackReady>0) attackReady--;
  if(healReady>0)   healReady--;
  if(sabReady>0)    sabReady--;
  if(oxyReady>0)    oxyReady--;
  if(tpCooldown>0)  tpCooldown--;

  if(localMode){
    if(S.inno.alive) moveEnt(S.inno, inputVecInno);
    moveEnt(S.impo, inputVecImpo);
    handleHeal();
    handleOxyRepair();
    checkWin();
  } else if(myRole==='innocent'){
    if(S.inno.alive) moveEnt(S.inno);
    handleHeal();
    handleOxyRepair();
    checkWin();
    sendInno();
    sendWorld();
  } else {
    moveEnt(S.impo);
    sendImpo();
  }
}

function handleHeal(){
  if(S.inno.hearts>=HEARTS_MAX) return;
  const d=Math.hypot(S.inno.x-HEAL_ZONE.x,S.inno.y-HEAL_ZONE.y);
  if(d<HEAL_ZONE.r && healReady<=0){ S.inno.hearts++; healReady=HEAL_CD; }
}

function handleOxyRepair(){
  if(frame>=S.oxygenUntil) return;
  const d=Math.hypot(S.inno.x-OXY_PANEL.x,S.inno.y-OXY_PANEL.y);
  if(d<34){
    S.oxygenUntil=0;
    if(!localMode) sendOxyFix();
  }
}

function checkWin(){
  if(S.oxygenUntil>0 && frame>=S.oxygenUntil){ S.inno.alive=false; }
  if(Object.values(S.tasks).every(Boolean)) S.over='innocent';
  else if(!S.inno.alive) S.over='imposteur';
}

function applyHit(){
  if(!S.inno.alive) return;
  S.inno.hearts=Math.max(0,S.inno.hearts-1);
  if(S.inno.hearts<=0) S.inno.alive=false;
}

// ============================================================
//  ACTIONS SÉPARÉES — appelées par les boutons ou par Espace
// ============================================================

function doTask(){
  if(S.over||minigameActive) return false;
  if(!(myRole==='innocent'||localMode)) return false;
  for(const t of TASKS){
    if(!S.tasks[t.id] && dist(S.inno,t)<40){ openMinigame(t); return true; }
  }
  return false;
}

function doTeleport(){
  if(S.over) return false;
  if(!(myRole==='innocent'||localMode)) return false;
  for(const tp of TELEPORTS){
    if(dist(S.inno,tp)<40 && tpCooldown<=0){
      const dest=TELEPORTS.find(o=>o.id===tp.link);
      S.inno.x=dest.x; S.inno.y=dest.y; tpCooldown=45; return true;
    }
  }
  return false;
}

function doAttack(){
  if(S.over) return false;
  if(attackReady>0 || !S.inno.alive || dist(S.impo,S.inno)>=ATTACK_RANGE) return false;
  if(localMode){
    applyHit(); attackReady=ATTACK_CD; return true;
  } else if(myRole==='imposteur'){
    sendAttack(); attackReady=ATTACK_CD; return true;
  }
  return false;
}

function doSabLights(){
  if(S.over||sabReady>0) return false;
  if(!(myRole==='imposteur'||localMode)) return false;
  const until=frame+SAB_DURATION;
  S.sabotageUntil=until; sabReady=SAB_CD;
  if(!localMode) sendSabotage(until);
  return true;
}

function doSabOxy(){
  if(S.over||oxyReady>0||frame<S.oxygenUntil) return false;
  if(!(myRole==='imposteur'||localMode)) return false;
  const until=frame+OXY_DURATION;
  S.oxygenUntil=until; oxyReady=OXY_CD;
  if(!localMode) sendOxygen(until);
  return true;
}

// ============================================================
//  ESPACE / ENTRÉE — raccourci clavier (priorité automatique)
// ============================================================
function onAction(){
  if(S.over) return;
  if(localMode||myRole==='innocent'){
    doTask() || doTeleport();
  } else {
    doAttack() || doSabLights() || doSabOxy();
  }
}

// Entrée = action imposteur en mode local (clavier)
function onActionImpo(){
  if(S.over||!localMode) return;
  doAttack() || doSabLights() || doSabOxy();
}
