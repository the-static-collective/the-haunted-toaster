const fs = require("node:fs/promises");
const path = require("node:path");
const { CATALOG_SCHEMA } = require("./schema.cjs");

function emptyCatalog() {
  return { schema: CATALOG_SCHEMA, specimens: [] };
}

function normalizePaths(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map((value) => String(value)))].sort();
}

function normalizeSpecimen(specimen = {}) {
  if (!specimen.specimenId) throw new TypeError("Video specimen identity is required.");
  return {
    ...specimen,
    specimenId: String(specimen.specimenId),
    paths: normalizePaths(specimen.paths),
  };
}

function canonicalizeCatalog(catalog = emptyCatalog()) {
  if (!catalog || catalog.schema !== CATALOG_SCHEMA) {
    throw new TypeError(`Unsupported VSPantry catalogue schema: ${String(catalog?.schema || "missing")}.`);
  }
  const byId = new Map();
  for (const raw of Array.isArray(catalog.specimens) ? catalog.specimens : []) {
    const specimen = normalizeSpecimen(raw);
    const existing = byId.get(specimen.specimenId);
    if (!existing) {
      byId.set(specimen.specimenId, specimen);
      continue;
    }
    byId.set(specimen.specimenId, {
      ...existing,
      ...specimen,
      admittedAt: existing.admittedAt || specimen.admittedAt || null,
      filename: existing.filename || specimen.filename || null,
      paths: normalizePaths([...(existing.paths || []), ...(specimen.paths || [])]),
    });
  }
  return {
    schema: CATALOG_SCHEMA,
    specimens: [...byId.values()].sort((left, right) => left.specimenId.localeCompare(right.specimenId)),
  };
}

function upsertSpecimen(catalog, specimen) {
  const normalizedCatalog = canonicalizeCatalog(catalog);
  const incoming = normalizeSpecimen(specimen);
  const index = normalizedCatalog.specimens.findIndex((item) => item.specimenId === incoming.specimenId);
  if (index === -1) {
    return {
      inserted: true,
      catalog: canonicalizeCatalog({
        schema: CATALOG_SCHEMA,
        specimens: [...normalizedCatalog.specimens, incoming],
      }),
    };
  }
  const existing = normalizedCatalog.specimens[index];
  const merged = {
    ...existing,
    ...incoming,
    admittedAt: existing.admittedAt || incoming.admittedAt || null,
    filename: existing.filename || incoming.filename || null,
    paths: normalizePaths([...(existing.paths || []), ...(incoming.paths || [])]),
  };
  const specimens = [...normalizedCatalog.specimens];
  specimens[index] = merged;
  return {
    inserted: false,
    catalog: canonicalizeCatalog({ schema: CATALOG_SCHEMA, specimens }),
  };
}

async function loadCatalog(catalogPath) {
  try {
    const text = await fs.readFile(catalogPath, "utf8");
    return canonicalizeCatalog(JSON.parse(text));
  } catch (error) {
    if (error?.code === "ENOENT") return emptyCatalog();
    throw error;
  }
}

async function replaceFile(tempPath, targetPath) {
  try {
    await fs.rename(tempPath, targetPath);
  } catch (error) {
    if (!new Set(["EEXIST", "EPERM"]).has(error?.code)) throw error;
    await fs.rm(targetPath, { force: true });
    await fs.rename(tempPath, targetPath);
  }
}

async function saveCatalog(catalogPath, catalog) {
  const canonical = canonicalizeCatalog(catalog);
  await fs.mkdir(path.dirname(catalogPath), { recursive: true });
  const tempPath = `${catalogPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tempPath, `${JSON.stringify(canonical, null, 2)}\n`, "utf8");
    await replaceFile(tempPath, catalogPath);
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {});
  }
  return canonical;
}

module.exports = {
  canonicalizeCatalog,
  emptyCatalog,
  loadCatalog,
  saveCatalog,
  upsertSpecimen,
};
