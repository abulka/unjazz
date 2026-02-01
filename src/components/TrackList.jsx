import { Play, Pause } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'
import Waveform from './Waveform'

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const TrackItem = ({ track, playlist, waveformData }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, progress, duration, seek } = usePlayer()
  const isCurrentTrack = currentTrack?.id === track.id

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlay()
    } else {
      playTrack(track, playlist)
    }
  }

  const handleWaveformSeek = (time) => {
    if (isCurrentTrack) {
      seek(time)
    } else {
      // Start playing this track at the clicked position
      playTrack(track, playlist, time)
    }
  }

  return (
    <div className={`group p-2 sm:p-3 rounded-lg transition-colors ${
      isCurrentTrack ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
    } ${isCurrentTrack ? 'hover:bg-white/[0.12]' : ''}`}>
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Play Button */}
        <button
          onClick={handlePlay}
          className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-soundcloud-orange hover:bg-soundcloud-orange-dark rounded-full transition-colors"
          aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
        >
          {isCurrentTrack && isPlaying ? (
            <Pause size={14} className="sm:w-5 sm:h-5" fill="white" />
          ) : (
            <Play size={14} className="sm:w-5 sm:h-5" fill="white" />
          )}
        </button>

        {/* Track Info & Waveform */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="min-w-0 flex-1">
              <h4 className={`font-semibold text-xs sm:text-sm truncate transition-colors ${
                isCurrentTrack ? 'text-soundcloud-orange' : 'text-white group-hover:text-soundcloud-orange'
              }`}>
                {track.title}
              </h4>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">{track.artist}</p>
            </div>
            <span className="text-[10px] sm:text-xs text-gray-400 ml-2 flex-shrink-0">
              {formatTime(track.duration)}
            </span>
          </div>

          {/* Waveform */}
          {waveformData && (
            <div className="h-8 sm:h-12">
              <Waveform 
                waveformData={waveformData}
                progress={isCurrentTrack ? progress : 0}
                duration={track.duration}
                onSeek={handleWaveformSeek}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const TrackList = ({ tracks, waveforms = {} }) => {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No tracks available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tracks.map((track) => (
        <TrackItem 
          key={track.id} 
          track={track} 
          playlist={tracks}
          waveformData={waveforms[track.id]}
        />
      ))}
    </div>
  )
}

export default TrackList
