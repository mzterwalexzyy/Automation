import OpenAI from 'openai';
import fs from 'fs';
import { CaptionWord } from '../types';

export async function transcribeVoiceover(voPath: string): Promise<CaptionWord[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('   ℹ️  No OPENAI_API_KEY — using estimated caption timing');
    return [];
  }

  console.log('   🎤 Running Whisper transcription...');
  const client = new OpenAI({ apiKey });

  const transcription = (await client.audio.transcriptions.create({
    file: fs.createReadStream(voPath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
  })) as any;

  const words: CaptionWord[] = (transcription.words ?? []).map((w: any) => ({
    word: w.word.trim(),
    startSeconds: w.start,
    endSeconds: w.end,
  }));

  console.log(`   ✅ Whisper: ${words.length} words transcribed with timestamps`);
  return words;
}

export function getSceneCaptions(
  allWords: CaptionWord[],
  startSeconds: number,
  endSeconds: number
): CaptionWord[] {
  return allWords
    .filter((w) => w.startSeconds >= startSeconds && w.startSeconds < endSeconds)
    .map((w) => ({
      word: w.word,
      startSeconds: w.startSeconds - startSeconds,
      endSeconds: w.endSeconds - startSeconds,
    }));
}
