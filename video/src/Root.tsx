import React from 'react';
import { Composition } from 'remotion';
import { Intro, IntroProps } from './Intro';
import timing from './timing.json';

// modelLabel is the on-screen name of the AI model in scene 3; pass the exact one at render time:
//   npx remotion render src/index.ts IntroVertical out/intro.mp4 --props='{"modelLabel":"…","bgm":true}'
export const Root: React.FC = () => (
  <Composition<any, IntroProps>
    id="IntroVertical"
    component={Intro}
    durationInFrames={timing.totalFrames}
    fps={timing.fps}
    width={1080}
    height={1920}
    defaultProps={{ modelLabel: 'Claude', bgm: true }}
  />
);
