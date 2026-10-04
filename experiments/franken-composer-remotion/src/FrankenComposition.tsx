import React from 'react';
import {AbsoluteFill,Img,Interactive,Sequence,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import type {Clip,FrankenBundle,Material} from './types';

const findClip=(bundle:FrankenBundle,materialId:string,sceneId?:string):Clip|null=>{
  for(const scene of bundle.scenes){
    if(sceneId&&scene.sceneId!==sceneId)continue;
    for(const track of scene.tracks){
      for(const clip of track.clips){
        if(clip.materialId===materialId)return clip;
      }
    }
  }
  return null;
};

const materialFor=(bundle:FrankenBundle,id:string):Material=>{
  const found=bundle.materials.find(m=>m.materialId===id);
  if(!found)throw new Error(`Missing material ${id}`);
  return found;
};

const ClipBody:React.FC<{bundle:FrankenBundle;clip:Clip;material:Material;name:string}>=({bundle,clip,material,name})=>{
  const frame=useCurrentFrame();
  const scale=clip.transform.scale*interpolate(frame,[0,Math.min(12,clip.durationFrames-1)],[0.92,1],{
    extrapolateLeft:'clamp',
    extrapolateRight:'clamp',
  });
  const style:React.CSSProperties={
    position:'absolute',
    left:`${clip.transform.x*100}%`,
    top:`${clip.transform.y*100}%`,
    translate:'-50% -50%',
    scale,
    rotate:`${clip.transform.rotationDegrees}deg`,
    opacity:clip.opacity,
    mixBlendMode:clip.blend as React.CSSProperties['mixBlendMode'],
    maxWidth:'70%',
    maxHeight:'80%',
  };
  if(material.kind==='image')return <Img name={name} src={staticFile(material.binding!)} style={style}/>;
  if(material.kind==='video')return <Video src={staticFile(material.binding!)} muted trimBefore={Math.round((clip.sourceWindow?.startSeconds??0)*bundle.composition.fps)} trimAfter={Math.round((clip.sourceWindow?.endSeconds??clip.durationFrames/bundle.composition.fps)*bundle.composition.fps)} style={style}/>;
  if(material.kind==='text'){
    const text=material.sourceIdentity.split(':').slice(2).join(':');
    return <Interactive.Div name={name} style={{...style,color:'white',fontFamily:'Impact, sans-serif',fontSize:64,lineHeight:1,textAlign:'center',WebkitTextStroke:'2px black'}}>{text}</Interactive.Div>;
  }
  return <Interactive.Div name={name} style={{...style,width:760,height:760,border:'24px double white',borderRadius:'50%',filter:'contrast(1.4)'}}/>;
};

const ClipAt:React.FC<{bundle:FrankenBundle;materialId:string;name:string;sceneId?:string}>=({bundle,materialId,name,sceneId})=>{
  const clip=findClip(bundle,materialId,sceneId);
  if(!clip)return null;
  const material=materialFor(bundle,materialId);
  return <Sequence name={name} from={clip.startFrame} durationInFrames={clip.durationFrames} premountFor={24}><ClipBody bundle={bundle} clip={clip} material={material} name={name}/></Sequence>;
};

const TransitionOverlay:React.FC<{bundle:FrankenBundle;transitionId:string}>=({bundle,transitionId})=>{
  const frame=useCurrentFrame();
  const t=bundle.transitions.find(x=>x.transitionId===transitionId);
  if(!t)return null;
  const boundary=bundle.scenes.find(s=>s.sceneId===t.toSceneId)?.startFrame??0;
  const progress=interpolate(frame,[boundary-t.durationFrames,boundary],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  if(frame<boundary-t.durationFrames||frame>=boundary)return null;
  return <AbsoluteFill style={{pointerEvents:'none',background:t.kind==='panel-wipe'?`linear-gradient(90deg, transparent ${progress*100}%, white ${progress*100}%)`:`radial-gradient(circle at center, transparent ${progress*70}%, rgba(255,255,255,.92) ${Math.min(100,progress*70+4)}%)`,mixBlendMode:'screen'}}/>;
};

export const FrankenComposition:React.FC<{bundle:FrankenBundle}>=({bundle})=><AbsoluteFill style={{backgroundColor:'#0b0b10',overflow:'hidden'}}>
  <Sequence name="ARRIVE scene" from={0} durationInFrames={384} premountFor={24}><AbsoluteFill style={{backgroundColor:'#13101a'}}/></Sequence>
  <Sequence name="CROSS scene" from={384} durationInFrames={384} premountFor={24}><AbsoluteFill style={{backgroundColor:'#090d18'}}/></Sequence>
  <Sequence name="ASSEMBLE scene" from={768} durationInFrames={384} premountFor={24}><AbsoluteFill style={{backgroundColor:'#160b12'}}/></Sequence>
  <ClipAt bundle={bundle} materialId="playdeck:card-01" name="Card 01"/>
  <ClipAt bundle={bundle} materialId="playdeck:card-02" name="Card 02"/>
  <ClipAt bundle={bundle} materialId="playdeck:card-03" name="Card 03"/>
  <ClipAt bundle={bundle} materialId="playdeck:card-04" name="Card 04"/>
  <ClipAt bundle={bundle} materialId="playdeck:card-05" name="Card 05"/>
  <ClipAt bundle={bundle} materialId="playdeck:card-06" name="Card 06"/>
  <ClipAt bundle={bundle} materialId={bundle.materials.find(m=>m.kind==='video')!.materialId} name="Accepted moving take"/>
  <ClipAt bundle={bundle} materialId="franken:text" sceneId="ARRIVE" name="ARRIVE typography"/>
  <ClipAt bundle={bundle} materialId="franken:text" sceneId="CROSS" name="CROSS typography"/>
  <ClipAt bundle={bundle} materialId="franken:text" sceneId="ASSEMBLE" name="ASSEMBLE typography"/>
  <ClipAt bundle={bundle} materialId="franken:topology" sceneId="CROSS" name="CROSS topology"/>
  <ClipAt bundle={bundle} materialId="franken:topology" sceneId="ASSEMBLE" name="ASSEMBLE topology"/>
  <TransitionOverlay bundle={bundle} transitionId="arrive-cross"/>
  <TransitionOverlay bundle={bundle} transitionId="cross-assemble"/>
</AbsoluteFill>;
