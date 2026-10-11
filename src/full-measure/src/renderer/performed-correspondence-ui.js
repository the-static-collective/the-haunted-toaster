(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.PerformedCorrespondenceUI=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  // Observation only. This editor cannot place media, mutate sealed takes, or grant KEEP.
  const ARITIES={
    continue:[1,1,1,1],split:[1,1,2,96],join:[2,96,1,1],
    release:[1,96,0,0],emerge:[0,0,1,96],
  };
  const message=error=>String(error?.message||error).replace(/^Error invoking remote method '[^']+': (?:TypeError|Error|RangeError): /,"");

  function createCorrespondenceBench({document,bridge}){
    const choose=document.getElementById("frankenCorrespondenceChoose");
    const clear=document.getElementById("frankenCorrespondenceClear");
    const parentRoot=document.getElementById("frankenCorrespondenceParentPlacements");
    const childRoot=document.getElementById("frankenCorrespondenceChildPlacements");
    const kind=document.getElementById("frankenCorrespondenceKind");
    const attestation=document.getElementById("frankenCorrespondenceAttestation");
    const stageButton=document.getElementById("frankenCorrespondenceStage");
    const undoButton=document.getElementById("frankenCorrespondenceUndo");
    const sealButton=document.getElementById("frankenCorrespondenceSeal");
    const verifyButton=document.getElementById("frankenCorrespondenceVerify");
    const stagedRoot=document.getElementById("frankenCorrespondenceStaged");
    const status=document.getElementById("frankenCorrespondenceStatus");
    const result=document.getElementById("frankenCorrespondenceReceipt");
    if([choose,clear,parentRoot,childRoot,kind,attestation,stageButton,undoButton,sealButton,verifyButton,stagedRoot,status,result].some(x=>!x))
      return {update(){}};

    let child=null,parent=null,parentPath=null,claims=[],saved=null,busy=false,verified=false,error=null,epoch=0;
    const selected={parent:new Set(),child:new Set()};
    const childIds=()=>child?.placements?.map(p=>p.placementId)||[];
    const parentIds=()=>parent?.placements?.map(p=>p.id)||[];
    const stagedUses=(side)=>new Set(claims.flatMap(claim=>side==="parent"?claim.from:claim.to));
    const canWork=()=>Boolean(parentPath&&child&&parent&&child.performanceHash!==parent.performanceHash);

    function renderEndpoint(root,side,placements){
      const remaining=new Set(side==="parent"?parentIds():childIds());
      for(const id of selected[side])if(!remaining.has(id))selected[side].delete(id);
      const occupied=stagedUses(side);
      root.replaceChildren();
      if(!placements?.length){
        const empty=document.createElement("p");empty.textContent=side==="parent"?"Load an earlier sealed take.":"Seal a current ONE PASS take first.";
        root.append(empty);return;
      }
      for(const placement of placements){
        const id=side==="parent"?placement.id:placement.placementId;
        const label=document.createElement("label");label.className="franken-correspondence-placement";
        const control=document.createElement("input");control.type="checkbox";control.dataset.side=side;control.value=id;
        control.checked=selected[side].has(id);
        control.disabled=busy||occupied.has(id);
        control.addEventListener("change",()=>{
          if(control.checked)selected[side].add(id);else selected[side].delete(id);
          // Do not rerender other controls: individual checkbox state is already authoritative.
          stageButton.disabled=busy||!canWork();
        });
        const copy=document.createElement("span");
        copy.textContent=id+" · "+placement.materialId+" · "+(placement.sceneId||"scene ?")+" · lane "+String(placement.lane??"?");
        if(occupied.has(id))copy.title="Already explicitly claimed in this record";
        label.append(control,copy);root.append(label);
      }
    }
    function render(){
      const ready=canWork();
      choose.disabled=busy||typeof bridge.chooseCorrespondenceParent!=="function"||typeof bridge.inspectCorrespondenceParent!=="function";
      clear.disabled=busy||(!parent&&!claims.length&&!saved);
      renderEndpoint(parentRoot,"parent",parent?.placements);
      renderEndpoint(childRoot,"child",child?.placements);
      kind.disabled=!ready||busy;
      attestation.disabled=!ready||busy;
      stageButton.disabled=!ready||busy;
      undoButton.disabled=busy||!claims.length;
      sealButton.disabled=busy||!ready||!claims.length||typeof bridge.sealPerformedCorrespondence!=="function"||Boolean(saved);
      verifyButton.disabled=busy||!saved?.path||typeof bridge.verifyPerformedCorrespondence!=="function";
      stagedRoot.replaceChildren();
      for(const [index,claim] of claims.entries()){
        const item=document.createElement("li");
        item.textContent=(index+1)+". "+claim.kind.toUpperCase()+" · "+
          (claim.from.join(", ")||"∅")+" → "+(claim.to.join(", ")||"∅")+" · "+claim.attestationId;
        stagedRoot.append(item);
      }
      const hash=child?.performanceHash;
      if(error)status.textContent="CORRESPONDENCE REFUSED · "+error;
      else if(saved)status.textContent=(verified?"RE-VERIFIED":"RECORDED")+" · "+
        claims.length+" explicit relation"+(claims.length===1?"":"s")+" · JOIN != REUNION · no render authority";
      else if(!child)status.textContent="Seal a ONE PASS child take. This instrument never edits an existing take.";
      else if(!parent)status.textContent="Child "+hash.slice(0,12)+" sealed · load a prior ONE PASS receipt.";
      else if(!ready)status.textContent="Identical source and child are not a cross-performance relation.";
      else status.textContent=claims.length+" staged relation"+(claims.length===1?"":"s")+" · choose exact placements, then RECORD. Unclaimed means unknown.";
      result.textContent=saved?"RECORD "+saved.record.correspondenceSha256+" · "+saved.path:
        "No correspondence recorded · performance histories remain independent";
      result.title=saved?.path||"";
    }
    function update({receipt}){
      const newHash=receipt?.performanceHash||null;
      if(child?.performanceHash!==newHash){
        child=receipt||null;
        selected.parent.clear();selected.child.clear();claims=[];saved=null;verified=false;error=null;
        epoch+=1; // Invalidate async dialog or pending record results for the departed take.
      }else child=receipt||null;
      render();
    }
    function stage(){
      if(!canWork()||busy)return false;
      const relation=kind.value,bounds=ARITIES[relation];
      if(!bounds){error="Unknown relation type";render();return false;}
      const from=[...selected.parent].sort(),to=[...selected.child].sort();
      const [fMin,fMax,tMin,tMax]=bounds;
      if(from.length<fMin||from.length>fMax||to.length<tMin||to.length>tMax){
        error=relation+" requires "+fMin+(fMax===fMin?"":"+")+" parent and "+tMin+(tMax===tMin?"":"+")+" child placements";
        render();return false;
      }
      const usedParents=stagedUses("parent"),usedChildren=stagedUses("child");
      if(from.some(id=>usedParents.has(id))||to.some(id=>usedChildren.has(id))){
        error="A performed endpoint cannot be claimed twice";render();return false;
      }
      const attestationId=attestation.value.trim();
      if(!attestationId||attestationId.length>1024){
        error="Type an explicit, bounded attestation ID before staging";render();return false;
      }
      claims.push({kind:relation,from,to,attestationId});
      selected.parent.clear();selected.child.clear();saved=null;verified=false;error=null;render();return true;
    }
    async function load(){
      if(busy)return;
      const activeEpoch=epoch;
      busy=true;error=null;render();
      try{
        const chosen=await bridge.chooseCorrespondenceParent();
        if(!chosen||activeEpoch!==epoch)return;
        const candidate=await bridge.inspectCorrespondenceParent(chosen);
        if(activeEpoch!==epoch)return;
        if(!candidate||typeof candidate.performanceHash!=="string"||!Array.isArray(candidate.placements))
          throw new TypeError("Parent receipt inspection did not return a sealed witness.");
        parentPath=chosen;parent=candidate;claims=[];saved=null;verified=false;
        selected.parent.clear();selected.child.clear();
      }catch(caught){if(activeEpoch===epoch)error=message(caught);}
      finally{if(activeEpoch===epoch){busy=false;render();}}
    }
    async function seal(){
      if(busy||!canWork()||!claims.length||saved)return;
      const activeEpoch=epoch,hash=child.performanceHash,parentHash=parent.performanceHash;
      busy=true;error=null;render();
      try{
        const response=await bridge.sealPerformedCorrespondence(
          parentPath,child,claims.map(x=>({...x,from:[...x.from],to:[...x.to]})),parentHash
        );
        if(activeEpoch===epoch&&child?.performanceHash===hash&&parent?.performanceHash===parentHash){
          if(!response?.record?.correspondenceSha256||!response.path)throw new Error("No retained record returned.");
          saved=response;verified=false;
        }
      }catch(caught){if(activeEpoch===epoch)error=message(caught);}
      finally{if(activeEpoch===epoch){busy=false;render();}}
    }
    async function verify(){
      if(busy||!saved?.path)return;
      const activeEpoch=epoch,hash=child?.performanceHash;
      busy=true;verified=false;error=null;render();
      try{
        const ok=await bridge.verifyPerformedCorrespondence(saved.path);
        if(ok!==true)throw new Error("Correspondence verification refused.");
        if(activeEpoch===epoch&&child?.performanceHash===hash)verified=true;
      }catch(caught){if(activeEpoch===epoch)error=message(caught);}
      finally{if(activeEpoch===epoch){busy=false;render();}}
    }
    choose.addEventListener("click",()=>{void load();});
    clear.addEventListener("click",()=>{
      if(busy)return;
      parent=null;parentPath=null;claims=[];saved=null;verified=false;error=null;
      selected.parent.clear();selected.child.clear();render();
    });
    stageButton.addEventListener("click",stage);
    undoButton.addEventListener("click",()=>{
      if(busy||!claims.length)return;
      claims.pop();saved=null;verified=false;error=null;render();
    });
    sealButton.addEventListener("click",()=>{void seal();});
    verifyButton.addEventListener("click",()=>{void verify();});
    render();
    return {update,stage,load,seal,verify,state:()=>({claims:claims.map(x=>({...x})),saved,verified,parentHash:parent?.performanceHash,childHash:child?.performanceHash})};
  }
  return {createCorrespondenceBench};
});