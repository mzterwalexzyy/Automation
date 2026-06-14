import React from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { RemotionSceneData } from '../../types';

interface Props {
  scene: RemotionSceneData;
  fps: number;
}

const MOOD_FILTERS: Record<string, string> = {
  dramatic:      'contrast(1.2) saturate(0.85) brightness(0.88)',
  uplifting:     'contrast(1.1) saturate(1.15) brightness(1.05)',
  melancholic:   'contrast(1.1) saturate(0.6)  brightness(0.85) sepia(0.15)',
  tense:         'contrast(1.3) saturate(0.75) brightness(0.82)',
  peaceful:      'contrast(1.0) saturate(1.05) brightness(1.02)',
  energetic:     'contrast(1.2) saturate(1.25) brightness(1.02)',
  inspirational: 'contrast(1.1) saturate(1.1)  brightness(1.04)',
  corporate:     'contrast(1.05) saturate(0.9) brightness(1.0)',
  mysterious:    'contrast(1.2) saturate(0.7)  brightness(0.78)',
  romantic:      'contrast(1.0) saturate(1.15) brightness(1.0) sepia(0.08)',
};

const WORDS_PER_CHUNK = 7;

function buildCaptionChunks(narration: string): string[][] {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
    chunks.push(words.slice(i, i + WORDS_PER_CHUNK));
  }
  return chunks.length > 0 ? chunks : [[]];
}

export const SceneComponent: React.FC<Props> = ({ scene, fps }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  // Fade in/out
  const fadeDuration = Math.min(fps * 0.5, scene.durationFrames * 0.15);
  const opacity = interpolate(
    frame,
    [0, fadeDuration, scene.durationFrames - fadeDuration, scene.durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Subtle Ken Burns zoom
  const scale = interpolate(frame, [0, scene.durationFrames], [1.0, 1.07], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Multi-clip cycling — hard cut between clips
  const clipCount = Math.max(scene.backgroundPaths.length, 1);
  const framesPerClip = Math.floor(scene.durationFrames / clipCount);
  const currentClipIndex = Math.min(Math.floor(frame / framesPerClip), clipCount - 1);
  const currentPath = scene.backgroundPaths[currentClipIndex] ?? '';
  const currentType = scene.backgroundTypes[currentClipIndex] ?? 'image';

  // Animated word-highlight captions
  const chunks = buildCaptionChunks(scene.narration);
  const chunkCount = Math.max(chunks.length, 1);
  const framesPerChunk = scene.durationFrames / chunkCount;
  const currentChunkIdx = Math.min(Math.floor(frame / framesPerChunk), chunkCount - 1);
  const frameInChunk = frame - currentChunkIdx * framesPerChunk;
  const currentChunk = chunks[currentChunkIdx] ?? [];
  const framesPerWord = framesPerChunk / Math.max(currentChunk.length, 1);
  const highlightIdx = Math.min(
    Math.floor(frameInChunk / framesPerWord),
    currentChunk.length - 1
  );

  const colorFilter = MOOD_FILTERS[scene.mood?.toLowerCase()] ?? 'contrast(1.1) saturate(1.0)';
  const fontSize = isPortrait ? 56 : 44;
  const sidePad = isPortrait ? 50 : 140;

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Color-graded background */}
      <AbsoluteFill style={{ transform: `scale(${scale})`, overflow: 'hidden', filter: colorFilter }}>
        {currentType === 'video' && currentPath ? (
          <OffthreadVideo
            src={currentPath}
            loop
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : currentPath ? (
          <Img
            src={currentPath}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
            }}
          />
        )}
      </AbsoluteFill>

      {/* Bottom gradient for caption legibility */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.0) 50%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Animated word-highlight captions */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: `64px ${sidePad}px`,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: isPortrait ? '90%' : '78%', lineHeight: 1.55 }}>
          {currentChunk.map((word, i) => (
            <span
              key={`${currentChunkIdx}-${i}`}
              style={{
                display: 'inline-block',
                marginRight: 10,
                marginBottom: 6,
                fontSize,
                fontFamily: '"Helvetica Neue", Arial, sans-serif',
                fontWeight: i === highlightIdx ? 800 : 600,
                color: i === highlightIdx ? '#FFD700' : '#ffffff',
                opacity: i <= highlightIdx ? 1 : 0.35,
                textShadow: '0 2px 20px rgba(0,0,0,1)',
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </AbsoluteFill>

      {/* Scene SFX */}
      {scene.sfxPaths.map((src, i) => (
        <Audio key={i} src={src} volume={0.55} />
      ))}
    </AbsoluteFill>
  );
};
