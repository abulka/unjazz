import { useEffect, useRef } from 'react'

const Waveform = ({ waveformData, progress, duration, onSeek, className = '' }) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !waveformData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    const barCount = waveformData.length
    const barGap = 0.5
    const barWidth = Math.max(1, (rect.width - (barCount - 1) * barGap) / barCount)
    const progressRatio = duration > 0 ? progress / duration : 0
    const centerY = rect.height / 2

    // Draw waveform bars (symmetric/mirror style)
    waveformData.forEach((amplitude, index) => {
      const x = index * (barWidth + barGap)
      const barHeight = amplitude * (rect.height / 2) * 0.9

      // Choose color based on progress
      const isPlayed = index / barCount <= progressRatio
      ctx.fillStyle = isPlayed ? '#ff5500' : 'rgba(255, 255, 255, 0.3)'
      
      // Draw symmetric bars (top and bottom from center)
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight)
      ctx.fillRect(x, centerY, barWidth, barHeight)
    })
  }, [waveformData, progress, duration])

  const handleClick = (e) => {
    if (!duration || !onSeek) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = x / rect.width
    onSeek(ratio * duration)
  }

  return (
    <canvas
      ref={canvasRef}
      className={`waveform-container ${className}`}
      onClick={handleClick}
      style={{ width: '100%', height: '80px' }}
    />
  )
}

export default Waveform
