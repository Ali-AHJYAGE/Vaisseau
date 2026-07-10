// ============================================================
//  Serveur Chat & Souris — HTTP statique + WebSocket multi-salons.
//  Chaque partie = un "room" isolé (code, 2 joueurs, rôles, score,
//  relais). Plusieurs parties tournent en parallèle.
// ============================================================
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'application/javascript',
  '.json':'application/json', '.png':'image/png', '.mp3':'audio/mpeg',
};

const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(__dirname, url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const WINS_NEEDED = 2;                         // best-of 3

// ── Salons ──────────────────────────────────────────────────
const rooms = new Map(); // code -> room
let _nextId = 1;

function newCode(){
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c; do { c=Array.from({length:4},()=>A[Math.random()*A.length|0]).join(''); } while(rooms.has(c));
  return c;
}
function makeRoom(isPrivate){
  const room = { code:newCode(), private:isPrivate!==false, clients:new Set(),
    roles:{innocent:null,imposteur:null}, cache:{inno:null,impo:null,world:null},
    scores:{}, roundNum:1, roundResolved:false };
  rooms.set(room.code, room);
  return room;
}
function activeCount(room){ let n=0; room.clients.forEach(c=>{ if(c.readyState===1) n++; }); return n; }
function othersCount(room, ws){ let n=0; room.clients.forEach(c=>{ if(c!==ws && c.readyState===1 && c.cid!==ws.cid) n++; }); return n; }
function rolesMsg(room){ return { type:'roles', innocent:!!room.roles.innocent, imposteur:!!room.roles.imposteur, count:activeCount(room) }; }
function sendTo(ws,obj){ if(ws && ws.readyState===1) ws.send(JSON.stringify(obj)); }
function broadcast(room,obj,except){ const m=JSON.stringify(obj); room.clients.forEach(c=>{ if(c!==except && c.readyState===1) c.send(m); }); }
function wsByCid(room,cid){ for(const c of room.clients) if(c.cid===cid && c.readyState===1) return c; return null; }

function joinRoom(ws, room){
  // quitter un éventuel ancien salon
  if(ws.room && rooms.get(ws.room) && rooms.get(ws.room)!==room) leaveRoom(ws);
  // reconnexion du même client : fermer sa vieille session dans ce salon
  room.clients.forEach(c=>{ if(c!==ws && c.cid===ws.cid) c.terminate(); });
  room.clients.add(ws); ws.room=room.code;

  let mine=null;
  if(room.roles.innocent===ws.cid) mine='innocent';
  else if(room.roles.imposteur===ws.cid) mine='imposteur';

  sendTo(ws, { type:'room', code:room.code, private:room.private, count:activeCount(room) });
  sendTo(ws, rolesMsg(room));
  if(mine) sendTo(ws, { type:'assigned', role:mine });
  if(room.cache.world) sendTo(ws, room.cache.world);
  if(room.cache.inno)  sendTo(ws, room.cache.inno);
  if(room.cache.impo)  sendTo(ws, room.cache.impo);
  broadcast(room, rolesMsg(room));
  console.log(`[${room.code}] ${ws.cid} rejoint (${activeCount(room)}/2)`);
}
function leaveRoom(ws){
  const room = rooms.get(ws.room); ws.room=null;
  if(!room) return;
  room.clients.delete(ws);
  broadcast(room, rolesMsg(room));
  if(activeCount(room)===0){ rooms.delete(room.code); console.log(`[${room.code}] salon fermé`); }
}

wss.on('connection', (ws, req) => {
  ws.id=_nextId++; ws.cid=null; ws.room=null; ws.missed=0;
  ws.on('pong', ()=>{ ws.missed=0; });
  wss.clients.forEach(c=>{ if(c!==ws && c.readyState!==1) c.terminate(); });

  ws.on('message', raw => {
    let m; try { m=JSON.parse(raw); } catch(_) { return; }

    // ── Identité stable ──
    if(m.type==='hello'){ ws.cid = String(m.cid||'').slice(0,64) || ('anon'+ws.id); return; }
    if(!ws.cid) ws.cid = 'anon'+ws.id;

    // ── Lobby : créer / rejoindre / partie rapide / quitter ──
    if(m.type==='create'){ joinRoom(ws, makeRoom(m.private)); return; }
    if(m.type==='join'){
      const code=String(m.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
      const room=rooms.get(code);
      if(!room){ sendTo(ws,{type:'error',reason:'notfound'}); return; }
      if(othersCount(room,ws)>=2){ sendTo(ws,{type:'error',reason:'full'}); return; }
      joinRoom(ws, room); return;
    }
    if(m.type==='quick'){
      let room=null;
      for(const r of rooms.values()){ if(!r.private && activeCount(r)===1){ room=r; break; } }
      joinRoom(ws, room || makeRoom(false)); return;
    }
    if(m.type==='leave'){ leaveRoom(ws); return; }

    // À partir d'ici, il faut être dans un salon
    const room = rooms.get(ws.room);
    if(!room) return;

    // ── Choix de rôle (à 2 joueurs seulement) ──
    if(m.type==='pick'){
      if(activeCount(room)<2){ sendTo(ws, rolesMsg(room)); return; }
      const want=m.role, id=ws.cid;
      if(want!=='innocent'&&want!=='imposteur') return;
      if(room.roles[want]===id) sendTo(ws,{type:'assigned',role:want});
      else if(!room.roles[want]){
        for(const r of ['innocent','imposteur']) if(room.roles[r]===id) room.roles[r]=null;
        room.roles[want]=id; sendTo(ws,{type:'assigned',role:want});
      } else sendTo(ws,{type:'role-taken',role:want});
      broadcast(room, rolesMsg(room)); return;
    }

    // ── Reset (rejouer un match) ──
    if(m.type==='reset'){
      room.roles.innocent=room.roles.imposteur=null; room.cache={inno:null,impo:null,world:null};
      for(const k in room.scores) delete room.scores[k]; room.roundNum=1; room.roundResolved=false;
      broadcast(room, {type:'reset'}); return;
    }

    // ── Fin de manche : score + échange des rôles ──
    if(m.type==='round-end'){
      if(room.roundResolved) return;
      const winRole=m.winner; if(winRole!=='innocent'&&winRole!=='imposteur') return;
      const winCid=room.roles[winRole], innoCid=room.roles.innocent, impoCid=room.roles.imposteur;
      if(!winCid||!innoCid||!impoCid) return;
      room.roundResolved=true; room.scores[winCid]=(room.scores[winCid]||0)+1;
      if(room.scores[winCid]>=WINS_NEEDED){
        for(const cid of [innoCid,impoCid]){ const other=cid===innoCid?impoCid:innoCid;
          sendTo(wsByCid(room,cid), {type:'match-over', you:room.scores[cid]||0, them:room.scores[other]||0, youWon:cid===winCid}); }
        room.roles.innocent=room.roles.imposteur=null; for(const k in room.scores) delete room.scores[k];
        room.roundNum=1; room.cache={inno:null,impo:null,world:null};
      } else {
        setTimeout(()=>{
          if(!rooms.has(room.code)) return;
          room.roles.innocent=impoCid; room.roles.imposteur=innoCid; room.roundNum++;
          room.cache={inno:null,impo:null,world:null};
          for(const cid of [innoCid,impoCid]){ const other=cid===innoCid?impoCid:innoCid;
            const newRole=room.roles.innocent===cid?'innocent':'imposteur';
            sendTo(wsByCid(room,cid), {type:'new-round', role:newRole, round:room.roundNum, you:room.scores[cid]||0, them:room.scores[other]||0}); }
          room.roundResolved=false; broadcast(room, rolesMsg(room));
        }, 3500);
      }
      return;
    }

    // ── Cache + relais des messages de jeu (dans le salon) ──
    if(m.type==='inno')  room.cache.inno=m;
    else if(m.type==='impo')  room.cache.impo=m;
    else if(m.type==='world') room.cache.world=m;
    broadcast(room, m, ws);
  });

  ws.on('error', ()=>{});
  ws.on('close', ()=>{
    const code=ws.room; setTimeout(()=>{
      const room=rooms.get(code); if(!room) return;
      const stillHere=[...room.clients].some(c=>c.cid===ws.cid && c.readyState===1);
      if(!stillHere){
        room.clients.delete(ws);
        for(const r of ['innocent','imposteur']) if(room.roles[r]===ws.cid) room.roles[r]=null;
        broadcast(room, rolesMsg(room));
        if(activeCount(room)===0){ rooms.delete(code); console.log(`[${code}] salon fermé`); }
      }
    }, 4000);
  });
});

// Keepalive tolérant
const heartbeat = setInterval(()=>{
  wss.clients.forEach(ws=>{ if(ws.missed>=3){ ws.terminate(); return; } ws.missed++; try{ ws.ping(); }catch(_){} });
}, 15000);
wss.on('close', ()=>clearInterval(heartbeat));

server.listen(PORT, ()=>console.log(`🐭 Chat & Souris (multi-salons) — http://localhost:${PORT}`));
