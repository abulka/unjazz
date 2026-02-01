import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Music } from 'lucide-react'
import TrackList from '../components/TrackList'

const Album = () => {
  const { albumId } = useParams()
  const [album, setAlbum] = useState(null)
  const [tracks, setTracks] = useState([])
  const [waveforms, setWaveforms] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load tracks and filter by album
    Promise.all([
      fetch('/unjazz/metadata/tracks.json').then(res => res.json()),
      fetch('/unjazz/metadata/waveforms.json').then(res => res.json()).catch(() => ({}))
    ])
      .then(([tracksData, waveformsData]) => {
        const albumTracks = tracksData.tracks.filter(
          track => track.album.toLowerCase().replace(/\s+/g, '-') === albumId
        )
        
        // Sort tracks by trackNumber, then by filename
        albumTracks.sort((a, b) => {
          if (a.trackNumber !== b.trackNumber) {
            return a.trackNumber - b.trackNumber
          }
          return a.filename.localeCompare(b.filename)
        })
        
        if (albumTracks.length > 0) {
          setAlbum({
            id: albumId,
            title: albumTracks[0].album,
            artist: albumTracks[0].artist,
            artwork: albumTracks[0].artwork,
            description: albumTracks[0].albumDescription
          })
          setTracks(albumTracks)
          setWaveforms(waveformsData)
        }
        
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading album:', err)
        setLoading(false)
      })
  }, [albumId])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-soundcloud-orange hover:text-soundcloud-orange-dark mb-8">
          <ArrowLeft size={20} />
          Back to Home
        </Link>
        <div className="text-center py-12 text-gray-400">
          Album not found
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-soundcloud-orange hover:text-soundcloud-orange-dark mb-8">
        <ArrowLeft size={20} />
        Back to Home
      </Link>

      {/* Album Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="flex-shrink-0">
          {album.artwork ? (
            <img 
              src={album.artwork} 
              alt={album.title}
              className="w-64 h-64 rounded-lg object-cover shadow-2xl"
              style={{ filter: 'none !important' }}
            />
          ) : (
            <div className="w-64 h-64 rounded-lg bg-gradient-to-br from-soundcloud-gray-medium to-soundcloud-gray-dark flex items-center justify-center">
              <Music size={96} className="text-gray-600" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="text-sm text-gray-400 mb-2">ALBUM</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{album.title}</h1>
          <p className="text-xl text-gray-400 mb-4">{album.artist}</p>
          {album.description && (
            <p className="text-gray-300 mb-4">{album.description}</p>
          )}
          <div className="text-sm text-gray-400">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="bg-soundcloud-gray-dark rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Tracks</h2>
        <TrackList tracks={tracks} waveforms={waveforms} />
      </div>
    </div>
  )
}

export default Album
