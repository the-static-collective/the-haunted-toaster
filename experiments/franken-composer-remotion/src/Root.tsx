import React from 'react';
import {Composition} from 'remotion';
import {FrankenComposition} from './FrankenComposition';
import {bundle} from './loadBundle';

export const Root: React.FC = () => (
  <Composition
    id="Franken001"
    component={FrankenComposition}
    durationInFrames={bundle.composition.durationInFrames}
    fps={bundle.composition.fps}
    width={bundle.composition.width}
    height={bundle.composition.height}
    defaultProps={{bundle}}
  />
);
