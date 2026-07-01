// ============================================================
//  HUD — cœurs, tâches, panneau boutons, bannière
// ============================================================
const _btnTask   = document.getElementById('btn-task');
const _btnTp     = document.getElementById('btn-tp');
const _btnAttack = document.getElementById('btn-attack');
const _btnSab    = document.getElementById('btn-sab');
const _btnOxy    = document.getElementById('btn-oxy');

function _show(btn, cls, html){
  btn.style.display='flex'; btn.className='act-btn '+cls;
  btn.innerHTML=html;
}
function _hide(btn){ btn.style.display='none'; }

function drawHud(){
  // Cœurs
  const hearts='❤️'.repeat(S.inno.hearts)+'🖤'.repeat(HEARTS_MAX-S.inno.hearts);
  document.getElementById('hearts').textContent=(myRole==='innocent'||localMode)?hearts:'';

  // Compteur tâches
  const done=Object.values(S.tasks).filter(Boolean).length;
  document.getElementById('task-chip').textContent=`Tâches : ${done}/4`;

  // Chip sabotage
  const st=document.getElementById('status-chip');
  if(frame<S.oxygenUntil){
    const s=Math.ceil((S.oxygenUntil-frame)/60);
    st.textContent=`🚨 O₂ — ${s}s`; st.style.color='#ff5d6c';
  } else if(frame<S.sabotageUntil){
    st.textContent='⚡ Lumières'; st.style.color='';
  } else {
    st.textContent=''; st.style.color='';
  }

  _updateActionPanel();
}

function _updateActionPanel(){
  if(S.over||minigameActive){
    [_btnTask,_btnTp,_btnAttack,_btnSab,_btnOxy].forEach(_hide); return;
  }

  if(localMode||myRole==='innocent'){
    // Boutons imposteur cachés
    _hide(_btnAttack); _hide(_btnSab); _hide(_btnOxy);

    // Tâche
    const nearTask=TASKS.some(t=>!S.tasks[t.id]&&dist(S.inno,t)<44);
    if(nearTask) _show(_btnTask,'act-btn act-inno ready','<span class="ico">⚙️</span>Tâche');
    else _hide(_btnTask);

    // Téléporteur
    const nearTP=TELEPORTS.some(tp=>dist(S.inno,tp)<44&&tpCooldown<=0);
    if(nearTP) _show(_btnTp,'act-btn act-tp ready','<span class="ico">🌀</span>Téléport');
    else _hide(_btnTp);

  } else {
    // Rôle imposteur (mode réseau)
    _hide(_btnTask); _hide(_btnTp);

    const inRange=S.inno.alive&&dist(S.impo,S.inno)<ATTACK_RANGE;

    // Attaque
    const atkRdy=attackReady<=0&&inRange;
    const atkSecs=attackReady>0?Math.ceil(attackReady/60):0;
    _show(_btnAttack,
      'act-btn act-impo'+(atkRdy?' ready':''),
      `<span class="ico">⚔️</span>${atkRdy?'Frapper':atkSecs?atkSecs+'s':'Trop loin'}`);

    // Sabotage lumières
    const sabRdy=sabReady<=0;
    const sabSecs=sabReady>0?Math.ceil(sabReady/60):0;
    _show(_btnSab,
      'act-btn act-impo'+(sabRdy?' ready':''),
      `<span class="ico">💡</span>${sabRdy?'Lumières':sabSecs+'s'}`);

    // Sabotage O₂
    const oxyActif=frame<S.oxygenUntil;
    const oxyRdy=oxyReady<=0&&!oxyActif;
    const oxySecs=oxyReady>0?Math.ceil(oxyReady/60):oxyActif?Math.ceil((S.oxygenUntil-frame)/60):0;
    _show(_btnOxy,
      'act-btn act-impo'+(oxyRdy?' ready':''),
      `<span class="ico">🔴</span>${oxyRdy?'O₂':oxyActif?'Actif '+oxySecs+'s':oxySecs+'s'}`);
  }
}

function drawBanner(){
  const b=document.getElementById('banner'),t=document.getElementById('banner-text');
  b.style.display='flex';
  if(S.over==='disconnect')  t.textContent='🔌 Partenaire déconnecté…';
  else if(S.over==='innocent') t.textContent=(myRole==='innocent'||localMode)?'😇 Mission accomplie !':'😇 L\'innocent·e a réussi…';
  else t.textContent=(myRole==='imposteur'||localMode)?'😈 Vaisseau sabordé — Victoire !':'💀 Game over.';
}
