globalThis.FDCC = (() => {
  const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');

  const league = {
    teams: 12,
    rounds: 15,
    ppr: 1,
    passTd: 6,
    passYardsPerPoint: 25,
    rushYardsPerPoint: 10,
    recYardsPerPoint: 10,
    explosiveTdBonus: 1,
    passing300Bonus: 1,
    passing400Bonus: 2,
    rushing100Bonus: 1,
    rushing200Bonus: 2,
    receiving100Bonus: 1,
    receiving200Bonus: 2,
    bench: 6,
    ir: 3,
    starterReq: {QB:1,RB:2,WR:2,TE:1,DST:1,K:1},
    rosterMax: {QB:4,RB:8,WR:8,TE:3,DST:3,K:3}
  };

  function teamAtPick(n, teams=league.teams){
    const r=Math.floor((n-1)/teams)+1;
    const slot=(n-1)%teams+1;
    return r%2===1?slot:teams+1-slot;
  }

  function nextPickForSlot(currentPick, slot, teams=league.teams, rounds=league.rounds){
    for(let n=currentPick;n<=teams*rounds;n++) if(teamAtPick(n,teams)===slot) return n;
    return null;
  }

  function counts(myPlayers){
    const c={QB:0,RB:0,WR:0,TE:0,DST:0,K:0};
    myPlayers.forEach(p=>c[p.pos]=(c[p.pos]||0)+1);
    return c;
  }

  function scorePlayer(p, available, myPlayers, currentPick, slot){
    const c=counts(myPlayers);
    const round=Math.floor((currentPick-1)/league.teams)+1;
    const flexEligible=myPlayers.filter(x=>['RB','WR','TE'].includes(x.pos)).length;
    const max=league.rosterMax[p.pos];
    if(max && c[p.pos]>=max) return 0;

    // Board value remains the anchor. League-specific scoring then changes positional value.
    let s=112-p.rank*.55;

    // Full PPR materially lifts target volume and pass-catching skill positions.
    if(p.pos==='WR') s+=7;
    if(p.pos==='RB') s+=5;
    if(p.pos==='TE') s+=3;

    // Six-point passing TDs plus 300/400-yard and long-TD bonuses raise elite-QB ceilings,
    // but this remains a one-QB league so QB scarcity is not treated like RB/WR scarcity.
    if(p.pos==='QB'){
      s+=5;
      if(p.rank<=40) s+=2;
      if(c.QB===0) s+=round>=3?7:-2;
      if(c.QB>=1) s-=26;
    }

    // Fill the six flex-eligible starting spots (2 RB, 2 WR, TE, FLEX) before leaning bench-heavy.
    if(c[p.pos]<(league.starterReq[p.pos]||0)) s+=8;
    if(p.pos==='RB'&&c.RB<2) s+=6;
    if(p.pos==='WR'&&c.WR<2) s+=7;
    if(['RB','WR','TE'].includes(p.pos)&&flexEligible<6) s+=3;

    // Full-PPR depth is most useful at RB/WR after starters are mostly secured.
    if(myPlayers.length>=7 && ['RB','WR'].includes(p.pos)) s+=5;

    // Avoid unnecessary duplication at thin starting positions.
    if(p.pos==='TE'&&c.TE>=1) s-=12;
    if(p.pos==='K'&&c.K>=1) s-=30;
    if(p.pos==='DST'&&c.DST>=1) s-=30;

    // In a 15-round build, reserve the final two rounds for K/DST unless the board forces it.
    if((p.pos==='K'||p.pos==='DST') && round<=12) s-=42;
    else if((p.pos==='K'||p.pos==='DST') && round===13) s-=20;

    // Reward positional cliffs so the recommendation reacts when a tier is about to disappear.
    const same=available.filter(x=>x.pos===p.pos).sort((a,b)=>a.rank-b.rank);
    const idx=same.findIndex(x=>x.id===p.id);
    if(idx===0&&same[1]){
      const cliff=same[1].rank-p.rank;
      if(cliff>=12) s+=6;
      else if(cliff>=7) s+=3;
    }

    // Pick 3 creates long 18-pick waits at alternating turns; protect strong values that are
    // unlikely to survive the trip back around the snake.
    const next=nextPickForSlot(currentPick+1,slot);
    if(next){
      const gap=next-currentPick;
      if(gap>=15 && p.rank<=currentPick+gap*.8) s+=4;
      else if(gap>=9 && p.rank<=currentPick+gap*.7) s+=2;
    }

    return Math.max(1,Math.min(99,Math.round(s)));
  }

  function makeItBack(p,currentPick,slot){
    const next=nextPickForSlot(currentPick+1,slot);
    if(!next) return 0;
    const gap=next-currentPick;
    const adpGap=p.rank-currentPick;
    const z=(adpGap-gap*.72)/7;
    return Math.max(3,Math.min(97,Math.round(100/(1+Math.exp(-z)))));
  }

  function recommend(players,status,currentPick,slot){
    const available=players.filter(p=>!status[p.id]);
    const mine=players.filter(p=>status[p.id]==='mine');
    return available
      .map(p=>({...p,score:scorePlayer(p,available,mine,currentPick,slot),returnChance:makeItBack(p,currentPick,slot)}))
      .filter(p=>p.score>0)
      .sort((a,b)=>b.score-a.score||a.rank-b.rank)
      .slice(0,8);
  }

  function matchPlayer(text,players){
    const n=normalize(text);
    if(!n)return null;
    const exact=players.find(p=>normalize(p.name)===n);
    if(exact)return exact;
    const hits=players.filter(p=>normalize(p.name).includes(n)||n.includes(normalize(p.name)));
    return hits.sort((a,b)=>a.rank-b.rank)[0]||null;
  }

  return {normalize,teamAtPick,nextPickForSlot,recommend,matchPlayer,counts,league};
})();
