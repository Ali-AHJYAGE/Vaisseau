// ============================================================
//  HUD — cœurs, tâches, bouton d'action contextuel, bannière
// ============================================================
const _actionBtn = document.getElementById('action-btn');

function drawHud(){
  // Cœurs
  const hearts='❤️'.repeat(S.inno.hearts)+'🖤'.repeat(HEARTS_MAX-S.inno.hearts);
  document.getElementById('hearts').textContent=(myRole==='innocent'||localMode)?hearts:'';

  // Compteur de tâches
  const done=Object.values(S.tasks).filter(Boolean).length;
  document.getElementById('task-chip').textContent=`Tâches : ${done}/4`;

  // Chip statut sabotage
  const st=document.getElementById('status-chip');
  if(frame<S.oxygenUntil){
    const secs=Math.ceil((S.oxygenUntil-frame)/60);
    st.textContent=`🚨 O₂ — ${secs}s`; st.style.color='#ff5d6c';
  } else if(frame<S.sabotageUntil){
    st.textContent='⚡ Lumières'; st.style.color='';
  } else {
    st.textContent=''; st.style.color='';
  }

  _updateActionBtn();
}

function _updateActionBtn(){
  const btn=_actionBtn;
  if(S.over||minigameActive){ btn.className=''; btn.textContent=''; return; }

  if(localMode||myRole==='innocent'){
    const nearTask = TASKS.some(t=>!S.tasks[t.id]&&dist(S.inno,t)<44);
    const nearTP   = TELEPORTS.some(tp=>dist(S.inno,tp)<44&&tpCooldown<=0);
    const oxyAlert = frame<S.oxygenUntil;
    const nearOxy  = oxyAlert&&Math.hypot(S.inno.x-OXY_PANEL.x,S.inno.y-OXY_PANEL.y)<60;

    if(nearTask)       { btn.className='pret'; btn.textContent='⚙\nTâche'; }
    else if(nearTP)    { btn.className='pret'; btn.textContent='🌀\nTéléport'; }
    else if(nearOxy)   { btn.className='impo'; btn.textContent='O₂\nRéparer !'; }
    else               { btn.className='';     btn.textContent=''; }

  } else {
    // Rôle imposteur (mode réseau)
    const inRange=S.inno.alive&&dist(S.impo,S.inno)<ATTACK_RANGE;
    if(inRange&&attackReady<=0)       { btn.className='impo'; btn.textContent='⚔️\nFrapper'; }
    else if(sabReady<=0)              { btn.className='impo'; btn.textContent='💡\nSaboter'; }
    else if(oxyReady<=0&&frame>=S.oxygenUntil){ btn.className='impo'; btn.textContent='🔴\nO₂'; }
    else {
      // Cooldowns en cours — affiche le prochain qui se recharge
      const nextReady = Math.min(attackReady>0?attackReady:Infinity, sabReady>0?sabReady:Infinity, oxyReady>0?oxyReady:Infinity);
      btn.className='';
      btn.textContent=isFinite(nextReady)?`⏳\n${Math.ceil(nextReady/60)}s`:'';
    }
  }
}

function drawBanner(){
  const b=document.getElementById('banner'),t=document.getElementById('banner-text');
  b.style.display='flex';
  if(S.over==='innocent') t.textContent=(myRole==='innocent'||localMode)?'😇 Mission accomplie !':'😇 L\'innocent·e a gagné…';
  else t.textContent=(myRole==='imposteur'||localMode)?'😈 Vaisseau sabordé — Victoire !':'💀 Game over.';
}
