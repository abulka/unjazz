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
