#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function usage() {
  return `Haunted Toaster VisualScore v0.5 lab

Commands:
  score <constraints.json> <out.json> --seed <seed> [--topology circle]
  resolve <analysis.json> <score.json> <constraints.json> <profile.json> <out.json>
  mutate <score.json> <constraints.json> <out.json> --seed <seed> [--amount 0.2] [--lock path,path]
  breed <left.json> <right.json> <constraints.json> <out.json> --seed <seed> [--mix 0.5]
  diff <left.json> <right.json> [out.json]
  replay <timeline.json> <analysis.json> <score.json> <constraints.json> <profile.json> [out.json]
  graph <timeline.json> <profile.json> [out.ffgraph]

Score inputs may be raw VisualScore documents or score-artifact envelopes.
`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function writeJson(value, filePath = null) {
  const output = `${JSON.stringify(value, null, 2)}\n`;
  if (filePath) fs.writeFileSync(path.resolve(filePath), output, "utf8");
  else process.stdout.write(output);
}

function writeText(value, filePath = null) {
  const output = value.endsWith("\n") ? value : `${value}\n`;
  if (filePath) fs.writeFileSync(path.resolve(filePath), output, "utf8");
  else process.stdout.write(output);
}

function unwrapScore(value) {
  return value?.schema === "haunted-toaster/score-artifact/v1" ? value.score : value;
}

function options(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function requireOption(parsed, name) {
  if (parsed[name] === undefined || parsed[name] === true) {
    throw new TypeError(`Missing --${name}.`);
  }
  return parsed[name];
}

function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help") {
    process.stdout.write(usage());
    return;
  }
  const flags = options(rest);
  const positional = rest.filter((value, index) => {
    if (value.startsWith("--")) return false;
    return index === 0 || !rest[index - 1]?.startsWith("--");
  });

  if (command === "score") {
    const [constraintsPath, outputPath] = positional;
    if (!constraintsPath || !outputPath) throw new TypeError("score requires constraints and output paths.");
    const overrides = {};
    for (const key of ["topology", "temporalDensity"]) {
      if (flags[key] && flags[key] !== true) overrides[key] = flags[key];
    }
    const artifact = generation.createVisualScore({
      seed: requireOption(flags, "seed"),
      constraints: readJson(constraintsPath),
      overrides,
    });
    writeJson(artifact, outputPath);
    return;
  }

  if (command === "resolve") {
    const [analysisPath, scorePath, constraintsPath, profilePath, outputPath] = positional;
    if (!outputPath) throw new TypeError("resolve requires analysis, score, constraints, profile, and output paths.");
    const timeline = generation.resolve(
      readJson(analysisPath),
      unwrapScore(readJson(scorePath)),
      readJson(constraintsPath),
      readJson(profilePath),
    );
    writeJson(timeline, outputPath);
    return;
  }

  if (command === "mutate") {
    const [scorePath, constraintsPath, outputPath] = positional;
    if (!outputPath) throw new TypeError("mutate requires score, constraints, and output paths.");
    const artifact = generation.mutateVisualScore(
      unwrapScore(readJson(scorePath)),
      readJson(constraintsPath),
      {
        seed: requireOption(flags, "seed"),
        amount: flags.amount === undefined ? 0.18 : Number(flags.amount),
        locks: flags.lock ? String(flags.lock).split(",").filter(Boolean) : [],
      },
    );
    writeJson(artifact, outputPath);
    return;
  }

  if (command === "breed") {
    const [leftPath, rightPath, constraintsPath, outputPath] = positional;
    if (!outputPath) throw new TypeError("breed requires two scores, constraints, and output paths.");
    const artifact = generation.breedVisualScores(
      unwrapScore(readJson(leftPath)),
      unwrapScore(readJson(rightPath)),
      readJson(constraintsPath),
      {
        seed: requireOption(flags, "seed"),
        mix: flags.mix === undefined ? 0.5 : Number(flags.mix),
      },
    );
    writeJson(artifact, outputPath);
    return;
  }

  if (command === "diff") {
    const [leftPath, rightPath, outputPath] = positional;
    if (!rightPath) throw new TypeError("diff requires two score paths.");
    writeJson(
      generation.diffVisualScores(
        unwrapScore(readJson(leftPath)),
        unwrapScore(readJson(rightPath)),
      ),
      outputPath,
    );
    return;
  }

  if (command === "replay") {
    const [timelinePath, analysisPath, scorePath, constraintsPath, profilePath, outputPath] = positional;
    if (!profilePath) throw new TypeError("replay requires timeline, analysis, score, constraints, and profile paths.");
    writeJson(
      generation.verifyReplay(
        readJson(timelinePath),
        readJson(analysisPath),
        unwrapScore(readJson(scorePath)),
        readJson(constraintsPath),
        readJson(profilePath),
      ),
      outputPath,
    );
    return;
  }

  if (command === "graph") {
    const [timelinePath, profilePath, outputPath] = positional;
    if (!profilePath) throw new TypeError("graph requires timeline and profile paths.");
    const graph = generation.buildTopologyFilterGraph(
      readJson(timelinePath),
      readJson(profilePath),
    );
    writeText(graph.filters.join(";\n"), outputPath);
    return;
  }

  throw new TypeError(`Unknown command: ${command}`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  fail(error?.stack || String(error));
}
