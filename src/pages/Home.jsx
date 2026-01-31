import { useState, useEffect } from 'react'
import AlbumCard from '../components/AlbumCard'

const Home = () => {
  const [albums, setAlbums] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load tracks metadata
    fetch('/unjazz/metadata/tracks.json')
      .then(res => res.json())
      .then(data => {
        setTracks(data.tracks || [])
        
        // Group tracks by album
        const albumMap = {}
        data.tracks.forEach(track => {
          const albumId = track.album.toLowerCase().replace(/\s+/g, '-')
          if (!albumMap[albumId]) {
            albumMap[albumId] = {
              id: albumId,
              title: track.album,
              artist: track.artist,
              artwork: track.artwork,
              tracks: []
            }
          }
          albumMap[albumId].tracks.push(track)
        })
        
        setAlbums(Object.values(albumMap))
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading tracks:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Discover Music</h1>
        <p className="text-gray-400 text-lg">
          Stream your favorite tracks and albums
        </p>
      </section>

      {/* Albums Grid */}
      {albums.length > 0 ? (
        <section>
          <h2 className="text-2xl font-bold mb-6">Albums</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {albums.map(album => (
              <AlbumCard 
                key={album.id} 
                album={album} 
                tracks={album.tracks}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No albums found</p>
          <p className="text-sm text-gray-500">
            Add MP3 files to your albums folder and run <code className="bg-soundcloud-gray-medium px-2 py-1 rounded">npm run generate</code>
          </p>
        </div>
      )}
    </div>
  )
}

export default Home
