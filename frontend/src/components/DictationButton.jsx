// ============================================
// frontend/src/components/DictationButton.jsx
// Speech-to-text dictation for doctors
// ============================================

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2, Square, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { speechService } from '../services/speech'

export default function DictationButton({ 
  onTranscript, 
  language = 'en-US',
  className = '',
  disabled = false,
  placeholder = 'Click to start dictation...'
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [permissionDenied, setPermissionDenied] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopRecording()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])
  
  const startRecording = async () => {
    setError('')
    audioChunksRef.current = []
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      
      streamRef.current = stream
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = handleRecordingStop
      
      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      console.error('Failed to start recording:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true)
        setError('Microphone access denied. Please enable microphone permission.')
      } else {
        setError('Failed to access microphone. Please check your device.')
      }
    }
  }
  
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setIsRecording(false)
  }
  
  const handleRecordingStop = async () => {
    setIsProcessing(true)
    
    try {
      // Create blob from recorded chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      
      // Convert webm to wav for better compatibility with Azure
      const wavBlob = await convertToWav(audioBlob)
      
      // Send to backend for transcription
      const response = await speechService.speechToText(wavBlob, language)
      
      if (response.data.success && response.data.text) {
        onTranscript?.(response.data.text)
      } else {
        setError(response.data.message || 'Could not recognize speech. Please try again.')
      }
      
    } catch (err) {
      console.error('Failed to process recording:', err)
      setError('Failed to process recording. Please try again.')
    } finally {
      setIsProcessing(false)
      audioChunksRef.current = []
    }
  }
  
  // Convert audio to WAV format
  const convertToWav = async (blob) => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      })
      
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const audioBuffer = await audioContext.decodeAudioData(reader.result)
          const wavBuffer = audioBufferToWav(audioBuffer)
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })
          resolve(wavBlob)
        } catch (err) {
          // If conversion fails, send original blob
          console.warn('WAV conversion failed, using original:', err)
          resolve(blob)
        } finally {
          audioContext.close()
        }
      }
      reader.onerror = () => resolve(blob) // Fallback to original
      reader.readAsArrayBuffer(blob)
    })
  }
  
  // Convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer) => {
    const numChannels = 1
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16
    
    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample
    
    const samples = buffer.getChannelData(0)
    const dataLength = samples.length * bytesPerSample
    const bufferLength = 44 + dataLength
    
    const arrayBuffer = new ArrayBuffer(bufferLength)
    const view = new DataView(arrayBuffer)
    
    // Write WAV header
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataLength, true)
    writeString(view, 8, 'WAVE')
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(view, 36, 'data')
    view.setUint32(40, dataLength, true)
    
    // Write audio data
    let offset = 44
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
    
    return arrayBuffer
  }
  
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }
  
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        {/* Microphone Button */}
        <button
          onClick={toggleRecording}
          disabled={disabled || isProcessing || permissionDenied}
          className={`relative p-3 rounded-full transition-all ${
            isRecording 
              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
              : isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isRecording ? 'Stop recording' : 'Start dictation'}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isRecording ? (
            <Square className="w-5 h-5" />
          ) : permissionDenied ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
          
          {/* Recording indicator */}
          {isRecording && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          )}
        </button>
        
        {/* Status Text */}
        <div className="flex-1">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-medium">Recording...</span>
              <span className="text-gray-500 text-sm">{formatTime(recordingTime)}</span>
            </div>
          ) : isProcessing ? (
            <span className="text-purple-600">Processing speech...</span>
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
      </div>
      
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-2 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Recording Tips */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-xs text-gray-500"
        >
          Speak clearly and tap the button again when done.
        </motion.div>
      )}
    </div>
  )
}

// Inline dictation for text areas
export function DictationTextArea({
  value,
  onChange,
  placeholder = 'Type or use dictation...',
  language = 'en-US',
  rows = 4,
  className = '',
  ...props
}) {
  const handleTranscript = (text) => {
    // Append transcribed text to existing value
    const newValue = value ? `${value} ${text}` : text
    onChange?.({ target: { value: newValue } })
  }
  
  return (
    <div className={className}>
      <div className="relative">
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
          {...props}
        />
        <div className="absolute bottom-2 right-2">
          <DictationButton 
            onTranscript={handleTranscript} 
            language={language}
            placeholder=""
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Click the microphone to dictate or type manually
      </p>
    </div>
  )
}
