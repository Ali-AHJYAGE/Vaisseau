// ============================================================
//  CONSTANTES — dimensionnement, équilibrage, carte
// ============================================================
const VIEW_W=760, VIEW_H=560;
const WORLD_W=1600, WORLD_H=1200;
const PLAYER_R=15, SPEED=3.0;
const ATTACK_RANGE=44, ATTACK_CD=90;
const HEAL_CD=600;
const SAB_DURATION=420;
const SAB_CD=540;
const VISION=190;
const VISION_DARK=110;
const HEARTS_MAX=3;

// Sabotage O₂ (Semaine 2)
const OXY_DURATION=300;  // frames de crise (~5 s à 60 fps)
const OXY_CD=720;        // recharge imposteur (~12 s)

// ─── Salles ───────────────────────────────────────────────────
// Hub: x:580-1020, y:470-730
const ROOMS=[
  {x:580, y:470, w:440, h:260, name:'Hub central'},
  {x: 80, y: 80, w:280, h:220, name:'Réacteur'},       // x:80-360,   y:80-300
  {x:1240, y: 80, w:280, h:220, name:'Navigation'},    // x:1240-1520, y:80-300
  {x: 80, y:900, w:280, h:220, name:'Moteur'},          // x:80-360,   y:900-1120
  {x:1240, y:900, w:280, h:220, name:'Communications'}, // x:1240-1520, y:900-1120
  {x:630, y: 80, w:340, h:180, name:'Baie médicale'},  // x:630-970,  y:80-260
  {x:630, y:940, w:340, h:180, name:'Stockage'},        // x:630-970,  y:940-1120
];

// ─── Couloirs (connexions vérifiées salle↔couloir↔salle) ──────
//
//  Principe de chaque L :
//    seg horizontal touche la salle d'angle à une extrémité
//    seg vertical   touche le Hub à l'autre extrémité
//    les deux segs se chevauchent à leur coin commun
//
const HALLS=[
  // Réacteur → Hub  (Réacteur: x:80-360 y:80-300 | Hub: x:580-1020 y:470-730)
  {x:300, y:200, w:340, h:60},  // horizontal x:300-640, y:200-260  (touche Réacteur à x:300-360)
  {x:580, y:200, w:60, h:310},  // vertical   x:580-640, y:200-510  (touche Hub à y:470-510)

  // Navigation → Hub  (Nav: x:1240-1520 y:80-300)
  {x:960, y:200, w:340, h:60},  // horizontal x:960-1300, y:200-260 (touche Nav à x:1240-1300)
  {x:960, y:200, w:60, h:310},  // vertical   x:960-1020, y:200-510 (touche Hub à y:470-510)

  // Moteur → Hub  (Moteur: x:80-360 y:900-1120)
  {x:300, y:940, w:340, h:60},  // horizontal x:300-640, y:940-1000 (touche Moteur à x:300-360)
  {x:580, y:690, w:60, h:310},  // vertical   x:580-640, y:690-1000 (touche Hub à y:690-730)

  // Communications → Hub  (Comms: x:1240-1520 y:900-1120)
  {x:960, y:940, w:340, h:60},  // horizontal x:960-1300, y:940-1000 (touche Comms à x:1240-1300)
  {x:960, y:690, w:60, h:310},  // vertical   x:960-1020, y:690-1000 (touche Hub à y:690-730)

  // Baie médicale → Hub  (Baie: x:630-970 y:80-260)
  {x:740, y:240, w:120, h:270}, // vertical x:740-860, y:240-510 (Baie à y:240-260, Hub à y:470-510)

  // Stockage → Hub  (Stockage: x:630-970 y:940-1120)
  {x:740, y:690, w:120, h:280}, // vertical x:740-860, y:690-970 (Hub à y:690-730, Stockage à y:940-970)
];
const ZONES=[...ROOMS,...HALLS];

// ─── Tâches (mini-jeux) ───────────────────────────────────────
const TASKS=[
  {id:'t1', x:220,  y:190,  room:'Réacteur',        type:'wires'},
  {id:'t2', x:1380, y:190,  room:'Navigation',       type:'code'},
  {id:'t3', x:220,  y:1010, room:'Moteur',           type:'memory'},
  {id:'t4', x:1380, y:1010, room:'Communications',   type:'sort'},
];

// ─── Téléporteurs (dans les salles d'angle) ───────────────────
const TELEPORTS=[
  {id:'tp1', x:150,  y:200,  link:'tp2'},  // Réacteur
  {id:'tp2', x:1450, y:200,  link:'tp1'},  // Navigation
  {id:'tp3', x:150,  y:1000, link:'tp4'},  // Moteur
  {id:'tp4', x:1450, y:1000, link:'tp3'},  // Communications
];

// ─── Zone de soin (au centre de Baie médicale) ───────────────
const HEAL_ZONE={x:800, y:170, r:46};

// ─── Panneau O₂ (Hub central) — l'innocent y va pour réparer ─
const OXY_PANEL={x:800, y:600};
