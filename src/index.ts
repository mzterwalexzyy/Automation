import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parseScript } from './script/parser';
import { analyzeMood } from './mood/analyzer';
import { buildAssetBundle } from './pipeline/orchestrator';
import { bundleProject, renderFormat } from './remotion/render';
import { RemotionVideoData, RemotionSceneData } from './types';

const publicDir = path.join(process.cwd(), 'public');

function toPublicRelative(p: string): string {
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const rel = path.relative(publicDir, p);
  if (rel.startsWith('..')) return '';
  return rel;
}

function findVoiceover(): string {
  // Copy voiceover to public so Remotion can serve it via HTTP
  const srcDir = path.join(process.cwd(), 'voiceover');
  if (!fs.existsSync(srcDir)) return '';
  const file = fs.readdirSync(srcDir).find((f) => /\.(mp3|wav|aac|m4a)$/i.test(f));
  if (!file) return '';
  const destDir = path.join(publicDir, 'assets', 'vo');
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, file);
  fs.copyFileSync(path.join(srcDir, file), destPath);
  return destPath;
}

async function main(): Promise<void> {
  const scriptPath = process.argv[2];
  if (!scriptPath) {
    console.error('Usage: npm start <path-to-script.txt>');
    console.error('Example: npm start scripts/my-story.txt');
    process.exit(1);
  }

  const scriptText = fs.readFileSync(path.resolve(scriptPath), 'utf-8');

  console.log('\n🎬 auto-video-remotion');
  console.log('─'.repeat(44));

  console.log('\n📝 Step 1/4 — Parsing script...');
  const parsedScript = await parseScript(scriptText);
  console.log(
    `   ✅ "${parsedScript.title}" — ${parsedScript.scenes.length} scenes, ${parsedScript.totalDurationSeconds}s total`
  );

  console.log('\n🎭 Step 2/4 — Analyzing mood...');
  const mood = await analyzeMood(parsedScript);
  console.log(`   ✅ ${mood.mood} | ${mood.energy} energy | ${mood.tempo} tempo`);

  console.log('\n📥 Step 3/4 — Sourcing & downloading assets...');
  const voAbsPath = findVoiceover();
  if (voAbsPath) {
    console.log(`   🎤 Voiceover found: ${path.basename(voAbsPath)}`);
  } else {
    console.log('   ℹ️  No voiceover in voiceover/ — BGM only');
  }
  const assets = await buildAssetBundle(parsedScript, mood);
  console.log(`   ✅ Assets ready for ${parsedScript.scenes.length} scenes`);

  const FPS = 30;
  const scenes: RemotionSceneData[] = parsedScript.scenes.map((scene) => {
    const sceneAssets = assets.scenes.find((a) => a.sceneId === scene.id);
    if (!sceneAssets) throw new Error(`Missing assets for ${scene.id}`);
    const sceneMood = mood.scenes.find((m) => m.sceneId === scene.id);
    return {
      id: scene.id,
      narration: scene.narration,
      durationFrames: Math.round(scene.durationSeconds * FPS),
      backgroundPaths: sceneAssets.backgrounds.map((b) => toPublicRelative(b.localPath)).filter(Boolean),
      backgroundTypes: sceneAssets.backgrounds.map((b) => b.type as 'video' | 'image'),
      sfxPaths: sceneAssets.sfx.map((s) => toPublicRelative(s.localPath)).filter(Boolean),
      mood: sceneMood?.mood ?? mood.mood,
    };
  });

  const totalFrames = scenes.reduce((sum, s) => sum + s.durationFrames, 0);
  const videoData: RemotionVideoData = {
    title: parsedScript.title,
    fps: FPS,
    scenes,
    bgmPath: toPublicRelative(assets.bgm.localPath),
    voPath: toPublicRelative(voAbsPath),
    totalFrames,
  };

  console.log('\n🎥 Step 4/4 — Rendering video...');
  const safeName = parsedScript.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  const bundled = await bundleProject();

  const out16x9 = path.join(process.cwd(), 'output', `${safeName}-16x9.mp4`);
  const out9x16 = path.join(process.cwd(), 'output', `${safeName}-9x16.mp4`);

  await renderFormat(bundled, videoData, out16x9, '16x9');
  await renderFormat(bundled, videoData, out9x16, '9x16');

  console.log('\n' + '─'.repeat(44));
  console.log('✅ Done!\n');
  console.log(`   📺 16:9 (YouTube):       ${out16x9}`);
  console.log(`   📱 9:16  (Reels/Shorts): ${out9x16}\n`);
}

main().catch((err) => {
  console.error('\n❌ Pipeline failed:', err.message);
  process.exit(1);
});
