const { execFile } = require("node:child_process");
const ffprobeStatic = require("ffprobe-static");

function runExecFile(execFileImpl, command, args) {
  return new Promise((resolve, reject) => {
    execFileImpl(
      command,
      args,
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const detail = String(stderr || error.message || "ffprobe failed").trim();
          reject(new Error(`Unable to inspect video: ${detail}`));
          return;
        }
        resolve(String(stdout || ""));
      },
    );
  });
}

function chooseFrameRate(videoStream = {}) {
  const candidates = [videoStream.avg_frame_rate, videoStream.r_frame_rate]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const selected = candidates.find((value) => value !== "0/0");
  if (!selected || !/^\d+\/\d+$/.test(selected)) {
    throw new Error("Video probe did not provide a usable rational frame rate.");
  }
  const [numerator, denominator] = selected.split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator <= 0 || denominator <= 0) {
    throw new Error("Video probe did not provide a usable rational frame rate.");
  }
  return selected;
}

function parseProbeEvidence(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const streams = Array.isArray(parsed?.streams) ? parsed.streams : [];
  const video = streams.find((stream) => stream?.codec_type === "video");
  if (!video) throw new Error("Video probe found no video stream.");
  const durationSeconds = Number(video.duration ?? parsed?.format?.duration);
  const width = Number(video.width);
  const height = Number(video.height);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Video probe did not provide a positive duration.");
  }
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new Error("Video probe did not provide valid dimensions.");
  }
  const codec = String(video.codec_name || "").trim();
  const container = String(parsed?.format?.format_name || "").trim();
  if (!codec) throw new Error("Video probe did not provide a video codec.");
  if (!container) throw new Error("Video probe did not provide a container format.");
  return {
    durationSeconds,
    width,
    height,
    frameRate: chooseFrameRate(video),
    container,
    codec,
    hasAudio: streams.some((stream) => stream?.codec_type === "audio"),
  };
}

async function probeVideo(filePath, { ffprobePath = ffprobeStatic.path, execFileImpl = execFile } = {}) {
  if (!ffprobePath) throw new Error("ffprobe is unavailable.");
  const stdout = await runExecFile(execFileImpl, ffprobePath, [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  try {
    return parseProbeEvidence(stdout);
  } catch (error) {
    throw new Error(`Unable to inspect video: ${error.message}`);
  }
}

module.exports = {
  parseProbeEvidence,
  probeVideo,
};
