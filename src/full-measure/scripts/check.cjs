const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const required = [
  "package.json",
  "README.md",
  "src/main.cjs",
  "src/preload.cjs",
  "src/align/auto-sync.cjs",
  "src/align/listener-pack.cjs",
  "src/align/matcher.cjs",
  "src/render/analyze.cjs",
  "src/render/lyrics.cjs",
  "src/render/render.cjs",
  "src/renderer/index.html",
  "src/renderer/styles.css",
  "src/renderer/app.js",
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "release", "test-artifacts"].includes(entry.name)) {
      return [];
    }
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

for (const relativePath of required) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`Missing required alpha file: ${relativePath}`);
  }
}

const scripts = walk(root).filter((filePath) => /\.(?:cjs|js)$/.test(filePath));
for (const filePath of scripts) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
}

const html = fs.readFileSync(
  path.join(root, "src", "renderer", "index.html"),
  "utf8",
);
for (const reference of ["./styles.css", "./app.js"]) {
  if (!html.includes(reference)) {
    throw new Error(`Renderer HTML is missing ${reference}`);
  }
}

const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(
  (match) => match[1],
);
const duplicates = htmlIds.filter(
  (id, index) => htmlIds.indexOf(id) !== index,
);
if (duplicates.length) {
  throw new Error(
    `Renderer HTML contains duplicate IDs: ${[...new Set(duplicates)].join(
      ", ",
    )}`,
  );
}

const rendererScript = fs.readFileSync(
  path.join(root, "src", "renderer", "app.js"),
  "utf8",
);
const referencedIds = [
  ...rendererScript.matchAll(/\$\("#([^"]+)"\)/g),
].map((match) => match[1]);
const missingIds = referencedIds.filter((id) => !htmlIds.includes(id));
if (missingIds.length) {
  throw new Error(
    `Renderer script references missing IDs: ${[
      ...new Set(missingIds),
    ].join(", ")}`,
  );
}

console.log(`Full Measure check passed (${scripts.length} scripts).`);
