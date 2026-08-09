const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../src/render/haunted-typography.cjs"),
  "utf8",
);

test("haunted typography resolver has no ambient entropy sources", () => {
  assert.doesNotMatch(source, /Math\.random\s*\(/);
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /new Date\s*\(/);
});

test("haunted typography stays off the visual generator's sequential PRNG stream", () => {
  assert.doesNotMatch(source, /xoshiro|splitmix|\.next\s*\(|nextUint|nextFloat/i);
  assert.match(source, /const TYPOGRAPHY_DOMAIN = "typography"/);
  assert.match(source, /childSeedSha256/);
});

test("haunted typography resolver does not discover host fonts or execute foreign code", () => {
  assert.doesNotMatch(source, /fontconfig|fc-list|readdir|readFile|exec\s*\(|spawn\s*\(/i);
  assert.doesNotMatch(source, /https?:\/\//i);
});