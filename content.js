(()=>{
  if(globalThis.__FDCC_MANUAL__) return;
  globalThis.__FDCC_MANUAL__=true;

  const boot=()=>{
    if(document.getElementById('fdcc-panel')) return;
    const players=globalThis.FDCC_PLAYERS||[];
    const E=globalThis.FDCC;
    if(!players.length||!E){setTimeout(boot,50);return;}

    const state={slot:1,status:{},history:[],pick:1,search:'',pos:'ALL'};
    const panel=document.createElement('aside');
    panel.id='fdcc-panel';
    panel.innerHTML=`
      <div class="toprow">
        <div><h2>Draft Command Center</h2><div class="muted">Manual draft mode</div></div>
        <button class="close" id="fdcc-close" title="Hide">×</button>
      </div>

      <section class="pick-summary">
        <div><span class="mini">CURRENT PICK</span><strong id="fdcc-clock">1.01</strong></div>
        <div><span class="mini">YOUR NEXT PICK</span><strong id="fdcc-next">—</strong></div>
      </section>

      <section>
        <div class="section-head"><strong>Best recommendations</strong><span class="mini">updates after every selection</span></div>
        <div id="fdcc-recs"></div>
      </section>

      <section>
        <div class="section-head"><strong>Select drafted player</strong><span id="fdcc-available-count" class="mini"></span></div>
        <div class="filters">
          <input id="fdcc-search" autocomplete="off" placeholder="Search player name…">
          <select id="fdcc-pos" aria-label="Filter by position">
            <option value="ALL">All</option><option>QB</option><option>RB</option><option>WR</option><option>TE</option><option>DST</option><option>K</option>
          </select>
        </div>
        <div class="mini helper">Click <b>Other</b> when another team drafts him, or <b>Mine</b> when you draft him.</div>
        <div id="fdcc-board" class="player-board"></div>
      </section>

      <section>
        <div class="section-head"><strong>My roster</strong><span id="fdcc-roster-count" class="mini"></span></div>
        <div id="fdcc-myplayers" class="myplayers"></div>
      </section>

      <section class="footer-actions">
        <button id="fdcc-undo">Undo last</button>
        <button id="fdcc-reset">Reset draft</button>
      </section>
      <div class="status" id="fdcc-status" aria-live="polite"></div>`;
    document.documentElement.appendChild(panel);
    const $=s=>panel.querySelector(s);

    chrome.storage.local.get({fdccSlot:1,fdccDraftState:null},v=>{
      state.slot=Number(v.fdccSlot)||1;
      const saved=v.fdccDraftState;
      if(saved){state.status=saved.status||{};state.history=saved.history||[];state.pick=Number(saved.pick)||1;}
      render();
    });

    function save(){chrome.storage.local.set({fdccDraftState:{slot:state.slot,status:state.status,history:state.history,pick:state.pick}})}
    function labelPick(n){const r=Math.floor((n-1)/12)+1,p=(n-1)%12+1;return `${r}.${String(p).padStart(2,'0')}`}
    function setStatus(t,warn=false){const el=$('#fdcc-status');el.textContent=t;el.className='status'+(warn?' warning':'')}
    function mark(p,owner){
      if(!p||state.status[p.id])return;
      const pickNo=state.pick;
      state.status[p.id]=owner;
      state.history.push({id:p.id,owner,pick:pickNo});
      state.pick++;
      save();render();
      setStatus(`${labelPick(pickNo)} • ${p.name} → ${owner==='mine'?'MY TEAM':'other team'}`);
      $('#fdcc-search').focus();
    }
    function undo(){
      const h=state.history.pop();
      if(!h)return setStatus('Nothing to undo.',true);
      delete state.status[h.id];state.pick=Math.max(1,h.pick);save();render();
      const p=players.find(x=>x.id===h.id);setStatus(`Undid ${p?.name||'last pick'}.`);
    }
    function reset(){
      if(!confirm('Reset all draft selections?'))return;
      state.status={};state.history=[];state.pick=1;state.search='';state.pos='ALL';
      $('#fdcc-search').value='';$('#fdcc-pos').value='ALL';save();render();setStatus('Draft reset.');
    }

    function recommendationReason(p,index){
      const mine=players.filter(x=>state.status[x.id]==='mine');
      const c=E.counts(mine);const round=Math.floor((state.pick-1)/12)+1;
      if(index===0&&p.pos==='RB'&&c.RB<2)return 'Priority RB value + starting need';
      if(index===0&&p.pos==='WR'&&c.WR<2)return 'Priority PPR WR value + starting need';
      if(p.pos==='QB'&&c.QB===0&&round>=4)return 'Strong QB value at this stage';
      if(p.pos==='TE'&&c.TE===0)return 'Best TE value on the board';
      if(['RB','WR'].includes(p.pos)&&mine.length>=7)return 'High-upside depth / FLEX value';
      return 'Best combination of rank, need and positional value';
    }

    function render(){
      $('#fdcc-clock').textContent=labelPick(state.pick);
      const next=E.nextPickForSlot(state.pick,state.slot);
      $('#fdcc-next').textContent=next?(next===state.pick?'ON CLOCK':`${labelPick(next)} • ${next-state.pick} away`):'Complete';

      const recs=E.recommend(players,state.status,state.pick,state.slot).slice(0,5);
      $('#fdcc-recs').innerHTML=recs.map((p,i)=>`
        <div class="rec ${i===0?'best':''}">
          <div class="rec-top"><span class="rec-rank">${i+1}</span><div class="rec-name"><strong>${p.name}</strong><span>${p.pos} • ${p.team} • board #${p.rank}</span></div><span class="score">${p.score}</span></div>
          <div class="reason">${recommendationReason(p,i)}</div>
          <div class="mini">Chance he makes it back: ${p.returnChance}%</div>
        </div>`).join('');

      const available=players.filter(p=>!state.status[p.id]);
      const q=E.normalize(state.search);
      const filtered=available.filter(p=>(state.pos==='ALL'||p.pos===state.pos)&&(!q||E.normalize(p.name).includes(q))).slice(0,60);
      $('#fdcc-available-count').textContent=`${available.length} available`;
      $('#fdcc-board').innerHTML=filtered.length?filtered.map(p=>`
        <div class="player-row" data-id="${p.id}">
          <div class="player-meta"><strong>${p.name}</strong><span>#${p.rank} • ${p.pos} • ${p.team}</span></div>
          <div class="pick-buttons"><button class="other" data-owner="other">Other</button><button class="mine" data-owner="mine">Mine</button></div>
        </div>`).join(''):`<div class="empty">No available players match.</div>`;

      $('#fdcc-board').querySelectorAll('.player-row button').forEach(btn=>btn.addEventListener('click',()=>{
        const row=btn.closest('.player-row');const p=players.find(x=>x.id===Number(row.dataset.id));mark(p,btn.dataset.owner);
      }));

      const mine=state.history.filter(h=>h.owner==='mine').map(h=>({h,p:players.find(x=>x.id===h.id)})).filter(x=>x.p);
      $('#fdcc-roster-count').textContent=`${mine.length}/15 drafted`;
      $('#fdcc-myplayers').innerHTML=mine.length?mine.map(({h,p})=>`<div class="roster-row"><span>${labelPick(h.pick)}</span><strong>${p.name}</strong><em>${p.pos}</em></div>`).join(''):`<div class="empty">Your picks will appear here.</div>`;
    }

    $('#fdcc-search').addEventListener('input',e=>{state.search=e.target.value;render();});
    $('#fdcc-pos').addEventListener('change',e=>{state.pos=e.target.value;render();});
    $('#fdcc-undo').addEventListener('click',undo);
    $('#fdcc-reset').addEventListener('click',reset);
    $('#fdcc-close').addEventListener('click',()=>panel.remove());
  };

  if(document.documentElement)boot();else document.addEventListener('readystatechange',boot,{once:true});
})();