// ============================================================
//  HUD — interface DOM (cœurs, tâches, statuts, bannière)
// ============================================================

function drawHud(){
  const hearts='❤️'.repeat(S.inno.hearts)+'🖤'.repeat(HEARTS_MAX-S.inno.hearts);
  // En mode local on montre toujours les cœurs (les deux joueurs voient le même écran)
  document.getElementById('hearts').textContent=(myRole==='innocent'||localMode)?hearts:'';

  // Compteur de tâches
  const done=Object.values(S.tasks).filter(Boolean).length;
  document.getElementById('task-chip').textContent=`Tâches : ${done}/4`;

  // Statut sabotage
  const st=document.getElementById('status-chip');
  if(frame<S.oxygenUntil){
    const secs=Math.ceil((S.oxygenUntil-frame)/60);
    st.textContent=`🚨 O₂ critique — ${secs}s`;st.style.color='#ff5d6c';
  } else if(frame<S.sabotageUntil){
    st.textContent='⚡ Lumières coupées';st.style.color='';
  } else {
    st.textContent='';st.style.color='';
  }

  // Barre de pouvoirs (bas de l'écran)
  _updatePowerBar();
}

function _updatePowerBar(){
  const p=document.getElementById('power');

  if(localMode){
    _updatePowerBarLocal();
  } else if(myRole==='innocent'){
    // Détecte ce qui est à portée pour contextualiser le message
    const nearTask    = TASKS.some(t=>!S.tasks[t.id]&&dist(S.inno,t)<44);
    const nearTP      = TELEPORTS.some(tp=>dist(S.inno,tp)<44);
    const nearHeal    = Math.hypot(S.inno.x-HEAL_ZONE.x,S.inno.y-HEAL_ZONE.y)<HEAL_ZONE.r;
    const oxyAlert    = frame<S.oxygenUntil;
    const nearOxy     = oxyAlert&&Math.hypot(S.inno.x-OXY_PANEL.x,S.inno.y-OXY_PANEL.y)<60;

    let hint='';
    if(nearTask)  hint='<b style="color:var(--task)">⚙ Espace → ouvrir la tâche</b>';
    else if(nearTP) hint='<b style="color:var(--teleport)">🌀 Espace → téléporteur</b>';
    else if(nearHeal&&S.inno.hearts<HEARTS_MAX) hint='<b style="color:var(--heal)">✚ Soin en cours…</b>';
    else if(nearOxy) hint='<b style="color:#ff5d6c">O₂ Espace → réparer ici !</b>';
    else hint='Flèches / ZQSD pour te déplacer · Espace pour agir';

    if(oxyAlert&&!nearOxy){
      hint+=` <span style="color:#ff5d6c;opacity:.8">· 🚨 Répare l\'O₂ au Hub !</span>`;
    }
    p.innerHTML=hint;

  } else {
    // Imposteur : cooldowns avec barres graphiques
    const atkPct  = attackReady<=0?1:Math.max(0,1-attackReady/ATTACK_CD);
    const sabPct  = sabReady<=0?1:Math.max(0,1-sabReady/SAB_CD);
    const oxyPct  = oxyReady<=0?1:Math.max(0,1-oxyReady/OXY_CD);
    const inRange = S.inno.alive && dist(S.impo,S.inno)<ATTACK_RANGE;

    const bar=(pct,color)=>{
      const w=Math.round(pct*60);
      return `<span style="display:inline-block;width:60px;height:6px;background:#1a1f3a;border-radius:3px;vertical-align:middle;margin:0 4px">
        <span style="display:block;width:${w}px;height:6px;background:${color};border-radius:3px"></span></span>`;
    };

    const atkLabel=attackReady<=0?'<b style="color:#f2618f">PRÊTE</b>':Math.ceil(attackReady/60)+'s';
    const sabLabel=sabReady<=0?'<b>prêt</b>':Math.ceil(sabReady/60)+'s';
    const oxyLabel=oxyReady<=0?'<b>prêt</b>':Math.ceil(oxyReady/60)+'s';

    p.innerHTML=
      `${inRange?'<b style="color:#f2618f">● À portée !</b> · ':''}` +
      `Frappe ${bar(atkPct,'#f2618f')}${atkLabel} &nbsp;` +
      `Lumières ${bar(sabPct,'#c08cff')}${sabLabel} &nbsp;` +
      `O₂ ${bar(oxyPct,'#ff5d6c')}${oxyLabel}`;
  }
}

function _updatePowerBarLocal(){
  const p=document.getElementById('power');
  const nearTask=TASKS.some(t=>!S.tasks[t.id]&&dist(S.inno,t)<44);
  const nearTP=TELEPORTS.some(tp=>dist(S.inno,tp)<44);
  const inRange=S.inno.alive&&dist(S.impo,S.inno)<ATTACK_RANGE;
  const atk=attackReady<=0?'<b style="color:#f2618f">prête</b>':Math.ceil(attackReady/60)+'s';
  const sab=sabReady<=0?'<b>prêt</b>':Math.ceil(sabReady/60)+'s';
  let innoHint=nearTask?'⚙ Espace → tâche':nearTP?'🌀 Espace → téléport':'ZQSD · Espace';
  p.innerHTML=
    `<span style="color:var(--innocent)">😇 ${innoHint}</span>`+
    `&ensp;|&ensp;`+
    `<span style="color:var(--imposteur)">😈 Flèches · Entrée — `+
    `${inRange?'<b style="color:#f2618f">À portée !</b> ':''}`+
    `frappe&nbsp;${atk} · lumières&nbsp;${sab}</span>`;
}

function drawBanner(){
  const b=document.getElementById('banner'),t=document.getElementById('banner-text');
  b.style.display='flex';
  const win=S.over===myRole;
  if(S.over==='innocent') t.textContent=win?'😇 Toutes les tâches accomplies — Victoire !':'😇 L\'innocent·e a réussi sa mission…';
  else t.textContent=win?'😈 Vaisseau saboté — Victoire !':'💀 Plus de cœurs… tu as perdu.';
}
