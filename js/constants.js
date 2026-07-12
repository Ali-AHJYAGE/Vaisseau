// ============================================================
//  CONSTANTES — refonte v13 : map asymétrique, armes, gadgets,
//  vents (imposteur) / téléporteurs (innocent), manches.
// ============================================================
const VERSION='v30';
const VIEW_W=760, VIEW_H=560;
const WORLD_W=1700, WORLD_H=1250;
const PLAYER_R=15, SPEED=3.0;

// ── Endurance / sprint (les deux joueurs) ──────────────────
const SPRINT_MULT=1.6;      // vitesse ×1.6 en sprint
const STAMINA_MAX=180;      // ~3 s de sprint plein
const STAMINA_DRAIN=1.4;    // par frame en sprint
const STAMINA_REGEN=0.7;    // par frame au repos

// ── Combat ─────────────────────────────────────────────────
const HEARTS_MAX=3;
// Infirmerie : rester IMMOBILE 3 s dans la zone pour gagner 1 cœur, puis 2 min de recharge
const HEAL_HOLD=180;             // frames immobiles requises (~3 s)
const HEAL_COOLDOWN_MS=120000;   // 1 soin toutes les 2 min
// Capacités du CHAT (portée en px, dégâts en cœurs, cd en frames)
const WEAPON_TYPES={
  knife:   {name:'Griffes', icon:'🐾', range:46,  dmg:1, cd:90},   // défaut : rapide, courte
  blaster: {name:'Bond',    icon:'💨', range:130, dmg:1, cd:170},  // bond : longue portée, lent
  cleaver: {name:'Coup de patte', icon:'💥', range:36, dmg:2, cd:120}, // lourd : 2 dégâts, très courte
};

// ── Sabotages ──────────────────────────────────────────────
const SAB_CD=600;               // recharge lumières (frames)
const SAB_DURATION_MS=7000;     // lumières coupées ~7 s
const OXY_CD=1000;              // recharge O₂ (frames)
const OXY_DURATION_MS=14000;    // crise O₂ ~14 s (assez pour traverser la map)
const DOOR_CD=720;              // recharge portes (frames)
const DOOR_DURATION_MS=4500;    // portes bloquées ~4,5 s

// ── Vision ─────────────────────────────────────────────────
const VISION=205;
const VISION_DARK=120;

// ── Gadgets innocent ───────────────────────────────────────
const SCAN_DURATION_MS=2600;    // révèle l'imposteur ~2,6 s
const SHIELD_ABSORB=1;          // encaisse 1 coup

// ── Bond du chat (attaque « Bond ») ────────────────────────
const DASH_FRAMES=9;            // durée de l'élan
const DASH_SPEED=7.5;           // vitesse de l'élan

// ── Actions spéciales (frames pour cd, ms pour durées) ─────
const SQUEAK_CD=420;            // souris : couinement (leurre)
const DECOY_MS=4500;            // durée du leurre vu par le chat
const CLIMB_CD=600, CLIMB_MS=3200;   // souris : grimper/camouflage
const HISS_CD=540, HISS_RANGE=130, FREEZE_MS=1100; // chat : feulement (fige la souris)
const FLAIR_CD=540, FLAIR_MS=2600;   // chat : flair (révèle + piste)

// ── Manches / revanche ─────────────────────────────────────
const WINS_NEEDED=2;            // best-of 3 (premier à 2)

// ── Réseau ─────────────────────────────────────────────────
const NET_EVERY=4;              // ~15 Hz
const PARTNER_TIMEOUT=1200;     // ~20 s avant abandon

// ── Feuille de marche (assets/<rôle>_walk.png) ─────────────
// Bande de N frames. idle = vignette à l'arrêt ; walk = cycle de marche.
// faceRight=false → les frames regardent à GAUCHE (on retourne l'image pour
// aller à droite). dispH = hauteur affichée (px) ; yOff = décalage vertical.
const SKIN_ANIM={ frames:5, idle:0, walk:[1,2,3,4], faceRight:false, step:6, dispH:PLAYER_R*3.6, yOff:-6 };

// ============================================================
//  CARTE ASYMÉTRIQUE
//  (connectivité vérifiée par test flood-fill — voir scripts)
// ============================================================
const ROOMS=[
  {x: 60, y:120, w:260, h:220, name:'Cuisine'},          // 60-320,   120-340   (exigu, cul-de-sac)
  {x: 60, y:640, w:320, h:360, name:'Garde-manger'},     // 60-380,   640-1000  (grande, pour semer)
  {x:520, y: 80, w:520, h:200, name:'Salle à manger'},   // 520-1040, 80-280    (ouvert, exposé)
  {x:640, y:470, w:360, h:280, name:'Salon'},            // 640-1000, 470-750   (centre)
  {x:1200,y:120, w:300, h:220, name:'Chambre'},          // 1200-1500,120-340   (coin repos)
  {x:1300,y:520, w:320, h:240, name:'Bureau'},           // 1300-1620,520-760
  {x:1180,y:920, w:340, h:240, name:'Salle de bain'},    // 1180-1520,920-1160
  {x:560, y:920, w:320, h:220, name:'Buanderie'},        // 560-880,  920-1140
];

const HALLS=[
  // Réacteur → Hub
  {x:300, y:210, w:420, h:60},   // horiz 300-720, 210-270 (touche Réacteur 300-320)
  {x:660, y:210, w:60,  h:320},  // vert  660-720, 210-530 (touche Hub 470-530)
  // Pont → Hub
  {x:800, y:270, w:60,  h:220},  // vert  800-860, 270-490 (Pont 270-280 ↔ Hub 470-490)
  // Baie → Communications
  {x:1360,y:330, w:60,  h:200},  // vert  1360-1420, 330-530 (Baie 330-340 ↔ Comms 520-530)
  // Hub → Communications
  {x:980, y:590, w:340, h:60},   // horiz 980-1320, 590-650 (Hub 980-1000 ↔ Comms 1300-1320)
  // Soute → Hub
  {x:360, y:800, w:340, h:60},   // horiz 360-700, 800-860 (touche Soute 360-380)
  {x:660, y:690, w:60,  h:170},  // vert  660-720, 690-860 (Hub 690-750 ↔ hall horiz)
  // Stockage → hall Soute/Hub
  {x:700, y:800, w:60,  h:180},  // vert  700-760, 800-980 (Stockage 920-980 ↔ hall horiz)
  // Communications → Quartiers
  {x:1380,y:750, w:60,  h:220},  // vert  1380-1440, 750-970 (Comms 750-760 ↔ Quartiers 920-970)
  // Stockage → Quartiers (boucle basse)
  {x:860, y:1000,w:340, h:60},   // horiz 860-1200, 1000-1060 (Stockage 860-880 ↔ Quartiers 1180-1200)
];
const ZONES=[...ROOMS,...HALLS];

// ── Tâches (mini-jeux) — placées dans des zones variées/risquées ──
const TASKS=[
  {id:'t1', x:170,  y:250,  room:'Cuisine',        type:'wires'},   // cul-de-sac dangereux
  {id:'t2', x:780,  y:170,  room:'Salle à manger', type:'code'},    // à découvert
  {id:'t3', x:1350, y:1040, room:'Salle de bain',  type:'memory'},  // coin éloigné
  {id:'t4', x:700,  y:1030, room:'Buanderie',      type:'sort'},    // bas de map
];

// ── Vents : IMPOSTEUR uniquement. Anneau : chaque vent mène au suivant ──
const VENTS=[
  {id:'v1', x:150,  y:300},   // Réacteur
  {id:'v2', x:980,  y:150},   // Pont
  {id:'v3', x:1450, y:700},   // Communications
  {id:'v4', x:1250, y:1090},  // Quartiers
  {id:'v5', x:180,  y:940},   // Soute
];

// ── Téléporteurs : INNOCENT uniquement (2 paires, évasion) ──
const TELEPORTS=[
  {id:'tp1', x:200,  y:820,  link:'tp2'},  // Soute
  {id:'tp2', x:1350, y:300,  link:'tp1'},  // Baie médicale
  {id:'tp3', x:560,  y:180,  link:'tp4'},  // Pont (gauche)
  {id:'tp4', x:1450, y:960,  link:'tp3'},  // Quartiers
];

// ── Armes ramassables (imposteur) ─────────────────────────
const WEAPON_PICKUPS=[
  {id:'w1', x:960,  y:200,  type:'blaster'},  // Pont, exposé — risque/récompense
  {id:'w2', x:200,  y:900,  type:'cleaver'},  // Soute, planqué
];

// ── Gadgets ramassables (innocent) ────────────────────────
const GADGET_PICKUPS=[
  {id:'g1', x:1450, y:600,  type:'scanner'},  // Communications
  {id:'g2', x:260,  y:170,  type:'shield'},   // Réacteur
];

// ── Zone de soin (Baie médicale) ──────────────────────────
const HEAL_ZONE={x:1350, y:230, r:46};

// ── Panneau O₂ (Hub) — l'innocent doit y courir pour réparer ─
const OXY_PANEL={x:820, y:610};

// ── Portes (chokepoints) que l'imposteur peut claquer ─────
const DOORS=[
  {id:'d1', x:660,  y:360,  w:60, h:44},  // hall Réacteur↔Hub
  {id:'d2', x:1130, y:590,  w:44, h:60},  // hall Hub↔Comms
  {id:'d3', x:660,  y:770,  w:60, h:44},  // hall Soute↔Hub
  {id:'d4', x:1380, y:840,  w:60, h:44},  // hall Comms↔Quartiers
];

// ── Éléments de décor de la MAISON (visuels, hors salles) ──
const MAP_DECOR=[
  {type:'stairs', x:665, y:400, w:50, h:110},   // hall vertical (haut)
  {type:'stairs', x:1385,y:760, w:50, h:110},   // hall Bureau→SdB
  {type:'grate',  x:990, y:960, r:15},          // bouche d'aération au sol
  {type:'grate',  x:390, y:820, r:14},
  {type:'crack',  x:1150,y:250, w:110},         // fissures
  {type:'crack',  x:200, y:1060,w:90},
  {type:'crack',  x:900, y:520, w:80},
];

