// ============================================================
//  HUD (v13) — cœurs, chips, panneau d'actions, bannières
// ============================================================
const _btnTask   = document.getElementById('btn-task');
const _btnTp     = document.getElementById('btn-tp');
const _btnScan   = document.getElementById('btn-scan');
const _btnAttack = document.getElementById('btn-attack');
const _btnVent   = document.getElementById('btn-vent');
const _btnSab    = document.getElementById('btn-sab');
const _btnOxy    = document.getElementById('btn-oxy');
const _btnDoor   = document.getElementById('btn-door');
const _ALLBTN=[_btnTask,_btnTp,_btnScan,_btnAttack,_btnVent,_btnSab,_btnOxy,_btnDoor];

function _show(btn,cls,html){ if(!btn)return; btn.style.display='flex'; btn.className='act-btn '+cls; btn.innerHTML=html; }
function _hide(btn){ if(btn) btn.style.display='none'; }

function drawHud(){
  // Cœurs
  const hearts='❤️'.repeat(Math.max(0,S.inno.hearts))+'🖤'.repeat(Math.max(0,HEARTS_MAX-S.inno.hearts));
  document.getElementById('hearts').textContent=(myRole==='innocent'||localMode)?hearts:'';

  // Chip fromages (tâches)
  const done=Object.values(S.tasks).filter(Boolean).length;
  document.getElementById('task-chip').textContent=`🧀 ${done}/4`;

  // Chip statut (piège / noir / portes)
  const st=document.getElementById('status-chip');
  const now=Date.now();
  if(now<S.oxygenUntil){ st.textContent=`🪤 Piège — ${Math.ceil((S.oxygenUntil-now)/1000)}s`; st.style.color='#ff5d6c'; }
  else if(now<S.doorsUntil){ st.textContent='🚪 Portes closes'; st.style.color='#ffb14d'; }
  else if(now<S.sabotageUntil){ st.textContent='🌑 Panne de courant'; st.style.color='#c8cdf0'; }
  else { st.textContent=''; st.style.color=''; }

  // Chip score (manches) + arme
  const sc=document.getElementById('score-chip');
  if(sc){
    let txt = localMode ? '' : `Manche ${roundNum} · ${myWins}–${theirWins}`;
    if(myRole==='imposteur'||localMode){ const wp=WEAPON_TYPES[S.impo.weapon]||WEAPON_TYPES.knife; txt+=(txt?'  ':'')+wp.icon+' '+wp.name; }
    sc.textContent=txt;
  }

  _updateActionPanel();

  // Transition « Manche X »
  if(roundBanner>0 && !S.over){
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,'+Math.min(0.5,roundBanner/300)+')'; ctx.fillRect(0,VIEW_H/2-40,VIEW_W,80);
    ctx.fillStyle='#fff'; ctx.font='800 30px sans-serif'; ctx.textAlign='center';
    ctx.fillText(`Manche ${roundNum}`,VIEW_W/2,VIEW_H/2-4);
    ctx.font='700 15px sans-serif'; ctx.fillStyle=myRole==='imposteur'?C.imposteur:C.innocent;
    ctx.fillText(myRole==='imposteur'?'🐱 Tu es le CHAT':'🐭 Tu es la SOURIS',VIEW_W/2,VIEW_H/2+24);
    ctx.restore();
  }
}

function _updateActionPanel(){
  if(S.over||minigameActive||roundBanner>0){ _ALLBTN.forEach(_hide); return; }
  const now=Date.now();

  if(localMode||myRole==='innocent'){
    _hide(_btnAttack);_hide(_btnVent);_hide(_btnSab);_hide(_btnOxy);_hide(_btnDoor);

    const nearTask=TASKS.some(t=>!S.tasks[t.id]&&dist(S.inno,t)<44);
    _show(_btnTask,'act-btn act-inno'+(nearTask?' ready':''),'<span class="ico">🧀</span>Grignoter');
    const nearTP=TELEPORTS.some(tp=>dist(S.inno,tp)<44&&tpCooldown<=0);
    _show(_btnTp,'act-btn act-tp'+(nearTP?' ready':''),'<span class="ico">🕳️</span>Trou');
    if(scanCharges>0) _show(_btnScan,'act-btn act-scan ready','<span class="ico">🔔</span>Clochette');
    else _hide(_btnScan);

  } else {
    _hide(_btnTask);_hide(_btnTp);_hide(_btnScan);

    // Attaque (selon arme)
    const wp=WEAPON_TYPES[S.impo.weapon]||WEAPON_TYPES.knife;
    const inRange=S.inno.alive&&dist(S.impo,S.inno)<wp.range;
    const atkRdy=attackReady<=0&&inRange;
    const atkSecs=attackReady>0?Math.ceil(attackReady/60):0;
    _show(_btnAttack,'act-btn act-impo'+(atkRdy?' ready':''),
      `<span class="ico">${wp.icon}</span>${atkRdy?'Attaquer':atkSecs?atkSecs+'s':'Trop loin'}`);

    // Passage du chat
    const nearVent=VENTS.some(v=>dist(S.impo,v)<44&&ventCooldown<=0);
    _show(_btnVent,'act-btn act-vent'+(nearVent?' ready':''),'<span class="ico">🐾</span>Passage');

    // Éteindre
    const sabRdy=sabReady<=0, sabSecs=sabReady>0?Math.ceil(sabReady/60):0;
    _show(_btnSab,'act-btn act-impo'+(sabRdy?' ready':''),`<span class="ico">💡</span>${sabRdy?'Éteindre':sabSecs+'s'}`);

    // Piège
    const oxyActif=now<S.oxygenUntil, oxyRdy=oxyReady<=0&&!oxyActif;
    const oxySecs=oxyReady>0?Math.ceil(oxyReady/60):oxyActif?Math.ceil((S.oxygenUntil-now)/1000):0;
    _show(_btnOxy,'act-btn act-impo'+(oxyRdy?' ready':''),`<span class="ico">🪤</span>${oxyRdy?'Piège':oxyActif?'Actif '+oxySecs+'s':oxySecs+'s'}`);

    // Portes
    const doorRdy=doorReady<=0, doorSecs=doorReady>0?Math.ceil(doorReady/60):0;
    _show(_btnDoor,'act-btn act-impo'+(doorRdy?' ready':''),`<span class="ico">🚪</span>${doorRdy?'Portes':doorSecs+'s'}`);
  }
}

function drawBanner(){
  const b=document.getElementById('banner');
  const emoji=document.getElementById('banner-emoji');
  const t=document.getElementById('banner-text');
  const sub=document.getElementById('banner-sub');
  const btn=document.getElementById('banner-btn');
  b.style.display='flex';
  let cls,em,title,subtitle,btnTxt='↻ Rejouer';

  if(S.over==='disconnect'){ cls='b-neutral'; em='🔌'; title='Partenaire déconnecté'; subtitle='La liaison a été perdue.'; }
  else if(S.over==='match-win'){ cls='b-win-inno'; em='🏆'; title='MATCH GAGNÉ !'; subtitle=`Tu remportes le match ${myWins}–${theirWins}. Belle partie !`; btnTxt='↻ Nouveau match'; }
  else if(S.over==='match-lose'){ cls='b-lose'; em='💀'; title='MATCH PERDU'; subtitle=`Défaite ${theirWins}–${myWins}… la revanche ?`; btnTxt='↻ Nouveau match'; }
  else if(localMode){
    if(S.over==='innocent'){ cls='b-win-inno'; em='🐭'; title='La souris gagne !'; subtitle='Tous les fromages sont grignotés.'; }
    else { cls='b-win-impo'; em='🐱'; title='Le chat gagne !'; subtitle='La souris s\'est fait attraper.'; }
  } else {
    const iWon=(S.over===myRole);
    em=iWon?'🏆':(myRole==='innocent'?'🐭':'🐱'); title=iWon?'MANCHE GAGNÉE !':'MANCHE PERDUE';
    subtitle=`Score : ${myWins}–${theirWins}. `+(S.over==='innocent'
      ? (iWon?'Tous les fromages grignotés — la souris file !':'La souris a tout grignoté à temps.')
      : (iWon?'Miam ! La souris est attrapée.':'Le chat t\'a eue…'));
    subtitle+=' Manche suivante…';
    cls=iWon?(S.over==='innocent'?'b-win-inno':'b-win-impo'):'b-lose';
    btnTxt='Abandonner';
  }

  emoji.textContent=em; t.textContent=title; sub.textContent=subtitle;
  if(btn) btn.textContent=btnTxt;
  b.className=cls;

  if(!_bannerSounded && typeof Sfx!=='undefined'){
    _bannerSounded=true;
    if(S.over!=='disconnect'){
      const won = S.over==='match-win' || (S.over!=='match-lose' && (localMode || S.over===myRole));
      won ? Sfx.win() : Sfx.lose();
    }
  }
}
