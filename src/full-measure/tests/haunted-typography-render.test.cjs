const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  LYRIC_PRIMARY_COLOUR,
  applyTypographyToAss,
  caseAssText,
  integrateLyricAssStyle,
  resolveOverlayTypography,
  typographyContextForTimeline,
} = require("../src/render/haunted-typography-render.cjs");
const { typographyEvidence } = require("../src/render/haunted-typography.cjs");

const analysis = {
  filename: "wire-orchard.wav",
};
const lyricTrack = {
  cues: [
    { start: 1, end: 2, text: "the house takes attendance" },
    { start: 3, end: 4, text: "we play where we arrive" },
  ],
};
const lyricGhostPlan = {
  apparitions: [
    { start: 2, end: 2.6, text: "ghost keeps the receipt" },
  ],
};

test("candidate N preview plan hash equals accepted winner final-render plan hash", () => {
  const acceptedTimeline = {
    rendererPolicy: "visual-language-v1",
    rendererProfileHash:
      "038e450ee3e74062991174a2dcf41bb58c70fb90a7e3a5391c52cc18b081015d",
  };
  const previewContext = typographyContextForTimeline(
    "htvs1_wire_orchard_candidate_4",
    acceptedTimeline,
  );
  const finalContext = typographyContextForTimeline(
    "htvs1_wire_orchard_candidate_4",
    acceptedTimeline,
  );
  const sharedInput = {
    analysis,
    title: "Wire Orchard",
    artist: "The Static Collective",
    lyricTrack,
    lyricGhostPlan,
  };
  const previewPlan = resolveOverlayTypography({
    ...sharedInput,
    ...previewContext,
  });
  const finalPlan = resolveOverlayTypography({
    ...sharedInput,
    ...finalContext,
  });

  assert.equal(previewPlan.hash, finalPlan.hash);
  assert.equal(
    previewPlan.lineage.childSeedSha256,
    finalPlan.lineage.childSeedSha256,
  );
  assert.deepEqual(
    typographyEvidence(previewPlan),
    typographyEvidence(finalPlan),
  );
  assert.equal(typographyEvidence(finalPlan).planSha256, finalPlan.hash);
  assert.equal(
    typographyEvidence(finalPlan).rootCandidateIdentity,
    "htvs1_wire_orchard_candidate_4",
  );
});

test("candidate score identity changes the plan while profile and words stay fixed", () => {
  const timeline = { rendererProfileHash: "toaster-raster-profile-hash" };
  const sharedInput = {
    analysis,
    title: "Wire Orchard",
    artist: "The Static Collective",
    lyricTrack,
    lyricGhostPlan,
  };
  const first = resolveOverlayTypography({
    ...sharedInput,
    ...typographyContextForTimeline("candidate-a", timeline),
  });
  const second = resolveOverlayTypography({
    ...sharedInput,
    ...typographyContextForTimeline("candidate-b", timeline),
  });
  assert.notEqual(first.hash, second.hash);
  assert.notEqual(first.lineage.childSeedSha256, second.lineage.childSeedSha256);
});

test("lyric ASS style removes the box and keeps text at 80% visibility", () => {
  const source =
    "Style: Lyrics,Arial,48,&H00FFFFFF,&H00FFFFFF,&H90000000,&H96000000,-1,0,0,0,100,100,0,0,3,1.2,1.5,2,80,80,310,1";
  const output = integrateLyricAssStyle(source);
  const fields = output.split(",");

  assert.equal(fields[3], LYRIC_PRIMARY_COLOUR);
  assert.equal(fields[4], LYRIC_PRIMARY_COLOUR);
  assert.equal(fields[6], "&H96000000");
  assert.equal(fields[15], "1");
  assert.equal(fields[16], "1.2");
  assert.equal(fields[17], "1.5");
});

test("ASS morphology is applied after legacy event overrides without damaging line breaks", () => {
  const plan = resolveOverlayTypography({
    analysis,
    title: "Wire Orchard",
    artist: "The Static Collective",
    lyricTrack,
    lyricGhostPlan,
    scoreIdentity: "candidate-a",
    profileIdentity: "profile-a",
  });
  const source = [
    "[V4+ Styles]",
    "Style: Lyrics,Arial,48,&H00FFFFFF,&H00FFFFFF,&H90000000,&H96000000,-1,0,0,0,100,100,0,0,3,1.2,1.5,2,80,80,310,1",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    "Dialogue: 0,0:00:00.00,0:00:07.00,Title,,0,0,0,,{\\fad(220,380)}Wire Orchard",
    "Dialogue: 0,0:00:02.00,0:00:02.60,Ghost,,0,0,0,,{\\pos(100,100)\\fscx90\\fscy90}ghost keeps the receipt",
    "Dialogue: 0,0:00:01.00,0:00:02.00,Lyrics,,0,0,0,,{\\fs48\\fad(140,180)}the house takes attendance",
  ].join("\n");
  const output = applyTypographyToAss(source, plan);

  assert.match(output, /Style: Lyrics,Arial,48,&H33FFFFFF,&H33FFFFFF/);
  assert.match(output, /,1,1\.2,1\.5,2,80,80,310,1/);
  assert.match(output, /\\fad\(220,380\)\}\{\\fscx/);
  assert.match(output, /\\pos\(100,100\).*\}\{\\fscx/);
  assert.match(output, /\\fs48\\fad\(140,180\)\}\{\\fscx/);
  assert.equal(caseAssText("one\\Ntwo", "alternating"), "OnE\\NtWo");
});

test("six-up resolves typography inside the candidate loop and final receipt records it", () => {
  const candidateSource = fs.readFileSync(
    path.join(__dirname, "../src/render/candidate-preview.cjs"),
    "utf8",
  );
  const renderSource = fs.readFileSync(
    path.join(__dirname, "../src/render/render.cjs"),
    "utf8",
  );
  const loopIndex = candidateSource.indexOf(
    "for (const candidate of family.candidates)",
  );
  const buildIndex = candidateSource.indexOf(
    "const baseFilter = await buildHauntedFilterGraph",
    loopIndex,
  );

  assert.ok(loopIndex >= 0);
  assert.ok(buildIndex > loopIndex);
  assert.match(
    candidateSource,
    /typographyContextForTimeline\(\s*candidate\.scoreAddress,\s*candidate\.timeline/,
  );
  assert.match(
    renderSource,
    /typographyContextForTimeline\(\s*scoreAddress,\s*execution\.timeline/,
  );
  assert.match(renderSource, /typography: filter\.typographyEvidence/);
  assert.match(
    renderSource,
    /atmosphere:\s*baseFilter\.atmosphereEvidence/,
  );
});