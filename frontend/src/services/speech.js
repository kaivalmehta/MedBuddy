// ============================================
// frontend/src/services/speech.js
// Azure Speech Services API
// ============================================

import api from './api'

export const speechService = {
  // Get available voices
  getVoices: () => api.get('/prescriptions/speech/voices/'),
  
  // Text-to-Speech for prescription
  speakPrescription: (prescriptionId, voice = 'en-US-JennyNeural') => 
    api.post(`/prescriptions/${prescriptionId}/speak/`, { voice }),
  
  // Text-to-Speech for lab report
  speakLabReport: (reportId, voice = 'en-US-JennyNeural') => 
    api.post(`/prescriptions/lab-reports/${reportId}/speak/`, { voice }),
  
  // Custom text-to-speech
  speakText: (text, voice = 'en-US-JennyNeural') => 
    api.post('/prescriptions/speech/text-to-speech/', { text, voice }),
  
  // Speech-to-Text
  transcribe: (audioBlob, language = 'en-US') => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.wav')
    formData.append('language', language)
    return api.post('/prescriptions/speech/speech-to-text/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // Alias for backward compatibility with existing components
  getPrescriptionAudio: (prescriptionId, voice = 'en-US-JennyNeural') => 
    api.post(`/prescriptions/${prescriptionId}/speak/`, { voice }),
  
  getLabReportAudio: (reportId, voice = 'en-US-JennyNeural') => 
    api.post(`/prescriptions/lab-reports/${reportId}/speak/`, { voice }),
}

// Audio player utility
export class AudioPlayer {
  constructor() {
    this.audio = null
    this.isPlaying = false
  }
  
  playBase64(base64Data, contentType = 'audio/mpeg') {
    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        this.stop()
        
        // Create audio from base64
        const audioData = `data:${contentType};base64,${base64Data}`
        this.audio = new Audio(audioData)
        
        this.audio.onended = () => {
          this.isPlaying = false
          resolve()
        }
        
        this.audio.onerror = (e) => {
          this.isPlaying = false
          reject(e)
        }
        
        this.isPlaying = true
        this.audio.play()
      } catch (error) {
        reject(error)
      }
    })
  }
  
  stop() {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.isPlaying = false
    }
  }
  
  pause() {
    if (this.audio && this.isPlaying) {
      this.audio.pause()
      this.isPlaying = false
    }
  }
  
  resume() {
    if (this.audio && !this.isPlaying) {
      this.audio.play()
      this.isPlaying = true
    }
  }
}

// Voice recorder utility for speech-to-text
export class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null
    this.audioChunks = []
    this.isRecording = false
  }
  
  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      this.audioChunks = []
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }
      
      this.mediaRecorder.start()
      this.isRecording = true
      return true
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw new Error('Microphone access denied or not available')
    }
  }
  
  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null)
        return
      }
      
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        
        // Convert to WAV for Azure Speech API
        const wavBlob = await this.convertToWav(audioBlob)
        
        this.isRecording = false
        this.audioChunks = []
        
        // Stop all tracks
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop())
        
        resolve(wavBlob)
      }
      
      this.mediaRecorder.stop()
    })
  }
  
  async convertToWav(webmBlob) {
    // For simplicity, we'll send webm and let the backend handle it
    // In production, you might want to use audiobuffer-to-wav library
    return webmBlob
  }
}

export default speechService
