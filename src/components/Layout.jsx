import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import AudioPlayer from './AudioPlayer'
import { usePlayer } from '../context/PlayerContext'

const Layout = ({ children }) => {
  const { currentTrack, togglePlay } = usePlayer()

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only handle spacebar if a track is loaded and not typing in an input
      if (e.code === 'Space' && currentTrack && 
          !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault()
        togglePlay()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentTrack, togglePlay])

  return (
    <div className="min-h-screen flex flex-col pb-24">
      {/* Header */}
      <header className="bg-soundcloud-gray-dark border-b border-soundcloud-gray-medium sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-soundcloud-orange">
              Unjazz
            </Link>
            <nav className="flex gap-6">
              <Link to="/" className="hover:text-soundcloud-orange transition-colors">
                Home
              </Link>
              <Link to="/about" className="hover:text-soundcloud-orange transition-colors">
                About
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Audio Player */}
      <AudioPlayer />
    </div>
  )
}

export default Layout
