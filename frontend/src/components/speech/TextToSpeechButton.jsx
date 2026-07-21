// ============================================
// frontend/src/components/speech/TextToSpeechButton.jsx
// Button to read text aloud using Azure Speech Services
// ============================================

import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX, Loader2, Settings2 } from 'lucide-react'
import { speechService, AudioPlayer } from '../../services/speech'
import { motion, AnimatePresence } from 'framer-motion'

export default function TextToSpeechButton({ 
  prescriptionId = null,
  labReportId = null, 
  customText = null,
  size = 'md',
  showVoiceSelect = false,
  className = ''
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural')
  const [voices, setVoices] = useState([])
  const playerRef = useRef(new AudioPlayer())
  
  useEffect(() => {
    if (showVoiceSelect) {
      loadVoices()
    }
    
    // Cleanup on unmount
    return () => {
      playerRef.current.stop()
    }
  }, [showVoiceSelect])
  
  const loadVoices = async () => {
    try {
      const res = await speechService.getVoices()
      setVoices(res.data.voices || [])
    } catch (err) {
      console.error('Failed to load voices:', err)
    }
  }
  
  const handleSpeak = async () => {
    if (isPlaying) {
      playerRef.current.stop()
      setIsPlaying(false)
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      let response
      
      if (prescriptionId) {
        response = await speechService.speakPrescription(prescriptionId, selectedVoice)
      } else if (labReportId) {
        response = await speechService.speakLabReport(labReportId, selectedVoice)
      } else if (customText) {
        response = await speechService.speakText(customText, selectedVoice)
      } else {
        throw new Error('No content to speak')
      }
      
      const { audio, content_type } = response.data
      
      setIsPlaying(true)
      await playerRef.current.playBase64(audio, content_type)
      setIsPlaying(false)
      
    } catch (err) {
      console.error('Speech error:', err)
      setError(err.response?.data?.error || 'Failed to generate speech')
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }
  
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  }
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      <motion.button
        onClick={handleSpeak}
        disabled={isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          ${sizeClasses[size]}
          rounded-xl transition-all duration-200
          ${isPlaying 
            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
            : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          flex items-center gap-2
        `}
        title={isPlaying ? 'Stop' : 'Listen'}
      >
        {isLoading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : isPlaying ? (
          <VolumeX className={iconSizes[size]} />
        ) : (
          <Volume2 className={iconSizes[size]} />
        )}
        {size !== 'sm' && (
          <span className="text-sm font-medium">
            {isLoading ? 'Loading...' : isPlaying ? 'Stop' : 'Listen'}
          </span>
        )}
      </motion.button>
      
      {showVoiceSelect && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
          title="Voice settings"
        >
          <Settings2 className="w-4 h-4 text-gray-500" />
        </button>
      )}
      
      {/* Voice selector dropdown */}
      <AnimatePresence>
        {showSettings && voices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50 min-w-64"
          >
            <p className="text-sm font-medium text-gray-700 mb-2">Select Voice</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => {
                    setSelectedVoice(voice.id)
                    setShowSettings(false)
                  }}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition
                    ${selectedVoice === voice.id 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="font-medium">{voice.name}</div>
                  <div className="text-xs text-gray-500">
                    {voice.language} • {voice.gender} • {voice.style}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-full left-0 mt-2 px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg"
        >
          {error}
        </motion.div>
      )}
    </div>
  )
}
