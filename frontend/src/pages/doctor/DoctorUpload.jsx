// frontend/src/pages/doctor/DoctorUpload.jsx

import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { checkPatient, initiatePrescriptionUpload, uploadPrescription } from '../../services/professional'
import { Upload, FileText, X, Send, Loader2, CheckCircle, Mail, Shield, AlertCircle, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DoctorUpload() {
  const navigate = useNavigate()
  
  // Steps: 'upload' | 'otp' | 'success'
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [patientEmail, setPatientEmail] = useState('')
  const [patientInfo, setPatientInfo] = useState(null)
  const [doctorName, setDoctorName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [notes, setNotes] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)
  const [prescriptionResult, setPrescriptionResult] = useState(null)
  
  const otpRefs = useRef([])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // Focus first OTP input when step changes
  useEffect(() => {
    if (step === 'otp' && otpRefs.current[0]) {
      otpRefs.current[0].focus()
    }
  }, [step])

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (selectedFile.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(selectedFile))
      } else {
        setPreview(null)
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'], 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false
  })

  // Check if patient exists and if we have active session
  const handleCheckPatient = async () => {
    if (!patientEmail) return

    setLoading(true)
    setError('')

    try {
      const res = await checkPatient(patientEmail)
      setPatientInfo(res.data)
      setHasActiveSession(res.data.has_active_session || false)
    } catch (err) {
      // Patient might not exist, that's okay
      setPatientInfo({ patient_exists: false })
      setHasActiveSession(false)
    } finally {
      setLoading(false)
    }
  }

  // Initiate upload (sends OTP if no active session)
  const handleInitiateUpload = async () => {
    if (!file || !patientEmail) return

    setLoading(true)
    setError('')

    try {
      const res = await initiatePrescriptionUpload({
        patient_email: patientEmail,
        create_if_not_exists: true
      })

      if (res.data.has_active_session || res.data.ready_for_upload) {
        // Can upload directly
        await handleUpload()
      } else {
        // Need OTP verification
        setStep('otp')
        setResendTimer(60)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate upload')
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otpValues]
    newOtp[index] = value.slice(-1)
    setOtpValues(newOtp)

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    if (newOtp.every(v => v) && newOtp.join('').length === 6) {
      handleUploadWithOTP(newOtp.join(''))
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''))
      setOtpValues(newOtp)
      if (pastedData.length === 6) {
        handleUploadWithOTP(pastedData)
      }
    }
  }

  // Upload prescription without OTP (active session)
  const handleUpload = async () => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('patient_email', patientEmail)
    formData.append('doctor_name', doctorName)
    formData.append('clinic_name', clinicName)
    formData.append('notes', notes)
    formData.append('send_email', sendEmail)

    const res = await uploadPrescription(formData)
    setPrescriptionResult(res.data)
    setStep('success')
  }

  // Upload prescription with OTP
  const handleUploadWithOTP = async (otpCode) => {
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('patient_email', patientEmail)
      formData.append('otp_code', otpCode)
      formData.append('doctor_name', doctorName)
      formData.append('clinic_name', clinicName)
      formData.append('notes', notes)
      formData.append('send_email', sendEmail)

      const res = await uploadPrescription(formData)
      setPrescriptionResult(res.data)
      setStep('success')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code')
      setOtpValues(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return

    setLoading(true)
    setError('')

    try {
      await initiatePrescriptionUpload({
        patient_email: patientEmail,
        create_if_not_exists: true
      })
      setResendTimer(60)
      setOtpValues(['', '', '', '', '', ''])
    } catch (err) {
      setError('Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setPatientEmail('')
    setPatientInfo(null)
    setDoctorName('')
    setClinicName('')
    setNotes('')
    setHasActiveSession(false)
    setOtpValues(['', '', '', '', '', ''])
    setError('')
    setPrescriptionResult(null)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <Upload className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">Upload & Send Prescription</h1>
          <p className="text-secondary-500">Scan or upload a prescription to send to patient</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Upload Form */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* File Upload */}
              <div className="card">
                <h2 className="text-lg font-semibold text-secondary-800 mb-4">Prescription Image/PDF</h2>
                
                {!file ? (
                  <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}>
                    <input {...getInputProps()} />
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-secondary-600 font-medium">Drag & drop prescription here</p>
                    <p className="text-secondary-400 text-sm mt-1">or click to browse (JPG, PNG, PDF up to 10MB)</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    {preview ? (
                      <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                    ) : (
                      <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                        <FileText className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-secondary-800">{file.name}</p>
                      <p className="text-sm text-secondary-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Patient Email */}
              <div className="card">
                <h2 className="text-lg font-semibold text-secondary-800 mb-4">Send To</h2>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => {
                      setPatientEmail(e.target.value)
                      setPatientInfo(null)
                      setHasActiveSession(false)
                    }}
                    onBlur={handleCheckPatient}
                    className="input-field flex-1"
                    placeholder="Patient's email address *"
                    required
                  />
                </div>
                
                {patientInfo && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${patientInfo.patient_exists ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {patientInfo.patient_exists ? (
                      <>
                        <span className="font-medium">{patientInfo.patient_name || patientEmail}</span>
                        {hasActiveSession && (
                          <span className="ml-2 text-xs bg-green-200 px-2 py-0.5 rounded">Active Session</span>
                        )}
                      </>
                    ) : (
                      'New patient - profile will be created automatically'
                    )}
                  </div>
                )}
              </div>

              {/* Optional Info */}
              <div className="card">
                <h2 className="text-lg font-semibold text-secondary-800 mb-4">Prescription Details (Optional)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    value={doctorName} 
                    onChange={(e) => setDoctorName(e.target.value)} 
                    className="input-field" 
                    placeholder="Doctor Name" 
                  />
                  <input 
                    type="text" 
                    value={clinicName} 
                    onChange={(e) => setClinicName(e.target.value)} 
                    className="input-field" 
                    placeholder="Clinic Name" 
                  />
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field mt-4"
                  placeholder="Notes for patient (optional)"
                  rows={2}
                />
                
                <label className="flex items-center gap-3 mt-4 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sendEmail} 
                    onChange={(e) => setSendEmail(e.target.checked)} 
                    className="w-5 h-5 rounded border-gray-300 text-primary-500" 
                  />
                  <span className="text-secondary-700">Send email notification to patient</span>
                  <Mail className="w-4 h-4 text-secondary-400" />
                </label>
              </div>

              <button 
                onClick={handleInitiateUpload}
                disabled={loading || !file || !patientEmail} 
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'Processing...' : hasActiveSession ? 'Upload & Send' : 'Send OTP & Upload'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-secondary-800">Patient Verification Required</h2>
              <p className="text-secondary-500 mt-2">
                OTP sent to <strong>{patientEmail}</strong><br />
                Ask the patient to share the 6-digit code
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-center gap-3 mb-6">
              {otpValues.map((value, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  disabled={loading}
                />
              ))}
            </div>

            <div className="flex gap-3 mb-4">
              <button 
                type="button" 
                onClick={() => {
                  setStep('upload')
                  setOtpValues(['', '', '', '', '', ''])
                  setError('')
                }} 
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button 
                onClick={() => handleUploadWithOTP(otpValues.join(''))}
                disabled={loading || otpValues.some(v => !v)} 
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'Uploading...' : 'Verify & Upload'}
              </button>
            </div>

            <p className="text-center text-secondary-500">
              Didn't receive the code?{' '}
              {resendTimer > 0 ? (
                <span className="text-secondary-400">Resend in {resendTimer}s</span>
              ) : (
                <button onClick={handleResendOTP} disabled={loading} className="text-blue-600 hover:text-blue-700 font-medium">
                  Resend code
                </button>
              )}
            </p>
          </motion.div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card text-center py-12"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-display font-bold text-secondary-800 mb-2">Prescription Sent!</h2>
            <p className="text-secondary-500 mb-2">
              The prescription has been uploaded and sent to {patientEmail}
            </p>
            {prescriptionResult?.is_duplicate && (
              <p className="text-amber-600 text-sm mb-4">
                ⚠️ This appears to be a duplicate prescription
              </p>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={resetForm} className="btn-secondary">
                Upload Another
              </button>
              <button onClick={() => navigate('/doctor/history')} className="btn-primary flex items-center gap-2">
                View History <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
