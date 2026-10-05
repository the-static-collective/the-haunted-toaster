"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  residuePathPoints,
  residueStrengthAtFrame,
}=require("../src/renderer/franken-composer-ui.js");

test("residue preview is absent before birth and decays after birth",()=>{
  const residue={
    birthFrame:100,
    deathFrame:500,
    initialStrength:.8,
    decay:{perFrame:.001,floor:0},
  };
  assert.equal(residueStrengthAtFrame(residue,99),0);
  assert.equal(residueStrengthAtFrame(residue,100),.8);
  assert.equal(residueStrengthAtFrame(residue,200),.7);
  assert.equal(residueStrengthAtFrame(residue,500),0);
});

test("residue path projection is deterministic normalized SVG geometry",()=>{
  assert.equal(
    residuePathPoints([
      {x:.1,y:.2},
      {x:.5,y:.75},
      {x:1,y:0},
    ]),
    "100,200 500,750 1000,0",
  );
});
