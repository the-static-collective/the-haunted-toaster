const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function unpackedPath(binaryPath) {
  if (!binaryPath) return binaryPath;
  return binaryPath.replace(
    `${path.sep}app.asar${path.sep}`,
    `${path.sep}app.asar.unpacked${path.sep}`,
  );
}

function resolveModulePath(packageName) {
  try {
    const installed = require(packageName);
    const binaryPath =
      typeof installed === "string" ? installed : installed?.path;
    const resolved = unpackedPath(binaryPath);
    return resolved && fs.existsSync(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function resolveFfmpeg() {
  return (
    process.env.FULL_MEASURE_FFMPEG ||
    resolveModulePath("ffmpeg-static") ||
    "ffmpeg"
  );
}

function resolveFfprobe() {
  return (
    process.env.FULL_MEASURE_FFPROBE ||
    resolveModulePath("ffprobe-static") ||
    "ffprobe"
  );
}

function runProcess(binary, args, options = {}) {
  const {
    cwd,
    signal,
    onStdout,
    onStderr,
    collectStdout = true,
    collectStderr = true,
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let aborted = false;

    const abort = () => {
      aborted = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 1_500).unref();
    };

    if (signal) {
      if (signal.aborted) abort();
      signal.addEventListener("abort", abort, { once: true });
    }

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      if (collectStdout) stdout += text;
      onStdout?.(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      if (collectStderr) stderr += text;
      onStderr?.(text);
    });

    child.once("error", (error) => {
      if (signal) signal.removeEventListener("abort", abort);
      reject(
        new Error(`Could not start ${path.basename(binary)}: ${error.message}`),
      );
    });

    child.once("close", (code, closeSignal) => {
      if (signal) signal.removeEventListener("abort", abort);

      if (aborted) {
        const error = new Error("Render cancelled.");
        error.code = "RENDER_CANCELLED";
        reject(error);
        return;
      }

      if (code !== 0) {
        const detail = stderr.trim().split(/\r?\n/).slice(-12).join("\n");
        const error = new Error(
          `${path.basename(binary)} exited with code ${code}${
            closeSignal ? ` (${closeSignal})` : ""
          }${detail ? `\n${detail}` : ""}`,
        );
        error.processFailure = Object.freeze({
          binary: path.basename(binary),
          code,
          signal: closeSignal || null,
          stdout,
          stderr,
        });
        reject(error);
        return;
      }

      resolve({ stdout, stderr, code });
    });
  });
}

module.exports = {
  resolveFfmpeg,
  resolveFfprobe,
  runProcess,
};
