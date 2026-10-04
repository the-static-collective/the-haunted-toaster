#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const {
  parseLsRemote,
  classifySpecimen,
  buildFrankenTesterReport,
} = require("../src/franken-tester/census.cjs");

function fail(message) {
  process.stderr.write(`franken-tester: ${message}\n`);
  process.exitCode = 1;
}

function git(repoPath, args) {
  return execFileSync("git", ["-C", repoPath, ...args], {
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    maxBuffer:64 * 1024 * 1024,
  });
}

function parseArgs(argv) {
  const config = {repos:[], probe:false, maxBranches:null, output:null};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--probe") config.probe = true;
    else if (arg === "--repo") {
      const raw = argv[++i];
      if (!raw || !raw.includes("=")) throw new Error("--repo expects system=/path.");
      const split = raw.indexOf("=");
      config.repos.push({system:raw.slice(0, split), repoPath:path.resolve(raw.slice(split + 1))});
    } else if (arg === "--max-branches") {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1) throw new Error("--max-branches expects a positive integer.");
      config.maxBranches = value;
    } else if (arg === "--output") {
      config.output = path.resolve(argv[++i]);
    } else if (arg === "--help" || arg === "-h") {
      config.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return config;
}

function defaultRepos() {
  const cwd = process.cwd();
  const parent = path.dirname(cwd);
  const candidates = [
    {system:"toaster", repoPath:cwd},
    {system:"blender", repoPath:path.join(parent, "the-haunted-blender")},
    {system:"playdeck", repoPath:path.join(parent, "playdeck")},
  ];
  return candidates.filter((item) => fs.existsSync(path.join(item.repoPath, ".git")));
}

function listBranches(repoPath) {
  const remote = git(repoPath, ["ls-remote","--heads","origin"]);
  return parseLsRemote(remote);
}

function probeFiles(repoPath, branch) {
  git(repoPath, [
    "fetch",
    "--quiet",
    "--no-tags",
    "--depth=1",
    "origin",
    `refs/heads/${branch}`,
  ]);
  return git(repoPath, ["ls-tree","-r","--name-only","FETCH_HEAD"])
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
}

function scanRepo({system, repoPath}, {probe, maxBranches}) {
  const all = listBranches(repoPath);
  const selected = maxBranches ? all.slice(0, maxBranches) : all;
  return selected.map(({branch, sha}, index) => {
    let files = [];
    if (probe) {
      process.stderr.write(
        `[${system}] ${index + 1}/${selected.length} probe ${branch}\n`,
      );
      files = probeFiles(repoPath, branch);
    }
    return classifySpecimen({system, branch, sha, files});
  });
}

function main() {
  let config;
  try {
    config = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(error.message);
    return;
  }

  if (config.help) {
    process.stdout.write(
      [
        "Haunted Toaster FrankenTester 001",
        "",
        "Usage:",
        "  node scripts/franken-tester.cjs [--probe] [--repo system=/path]...",
        "                                  [--max-branches N] [--output report.json]",
        "",
        "Without --probe, performs a remote branch census and records name hints only.",
        "With --probe, shallow-fetches each selected branch into FETCH_HEAD and inspects its tree.",
        "No branch is checked out and no donor code is executed.",
        "",
      ].join("\n"),
    );
    return;
  }

  const repos = config.repos.length ? config.repos : defaultRepos();
  if (!repos.length) {
    fail("No Git repositories found. Pass --repo toaster=/path (and optional blender/playdeck paths).");
    return;
  }

  try {
    const specimens = repos.flatMap((repoSpec) => scanRepo(repoSpec, config));
    const report = buildFrankenTesterReport({specimens});
    const output = JSON.stringify(report, null, 2) + "\n";
    if (config.output) {
      fs.mkdirSync(path.dirname(config.output), {recursive:true});
      fs.writeFileSync(config.output, output, {flag:"wx"});
      process.stdout.write(`${config.output}\n`);
    } else {
      process.stdout.write(output);
    }
  } catch (error) {
    fail(error.stack || error.message);
  }
}

main();
