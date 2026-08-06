const PRESETS = {
  porchlight: {
    id: "porchlight",
    name: "Porchlight",
    strapline: "Warm grain / dusk signal / the house stays awake",
    colors: ["#120b16", "#44251f", "#d36b3d", "#f3c677", "#4a9d93"],
    waveColors: ["0xF7D794", "0xE77B58"],
    spectrumColor: "intensity",
    hueDrift: 7,
    grain: 7,
    blendMode: "softlight",
    imageOpacity: 0.68,
    seed: 22100,
  },
  wireOrchard: {
    id: "wireOrchard",
    name: "Wire Orchard",
    strapline: "Electric fruit / signal bloom / midnight circuitry",
    colors: ["#050a16", "#10213c", "#154f59", "#dc4d8f", "#c8f35b"],
    waveColors: ["0xB7FF5A", "0x6AF2FF"],
    spectrumColor: "intensity",
    hueDrift: 14,
    grain: 11,
    blendMode: "screen",
    imageOpacity: 0.54,
    seed: 137,
  },
  absoluteResidual: {
    id: "absoluteResidual",
    name: "Absolute Residual",
    strapline: "Haunted photocopy / violet ash / revival flare",
    colors: ["#070608", "#1a1424", "#4e315f", "#b35c3d", "#efe0c2"],
    waveColors: ["0xEFE0C2", "0xB58BE2"],
    spectrumColor: "intensity",
    hueDrift: 10,
    grain: 18,
    blendMode: "hardlight",
    imageOpacity: 0.46,
    seed: 183,
  },
};

function getPreset(presetId) {
  return PRESETS[presetId] || PRESETS.porchlight;
}

module.exports = {
  PRESETS,
  getPreset,
};
