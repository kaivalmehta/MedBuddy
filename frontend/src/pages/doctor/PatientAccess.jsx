// frontend/src/pages/doctor/PatientAccess.jsx

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkPatient, requestPatientAccess, verifyPatientOTP, getActiveSessions } from '../../services/professional'
import { UserSearch, Mail, Shield, ArrowRight, Loader2, CheckCircle, Clock, Users, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PatientAccess() {
  const navigate = useNavigate()
  
  // Steps: 'email' | 'otp' | 'success'
  const [step, setStep] = useState('email')
  const [patientEmail, setPatientEmail] = useState('')
  const [patientInfo, setPatientInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionData, setSessionData] = useState(null)
  const [activeSessions, setActiveSessions] = useState([])
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)
  const [createNewPatient, setCreateNewPatient] = useState(false)
  const [newPatientName, setNewPatientName] = useState({ first: '', last: '' })
  
  const otpRefs = useRef([])

  // Load active sessions on mount
  useEffect(() => {
    loadActiveSessions()
  }, [])

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

  const loadActiveSessions = async () => {
    try {
      const res = await getActiveSessions()
      setActiveSessions(res.data.sessions || [])
    } catch (err) {
      console.error('Failed to load active sessions:', err)
    }
  }

  // Step 1: Check if patient exists and request access
  const handleCheckPatient = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setCreateNewPatient(false)

    try {
      const res = await checkPatient(patientEmail)
      const data = res.data
      
      if (data.patient_exists) {
        setPatientInfo(data)
        
        if (data.has_active_session) {
          // Already have access, go directly to patient history
          setSessionData({ patient_id: data.patient_id })
          setStep('success')
        } else {
          // Need to request access
          await requestPatientAccess({
            patient_email: patientEmail,
            purpose: 'view_history'
          })
          setStep('otp')
          setResendTimer(60)
        }
      } else {
        // Patient doesn't exist, ask if they want to create
        setCreateNewPatient(true)
        setPatientInfo(data)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check patient. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Create new patient and send OTP
  const handleCreateAndRequest = async () => {
    setLoading(true)
    setError('')

    try {
      await requestPatientAccess({
        patient_email: patientEmail,
        purpose: 'view_history',
        create_if_not_exists: true,
        patient_first_name: newPatientName.first,
        patient_last_name: newPatientName.last
      })
      setStep('otp')
      setResendTimer(60)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create patient. Please try again.')
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
      handleVerifyOTP(newOtp.join(''))
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
        handleVerifyOTP(pastedData)
      }
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOTP = async (otpCode) => {
    setLoading(true)
    setError('')

    try {
      const res = await verifyPatientOTP({
        patient_email: patientEmail,
        otp_code: otpCode
      })
      setSessionData(res.data)
      setStep('success')
      loadActiveSessions() // Refresh sessions
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
      await requestPatientAccess({
        patient_email: patientEmail,
        purpose: 'view_history'
      })
      setResendTimer(60)
      setOtpValues(['', '', '', '', '', ''])
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const viewPatientHistory = () => {
    if (sessionData?.patient?.id) {
      navigate(`/doctor/patient/${sessionData.patient.id}`)
    }
  }

  const goToSession = (session) => {
    navigate(`/doctor/patient/${session.patient_id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UserSearch className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-display font-bold text-secondary-800">Access Patient Records</h1>
        <p className="text-secondary-500 mt-2">
          Enter patient's email to request access via OTP verification
        </p>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && step === 'email' && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold text-secondary-800">Active Sessions</h2>
          </div>
          <div className="space-y-2">
            {activeSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => goToSession(session)}
                className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-xl transition"
              >
                <div className="text-left">
                  <p className="font-medium text-secondary-800">{session.patient_name || session.patient_email}</p>
                  <p className="text-xs text-secondary-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires in {Math.round((new Date(session.expires_at) - new Date()) / 60000)} min
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-green-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Enter Email */}
        {step === 'email' && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <form onSubmit={handleCheckPatient} className="card">
              <div className="flex items-center gap-3 mb-6">
                <Mail className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Enter Patient Email</h2>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Patient's Email Address
                </label>
                <input
                  type="email"
                  value={patientEmail}
                  onChange={(e) => {
                    setPatientEmail(e.target.value)
                    setCreateNewPatient(false)
                  }}
                  className="input-field"
                  placeholder="patient@example.com"
                  required
                />
                <p className="text-xs text-secondary-500 mt-2">
                  An OTP will be sent to the patient's email for verification
                </p>
              </div>

              {/* Create New Patient Form */}
              {createNewPatient && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-amber-700 text-sm mb-4">
                    Patient not found. Enter their name to create a profile and send OTP:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newPatientName.first}
                      onChange={(e) => setNewPatientName({ ...newPatientName, first: e.target.value })}
                      className="input-field"
                      placeholder="First Name"
                    />
                    <input
                      type="text"
                      value={newPatientName.last}
                      onChange={(e) => setNewPatientName({ ...newPatientName, last: e.target.value })}
                      className="input-field"
                      placeholder="Last Name"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateAndRequest}
                    disabled={loading}
                    className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                    Create & Send OTP
                  </button>
                </div>
              )}

              {!createNewPatient && (
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  {loading ? 'Checking...' : 'Request Access'}
                </button>
              )}
            </form>
          </motion.div>
        )}

        {/* Step 2: Enter OTP */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Enter Verification Code</h2>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-700 text-sm">
                OTP has been sent to <strong>{patientEmail}</strong>. 
                Please ask the patient to share the 6-digit code with you.
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
                  setStep('email')
                  setOtpValues(['', '', '', '', '', ''])
                  setError('')
                }} 
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button 
                onClick={() => handleVerifyOTP(otpValues.join(''))}
                disabled={loading || otpValues.some(v => !v)} 
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                {loading ? 'Verifying...' : 'Verify OTP'}
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

        {/* Step 3: Access Granted */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-secondary-800 mb-2">Access Granted!</h2>
            <p className="text-secondary-500 mb-6">
              You can now view {patientEmail}'s medical history. Session expires in 1 hour.
            </p>

            <button onClick={viewPatientHistory} className="btn-primary w-full flex items-center justify-center gap-2">
              View Full History <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
