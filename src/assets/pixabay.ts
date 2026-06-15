import axios from 'axios';

const PIXABAY_MUSIC_URL = 'https://pixabay.com/api/music/';
const PIXABAY_VIDEO_URL = 'https://pixabay.com/api/videos/';

export interface PixabayTrack {
  id: number;
  title: string;
  downloadUrl: string;
  duration: number;
}

export interface PixabayVideo {
  id: number;
  downloadUrl: string;
  duration: number;
  width: number;
  height: number;
}

const MOOD_TO_GENRE: Record<string, string> = {
  dramatic: 'cinematic',
  uplifting: 'pop',
  melancholic: 'ambient',
  tense: 'cinematic',
  peaceful: 'ambient',
  energetic: 'dance',
  inspirational: 'pop',
  corporate: 'corporate',
  mysterious: 'ambient',
  romantic: 'classical',
};

export async function searchBGM(
  keywords: string[],
  mood: string
): Promise<PixabayTrack[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error('PIXABAY_API_KEY is not set in environment');

  const genre = MOOD_TO_GENRE[mood.toLowerCase()] ?? 'cinematic';

  // Try genre parameter first, fall back to q-only search
  const attempts = [
    { key, genre, per_page: 5, order: 'popular' },
    { key, q: keywords.slice(0, 2).join(' '), per_page: 5, order: 'popular' },
    { key, q: genre, per_page: 5 },
  ];

  for (const params of attempts) {
    try {
      const response = await axios.get(PIXABAY_MUSIC_URL, { params, timeout: 15000 });
      const hits = response.data?.hits ?? [];
      if (hits.length > 0) {
        return hits.map((h: any) => ({
          id: h.id,
          title: h.title ?? 'Unknown',
          downloadUrl: h.audio_download_url ?? h.audioDownloadUrl ?? h.download_url ?? '',
          duration: h.duration ?? 0,
        })).filter((t: PixabayTrack) => t.downloadUrl);
      }
    } catch {
      // try next params variant
    }
  }

  throw new Error('Pixabay Music returned no results');
}

export async function searchPixabayVideos(keywords: string[]): Promise<PixabayVideo[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error('PIXABAY_API_KEY is not set in environment');

  const response = await axios.get(PIXABAY_VIDEO_URL, {
    params: {
      key,
      q: keywords.slice(0, 3).join(' '),
      video_type: 'film',
      per_page: 6,
      safesearch: true,
    },
  });

  return response.data.hits
    .map((h: any) => {
      const v =
        h.videos?.large?.url
          ? h.videos.large
          : h.videos?.medium?.url
          ? h.videos.medium
          : h.videos?.small?.url
          ? h.videos.small
          : h.videos?.tiny;
      return {
        id: h.id,
        downloadUrl: v?.url ?? '',
        duration: h.duration,
        width: v?.width ?? 1280,
        height: v?.height ?? 720,
      };
    })
    .filter((v: PixabayVideo) => v.downloadUrl);
}
