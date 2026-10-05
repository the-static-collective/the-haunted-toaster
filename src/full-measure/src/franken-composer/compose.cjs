"use strict";

const crypto = require("node:crypto");
const { canonicalize, hashCanonical } = require("../generation/canonical.cjs");
const { frankenVideoDigestionReservoir } = require("../nextgen/live-crossings.cjs");
const {
  FRANKEN_SCHEMA,
  FRANKEN_POLICY,
  FRANKEN_FULL_SONG_SCHEMA,
  FRANKEN_FULL_SONG_POLICY,
  FPS,
  DURATION_FRAMES,
} = require("./schema.cjs");
const { normalizeEdits } = require("./proposal.cjs");

const SCENE_SPANS = {
  ARRIVE: [0, 384],
  CROSS: [384, 384],
  ASSEMBLE: [768, 384],
};

function digestText(text) {
  return crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
}

function unit(seed, key) {
  const h = crypto.createHash("sha256").update(`${seed}|${key}`).digest();
  return h.readUInt32BE(0) / 0xffffffff;
}

function cleanCardMaterial(card) {
  return {
    materialId: card.materialId,
    kind: "image",
    sourceIdentity: `playdeck:${card.source}`,
    digest: card.digest,
    rightsBasis: "repository-owned-or-explicitly-admitted",
    admissionBasis: "playdeck-proposal",
  };
}

function cleanVideoMaterial(blender) {
  const m = blender.material;
  return {
    materialId: m.materialId,
    kind: "video",
    sourceIdentity: m.sourceIdentity,
    digest: m.digest,
    rightsBasis: m.rightsBasis,
    admissionBasis: m.admissionBasis,
  };
}

function stateFromDonors({ playdeck, blenderTake, seed, nextGenContext = null }) {
  if (playdeck?.authority !== "proposal-only" || blenderTake?.authority !== "material-only") {
    throw new TypeError("Franken composer requires bounded Playdeck and Blender donor adapters.");
  }
  if (typeof seed !== "string" || !seed.trim()) {
    throw new TypeError("Franken seed is required.");
  }
  const cardIds = playdeck.cards.map((c) => c.cardId);
  const base = {
    seed: seed.trim(),
    cardOrder: cardIds,
    sceneRoles: Object.fromEntries(
      cardIds.map((id, i) => [id, ["ARRIVE", "CROSS", "ASSEMBLE"][Math.floor(i / 2)]]),
    ),
    worldRule: playdeck.worldRule.id,
    movingTakeSceneId: "CROSS",
    transitions: {
      arriveCross: "panel-wipe",
      crossAssemble: "radial-reveal",
    },
    text: "THE ROOM REMEMBERS",
    variation: 0,
    digestPlacements: [],
  };
  if (!nextGenContext) return canonicalize(base);
  if (nextGenContext.frankenPressure?.authority !== "influence-only") {
    throw new TypeError("NextGen Franken pressure must remain influence-only.");
  }
  return normalizeEdits(base, nextGenContext.frankenPressure.edits || {});
}

function buildProposal(playdeck, blenderTake, state, nextGenContext = null, fullSongForm = null) {
  const activeSceneSpans=fullSongForm
    ?Object.fromEntries(fullSongForm.sceneSpans.map(span=>[span.sceneId,[span.startFrame,span.durationFrames]]))
    :SCENE_SPANS;
  const compositionDuration=fullSongForm?.totalFrames||DURATION_FRAMES;
  const cardsById = new Map(playdeck.cards.map((c) => [c.cardId, c]));
  if (state.cardOrder.some((id) => !cardsById.has(id))) {
    throw new TypeError("cardOrder references an unknown Playdeck card.");
  }

  const textDigest = digestText(state.text);
  const topologyIdentity = canonicalize({
    kind: "manga-impact-topology",
    seed: state.seed,
    variation: state.variation,
    worldRule: state.worldRule,
  });
  const topologyDigest = hashCanonical(
    topologyIdentity,
    "HauntedToaster-FrankenTopology-v0",
  );
  const worldScale = 0.88 + unit(state.worldRule, "topology-scale") * 0.24;
  const worldRotation = Math.round(
    (unit(state.worldRule, "topology-rotation") - 0.5) * 36,
  );
  const worldOpacity = 0.42 + unit(state.worldRule, "topology-opacity") * 0.2;
  const reservoir = nextGenContext
    ? frankenVideoDigestionReservoir(nextGenContext)
    : { materials: [], bindings: {} };

  const reservoirById = new Map(reservoir.materials.map((material) => [material.materialId, material]));
  const digestPlacements = Array.isArray(state.digestPlacements) ? state.digestPlacements : [];
  for (const placement of digestPlacements) {
    const material = reservoirById.get(placement.materialId);
    if (!material) throw new TypeError(`Unknown or stale digestion material placement: ${placement.materialId}.`);
    const maxFrames = Number(material.derivation?.sourceDurationFrames);
    if (!Number.isSafeInteger(maxFrames) || maxFrames < 1 || placement.sourceStartFrames + placement.durationFrames > maxFrames) {
      throw new RangeError(`Digestion placement ${placement.placementId} exceeds its admitted source duration.`);
    }
    const span=activeSceneSpans[placement.sceneId];
    if(!span)throw new TypeError(`Digestion placement ${placement.placementId} references an unknown macro scene.`);
    if (placement.startOffsetFrames + placement.durationFrames > span[1]) {
      throw new RangeError(`Digestion placement ${placement.materialId} exceeds its scene span.`);
    }
  }

  const materials = [
    ...state.cardOrder.map((id) => cleanCardMaterial(cardsById.get(id))),
    cleanVideoMaterial(blenderTake),
    {
      materialId: "franken:text",
      kind: "text",
      sourceIdentity: `text:${textDigest}:${state.text}`,
      digest: textDigest,
      rightsBasis: "human-authored-inline",
      admissionBasis: "explicit-editor-text",
    },
    {
      materialId: "franken:topology",
      kind: "generated-shape",
      sourceIdentity: `generated:${topologyDigest}`,
      digest: topologyDigest,
      rightsBasis: "deterministic-local-generation",
      admissionBasis: "franken-topology-v0",
    },
    ...reservoir.materials,
  ];

  const scenes = Object.entries(activeSceneSpans).map(
    ([sceneId, [startFrame, durationFrames]]) => {
      const assigned = state.cardOrder.filter(
        (id) => state.sceneRoles[id] === sceneId,
      );
      const tracks = assigned.map((id, i) => {
        const card = cardsById.get(id);
        const u = unit(
          `${state.seed}:${state.variation}`,
          `${sceneId}:${id}`,
        );
        const v = unit(
          `${state.seed}:${state.variation}`,
          `${sceneId}:${id}:y`,
        );
        return {
          trackId: `${sceneId.toLowerCase()}-${id}`,
          layer: `card-${i}`,
          role: "card",
          clips: [
            {
              clipId: `clip-${sceneId.toLowerCase()}-${id}`,
              materialId: card.materialId,
              startFrame,
              durationFrames,
              sourceWindow: null,
              transform: {
                x: 0.3 + u * 0.4,
                y: 0.35 + v * 0.3,
                scale: 0.82 + u * 0.22,
                rotationDegrees: Math.round((u - 0.5) * 12),
              },
              crop: card.crop ?? null,
              opacity: 1,
              blend: "normal",
              stackOrder: 20 + i,
              entrance: sceneId === "ARRIVE" ? "arrive" : "hinge",
              transitionRelation: null,
            },
          ],
        };
      });

      if (sceneId === state.movingTakeSceneId) {
        const m = blenderTake.material;
        const movingOffset=Math.min(96,Math.max(0,durationFrames-1));
        const movingDuration=Math.max(1,Math.min(72,durationFrames-movingOffset));
        tracks.push({
          trackId: `${sceneId.toLowerCase()}-moving-take`,
          layer: "moving-take",
          role: "moving-take",
          clips: [
            {
              clipId: `clip-${sceneId.toLowerCase()}-moving-take`,
              materialId: m.materialId,
              startFrame: startFrame + movingOffset,
              durationFrames: movingDuration,
              sourceWindow: { startSeconds: 0, endSeconds: movingDuration / FPS },
              transform: {
                x: 0.5,
                y: 0.5,
                scale: 0.72,
                rotationDegrees: 0,
              },
              crop: null,
              opacity: 1,
              blend: "normal",
              stackOrder: 60,
              entrance: "portal",
              transitionRelation: null,
            },
          ],
        });
      }

      const placedHere = digestPlacements.filter((placement) => placement.sceneId === sceneId);
      if (placedHere.length) {
        tracks.push({
          trackId: `${sceneId.toLowerCase()}-video-digestion`,
          layer: "background",
          role: "video-digestion-placement",
          clips: placedHere.map((placement) => ({
            clipId: `clip-${sceneId.toLowerCase()}-digest-${placement.placementId.replace(/[^A-Za-z0-9_-]/g,"-")}`,
            materialId: placement.materialId,
            startFrame: startFrame + placement.startOffsetFrames,
            durationFrames: placement.durationFrames,
            sourceWindow: {
              startSeconds: placement.sourceStartFrames / FPS,
              endSeconds: (placement.sourceStartFrames + placement.durationFrames) / FPS,
            },
            transform: placement.transform,
            transformKeyframes: placement.transformKeyframes || [],
            crop: placement.crop,
            opacity: placement.opacity,
            blend: placement.blend,
            stackOrder: placement.stackOrder,
            entrance: "arrive",
            transitionRelation: null,
          })),
        });
      }

      const typeOffset=Math.min(48,Math.max(0,durationFrames-1));
      const typeDuration=Math.max(1,Math.min(192,durationFrames-typeOffset));
      tracks.push({
        trackId: `${sceneId.toLowerCase()}-type`,
        layer: "type",
        role: "typography",
        clips: [
          {
            clipId: `clip-${sceneId.toLowerCase()}-type`,
            materialId: "franken:text",
            startFrame: startFrame + typeOffset,
            durationFrames: typeDuration,
            sourceWindow: null,
            transform: {
              x: 0.5,
              y: 0.82,
              scale: 1,
              rotationDegrees: sceneId === "CROSS" ? -3 : 0,
            },
            crop: null,
            opacity: 0.92,
            blend: "normal",
            stackOrder: 90,
            entrance: "speak",
            transitionRelation: null,
          },
        ],
      });

      if (sceneId !== "ARRIVE") {
        tracks.push({
          trackId: `${sceneId.toLowerCase()}-topology`,
          layer: "background",
          role: "topology-material",
          clips: [
            {
              clipId: `clip-${sceneId.toLowerCase()}-topology`,
              materialId: "franken:topology",
              startFrame,
              durationFrames,
              sourceWindow: null,
              transform: {
                x: 0.5,
                y: 0.5,
                scale: worldScale,
                rotationDegrees:
                  worldRotation + (state.variation % 4) * 90,
              },
              crop: null,
              opacity: worldOpacity,
              blend: "screen",
              stackOrder: 5,
              entrance: "grow",
              transitionRelation: null,
            },
          ],
        });
      }

      return {
        sceneId,
        startFrame,
        durationFrames,
        worldRule: state.worldRule,
        tracks,
      };
    },
  );

  const donorGuards = {
    playdeckSnapshot: playdeck.ancestry.snapshotHash,
    blenderVideo: blenderTake.material.digest,
    blenderReceipt: blenderTake.ancestry.admissionReceiptSha256,
    ...(nextGenContext
      ? {
          nextGenCrossingIdentity: nextGenContext.crossingIdentity,
          listeningEyeSha256:
            nextGenContext.listeningEye.listeningEyeSha256,
          videoDigestionFamilyHash:
            nextGenContext.videoDigestion?.familyHash || null,
        }
      : {}),
  };

  const ancestry = {
    toasterCarrier: "experimental/hyperkitchen-001-hyperframes-projection",
    toasterCandidateOrPlan: "franken-proposal-only",
    playdeckSnapshot: donorGuards.playdeckSnapshot,
    blenderTakeAcceptance: donorGuards.blenderReceipt,
    ...(nextGenContext
      ? {
          nextGenCrossing: {
            schema: nextGenContext.schema,
            policy: nextGenContext.policy,
            authority: nextGenContext.authority,
            crossingIdentity: nextGenContext.crossingIdentity,
            listeningEyeSha256:
              nextGenContext.listeningEye.listeningEyeSha256,
            pressureHash: nextGenContext.frankenPressure.pressureHash,
            videoDigestionFamilyHash:
              nextGenContext.videoDigestion?.familyHash || null,
            materialReservoirCount: reservoir.materials.length,
          },
        }
      : {}),
  };

  return canonicalize({
    proposalSchema: "static-collective/franken-proposal/v0",
    authority: "proposal-only",
    seed: state.seed,
    cardOrder: state.cardOrder,
    sceneRoles: state.sceneRoles,
    worldRule: state.worldRule,
    movingTakeSceneId: state.movingTakeSceneId,
    transitionChoices: state.transitions,
    text: state.text,
    variation: state.variation,
    durationFrames:compositionDuration,
    sceneSpans:Object.entries(activeSceneSpans).map(([sceneId,[startFrame,durationFrames]])=>({sceneId,startFrame,durationFrames})),
    ...(fullSongForm?{fullSongForm}:{}),
    digestPlacements,
    donorGuards,
    ancestry,
    materials,
    scenes,
    transitions: [
      {
        transitionId: "arrive-cross",
        fromSceneId: "ARRIVE",
        toSceneId: "CROSS",
        kind: state.transitions.arriveCross,
        durationFrames: state.transitions.arriveCross === "cut" ? 1 : 18,
        parameters: {},
      },
      {
        transitionId: "cross-assemble",
        fromSceneId: "CROSS",
        toSceneId: "ASSEMBLE",
        kind: state.transitions.crossAssemble,
        durationFrames: state.transitions.crossAssemble === "cut" ? 1 : 24,
        parameters: {},
      },
    ],
    _donor: { playdeck, blenderTake, nextGenContext, fullSongForm },
  });
}

function composeFrankenProposal({
  playdeck,
  blenderTake,
  seed,
  nextGenContext = null,
  fullSongForm = null,
} = {}) {
  return buildProposal(
    playdeck,
    blenderTake,
    stateFromDonors({ playdeck, blenderTake, seed, nextGenContext }),
    nextGenContext,
    fullSongForm,
  );
}

function applyFrankenEdits(proposal, edits = {}) {
  if (proposal?.proposalSchema !== "static-collective/franken-proposal/v0") {
    throw new TypeError("Expected a Franken proposal.");
  }
  const state = normalizeEdits(
    {
      seed: proposal.seed,
      cardOrder: proposal.cardOrder,
      sceneRoles: proposal.sceneRoles,
      worldRule: proposal.worldRule,
      movingTakeSceneId: proposal.movingTakeSceneId,
      transitions: proposal.transitionChoices,
      text: proposal.text,
      variation: proposal.variation,
      digestPlacements: proposal.digestPlacements || [],
    },
    edits,
  );
  return buildProposal(
    proposal._donor.playdeck,
    proposal._donor.blenderTake,
    state,
    proposal._donor.nextGenContext || null,
    proposal._donor.fullSongForm || null,
  );
}

function proposalToComposition(proposal) {
  if (proposal?.proposalSchema !== "static-collective/franken-proposal/v0") {
    throw new TypeError("Expected a Franken proposal.");
  }
  if (
    proposal.ancestry.playdeckSnapshot !== proposal.donorGuards.playdeckSnapshot ||
    proposal.ancestry.blenderTakeAcceptance !== proposal.donorGuards.blenderReceipt ||
    proposal._donor.playdeck.ancestry.snapshotHash !== proposal.donorGuards.playdeckSnapshot ||
    proposal._donor.blenderTake.material.digest !== proposal.donorGuards.blenderVideo ||
    proposal._donor.blenderTake.ancestry.admissionReceiptSha256 !== proposal.donorGuards.blenderReceipt
  ) {
    throw new TypeError("Stale donor identity detected before freeze.");
  }
  const nextGenContext = proposal._donor.nextGenContext || null;
  if (
    nextGenContext &&
    (
      proposal.donorGuards.nextGenCrossingIdentity !== nextGenContext.crossingIdentity ||
      proposal.ancestry.nextGenCrossing?.crossingIdentity !== nextGenContext.crossingIdentity
    )
  ) {
    throw new TypeError("Stale NextGen organ crossing detected before freeze.");
  }
  const isFullSong=Boolean(proposal.fullSongForm);
  return {
    schema: isFullSong?FRANKEN_FULL_SONG_SCHEMA:FRANKEN_SCHEMA,
    policy: isFullSong?FRANKEN_FULL_SONG_POLICY:FRANKEN_POLICY,
    compositionId: `${isFullSong?"fc1":"fc0"}_${hashCanonical(
      {
        seed: proposal.seed,
        variation: proposal.variation,
        cardOrder: proposal.cardOrder,
        sceneRoles: proposal.sceneRoles,
        transitionChoices: proposal.transitionChoices,
        text: proposal.text,
        digestPlacements: proposal.digestPlacements || [],
        nextGenCrossingIdentity:
          proposal.donorGuards.nextGenCrossingIdentity || null,
        fullSongFormHash:proposal.fullSongForm?.formHash||null,
      },
      isFullSong?"HauntedToaster-FrankenProposal-v1":"HauntedToaster-FrankenProposal-v0",
    )}`,
    seed: `${proposal.seed}:${proposal.variation}`,
    fps: FPS,
    durationFrames: proposal.durationFrames||DURATION_FRAMES,
    ancestry: proposal.ancestry,
    materials: proposal.materials,
    scenes: proposal.scenes,
    transitions: proposal.transitions,
    receipts: {
      policyVersion: isFullSong?FRANKEN_FULL_SONG_POLICY:FRANKEN_POLICY,
      ...(proposal.fullSongForm?{fullSongFormHash:proposal.fullSongForm.formHash}:{}),
      ...(proposal.donorGuards.nextGenCrossingIdentity
        ? {
            nextGenCrossingIdentity:
              proposal.donorGuards.nextGenCrossingIdentity,
          }
        : {}),
    },
  };
}

module.exports = {
  applyFrankenEdits,
  composeFrankenProposal,
  proposalToComposition,
};
