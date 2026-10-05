export type Transform={x:number;y:number;scale:number;rotationDegrees:number};
export type SourceWindow={startSeconds:number;endSeconds:number}|null;
export type Clip={clipId:string;materialId:string;startFrame:number;durationFrames:number;sourceWindow:SourceWindow;transform:Transform;crop:null|{x:number;y:number;width:number;height:number};opacity:number;blend:string;entrance:string;transitionRelation:string|null};
export type Track={trackId:string;layer:string;role:string;clips:Clip[]};
export type Scene={sceneId:string;startFrame:number;durationFrames:number;worldRule:string;tracks:Track[]};
export type ProjectionTreatment={schema:string;authority:string;family:string;grayscale:number;contrast:number;saturate:number;brightness:number;blurPx:number};
export type Material={materialId:string;kind:'image'|'video'|'text'|'generated-shape';sourceIdentity:string;digest:string;binding:string|null;derivation?:Record<string,unknown>;projectionTreatment?:ProjectionTreatment};
export type FrankenBundle={schema:string;authority:'projection-only';planHash:string;composition:{id:'Franken001';durationInFrames:number;fps:number;width:number;height:number};materials:Material[];scenes:Scene[];transitions:{transitionId:string;fromSceneId:string;toSceneId:string;kind:string;durationFrames:number;parameters:Record<string,unknown>}[]};
