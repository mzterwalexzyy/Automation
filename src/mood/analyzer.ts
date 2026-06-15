import Anthropic from '@anthropic-ai/sdk';
import { ParsedScript, OverallMood } from '../types';

const client = new Anthropic();

function getKenRexKeywords(index: number): string[] {
  const keywords: Record<number, string[]> = {
    0:  ['small town main street aerial', 'rural midwest town', 'quiet american small town'],
    1:  ['courthouse exterior small town', 'dark rural road night', 'justice scales law'],
    2:  ['poverty rural america farmhouse', 'old abandoned house countryside', 'dirt road countryside'],
    3:  ['cattle farm livestock field', 'rural farm aerial', 'pickup truck dirt road'],
    4:  ['courtroom interior vintage', 'judge gavel courthouse', 'man silhouette dark doorway'],
    5:  ['grocery store vintage exterior', 'small town storefront 1970s', 'rural america street'],
    6:  ['empty courtroom benches', 'dark corridor building', 'anxious crowd waiting room'],
    7:  ['prison exterior fence bars', 'handcuffs arrest police', 'courthouse steps people'],
    8:  ['rifle silhouette dark dramatic', 'pickup truck parked storefront', 'man staring window surveillance'],
    9:  ['crowd gathering town hall meeting', 'american legion hall building', 'people walking into community building'],
    10: ['sheriff badge law enforcement rural', 'angry crowd town meeting', 'people arguing heated discussion'],
    11: ['men walking together determined crowd', 'small town bar exterior night', 'crowd moving street'],
    12: ['pickup truck parked parking lot', 'man sitting truck window', 'small town parking lot night'],
    13: ['crime scene police lights dramatic', 'shattered glass window dark', 'ambulance lights night rural'],
    14: ['police car flashing lights rural road', 'crowd standing silent street', 'crime scene investigation outdoor'],
    15: ['detective interviewing witness table', 'silent empty room investigation', 'police notepad questioning'],
    16: ['fbi federal building exterior', 'classified file folder documents', 'unsolved case evidence board'],
    17: ['lawyer courtroom suit briefcase', 'legal documents signing papers', 'court settlement handshake'],
    18: ['newspaper headline printing press', 'television news studio vintage', 'debate crowd journalists press'],
    19: ['small town street empty dusk', 'person looking away silence guilt', 'empty church interior quiet'],
    20: ['open book pages library', 'typewriter vintage writing journalism', 'author writing desk lamp'],
    21: ['film reel projector vintage cinema', 'old television broadcast news', 'world map global media coverage'],
    22: ['empty small town road sunset', 'cemetery gravestone dusk dramatic', 'silent road horizon darkness'],
  };
  return keywords[index] ?? ['crime scene investigation', 'dark rural town', 'courthouse exterior'];
}

function defaultMood(script: ParsedScript): OverallMood {
  return {
    mood: 'dramatic',
    energy: 'medium',
    tempo: 'slow',
    bgmKeywords: ['cinematic', 'dark', 'suspense', 'thriller'],
    scenes: script.scenes.map((s, i) => ({
      sceneId: s.id,
      mood: i < 8 ? 'dramatic' : i < 14 ? 'tense' : i < 18 ? 'mysterious' : 'melancholic',
      energy: 'medium',
      brollKeywords: getKenRexKeywords(i),
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
    console.warn('   ⚠️  ANTHROPIC_API_KEY not set — using curated b-roll keywords');
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
        messages: [{
          role: 'user',
          content: `You are a video production AI. Analyze this script and suggest assets.\n\nFor EACH SCENE provide:\n- mood: one of (dramatic, uplifting, melancholic, tense, peaceful, energetic, inspirational, corporate, mysterious, romantic)\n- energy: low | medium | high\n- brollKeywords: 3-5 specific searchable stock footage terms\n- sfxKeywords: 1-3 ambient sound effect terms\n\nReturn ONLY valid JSON. No markdown.\n\nScenes:\n${sceneList}`,
        }],
      });
      const content = message.content[0];
      if (content.type !== 'text') throw new Error('Unexpected Claude response');
      const cleaned = content.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned) as OverallMood;
    });
  } catch (err) {
    console.warn(`   ⚠️  Mood analysis failed — using curated b-roll keywords`);
    return defaultMood(script);
  }
}
