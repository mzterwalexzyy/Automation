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
import { loadFont } from '@remotion/google-fonts/Anton';
import { RemotionSceneData, CaptionWord } from '../../types';

const { fontFamily: antonFont } = loadFont('normal');

interface Props {
  scene: RemotionSceneData;
  fps: number;
}

// Heavy cinematic grading — desaturated, high contrast, low-key
const MOOD_FILTERS: Record<string, string> = {
  dramatic:      'contrast(1.55) saturate(0.38) brightness(0.70)',
  uplifting:     'contrast(1.15) saturate(1.10) brightness(1.04)',
  melancholic:   'contrast(1.35) saturate(0.45) brightness(0.75) sepia(0.12)',
  tense:         'contrast(1.60) saturate(0.30) brightness(0.65)',
  peaceful:      'contrast(1.05) saturate(1.05) brightness(1.02)',
  energetic:     'contrast(1.25) saturate(1.20) brightness(1.02)',
  inspirational: 'contrast(1.15) saturate(1.08) brightness(1.03)',
  corporate:     'contrast(1.10) saturate(0.85) brightness(0.98)',
  mysterious:    'contrast(1.50) saturate(0.35) brightness(0.68)',
  romantic:      'contrast(1.05) saturate(1.10) brightness(1.00) sepia(0.06)',
};

// Blue tint overlay strength per mood
const BLUE_TINT: Record<string, string> = {
  dramatic:   'rgba(8, 20, 70, 0.28)',
  tense:      'rgba(5, 12, 60, 0.35)',
  mysterious: 'rgba(10, 18, 75, 0.32)',
  melancholic:'rgba(15, 25, 65, 0.25)',
  default:    'rgba(8, 18, 55, 0.15)',
};

function buildEstimatedChunks(narration: string, chunkSize: number): string[][] {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize));
  }
  return chunks.length > 0 ? chunks : [['']];
}

function getWhisperChunk(
  captionWords: CaptionWord[],
  currentTimeSec: number,
  chunkSize: number
): { words: string[]; highlightIdx: number } {
  if (captionWords.length === 0) return { words: [], highlightIdx: 0 };

  let currentWordIdx = 0;
  for (let i = 0; i < captionWords.length; i++) {
    if (currentTimeSec >= captionWords[i].startSeconds) {
      currentWordIdx = i;
    }
  }

  const chunkStart = Math.floor(currentWordIdx / chunkSize) * chunkSize;
  return {
    words: captionWords.slice(chunkStart, chunkStart + chunkSize).map((w) => w.word),
    highlightIdx: currentWordIdx - chunkStart,
  };
}

export const SceneComponent: React.FC<Props> = ({ scene, fps }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

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

  // Multi-clip cycling
  const clipCount = Math.max(scene.backgroundPaths.length, 1);
  const framesPerClip = Math.floor(scene.durationFrames / clipCount);
  const currentClipIndex = Math.min(Math.floor(frame / framesPerClip), clipCount - 1);
  const currentPath = scene.backgroundPaths[currentClipIndex] ?? '';
  const currentType = scene.backgroundTypes[currentClipIndex] ?? 'image';

  const moodKey = scene.mood?.toLowerCase() ?? 'dramatic';
  const colorFilter = MOOD_FILTERS[moodKey] ?? MOOD_FILTERS.dramatic;
  const blueTint = BLUE_TINT[moodKey] ?? BLUE_TINT.default;

  const chunkSize = isPortrait ? 3 : 7;
  let captionWords: string[] = [];
  let highlightIdx = 0;

  if (scene.captionWords.length > 0) {
    const result = getWhisperChunk(scene.captionWords, frame / fps, chunkSize);
    captionWords = result.words;
    highlightIdx = result.highlightIdx;
  } else {
    const chunks = buildEstimatedChunks(scene.narration, chunkSize);
    const framesPerChunk = scene.durationFrames / Math.max(chunks.length, 1);
    const chunkIdx = Math.min(Math.floor(frame / framesPerChunk), chunks.length - 1);
    const frameInChunk = frame - chunkIdx * framesPerChunk;
    captionWords = chunks[chunkIdx] ?? [];
    const framesPerWord = framesPerChunk / Math.max(captionWords.length, 1);
    highlightIdx = Math.min(
      Math.floor(frameInChunk / framesPerWord),
      captionWords.length - 1
    );
  }

  const fontSize = isPortrait ? 72 : 48;
  const sidePad = isPortrait ? 36 : 100;
  const bottomPad = isPortrait ? 220 : 72;

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: '#000' }}>
      {/* --- Layer 1: Color-graded footage with Ken Burns --- */}
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
              background: 'linear-gradient(135deg, #050a1a, #0d1a3a, #080d20)',
            }}
          />
        )}
      </AbsoluteFill>

      {/* --- Layer 2: Blue tint color grade overlay --- */}
      <AbsoluteFill style={{ backgroundColor: blueTint }} />

      {/* --- Layer 3: Vignette (dark edges) --- */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.88) 100%)',
        }}
      />

      {/* --- Layer 4: Bottom gradient for caption legibility --- */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.0) 38%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      {/* --- Layer 5: Caption pill --- */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: `0 ${sidePad}px ${bottomPad}px`,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            borderRadius: 16,
            padding: isPortrait ? '20px 36px' : '14px 36px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: `0 ${isPortrait ? 16 : 10}px`,
            maxWidth: '100%',
            boxShadow: '0 4px 32px rgba(0,0,0,0.7)',
          }}
        >
          {captionWords.map((word, i) => (
            <span
              key={i}
              style={{
                fontSize,
                fontFamily: antonFont,
                letterSpacing: isPortrait ? 2.5 : 1.5,
                lineHeight: 1.25,
                textTransform: 'uppercase',
                color: i === highlightIdx ? '#FFD700' : '#FFFFFF',
                opacity: i <= highlightIdx ? 1 : 0.38,
                textShadow:
                  i === highlightIdx
                    ? '0 0 24px rgba(255,215,0,0.55), 0 2px 8px rgba(0,0,0,0.95)'
                    : '0 2px 8px rgba(0,0,0,0.95)',
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </AbsoluteFill>

      {/* --- SFX --- */}
      {scene.sfxPaths.map((src, i) => (
        <Audio key={i} src={src} volume={0.55} />
      ))}
    </AbsoluteFill>
  );
};
