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

    const barWidth = 3
    const barGap = 1
    const barCount = Math.floor(rect.width / (barWidth + barGap))
    const progressRatio = duration > 0 ? progress / duration : 0

    // Draw waveform bars
    waveformData.forEach((amplitude, index) => {
      if (index >= barCount) return

      const x = index * (barWidth + barGap)
      const barHeight = amplitude * rect.height * 0.8
      const y = (rect.height - barHeight) / 2

      // Choose color based on progress
      const isPlayed = index / barCount <= progressRatio
      ctx.fillStyle = isPlayed ? '#ff5500' : 'rgba(255, 255, 255, 0.3)'
      
      ctx.fillRect(x, y, barWidth, barHeight)
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
