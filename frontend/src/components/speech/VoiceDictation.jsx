// ============================================
// frontend/src/components/speech/VoiceDictation.jsx
// Voice dictation component for doctors to dictate notes
// ============================================

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2, StopCircle, Trash2 } from 'lucide-react'
import { speechService, VoiceRecorder } from '../../services/speech'
import { motion, AnimatePresence } from 'framer-motion'

export default function VoiceDictation({ 
  onTranscript, 
  placeholder = 'Click the microphone to start dictating...',
  language = 'en-US',
  className = ''
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const recorderRef = useRef(new VoiceRecorder())
  const timerRef = useRef(null)
  
  useEffect(() => {
    return () => {
      // Cleanup
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])
  
  const startRecording = async () => {
    setError(null)
    try {
      await recorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)
      
    } catch (err) {
      setError(err.message || 'Failed to start recording')
    }
  }
  
  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    setIsRecording(false)
    setIsProcessing(true)
    
    try {
      const audioBlob = await recorderRef.current.stop()
      
      if (audioBlob) {
        const response = await speechService.transcribe(audioBlob, language)
        const newText = response.data.text
        
        if (newText) {
          const updatedTranscript = transcript ? `${transcript} ${newText}` : newText
          setTranscript(updatedTranscript)
          onTranscript?.(updatedTranscript)
        } else {
          setError('No speech detected. Please try again.')
        }
      }
    } catch (err) {
      console.error('Transcription error:', err)
      setError(err.response?.data?.error || 'Failed to transcribe audio')
    } finally {
      setIsProcessing(false)
    }
  }
  
  const clearTranscript = () => {
    setTranscript('')
    onTranscript?.('')
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Transcript display */}
      <div className="relative">
        <textarea
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value)
            onTranscript?.(e.target.value)
          }}
          placeholder={placeholder}
          className="w-full p-4 border border-gray-200 rounded-xl min-h-32 resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          rows={4}
        />
        
        {transcript && (
          <button
            onClick={clearTranscript}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
            title="Clear text"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Record button */}
        <motion.button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
            ${isRecording 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-purple-500 text-white hover:bg-purple-600'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : isRecording ? (
            <>
              <StopCircle className="w-5 h-5" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Start Dictation</span>
            </>
          )}
        </motion.button>
        
        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 bg-red-500 rounded-full"
              />
              <span className="text-sm text-gray-600">
                Recording... {formatTime(recordingTime)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-red-50 text-red-700 rounded-lg text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Tips */}
      <div className="text-xs text-gray-500">
        <p>💡 Tip: Speak clearly and pause briefly between sentences for better results.</p>
      </div>
    </div>
  )
}
