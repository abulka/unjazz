# Unjazz - Quick Start Guide

## 🎯 Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Add Your First Album

Create a folder in `public/albums/` and add MP3 files:

```bash
mkdir -p public/albums/my-first-album
```

Add files:
- `track1.mp3` - Your audio file
- `cover.jpg` - Album artwork (optional)

### 3. Generate Metadata

```bash
npm run generate
```

This will:
- Read ID3 tags from your MP3s
- Generate waveform data
- Create `public/metadata/tracks.json`

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser!

---

## 📁 Album Folder Structure

```
public/albums/
├── summer-2026/
│   ├── 01-sunset-dreams.mp3
│   ├── 02-ocean-waves.mp3
│   └── cover.jpg
└── winter-chill/
    ├── 01-snowy-night.mp3
    └── cover.jpg
```

**Tips:**
- Album name = folder name
- Cover art: any `.jpg`, `.jpeg`, `.png`, or `.webp` file
- MP3 ID3 tags are read automatically
- Tracks sorted by track number or filename

---

## 🎵 Editing MP3 Metadata

Use a tool like:
- **macOS:** Music.app or [Kid3](https://kid3.kde.org/)
- **Windows:** [Mp3tag](https://www.mp3tag.de/en/)
- **Linux:** [EasyTAG](https://wiki.gnome.org/Apps/EasyTag)

Set these fields:
- **Title** - Track name
- **Artist** - Artist name
- **Album** - Album name
- **Track Number** - Order in album
- **Comment** - Album description (optional)

After editing, run `npm run generate` again.

---

## 🚀 Deploy to GitHub Pages

### First-Time Setup

1. **Create GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/unjazz.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: **GitHub Actions**

3. **Update configuration:**
   
   Edit `vite.config.js`:
   ```javascript
   base: '/unjazz/',  // Change to your repo name
   ```
   
   Edit `src/main.jsx`:
   ```javascript
   <BrowserRouter basename="/unjazz">  // Change to your repo name
   ```

4. **Push to deploy:**
   ```bash
   git add .
   git commit -m "Configure for GitHub Pages"
   git push
   ```

Your site will be live at: `https://username.github.io/unjazz/`

---

## 🔄 Updating Your Music

### Add New Tracks

1. Add MP3s to album folder
2. Run `npm run generate`
3. Commit and push:
   ```bash
   git add public/metadata/
   git commit -m "Add new tracks"
   git push
   ```

### Remove Tracks

1. Delete MP3 files from album folder
2. Run `npm run generate`
3. Commit and push

---

## 🎨 Customization

### Change Colors

Edit `tailwind.config.js`:
```javascript
colors: {
  soundcloud: {
    orange: '#ff5500',      // Brand color
    'orange-dark': '#ff3300',
  }
}
```

### Edit About Page

Edit `src/pages/About.jsx`

### Change Site Name

Edit `index.html` (title tag) and `src/components/Layout.jsx` (header)

---

## 🐛 Troubleshooting

### "No albums found"
- Check that MP3 files are in `public/albums/folder-name/`
- Run `npm run generate`
- Check console for errors

### Waveforms not showing
- Install `audiowaveform` CLI: `brew install audiowaveform` (macOS)
- Without it, placeholder waveforms are generated

### Audio not playing
- Check browser console for CORS errors
- Verify MP3 file paths in `public/metadata/tracks.json`
- Test with different browser

### GitHub Pages 404 error
- Verify `base` in `vite.config.js` matches repo name
- Check `basename` in `src/main.jsx` matches
- Wait 2-3 minutes after push for deployment

---

## 💡 Tips

1. **Keep MP3 files small:** 128-192kbps is plenty for web streaming
2. **Use consistent naming:** Helps with automatic sorting
3. **Add cover art:** Makes your site look professional
4. **Test locally first:** Run `npm run dev` before deploying
5. **Commit metadata only:** Don't commit large MP3 files (use `.gitignore`)

---

## 🔗 Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run generate     # Generate metadata
npm run deploy       # Deploy to GitHub Pages
npm run preview      # Preview production build locally
```

---

Need help? Check the [full README](README.md) or open an issue!
