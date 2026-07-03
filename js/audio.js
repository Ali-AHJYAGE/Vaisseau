// ============================================================
//  AUDIO (v14) — bruitages synthétisés (Web Audio, zéro fichier).
//  Musique : si assets/music.mp3 existe, elle est jouée en boucle.
//  Bouton 🔊/🔇 pour couper. Démarré au 1er geste (choix de rôle).
// ============================================================
const Sfx = (() => {
  let ac=null, master=null, muted=false, music=null, musicWanted=false;

  function init(){
    if(ac) return;
    try{
      ac = new (window.AudioContext||window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value=0.35; master.connect(ac.destination);
    }catch(_){}
    // Musique optionnelle
    const a = new Audio('assets/music.mp3?v=' + (typeof VERSION!=='undefined'?VERSION:'1'));
    a.loop=true; a.volume=0.35;
    a.addEventListener('canplaythrough', ()=>{ music=a; if(musicWanted&&!muted) a.play().catch(()=>{}); }, {once:true});
    a.addEventListener('error', ()=>{});
  }
  function resume(){ if(ac&&ac.state==='suspended') ac.resume(); musicWanted=true; if(music&&!muted) music.play().catch(()=>{}); }

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

  function setMuted(v){
    muted=v;
    if(music){ if(v) music.pause(); else if(musicWanted) music.play().catch(()=>{}); }
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
  };
})();
