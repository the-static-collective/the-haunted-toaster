const test=require("node:test");
const assert=require("node:assert/strict");
const {
  buildNextGenLiveCrossing,
  frankenVideoDigestionReservoir,
  publicCrossingView,
}=require("../src/nextgen/live-crossings.cjs");

const analysis={
  schema:"haunted-toaster/analysis.v1",
  durationSeconds:3,
  sections:[
    {startSeconds:0,endSeconds:1,energy:0.2,label:"opening"},
    {startSeconds:1,endSeconds:2,energy:0.8,label:"lift"},
    {startSeconds:2,endSeconds:3,energy:0.55,label:"arrival"},
  ],
  phrases:[{atSeconds:1.2,energy:0.7}],
  transients:[{atSeconds:1.8,energy:0.9}],
};

function video(){
  return {
    schema:"haunted-toaster/video-source/v1",
    specimenId:`sha256:${"a".repeat(64)}:4096`,
    sourceSha256:"a".repeat(64),
    byteLength:4096,
    path:"/tmp/nextgen-video.mp4",
    filename:"nextgen-video.mp4",
    probe:{durationSeconds:1,width:64,height:36,frameRate:"8/1"},
  };
}

const timeline={durationTicks:24,timebase:8,timelineHash:"b".repeat(64)};

test("Listening Eye becomes deterministic influence-only Franken pressure",()=>{
  const a=buildNextGenLiveCrossing({
    analysis,
    rootSeed:"nextgen-seed",
    albumContext:{albumId:"album-1",trackIndex:2,trackCount:5},
  });
  const b=buildNextGenLiveCrossing({
    analysis,
    rootSeed:"nextgen-seed",
    albumContext:{albumId:"album-1",trackIndex:2,trackCount:5},
  });
  assert.equal(a.crossingIdentity,b.crossingIdentity);
  assert.equal(a.listeningEye.authority,"influence-only");
  assert.equal(a.frankenPressure.authority,"influence-only");
  assert.ok(["ARRIVE","CROSS","ASSEMBLE"].includes(a.frankenPressure.edits.movingTakeSceneId));
  assert.ok(["panel-wipe","radial-reveal"].includes(a.frankenPressure.edits.transitions.arriveCross));
  assert.ok(["panel-wipe","radial-reveal"].includes(a.frankenPressure.edits.transitions.crossAssemble));
});

test("one admitted video becomes six addressable Franken reservoir materials",()=>{
  const crossing=buildNextGenLiveCrossing({
    analysis,
    rootSeed:"nextgen-seed",
    videoBinding:video(),
    timeline,
    timelineHash:timeline.timelineHash,
    candidateIndex:0,
  });
  assert.equal(crossing.videoDigestion.descendants.length,6);
  const reservoir=frankenVideoDigestionReservoir(crossing);
  assert.equal(reservoir.materials.length,6);
  assert.equal(Object.keys(reservoir.bindings).length,6);
  assert.equal(new Set(reservoir.materials.map((m)=>m.materialId)).size,6);
  assert.equal(new Set(reservoir.materials.map((m)=>m.derivation.planHash)).size,6);
  assert.deepEqual(new Set(Object.values(reservoir.bindings)),new Set(["/tmp/nextgen-video.mp4"]));
  for(const material of reservoir.materials){
    assert.equal(material.kind,"video");
    assert.equal(material.derivation.authority,"proposal-only");
    assert.equal(material.digest,"a".repeat(64));
  }
});

test("public crossing view removes private source plans while retaining exact identities",()=>{
  const crossing=buildNextGenLiveCrossing({
    analysis,
    rootSeed:"nextgen-seed",
    videoBinding:video(),
    timeline,
  });
  const view=publicCrossingView(crossing);
  assert.equal(view._private,undefined);
  assert.equal(view.crossingIdentity,crossing.crossingIdentity);
  assert.equal(view.videoDigestion.familyHash,crossing.videoDigestion.familyHash);
  assert.equal(view.videoDigestion.descendants.length,6);
  assert.equal(view.videoDigestion.descendants[0].plan,undefined);
});
