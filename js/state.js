// ============================================================
//  ÉTAT GLOBAL (v13)
// ============================================================
let myRole = null;
let localMode = false;
let gameStarted = false;

const S = {
  inno: { x:820, y:610, hearts:HEARTS_MAX, alive:true, shield:0, synced:false },
  impo: { x:820, y:540, present:false, weapon:'knife' },
  tasks: { t1:false, t2:false, t3:false, t4:false },
  sabotageUntil: 0,   // lumières (timestamp ms)
  oxygenUntil: 0,     // crise O₂ (timestamp ms)
  doorsUntil: 0,      // portes closes (timestamp ms)
  over: null,
};

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
