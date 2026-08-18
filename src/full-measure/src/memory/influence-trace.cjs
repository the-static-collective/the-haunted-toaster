const { hashCanonical } = require('../generation/canonical.cjs');

const TRACE_SCHEMA = 'haunted-toaster/influence-trace/v1';
const TRACE_POLICY = 'toaster-influence-trace-v1';
const MAX_NODES = 24;
const MAX_EDGES = 36;
const ALLOWED_RELATIONS = new Set([
  'recalled',
  'favored',
  'inhibited',
  'underexplored',
  'saturated',
  'inherited',
  'counterexampled',
  'witnessed',
]);

function relationForPressure(kind, phase = 'evidence') {
  if (kind === 'coverage-explore') return 'underexplored';
  if (kind === 'relationship-favor') return 'favored';
  if (kind === 'saturation-avoid') return phase === 'candidate' ? 'inhibited' : 'saturated';
  return 'recalled';
}

function nodeId(kind, value) {
  return `${kind}:${hashCanonical({ value }, 'HauntedToaster-InfluenceNode-v1').slice(0, 16)}`;
}

function buildInfluenceTrace({ capsule, familyHash = null, candidates = [] }) {
  if (!capsule?.capsuleSha256) {
    throw new TypeError('Influence Trace requires a MemoryCapsule.');
  }

  const pressures = (capsule.pressures || []).slice(0, 8);
  const candidateList = (candidates || []).slice(0, 6);
  const evidenceValues = [];
  for (const pressure of pressures) evidenceValues.push(...(pressure.evidenceRefs || []));
  if (capsule.explicitAncestorReceiptSha256) {
    evidenceValues.push(`render:${capsule.explicitAncestorReceiptSha256}`);
  }
  const evidenceRefs = [...new Set(evidenceValues)].sort();

  const nodes = [];
  const addNode = (node) => {
    if (nodes.length >= MAX_NODES || nodes.some((item) => item.id === node.id)) return false;
    nodes.push(node);
    return true;
  };

  const songRef = `song:${capsule.currentSongEvidenceHash}`;
  const songNodeId = nodeId('song', songRef);
  addNode({ id: songNodeId, type: 'current-song', label: capsule.currentSongEnergyClass || 'current song', ref: songRef });

  const pressureNodeIds = new Map();
  for (const pressure of pressures) {
    const id = nodeId('pressure', `${pressure.kind}|${pressure.target}|${pressure.avoids || ''}`);
    if (addNode({ id, type: 'memory-pressure', label: pressure.target, pressureKind: pressure.kind })) {
      pressureNodeIds.set(pressure, id);
    }
  }

  const candidateNodeIds = [];
  for (const candidate of candidateList) {
    const ref = String(candidate.scoreAddress || `candidate-${candidate.index}`);
    const id = nodeId('candidate', ref);
    if (addNode({ id, type: 'candidate', label: ref, candidateIndex: candidate.index ?? null })) {
      candidateNodeIds.push(id);
    }
  }

  const evidenceNodeIds = new Map();
  for (const ref of evidenceRefs) {
    const id = nodeId('evidence', ref);
    if (!addNode({ id, type: ref.startsWith('verdict:') ? 'verdict' : ref.startsWith('render:') ? 'prior-toast' : 'evidence', label: ref, ref })) {
      continue;
    }
    evidenceNodeIds.set(ref, id);
  }

  const edges = [];
  const addEdge = (edge) => {
    if (edges.length >= MAX_EDGES) return;
    if (!ALLOWED_RELATIONS.has(edge.relation)) throw new TypeError(`Unknown influence relation: ${edge.relation}.`);
    if (!edge.evidenceRefs?.length) throw new TypeError('Influence Trace edges require evidence refs.');
    edges.push(edge);
  };

  for (const pressure of pressures) {
    const pressureId = pressureNodeIds.get(pressure);
    if (!pressureId) continue;
    const relation = relationForPressure(pressure.kind, 'evidence');
    addEdge({
      from: songNodeId,
      to: pressureId,
      relation,
      evidenceRefs: [...new Set([songRef, ...(pressure.evidenceRefs || [])])].sort(),
    });
    for (const ref of pressure.evidenceRefs || []) {
      const evidenceId = evidenceNodeIds.get(ref);
      if (!evidenceId) continue;
      addEdge({ from: evidenceId, to: pressureId, relation, evidenceRefs: [ref] });
    }
    const targetCandidate = candidateNodeIds[candidateNodeIds.length - 1];
    if (targetCandidate) {
      addEdge({
        from: pressureId,
        to: targetCandidate,
        relation: relationForPressure(pressure.kind, 'candidate'),
        evidenceRefs: [...pressure.evidenceRefs],
      });
    }
  }

  if (capsule.explicitAncestorReceiptSha256) {
    const ancestorRef = `render:${capsule.explicitAncestorReceiptSha256}`;
    let ancestorId = evidenceNodeIds.get(ancestorRef);
    if (!ancestorId) {
      ancestorId = nodeId('evidence', ancestorRef);
      if (addNode({ id: ancestorId, type: 'prior-toast', label: ancestorRef, ref: ancestorRef })) {
        evidenceNodeIds.set(ancestorRef, ancestorId);
      }
    }
    if (nodes.some((node) => node.id === ancestorId)) {
      for (const candidateId of candidateNodeIds) {
        addEdge({ from: ancestorId, to: candidateId, relation: 'inherited', evidenceRefs: [ancestorRef] });
      }
    }
  }

  const core = {
    schema: TRACE_SCHEMA,
    policy: TRACE_POLICY,
    capsuleSha256: capsule.capsuleSha256,
    familyHash,
    nodes,
    edges,
  };
  return {
    ...core,
    traceSha256: hashCanonical(core, 'HauntedToaster-InfluenceTrace-v1'),
  };
}

module.exports = {
  ALLOWED_RELATIONS,
  MAX_EDGES,
  MAX_NODES,
  TRACE_POLICY,
  TRACE_SCHEMA,
  buildInfluenceTrace,
};
