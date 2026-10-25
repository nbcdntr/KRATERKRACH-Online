'use strict';
// KRATERKRACH. Original, standalone artillery-game implementation.
// No original Tank Wars or Scorched Earth source code, artwork or audio used.
(() => {
  const W = 1000, H = 520, G = 0.23;
  // An average rendered hull + tracks is roughly 28 world-pixels tall.
  const TANK_HEIGHT = 28;
  const $ = id => document.getElementById(id);
  const canvas = $('battlefield'), ctx = canvas.getContext('2d');
  const C = ['#f5be65','#6ceac1','#70baff','#ed8ac8','#d9a0ff','#fb856f','#cfed70','#67d4da','#f4d89f','#afbbfc'];
  const weapons = [
    {id:'shell', name:'GRANATE', icon:'●', short:'Standardgranate', desc:'Unbegrenzt · zuverlässiger Treffer', cost:0, bundle:0, r:37, dmg:54, color:'#ffd58a'},
    {id:'heavy', name:'MEGABOMBE', icon:'◆', short:'Megabombe', desc:'Größerer Krater und mehr Schaden', cost:350, bundle:2, r:58, dmg:72, color:'#ff9e5e'},
    {id:'napalm', name:'NAPALM', icon:'♨', short:'Napalm', desc:'Brennender Regen auf einer breiten Fläche', cost:500, bundle:2, r:23, dmg:25, color:'#ff784c'},
    {id:'cluster', name:'CLUSTER', icon:'✣', short:'Cluster', desc:'Zerfällt in mehrere kleine Sprengkörper', cost:600, bundle:2, r:22, dmg:26, color:'#a7eaa0'},
    {id:'digger', name:'BOHRER', icon:'⬡', short:'Bohrer', desc:'Riesiger Krater mit geringem Schaden', cost:320, bundle:2, r:93, dmg:18, color:'#83d9ef'},
    {id:'nuke', name:'NUKE', icon:'☢', short:'Nuke', desc:'Große Detonation, teuer und nur ein Schuss.', cost:1600, bundle:1, r:102, dmg:106, color:'#f8f48c'},
    {id:'salvo', name:'RAKETENSALVE', icon:'⇈', short:'Raketenwerfer', desc:'Drei Raketen mit leicht versetzten Flugbahnen', cost:720, bundle:2, r:29, dmg:29, color:'#ffc383'},
    {id:'bunker', name:'PENETRATOR', icon:'⫷', short:'Bunkerbrecher', desc:'Gezielter Einschlag, tiefer Krater und hoher Direktschaden', cost:590, bundle:2, r:41, dmg:88, color:'#eea47a'},
    {id:'emp', name:'EMP-RAKETE', icon:'ϟ', short:'EMP-Rakete', desc:'Entlädt Schutzschilde im Explosionsradius; geringer Schaden', cost:610, bundle:2, r:68, dmg:14, color:'#7ae8ed'}
  ];
  // All upgrades are bought solely with local match-earned credits. No real-money purchases.
  const tanks=[
    {id:'scout',name:'SCOUT MK-I',role:'AUFKLÄRER',price:0,hp:120,attack:1,resist:1,shield:0,color:'#a5c58e',special:'HOHE MOBILITÄT',desc:'90 m Bewegung vor jedem Schuss. Mobil statt schwer gepanzert.',stats:[2,4,1]},
    {id:'titan',name:'TITAN H-7',role:'SCHWERER PANZER',price:2200,hp:128,attack:1,resist:.96,shield:0,color:'#c7a879',special:'VERSTÄRKTE PANZERUNG',desc:'128 Strukturpunkte und 4 % weniger Explosionsschaden. 30 m Bewegungsbudget.',stats:[4,1,4]},
    {id:'artillery',name:'ARTILLERY A-9',role:'FERNARTILLERIE',price:2600,hp:117,attack:1.07,resist:1,shield:0,color:'#a1b5bf',special:'ARTILLERIEOPTIK +10 %',desc:'7 % mehr Schaden, 4 % größerer Wirkradius und 10 Prozentpunkte mehr Sicht (wenn aktiviert).',stats:[1,2,5]},
    {id:'guardian',name:'GUARDIAN S-4',role:'VERTEIDIGUNG',price:2900,hp:110,attack:1,resist:1,shield:24,color:'#91b7aa',special:'REAKTIVSCHILD',desc:'Eingebauter Schutzschild mit 24 Punkten. Gekaufte Schildmodule schützen zusätzlich.',stats:[3,2,3]}
  ];
  const paints=[{id:'olive',name:'OLIVGRÜN',cost:0,color:'#a5c58e'},
    {id:'desert',name:'SANDTARN',cost:450,color:'#d4b783'},
    {id:'slate',name:'STAHLGRAU',cost:550,color:'#8faab9'},
    {id:'ember',name:'ROSTROT',cost:650,color:'#c99279'}];
  const leagues=[{name:'BRONZE',min:0,sign:'III'},{name:'SILBER',min:350,sign:'II'},
    {name:'GOLD',min:850,sign:'I'},{name:'PLATIN',min:1500,sign:'IV'},
    {name:'DIAMANT',min:2500,sign:'V'},{name:'LEGENDE',min:3800,sign:'★'}];
  const UPGRADE_COSTS=[400,900,1900,4200,9200];
  const UPGRADE_MAX=UPGRADE_COSTS.length;
  const UPGRADES=[
    {id:'mobility',title:'ANTRIEB',desc:'+3 m Fahrweg pro Stufe; Scout +5 m',icon:'◀▶'},
    {id:'damage',title:'FEUERLEISTUNG',desc:'+1,2 % Waffenschaden pro Stufe; maximal +6 %',icon:'↗'},
    {id:'armor',title:'PANZERUNG',desc:'+3 Strukturpunkte je Stufe, weniger Direktschaden',icon:'▣'},
    {id:'vision',title:'ZIELSENSOR',desc:'+2 Prozentpunkte Sicht je Stufe; Raumlimit bleibt maßgeblich',icon:'⌖'},
    {id:'shield',title:'ZUSATZSCHILD',desc:'Externe Schutzschicht: 10 bis 26 Punkte; Guardian behält nativen Schild',icon:'◇'}
  ];
  const UPGRADE_IDS=UPGRADES.map(x=>x.id);
  const roomRules={noNuke:'OHNE NUKE',standard:'ALLE WAFFEN',classic:'KLASSIKWAFFEN'};
  const roomWind={calm:'SCHWACH',normal:'NORMAL',strong:'STARK'};
  const blankTree=()=>Object.fromEntries(UPGRADE_IDS.map(id=>[id,0]));
  // Profiles created in 0.3–0.5 remain valid. Old per-tank upgrades are converted.
  function normalizeTree(raw,legacyClass){
    const tree=blankTree();
    if(typeof raw==='number'){const old={scout:'mobility',titan:'armor',artillery:'vision',guardian:'shield'}[legacyClass];tree[old]=Math.max(0,Math.min(UPGRADE_MAX,Math.floor(raw||0)));}
    else if(raw&&typeof raw==='object'){for(const id of UPGRADE_IDS)tree[id]=Math.max(0,Math.min(UPGRADE_MAX,Math.floor(Number(raw[id])||0)));}
    return tree;
  }
  const STORAGE='kraterkrach_profile_v03'; // Preserve existing 0.3 player progress.
  function safeName(s){return String(s||'Kommandant').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,18)||'Kommandant';}
  function loadProfile(){
    const empty={version:3,name:'Kommandant',credits:3000,equipped:'scout',paint:'olive',owned:['scout'],paints:['olive'],matches:0,wins:0,losses:0,roundWins:0,kills:0,damage:0,trophies:0,upgrades:{scout:blankTree(),titan:blankTree(),artillery:blankTree(),guardian:blankTree()}};
    try{const old=JSON.parse(localStorage.getItem(STORAGE)||'null');if(!old||old.version!==3)return empty;
      const p={...empty,...old};p.name=safeName(p.name);p.credits=Math.max(0,Math.min(99999999,Math.floor(Number(p.credits)||0)));
      p.trophies=Math.max(0,Math.min(999999,Math.floor(Number(p.trophies)||0)));
      p.owned=[...new Set((Array.isArray(p.owned)?p.owned:[]).filter(id=>tanks.some(t=>t.id===id)).concat('scout'))];
      p.paints=[...new Set((Array.isArray(p.paints)?p.paints:[]).filter(id=>paints.some(t=>t.id===id)).concat('olive'))];
      if(!p.owned.includes(p.equipped))p.equipped='scout';if(!p.paints.includes(p.paint))p.paint='olive';
      const prev=p.upgrades&&typeof p.upgrades==='object'?p.upgrades:{};
      p.upgrades=Object.fromEntries(tanks.map(t=>[t.id,p.owned.includes(t.id)?normalizeTree(prev[t.id],t.id):blankTree()]));
      return p;
    }catch(_){return empty;}
  }
  const profile=loadProfile();
  const tankById=id=>tanks.find(t=>t.id===id)||tanks[0];
  const tankTree=id=>profile.upgrades[id]||blankTree();
  const tankLevel=id=>Object.values(tankTree(id)).reduce((a,b)=>a+b,0);
  function tankStats(id,tree={}){
    const t=tankById(id),u=normalizeTree(tree,id),scout=id==='scout';
    const move=(scout?90:30)+u.mobility*(scout?5:3);
    const hp=t.hp+u.armor*3;
    const attack=t.attack*(1+u.damage*.012);
    const resist=t.resist*(1-u.armor*.006);
    const nativeShield=t.shield;
    const extraShield=u.shield?10+(u.shield-1)*4:0;
    const previewBonus=(id==='artillery'?10:0)+u.vision*2;
    return {hp,attack,resist,move,nativeShield,extraShield,shield:nativeShield+extraShield,previewBonus,levels:u};
  }
  function profileStats(id){return tankStats(id,tankTree(id));}
  // Tournament rules normalize all progression. Informal matches still use earned upgrades.
  function matchTree(id,playerId){
    if(screen.upgradeMode==='equal')return blankTree();
    if(playerId===0)return tankTree(id);
    // All other local seats AND bots mirror the host's tech levels for a fair casual room.
    const source=tankTree(profile.equipped),ans=blankTree();
    for(const k of UPGRADE_IDS)ans[k]=source[k];
    return ans;
  }
  function addCredits(n){profile.credits=Math.max(0,profile.credits+n);}
  const leagueIndex=()=>Math.max(0,leagues.findLastIndex(l=>profile.trophies>=l.min));
  function saveProfile(){try{localStorage.setItem(STORAGE,JSON.stringify(profile));}catch(e){console.warn('Speichern nicht möglich',e);}updateMeta();}
  function updateMeta(){if($('accountCredits'))$('accountCredits').textContent=money(profile.credits);
    if($('accountRank'))$('accountRank').textContent=leagues[leagueIndex()].name;
    if($('accountName'))$('accountName').textContent=profile.name;}
  function tankSVG(id,paint,extra=''){
    const c=paint||tankById(id).color,short=id==='scout',heavy=id==='titan',guard=id==='guardian',gun=id==='artillery';
    const width=short?128:heavy?188:gun?174:166,body=short?130:heavy?185:gun?163:167;
    return `<svg class="tank-svg ${extra}" viewBox="0 0 240 125" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="hull-${id}" x2="0" y2="1"><stop stop-color="${c}"/><stop offset="1" stop-color="#3d524b"/></linearGradient></defs>
      <ellipse cx="119" cy="107" rx="102" ry="9" fill="#050d14" opacity=".55"/>
      <rect x="${120-width/2}" y="73" rx="19" width="${width}" height="35" fill="#212e31" stroke="#62766e" stroke-width="3"/>
      ${Array.from({length:heavy?7:5},(_,i)=>`<circle cx="${120-width/2+23+i*(width-46)/(heavy?6:4)}" cy="90" r="10" fill="#394a4b" stroke="#7f9187" stroke-width="2"/><circle cx="${120-width/2+23+i*(width-46)/(heavy?6:4)}" cy="90" r="3" fill="#141e23"/>`).join('')}
      <path d="M ${120-body/2} 78 L ${129-body/2} 51 L ${121+body/2} 51 L ${120+body/2} 79Z" fill="url(#hull-${id})" stroke="#132b2a" stroke-width="3"/>
      <path d="M${heavy?75:91} 52 L${heavy?88:102} 35 L${heavy?167:155} 35 L${heavy?174:164} 52Z" fill="${c}" stroke="#2c3d3b" stroke-width="3"/>
      <rect x="${gun?131:139}" y="40" width="${gun?95:heavy?80:60}" height="${gun?9:7}" rx="3" fill="#a4b7a4" stroke="#283a39" stroke-width="3"/>
      <path d="M75 69H172" stroke="#dbe0be" stroke-width="2" opacity=".30"/>
      ${guard?'<path d="M110 22L120 12L130 22L130 37L110 37Z" fill="#81d5d2" opacity=".85"/>':''}
      ${gun?'<rect x="103" y="24" width="30" height="12" rx="2" fill="#687b7c"/>':''}
      ${short?'<path d="M80 36l-7-20m7 20l16-4" stroke="#d2e0ca" stroke-width="3"/>':''}
      <path d="M102 56h41M101 62h48" stroke="#111e1d" stroke-width="3" opacity=".35"/>
    </svg>`;
  }
  const screen = { mode:'menu', humans:1, bots:2, maxRounds:5, previewPct:30, upgradeMode:'equal', weaponsRule:'standard', windMode:'normal', fallDamage:true, seatClasses:['titan','artillery','guardian','scout','titan'], round:0, players:[], terrain:[], wind:0, turn:0, current:null, shots:[], particles:[], rings:[], busy:false, settleTimer:-1, flash:0, toastTimer:0, fallPopups:[], shopIndex:0, sound:true, audio:null, audioBus:null, lastFx:0, lastFragmentFx:0, last:0, starfield:[], phase:0, aiTimer:0, aiDifficulty:'easy', hqTab:'hangar', matchReward:null };
  for(let i=0;i<85;i++) screen.starfield.push({x:(i*487.3+81)%W,y:(i*137.71+39)%280,z:0.4+(i%4)*0.18});

  // KRATERKRACH 0.9: Hosted internet rooms, 2-7 phones, >=2 rounds.
  const net={ws:null,role:null,room:'',server:'',seat:0,players:[],connected:false,remoteCommand:false,localSeat:0,lastBroadcast:0,lastStatus:'',lastTerrainSerial:-1,aimPacketAt:0,lastUiSignature:'',lastRosterSignature:'',limit:6,bots:0,rounds:3,started:false,
    retryTimer:null,retryCount:0,restoring:false,turnTime:0};
  const DEVICE_KEY='kk_global_device_token';
  let terrainSerial=0;
  const bumpTerrain=()=>{terrainSerial++;};
  const SESSION_KEY='kk_active_room_v12';
  function getDeviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!/^[0-9a-f]{32}$/.test(id||'')){const b=new Uint8Array(16);crypto.getRandomValues(b);id=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem(DEVICE_KEY,id);}return id;}
  const rosterHumans=()=>net.players.filter(p=>!p.bot);
  const onlineAlliances=()=>net.players.some(p=>p.ally>=0);
  const activeTeams=()=>new Set(alive().map(p=>p.team||('S'+p.id)));
  const winningPlayers=()=>{const a=alive();return activeTeams().size===1?a:[];};
  const netActive=()=>net.role==='host'||net.role==='guest';
  const localTurn=()=>!netActive()||(net.connected&&screen.turn===net.seat);
  function netSend(data){if(net.ws?.readyState===1)net.ws.send(JSON.stringify(data));}
  function saveOnlineSession(){
    if(!net.room||!net.role)return;
    try{localStorage.setItem(SESSION_KEY,JSON.stringify({server:net.server,code:net.room,role:net.role,limit:net.limit,bots:net.bots,rounds:net.rounds}));}catch(_){}
  }
  function netClose(){
    clearTimeout(net.retryTimer);net.retryTimer=null;
    if(net.ws?.readyState===1)try{net.ws.send(JSON.stringify({type:'leave'}));}catch(_){}
    net.role=null;net.connected=false;net.room='';net.players=[];net.started=false;net.restoring=false;
    try{localStorage.removeItem(SESSION_KEY);}catch(_){}
    if(net.ws){const ws=net.ws;net.ws=null;try{ws.close();}catch(_){}}
    $('networkLabel').textContent='LOKALES SPIEL';
  }
  function websocketURL(mode){
    const u=new URL(net.server);
    const prefix=(u.protocol==='https:'?'wss://':'ws://')+u.host+'/ws?mode='+mode;
    const info=mode==='host'?'&maxPlayers='+net.limit+'&maxRounds='+net.rounds+'&bots='+net.bots:'&code='+encodeURIComponent(net.room);
    return prefix+info+'&id='+getDeviceId();
  }
  function scheduleReconnect(){
    if(!netActive()||!net.room||net.retryTimer)return;
    const delay=Math.min(30000,1200*Math.pow(1.65,Math.min(8,net.retryCount++)));
    $('networkLabel').textContent='VERBINDUNG WIRD WIEDERHERGESTELLT · '+net.room;
    net.retryTimer=setTimeout(()=>{net.retryTimer=null;resumeOnline();},delay);
  }
  function resumeOnline(){
    if(!netActive()||!net.room||!net.server)return;
    if(net.ws?.readyState===0||net.ws?.readyState===1)return;
    net.restoring=true;
    try{installWebsocket(new WebSocket(websocketURL('resume')));}
    catch(_){scheduleReconnect();}
  }
  function installWebsocket(ws){
    net.ws=ws;
    ws.onopen=()=>{net.retryCount=0;netSend({type:'profile',tank:profile.equipped});};
    ws.onmessage=e=>{try{lanMessage(JSON.parse(e.data));}catch(err){console.error('ONLINE receive',err);}};
    ws.onerror=()=>{};
    ws.onclose=()=>{
      if(net.ws!==ws||!netActive())return;
      net.connected=false;
      net.ws=null;
      if(!net.room){netClose();lanLobby('Server nicht erreichbar. Adresse prüfen und erneut versuchen.');return;}
      toast('VERBINDUNG UNTERBROCHEN · VERBINDE NEU',3);
      scheduleReconnect();
    };
  }

  function lanLobby(message=''){
    const server=net.server||localStorage.getItem('kk_online_server')||((location.host&&location.protocol.startsWith('http'))?location.origin:'https://YOUR-SERVER.onrender.com');
    const isHost=net.role==='host',active=netActive(),players=net.players;
    const status=active?(net.started?'MATCH LÄUFT':`${players.length} / ${net.limit} PANZER IM RAUM (${rosterHumans().length} MENSCHEN + ${net.bots} CPU)`):'Noch nicht verbunden';
    showModal(`<div class="hq-root"><div class="hq-head"><div><span class="hq-overline">PRIVATES INTERNET-SPIEL</span><h1 class="hq-title">KRATER<span>KRACH</span> <small>ONLINE</small></h1></div></div><div class="hq-body" style="max-width:650px;margin:auto">
    <p class="modal-copy">2 bis 6 Panzer einschließlich CPUs · mindestens 2 Runden · Vorschau: 30 % + Windkorridor. Bei Verbindungsabbruch bleibt dein Platz fünf Minuten reserviert.</p>
    <label class="hq-overline" for="lanHost">Adresse des Internet-Servers (HTTPS)</label>
    <input id="lanHost" value="${escapeHTML(server)}" placeholder="https://kraterkrach-online.onrender.com" style="width:100%;padding:12px;background:#15263b;color:#eaf4ff;border:1px solid #526377;border-radius:8px;margin:8px 0 12px" ${active?'disabled':''}/>
    <p class="modal-copy"><b>RAUMCODE: ${net.room?escapeHTML(net.room):'—'}</b> &nbsp; · &nbsp; ${escapeHTML(status)}</p>
    ${message?'<p class="modal-copy" style="color:#ffda77">'+escapeHTML(message)+'</p>':''}
    <div class="leaderboard">${players.map(p=>`<div class="result-line"><strong>${p.seat+1}. ${escapeHTML(p.name)} ${p.seat===net.seat?'(DU)':''} ${p.ally>=0?'🤝 '+escapeHTML((players.find(q=>q.seat===p.ally)||{}).name||''):''}</strong><span>${escapeHTML(tankById(p.tank).name)} ${p.bot?'CPU':''}</span></div>`).join('')}</div>
    ${!active?`<div style="display:flex;gap:12px;flex-wrap:wrap"><label class="hq-overline">MAX. SPIELER <select id="roomPlayers" style="background:#15263b;color:white;padding:10px">${[2,3,4,5,6].map(n=>`<option ${n===net.limit?'selected':''}>${n}</option>`).join('')}</select></label>
    <label class="hq-overline">CPU-GEGNER <select id="roomBots" style="background:#15263b;color:white;padding:10px">${[0,1,2,3,4,5].map(n=>`<option ${n===net.bots?'selected':''}>${n}</option>`).join('')}</select></label>
    <label class="hq-overline">RUNDEN <select id="roomRounds" style="background:#15263b;color:white;padding:10px">${[2,3,4,5,6,7,8,9,10].map(n=>`<option ${n===net.rounds?'selected':''}>${n}</option>`).join('')}</select></label></div>`:`<p class="modal-copy">Raumlimit ${net.limit} · Matchdauer ${net.rounds} Runden · gleicher Ausbau für alle.</p>`}
    ${active&&!net.started?`<p class="modal-copy"><b>ALLIANZ</b> · Wähle einen menschlichen Partner. Die Allianz entsteht nur, wenn sich beide gegenseitig auswählen. Wer solo gegen Duos kämpft, erhält automatisch einen kleinen Ausgleich.</p><select id="allyTarget" style="width:100%;background:#15263b;color:white;padding:12px"><option value="-1">Ohne Allianz spielen</option>${rosterHumans().filter(p=>p.seat!==net.seat).map(p=>`<option value="${p.seat}" ${rosterHumans().find(q=>q.seat===net.seat)?.request===p.seat?'selected':''}>${escapeHTML(p.name)}</option>`).join('')}</select>`:''}
    ${!active?'<div class="modal-actions"><button id="lanCreate" class="primary-button">RAUM ERSTELLEN</button><button id="lanJoin" class="secondary-button">RAUM BEITRETEN</button></div>':''}
    ${!active?`<label class="hq-overline" for="lanCode">Raumcode zum Beitreten</label><input id="lanCode" maxlength="6" autocapitalize="characters" value="${escapeHTML(net.room)}" style="width:100%;padding:13px;background:#15263b;color:#fff;border:1px solid #526377;border-radius:8px;margin:9px 0" placeholder="ABC123"/>`:''}
    ${isHost&&!net.started?`<div class="modal-actions"><button id="lanStart" class="primary-button" ${players.length<2?'disabled':''}>MATCH STARTEN (${net.rounds} RUNDEN)</button></div>`:''}
    ${active?'<div class="modal-actions"><button id="lanResume" class="secondary-button">ZURÜCK ZUM SPIEL</button><button id="lanExit" class="secondary-button">RAUM VERLASSEN</button></div>':''}
    ${active&&!net.connected?'<p class="modal-copy">Verbindung unterbrochen. Dein Platz wird automatisch wieder verbunden.</p><div class="modal-actions"><button id="lanRetry" class="primary-button">JETZT ERNEUT VERBINDEN</button></div>':''}
    ${!active?'<div class="modal-actions"><button id="lanBack" class="secondary-button">ZURÜCK ZUM HANGAR</button></div>':''}
    <p class="modal-copy" style="font-size:12px">Beta: Die Raumverbindung ist verschlüsselt (WSS). Der Gastgeber simuliert die Physik. Matchbelohnungen werden aktuell nur auf dem Gastgebergerät gespeichert.</p>
    </div></div>`);
    if($('allyTarget'))$('allyTarget').onchange=e=>netSend({type:'ally_request',target:Number(e.target.value)});
    if($('lanCreate'))$('lanCreate').onclick=()=>lanConnect('host');
    if($('lanBack'))$('lanBack').onclick=()=>showMenu();
    if($('lanJoin'))$('lanJoin').onclick=()=>lanConnect('guest');
    if($('lanResume'))$('lanResume').onclick=()=>{if(screen.mode==='playing')$('modal').classList.add('hidden');else lanLobby();};
    if($('lanExit'))$('lanExit').onclick=()=>{if(confirm('Möchtest du den Online-Raum wirklich verlassen?')){netClose();showMenu();}};
    if($('lanRetry'))$('lanRetry').onclick=()=>{clearTimeout(net.retryTimer);net.retryTimer=null;resumeOnline();};
    if($('lanStart'))$('lanStart').onclick=lanStart;
  }
  function lanConnect(role){
    const raw=$('lanHost').value.trim().replace(/\/$/,'');
    const code=$('lanCode')?.value.trim().toUpperCase()||'';
    if(role==='guest'&&!/^[A-Z2-9]{6}$/.test(code)){lanLobby('Bitte sechsstelligen Raumcode eingeben.');return;}
    let u;try{u=new URL(raw.startsWith('http')?raw:'https://'+raw);}catch(_){lanLobby('Bitte gültige HTTPS-Serveradresse eingeben.');return;}
    if(!['https:','http:'].includes(u.protocol)){lanLobby('HTTPS-Adresse erforderlich.');return;}
    if(u.protocol==='http:'&&!['localhost','127.0.0.1'].includes(u.hostname)){lanLobby('Für Internetverbindungen bitte HTTPS verwenden.');return;}
    net.limit=Number($('roomPlayers')?.value||net.limit);net.rounds=Number($('roomRounds')?.value||net.rounds);net.bots=Math.min(net.limit-1,Number($('roomBots')?.value??net.bots));
    netClose();net.server=u.origin;net.role=role;localStorage.setItem('kk_online_server',net.server);
    net.room=role==='guest'?code:'';
    try{installWebsocket(new WebSocket(websocketURL(role)));}catch(e){netClose();lanLobby('Verbindung fehlgeschlagen: '+String(e));return;}
  }
  function lanMessage(m){
    if(m.type==='welcome'){
      net.room=m.code;net.seat=m.seat;net.limit=m.maxPlayers;net.rounds=m.maxRounds;net.bots=m.bots||0;
      net.connected=true;net.retryCount=0;net.restoring=!!m.resumed;saveOnlineSession();
      if(m.name){profile.name=safeName(m.name);saveProfile();}
      $('networkLabel').textContent='ONLINE '+net.room+' · SPIELER '+(net.seat+1);
      netSend({type:'profile',tank:profile.equipped});
      if(screen.mode!=='playing')lanLobby();
    }else if(m.type==='roster'){
      net.players=m.players||[];net.bots=m.bots||0;net.connected=net.ws?.readyState===1;net.started=!!m.started;
      if(!net.started&&screen.mode==='between')screen.mode='menu';
      // Disconnected players keep their HP, seat, ammo, team and score.
      // Temporary mobile disconnections must not count as kills.
      if(['menu','between'].includes(screen.mode)&&!(screen.mode==='between'&&net.started))lanLobby();
      if(net.role==='host'&&net.started&&!net.restoring&&screen.mode!=='playing'&&screen.mode!=='between')startOnlineMatch();
    }else if((m.type==='state'&&net.role==='guest')||(m.type==='resume_state'&&net.role==='host')){
      const d=m.game;if(!d||!Array.isArray(d.players)||(!Array.isArray(d.terrain)&&!screen.terrain.length))return;
      const before=screen.mode;
      for(const key of ['mode','round','maxRounds','turn','busy','wind','humans','bots','previewPct','upgradeMode','weaponsRule','windMode','fallDamage','aiDifficulty','settleTimer'])screen[key]=d[key];
      if(Array.isArray(d.terrain)){screen.terrain=d.terrain;terrainSerial++;}screen.players=d.players;screen.players.forEach(p=>{if(p.ammo?.shell===null)p.ammo.shell=Infinity;});screen.shots=d.shots||[];screen.particles=d.particles||[];screen.rings=d.rings||[];screen.fallPopups=d.fallPopups||[];screen.current=actual();
      if(screen.mode==='playing')$('modal').classList.add('hidden');
      if(m.type==='resume_state'){net.restoring=false;toast('GEFECHT WIEDERHERGESTELLT',2);if(screen.mode==='between')renderRoundResult();}
      if(screen.mode==='between'&&(before!=='between'||net.lastStatus!==m.endText)){
        net.lastStatus=m.endText;
        showModal(`<div class="modal-kicker">RUNDE ${screen.round}/${screen.maxRounds}</div><h1 class="modal-title">${escapeHTML(m.endText||'Runde beendet')}</h1><p class="modal-copy">${screen.round===screen.maxRounds?'Match abgeschlossen.':'Warte auf den Gastgeber für die nächste Runde.'}</p><div class="leaderboard">${[...screen.players].sort((a,b)=>b.wins-a.wins||b.kills-a.kills||b.dmg-a.dmg).map(p=>`<div class="result-line"><strong>${escapeHTML(p.name)}</strong><span>${p.wins} Siege</span></div>`).join('')}</div></div>`);
      }
      updateControls();renderRoster();
    }else if(m.type==='aim_live'&&net.role==='guest'){
      if(m.seat!==screen.turn||screen.mode!=='playing'||screen.busy)return;
      const p=actual();if(!p||!p.human)return;
      if(Number.isFinite(m.angle))p.angle=clamp(Math.round(m.angle),5,175);
      if(Number.isFinite(m.power))p.power=clamp(Math.round(m.power),20,100);
      if(weapons.some(w=>w.id===m.weapon))p.selected=m.weapon;
      updateControls();
    }else if(m.type==='action'&&net.role==='host'){
      if(screen.mode!=='playing'||screen.busy||screen.turn!==m.seat||!net.players.some(p=>p.seat===m.seat))return;
      net.remoteCommand=true;const a=m.action||{};
      if(a.kind==='aim'&&['angle','power'].includes(a.key)&&Number.isFinite(a.value))setControl(a.key,a.value);
      if(a.kind==='move'&&[-1,1].includes(a.dir))moveTank(a.dir);
      if(a.kind==='weapon'&&weapons.some(w=>w.id===a.id))selectWeapon(a.id);
      if(a.kind==='fire')fire();
      net.remoteCommand=false;
      if(['aim','weapon'].includes(a.kind))sendLiveAim();
      else netBroadcast();
    }else if(m.type==='error'){
      const message=m.message||'Unbekannter Internetfehler.';
      if(/expired|closed|not found/i.test(message)){netClose();lanLobby(message);}
      else lanLobby(message);
    }
  }
  function netBroadcast(){
    if(net.role!=='host'||!net.connected||net.restoring||!['playing','between'].includes(screen.mode))return;
    const game={};for(const key of ['mode','round','maxRounds','turn','busy','wind','humans','bots','previewPct','upgradeMode','weaponsRule','windMode','fallDamage','aiDifficulty','settleTimer','players','shots','rings','fallPopups'])game[key]=screen[key];
    // The terrain is expensive and only changes between rounds and on impact.
    // In-flight snapshots send only the dynamic state; the server merges the
    // newest terrain into its complete reconnect snapshot.
    if(net.lastTerrainSerial!==terrainSerial){
      game.terrain=screen.terrain.map(y=>Math.round(y));
      net.lastTerrainSerial=terrainSerial;
    }
    // Particle simulations are local decoration, not authoritative gameplay.
    // Transmit a small sample instead of up to 350 animated particles.
    game.particles=screen.particles.slice(-28);
    const wins=winningPlayers(); const endText=screen.mode==='between'?(wins.length?wins.map(p=>p.name).join(' + ')+' gewinnt!':'Unentschieden!'):'';
    netSend({type:'state',game,endText});
  }
  function sendLiveAim(){
    if(net.role!=='host'||!net.connected||screen.mode!=='playing'||screen.busy)return;
    const p=actual();if(!p||!p.human)return;
    netSend({type:'aim_live',seat:screen.turn,angle:p.angle,power:p.power,weapon:p.selected});
  }
  function lanStart(){
    if(net.role!=='host'||net.players.length<2){lanLobby('Mindestens zwei Spieler müssen verbunden sein.');return;}
    netSend({type:'start'});
  }
  function startOnlineMatch(){
    if(net.role!=='host')return;
    const peers=rosterHumans().sort((a,b)=>a.seat-b.seat);
    screen.humans=peers.length;screen.bots=net.bots;screen.maxRounds=Math.max(2,net.rounds);screen.upgradeMode='equal';screen.previewPct=30;
    peers.forEach((p,i)=>{if(i)screen.seatClasses[i-1]=p.tank;});
    startGame();
    screen.players.forEach((p,i)=>{const peer=net.players.find(q=>q.seat===i);if(peer){p.name=safeName(peer.name);p.team=peer.ally>=0?'P'+Math.min(i,peer.ally):'S'+i;}else p.team='S'+i;});
    if(onlineAlliances()){
      for(const p of screen.players){if(!p.team.startsWith('S'))continue;
        // A solo fighter gets tactical compensation without excessive double damage.
        p.soloBuff=true;p.maxHp=Math.round(p.maxHp*1.45);p.hp=p.maxHp;p.attack*=1.15;
        p.maxExtraShield+=12;p.extraShield+=12;p.maxShield+=12;p.shield+=12;
        for(const id of ['heavy','cluster','emp'])p.ammo[id]+=1;
      }
    }
    $('networkLabel').textContent='ONLINE '+net.room;netBroadcast();
  }
  function selectWeapon(id){
    if(net.role==='guest'&&!net.remoteCommand){netSend({type:'action',action:{kind:'weapon',id}});return;}
    if(net.role==='host'&&!localTurn()&&!net.remoteCommand)return;
    const p=actual();if(!p||!weapons.some(w=>w.id===id)||!weaponAllowed(id)||!p.ammo[id])return;
    p.selected=id;sound(450,.06);updateControls();
    if(net.role==='host'&&!net.remoteCommand)sendLiveAim();
  }

  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const money=n=>Math.round(n).toLocaleString('de-DE')+' ₡';
  const alive=()=>screen.players.filter(p=>p.hp>0);
  const actual=()=>screen.players[screen.turn];
  let lastToast='';

  function toast(msg, secs=1.65){lastToast=msg;$('toast').textContent=msg;$('toast').classList.add('shown');screen.toastTimer=secs*60}
  function audioContext(){
    if(!screen.sound)return null;
    const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
    const a=screen.audio||(screen.audio=new A());if(a.state==='suspended')a.resume().catch(()=>{});
    return a;
  }
  function sound(f=180,t=.13,type='triangle',amp=.055){
    try{const a=audioContext();if(!a)return;const o=a.createOscillator(),g=a.createGain(),now=a.currentTime;
      o.type=type;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(45,f*.43),now+t);
      g.gain.setValueAtTime(Math.min(.075,amp*.55),now);g.gain.exponentialRampToValueAtTime(.0001,now+t);
      o.connect(g).connect(a.destination);o.start(now);o.stop(now+t+.01);
    }catch(_){}
  }
  // Short synthesized sound effects; no audio files, no network needed.
  function fx(kind,power=1){
    try{const a=audioContext();if(!a)return;
      const now=a.currentTime;
      // Avoid loud clusters: fragments cannot trigger overlapping full explosions.
      if(kind==='blast'&&now-screen.lastFx<.065)return;
      if(kind==='blast')screen.lastFx=now;
      const cfg={shot:[.19,650,110,.040,1050],blast:[.28,220,48,.061,480],hit:[.11,700,170,.024,1550],shield:[.19,920,440,.023,2100]}[kind];
      if(!cfg)return;
      const [length,start,end,gain,filterFreq]=cfg;
      const osc=a.createOscillator(),volume=a.createGain();osc.type=kind==='shield'?'sine':kind==='blast'?'triangle':'sawtooth';
      osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(end,now+length);
      volume.gain.setValueAtTime(Math.min(.08,gain*power),now);
      volume.gain.exponentialRampToValueAtTime(.0001,now+length);
      osc.connect(volume).connect(a.destination);osc.start(now);osc.stop(now+length+.012);
      if(kind==='shield')return;
      const nSamples=Math.ceil(a.sampleRate*(kind==='blast'?.23:kind==='shot'?.13:.085));
      const noise=a.createBuffer(1,nSamples,a.sampleRate),data=noise.getChannelData(0);
      for(let i=0;i<nSamples;i++)data[i]=(Math.random()*2-1)*(1-i/nSamples);
      const source=a.createBufferSource();source.buffer=noise;
      const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=filterFreq;
      const noiseGain=a.createGain();noiseGain.gain.setValueAtTime(Math.min(.09,gain*1.05*power),now);
      noiseGain.gain.exponentialRampToValueAtTime(.0001,now+nSamples/a.sampleRate);
      source.connect(filter).connect(noiseGain).connect(a.destination);source.start(now);source.stop(now+nSamples/a.sampleRate+.005);
    }catch(_){}
  }
  // Fall damage uses a physical in-game reference, not the phone display size.
  // 1 tank-height is harmless; 2/3/4/5/6 heights ~= 2/4/6/8/11 HP.
  // Extreme falls are capped at 12 HP, and armor provides a modest reduction.
  function fallingDamage(fallPixels,resist=1){
    const excess=Math.max(0,fallPixels/TANK_HEIGHT-1);
    if(excess===0)return 0;
    const base=1.6*excess+0.10*excess*excess;
    return clamp(Math.round(base*clamp(resist,.85,1.05)),0,12);
  }

  // Synthesised audio only: unique weapon signatures and no third-party sound files.
  // Master bus compresses multiple simultaneous fragments to avoid sudden loud bursts.
  function weaponAudioBus(a){
    if(screen.audioBus)return screen.audioBus;
    const comp=a.createDynamicsCompressor();
    comp.threshold.value=-24;comp.knee.value=16;comp.ratio.value=7;
    comp.attack.value=.003;comp.release.value=.19;
    const master=a.createGain();master.gain.value=.55;
    comp.connect(master).connect(a.destination);
    screen.audioBus=comp;
    return comp;
  }
  function weaponFx(phase,weaponId){
    try{
      const a=audioContext();if(!a)return;
      const bus=weaponAudioBus(a),now=a.currentTime;
      if(phase==='fragment'){
        if(now-screen.lastFragmentFx<.125)return;
        screen.lastFragmentFx=now;
      }
      const tone=(f0,f1,duration,volume,wave='triangle',delay=0)=>{
        const start=now+delay,d=Math.max(.015,duration),o=a.createOscillator(),g=a.createGain();
        o.type=wave;o.frequency.setValueAtTime(Math.max(25,f0),start);
        o.frequency.exponentialRampToValueAtTime(Math.max(25,f1),start+d);
        g.gain.setValueAtTime(.0001,start);
        g.gain.linearRampToValueAtTime(Math.min(.075,volume),start+Math.min(.012,d*.14));
        g.gain.exponentialRampToValueAtTime(.0001,start+d);
        o.connect(g).connect(bus);o.start(start);o.stop(start+d+.012);
      };
      const noise=(duration,volume,filterHz=1000,filterType='lowpass',delay=0)=>{
        const start=now+delay,d=Math.max(.015,duration),size=Math.max(32,Math.floor(a.sampleRate*d));
        // White noise is filtered and enveloped per sound, creating the mechanical texture.
        const buf=a.createBuffer(1,size,a.sampleRate),data=buf.getChannelData(0);
        for(let i=0;i<size;i++)data[i]=Math.random()*2-1;
        const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();
        s.buffer=buf;f.type=filterType;f.frequency.value=filterHz;
        g.gain.setValueAtTime(.0001,start);
        g.gain.linearRampToValueAtTime(Math.min(.065,volume),start+Math.min(.022,d*.15));
        g.gain.exponentialRampToValueAtTime(.0001,start+d);
        s.connect(f).connect(g).connect(bus);s.start(start);s.stop(start+d+.01);
      };
      if(phase==='fragment'){
        if(weaponId==='ember'){noise(.16,.013,2600,'highpass');tone(500,170,.1,.009,'sine');}
        else {noise(.055,.020,3300,'highpass');tone(650,210,.075,.012,'square');}
        return;
      }
      if(phase==='launch'){
        switch(weaponId){
          case 'shell': tone(560,125,.14,.038,'sawtooth');noise(.09,.024,1400,'highpass');break;
          case 'heavy': tone(345,76,.25,.052,'sawtooth');noise(.15,.028,780);break;
          case 'napalm': noise(.33,.035,1250,'bandpass');tone(360,85,.24,.028,'triangle');break;
          case 'cluster': tone(800,150,.18,.035,'square');noise(.12,.026,2300,'highpass');break;
          case 'digger': tone(230,410,.19,.028,'sawtooth');noise(.23,.025,720,'bandpass');break;
          case 'nuke': tone(145,49,.44,.050,'sawtooth');tone(75,38,.48,.028,'sine');noise(.25,.020,510);break;
          case 'salvo': for(let i=0;i<3;i++){tone(930-i*110,250-i*40,.21,.023,'sawtooth',i*.078);noise(.19,.015,2600,'bandpass',i*.078);}break;
          case 'bunker': tone(1260,215,.30,.030,'sine');noise(.17,.030,2400,'highpass');break;
          case 'emp': tone(340,1650,.22,.030,'sine');tone(900,2000,.12,.015,'triangle',.06);noise(.10,.013,3500,'highpass');break;
          default: tone(510,130,.12,.025);break;
        }
      }else if(phase==='impact'){
        switch(weaponId){
          case 'shell': tone(170,55,.22,.044,'triangle');noise(.17,.045,1250);break;
          case 'heavy': tone(140,35,.46,.060,'sawtooth');noise(.36,.054,610);break;
          case 'napalm': tone(215,70,.20,.026);noise(.65,.034,3100,'highpass');break;
          case 'cluster': tone(185,65,.20,.028);for(let i=0;i<4;i++){noise(.07,.028,2400,'highpass',.05+i*.11);tone(630-i*60,150,.09,.012,'square',.05+i*.11);}break;
          case 'digger': tone(155,45,.43,.035,'sawtooth');noise(.48,.036,540,'bandpass');tone(320,80,.20,.025,'square',.11);break;
          case 'nuke': tone(100,29,1.05,.067,'sawtooth');tone(62,30,1.28,.046,'sine');noise(.92,.057,300);noise(.43,.030,700,'bandpass',.32);noise(.38,.022,480,'lowpass',.72);break;
          case 'salvo': tone(270,68,.22,.031,'triangle');noise(.15,.036,1450);tone(410,100,.12,.011,'sine',.045);break;
          case 'bunker': tone(440,63,.27,.042,'square');tone(115,40,.32,.049,'sine');noise(.26,.037,1500,'bandpass');break;
          case 'emp': tone(1550,260,.34,.028,'sine');tone(720,1800,.18,.025,'triangle',.03);noise(.33,.027,2900,'highpass');break;
          default: tone(160,60,.2,.025);noise(.12,.025,1200);break;
        }
      }
    }catch(_){/* Some restricted browsers block WebAudio; the game still works silently. */}
  }

  // Distinct landscapes: wide hills, narrow protective ridges, canyons and spires.
  // A world unit maps to one terrain sample, independently of the screen resolution.
  function makeTerrain(){
    const kind=Math.floor(rand(0,5)),a=[],base=326+rand(-18,20);
    const p1=rand(0,6.28),p2=rand(0,6.28),p3=rand(0,6.28);
    const ridges=Array.from({length:kind===0?1:kind===3?5:3},()=>({
      center:rand(110,W-110),width:rand(kind===3?13:27,kind===3?31:87),height:rand(54,kind===2?195:155),sign:kind===4&&Math.random()<.4?-1:1
    }));
    // A tall mountain in the middle is deliberately common; a player can
    // have to carve a tunnel/trench or fire high over the peak to hit a target.
    if(kind===1||kind===2)ridges.push({center:rand(405,595),width:rand(32,76),height:rand(115,210),sign:1});
    for(let i=0;i<=W;i++){
      let y=base+(kind===0?70:kind===3?29:48)*Math.sin(i/(kind===4?85:158)+p1)
        + (kind===3?23:38)*Math.sin(i/(kind===3?31:77)+p2)
        + (kind===3?8:13)*Math.sin(i/21+p3);
      for(const r of ridges){
        const d=Math.abs(i-r.center)/r.width;
        if(d<2.6){
          const shape=kind===3?Math.max(0,1-d):Math.exp(-.5*d*d);
          y-=r.sign*r.height*shape;
        }
      }
      a.push(clamp(y,105,H-55));
    }
    screen.terrain=a; bumpTerrain();
  }
  function repositionPlayers(){
    // Shuffle spatial slots anew each round, with at least one different slot
    // when more than one player exists. Preserves the player IDs and alliances.
    const n=screen.players.length, slots=Array.from({length:n},(_,i)=>i);
    for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
    if(n>1&&screen.players.every((p,i)=>Math.abs(p.x-(86+(W-172)*slots[i]/(n-1)))<40))slots.push(slots.shift());
    for(let i=0;i<n;i++){
      const p=screen.players[i];
      p.x=clamp(Math.round(86+(W-172)*slots[i]/(n-1)+rand(-17,17)),40,W-40);
      // Gently level the immediate footprint, never flatten the protective
      // peak between players (terrain barriers should remain meaningful).
      const cx=Math.round(p.x),target=screen.terrain[cx];
      for(let dx=-19;dx<=19;dx++){
        const k=cx+dx;if(k<0||k>W)continue;
        const kblend=dx===0?1:Math.max(0,1-Math.abs(dx)/20);
        screen.terrain[k]=screen.terrain[k]*(1-kblend)+target*kblend;
      }
      p.y=screen.terrain[cx]-10;
    }
    for(const p of screen.players){
      const other=screen.players.filter(q=>q.id!==p.id).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
      p.angle=other&&other.x<p.x?124:56;
    }
  }
  function makePlayers(){
    const total=screen.humans+screen.bots;
    screen.players=[];
    for(let i=0;i<total;i++){
      const human=i<screen.humans;
      const x=80+(W-160)*(i/(total-1));
      const cls=i===0?tankById(profile.equipped):(human?tankById(screen.seatClasses[i-1]||'scout'):tanks[(i%4)]);
      const color=i===0?paints.find(a=>a.id===profile.paint).color:cls.color;
      const levels=matchTree(cls.id,i),tier=Object.values(levels).reduce((a,b)=>a+b,0),stats=tankStats(cls.id,levels);
      screen.players.push({id:i, name:i===0?profile.name:(human?'Spieler '+(i+1):'CPU '+(i-screen.humans+1)), human, classId:cls.id,upgradeLevel:tier,maxHp:stats.hp,maxShield:stats.shield,maxNativeShield:stats.nativeShield,maxExtraShield:stats.extraShield,nativeShield:stats.nativeShield,extraShield:stats.extraShield,attack:stats.attack,resist:stats.resist,previewBonus:stats.previewBonus,maxMove:stats.move,shield:stats.shield,moveRemaining:stats.move,color,x,y:0,hp:stats.hp,angle:i%2?125:55,power:65,ammo:{shell:Infinity,heavy:1,napalm:1,cluster:1,digger:1,nuke:0,salvo:1,bunker:1,emp:1},selected:'shell',cash:700,wins:0,kills:0,dmg:0,shotsFired:0});
    }
    if(total===2){screen.players[0].angle=56;screen.players[1].angle=124;}
    for(const p of screen.players)applyWeaponRules(p);
    screen.players.forEach((p,i)=>{p.x+=rand(-10,10);p.y=screen.terrain[Math.round(p.x)]-10;});
  }
  function applyWeaponRules(p){
    if(screen.weaponsRule==='noNuke')p.ammo.nuke=0;
    if(screen.weaponsRule==='classic')for(const key of ['nuke','salvo','bunker','emp'])p.ammo[key]=0;
    if(p.selected!=='shell'&&!weaponAllowed(p.selected))p.selected='shell';
  }
  function weaponAllowed(id){return screen.weaponsRule==='standard'||(screen.weaponsRule==='noNuke'&&id!=='nuke')||(screen.weaponsRule==='classic'&&['shell','heavy','napalm','cluster','digger'].includes(id));}
  function startGame(){
    screen.humans=clamp(screen.humans,1,6);screen.bots=clamp(screen.bots,0,5);if(screen.humans+screen.bots>6)screen.bots=6-screen.humans;
    if(screen.humans+screen.bots<2)screen.bots=1;
    screen.round=0;screen.matchReward=null;makePlayers();$('modal').classList.add('hidden');newRound();sound(550,.12);
    try{localStorage.setItem('kk_settings',JSON.stringify({humans:screen.humans,bots:screen.bots,maxRounds:screen.maxRounds,previewPct:screen.previewPct,aiDifficulty:screen.aiDifficulty,upgradeMode:screen.upgradeMode,weaponsRule:screen.weaponsRule,windMode:screen.windMode,fallDamage:screen.fallDamage,seatClasses:screen.seatClasses}))}catch(_){}
  }
  function newRound(){
    screen.round++;screen.mode='playing';screen.busy=false;screen.aiTimer=0;screen.shots=[];screen.particles=[];screen.rings=[];screen.fallPopups=[];screen.flash=0;screen.settleTimer=-1;
    makeTerrain();repositionPlayers();screen.players.forEach(p=>{p.hp=p.maxHp;p.nativeShield=p.maxNativeShield;p.extraShield=p.maxExtraShield;p.shield=p.nativeShield+p.extraShield;p.moveRemaining=p.maxMove;});
    screen.wind=Math.round(rand(-windCeiling(),windCeiling()));screen.turn=(screen.round-1)%screen.players.length;
    $('modal').classList.add('hidden');nextTurn(screen.turn,true);
    toast('RUNDE '+screen.round+' / '+screen.maxRounds,2.0);
  }
  function windCeiling(){return {calm:5,normal:13,strong:18}[screen.windMode]||13;}
  function nextTurn(start,includeStart=false){
    if(screen.mode!=='playing')return;
    const n=screen.players.length;
    let idx=includeStart?start:(start+1)%n;
    for(let i=0;i<n;i++){if(screen.players[idx].hp>0)break;idx=(idx+1)%n;}
    screen.turn=idx;net.turnTime=performance.now();const p=actual();screen.current=p;screen.busy=false;screen.aiTimer=p.human?0:55;
    p.moveRemaining=p.maxMove; // Refill on this player's turn, never during someone else's.
    screen.wind=clamp(screen.wind+Math.round(rand(-4,4)),-windCeiling(),windCeiling());
    updateControls();renderRoster();
    if(p.human)toast(p.name+' ist am Zug',1.2);else toast(p.name+' zielt …',1.1);
  }
  function endShot(){
    screen.busy=false;screen.settleTimer=-1;
    settleTanks();renderRoster();
    if(activeTeams().size<=1){finishRound();return;}
    nextTurn(screen.turn);
  }
  function settleTanks(){
    for(const p of screen.players){if(p.hp<=0)continue;
      const y=screen.terrain[clamp(Math.round(p.x),0,W)]-10;
      const falling=y-p.y;
      if(screen.fallDamage){
        const d=fallingDamage(falling,p.resist);
        if(d>0){
          p.hp=Math.max(0,p.hp-d);
          p.deathByFall=d;
          screen.fallPopups.push({x:p.x,y:y-46,life:92,maxLife:92,text:'STURZ −'+d+' HP'});
          popParticles(p.x,y,Math.min(14,6+d),'#d9e4f7');
        }
      }
      p.y=y;
    }
  }
  function finishRound(){
    screen.mode='between';screen.busy=false;
    const winners=winningPlayers();
    for(const p of winners){p.wins++;p.cash+=650;}
    screen.players.forEach(p=>p.cash+=280);
    if(screen.round===screen.maxRounds)awardMatch();
    renderRoster();updateControls();
    renderRoundResult();
    sound(winners.length?620:220,.35);
  }
  function awardMatch(){
    if(screen.matchReward)return;
    const p=screen.players[0];
    const sorted=[...screen.players].sort((a,b)=>b.wins-a.wins||b.kills-a.kills||b.dmg-a.dmg);
    const won=sorted[0].id===0 && (sorted.length===1||p.wins>0);
    const gain=120+Math.min(400,p.wins*100)+Math.min(160,p.kills*40)+(won?320:0);
    const trophyDelta=won?90:Math.max(-50,-30+(p.wins*10));
    const before=leagues[leagueIndex()].name;
    profile.credits+=gain;profile.matches++;if(won)profile.wins++;else profile.losses++;
    profile.roundWins+=p.wins;profile.kills+=p.kills;profile.damage+=p.dmg;
    profile.trophies=Math.max(0,profile.trophies+trophyDelta);
    const after=leagues[leagueIndex()].name;
    screen.matchReward={gain,won,trophyDelta,rankUp:before!==after?after:null};
    saveProfile();
  }
  function renderRoundResult(){
    const winners=winningPlayers();
    let html='<div class="modal-kicker">RUNDE '+screen.round+' ABGESCHLOSSEN</div><h1 class="modal-title">'+(winners.length?winners.map(p=>escapeHTML(p.name)).join(' + ')+' <em>gewinnt!</em>':'<em>Unentschieden!</em>')+'</h1><p class="modal-copy">'+(screen.round===screen.maxRounds?'Das letzte Gefecht ist beendet.':'Zwischen den Gefechten kannst du bessere Waffen kaufen. Alle Panzer werden für die nächste Runde repariert.')+'</p>';
    const sorted=[...screen.players].sort((a,b)=>b.wins-a.wins||b.kills-a.kills||b.dmg-a.dmg);
    html+='<div class="leaderboard">'+sorted.map((p,i)=>`<div class="result-line"><strong>${i+1}. <span style="color:${p.color}">●</span> ${escapeHTML(p.name)}</strong><span>${p.wins} Siege · ${p.kills} Kills · ${money(p.cash)}</span></div>`).join('')+'</div>';
    if(screen.round===screen.maxRounds){const r=screen.matchReward;
      html+=`<div class="match-reward"><span>${r.won?'EINSATZ GEWONNEN':'EINSATZ ABGESCHLOSSEN'}</span><strong>+${money(r.gain)}</strong><small>${r.trophyDelta>=0?'+':''}${r.trophyDelta} LIGAPUNKTE ${r.rankUp?' · AUFSTIEG: '+r.rankUp:''}</small></div>`;
      html+='<div class="modal-actions"><button id="playAgain" class="primary-button">NOCH EIN MATCH</button><button id="backToStart" class="secondary-button">ZUM HANGAR</button></div>';}
    else html+=net.role==='host'?'<div class="modal-actions"><button id="onlineNext" class="primary-button">NÄCHSTE RUNDE →</button></div>':'<div class="modal-actions"><button id="openShop" class="primary-button">ZUM WAFFENSHOP →</button></div>';
    showModal(html);
    if($('onlineNext'))$('onlineNext').onclick=()=>{newRound();netBroadcast();};
    if($('openShop'))$('openShop').onclick=beginShop;
    if($('playAgain'))$('playAgain').onclick=netActive()?()=>{netSend({type:'reset'});lanLobby();}:startGame;
    if($('backToStart'))$('backToStart').onclick=netActive()?()=>lanLobby():showMenu;
  }
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
  function beginShop(){screen.mode='shop';screen.shopIndex=0;openShop();}
  function openShop(){
    const human=screen.players.filter(p=>p.human)[screen.shopIndex];
    if(!human){botBuy();newRound();return;}
    const cards=weapons.filter(w=>w.cost>0&&weaponAllowed(w.id)).map(w=>`<div class="shop-card"><div class="shop-card-top"><div class="weapon-symbol" style="color:${w.color}">${w.icon}</div><span class="info-pill">+${w.bundle} SCHUSS</span></div><div class="shop-name">${w.name}</div><div class="shop-desc">${escapeHTML(w.desc)}<br>Vorrat: ${human.ammo[w.id]}</div><button class="shop-buy" data-buy="${w.id}" ${human.cash<w.cost?'disabled':''}>KAUFEN · ${money(w.cost)}</button></div>`).join('');
    showModal(`<div class="modal-kicker">WAFFENSHOP · ${screen.shopIndex+1} / ${screen.humans}</div><h1 class="modal-title">Rüste <em>auf.</em></h1><p class="modal-copy">${escapeHTML(human.name)}, du hast neue Credits verdient. Kaufe Munition für die kommende Runde.</p><div class="shop-balance">GUTHABEN: ${money(human.cash)}</div><div class="shop-grid">${cards}</div><div class="modal-actions"><button id="shopNext" class="primary-button">${screen.shopIndex+1===screen.humans?'NÄCHSTE RUNDE →':'NÄCHSTER SPIELER →'}</button></div>`);
    $('modalContent').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
      const w=weapons.find(x=>x.id===b.dataset.buy);if(human.cash<w.cost)return;
      human.cash-=w.cost;human.ammo[w.id]+=w.bundle;sound(840,.1);openShop();
    });
    $('shopNext').onclick=()=>{screen.shopIndex++;openShop();};
  }
  function botBuy(){for(const p of screen.players.filter(p=>!p.human)){
    const order=p.cash>1800?['salvo','emp','bunker','heavy','cluster','nuke']:['salvo','bunker','emp','heavy','cluster','napalm','digger'];
    for(const key of order){const w=weapons.find(x=>x.id===key);if(weaponAllowed(key)&&p.cash>=w.cost&&p.ammo[key]<2){p.cash-=w.cost;p.ammo[key]+=w.bundle;break;}}
  }}
  function showModal(html){$('modalContent').innerHTML='<nav class="modal-legal-nav" aria-label="Legal / Rechtliches"><a href="legal.html">Impressum / Legal</a><a href="privacy.html">Datenschutz</a></nav>'+html;$('modal').classList.remove('hidden');}
  function showMenu(){showHQ('hangar');}
  function showHQ(tab='hangar'){
    screen.mode='menu';screen.hqTab=tab;
    updateMeta();
    const active=tankById(profile.equipped), chosen=paints.find(c=>c.id===profile.paint)||paints[0];
    const header=`<div class="hq-head"><div><span class="hq-overline">KOMMANDOZENTRALE // HANGAR & ONLINE ARENA</span><h1 class="hq-title">KRATER<span>KRACH</span><small> TANK ARENA</small></h1></div><div class="hq-identity"><span>${escapeHTML(profile.name)}</span><strong>${money(profile.credits)}</strong><small>${leagues[leagueIndex()].name} · ${profile.trophies} RP</small></div></div>`;
    const tabs=[['hangar','HANGAR'],['shop','MARKT'],['upgrades','UPGRADES'],['league','LIGA'],['profile','PROFIL'],['battle','GEFECHT']];
    const nav=`<nav class="hq-nav" aria-label="Hauptnavigation">${tabs.map(([id,name])=>`<button data-hq="${id}" class="${id===tab?'active':''}">${name}</button>`).join('')}</nav>`;
    let body='';
    if(tab==='hangar'){
      body=`<div class="hangar-feature"><div class="hangar-mark"><span>UNIT 01 / ACTIVE</span><span>READY FOR DEPLOYMENT</span></div>
        <div class="hangar-picture">${tankSVG(active.id,chosen.color,'hero-svg')}<div class="hangar-gridline"></div></div>
        <div class="hangar-data"><div><span class="hq-overline">AKTUELLER PANZER</span><h2>${active.name}</h2><p>${active.desc}</p></div>
        <div class="specs"><span>STRUKTUR <b>${profileStats(active.id).hp}</b></span><span>SCHADEN <b>${Math.round(profileStats(active.id).attack*100)} %</b></span><span>MODULE <b>${tankLevel(active.id)} / 25</b></span></div></div></div>
        <div class="section-heading"><strong>DEINE GARAGE</strong><small>${profile.owned.length} / 4 PANZER FREIGESCHALTET</small></div>
        <div class="fleet-grid">${tanks.map(t=>fleetCard(t)).join('')}</div>
        <div class="modal-actions"><button class="secondary-button" data-hq="upgrades">PANZER VERBESSERN</button><button class="primary-button" data-hq="battle">GEFECHT VORBEREITEN →</button></div>`;
    }else if(tab==='shop'){
      body=`<div class="section-heading"><div><strong>FAHRZEUGMARKT</strong><small>Neue Klassen werden dauerhaft freigeschaltet.</small></div><b class="balance-chip">${money(profile.credits)}</b></div>
        <div class="fleet-grid">${tanks.map(t=>fleetCard(t,true)).join('')}</div>
        <div class="section-heading" style="margin-top:23px"><div><strong>LACKIERUNG & TARNUNG</strong><small>Rein optisch. Keine Spielvorteile.</small></div></div>
        <div class="paint-grid">${paints.map(c=>`<div class="paint-cell ${profile.paint===c.id?'selected':''}"><div class="paint-swatch" style="background:${c.color}"></div><strong>${c.name}</strong><button data-paint="${c.id}" ${!profile.paints.includes(c.id)&&profile.credits<c.cost?'disabled':''}>${profile.paint===c.id?'AKTIV':profile.paints.includes(c.id)?'ANWENDEN':money(c.cost)}</button></div>`).join('')}</div>
        <p class="hq-footnote">Keine Echtgeldkäufe. Panzer, Lackierungen und Upgrades werden nur mit Spiel-Credits freigeschaltet.</p>`;
    }else if(tab==='upgrades'){
      body=`<div class="section-heading"><div><strong>TECHNISCHE AUFRÜSTUNG</strong><small>Fünf separate Systeme mit je fünf zunehmend teuren Stufen.</small></div><b class="balance-chip">${money(profile.credits)}</b></div>
        <div class="upgrade-grid">${tanks.map(t=>upgradeCard(t)).join('')}</div>
        <p class="hq-footnote">Credits entstehen ausschließlich durch Spielen. Jeder Panzer kann Antrieb, Schaden, Panzerung, Zieloptik und zusätzlichen Schutzschild verbessern. In Turnierräumen werden alle Upgrades neutralisiert, damit Können entscheidet. Upgrades sind in Freizeiträumen aktiv.</p>`;
    }else if(tab==='league'){
      const l=leagueIndex(),next=leagues[l+1],curr=leagues[l];
      const percent=next?clamp((profile.trophies-curr.min)/(next.min-curr.min)*100,0,100):100;
      body=`<div class="league-hero"><span class="hq-overline">LOKALE SOLO-RANGLISTE · KEIN ONLINE-RANKING</span><div class="league-emblem">◈</div><h2>${curr.name}</h2><p>${profile.trophies} RANGLISTENPUNKTE</p><div class="league-bar"><i style="width:${percent}%"></i></div><small>${next?`${next.min-profile.trophies} PUNKTE BIS ${next.name}`:'HÖCHSTE STUFE ERREICHT'}</small></div>
        <div class="league-grid">${leagues.map((r,i)=>`<div class="league-rank ${i===l?'current':''} ${i<l?'achieved':''}"><span class="league-symbol">${r.sign}</span><strong>${r.name}</strong><small>AB ${r.min} RP</small></div>`).join('')}</div>
        <p class="hq-footnote">Das Ligasystem funktioniert derzeit lokal auf diesem Gerät. Ein gewonnenes Match bringt 90 Punkte, eine Niederlage kostet bis zu 30 Punkte. Eine öffentliche Bestenliste kommt erst mit dem Online-Modus.</p>`;
    }else if(tab==='profile'){
      const games=profile.matches,winrate=games?Math.round(profile.wins/games*100):0;
      body=`<div class="profile-card"><div class="profile-avatar">⌖</div><div><span class="hq-overline">PILOTENAKTE / LOKAL</span><h2>${escapeHTML(profile.name)}</h2><span class="info-pill">${leagues[leagueIndex()].name}</span><span class="info-pill">${profile.trophies} RP</span></div></div>
        <div class="profile-edit"><label>DEIN AUTOMATISCHER RUFNAME</label><div class="profile-input"><strong>${escapeHTML(profile.name)}</strong></div><small>Dein lustiger einzigartiger Name wird beim ersten Onlinekontakt vergeben und kann nicht geändert werden.</small></div>
        <div class="profile-stats">${[['MATCHES',profile.matches],['SIEGE',profile.wins],['SIEGQUOTE',winrate+' %'],['RUNDENSIEGE',profile.roundWins],['ABSCHÜSSE',profile.kills],['SCHADEN',profile.damage]].map(([k,v])=>`<div><small>${k}</small><strong>${v}</strong></div>`).join('')}</div>
        <p class="hq-footnote">Profil, Panzer und Guthaben werden nur auf diesem Gerät gespeichert. Browserdaten löschen oder die App deinstallieren kann den Spielstand entfernen. Cloud-Synchronisierung ist für eine spätere Online-Version vorgesehen.</p>`;
    }else if(tab==='battle'){
      body=`<div class="battle-setup"><span class="hq-overline">LOKALER RAUM / SPIELLEITER BESTIMMT REGELN</span><h2>Raum vorbereiten</h2><p>Hier gelten die Einstellungen für <b>alle</b> Spieler. Privat- und Onlineräume werden später mit denselben Regeln aufgebaut. Aktuell nur lokal, noch kein Netzspiel.</p>
        <div class="setup-row"><label>Menschliche Spieler</label><div class="stepper"><button id="hm">−</button><strong id="hv">${screen.humans}</strong><button id="hp">+</button></div></div>
        <div id="seatSelectors"></div>
        <div class="setup-row"><label>Computergegner</label><div class="stepper"><button id="bm">−</button><strong id="bv">${screen.bots}</strong><button id="bp">+</button></div></div>
        <div class="setup-row"><label>CPU-Schwierigkeit</label><div class="stepper"><button id="dm" aria-label="CPU leichter">−</button><strong id="dv">${{easy:'LEICHT',normal:'NORMAL',hard:'SCHWER'}[screen.aiDifficulty]}</strong><button id="dp" aria-label="CPU schwieriger">+</button></div></div>
        <div class="setup-row"><label>Runden je Match</label><div class="stepper"><button id="rm">−</button><strong id="rv">${screen.maxRounds}</strong><button id="rp">+</button></div></div>
        <div class="setup-row"><label>Sichtbare Flugbahn</label><div class="stepper"><button id="tm">−</button><strong id="tv">${screen.previewPct} %</strong><button id="tp">+</button></div></div>
        <div class="setup-tip">0 % PROFI · 25 % LIGA · 50 % STANDARD · 100 % KINDER / TRAINING</div>
        <div class="setup-row"><label>Upgrade-Regel</label><div class="stepper"><button id="um">◀</button><strong id="uv">${screen.upgradeMode==='equal'?'TURNIER · ALLE GLEICH':'FREIZEIT · UPGRADES AN'}</strong><button id="up">▶</button></div></div>
        <div class="setup-row"><label>Waffenregeln</label><div class="stepper"><button id="wm">◀</button><strong id="wv">${roomRules[screen.weaponsRule]}</strong><button id="wp">▶</button></div></div>
        <div class="setup-row"><label>Windstärke</label><div class="stepper"><button id="vm">◀</button><strong id="vv">${roomWind[screen.windMode]}</strong><button id="vp">▶</button></div></div>
        <div class="setup-row"><label>Fallschaden</label><div class="stepper"><button id="fm">◀</button><strong id="fv">${screen.fallDamage?'AN · MAX. 12 HP':'AUS'}</strong><button id="fp">▶</button></div></div>
        <div class="battle-roster"><span>AKTIVER PANZER</span>${tankSVG(active.id,chosen.color)}<strong>${active.name}</strong><small>${active.special}</small></div>
        <button id="start" class="primary-button battle-launch">GEFECHT STARTEN →</button></div>`;
    }
    const onlineCta=`<div style="padding:12px 18px;background:#162e29;border-bottom:1px solid #446a5d">
      <button id="openOnlineLobby" class="primary-button" style="width:100%;display:block;min-height:48px;border:1px solid #b9e2c9;background:linear-gradient(110deg,#bce9c9,#71c6b0);color:#10372d">
      🌐 ONLINE SPIEL · RAUM ERSTELLEN ODER BEITRETEN →</button>
      <div style="font-size:11px;color:#c5dbc9;margin-top:7px;text-align:center">2 bis 6 Panzer insgesamt · 2 bis 10 Runden · private Räume · weltweit</div></div>`;
    showModal(`<div class="hq-root">${header}${onlineCta}${nav}<div class="hq-body">${body}</div></div>`);
    $('openOnlineLobby').onclick=()=>lanLobby();
    $('modalContent').querySelectorAll('[data-hq]').forEach(b=>b.onclick=()=>showHQ(b.dataset.hq));
    $('modalContent').querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.equip;if(!profile.owned.includes(id))return;profile.equipped=id;saveProfile();showHQ(tab);sound(630,.1);
    });
    $('modalContent').querySelectorAll('[data-purchase]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.purchase,t=tankById(id);
      if(profile.owned.includes(id)||profile.credits<t.price)return;
      profile.credits-=t.price;profile.owned.push(id);profile.equipped=id;saveProfile();showHQ('shop');sound(900,.12);
    });
    $('modalContent').querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.upgrade,attr=b.dataset.attr;
      if(!tanks.some(t=>t.id===id)||!UPGRADE_IDS.includes(attr)||!profile.owned.includes(id))return;
      const tree=tankTree(id),level=tree[attr],cost=UPGRADE_COSTS[level];
      if(level>=UPGRADE_MAX||profile.credits<cost)return;
      addCredits(-cost);tree[attr]=level+1;saveProfile();showHQ('upgrades');sound(780,.14);
    });
    $('modalContent').querySelectorAll('[data-paint]').forEach(b=>b.onclick=()=>{
      const p=paints.find(p=>p.id===b.dataset.paint);if(!p)return;
      if(!profile.paints.includes(p.id)){if(profile.credits<p.cost)return;profile.credits-=p.cost;profile.paints.push(p.id);}
      profile.paint=p.id;saveProfile();showHQ('shop');sound(700,.1);
    });
    
    if($('start')){
      const refreshSeats=()=>{
        $('seatSelectors').innerHTML=Array.from({length:screen.humans-1},(_,j)=>`<div class="seat-row"><label for="classSeat${j}">SPIELER ${j+2} · PANZER</label><select id="classSeat${j}" data-seat="${j}" aria-label="Panzer von Spieler ${j+2}">${tanks.map(t=>`<option value="${t.id}" ${screen.seatClasses[j]===t.id?'selected':''}>${t.name}</option>`).join('')}</select></div>`).join('');
        $('seatSelectors').querySelectorAll('[data-seat]').forEach(select=>select.onchange=()=>{screen.seatClasses[Number(select.dataset.seat)]=select.value;});
      };
      const refresh=()=>{refreshSeats();$('hv').textContent=screen.humans;$('bv').textContent=screen.bots;$('rv').textContent=screen.maxRounds;$('dv').textContent={easy:'LEICHT',normal:'NORMAL',hard:'SCHWER'}[screen.aiDifficulty];$('tv').textContent=screen.previewPct+' %';$('uv').textContent=screen.upgradeMode==='equal'?'TURNIER · ALLE GLEICH':'FREIZEIT · UPGRADES AN';$('wv').textContent=roomRules[screen.weaponsRule];$('vv').textContent=roomWind[screen.windMode];$('fv').textContent=screen.fallDamage?'AN · MAX. 12 HP':'AUS';};
      $('hm').onclick=()=>{screen.humans=Math.max(1,screen.humans-1);refresh();};
      $('hp').onclick=()=>{screen.humans=Math.min(6,6-screen.bots,screen.humans+1);refresh();};
      $('bm').onclick=()=>{screen.bots=Math.max(0,screen.bots-1);refresh();};
      $('bp').onclick=()=>{screen.bots=Math.min(6-screen.humans,screen.bots+1);refresh();};
      $('dm').onclick=()=>{const d=['easy','normal','hard'];screen.aiDifficulty=d[Math.max(0,d.indexOf(screen.aiDifficulty)-1)];refresh();};
      $('dp').onclick=()=>{const d=['easy','normal','hard'];screen.aiDifficulty=d[Math.min(2,d.indexOf(screen.aiDifficulty)+1)];refresh();};
      $('rm').onclick=()=>{screen.maxRounds=screen.maxRounds===10?7:screen.maxRounds===7?5:3;refresh();};
      $('rp').onclick=()=>{screen.maxRounds=screen.maxRounds===3?5:screen.maxRounds===5?7:10;refresh();};
      $('tm').onclick=()=>{screen.previewPct=Math.max(0,screen.previewPct-25);refresh();};
      $('tp').onclick=()=>{screen.previewPct=Math.min(100,screen.previewPct+25);refresh();};
      const cycle=(arr,key,delta)=>{screen[key]=arr[(arr.indexOf(screen[key])+arr.length+delta)%arr.length];refresh();};
      $('um').onclick=()=>cycle(['equal','progression'],'upgradeMode',-1);
      $('up').onclick=()=>cycle(['equal','progression'],'upgradeMode',1);
      $('wm').onclick=()=>cycle(['standard','noNuke','classic'],'weaponsRule',-1);
      $('wp').onclick=()=>cycle(['standard','noNuke','classic'],'weaponsRule',1);
      $('vm').onclick=()=>cycle(['calm','normal','strong'],'windMode',-1);
      $('vp').onclick=()=>cycle(['calm','normal','strong'],'windMode',1);
      $('fm').onclick=$('fp').onclick=()=>{screen.fallDamage=!screen.fallDamage;refresh();};
      refreshSeats();
      $('start').onclick=startGame;
    }
  }
  function fleetCard(t,inShop=false){
    const owned=profile.owned.includes(t.id),equipped=profile.equipped===t.id;
    const color=owned?(paints.find(c=>c.id===profile.paint)||paints[0]).color:t.color;
    return `<article class="fleet-card ${equipped?'equipped':''}"><div class="fleet-head"><span>${t.role}</span>${equipped?'<small>IM EINSATZ</small>':owned?'<small>FREIGESCHALTET</small>':'<small>GESPERRT</small>'}</div>
      <div class="fleet-art">${tankSVG(t.id,color)}</div><h3>${t.name}</h3><p>${t.desc}</p><div class="stat-pills"><span>HP ${t.hp}</span><span>DMG ${Math.round(t.attack*100)}%</span><span>${t.special}</span><span>MODULE ${tankLevel(t.id)}/25</span></div>
      ${equipped?'<button disabled class="fleet-action current">AUSGERÜSTET ✓</button>':owned?`<button class="fleet-action" data-equip="${t.id}">AUSRÜSTEN</button>`:
      inShop?`<button class="fleet-action buy" data-purchase="${t.id}" ${profile.credits<t.price?'disabled':''}>FREISCHALTEN · ${money(t.price)}</button>`:
      `<button class="fleet-action buy" data-hq="shop">${money(t.price)} · ZUM MARKT</button>`}</article>`;
  }
  function upgradeCard(t){
    const owned=profile.owned.includes(t.id),tree=tankTree(t.id),stats=profileStats(t.id);
    const spec=`HP ${stats.hp} · Schaden ${Math.round(stats.attack*100)} % · Bewegung ${stats.move} m · Sicht +${stats.previewBonus} %`;
    const rows=UPGRADES.map(u=>{
      const lv=tree[u.id],cost=UPGRADE_COSTS[lv],canBuy=owned&&lv<UPGRADE_MAX&&profile.credits>=cost;
      return `<div class="module-row"><span class="module-icon">${u.icon}</span><div class="module-body"><div class="module-label"><b>${u.title}</b><small>${lv}/${UPGRADE_MAX}</small></div><div class="module-bars">${Array.from({length:UPGRADE_MAX},(_,i)=>`<i class="${i<lv?'done':''}"></i>`).join('')}</div><small>${u.desc}</small></div><button class="module-buy ${canBuy?'buy':''}" data-upgrade="${t.id}" data-attr="${u.id}" ${canBuy?'':'disabled'}>${!owned?'GESPERRT':lv>=UPGRADE_MAX?'MAX':money(cost)}</button></div>`;
    }).join('');
    return `<article class="upgrade-card ${profile.equipped===t.id?'active':''}">
      <div class="upgrade-head"><strong>${t.name}</strong><span>MODULE ${tankLevel(t.id)} / 25</span></div>
      <div class="upgrade-compact-head"><div class="upgrade-art">${tankSVG(t.id,t.color)}</div><small>${spec}</small></div>
      <div class="module-list">${rows}</div>
    </article>`;
  }
  function showHelp(){
    const wasHidden=$('modal').classList.contains('hidden');
    const fallback=()=>{if(wasHidden)$('modal').classList.add('hidden');else if(screen.mode==='menu')showHQ(screen.hqTab);else if(screen.mode==='shop')openShop();else if(screen.mode==='between')renderRoundResult();else $('modal').classList.add('hidden');};
    showModal(`<div class="modal-kicker">SPIELANLEITUNG</div><h1 class="modal-title">So funktioniert <em>KRATERKRACH.</em></h1><ol class="help-list"><li>Wähle Menschen und Computergegner. Alle menschlichen Spieler benutzen nacheinander dasselbe Gerät.</li><li>Stelle den Winkel zwischen 5° und 175° ein. 90° schießt senkrecht nach oben, über 90° nach links.</li><li>Wähle die Schusskraft und achte auf Windrichtung und Windstärke.</li><li>Vor dem Schuss können alle Panzer fahren: Scout bis zu 90 m, andere Panzer bis zu 30 m pro eigenem Zug. Nach FEUER, während des Projektilfluges und während fremder Züge ist Bewegung gesperrt.</li><li>Im Hangar kannst du fünf technische Systeme mit jeweils fünf zunehmend teureren Schritten ausbauen: Antrieb, Schaden, Panzerung, Zieloptik und äußeren Zusatzschild. Ausschließlich Spiel-Credits. Jeder Panzer darf alles aufrüsten.</li><li>Der Guardian besitzt zusätzlich seinen eingebauten, inneren Schild. Schildmodule bilden eine äußere Schicht, die zuerst Treffer auffängt. EMP neutralisiert beide.</li><li>Fallschaden nach Panzerhöhen: bis 1 Panzerhöhe 0 HP, bei 2/3/4/5/6 Höhen ungefähr 2/4/6/8/11 HP, maximal 12 HP. Zusätzliche Panzerung hilft etwas; im Raum abschaltbar.</li><li>Die CPU-Schwierigkeit lässt sich vor dem Match einstellen. Leicht ist die Voreinstellung.</li><li>Die Online-Zielhilfe zeigt standardmäßig nur 30 % der Flugzeit und ein Windfenster von maximal links bis maximal rechts. Die mittlere Linie bedeutet Windstille. Der tatsächliche Wind verändert den Einschlag, wird aber nie in die Zielkurven eingerechnet. Artillerie erhält 10 Prozentpunkte zusätzliche Sicht.</li><li>Im Handy-Querformat nutzt das Spielfeld möglichst viel Platz. Mit der Schaltfläche QUERFORMAT kannst du, soweit vom Browser erlaubt, in den Vollbildmodus wechseln. Online-Spieler können nach kurzzeitigem Netzverlust ihren Platz zurückerhalten.</li><li>Wer als Letzter am Leben bleibt, gewinnt die Runde. Treffer bringen Credits. Zwischen den Runden kannst du zusätzliche Munition kaufen.</li><li>Auf dem PC: Pfeiltasten links/rechts für Winkel, hoch/runter für Kraft und Leertaste zum Feuern.</li></ol><div class="modal-actions"><button id="closeHelp" class="primary-button">VERSTANDEN</button></div>`);
    $('closeHelp').onclick=fallback;
  }
  function renderRoster(){
    const signature=screen.round+'|'+screen.turn+'|'+screen.busy+'|'+screen.players.map(p=>[p.id,p.hp,p.shield,p.wins,p.name].join(':')).join(';');
    if(signature===net.lastRosterSignature)return;net.lastRosterSignature=signature;
    $('roster').innerHTML=screen.players.map((p,i)=>`<div class="player-chip ${screen.mode==='playing'&&!screen.busy&&screen.turn===i?'current':''} ${p.hp<=0?'dead':''}"><div class="chip-top"><span class="chip-name" style="color:${p.color}">${p.human?'●':'◇'} ${escapeHTML(p.name)}</span><span class="chip-score">${p.wins} ★ · ${Math.ceil(p.hp)}/${p.maxHp}${p.shield?' +'+p.shield+'◇':''}</span></div><div class="health-track"><div class="health-fill" style="width:${100*p.hp/p.maxHp}%;background:${p.hp<31?'#fd6c75':p.color}"></div></div></div>`).join('');
  }
  function updateControls(){
    const p=actual(),ok=screen.mode==='playing'&&!screen.busy&&p&&p.human&&localTurn();
    document.body.classList.toggle('battle-live',screen.mode==='playing');
    $('previewIndicator').textContent='WINDKORRIDOR · '+effectivePreview(p)+' %'+(p&&p.classId==='artillery'?' · ARTILLERIEOPTIK':'');
    $('roundLabel').textContent=screen.round+' / '+screen.maxRounds;
    $('playerLabel').textContent=p?p.name:'–';
    $('playerLabel').style.color=p?p.color:'#fff';
    $('windLabel').textContent=(screen.wind<0?'◀ ':screen.wind>0?'▶ ':'↔ ')+Math.abs(screen.wind);
    $('moneyLabel').textContent=p?money(p.cash):'–';
    $('turnStatus').textContent=screen.mode!=='playing'?'PAUSE':screen.busy?'EINSCHLAG':p&&p.human?(localTurn()?'BEREIT':'GEGNER AM ZUG'):'CPU ZIELT';
    $('angleRange').value=p?p.angle:55;$('powerRange').value=p?p.power:65;
    $('angleNumber').textContent=(p?p.angle:55)+'°';
    $('powerNumber').textContent=(p?p.power:65)+'%';
    $('controlHeading').textContent=ok?'Deine nächste Salve':screen.mode!=='playing'?'Gefecht unterbrochen':'Bitte abwarten';
    ['angleRange','powerRange','angleMinus','anglePlus','powerMinus','powerPlus','fireButton'].forEach(id=>{$(id).disabled=!ok;});
    const selected=weapons.find(w=>w.id===(p?p.selected:'shell'))||weapons[0];
    $('weaponTitle').textContent=selected.name;$('weaponDescription').textContent=selected.desc;
    const signature=(p?p.id+'|'+p.selected+'|'+weapons.map(w=>p.ammo[w.id]).join(','):'empty')+'|'+ok+'|'+screen.weaponsRule;
    if(signature!==net.lastUiSignature){
      net.lastUiSignature=signature;
    $('weaponStrip').innerHTML=weapons.map(w=>{const count=p?p.ammo[w.id]:0,available=weaponAllowed(w.id)&&(w.id==='shell'||count>0);return `<button class="weapon-option ${p&&p.selected===w.id?'selected':''} ${!available?'locked':''}" data-weapon="${w.id}" ${!ok||!available?'disabled':''}><span class="weapon-symbol" style="color:${w.color}">${w.icon}</span><span class="weapon-count">${w.id==='shell'?'∞':count}</span><span class="weapon-label">${w.name}</span></button>`}).join('');
    document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>{if(screen.mode==='playing'&&!screen.busy&&localTurn())selectWeapon(b.dataset.weapon);});
    }
    const ab=$('abilityRow');
    const remaining=p?Math.max(0,p.moveRemaining):0;
    const moveStep=p&&p.classId==='scout'?34:15;
    const moveLabel=p&&p.classId==='scout'?'SCOUT · 3× REICHWEITE':'POSITION WECHSELN';
    const moveSignature=(p?p.id+'|'+p.moveRemaining+'|'+p.shield:'empty')+'|'+ok;
    if(moveSignature!==net.lastMoveSignature){net.lastMoveSignature=moveSignature;
    ab.innerHTML=`<span class="ability-label">${moveLabel}: <strong>${remaining} m</strong> übrig · nur vor dem Schuss</span><button id="moveLeft" ${!ok||remaining<=0?'disabled':''}>◀ ${Math.min(moveStep,remaining)} m</button><button id="moveRight" ${!ok||remaining<=0?'disabled':''}>${Math.min(moveStep,remaining)} m ▶</button>${p&&p.shield?`<span class="shield-badge">◈ ${p.nativeShield} + ${p.extraShield} SCHILD</span>`:''}`;
    $('moveLeft').onclick=()=>moveTank(-1);$('moveRight').onclick=()=>moveTank(1);
    }
  }
  function setControl(key,val){
    const p=actual();if(!p||!p.human||screen.mode!=='playing'||screen.busy||(!localTurn()&&!net.remoteCommand))return;
    val=clamp(Math.round(Number(val)),key==='angle'?5:20,key==='angle'?175:100);
    if(net.role==='guest'&&!net.remoteCommand){
      p[key]=val;updateControls();
      const now=performance.now();
      if(now-net.aimPacketAt>45){net.aimPacketAt=now;netSend({type:'action',action:{kind:'aim',key,value:val}});}
      else {
        clearTimeout(net.pendingAimTimer);
        net.pendingAimTimer=setTimeout(()=>{if(net.connected&&localTurn())netSend({type:'action',action:{kind:'aim',key,value:p[key]}});},65);
      }
      return;
    }
    p[key]=val;updateControls();
    if(net.role==='host'&&!net.remoteCommand)sendLiveAim();
  }
  // One active player only. Movement consumes a turn-local budget and stops as soon as FEUER is pressed.
  function performMove(p,dir,distance){
    if(!p||p.hp<=0||screen.mode!=='playing'||screen.busy||actual()!==p)return false;
    const step=Math.min(distance,p.moveRemaining);
    if(step<=0)return false;
    const nx=clamp(p.x+dir*step,30,W-30),travel=Math.abs(nx-p.x);
    if(travel<3)return false;
    // Prevent teleporting through another tank; no simultaneous movement.
    if(screen.players.some(q=>q.id!==p.id&&q.hp>0&&q.x>=Math.min(p.x,nx)-31&&q.x<=Math.max(p.x,nx)+31))return false;
    p.x=nx;p.y=screen.terrain[Math.round(nx)]-10;
    p.moveRemaining=Math.max(0,p.moveRemaining-travel);
    return true;
  }
  function moveTank(dir){
    const p=actual();
    if(!p||!p.human||screen.mode!=='playing'||screen.busy||p.moveRemaining<=0||(!localTurn()&&!net.remoteCommand))return;
    if(net.role==='guest'&&!net.remoteCommand){netSend({type:'action',action:{kind:'move',dir}});return;}
    if(!performMove(p,dir,p.classId==='scout'?34:15)){toast('POSITION BLOCKIERT');return;}
    sound(440,.11);updateControls();renderRoster();
  }
  function fire(){
    if(screen.mode!=='playing'||screen.busy||(!localTurn()&&!net.remoteCommand))return;
    const p=actual();if(!p||p.hp<=0||(!p.human&&screen.aiTimer>0))return;
    if(net.role==='guest'&&!net.remoteCommand){netSend({type:'action',action:{kind:'fire'}});return;}
    const w=weapons.find(w=>w.id===p.selected);
    if(!w||!weaponAllowed(w.id)||p.ammo[w.id]<=0)return;
    if(w.id!=='shell')p.ammo[w.id]--;p.shotsFired++;
    const theta=p.angle*Math.PI/180,v=p.power*.23;
    const launch=(angle,power,weapon)=>{const a=angle*Math.PI/180,velocity=power*.23;
      return {x:p.x+Math.cos(a)*22,y:p.y-5-Math.sin(a)*22,vx:Math.cos(a)*velocity,vy:-Math.sin(a)*velocity,owner:p.id,weapon,t:0};};
    screen.shots=w.id==='salvo'?[-4,0,4].map((spread,i)=>launch(clamp(p.angle+spread,5,175),p.power+(i-1)*2,'salvo')):[launch(p.angle,p.power,w.id)];
    screen.busy=true;screen.aiTimer=0;screen.settleTimer=-1;p.moveRemaining=0;
    weaponFx('launch',w.id);updateControls();renderRoster();
  }
  function pickBotShot(p){
    // CPU moves exclusively on its own turn before firing; never during somebody else's shot.
    if(Math.random()<.42&&p.moveRemaining>0){
      const dir=Math.random()<.5?-1:1;
      performMove(p,dir,p.classId==='scout'?30:15);
    }
    const targets=alive().filter(q=>q.id!==p.id && q.team!==p.team);if(!targets.length)return;
    let best=null;
    for(const target of targets){for(let a=13;a<=167;a+=5){const cos=Math.cos(a*Math.PI/180),sin=Math.sin(a*Math.PI/180);if((target.x-p.x)*cos<-30)continue;
      for(let power=28;power<=99;power+=4){let x=p.x+cos*22,y=p.y-5-sin*22,vx=cos*power*.23,vy=-sin*power*.23;let miss=Infinity;
        for(let t=0;t<220;t++){x+=vx;y+=vy;vx+=screen.wind*.004;vy+=G;if(y>H+20||x<0||x>W)break;
          const dx=x-target.x,dy=y-target.y;
          miss=Math.min(miss,Math.hypot(dx,dy));
          if(y>=screen.terrain[clamp(Math.round(x),0,W)])break;
        }
        if(best===null||miss<best.miss)best={miss,a,power};
      }
    }}
    const skill={easy:{angle:12,power:16,advanced:.12},normal:{angle:7,power:9,advanced:.38},hard:{angle:3,power:4,advanced:.65}}[screen.aiDifficulty]||{angle:12,power:16,advanced:.12};
    if(best){p.angle=clamp(best.a+Math.round(rand(-skill.angle,skill.angle)),5,175);p.power=clamp(best.power+Math.round(rand(-skill.power,skill.power)),20,100);}
    const stocked=['heavy','napalm','digger','salvo','bunker','emp','cluster','nuke'].filter(id=>weaponAllowed(id)&&p.ammo[id]>0);
    p.selected=stocked.length&&Math.random()<skill.advanced?stocked[Math.floor(Math.random()*stocked.length)]:'shell';
    updateControls();
  }
  function impact(shot,x,y){
    const w=weapons.find(v=>v.id===shot.weapon)||weapons[0];
    const shooter=screen.players[shot.owner],boost=shooter.classId==='artillery'?1.04:1;
    if(w.id==='emp'){
      for(const v of screen.players){if(v.hp>0 && (v.id===shooter.id||v.team!==shooter.team) && Math.hypot(v.x-x,v.y-y)<w.r+24&&v.shield>0){v.nativeShield=0;v.extraShield=0;v.shield=0;popParticles(v.x,v.y-11,22,'#80fff9');}}
      toast('EMP-IMPULS · SCHILDE ENTLADEN',1.1);
    }
    weaponFx('impact',w.id);
    explode(x,y,w.r*boost,w.dmg,w.color,shot.owner);
    if(w.id==='bunker')crater(x,y+27,51*boost);
    if(w.id==='napalm'){
      for(let i=0;i<11;i++){const a=(i-5)/5;screen.shots.push({x:x+a*7,y:y-8,vx:a*2.55+rand(-.7,.7),vy:-rand(2.5,8),owner:shot.owner,weapon:'ember',t:0});}
    }
    if(w.id==='cluster'){
      for(let i=0;i<7;i++){const a=(i-3)/3;screen.shots.push({x,y:y-9,vx:a*3.2+rand(-.6,.6),vy:-rand(4.5,8),owner:shot.owner,weapon:'shard',t:0});}
    }
    if(w.id==='nuke'){screen.flash=.95;if(navigator.vibrate)navigator.vibrate([70,30,100]);toast('NUKLEARE DETONATION!',1.4);}
  }
  function explode(x,y,r,dmg,color,owner){
    const p=screen.players[owner];screen.rings.push({x,y,r:5,max:r,life:23,color});
    crater(x,y,r);
    let dealt=0;
    for(const victim of screen.players){if(victim.hp<=0)continue;
      if(victim.id!==owner && p.team===victim.team)continue; // Allied units cannot injure one another directly.
      const d=Math.hypot(victim.x-x,(victim.y-3)-y);
      const factor=clamp(1-d/(r+30),0,1);
      if(factor>0){let amount=Math.round(dmg*factor*p.attack*victim.resist);
        if(victim.shield>0){
          let stopped=0;
          const outer=Math.min(victim.extraShield,amount);victim.extraShield-=outer;amount-=outer;stopped+=outer;
          const inner=Math.min(victim.nativeShield,amount);victim.nativeShield-=inner;amount-=inner;stopped+=inner;
          victim.shield=victim.nativeShield+victim.extraShield;
          if(stopped>0){fx('shield');screen.rings.push({x:victim.x,y:victim.y-12,r:38,max:60,life:24,color:'#72f3ed'});popParticles(victim.x,victim.y-12,Math.min(18,stopped),'#81fafa');}}
        amount=Math.min(victim.hp,amount);if(amount>0){victim.hp=Math.max(0,victim.hp-amount);if(owner!==victim.id){dealt+=amount;p.dmg+=amount;}if(victim.hp===0){popParticles(victim.x,victim.y,32,'#ffba69');if(owner!==victim.id){p.kills++;p.cash+=360;}}}}
    }
    if(dealt){p.cash+=dealt*7;toast('TREFFER! +'+(dealt*7)+' ₡',.8);fx('hit');}
    popParticles(x,y,Math.min(75,Math.floor(r*.7)),color);
    screen.wind=clamp(screen.wind,-windCeiling(),windCeiling());
    // Weapon-dependent detonation audio is emitted by impact(), not here.
    // This avoids nine identical booms when napalm and cluster fragments scatter.
  }
  function crater(x,y,r){
    bumpTerrain();
    const lo=Math.max(0,Math.floor(x-r)),hi=Math.min(W,Math.ceil(x+r));
    for(let col=lo;col<=hi;col++){
      const dx=col-x,dy=Math.sqrt(Math.max(0,r*r-dx*dx));
      // Dig down, without raising existing ground.
      screen.terrain[col]=clamp(Math.max(screen.terrain[col],y+dy*.92),40,H-7);
    }
  }
  function popParticles(x,y,n,color){for(let i=0;i<n;i++){
    const a=rand(0,Math.PI*2),v=rand(.6,5.6);
    screen.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.7,life:rand(25,65),maxLife:65,size:rand(1.5,5.5),color});
  }}
  function physics(dt){
    if(screen.toastTimer>0){screen.toastTimer-=dt;if(screen.toastTimer<=0)$('toast').classList.remove('shown');}
    if(screen.flash>0)screen.flash=Math.max(0,screen.flash-dt*.037);
    screen.phase+=dt;
    screen.particles=screen.particles.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.12*dt;p.vx*=.989;p.life-=dt;return p.life>0;});
    screen.rings=screen.rings.filter(r=>{r.r+=(r.max-r.r)*.16*dt;r.life-=dt;return r.life>0;});
    screen.fallPopups=screen.fallPopups.filter(v=>{v.y-=.28*dt;v.life-=dt;return v.life>0;});
    if(screen.mode!=='playing'||net.role==='guest'||(net.role==='host'&&!net.connected))return;
    if(screen.aiTimer>0&&!screen.busy){screen.aiTimer-=dt;if(screen.aiTimer<=0){const p=actual();if(!p.human){pickBotShot(p);fire();}}}
    if(!screen.busy)return;
    if(screen.shots.length){
      const next=[];
      for(const shot of screen.shots){
        let hit=false;const steps=Math.max(1,Math.ceil(dt*2));
        for(let s=0;s<steps;s++){
          const f=dt/steps;
          shot.x+=shot.vx*f;shot.y+=shot.vy*f;
          shot.vx+=screen.wind*.004*f;shot.vy+=G*f;shot.t+=f;
          if(shot.x<0||shot.x>W||shot.y>H+8){hit=true;break;}
          if(shot.y<0)continue;
          const ground=screen.terrain[clamp(Math.round(shot.x),0,W)];
          let tankHit=false;
          if(shot.t>3)for(const p of screen.players){if(p.hp>0&&Math.abs(shot.x-p.x)<13&&Math.abs(shot.y-p.y)<12){tankHit=true;break;}}
          if(shot.y>=ground||tankHit){hit=true;
            if(shot.weapon==='ember'){weaponFx('fragment','ember');explode(shot.x,Math.min(shot.y,ground),19,16,'#ff723f',shot.owner);}
            else if(shot.weapon==='shard'){weaponFx('fragment','shard');explode(shot.x,Math.min(shot.y,ground),25,27,'#b8fca3',shot.owner);}
            else impact(shot,shot.x,Math.min(shot.y,ground));
            break;
          }
        }
        if(!hit&&shot.t<380)next.push(shot);
        if(screen.particles.length>350)screen.particles.splice(0,screen.particles.length-350);
      }
      // Additional fire and cluster fragments, queued by impact() above.
      const extra=screen.shots.filter(s=>s.t===0 && (s.weapon==='ember'||s.weapon==='shard'));
      screen.shots=next.concat(extra);
    }
    if(screen.shots.length===0){if(screen.settleTimer<0)screen.settleTimer=43;else{screen.settleTimer-=dt;if(screen.settleTimer<=0)endShot();}}
  }
  // Pre-render the expensive background, distant hills and terrain only when
  // terrain changes. 30fps on phones now draws one cached bitmap instead of
  // rebuilding gradient fills and 500 terrain line segments every frame.
  const groundLayer=document.createElement('canvas');groundLayer.width=W;groundLayer.height=H;
  const groundContext=groundLayer.getContext('2d');
  let cachedGroundSerial=-1;
  function paintStaticScene(){
    if(cachedGroundSerial===terrainSerial)return;
    cachedGroundSerial=terrainSerial;
    const c=groundContext;
    c.clearRect(0,0,W,H);
    const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#0d1c25');grad.addColorStop(.65,'#283e44');grad.addColorStop(1,'#39423a');c.fillStyle=grad;c.fillRect(0,0,W,H);
    const glow=c.createRadialGradient(690,115,15,690,115,280);glow.addColorStop(0,'#9da88d22');glow.addColorStop(1,'#9da88d00');c.fillStyle=glow;c.fillRect(350,0,650,410);
    c.strokeStyle='#a6baa510';c.lineWidth=1;for(let x=0;x<W;x+=60){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}for(let y=0;y<H;y+=60){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
    c.fillStyle='#253a40';c.beginPath();c.moveTo(0,365);for(let x=0;x<=W;x+=8)c.lineTo(x,321+42*Math.sin(x/115+1.7)+22*Math.sin(x/53+1));c.lineTo(W,H);c.lineTo(0,H);c.fill();
    c.fillStyle='#31433f';c.beginPath();c.moveTo(0,390);for(let x=0;x<=W;x+=8)c.lineTo(x,370+30*Math.sin(x/120+2.1)+14*Math.sin(x/34+.5));c.lineTo(W,H);c.lineTo(0,H);c.fill();
    if(screen.terrain.length){
      c.beginPath();c.moveTo(0,H);c.lineTo(0,screen.terrain[0]);for(let x=1;x<=W;x+=2)c.lineTo(x,screen.terrain[x]);c.lineTo(W,H);c.closePath();
      const dirt=c.createLinearGradient(0,230,0,H);dirt.addColorStop(0,'#7e9676');dirt.addColorStop(.15,'#5c6e59');dirt.addColorStop(.47,'#35473b');dirt.addColorStop(1,'#142b2c');c.fillStyle=dirt;c.fill();
      c.beginPath();c.moveTo(0,screen.terrain[0]);for(let x=1;x<=W;x+=2)c.lineTo(x,screen.terrain[x]);c.strokeStyle='#93ae8a';c.lineWidth=3;c.stroke();
      c.globalAlpha=.24;for(let x=11;x<W;x+=19){const y=screen.terrain[x]+17+(x*13%48);c.fillStyle=x%3?'#c3b385':'#243a36';c.fillRect(x,y,2,2);}c.globalAlpha=1;
    }
  }
  function render(){
    paintStaticScene();
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(groundLayer,0,0);
    ctx.fillStyle='#d0dfca70';ctx.font='bold 10px monospace';
    ctx.fillText('SEKTOR K-07 // WIND '+(screen.wind>=0?'+':'')+screen.wind,20,54);
    for(const p of screen.players)drawTank(p);
    const p=actual();if(screen.mode==='playing'&&p&&!screen.busy&&p.hp>0)drawTrajectory(p);
    for(const s of screen.shots){ctx.save();ctx.shadowBlur=14;ctx.shadowColor=s.weapon==='nuke'?'#fff690':'#ffd598';ctx.fillStyle=s.weapon==='nuke'?'#fff3b2':s.weapon==='ember'?'#fc7943':'#ffdf90';ctx.beginPath();ctx.arc(s.x,s.y,s.weapon==='nuke'?7:4.5,0,Math.PI*2);ctx.fill();ctx.restore();}
    for(const r of screen.rings){ctx.strokeStyle=r.color;ctx.globalAlpha=clamp(r.life/23,0,1)*.7;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
    for(const q of screen.particles){ctx.globalAlpha=clamp(q.life/q.maxLife,0,1);ctx.fillStyle=q.color;ctx.fillRect(q.x,q.y,q.size,q.size);}ctx.globalAlpha=1;
    for(const f of screen.fallPopups){ctx.save();ctx.globalAlpha=clamp(f.life/f.maxLife,0,1);ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#13202a';ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle='#ffca8b';ctx.fillText(f.text,f.x,f.y);ctx.restore();}
    if(screen.flash>0){ctx.fillStyle=`rgba(255,246,197,${screen.flash*.46})`;ctx.fillRect(0,0,W,H);}
    if(screen.players.length===0){ctx.fillStyle='#e4edf8';ctx.textAlign='center';ctx.font='bold 23px system-ui';ctx.fillText('STARTE DEIN ERSTES GEFECHT',W/2,245);ctx.font='14px system-ui';ctx.fillStyle='#9db7d1';ctx.fillText('Bis zu 6 Panzer insgesamt. Alliances online. Jede Menge Chaos.',W/2,274);ctx.textAlign='left';}
  }
  function drawTank(p){
    const t=tankById(p.classId),c=p.color;
    const active=screen.mode==='playing'&&screen.turn===p.id;
    ctx.save();ctx.translate(p.x,p.y);
    if(p.hp<=0){ctx.globalAlpha=.6;ctx.fillStyle='#28302d';ctx.fillRect(-20,-3,38,12);ctx.fillStyle='#b66c48';ctx.fillRect(-5,-13,18,8);ctx.restore();return;}
    if(active){ctx.strokeStyle='#e0c98b';ctx.lineWidth=1.4;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(0,-6,27+Math.sin(screen.phase/14)*2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    if(t.id==='guardian'&&p.nativeShield>0){
      const pulse=.84+.09*Math.sin(screen.phase/9),strength=p.nativeShield/24;
      ctx.save();ctx.globalAlpha=.13+.12*strength;
      const aura=ctx.createRadialGradient(0,-12,14,0,-12,64);
      aura.addColorStop(0,'#49e7f400');aura.addColorStop(.75,'#39cddfa8');aura.addColorStop(1,'#63e4ff00');
      ctx.fillStyle=aura;ctx.beginPath();ctx.ellipse(0,-12,62,53,0,0,Math.PI*2);ctx.fill();
      ctx.restore();ctx.save();ctx.globalAlpha=.6+.22*strength;
      ctx.strokeStyle='#71f7f3';ctx.lineWidth=3.4;ctx.shadowColor='#4ee2ed';ctx.shadowBlur=18;
      ctx.beginPath();ctx.ellipse(0,-12,49*pulse,42*pulse,0,0,Math.PI*2);ctx.stroke();
      ctx.lineWidth=1;ctx.globalAlpha=.36;ctx.beginPath();ctx.ellipse(0,-12,56*pulse,49*pulse,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if(p.extraShield>0){
      ctx.save();ctx.strokeStyle='#edca7c';ctx.globalAlpha=.72;ctx.lineWidth=2.6;
      ctx.setLineDash([8,5]);ctx.shadowColor='#d8b675';ctx.shadowBlur=12;
      ctx.beginPath();ctx.ellipse(0,-12,64,54,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    const rad=p.angle*Math.PI/180,barrel=t.id==='artillery'?34:24;
    const ww=t.id==='scout'?16:t.id==='titan'?25:21;
    ctx.fillStyle='#0c171b';ctx.beginPath();ctx.roundRect(-ww,-4,ww*2,12,5);ctx.fill();
    for(let i=-1;i<=1;i++){ctx.fillStyle='#6f7c71';ctx.beginPath();ctx.arc(i*(ww*.6),3,t.id==='titan'?4.5:3.5,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-ww,-5);ctx.lineTo(-ww+6,-14);ctx.lineTo(ww-7,-14);ctx.lineTo(ww,-5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#283830';ctx.fillRect(-ww+5,-10,ww*2-10,2);
    ctx.strokeStyle='#101d20';ctx.lineWidth=t.id==='artillery'?8:6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(Math.cos(rad)*barrel,-13-Math.sin(rad)*barrel);ctx.stroke();
    ctx.strokeStyle='#9ba99a';ctx.lineWidth=t.id==='artillery'?5:3.6;ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(Math.cos(rad)*barrel,-13-Math.sin(rad)*barrel);ctx.stroke();
    ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-10,-14);ctx.lineTo(-6,-22);ctx.lineTo(7,-22);ctx.lineTo(12,-14);ctx.closePath();ctx.fill();
    if(t.id==='titan'){ctx.fillStyle='#43594d';ctx.fillRect(-17,-16,5,8);ctx.fillRect(11,-16,6,8);}
    if(t.id==='scout'){ctx.strokeStyle='#d4e1c6';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-7,-22);ctx.lineTo(-9,-31);ctx.stroke();}
    ctx.restore();
    ctx.font='bold 12px system-ui';ctx.fillStyle='#eaf0e2';ctx.textAlign='center';    ctx.fillText(p.name,p.x,p.y-(p.shield>0?77:50));
    if(p.shield>0){ctx.font='bold 10px system-ui';ctx.fillStyle='#e9d29b';ctx.fillText((p.nativeShield?'◈ ':'')+p.nativeShield+(p.extraShield?' + '+p.extraShield:'')+' SCHILD',p.x,p.y-59);}
    ctx.fillStyle='#111d20';ctx.fillRect(p.x-22,p.y-44,44,6);ctx.fillStyle=p.hp/p.maxHp<.30?'#f66f65':p.color;ctx.fillRect(p.x-21,p.y-43,42*p.hp/p.maxHp,4);
    ctx.textAlign='left';
  }
  function effectivePreview(p){
    if(screen.previewPct<=0)return 0;
    return Math.min(screen.previewPct===100?100:95,screen.previewPct+(p?p.previewBonus:0));
  }
  function trajectoryEnvelope(p){
    // Min/max wind scenarios only. Never use screen.wind or a predicted
    // impact location in the visual guide. Actual shots still use real wind.
    const a=p.angle*Math.PI/180,v=p.power*.23;
    const x0=p.x+Math.cos(a)*22,y0=p.y-5-Math.sin(a)*22;
    const vx0=Math.cos(a)*v,vy0=-Math.sin(a)*v;
    const verticalDistance=Math.max(0,screen.terrain[clamp(Math.round(p.x),0,W)]-y0);
    const fullFlight=(-vy0+Math.sqrt(vy0*vy0+2*G*verticalDistance))/G;
    const steps=Math.min(215,Math.ceil(fullFlight*effectivePreview(p)/100));
    return [-windCeiling(),0,windCeiling()].map(wind=>{
      let x=x0,y=y0,vx=vx0,vy=vy0;const pts=[];
      for(let t=0;t<steps;t++){
        x+=vx;y+=vy;vx+=wind*.004;vy+=G;
        if(x<0||x>W||y>H)break;
        if(y>=0&&y>=screen.terrain[clamp(Math.round(x),0,W)])break;
        if(t%3===0)pts.push({x,y});
      }
      return pts;
    });
  }
  function drawTrajectory(p){
    if(effectivePreview(p)<=0)return;
    const [low,mid,high]=trajectoryEnvelope(p);
    ctx.save();
    // Translucent fan marks the extreme possible winds, not the current one.
    const n=Math.min(low.length,high.length);
    if(n>1){ctx.beginPath();low.slice(0,n).forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));
      high.slice(0,n).reverse().forEach(q=>ctx.lineTo(q.x,q.y));ctx.closePath();ctx.fillStyle='rgba(106,217,239,.13)';ctx.fill();}
    for(const [points,color] of [[low,'#72d4f2'],[high,'#72d4f2'],[mid,'#f5d9a3']]){
      ctx.beginPath();points.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));
      ctx.strokeStyle=color;ctx.lineWidth=2;ctx.setLineDash(points===mid?[2,8]:[6,5]);ctx.stroke();
    }
    ctx.restore();
  }
  function frame(now){
    const dt=screen.last?Math.min(2.3,(now-screen.last)/16.666):1;
    screen.last=now;physics(dt);
    if(net.role==='host'&&net.connected&&now-net.lastBroadcast>(screen.busy?115:500)){net.lastBroadcast=now;netBroadcast();}
    if(net.role==='host'&&net.connected&&screen.mode==='playing'&&!screen.busy&&net.started){
      const p=actual(),peer=net.players.find(q=>q.seat===screen.turn);
      if(p?.human&&peer&&!peer.connected&&now-net.turnTime>45000){toast('VERBINDUNG FEHLT · ZUG ÜBERSPRUNGEN',2);nextTurn(screen.turn);}
    }
    const fps=net.role==='guest'?30:45;
    if(!screen.lastPaint||now-screen.lastPaint>=1000/fps){screen.lastPaint=now;render();}
    requestAnimationFrame(frame);
  }
  function wire(){
    $('angleRange').oninput=e=>setControl('angle',e.target.value);
    $('powerRange').oninput=e=>setControl('power',e.target.value);
    $('angleMinus').onclick=()=>setControl('angle',actual().angle-1);
    $('anglePlus').onclick=()=>setControl('angle',actual().angle+1);
    $('powerMinus').onclick=()=>setControl('power',actual().power-1);
    $('powerPlus').onclick=()=>setControl('power',actual().power+1);
    $('fireButton').onclick=fire;
    $('newButton').onclick=()=>{if(netActive()){lanLobby();return;}if(screen.mode==='playing'&&!confirm('Aktuelles Gefecht beenden und zum Hangar zurückkehren?'))return;showMenu();};
    $('hangarButton').onclick=()=>{if(netActive()){lanLobby();return;}if(screen.mode==='playing'&&!confirm('Aktuelles Gefecht beenden und zum Hangar zurückkehren?'))return;showMenu();};
    $('helpButton').onclick=showHelp; $('lanButton').onclick=()=>lanLobby();
    $('orientationButton').onclick=async()=>{
      try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();}catch(_){}
      try{await window.screen.orientation?.lock?.('landscape');}catch(_){}
    };
    window.addEventListener('online',()=>{if(netActive()&&!net.connected)resumeOnline();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&netActive()&&!net.connected)resumeOnline();});
    $('soundButton').onclick=()=>{screen.sound=!screen.sound;
      $('soundButton').textContent=screen.sound?'♫ AN':'♫ AUS';
      try{localStorage.setItem('kk_sound',screen.sound?'on':'off');}catch(_){}
      if(screen.sound)sound(720,.09);
    };
    canvas.addEventListener('pointerdown',e=>{const p=actual();if(screen.mode!=='playing'||screen.busy||!p||!p.human||!p.hp)return;
      const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/W,rect.height/H),imageW=W*scale,imageH=H*scale;
      const x=(e.clientX-rect.left-(rect.width-imageW)/2)/scale;
      const y=(e.clientY-rect.top-(rect.height-imageH)/2)/scale;
      if(x<0||x>W||y<0||y>H)return;
      let a=Math.atan2(p.y-5-y,x-p.x)*180/Math.PI;if(a<0)a+=360;if(a>180)return;
      setControl('angle',clamp(a,5,175));
    });
    window.addEventListener('keydown',e=>{const p=actual();if($('modal').classList.contains('hidden')&&screen.mode==='playing'&&!screen.busy&&p&&p.human){
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){setControl('angle',p.angle+(e.key==='ArrowLeft'?1:-1));e.preventDefault();}
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){setControl('power',p.power+(e.key==='ArrowUp'?1:-1));e.preventDefault();}
      if(e.code==='Space'){fire();e.preventDefault();}
    }});
    try{const settings=JSON.parse(localStorage.getItem('kk_settings')||'null');if(settings){screen.aiDifficulty=['easy','normal','hard'].includes(settings.aiDifficulty)?settings.aiDifficulty:'easy';screen.humans=clamp(settings.humans||2,1,6);screen.bots=clamp(settings.bots??2,0,6-screen.humans);screen.maxRounds=[3,5,7,10].includes(settings.maxRounds)?settings.maxRounds:5;screen.previewPct=[0,25,50,75,100].includes(settings.previewPct)?settings.previewPct:50;
      screen.upgradeMode=['equal','progression'].includes(settings.upgradeMode)?settings.upgradeMode:'equal';
      screen.weaponsRule=['standard','noNuke','classic'].includes(settings.weaponsRule)?settings.weaponsRule:'standard';
      screen.windMode=['calm','normal','strong'].includes(settings.windMode)?settings.windMode:'normal';
      screen.fallDamage=settings.fallDamage!==false;
      if(Array.isArray(settings.seatClasses))screen.seatClasses=screen.seatClasses.map((id,i)=>tanks.some(t=>t.id===settings.seatClasses[i])?settings.seatClasses[i]:id);}}catch(_){}
    try{screen.sound=localStorage.getItem('kk_sound')!=='off';}catch(_){}
    $('soundButton').textContent=screen.sound?'♫ AN':'♫ AUS';
    showMenu();updateControls();renderRoster();requestAnimationFrame(frame);
    // Reloading the tab after an accidental menu/navigation tap should reconnect.
    try{const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
      if(session?.code&&session?.server&&['host','guest'].includes(session.role)){
        Object.assign(net,{role:session.role,room:session.code,server:session.server,limit:session.limit||6,bots:session.bots||0,rounds:session.rounds||3,connected:false});
        setTimeout(resumeOnline,400);
      }
    }catch(_){}
    if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  wire();
  window.KraterkrachDebug={openLAN:()=>lanLobby(),net:()=>({role:net.role,code:net.room,seat:net.seat,connected:net.connected,players:net.players,rounds:net.rounds}),getState:()=>({mode:screen.mode,tab:screen.hqTab,round:screen.round,players:screen.players.map(p=>({name:p.name,hp:p.hp,maxHp:p.maxHp,shield:p.shield,classId:p.classId,upgradeLevel:p.upgradeLevel,nativeShield:p.nativeShield,extraShield:p.extraShield,attack:p.attack,previewBonus:p.previewBonus,maxMove:p.maxMove,moveRemaining:p.moveRemaining,x:p.x,selected:p.selected,ammo:{...p.ammo},cash:p.cash,wins:p.wins})),shots:screen.shots.length,busy:screen.busy,turn:screen.turn,aiDifficulty:screen.aiDifficulty,previewPct:screen.previewPct,upgradeMode:screen.upgradeMode,weaponsRule:screen.weaponsRule,windMode:screen.windMode,fallDamage:screen.fallDamage,sound:screen.sound,profile:JSON.parse(JSON.stringify(profile)),reward:screen.matchReward}),start:()=>startGame(),open:tab=>showHQ(tab),test:{stats:(id,levels)=>tankStats(id,levels),fall:(p,fall)=>fallingDamage(fall,p.resist),tankHeight:TANK_HEIGHT,costs:UPGRADE_COSTS.slice(),effectivePreview:(bonus,base)=>base<=0?0:Math.min(base===100?100:95,base+bonus),weaponAllowed:id=>weaponAllowed(id),setTerrain:(i,y)=>{screen.terrain[i]=y;},settle:()=>settleTanks(),nextTurn:()=>nextTurn(screen.turn),terrain:()=>screen.terrain.slice(),terrainRegenerate:()=>{makeTerrain();repositionPlayers();return screen.terrain.slice();},windEnvelope:()=>actual()?trajectoryEnvelope(actual()):null}};
})();