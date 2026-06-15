import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { MainVideo } from './compositions/MainVideo';
import { RemotionVideoData } from '../types';

const defaultProps: RemotionVideoData = {
  title: 'My Video',
  fps: 30,
  scenes: [
    {
      id: 'scene-1',
      narration: 'Your story starts here.',
      durationFrames: 150,
      backgroundPaths: [],
      backgroundTypes: [],
      sfxPaths: [],
      mood: 'inspirational',
    },
  ],
  bgmPath: '',
  voPath: '',
  totalFrames: 150,
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="MainVideo-16x9"
      component={MainVideo}
      durationInFrames={defaultProps.totalFrames}
      fps={defaultProps.fps}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
    />
    <Composition
      id="MainVideo-9x16"
      component={MainVideo}
      durationInFrames={defaultProps.totalFrames}
      fps={defaultProps.fps}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
    />
  </>
);

registerRoot(RemotionRoot);
