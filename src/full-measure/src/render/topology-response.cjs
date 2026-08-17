const ELASTIC_TOPOLOGY_POLICY = "elastic-topology-response-v1";
const SOFT_OCCUPANCY_KNEE = 0.72;

const IDLE_FLOOR = Object.freeze({
  linear: 0,
  circle: 0.05,
  "mirrored-ring": 0.05,
  spiral: 0.045,
  "quad-mirror": 0.04,
  "elastic-spine": 0.08,
  "split-horizon": 0.05,
  "cathedral-fan": 0.08,
  "echo-tunnel": 0.055,
});

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function ffmpegNumber(value) {
  const normalized = quantize(value);
  return Object.is(normalized, -0) ? "0" : String(normalized);
}

function softExtent(demand) {
  const value = clamp(demand);
  if (value <= SOFT_OCCUPANCY_KNEE) return quantize(value);
  const x = (value - SOFT_OCCUPANCY_KNEE) / (1 - SOFT_OCCUPANCY_KNEE);
  return quantize(SOFT_OCCUPANCY_KNEE + (1 - SOFT_OCCUPANCY_KNEE) * x * x);
}

function projectResponseKnots(knots = []) {
  let priorHoldCount = 0;
  return knots.map((knot) => {
    const macroEnergy = clamp(knot?.macroEnergy);
    const localEnergy = clamp(knot?.localEnergy);
    const excursion = clamp(knot?.excursion, -1, 1);
    const slope = clamp(knot?.slope, -1, 1);
    const direction = knot?.direction < 0 ? -1 : knot?.direction > 0 ? 1 : 0;
    const demand = clamp(macroEnergy + Math.max(0, excursion) * 0.35);
    const rawExtent = softExtent(demand);
    const holdCount = demand >= SOFT_OCCUPANCY_KNEE ? priorHoldCount + 1 : 0;
    priorHoldCount = holdCount;
    const flatness = 1 - clamp(Math.abs(excursion) * 4);
    const shedding = holdCount >= 3
      ? Math.min(0.14, 0.035 * (holdCount - 2)) * flatness
      : 0;
    const extent = clamp(rawExtent - shedding);
    const redirected = Math.max(0, demand - extent);
    const recoil = clamp(Math.max(0, -excursion) * 2 + (direction < 0 ? 0.08 : 0));
    const articulation = clamp(Math.abs(excursion) * 1.5 + redirected * 2.2 + shedding * 2.5);
    const openness = clamp(articulation * 0.72 + recoil * 0.28);
    const phase = clamp(excursion * 2 + direction * (0.08 + articulation * 0.12), -1, 1);
    const travelX = clamp(excursion * 1.6 + direction * articulation * 0.2, -1, 1);
    const travelY = clamp(-excursion * 1.1 + direction * openness * 0.12, -1, 1);

    return Object.freeze({
      atTick: Math.max(0, Math.round(Number(knot?.atTick) || 0)),
      sectionIndex: Number.isInteger(knot?.sectionIndex) ? knot.sectionIndex : -1,
      macroEnergy: quantize(macroEnergy),
      localEnergy: quantize(localEnergy),
      excursion: quantize(excursion),
      slope: quantize(slope),
      direction,
      demand: quantize(demand),
      extent: quantize(extent),
      articulation: quantize(articulation),
      openness: quantize(openness),
      phase: quantize(phase),
      recoil: quantize(recoil),
      travelX: quantize(travelX),
      travelY: quantize(travelY),
      shedding: quantize(shedding),
    });
  });
}

function piecewiseLinearExpression(knots, field, timebase) {
  if (!Array.isArray(knots) || !knots.length) return "0";
  const base = Number(timebase);
  if (!Number.isFinite(base) || base <= 0) throw new TypeError("timebase must be positive and finite.");
  let expression = ffmpegNumber(knots.at(-1)[field]);
  for (let index = knots.length - 2; index >= 0; index -= 1) {
    const left = knots[index];
    const right = knots[index + 1];
    const a = Number(left.atTick) / base;
    const b = Number(right.atTick) / base;
    const span = Math.max(0.001, b - a);
    const u = `max(0,min(1,(t-${ffmpegNumber(a)})/${ffmpegNumber(span)}))`;
    const segment = `${ffmpegNumber(left[field])}+(${ffmpegNumber(right[field])}-${ffmpegNumber(left[field])})*${u}`;
    expression = `if(lt(t,${ffmpegNumber(b)}),${segment},${expression})`;
  }
  return expression;
}

function compileTopologyResponse(timeline, topology) {
  const plan = timeline?.nestedResponse;
  if (!plan) return null;
  if (plan.policyVersion !== "nested-response-contour-v1") {
    throw new TypeError("Elastic topology response requires nested-response-contour-v1 evidence.");
  }
  if (!Object.hasOwn(IDLE_FLOOR, topology)) {
    throw new TypeError(`Unsupported topology response target: ${String(topology)}.`);
  }
  const timebase = Number(timeline?.timebase);
  if (!Number.isFinite(timebase) || timebase <= 0) {
    throw new TypeError("Elastic topology response requires a positive timeline timebase.");
  }
  const projected = projectResponseKnots(plan.knots || []);
  const idleFloor = IDLE_FLOOR[topology];
  const evidence = Object.freeze({
    policyVersion: ELASTIC_TOPOLOGY_POLICY,
    nestedResponsePolicyVersion: plan.policyVersion,
    planSha256: plan.planSha256,
    knotCount: plan.knotCount,
    granularity: plan.granularity,
    idleMotionPolicyVersion: plan.idleMotionPolicyVersion,
    idleFloor,
    softOccupancyKnee: SOFT_OCCUPANCY_KNEE,
    meterEvidenceUsed: plan.meterEvidenceUsed === true,
  });
  const expressions = Object.freeze({
    extent: piecewiseLinearExpression(projected, "extent", timebase),
    articulation: piecewiseLinearExpression(projected, "articulation", timebase),
    openness: piecewiseLinearExpression(projected, "openness", timebase),
    phase: piecewiseLinearExpression(projected, "phase", timebase),
    recoil: piecewiseLinearExpression(projected, "recoil", timebase),
    travelX: piecewiseLinearExpression(projected, "travelX", timebase),
    travelY: piecewiseLinearExpression(projected, "travelY", timebase),
    idle: ffmpegNumber(idleFloor),
  });
  return Object.freeze({ evidence, expressions });
}

module.exports = {
  ELASTIC_TOPOLOGY_POLICY,
  IDLE_FLOOR,
  SOFT_OCCUPANCY_KNEE,
  compileTopologyResponse,
  piecewiseLinearExpression,
  projectResponseKnots,
  softExtent,
};
