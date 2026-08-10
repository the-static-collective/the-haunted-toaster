const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { ATMOSPHERES } = require("../generation/atmosphere-score.cjs");
const { EXPRESSIVE_RENDERER_POLICY } = require("../generation/renderer-policy.cjs");
const { effectiveInternalEnergy } = require("./response-shaping.cjs");

const ATMOSPHERE_COMPILER_V1 = "atmosphere-ass-particle-field-v1";
const ATMOSPHERE_COMPILER_V2 = "atmosphere-ass-particle-field-v2";
const ATMOSPHERE_COMPILER = ATMOSPHERE_COMPILER_V1;
const ATMOSPHERE_FILENAME = "atmosphere.ass";
const TEXT_OVERLAY_SEAM =
  "[stage0]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]";

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function atmosphereKind(timeline) {
  const kind = timeline?.baseState?.atmosphere || "none";
  if (!ATMOSPHERES.includes(kind)) {
    throw new TypeError(`Unsupported atmosphere: ${String(kind)}.`);
  }
  return kind;
}

function atmosphereCompiler(timeline) {
  return timeline?.rendererPolicy === EXPRESSIVE_RENDERER_POLICY
    ? ATMOSPHERE_COMPILER_V2
    : ATMOSPHERE_COMPILER_V1;
}

function assTime(seconds) {
  const centiseconds = Math.max(0, Math.round(Number(seconds) * 100));
  const hours = Math.floor(centiseconds / 360000);
  const minutes = Math.floor((centiseconds % 360000) / 6000);
  const secs = Math.floor((centiseconds % 6000) / 100);
  const fraction = centiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
}

function deterministicField(seedText) {
  const digest = crypto.createHash("sha256").update(String(seedText), "utf8").digest();
  let state = digest.readUInt32LE(0) || 0x9e3779b9;
  return {
    next() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0x100000000;
    },
    integer(minimum, maximum) {
      const min = Math.ceil(minimum);
      const max = Math.floor(maximum);
      return min + Math.floor(this.next() * (max - min + 1));
    },
    between(minimum, maximum) {
      return minimum + this.next() * (maximum - minimum);
    },
  };
}

function alphaHex(opacity) {
  const alpha = Math.round((1 - clamp(opacity, 0, 1)) * 255);
  return alpha.toString(16).padStart(2, "0").toUpperCase();
}

function drawingCircle(radius) {
  const r = Math.max(1, Math.round(radius));
  const half = Math.max(1, Math.round(r * 0.48));
  const size = r * 2;
  return [
    `m ${r} 0`,
    `l ${r + half} ${half}`,
    `l ${size} ${r}`,
    `l ${r + half} ${r + half}`,
    `l ${r} ${size}`,
    `l ${r - half} ${r + half}`,
    `l 0 ${r}`,
    `l ${r - half} ${half}`,
  ].join(" ");
}

function drawingRainField(rng, width, height, count, slant) {
  const parts = [];
  for (let index = 0; index < count; index += 1) {
    const x = rng.integer(-Math.round(width * 0.08), Math.round(width * 1.08));
    const y = rng.integer(-Math.round(height * 0.16), Math.round(height * 0.92));
    const length = rng.integer(
      Math.max(8, Math.round(height * 0.025)),
      Math.max(16, Math.round(height * 0.075)),
    );
    const thickness = rng.integer(1, Math.max(1, Math.round(width / 720)));
    const dx = Math.round(length * slant);
    parts.push(
      `m ${x} ${y}`,
      `l ${x + thickness} ${y}`,
      `l ${x + dx + thickness} ${y + length}`,
      `l ${x + dx} ${y + length}`,
    );
  }
  return parts.join(" ");
}

function dialogue(start, end, overrides, drawing) {
  return `Dialogue: 0,${assTime(start)},${assTime(end)},Atmosphere,,0,0,0,,${overrides}{\\p1}${drawing}{\\p0}`;
}

function assHeader(width, height) {
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "ScaledBorderAndShadow: yes",
    "WrapStyle: 2",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Atmosphere,Arial,10,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
}

function smokeEvents(rng, duration, width, height, responseEnergy = null) {
  const events = [];
  const responsive = Number.isFinite(responseEnergy);
  const energy = responsive ? clamp(responseEnergy, 0, 1) : 0;
  const baseCount = Math.min(120, Math.max(22, Math.ceil(duration / 2.4)));
  const count = responsive
    ? Math.min(180, Math.max(22, Math.round(baseCount * (1 + energy * 0.55))))
    : baseCount;
  const life = clamp(duration / Math.max(1, count / 3), 4.8, 13);
  for (let index = 0; index < count; index += 1) {
    const start = (index / count) * Math.max(0.01, duration);
    const end = Math.min(duration, start + life * rng.between(0.72, 1.2));
    if (end - start < 0.08) continue;
    const radius = rng.integer(
      Math.max(22, Math.round(Math.min(width, height) * 0.045)),
      Math.max(46, Math.round(Math.min(width, height) * 0.16)),
    );
    const x1 = rng.integer(-radius, width);
    const y1 = rng.integer(Math.round(height * 0.55), height + radius);
    const driftRange = responsive
      ? Math.round(width * (0.16 + energy * 0.11))
      : Math.round(width * 0.16);
    const drift = rng.integer(-driftRange, driftRange);
    const riseMinimum = responsive ? Math.round(height * (0.18 + energy * 0.04)) : Math.round(height * 0.18);
    const riseMaximum = responsive ? Math.round(height * (0.58 + energy * 0.14)) : Math.round(height * 0.58);
    const rise = rng.integer(riseMinimum, riseMaximum);
    const opacity = responsive
      ? rng.between(0.06 + energy * 0.02, 0.18 + energy * 0.12)
      : rng.between(0.06, 0.18);
    const blur = rng.between(12, 30).toFixed(1);
    const overrides =
      `{\\an7\\move(${x1},${y1},${x1 + drift},${y1 - rise})` +
      `\\1c&HFFFFFF&\\1a&H${alphaHex(opacity)}&\\blur${blur}\\fad(700,1200)}`;
    events.push(dialogue(start, end, overrides, drawingCircle(radius)));
  }
  return events;
}

function rainEvents(rng, duration, width, height, responseEnergy = null) {
  const events = [];
  const responsive = Number.isFinite(responseEnergy);
  const energy = responsive ? clamp(responseEnergy, 0, 1) : 0;
  const desiredInterval = responsive ? 0.56 / (1 + energy * 0.55) : 0.56;
  const count = Math.min(420, Math.max(1, Math.ceil(duration / desiredInterval)));
  const interval = duration / count;
  const baseStreakCount = Math.max(24, Math.min(78, Math.round(width / 24)));
  const streakCount = responsive
    ? Math.max(24, Math.min(104, Math.round(baseStreakCount * (1 + energy * 0.35))))
    : baseStreakCount;
  const slant = rng.between(-0.34, -0.13);
  for (let index = 0; index < count; index += 1) {
    const start = index * interval;
    const end = Math.min(duration, start + Math.max(0.4, interval * 1.12));
    const travelX = responsive
      ? Math.round(height * slant * rng.between(0.18, 0.34) * (1 + energy * 0.35))
      : Math.round(height * slant * rng.between(0.18, 0.34));
    const travelY = responsive
      ? Math.round(height * rng.between(0.16, 0.34 + energy * 0.18))
      : Math.round(height * rng.between(0.16, 0.34));
    const opacity = responsive
      ? rng.between(0.16 + energy * 0.04, Math.min(0.62, 0.34 + energy * 0.16))
      : rng.between(0.16, 0.34);
    const overrides =
      `{\\an7\\move(0,${-Math.round(height * 0.05)},${travelX},${travelY})` +
      `\\1c&HFFFFFF&\\1a&H${alphaHex(opacity)}&\\blur${rng.between(0.3, 1.2).toFixed(1)}}`;
    events.push(
      dialogue(
        start,
        end,
        overrides,
        drawingRainField(rng, width, height, streakCount, slant),
      ),
    );
  }
  return events;
}

function dustEvents(rng, duration, width, height, responseEnergy = null) {
  const events = [];
  const responsive = Number.isFinite(responseEnergy);
  const energy = responsive ? clamp(responseEnergy, 0, 1) : 0;
  const baseCount = Math.max(34, Math.min(90, Math.round((width * height) / 26000)));
  const count = responsive
    ? Math.max(34, Math.min(128, Math.round(baseCount * (1 + energy * 0.5))))
    : baseCount;
  const travelX = responsive ? 0.12 + energy * 0.09 : 0.12;
  const travelY = responsive ? 0.08 + energy * 0.07 : 0.08;
  for (let index = 0; index < count; index += 1) {
    const radius = rng.integer(1, Math.max(2, Math.round(Math.min(width, height) * 0.006)));
    const x1 = rng.integer(0, width);
    const y1 = rng.integer(0, height);
    const x2 = clamp(
      x1 + rng.integer(-Math.round(width * travelX), Math.round(width * travelX)),
      -radius,
      width + radius,
    );
    const y2 = clamp(
      y1 + rng.integer(-Math.round(height * travelY), Math.round(height * travelY)),
      -radius,
      height + radius,
    );
    const opacity = responsive
      ? rng.between(0.12 + energy * 0.03, Math.min(0.72, 0.42 + energy * 0.18))
      : rng.between(0.12, 0.42);
    const overrides =
      `{\\an7\\move(${Math.round(x1)},${Math.round(y1)},${Math.round(x2)},${Math.round(y2)})` +
      `\\1c&HFFFFFF&\\1a&H${alphaHex(opacity)}&\\blur${rng.between(0.6, 2.4).toFixed(1)}}`;
    events.push(dialogue(0, duration, overrides, drawingCircle(radius)));
  }
  return events;
}

function fireflyEvents(rng, duration, width, height, responseEnergy = null) {
  const events = [];
  const responsive = Number.isFinite(responseEnergy);
  const energy = responsive ? clamp(responseEnergy, 0, 1) : 0;
  const baseParticles = Math.max(10, Math.min(22, Math.round(width / 95)));
  const particles = responsive
    ? Math.max(10, Math.min(32, Math.round(baseParticles * (1 + energy * 0.4))))
    : baseParticles;
  for (let particle = 0; particle < particles; particle += 1) {
    let at = rng.between(0, Math.min(3.5, duration));
    let x = rng.integer(Math.round(width * 0.04), Math.round(width * 0.96));
    let y = rng.integer(Math.round(height * 0.12), Math.round(height * 0.88));
    let hops = 0;
    while (at < duration && events.length < 900 && hops < 80) {
      const life = rng.between(1.2, 3.9);
      const end = Math.min(duration, at + life);
      const xRange = responsive ? 0.09 + energy * 0.06 : 0.09;
      const yRange = responsive ? 0.1 + energy * 0.08 : 0.1;
      const nextX = clamp(
        x + rng.integer(-Math.round(width * xRange), Math.round(width * xRange)),
        0,
        width,
      );
      const nextY = clamp(
        y + rng.integer(-Math.round(height * yRange), Math.round(height * yRange)),
        0,
        height,
      );
      const radius = rng.integer(
        Math.max(2, Math.round(Math.min(width, height) * 0.004)),
        Math.max(4, Math.round(Math.min(width, height) * 0.012)),
      );
      const opacity = responsive
        ? rng.between(0.42 + energy * 0.08, Math.min(0.98, 0.9 + energy * 0.08))
        : rng.between(0.42, 0.9);
      const overrides =
        `{\\an7\\move(${Math.round(x)},${Math.round(y)},${Math.round(nextX)},${Math.round(nextY)})` +
        `\\1c&H66E6FF&\\1a&H${alphaHex(opacity)}&\\blur${rng.between(2.5, 7).toFixed(1)}` +
        `\\fad(${rng.integer(180, 520)},${rng.integer(260, 780)})}`;
      events.push(dialogue(at, end, overrides, drawingCircle(radius)));
      x = nextX;
      y = nextY;
      at = responsive
        ? end + rng.between(0.45 / (1 + energy * 0.7), 2.8 / (1 + energy * 0.6))
        : end + rng.between(0.45, 2.8);
      hops += 1;
    }
  }
  return events;
}

function buildAtmosphereAss({
  timeline,
  width,
  height,
}) {
  const kind = atmosphereKind(timeline);
  const compiler = atmosphereCompiler(timeline);
  const expressive = compiler === ATMOSPHERE_COMPILER_V2;
  const responseEnergy = expressive
    ? effectiveInternalEnergy(timeline?.baseState?.motion?.amplitude)
    : null;
  const duration = Math.max(
    0,
    Number(timeline?.durationTicks || 0) / Math.max(1, Number(timeline?.timebase || 1)),
  );
  if (kind === "none" || duration <= 0) {
    return Object.freeze({
      kind,
      compiler,
      eventCount: 0,
      content: null,
      contentSha256: null,
    });
  }

  const seed = [
    timeline?.scoreAddress || "",
    timeline?.timelineHash || "",
    kind,
    `${width}x${height}`,
    compiler,
  ].join("|");
  const rng = deterministicField(seed);
  let events;
  if (kind === "smoke") events = smokeEvents(rng, duration, width, height, responseEnergy);
  else if (kind === "rain") events = rainEvents(rng, duration, width, height, responseEnergy);
  else if (kind === "dust") events = dustEvents(rng, duration, width, height, responseEnergy);
  else events = fireflyEvents(rng, duration, width, height, responseEnergy);

  const content = [...assHeader(width, height), ...events, ""].join("\n");
  return Object.freeze({
    kind,
    compiler,
    eventCount: events.length,
    content,
    contentSha256: crypto.createHash("sha256").update(content, "utf8").digest("hex"),
    ...(expressive ? { responseEnergy } : {}),
  });
}

async function applyAtmosphereToGraph({
  graph,
  tempDirectory,
  timeline,
  width,
  height,
  fileName = ATMOSPHERE_FILENAME,
}) {
  const built = buildAtmosphereAss({ timeline, width, height });
  if (built.kind === "none") {
    return Object.freeze({
      graph,
      evidence: Object.freeze({
        kind: built.kind,
        compiler: built.compiler,
        eventCount: 0,
        contentSha256: null,
        fileName: null,
      }),
    });
  }
  if (!/^[a-z0-9][a-z0-9._-]*\.ass$/i.test(fileName)) {
    throw new TypeError("Atmosphere overlay filename must be a safe .ass basename.");
  }
  if (!String(graph).includes(TEXT_OVERLAY_SEAM)) {
    throw new Error("Production filter graph is missing the canonical text-overlay seam.");
  }

  await fs.writeFile(path.join(tempDirectory, fileName), built.content, "utf8");
  const injected =
    `[stage0]ass=filename='${fileName}':alpha=1[atmosphereStage];\n` +
    "[atmosphereStage]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]";
  return Object.freeze({
    graph: String(graph).replace(TEXT_OVERLAY_SEAM, injected),
    evidence: Object.freeze({
      kind: built.kind,
      compiler: built.compiler,
      eventCount: built.eventCount,
      contentSha256: built.contentSha256,
      fileName,
      ...(Object.hasOwn(built, "responseEnergy") ? { responseEnergy: built.responseEnergy } : {}),
    }),
  });
}

module.exports = {
  ATMOSPHERE_COMPILER,
  ATMOSPHERE_COMPILER_V1,
  ATMOSPHERE_COMPILER_V2,
  ATMOSPHERE_FILENAME,
  TEXT_OVERLAY_SEAM,
  applyAtmosphereToGraph,
  assTime,
  atmosphereCompiler,
  atmosphereKind,
  buildAtmosphereAss,
  deterministicField,
};
