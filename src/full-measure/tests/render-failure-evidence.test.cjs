const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { runProcess } = require("../src/render/tooling.cjs");

test("runProcess preserves full structured evidence for abnormal process exits", async () => {
  const script = [
    "for (let i = 1; i <= 20; i += 1) {",
    "  process.stderr.write(`failure-line-${String(i).padStart(2, '0')}\\n`);",
    "}",
    "process.exit(7);",
  ].join("\n");

  await assert.rejects(
    runProcess(process.execPath, ["-e", script]),
    (error) => {
      assert.equal(error.processFailure?.binary, path.basename(process.execPath));
      assert.equal(error.processFailure?.code, 7);
      assert.equal(error.processFailure?.signal, null);
      assert.match(error.processFailure?.stderr || "", /failure-line-01/);
      assert.match(error.processFailure?.stderr || "", /failure-line-20/);

      // Human-facing errors remain concise even though the evidence object is complete.
      assert.doesNotMatch(error.message, /failure-line-01/);
      assert.match(error.message, /failure-line-20/);
      return true;
    },
  );
});
