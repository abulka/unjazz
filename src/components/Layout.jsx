import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import AudioPlayer from './AudioPlayer'
import { usePlayer } from '../context/PlayerContext'
import { TEST_ALBUMS_PARAM, testAlbumsEnabled } from '../lib/testAlbums'

const LIVE_ORIGIN = 'https://abulka.github.io'

const Layout = ({ children }) => {
  const { currentTrack, togglePlay } = usePlayer()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showTestAlbums = testAlbumsEnabled(searchParams.toString())

  const liveUrl = `${LIVE_ORIGIN}${import.meta.env.BASE_URL.replace(/\/$/, '')}${location.pathname}${location.search}`

  const toggleTestAlbums = () => {
    const params = new URLSearchParams(searchParams)
    if (showTestAlbums) {
      params.delete(TEST_ALBUMS_PARAM)
    } else {
      params.set(TEST_ALBUMS_PARAM, 'true')
    }
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' })
  }

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
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl sm:text-2xl font-bold text-soundcloud-orange">
              Unjazz
            </Link>
            <nav className="flex gap-4 sm:gap-6 text-sm sm:text-base">
              <Link to="/" className="hover:text-soundcloud-orange transition-colors">
                Home
              </Link>
              <Link to="/about" className="hover:text-soundcloud-orange transition-colors">
                About
              </Link>
            </nav>
          </div>

          {/* Dev-only controls (not rendered in production builds) */}
          {import.meta.env.DEV && (
            <div className="mt-2 pt-2 border-t border-soundcloud-gray-medium flex items-center justify-end gap-4 text-xs text-gray-400">
              <button
                onClick={toggleTestAlbums}
                className={`transition-colors ${
                  showTestAlbums
                    ? 'text-soundcloud-orange hover:text-soundcloud-orange-dark'
                    : 'hover:text-soundcloud-orange'
                }`}
              >
                {showTestAlbums ? 'Hide test albums' : 'Show test albums'}
              </button>
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-soundcloud-orange transition-colors"
              >
                View on live
                <ExternalLink size={12} />
              </a>
            </div>
          )}
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
