"use strict";

const crypto = require("node:crypto");

const REPORT_SCHEMA = "static-collective/franken-tester-report/v0";
const REPORT_POLICY = "franken-tester-001";

const SYSTEMS = new Set(["toaster", "blender", "playdeck"]);

const ORGAN_RULES = Object.freeze([
  {id:"franken-composer", systems:["toaster"], branch:/franken[-/]composer/i, files:[/\/franken-composer\//i]},
  {id:"video-digestion", systems:["toaster"], branch:/video[-/]digestion|video[-/]phrase/i, files:[/video-digestion|video-phrase/i]},
  {id:"listener", systems:["toaster"], branch:/listener/i, files:[/listener/i]},
  {id:"listening-eye", systems:["toaster"], branch:/listening[-/]eye/i, files:[/listening[-_]eye/i]},
  {id:"sigil", systems:["toaster"], branch:/sigil/i, files:[/sigil/i]},
  {id:"topology", systems:["toaster"], branch:/topology/i, files:[/topology/i]},
  {id:"batch", systems:["toaster"], branch:/batch|six[-/]up/i, files:[/batch|six-up/i]},
  {id:"memory", systems:["toaster"], branch:/memory|rearview/i, files:[/memory|rearview/i]},
  {id:"pantry", systems:["toaster"], branch:/pantry|vspantry|toastpack/i, files:[/pantry|vspantry|toastpack/i]},
  {id:"visual-score", systems:["toaster"], branch:/visual[-/]score/i, files:[/visual-score/i]},
  {id:"foreign-material", systems:["toaster"], branch:/foreign[-/]material/i, files:[/foreign-material/i]},
  {id:"hyperfood", systems:["toaster"], branch:/hyperfood|hyperkitchen/i, files:[/hyperfood|hyperkitchen/i]},
  {id:"receipt", systems:["toaster"], branch:/receipt/i, files:[/receipt/i]},
  {id:"dogram", systems:["toaster"], branch:/dogram/i, files:[/dogram/i]},

  {id:"accepted-take", systems:["blender"], branch:/accepted[-/]take|take[-/]cut/i, files:[/take_cut\.py$/i]},
  {id:"cutout-stage", systems:["blender"], branch:/cutout/i, files:[/cutout_stage\.py$/i]},
  {id:"flow-pantry", systems:["blender"], branch:/pantry/i, files:[/flow_pantry\.py$/i]},
  {id:"playdeck-bridge", systems:["blender"], branch:/playdeck/i, files:[/playdeck_bridge\.py$/i]},
  {id:"toaster-bridge", systems:["blender"], branch:/toaster/i, files:[/toaster_bridge\.py$/i]},
  {id:"observer-local", systems:["blender"], branch:/observer/i, files:[/observer_local\.py$/i]},
  {id:"time-slice", systems:["blender"], branch:/time[-/]slice/i, files:[/time_slice\.py$/i]},
  {id:"memory-field", systems:["blender"], branch:/memory/i, files:[/memory_(feedback|strength|competition)\.py$/i]},
  {id:"scene-weave", systems:["blender"], branch:/scene[-/]weave/i, files:[/scene_weave\.py$/i]},
  {id:"counterfactual-director", systems:["blender"], branch:/counterfactual/i, files:[/counterfactual\.py$/i]},

  {id:"franken-runtime", systems:["playdeck"], branch:/franken[-/]smash/i, files:[/franken-runtime\.mjs$/i,/frankenStudio\.ts$/i]},
  {id:"studio", systems:["playdeck"], branch:/studio/i, files:[/packages\/studio\//i]},
  {id:"render-remotion", systems:["playdeck"], branch:/remotion/i, files:[/packages\/render-remotion\//i]},
  {id:"receipts", systems:["playdeck"], branch:/receipt/i, files:[/packages\/receipts\//i]},
  {id:"awakening", systems:["playdeck"], branch:/awaken/i, files:[/packages\/awakening\//i]},
]);

const CROSSING_RULES = Object.freeze([
  {
    id:"playdeck-proposal-to-toaster-composer",
    requires:[["toaster","franken-composer"],["playdeck","franken-runtime"]],
    authority:"proposal-only",
    law:"PLAYDECK PROPOSAL != TOASTER ACCEPTANCE",
  },
  {
    id:"blender-take-to-toaster-composer",
    requires:[["toaster","franken-composer"],["blender","accepted-take"]],
    authority:"material-only",
    law:"BLENDER TAKE != COMPOSITION AUTHORITY",
  },
  {
    id:"blender-flow-to-toaster-pantry",
    requires:[["blender","flow-pantry"],["blender","toaster-bridge"],["toaster","pantry"]],
    authority:"proposal-only",
    law:"PANTRY PROPOSAL != VSPANTRY ADMISSION",
  },
  {
    id:"blender-flow-to-playdeck",
    requires:[["blender","flow-pantry"],["blender","playdeck-bridge"],["playdeck","studio"]],
    authority:"proposal-only",
    law:"DECK PROPOSAL != PLAYDECK RENDER",
  },
  {
    id:"playdeck-remotion-projection",
    requires:[["playdeck","franken-runtime"],["playdeck","render-remotion"]],
    authority:"renderer-only",
    law:"RENDERER != PLAN AUTHORITY",
  },
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function parseLsRemote(text) {
  if (typeof text !== "string") throw new TypeError("ls-remote output must be text.");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = /^([0-9a-f]{40,64})\s+refs\/heads\/(.+)$/.exec(line.trim());
      if (!match) return null;
      return {sha: match[1], branch: match[2]};
    })
    .filter(Boolean)
    .sort((a, b) => a.branch.localeCompare(b.branch));
}

function classifySpecimen({system, branch, sha, files = []}) {
  if (!SYSTEMS.has(system)) throw new TypeError(`Unknown Franken system: ${system}`);
  if (typeof branch !== "string" || !branch) throw new TypeError("Branch is required.");
  if (typeof sha !== "string" || !sha) throw new TypeError("Branch SHA is required.");
  if (!Array.isArray(files)) throw new TypeError("files must be an array.");

  const organs = [];
  const hints = [];
  const evidenceFiles = new Set();

  for (const rule of ORGAN_RULES) {
    if (!rule.systems.includes(system)) continue;
    const branchHit = rule.branch?.test(branch) ?? false;
    const fileHits = files.filter((file) => rule.files.some((pattern) => pattern.test(file)));
    if (branchHit) hints.push(rule.id);
    if (fileHits.length) {
      organs.push(rule.id);
      fileHits.forEach((file) => evidenceFiles.add(file));
    }
  }

  return stable({
    system,
    branch,
    sha,
    evidenceLevel: files.length ? "tree-probed" : "name-only",
    organs:[...new Set(organs)].sort(),
    hints:[...new Set(hints)].sort(),
    evidenceFiles:[...evidenceFiles].sort(),
  });
}

function makeOrganIndex(specimens) {
  const index = {};
  for (const specimen of specimens) {
    for (const organ of specimen.organs) {
      const key = `${specimen.system}:${organ}`;
      if (!index[key]) index[key] = [];
      index[key].push({branch:specimen.branch, sha:specimen.sha});
    }
  }
  for (const key of Object.keys(index)) {
    index[key].sort((a,b) => a.branch.localeCompare(b.branch) || a.sha.localeCompare(b.sha));
  }
  return stable(index);
}

function deriveCrossings(organIndex) {
  return CROSSING_RULES.map((rule) => {
    const evidence = rule.requires.map(([system, organ]) => ({
      system,
      organ,
      branches: organIndex[`${system}:${organ}`] ?? [],
    }));
    const ready = evidence.every((item) => item.branches.length > 0);
    return stable({
      id:rule.id,
      status:ready ? "witnessed-compatible-surface" : "missing-required-organ",
      authority:rule.authority,
      law:rule.law,
      evidence,
    });
  });
}

function buildFrankenTesterReport({specimens, generatedBy = "franken-tester-001"} = {}) {
  if (!Array.isArray(specimens)) throw new TypeError("specimens must be an array.");
  const normalized = specimens
    .map((item) => stable(item))
    .sort((a,b) =>
      a.system.localeCompare(b.system) ||
      a.branch.localeCompare(b.branch) ||
      a.sha.localeCompare(b.sha),
    );

  const organIndex = makeOrganIndex(normalized);
  const systems = {};
  for (const system of [...SYSTEMS].sort()) {
    const rows = normalized.filter((item) => item.system === system);
    systems[system] = {
      branchCount: rows.length,
      treeProbedCount: rows.filter((item) => item.evidenceLevel === "tree-probed").length,
      organBearingCount: rows.filter((item) => item.organs.length > 0).length,
    };
  }

  const body = stable({
    schema:REPORT_SCHEMA,
    policy:REPORT_POLICY,
    authority:"diagnostic-only",
    generatedBy,
    laws:[
      "BRANCH != ORGAN",
      "NAME HINT != CODE PROOF",
      "TREE PROBE != RUNTIME QA",
      "SOURCE != PLAN",
      "PROPOSAL != ACCEPTANCE",
      "MATERIAL != AUTHORITY",
      "RENDERER != PLAN AUTHORITY",
    ],
    systems,
    specimens:normalized,
    organIndex,
    crossings:deriveCrossings(organIndex),
  });
  return Object.freeze({...body, reportHash:digest(body)});
}

module.exports = {
  REPORT_SCHEMA,
  REPORT_POLICY,
  ORGAN_RULES,
  CROSSING_RULES,
  parseLsRemote,
  classifySpecimen,
  buildFrankenTesterReport,
};
