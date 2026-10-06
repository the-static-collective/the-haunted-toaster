"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {deriveListeningField}=require("../src/nextgen/listening-field.cjs");
const {
  deriveRecurrenceField,
  validateRecurrenceField,
}=require("../src/nextgen/recurrence-field.cjs");

function listening(){
  const fullSongForm=deriveFullSongForm({
    durationSeconds:8,
    fps:24,
    sections:[
      {start:0,end:2,label:"Opening"},
      {start:2,end:5,label:"Middle"},
      {start:5,end:8,label:"Return"},
    ],
  });
  return deriveListeningField({
    fullSongForm,
    songRef:{sourceSha256:"a".repeat(64),durationSeconds:8},
  });
}

function regions(){
  return [
    {
      recurrenceGroupId:"motif-A",
      occurrenceId:"motif-A:1",
      startFrame:24,
      endFrame:47,
      label:"first occurrence",
      confidence:.88,
      sourceKind:"self-similarity-analysis",
      sourceHash:"b".repeat(64),
      method:"bounded-self-similarity-v1",
    },
    {
      recurrenceGroupId:"motif-A",
      occurrenceId:"motif-A:2",
      startFrame:120,
      endFrame:143,
      label:"return occurrence",
      confidence:.92,
      sourceKind:"self-similarity-analysis",
      sourceHash:"b".repeat(64),
      method:"bounded-self-similarity-v1",
    },
    {
      recurrenceGroupId:"motif-B",
      occurrenceId:"motif-B:1",
      startFrame:60,
      endFrame:71,
      label:"B first",
      confidence:.7,
      sourceKind:"human-recurrence-mark",
      sourceHash:"c".repeat(64),
      method:"explicit-human-region-pair",
    },
    {
      recurrenceGroupId:"motif-B",
      occurrenceId:"motif-B:2",
      startFrame:156,
      endFrame:167,
      label:"B second",
      confidence:1,
      sourceKind:"human-recurrence-mark",
      sourceHash:"c".repeat(64),
      method:"explicit-human-region-pair",
    },
  ];
}

test("RecurrenceFieldV0 binds explicit repeated regions to exact ListeningField geometry",()=>{
  const field=deriveRecurrenceField({listeningField:listening(),regions:regions()});
  assert.equal(field.schema,"static-collective/recurrence-field/v0");
  assert.equal(field.authority,"testimony-only");
  assert.equal(field.sourceListeningFieldHash,listening().fieldHash);
  assert.equal(field.groupCount,2);
  assert.equal(field.occurrenceCount,4);
  assert.match(field.recurrenceHash,/^[a-f0-9]{64}$/);
  validateRecurrenceField(field);
});

test("every admitted recurrence group requires at least two occurrences",()=>{
  assert.throws(()=>deriveRecurrenceField({
    listeningField:listening(),
    regions:[regions()[0]],
  }),/at least two occurrences/i);
});

test("recurrence does not arise from section labels or lyrics when no regions are admitted",()=>{
  const field=deriveRecurrenceField({listeningField:listening(),regions:[]});
  assert.equal(field.groupCount,0);
  assert.equal(field.occurrenceCount,0);
  assert.deepEqual(field.groups,[]);
});

test("region order is canonical and field replay is deterministic",()=>{
  const a=deriveRecurrenceField({listeningField:listening(),regions:regions()});
  const b=deriveRecurrenceField({listeningField:listening(),regions:[...regions()].reverse()});
  assert.equal(a.recurrenceHash,b.recurrenceHash);
  assert.deepEqual(a,b);
  assert.deepEqual(
    a.groups.map(group=>group.recurrenceGroupId),
    ["motif-A","motif-B"],
  );
});

test("duplicate occurrence identity refuses",()=>{
  const duplicate=[regions()[0],{...regions()[0],startFrame:80,endFrame:90}];
  assert.throws(()=>deriveRecurrenceField({
    listeningField:listening(),
    regions:duplicate,
  }),/duplicate occurrence/i);
});

test("occurrence frame domain and source hashes are fail-closed",()=>{
  assert.throws(()=>deriveRecurrenceField({
    listeningField:listening(),
    regions:[
      {...regions()[0],startFrame:999,endFrame:1000},
      regions()[1],
    ],
  }),/frame/i);
  assert.throws(()=>deriveRecurrenceField({
    listeningField:listening(),
    regions:[
      {...regions()[0],sourceHash:"bad"},
      regions()[1],
    ],
  }),/sourceHash/i);
});

test("same geometry with different source evidence has different recurrence identity",()=>{
  const base=regions();
  const a=deriveRecurrenceField({listeningField:listening(),regions:base});
  const b=deriveRecurrenceField({
    listeningField:listening(),
    regions:base.map(region=>({
      ...region,
      sourceHash:"d".repeat(64),
      method:"independent-second-pass",
    })),
  });
  assert.notEqual(a.recurrenceHash,b.recurrenceHash);
});
