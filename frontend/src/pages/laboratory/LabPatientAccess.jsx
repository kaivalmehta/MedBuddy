import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { laboratoryService } from '../../services/professional'
import { 
  UserSearch, Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle, 
  Shield, User, Clock, FlaskConical, Send
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LabPatientAccess() {
  const navigate = useNavigate()
  
  // Steps: 'email' | 'otp' | 'success'
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [patientData, setPatientData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)
  const [activeSessions, setActiveSessions] = useState([])
  const [createMode, setCreateMode] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  
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
      const res = await laboratoryService.getActiveSessions()
      setActiveSessions(res.data || [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }

  // Step 1: Check patient email
  const handleCheckPatient = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    
    setLoading(true)
    setError('')
    setCreateMode(false)
    
    try {
      const res = await laboratoryService.checkPatient(email.trim().toLowerCase())
      
      if (res.data.exists) {
        if (res.data.has_active_session) {
          // Already have access, go directly to history
          setPatientData(res.data)
          setStep('success')
        } else {
          // Need to request OTP
          await requestAccess(email.trim().toLowerCase())
        }
      } else {
        // Patient doesn't exist, show create form
        setCreateMode(true)
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setCreateMode(true)
      } else {
        setError(err.response?.data?.error || 'Failed to check patient')
      }
    } finally {
      setLoading(false)
    }
  }

  // Request OTP access
  const requestAccess = async (patientEmail, isNew = false) => {
    setLoading(true)
    setError('')
    
    try {
      const payload = {
        patient_email: patientEmail,
        create_if_not_exists: isNew,
      }
      if (isNew) {
        payload.patient_first_name = firstName
        payload.patient_last_name = lastName
      }
      
      await laboratoryService.requestPatientAccess(payload)
      setStep('otp')
      setResendTimer(60)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // Handle create patient and request access
  const handleCreateAndRequest = async (e) => {
    e.preventDefault()
    if (!firstName.trim()) {
      setError('First name is required')
      return
    }
    await requestAccess(email.trim().toLowerCase(), true)
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
      handleOtpSubmit(newOtp.join(''))
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
        handleOtpSubmit(pastedData)
      }
    }
  }

  // Verify OTP
  const handleOtpSubmit = async (otpCode) => {
    setLoading(true)
    setError('')

    try {
      const res = await laboratoryService.verifyPatientOTP({
        email: email.trim().toLowerCase(),
        otp_code: otpCode
      })
      
      setPatientData(res.data)
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
    await requestAccess(email.trim().toLowerCase())
  }

  const handleBack = () => {
    setStep('email')
    setOtpValues(['', '', '', '', '', ''])
    setError('')
    setCreateMode(false)
  }

  const handleViewHistory = () => {
    if (patientData?.patient_id) {
      navigate(`/laboratory/patient/${patientData.patient_id}`)
    }
  }

  const handleContinueSession = (session) => {
    navigate(`/laboratory/patient/${session.patient_id}`)
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="card p-8">
        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserSearch className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Access Patient</h2>
                <p className="mt-2 text-gray-600">
                  Enter patient's email to access their history
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center gap-2"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {/* Active Sessions */}
              {activeSessions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Active Sessions</h3>
                  <div className="space-y-2">
                    {activeSessions.map((session) => (
                      <button
                        key={session.patient_id}
                        onClick={() => handleContinueSession(session)}
                        className="w-full p-3 bg-purple-50 border border-purple-200 rounded-lg text-left hover:bg-purple-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-purple-700" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{session.patient_name}</p>
                              <p className="text-xs text-gray-500">{session.patient_email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-purple-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">
                              {new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleCheckPatient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="patient@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Create Patient Form */}
                {createMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <p className="text-sm text-amber-800">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Patient not found. Create a new patient record:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateAndRequest}
                      disabled={loading}
                      className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Create & Send OTP
                    </button>
                  </motion.div>
                )}

                {!createMode && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <UserSearch className="w-5 h-5" />
                        Check Patient
                      </>
                    )}
                  </button>
                )}
              </form>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Enter OTP</h2>
                <p className="mt-2 text-gray-600">
                  A 6-digit code was sent to<br />
                  <span className="font-medium text-gray-800">{email}</span>
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center gap-2"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </motion.div>
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

              <button
                onClick={() => handleOtpSubmit(otpValues.join(''))}
                disabled={loading || otpValues.some(v => !v)}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-2 mb-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Access'
                )}
              </button>

              <p className="text-center text-gray-600">
                Didn't receive the code?{' '}
                {resendTimer > 0 ? (
                  <span className="text-gray-400">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Resend code
                  </button>
                )}
              </p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Granted!</h2>
              <p className="text-gray-600 mb-2">
                You now have access to {patientData?.patient_name || patientData?.patient_email}'s records
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Session expires at {patientData?.expires_at ? new Date(patientData.expires_at).toLocaleTimeString() : '1 hour'}
              </p>
              
              <button
                onClick={handleViewHistory}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-medium flex items-center justify-center gap-2"
              >
                <FlaskConical className="w-5 h-5" />
                View Patient History
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
