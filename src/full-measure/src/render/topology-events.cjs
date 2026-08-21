const { deepFreeze, quantizeNumber } = require("../generation/canonical.cjs");
const {
  TOPOLOGY_EVENT_PLAN_SCHEMA,
  TOPOLOGY_EVENT_POLICY,
} = require("../generation/topology-events.cjs");

const SHA256_RE = /^[0-9a-f]{64}$/;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function q(value) {
  return quantizeNumber(value);
}

function lerp(a, b, p) {
  return q(a + (b - a) * p);
}

function neutralField(parameters) {
  return deepFreeze({
    centerX: parameters.anchorX,
    centerY: parameters.anchorY,
    radiusX: parameters.radiusX,
    radiusY: parameters.radiusY,
    vectorX: 0,
    vectorY: 0,
    stretch: 0,
    falloff: parameters.falloff,
  });
}

function grabPeak(parameters) {
  const dx = (parameters.targetX - parameters.anchorX) * parameters.pull;
  const dy = (parameters.targetY - parameters.anchorY) * parameters.pull;
  const stretch = clamp(Math.hypot(dx, dy) * 0.35, 0, 1);
  return {
    vectorX: q(dx),
    vectorY: q(dy),
    stretch: q(stretch),
  };
}

function sampleGrabEvent(event, atTick) {
  if (!event || event.kind !== "grab") throw new TypeError("sampleGrabEvent requires an accepted GRAB event.");
  if (!Number.isSafeInteger(atTick) || atTick < 0) throw new TypeError("atTick must be a non-negative safe integer.");
  const p = event.parameters;
  const neutral = neutralField(p);
  if (atTick < event.prepareTick || atTick >= event.residueUntilTick) return neutral;

  const peak = grabPeak(p);
  const residual = {
    vectorX: p.residualVectorX,
    vectorY: p.residualVectorY,
    stretch: p.residualStretch,
  };

  let vectorX;
  let vectorY;
  let stretch;
  if (atTick < event.strikeTick) {
    const progress = (atTick - event.prepareTick) / (event.strikeTick - event.prepareTick);
    vectorX = lerp(0, peak.vectorX, progress);
    vectorY = lerp(0, peak.vectorY, progress);
    stretch = lerp(0, peak.stretch, progress);
  } else if (atTick < event.releaseTick && event.releaseTick > event.strikeTick) {
    const progress = (atTick - event.strikeTick) / (event.releaseTick - event.strikeTick);
    const recoilFactor = (1 - progress) * (1 - p.recoil * Math.sin(Math.PI * progress));
    vectorX = q(residual.vectorX + (peak.vectorX - residual.vectorX) * recoilFactor);
    vectorY = q(residual.vectorY + (peak.vectorY - residual.vectorY) * recoilFactor);
    stretch = q(residual.stretch + (peak.stretch - residual.stretch) * recoilFactor);
  } else if (atTick < event.releaseTick) {
    vectorX = residual.vectorX;
    vectorY = residual.vectorY;
    stretch = residual.stretch;
  } else {
    vectorX = residual.vectorX;
    vectorY = residual.vectorY;
    stretch = residual.stretch;
  }

  return deepFreeze({
    centerX: q(clamp(p.anchorX + vectorX * 0.5, 0, 1)),
    centerY: q(clamp(p.anchorY + vectorY * 0.5, 0, 1)),
    radiusX: p.radiusX,
    radiusY: p.radiusY,
    vectorX,
    vectorY,
    stretch,
    falloff: p.falloff,
  });
}

function ff(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError("Topology event expression value must be finite.");
  return String(q(number));
}

function grabExpressions(event, timebase) {
  const p = event.parameters;
  const peak = grabPeak(p);
  const prepare = event.prepareTick / timebase;
  const strike = event.strikeTick / timebase;
  const release = event.releaseTick / timebase;
  const residue = event.residueUntilTick / timebase;
  const prepareDuration = Math.max(Number.EPSILON, strike - prepare);
  const releaseDuration = Math.max(Number.EPSILON, release - strike);
  const prep = `(max(0,min(1,(t-${ff(prepare)})/${ff(prepareDuration)})))`;
  const rel = `(max(0,min(1,(t-${ff(strike)})/${ff(releaseDuration)})))`;
  const recoilMix = `((1-${rel})*(1-${ff(p.recoil)}*sin(PI*${rel})))`;

  const piecewise = (peakValue, residualValue) =>
    `if(lt(t,${ff(prepare)}),0,if(lt(t,${ff(strike)}),${ff(peakValue)}*${prep},if(lt(t,${ff(release)}),${ff(residualValue)}+(${ff(peakValue)}-${ff(residualValue)})*${recoilMix},if(lt(t,${ff(residue)}),${ff(residualValue)},0))))`;

  const vectorX = piecewise(peak.vectorX, p.residualVectorX);
  const vectorY = piecewise(peak.vectorY, p.residualVectorY);
  const stretch = piecewise(peak.stretch, p.residualStretch);
  return deepFreeze({
    centerX: `max(0,min(1,${ff(p.anchorX)}+0.5*(${vectorX})))`,
    centerY: `max(0,min(1,${ff(p.anchorY)}+0.5*(${vectorY})))`,
    vectorX,
    vectorY,
    stretch,
    enable: `between(t,${ff(prepare)},${ff(residue)})`,
  });
}

function compileTopologyEvents(timeline) {
  if (!timeline || typeof timeline !== "object") throw new TypeError("ResolvedTimeline is required.");
  const plan = timeline.topologyEvents;
  if (!plan) return null;
  if (plan.schema !== TOPOLOGY_EVENT_PLAN_SCHEMA || plan.policyVersion !== TOPOLOGY_EVENT_POLICY) {
    throw new TypeError("Unsupported topology event plan schema/policy.");
  }
  if (plan.sourceTopology !== timeline.baseState?.topology) {
    throw new TypeError("Topology event sourceTopology must match frozen base topology.");
  }
  if (!SHA256_RE.test(plan.planSha256 || "")) {
    throw new TypeError("Topology event planSha256 must be lowercase SHA-256.");
  }
  if (plan.refusal) return null;
  if (plan.eventCount !== 1 || !Array.isArray(plan.events) || plan.events.length !== 1) {
    throw new TypeError("Topology Events v0.1 renderer accepts exactly one GRAB event.");
  }
  const event = plan.events[0];
  if (event.kind !== "grab") throw new TypeError("Topology Events v0.1 renderer supports GRAB only.");
  if (!SHA256_RE.test(event.eventSha256 || "")) {
    throw new TypeError("Topology event eventSha256 must be lowercase SHA-256.");
  }
  const timebase = Number(timeline.timebase);
  if (!Number.isSafeInteger(timebase) || timebase <= 0) {
    throw new TypeError("ResolvedTimeline timebase must be a positive safe integer.");
  }

  return deepFreeze({
    evidence: {
      policyVersion: TOPOLOGY_EVENT_POLICY,
      planSha256: plan.planSha256,
      sourceTopology: plan.sourceTopology,
      eventCount: plan.eventCount,
      renderedKinds: ["grab"],
    },
    localDeformation: {
      kind: "grab",
      eventSha256: event.eventSha256,
      anchorX: event.parameters.anchorX,
      anchorY: event.parameters.anchorY,
      centerX: event.parameters.anchorX,
      centerY: event.parameters.anchorY,
      radiusX: event.parameters.radiusX,
      radiusY: event.parameters.radiusY,
      falloff: event.parameters.falloff,
      expressions: grabExpressions(event, timebase),
    },
  });
}

module.exports = {
  compileTopologyEvents,
  sampleGrabEvent,
};
