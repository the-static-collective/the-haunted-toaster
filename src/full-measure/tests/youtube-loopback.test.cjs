const test = require("node:test");
const assert = require("node:assert/strict");
const {
  OAUTH_CALLBACK_PATH,
  buildLoopbackRedirectUri,
} = require("../src/publish/youtube-main.cjs");

test("desktop OAuth listens at root but sends Google's documented bare loopback origin", () => {
  assert.equal(OAUTH_CALLBACK_PATH, "/");
  assert.equal(buildLoopbackRedirectUri(43123), "http://127.0.0.1:43123");
});
