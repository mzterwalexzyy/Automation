# auto-video-remotion

Fully automated pipeline that turns a script into a ready-to-upload video.

```
script.txt  →  [Claude: parse + mood]  →  [Pexels/Freesound/Pixabay: assets]  →  [Remotion: render]  →  video.mp4
```

## Pipeline

1. **Script Parser** — Claude splits your script into timed scenes with visual descriptions
2. **Mood Analyzer** — Claude extracts mood, energy, and search keywords per scene
3. **Asset Sourcer** — Downloads b-roll (Pexels), SFX (Freesound), BGM (Pixabay Music)
4. **Remotion Composer** — Assembles scenes with Ken Burns zoom, crossfades, text overlays, and layered audio
5. **Renderer** — Exports 1920×1080 H.264 MP4

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get API keys (all free tiers available)

| Service | Purpose | Link |
|---|---|---|
| Anthropic | Script parsing & mood analysis | https://console.anthropic.com |
| Pexels | B-roll video & images | https://www.pexels.com/api |
| Freesound | Sound effects | https://freesound.org/apiv2 |
| Pixabay | Background music | https://pixabay.com/api/docs |

### 3. Configure environment

```bash
cp .env.example .env
# Fill in your API keys
```

### 4. Run

```bash
npm start scripts/example-script.txt
```

Output lands in `output/<video-title>.mp4`.

## Studio Mode

Open Remotion Studio to preview compositions:

```bash
npm run studio
```

## Project Structure

```
src/
  index.ts                    # CLI entry point
  types/index.ts              # Shared types
  script/parser.ts            # Claude: script → scenes
  mood/analyzer.ts            # Claude: scenes → mood + keywords
  assets/
    pexels.ts                 # Pexels video/image search
    freesound.ts              # Freesound SFX search
    pixabay.ts                # Pixabay BGM search
    downloader.ts             # File downloader with caching
  pipeline/orchestrator.ts    # Asset sourcing coordinator
  remotion/
    Root.tsx                  # Remotion composition root
    render.ts                 # Bundler + renderer
    compositions/
      MainVideo.tsx           # Top-level composition
      Scene.tsx               # Per-scene component (video/image + text + SFX)
```

## Requirements

- Node.js 18+
- Chrome/Chromium (used by Remotion for rendering)
