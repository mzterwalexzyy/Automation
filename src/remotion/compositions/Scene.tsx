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

  const colorFilter = MOOD_FILTERS[scene.mood?.toLowerCase()] ?? 'contrast(1.1)';

  // 9:16 portrait: 3 words max (TikTok/Reels style)
  // 16:9 landscape: 7 words
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
    <AbsoluteFill style={{ opacity }}>
      {/* Color-graded background with multi-clip cycling */}
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
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Caption pill */}
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
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            borderRadius: 16,
            padding: isPortrait ? '20px 36px' : '14px 36px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: `0 ${isPortrait ? 16 : 10}px`,
            maxWidth: '100%',
          }}
        >
          {captionWords.map((word, i) => (
            <span
              key={i}
              style={{
                fontSize,
                fontFamily: antonFont,
                letterSpacing: isPortrait ? 2.5 : 1,
                lineHeight: 1.25,
                textTransform: 'uppercase',
                color: i === highlightIdx ? '#FFD700' : '#FFFFFF',
                opacity: i <= highlightIdx ? 1 : 0.4,
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
