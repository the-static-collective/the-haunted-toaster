// Experimental archaeology recovery. Measurements are testimony, never execution.
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { deriveFrameReservoir } = require('./frame-reservoir.cjs');
const { hashFile } = require('./admit.cjs');
const { resolveFfmpeg } = require('../render/tooling.cjs');
const { deepFreeze, hashCanonical } = require('../generation/canonical.cjs');
const run = promisify(execFile);
const POLICY = 'archaeology-material-v1';
const SAMPLE_RATE = 8000;
const WINDOW_SAMPLES = 800;
const MAX_SECONDS = 12;
const FRAME_SIDE = 16;
const MAX_FRAMES = 6;

function seal(core, field, domain) {
  return deepFreeze({ ...core, [field]: hashCanonical(core, domain) });
}
function identity(binding) {
  const reservoir = deriveFrameReservoir(binding, { representativeCount: MAX_FRAMES });
  return { specimenId: reservoir.specimenId, sourceSha256: reservoir.sourceSha256 };
}
function unavailable(reason) { return { status: 'unavailable', reason }; }

function buildToastPack(binding, { frames = [], decoder = null } = {}) {
  const reservoir = deriveFrameReservoir(binding, { representativeCount: MAX_FRAMES });
  if (!Array.isArray(frames) || frames.length > MAX_FRAMES) throw new TypeError('Too many visual samples.');
  if (frames.length && (typeof decoder !== 'string' || !decoder)) throw new TypeError('Measured frames require decoder identity.');
  let previous = null;
  const visualSamples = frames.map(({ atMillis, rgb }) => {
    if (!Number.isSafeInteger(atMillis) || atMillis < 0 || atMillis >= Math.ceil(binding.probe.durationSeconds * 1000) || (previous && atMillis <= previous.atMillis)) throw new TypeError('Visual sample times must be increasing and clip-relative.');
    if (!Buffer.isBuffer(rgb) || rgb.length !== FRAME_SIDE * FRAME_SIDE * 3) throw new TypeError('Expected 16x16 RGB24 frame.');
    const totals = [0, 0, 0];
    const luminances = [];
    for (let p = 0; p < rgb.length; p += 3) {
      for (let c = 0; c < 3; c++) totals[c] += rgb[p + c];
      luminances.push(Math.round((77 * rgb[p] + 150 * rgb[p + 1] + 29 * rgb[p + 2]) / 256));
    }
    let edges = 0, edgeCount = 0;
    for (let y = 0; y < FRAME_SIDE; y++) for (let x = 0; x < FRAME_SIDE; x++) {
      const i = y * FRAME_SIDE + x;
      if (x) { edges += Math.abs(luminances[i] - luminances[i - 1]); edgeCount++; }
      if (y) { edges += Math.abs(luminances[i] - luminances[i - FRAME_SIDE]); edgeCount++; }
    }
    const frameDifference = previous ? Math.round(luminances.reduce((sum, v, i) => sum + Math.abs(v - previous.luminances[i]), 0) / luminances.length) : null;
    previous = { atMillis, luminances };
    return { atMillis, meanRgb: totals.map(v => Math.round(v / luminances.length)), meanLuminance: Math.round(luminances.reduce((a,b)=>a+b,0) / luminances.length), edgeDifference: Math.round(edges / edgeCount), frameDifference };
  });
  return seal({ schema: 'haunted-toaster/toastpack-analysis/v1', policyVersion: POLICY,
    ...identity(binding), status: 'partial', executionAuthority: 'none', decoder,
    reservoir, visualStatus: visualSamples.length ? 'available' : 'unavailable', visualSamples,
    sampling: { policy: 'six-even-seeks-first-12-seconds-rgb16-v1', maxSeconds: MAX_SECONDS, frameSide: FRAME_SIDE, maxFrames: MAX_FRAMES, timestamps: 'requested-seek-times-not-exact-frame-PTS' },
    // Difference is a coarse sample proxy; it is not optical flow or a scene cut.
    motion: unavailable('no-optical-flow'), sceneChanges: unavailable('no-scene-detector'),
    occupancy: unavailable('not-measured'), affinities: unavailable('no-admitted-affinity-policy'),
  }, 'manifestSha256', 'HauntedToaster-ToastPackAnalysis-v1');
}

function buildSpecimenPulse(binding, { pcm = null, decoder = null } = {}) {
  const source = identity(binding);
  if (typeof binding.probe.hasAudio !== 'boolean') throw new TypeError('Admitted audio availability is required.');
  const noAudio = !binding.probe.hasAudio;
  if (pcm !== null && (!Buffer.isBuffer(pcm) || pcm.length % 2 || pcm.length > Math.ceil(SAMPLE_RATE * Math.min(MAX_SECONDS, binding.probe.durationSeconds)) * 2)) throw new TypeError('Expected bounded mono signed 16-bit PCM.');
  if (!noAudio && pcm?.length && (typeof decoder !== 'string' || !decoder)) throw new TypeError('PCM requires decoder identity.');
  const windows = [];
  if (!noAudio && pcm?.length) {
    const count = pcm.length / 2;
    for (let start = 0; start < count; start += WINDOW_SAMPLES) {
      const end = Math.min(start + WINDOW_SAMPLES, count);
      let squares = 0, peak = 0, crossings = 0, prior = null;
      for (let i = start; i < end; i++) {
        const sample = pcm.readInt16LE(i * 2);
        squares += sample * sample; peak = Math.max(peak, Math.abs(sample));
        if (prior !== null && ((prior < 0 && sample >= 0) || (prior >= 0 && sample < 0))) crossings++;
        prior = sample;
      }
      const energy = Math.round(squares / ((end-start) * 1073741824) * 1000000);
      const energyDelta = windows.length ? energy - windows.at(-1).energy : 0;
      windows.push({ startMillis: start * 1000 / SAMPLE_RATE, endMillis: end * 1000 / SAMPLE_RATE, energy, energyDelta,
        peak: Math.round(peak / 32768 * 1000000), zeroCrossings: crossings, onsetProxy: energyDelta >= 20000 });
    }
  }
  return seal({ schema: 'haunted-toaster/specimen-pulse/v1', policyVersion: POLICY, ...source,
    status: windows.length ? 'partial' : 'unavailable', reason: noAudio ? 'no-attached-audio' : windows.length ? null : 'audio-decode-unavailable', decoder: noAudio ? null : decoder,
    timingAuthority: 'clip-relative-only', masterAudioAuthority: 'none', executionAuthority: 'none',
    sampleRate: SAMPLE_RATE, windowSamples: WINDOW_SAMPLES, maxSeconds: MAX_SECONDS,
    units: 'mean-square-and-peak-parts-per-million', onsetPolicy: 'positive-energy-delta-at-least-20000-not-beat-v1',
    coverageMillis: windows.length ? windows.at(-1).endMillis : 0, windows,
    spectralPressure: unavailable('not-measured'), spectralFlux: unavailable('not-measured'), periodicity: unavailable('not-inferred'),
  }, 'witnessSha256', 'HauntedToaster-SpecimenPulse-v1');
}

async function analyzeSpecimenMaterial(binding, { signal, hashFileImpl = hashFile, decode = run, ffmpegPath = resolveFfmpeg() } = {}) {
  identity(binding); // Validate admission before touching a path or launching a process.
  const verify = async () => {
    signal?.throwIfAborted();
    const actual = await hashFileImpl(binding.path);
    if (actual.sha256 !== binding.sourceSha256 || actual.byteLength !== binding.byteLength) throw new Error('Specimen content identity changed.');
  };
  await verify();
  const frames = [];
  let pcm = null, decoder = null;
  const options = { encoding: 'buffer', maxBuffer: 2 * 1024 * 1024, timeout: 15000, windowsHide: true, signal };
  const attempt = async (args) => {
    try { return (await decode(ffmpegPath, args, options)).stdout; }
    catch (error) { if (signal?.aborted || error?.name === 'AbortError') throw error; return null; }
  };
  const version = await attempt(['-version']);
  if (version) decoder = String(version).split(/\r?\n/)[0].trim() || null;
  if (decoder) {
    const endMillis = Math.max(0, Math.floor(Math.min(MAX_SECONDS, binding.probe.durationSeconds) * 1000) - 1);
    const times = [...new Set(Array.from({length: MAX_FRAMES}, (_,i) => Math.floor(i * endMillis / (MAX_FRAMES - 1))))];
    for (const atMillis of times) {
      signal?.throwIfAborted();
      const rgb = await attempt(['-v','error','-threads','1','-ss',String(atMillis / 1000),'-i',binding.path,'-map','0:v:0','-frames:v','1','-vf','scale=16:16:flags=area','-pix_fmt','rgb24','-threads','1','-f','rawvideo','pipe:1']);
      if (Buffer.isBuffer(rgb) && rgb.length === FRAME_SIDE * FRAME_SIDE * 3) frames.push({ atMillis, rgb });
    }
    if (binding.probe.hasAudio) pcm = await attempt(['-v','error','-threads','1','-i',binding.path,'-map','0:a:0','-t',String(Math.min(MAX_SECONDS, binding.probe.durationSeconds)),'-ac','1','-ar',String(SAMPLE_RATE),'-c:a','pcm_s16le','-f','s16le','pipe:1']);
  }
  await verify(); // A changed source cannot retain testimony from its previous bytes.
  return deepFreeze({ toastPack: buildToastPack(binding,{frames,decoder}), specimenPulse: buildSpecimenPulse(binding,{pcm,decoder}) });
}
module.exports = { POLICY, buildToastPack, buildSpecimenPulse, analyzeSpecimenMaterial };
