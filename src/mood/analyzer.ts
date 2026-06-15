import Anthropic from '@anthropic-ai/sdk';
import { ParsedScript, OverallMood } from '../types';

const client = new Anthropic();

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
      brollKeywords: [
        s.visualDescription ?? s.narration.slice(0, 50),
        'crime scene investigation',
        'dark rural town',
        'courthouse exterior',
      ],
      sfxKeywords: ['tension drone', 'ambient wind'],
    })),
  };
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || String(err).includes('429');
      if (isRateLimit && attempt < maxRetries) {
        console.log(`   ⏳ API rate limit — waiting 45s before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise((r) => setTimeout(r, 45000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Retries exhausted');
}

export async function analyzeMood(script: ParsedScript): Promise<OverallMood> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️  ANTHROPIC_API_KEY not set — using default dramatic mood');
    return defaultMood(script);
  }

  const sceneList = script.scenes
    .map((s) => `[${s.id}] (${s.durationSeconds}s): ${s.narration}`)
    .join('\n');

  try {
    return await withRetry(async () => {
      const message = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are a video production AI. Analyze this script and suggest assets.\n\nFor EACH SCENE provide:\n- mood: one of (dramatic, uplifting, melancholic, tense, peaceful, energetic, inspirational, corporate, mysterious, romantic)\n- energy: low | medium | high\n- brollKeywords: 3-5 specific searchable stock footage terms\n- sfxKeywords: 1-3 ambient sound effect terms\n\nFor the OVERALL VIDEO:\n- mood: dominant mood\n- energy: overall energy level\n- tempo: slow | medium | fast\n- bgmKeywords: 3-4 music genre/style keywords for background music\n\nReturn ONLY valid JSON:\n{\n  "mood": "overall mood",\n  "energy": "low|medium|high",\n  "tempo": "slow|medium|fast",\n  "bgmKeywords": ["cinematic orchestral", "emotional", "inspiring"],\n  "scenes": [\n    {\n      "sceneId": "scene-1",\n      "mood": "dramatic",\n      "energy": "high",\n      "brollKeywords": ["city skyline at dusk", "busy street"],\n      "sfxKeywords": ["city ambience"]\n    }\n  ]\n}\n\nScenes:\n${sceneList}\n\nReturn ONLY valid JSON. No markdown.`,
          },
        ],
      });
      const content = message.content[0];
      if (content.type !== 'text') throw new Error('Unexpected Claude response');
      const cleaned = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned) as OverallMood;
    });
  } catch (err) {
    console.warn(`   ⚠️  Mood analysis failed (${(err as Error).message}) — using default dramatic mood`);
    return defaultMood(script);
  }
}
