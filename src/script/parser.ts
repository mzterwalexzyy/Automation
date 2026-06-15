import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedScript, ScriptScene } from '../types';

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment');
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.0-flash' });
}

function cleanJson(text: string): string {
  return text.trim().replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
}

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
    const match = line.match(/^\[(\d+:\d+(?::\d+)?)\s*[-–—]\s*(\d+:\d+(?::\d+)?)\]\s*(.+)/);
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

async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err?.message?.includes('429') || String(err).includes('429');
      if (is429 && attempt < maxRetries) {
        const waitMs = 45000;
        console.log(`   ⏳ Gemini rate limit — waiting 45s before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini retries exhausted');
}

async function enrichWithVisuals(
  raw: Array<{ narration: string; startSeconds: number; endSeconds: number }>
): Promise<{ title: string; scenes: ScriptScene[] }> {
  const sceneList = raw.map((s, i) => `Scene ${i + 1}: "${s.narration}"`).join('\n');

  const fallback = () => ({
    title: 'True Crime Story',
    scenes: raw.map((r, i) => ({
      id: `scene-${i + 1}`,
      index: i,
      narration: r.narration,
      startSeconds: r.startSeconds,
      endSeconds: r.endSeconds,
      durationSeconds: r.endSeconds - r.startSeconds,
      visualDescription: r.narration,
    })),
  });

  try {
    const result = await withGeminiRetry(() =>
      getModel().generateContent(
        `You are a video director. For each scene write a specific visual description for b-roll stock footage search. Also give a short punchy video title.\n\nReturn ONLY valid JSON (no markdown):\n{\n  "title": "short punchy title",\n  "scenes": [\n    { "index": 0, "visualDescription": "specific b-roll description e.g. \'detective examining crime scene photos on dark desk\'" }\n  ]\n}\n\nScenes:\n${sceneList}`
      )
    );

    const parsed = JSON.parse(cleanJson(result.response.text()));
    return {
      title: parsed.title ?? 'True Crime Story',
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
  } catch (err: any) {
    console.log('   ⚠️  Gemini unavailable — using narration as visual description');
    return fallback();
  }
}

async function parsePlainScript(scriptText: string): Promise<ParsedScript> {
  const result = await withGeminiRetry(() =>
    getModel().generateContent(
      `Parse this script into scenes. Estimate timing at ~130 words per minute.\n\nReturn ONLY valid JSON (no markdown):\n{\n  "title": "video title",\n  "scenes": [\n    {\n      "id": "scene-1",\n      "index": 0,\n      "narration": "text",\n      "startSeconds": 0,\n      "endSeconds": 8,\n      "durationSeconds": 8,\n      "visualDescription": "specific b-roll description for stock footage"\n    }\n  ],\n  "totalDurationSeconds": 60\n}\n\nScript:\n${scriptText}`
    )
  );
  return JSON.parse(cleanJson(result.response.text())) as ParsedScript;
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

  console.log('   📝 Plain script — Gemini will estimate scene timing');
  return parsePlainScript(scriptText);
}
