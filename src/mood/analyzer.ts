import Anthropic from '@anthropic-ai/sdk';
import { ParsedScript, OverallMood } from '../types';

const client = new Anthropic();

export async function analyzeMood(script: ParsedScript): Promise<OverallMood> {
  const scriptSummary = script.scenes
    .map((s) => `Scene ${s.index + 1} (${s.durationSeconds}s): ${s.narration}`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a video production AI specializing in mood-based asset curation. Analyze this video script and suggest the right assets.

For EACH SCENE provide:
- mood: one of (dramatic, uplifting, melancholic, tense, peaceful, energetic, inspirational, corporate, mysterious, romantic)
- energy: low | medium | high
- brollKeywords: 3-5 specific, searchable stock footage terms (e.g. ["sunrise over mountains", "person meditating", "calm ocean waves"])
- sfxKeywords: 1-3 ambient sound effect terms (e.g. ["gentle rain", "forest birds"])

For the OVERALL VIDEO provide:
- mood: dominant mood of the whole video
- energy: overall energy level
- tempo: slow | medium | fast (for BGM selection)
- bgmKeywords: 3-4 music genre/style keywords for background music (e.g. ["cinematic orchestral", "emotional piano", "inspiring"])

Return ONLY valid JSON:
{
  "mood": "overall mood",
  "energy": "low|medium|high",
  "tempo": "slow|medium|fast",
  "bgmKeywords": ["keyword1", "keyword2", "keyword3"],
  "scenes": [
    {
      "sceneId": "scene-1",
      "mood": "dramatic",
      "energy": "high",
      "brollKeywords": ["city skyline at dusk", "busy street traffic", "people rushing"],
      "sfxKeywords": ["city ambience", "traffic noise"]
    }
  ]
}

Script:
${scriptSummary}

Return ONLY valid JSON. No markdown fences.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const cleaned = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned) as OverallMood;
}
