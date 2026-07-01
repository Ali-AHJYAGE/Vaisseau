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
    // Deux joueurs dans le même onglet — pas de BroadcastChannel
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
//  ACTIONS
// ============================================================
function onAction(){
  if(S.over) return;
  // En mode local, Espace = innocent uniquement
  if(localMode||myRole==='innocent') innocentAction();
  else imposteurAction();
}

// En mode local, Entrée = imposteur
function onActionImpo(){
  if(S.over||!localMode) return;
  imposteurActionLocal();
}

function innocentAction(){
  if(minigameActive) return;
  for(const t of TASKS){
    if(!S.tasks[t.id] && dist(S.inno,t)<40){ openMinigame(t); return; }
  }
  for(const tp of TELEPORTS){
    if(dist(S.inno,tp)<40 && tpCooldown<=0){
      const dest=TELEPORTS.find(o=>o.id===tp.link);
      S.inno.x=dest.x; S.inno.y=dest.y; tpCooldown=45; return;
    }
  }
}

// Imposteur en mode onglets (via BroadcastChannel)
function imposteurAction(){
  if(attackReady<=0 && S.inno.alive && dist(S.impo,S.inno)<ATTACK_RANGE){
    sendAttack(); attackReady=ATTACK_CD; return;
  }
  if(sabReady<=0){
    const until=frame+SAB_DURATION;
    S.sabotageUntil=until; sabReady=SAB_CD;
    sendSabotage(until); return;
  }
  if(oxyReady<=0 && frame>=S.oxygenUntil){
    const until=frame+OXY_DURATION;
    S.oxygenUntil=until; oxyReady=OXY_CD;
    sendOxygen(until);
  }
}

// Imposteur en mode local (pas de BroadcastChannel)
function imposteurActionLocal(){
  if(attackReady<=0 && S.inno.alive && dist(S.impo,S.inno)<ATTACK_RANGE){
    applyHit(); attackReady=ATTACK_CD; return;
  }
  if(sabReady<=0){
    S.sabotageUntil=frame+SAB_DURATION; sabReady=SAB_CD; return;
  }
  if(oxyReady<=0 && frame>=S.oxygenUntil){
    S.oxygenUntil=frame+OXY_DURATION; oxyReady=OXY_CD;
  }
}
