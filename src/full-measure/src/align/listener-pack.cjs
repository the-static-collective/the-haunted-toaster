const crypto = require("node:crypto");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const https = require("node:https");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { runProcess } = require("../render/tooling.cjs");

const LISTENER_PACK_VERSION = "1.0.0";
const WHISPER_CPP_VERSION = "1.9.1";
const MODEL_ID = "base.en-q5_1";
const MODEL_FILENAME = `ggml-${MODEL_ID}.bin`;
const MODEL_BYTES = 59_721_011;
const MODEL_SHA256 =
  "4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f";
const WINDOWS_ARCHIVE = "whisper-bin-x64.zip";
const WINDOWS_ARCHIVE_SHA256 =
  "7d8be46ecd31828e1eb7a2ecdd0d6b314feafd82163038ab6092594b0a063539";
const WINDOWS_ARCHIVE_URL =
  `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_CPP_VERSION}/${WINDOWS_ARCHIVE}`;
const MODEL_URL =
  `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILENAME}`;
const APPROXIMATE_DOWNLOAD_BYTES = 67_800_000;

function packDirectory(rootDirectory) {
  return path.join(rootDirectory, `listener-pack-v${LISTENER_PACK_VERSION}`);
}

async function fileExists(filePath) {
  try {
    const stat = await fsPromises.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function findFile(directory, basename) {
  const entries = await fsPromises.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === basename.toLowerCase()) {
      return candidate;
    }
    if (entry.isDirectory()) {
      const nested = await findFile(candidate, basename);
      if (nested) return nested;
    }
  }
  return null;
}

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function emitProgress(onProgress, payload) {
  onProgress?.({
    phase: payload.phase,
    label: payload.label,
    receivedBytes: payload.receivedBytes || 0,
    totalBytes: payload.totalBytes || 0,
    ratio: Math.max(0, Math.min(1, Number(payload.ratio) || 0)),
  });
}

function requestDownload(
  url,
  destination,
  options,
  redirectCount = 0,
) {
  if (redirectCount > 8) {
    return Promise.reject(new Error("The listener-pack download redirected too many times."));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "Full-Measure-Listener/0.3",
          Accept: "application/octet-stream",
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          const redirected = new URL(response.headers.location, url).href;
          resolve(
            requestDownload(
              redirected,
              destination,
              options,
              redirectCount + 1,
            ),
          );
          return;
        }

        if (statusCode !== 200) {
          response.resume();
          reject(
            new Error(
              `Listener-pack download failed with HTTP ${statusCode || "unknown"}.`,
            ),
          );
          return;
        }

        const contentLength = Number(response.headers["content-length"]) || 0;
        const output = fs.createWriteStream(destination, { flags: "wx" });
        let receivedBytes = 0;
        response.on("data", (chunk) => {
          receivedBytes += chunk.length;
          emitProgress(options.onProgress, {
            phase: options.phase,
            label: options.label,
            receivedBytes,
            totalBytes: contentLength || options.expectedBytes || 0,
            ratio:
              receivedBytes /
              Math.max(1, contentLength || options.expectedBytes || 1),
          });
        });

        pipeline(response, output).then(
          () => resolve({ receivedBytes, contentLength }),
          reject,
        );
      },
    );

    const abort = () => request.destroy(new Error("Listener-pack setup cancelled."));
    if (options.signal) {
      if (options.signal.aborted) abort();
      options.signal.addEventListener("abort", abort, { once: true });
    }
    request.setTimeout(30_000, () => {
      request.destroy(new Error("Listener-pack download timed out."));
    });
    request.once("close", () => {
      options.signal?.removeEventListener("abort", abort);
    });
    request.once("error", reject);
  });
}

async function downloadVerified(url, destination, options) {
  await requestDownload(url, destination, options);
  const stat = await fsPromises.stat(destination);
  if (options.expectedBytes && stat.size !== options.expectedBytes) {
    throw new Error(
      `${options.label} was incomplete (${stat.size} of ${options.expectedBytes} bytes).`,
    );
  }
  const digest = await hashFile(destination);
  if (options.expectedSha256 && digest !== options.expectedSha256) {
    throw new Error(`${options.label} failed its SHA-256 integrity check.`);
  }
  return { sizeBytes: stat.size, sha256: digest };
}

function validateArchiveEntries(value) {
  const entries = String(value || "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!entries.length) {
    throw new Error("The listener binary archive was empty.");
  }

  for (const entry of entries) {
    const normalized = entry.replace(/\\/g, "/");
    if (
      normalized.includes("\0") ||
      normalized.startsWith("/") ||
      /^[a-zA-Z]:/.test(normalized) ||
      normalized.split("/").some((part) => part === "..")
    ) {
      throw new Error("The listener binary archive contained an unsafe path.");
    }
  }
  return entries;
}

async function extractVerifiedZip(
  archivePath,
  destination,
  options = {},
) {
  const archiveTool = options.archiveTool || "tar.exe";
  const run = options.run || runProcess;
  const listed = await run(archiveTool, ["-tf", archivePath], {
    signal: options.signal,
  });
  validateArchiveEntries(listed.stdout);
  await run(
    archiveTool,
    ["-xf", archivePath, "-C", destination],
    { signal: options.signal },
  );
}

async function externalPackStatus() {
  const binaryPath = process.env.FULL_MEASURE_WHISPER;
  const modelPath = process.env.FULL_MEASURE_WHISPER_MODEL;
  if (!binaryPath || !modelPath) return null;
  const [binaryPresent, modelPresent] = await Promise.all([
    fileExists(path.resolve(binaryPath)),
    fileExists(path.resolve(modelPath)),
  ]);
  if (!binaryPresent || !modelPresent) return null;
  return {
    ready: true,
    source: "external",
    binaryPath: path.resolve(binaryPath),
    modelPath: path.resolve(modelPath),
  };
}

async function listenerPackStatus(
  rootDirectory,
  platform = process.platform,
  arch = process.arch,
) {
  const external = await externalPackStatus();
  if (external) {
    return {
      ...external,
      version: "external",
      whisperCppVersion: "external",
      modelId: path.basename(external.modelPath),
      installSupported: false,
      downloadBytes: 0,
    };
  }

  const directory = packDirectory(rootDirectory);
  const modelPath = path.join(directory, "model", MODEL_FILENAME);
  const binaryPath = await findFile(directory, "whisper-cli.exe").catch(
    () => null,
  );
  const modelPresent = await fileExists(modelPath);
  const modelStat = modelPresent ? await fsPromises.stat(modelPath) : null;
  const ready =
    Boolean(binaryPath) &&
    modelPresent &&
    modelStat.size === MODEL_BYTES;
  const installSupported = platform === "win32" && arch === "x64";

  return {
    ready,
    source: ready ? "managed" : "none",
    version: LISTENER_PACK_VERSION,
    whisperCppVersion: WHISPER_CPP_VERSION,
    modelId: MODEL_ID,
    binaryPath: ready ? binaryPath : null,
    modelPath: ready ? modelPath : null,
    directory,
    installSupported,
    platform,
    arch,
    downloadBytes: APPROXIMATE_DOWNLOAD_BYTES,
    diskBytes: MODEL_BYTES + 16_000_000,
  };
}

async function installListenerPack(rootDirectory, options = {}) {
  const platform = options.platform || process.platform;
  const arch = options.arch || process.arch;
  if (platform !== "win32" || arch !== "x64") {
    throw new Error(
      "Automatic Listener setup currently supports 64-bit Windows. Other systems can set FULL_MEASURE_WHISPER and FULL_MEASURE_WHISPER_MODEL.",
    );
  }

  const existing = await listenerPackStatus(rootDirectory, platform, arch);
  if (existing.ready) return existing;

  await fsPromises.mkdir(rootDirectory, { recursive: true });
  const temporary = path.join(
    rootDirectory,
    `.listener-pack-${crypto.randomUUID()}.partial`,
  );
  const archivePath = path.join(temporary, WINDOWS_ARCHIVE);
  const modelDirectory = path.join(temporary, "model");
  const modelPath = path.join(modelDirectory, MODEL_FILENAME);
  const binaryDirectory = path.join(temporary, "bin");
  const finalDirectory = packDirectory(rootDirectory);

  await fsPromises.mkdir(modelDirectory, { recursive: true });
  await fsPromises.mkdir(binaryDirectory, { recursive: true });

  try {
    emitProgress(options.onProgress, {
      phase: "binary",
      label: "Downloading the local listener",
      ratio: 0,
    });
    const binaryReceipt = await downloadVerified(
      WINDOWS_ARCHIVE_URL,
      archivePath,
      {
        phase: "binary",
        label: "Local listener",
        expectedSha256: WINDOWS_ARCHIVE_SHA256,
        onProgress: options.onProgress,
        signal: options.signal,
      },
    );
    await extractVerifiedZip(archivePath, binaryDirectory, {
      signal: options.signal,
    });
    const binaryPath = await findFile(binaryDirectory, "whisper-cli.exe");
    if (!binaryPath) {
      throw new Error("The verified listener archive did not contain whisper-cli.exe.");
    }

    emitProgress(options.onProgress, {
      phase: "model",
      label: "Downloading the English listening model",
      ratio: 0,
    });
    const modelReceipt = await downloadVerified(MODEL_URL, modelPath, {
      phase: "model",
      label: "English listening model",
      expectedBytes: MODEL_BYTES,
      expectedSha256: MODEL_SHA256,
      onProgress: options.onProgress,
      signal: options.signal,
    });

    const manifest = {
      schema: "full-measure.listener-pack.v1",
      version: LISTENER_PACK_VERSION,
      createdAt: new Date().toISOString(),
      whisperCpp: {
        version: WHISPER_CPP_VERSION,
        archive: WINDOWS_ARCHIVE,
        sha256: binaryReceipt.sha256,
        sizeBytes: binaryReceipt.sizeBytes,
      },
      model: {
        id: MODEL_ID,
        filename: MODEL_FILENAME,
        sha256: modelReceipt.sha256,
        sizeBytes: modelReceipt.sizeBytes,
      },
    };
    await fsPromises.writeFile(
      path.join(temporary, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    await fsPromises.rm(archivePath, { force: true });
    await fsPromises.rm(finalDirectory, { recursive: true, force: true });
    await fsPromises.rename(temporary, finalDirectory);

    emitProgress(options.onProgress, {
      phase: "ready",
      label: "The toaster can hear",
      ratio: 1,
    });
    return listenerPackStatus(rootDirectory, platform, arch);
  } catch (error) {
    await fsPromises.rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

module.exports = {
  APPROXIMATE_DOWNLOAD_BYTES,
  LISTENER_PACK_VERSION,
  MODEL_BYTES,
  MODEL_FILENAME,
  MODEL_ID,
  MODEL_SHA256,
  MODEL_URL,
  WHISPER_CPP_VERSION,
  WINDOWS_ARCHIVE_SHA256,
  WINDOWS_ARCHIVE_URL,
  downloadVerified,
  extractVerifiedZip,
  installListenerPack,
  listenerPackStatus,
  packDirectory,
  validateArchiveEntries,
};
