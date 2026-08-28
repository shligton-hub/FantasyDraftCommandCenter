(()=>{
  if(globalThis.__FDCC_DEBUG__) return;
  globalThis.__FDCC_DEBUG__=true;
  const network=[];
  window.addEventListener('message',ev=>{
    if(ev.source!==window||ev.data?.source!=='FDCC_PAGE_BRIDGE')return;
    const t=String(ev.data.text||'');
    network.push({kind:ev.data.kind||'unknown',text:t.slice(0,12000)});
    if(network.length>12)network.shift();
  });
  const sanitize=s=>String(s||'').replace(/([?&](?:token|auth|access_token|sid|session|cookie)=[^&\s]+)/ig,'[redacted]');
  const pickishNodes=()=>{
    const sels=['[class*="pick" i]','[class*="draft" i]','[class*="history" i]','[class*="activity" i]','[aria-live]','[data-testid*="pick" i]','[data-testid*="draft" i]'];
    const nodes=[];for(const s of sels){try{nodes.push(...document.querySelectorAll(s))}catch{}}
    return [...new Set(nodes)].slice(-120).map(n=>({tag:n.tagName,id:n.id||'',class:String(n.className||'').slice(0,180),testid:n.getAttribute?.('data-testid')||'',aria:n.getAttribute?.('aria-label')||'',text:(n.innerText||n.textContent||'').trim().slice(0,1200)})).filter(x=>x.text);
  };
  const pageText=()=>{
    const t=(document.body?.innerText||'');
    const lines=t.split('\n').map(x=>x.trim()).filter(Boolean);
    const interesting=lines.filter(x=>/pick|draft|selected|on the clock|round|history/i.test(x));
    return interesting.slice(-250);
  };
  async function copyDebug(){
    const payload={
      version:'0.4-debug',
      url:sanitize(location.href),
      title:document.title,
      capturedAt:new Date().toISOString(),
      pagePickLines:pageText(),
      pickishNodes:pickishNodes(),
      network:network.map(x=>({kind:x.kind,text:sanitize(x.text)}))
    };
    const text='FDCC_DEBUG\n'+JSON.stringify(payload,null,2);
    try{await navigator.clipboard.writeText(text)}catch{
      const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
    }
    const b=document.getElementById('fdcc-copy-debug');if(b){const old=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=old,1400)}
  }
  function addButton(){
    const panel=document.getElementById('fdcc-panel');if(!panel||document.getElementById('fdcc-copy-debug'))return;
    const b=document.createElement('button');b.id='fdcc-copy-debug';b.textContent='Copy ESPN Debug';b.title='Copy ESPN draft signals so the parser can be fixed precisely';b.style.width='100%';b.style.marginTop='8px';b.addEventListener('click',copyDebug);
    const first=panel.querySelector('section');(first||panel).appendChild(b);
  }
  addButton();setInterval(addButton,800);
})();
