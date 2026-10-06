"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ui=require("../src/renderer/wordpark-play-ui.js");

test("WORDPARK play UI maps lane shortcuts without owning lane semantics",()=>{
  assert.equal(ui.laneFromShortcut("Digit1"),"OPEN");
  assert.equal(ui.laneFromShortcut("Digit2"),"TENDER");
  assert.equal(ui.laneFromShortcut("Digit3"),"STRANGE");
  assert.equal(ui.laneFromShortcut("Digit4"),"HARD");
  assert.equal(ui.laneFromShortcut("KeyQ"),null);
});

test("steering input normalizes diagonal movement",()=>{
  const straight=ui.steeringVector(["KeyD"]);
  assert.deepEqual(straight,{x:1,y:0});
  const diagonal=ui.steeringVector(["KeyD","KeyW"]);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-12);
  assert.ok(diagonal.x>0);
  assert.ok(diagonal.y<0);
});

test("frame/time helpers remain audio-clock derived",()=>{
  assert.equal(ui.secondsForFrame(48,24),2);
  assert.equal(ui.secondsForFrame(0,24),0);
  assert.equal(ui.displayTime(0),"0:00");
  assert.equal(ui.displayTime(61),"1:01");
});

test("play surface keeps world canvas and text HUD structurally separate",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../src/renderer/index.html"),"utf8");
  assert.match(html,/id="wordparkCanvas"/);
  assert.match(html,/id="wordparkLookahead"/);
  assert.match(html,/id="wordparkNow"/);
  assert.match(html,/data-wordpark-lane="OPEN"/);
  assert.match(html,/data-wordpark-lane="HARD"/);
  assert.match(html,/data-wordpark-steer="KeyW"/);
  assert.match(html,/wordpark-play-ui\.js/);
  assert.match(html,/wordpark-play-ui\.css/);
});

test("renderer module calls bounded WORDPARK bridge actions rather than importing simulation",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../src/renderer/wordpark-play-ui.js"),"utf8");
  for(const method of [
    "wordparkStart",
    "wordparkSetLane",
    "wordparkAdvanceTo",
    "wordparkPunch",
    "wordparkSeal",
    "wordparkReset",
  ]){
    assert.match(source,new RegExp(`bridge\\.${method}`));
  }
  assert.doesNotMatch(source,/require\(["']\.\.\/nextgen\/wordpark/);
  assert.doesNotMatch(source,/stepWordpark\s*\(/);
  assert.doesNotMatch(source,/resolveTextContacts\s*\(/);
});

test("UI witness build admits the WORDPARK JS and CSS into screenshot QA",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../scripts/build-ui-witness.cjs"),"utf8");
  assert.match(source,/"wordpark-play-ui\.js"/);
  assert.match(source,/"wordpark-play-ui\.css"/);
});
