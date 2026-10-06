"use strict";

const {validatePossibilityMap}=require("./possibility-map.cjs");

function whole(value,label,min,max){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<min||number>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return number;
}
function esc(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}
function q(value){
  return Math.round(Number(value)*1000)/1000;
}
function renderPossibilityMapSvg(map,{width=960,height=320,padding=44}={}){
  const source=validatePossibilityMap(map);
  const w=whole(width,"PossibilityMap SVG width",320,4096);
  const h=whole(height,"PossibilityMap SVG height",220,2048);
  const pad=whole(padding,"PossibilityMap SVG padding",24,160);
  if(pad*2>=w-40)throw new TypeError("PossibilityMap SVG padding leaves no horizontal chart area.");

  const contributionKinds=[...new Set(source.points.flatMap(point=>point.contributionKinds||[]))].sort();
  const railHeight=contributionKinds.length?Math.min(100,18+(contributionKinds.length*12)):0;
  const chartTop=54;
  const chartBottom=h-pad-railHeight;
  if(chartBottom-chartTop<80)throw new TypeError("PossibilityMap SVG height leaves no usable chart area.");
  const chartLeft=pad;
  const chartRight=w-pad;
  const chartWidth=chartRight-chartLeft;
  const chartHeight=chartBottom-chartTop;
  const denominator=Math.max(1,source.totalFrames-1);

  const x=(frame)=>q(chartLeft+(Number(frame)/denominator)*chartWidth);
  const y=(energy)=>q(chartTop+((1-Number(energy))*chartHeight));

  const curvePoints=source.points.map(point=>`${x(point.frame)},${y(point.energy)}`).join(" ");
  const baseEnergy=source.points[0]?.baseEnergy??0;
  const minSet=new Set(source.minimumObserved.frames);

  const pointSvg=source.points.map(point=>{
    const classes=["possibility-point"];
    if(minSet.has(point.frame))classes.push("minimum-observed");
    return [
      `<circle class="${classes.join(" ")}" data-frame="${point.frame}" data-energy="${point.energy}" data-transition-hash="${point.transitionHash}" cx="${x(point.frame)}" cy="${y(point.energy)}" r="3.5" tabindex="0" role="button">`,
      `<title>frame ${point.frame} · energy ${point.energy}</title>`,
      "</circle>",
    ].join("");
  }).join("");

  const rails=contributionKinds.map((kind,index)=>{
    const railY=chartBottom+24+(index*12);
    const ticks=source.points
      .filter(point=>(point.contributionKinds||[]).includes(kind))
      .map(point=>`<line class="contribution-tick" data-frame="${point.frame}" x1="${x(point.frame)}" y1="${railY-4}" x2="${x(point.frame)}" y2="${railY+4}"/>`)
      .join("");
    return [
      `<g class="contribution-rail" data-contribution-kind="${esc(kind)}">`,
      `<text x="${chartLeft}" y="${railY+3}" class="rail-label">${esc(kind)}</text>`,
      `<line x1="${chartLeft+170}" y1="${railY}" x2="${chartRight}" y2="${railY}" class="rail-baseline"/>`,
      `<g>${ticks}</g>`,
      "</g>",
    ].join("");
  }).join("");

  const minFrames=source.minimumObserved.frames.join(", ");
  const weather=source.creativeWeatherRef
    ?`weather ${esc(source.creativeWeatherRef.weatherHash.slice(0,12))}`
    :"no weather";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Possibility map for ${esc(source.sourceCandidateId)}" data-map-hash="${source.mapHash}" data-candidate-id="${esc(source.sourceCandidateId)}" data-authority="observational-only">`,
    "<style>",
    ".bg{fill:none}.axis,.grid,.base-energy,.rail-baseline{stroke:currentColor;stroke-opacity:.22;stroke-width:1}.base-energy{stroke-dasharray:5 5;stroke-opacity:.42}.possibility-curve{fill:none;stroke:currentColor;stroke-width:2}.possibility-point{fill:currentColor;stroke:none}.minimum-observed{stroke:currentColor;stroke-width:2;fill:none}.contribution-tick{stroke:currentColor;stroke-width:2}.title,.meta,.axis-label,.rail-label{fill:currentColor;font-family:monospace}.title{font-size:14px;font-weight:700}.meta{font-size:10px}.axis-label,.rail-label{font-size:9px}",
    "</style>",
    `<rect class="bg" x="0" y="0" width="${w}" height="${h}"/>`,
    `<text class="title" x="${chartLeft}" y="20">${esc(source.sourceCandidateId)}</text>`,
    `<text class="meta" x="${chartLeft}" y="36">map ${esc(source.mapHash.slice(0,12))} · ${weather}</text>`,
    `<line class="axis" x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${chartBottom}"/>`,
    `<line class="axis" x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}"/>`,
    `<line class="grid" x1="${chartLeft}" y1="${y(1)}" x2="${chartRight}" y2="${y(1)}"/>`,
    `<line class="grid" x1="${chartLeft}" y1="${y(.5)}" x2="${chartRight}" y2="${y(.5)}"/>`,
    `<line class="grid" x1="${chartLeft}" y1="${y(0)}" x2="${chartRight}" y2="${y(0)}"/>`,
    `<line class="base-energy" x1="${chartLeft}" y1="${y(baseEnergy)}" x2="${chartRight}" y2="${y(baseEnergy)}"/>`,
    `<text class="axis-label" x="${chartLeft-28}" y="${y(1)+3}">1.0</text>`,
    `<text class="axis-label" x="${chartLeft-28}" y="${y(.5)+3}">0.5</text>`,
    `<text class="axis-label" x="${chartLeft-28}" y="${y(0)+3}">0.0</text>`,
    `<text class="axis-label" x="${chartLeft}" y="${chartBottom+14}">frame 0</text>`,
    `<text class="axis-label" text-anchor="end" x="${chartRight}" y="${chartBottom+14}">frame ${source.totalFrames-1}</text>`,
    `<polyline class="possibility-curve" points="${curvePoints}"/>`,
    pointSvg,
    rails,
    `<text class="meta" x="${chartRight}" y="20" text-anchor="end">MIN OBSERVED ${source.minimumObserved.energy} @ ${esc(minFrames)}</text>`,
    `<text class="meta" x="${chartRight}" y="36" text-anchor="end">sampled points ${source.pointCount} · fps ${source.fps}</text>`,
    "</svg>",
  ].join("");
}

module.exports={
  renderPossibilityMapSvg,
};
