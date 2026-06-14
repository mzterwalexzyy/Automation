import { ParsedScript, OverallMood, VideoAssetBundle, SceneAssets, MediaAsset } from '../types';
import { searchVideos, searchImages } from '../assets/pexels';
import { searchSFX } from '../assets/freesound';
import { searchBGM } from '../assets/pixabay';
import { downloadFile, inferExtension } from '../assets/downloader';

export async function buildAssetBundle(
  script: ParsedScript,
  mood: OverallMood
): Promise<VideoAssetBundle> {
  const sceneAssets: SceneAssets[] = [];

  for (const scene of script.scenes) {
    const sceneMood = mood.scenes.find((s) => s.sceneId === scene.id);
    const brollKeywords = sceneMood?.brollKeywords ?? [scene.visualDescription];
    const sfxKeywords = sceneMood?.sfxKeywords ?? [];

    console.log(`  📹 [${scene.id}] Searching: "${brollKeywords[0]}"`);

    let background: MediaAsset;

    try {
      const videos = await searchVideos(brollKeywords, Math.max(3, Math.floor(scene.durationSeconds)));
      if (videos.length > 0) {
        const video = videos[0];
        const ext = inferExtension(video.downloadUrl, '.mp4');
        const filename = `${scene.id}-bg${ext}`;
        const localPath = await downloadFile(video.downloadUrl, filename, 'video');
        background = {
          id: String(video.id),
          url: video.downloadUrl,
          localPath,
          type: 'video',
          durationSeconds: video.duration,
          width: video.width,
          height: video.height,
        };
        console.log(`    ✅ Video downloaded (${video.duration}s)`);
      } else {
        throw new Error('No videos found, falling back to image');
      }
    } catch {
      console.log(`    ↩️  Falling back to image for ${scene.id}`);
      const images = await searchImages(brollKeywords);
      if (images.length === 0) throw new Error(`No assets found for scene ${scene.id}`);
      const image = images[0];
      const ext = inferExtension(image.downloadUrl, '.jpg');
      const filename = `${scene.id}-bg${ext}`;
      const localPath = await downloadFile(image.downloadUrl, filename, 'image');
      background = {
        id: String(image.id),
        url: image.downloadUrl,
        localPath,
        type: 'image',
        width: image.width,
        height: image.height,
      };
      console.log(`    ✅ Image downloaded`);
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
        console.warn(`    ⚠️  SFX skipped for ${scene.id}: ${(err as Error).message}`);
      }
    }

    sceneAssets.push({ sceneId: scene.id, background, sfx: sfxList });
  }

  console.log(`  🎵 Sourcing BGM for mood: "${mood.mood}"...`);
  let bgm: MediaAsset;
  try {
    const tracks = await searchBGM(mood.bgmKeywords, mood.mood);
    if (tracks.length === 0) throw new Error('No BGM tracks found');
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
