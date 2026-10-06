"use strict";
const fs=require("node:fs/promises");const path=require("node:path");const os=require("node:os");const assert=require("node:assert/strict");
const {_electron:electron}=require("@playwright/test");
const {specimen}=require("../tests/fixtures/mutation-specimen.cjs");
const {compileGenerationalEcology}=require("../src/nextgen/generational-ecology.cjs");
const {compileFamilyMutations}=require("../src/nextgen/mutation-record.cjs");
const {execFileSync}=require("node:child_process");
const {canonicalBytes}=require("../src/generation/canonical.cjs");
async function main(){
  const executablePath=process.argv[2];
  if(!executablePath)throw new Error("Pass the unpacked packaged Electron executable path.");
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-024-packaged-"));let app;
  const inputs=specimen(c=>{c.placements[0].transform.x+=.1;});
  const evidencePath=path.join(root,"parent-witness.json");
  await fs.writeFile(evidencePath,canonicalBytes(inputs.parentEvidence[0]));
  try{
    app=await electron.launch({executablePath:path.resolve(executablePath),args:["--no-sandbox","--disable-gpu"],env:{...process.env,XDG_CONFIG_HOME:path.join(root,"config")}});
    const isPackaged=await app.evaluate(({app})=>app.isPackaged);assert.equal(isPackaged,true);
    const page=await app.firstWindow();await page.waitForFunction(()=>window.fullMeasure&&window.MutationMap);
    const headCommit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
    const buildInfo=await page.evaluate(()=>window.fullMeasure.getBuildInfo());
    assert.equal(buildInfo.commit,headCommit);assert.equal(buildInfo.sourceMode,false);
    await app.evaluate(({dialog},filePath)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[filePath]});},evidencePath);
    assert.equal(await page.evaluate(()=>window.fullMeasure.chooseMutationParentEvidence()),evidencePath);
    const rows=await page.evaluate(({receipts,paths})=>window.fullMeasure.measureMutation(receipts,paths),{receipts:inputs.performanceReceipts,paths:[evidencePath]});
    assert.deepEqual(rows.map(row=>row.record),compileFamilyMutations(inputs));
    assert.equal(rows.length,1);assert.equal(rows[0].record.deltas.placement.distance,1);
    assert.deepEqual(await fs.readFile(rows[0].path),canonicalBytes(rows[0].record));
    assert.equal(await page.evaluate(({file,receipts,paths})=>window.fullMeasure.verifyMutation(file,receipts,paths),{file:rows[0].path,receipts:inputs.performanceReceipts,paths:[evidencePath]}),true);
    await page.evaluate(({ecology,receipt})=>{
      document.getElementById("frankenComposerWindow").hidden=false;
      window.__mutationInspector=window.MutationMap.createMutationInspector({document,bridge:window.fullMeasure});
      window.__mutationInspector.update({ecology,receipt});
    },{ecology:compileGenerationalEcology(inputs),receipt:inputs.performanceReceipts[0]});
    await page.locator("#frankenMutationParent").click();
    await page.locator("#frankenMeasureMutation").click();
    await page.waitForFunction(()=>document.getElementById("frankenMutationStatus").textContent.includes("Index 1"));
    await page.locator("#frankenVerifyMutation").click();
    await page.waitForFunction(()=>document.getElementById("frankenMutationStatus").textContent.includes("RE-VERIFIED"));
    assert.equal(await page.locator("#frankenFreeze").isDisabled(),true);
    const bad=JSON.parse(await fs.readFile(evidencePath,"utf8"));bad.performanceReceipt.placements[0].transform.x+=.1;
    await fs.writeFile(evidencePath,JSON.stringify(bad));
    await page.locator("#frankenVerifyMutation").click();
    await page.waitForFunction(()=>document.getElementById("frankenMutationStatus").textContent.includes("MUTATION REFUSED"));
    const proofDir=path.resolve(__dirname,"../test-artifacts/mutation-distance");await fs.mkdir(proofDir,{recursive:true});
    await page.setViewportSize({width:1380,height:900});
    await page.locator(".franken-mutation").scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(proofDir,"packaged-mutation-map.png")});
    await fs.writeFile(path.join(proofDir,"packaged-proof.json"),JSON.stringify({isPackaged,headCommit,mutationRecordHash:rows[0].record.mutationRecordHash,checks:["real-preload","real-ipc","create-only-filesystem","independent-verification","parent-dialog-route","dimension-ui","tampered-evidence-refusal","freeze-stays-disabled"],nativeDialogVisuals:"unproven; dialog return supplied by harness"},null,2));
    console.log("Packaged mutation proof PASS: real preload, IPC, persistence, replay and tamper refusal.");
  }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
