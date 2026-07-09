import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'fix-base-url',
      configureServer(server) {
        const origWarn = server.config.logger.warn
        server.config.logger.warn = (msg, options) => {
          if (typeof msg === 'string' && msg.includes('configured with a public base URL')) return
          origWarn(msg, options)
        }
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/unjazz') {
            res.writeHead(302, { Location: '/unjazz/' })
            res.end()
            return
          }
          next()
        })
      }
    }
  ],
  base: '/unjazz/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    port: 3000,
    open: '/unjazz/',
    strictPort: false
  }
})
