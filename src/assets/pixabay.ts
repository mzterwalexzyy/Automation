import axios from 'axios';

const PIXABAY_MUSIC_URL = 'https://pixabay.com/api/music/';

export interface PixabayTrack {
  id: number;
  title: string;
  downloadUrl: string;
  duration: number;
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

  const response = await axios.get(PIXABAY_MUSIC_URL, {
    params: {
      key,
      q: keywords.slice(0, 2).join('+'),
      category: genre,
      per_page: 5,
    },
  });

  return response.data.hits.map((h: any) => ({
    id: h.id,
    title: h.title,
    downloadUrl: h.audioDownloadUrl,
    duration: h.duration,
  }));
}
