'use strict';
// POLYCLOCK-001: deterministic TEST-ONLY sequencer, not a media render or BETA 0.0.0 input.
// Accumulated snapshots are explicit, caller-provided and never imply permission to KEEP.
const assertInt=(v,name)=>{if(!Number.isSafeInteger(v)||v<0)throw Error(name+' nonnegative safe integer required');return v;};
function clockFrame(step, seed){
  assertInt(step,'step');
  if(typeof seed!=='string'||seed.length>256)throw Error('bounded seed required');
  const sixty=step%60, sixtyFour=step%64;
  return Object.freeze({schema:'toaster.polyclock/0.1', step, pulseBasis:'one-declared-shared-pulse',
    percussionStep:sixty, visualStep:sixtyFour, sharedReturn:step>0&&sixty===0&&sixtyFour===0,
    sampleRef:seed,authority:'experimental-proposal-only'});
}
function lineageFrames(count,sourceAtReturn){
  assertInt(count,'count');
  if(count>10000||typeof sourceAtReturn!=='function')throw Error('bounded steps and explicit source resolver required');
  let source='initial';const out=[];
  for(let step=0;step<count;step++){
    // A new seed only becomes available AFTER a return; it never changes accepted ancestry.
    if(step>0&&step%960===0){
      const next=sourceAtReturn(step,source);
      if(typeof next!=='string'||!next.trim()||next.length>256)throw Error('invalid return source');
      source=next;
    }
    out.push(clockFrame(step,source));
  }
  return out;
}
module.exports={clockFrame,lineageFrames};
