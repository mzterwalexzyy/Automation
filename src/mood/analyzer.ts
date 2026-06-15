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

export async function analyzeMood(script: ParsedScript): Promise<OverallMood> {
  const sceneList = script.scenes
    .map((s) => `[${s.id}] (${s.durationSeconds}s): ${s.narration}`)
    .join('\n');

  const result = await getModel().generateContent(
    `You are a video production AI. Analyze this script and suggest assets.

For EACH SCENE:
- mood: one of (dramatic, uplifting, melancholic, tense, peaceful, energetic, inspirational, corporate, mysterious, romantic)
- energy: low | medium | high
- brollKeywords: 3-5 specific searchable stock footage terms
- sfxKeywords: 1-3 ambient sound effect terms

For the OVERALL VIDEO:
- mood: dominant mood
- energy: overall energy
- tempo: slow | medium | fast
- bgmKeywords: 3-4 music genre/style keywords

Return ONLY valid JSON (no markdown):
{
  "mood": "overall mood",
  "energy": "low|medium|high",
  "tempo": "slow|medium|fast",
  "bgmKeywords": ["cinematic", "dark", "suspense"],
  "scenes": [
    {
      "sceneId": "scene-1",
      "mood": "dramatic",
      "energy": "high",
      "brollKeywords": ["crime scene investigation", "detective with flashlight", "dark alley at night"],
      "sfxKeywords": ["tension drone", "heartbeat"]
    }
  ]
}

Scenes:
${sceneList}`
  );

  return JSON.parse(cleanJson(result.response.text())) as OverallMood;
}
