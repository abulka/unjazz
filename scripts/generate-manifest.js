import fs from 'fs/promises'
import path from 'path'
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
  useGithubReleases: process.env.USE_GITHUB_RELEASES === 'true'
}

// Initialize GitHub API client
const octokit = CONFIG.githubToken ? new Octokit({ auth: CONFIG.githubToken }) : null

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
 * Generate waveform data from MP3 file
 * Returns array of normalized amplitudes (0-1)
 */
async function generateWaveform(filePath, trackId, samples = 200) {
  try {
    // Try using audiowaveform CLI if available
    const outputPath = filePath.replace('.mp3', '.json')
    await execAsync(`audiowaveform -i "${filePath}" -o "${outputPath}" --pixels-per-second 10`)
    
    const waveformData = JSON.parse(await fs.readFile(outputPath, 'utf-8'))
    await fs.unlink(outputPath) // Clean up temp file
    
    // Normalize data
    const data = waveformData.data
    const max = Math.max(...data.map(Math.abs))
    return data.map(v => Math.abs(v) / max)
  } catch (error) {
    // Fallback: generate deterministic waveform based on filename
    console.warn(`Audiowaveform not available for ${filePath}, using deterministic fallback`)
    const seed = hashString(trackId)
    return Array.from({ length: samples }, (_, i) => {
      return seededRandom(seed + i) * 0.5 + 0.3
    })
  }
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
      albumDescription: metadata.common.comment?.[0] || '',
      duration: metadata.format.duration || 0,
      filename: fileName,
      trackNumber: metadata.common.track?.no || 0
    }
  } catch (error) {
    console.error(`Error reading metadata from ${filePath}:`, error.message)
    return null
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

  const tracks = []
  const waveforms = {}
  const expectedAssets = new Set() // Track what should exist in release

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
        expectedAssets.add(artworkAssetName)
        
        if (CONFIG.useGithubReleases) {
          // Check if already exists
          const existingAsset = existingAssets.find(a => a.name === artworkAssetName)
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
      }

      // Process MP3 files
      const mp3Files = files.filter(f => f.endsWith('.mp3'))

      for (const mp3File of mp3Files) {
        const mp3Path = path.join(albumPath, mp3File)
        console.log(`  🎵 Processing: ${mp3File}`)

        // Extract metadata
        const metadata = await extractMetadata(mp3Path, albumDir)
        if (!metadata) continue

        // Generate or upload MP3 URL
        const mp3AssetName = `${albumDir}-${mp3File}`
        expectedAssets.add(mp3AssetName)
        let audioUrl
        
        if (CONFIG.useGithubReleases) {
          // Check if already exists
          const existingAsset = existingAssets.find(a => a.name === mp3AssetName)
          if (existingAsset) {
            console.log(`    ✓ Already uploaded`)
            audioUrl = existingAsset.browser_download_url
          } else {
            console.log(`    ⬆️  Uploading to GitHub Releases...`)
            audioUrl = await uploadToGitHubRelease(mp3Path, mp3AssetName, release)
            if (!audioUrl) {
              console.error(`    ❌ Failed to upload ${mp3File}`)
              continue
            }
          }
        } else {
          audioUrl = `${CONFIG.basePath}/albums/${albumDir}/${mp3File}`
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
          waveformData = await generateWaveform(mp3Path, metadata.id)
          
          // Save individual waveform file
          await fs.writeFile(waveformPath, JSON.stringify(waveformData))
        }
        
        waveforms[metadata.id] = waveformData

        // Add track to manifest
        tracks.push({
          ...metadata,
          url: audioUrl,
          artwork: artworkUrl,
          waveform: `${CONFIG.basePath}/metadata/waveforms/${metadata.id}.json`
        })

        console.log(`    ✅ Completed`)
      }
    }

    // Clean up orphaned assets from release
    if (CONFIG.useGithubReleases && release && existingAssets.length > 0) {
      console.log(`\n🧹 Cleaning up orphaned assets...`)
      let deletedCount = 0
      
      for (const asset of existingAssets) {
        if (!expectedAssets.has(asset.name)) {
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
      JSON.stringify({ tracks, generatedAt: new Date().toISOString() }, null, 2)
    )

    // Write waveforms.json (all waveforms in one file for efficiency)
    await fs.writeFile(
      path.join(CONFIG.metadataDir, 'waveforms.json'),
      JSON.stringify(waveforms, null, 2)
    )

    console.log(`\n✨ Manifest generated successfully!`)
    console.log(`📊 Total tracks: ${tracks.length}`)
    console.log(`📁 Albums found: ${[...new Set(tracks.map(t => t.album))].length}`)
    console.log(`📄 Output: ${CONFIG.metadataDir}/tracks.json\n`)

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
