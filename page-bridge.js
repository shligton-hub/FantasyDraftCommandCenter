(()=>{
  if(window.__FDCC_BRIDGE__) return;
  window.__FDCC_BRIDGE__=true;
  const emit=(kind,payload)=>{
    try{
      let text=typeof payload==='string'?payload:JSON.stringify(payload);
      if(!text||text.length<3) return;
      if(text.length>120000) text=text.slice(0,120000);
      window.postMessage({source:'FDCC_PAGE_BRIDGE',kind,text},'*');
    }catch{}
  };

  const interestingUrl=url=>/draft|fantasy|league|roster|pick|selection/i.test(String(url||''));
  const interestingBody=text=>/draft|pick|selected|selection|playerId|overallPick|teamId/i.test(String(text||''));

  try{
    const originalFetch=window.fetch;
    window.fetch=async function(...args){
      const res=await originalFetch.apply(this,args);
      try{
        const url=String(args[0]?.url||args[0]||res.url||'');
        if(interestingUrl(url)){
          const clone=res.clone();
          clone.text().then(t=>{if(interestingBody(t))emit('fetch',{url,body:t})}).catch(()=>{});
        }
      }catch{}
      return res;
    };
  }catch{}

  try{
    const XHR=window.XMLHttpRequest;
    const open=XHR.prototype.open,send=XHR.prototype.send;
    XHR.prototype.open=function(method,url,...rest){this.__fdccUrl=url;return open.call(this,method,url,...rest)};
    XHR.prototype.send=function(...args){
      this.addEventListener('load',()=>{
        try{
          const url=String(this.__fdccUrl||this.responseURL||'');
          if(!interestingUrl(url))return;
          const t=typeof this.responseText==='string'?this.responseText:'';
          if(interestingBody(t))emit('xhr',{url,body:t});
        }catch{}
      });
      return send.apply(this,args);
    };
  }catch{}

  try{
    const NativeWS=window.WebSocket;
    function WrappedWebSocket(...args){
      const ws=new NativeWS(...args);
      ws.addEventListener('message',ev=>{
        try{if(typeof ev.data==='string'&&interestingBody(ev.data))emit('ws',ev.data)}catch{}
      });
      return ws;
    }
    WrappedWebSocket.prototype=NativeWS.prototype;
    Object.defineProperties(WrappedWebSocket,{CONNECTING:{value:0},OPEN:{value:1},CLOSING:{value:2},CLOSED:{value:3}});
    window.WebSocket=WrappedWebSocket;
  }catch{}
})();
