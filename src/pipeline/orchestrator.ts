import { ParsedScript, OverallMood, VideoAssetBundle, SceneAssets, MediaAsset } from '../types';
import { searchVideos, searchImages } from '../assets/pexels';
import { searchSFX } from '../assets/freesound';
import { searchBGM, searchPixabayVideos } from '../assets/pixabay';
import { downloadFile, inferExtension } from '../assets/downloader';

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
            const localPath = await downloadFile(
              video.downloadUrl,
              `${scene.id}-bg-${video.id}${ext}`,
              'video'
            );
            return {
              id: String(video.id),
              url: video.downloadUrl,
              localPath,
              type: 'video' as const,
              durationSeconds: video.duration,
              width: video.width,
              height: video.height,
            };
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
              const localPath = await downloadFile(
                video.downloadUrl,
                `${scene.id}-pbx-${video.id}.mp4`,
                'video'
              );
              return {
                id: String(video.id),
                url: video.downloadUrl,
                localPath,
                type: 'video' as const,
                durationSeconds: video.duration,
                width: video.width,
                height: video.height,
              };
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
              const localPath = await downloadFile(
                image.downloadUrl,
                `${scene.id}-bg-${image.id}${ext}`,
                'image'
              );
              return {
                id: String(image.id),
                url: image.downloadUrl,
                localPath,
                type: 'image' as const,
                width: image.width,
                height: image.height,
              };
            })
          );
          console.log(`    ✅ ${backgrounds.length} Pexels image(s)`);
        }
      } catch (err) {
        console.warn(`    ⚠️  Pexels images failed: ${(err as Error).message}`);
      }
    }

    // 4. Gradient fallback (empty array renders dark gradient in Scene.tsx)
    if (backgrounds.length === 0) {
      console.warn(`    ⚠️  No assets found for ${scene.id} — using gradient background`);
    }

    const sfxList: MediaAsset[] = [];
    if (sfxKeywords.length > 0) {
      try {
        const sfxResults = await searchSFX(sfxKeywords);
        if (sfxResults.length > 0) {
          const sfx = sfxResults[0];
          const localPath = await downloadFile(sfx.previewUrl, `${scene.id}-sfx.mp3`, 'sfx');
          sfxList.push({
            id: String(sfx.id),
            url: sfx.previewUrl,
            localPath,
            type: 'audio',
            durationSeconds: sfx.duration,
          });
          console.log(`    🔊 SFX: ${sfx.name}`);
        }
      } catch (err) {
        console.warn(`    ⚠️  SFX skipped: ${(err as Error).message}`);
      }
    }

    sceneAssets.push({ sceneId: scene.id, backgrounds, sfx: sfxList });
  }

  console.log(`  🎵 Sourcing BGM for mood: "${mood.mood}"...`);
  let bgm: MediaAsset;
  try {
    const tracks = await searchBGM(mood.bgmKeywords, mood.mood);
    if (tracks.length === 0) throw new Error('No tracks returned');
    const track = tracks[0];
    const localPath = await downloadFile(track.downloadUrl, 'bgm.mp3', 'bgm');
    bgm = {
      id: String(track.id),
      url: track.downloadUrl,
      localPath,
      type: 'audio',
      durationSeconds: track.duration,
    };
    console.log(`    ✅ BGM: ${track.title}`);
  } catch (err) {
    console.warn(`    ⚠️  BGM skipped: ${(err as Error).message}`);
    bgm = { id: 'silent', url: '', localPath: '', type: 'audio' };
  }

  return { scenes: sceneAssets, bgm };
}
