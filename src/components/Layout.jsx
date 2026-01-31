import { Link } from 'react-router-dom'
import AudioPlayer from './AudioPlayer'

const Layout = ({ children }) => {
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
