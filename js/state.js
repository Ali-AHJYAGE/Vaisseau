// ============================================================
//  ÉTAT GLOBAL (v13)
// ============================================================
let myRole = null;
let localMode = false;
let gameStarted = false;

const S = {
  inno: { x:820, y:610, hearts:HEARTS_MAX, alive:true, shield:0, synced:false, hidden:false, hideObj:0, healProg:0 },
  impo: { x:820, y:540, present:false, weapon:'knife' },
  tasks: { t1:false, t2:false, t3:false, t4:false },
  sabotageUntil: 0,   // lumières (timestamp ms)
  oxygenUntil: 0,     // crise O₂ (timestamp ms)
  doorsUntil: 0,      // portes closes (timestamp ms)
  healUntil: 0,       // infirmerie en recharge jusqu'à (timestamp ms)
  over: null,
};
let healHold = 0;     // frames immobiles cumulées dans l'infirmerie

let frame = 0;

// Cooldowns (frames, locaux)
let attackReady = 0, healReady = 0, sabReady = 0, oxyReady = 0, doorReady = 0;
let ventCooldown = 0, tpCooldown = 0;
let minigameActive = null;
let partnerGoneAt = 0;

// Endurance / sprint (joueur local)
let stamina = STAMINA_MAX;

// Bond du chat (élan)
let dashFrames = 0, dashVX = 0, dashVY = 0;
let idleSoundIn = 300;  // frames avant le prochain miaou/couinement d'ambiance

// Actions spéciales
let squeakReady = 0, climbReady = 0, hisReady = 0, flairReady = 0;
let freezeUntil = 0;   // souris figée par le feulement (ms)
let hideUntil   = 0;   // souris cachée/camouflée (ms)
let flairUntil  = 0;   // chat renifle : révèle la souris (ms)
let decoy       = null;// leurre {x,y,until} vu par le chat
let innoTrail   = [];  // historique positions souris (côté chat) pour le flair

// Innocent — gadgets
let scanUntil = 0;        // révèle l'imposteur jusqu'à ce timestamp
let scanCharges = 0;      // charges de scanner ramassées

// Inventaires locaux (par rôle, non synchronisés — remis à zéro chaque manche)
let takenWeapons = new Set();  // armes ramassées par l'imposteur
let takenGadgets = new Set();  // gadgets ramassés par l'innocent

// Manches / score
let myWins = 0, theirWins = 0, roundNum = 1;
let roundReported = false;     // évite de compter deux fois la fin de manche
let roundBanner = 0;           // frame jusqu'à laquelle afficher « Manche X »
let _bannerSounded = false;    // évite de rejouer le son de victoire/défaite
