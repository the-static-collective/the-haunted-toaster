"use strict";
const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const SHA=/^[a-f0-9]{64}$/;
function createCompositionReceipt({plan,planHash}={}){
  if(!plan||typeof plan!=="object")throw new TypeError("Composition receipt requires the frozen plan.");
  if(typeof planHash!=="string"||!SHA.test(planHash)||plan.receipts?.planHash!==planHash)throw new TypeError("Composition receipt requires the exact frozen plan hash.");
  const materialSetHash=hashCanonical(plan.materials.map(m=>({materialId:m.materialId,kind:m.kind,digest:m.digest})),"HauntedToaster-FrankenMaterialSet-v0");
  const core=canonicalize({schema:"static-collective/franken-composition-receipt/v0",status:"frozen-composition",authority:"composition-evidence-only",planHash,seed:plan.seed,fps:plan.fps,durationFrames:plan.durationFrames,sceneCount:plan.scenes.length,materialCount:plan.materials.length,materialSetHash,policyVersion:plan.policy});
  return deepFreeze({...core,receiptId:`fcr0_${hashCanonical(core,"HauntedToaster-FrankenCompositionReceipt-v0")}`});
}
module.exports={createCompositionReceipt};
