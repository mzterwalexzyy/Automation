import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { RemotionVideoData } from '../../types';
import { SceneComponent } from './Scene';

function toSrc(p: string): string {
  if (!p) return p;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  return staticFile(p);
}

export const MainVideo: React.FC<RemotionVideoData> = ({ scenes, bgmPath, voPath, fps }) => {
  let startFrame = 0;
  const sequenced = scenes.map((scene) => {
    const from = startFrame;
    startFrame += scene.durationFrames;
    return { scene, from };
  });

  const bgmVolume = voPath ? 0.12 : 0.35;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {bgmPath ? <Audio src={toSrc(bgmPath)} volume={bgmVolume} /> : null}
      {voPath ? <Audio src={toSrc(voPath)} volume={1.0} /> : null}
      {sequenced.map(({ scene, from }) => (
        <Sequence key={scene.id} from={from} durationInFrames={scene.durationFrames}>
          <SceneComponent scene={scene} fps={fps} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
