import React from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Img,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { RemotionSceneData } from '../../types';

interface Props {
  scene: RemotionSceneData;
  fps: number;
}

export const SceneComponent: React.FC<Props> = ({ scene, fps }) => {
  const frame = useCurrentFrame();
  const fadeDuration = Math.min(fps * 0.6, scene.durationFrames * 0.2);

  const opacity = interpolate(
    frame,
    [0, fadeDuration, scene.durationFrames - fadeDuration, scene.durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Subtle Ken Burns zoom
  const scale = interpolate(frame, [0, scene.durationFrames], [1.0, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Background media */}
      <AbsoluteFill style={{ transform: `scale(${scale})`, overflow: 'hidden' }}>
        {scene.backgroundType === 'video' && scene.backgroundPath ? (
          <OffthreadVideo
            src={scene.backgroundPath}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : scene.backgroundPath ? (
          <Img
            src={scene.backgroundPath}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />
        )}
      </AbsoluteFill>

      {/* Gradient overlay for text legibility */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Narration text */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: '64px 140px',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontSize: 44,
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            fontWeight: 600,
            textAlign: 'center',
            textShadow: '0 2px 16px rgba(0,0,0,0.9)',
            lineHeight: 1.45,
            margin: 0,
            maxWidth: 1400,
          }}
        >
          {scene.narration}
        </p>
      </AbsoluteFill>

      {/* SFX audio */}
      {scene.sfxPaths.map((src, i) => (
        <Audio key={i} src={src} volume={0.55} />
      ))}
    </AbsoluteFill>
  );
};
