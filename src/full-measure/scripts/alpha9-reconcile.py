from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
repo = root.parents[1]


def replace(path, old, new, count=1):
    path = Path(path)
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing reconciliation anchor in {path}: {old[:140]!r}")
    path.write_text(text.replace(old, new, count))


# visual-language-v3 inherits all visual-language-v2 response shaping.
atmosphere = root / "src/render/atmosphere.cjs"
replace(
    atmosphere,
    'const { EXPRESSIVE_RENDERER_POLICY } = require("../generation/renderer-policy.cjs");',
    'const { isExpressiveRendererPolicy } = require("../generation/renderer-policy.cjs");',
)
replace(
    atmosphere,
    'return timeline?.rendererPolicy === EXPRESSIVE_RENDERER_POLICY\n    ? ATMOSPHERE_COMPILER_V2',
    'return isExpressiveRendererPolicy(timeline?.rendererPolicy)\n    ? ATMOSPHERE_COMPILER_V2',
)

topology = root / "src/render/topology-compilers.cjs"
replace(
    topology,
    'const { EXPRESSIVE_RENDERER_POLICY, MUTATION_LATTICE_RENDERER_POLICY } = require("../generation/renderer-policy.cjs");',
    'const { EXPRESSIVE_RENDERER_POLICY, MUTATION_LATTICE_RENDERER_POLICY, isExpressiveRendererPolicy } = require("../generation/renderer-policy.cjs");',
)
replace(
    topology,
    'const expressive = execution.timeline.rendererPolicy === EXPRESSIVE_RENDERER_POLICY;',
    'const expressive = isExpressiveRendererPolicy(execution.timeline.rendererPolicy);',
)

# Advance the application identity without touching historical release assets.
package_path = root / "package.json"
package_data = json.loads(package_path.read_text())
package_data["version"] = "0.5.0-alpha.9"
package_path.write_text(json.dumps(package_data, indent=2) + "\n")
lock_path = root / "package-lock.json"
lock_data = json.loads(lock_path.read_text())
lock_data["version"] = "0.5.0-alpha.9"
lock_data["packages"][""]["version"] = "0.5.0-alpha.9"
lock_path.write_text(json.dumps(lock_data, indent=2) + "\n")

# Current release contract: preserve alpha.8 non-lattice surfaces, advance Toast Feel and active capabilities.
alpha8 = root / "tests/alpha8-release-contract.test.cjs"
replace(alpha8, 'test("alpha.8 source exposes the bounded release surfaces", () => {', 'test("alpha.9 preserves the alpha.8 release surfaces while advancing generation", () => {')
replace(alpha8, 'assert.equal(TOAST_FEEL_CONTRACT, "toast-feel-v1");', 'assert.equal(TOAST_FEEL_CONTRACT, "toast-feel-v2");')
replace(alpha8, '    "toastFeelV1",', '    "toastFeelV2",\n    "mutationLatticeV1",\n    "shapePackV1",\n    "topologyArcV1",')

open_field = root / "tests/open-field-contract.test.cjs"
replace(open_field, 'open-field\\.v1\\.json', 'open-field\\.v3\\.json')
replace(open_field, 'test("alpha.8 keeps Open Field internal while Toast Feel owns normal UI", () => {', 'test("alpha.9 keeps Open Field internal while Toast Feel owns normal UI", () => {')

renderer_ui = root / "tests/renderer-ui-integration.test.cjs"
replace(renderer_ui, 'contractVersion: "toast-feel-v1"', 'contractVersion: "toast-feel-v2"')

toast_gen = root / "tests/toast-feel-generation.test.cjs"
replace(toast_gen, 'assert.equal(first.toastFeel.contractVersion, "toast-feel-v1");', 'assert.equal(first.toastFeel.contractVersion, "toast-feel-v2");\n  assert.match(first.toastFeel.affinityHash, /^[0-9a-f]{64}$/);')

toast_session = root / "tests/toast-feel-session.test.cjs"
replace(toast_session, 'assert.equal(matching.toastFeel.contractVersion, "toast-feel-v1");', 'assert.equal(matching.toastFeel.contractVersion, "toast-feel-v2");')

toast_feels = root / "tests/toast-feels.test.cjs"
replace(toast_feels, 'assert.equal(TOAST_FEEL_CONTRACT, "toast-feel-v1");', 'assert.equal(TOAST_FEEL_CONTRACT, "toast-feel-v2");')
replace(toast_feels, '    } else {\n      assert.equal(feel.pressure, null);\n    }', '      assert.ok(feel.affinity);\n    } else {\n      assert.equal(feel.pressure, null);\n      assert.equal(feel.affinity, null);\n    }')

ui_witness = root / "tests/ui-witness-build.test.cjs"
replace(ui_witness, '/"version":"0\\.5\\.0-alpha\\.8"/', '/"version":"0\\.5\\.0-alpha\\.9"/')
replace(ui_witness, '    "toastFeelV1",', '    "toastFeelV2",\n    "mutationLatticeV1",\n    "shapePackV1",\n    "topologyArcV1",')

# The active session is raster-4/v3; raster-3 remains an explicit replay fixture.
compat = root / "tests/visual-language-v2-compat.test.cjs"
text = compat.read_text()
text = text.replace(
    'const visualLanguageProfile = readJson("profiles/toaster-raster-2.json");',
    'const visualLanguageProfile = readJson("profiles/toaster-raster-2.json");\nconst expressiveProfile = readJson("profiles/toaster-raster-3.json");\nconst expressiveConstraints = readJson("constraints/wire-orchard.v2.json");',
)
text = text.replace(
    'test("candidate session advances to raster-3 while raster-1 and raster-2 remain replayable", () => {\n  assert.equal(rendererProfile.id, "toaster-raster-3");\n  assert.equal(CONSTRAINTS_BY_PRESET.porchlight.id, "porchlight-v2");\n  assert.equal(CONSTRAINTS_BY_PRESET.wireOrchard.id, "wire-orchard-v2");\n  assert.equal(CONSTRAINTS_BY_PRESET.absoluteResidual.id, "absolute-residual-v2");',
    'test("candidate session advances to raster-4 while raster-1 through raster-3 remain replayable", () => {\n  assert.equal(rendererProfile.id, "toaster-raster-4");\n  assert.equal(CONSTRAINTS_BY_PRESET.porchlight.id, "porchlight-v3");\n  assert.equal(CONSTRAINTS_BY_PRESET.wireOrchard.id, "wire-orchard-v3");\n  assert.equal(CONSTRAINTS_BY_PRESET.absoluteResidual.id, "absolute-residual-v3");',
)
text = text.replace(
    'test("spiral and quad-mirror compile through expressive registries without replacing raster-2 semantics", () => {\n  const constraints = CONSTRAINTS_BY_PRESET.wireOrchard;',
    'test("raster-3 spiral and quad-mirror remain exact visual-language-v2 ancestors", () => {\n  const constraints = expressiveConstraints;',
)
text = text.replace(
    'const timeline = generation.resolve(analysis, scoreArtifact.score, constraints, rendererProfile);',
    'const timeline = generation.resolve(analysis, scoreArtifact.score, constraints, expressiveProfile);',
)
text = text.replace(
    '  assert.equal(derived.topologyCompilers["quad-mirror"], "quad-mirror-v2");',
    '  assert.equal(derived.topologyCompilers["quad-mirror"], "quad-mirror-v2");\n  assert.equal(derived.topologyCompilers["elastic-spine"], "elastic-spine-v3");\n  assert.equal(derived.topologyCompilers["echo-tunnel"], "echo-tunnel-v3");',
)
text = text.replace(
    '  assert.ok(derived.capabilities.includes("internalResponseV1"));',
    '  assert.ok(derived.capabilities.includes("internalResponseV1"));\n  assert.ok(derived.capabilities.includes("toastFeelV2"));\n  assert.ok(derived.capabilities.includes("mutationLatticeV1"));\n  assert.ok(derived.capabilities.includes("shapePackV1"));\n  assert.ok(derived.capabilities.includes("topologyArcV1"));',
)
compat.write_text(text)

print("alpha.9 active-lineage reconciliation applied")
