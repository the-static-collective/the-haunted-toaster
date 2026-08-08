function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function ffmpegNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError("Visual-language renderer value must be finite.");
  return String(quantize(number));
}

function zoompan({ width, height, fps, z, x, y }) {
  return `zoompan=z='${z}':x='${x}':y='${y}':d=1:s=${width}x${height}:fps=${ffmpegNumber(fps)}`;
}

const MOTION_COMPILERS = Object.freeze({
  still: Object.freeze({
    id: "motion-still-v1",
    compile(input, output) {
      return [`[${input}]null[${output}]`];
    },
  }),
  drift: Object.freeze({
    id: "motion-drift-v1",
    compile(input, output, state, geometry) {
      const amount = ffmpegNumber(0.006 + clamp(state.motion?.amplitude, 0, 1) * 0.012);
      return [`[${input}]${zoompan({
        ...geometry,
        z: "1.055",
        x: `iw/2-(iw/zoom/2)+sin(on/(${ffmpegNumber(geometry.fps)}*1.7))*iw*${amount}`,
        y: `ih/2-(ih/zoom/2)+cos(on/(${ffmpegNumber(geometry.fps)}*2.1))*ih*${amount}`,
      })}[${output}]`];
    },
  }),
  pulse: Object.freeze({
    id: "motion-pulse-v1",
    compile(input, output, state, geometry) {
      const depth = ffmpegNumber(0.025 + clamp(state.motion?.amplitude, 0, 1) * 0.055);
      return [`[${input}]${zoompan({
        ...geometry,
        z: `1.025+${depth}*(0.5+0.5*sin(on/(${ffmpegNumber(geometry.fps)}*0.42)))`,
        x: "iw/2-(iw/zoom/2)",
        y: "ih/2-(ih/zoom/2)",
      })}[${output}]`];
    },
  }),
  orbit: Object.freeze({
    id: "motion-orbit-v1",
    compile(input, output, state, geometry) {
      const radians = ffmpegNumber(0.025 + clamp(state.motion?.variance, 0, 1) * 0.07);
      return [
        `[${input}]${zoompan({
          ...geometry,
          z: "1.09",
          x: "iw/2-(iw/zoom/2)+cos(on/(fps*0.72))*iw*0.014",
          y: "ih/2-(ih/zoom/2)+sin(on/(fps*0.72))*ih*0.014",
        }).replace(/fps/g, ffmpegNumber(geometry.fps))},rotate='${radians}*sin(t*0.55)':ow=iw:oh=ih:c=black[${output}]`,
      ];
    },
  }),
  fracture: Object.freeze({
    id: "motion-fracture-v1",
    compile(input, output) {
      return [
        `[${input}]split=2[languageFractureA][languageFractureB]`,
        "[languageFractureA]crop=iw/2:ih:0:0[languageFractureLeft]",
        "[languageFractureB]crop=iw/2:ih:iw/2:0,hflip[languageFractureRight]",
        `[languageFractureRight][languageFractureLeft]hstack=inputs=2[${output}]`,
      ];
    },
  }),
});

const MATERIAL_COMPILERS = Object.freeze({
  clean: Object.freeze({
    id: "material-clean-v1",
    compile(input, output) {
      return [`[${input}]null[${output}]`];
    },
  }),
  grain: Object.freeze({
    id: "material-grain-v1",
    compile(input, output, state) {
      const strength = Math.round(5 + clamp(state.material?.imperfection, 0, 1) * 24);
      return [`[${input}]noise=alls=${strength}:allf=t+u:all_seed=41041[${output}]`];
    },
  }),
  photocopy: Object.freeze({
    id: "material-photocopy-v1",
    compile(input, output, state) {
      const contrast = ffmpegNumber(1.45 + clamp(state.material?.imperfection, 0, 1) * 0.85);
      return [`[${input}]format=gray,eq=contrast=${contrast}:brightness=0.035,unsharp=5:5:1.1,format=rgba[${output}]`];
    },
  }),
  "gate-weave": Object.freeze({
    id: "material-gate-weave-v1",
    compile(input, output, state, geometry) {
      const weave = ffmpegNumber(0.002 + clamp(state.material?.imperfection, 0, 1) * 0.009);
      return [`[${input}]${zoompan({
        ...geometry,
        z: "1.035",
        x: `iw/2-(iw/zoom/2)+sin(on/(${ffmpegNumber(geometry.fps)}*0.19))*iw*${weave}`,
        y: `ih/2-(ih/zoom/2)+cos(on/(${ffmpegNumber(geometry.fps)}*0.23))*ih*${weave}`,
      })}[${output}]`];
    },
  }),
});

const CAMERA_COMPILERS = Object.freeze({
  locked: Object.freeze({
    id: "camera-locked-v1",
    compile(input, output) {
      return [`[${input}]null[${output}]`];
    },
  }),
  drift: Object.freeze({
    id: "camera-drift-v1",
    compile(input, output, state, geometry) {
      const variance = clamp(state.camera?.variance, 0, 1);
      const reach = ffmpegNumber(0.004 + variance * 0.012);
      return [`[${input}]${zoompan({
        ...geometry,
        z: "1.05",
        x: `iw/2-(iw/zoom/2)+sin(on/(${ffmpegNumber(geometry.fps)}*3.4))*iw*${reach}`,
        y: `ih/2-(ih/zoom/2)+cos(on/(${ffmpegNumber(geometry.fps)}*3.9))*ih*${reach}`,
      })}[${output}]`];
    },
  }),
  push: Object.freeze({
    id: "camera-push-v1",
    compile(input, output, state, geometry) {
      const rate = ffmpegNumber(0.00018 + clamp(state.camera?.variance, 0, 1) * 0.00028);
      return [`[${input}]${zoompan({
        ...geometry,
        z: `min(1.14,1.015+on*${rate})`,
        x: "iw/2-(iw/zoom/2)",
        y: "ih/2-(ih/zoom/2)",
      })}[${output}]`];
    },
  }),
  orbit: Object.freeze({
    id: "camera-orbit-v1",
    compile(input, output, state, geometry) {
      const variance = clamp(state.camera?.variance, 0, 1);
      const radians = ffmpegNumber(0.012 + variance * 0.04);
      return [
        `[${input}]${zoompan({
          ...geometry,
          z: "1.085",
          x: "iw/2-(iw/zoom/2)+cos(on/(fps*1.15))*iw*0.012",
          y: "ih/2-(ih/zoom/2)+sin(on/(fps*1.15))*ih*0.012",
        }).replace(/fps/g, ffmpegNumber(geometry.fps))},rotate='${radians}*sin(t*0.31)':ow=iw:oh=ih:c=black[${output}]`,
      ];
    },
  }),
});

const PALETTE_COMPILERS = Object.freeze({
  garment: Object.freeze({
    id: "palette-garment-v1",
    compile(input, output) {
      return [`[${input}]null[${output}]`];
    },
  }),
  analogous: Object.freeze({
    id: "palette-analogous-v1",
    compile(input, output, state) {
      const hue = ffmpegNumber(18 + clamp(state.palette?.bleed, 0, 1) * 18);
      const saturation = ffmpegNumber(1.08 + clamp(state.palette?.bleed, 0, 1) * 0.24);
      return [`[${input}]hue=h=${hue}:s=${saturation}[${output}]`];
    },
  }),
  "split-complement": Object.freeze({
    id: "palette-split-complement-v1",
    compile(input, output, state) {
      const bleed = clamp(state.palette?.bleed, 0, 1);
      const cross = ffmpegNumber(0.08 + bleed * 0.18);
      const counter = ffmpegNumber(-0.04 - bleed * 0.07);
      return [`[${input}]colorchannelmixer=rr=1:rg=${cross}:rb=${counter}:gr=${counter}:gg=0.94:gb=${cross}:br=${cross}:bg=${counter}:bb=1[${output}]`];
    },
  }),
  duotone: Object.freeze({
    id: "palette-duotone-v1",
    compile(input, output, state) {
      const bias = clamp((Number(state.palette?.contrastBias) || 0) * 0.5 + 0.5, 0, 1);
      const threshold = Math.round(92 + bias * 72);
      const low = [20, 14, 48];
      const high = [238, Math.round(154 + clamp(state.palette?.bleed, 0, 1) * 72), 86];
      return [
        `[${input}]format=gray,format=rgb24,lutrgb=r='if(lt(val,${threshold}),${low[0]},${high[0]})':g='if(lt(val,${threshold}),${low[1]},${high[1]})':b='if(lt(val,${threshold}),${low[2]},${high[2]})',format=rgba[${output}]`,
      ];
    },
  }),
});

function compileAxis(registry, axis, value, input, output, state, geometry) {
  const entry = registry[value];
  if (!entry) throw new TypeError(`No ${axis} compiler is registered for ${String(value)}.`);
  return {
    lines: entry.compile(input, output, state, geometry),
    evidence: Object.freeze({ axis, value, compiler: entry.id }),
  };
}

function compileVisualLanguageOperators(input, state, geometry) {
  if (!geometry || !Number.isFinite(geometry.width) || !Number.isFinite(geometry.height) || !Number.isFinite(geometry.fps)) {
    throw new TypeError("Visual-language compilation requires production frame geometry.");
  }
  const lines = [];
  const operators = [];
  let current = input;
  const stages = [
    [MOTION_COMPILERS, "motion", state.motion?.grammar, "languageMotion"],
    [MATERIAL_COMPILERS, "material", state.material?.texture, "languageMaterial"],
    [CAMERA_COMPILERS, "camera", state.camera?.grammar, "languageCamera"],
    [PALETTE_COMPILERS, "palette", state.palette?.logic, "languagePalette"],
  ];

  for (const [registry, axis, value, output] of stages) {
    const compiled = compileAxis(registry, axis, value, current, output, state, geometry);
    lines.push(...compiled.lines);
    operators.push(compiled.evidence);
    current = output;
  }

  return Object.freeze({
    input,
    output: current,
    lines: Object.freeze(lines),
    operators: Object.freeze(operators),
  });
}

module.exports = {
  CAMERA_COMPILERS,
  MATERIAL_COMPILERS,
  MOTION_COMPILERS,
  PALETTE_COMPILERS,
  compileVisualLanguageOperators,
};
