import React from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from 'remotion';
import { RemotionSceneData } from '../../types';

interface Props {
  scene: RemotionSceneData;
  fps: number;
}

const MOOD_FILTERS: Record<string, string> = {
  dramatic:      'contrast(1.55) saturate(0.38) brightness(0.70)',
  uplifting:     'contrast(1.10) saturate(1.15) brightness(1.05)',
  melancholic:   'contrast(1.40) saturate(0.30) brightness(0.72) sepia(0.10)',
  tense:         'contrast(1.60) saturate(0.30) brightness(0.65)',
  peaceful:      'contrast(1.00) saturate(1.05) brightness(1.02)',
  energetic:     'contrast(1.20) saturate(1.25) brightness(1.02)',
  inspirational: 'contrast(1.10) saturate(1.10) brightness(1.04)',
  corporate:     'contrast(1.05) saturate(0.90) brightness(1.00)',
  mysterious:    'contrast(1.50) saturate(0.35) brightness(0.68)',
  romantic:      'contrast(1.00) saturate(1.15) brightness(1.00) sepia(0.08)',
};

const BLUE_TINT: Record<string, string> = {
  dramatic:    'rgba(8, 20, 70, 0.28)',
  tense:       'rgba(5, 12, 60, 0.35)',
  mysterious:  'rgba(10, 18, 75, 0.32)',
  melancholic: 'rgba(15, 25, 60, 0.22)',
  default:     'rgba(8, 18, 55, 0.15)',
};

function toSrc(p: string): string {
  if (!p) return p;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  return staticFile(p);
}

export const SceneComponent: React.FC<Props> = ({ scene, fps }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const fadeDuration = Math.min(fps * 0.5, scene.durationFrames * 0.15);
  const opacity = interpolate(
    frame,
    [0, fadeDuration, scene.durationFrames - fadeDuration, scene.durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = interpolate(frame, [0, scene.durationFrames], [1.0, 1.07], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const clipCount = Math.max(scene.backgroundPaths.length, 1);
  const framesPerClip = Math.floor(scene.durationFrames / clipCount);
  const currentClipIndex = Math.min(Math.floor(frame / framesPerClip), clipCount - 1);
  const currentPath = scene.backgroundPaths[currentClipIndex] ?? '';
  const currentType = scene.backgroundTypes[currentClipIndex] ?? 'image';

  const moodKey = scene.mood?.toLowerCase() ?? 'default';
  const colorFilter = MOOD_FILTERS[moodKey] ?? 'contrast(1.40) saturate(0.40) brightness(0.72)';
  const blueTint = BLUE_TINT[moodKey] ?? BLUE_TINT.default;

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Layer 1: Color-graded footage with Ken Burns zoom */}
      <AbsoluteFill style={{ transform: `scale(${scale})`, overflow: 'hidden', filter: colorFilter }}>
        {currentType === 'video' && currentPath ? (
          <OffthreadVideo
            src={toSrc(currentPath)}
            loop
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : currentPath ? (
          <Img
            src={toSrc(currentPath)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }} />
        )}
      </AbsoluteFill>

      {/* Layer 2: Blue tint */}
      <AbsoluteFill style={{ backgroundColor: blueTint }} />

      {/* Layer 3: Vignette */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.88) 100%)' }} />

      {/* Layer 4: Bottom gradient */}
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.0) 38%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.92) 100%)' }} />

      {/* SFX only — no subtitles */}
      {scene.sfxPaths.map((src, i) => (
        <Audio key={i} src={toSrc(src)} volume={0.55} />
      ))}
    </AbsoluteFill>
  );
};
