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
    <div className={`group p-4 rounded-lg hover:bg-soundcloud-gray-medium transition-colors ${
      isCurrentTrack ? 'bg-soundcloud-gray-medium' : ''
    }`}>
      <div className="flex items-start gap-4">
        {/* Play Button */}
        <button
          onClick={handlePlay}
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-soundcloud-orange hover:bg-soundcloud-orange-dark rounded-full transition-colors"
          aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
        >
          {isCurrentTrack && isPlaying ? (
            <Pause size={20} fill="white" />
          ) : (
            <Play size={20} fill="white" />
          )}
        </button>

        {/* Track Info & Waveform */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0 flex-1">
              <h4 className={`font-semibold truncate ${
                isCurrentTrack ? 'text-soundcloud-orange' : ''
              }`}>
                {track.title}
              </h4>
              <p className="text-sm text-gray-400 truncate">{track.artist}</p>
            </div>
            <span className="text-sm text-gray-400 ml-4 flex-shrink-0">
              {formatTime(track.duration)}
            </span>
          </div>

          {/* Waveform */}
          {waveformData && (
            <Waveform 
              waveformData={waveformData}
              progress={isCurrentTrack ? progress : 0}
              duration={isCurrentTrack ? duration : track.duration}
              onSeek={handleWaveformSeek}
            />
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
