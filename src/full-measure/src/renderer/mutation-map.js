(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.MutationMap=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const refusal=caught=>String(caught?.message||caught).replace(/^Error invoking remote method '[^']+': (?:TypeError|Error|RangeError): /,"");
  const LABELS={placement:"placement",timing:"timing",topology:"topology",lawFossil:"law fossils",materialRole:"material role"};
  function renderMutationMap(document,root,record){
    root.replaceChildren();
    if(!record)return;
    const max=Math.max(1,...Object.values(record.deltas).map(d=>d.measuredParticularCount));
    for(const [key,label] of Object.entries(LABELS)){
      const delta=record.deltas[key];
      const details=document.createElement("details");details.className="franken-mutation-dimension";
      details.open=delta.changes.length>0||delta.status==="unknown";
      const summary=document.createElement("summary");
      const title=document.createElement("span");title.textContent=label;
      const bar=document.createElement("i");bar.className="franken-mutation-bar";bar.setAttribute("aria-hidden","true");
      if(delta.distance!==null){bar.dataset.count=String(delta.distance);bar.style.setProperty("--mutation-fraction",String(delta.distance/max));}
      const count=document.createElement("span");
      count.textContent=delta.distance===null?`unknown · ${delta.measuredParticularCount} observed particulars`:`${delta.status} · ${delta.distance} particulars`;
      summary.append(title,bar,count);
      const particulars=document.createElement("pre");
      particulars.textContent=JSON.stringify({changes:delta.changes,observations:delta.observations,unknown:delta.unknown},null,2);
      details.append(summary,particulars);root.append(details);
    }
    const scope=document.createElement("p");scope.textContent=`Unmeasurable: ${record.unmeasurable.join("; ")}`;root.append(scope);
    const identity=document.createElement("code");identity.textContent=`Record ${record.mutationRecordHash}`;root.append(identity);
  }
  function createMutationInspector({document,bridge}){
    const measureButton=document.getElementById("frankenMeasureMutation");
    const chooseButton=document.getElementById("frankenMutationParent");
    const verifyButton=document.getElementById("frankenVerifyMutation");
    const clearButton=document.getElementById("frankenMutationClear");
    const select=document.getElementById("frankenMutationEdge");
    const status=document.getElementById("frankenMutationStatus");
    const root=document.getElementById("frankenMutationMap");
    if(!measureButton||!chooseButton||!verifyButton||!select||!status||!root)return {update(){}};
    let receipt=null,ecology=null,rows=[],paths=[],busy=false,error=null,verified=false;
    const edges=()=>ecology?.edges?.filter(e=>e.kind==="performed-from-history"&&e.toNodeId===`performance:${receipt?.performanceHash}`)||[];
    function render(){
      const selected=select.value;
      select.replaceChildren();
      for(const edge of edges()){
        const option=document.createElement("option");option.value=edge.edgeId;
        option.textContent=`${edge.fromNodeId.slice(0,24)} → ${edge.toNodeId.slice(0,24)} · ${edge.placementCount} placed uses`;
        option.title=edge.edgeId;select.append(option);
      }
      if(edges().some(e=>e.edgeId===selected))select.value=selected;
      select.disabled=busy||!edges().length;
      measureButton.disabled=busy||!edges().length||typeof bridge.measureMutation!=="function";
      measureButton.textContent=busy?"MEASURING…":"MEASURE MUTATION";
      chooseButton.disabled=busy||!edges().length||typeof bridge.chooseMutationParentEvidence!=="function";
      if(clearButton)clearButton.disabled=busy||!paths.length;
      chooseButton.textContent=paths.length?`PARENT WITNESS · ${paths.length} FILES`:"LOAD PARENT WITNESS";
      const row=rows.find(item=>item.record.genealogyEdge.edgeId===select.value);
      verifyButton.disabled=busy||!row||typeof bridge.verifyMutation!=="function";
      if(error)status.textContent=`MUTATION REFUSED · ${error}`;
      else if(row){
        const aggregate=row.record.aggregateDistance;
        status.textContent=`${verified?"RE-VERIFIED · ":""}${aggregate.value===null?"Partial index":`Index ${aggregate.value}`} · ${aggregate.measuredParticularCount} observed particulars · DISTANCE != VALUE · SUMMARY != EVIDENCE`;
        status.title=`${row.path}\n${row.record.genealogyEdge.edgeId}`;
      }else{
        status.textContent=!ecology?"Build the family tree to inspect performed edges.":!edges().length?"No performed parent edge to measure.":"Select an edge. Load its parent witness to measure known dimensions; missing evidence remains unknown.";
        status.title="";
      }
      renderMutationMap(document,root,row?.record);
    }
    function update(next){
      if(receipt?.performanceHash!==next.receipt?.performanceHash){rows=[];paths=[];error=null;verified=false;busy=false;}
      receipt=next.receipt;ecology=next.ecology;render();
    }
    async function measure(){
      if(busy||!edges().length||typeof bridge.measureMutation!=="function")return;
      const hash=receipt.performanceHash;busy=true;error=null;verified=false;render();
      try{
        const result=await bridge.measureMutation([receipt],paths);
        if(receipt?.performanceHash===hash)rows=result;
      }catch(caught){if(receipt?.performanceHash===hash){rows=[];error=refusal(caught);}}
      finally{if(receipt?.performanceHash===hash){busy=false;render();}}
    }
    measureButton.addEventListener("click",()=>{void measure();});
    chooseButton.addEventListener("click",async()=>{
      const hash=receipt?.performanceHash;error=null;
      try{
        const filePath=await bridge.chooseMutationParentEvidence();
        if(filePath&&receipt?.performanceHash===hash&&!paths.includes(filePath)){paths.push(filePath);rows=[];verified=false;}
      }catch(caught){error=refusal(caught);}
      render();
    });
    verifyButton.addEventListener("click",async()=>{
      const row=rows.find(item=>item.record.genealogyEdge.edgeId===select.value);
      if(!row||busy)return;
      const hash=receipt?.performanceHash;busy=true;error=null;render();
      try{await bridge.verifyMutation(row.path,[receipt],paths);if(receipt?.performanceHash===hash)verified=true;}
      catch(caught){if(receipt?.performanceHash===hash){verified=false;error=refusal(caught);}}
      finally{if(receipt?.performanceHash===hash){busy=false;render();}}
    });
    clearButton?.addEventListener("click",()=>{paths=[];rows=[];error=null;verified=false;render();});
    select.addEventListener("change",()=>{verified=false;error=null;render();});
    render();return {update,measure};
  }
  return {createMutationInspector,renderMutationMap};
});
