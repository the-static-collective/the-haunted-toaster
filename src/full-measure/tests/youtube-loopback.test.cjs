const test = require("node:test");
const assert = require("node:assert/strict");
const { OAUTH_CALLBACK_PATH } = require("../src/publish/youtube-main.cjs");

test("desktop OAuth uses Google's documented bare loopback redirect path", () => {
  assert.equal(OAUTH_CALLBACK_PATH, "/");
});
