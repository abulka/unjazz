import { Link } from 'react-router-dom'
import { Play, Music } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'

const AlbumCard = ({ album, tracks }) => {
  const { playTrack } = usePlayer()

  const handlePlayAlbum = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks)
    }
  }

  return (
    <Link to={`/album/${album.id}`} className="group">
      <div className="relative overflow-hidden rounded-lg bg-soundcloud-gray-medium hover:bg-soundcloud-gray-light transition-all">
        {album.artwork ? (
          <img 
            src={album.artwork} 
            alt={album.title}
            className="w-full aspect-square object-cover"
            data-darkreader-ignore
          />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center bg-gradient-to-br from-soundcloud-gray-medium to-soundcloud-gray-dark">
            <Music size={64} className="text-gray-600" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
          <button
            onClick={handlePlayAlbum}
            className="opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all bg-soundcloud-orange hover:bg-soundcloud-orange-dark rounded-full p-4"
            aria-label={`Play ${album.title}`}
          >
            <Play size={24} fill="white" />
          </button>
        </div>
      </div>
      
      <div className="mt-3">
        <h3 className="font-semibold truncate group-hover:text-soundcloud-orange transition-colors">
          {album.title}
        </h3>
        <p className="text-sm text-gray-400 truncate">{album.artist}</p>
        <p className="text-xs text-gray-500 mt-1">{tracks.length} tracks</p>
      </div>
    </Link>
  )
}

export default AlbumCard
