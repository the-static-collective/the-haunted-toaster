const test = require("node:test");
const assert = require("node:assert/strict");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  applyResolutionFieldToAtmosphereGraph,
  directAtmosphereSeam,
} = require("../src/render/atmosphere-resolution-field.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

const WIDTH = 640;
const HEIGHT = 360;

function assDocument(events = []) {
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${WIDTH}`,
    `PlayResY: ${HEIGHT}`,
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Dust,Arial,20,&H80FFFFFF,&H80FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
}

function directGraph() {
  return [
    "[0:v]format=rgba[stage0]",
    directAtmosphereSeam("atmosphere.ass"),
  ].join(";\n");
}

async function renderYmax(tempDirectory, graph, label) {
  const measuredGraph = String(graph).replace(
    "[vout]",
    `[${label}PreMeasure]`,
  ) + `;\n[${label}PreMeasure]signalstats,metadata=print:file=-[${label}Measured]`;
  const graphPath = path.join(tempDirectory, `${label}.ffgraph`);
  await fsPromises.writeFile(graphPath, `${measuredGraph}\n`, "utf8");

  const { stdout } = await runProcess(
    resolveFfmpeg(),
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      `color=c=black:s=${WIDTH}x${HEIGHT}:r=1:d=1`,
      "-filter_complex_script",
      graphPath,
      "-map",
      `[${label}Measured]`,
      "-frames:v",
      "1",
      "-f",
      "null",
      "-",
    ],
    { cwd: tempDirectory },
  );

  const match = stdout.match(/lavfi\.signalstats\.YMAX=(\d+(?:\.\d+)?)/);
  assert.ok(match, `FFmpeg did not report YMAX for ${label}. Output: ${stdout}`);
  return Number(match[1]);
}

test("Resolution Field preserves visible Atmosphere energy instead of double-applying ASS alpha", async () => {
  const tempDirectory = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "toaster-resolution-atmosphere-visibility-"),
  );

  try {
    await fsPromises.writeFile(
      path.join(tempDirectory, "atmosphere.ass"),
      assDocument([
        "Dialogue: 0,0:00:00.00,0:00:01.00,Dust,,0,0,0,,{\\an7\\pos(160,88)\\p1}m 0 0 l 8 0 8 8 0 8{\\p0}",
      ]),
      "utf8",
    );
    await fsPromises.writeFile(
      path.join(tempDirectory, "text-overlay.ass"),
      assDocument(),
      "utf8",
    );

    const nativeGraph = directGraph();
    const directYmax = await renderYmax(tempDirectory, nativeGraph, "direct");
    assert.ok(directYmax >= 80, `Synthetic Atmosphere control is too dim: ${directYmax}`);

    const observed = {};
    for (const scale of [1, 0.5, 0.25]) {
      const compiled = applyResolutionFieldToAtmosphereGraph({
        graph: nativeGraph,
        fileName: "atmosphere.ass",
        width: WIDTH,
        height: HEIGHT,
        scale,
      });
      observed[scale] = await renderYmax(
        tempDirectory,
        compiled.graph,
        `scale${String(scale).replace(".", "_")}`,
      );
    }

    assert.ok(
      observed[1] >= directYmax * 0.75,
      `Resolution 1.0 attenuated Atmosphere twice: direct=${directYmax}, resolution=${observed[1]}`,
    );
    assert.ok(
      observed[0.5] >= directYmax * 0.4,
      `Resolution 0.5 lost visible Atmosphere energy: direct=${directYmax}, resolution=${observed[0.5]}`,
    );
    assert.ok(
      observed[0.25] >= directYmax * 0.2,
      `Resolution 0.25 crossed the disappearance floor: direct=${directYmax}, resolution=${observed[0.25]}`,
    );
  } finally {
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
  }
});
