import { useEffect, useRef, useState } from 'react'

// Debug mode controlled by env var (set VITE_DEBUG_WAVEFORM=true in .env to enable)
const DEBUG_MODE = import.meta.env.VITE_DEBUG_WAVEFORM === 'true'

const Waveform = ({ waveformData, progress, duration, onSeek, className = '' }) => {
  const canvasRef = useRef(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [touchIndicator, setTouchIndicator] = useState(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Watch for canvas resize to fix initial render resolution issue on mobile
  useEffect(() => {
    if (!canvasRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setCanvasSize({ width, height })
        }
      }
    })

    resizeObserver.observe(canvasRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Draw waveform when data, progress, or canvas size changes
  useEffect(() => {
    if (!canvasRef.current || !waveformData || canvasSize.width === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { alpha: false })
    const dpr = window.devicePixelRatio || 1
    
    // Set canvas size based on observed dimensions
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    
    // Fill background
    ctx.fillStyle = '#2a2a2a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Scale for logical coordinate drawing
    ctx.scale(dpr, dpr)

    const barGap = 1
    const minBarWidth = 2
    // Calculate how many bars can actually fit in the canvas
    const maxBars = Math.floor(canvasSize.width / (minBarWidth + barGap))
    const barCount = Math.min(waveformData.length, maxBars)
    const barWidth = (canvasSize.width - (barCount - 1) * barGap) / barCount
    const progressRatio = duration > 0 ? Math.min(1, progress / duration) : 0
    const centerY = canvasSize.height / 2
    const playedThreshold = Math.floor(progressRatio * barCount)
    
    // Resample waveform data to fit available bars
    const step = waveformData.length / barCount

    // Draw bars
    for (let index = 0; index < barCount; index++) {
      const dataIndex = Math.floor(index * step)
      const amplitude = waveformData[dataIndex] || 0.5
      const x = index * (barWidth + barGap)
      const barHeight = amplitude * (canvasSize.height / 2) * 0.9
      const isPlayed = index <= playedThreshold
      
      ctx.fillStyle = isPlayed ? '#ff5500' : 'rgba(255, 255, 255, 0.3)'
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight)
      ctx.fillRect(x, centerY, barWidth, barHeight)
    }
  }, [waveformData, progress, duration, canvasSize])

  // Prevent double-firing from touch + click
  const lastSeekTime = useRef(0)

  const handleClick = (e) => {
    if (!duration || !onSeek) return
    
    // Debounce: ignore seeks within 300ms of each other
    const now = Date.now()
    if (now - lastSeekTime.current < 300) {
      return
    }
    lastSeekTime.current = now
    
    const rect = canvasRef.current.getBoundingClientRect()
    
    // Handle both mouse and touch events
    let clientX
    const eventType = e.type
    if (e.type.startsWith('touch')) {
      e.preventDefault()
      e.stopPropagation()
      const touch = e.touches[0] || e.changedTouches[0]
      clientX = touch.clientX
    } else {
      clientX = e.clientX
    }
    
    const x = clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const seekTime = ratio * duration
    
    if (DEBUG_MODE) {
      // Show touch indicator
      setTouchIndicator({ x, ratio })
      setTimeout(() => setTouchIndicator(null), 2000)
      
      // Debug info
      setDebugInfo({
        eventType,
        clientX: Math.round(clientX),
        rectLeft: Math.round(rect.left),
        rectWidth: Math.round(rect.width),
        x: Math.round(x),
        ratio: ratio.toFixed(3),
        seekTime: seekTime.toFixed(1),
        duration: duration.toFixed(1)
      })
      setTimeout(() => setDebugInfo(null), 5000)
    }
    
    onSeek(seekTime)
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        className={`waveform-container ${className}`}
        onClick={handleClick}
        onTouchStart={handleClick}
        style={{ width: '100%', height: '80px', cursor: 'pointer', touchAction: 'none' }}
      />
      {DEBUG_MODE && touchIndicator && (
        <>
          {/* Vertical line at seek position */}
          <div style={{
            position: 'absolute',
            left: `${touchIndicator.ratio * 100}%`,
            top: 0,
            bottom: 0,
            width: '3px',
            background: '#00ff00',
            boxShadow: '0 0 8px #00ff00',
            pointerEvents: 'none',
            zIndex: 999
          }} />
          {/* Circle at exact touch point */}
          <div style={{
            position: 'absolute',
            left: `${touchIndicator.x}px`,
            top: '50%',
            width: '40px',
            height: '40px',
            marginLeft: '-20px',
            marginTop: '-20px',
            border: '3px solid #ff00ff',
            borderRadius: '50%',
            background: 'rgba(255, 0, 255, 0.3)',
            pointerEvents: 'none',
            zIndex: 1000
          }} />
        </>
      )}
      {DEBUG_MODE && debugInfo && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          background: 'rgba(255, 85, 0, 0.9)',
          color: 'white',
          padding: '8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          borderRadius: '4px',
          pointerEvents: 'none',
          zIndex: 1000,
          maxWidth: '90%'
        }}>
          <div>{debugInfo.eventType}</div>
          <div>Touch X: {debugInfo.clientX} | Rect L: {debugInfo.rectLeft}</div>
          <div>Canvas W: {debugInfo.rectWidth} | Click X: {debugInfo.x}</div>
          <div>Ratio: {debugInfo.ratio} ({(debugInfo.ratio * 100).toFixed(0)}%)</div>
          <div>Seek: {debugInfo.seekTime}s / {debugInfo.duration}s</div>
          <div style={{ borderTop: '1px solid white', marginTop: '4px', paddingTop: '4px' }}>
            WAVEFORM STATE:
          </div>
          <div>Progress: {progress.toFixed(2)}s</div>
          <div>Duration: {duration.toFixed(2)}s</div>
          <div>Calc Ratio: {((progress / duration) * 100).toFixed(1)}%</div>
          <div>Bars: {waveformData.length}</div>
        </div>
      )}
    </div>
  )
}

export default Waveform
