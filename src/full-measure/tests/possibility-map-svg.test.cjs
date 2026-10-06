"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  renderPossibilityMapSvg,
}=require("../src/nextgen/possibility-map-svg.cjs");
const {canonicalize,hashCanonical}=require("../src/generation/canonical.cjs");

function map(sourceCandidateId="return-with-altered-clock"){
  const body={
    schema:"static-collective/possibility-map/v0",
    policy:"one-crossing-over-song-time/v0",
    authority:"observational-only",
    sourceProgramHash:"a".repeat(64),
    sourcePerformanceHash:"b".repeat(64),
    sourceTransitionFieldHash:"c".repeat(64),
    sourceCandidateId,
    candidateSpec:{
      kind:"generic-relation",
      fromState:"absent",
      toState:"return",
      baseEnergy:.8,
    },
    fps:24,
    totalFrames:192,
    creativeWeatherRef:null,
    pointCount:5,
    points:[
      {frame:0,sourceCandidateId,transitionHash:"1".repeat(64),kind:"generic-relation",fromState:"absent",toState:"return",baseEnergy:.8,totalDelta:0,energy:.8,contributionKinds:[],contributions:[]},
      {frame:48,sourceCandidateId,transitionHash:"2".repeat(64),kind:"generic-relation",fromState:"absent",toState:"return",baseEnergy:.8,totalDelta:-.2,energy:.6,contributionKinds:["weather:recurrence-entry"],contributions:[{kind:"weather:recurrence-entry",delta:-.2,evidence:{}}]},
      {frame:96,sourceCandidateId,transitionHash:"3".repeat(64),kind:"generic-relation",fromState:"absent",toState:"return",baseEnergy:.8,totalDelta:0,energy:.8,contributionKinds:[],contributions:[]},
      {frame:144,sourceCandidateId,transitionHash:"4".repeat(64),kind:"generic-relation",fromState:"absent",toState:"return",baseEnergy:.8,totalDelta:-.225,energy:.575,contributionKinds:["weather:recurrence-presence"],contributions:[{kind:"weather:recurrence-presence",delta:-.225,evidence:{}}]},
      {frame:191,sourceCandidateId,transitionHash:"5".repeat(64),kind:"generic-relation",fromState:"absent",toState:"return",baseEnergy:.8,totalDelta:0,energy:.8,contributionKinds:[],contributions:[]},
    ],
    energyRange:{min:.575,max:.8},
    minimumObserved:{energy:.575,frames:[144]},
    maximumObserved:{energy:.8,frames:[0,96,191]},
    laws:[
      "MAP != SELECTION",
      "CURVE != RECOMMENDATION",
      "MINIMUM OBSERVED ENERGY != RECOMMENDATION",
      "SAMPLED POINT != INTERPOLATED TRUTH",
      "LOWER TRANSITION COST != TAKE TRANSITION",
      "ENERGY != VALUE",
      "ENERGY != PROBABILITY",
    ],
  };
  return canonicalize({
    ...body,
    mapHash:hashCanonical(body,"HauntedToaster-PossibilityMap-v0"),
  });
}

test("SVG is deterministic and embeds map/candidate identity",()=>{
  const a=renderPossibilityMapSvg(map());
  const b=renderPossibilityMapSvg(map());
  assert.equal(a,b);
  assert.match(a,new RegExp(`data-map-hash="${map().mapHash}"`));
  assert.match(a,/data-candidate-id="return-with-altered-clock"/);
  assert.match(a,/data-authority="observational-only"/);
});

test("SVG draws exact sampled points without smoothing them into new evidence",()=>{
  const svg=renderPossibilityMapSvg(map());
  assert.match(svg,/data-frame="0"/);
  assert.match(svg,/data-frame="48"/);
  assert.match(svg,/data-frame="96"/);
  assert.match(svg,/data-frame="144"/);
  assert.match(svg,/data-frame="191"/);
  assert.equal((svg.match(/class="possibility-point"/g)||[]).length,5);
  assert.match(svg,/polyline[^>]*class="possibility-curve"/);
});

test("SVG exposes contribution rails but never calls minima recommended or selected",()=>{
  const svg=renderPossibilityMapSvg(map());
  assert.match(svg,/data-contribution-kind="weather:recurrence-entry"/);
  assert.match(svg,/data-contribution-kind="weather:recurrence-presence"/);
  assert.equal(/recommended/i.test(svg),false);
  assert.equal(/selected/i.test(svg),false);
  assert.match(svg,/MIN OBSERVED/);
});

test("SVG escapes human-facing labels",()=>{
  const svg=renderPossibilityMapSvg(map('<return & "wake">'));
  assert.equal(svg.includes('<return & "wake">'),false);
  assert.match(svg,/&lt;return &amp; &quot;wake&quot;&gt;/);
});

test("SVG dimensions are bounded and validated",()=>{
  assert.throws(()=>renderPossibilityMapSvg(map(),{width:10}),/width/i);
  assert.throws(()=>renderPossibilityMapSvg(map(),{height:99999}),/height/i);
  const svg=renderPossibilityMapSvg(map(),{width:720,height:300});
  assert.match(svg,/width="720"/);
  assert.match(svg,/height="300"/);
});
