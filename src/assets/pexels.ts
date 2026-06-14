import axios from 'axios';

const PEXELS_VIDEOS_URL = 'https://api.pexels.com/videos/search';
const PEXELS_IMAGES_URL = 'https://api.pexels.com/v1/search';

export interface PexelsVideo {
  id: number;
  downloadUrl: string;
  width: number;
  height: number;
  duration: number;
}

export interface PexelsImage {
  id: number;
  downloadUrl: string;
  width: number;
  height: number;
}

function getApiKey(): string {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error('PEXELS_API_KEY is not set in environment');
  return key;
}

export async function searchVideos(
  keywords: string[],
  minDuration = 5
): Promise<PexelsVideo[]> {
  const response = await axios.get(PEXELS_VIDEOS_URL, {
    headers: { Authorization: getApiKey() },
    params: {
      query: keywords.slice(0, 2).join(' '),
      per_page: 5,
      min_duration: minDuration,
      orientation: 'landscape',
    },
  });

  return response.data.videos.map((v: any) => {
    const file =
      v.video_files.find((f: any) => f.quality === 'hd' && f.width >= 1280) ||
      v.video_files.find((f: any) => f.quality === 'hd') ||
      v.video_files[0];
    return {
      id: v.id,
      downloadUrl: file.link,
      width: file.width,
      height: file.height,
      duration: v.duration,
    };
  });
}

export async function searchImages(keywords: string[]): Promise<PexelsImage[]> {
  const response = await axios.get(PEXELS_IMAGES_URL, {
    headers: { Authorization: getApiKey() },
    params: {
      query: keywords.slice(0, 2).join(' '),
      per_page: 5,
      orientation: 'landscape',
    },
  });

  return response.data.photos.map((p: any) => ({
    id: p.id,
    downloadUrl: p.src.large2x,
    width: p.width,
    height: p.height,
  }));
}
