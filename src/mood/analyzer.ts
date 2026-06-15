import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedScript, OverallMood } from '../types';

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment');
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.0-flash' });
}

function cleanJson(text: string): string {
  return text.trim().replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
}

async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err?.message?.includes('429') || String(err).includes('429');
      if (is429 && attempt < maxRetries) {
        console.log(`   ⏳ Gemini rate limit — waiting 45s before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise((r) => setTimeout(r, 45000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini retries exhausted');
}

function defaultMood(script: ParsedScript): OverallMood {
  return {
    mood: 'dramatic',
    energy: 'medium',
    tempo: 'slow',
    bgmKeywords: ['cinematic', 'dark', 'suspense', 'thriller'],
    scenes: script.scenes.map((s) => ({
      sceneId: s.id,
      mood: 'dramatic',
      energy: 'medium',
      brollKeywords: ['crime scene investigation', 'dark rural town', 'courthouse exterior', 'newspaper headline'],
      sfxKeywords: ['tension drone', 'ambient wind'],
    })),
  };
}

export async function analyzeMood(script: ParsedScript): Promise<OverallMood> {
  const sceneList = script.scenes
    .map((s) => `[${s.id}] (${s.durationSeconds}s): ${s.narration}`)
    .join('\n');

  try {
    const result = await withGeminiRetry(() =>
      getModel().generateContent(
        `You are a video production AI. Analyze this script and suggest assets.\n\nFor EACH SCENE:\n- mood: one of (dramatic, uplifting, melancholic, tense, peaceful, energetic, inspirational, corporate, mysterious, romantic)\n- energy: low | medium | high\n- brollKeywords: 3-5 specific searchable stock footage terms\n- sfxKeywords: 1-3 ambient sound effect terms\n\nFor the OVERALL VIDEO:\n- mood: dominant mood\n- energy: overall energy\n- tempo: slow | medium | fast\n- bgmKeywords: 3-4 music genre/style keywords\n\nReturn ONLY valid JSON (no markdown):\n{\n  "mood": "overall mood",\n  "energy": "low|medium|high",\n  "tempo": "slow|medium|fast",\n  "bgmKeywords": ["cinematic", "dark", "suspense"],\n  "scenes": [\n    {\n      "sceneId": "scene-1",\n      "mood": "dramatic",\n      "energy": "high",\n      "brollKeywords": ["crime scene investigation", "detective with flashlight", "dark alley at night"],\n      "sfxKeywords": ["tension drone", "heartbeat"]\n    }\n  ]\n}\n\nScenes:\n${sceneList}`
      )
    );

    return JSON.parse(cleanJson(result.response.text())) as OverallMood;
  } catch (err: any) {
    console.log('   ⚠️  Gemini unavailable — using default dramatic mood for true crime');
    return defaultMood(script);
  }
}
