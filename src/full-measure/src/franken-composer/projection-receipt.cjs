"use strict";
const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const SHA=/^[a-f0-9]{64}$/;
function createProjectionReceipt({renderer,planHash,projectionIdentity,checks={},output=null}={}){
 if(!["hyperframes","remotion"].includes(renderer))throw new TypeError("Projection renderer must be hyperframes or remotion.");
 if(typeof planHash!=="string"||!SHA.test(planHash))throw new TypeError("Projection receipt needs a canonical plan hash.");
 if(typeof projectionIdentity!=="string"||!projectionIdentity.trim())throw new TypeError("Projection receipt needs projection identity.");
 if(renderer==="hyperframes")for(const key of ["lint","validate","inspect"]){if(checks[key]!==true)throw new TypeError(`HyperFrames projection receipt requires ${key} evidence.`);}
 if(renderer==="remotion"&&checks.discover!==true)throw new TypeError("Remotion projection receipt requires composition discovery evidence.");
 const core=canonicalize({schema:"static-collective/franken-projection-receipt/v0",renderer,planHash,projectionIdentity:projectionIdentity.trim(),checks,output,status:"projection-validated",authority:"projection-evidence-only"});
 return deepFreeze({...core,receiptId:`fpr0_${hashCanonical(core,"HauntedToaster-FrankenProjectionReceipt-v0")}`});
}
module.exports={createProjectionReceipt};
