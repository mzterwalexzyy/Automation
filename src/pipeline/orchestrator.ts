import { ParsedScript, OverallMood, VideoAssetBundle, SceneAssets, MediaAsset } from '../types';
import { searchVideos, searchImages } from '../assets/pexels';
import { searchSFX } from '../assets/freesound';
import { searchBGM, searchPixabayVideos } from '../assets/pixabay';
import { downloadFile, inferExtension } from '../assets/downloader';

async function sourceBGM(mood: OverallMood): Promise<MediaAsset> {
  // 1. Try Pixabay Music
  try {
    const tracks = await searchBGM(mood.bgmKeywords, mood.mood);
    if (tracks.length > 0) {
      const track = tracks[0];
      const localPath = await downloadFile(track.downloadUrl, 'bgm.mp3', 'bgm');
      console.log(`    ✅ BGM (Pixabay Music): ${track.title}`);
      return { id: String(track.id), url: track.downloadUrl, localPath, type: 'audio', durationSeconds: track.duration };
    }
  } catch (err) {
    console.warn(`    ⚠️  Pixabay Music failed: ${(err as Error).message}`);
  }

  // 2. Try Freesound for ambient music
  try {
    const { searchSFX: searchFS } = await import('../assets/freesound');
    const musicKeywords = [...mood.bgmKeywords, 'ambient music', 'background music cinematic'];
    const tracks = await searchFS(musicKeywords);
    const longTrack = tracks.find((t) => (t.duration ?? 0) >= 30);
    if (longTrack) {
      const localPath = await downloadFile(longTrack.previewUrl, 'bgm.mp3', 'bgm');
      console.log(`    ✅ BGM (Freesound): ${longTrack.name}`);
      return { id: String(longTrack.id), url: longTrack.previewUrl, localPath, type: 'audio', durationSeconds: longTrack.duration };
    }
  } catch (err) {
    console.warn(`    ⚠️  Freesound BGM failed: ${(err as Error).message}`);
  }

  console.warn('    ⚠️  No BGM found — video will be silent');
  return { id: 'silent', url: '', localPath: '', type: 'audio' };
}

export async function buildAssetBundle(
  script: ParsedScript,
  mood: OverallMood
): Promise<VideoAssetBundle> {
  const sceneAssets: SceneAssets[] = [];

  for (const scene of script.scenes) {
    const sceneMood = mood.scenes.find((s) => s.sceneId === scene.id);
    const brollKeywords = sceneMood?.brollKeywords ?? [scene.visualDescription ?? scene.narration.slice(0, 60)];
    const sfxKeywords = sceneMood?.sfxKeywords ?? [];

    console.log(`  📹 [${scene.id}] "${brollKeywords[0]}"`);

    let backgrounds: MediaAsset[] = [];

    // 1. Pexels videos
    try {
      const videos = await searchVideos(brollKeywords, Math.max(3, Math.floor(scene.durationSeconds)));
      if (videos.length > 0) {
        backgrounds = await Promise.all(
          videos.slice(0, 3).map(async (video) => {
            const ext = inferExtension(video.downloadUrl, '.mp4');
            const localPath = await downloadFile(video.downloadUrl, `${scene.id}-bg-${video.id}${ext}`, 'video');
            return { id: String(video.id), url: video.downloadUrl, localPath, type: 'video' as const, durationSeconds: video.duration, width: video.width, height: video.height };
          })
        );
        console.log(`    ✅ ${backgrounds.length} Pexels video clip(s)`);
      }
    } catch (err) {
      console.warn(`    ⚠️  Pexels video failed: ${(err as Error).message}`);
    }

    // 2. Pixabay videos
    if (backgrounds.length === 0) {
      console.log(`    ↩️  Trying Pixabay videos...`);
      try {
        const videos = await searchPixabayVideos(brollKeywords);
        if (videos.length > 0) {
          backgrounds = await Promise.all(
            videos.slice(0, 3).map(async (video) => {
              const localPath = await downloadFile(video.downloadUrl, `${scene.id}-pbx-${video.id}.mp4`, 'video');
              return { id: String(video.id), url: video.downloadUrl, localPath, type: 'video' as const, durationSeconds: video.duration, width: video.width, height: video.height };
            })
          );
          console.log(`    ✅ ${backgrounds.length} Pixabay video clip(s)`);
        }
      } catch (err) {
        console.warn(`    ⚠️  Pixabay video failed: ${(err as Error).message}`);
      }
    }

    // 3. Pexels images
    if (backgrounds.length === 0) {
      console.log(`    ↩️  Falling back to Pexels images`);
      try {
        const images = await searchImages(brollKeywords);
        if (images.length > 0) {
          backgrounds = await Promise.all(
            images.slice(0, 3).map(async (image) => {
              const ext = inferExtension(image.downloadUrl, '.jpg');
              const localPath = await downloadFile(image.downloadUrl, `${scene.id}-bg-${image.id}${ext}`, 'image');
              return { id: String(image.id), url: image.downloadUrl, localPath, type: 'image' as const, width: image.width, height: image.height };
            })
          );
          console.log(`    ✅ ${backgrounds.length} Pexels image(s)`);
        }
      } catch (err) {
        console.warn(`    ⚠️  Pexels images failed: ${(err as Error).message}`);
      }
    }

    // 4. Gradient fallback
    if (backgrounds.length === 0) {
      console.warn(`    ⚠️  No assets for ${scene.id} — gradient background`);
    }

    const sfxList: MediaAsset[] = [];
    if (sfxKeywords.length > 0) {
      try {
        const sfxResults = await searchSFX(sfxKeywords);
        if (sfxResults.length > 0) {
          const sfx = sfxResults[0];
          const localPath = await downloadFile(sfx.previewUrl, `${scene.id}-sfx.mp3`, 'sfx');
          sfxList.push({ id: String(sfx.id), url: sfx.previewUrl, localPath, type: 'audio', durationSeconds: sfx.duration });
          console.log(`    🔊 SFX: ${sfx.name}`);
        }
      } catch (err) {
        console.warn(`    ⚠️  SFX skipped: ${(err as Error).message}`);
      }
    }

    sceneAssets.push({ sceneId: scene.id, backgrounds, sfx: sfxList });
  }

  console.log(`  🎵 Sourcing BGM for mood: "${mood.mood}"...`);
  const bgm = await sourceBGM(mood);

  return { scenes: sceneAssets, bgm };
}
