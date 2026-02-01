# Cloudflare Worker Setup for Unjazz CORS Proxy

## What This Does
Proxies GitHub Release audio files and adds CORS headers so Safari can play them.

## Setup Steps

### 1. Create Cloudflare Account
- Go to https://workers.cloudflare.com/
- Sign up (free tier: 100,000 requests/day)

### 2. Deploy Worker
1. Click "Create a Service"
2. Name it: `unjazz-audio-proxy` (or your choice)
3. Click "Quick Edit"
4. Replace the code with the contents of `worker.js`
5. Click "Save and Deploy"

### 3. Get Your Worker URL
After deployment, you'll get a URL like:
```
https://unjazz-audio-proxy.your-subdomain.workers.dev
```

### 4. Configure Your Project
Add to your `.env` file:
```bash
CORS_PROXY_URL=https://unjazz-audio-proxy.your-subdomain.workers.dev
```

### 5. Regenerate Metadata
```bash
npm run generate
```

This will wrap all GitHub Release URLs with your CORS proxy.

## How It Works

**Before:**
```
https://github.com/abulka/unjazz/releases/download/v1.0/song.mp3
```

**After:**
```
https://unjazz-audio-proxy.your-subdomain.workers.dev/?url=https://github.com/abulka/unjazz/releases/download/v1.0/song.mp3
```

The worker:
- Validates the URL is a GitHub release
- Fetches the audio file server-side
- Adds CORS headers
- Forwards range requests (for seeking)
- Caches for 1 hour

## Testing

Test your worker URL:
```bash
curl -I "https://your-worker.workers.dev/?url=https://github.com/abulka/unjazz/releases/download/v1.0/test.mp3"
```

You should see:
```
Access-Control-Allow-Origin: *
```

## Free Tier Limits
- 100,000 requests/day
- ~3,000 plays/day (assuming 30 requests per play for streaming)
- More than enough for a personal music site

## Security
- Only allows GitHub release URLs (prevents abuse)
- No authentication required (GitHub releases are public)
- Rate limiting handled by Cloudflare

## Optional: Custom Domain
Instead of `*.workers.dev`, you can use your own domain:
1. Add domain to Cloudflare
2. Go to Worker → Settings → Triggers
3. Add Custom Domain
