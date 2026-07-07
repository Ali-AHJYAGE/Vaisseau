// ============================================================
//  AUDIO — bruitages synthétisés + musique de fond générée.
//  Si assets/music.mp3 existe, elle remplace la musique générée.
//  Bouton 🔊/🔇 pour couper. Démarré au 1er geste (choix de rôle).
// ============================================================
const Sfx = (() => {
  let ac=null, master=null, muted=false, music=null, musicWanted=false;
  let bgTimer=null, beat=0;

  function init(){
    if(ac) return;
    try{
      ac = new (window.AudioContext||window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value=0.35; master.connect(ac.destination);
    }catch(_){}
    const a = new Audio('assets/music.mp3?v=' + (typeof VERSION!=='undefined'?VERSION:'1'));
    a.loop=true; a.volume=0.35;
    a.addEventListener('canplaythrough', ()=>{ music=a; stopBg(); if(musicWanted&&!muted) a.play().catch(()=>{}); }, {once:true});
    a.addEventListener('error', ()=>{});
  }
  function resume(){
    if(ac&&ac.state==='suspended') ac.resume();
    musicWanted=true;
    if(music){ if(!muted) music.play().catch(()=>{}); }
    else if(!muted) startBg();       // pas de mp3 → musique générée
  }

  function tone(freq,dur,type,vol,slideTo,delay){
    if(!ac||muted) return;
    const t0=ac.currentTime+(delay||0);
    const o=ac.createOscillator(), g=ac.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(freq,t0);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1,slideTo),t0+dur);
    g.gain.setValueAtTime(vol||0.25,t0);
    g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0+dur+0.02);
  }
  function noise(dur,vol,delay){
    if(!ac||muted) return;
    const t0=ac.currentTime+(delay||0);
    const n=Math.floor(ac.sampleRate*dur), buf=ac.createBuffer(1,n,ac.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=ac.createBufferSource(); src.buffer=buf;
    const g=ac.createGain(); g.gain.value=vol||0.2;
    const f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1200;
    src.connect(f); f.connect(g); g.connect(master); src.start(t0);
  }
  // Note douce (musique de fond)
  function soft(freq,dur,vol,type){
    if(!ac||muted) return;
    const t0=ac.currentTime, o=ac.createOscillator(), g=ac.createGain();
    o.type=type||'triangle'; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(vol,t0+0.05);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0+dur+0.05);
  }

  // ── Musique de fond générée : mélodie pentatonique cosy en boucle ──
  const MEL=[261.6,0,329.6,392,0,440,392,0, 329.6,0,293.7,329.6,0,392,261.6,0]; // Do maj penta
  const BASS=[65.4,110,87.3,98]; // C2 A2 F2 G2  (I vi IV V)
  function bgStep(){
    if(muted) return;
    const m=MEL[beat%16]; if(m) soft(m,0.55,0.09,'triangle');
    if(beat%4===0) soft(BASS[Math.floor(beat/4)%4],1.0,0.07,'sine');
    if(beat%8===0){ const b=BASS[Math.floor(beat/4)%4]; soft(b*2,1.6,0.035,'sine'); soft(b*3,1.6,0.025,'sine'); } // pad
    beat++;
  }
  function startBg(){ if(bgTimer||!ac) return; bgStep(); bgTimer=setInterval(bgStep,470); }
  function stopBg(){ if(bgTimer){ clearInterval(bgTimer); bgTimer=null; } }

  function setMuted(v){
    muted=v;
    if(v){ if(music) music.pause(); stopBg(); }
    else if(musicWanted){ if(music) music.play().catch(()=>{}); else startBg(); }
  }

  return {
    init, resume, setMuted, isMuted:()=>muted,
    click:   ()=>tone(600,0.05,'square',0.15),
    step:    ()=>tone(110,0.05,'sine',0.06),
    hit:     ()=>{ tone(220,0.12,'square',0.3,80); noise(0.12,0.22); },
    hurt:    ()=>tone(320,0.22,'sawtooth',0.28,110),
    task:    ()=>{ tone(660,0.1,'triangle',0.22); tone(990,0.14,'triangle',0.22,null,0.09); },
    sabotage:()=>{ tone(420,0.25,'square',0.25,210); tone(300,0.4,'sawtooth',0.2,180,0.2); },
    door:    ()=>{ tone(150,0.15,'square',0.3,60); noise(0.1,0.2); },
    vent:    ()=>noise(0.28,0.28),
    teleport:()=>tone(420,0.32,'sine',0.25,1300),
    heal:    ()=>{ tone(520,0.1,'sine',0.2); tone(780,0.15,'sine',0.2,null,0.08); },
    pickup:  ()=>{ tone(700,0.08,'triangle',0.2); tone(1050,0.1,'triangle',0.2,null,0.07); },
    win:     ()=>[523,659,784,1047].forEach((f,i)=>tone(f,0.22,'triangle',0.3,null,i*0.13)),
    lose:    ()=>[440,330,220].forEach((f,i)=>tone(f,0.28,'sawtooth',0.28,null,i*0.15)),
    alarm:   ()=>{ tone(900,0.16,'square',0.3,660); tone(660,0.16,'square',0.3,900,0.17); },
    whoosh:  ()=>{ noise(0.18,0.28); tone(260,0.22,'sine',0.22,760); },
    squeak:  ()=>{ tone(1500,0.09,'square',0.2,2100); tone(1900,0.1,'square',0.18,1300,0.09); }, // couinement souris
    hiss:    ()=>{ noise(0.35,0.32); tone(320,0.3,'sawtooth',0.14,140); },
    sniff:   ()=>{ noise(0.12,0.18); noise(0.12,0.18,0.16); },
    poof:    ()=>{ noise(0.22,0.24); tone(500,0.18,'sine',0.16,900); },
    crackle: ()=>{ noise(0.05,0.10); tone(170,0.05,'sine',0.07,90); },
    meow:    ()=>{ tone(560,0.16,'sawtooth',0.2,720); tone(720,0.26,'sawtooth',0.18,430,0.15); }, // miaou chat
  };
})();
