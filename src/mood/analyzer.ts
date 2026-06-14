import Anthropic from '@anthropic-ai/sdk';
import { ParsedScript, OverallMood } from '../types';

const client = new Anthropic();

export async function analyzeMood(script: ParsedScript): Promise<OverallMood> {
  const sceneList = script.scenes
    .map((s) => `[${s.id}] (${s.durationSeconds}s): ${s.narration}`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a video production AI. Analyze this script and suggest assets.

For EACH SCENE provide:
- mood: one of (dramatic, uplifting, melancholic, tense, peaceful, energetic, inspirational, corporate, mysterious, romantic)
- energy: low | medium | high
- brollKeywords: 3-5 specific searchable stock footage terms
- sfxKeywords: 1-3 ambient sound effect terms

For the OVERALL VIDEO:
- mood: dominant mood
- energy: overall energy level
- tempo: slow | medium | fast
- bgmKeywords: 3-4 music genre/style keywords for background music

Return ONLY valid JSON:
{
  "mood": "overall mood",
  "energy": "low|medium|high",
  "tempo": "slow|medium|fast",
  "bgmKeywords": ["cinematic orchestral", "emotional", "inspiring"],
  "scenes": [
    {
      "sceneId": "scene-1",
      "mood": "dramatic",
      "energy": "high",
      "brollKeywords": ["city skyline at dusk", "busy street", "people walking fast"],
      "sfxKeywords": ["city ambience", "traffic"]
    }
  ]
}

Scenes:
${sceneList}

Return ONLY valid JSON. No markdown.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response');
  const cleaned = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned) as OverallMood;
}
