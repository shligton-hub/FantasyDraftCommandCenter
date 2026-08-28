(()=>{
  if(globalThis.__FDCC_CONTENT__) return;
  globalThis.__FDCC_CONTENT__=true;

  try{
    const bridge=document.createElement('script');
    bridge.src=chrome.runtime.getURL('page-bridge.js');
    bridge.dataset.fdccBridge='1';
    (document.head||document.documentElement).appendChild(bridge);
    bridge.addEventListener('load',()=>bridge.remove());
  }catch{}

  const boot=()=>{
    if(document.getElementById('fdcc-panel')) return;
    const players=globalThis.FDCC_PLAYERS||[];
    const E=globalThis.FDCC;
    if(!players.length||!E){setTimeout(boot,50);return;}

    const state={slot:1,autosync:'on',status:{},history:[],pick:1,seen:new Set(),seenSignals:new Set(),idToName:{},diagnostics:{dom:0,network:0,matched:0,resolvedIds:0,pagePick:0}};
    const panel=document.createElement('aside');
    panel.id='fdcc-panel';
    panel.innerHTML=`
      <div class="toprow"><div><h2>Draft Command Center</h2><div class="muted" id="fdcc-sub">Loading settings…</div></div><button class="close" id="fdcc-close">×</button></div>
      <section><div class="toprow"><strong id="fdcc-clock">Pick 1.01</strong><span id="fdcc-next" class="muted"></span></div><div id="fdcc-sync" class="mini">Auto-sync starting…</div><div id="fdcc-diag" class="mini"></div><div class="actions"><button id="fdcc-resync">Re-sync ESPN</button><button id="fdcc-reset">Reset draft</button></div></section>
      <section><strong>Best available</strong><div id="fdcc-recs"></div></section>
      <section><strong>Rapid mode</strong><div class="mini">Type a player. Enter = Other. Click Mine for your selection.</div><div class="actions"><input id="fdcc-search" placeholder="e.g. Bijan"><button class="mine" id="fdcc-mine">Mine</button></div><div id="fdcc-match" class="mini"></div></section>
      <section><strong>Bulk catch-up</strong><textarea id="fdcc-bulk" placeholder="Paste one drafted player per line"></textarea><button id="fdcc-process">Process picks</button></section>
      <section><div class="toprow"><strong>My roster</strong><button id="fdcc-undo">Undo</button></div><div class="roster" id="fdcc-roster"></div></section>
      <div class="status" id="fdcc-status" aria-live="polite"></div>`;
    document.documentElement.appendChild(panel);
    const $=s=>panel.querySelector(s);

    chrome.storage.local.get({fdccSlot:1,fdccAutosync:'on',fdccDraftState:null},v=>{
      state.slot=Number(v.fdccSlot)||1; state.autosync=v.fdccAutosync||'on';
      if(v.fdccDraftState){
        state.status=v.fdccDraftState.status||{}; state.history=v.fdccDraftState.history||[]; state.pick=Number(v.fdccDraftState.pick)||1;
        state.seen=new Set(v.fdccDraftState.seen||[]); state.seenSignals=new Set(v.fdccDraftState.seenSignals||[]); state.idToName=v.fdccDraftState.idToName||{};
      }
      syncPagePick(); render(); startObservers();
    });

    function save(){chrome.storage.local.set({fdccDraftState:{slot:state.slot,autosync:state.autosync,status:state.status,history:state.history,pick:state.pick,seen:[...state.seen],seenSignals:[...state.seenSignals],idToName:state.idToName}})}
    function labelPick(n){const r=Math.floor((n-1)/12)+1,p=(n-1)%12+1;return `${r}.${String(p).padStart(2,'0')}`}
    function setStatus(t,warn=false){const el=$('#fdcc-status');el.textContent=t;el.className='status'+(warn?' warning':'')}
    function ownerAt(pick){return E.teamAtPick(pick)===state.slot?'mine':'other'}
    function playerByName(name){return E.matchPlayer(name,players.filter(p=>!state.status[p.id]))}
    function markAt(p,owner='other',source='manual',pickNo=null){
      if(!p||state.status[p.id])return false;
      const n=pickNo||state.pick; state.status[p.id]=owner; state.history.push({id:p.id,owner,pick:n,source}); state.seen.add(E.normalize(p.name)); state.diagnostics.matched++;
      if(!pickNo||n>=state.pick)state.pick=n+1; save(); render(); return true;
    }
    function mark(p,owner='other',source='manual'){return markAt(p,owner,source,null)}
    function undo(){const h=state.history.pop();if(!h)return setStatus('Nothing to undo.');delete state.status[h.id];state.pick=Math.max(1,h.pick);const p=players.find(x=>x.id===h.id);if(p)state.seen.delete(E.normalize(p.name));save();render();}
    function resetDraft(){state.status={};state.history=[];state.pick=1;state.seen.clear();state.seenSignals.clear();state.idToName={};state.diagnostics.matched=0;syncPagePick();save();render();setStatus('Draft state reset and re-synced to ESPN.')}
    function currentMatch(){return playerByName($('#fdcc-search').value)}
    function rapid(owner){const p=currentMatch();if(!p)return setStatus('No available player match.',true);mark(p,owner,'rapid');$('#fdcc-search').value='';$('#fdcc-match').textContent='';$('#fdcc-search').focus();}
    function processBulk(){const lines=$('#fdcc-bulk').value.split(/\n|,/).map(x=>x.trim()).filter(Boolean);let done=0;for(const line of lines){const p=playerByName(line);if(p&&mark(p,ownerAt(state.pick),'bulk'))done++;}$('#fdcc-bulk').value='';setStatus(`${done} picks processed.`)}

    function render(){
      $('#fdcc-sub').textContent=`12-team PPR • slot ${state.slot} • auto-sync ${state.autosync}`;
      $('#fdcc-clock').textContent=`Current ${labelPick(state.pick)}`;const np=E.nextPickForSlot(state.pick,state.slot);$('#fdcc-next').textContent=np?`You: ${np===state.pick?'ON CLOCK':`in ${np-state.pick} picks`}`:'Draft complete';
      $('#fdcc-diag').textContent=`Signals: DOM ${state.diagnostics.dom} • network ${state.diagnostics.network} • matched ${state.diagnostics.matched} • IDs ${state.diagnostics.resolvedIds} • ESPN pick ${state.diagnostics.pagePick||'—'}`;
      const recs=E.recommend(players,state.status,state.pick,state.slot).slice(0,5),box=$('#fdcc-recs');box.innerHTML='';
      recs.forEach((p,i)=>{const d=document.createElement('div');d.className='rec'+(i===0?' best':'');d.innerHTML=`<span class="score">${p.score}</span><strong>${i+1}. ${p.name}</strong><div class="mini">${p.pos} • ${p.team} • rank ${p.rank}</div><div class="mini">Make-it-back estimate: ${p.returnChance}%</div><div class="bar"><span style="width:${p.returnChance}%"></span></div>`;box.appendChild(d)});
      const mine=players.filter(p=>state.status[p.id]==='mine'),c=E.counts(mine),flexPool=mine.filter(p=>['RB','WR','TE'].includes(p.pos)).length;
      const slots=[['QB',c.QB],['RB',c.RB],['WR',c.WR],['TE',c.TE],['FLEX',Math.max(0,flexPool-5)],['DST',c.DST],['K',c.K],['BENCH',Math.max(0,mine.length-9)],['IR',0]];$('#fdcc-roster').innerHTML=slots.map(([k,v])=>`<div class="pill"><strong>${k}</strong> ${v}</div>`).join('');
    }

    function syncPagePick(){
      const text=(document.body?.innerText||'').slice(0,30000);
      const patterns=[/ON THE CLOCK:\s*PICK\s*(\d+)/i,/\bPICK\s*(\d+)\b/i,/overall\s*pick\s*#?\s*(\d+)/i];
      let n=0;for(const re of patterns){const m=text.match(re);if(m){n=Number(m[1]);if(n)break;}}
      if(n){state.diagnostics.pagePick=n; if(Math.abs(state.pick-n)>1)state.pick=n; render(); save();}
      return n;
    }

    function namesInText(text){const norm=E.normalize(text);if(!norm)return[];return players.filter(p=>!state.status[p.id]&&norm.includes(E.normalize(p.name))).slice(0,10)}
    function processDomNode(node){if(!(node instanceof Element))return;const text=(node.innerText||node.textContent||'').trim();if(!text||text.length>1200)return;const names=namesInText(text);if(!names.length)return;state.diagnostics.dom++;
      const identity=`${node.id||''} ${node.className||''} ${node.getAttribute('data-testid')||''} ${node.getAttribute('aria-label')||''}`;
      const clue=/drafted|selected|selection|pick\s*#?|round\s*\d|on the clock/i.test(text+' '+identity);
      if(clue&&names.length===1){const pickMatch=(text+' '+identity).match(/(?:pick|overall)\s*#?\s*(\d+)/i);const pickNo=pickMatch?Number(pickMatch[1]):null;const p=names[0];markAt(p,pickNo?ownerAt(pickNo):ownerAt(state.pick),'espn-dom',pickNo)}
      render();
    }

    const nameKeys=['fullName','displayName','playerName','athleteName','name'];
    const idKeys=['playerId','athleteId','proPlayerId','draftedPlayerId','draftedAthleteId','id'];
    const pickKeys=['overallPickNumber','overallPick','pickNumber','pick','draftPickNumber','selectionNumber'];
    function rememberIdentity(obj){
      if(!obj||typeof obj!=='object'||Array.isArray(obj))return;
      let name='';for(const k of nameKeys){if(typeof obj[k]==='string'&&obj[k].trim().includes(' ')){name=obj[k].trim();break;}}
      if(!name&&typeof obj.firstName==='string'&&typeof obj.lastName==='string')name=`${obj.firstName} ${obj.lastName}`.trim();
      if(!name)return;
      const p=E.matchPlayer(name,players);if(!p)return;
      for(const k of idKeys){const v=obj[k];if(v!==undefined&&v!==null&&String(v).length<30){state.idToName[String(v)]=p.name;state.diagnostics.resolvedIds++;}}
    }
    function pickNumberFrom(obj){for(const k of pickKeys){const v=Number(obj?.[k]);if(v>0&&v<=180)return v;}return null}
    function referencedPlayer(obj){
      for(const k of nameKeys){if(typeof obj?.[k]==='string'){const p=E.matchPlayer(obj[k],players);if(p)return p;}}
      if(typeof obj?.firstName==='string'&&typeof obj?.lastName==='string'){const p=E.matchPlayer(`${obj.firstName} ${obj.lastName}`,players);if(p)return p;}
      for(const k of idKeys){const v=obj?.[k];if(v!==undefined&&v!==null){const mapped=state.idToName[String(v)];if(mapped){const p=E.matchPlayer(mapped,players);if(p)return p;}}}
      return null;
    }
    function looksLikePick(obj){if(!obj||typeof obj!=='object'||Array.isArray(obj))return false;const keys=Object.keys(obj).join(' ');return /overall.*pick|pick.*number|draft.*pick|selection|drafted|draftedPlayer|draftedAthlete/i.test(keys)}
    function walkPayload(value,depth=0,picks=[]){
      if(value==null||depth>10)return picks;
      if(Array.isArray(value)){for(const v of value)walkPayload(v,depth+1,picks);return picks}
      if(typeof value!=='object')return picks;
      rememberIdentity(value);
      if(looksLikePick(value)){const p=referencedPlayer(value);const n=pickNumberFrom(value);if(p)picks.push({p,n});}
      for(const v of Object.values(value))walkPayload(v,depth+1,picks);
      return picks;
    }
    function handleNetwork(text){
      state.diagnostics.network++;
      let raw=text;try{const outer=JSON.parse(text);raw=outer.body||outer.text||text;}catch{}
      let obj=null;try{obj=typeof raw==='string'?JSON.parse(raw):raw}catch{}
      if(!obj){render();return;}
      const picks=walkPayload(obj);const uniq=new Map();for(const x of picks){const key=`${x.n||'x'}:${x.p.id}`;uniq.set(key,x)}
      const ordered=[...uniq.values()].sort((a,b)=>(a.n||999)-(b.n||999));let caught=0;
      for(const x of ordered){if(state.status[x.p.id])continue;const n=x.n;const owner=n?ownerAt(n):ownerAt(state.pick);if(markAt(x.p,owner,'espn-network',n))caught++;}
      syncPagePick();
      if(caught){$('#fdcc-sync').textContent=`ESPN sync caught ${caught} pick${caught===1?'':'s'}.`;setStatus(`Auto-sync updated ${caught} selection${caught===1?'':'s'}.`)}else $('#fdcc-sync').textContent='Connected to ESPN; resolving draft selections…';
      render();
    }

    function startObservers(){
      window.addEventListener('message',ev=>{if(ev.source===window&&ev.data?.source==='FDCC_PAGE_BRIDGE')handleNetwork(ev.data.text||'')});
      const obs=new MutationObserver(muts=>{for(const m of muts){for(const n of m.addedNodes)processDomNode(n);if(m.type==='characterData'&&m.target?.parentElement)processDomNode(m.target.parentElement)}syncPagePick()});
      const target=document.body||document.documentElement;obs.observe(target,{subtree:true,childList:true,characterData:true});
      setInterval(()=>{syncPagePick();const sels=['[aria-live]','[class*="history" i]','[class*="pick" i]','[class*="draft" i]'];for(const s of sels){try{[...document.querySelectorAll(s)].slice(-80).forEach(processDomNode)}catch{}}},1200);
    }

    $('#fdcc-search').addEventListener('input',()=>{const p=currentMatch();$('#fdcc-match').textContent=p?`Match: ${p.name} • ${p.pos} • ${p.team}`:''});
    $('#fdcc-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();rapid('other')}});$('#fdcc-mine').addEventListener('click',()=>rapid('mine'));$('#fdcc-process').addEventListener('click',processBulk);$('#fdcc-undo').addEventListener('click',undo);$('#fdcc-reset').addEventListener('click',resetDraft);$('#fdcc-resync').addEventListener('click',()=>{syncPagePick();setStatus('Forced ESPN re-sync.');});$('#fdcc-close').addEventListener('click',()=>panel.remove());
  };

  if(document.documentElement)boot();else document.addEventListener('readystatechange',boot,{once:true});
})();
