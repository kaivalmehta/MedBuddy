// frontend/src/pages/laboratory/LabUploadReport.jsx

import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { labRequestPatientAccess, labVerifyPatientOTP, uploadLabReport } from '../../services/professional'
import { Upload, FileText, X, Send, Loader2, CheckCircle, Mail, TestTube, Shield, AlertCircle, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const REPORT_TYPES = [
  { value: 'blood_test', label: 'Blood Test' },
  { value: 'urine_test', label: 'Urine Test' },
  { value: 'xray', label: 'X-Ray' },
  { value: 'mri', label: 'MRI' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'ecg', label: 'ECG/EKG' },
  { value: 'pathology', label: 'Pathology' },
  { value: 'other', label: 'Other' },
]

export default function LabUploadReport() {
  const navigate = useNavigate()
  
  // Steps: 'upload' | 'otp' | 'success'
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [patientEmail, setPatientEmail] = useState('')
  const [reportType, setReportType] = useState('blood_test')
  const [reportTitle, setReportTitle] = useState('')
  const [referringDoctor, setReferringDoctor] = useState('')
  const [notes, setNotes] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)
  const [resultData, setResultData] = useState(null)
  
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

  // Initiate upload (sends OTP if no active session)
  const handleInitiateUpload = async () => {
    if (!file || !patientEmail || !reportTitle) return

    setLoading(true)
    setError('')

    try {
      // Request patient access (sends OTP)
      const res = await labRequestPatientAccess({
        patient_email: patientEmail,
        create_if_not_exists: true
      })

      if (res.data.has_active_session) {
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
      handleVerifyAndUpload(newOtp.join(''))
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
        handleVerifyAndUpload(pastedData)
      }
    }
  }

  // Upload report without OTP (active session)
  const handleUpload = async () => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('patient_email', patientEmail)
    formData.append('report_type', reportType)
    formData.append('report_title', reportTitle)
    formData.append('referring_doctor', referringDoctor)
    formData.append('notes', notes)
    formData.append('send_email', sendEmail)

    const res = await uploadLabReport(formData)
    setResultData(res.data)
    setStep('success')
  }

  // Verify OTP and upload report
  const handleVerifyAndUpload = async (otpCode) => {
    setLoading(true)
    setError('')

    try {
      // First verify OTP
      await labVerifyPatientOTP({
        patient_email: patientEmail,
        otp_code: otpCode
      })

      // Then upload report
      const formData = new FormData()
      formData.append('file', file)
      formData.append('patient_email', patientEmail)
      formData.append('report_type', reportType)
      formData.append('report_title', reportTitle)
      formData.append('referring_doctor', referringDoctor)
      formData.append('notes', notes)
      formData.append('send_email', sendEmail)

      const res = await uploadLabReport(formData)
      setResultData(res.data)
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
      await labRequestPatientAccess({
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
    setReportType('blood_test')
    setReportTitle('')
    setReferringDoctor('')
    setNotes('')
    setHasActiveSession(false)
    setOtpValues(['', '', '', '', '', ''])
    setError('')
    setResultData(null)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <TestTube className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">Upload Lab Report</h1>
          <p className="text-secondary-500">Upload and send report to patient</p>
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
                <h2 className="text-lg font-semibold text-secondary-800 mb-4">Report File</h2>
                {!file ? (
                  <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'}`}>
                    <input {...getInputProps()} />
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-secondary-600 font-medium">Drag & drop report here</p>
                    <p className="text-secondary-400 text-sm mt-1">JPG, PNG, or PDF up to 10MB</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    {preview ? (
                      <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                    ) : (
                      <div className="w-24 h-24 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-8 h-8 text-purple-500" />
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

              {/* Report Details */}
              <div className="card">
                <h2 className="text-lg font-semibold text-secondary-800 mb-4">Report Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Report Type *</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="input-field">
                      {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Report Title *</label>
                    <input 
                      type="text" 
                      value={reportTitle} 
                      onChange={(e) => setReportTitle(e.target.value)} 
                      className="input-field" 
                      placeholder="e.g., Complete Blood Count" 
                      required 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Referring Doctor (Optional)</label>
                    <input 
                      type="text" 
                      value={referringDoctor} 
                      onChange={(e) => setReferringDoctor(e.target.value)} 
                      className="input-field" 
                      placeholder="Dr. Name" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Notes (Optional)</label>
                    <textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      className="input-field min-h-[80px]" 
                      placeholder="Any additional notes..." 
                    />
                  </div>
                </div>
              </div>

              {/* Patient Email */}
              <div className="card">
                <h2 className="text-lg font-semibold text-secondary-800 mb-4">Send To</h2>
                <input 
                  type="email" 
                  value={patientEmail} 
                  onChange={(e) => setPatientEmail(e.target.value)} 
                  className="input-field" 
                  placeholder="Patient's email address *" 
                  required 
                />
                <p className="text-xs text-secondary-500 mt-2">
                  Patient will receive an OTP to verify and consent to receiving this report
                </p>
                <label className="flex items-center gap-3 mt-4 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sendEmail} 
                    onChange={(e) => setSendEmail(e.target.checked)} 
                    className="w-5 h-5 rounded border-gray-300 text-purple-500" 
                  />
                  <span className="text-secondary-700">Send email notification to patient</span>
                  <Mail className="w-4 h-4 text-secondary-400" />
                </label>
              </div>

              <button 
                onClick={handleInitiateUpload}
                disabled={loading || !file || !patientEmail || !reportTitle} 
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'Processing...' : 'Send OTP & Upload'}
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
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
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
                  className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
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
                onClick={() => handleVerifyAndUpload(otpValues.join(''))}
                disabled={loading || otpValues.some(v => !v)} 
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'Uploading...' : 'Verify & Send'}
              </button>
            </div>

            <p className="text-center text-secondary-500">
              Didn't receive the code?{' '}
              {resendTimer > 0 ? (
                <span className="text-secondary-400">Resend in {resendTimer}s</span>
              ) : (
                <button onClick={handleResendOTP} disabled={loading} className="text-purple-600 hover:text-purple-700 font-medium">
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
            <h2 className="text-2xl font-display font-bold text-secondary-800 mb-2">Report Sent!</h2>
            <p className="text-secondary-500 mb-6">
              The lab report has been uploaded and sent to {patientEmail}
            </p>
            
            {resultData && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left max-w-sm mx-auto">
                <div className="space-y-2 text-sm">
                  <p className="text-secondary-700">
                    <strong>Report:</strong> {reportTitle}
                  </p>
                  <p className="text-secondary-700">
                    <strong>Type:</strong> {REPORT_TYPES.find(t => t.value === reportType)?.label}
                  </p>
                  {resultData.email_sent && (
                    <div className="flex items-center gap-2 text-emerald-600 mt-2">
                      <Mail className="w-4 h-4" />
                      <span>Email notification sent</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 justify-center">
              <button onClick={resetForm} className="btn-secondary">
                Upload Another
              </button>
              <button onClick={() => navigate('/laboratory/sent')} className="btn-primary flex items-center gap-2">
                View History <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
