const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { deepFreeze, hashCanonical, quantizeNumber } = require("./generation/canonical.cjs");
const { hashFile } = require("./render/receipt.cjs");
const { resolveFfmpeg, runProcess } = require("./render/tooling.cjs");

const NATIVE_CHROMATIC_PROFILE_POLICY = "native-chromatic-profile-v1";
const NATIVE_CHROMATIC_PROFILE_SCHEMA = "haunted-toaster/native-chromatic-profile/v1";

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function parseP6Ppm(input) {
  const bytes = Buffer.from(input || []);
  if (bytes.subarray(0, 2).toString("ascii") !== "P6") {
    throw new TypeError("Native Color sample must be a binary P6 PPM.");
  }
  const headerProbe = bytes.subarray(0, Math.min(bytes.length, 256)).toString("latin1");
  const match = headerProbe.match(/^P6[ \t\r\n]+(\d+)[ \t\r\n]+(\d+)[ \t\r\n]+(\d+)([ \t\r\n])/);
  if (!match) throw new TypeError("Native Color PPM header is malformed.");
  const width = Number(match[1]);
  const height = Number(match[2]);
  const maximum = Number(match[3]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new TypeError("Native Color PPM dimensions are malformed.");
  }
  if (maximum !== 255) throw new TypeError("Native Color PPM maximum must be 255.");
  let offset = Buffer.byteLength(match[0], "latin1");
  if (match[4] === "\r" && bytes[offset] === 0x0a) offset += 1;
  const rgb = bytes.subarray(offset);
  const expected = width * height * 3;
  if (rgb.length !== expected) {
    throw new TypeError(`Native Color PPM byte count must be ${expected}; received ${rgb.length}.`);
  }
  return { width, height, rgb: Buffer.from(rgb) };
}

function hsvFromRgb(red, green, blue) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const saturation = maximum === 0 ? 0 : delta / maximum;
  if (delta === 0) return { hue: 0, saturation };
  let hue;
  if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
  else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
  else hue = 60 * ((red - green) / delta + 4);
  if (hue < 0) hue += 360;
  return { hue, saturation };
}

function profileFromRgbPixels({ sourceSha256, width, height, rgb }) {
  if (!/^[0-9a-f]{64}$/.test(String(sourceSha256 || ""))) {
    throw new TypeError("Native Color sourceSha256 must be lowercase SHA-256.");
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new TypeError("Native Color RGB dimensions must be positive integers.");
  }
  const bytes = Buffer.from(rgb || []);
  if (bytes.length !== width * height * 3) {
    throw new TypeError("Native Color RGB byte count does not match its dimensions.");
  }

  let sine = 0;
  let cosine = 0;
  let hueWeight = 0;
  let saturationTotal = 0;
  let luminanceTotal = 0;
  for (let offset = 0; offset < bytes.length; offset += 3) {
    const red = bytes[offset] / 255;
    const green = bytes[offset + 1] / 255;
    const blue = bytes[offset + 2] / 255;
    const { hue, saturation } = hsvFromRgb(red, green, blue);
    const radians = hue * Math.PI / 180;
    sine += Math.sin(radians) * saturation;
    cosine += Math.cos(radians) * saturation;
    hueWeight += saturation;
    saturationTotal += saturation;
    luminanceTotal += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }

  const pixelCount = width * height;
  const centroid = hueWeight
    ? ((Math.atan2(sine, cosine) * 180 / Math.PI) + 360) % 360
    : 0;
  const resultant = hueWeight ? Math.sqrt(sine ** 2 + cosine ** 2) / hueWeight : 1;
  const body = {
    schema: NATIVE_CHROMATIC_PROFILE_SCHEMA,
    policyVersion: NATIVE_CHROMATIC_PROFILE_POLICY,
    sourceSha256,
    sample: { width, height, pixelFormat: "rgb24" },
    hueCentroidDegrees: quantizeNumber(centroid),
    hueSpread: quantizeNumber(1 - clamp(resultant)),
    saturationMean: quantizeNumber(saturationTotal / pixelCount),
    luminanceMean: quantizeNumber(luminanceTotal / pixelCount),
    chromaWeight: quantizeNumber(hueWeight / pixelCount),
  };
  return deepFreeze({
    ...body,
    profileSha256: hashCanonical(body, "HauntedToaster-NativeChromaticProfile-v1"),
  });
}

async function analyzeNativeChromaticProfile(imagePath) {
  const sourcePath = path.resolve(imagePath);
  const sourceSha256 = await hashFile(sourcePath);
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-native-color-"));
  try {
    const samplePath = path.join(temporaryDirectory, "native-color-sample.ppm");
    await runProcess(resolveFfmpeg(), [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      sourcePath,
      "-vf",
      "scale=32:32:flags=area,format=rgb24",
      "-frames:v",
      "1",
      samplePath,
    ], { cwd: temporaryDirectory });
    const { width, height, rgb } = parseP6Ppm(await fs.readFile(samplePath));
    return profileFromRgbPixels({ sourceSha256, width, height, rgb });
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

module.exports = {
  NATIVE_CHROMATIC_PROFILE_POLICY,
  NATIVE_CHROMATIC_PROFILE_SCHEMA,
  analyzeNativeChromaticProfile,
  parseP6Ppm,
  profileFromRgbPixels,
};
