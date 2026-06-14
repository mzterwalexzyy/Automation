import Anthropic from '@anthropic-ai/sdk';
import { ParsedScript, ScriptScene } from '../types';

const client = new Anthropic();

function toSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

function isTimestamped(text: string): boolean {
  return /\[\d+:\d+/.test(text);
}

function extractTimestampedScenes(
  text: string
): Array<{ narration: string; startSeconds: number; endSeconds: number }> {
  const scenes: Array<{ narration: string; startSeconds: number; endSeconds: number }> = [];

  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const match = line.match(
      /^\[(\d+:\d+(?::\d+)?)\s*[-–—]\s*(\d+:\d+(?::\d+)?)\]\s*(.+)/
    );
    if (match) {
      scenes.push({
        startSeconds: toSeconds(match[1]),
        endSeconds: toSeconds(match[2]),
        narration: match[3].trim(),
      });
    }
  }
  return scenes;
}

async function enrichWithVisuals(
  raw: Array<{ narration: string; startSeconds: number; endSeconds: number }>
): Promise<{ title: string; scenes: ScriptScene[] }> {
  const sceneList = raw
    .map((s, i) => `Scene ${i + 1}: "${s.narration}"`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a video director. For each scene, write a specific visual description for b-roll stock footage search. Also provide a short video title.

Return ONLY valid JSON:
{
  "title": "short punchy video title",
  "scenes": [
    { "index": 0, "visualDescription": "specific b-roll description, e.g. 'person typing on laptop at night in dark office'" }
  ]
}

Scenes:
${sceneList}

Return ONLY valid JSON. No markdown fences.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response');
  const cleaned = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(cleaned);

  return {
    title: parsed.title ?? 'My Video',
    scenes: raw.map((r, i) => ({
      id: `scene-${i + 1}`,
      index: i,
      narration: r.narration,
      startSeconds: r.startSeconds,
      endSeconds: r.endSeconds,
      durationSeconds: r.endSeconds - r.startSeconds,
      visualDescription: parsed.scenes[i]?.visualDescription ?? r.narration,
    })),
  };
}

async function parsePlainScript(scriptText: string): Promise<ParsedScript> {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Parse this script into scenes. Estimate timing at ~130 words per minute.

Return ONLY valid JSON:
{
  "title": "video title",
  "scenes": [
    {
      "id": "scene-1",
      "index": 0,
      "narration": "text",
      "startSeconds": 0,
      "endSeconds": 8,
      "durationSeconds": 8,
      "visualDescription": "specific b-roll description for stock footage"
    }
  ],
  "totalDurationSeconds": 60
}

Script:
${scriptText}

Return ONLY valid JSON. No markdown.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response');
  const cleaned = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(cleaned) as ParsedScript;
}

export async function parseScript(scriptText: string): Promise<ParsedScript> {
  if (isTimestamped(scriptText)) {
    console.log('   ⏱  Timestamped script detected — using exact timings');
    const raw = extractTimestampedScenes(scriptText);
    if (raw.length === 0) {
      throw new Error('No scenes found. Use format: [MM:SS - MM:SS] Your narration text here');
    }
    const { title, scenes } = await enrichWithVisuals(raw);
    return {
      title,
      scenes,
      totalDurationSeconds: scenes[scenes.length - 1]?.endSeconds ?? 0,
    };
  }

  console.log('   📝 Plain script — Claude will estimate scene timing');
  return parsePlainScript(scriptText);
}
