import Anthropic from '@anthropic-ai/sdk';
import { ParsedScript } from '../types';

const client = new Anthropic();

export async function parseScript(scriptText: string): Promise<ParsedScript> {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a video production assistant. Parse the following script into scenes for video production.

For each scene, identify:
1. A unique ID (scene-1, scene-2, etc.)
2. The narration text for that scene
3. A specific visual description of what should be shown as b-roll footage (detailed enough to search stock video sites)
4. Estimated duration in seconds (based on speaking pace of ~130 words per minute)

Return ONLY a valid JSON object with this exact structure:
{
  "title": "concise video title based on script content",
  "scenes": [
    {
      "id": "scene-1",
      "index": 0,
      "narration": "exact narration text for this scene",
      "visualDescription": "specific visual description for b-roll search, e.g. 'person typing on laptop in coffee shop'",
      "durationSeconds": 8
    }
  ],
  "totalDurationSeconds": 60
}

Script:
${scriptText}

Return ONLY valid JSON. No markdown fences, no explanation.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const cleaned = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned) as ParsedScript;
}
