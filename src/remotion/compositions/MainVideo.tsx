import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { RemotionVideoData } from '../../types';
import { SceneComponent } from './Scene';

export const MainVideo: React.FC<RemotionVideoData> = ({ scenes, bgmPath, voPath, fps }) => {
  let startFrame = 0;
  const sequenced = scenes.map((scene) => {
    const from = startFrame;
    startFrame += scene.durationFrames;
    return { scene, from };
  });

  // Duck BGM under voiceover
  const bgmVolume = voPath ? 0.12 : 0.35;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {bgmPath ? <Audio src={bgmPath} volume={bgmVolume} /> : null}
      {voPath ? <Audio src={voPath} volume={1.0} /> : null}
      {sequenced.map(({ scene, from }) => (
        <Sequence key={scene.id} from={from} durationInFrames={scene.durationFrames}>
          <SceneComponent scene={scene} fps={fps} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
