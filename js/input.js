// ============================================================
//  ENTRÉES CLAVIER
// ============================================================
const keys={};
addEventListener('keydown',e=>{
  keys[e.key.toLowerCase()]=true;
  if(e.key===' ') e.preventDefault();
  if(e.key==='Enter') e.preventDefault();
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

function ax(neg,pos){return (keys[pos]?1:0)-(keys[neg]?1:0);}

// Mode normal (un seul rôle par onglet) — toutes les touches fusionnées
function inputVec(){
  let dx=ax('arrowleft','arrowright')+ax('q','d')+ax('a','d');
  let dy=ax('arrowup','arrowdown')+ax('z','s')+ax('w','s');
  dx=Math.max(-1,Math.min(1,dx)); dy=Math.max(-1,Math.min(1,dy));
  const l=Math.hypot(dx,dy)||1; return {dx:dx/l,dy:dy/l};
}

// Mode local — touches séparées par joueur
function inputVecInno(){
  let dx=ax('q','d')+ax('a','d');
  let dy=ax('z','s')+ax('w','s');
  dx=Math.max(-1,Math.min(1,dx)); dy=Math.max(-1,Math.min(1,dy));
  const l=Math.hypot(dx,dy)||1; return {dx:dx/l,dy:dy/l};
}
function inputVecImpo(){
  let dx=ax('arrowleft','arrowright');
  let dy=ax('arrowup','arrowdown');
  const l=Math.hypot(dx,dy)||1; return {dx:dx/l,dy:dy/l};
}

// Espace → action Innocent (ou rôle unique en mode onglets)
let spacePressed=false;
addEventListener('keydown',e=>{ if(e.key===' '&&!spacePressed){spacePressed=true; onAction();} });
addEventListener('keyup',e=>{ if(e.key===' ') spacePressed=false; });

// Entrée → action Imposteur en mode local uniquement
let enterPressed=false;
addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!enterPressed&&localMode){ enterPressed=true; onActionImpo(); }
});
addEventListener('keyup',e=>{ if(e.key==='Enter') enterPressed=false; });
