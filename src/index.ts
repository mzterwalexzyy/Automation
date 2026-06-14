import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parseScript } from './script/parser';
import { analyzeMood } from './mood/analyzer';
import { buildAssetBundle } from './pipeline/orchestrator';
import { renderVideo } from './remotion/render';
import { RemotionVideoData, RemotionSceneData } from './types';

async function main(): Promise<void> {
  const scriptPath = process.argv[2];
  if (!scriptPath) {
    console.error('Usage: npm start <path-to-script.txt>');
    console.error('Example: npm start scripts/my-story.txt');
    process.exit(1);
  }

  const scriptText = fs.readFileSync(path.resolve(scriptPath), 'utf-8');
  console.log(`\n🎬 auto-video-remotion`);
  console.log(`${'─'.repeat(40)}`);

  console.log('\n📝 Step 1/4 — Parsing script...');
  const parsedScript = await parseScript(scriptText);
  console.log(`   ✅ "${parsedScript.title}" — ${parsedScript.scenes.length} scenes, ${parsedScript.totalDurationSeconds}s total`);

  console.log('\n🎭 Step 2/4 — Analyzing mood...');
  const mood = await analyzeMood(parsedScript);
  console.log(`   ✅ Mood: ${mood.mood} | Energy: ${mood.energy} | Tempo: ${mood.tempo}`);

  console.log('\n📥 Step 3/4 — Sourcing & downloading assets...');
  const assets = await buildAssetBundle(parsedScript, mood);
  console.log(`   ✅ Assets ready for ${parsedScript.scenes.length} scenes`);

  console.log('\n🎥 Step 4/4 — Composing & rendering video...');
  const FPS = 30;

  const scenes: RemotionSceneData[] = parsedScript.scenes.map((scene) => {
    const sceneAssets = assets.scenes.find((a) => a.sceneId === scene.id);
    if (!sceneAssets) throw new Error(`Missing assets for ${scene.id}`);
    return {
      id: scene.id,
      narration: scene.narration,
      visualDescription: scene.visualDescription,
      durationFrames: Math.round(scene.durationSeconds * FPS),
      backgroundPath: sceneAssets.background.localPath,
      backgroundType: sceneAssets.background.type as 'video' | 'image',
      sfxPaths: sceneAssets.sfx.map((s) => s.localPath).filter(Boolean),
    };
  });

  const totalFrames = scenes.reduce((sum, s) => sum + s.durationFrames, 0);

  const videoData: RemotionVideoData = {
    title: parsedScript.title,
    fps: FPS,
    scenes,
    bgmPath: assets.bgm.localPath,
    totalFrames,
  };

  const safeName = parsedScript.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const outputPath = path.join(process.cwd(), 'output', `${safeName}.mp4`);

  await renderVideo(videoData, outputPath);

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`✅ Done! Video saved to:\n   ${outputPath}\n`);
}

main().catch((err) => {
  console.error('\n❌ Pipeline failed:', err.message);
  process.exit(1);
});
