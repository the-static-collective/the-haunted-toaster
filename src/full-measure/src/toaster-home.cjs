const os = require("node:os");
const path = require("node:path");

function resolveToasterHome({ appDataPath = null, env = process.env } = {}) {
  const override = String(env?.HAUNTED_TOASTER_HOME || "").trim();
  if (override) return path.resolve(override);
  if (appDataPath) return path.join(path.resolve(appDataPath), "toaster-home");
  return path.join(os.homedir(), ".haunted-toaster");
}

function videoPantryCatalogPath(toasterHome) {
  if (!toasterHome) throw new TypeError("Toaster home is required.");
  return path.join(path.resolve(toasterHome), "VSPantry", "catalog", "video-pantry.v1.json");
}

module.exports = {
  resolveToasterHome,
  videoPantryCatalogPath,
};
