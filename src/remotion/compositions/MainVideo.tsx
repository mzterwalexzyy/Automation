import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { RemotionVideoData } from '../../types';
import { SceneComponent } from './Scene';

export const MainVideo: React.FC<RemotionVideoData> = ({ scenes, bgmPath, fps }) => {
  let startFrame = 0;
  const sequenced = scenes.map((scene) => {
    const from = startFrame;
    startFrame += scene.durationFrames;
    return { scene, from };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {bgmPath ? <Audio src={bgmPath} volume={0.35} /> : null}
      {sequenced.map(({ scene, from }) => (
        <Sequence key={scene.id} from={from} durationInFrames={scene.durationFrames}>
          <SceneComponent scene={scene} fps={fps} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
