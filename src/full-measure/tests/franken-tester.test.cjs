const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REPORT_SCHEMA,
  parseLsRemote,
  classifySpecimen,
  buildFrankenTesterReport,
} = require("../src/franken-tester/census.cjs");

test("branch census preserves nested branch names and sorts deterministically", () => {
  const rows = parseLsRemote([
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\trefs/heads/video/digestion-six-001-current",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\trefs/heads/experimental/franken-composer-001",
    "",
  ].join("\n"));

  assert.deepEqual(rows, [
    {sha:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", branch:"experimental/franken-composer-001"},
    {sha:"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", branch:"video/digestion-six-001-current"},
  ]);
});

test("tree evidence promotes branch hints into witnessed organs", () => {
  const toaster = classifySpecimen({
    system:"toaster",
    branch:"experimental/franken-composer-001",
    sha:"a".repeat(40),
    files:[
      "src/full-measure/src/franken-composer/compose.cjs",
      "src/full-measure/src/render/video-digestion-six.cjs",
    ],
  });

  assert.equal(toaster.evidenceLevel, "tree-probed");
  assert.deepEqual(toaster.organs, ["franken-composer","video-digestion"]);
  assert.ok(toaster.hints.includes("franken-composer"));
});

test("report composes witnessed toaster, blender, and playdeck surfaces without widening authority", () => {
  const specimens = [
    classifySpecimen({
      system:"playdeck",
      branch:"experiment/franken-smash-001",
      sha:"3".repeat(40),
      files:[
        "experiments/franken-smash-001/franken-runtime.mjs",
        "packages/render-remotion/src/PlaydeckComposition.tsx",
        "packages/studio/src/frankenStudio.ts",
      ],
    }),
    classifySpecimen({
      system:"blender",
      branch:"integration/franken-blender-002-cutout-machine",
      sha:"2".repeat(40),
      files:[
        "haunted_blender/take_cut.py",
        "haunted_blender/flow_pantry.py",
        "haunted_blender/playdeck_bridge.py",
        "haunted_blender/toaster_bridge.py",
        "haunted_blender/cutout_stage.py",
      ],
    }),
    classifySpecimen({
      system:"toaster",
      branch:"experimental/franken-composer-001",
      sha:"1".repeat(40),
      files:[
        "src/full-measure/src/franken-composer/compose.cjs",
        "src/full-measure/src/video-pantry/electron-ipc.cjs",
      ],
    }),
  ];

  const first = buildFrankenTesterReport({specimens});
  const second = buildFrankenTesterReport({specimens:[...specimens].reverse()});

  assert.equal(first.schema, REPORT_SCHEMA);
  assert.equal(first.authority, "diagnostic-only");
  assert.equal(first.reportHash, second.reportHash);
  assert.deepEqual(first.specimens, second.specimens);

  const proposalDoor = first.crossings.find(
    (item) => item.id === "playdeck-proposal-to-toaster-composer",
  );
  const takeDoor = first.crossings.find(
    (item) => item.id === "blender-take-to-toaster-composer",
  );

  assert.equal(proposalDoor.status, "witnessed-compatible-surface");
  assert.equal(proposalDoor.authority, "proposal-only");
  assert.equal(takeDoor.status, "witnessed-compatible-surface");
  assert.equal(takeDoor.authority, "material-only");
  assert.ok(first.laws.includes("TREE PROBE != RUNTIME QA"));
});
