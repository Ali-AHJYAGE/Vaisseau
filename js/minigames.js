// ============================================================
//  MINI-JEUX — côté innocent uniquement
// ============================================================
const mg={
  el:   document.getElementById('minigame'),
  area: document.getElementById('mg-area'),
  title:document.getElementById('mg-title'),
  desc: document.getElementById('mg-desc'),
};

// Nettoyage optionnel enregistré par le mini-jeu actif (ex: rythme)
let _mgCleanup=null;


function openMinigame(task){
  minigameActive=task;
  mg.el.style.display='flex';
  if(task.type==='wires')   buildWires(task);
  else if(task.type==='code')   buildCode(task);
  else if(task.type==='memory') buildMemory(task);
  else if(task.type==='sort')   buildSort(task);
  else if(task.type==='rhythm') buildRhythm(task);
}

function closeMinigame(success){
  if(_mgCleanup){ _mgCleanup(); _mgCleanup=null; }
  if(success&&minigameActive){
    S.tasks[minigameActive.id]=true;
    if(typeof Sfx!=='undefined') Sfx.task();
    if(typeof burst!=='undefined') burst(minigameActive.x,minigameActive.y,'#5fe08a');
  }
  minigameActive=null;
  mg.el.style.display='none';
  mg.area.innerHTML='';
}

// ── Helpers partagés ──────────────────────────────────────────
function mgFail(msg){
  mg.desc.textContent=msg||'Raté ! Recommence.';
  mg.desc.style.color='#ff5d6c';
  setTimeout(()=>mg.desc.style.color='',600);
}

// ── Câblage : relier couleurs gauche → droite ─────────────────
function buildWires(task){
  mg.title.textContent='🔌 Câblage';
  mg.desc.textContent='Clique une couleur à gauche, puis sa jumelle à droite.';
  const cols=['#ff5d6c','#56e0d0','#ffd84d','#c08cff'];
  const right=[...cols].sort(()=>Math.random()-0.5);
  mg.area.innerHTML='';
  const wrap=document.createElement('div');
  wrap.style.cssText='display:flex;gap:48px;align-items:center';
  const L=document.createElement('div'),R=document.createElement('div');
  L.style.cssText=R.style.cssText='display:flex;flex-direction:column;gap:12px';
  let pick=null,done=0;
  cols.forEach(c=>{
    const b=document.createElement('div');b.className='wire';b.style.background=c;
    b.onclick=()=>{
      pick=c;
      [...L.children].forEach(x=>x.style.outline='');
      b.style.outline='3px solid #fff';
    };
    L.appendChild(b);
  });
  right.forEach(c=>{
    const b=document.createElement('div');b.className='wire';b.style.background=c;
    b.onclick=()=>{
      if(!pick) return;
      if(pick===c){
        b.style.opacity=.35;b.onclick=null;
        [...L.children].forEach(x=>{ if(x.style.background===c) x.style.opacity=.35; });
        done++;
        if(done===cols.length) closeMinigame(true);
      } else {
        mgFail('Mauvaise couleur !');
      }
    };
    R.appendChild(b);
  });
  wrap.append(L,R);mg.area.appendChild(wrap);
}

// ── Code d'accès : mémoriser puis reproduire ─────────────────
function buildCode(task){
  mg.title.textContent='🔢 Code d\'accès';
  mg.desc.textContent='Mémorise la séquence…';
  const seq=Array.from({length:4},()=>1+Math.floor(Math.random()*9));
  mg.area.innerHTML=`<div style="font-size:34px;letter-spacing:10px;font-weight:800">${seq.join(' ')}</div>`;
  setTimeout(()=>{
    mg.area.innerHTML='';
    mg.desc.textContent='Reproduis la séquence dans l\'ordre.';
    const grid=document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:repeat(3,50px);gap:8px';
    let idx=0;
    for(let n=1;n<=9;n++){
      const b=document.createElement('button');b.className='codecell';b.textContent=n;
      b.onclick=()=>{
        if(n===seq[idx]){
          idx++;b.classList.add('lit');setTimeout(()=>b.classList.remove('lit'),150);
          if(idx===seq.length) closeMinigame(true);
        } else {
          idx=0;mgFail('Mauvais chiffre ! Recommence depuis le début.');
        }
      };
      grid.appendChild(b);
    }
    mg.area.appendChild(grid);
  },1800);
}

// ── Mémoire (Simon) : répéter la séquence lumineuse ──────────
function buildMemory(task){
  mg.title.textContent='🧠 Séquence mémoire';
  mg.desc.textContent='Regarde bien l\'ordre…';
  const colors=['#ff5d6c','#56e0d0','#ffd84d','#c08cff'];
  const seq=Array.from({length:4},()=>Math.floor(Math.random()*4));
  mg.area.innerHTML='';
  const grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(2,64px);gap:12px';
  const cells=colors.map(c=>{
    const b=document.createElement('div');b.className='wire';
    b.style.cssText=`width:64px;height:64px;background:${c};opacity:.3`;
    grid.appendChild(b);return b;
  });
  mg.area.appendChild(grid);

  let i=0;
  const flash=()=>{
    if(i>=seq.length){ enableInput(); return; }
    const b=cells[seq[i]];
    b.style.opacity=1;
    setTimeout(()=>{ b.style.opacity=.3; i++; setTimeout(flash,300); },480);
  };
  setTimeout(flash,500);

  function enableInput(){
    mg.desc.textContent='À toi ! Reproduis l\'ordre.';
    let idx=0;
    cells.forEach((b,ci)=>{
      b.style.cursor='pointer';
      b.onclick=()=>{
        b.style.opacity=1;setTimeout(()=>b.style.opacity=.3,150);
        if(ci===seq[idx]){
          idx++;
          if(idx===seq.length) closeMinigame(true);
        } else {
          idx=0;mgFail('Mauvais ! Recommence.');
        }
      };
    });
  }
}

// ── Tri de données : cliquer les nombres dans l'ordre croissant ─
function buildSort(task){
  mg.title.textContent='📊 Tri de données';
  mg.desc.textContent='Clique les valeurs dans l\'ordre croissant (du plus petit au plus grand).';
  const count=6;
  const nums=Array.from({length:count},()=>5+Math.floor(Math.random()*90));
  const sorted=[...nums].sort((a,b)=>a-b);
  mg.area.innerHTML='';
  const wrap=document.createElement('div');
  wrap.style.cssText='display:flex;flex-wrap:wrap;gap:10px;justify-content:center';
  let idx=0;
  const shuffled=[...nums].sort(()=>Math.random()-0.5);
  shuffled.forEach(n=>{
    const b=document.createElement('button');b.className='codecell';
    b.style.cssText='width:54px;height:54px;font-size:16px';b.textContent=n;
    b.onclick=()=>{
      if(n===sorted[idx]){
        idx++;b.style.background='#74e08a';b.style.color='#0a2a14';b.onclick=null;
        if(idx===count) closeMinigame(true);
      } else {
        idx=0;
        [...wrap.children].forEach(x=>{
          if(x.onclick) { x.style.background='#222a4a'; x.style.color='#fff'; }
        });
        mgFail('Pas le bon ordre ! Recommence.');
      }
    };
    wrap.appendChild(b);
  });
  mg.area.appendChild(wrap);
}

// ── Rythme : appuie sur Espace en cadence avec les flashs ─────
function buildRhythm(task){
  mg.title.textContent='🎵 Synchronisation';
  mg.desc.textContent='Appuie sur Espace exactement sur chaque flash !';
  const INTERVAL=700, TOLERANCE=160, ROUNDS=4;
  let hits=0, lastFlash=null, timerRef=null;

  mg.area.innerHTML='';
  const circle=document.createElement('div');
  circle.style.cssText='width:80px;height:80px;border-radius:50%;background:#c08cff;opacity:.3;transition:opacity .08s;margin:10px auto';
  const info=document.createElement('div');
  info.style.cssText='font-size:15px;margin-top:10px;opacity:.7';
  info.textContent=`0 / ${ROUNDS}`;
  mg.area.append(circle,info);

  function pulse(){
    lastFlash=performance.now();
    circle.style.opacity=1;
    setTimeout(()=>circle.style.opacity=.3,100);
  }

  // Écouteur Espace propre au mini-jeu rythme (ne passe pas par onAction)
  function onSpace(e){
    if(e.key!==' '||!minigameActive) return;
    e.stopImmediatePropagation(); // ne pas déclencher l'action globale
    if(lastFlash===null) return;
    const delta=Math.abs(performance.now()-lastFlash);
    if(delta<=TOLERANCE){
      hits++;info.textContent=`${hits} / ${ROUNDS}`;
      circle.style.background='#74e08a';
      setTimeout(()=>circle.style.background='#c08cff',200);
      if(hits===ROUNDS){ _mgCleanup&&_mgCleanup(); closeMinigame(true); }
    } else {
      hits=0;info.textContent=`0 / ${ROUNDS}`;
      circle.style.background='#ff5d6c';
      setTimeout(()=>circle.style.background='#c08cff',200);
      mgFail('Pas en rythme ! Recommence.');
    }
  }

  // Enregistre la fonction de nettoyage pour closeMinigame
  _mgCleanup=()=>{ clearInterval(timerRef); removeEventListener('keydown',onSpace,true); };

  setTimeout(()=>{ pulse(); timerRef=setInterval(pulse,INTERVAL); },600);
  addEventListener('keydown',onSpace,true); // capture=true : avant le handler global
}
