const path = require("node:path");
const { resolveFfmpeg, resolveFfprobe, runProcess } = require("./tooling.cjs");

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * ratio)),
  );
  return sorted[index];
}

function movingAverage(values, radius = 2) {
  return values.map((_, index) => {
    let sum = 0;
    let count = 0;
    for (
      let cursor = Math.max(0, index - radius);
      cursor <= Math.min(values.length - 1, index + radius);
      cursor += 1
    ) {
      sum += values[cursor];
      count += 1;
    }
    return count ? sum / count : values[index];
  });
}

function normalizeEnergy(samples) {
  if (!samples.length) return [];
  const finite = samples
    .map((sample) => sample.db)
    .filter((value) => Number.isFinite(value) && value > -120);
  if (!finite.length) {
    return samples.map((sample) => ({ ...sample, energy: 0 }));
  }

  const low = percentile(finite, 0.1);
  const high = percentile(finite, 0.9);
  const span = Math.max(6, high - low);

  return samples.map((sample) => ({
    ...sample,
    energy: Math.max(0, Math.min(1, (sample.db - low) / span)),
  }));
}

function targetSectionCount(duration) {
  if (duration < 18) return 3;
  if (duration < 55) return 4;
  if (duration < 120) return 5;
  if (duration < 190) return 6;
  if (duration < 260) return 7;
  return 8;
}

function labelSection(index, count, energy, delta) {
  if (index === 0) return "Opening";
  if (index === count - 1) return "Final form";
  if (delta > 0.17) return "Lift";
  if (delta < -0.17) return "Release";
  if (energy > 0.78) return "Peak";
  if (energy > 0.55) return "Full bloom";
  if (energy > 0.3) return "Steady";
  return "Hush";
}

function detectSections(samples, duration) {
  const safeDuration = Math.max(0.1, finiteNumber(duration, 0.1));
  const desiredCount = targetSectionCount(safeDuration);

  if (!samples.length) {
    const width = safeDuration / desiredCount;
    return Array.from({ length: desiredCount }, (_, index) => ({
      index,
      start: index * width,
      end: index === desiredCount - 1 ? safeDuration : (index + 1) * width,
      energy: 0.5,
      label: labelSection(index, desiredCount, 0.5, 0),
    }));
  }

  const normalized = normalizeEnergy(samples);
  const energies = movingAverage(
    normalized.map((sample) => sample.energy),
    2,
  );
  const secondsPerSample =
    normalized.length > 1
      ? Math.max(
          0.25,
          normalized[normalized.length - 1].time /
            (normalized.length - 1),
        )
      : 1;
  const windowSize = Math.max(2, Math.round(4 / secondsPerSample));
  const candidates = [];

  for (
    let index = windowSize;
    index < energies.length - windowSize;
    index += 1
  ) {
    const before =
      energies
        .slice(index - windowSize, index)
        .reduce((sum, value) => sum + value, 0) / windowSize;
    const after =
      energies
        .slice(index, index + windowSize)
        .reduce((sum, value) => sum + value, 0) / windowSize;
    const valley = Math.max(0, 0.25 - energies[index]) * 0.4;
    candidates.push({
      time: normalized[index].time,
      score: Math.abs(after - before) + valley,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  const minimumGap = Math.max(5, safeDuration / (desiredCount * 1.9));
  const boundaries = [0, safeDuration];

  for (const candidate of candidates) {
    if (boundaries.length >= desiredCount + 1) break;
    if (
      candidate.time < minimumGap ||
      safeDuration - candidate.time < minimumGap
    ) {
      continue;
    }
    if (
      boundaries.every(
        (existingBoundary) =>
          Math.abs(existingBoundary - candidate.time) >= minimumGap,
      )
    ) {
      boundaries.push(candidate.time);
    }
  }

  for (
    let index = 1;
    index < desiredCount && boundaries.length < desiredCount + 1;
    index += 1
  ) {
    const even = (safeDuration * index) / desiredCount;
    if (
      boundaries.every(
        (existingBoundary) =>
          Math.abs(existingBoundary - even) >= minimumGap * 0.55,
      )
    ) {
      boundaries.push(even);
    }
  }

  boundaries.sort((a, b) => a - b);

  while (boundaries.length > desiredCount + 1) {
    boundaries.splice(boundaries.length - 2, 1);
  }

  while (boundaries.length < desiredCount + 1) {
    let largestIndex = 0;
    let largestSpan = 0;
    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const span = boundaries[index + 1] - boundaries[index];
      if (span > largestSpan) {
        largestSpan = span;
        largestIndex = index;
      }
    }
    boundaries.splice(
      largestIndex + 1,
      0,
      boundaries[largestIndex] + largestSpan / 2,
    );
  }

  const sections = boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const contained = normalized.filter(
      (sample) => sample.time >= start && sample.time < end,
    );
    const energy = contained.length
      ? contained.reduce((sum, sample) => sum + sample.energy, 0) /
        contained.length
      : 0.5;
    return {
      index,
      start,
      end,
      energy,
      label: "",
    };
  });

  return sections.map((section, index) => {
    const previousEnergy =
      index > 0 ? sections[index - 1].energy : section.energy;
    return {
      ...section,
      label: labelSection(
        index,
        sections.length,
        section.energy,
        section.energy - previousEnergy,
      ),
    };
  });
}

async function probeMedia(filePath) {
  const { stdout } = await runProcess(resolveFfprobe(), [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    filePath,
  ]);

  let data;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error("FFprobe returned unreadable media information.");
  }

  const audio = data.streams?.find((stream) => stream.codec_type === "audio");
  const video = data.streams?.find((stream) => stream.codec_type === "video");
  const duration = finiteNumber(
    data.format?.duration ?? audio?.duration ?? video?.duration,
  );

  return {
    path: filePath,
    filename: path.basename(filePath),
    duration,
    sizeBytes: finiteNumber(data.format?.size),
    formatName: data.format?.format_name || "unknown",
    bitrate: finiteNumber(data.format?.bit_rate),
    audio: audio
      ? {
          codec: audio.codec_name || "unknown",
          codecLongName: audio.codec_long_name || audio.codec_name || "unknown",
          sampleRate: finiteNumber(audio.sample_rate),
          channels: finiteNumber(audio.channels),
          channelLayout: audio.channel_layout || null,
          bitrate: finiteNumber(audio.bit_rate),
          duration: finiteNumber(audio.duration, duration),
        }
      : null,
    video: video
      ? {
          codec: video.codec_name || "unknown",
          width: finiteNumber(video.width),
          height: finiteNumber(video.height),
          pixelFormat: video.pix_fmt || null,
          duration: finiteNumber(video.duration, duration),
        }
      : null,
  };
}

async function analyzeEnergy(filePath) {
  const { stdout } = await runProcess(resolveFfmpeg(), [
    "-hide_banner",
    "-nostats",
    "-v",
    "error",
    "-i",
    filePath,
    "-vn",
    "-af",
    "aresample=8000,asetnsamples=n=8000:p=1,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
    "-f",
    "null",
    "-",
  ]);

  const samples = [];
  let currentTime = null;

  for (const line of stdout.split(/\r?\n/)) {
    const timeMatch = line.match(/pts_time:([0-9.]+)/);
    if (timeMatch) {
      currentTime = Number(timeMatch[1]);
      continue;
    }

    const rmsMatch = line.match(
      /lavfi\.astats\.Overall\.RMS_level=(-?(?:\d+(?:\.\d+)?|inf))/i,
    );
    if (!rmsMatch || currentTime === null) continue;

    const db =
      rmsMatch[1].toLowerCase() === "-inf" ? -120 : Number(rmsMatch[1]);
    samples.push({ time: currentTime, db });
  }

  return samples;
}

async function inspectAudio(filePath) {
  const media = await probeMedia(filePath);
  if (!media.audio) {
    throw new Error("That file does not contain an audio stream.");
  }
  if (!media.duration || media.duration <= 0) {
    throw new Error("The song duration could not be determined.");
  }

  const energySamples = await analyzeEnergy(filePath);
  const sections = detectSections(energySamples, media.duration);

  return {
    ...media,
    energySamples,
    sections,
  };
}

module.exports = {
  analyzeEnergy,
  detectSections,
  inspectAudio,
  normalizeEnergy,
  probeMedia,
  targetSectionCount,
};
