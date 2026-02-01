import { usePlayer } from '../context/PlayerContext'
import { Play, Pause, SkipForward, SkipBack, Volume2 } from 'lucide-react'

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const AudioPlayer = () => {
  const { 
    currentTrack, 
    isPlaying, 
    progress, 
    duration,
    volume,
    togglePlay, 
    seek,
    changeVolume,
    next,
    previous 
  } = usePlayer()

  if (!currentTrack) return null

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = x / rect.width
    seek(ratio * duration)
  }

  const handleVolumeChange = (e) => {
    changeVolume(parseFloat(e.target.value))
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-soundcloud-gray-dark border-t border-soundcloud-gray-medium z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0 w-64">
            {currentTrack.artwork && (
              <img 
                src={currentTrack.artwork} 
                alt={currentTrack.title}
                className="w-12 h-12 rounded object-cover flex-shrink-0"
                style={{ filter: 'none !important' }}
              />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{currentTrack.title}</div>
              <div className="text-xs text-gray-400 truncate">{currentTrack.artist}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <button 
                onClick={previous}
                className="p-2 hover:text-soundcloud-orange transition-colors"
                aria-label="Previous track"
              >
                <SkipBack size={20} />
              </button>
              
              <button 
                onClick={togglePlay}
                className="p-3 bg-soundcloud-orange hover:bg-soundcloud-orange-dark rounded-full transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
              </button>
              
              <button 
                onClick={next}
                className="p-2 hover:text-soundcloud-orange transition-colors"
                aria-label="Next track"
              >
                <SkipForward size={20} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-2xl flex items-center gap-3">
              <span className="text-xs text-gray-400 w-12 text-right">
                {formatTime(progress)}
              </span>
              <div 
                className="flex-1 h-1 bg-soundcloud-gray-medium rounded-full cursor-pointer group"
                onClick={handleSeek}
              >
                <div 
                  className="h-full bg-soundcloud-orange rounded-full relative group-hover:bg-soundcloud-orange-dark transition-colors"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-xs text-gray-400 w-12">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 w-32 flex-shrink-0">
            <Volume2 size={20} className="text-gray-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1 bg-soundcloud-gray-medium rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer
