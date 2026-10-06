(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root){
    root.WordparkPlayUI=api;
    if(root.document)root.addEventListener("DOMContentLoaded",()=>api.mount(root.document,root.fullMeasure));
  }
})(typeof window!=="undefined"?window:null,function(){
  "use strict";

  const LANES=["OPEN","TENDER","STRANGE","HARD"];
  const STEER_KEYS=new Map([
    ["KeyA",[-1,0]],["ArrowLeft",[-1,0]],
    ["KeyD",[1,0]],["ArrowRight",[1,0]],
    ["KeyW",[0,-1]],["ArrowUp",[0,-1]],
    ["KeyS",[0,1]],["ArrowDown",[0,1]],
  ]);

  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

  function steeringVector(pressed=[]){
    let x=0,y=0;
    for(const code of pressed){
      const vector=STEER_KEYS.get(code);
      if(!vector)continue;
      x+=vector[0];
      y+=vector[1];
    }
    const length=Math.hypot(x,y);
    if(length>1){x/=length;y/=length;}
    return {x,y};
  }

  function laneFromShortcut(code){
    return ({
      Digit1:"OPEN",
      Digit2:"TENDER",
      Digit3:"STRANGE",
      Digit4:"HARD",
    })[code]||null;
  }

  function secondsForFrame(frame,fps){
    return Math.max(0,Number(frame)||0)/Math.max(1,Number(fps)||24);
  }

  function displayTime(seconds){
    const total=Math.max(0,Math.round(Number(seconds)||0));
    const minutes=Math.floor(total/60);
    const rest=String(total%60).padStart(2,"0");
    return `${minutes}:${rest}`;
  }

  function theme(document){
    const style=document.defaultView?.getComputedStyle(document.documentElement);
    const read=(name,fallback)=>style?.getPropertyValue(name)?.trim()||fallback;
    return {
      background:read("--wp-bg","#090a0f"),
      grid:read("--wp-grid","rgba(255,255,255,.055)"),
      text:read("--wp-text","#f5f1e8"),
      bird:read("--wp-bird","#f4df9c"),
      OPEN:read("--wp-open","#83d1bf"),
      TENDER:read("--wp-tender","#d9a4c8"),
      STRANGE:read("--wp-strange","#aa9cff"),
      HARD:read("--wp-hard","#df7147"),
    };
  }

  function drawWord(ctx,word,width,height,palette){
    const laneColor=palette[word.moodLane]||palette.text;
    const path=word.geometry?.path||[];
    if(path.length>1){
      ctx.save();
      ctx.strokeStyle=laneColor;
      ctx.globalAlpha=.18;
      ctx.lineWidth=Math.max(1,width/800);
      ctx.beginPath();
      path.forEach((point,index)=>{
        const x=clamp(point.x,0,1)*width;
        const y=clamp(point.y,0,1)*height;
        if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      });
      ctx.stroke();
      ctx.restore();
    }

    const glyphs=word.geometry?.glyphs||[];
    const fontSize=Math.max(13,Math.min(27,width/46));
    for(const glyph of glyphs){
      ctx.save();
      ctx.translate(clamp(glyph.x,0,1)*width,clamp(glyph.y,0,1)*height);
      ctx.rotate((Number(glyph.rotationDegrees)||0)*Math.PI/180);
      ctx.font=`700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillStyle=laneColor;
      ctx.globalAlpha=.94;
      ctx.fillText(String(glyph.char||""),0,0);
      ctx.restore();
    }
  }

  function drawBird(ctx,ball,width,height,palette){
    if(!ball)return;
    const x=clamp(ball.x,0,1)*width;
    const y=clamp(ball.y,0,1)*height;
    const radius=Math.max(8,clamp(ball.radius,.005,.08)*Math.min(width,height));

    ctx.save();
    ctx.translate(x,y);
    ctx.fillStyle=palette.bird;
    ctx.beginPath();
    ctx.arc(0,0,radius,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle=palette.background;
    ctx.beginPath();
    ctx.arc(radius*.28,-radius*.22,Math.max(1.5,radius*.12),0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle=palette.HARD;
    ctx.beginPath();
    ctx.moveTo(radius*.92,-radius*.08);
    ctx.LineTo(radius*1.45,radius*.12);
     ctx.lineTo(radius*.88,radius.28);
    ctx.closePath();
    ctx.fill();

    ctx.StrokeStyle=palette.background;
    ctx.lineWidth=Math.max(1.5,radius*.15);
    ctx.beginPath();
    ctx.arc(-radius*.12,radius*.05,radius*.5,-.8,1.3);
    ctx.stroke();
    ctx.restore();
  }

  function drawCanvas(canvas,snapshot,document){
    if(!canvas)return;
    const dpr=Math.max(1,Math.min(2,Number(document.defaultView?.devicePixelRatio)||1));
    const rect=canvas.getBoundingClientRect();
    const cssWidth=Math.max(320,Math.round(rect.width||canvas.clientWidth||960));
    const cssHeight=Math.max(220,Math.round(rect.height||canvas.clientHeight||540));
    const width=Math.round(cssWidth*dpr),height=Math.round(cssHeight*dpr);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const palette=theme(document);
    ctx.fillStyle=palette.background;
    ctx.fillRect(0,0,cssWidth,cssHeight);

    ctx.strokeStyle=palette.grid;
    ctx.lineWidth=1;
    for(let i=1;i<8;i++){
      const x=(i/8)*cssWidth;
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,cssHeight);ctx.stroke();
    }
    for(let i=1;i<5;i++){
      const y=(i/5)*cssHeight;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cssWidth,y);ctx.stroke();
    }

    if(snapshot?.active){
      const progress=clamp((snapshot.frame||0)/Math.max(1,(snapshot.totalFrames||1)-1),0,1);
      ctx.fillStyle=palette.bird;
      ctx.globalAlpha=.7;
      ctx.fillRect(0,0,cssWidth*progress,3);
      ctx.globalAlpha=1;

      for(const word of snapshot.wordObjects||[]){
        if(Number(word.dropFrame)>Number(snapshot.frame))continue;
        drawWord(ctx,word,cssWidth,cssHeight,palette);
      }
      drawBird(ctx,snapshot.ball,cssWidth,cssHeight,palette);
    }
  }

  function mount(document,bridge){
    const root=document.getElementById("wordparkPlaySurface");
    if(!root||!bridge)return;
    const view=document.defaultView;
    const canvas=document.getElementById("wordparkCanvas");
    const audio=document.getElementById("wordparkAudio");
    const begin=document.getElementById("wordparkBegin");
    const stop=document.getElementById("wordparkStop");
    const now=document.getElementById("wordparkNow");
    const status=document.getElementById("wordparkStatus");
    const lookahead=document.getElementById("wordparkLookahead");
    const stats=document.getElementById("wordparkStats");
    const laneButtons=[...root.querySelectorAll("[data-wordpark-lane]")];
    const steerButtons=[...root.querySelectorAll("[data-wordpark-steer]")];

    let context=null;
    let snapshot=null;
    let running=false;
    let lane="OPEN";
    let raf=null;
    const pressed=new Set();
    const touchPressed=new Set();

    const currentFrame=()=>{
      if(!snapshot?.active)return 0;
      const fps=Math.max(1,Number(snapshot.fps)||24);
      if(audio&&Number.isFinite(audio.currentTime)){
        return Math.max(0,Math.min(3napshot.totalFrames-1,Math.round(audio.currentTime*fps)));
      }
      return snapshot.frame||0;
    };

    function updateLaneButtons(){
      laneButtons.forEach(button=>{
        const active=button.dataset.wordparkLane===lane;
        button.classList.toggle("is-active",active);
        button.setAttribute("aria-pressed",String(active));
      });
    }

    function updateHud(){
      updateLaneButtons();
      if(!context){
        status.textContent="Run the Listener first. WORDPARK needs placed or unresolved lyric evidence.";
        begin.disabled=true;
        stop.disabled=true;
        now.disabled=true;
        lookahead.replaceChildren();
        stats.textContent="No performance armed";
        drawCanvas(canvas,null,document);
        return;
      }
      begin.disabled=running;
      stop.disabled=!running;
      now.disabled=!running||!(snapshot?.lookahead||[]).length;

      const upcoming=snapshot?.lookahead||[];
      lookahead.replaceChildren();
      for(const [index,item] of upcoming.entries()){
        const card=document.createElement("article");
        card.className="wordpark-lookahead-card";
        card.dataset.state=item.state;
        const role=document.createElement("span");
        role.textContent=["NOW","NEXT","AFTER"][index]||"";
        const lyric=document.createElement("strong");
        lyric.textContent=item.text;
        const meta=document.createElement("small");
        const at=item.proposedFrame===null
          ?"PUNCH"
          :displayTime(secondsForFrame(item.proposedFrame,snapshot?.fps||24));
        meta.textContent=`${item.state} \u00b7 ${at}`;
        card.append(role,lyric,meta);
        lookahead.append(card);
      }

      if(running&&snapshot?.active){
        status.textContent=`ONE PASS \u00b7 ${lane} latched \u00b7 ${displayTime(secondsForFrame(snapshot.frame,snapshot.fps))}`;
        stats.textContent=`${snapshot.arrivalCount} placed \u00b7 ${snapshot.missCount} missed \u00b7 ${snapshot.humanAnchorCount} punched anchors`;
        const current=upcoming[0];
        now.textContent=current
          ?(current.state==="CATCH"?"NOW \u00b7 CATCH":"NOW \u00b7 OVERRIDE")
          :"NOW";
      }else{
        const cueCount=context.alignment?.cues?.length||0;
        status.textContent=`READY \u00b7 ${cueCount} lyric lines \u00b7 one clock \u00b7 no pause`;
        stats.textContent="Choose a lane, then begin.";
        now.textContent="NOW";
      }
      drawCanvas(canvas,snapshot,document);
    }

    function steering(){
      return steeringVector([...pressed,...touchPressed]);
    }

    function cancelLoop(){
      if(raf&&view?.cancelAnimationFrame)view.cancelAnimationFrame(raf);
      raf=null;
    }

    function sealRun(reason="complete"){
      if(!running)return;
      running=false;
      cancelLoop();
      try{audio?.pause();}catch(_error){}
      try{
        const sealed=bridge.wordparkSeal();
        const hash=sealed?.packet?.performanceHash||"";
        status.textContent=`SEALED \u00b7 ${reason} \u00b7 ${hash?hash.slice(0,12):"witness held"}`;
      }catch(error){
        status.textContent=`Seal failed \u00b7 ${error?.message||error}`;
      }
      root.classList.remove("is-running");
      updateHud();
    }

    function runLoop(){
      cancelLoop();
      const tick=()=>{
        if(!running||!snapshot?.active){raf=null;return;}
        try{
          const frame=currentFrame();
          if(frame>snapshot.frame){
            const vector=steering();
            snapshot=bridge.wordparkAdvanceTo({frame,steerX:vector.x,steerY:vector.y});
          }
          updateHud();
          if(audio?.ended||snapshot.frame>=snapshot.totalFrames-1){
            sealRun("song complete");
            return;
          }
        }catch(error){
          running=false;
          root.classList.remove("is-running");
          status.textContent=`WORDPARK stopped \u00b7 ${error?.message||error}`;
          updateHud();
          return;
        }
        raf=view?.requestAnimationFrame?view.requestAnimationFrame(tick):null;
      };
      tick();
    }

    async function beginRun(){
      if(!context||running)return;
      try{
        snapshot=bridge.wordparkStart({
          fullSongForm:context.fullSongForm,
          listeningField:context.listeningField,
          alignment:context.alignment,
          initialLane:lane,
        });
        if(audio){
          audio.src=context.audio.url;
          audio.currentTime=0;
          await audio.play();
        }
        running=true;
        root.classList.add("is-running");
        updateHud();
        runLoop();
      }catch(error){
        running=false;
        status.textContent=`WORDPARK could not start \u00b7 ${error?.message||error}`;
        updateHud();
      }
    }

    function setLane(nextLane){
      if(!LANES.includes(nextLane))return;
      lane=nextLane;
      if(running&&snapshot?.active){
        try{snapshot=bridge.wordparkSetLane({moodLane:lane,frame:currentFrame()});}
        catch(error){status.textContent=error?.message||String(error);}
      }
      updateHud();
    }

    function punch(){
      if(!running||!snapshot?.active)return;
      try{
        snapshot=bridge.wordparkPunch({frame:currentFrame()});
        updateHud();
      }catch(error){
        status.textContent=`NOW refused \u00b7 ${error?.message||error}`;
      }
    }

    view?.addEventListener("full-measure:wordpark-context",(event)=>{
      context=event.detail||null;
      running=false;
      cancelLoop();
      try{audio?.pause();}catch(_error){}
      try{bridge.wordparkReset();}catch(_error){}
      snapshot=null;
      if(audio&&context?.audio?.url)audio.src=context.audio.url;
      updateHud();
    });

    begin?.addEventListener("click",beginRun);
    stop?.addEventListener("click",()=>sealRun("stopped by human"));
    now?.addEventListener("click",punch);
    laneButtons.forEach(button=>button.addEventListener("click",()=>setLane(button.dataset.wordparkLane)));

    const onKeyDown=(event)=>{
      if(!root||root.hidden)return;
      const tag=document.activeElement?.tagNam;
      if(["INPUT","TEXTAREA","SELECT"].includes(tag))return;
      const shortcut=laneFromShortcut(event.code);
      if(shortcut){
        event.preventDefault();
        setLane(shortcut);
        return;
      }
      if(event.code==="Space"&&running){
        event.preventDefault();
        punch();
        return;
      }
      if(STEER_KEYS.has(event.code)){
        event.preventDefault();
        pressed.add(event.code);
      }
    };
    const onKeyUp=(event)=>{
      if(STEER_KEYS.has(event.code))pressed.delete(event.code);
    };
    document.addEventListener("keydown",onKeyDown);
    document.addEventListener("keyup",onKeyUp);

    steerButtons.forEach(button=>{
      const code=button.dataset.wordparkSteer;
      const release=()=>touchPressed.delete(code);
      button.addEventListener("pointerdown",(event)=>{
        event.preventDefault();
        touchPressed.add(code);
        try{button.setPointerCapture(event.pointerId);}catch(_error){}
      });
      button.addEventListener("pointerup",release);
      button.addEventListener("pointercancel",release);
      button.addEventListener("pointerleave",release);
    });

    audio?.addEventListener("ended",()=>sealRun("song complete"));
    view?.addEventListener("resize",()=>drawCanvas(canvas,snapshot,document));

    updateHud();
  }

  return {
    LANES,
    displayTime,
    drawCanvas,
    laneFromShortcut,
    mount,
    secondsForFrame,
    steeringVector,
  };
});
