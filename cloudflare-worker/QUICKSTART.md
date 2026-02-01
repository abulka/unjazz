# Quick Start: Deploy CORS Proxy

## Step 1: Deploy to Cloudflare (5 minutes)

1. **Go to**: https://workers.cloudflare.com/
2. **Sign up** (free - no credit card needed for 100k requests/day)
3. Click **"Create a Service"**
4. Name it: `unjazz-audio-proxy`
5. Click **"Quick Edit"**
6. **Replace** all code with contents of `worker.js`
7. Click **"Save and Deploy"**
8. **Copy** your worker URL (e.g., `https://unjazz-audio-proxy.your-subdomain.workers.dev`)

## Step 2: Configure Your Project

Edit `.env`:
```bash
CORS_PROXY_URL=https://unjazz-audio-proxy.your-subdomain.workers.dev
```

## Step 3: Test It

Open `test.html` in your browser:
1. Paste your worker URL
2. Paste any GitHub release MP3 URL from your repo
3. Click "Test Proxy"
4. Should see ✅ and audio player

## Step 4: Regenerate Metadata

```bash
npm run generate
```

This wraps all GitHub URLs with your proxy.

## Step 5: Deploy

```bash
git add .
git commit -m "Add CORS proxy for Safari compatibility"
git push
```

## Testing Safari

1. Wait for GitHub Actions to deploy (~2 minutes)
2. Open https://abulka.github.io/unjazz/ in Safari
3. Try playing a track - should work! 🎉

## Troubleshooting

**Worker URL not working?**
- Make sure you copied the full URL including `https://`
- Test with `test.html` first

**Still not working in Safari?**
- Check browser console for errors
- Verify CORS headers with: `curl -I "YOUR_WORKER_URL?url=GITHUB_URL"`
- Should see `Access-Control-Allow-Origin: *`

**Chrome broke?**
- The proxy works in Chrome too
- If issues, check Howler.js settings in PlayerContext.jsx

## Cost

- Free tier: 100,000 requests/day
- Each track play = ~30-50 requests (streaming chunks)
- = ~2,000-3,000 plays/day free
- Way more than you need for a personal site

## How It Works

```
Safari → Your Site → Cloudflare Worker → GitHub → Cloudflare → Safari
                      (adds CORS)
```

The worker:
- Runs on Cloudflare's edge (fast!)
- Only allows your GitHub repo URLs
- Adds CORS headers Safari needs
- Handles range requests for seeking
- Caches for 1 hour
