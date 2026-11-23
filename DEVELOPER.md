# Developer Notes

## Base URL Warning & the Vite Config Hack

### The Problem

The app is deployed to GitHub Pages at a sub-path (`/unjazz/`). This means:

- **Production:** `https://abulka.github.io/unjazz/` — everything needs the `/unjazz/` prefix
- **Development:** `http://localhost:3000/` — Vite serves files from `public/` at root

The generate script (`scripts/generate-manifest.js`) bakes absolute `/unjazz/...` paths into `tracks.json` (for `artwork`, `url`, and `waveform` fields). The React code also hardcodes `/unjazz/...` in fetch calls (`Home.jsx`, `Album.jsx`). To make these work in dev, Vite's `base` must be set to `/unjazz/`, which strips the prefix from incoming requests before looking up files in `public/`.

### Current Fix (vite.config.js)

The `vite.config.js` contains a plugin that:
1. Suppresses Vite's warning about the base URL mismatch
2. Redirects `/` and `/unjazz` (no trailing slash) to `/unjazz/`

This works but is a hack — it papers over the underlying architecture issue.

### Approach B (The Proper Fix)

Instead of hardcoding `/unjazz/` in fetch calls and generated JSON, use Vite's built-in `import.meta.env.BASE_URL`. Vite injects this value automatically based on the `base` config:

- `npm run dev`: `base: '/'` → `import.meta.env.BASE_URL` = `'/'`
- `npm run build`: `base: '/unjazz/'` → `import.meta.env.BASE_URL` = `'/unjazz/'`

#### Changes Required

**1. React fetch calls** (`src/pages/Home.jsx`, `src/pages/Album.jsx`):

```js
// Before
fetch('/unjazz/metadata/tracks.json')

// After
fetch(`${import.meta.env.BASE_URL}metadata/tracks.json`)
// Or using a helper so we don't repeat it everywhere
```

**2. Generate script** (`scripts/generate-manifest.js`):

Don't bake the `basePath` prefix into `tracks.json`. Instead, let the React app prepend `import.meta.env.BASE_URL` at runtime. The script would output relative paths (e.g. `metadata/tracks.json`) and the audio URLs from GitHub Releases are already absolute, so they don't need the base path at all.

**3. Vite config** (`vite.config.js`):

Remove the hacky plugin. Use `command` to switch base dynamically:

```js
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/unjazz/' : '/',
  // ...
}))
```

#### Why Not Do It Now?

- Everything works — the vite.config hack is stable
- No risk of breaking production deployment
- The change is mechanical but touches multiple files
- The Cloudflare Worker proxy is unrelated to this issue (it only adds CORS headers for GitHub Release audio URLs)

#### When to Consider Approach B

- If the vite.config hack ever causes issues with a Vite upgrade
- If you add more fetch calls and keep duplicating the `/unjazz/` prefix
- If the warning pops up again due to a Vite behavior change

## m4a (AAC) Support

Album folders accept `.mp3` and `.m4a`. Each track in `tracks.json` carries a `format` field, and `src/context/PlayerContext.jsx` passes it to Howler (`format: [track.format || 'mp3']`). That is required because audio URLs are wrapped in the Cloudflare proxy (`...workers.dev/?url=...`), so Howler cannot infer the format from the extension.

### Suno's m4a downloads are NOT AAC

Suno's default `.m4a` downloads (all 38 in `~/Downloads/Suno Downloads`) contain **Opus in an MP4 container**. Chrome and Firefox can play Opus-in-MP4; **Safari and iOS cannot** (`canPlayType('audio/mp4; codecs="opus"')` returns false), and macOS `afinfo` reports a 0-second duration for them.

`generate-manifest.js` therefore probes every file with `ffprobe` and skips anything outside `SAFARI_SAFE_CODECS`:

```js
{ '.mp3': ['mp3'], '.m4a': ['aac', 'alac', 'mp3'] }
```

A skipped file is reported at the end of the run and is never uploaded. If `ffprobe` is missing the check is skipped with a warning. Upload failures now abort the run, so a track can never silently disappear from `tracks.json`.

Suno downloads usually include a `.wav` next to the `.m4a` — encode that once (single lossy generation, far better than transcoding the Opus):

```bash
ffmpeg -i "track.wav" -c:a aac -b:a 192k -movflags +faststart \
  -metadata title="Track Title" -metadata artist="Unjazz (Andy Bulka)" \
  "public/albums/Album Name/track.m4a"
```

### Waveforms for m4a

Homebrew's `audiowaveform` cannot read m4a, so `generateWaveform()` first tries it directly and, on failure, decodes to a temporary 22 kHz mono WAV with `ffmpeg` before generating peaks. Both tools are required for m4a; without them the deterministic fake waveform fallback is used.

### Per-track artwork

Each track shows its own cover art in the track list. `saveTrackArtwork()` reads the embedded picture from the audio file, downscales it to at most 512 px with `ffmpeg`, and writes it to `public/metadata/artwork/<hash>.<ext>`. The filename is a content hash, so identical covers shared by several tracks are stored once. Files are committed alongside `tracks.json`, since the deploy workflow reuses committed metadata.

When a file has no embedded picture (or the format is unsupported), the track falls back to the album cover. Orphaned artwork files are pruned on every generate run.

`artwork` is the track's own picture; album pages and album cards must use `albumArtwork`, which always points at the cover file in the album folder.

### Asset name normalization

GitHub rewrites release asset names (spaces become dots, parentheses and commas are stripped). `normalizeAssetName()` mirrors that so re-running generate recognises existing uploads instead of re-uploading them.

