import axios from 'axios';

const FREESOUND_URL = 'https://freesound.org/apiv2/search/text/';

export interface FreesoundTrack {
  id: number;
  name: string;
  previewUrl: string;
  duration: number;
}

export async function searchSFX(keywords: string[]): Promise<FreesoundTrack[]> {
  const key = process.env.FREESOUND_API_KEY;
  if (!key) throw new Error('FREESOUND_API_KEY is not set in environment');

  const response = await axios.get(FREESOUND_URL, {
    params: {
      query: keywords.slice(0, 2).join(' '),
      token: key,
      fields: 'id,name,duration,previews',
      filter: 'duration:[2 TO 30]',
      sort: 'rating_desc',
      page_size: 3,
    },
  });

  return response.data.results.map((r: any) => ({
    id: r.id,
    name: r.name,
    previewUrl: r.previews['preview-hq-mp3'],
    duration: r.duration,
  }));
}
