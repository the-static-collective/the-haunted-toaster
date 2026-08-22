const WITNESS_SIGIL_PROJECTION = "witness-sigil/v0.1";
const WITNESS_SIGIL_RECIPE_SCHEMA = "witness-sigil.recipe/v0.1";
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

const QUADRANTS = Object.freeze(["NW", "NE", "SW", "SE"]);
const LOCAL_SLOTS = Object.freeze(["NW", "NE", "SW", "SE"]);
const QUADRANT_ORIGINS = Object.freeze({
  NW: Object.freeze([0, 0]),
  NE: Object.freeze([112, 0]),
  SW: Object.freeze([0, 112]),
  SE: Object.freeze([112, 112]),
});
const LOCAL_CENTERS = Object.freeze({
  NW: Object.freeze([28, 28]),
  NE: Object.freeze([84, 28]),
  SW: Object.freeze([28, 84]),
  SE: Object.freeze([84, 84]),
});

const PRIMITIVE_MARKUP = Object.freeze({
  P0: '<circle class="dot" cx="0" cy="0" r="4"/>',
  P1: '<path class="line" d="M-14 0H14"/>',
  P2: '<circle class="line" cx="0" cy="0" r="13"/>',
  P3: '<path class="line" d="M9-10A13 13 0 1 0 11 7"/>',
  P4: '<path class="line" d="M0-14L13 11H-13Z"/>',
  P5: '<rect class="line" x="-12" y="-12" width="24" height="24"/>',
  P6: '<path class="line" d="M-11-11L11 11M11-11L-11 11"/>',
  P7: '<path class="line" d="M-7-13V13M7-13V13"/>',
  P8: '<circle class="line" cx="0" cy="0" r="13"/><circle class="dot" cx="0" cy="0" r="3.5"/>',
  P9: '<path class="line" d="M-15 0H-5M5 0H15M-4-6L4 6"/>',
  PA: '<path class="line" d="M10-8A13 13 0 1 0 11 7M8-12L11-7L15-9"/>',
  PB: '<circle class="line" cx="0" cy="0" r="3"/><circle class="line" cx="0" cy="-11" r="3"/><circle class="line" cx="9.5" cy="-5.5" r="3"/><circle class="line" cx="9.5" cy="5.5" r="3"/><circle class="line" cx="0" cy="11" r="3"/><circle class="line" cx="-9.5" cy="5.5" r="3"/><circle class="line" cx="-9.5" cy="-5.5" r="3"/>',
  PC: '<circle class="line" cx="0" cy="0" r="14"/><circle class="line" cx="0" cy="0" r="9"/><circle class="line" cx="0" cy="0" r="4"/>',
  PD: '<path class="line dash" d="M0-15V15"/><path class="line" d="M-13 9L-7-9L-2 9M13 9L7-9L2 9"/>',
  PE: '<path class="line" d="M0 14V1M0 1L-12-12M0 1L12-12"/>',
  PF: '<path class="line" d="M-12-12L0 1M12-12L0 1M0 1V14"/>',
});

function assertCanonicalDigest(digest) {
  if (typeof digest !== "string" || !DIGEST_PATTERN.test(digest)) {
    throw new TypeError("expected canonical lowercase SHA-256 digest (64 hex characters)");
  }
}

function primitiveForNibble(nibble) {
  return `P${nibble.toUpperCase()}`;
}

function buildRecipe(digest) {
  const slots = [];
  for (let index = 0; index < 16; index += 1) {
    const nibble = digest[index];
    slots.push({
      index,
      quadrant: QUADRANTS[Math.floor(index / 4)],
      localSlot: LOCAL_SLOTS[index % 4],
      nibble,
      primitive: primitiveForNibble(nibble),
      rotationDegrees: (Number.parseInt(digest[16 + index], 16) & 0x3) * 90,
    });
  }

  return {
    schema: WITNESS_SIGIL_RECIPE_SCHEMA,
    projection: WITNESS_SIGIL_PROJECTION,
    digestAlgorithm: "sha256",
    digest,
    digestPrefix: digest.slice(0, 12),
    payload: digest.slice(0, 16),
    rotationPayload: digest.slice(16, 32),
    slots,
  };
}

function renderSvg(recipe) {
  const glyphs = recipe.slots.map((slot) => {
    const [originX, originY] = QUADRANT_ORIGINS[slot.quadrant];
    const [localX, localY] = LOCAL_CENTERS[slot.localSlot];
    const x = originX + localX;
    const y = originY + localY;
    return `  <g data-slot="${slot.index}" data-primitive="${slot.primitive}" data-nibble="${slot.nibble}" transform="translate(${x} ${y}) rotate(${slot.rotationDegrees})">${PRIMITIVE_MARKUP[slot.primitive]}</g>`;
  });

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="title desc">',
    `  <title id="title">Witness Sigil ${recipe.digestPrefix}</title>`,
    '  <desc id="desc">witness-sigil/v0.1 geometric recognition cue, not authentication; verify the full canonical digest separately.</desc>',
    '  <style>.line{fill:none;stroke:#111;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.dot{fill:#111}.dash{stroke-dasharray:2 3}.label{fill:#111;font:6px ui-monospace,monospace}</style>',
    ...glyphs,
    '  <text class="label" x="8" y="239">witness-sigil/v0.1</text>',
    `  <text class="label" x="8" y="250">${recipe.digestPrefix}</text>`,
    "</svg>",
    "",
  ].join("\n");
}

function renderWitnessSigilV01(digest) {
  assertCanonicalDigest(digest);
  const recipe = buildRecipe(digest);
  return {
    recipe,
    recipeText: `${JSON.stringify(recipe, null, 2)}\n`,
    svgText: renderSvg(recipe),
  };
}

module.exports = {
  DIGEST_PATTERN,
  WITNESS_SIGIL_PROJECTION,
  WITNESS_SIGIL_RECIPE_SCHEMA,
  renderWitnessSigilV01,
};
