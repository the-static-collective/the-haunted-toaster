const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  NATIVE_CHROMATIC_PROFILE_POLICY,
  analyzeNativeChromaticProfile,
  parseP6Ppm,
  profileFromRgbPixels,
} = require("../src/native-color-analysis.cjs");

function ppm(width, height, rgb, max = 255, magic = "P6") {
  return Buffer.concat([Buffer.from(`${magic}\n${width} ${height}\n${max}\n`, "ascii"), Buffer.from(rgb)]);
}

test("warm and grayscale RGB fixtures produce finite deterministic chromatic profiles", () => {
  const warmRgb = Buffer.from([255, 64, 16, 224, 96, 24, 245, 148, 40, 190, 72, 18]);
  const options = { sourceSha256: "a".repeat(64), width: 2, height: 2, rgb: warmRgb };
  const first = profileFromRgbPixels(options);
  const second = profileFromRgbPixels(options);
  assert.deepEqual(first, second);
  assert.equal(first.policyVersion, NATIVE_CHROMATIC_PROFILE_POLICY);
  assert.ok(first.hueCentroidDegrees < 55 || first.hueCentroidDegrees > 330);
  assert.ok(first.saturationMean > 0.7);
  assert.match(first.profileSha256, /^[0-9a-f]{64}$/);

  const gray = profileFromRgbPixels({
    sourceSha256: "b".repeat(64),
    width: 2,
    height: 1,
    rgb: Buffer.from([32, 32, 32, 220, 220, 220]),
  });
  assert.equal(gray.hueCentroidDegrees, 0);
  assert.equal(gray.chromaWeight, 0);
  assert.ok(Object.values(gray).every((value) => typeof value !== "number" || Number.isFinite(value)));
});

test("P6 parser fails closed on malformed headers and byte counts", () => {
  assert.throws(() => parseP6Ppm(ppm(1, 1, [1, 2, 3], 255, "P3")), /P6/);
  assert.throws(() => parseP6Ppm(ppm(1, 1, [1, 2, 3], 254)), /255/);
  assert.throws(() => parseP6Ppm(Buffer.from("P6\nnope\n255\n", "ascii")), /header/);
  assert.throws(() => parseP6Ppm(ppm(2, 1, [1, 2, 3])), /byte count/);
  assert.deepEqual(parseP6Ppm(ppm(1, 1, [1, 2, 3])), {
    width: 1,
    height: 1,
    rgb: Buffer.from([1, 2, 3]),
  });
});

test("local FFmpeg sampling produces the same profile for the same admitted image", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-native-color-test-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const imagePath = path.join(directory, "source.ppm");
  await fs.writeFile(imagePath, ppm(2, 2, [
    240, 52, 20, 220, 80, 24,
    245, 120, 30, 210, 64, 16,
  ]));
  const first = await analyzeNativeChromaticProfile(imagePath);
  const second = await analyzeNativeChromaticProfile(imagePath);
  assert.deepEqual(first, second);
  assert.equal(first.sample.width, 32);
  assert.equal(first.sample.height, 32);
});
