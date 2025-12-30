// ============================================
// frontend/src/components/AudioPlayer.jsx
// Reusable audio player with text-to-speech support
// ============================================

import { useState, useRef, useEffect } from 'react'
import { Volume2, VolumeX, Play, Pause, Loader2, Download, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AudioPlayer({ 
  audioBase64, 
  format = 'mp3',
  title = 'Audio',
  onError,
  showDownload = true,
  autoPlay = false,
  compact = false
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)
  
  useEffect(() => {
    if (audioBase64) {
      const audio = new Audio(`data:audio/${format};base64,${audioBase64}`)
      audioRef.current = audio
      
      audio.onloadedmetadata = () => {
        setDuration(audio.duration)
      }
      
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime)
        setProgress((audio.currentTime / audio.duration) * 100)
      }
      
      audio.onended = () => {
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime(0)
      }
      
      audio.onerror = (e) => {
        console.error('Audio error:', e)
        onError?.('Failed to load audio')
      }
      
      if (autoPlay) {
        audio.play().then(() => setIsPlaying(true)).catch(console.error)
      }
      
      return () => {
        audio.pause()
        audio.src = ''
      }
    }
  }, [audioBase64, format, autoPlay])
  
  const togglePlay = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error)
    }
  }
  
  const restart = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error)
  }
  
  const handleProgressClick = (e) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    audioRef.current.currentTime = percentage * duration
  }
  
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = `data:audio/${format};base64,${audioBase64}`
    link.download = `${title.replace(/\s+/g, '_')}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  if (!audioBase64) return null
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <span className="text-xs text-gray-500">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    )
  }
  
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition shadow-lg"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        
        {/* Progress Bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div 
            className="h-2 bg-purple-200 rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            <motion.div 
              className="h-full bg-purple-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={restart}
            className="p-2 rounded-lg hover:bg-purple-100 text-purple-600 transition"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {showDownload && (
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-purple-100 text-purple-600 transition"
              title="Download Audio"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Voice options for TTS
const VOICE_OPTIONS = [
  { id: 'en-US-JennyNeural', name: 'Jenny', language: 'English (US)', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy', language: 'English (US)', gender: 'Male' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja', language: 'English (India)', gender: 'Female' },
  { id: 'en-IN-PrabhatNeural', name: 'Prabhat', language: 'English (India)', gender: 'Male' },
  { id: 'hi-IN-SwaraNeural', name: 'Swara', language: 'Hindi', gender: 'Female' },
  { id: 'hi-IN-MadhurNeural', name: 'Madhur', language: 'Hindi', gender: 'Male' },
]

// Listen Button Component - triggers TTS and shows player
export function ListenButton({ 
  onFetch, 
  label = 'Listen',
  loadingLabel = 'Generating audio...',
  className = '',
  showVoiceSelector = true
}) {
  const [loading, setLoading] = useState(false)
  const [audioData, setAudioData] = useState(null)
  const [error, setError] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('en-IN-NeerjaNeural') // Default to Indian English
  
  const handleClick = async () => {
    if (audioData) {
      // Already loaded, just show
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const result = await onFetch(selectedVoice)
      if (result?.audio) {
        setAudioData(result.audio)
      } else {
        throw new Error('No audio data received')
      }
    } catch (err) {
      console.error('Failed to generate audio:', err)
      setError('Failed to generate audio. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleVoiceChange = (e) => {
    setSelectedVoice(e.target.value)
    setAudioData(null) // Reset audio when voice changes
  }
  
  const selectedVoiceInfo = VOICE_OPTIONS.find(v => v.id === selectedVoice)
  
  return (
    <div className={className}>
      {/* Voice Selector */}
      {showVoiceSelector && !audioData && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Voice
          </label>
          <select
            value={selectedVoice}
            onChange={handleVoiceChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          >
            {VOICE_OPTIONS.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name} - {voice.language} ({voice.gender})
              </option>
            ))}
          </select>
        </div>
      )}
      
      {!audioData && (
        <button
          onClick={handleClick}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{loadingLabel}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>{label}</span>
            </>
          )}
        </button>
      )}
      
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
      
      {audioData && (
        <div className="mt-3">
          <AudioPlayer audioBase64={audioData} autoPlay={true} />
        </div>
      )}
    </div>
  )
}
