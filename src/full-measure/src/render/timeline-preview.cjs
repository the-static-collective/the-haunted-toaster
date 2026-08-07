const { createTimelineExecution } = require("./timeline-execution.cjs");
const { rendererValues } = require("./timeline-filter.cjs");

function freezeSample(sample) {
  return Object.freeze({
    tick: sample.tick,
    seconds: sample.seconds,
    semanticState: Object.freeze(structuredClone(sample.semanticState)),
    renderer: rendererValues(sample.semanticState),
  });
}

function createTimelinePreview(timeline) {
  const execution = createTimelineExecution(timeline);
  return Object.freeze({
    timeline: execution.timeline,
    timelineHash: execution.timelineHash,
    scoreAddress: execution.scoreAddress,
    stateAtTick: execution.stateAtTick,
    stateAtSeconds: execution.stateAtSeconds,
    sampleAtTick(tick) {
      const boundedTick = Math.max(0, Math.min(execution.durationTicks, Math.round(Number(tick))));
      return freezeSample({
        tick: boundedTick,
        seconds: boundedTick / execution.timebase,
        semanticState: execution.stateAtTick(boundedTick),
      });
    },
    sampleAtSeconds(seconds) {
      const boundedSeconds = Math.max(0, Math.min(execution.durationTicks / execution.timebase, Number(seconds)));
      const tick = Math.max(0, Math.min(execution.durationTicks, Math.round(boundedSeconds * execution.timebase)));
      return freezeSample({
        tick,
        seconds: tick / execution.timebase,
        semanticState: execution.stateAtTick(tick),
      });
    },
  });
}

module.exports = {
  createTimelinePreview,
};