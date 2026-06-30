// ============================================================
//  POINT D'ENTRÉE
// ============================================================
function start(role) {
  myRole = role;
  if (role === 'imposteur') S.impo.present = true;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('stage').style.display = 'block';
  document.getElementById('conn-status').textContent = '';
  loop();
}

function startLocal() {
  localMode = true;
  myRole = 'innocent';
  S.impo.present = true;
  document.getElementById('menu').style.display = 'none';
  document.getElementById('stage').style.display = 'block';
  document.getElementById('conn-status').textContent = '';
  loop();
}

function resetGame() {
  send({ type: 'reset' }); // pas d'effet en localMode (send() retourne immédiatement)
  location.reload();
}
