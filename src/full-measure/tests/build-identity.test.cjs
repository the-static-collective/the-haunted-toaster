const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const packageInfo = require("../package.json");
const packageLock = require("../package-lock.json");
const buildInfo = require("../src/build-info.cjs");
const { buildProvenance } = require("../src/render/receipt.cjs");
const { deriveBuildCapabilities } = require("../src/build-capabilities.cjs");

const prepareScript = fs.readFileSync(
  path.join(root, "scripts", "prepare-build-info.cjs"),
  "utf8",
);
const workflow = fs.readFileSync(
  path.resolve(root, "..", "..", ".github", "workflows", "haunted-toaster.yml"),
  "utf8",
);

test("package, lockfile, and source runtime share one forward version", () => {
  assert.equal(packageInfo.version, "0.5.0-alpha.8");
  assert.equal(packageLock.version, packageInfo.version);
  assert.equal(packageLock.packages[""].version, packageInfo.version);
  assert.equal(buildInfo.version, packageInfo.version);
});

test("build provenance names a commit truthfully instead of the fake literal source", () => {
  assert.notEqual(buildInfo.commit, "source");
  assert.match(buildInfo.commit, /^(?:[0-9a-f]{40}|unknown)$/i);
  assert.equal(typeof buildInfo.dirty, "boolean");
  assert.match(prepareScript, /process\.env\.GITHUB_SHA/);
  assert.match(prepareScript, /\["rev-parse", "HEAD"\]/);
  assert.doesNotMatch(prepareScript, /--short/);
});

test("every receipt inherits the same build identity", () => {
  const provenance = buildProvenance();
  assert.equal(provenance.version, packageInfo.version);
  assert.equal(provenance.commit, buildInfo.commit);
  assert.equal(provenance.dirty, Boolean(buildInfo.dirty));
});

test("Build Info reports the exact capabilities derived from active contracts", () => {
  assert.deepEqual(buildInfo.capabilities, [...deriveBuildCapabilities().capabilities]);
});

test("tagged Windows packaging refuses version disagreement before building", () => {
  assert.match(workflow, /Refuse tag\/package identity mismatch/);
  assert.match(workflow, /expectedTag = "v\$version"/);
  assert.match(workflow, /GITHUB_REF_NAME/);
  assert.match(packageInfo.build.artifactName, /\$\{version\}/);
});

test("Windows setup and portable targets cannot overwrite one another", () => {
  assert.match(packageInfo.build.nsis.artifactName, /\$\{version\}/);
  assert.match(packageInfo.build.nsis.artifactName, /Setup/);
  assert.match(packageInfo.build.portable.artifactName, /\$\{version\}/);
  assert.match(packageInfo.build.portable.artifactName, /Portable/);
  assert.notEqual(
    packageInfo.build.nsis.artifactName,
    packageInfo.build.portable.artifactName,
  );
});
