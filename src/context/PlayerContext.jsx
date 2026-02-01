import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { Howl } from 'howler'

const PlayerContext = createContext()

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [playlist, setPlaylist] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1.0)
  const soundRef = useRef(null)
  const progressInterval = useRef(null)
  const playlistRef = useRef([])
  const currentTrackRef = useRef(null)
  const isSeeking = useRef(false)

  // Keep refs in sync with state
  useEffect(() => {
    playlistRef.current = playlist
  }, [playlist])

  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  // Update Media Session API
  useEffect(() => {
    if (currentTrack && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: currentTrack.artwork ? [
          { src: currentTrack.artwork, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      })

      navigator.mediaSession.setActionHandler('play', () => play())
      navigator.mediaSession.setActionHandler('pause', () => pause())
      navigator.mediaSession.setActionHandler('previoustrack', () => previous())
      navigator.mediaSession.setActionHandler('nexttrack', () => next())
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime) {
          seek(details.seekTime)
        }
      })
    }
  }, [currentTrack])

  // Track progress
  useEffect(() => {
    if (isPlaying && soundRef.current) {
      progressInterval.current = setInterval(() => {
        // Don't update progress while seeking
        if (isSeeking.current) return
        
        const currentPos = soundRef.current.seek()
        // Howler returns the sound ID if not loaded yet
        if (typeof currentPos === 'number') {
          setProgress(currentPos)
          
          // Update Media Session position
          if ('mediaSession' in navigator) {
            navigator.mediaSession.setPositionState({
              duration: duration,
              playbackRate: 1.0,
              position: currentPos
            })
          }
        }
      }, 100)
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isPlaying, duration])

  const loadTrack = (track, startTime = 0) => {
    // Clear any existing progress interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
    
    if (soundRef.current) {
      soundRef.current.unload()
    }

    const sound = new Howl({
      src: [track.url],
      html5: true,
      format: ['mp3'],
      volume: volume,
      onload: function() {
        const trackDuration = sound.duration()
        setDuration(trackDuration)
        // Seek to start time if specified (clamped to valid range)
        if (startTime > 0) {
          const clampedStart = Math.min(startTime, trackDuration - 0.1)
          sound.seek(clampedStart)
          setProgress(clampedStart)
        }
      },
      onplay: function() {
        setIsPlaying(true)
      },
      onpause: function() {
        setIsPlaying(false)
      },
      onend: function() {
        next()
      },
      onerror: function(id, error) {
        console.error('Error loading track:', error)
      }
    })

    soundRef.current = sound
    setCurrentTrack(track)
    setProgress(startTime)
  }

  const play = () => {
    if (soundRef.current) {
      soundRef.current.play()
    }
  }

  const pause = () => {
    if (soundRef.current) {
      soundRef.current.pause()
    }
  }

  const togglePlay = () => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const seek = (time) => {
    if (soundRef.current) {
      // Clamp time to valid range
      const clampedTime = Math.max(0, Math.min(time, duration))
      
      // Set seeking flag to prevent progress updates during seek
      isSeeking.current = true
      soundRef.current.seek(clampedTime)
      setProgress(clampedTime)
      
      // Clear seeking flag after a short delay
      setTimeout(() => {
        isSeeking.current = false
      }, 150)
    }
  }

  const changeVolume = (newVolume) => {
    setVolume(newVolume)
    if (soundRef.current) {
      soundRef.current.volume(newVolume)
    }
  }

  const playTrack = (track, newPlaylist = null, startTime = 0) => {
    if (newPlaylist) {
      setPlaylist(newPlaylist)
    }
    loadTrack(track, startTime)
    setTimeout(() => play(), 100)
  }

  const next = () => {
    if (playlistRef.current.length === 0) return
    const currentIndex = playlistRef.current.findIndex(t => t.id === currentTrackRef.current?.id)
    const nextIndex = (currentIndex + 1) % playlistRef.current.length
    playTrack(playlistRef.current[nextIndex])
  }

  const previous = () => {
    if (playlistRef.current.length === 0) return
    const currentIndex = playlistRef.current.findIndex(t => t.id === currentTrackRef.current?.id)
    const prevIndex = currentIndex === 0 ? playlistRef.current.length - 1 : currentIndex - 1
    playTrack(playlistRef.current[prevIndex])
  }

  const value = {
    currentTrack,
    playlist,
    isPlaying,
    progress,
    duration,
    volume,
    playTrack,
    togglePlay,
    play,
    pause,
    seek,
    changeVolume,
    next,
    previous
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
}
