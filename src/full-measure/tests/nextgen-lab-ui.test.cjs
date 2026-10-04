const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {JSDOM}=require("jsdom");
const ui=require("../src/renderer/nextgen-lab-ui.js");

function dom(){
  return new JSDOM(`<!doctype html><body>
    <div id="songFacts" class="is-hidden"></div>
    <div id="betaSixUpGrid"></div>
    <code id="frankenPlanHash">No frozen plan</code>
    <div id="resultCard" class="is-hidden"></div>
  </body>`).window.document;
}

test("NextGen lab follows real Toaster witnesses in order",()=>{
  const document=dom();
  assert.deepEqual(ui.deriveState(document),{hear:false,dream:false,compose:false,render:false});
  assert.equal(ui.nextAction(ui.deriveState(document)),"hear");
  document.getElementById("songFacts").classList.remove("is-hidden");
  assert.equal(ui.nextAction(ui.deriveState(document)),"dream");
  document.getElementById("betaSixUpGrid").append(document.createElement("div"));
  assert.equal(ui.nextAction(ui.deriveState(document)),"compose");
  document.getElementById("frankenPlanHash").textContent="abc123";
  assert.equal(ui.nextAction(ui.deriveState(document)),"render");
  document.getElementById("resultCard").classList.remove("is-hidden");
  assert.equal(ui.nextAction(ui.deriveState(document)),"complete");
});

test("organ rows preserve profile pipeline order and authority",()=>{
  const rows=ui.organRows({
    pipeline:["listener","frankenComposer"],
    organs:{
      listener:{phase:"sense",authority:"diagnostic-only",ref:"listener",sha:"a".repeat(40)},
      frankenComposer:{phase:"compose",authority:"composition-plan-only",ref:"composer",sha:"b".repeat(40)},
    },
  });
  assert.deepEqual(rows.map((x)=>x.key),["listener","frankenComposer"]);
  assert.equal(rows[0].authority,"diagnostic-only");
});

test("renderer includes one NextGen lab rail and assets",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../src/renderer/index.html"),"utf8");
  assert.match(html,/id="nextgenLabToggle"/);
  assert.match(html,/id="nextgenLab"/);
  assert.match(html,/nextgen-lab-ui\.css/);
  assert.match(html,/nextgen-lab-ui\.js/);
});
