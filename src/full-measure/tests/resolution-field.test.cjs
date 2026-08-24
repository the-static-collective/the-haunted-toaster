const test = require("node:test");
const assert = require("node:assert/strict");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  RESOLUTION_FIELD_POLICY,
  SUPPORTED_RESOLUTION_SCALES,
  compileResolutionFieldPass,
} = require("../src/render/resolution-field.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

test("Resolution Field v0.1 freezes the bounded 1.0 / 0.5 / 0.25 contract", () => {
  assert.equal(RESOLUTION_FIELD_POLICY, "resolution-field-v0.1");
  assert.deepEqual(SUPPORTED_RESOLUTION_SCALES, [1, 0.5, 0.25]);
});

test("Resolution Field compiles an effect between downscale and native-canvas return", () => {
  const compiled = compileResolutionFieldPass({
    sourceLabel: "resolutionSource",
    outputLabel: "resolutionOut",
    width: 320,
    height: 192,
    scale: 0.25,
    filters: ["boxblur=2:1"],
  });

  assert.equal(compiled.policyVersion, RESOLUTION_FIELD_POLICY);
  assert.equal(compiled.scale, 0.25);
  assert.equal(compiled.internalWidth, 80);
  assert.equal(compiled.internalHeight, 48);
  assert.equal(compiled.outputWidth, 320);
  assert.equal(compiled.outputHeight, 192);
  assert.match(compiled.graph, /scale=80:48/);
  assert.match(compiled.graph, /scale=80:48[^;]*\[resolutionFieldWorking\];\n\[resolutionFieldWorking\]boxblur=2:1\[resolutionFieldEffect\]/);
  assert.match(compiled.graph, /\[resolutionFieldEffect\]scale=320:192[^;]*setsar=1\[resolutionOut\]/);
});

test("Resolution Field refuses downscaling protected material", () => {
  assert.throws(
    () => compileResolutionFieldPass({
      sourceLabel: "protectedSource",
      outputLabel: "protectedOut",
      width: 320,
      height: 192,
      scale: 0.5,
      protectedLayer: true,
      filters: ["boxblur=2:1"],
    }),
    /protected/i,
  );
});

test("Resolution Field rejects arbitrary scale factors and graph injection", () => {
  assert.throws(() => compileResolutionFieldPass({
    sourceLabel: "source",
    outputLabel: "out",
    width: 320,
    height: 192,
    scale: 0.75,
    filters: ["boxblur=2:1"],
  }), /scale/i);

  assert.throws(() => compileResolutionFieldPass({
    sourceLabel: "source",
    outputLabel: "out",
    width: 320,
    height: 192,
    scale: 0.5,
    filters: ["boxblur=2:1;nullsink"],
  }), /filter/i);
});

test("Resolution Field executes 1.0 / 0.5 / 0.25 local passes through real FFmpeg", async () => {
  const temp = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ht-resolution-field-"));
  try {
    for (const scale of SUPPORTED_RESOLUTION_SCALES) {
      const compiled = compileResolutionFieldPass({
        sourceLabel: "resolutionSource",
        outputLabel: "resolutionOut",
        width: 320,
        height: 192,
        scale,
        filters: ["boxblur=2:1"],
      });
      const graphPath = path.join(temp, `resolution-${String(scale).replace(".", "-")}.ffgraph`);
      await fsPromises.writeFile(
        graphPath,
        `[0:v]format=rgba[resolutionSource];\n${compiled.graph};\n[resolutionOut]format=yuv420p[vout]\n`,
        "utf8",
      );

      await runProcess(
        resolveFfmpeg(),
        [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-f",
          "lavfi",
          "-i",
          "color=c=black:s=320x192:r=12:d=0.5",
          "-filter_complex_script",
          graphPath,
          "-map",
          "[vout]",
          "-frames:v",
          "4",
          "-f",
          "null",
          "-",
        ],
        { cwd: temp },
      );
    }
  } finally {
    await fsPromises.rm(temp, { recursive: true, force: true });
  }
});
