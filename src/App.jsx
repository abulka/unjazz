import { Routes, Route } from 'react-router-dom'
import { PlayerProvider } from './context/PlayerContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Album from './pages/Album'
import About from './pages/About'

function App() {
  return (
    <PlayerProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/album/:albumId" element={<Album />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </PlayerProvider>
  )
}

export default App
