"use strict";
const {canonicalBytes,hashCanonical,deepFreeze}=require("../generation/canonical.cjs");
const {normalizeFrankenComposition,hashDomainForPlan}=require("./schema.cjs");
function freezeFrankenComposition(input){const normalized=normalizeFrankenComposition(input);const planHash=hashCanonical(normalized,hashDomainForPlan(normalized));const plan=deepFreeze({...normalized,receipts:deepFreeze({...normalized.receipts,planHash})});return Object.freeze({plan,bytes:canonicalBytes(plan),planHash});}
module.exports={freezeFrankenComposition};
