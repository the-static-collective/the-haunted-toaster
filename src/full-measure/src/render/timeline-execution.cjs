const {
  TIMELINE_SCHEMA,
  stateAtTick,
} = require("../generation/index.cjs");

function assertResolvedTimeline(timeline) {
  if (!timeline || typeof timeline !== "object") {
    throw new TypeError("ResolvedTimeline is required.");
  }
  if (timeline.schema !== TIMELINE_SCHEMA) {
    throw new TypeError(`Expected ${TIMELINE_SCHEMA}.`);
  }
  if (!Number.isInteger(timeline.timebase) || timeline.timebase <= 0) {
    throw new TypeError("ResolvedTimeline.timebase must be a positive integer.");
  }
  if (!Number.isInteger(timeline.durationTicks) || timeline.durationTicks < 0) {
    throw new TypeError("ResolvedTimeline.durationTicks must be a non-negative integer.");
  }
  if (!timeline.baseState || typeof timeline.baseState !== "object") {
    throw new TypeError("ResolvedTimeline.baseState is required.");
  }
  if (!Array.isArray(timeline.patches)) {
    throw new TypeError("ResolvedTimeline.patches must be an array.");
  }
  let previousTick = -1;
  for (const patch of timeline.patches) {
    if (!Number.isInteger(patch.atTick) || patch.atTick < previousTick) {
      throw new TypeError("ResolvedTimeline patches must be ordered by canonical tick.");
    }
    if (patch.atTick > timeline.durationTicks) {
      throw new TypeError("ResolvedTimeline patch exceeds durationTicks.");
    }
    previousTick = patch.atTick;
  }

  if (timeline.possessionArc !== undefined) {
    if (!timeline.possessionArc || typeof timeline.possessionArc !== "object") {
      throw new TypeError("ResolvedTimeline.possessionArc must be an object when present.");
    }
    if (!Array.isArray(timeline.possessionArc.transitions)) {
      throw new TypeError("ResolvedTimeline.possessionArc.transitions must be an array.");
    }
    let previousArcTick = -1;
    for (const transition of timeline.possessionArc.transitions) {
      if (!Number.isInteger(transition.atTick) || transition.atTick < previousArcTick) {
        throw new TypeError("Possession Arc transitions must be ordered by canonical tick.");
      }
      if (transition.atTick > timeline.durationTicks) {
        throw new TypeError("Possession Arc transition exceeds durationTicks.");
      }
      if (transition.boundary !== "section") {
        throw new TypeError("Possession Arc v1 transitions must occur at section boundaries.");
      }
      if (!["motion", "material", "camera", "palette"].includes(transition.axis)) {
        throw new TypeError(`Unsupported Possession Arc axis: ${String(transition.axis)}.`);
      }
      if (transition.transition !== "cut") {
        throw new TypeError("Possession Arc v1 supports cut transitions only.");
      }
      previousArcTick = transition.atTick;
    }
  }
  return timeline;
}

function tickToSeconds(timeline, tick) {
  assertResolvedTimeline(timeline);
  return Number(tick) / timeline.timebase;
}

function secondsToTick(timeline, seconds) {
  assertResolvedTimeline(timeline);
  return Math.max(
    0,
    Math.min(
      timeline.durationTicks,
      Math.round(Number(seconds) * timeline.timebase),
    ),
  );
}

function semanticStateAtTick(timeline, tick) {
  assertResolvedTimeline(timeline);
  return stateAtTick(timeline, tick);
}

function semanticStateAtSeconds(timeline, seconds) {
  return semanticStateAtTick(timeline, secondsToTick(timeline, seconds));
}

function executionSegments(timeline) {
  assertResolvedTimeline(timeline);
  const starts = [0];
  const eventTicks = [
    ...timeline.patches.map((patch) => patch.atTick),
    ...(timeline.possessionArc?.transitions || []).map((transition) => transition.atTick),
  ].sort((left, right) => left - right);
  for (const atTick of eventTicks) {
    if (atTick > 0 && atTick < timeline.durationTicks) {
      if (starts[starts.length - 1] !== atTick) starts.push(atTick);
    }
  }

  return starts.map((startTick, index) => {
    const endTick = starts[index + 1] ?? timeline.durationTicks;
    return Object.freeze({
      startTick,
      endTick,
      startSeconds: tickToSeconds(timeline, startTick),
      endSeconds: tickToSeconds(timeline, endTick),
      state: semanticStateAtTick(timeline, startTick),
    });
  });
}

function assertTimelineDuration(timeline, durationSeconds, toleranceSeconds = 0.001) {
  assertResolvedTimeline(timeline);
  const expectedSeconds = timeline.durationTicks / timeline.timebase;
  const delta = Math.abs(expectedSeconds - Number(durationSeconds));
  if (!Number.isFinite(delta) || delta > toleranceSeconds) {
    throw new RangeError(
      `ResolvedTimeline duration ${expectedSeconds}s does not match source duration ${durationSeconds}s (delta ${delta}s).`,
    );
  }
  return expectedSeconds;
}

function createTimelineExecution(timeline) {
  assertResolvedTimeline(timeline);
  return Object.freeze({
    timeline,
    timelineHash: timeline.timelineHash || null,
    scoreAddress: timeline.scoreAddress || null,
    timebase: timeline.timebase,
    durationTicks: timeline.durationTicks,
    segments: Object.freeze(executionSegments(timeline)),
    stateAtTick(tick) {
      return semanticStateAtTick(timeline, tick);
    },
    stateAtSeconds(seconds) {
      return semanticStateAtSeconds(timeline, seconds);
    },
  });
}

module.exports = {
  assertResolvedTimeline,
  assertTimelineDuration,
  createTimelineExecution,
  executionSegments,
  secondsToTick,
  semanticStateAtSeconds,
  semanticStateAtTick,
  tickToSeconds,
};