import React from 'react';
import { Composition } from 'remotion';
import { MainVideo } from './compositions/MainVideo';
import { RemotionVideoData } from '../types';

const defaultProps: RemotionVideoData = {
  title: 'My Video',
  fps: 30,
  scenes: [
    {
      id: 'scene-1',
      narration: 'Your story starts here.',
      visualDescription: 'cinematic landscape',
      durationFrames: 150,
      backgroundPath: '',
      backgroundType: 'image',
      sfxPaths: [],
    },
  ],
  bgmPath: '',
  totalFrames: 150,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MainVideo"
    component={MainVideo}
    durationInFrames={defaultProps.totalFrames}
    fps={defaultProps.fps}
    width={1920}
    height={1080}
    defaultProps={defaultProps}
  />
);
