const fs = require("node:fs/promises");

function clamp(value, low = 0, high = 1) {
  return Math.max(low, Math.min(high, value));
}

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "");
  const value =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((character) => character + character)
          .join("")
      : cleaned;
  const number = Number.parseInt(value, 16);
  return [
    (number >> 16) & 255,
    (number >> 8) & 255,
    number & 255,
  ];
}

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

function samplePalette(palette, position) {
  const bounded = clamp(position);
  const scaled = bounded * (palette.length - 1);
  const index = Math.min(palette.length - 2, Math.floor(scaled));
  const local = scaled - index;
  return [
    mix(palette[index][0], palette[index + 1][0], local),
    mix(palette[index][1], palette[index + 1][1], local),
    mix(palette[index][2], palette[index + 1][2], local),
  ];
}

function seededNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967295;
  };
}

async function createProceduralPpm(filePath, preset, options = {}) {
  const width = options.width || 960;
  const height = options.height || 540;
  const palette = preset.colors.map(hexToRgb);
  const random = seededNoise(preset.seed);
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  const pixels = Buffer.allocUnsafe(width * height * 3);
  const aspect = width / height;

  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    const ny = y / (height - 1);
    for (let x = 0; x < width; x += 1) {
      const nx = x / (width - 1);
      const dx = (nx - 0.39) * aspect;
      const dy = ny - 0.46;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const secondRadius = Math.sqrt(
        ((nx - 0.77) * aspect) ** 2 + (ny - 0.24) ** 2,
      );
      const wire =
        Math.sin(nx * 19 + Math.sin(ny * 11) * 2.1 + preset.seed * 0.01) *
        0.045;
      const spiral = Math.sin(angle * 3 + radius * 13.5) * 0.055;
      const glow = Math.max(0, 0.42 - secondRadius) * 0.55;
      const position = clamp(radius * 0.88 + wire + spiral - glow);
      const color = samplePalette(palette, position);
      const vignette = clamp(
        1.08 -
          Math.sqrt(((nx - 0.5) * 1.05) ** 2 + ((ny - 0.5) * 0.9) ** 2) *
            0.52,
        0.62,
        1.05,
      );
      const grain = (random() - 0.5) * preset.grain * 1.2;
      const thread =
        Math.abs(Math.sin((nx + ny * 0.63) * Math.PI * 22)) > 0.992
          ? 13
          : 0;

      pixels[offset] = clamp((color[0] + thread + grain) * vignette, 0, 255);
      pixels[offset + 1] = clamp(
        (color[1] + thread * 0.72 + grain) * vignette,
        0,
        255,
      );
      pixels[offset + 2] = clamp(
        (color[2] + thread * 0.48 + grain) * vignette,
        0,
        255,
      );
      offset += 3;
    }
  }

  await fs.writeFile(filePath, Buffer.concat([header, pixels]));
  return { width, height };
}

module.exports = {
  createProceduralPpm,
  hexToRgb,
  samplePalette,
};
