const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");
const { MUTATION_LATTICE_RENDERER_POLICY } = require("./renderer-policy.cjs");

const RESPONSE_WITNESS_POLICY = "response-witness-v1";
const NESTED_RESPONSE_POLICY = "nested-response-contour-v1";
const IDLE_MOTION_POLICY = "topology-idle-v1";
const RESPONSE_WITNESS_DOMAIN = "HauntedToaster-ResponseWitness-v1";
const NESTED_RESPONSE_DOMAIN = "HauntedToaster-NestedResponseContour-v1";
const HYSTERESIS = 0.04;
const ARC_COMMIT_SAMPLES = 2;
const PHRASE_SPACING_SECONDS = 3;
const DENSITIES = new Set(["frozen", "section", "phrase", "transient"]);

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite.`);
  return number;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const mix = position - lower;
  return sorted[lower] * (1 - mix) + sorted[upper] * mix;
}

function movingAverage(values, radius = 1) {
  return values.map((_value, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length, index + radius + 1);
    const window = values.slice(start, end);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });
}

function normalizeSections(sections = [], durationSeconds = 0) {
  return sections.map((section, index) => {
    const startSeconds = finite(section?.startSeconds ?? section?.start ?? 0, `sections[${index}].startSeconds`);
    const endSeconds = finite(
      section?.endSeconds ?? section?.end ?? durationSeconds,
      `sections[${index}].endSeconds`,
    );
    const energy = clamp(finite(section?.energy ?? 0, `sections[${index}].energy`));
    if (startSeconds < 0 || endSeconds < startSeconds) {
      throw new TypeError(`sections[${index}] has invalid bounds.`);
    }
    return {
      index,
      startSeconds,
      endSeconds,
      energy,
    };
  });
}

function sectionIndexAt(time, sections) {
  if (!sections.length) return -1;
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const final = index === sections.length - 1;
    if (time >= section.startSeconds && (time < section.endSeconds || (final && time <= section.endSeconds))) {
      return section.index;
    }
  }
  if (time < sections[0].startSeconds) return sections[0].index;
  return sections[sections.length - 1].index;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeDbSamples(energySamples = []) {
  const parsed = energySamples.map((sample, index) => {
    const time = finite(sample?.time ?? sample?.atSeconds, `energySamples[${index}].time`);
    const db = finite(sample?.db, `energySamples[${index}].db`);
    if (time < 0) throw new TypeError(`energySamples[${index}].time must be non-negative.`);
    return { time, db };
  });
  for (let index = 1; index < parsed.length; index += 1) {
    if (parsed[index].time < parsed[index - 1].time) {
      throw new TypeError("energySamples must be sorted by ascending time.");
    }
  }
  if (!parsed.length) return [];
  const dbValues = parsed.map((sample) => sample.db);
  const low = percentile(dbValues, 0.1);
  const high = percentile(dbValues, 0.9);
  const span = Math.max(6, high - low);
  return parsed.map((sample) => ({
    time: sample.time,
    db: sample.db,
    energy: sample.db <= -120 ? 0 : clamp((sample.db - low) / span),
  }));
}

function deriveResponseWitness({ energySamples = [], sections = [], durationSeconds = 0 } = {}) {
  const duration = finite(durationSeconds, "durationSeconds");
  if (duration < 0) throw new TypeError("durationSeconds must be non-negative.");
  const normalizedSections = normalizeSections(sections, duration);
  const samples = normalizeDbSamples(energySamples);
  const smoothed = movingAverage(samples.map((item) => item.energy), 1);
  const centers = new Map();
  for (const sectionIndex of new Set(samples.map((sample) => sectionIndexAt(sample.time, normalizedSections)))) {
    const values = samples
      .filter((sample) => sectionIndexAt(sample.time, normalizedSections) === sectionIndex)
      .map((sample) => sample.energy);
    centers.set(sectionIndex, average(values));
  }
  const knots = samples.map((sample, index) => {
    const sectionIndex = sectionIndexAt(sample.time, normalizedSections);
    const section = normalizedSections.find((item) => item.index === sectionIndex);
    const localCenter = centers.get(sectionIndex) ?? average(samples.map((item) => item.energy));
    const prior = index ? smoothed[index - 1] : smoothed[index];
    return {
      atSeconds: quantizeNumber(sample.time),
      sectionIndex,
      macroEnergy: quantizeNumber(section?.energy ?? 0),
      localEnergy: quantizeNumber(sample.energy),
      smoothedEnergy: quantizeNumber(smoothed[index]),
      localCenter: quantizeNumber(localCenter),
      excursion: quantizeNumber(smoothed[index] - localCenter),
      slope: quantizeNumber(smoothed[index] - prior),
    };
  });
  const core = {
    policyVersion: RESPONSE_WITNESS_POLICY,
    durationSeconds: quantizeNumber(duration),
    sampleCount: knots.length,
    knots,
  };
  return deepFreeze({
    ...core,
    witnessSha256: hashCanonical(core, RESPONSE_WITNESS_DOMAIN),
  });
}

function withDirections(knots) {
  let activeDirection = 0;
  let pendingDirection = 0;
  let pendingSamples = 0;
  return knots.map((knot) => {
    const slope = Number(knot.slope) || 0;
    let direction = 0;
    if (Math.abs(slope) >= HYSTERESIS) {
      const proposed = slope > 0 ? 1 : -1;
      if (!activeDirection) {
        activeDirection = proposed;
        pendingDirection = 0;
        pendingSamples = 0;
      } else if (proposed === activeDirection) {
        pendingDirection = 0;
        pendingSamples = 0;
      } else {
        if (pendingDirection === proposed) pendingSamples += 1;
        else {
          pendingDirection = proposed;
          pendingSamples = 1;
        }
        if (pendingSamples >= ARC_COMMIT_SAMPLES) {
          activeDirection = proposed;
          pendingDirection = 0;
          pendingSamples = 0;
        }
      }
      direction = activeDirection;
    } else {
      pendingDirection = 0;
      pendingSamples = 0;
    }
    return { ...knot, direction };
  });
}

function phraseKnots(knots) {
  if (knots.length <= 2) return knots.slice();
  const selected = [knots[0]];
  let last = knots[0];
  for (let index = 1; index < knots.length - 1; index += 1) {
    const knot = knots[index];
    if (knot.atSeconds - last.atSeconds >= PHRASE_SPACING_SECONDS) {
      selected.push(knot);
      last = knot;
    }
  }
  const final = knots[knots.length - 1];
  if (selected[selected.length - 1] !== final) selected.push(final);
  return selected;
}

function sectionKnots(knots) {
  const groups = new Map();
  for (const knot of knots) {
    const group = groups.get(knot.sectionIndex) || [];
    group.push(knot);
    groups.set(knot.sectionIndex, group);
  }
  return [...groups.values()]
    .map((group) => group[Math.floor((group.length - 1) / 2)])
    .sort((left, right) => left.atSeconds - right.atSeconds);
}

function selectGranularity(knots, granularity) {
  if (granularity === "frozen") return [];
  if (granularity === "section") return sectionKnots(knots);
  if (granularity === "phrase") return phraseKnots(knots);
  return knots.slice();
}

function resolveNestedResponse({ responseWitness, score, timeline } = {}) {
  if (!responseWitness || responseWitness.policyVersion !== RESPONSE_WITNESS_POLICY) {
    throw new TypeError(`Nested Response requires ${RESPONSE_WITNESS_POLICY}.`);
  }
  const granularity = String(score?.temporalDensity || "");
  if (!DENSITIES.has(granularity)) throw new TypeError(`Unsupported temporal density: ${granularity}.`);
  const timebase = finite(timeline?.timebase ?? 1000, "timeline.timebase");
  const durationTicks = Math.max(0, Math.round(finite(timeline?.durationTicks ?? 0, "timeline.durationTicks")));
  const directed = withDirections(responseWitness.knots || []);
  const selected = selectGranularity(directed, granularity);
  const knots = selected.map((knot) => ({
    atTick: Math.max(0, Math.min(durationTicks, Math.round(knot.atSeconds * timebase))),
    sectionIndex: knot.sectionIndex,
    macroEnergy: quantizeNumber(knot.macroEnergy),
    localEnergy: quantizeNumber(knot.smoothedEnergy),
    excursion: quantizeNumber(knot.excursion),
    slope: quantizeNumber(knot.slope),
    direction: knot.direction,
  }));
  const core = {
    policyVersion: NESTED_RESPONSE_POLICY,
    granularity,
    knotCount: knots.length,
    knots,
    meterEvidenceUsed: false,
    idleMotionPolicyVersion: IDLE_MOTION_POLICY,
    sourceWitnessSha256: responseWitness.witnessSha256,
  };
  return deepFreeze({
    ...core,
    planSha256: hashCanonical(core, NESTED_RESPONSE_DOMAIN),
  });
}

function attachNestedResponse(timelineInput, { responseWitness, score } = {}) {
  if (timelineInput?.rendererPolicy !== MUTATION_LATTICE_RENDERER_POLICY) return timelineInput;
  const nestedResponse = resolveNestedResponse({
    responseWitness,
    score,
    timeline: timelineInput,
  });
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    nestedResponse: _nestedResponse,
    ...baseBody
  } = timelineInput;
  const body = {
    ...structuredClone(baseBody),
    nestedResponse,
  };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

module.exports = {
  ARC_COMMIT_SAMPLES,
  HYSTERESIS,
  IDLE_MOTION_POLICY,
  NESTED_RESPONSE_POLICY,
  RESPONSE_WITNESS_POLICY,
  attachNestedResponse,
  deriveResponseWitness,
  resolveNestedResponse,
};
