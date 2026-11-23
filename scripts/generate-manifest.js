import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { parseFile } from 'music-metadata'
import { Octokit } from '@octokit/rest'
import { exec } from 'child_process'
import { promisify } from 'util'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const execAsync = promisify(exec)

// Configuration
const CONFIG = {
  albumsDir: './public/albums',
  metadataDir: './public/metadata',
  basePath: process.env.BASE_PATH || '/unjazz', // Base path for URLs
  githubRepo: process.env.GITHUB_REPO || '', // Format: 'username/repo-name'
  githubToken: process.env.GITHUB_TOKEN || '',
  releaseTag: process.env.RELEASE_TAG || 'v1.0',
  useGithubReleases: process.env.USE_GITHUB_RELEASES === 'true',
  corsProxyUrl: process.env.CORS_PROXY_URL || '' // Cloudflare Worker URL for CORS
}

// Initialize GitHub API client
const octokit = CONFIG.githubToken ? new Octokit({ auth: CONFIG.githubToken }) : null

// Audio formats accepted in album folders. The value is the Howler format string.
const AUDIO_EXTENSIONS = ['.mp3', '.m4a']

// Embedded per-track artwork is written here, so each track can show its own cover.
const ARTWORK_DIR = './public/metadata/artwork'
const ARTWORK_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}
// Thumbnails are small, so cap stored artwork to keep the deploy light.
const ARTWORK_MAX_DIMENSION = 512

// Codecs Safari can decode per container. Suno's default m4a downloads are
// Opus-in-MP4, which Safari/iOS refuse to play, so we reject those early.
const SAFARI_SAFE_CODECS = {
  '.mp3': ['mp3'],
  '.m4a': ['aac', 'alac', 'mp3']
}

/**
 * Simple deterministic hash function for seeding
 */
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Seeded random number generator
 */
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

/**
 * Probe the audio codec with ffprobe (returns null if ffprobe is unavailable)
 */
async function probeAudioCodec(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nw=1:nk=1 "${filePath}"`
    )
    return stdout.trim().toLowerCase() || null
  } catch (error) {
    return null
  }
}

/**
 * Check whether a container/codec combination plays in Safari/iOS
 */
function isSafariPlayable(extension, codec) {
  if (!codec) return true // cannot verify without ffprobe; allow it
  const allowed = SAFARI_SAFE_CODECS[extension]
  return !allowed || allowed.includes(codec)
}

/**
 * Generate waveform data from an audio file
 * Returns array of normalized amplitudes (0-1)
 */
async function generateWaveform(filePath, trackId, samples = 500) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unjazz-waveform-'))
  const outputPath = path.join(tmpDir, 'peaks.json')

  try {
    try {
      // audiowaveform handles mp3 directly but cannot read m4a/mp4 on brew builds
      await execAsync(`audiowaveform -i "${filePath}" -o "${outputPath}" --pixels-per-second 20 --bits 8`)
    } catch (directError) {
      // Decode via ffmpeg to wav first, then let audiowaveform read that
      console.log(`    … audiowaveform could not read ${path.basename(filePath)}, decoding via ffmpeg`)
      const wavPath = path.join(tmpDir, 'decoded.wav')
      await execAsync(
        `ffmpeg -hide_banner -loglevel error -y -i "${filePath}" -ac 1 -ar 22050 -c:a pcm_s16le "${wavPath}"`
      )
      await execAsync(`audiowaveform -i "${wavPath}" -o "${outputPath}" --pixels-per-second 20 --bits 8`)
    }

    const waveformData = JSON.parse(await fs.readFile(outputPath, 'utf-8'))

    // audiowaveform returns min/max pairs, we'll use max values for amplitude
    const data = waveformData.data
    const maxValues = []
    for (let i = 0; i < data.length; i += 2) {
      maxValues.push(Math.abs(data[i + 1])) // Use max value from each pair
    }

    // Resample to fixed length for consistent display
    const resampled = []
    const step = maxValues.length / samples
    for (let i = 0; i < samples; i++) {
      const index = Math.floor(i * step)
      resampled.push(maxValues[index] || 0)
    }

    // Normalize to 0-1 range
    const max = Math.max(...resampled)
    return resampled.map(v => v / max)
  } catch (error) {
    // Fallback: generate deterministic waveform based on filename
    console.warn(`Audiowaveform not available for ${filePath}, using deterministic fallback`)
    const seed = hashString(trackId)
    return Array.from({ length: samples }, (_, i) => {
      return seededRandom(seed + i) * 0.5 + 0.3
    })
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Normalize filename for GitHub asset comparison
 * GitHub converts spaces to dots and strips some punctuation, including
 * parentheses and commas
 */
function normalizeAssetName(filename) {
  return filename
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[(),]/g, '')
}

/**
 * Wrap URL with CORS proxy if configured
 * This enables Safari compatibility with GitHub Releases
 */
function wrapWithCorsProxy(url) {
  if (!url) return url
  if (!CONFIG.corsProxyUrl || !url.startsWith('https://github.com/')) {
    return url
  }
  return `${CONFIG.corsProxyUrl}?url=${encodeURIComponent(url)}`
}

/**
 * Get or create GitHub Release
 */
async function getOrCreateRelease() {
  if (!octokit || !CONFIG.githubRepo) {
    return null
  }

  const [owner, repo] = CONFIG.githubRepo.split('/')
  
  try {
    // Check if release exists
    const release = await octokit.repos.getReleaseByTag({
      owner,
      repo,
      tag: CONFIG.releaseTag
    })
    return release.data
  } catch (err) {
    // Create release if it doesn't exist
    const release = await octokit.repos.createRelease({
      owner,
      repo,
      tag_name: CONFIG.releaseTag,
      name: `Audio Files ${CONFIG.releaseTag}`,
      body: 'Audio files for Unjazz music player',
      draft: false,
      prerelease: false
    })
    return release.data
  }
}

/**
 * Get list of assets in the release
 */
async function getReleaseAssets(release) {
  if (!octokit || !CONFIG.githubRepo) {
    return []
  }

  const [owner, repo] = CONFIG.githubRepo.split('/')
  
  try {
    const { data: assets } = await octokit.repos.listReleaseAssets({
      owner,
      repo,
      release_id: release.id,
      per_page: 100
    })
    return assets
  } catch (error) {
    console.error('Error fetching release assets:', error.message)
    return []
  }
}

/**
 * Delete asset from release
 */
async function deleteReleaseAsset(assetId) {
  if (!octokit || !CONFIG.githubRepo) {
    return false
  }

  const [owner, repo] = CONFIG.githubRepo.split('/')
  
  try {
    await octokit.repos.deleteReleaseAsset({
      owner,
      repo,
      asset_id: assetId
    })
    return true
  } catch (error) {
    console.error(`Error deleting asset ${assetId}:`, error.message)
    return false
  }
}

/**
 * Upload file to GitHub Release
 */
async function uploadToGitHubRelease(filePath, fileName, release) {
  if (!octokit || !CONFIG.githubRepo) {
    console.warn('GitHub credentials not configured, skipping upload')
    return null
  }

  const [owner, repo] = CONFIG.githubRepo.split('/')
  
  try {
    // Upload asset
    const fileContent = await fs.readFile(filePath)
    const uploadResponse = await octokit.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: release.id,
      name: fileName,
      data: fileContent
    })

    return uploadResponse.data.browser_download_url
  } catch (error) {
    console.error(`Error uploading ${fileName} to GitHub:`, error.message)
    return null
  }
}

/**
 * Extract metadata from MP3 file
 */
async function extractMetadata(filePath, albumName) {
  try {
    const metadata = await parseFile(filePath)
    const fileName = path.basename(filePath)
    const fileId = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/\s+/g, '-')

    return {
      id: fileId,
      title: metadata.common.title || fileName.replace(/\.[^/.]+$/, ''),
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || albumName,
      albumDescription: (() => {
        const comment = metadata.common.comment?.[0]
        if (!comment) return ''
        const text = comment.text || comment
        if (typeof text !== 'string') return ''
        if (comment.descriptor?.startsWith?.('iTun')) return ''
        return text
      })(),
      duration: metadata.format.duration || 0,
      filename: fileName,
      format: path.extname(fileName).slice(1).toLowerCase(),
      trackNumber: metadata.common.track?.no || 0,
      // Kept out of tracks.json; consumed by saveTrackArtwork
      picture: metadata.common.picture?.[0] || null
    }
  } catch (error) {
    console.error(`Error reading metadata from ${filePath}:`, error.message)
    return null
  }
}

/**
 * Save a track's embedded cover art as a static file and return its URL.
 * Files are content-hashed so repeated covers across tracks are stored once.
 * Returns null when the file has no artwork we can handle.
 */
async function saveTrackArtwork(picture, expected) {
  if (!picture?.data) return null

  const format = (picture.format || '').toLowerCase()
  const extension = ARTWORK_EXTENSIONS[format]
  if (!extension) {
    console.warn(`    ⚠️  Unsupported embedded artwork format: ${format || 'unknown'}`)
    return null
  }

  const original = Buffer.from(picture.data)
  const hash = crypto.createHash('sha1').update(original).digest('hex').slice(0, 16)
  const fileName = `${hash}.${extension}`
  const filePath = path.join(ARTWORK_DIR, fileName)
  const url = `${CONFIG.basePath}/metadata/artwork/${fileName}`
  expected.add(fileName)

  try {
    await fs.access(filePath)
    return url
  } catch {
    // Not written yet — create it below
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unjazz-artwork-'))
  try {
    const sourcePath = path.join(tmpDir, `source.${extension}`)
    const downscaledPath = path.join(tmpDir, `downscaled.${extension}`)
    await fs.writeFile(sourcePath, original)

    try {
      const quality = extension === 'jpg' ? '-q:v 4 ' : ''
      await execAsync(
        `ffmpeg -hide_banner -loglevel error -y -i "${sourcePath}" ` +
        `-vf "scale=w='min(${ARTWORK_MAX_DIMENSION},iw)':h='min(${ARTWORK_MAX_DIMENSION},ih)':force_original_aspect_ratio=decrease" ` +
        `${quality}"${downscaledPath}"`
      )
      await fs.copyFile(downscaledPath, filePath)
    } catch (error) {
      // ffmpeg missing or unable to decode this cover; keep the original bytes
      await fs.writeFile(filePath, original)
    }
  } catch (error) {
    // A broken cover must not fail the whole manifest; fall back to album artwork
    console.warn(`    ⚠️  Could not save embedded artwork, using album cover: ${error.message}`)
    expected.delete(fileName)
    return null
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }

  return url
}

/**
 * Delete artwork files that no longer belong to any track
 */
async function pruneOrphanedArtwork(expected) {
  let files
  try {
    files = await fs.readdir(ARTWORK_DIR)
  } catch {
    return
  }

  let removed = 0
  for (const file of files) {
    if (expected.has(file)) continue
    await fs.rm(path.join(ARTWORK_DIR, file), { force: true })
    removed++
  }

  if (removed > 0) {
    console.log(`🧹 Removed ${removed} orphaned artwork file(s)`)
  }
}

/**
 * Process all albums and generate metadata
 */
async function generateManifest() {
  console.log('🎵 Generating music manifest...\n')

  // Ensure directories exist
  await fs.mkdir(CONFIG.metadataDir, { recursive: true })
  await fs.mkdir(path.join(CONFIG.metadataDir, 'waveforms'), { recursive: true })
  await fs.mkdir(ARTWORK_DIR, { recursive: true })

  const tracks = []
  const waveforms = {}
  const expectedAssets = new Set() // Track what should exist in release
  const expectedArtwork = new Set() // Track which artwork files are still in use

  // Get release if using GitHub Releases
  let release = null
  let existingAssets = []
  if (CONFIG.useGithubReleases) {
    console.log('📦 Fetching GitHub Release...')
    release = await getOrCreateRelease()
    if (release) {
      existingAssets = await getReleaseAssets(release)
      console.log(`   Found ${existingAssets.length} existing assets\n`)
    }
  }

  const albumsWithoutArtwork = []
  const skippedFiles = []

  try {
    // Read albums directory
    const albums = await fs.readdir(CONFIG.albumsDir)

    for (const albumDir of albums) {
      const albumPath = path.join(CONFIG.albumsDir, albumDir)
      const stat = await fs.stat(albumPath)

      if (!stat.isDirectory() || albumDir.startsWith('.')) continue

      console.log(`📁 Processing album: ${albumDir}`)

      // Find album artwork
      const files = await fs.readdir(albumPath)
      const artworkFile = files.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      let artworkUrl = null

      if (artworkFile) {
        const artworkAssetName = `${albumDir}-${artworkFile}`
        const normalizedAssetName = normalizeAssetName(artworkAssetName)
        expectedAssets.add(normalizedAssetName)
        
        if (CONFIG.useGithubReleases) {
          const existingAsset = existingAssets.find(a => normalizeAssetName(a.name) === normalizedAssetName)
          if (existingAsset) {
            console.log(`   ✓ Artwork already uploaded: ${artworkFile}`)
            artworkUrl = existingAsset.browser_download_url
          } else {
            console.log(`   ⬆️  Uploading artwork: ${artworkFile}`)
            artworkUrl = await uploadToGitHubRelease(
              path.join(albumPath, artworkFile),
              artworkAssetName,
              release
            )
          }
        } else {
          artworkUrl = `${CONFIG.basePath}/albums/${albumDir}/${artworkFile}`
        }
      } else {
        console.warn(`   ⚠️  No artwork found — album will use a fallback icon`)
        albumsWithoutArtwork.push(albumDir)
      }

      // Process supported audio files (mp3, m4a)
      const audioFiles = files.filter(f => AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()))

      for (const audioFile of audioFiles) {
        const audioPath = path.join(albumPath, audioFile)
        const extension = path.extname(audioFile).toLowerCase()
        console.log(`  🎵 Processing: ${audioFile}`)

        // Reject containers/codecs that Safari and iOS cannot play (e.g. Suno's
        // Opus-in-MP4 m4a downloads) before anything is uploaded
        const codec = await probeAudioCodec(audioPath)
        if (!isSafariPlayable(extension, codec)) {
          console.error(`    ❌ Skipping: ${codec} audio in a ${extension} container is not playable in Safari/iOS`)
          console.error(`       Replace it with a WAV/MP3, or encode the WAV to AAC m4a (see DEVELOPER.md)`)
          skippedFiles.push(audioFile)
          continue
        }

        // Extract metadata
        const metadata = await extractMetadata(audioPath, albumDir)
        if (!metadata) continue

        // Prefer the track's own embedded cover art, fall back to the album cover
        const embeddedArtworkUrl = await saveTrackArtwork(metadata.picture, expectedArtwork)
        delete metadata.picture

        // Generate or upload audio URL
        const audioAssetName = `${albumDir}-${audioFile}`
        const normalizedAudioName = normalizeAssetName(audioAssetName)
        expectedAssets.add(normalizedAudioName)
        let audioUrl

        if (CONFIG.useGithubReleases) {
          // Check if already exists (compare normalized names)
          const existingAsset = existingAssets.find(a => normalizeAssetName(a.name) === normalizedAudioName)
          if (existingAsset) {
            console.log(`    ✓ Already uploaded`)
            audioUrl = existingAsset.browser_download_url
          } else {
            console.log(`    ⬆️  Uploading to GitHub Releases...`)
            audioUrl = await uploadToGitHubRelease(audioPath, audioAssetName, release)
            if (!audioUrl) {
              // Never write a manifest that quietly omits a track
              throw new Error(`Failed to upload ${audioFile} to the GitHub release`)
            }
          }
        } else {
          audioUrl = `${CONFIG.basePath}/albums/${albumDir}/${audioFile}`
        }

        // Generate waveform (check if already exists to avoid re-processing)
        const waveformPath = path.join(CONFIG.metadataDir, 'waveforms', `${metadata.id}.json`)
        let waveformData

        try {
          // Try to load existing waveform
          const existingWaveform = await fs.readFile(waveformPath, 'utf-8')
          waveformData = JSON.parse(existingWaveform)
          console.log(`    ✓ Using cached waveform`)
        } catch (error) {
          // Generate new waveform if not cached
          console.log(`    🌊 Generating waveform...`)
          waveformData = await generateWaveform(audioPath, metadata.id)

          // Save individual waveform file
          await fs.writeFile(waveformPath, JSON.stringify(waveformData))
        }

        waveforms[metadata.id] = waveformData

        // Add track to manifest
        tracks.push({
          ...metadata,
          url: wrapWithCorsProxy(audioUrl),
          artwork: embeddedArtworkUrl || wrapWithCorsProxy(artworkUrl),
          albumArtwork: wrapWithCorsProxy(artworkUrl),
          waveform: `${CONFIG.basePath}/metadata/waveforms/${metadata.id}.json`
        })

        console.log(`    ✅ Completed`)
      }
    }

    // Clean up artwork files that no longer belong to a track
    await pruneOrphanedArtwork(expectedArtwork)

    // Clean up orphaned assets from release
    if (CONFIG.useGithubReleases && release && existingAssets.length > 0) {
      console.log(`\n🧹 Cleaning up orphaned assets...`)
      let deletedCount = 0
      
      for (const asset of existingAssets) {
        const normalizedName = normalizeAssetName(asset.name)
        if (!expectedAssets.has(normalizedName)) {
          console.log(`   🗑️  Deleting: ${asset.name}`)
          const success = await deleteReleaseAsset(asset.id)
          if (success) deletedCount++
        }
      }
      
      if (deletedCount > 0) {
        console.log(`   Deleted ${deletedCount} orphaned asset(s)`)
      } else {
        console.log(`   No orphaned assets found`)
      }
    }

    // Sort tracks by album and track number
    tracks.sort((a, b) => {
      if (a.album !== b.album) return a.album.localeCompare(b.album)
      return (a.trackNumber || 0) - (b.trackNumber || 0)
    })

    // Write tracks.json
    await fs.writeFile(
      path.join(CONFIG.metadataDir, 'tracks.json'),
      JSON.stringify({ tracks }, null, 2)
    )

    // Write waveforms.json (all waveforms in one file for efficiency)
    await fs.writeFile(
      path.join(CONFIG.metadataDir, 'waveforms.json'),
      JSON.stringify(waveforms, null, 2)
    )

    console.log(`\n✨ Manifest generated successfully!`)
    console.log(`📊 Total tracks: ${tracks.length}`)
    console.log(`📁 Albums found: ${[...new Set(tracks.map(t => t.album))].length}`)
    console.log(`📄 Output: ${CONFIG.metadataDir}/tracks.json`)

    if (albumsWithoutArtwork.length > 0) {
      console.log(`\n⚠️  Albums without artwork (using fallback icon):`)
      for (const name of albumsWithoutArtwork) {
        console.log(`   • ${name}`)
      }
      console.log(`   Add a .jpg, .jpeg, .png, or .webp file to each album folder and re-run generate to include artwork.\n`)
    }

    if (skippedFiles.length > 0) {
      console.log(`\n⚠️  Skipped ${skippedFiles.length} file(s) that Safari/iOS cannot play:`)
      for (const name of skippedFiles) {
        console.log(`   • ${name}`)
      }
      console.log(`   Encode the WAV/MP3 source to AAC m4a or mp3, or replace the file. See DEVELOPER.md.\n`)
    }

  } catch (error) {
    console.error('❌ Error generating manifest:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateManifest()
}

export default generateManifest
