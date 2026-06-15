export interface ScriptScene {
  id: string;
  index: number;
  narration: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  visualDescription: string;
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
  backgrounds: MediaAsset[];
  sfx: MediaAsset[];
}

export interface VideoAssetBundle {
  scenes: SceneAssets[];
  bgm: MediaAsset;
}

export interface CaptionWord {
  word: string;
  startSeconds: number;
  endSeconds: number;
}

export interface RemotionSceneData {
  id: string;
  narration: string;
  durationFrames: number;
  backgroundPaths: string[];
  backgroundTypes: Array<'video' | 'image'>;
  sfxPaths: string[];
  mood: string;
  captionWords: CaptionWord[];
}

export interface RemotionVideoData {
  title: string;
  fps: number;
  scenes: RemotionSceneData[];
  bgmPath: string;
  voPath: string;
  totalFrames: number;
}
