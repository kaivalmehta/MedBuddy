import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { initiateLogin, verifyLoginOTP, resendLoginOTP } from '../../services/api'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, Shield, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  // Steps: 'credentials' | 'otp'
  const [step, setStep] = useState('credentials')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)
  
  const otpRefs = useRef([])
  const { register, handleSubmit, formState: { errors } } = useForm()

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

  // Step 1: Submit credentials
  const onSubmitCredentials = async (data) => {
    setLoading(true)
    setError('')

    try {
      const response = await initiateLogin(data)
      setEmail(data.email)
      setStep('otp')
      setResendTimer(60)
    } catch (err) {
      const errorData = err.response?.data
      if (errorData?.error) {
        setError(errorData.error)
      } else if (errorData?.detail) {
        setError(errorData.detail)
      } else {
        setError('Invalid email or password')
      }
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

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when complete
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

  // Step 2: Verify OTP
  const handleOtpSubmit = async (otpCode) => {
    setLoading(true)
    setError('')

    try {
      const response = await verifyLoginOTP({ email, otp_code: otpCode })
      console.log('[Login] OTP verify response:', response.data)
      
      // Backend returns: { message, user, tokens: { access, refresh } }
      const { tokens, user } = response.data
      const { access, refresh } = tokens
      
      console.log('[Login] Access token:', access ? access.substring(0, 50) + '...' : 'NULL')
      console.log('[Login] Refresh token:', refresh ? refresh.substring(0, 50) + '...' : 'NULL')
      console.log('[Login] User:', user)

      // Save to localStorage
      localStorage.setItem('accessToken', access)
      localStorage.setItem('refreshToken', refresh)
      localStorage.setItem('user', JSON.stringify(user))
      
      // Verify storage
      console.log('[Login] Stored accessToken:', localStorage.getItem('accessToken')?.substring(0, 50) + '...')

      // Redirect based on role
      const dashboards = {
        patient: '/dashboard',
        pharmacy: '/pharmacy',
        doctor: '/doctor',
        laboratory: '/laboratory',
        admin: '/admin'
      }
      
      console.log('[Login] Redirecting to:', dashboards[user.role] || '/dashboard')
      window.location.href = dashboards[user.role] || '/dashboard'

    } catch (err) {
      console.error('[Login] OTP verify error:', err.response?.data || err)
      setError(err.response?.data?.error || 'Invalid verification code')
      setOtpValues(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return

    setLoading(true)
    setError('')

    try {
      await resendLoginOTP(email)
      setResendTimer(60)
      setOtpValues(['', '', '', '', '', ''])
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Go back to credentials step
  const handleBack = () => {
    setStep('credentials')
    setOtpValues(['', '', '', '', '', ''])
    setError('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence mode="wait">
        {step === 'credentials' ? (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-secondary-800">
                Welcome back
              </h2>
              <p className="mt-2 text-secondary-500">
                Sign in to continue to MedBuddy
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
                <p className="text-sm text-danger-600">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmitCredentials)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                    })}
                    className="input-field pl-12"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-danger-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { required: 'Password is required' })}
                    className="input-field pl-12 pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-danger-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-600">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-secondary-600 hover:text-secondary-800 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-display font-bold text-secondary-800">
                Verify your identity
              </h2>
              <p className="mt-2 text-secondary-500">
                We sent a 6-digit code to<br />
                <span className="font-medium text-secondary-700">{email}</span>
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
                <p className="text-sm text-danger-600">{error}</p>
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
                  className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  disabled={loading}
                />
              ))}
            </div>

            <button
              onClick={() => handleOtpSubmit(otpValues.join(''))}
              disabled={loading || otpValues.some(v => !v)}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Sign in'
              )}
            </button>

            <p className="text-center text-secondary-500">
              Didn't receive the code?{' '}
              {resendTimer > 0 ? (
                <span className="text-secondary-400">
                  Resend in {resendTimer}s
                </span>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Resend code
                </button>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-8 text-center text-secondary-500">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="text-primary-600 hover:text-primary-700 font-semibold"
        >
          Create account
        </Link>
      </p>
    </motion.div>
  )
}
