const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { createCandidateSession } = require("../src/candidate-session.cjs");

const audioPath = path.resolve("/tmp/WALK E Verb Activity.wav");
const mediaAnalysis = Object.freeze({
  filename: "WALK E Verb Activity.wav",
  sizeBytes: 35_067_052,
  duration: 100,
  formatName: "wav",
  audio: Object.freeze({ codec: "pcm_s16le", sampleRate: 48_000, channels: 2 }),
  energySamples: Object.freeze([
    Object.freeze({ time: 0, db: -44 }),
    Object.freeze({ time: 10, db: -40 }),
    Object.freeze({ time: 20, db: -31 }),
    Object.freeze({ time: 32, db: -25 }),
    Object.freeze({ time: 44, db: -22 }),
    Object.freeze({ time: 55, db: -15 }),
    Object.freeze({ time: 68.5, db: -13 }),
    Object.freeze({ time: 82, db: -29 }),
    Object.freeze({ time: 91, db: -35 }),
    Object.freeze({ time: 100, db: -42 }),
  ]),
  sections: Object.freeze([
    Object.freeze({ index: 0, label: "Opening", start: 0, end: 20, energy: 0.2 }),
    Object.freeze({ index: 1, label: "Lift", start: 20, end: 55, energy: 0.72 }),
    Object.freeze({ index: 2, label: "Peak", start: 55, end: 82, energy: 0.91 }),
    Object.freeze({ index: 3, label: "Release", start: 82, end: 100, energy: 0.37 }),
  ]),
});

async function ordinaryFamily(rootSeed) {
  let family = null;
  const session = createCandidateSession({
    async renderCandidateFamilyPreviews(_config, nextFamily) {
      family = nextFamily;
      return {
        familyHash: nextFamily.familyHash,
        candidates: nextFamily.candidates.map((candidate) => ({
          index: candidate.index,
          scoreAddress: candidate.scoreAddress,
          timelineHash: candidate.timelineHash,
        })),
      };
    },
  });
  session.noteAudio(audioPath, mediaAnalysis);
  await session.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed,
    lyrics: "",
  });
  assert.ok(family);
  return family;
}

function eventsFor(candidate) {
  return candidate.timeline.topologyEvents?.events || [];
}

test("ordinary topology runs hot: several lawful hits per candidate, with more than GRAB available", async () => {
  const family = await ordinaryFamily("walk-e-hot-ordinary-verbs");
  const schedules = family.candidates.map(eventsFor);
  const events = schedules.flat();
  const averageEvents = events.length / family.candidates.length;
  const kinds = new Set(events.map((event) => event.kind));

  assert.ok(averageEvents >= 3, `expected >=3 ordinary events/candidate on average, got ${averageEvents}`);
  assert.ok(schedules.some((schedule) => schedule.length >= 2), "expected multiple hits in at least one track");
  assert.ok([...kinds].some((kind) => kind !== "grab"), "ordinary topology must not be a GRAB-only ecology");
  assert.ok(events.every((event) => ["aperture", "speak", "grab", "grow"].includes(event.kind)));
  assert.ok(family.candidates.every((candidate) => candidate.forcedWitness !== true));
});

test("ordinary topology activity is exactly replayable from the same seed", async () => {
  const first = await ordinaryFamily("walk-e-hot-ordinary-replay");
  const second = await ordinaryFamily("walk-e-hot-ordinary-replay");
  const schedule = (family) => family.candidates.map((candidate) =>
    eventsFor(candidate).map((event) => ({
      id: event.id,
      kind: event.kind,
      prepareTick: event.prepareTick,
      strikeTick: event.strikeTick,
      releaseTick: event.releaseTick,
      residueUntilTick: event.residueUntilTick,
      eventSha256: event.eventSha256,
    })),
  );
  assert.deepEqual(schedule(first), schedule(second));
});

test("a naturally admitted GRAB can bind L BRANCH to its own accepted event window", async () => {
  const family = await ordinaryFamily("walk-e-natural-grab-scope");
  const candidate = family.candidates.find((entry) => {
    const grabs = eventsFor(entry).filter((event) => event.kind === "grab");
    const scoped = entry.timeline.lBranch?.execution?.sends?.filter((send) => send.scope.kind === "grab") || [];
    return grabs.length > 0 && scoped.length > 0;
  });

  assert.ok(candidate, "expected a natural ordinary GRAB with a lawful L BRANCH scoped send");
  const grabs = eventsFor(candidate).filter((event) => event.kind === "grab");
  const scoped = candidate.timeline.lBranch.execution.sends.filter((send) => send.scope.kind === "grab");
  assert.ok(scoped.every((send) => grabs.some((grab) =>
    send.scope.startTick === grab.prepareTick && send.scope.endTick === grab.residueUntilTick
  )));
});
