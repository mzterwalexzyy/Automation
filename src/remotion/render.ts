import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { RemotionVideoData } from '../types';

export async function renderVideo(
  videoData: RemotionVideoData,
  outputPath: string
): Promise<string> {
  console.log('\n📦 Bundling Remotion project...');
  const bundled = await bundle({
    entryPoint: path.resolve('./src/remotion/Root.tsx'),
    webpackOverride: (config) => config,
  });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'MainVideo',
    inputProps: videoData,
  });

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('🎬 Rendering... (this may take a while)');
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: videoData,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r    Progress: ${Math.round(progress * 100)}%  `);
    },
  });

  process.stdout.write('\n');
  return outputPath;
}
