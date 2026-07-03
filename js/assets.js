// ============================================================
//  ASSETS (v14) — images optionnelles depuis assets/.
//  Si un fichier existe (ex: assets/innocent.png), il REMPLACE
//  le rendu par code. Sinon, on dessine tout à la main.
//  → Tu peux déposer tes propres images sans rien coder.
// ============================================================
const IMAGES = {};
// Emplacements reconnus (dépose assets/<nom>.png pour surcharger) :
const IMG_SLOTS = ['innocent','imposteur','innocent_dead','space','floor','wall',
                   'task','vent','teleport','weapon','gadget','o2','heal'];

IMG_SLOTS.forEach(name => {
  const img = new Image();
  img.onload  = () => { IMAGES[name] = img; };
  img.onerror = () => {};              // pas de fichier → on garde le rendu par code
  img.src = 'assets/' + name + '.png';
});

function hasImg(name){ const i=IMAGES[name]; return !!(i && i.complete && i.naturalWidth>0); }
// Dessine l'image centrée en (x,y) à la taille demandée ; renvoie false si absente
function drawImg(name, x, y, w, h){
  if(!hasImg(name)) return false;
  ctx.drawImage(IMAGES[name], x-w/2, y-h/2, w, h||w);
  return true;
}
