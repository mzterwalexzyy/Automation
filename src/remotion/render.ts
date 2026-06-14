import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { RemotionVideoData } from '../types';

export async function bundleProject(): Promise<string> {
  console.log('\n📦 Bundling Remotion project...');
  return bundle({
    entryPoint: path.resolve('./src/remotion/Root.tsx'),
    webpackOverride: (config) => config,
  });
}

export async function renderFormat(
  bundled: string,
  videoData: RemotionVideoData,
  outputPath: string,
  format: '16x9' | '9x16'
): Promise<string> {
  const compositionId = format === '9x16' ? 'MainVideo_9x16' : 'MainVideo_16x9';
  const label = format === '9x16' ? '9:16 (Reels/Shorts)' : '16:9 (YouTube)';

  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps: videoData,
  });

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`🎬 Rendering ${label}...`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: videoData,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r    ${label}: ${Math.round(progress * 100)}%  `);
    },
  });

  process.stdout.write('\n');
  return outputPath;
}
