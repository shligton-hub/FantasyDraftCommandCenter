(()=>{
  if(globalThis.__FDCC_CONTENT__) return;
  globalThis.__FDCC_CONTENT__=true;

  // Inject into ESPN's page context before its app finishes booting so we can observe
  // fetch/XHR/WebSocket draft traffic. Content scripts run in an isolated world.
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

    const state={slot:1,autosync:'on',status:{},history:[],pick:1,seen:new Set(),seenSignals:new Set(),diagnostics:{dom:0,network:0,matched:0}};
    const panel=document.createElement('aside');
    panel.id='fdcc-panel';
    panel.innerHTML=`
      <div class="toprow"><div><h2>Draft Command Center</h2><div class="muted" id="fdcc-sub">Loading settings…</div></div><button class="close" id="fdcc-close" title="Hide">×</button></div>
      <section><div class="toprow"><strong id="fdcc-clock">Pick 1.01</strong><span id="fdcc-next" class="muted"></span></div><div id="fdcc-sync" class="mini">Auto-sync starting…</div><div id="fdcc-diag" class="mini"></div></section>
      <section><strong>Best available</strong><div id="fdcc-recs"></div></section>
      <section><strong>Rapid mode</strong><div class="mini">Type a player. Enter = Other. Click Mine for your selection.</div><div class="actions"><input id="fdcc-search" placeholder="e.g. Bijan"><button class="mine" id="fdcc-mine">Mine</button></div><div id="fdcc-match" class="mini"></div></section>
      <section><strong>Bulk catch-up</strong><textarea id="fdcc-bulk" placeholder="Paste one drafted player per line"></textarea><button id="fdcc-process">Process picks</button></section>
      <section><div class="toprow"><strong>My roster</strong><button id="fdcc-undo">Undo</button></div><div class="roster" id="fdcc-roster"></div></section>
      <div class="status" id="fdcc-status" aria-live="polite"></div>`;
    document.documentElement.appendChild(panel);
    const $=s=>panel.querySelector(s);

    chrome.storage.local.get({fdccSlot:1,fdccAutosync:'on',fdccDraftState:null},v=>{
      state.slot=Number(v.fdccSlot)||1;
      state.autosync=v.fdccAutosync||'on';
      if(v.fdccDraftState){
        state.status=v.fdccDraftState.status||{};
        state.history=v.fdccDraftState.history||[];
        state.pick=Number(v.fdccDraftState.pick)||1;
        state.seen=new Set(v.fdccDraftState.seen||[]);
        state.seenSignals=new Set(v.fdccDraftState.seenSignals||[]);
      }
      render();
      startObservers();
    });

    function save(){
      chrome.storage.local.set({fdccDraftState:{slot:state.slot,autosync:state.autosync,status:state.status,history:state.history,pick:state.pick,seen:[...state.seen],seenSignals:[...state.seenSignals]}});
    }
    function labelPick(n){const r=Math.floor((n-1)/12)+1,p=(n-1)%12+1;return `${r}.${String(p).padStart(2,'0')}`}
    function setStatus(t,warn=false){const el=$('#fdcc-status');el.textContent=t;el.className='status'+(warn?' warning':'')}
    function ownerForCurrentPick(){return E.teamAtPick(state.pick)===state.slot?'mine':'other'}
    function mark(p,owner='other',source='manual'){
      if(!p||state.status[p.id])return false;
      state.status[p.id]=owner;
      state.history.push({id:p.id,owner,pick:state.pick,source});
      state.pick++;
      state.seen.add(E.normalize(p.name));
      state.diagnostics.matched++;
      save();render();return true;
    }
    function undo(){
      const h=state.history.pop();
      if(!h)return setStatus('Nothing to undo.');
      delete state.status[h.id];state.pick=Math.max(1,h.pick);
      const p=players.find(x=>x.id===h.id);if(p)state.seen.delete(E.normalize(p.name));
      save();render();setStatus(`Undid ${p?p.name:'last pick'}.`);
    }
    function currentMatch(){return E.matchPlayer($('#fdcc-search').value,players.filter(p=>!state.status[p.id]))}
    function rapid(owner){
      const p=currentMatch();if(!p)return setStatus('No available player match.',true);
      mark(p,owner,'rapid');$('#fdcc-search').value='';$('#fdcc-match').textContent='';$('#fdcc-search').focus();setStatus(`${p.name} → ${owner==='mine'?'MY TEAM':'other team'}`);
    }
    function processBulk(){
      const lines=$('#fdcc-bulk').value.split(/\n|,/).map(x=>x.trim()).filter(Boolean);let done=0,miss=[];
      for(const line of lines){const p=E.matchPlayer(line,players.filter(x=>!state.status[x.id]));if(p&&mark(p,ownerForCurrentPick(),'bulk'))done++;else miss.push(line)}
      $('#fdcc-bulk').value='';setStatus(`${done} picks processed${miss.length?`; not matched: ${miss.join(', ')}`:''}`,!!miss.length);
    }
    function render(){
      $('#fdcc-sub').textContent=`12-team PPR • slot ${state.slot} • auto-sync ${state.autosync}`;
      $('#fdcc-clock').textContent=`Current ${labelPick(state.pick)}`;
      const np=E.nextPickForSlot(state.pick,state.slot);$('#fdcc-next').textContent=np?`You: ${np===state.pick?'ON CLOCK':`in ${np-state.pick} picks`}`:'Draft complete';
      $('#fdcc-diag').textContent=`Signals: DOM ${state.diagnostics.dom} • network ${state.diagnostics.network} • matched ${state.diagnostics.matched}`;
      const recs=E.recommend(players,state.status,state.pick,state.slot).slice(0,5),box=$('#fdcc-recs');box.innerHTML='';
      recs.forEach((p,i)=>{const d=document.createElement('div');d.className='rec'+(i===0?' best':'');d.innerHTML=`<span class="score">${p.score}</span><strong>${i+1}. ${p.name}</strong><div class="mini">${p.pos} • ${p.team} • rank ${p.rank}</div><div class="mini">Make-it-back estimate: ${p.returnChance}%</div><div class="bar"><span style="width:${p.returnChance}%"></span></div>`;box.appendChild(d)});
      const mine=players.filter(p=>state.status[p.id]==='mine'),c=E.counts(mine),flexPool=mine.filter(p=>['RB','WR','TE'].includes(p.pos)).length;
      const slots=[['QB',c.QB],['RB',c.RB],['WR',c.WR],['TE',c.TE],['FLEX',Math.max(0,flexPool-5)],['DST',c.DST],['K',c.K],['BENCH',Math.max(0,mine.length-9)],['IR',0]];
      $('#fdcc-roster').innerHTML=slots.map(([k,v])=>`<div class="pill"><strong>${k}</strong> ${v}</div>`).join('');
    }

    function available(){return players.filter(p=>!state.status[p.id])}
    function exactNamesInText(text){
      const norm=E.normalize(text);if(!norm)return [];
      return available().filter(p=>{const n=E.normalize(p.name);return n.length>=5&&norm.includes(n)});
    }
    function processSignal(text,source,strict=true){
      if(state.autosync!=='on'||!text)return 0;
      const cleaned=String(text).replace(/\s+/g,' ').trim();
      if(cleaned.length<4||cleaned.length>15000)return 0;
      const key=source+':'+E.normalize(cleaned.slice(0,1200));
      if(state.seenSignals.has(key))return 0;
      const picks=exactNamesInText(cleaned);
      if(!picks.length)return 0;
      const clue=/(drafted|selected|selection|picked|pick\s*#|overall\s*pick|round\s*\d|\b\d{1,2}[\.\-]\d{1,2}\b|on the clock)/i.test(cleaned);
      if(strict&&!clue)return 0;
      // A true ESPN activity row normally contains one selected player. If a payload
      // contains many players, do not mass-remove the available-player pool.
      if(picks.length>3)return 0;
      state.seenSignals.add(key);
      let n=0;
      for(const p of picks){if(mark(p,ownerForCurrentPick(),source))n++}
      if(n){setStatus(`Auto-sync: ${picks.slice(0,n).map(p=>p.name).join(', ')}`);$('#fdcc-sync').textContent=`Tracking ESPN via ${source}.`}
      return n;
    }

    function inspectAddedNode(node){
      if(!(node instanceof Element))return;
      const text=(node.innerText||node.textContent||'').trim();
      if(!text||text.length>1200)return;
      const identity=`${node.id||''} ${node.className||''} ${node.getAttribute('data-testid')||''} ${node.getAttribute('aria-label')||''}`;
      const parent=node.closest?.('[class*="draft" i],[class*="pick" i],[class*="activity" i],[class*="history" i],[class*="selection" i],[data-testid*="draft" i],[data-testid*="pick" i],[aria-label*="draft" i]');
      const context=((parent&&parent!==node?(parent.innerText||''):'')+' '+identity+' '+text).slice(0,1500);
      const names=exactNamesInText(text);
      if(!names.length)return;
      state.diagnostics.dom++;
      // Strong context path.
      if(parent||/draft|pick|activity|history|selection/i.test(identity))processSignal(context,'espn-dom',true);
      // Some ESPN activity rows are bare: "1.04 Player Name". Accept only one player
      // plus an explicit pick/round token to avoid confusing the available-player list.
      else if(names.length===1&&/(\b\d{1,2}[\.\-]\d{1,2}\b|round\s*\d|pick\s*#?\s*\d)/i.test(text))processSignal(text,'espn-dom-row',false);
      render();
    }

    function walkNetworkObject(value,depth=0,out=[]){
      if(depth>7||out.length>40||value==null)return out;
      if(Array.isArray(value)){for(const v of value)walkNetworkObject(v,depth+1,out);return out}
      if(typeof value!=='object')return out;
      const keys=Object.keys(value),keyText=keys.join(' ');
      const strong=/overall.*pick|pick.*number|draft.*pick|selection|drafted|pickId|draftPosition/i.test(keyText);
      if(strong){try{const s=JSON.stringify(value);if(s.length<12000)out.push(s)}catch{}}
      for(const k of keys)walkNetworkObject(value[k],depth+1,out);
      return out;
    }

    function handleNetwork(text){
      state.diagnostics.network++;render();
      let payload=text;
      try{
        const outer=JSON.parse(text);payload=outer.body||outer.text||text;
        if(typeof payload!=='string')payload=JSON.stringify(payload);
      }catch{}
      let pieces=[];
      try{pieces=walkNetworkObject(JSON.parse(payload))}catch{}
      if(!pieces.length){
        // Fallback only if the raw event itself looks like a selection event.
        if(/overall.*pick|pick.*number|drafted|selection/i.test(payload))pieces=[payload.slice(0,15000)];
      }
      let caught=0;for(const piece of pieces)caught+=processSignal(piece,'espn-network',true);
      if(caught)$('#fdcc-sync').textContent='Auto-sync connected to ESPN draft traffic.';
    }

    function startObservers(){
      window.addEventListener('message',ev=>{
        if(ev.source!==window||!ev.data||ev.data.source!=='FDCC_PAGE_BRIDGE')return;
        handleNetwork(ev.data.text||'');
      });
      const obs=new MutationObserver(muts=>{
        for(const m of muts){
          for(const n of m.addedNodes)inspectAddedNode(n);
          if(m.type==='characterData'&&m.target?.parentElement)inspectAddedNode(m.target.parentElement);
        }
      });
      const target=document.body||document.documentElement;obs.observe(target,{subtree:true,childList:true,characterData:true});
      // Scan live-region / activity areas periodically in case ESPN updates existing nodes.
      setInterval(()=>{
        if(state.autosync!=='on')return;
        const selectors=['[aria-live]','[class*="activity" i]','[class*="history" i]','[class*="pick" i]','[data-testid*="pick" i]'];
        const nodes=[];for(const s of selectors){try{nodes.push(...document.querySelectorAll(s))}catch{}}
        [...new Set(nodes)].slice(-120).forEach(inspectAddedNode);
        if(!state.history.length&&state.diagnostics.dom===0&&state.diagnostics.network===0)$('#fdcc-sync').textContent='Watching ESPN. No draft signals seen yet.';
      },1500);
    }

    $('#fdcc-search').addEventListener('input',()=>{const p=currentMatch();$('#fdcc-match').textContent=p?`Match: ${p.name} • ${p.pos} • ${p.team}`:''});
    $('#fdcc-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();rapid('other')}});
    $('#fdcc-mine').addEventListener('click',()=>rapid('mine'));
    $('#fdcc-process').addEventListener('click',processBulk);
    $('#fdcc-undo').addEventListener('click',undo);
    $('#fdcc-close').addEventListener('click',()=>panel.remove());
  };

  if(document.documentElement)boot();else document.addEventListener('readystatechange',boot,{once:true});
})();
