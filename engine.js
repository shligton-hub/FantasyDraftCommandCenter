globalThis.FDCC = (() => {
  const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const starterReq = {QB:1,RB:2,WR:2,TE:1,DST:1,K:1};
  function teamAtPick(n, teams=12){const r=Math.floor((n-1)/teams)+1;const slot=(n-1)%teams+1;return r%2===1?slot:teams+1-slot;}
  function nextPickForSlot(currentPick, slot, teams=12, rounds=15){for(let n=currentPick;n<=teams*rounds;n++) if(teamAtPick(n,teams)===slot) return n; return null;}
  function counts(myPlayers){const c={QB:0,RB:0,WR:0,TE:0,DST:0,K:0};myPlayers.forEach(p=>c[p.pos]=(c[p.pos]||0)+1);return c;}
  function scorePlayer(p, available, myPlayers, currentPick, slot){
    const c=counts(myPlayers); const round=Math.floor((currentPick-1)/12)+1; let s=112-p.rank*.55;
    if(p.pos==='WR') s+=5; if(p.pos==='RB') s+=4; if(p.pos==='QB') s+=3.5; if(p.pos==='TE') s+=1.5;
    if((p.pos==='K'||p.pos==='DST') && round<13) s-=32;
    if(c[p.pos]<(starterReq[p.pos]||0)) s+=8;
    if(p.pos==='RB'&&c.RB<2) s+=6; if(p.pos==='WR'&&c.WR<2) s+=6;
    if(p.pos==='QB'&&c.QB===0) s+=round>=4?7:-4; if(p.pos==='QB'&&c.QB>=1) s-=24;
    if(p.pos==='TE'&&c.TE>=1) s-=14; if(p.pos==='K'&&c.K>=1) s-=30; if(p.pos==='DST'&&c.DST>=1) s-=30;
    if(myPlayers.length>=8 && ['RB','WR'].includes(p.pos)) s+=4;
    const same=available.filter(x=>x.pos===p.pos).sort((a,b)=>a.rank-b.rank); const idx=same.findIndex(x=>x.id===p.id);
    if(idx===0&&same[1]&&same[1].rank-p.rank>=12) s+=5;
    const next=nextPickForSlot(currentPick,slot); if(next){const gap=next-currentPick;if(gap>8&&p.rank<=currentPick+gap*.75)s+=3;}
    return Math.max(1,Math.min(99,Math.round(s)));
  }
  function makeItBack(p,currentPick,slot){const next=nextPickForSlot(currentPick+1,slot); if(!next) return 0; const gap=next-currentPick; const adpGap=p.rank-currentPick; const z=(adpGap-gap*.72)/7; return Math.max(3,Math.min(97,Math.round(100/(1+Math.exp(-z)))));}
  function recommend(players,status,currentPick,slot){const available=players.filter(p=>!status[p.id]);const mine=players.filter(p=>status[p.id]==='mine');return available.map(p=>({...p,score:scorePlayer(p,available,mine,currentPick,slot),returnChance:makeItBack(p,currentPick,slot)})).sort((a,b)=>b.score-a.score||a.rank-b.rank).slice(0,8);}
  function matchPlayer(text,players){const n=normalize(text); if(!n)return null; let exact=players.find(p=>normalize(p.name)===n); if(exact)return exact; const hits=players.filter(p=>normalize(p.name).includes(n)||n.includes(normalize(p.name))); return hits.sort((a,b)=>a.rank-b.rank)[0]||null;}
  return {normalize,teamAtPick,nextPickForSlot,recommend,matchPlayer,counts};
})();
