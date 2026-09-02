(()=>{
  const players=globalThis.FDCC_PLAYERS||[];
  const E=globalThis.FDCC;
  if(!players.length||!E)return;

  const state={slot:3,status:{},history:[],pick:1,filter:'ALL',search:''};
  const els={
    slot:document.getElementById('slot'),undo:document.getElementById('undo'),reset:document.getElementById('reset'),
    currentPick:document.getElementById('currentPick'),nextPick:document.getElementById('nextPick'),picksAway:document.getElementById('picksAway'),draftedCount:document.getElementById('draftedCount'),
    recommendations:document.getElementById('recommendations'),rosterSummary:document.getElementById('rosterSummary'),myRoster:document.getElementById('myRoster'),
    search:document.getElementById('search'),filters:document.getElementById('filters'),playerRows:document.getElementById('playerRows'),history:document.getElementById('history')
  };

  for(let i=1;i<=12;i++){const o=document.createElement('option');o.value=i;o.textContent=`Pick ${i}`;els.slot.appendChild(o)}

  function save(){localStorage.setItem('fdcc-web-state',JSON.stringify({slot:state.slot,status:state.status,history:state.history,pick:state.pick}))}
  function load(){try{const raw=JSON.parse(localStorage.getItem('fdcc-web-state')||'null');if(raw){state.slot=Number(raw.slot)||3;state.status=raw.status||{};state.history=Array.isArray(raw.history)?raw.history:[];state.pick=Number(raw.pick)||1}}catch{}}
  function pickLabel(n){const round=Math.floor((n-1)/12)+1;const slot=(n-1)%12+1;return `${round}.${String(slot).padStart(2,'0')}`}
  function mine(){return players.filter(p=>state.status[p.id]==='mine')}
  function mark(p,owner){if(!p||state.status[p.id])return;state.status[p.id]=owner;state.history.push({id:p.id,owner,pick:state.pick});state.pick=Math.min(181,state.pick+1);state.search='';els.search.value='';save();render();requestAnimationFrame(()=>els.search.focus())}
  function undo(){const h=state.history.pop();if(!h)return;delete state.status[h.id];state.pick=Math.max(1,h.pick);save();render()}
  function reset(){if(!confirm('Reset the entire draft board?'))return;state.status={};state.history=[];state.pick=1;state.search='';els.search.value='';save();render()}

  function recommendationReason(p,myPlayers){
    const counts=E.counts(myPlayers);const round=Math.floor((state.pick-1)/12)+1;const reasons=[];const flexEligible=myPlayers.filter(x=>['RB','WR','TE'].includes(x.pos)).length;
    if(p.pos==='WR')reasons.push('full-PPR volume boost');
    if(p.pos==='RB'&&counts.RB<2)reasons.push('fills starting RB');
    if(p.pos==='WR'&&counts.WR<2)reasons.push('fills starting WR');
    if(p.pos==='QB'&&counts.QB===0&&round>=3)reasons.push('6-pt TD QB value');
    if(p.pos==='TE'&&counts.TE===0)reasons.push('starting TE need');
    if(['RB','WR','TE'].includes(p.pos)&&flexEligible<6)reasons.push('fills FLEX pool');
    if(['RB','WR'].includes(p.pos)&&myPlayers.length>=7)reasons.push('PPR bench upside');
    if(p.rank<=state.pick+4)reasons.push('strong value vs board');
    if(p.returnChance<=25)reasons.push('unlikely to make it back');
    if(!reasons.length)reasons.push('best blend of value and roster fit');
    return reasons.slice(0,2).join(' • ');
  }

  function renderStatus(){
    const next=E.nextPickForSlot(state.pick,state.slot);
    els.currentPick.textContent=state.pick<=180?pickLabel(state.pick):'Complete';
    els.nextPick.textContent=next?pickLabel(next):'—';
    els.picksAway.textContent=next?Math.max(0,next-state.pick):'—';
    els.draftedCount.textContent=`${Object.keys(state.status).length} / 180`;
    els.slot.value=String(state.slot);
  }

  function actionButtons(p){
    const wrap=document.createElement('div');wrap.className='actions-cell';
    const other=document.createElement('button');other.type='button';other.className='other-btn';other.textContent='Other';other.addEventListener('click',()=>mark(p,'other'));
    const mineBtn=document.createElement('button');mineBtn.type='button';mineBtn.className='mine-btn';mineBtn.textContent='Mine';mineBtn.addEventListener('click',()=>mark(p,'mine'));
    wrap.append(other,mineBtn);return wrap;
  }

  function renderRecommendations(){
    const myPlayers=mine();const recs=E.recommend(players,state.status,state.pick,state.slot).slice(0,5);els.recommendations.innerHTML='';
    if(!recs.length){els.recommendations.innerHTML='<div class="empty">No available players remain on the board.</div>';return}
    recs.forEach((p,i)=>{
      const d=document.createElement('div');d.className='rec';
      d.innerHTML=`<div class="rec-rank">${i+1}</div><div><div class="rec-name">${p.name}</div><div class="rec-meta">${p.pos} • ${p.team} • rank ${p.rank}</div><div class="rec-reason">${recommendationReason(p,myPlayers)}</div></div><div class="rec-score"><strong>${p.score}</strong><span>${p.returnChance}% back</span></div>`;
      const actions=actionButtons(p);actions.classList.add('rec-actions');d.appendChild(actions);els.recommendations.appendChild(d);
    });
  }

  function renderRoster(){
    const myPlayers=mine();const c=E.counts(myPlayers);const flexCount=Math.max(0,myPlayers.filter(p=>['RB','WR','TE'].includes(p.pos)).length-5);const bench=Math.max(0,myPlayers.length-9);
    const slots=[['QB',c.QB],['RB',c.RB],['WR',c.WR],['TE',c.TE],['FLEX',flexCount],['D/ST',c.DST],['K',c.K],['BENCH',bench],['IR',0]];
    els.rosterSummary.innerHTML=slots.map(([k,v])=>`<div class="roster-pill"><strong>${v}${k==='IR'?'/3':''}</strong><span>${k}</span></div>`).join('');
    els.myRoster.innerHTML='';
    if(!myPlayers.length){els.myRoster.innerHTML='<div class="empty">Your picks will appear here.</div>';return}
    myPlayers.forEach(p=>{const h=state.history.find(x=>x.id===p.id);const d=document.createElement('div');d.className='my-player';d.innerHTML=`<span>${p.name}</span><span>${p.pos}${h?` • ${pickLabel(h.pick)}`:''}</span>`;els.myRoster.appendChild(d)});
  }

  function renderPlayers(){
    const q=E.normalize(state.search);
    let filtered=players.filter(p=>!state.status[p.id]).filter(p=>state.filter==='ALL'||p.pos===state.filter).filter(p=>!q||E.normalize(`${p.name}${p.pos}${p.team}`).includes(q));
    filtered=filtered.slice(0,q?18:28);
    els.playerRows.innerHTML='';
    if(!filtered.length){els.playerRows.innerHTML='<div class="empty">No available players match this filter.</div>';return}
    filtered.forEach(p=>{
      const row=document.createElement('div');row.className='player-row';
      row.innerHTML=`<div class="player-rank">${p.rank}</div><div><div class="player-name">${p.name}</div><div class="player-meta">${p.team}</div></div><div class="player-position"><span class="pos">${p.pos}</span></div>`;
      row.appendChild(actionButtons(p));els.playerRows.appendChild(row);
    });
  }

  function renderHistory(){
    els.history.innerHTML='';const recent=state.history.slice(-20).reverse();if(!recent.length){els.history.innerHTML='<div class="empty">Selections will appear here.</div>';return}
    recent.forEach(h=>{const p=players.find(x=>x.id===h.id);if(!p)return;const d=document.createElement('div');d.className=`history-item ${h.owner==='mine'?'mine':''}`;d.textContent=`${pickLabel(h.pick)} • ${p.name} • ${h.owner==='mine'?'MINE':'Other'}`;els.history.appendChild(d)});
  }

  function render(){renderStatus();renderRecommendations();renderRoster();renderPlayers();renderHistory()}

  els.slot.addEventListener('change',()=>{state.slot=Number(els.slot.value)||3;save();render()});
  els.undo.addEventListener('click',undo);els.reset.addEventListener('click',reset);
  els.search.addEventListener('input',()=>{state.search=els.search.value;renderPlayers()});
  els.search.addEventListener('keydown',e=>{if(e.key==='Enter'){const q=E.normalize(state.search);if(!q)return;const p=players.filter(x=>!state.status[x.id]).find(x=>E.normalize(x.name).includes(q));if(p){e.preventDefault();mark(p,'other')}}});
  els.filters.addEventListener('click',e=>{const btn=e.target.closest('button[data-pos]');if(!btn)return;state.filter=btn.dataset.pos;els.filters.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===btn));renderPlayers()});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==els.search){e.preventDefault();els.search.focus()}});

  load();render();
})();
