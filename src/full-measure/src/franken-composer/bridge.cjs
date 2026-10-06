"use strict";
const fs=require("node:fs/promises");
const path=require("node:path");
const crypto=require("node:crypto");
const {pathToFileURL}=require("node:url");
const {canonicalBytes,canonicalize,hashCanonical}=require("../generation/canonical.cjs");
const {adaptPlaydeck}=require("./adapters/playdeck.cjs");
const {adaptAcceptedBlenderTake}=require("./adapters/blender-take.cjs");
const {frankenVideoDigestionReservoir}=require("../nextgen/live-crossings.cjs");
const {composeFrankenProposal,applyFrankenEdits,proposalToComposition}=require("./compose.cjs");
const {freezeFrankenComposition}=require("./freeze.cjs");
const {fingerprint256,stableStringify}=require("../renderer/one-pass.js");
const {compilePerformanceTrace}=require("../nextgen/performance-trace.cjs");
const {compileResidueMemory}=require("../nextgen/residue-memory.cjs");
const {compilePerformanceBundle,compilePerformanceProgram}=require("../nextgen/performance-program.cjs");
const {compileResidueTerrain,projectResidueTerrain}=require("../nextgen/playable-terrain.cjs");
const {acceptPossibilityCrossing,createPossibilityCrossingProposal}=require("../nextgen/possibility-interaction.cjs");
const {
  approveExecutionScope,
  createCrossingExecutionProgram,
  deriveAffectedRegionProposal,
  executeApprovedSparseScope,
  prepareSparseExecutionParcel,
  validateAffectedRegionProposal,
  validateExecutionScopeApproval,
}=require("../nextgen/crossing-execution-custody.cjs");
const {renderProgramWhole,validatePixelRegionReceipt}=require("../nextgen/performance-program-render.cjs");
const {
  composeCandidateDerivedFrameGraph,
  decideCandidateArtifact,
  materializeCandidateReview,
  validateReviewMediaReceipt,
}=require("../nextgen/artifact-adoption.cjs");
const {
  admitAdoptedArtifactImport,
  createAdoptedArtifactImportProposal,
  validateAdoptedArtifactImportProposal,
  validateAdoptedMaterialAdmission,
}=require("../nextgen/adopted-artifact-promotion.cjs");

const JSON_EXTENSIONS=new Set([".json"]);
const VIDEO_EXTENSIONS=new Set([".mp4"]);
const URI_SCHEME=/^[a-z][a-z0-9+.-]*:\/\//i;

function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function validateOnePassReceipt(receipt){
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))throw new TypeError("ONE PASS receipt must be an object.");
  if(receipt.schema!=="static-collective/one-pass-performance-receipt/v0")throw new TypeError("Unsupported ONE PASS receipt schema.");
  if(receipt.authority!=="witness-only")throw new TypeError("ONE PASS receipt must remain witness-only.");
  if(!/^[a-f0-9]{64}$/.test(String(receipt.performanceHash||"")))throw new TypeError("ONE PASS performance hash must be 64 lowercase hex characters.");
  if(!Array.isArray(receipt.events)||receipt.events.length>192)throw new TypeError("ONE PASS receipt events are outside the bounded performance envelope.");
  if(!Array.isArray(receipt.placements)||receipt.placements.length>96)throw new TypeError("ONE PASS receipt placements are outside the bounded performance envelope.");
  if(receipt.spatialSamples!==undefined&&!Array.isArray(receipt.spatialSamples))throw new TypeError("ONE PASS receipt spatial samples must be an array when present.");
  const spatialSamples=receipt.spatialSamples||[];
  if(spatialSamples.length>384)throw new TypeError("ONE PASS receipt spatial samples are outside the bounded performance envelope.");
  if(receipt.eventCount!==receipt.events.length||receipt.placementCount!==receipt.placements.length)throw new TypeError("ONE PASS receipt counts do not match its body.");
  if(receipt.spatialSampleCount!==undefined&&receipt.spatialSampleCount!==spatialSamples.length)throw new TypeError("ONE PASS receipt spatial sample count does not match its body.");
  const {performanceHash,...witness}=receipt;
  if(fingerprint256(stableStringify(witness))!==performanceHash)throw new TypeError("ONE PASS receipt fingerprint mismatch.");
  return canonicalize(receipt);
}
async function assertLocalFile(filePath,extensions,label){
  if(typeof filePath!=="string"||!filePath.trim())throw new TypeError(`Choose a ${label} first.`);
  const resolved=path.resolve(filePath);
  if(!extensions.has(path.extname(resolved).toLowerCase()))throw new TypeError(`That ${label} format is not supported.`);
  const stat=await fs.stat(resolved);
  if(!stat.isFile())throw new TypeError(`The selected ${label} is not a file.`);
  return resolved;
}
async function readJson(filePath,label){
  const resolved=await assertLocalFile(filePath,JSON_EXTENSIONS,label);
  const stat=await fs.stat(resolved);
  if(stat.size>2_000_000)throw new RangeError(`${label} is larger than the 2 MB safety limit.`);
  return {resolved,value:JSON.parse(await fs.readFile(resolved,"utf8"))};
}
function inside(base,target){const relative=path.relative(base,target);return relative!==""&&!relative.startsWith("..")&&!path.isAbsolute(relative);}
async function playdeckInputs(deckPath,worldRulePath,assetMapPath=null){
  const deckRecord=await readJson(deckPath,"Playdeck deck JSON");
  const worldRecord=await readJson(worldRulePath,"Playdeck world-rule JSON");
  const assetRecord=assetMapPath?await readJson(assetMapPath,"Playdeck local asset map JSON"):null;
  if(assetRecord&&(!assetRecord.value||typeof assetRecord.value!=="object"||Array.isArray(assetRecord.value)))throw new TypeError("Playdeck local asset map must be a JSON object.");
  const deckDir=path.dirname(deckRecord.resolved);
  const assetDir=assetRecord?path.dirname(assetRecord.resolved):null;
  const sourceDigests={};
  const sourcePathByIdentity={};
  for(const card of deckRecord.value.cards||[]){
    if(typeof card?.source!=="string"||!card.source.trim())throw new TypeError("Every Playdeck card requires a source identity.");
    if(sourcePathByIdentity[card.source])continue;
    let source;
    if(card.source.startsWith("asset://")){
      if(!assetRecord)throw new TypeError("Playdeck logical asset sources require an explicit local asset map.");
      const binding=assetRecord.value[card.source];
      if(typeof binding!=="string"||!binding.trim())throw new TypeError(`Local asset map has no binding for ${card.source}.`);
      if(URI_SCHEME.test(binding.trim()))throw new TypeError("Playdeck local asset map refuses remote or URI-scheme bindings.");
      source=path.resolve(assetDir,binding.trim());
      if(!inside(assetDir,source))throw new TypeError("Playdeck local asset bindings must stay inside the selected asset-map folder.");
    }else{
      source=path.resolve(deckDir,card.source);
      if(!inside(deckDir,source))throw new TypeError("Playdeck card sources must stay inside the selected deck folder.");
    }
    const stat=await fs.stat(source);
    if(!stat.isFile())throw new TypeError(`Playdeck source is not a file: ${card.source}`);
    sourceDigests[card.source]=sha256(await fs.readFile(source));
    sourcePathByIdentity[card.source]=source;
  }
  const playdeck=adaptPlaydeck({deck:deckRecord.value,worldRule:worldRecord.value,sourceDigests});
  const sourcePaths=Object.fromEntries(playdeck.cards.map(card=>[card.materialId,sourcePathByIdentity[card.source]]));
  return {playdeck,sourcePaths};
}
async function blenderInputs(acceptancePath,admissionReceiptPath,videoPath){
  const acceptance=await readJson(acceptancePath,"Blender acceptance JSON");
  const receipt=await readJson(admissionReceiptPath,"Blender admission receipt JSON");
  const video=await assertLocalFile(videoPath,VIDEO_EXTENSIONS,"Blender accepted take");
  const blenderTake=adaptAcceptedBlenderTake({acceptance:acceptance.value,acceptancePath:acceptance.resolved,admissionReceipt:receipt.value,videoPath:video});
  return {blenderTake,videoPath:video};
}
function publicProposal(proposal){const {_donor,...safe}=proposal;return canonicalize(safe);}
function proposalIdentity(proposal){return hashCanonical(publicProposal(proposal),"HauntedToaster-FrankenProposalPreview-v0");}
function previewAssets(proposal,assetBindings={}){
  const byId=new Map((proposal?.materials||[]).map(material=>[material.materialId,material]));
  return canonicalize(Object.fromEntries(
    Object.entries(assetBindings)
      .filter(([materialId,filePath])=>["image","video"].includes(byId.get(materialId)?.kind)&&typeof filePath==="string"&&filePath)
      .map(([materialId,filePath])=>[materialId,{
        kind:byId.get(materialId).kind,
        url:pathToFileURL(path.resolve(filePath)).href,
      }]),
  ));
}
async function buildProposal(config,{getNextGenContext=null,promotedReservoir=null}={}){
  const {playdeck,sourcePaths}=await playdeckInputs(config?.deckPath,config?.worldRulePath,config?.playdeckAssetMapPath);
  const {blenderTake,videoPath}=await blenderInputs(config?.blenderAcceptancePath,config?.blenderReceiptPath,config?.blenderVideoPath);
  let nextGenContext=null;
  if(config?.nextGen?.enabled===true){
    if(typeof getNextGenContext!=="function")throw new TypeError("NextGen organ crossing is unavailable in this Franken service.");
    nextGenContext=await getNextGenContext({
      rootSeed:String(config?.seed||"franken-001"),
      albumContext:structuredClone(config.nextGen.albumContext||{}),
    });
    const expected=String(config.nextGen.expectedCrossingIdentity||"").trim();
    if(!expected||expected!==nextGenContext.crossingIdentity){
      throw new TypeError("Franken composition refuses stale or unreviewed NextGen organ crossing identity.");
    }
  }
  let proposal=composeFrankenProposal({
    playdeck,
    blenderTake,
    seed:String(config?.seed||"franken-001"),
    nextGenContext,
    promotedReservoir,
  });
  if(config?.edits)proposal=applyFrankenEdits(proposal,config.edits);
  const reservoir=nextGenContext?frankenVideoDigestionReservoir(nextGenContext):{bindings:{}};
  return {
    proposal,
    assetBindings:{
      ...sourcePaths,
      [blenderTake.material.materialId]:videoPath,
      ...reservoir.bindings,
      ...(promotedReservoir?.bindings||{}),
    },
  };
}
function createFrankenComposerService({rootDir,getNextGenContext=null}={}){
  const outputRoot=path.resolve(rootDir||path.join(process.cwd(),"FrankenComposer"));

  async function adoptedArtifactReservoir(admissionPaths=[]){
    if(admissionPaths==null)return {materials:[],bindings:{},records:[]};
    if(!Array.isArray(admissionPaths)||admissionPaths.length>16)throw new TypeError("Adopted artifact admissions must be an array of at most sixteen package paths.");
    const materials=[],bindings={},records=[];
    const seenAdmissions=new Set(),seenMaterials=new Set();
    for(const [index,rawPath] of admissionPaths.entries()){
      const resolved=path.resolve(String(rawPath||""));
      if(!inside(outputRoot,resolved))throw new TypeError(`Adopted artifact admission ${index} must stay inside FrankenComposer output custody.`);
      const stat=await fs.stat(resolved);
      if(!stat.isFile()||stat.size>2_000_000)throw new TypeError(`Adopted artifact admission ${index} is not a bounded JSON receipt.`);
      const admission=validateAdoptedMaterialAdmission(JSON.parse(await fs.readFile(resolved,"utf8")));
      if(seenAdmissions.has(admission.admissionHash))continue;
      if(seenMaterials.has(admission.material.materialId))throw new TypeError(`Duplicate adopted material identity: ${admission.material.materialId}.`);
      const materialPath=path.join(path.dirname(resolved),"material.mp4");
      const mediaStat=await fs.stat(materialPath);
      if(!mediaStat.isFile()||mediaStat.size!==admission.mediaByteLength)throw new TypeError("Adopted artifact package media byte length mismatch.");
      const mediaBytes=await fs.readFile(materialPath);
      if(sha256(mediaBytes)!==admission.mediaSha256)throw new TypeError("Adopted artifact package media bytes no longer match admission.");
      seenAdmissions.add(admission.admissionHash);
      seenMaterials.add(admission.material.materialId);
      materials.push(admission.material);
      bindings[admission.material.materialId]=materialPath;
      records.push({
        materialId:admission.material.materialId,
        admissionHash:admission.admissionHash,
        sourceDispositionHash:admission.sourceDispositionHash,
        candidateGraphHash:admission.candidateGraphHash,
        mediaSha256:admission.mediaSha256,
      });
    }
    return {
      materials:canonicalize(materials),
      bindings,
      records:canonicalize(records.sort((a,b)=>a.materialId.localeCompare(b.materialId))),
    };
  }

  async function proposalInputs(config){
    return adoptedArtifactReservoir(config?.adoptedArtifactAdmissionPaths||[]);
  }

  return Object.freeze({
    async compose(config){const promotedReservoir=await proposalInputs(config);const {proposal,assetBindings}=await buildProposal(config,{getNextGenContext,promotedReservoir});return {proposalIdentity:proposalIdentity(proposal),proposal:publicProposal(proposal),previewAssets:previewAssets(proposal,assetBindings)};},
    async freeze(config){const promotedReservoir=await proposalInputs(config);const {proposal,assetBindings}=await buildProposal(config,{getNextGenContext,promotedReservoir});const identity=proposalIdentity(proposal);if(typeof config?.expectedProposalIdentity!=="string"||config.expectedProposalIdentity!==identity)throw new TypeError("Franken freeze refuses stale or unreviewed proposal identity.");const frozen=freezeFrankenComposition(proposalToComposition(proposal));return {...frozen,assetBindings};},
    async derivePerformanceEcology(receipt){
      const validated=validateOnePassReceipt(receipt);
      const trace=compilePerformanceTrace(validated);
      const residueMemory=compileResidueMemory(trace);
      return canonicalize({
        schema:"static-collective/performance-ecology-preview/v0",
        authority:"proposal-preview-only",
        performanceHash:validated.performanceHash,
        trace,
        residueMemory,
      });
    },
    async derivePlayableTerrain(receipt,options={}){
      const validated=validateOnePassReceipt(receipt);
      const program=compilePerformanceProgram(validated);
      const terrain=compileResidueTerrain(program,{
        maxSamples:options?.maxSamples??64,
        baseEnergy:options?.baseEnergy??.8,
      });
      const projection=projectResidueTerrain(terrain);
      return canonicalize({terrain,projection});
    },
    async proposePossibilityCrossing(map,frame){
      return createPossibilityCrossingProposal(map,{frame});
    },
    async acceptPossibilityCrossing(proposal,expectedProposalHash){
      const binding=acceptPossibilityCrossing(proposal,{
        expectedProposalHash,
        acceptedBy:"human-ui",
      });
      const dir=path.join(outputRoot,"possibility-bindings");
      const bindingPath=path.join(dir,`${binding.bindingHash}.json`);
      await fs.mkdir(dir,{recursive:true});
      const bytes=canonicalBytes(binding);
      try{
        await fs.writeFile(bindingPath,bytes,{flag:"wx"});
        return {binding,path:bindingPath,existing:false};
      }catch(error){
        if(error?.code!=="EEXIST")throw error;
        const existing=await fs.readFile(bindingPath);
        if(!existing.equals(bytes))throw new Error("Existing possibility binding bytes do not match accepted crossing.");
        return {binding,path:bindingPath,existing:true};
      }
    },
    async prepareCrossingExecution(receipt,binding,options={}){
      const validated=validateOnePassReceipt(receipt);
      const sourceProgram=compilePerformanceProgram(validated);
      const derivedProgram=createCrossingExecutionProgram(sourceProgram,binding,{
        wakeStrength:options?.wakeStrength??1,
      });
      const scopeProposal=deriveAffectedRegionProposal(sourceProgram,derivedProgram,binding);
      return canonicalize({
        sourceProgramHash:sourceProgram.programHash,
        derivedProgram,
        scopeProposal,
      });
    },
    async approveCrossingExecutionScope(receipt,binding,scopeProposal,expectedScopeProposalHash){
      const validated=validateOnePassReceipt(receipt);
      const sourceProgram=compilePerformanceProgram(validated);
      const derivedProgram=createCrossingExecutionProgram(sourceProgram,binding,{
        wakeStrength:scopeProposal?.wakeStrength,
        decayPerFrame:scopeProposal?.decayPerFrame,
      });
      validateAffectedRegionProposal(sourceProgram,derivedProgram,binding,scopeProposal);
      const approval=approveExecutionScope(scopeProposal,{
        expectedScopeProposalHash,
        approvedBy:"human-ui",
      });
      validateExecutionScopeApproval(scopeProposal,approval);
      const dir=path.join(outputRoot,"crossing-scope-approvals");
      const approvalPath=path.join(dir,`${approval.scopeApprovalHash}.json`);
      await fs.mkdir(dir,{recursive:true});
      const bytes=canonicalBytes(approval);
      try{
        await fs.writeFile(approvalPath,bytes,{flag:"wx"});
        return {approval,path:approvalPath,existing:false};
      }catch(error){
        if(error?.code!=="EEXIST")throw error;
        const existing=await fs.readFile(approvalPath);
        if(!existing.equals(bytes))throw new Error("Existing scope approval bytes do not match approved execution scope.");
        return {approval,path:approvalPath,existing:true};
      }
    },
    async executeApprovedCrossing(receipt,binding,scopeProposal,scopeApproval,{localExecutionAuthorized=false}={}){
      const validated=validateOnePassReceipt(receipt);
      const sourceProgram=compilePerformanceProgram(validated);
      const derivedProgram=createCrossingExecutionProgram(sourceProgram,binding,{
        wakeStrength:scopeProposal?.wakeStrength,
        decayPerFrame:scopeProposal?.decayPerFrame,
      });
      validateAffectedRegionProposal(sourceProgram,derivedProgram,binding,scopeProposal);
      validateExecutionScopeApproval(scopeProposal,scopeApproval);
      const parcel=prepareSparseExecutionParcel(derivedProgram,scopeProposal,scopeApproval,{
        assignmentOwnerParticular:"toaster-owner:020",
        workerParticular:"toaster-local-renderer:020",
        issuanceCut:`scope:${scopeApproval.scopeApprovalHash}:open`,
        expiryCut:`scope:${scopeApproval.scopeApprovalHash}:manual-close`,
      });
      const dir=path.join(outputRoot,"crossing-executions",binding.bindingHash,scopeApproval.scopeApprovalHash);
      const pixelsDir=path.join(dir,"pixels");
      const executed=await executeApprovedSparseScope(
        derivedProgram,scopeProposal,scopeApproval,parcel,{
          rootDir:pixelsDir,
          localExecutionAuthorized,
        },
      );
      await fs.mkdir(dir,{recursive:true});
      const artifacts=[
        ["derived-program.json",derivedProgram],
        ["scope-proposal.json",scopeProposal],
        ["scope-approval.json",scopeApproval],
        ["sparse-parcel.json",parcel],
        ["sparse-result.json",executed.result],
      ];
      const paths={directory:dir,pixelsDirectory:pixelsDir};
      for(const [name,value] of artifacts){
        const filePath=path.join(dir,name);
        const bytes=canonicalBytes(value);
        try{
          await fs.writeFile(filePath,bytes,{flag:"wx"});
        }catch(error){
          if(error?.code!=="EEXIST")throw error;
          const existing=await fs.readFile(filePath);
          if(!existing.equals(bytes))throw new Error(`Existing crossing execution artifact changed: ${name}.`);
        }
        paths[name.replace(/\.json$/,"Path").replace(/-([a-z])/g,(_m,ch)=>ch.toUpperCase())]=filePath;
      }
      return {
        derivedProgramHash:derivedProgram.programHash,
        parcel,
        result:executed.result,
        receiptCount:executed.receipts.length,
        receipts:executed.receipts,
        outputs:executed.outputs||[],
        ...paths,
      };
    },
    async prepareCandidateArtifactReview(receipt,binding,scopeProposal,scopeApproval,executionResult){
      const validated=validateOnePassReceipt(receipt);
      const sourceProgram=compilePerformanceProgram(validated);
      const derivedProgram=createCrossingExecutionProgram(sourceProgram,binding,{
        wakeStrength:scopeProposal?.wakeStrength,
        decayPerFrame:scopeProposal?.decayPerFrame,
      });
      validateAffectedRegionProposal(sourceProgram,derivedProgram,binding,scopeProposal);
      validateExecutionScopeApproval(scopeProposal,scopeApproval);
      if(!executionResult||executionResult.result?.sourceScopeApprovalHash!==scopeApproval.scopeApprovalHash){
        throw new TypeError("Candidate review execution-result/scope lineage mismatch.");
      }
      if(executionResult.result?.programHash!==derivedProgram.programHash){
        throw new TypeError("Candidate review execution-result/program lineage mismatch.");
      }
      const receipts=(executionResult.receipts||[]).map(item=>validatePixelRegionReceipt(derivedProgram,item));
      const consumed=executionResult.result?.consumedRegionIds||[];
      if(JSON.stringify(consumed)!==JSON.stringify(scopeProposal.affectedRegionIds)){
        throw new TypeError("Candidate review requires complete approved sparse execution.");
      }
      const sourceWhole=await renderProgramWhole(sourceProgram,{
        rootDir:path.join(outputRoot,"crossing-reviews","source-world"),
        workerId:"toaster-review-source:021",
        attemptId:`source-${scopeApproval.scopeApprovalHash.slice(0,12)}`,
      });
      const graph=composeCandidateDerivedFrameGraph(
        sourceProgram,derivedProgram,scopeProposal,scopeApproval,sourceWhole.receipt,receipts,
      );
      const outputsByHash=new Map((executionResult.outputs||[]).map(item=>[item.receiptHash,item]));
      const derivedOutputs=receipts.map(receipt=>{
        const output=outputsByHash.get(receipt.receiptHash);
        if(!output?.directory)throw new TypeError(`Candidate review missing sparse output directory for ${receipt.receiptHash}.`);
        return {directory:output.directory,receipt};
      });
      const review=await materializeCandidateReview(graph,{
        sourceWholeOutput:sourceWhole,
        derivedOutputs,
        rootDir:path.join(outputRoot,"crossing-reviews",binding.bindingHash,scopeApproval.scopeApprovalHash),
      });
      return {
        graph,
        reviewReceipt:review.receipt,
        directory:review.directory,
        framesDirectory:review.framesDirectory,
        mediaPath:review.mediaPath,
        mediaUrl:pathToFileURL(review.mediaPath).href,
      };
    },
    async decideCandidateArtifact(graph,reviewReceipt,decision,expectedCandidateGraphHash){
      const validatedReview=validateReviewMediaReceipt(reviewReceipt);
      if(validatedReview.candidateGraphHash!==graph?.candidateGraphHash)throw new TypeError("Artifact disposition review-media/candidate-graph mismatch.");
      const disposition=decideCandidateArtifact(graph,{
        decision,
        expectedCandidateGraphHash,
        reviewMediaSha256:validatedReview.mediaSha256,
        decidedBy:"human-ui",
      });
      const dir=path.join(outputRoot,"artifact-dispositions",graph.candidateGraphHash);
      await fs.mkdir(dir,{recursive:true});
      const dispositionPath=path.join(dir,"disposition.json");
      const bytes=canonicalBytes(disposition);
      try{
        await fs.writeFile(dispositionPath,bytes,{flag:"wx"});
        return {disposition,path:dispositionPath,existing:false};
      }catch(error){
        if(error?.code!=="EEXIST")throw error;
        const existing=await fs.readFile(dispositionPath);
        if(!existing.equals(bytes))throw new Error("Candidate graph already has a different artifact disposition; refusing contradictory ADOPT/REJECT.");
        return {disposition,path:dispositionPath,existing:true};
      }
    },
    async proposeAdoptedArtifactImport(graph,reviewReceipt,disposition,mediaPath){
      const resolved=await assertLocalFile(mediaPath,VIDEO_EXTENSIONS,"adopted review media");
      if(!inside(outputRoot,resolved))throw new TypeError("Adopted review media must originate inside FrankenComposer output custody.");
      const bytes=await fs.readFile(resolved);
      const review=validateReviewMediaReceipt(reviewReceipt);
      if(bytes.length!==review.mediaByteLength||sha256(bytes)!==review.mediaSha256)throw new TypeError("Adopted review media bytes do not match the reviewed artifact receipt.");
      const proposal=createAdoptedArtifactImportProposal({
        candidateGraph:graph,
        reviewMediaReceipt:review,
        disposition,
      });
      return {
        proposal,
        mediaPath:resolved,
        mediaUrl:pathToFileURL(resolved).href,
      };
    },
    async admitAdoptedArtifactImport(proposal,expectedImportProposalHash,mediaPath){
      const source=validateAdoptedArtifactImportProposal(proposal);
      const resolved=await assertLocalFile(mediaPath,VIDEO_EXTENSIONS,"adopted review media");
      if(!inside(outputRoot,resolved))throw new TypeError("Adopted review media must remain inside FrankenComposer output custody.");
      const bytes=await fs.readFile(resolved);
      if(bytes.length!==source.mediaByteLength||sha256(bytes)!==source.mediaSha256)throw new TypeError("Adopted review media bytes changed before material admission.");
      const admission=admitAdoptedArtifactImport(source,{
        expectedImportProposalHash,
        admittedBy:"human-ui",
      });
      const dir=path.join(outputRoot,"adopted-artifacts",admission.admissionHash);
      await fs.mkdir(dir,{recursive:true});
      const materialPath=path.join(dir,"material.mp4");
      const admissionPath=path.join(dir,"admission.json");
      try{
        await fs.writeFile(materialPath,bytes,{flag:"wx"});
      }catch(error){
        if(error?.code!=="EEXIST")throw error;
        const existing=await fs.readFile(materialPath);
        if(!existing.equals(bytes))throw new Error("Existing adopted artifact media bytes conflict with admission.");
      }
      const admissionBytes=canonicalBytes(admission);
      try{
        await fs.writeFile(admissionPath,admissionBytes,{flag:"wx"});
      }catch(error){
        if(error?.code!=="EEXIST")throw error;
        const existing=await fs.readFile(admissionPath);
        if(!existing.equals(admissionBytes))throw new Error("Existing adopted artifact admission bytes conflict.");
      }
      return {
        admission,
        admissionPath,
        materialPath,
        materialUrl:pathToFileURL(materialPath).href,
        descriptor:{
          materialId:admission.material.materialId,
          roleId:"adopted-world",
          projectionClass:"adopted-artifact",
          planHash:admission.admissionHash,
          sourceDurationFrames:admission.material.derivation.sourceDurationFrames,
          admissionHash:admission.admissionHash,
          sourceDispositionHash:admission.sourceDispositionHash,
          candidateGraphHash:admission.candidateGraphHash,
          mediaSha256:admission.mediaSha256,
        },
      };
    },
    async writePerformanceProgramBundle(receipt){
      const validated=validateOnePassReceipt(receipt);
      const {program,renderRegionPlan,executionReceipt}=compilePerformanceBundle(validated);
      const dir=path.join(outputRoot,"performance-program",program.programHash);
      const programPath=path.join(dir,"performance-program.json");
      const renderRegionPlanPath=path.join(dir,"render-region-plan.json");
      const executionReceiptPath=path.join(dir,"execution-receipt.json");
      await fs.mkdir(dir,{recursive:true});
      for(const [file,value] of [
        [programPath,program],
        [renderRegionPlanPath,renderRegionPlan],
        [executionReceiptPath,executionReceipt],
      ]){
        const bytes=canonicalBytes(value);
        try{
          await fs.writeFile(file,bytes,{flag:"wx"});
        }catch(error){
          if(error?.code!=="EEXIST")throw error;
          const existing=await fs.readFile(file);
          if(!existing.equals(bytes))throw new Error("Existing PerformanceProgram artifact bytes do not match the compiled take.");
        }
      }
      return {
        directory:dir,
        programPath,
        renderRegionPlanPath,
        executionReceiptPath,
        programHash:program.programHash,
        regionPlanHash:renderRegionPlan.regionPlanHash,
        executionStateHash:executionReceipt.stateHash,
      };
    },
    async writeOnePassReceipt(receipt){
      const validated=validateOnePassReceipt(receipt);
      const dir=path.join(outputRoot,"one-pass");
      const receiptPath=path.join(dir,`${validated.performanceHash}.one-pass.json`);
      const bytes=canonicalBytes(validated);
      await fs.mkdir(dir,{recursive:true});
      try{
        await fs.writeFile(receiptPath,bytes,{flag:"wx"});
        return {path:receiptPath,performanceHash:validated.performanceHash,existing:false};
      }catch(error){
        if(error?.code!=="EEXIST")throw error;
        const existing=await fs.readFile(receiptPath);
        if(!existing.equals(bytes))throw new Error("Existing ONE PASS receipt bytes do not match the sealed witness.");
        return {path:receiptPath,performanceHash:validated.performanceHash,existing:true};
      }
    },
    async writeProjectionBundle(config){const frozen=await this.freeze(config);const dir=path.join(outputRoot,frozen.planHash);await fs.mkdir(dir,{recursive:true});const planPath=path.join(dir,"franken-composition.json"),bindingsPath=path.join(dir,"asset-bindings.json");for(const [file,bytes] of [[planPath,canonicalBytes(frozen.plan)],[bindingsPath,Buffer.from(JSON.stringify(frozen.assetBindings,null,2)+"\n","utf8")]]){try{await fs.writeFile(file,bytes,{flag:"wx"});}catch(error){if(error?.code==="EEXIST")throw new Error("Franken projection bundle already exists; refusing overwrite.");throw error;}}return {directory:dir,planPath,assetBindingsPath:bindingsPath,planHash:frozen.planHash};}
  });
}
function registerFrankenComposerIpc(ipcMain,{dialog,getWindow,rootDir,assertAvailable=()=>{},getNextGenContext=null}={}){
  const service=createFrankenComposerService({rootDir,getNextGenContext});
  const choose=async(title,extensions)=>{assertAvailable();const result=await dialog.showOpenDialog(getWindow(),{title,properties:["openFile"],filters:[{name:title,extensions}]});return result.canceled?null:result.filePaths[0];};
  ipcMain.handle("franken:choose-deck",()=>choose("Choose Playdeck deck JSON",["json"]));
  ipcMain.handle("franken:choose-world-rule",()=>choose("Choose Playdeck world-rule JSON",["json"]));
  ipcMain.handle("franken:choose-playdeck-asset-map",()=>choose("Choose Playdeck local asset map",["json"]));
  ipcMain.handle("franken:choose-blender-acceptance",()=>choose("Choose Blender accepted-take JSON",["json"]));
  ipcMain.handle("franken:choose-blender-receipt",()=>choose("Choose Blender admission receipt JSON",["json"]));
  ipcMain.handle("franken:choose-blender-video",()=>choose("Choose Blender accepted take",["mp4"]));
  ipcMain.handle("franken:compose",async(_event,config)=>{assertAvailable();return service.compose(config);});
  ipcMain.handle("franken:freeze",async(_event,config)=>{assertAvailable();const result=await service.freeze(config);return {plan:result.plan,planHash:result.planHash};});
  ipcMain.handle("franken:derive-performance-ecology",async(_event,receipt)=>{assertAvailable();return service.derivePerformanceEcology(receipt);});
  ipcMain.handle("franken:derive-playable-terrain",async(_event,receipt,options)=>{assertAvailable();return service.derivePlayableTerrain(receipt,options);});
  ipcMain.handle("franken:propose-possibility-crossing",async(_event,map,frame)=>{assertAvailable();return service.proposePossibilityCrossing(map,frame);});
  ipcMain.handle("franken:accept-possibility-crossing",async(_event,proposal,expectedProposalHash)=>{assertAvailable();return service.acceptPossibilityCrossing(proposal,expectedProposalHash);});
  ipcMain.handle("franken:prepare-crossing-execution",async(_event,receipt,binding,options)=>{assertAvailable();return service.prepareCrossingExecution(receipt,binding,options);});
  ipcMain.handle("franken:approve-crossing-scope",async(_event,receipt,binding,scopeProposal,expectedScopeProposalHash)=>{assertAvailable();return service.approveCrossingExecutionScope(receipt,binding,scopeProposal,expectedScopeProposalHash);});
  ipcMain.handle("franken:execute-approved-crossing",async(_event,receipt,binding,scopeProposal,scopeApproval,options)=>{assertAvailable();return service.executeApprovedCrossing(receipt,binding,scopeProposal,scopeApproval,options);});
  ipcMain.handle("franken:prepare-candidate-artifact-review",async(_event,receipt,binding,scopeProposal,scopeApproval,executionResult)=>{assertAvailable();return service.prepareCandidateArtifactReview(receipt,binding,scopeProposal,scopeApproval,executionResult);});
  ipcMain.handle("franken:decide-candidate-artifact",async(_event,graph,reviewReceipt,decision,expectedCandidateGraphHash)=>{assertAvailable();return service.decideCandidateArtifact(graph,reviewReceipt,decision,expectedCandidateGraphHash);});
  ipcMain.handle("franken:propose-adopted-artifact-import",async(_event,graph,reviewReceipt,disposition,mediaPath)=>{assertAvailable();return service.proposeAdoptedArtifactImport(graph,reviewReceipt,disposition,mediaPath);});
  ipcMain.handle("franken:admit-adopted-artifact-import",async(_event,proposal,expectedImportProposalHash,mediaPath)=>{assertAvailable();return service.admitAdoptedArtifactImport(proposal,expectedImportProposalHash,mediaPath);});
  ipcMain.handle("franken:write-performance-program-bundle",async(_event,receipt)=>{assertAvailable();return service.writePerformanceProgramBundle(receipt);});
  ipcMain.handle("franken:write-one-pass-receipt",async(_event,receipt)=>{assertAvailable();return service.writeOnePassReceipt(receipt);});
  ipcMain.handle("franken:write-projection-bundle",async(_event,config)=>{assertAvailable();return service.writeProjectionBundle(config);});
  return service;
}
module.exports={JSON_EXTENSIONS,VIDEO_EXTENSIONS,assertLocalFile,createFrankenComposerService,previewAssets,proposalIdentity,registerFrankenComposerIpc,validateOnePassReceipt};
