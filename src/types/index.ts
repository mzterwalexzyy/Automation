export interface ScriptScene {
  id: string;
  index: number;
  narration: string;
  visualDescription: string;
  durationSeconds: number;
}

export interface ParsedScript {
  title: string;
  scenes: ScriptScene[];
  totalDurationSeconds: number;
}

export interface SceneMood {
  sceneId: string;
  mood: string;
  energy: 'low' | 'medium' | 'high';
  brollKeywords: string[];
  sfxKeywords: string[];
}

export interface OverallMood {
  mood: string;
  energy: 'low' | 'medium' | 'high';
  tempo: 'slow' | 'medium' | 'fast';
  bgmKeywords: string[];
  scenes: SceneMood[];
}

export interface MediaAsset {
  id: string;
  url: string;
  localPath: string;
  type: 'video' | 'image' | 'audio';
  durationSeconds?: number;
  width?: number;
  height?: number;
}

export interface SceneAssets {
  sceneId: string;
  background: MediaAsset;
  sfx: MediaAsset[];
}

export interface VideoAssetBundle {
  scenes: SceneAssets[];
  bgm: MediaAsset;
}

export interface RemotionSceneData {
  id: string;
  narration: string;
  visualDescription: string;
  durationFrames: number;
  backgroundPath: string;
  backgroundType: 'video' | 'image';
  sfxPaths: string[];
}

export interface RemotionVideoData {
  title: string;
  fps: number;
  scenes: RemotionSceneData[];
  bgmPath: string;
  totalFrames: number;
}
