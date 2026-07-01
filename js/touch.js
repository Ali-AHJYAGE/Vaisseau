// ============================================================
//  CONTRÔLES TACTILES — joystick virtuel + bouton d'action
// ============================================================
const KNOB_R = 38;   // rayon max de déplacement du knob

const jZone = document.getElementById('joystick-zone');
const jKnob  = document.getElementById('joystick-knob');

// touchVec est défini dans input.js — on le met à jour ici
function _joystickMove(touch) {
  const r  = jZone.getBoundingClientRect();
  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;
  let dx = touch.clientX - cx;
  let dy = touch.clientY - cy;
  const d = Math.hypot(dx, dy);
  if (d > KNOB_R) { dx = dx/d*KNOB_R; dy = dy/d*KNOB_R; }
  touchVec.dx = dx / KNOB_R;
  touchVec.dy = dy / KNOB_R;
  jKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function _joystickReset() {
  touchVec.dx = touchVec.dy = 0;
  jKnob.style.transform = 'translate(-50%, -50%)';
}

jZone.addEventListener('touchstart', e => _joystickMove(e.touches[0]), {passive: true});
jZone.addEventListener('touchmove',  e => { e.preventDefault(); _joystickMove(e.touches[0]); }, {passive: false});
jZone.addEventListener('touchend',   _joystickReset, {passive: true});
jZone.addEventListener('touchcancel',_joystickReset, {passive: true});

// Bouton d'action : tap = même effet que Espace
document.getElementById('action-btn').addEventListener('touchstart', e => {
  e.preventDefault(); // évite le double-tap zoom
  onAction();
}, {passive: false});
