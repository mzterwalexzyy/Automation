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

function buildFallbackVisuals(
  raw: Array<{ narration: string; startSeconds: number; endSeconds: number }>,
  title: string
): { title: string; scenes: ScriptScene[] } {
  return {
    title,
    scenes: raw.map((r, i) => ({
      id: `scene-${i + 1}`,
      index: i,
      narration: r.narration,
      startSeconds: r.startSeconds,
      endSeconds: r.endSeconds,
      durationSeconds: r.endSeconds - r.startSeconds,
      visualDescription: r.narration,
    })),
  };
}

async function enrichWithVisuals(
  raw: Array<{ narration: string; startSeconds: number; endSeconds: number }>
): Promise<{ title: string; scenes: ScriptScene[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️  ANTHROPIC_API_KEY not set — using narration as visual descriptions');
    return buildFallbackVisuals(raw, 'True Crime Story');
  }

  try {
    const sceneList = raw.map((s, i) => `Scene ${i + 1}: "${s.narration}"`).join('\n');
    const result = await withRetry(async () => {
      const message = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are a video director. For each scene, write a specific visual description for b-roll stock footage search. Also provide a short video title.\n\nReturn ONLY valid JSON:\n{\n  "title": "short punchy video title",\n  "scenes": [\n    { "index": 0, "visualDescription": "specific b-roll description" }\n  ]\n}\n\nScenes:\n${sceneList}\n\nReturn ONLY valid JSON. No markdown fences.`,
          },
        ],
      });
      const content = message.content[0];
      if (content.type !== 'text') throw new Error('Unexpected Claude response');
      const cleaned = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned);
    });

    return {
      title: result.title ?? 'True Crime Story',
      scenes: raw.map((r, i) => ({
        id: `scene-${i + 1}`,
        index: i,
        narration: r.narration,
        startSeconds: r.startSeconds,
        endSeconds: r.endSeconds,
        durationSeconds: r.endSeconds - r.startSeconds,
        visualDescription: result.scenes[i]?.visualDescription ?? r.narration,
      })),
    };
  } catch (err) {
    console.warn(`   ⚠️  Claude API failed (${(err as Error).message}) — using narration as visual descriptions`);
    return buildFallbackVisuals(raw, 'True Crime Story');
  }
}

function buildSimplePlainFallback(scriptText: string): ParsedScript {
  const words = scriptText.trim().split(/\s+/);
  const wordsPerScene = 65;
  const scenes: ScriptScene[] = [];
  let start = 0;
  for (let i = 0; i < words.length; i += wordsPerScene) {
    const chunk = words.slice(i, i + wordsPerScene).join(' ');
    const durationSeconds = Math.round((chunk.split(/\s+/).length / 130) * 60);
    const end = start + durationSeconds;
    const idx = scenes.length;
    scenes.push({
      id: `scene-${idx + 1}`,
      index: idx,
      narration: chunk,
      startSeconds: start,
      endSeconds: end,
      durationSeconds,
      visualDescription: chunk,
    });
    start = end;
  }
  return { title: 'True Crime Story', scenes, totalDurationSeconds: start };
}

async function parsePlainScript(scriptText: string): Promise<ParsedScript> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️  ANTHROPIC_API_KEY not set — building simple scene breakdown');
    return buildSimplePlainFallback(scriptText);
  }

  try {
    return await withRetry(async () => {
      const message = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `Parse this script into scenes. Estimate timing at ~130 words per minute.\n\nReturn ONLY valid JSON:\n{\n  "title": "video title",\n  "scenes": [\n    {\n      "id": "scene-1",\n      "index": 0,\n      "narration": "text",\n      "startSeconds": 0,\n      "endSeconds": 8,\n      "durationSeconds": 8,\n      "visualDescription": "specific b-roll description for stock footage"\n    }\n  ],\n  "totalDurationSeconds": 60\n}\n\nScript:\n${scriptText}\n\nReturn ONLY valid JSON. No markdown.`,
          },
        ],
      });
      const content = message.content[0];
      if (content.type !== 'text') throw new Error('Unexpected Claude response');
      const cleaned = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned) as ParsedScript;
    });
  } catch (err) {
    console.warn('   ⚠️  Claude API failed — building simple scene breakdown');
    return buildSimplePlainFallback(scriptText);
  }
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
