// frontend/src/components/OTPInput.jsx
// REUSABLE OTP INPUT COMPONENT

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, RefreshCw, Mail, CheckCircle, XCircle } from 'lucide-react'

export default function OTPInput({ 
  length = 6, 
  onComplete, 
  onResend, 
  email,
  title = "Enter Verification Code",
  subtitle = "We've sent a 6-digit code to your email",
  loading = false,
  error = '',
  canResend = true,
  resendCooldown = 60
}) {
  const [otp, setOtp] = useState(new Array(length).fill(''))
  const [activeInput, setActiveInput] = useState(0)
  const [resendTimer, setResendTimer] = useState(resendCooldown)
  const [canResendNow, setCanResendNow] = useState(false)
  const inputRefs = useRef([])

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResendNow(true)
    }
  }, [resendTimer])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (element, index) => {
    const value = element.value.replace(/[^0-9]/g, '')
    
    if (value.length <= 1) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)
      
      // Move to next input
      if (value && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
        setActiveInput(index + 1)
      }
      
      // Check if complete
      const otpValue = newOtp.join('')
      if (otpValue.length === length && !newOtp.includes('')) {
        onComplete(otpValue)
      }
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
        setActiveInput(index - 1)
      }
      const newOtp = [...otp]
      newOtp[index] = ''
      setOtp(newOtp)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
      setActiveInput(index - 1)
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
      setActiveInput(index + 1)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length)
    
    if (pastedData) {
      const newOtp = [...otp]
      pastedData.split('').forEach((char, index) => {
        if (index < length) {
          newOtp[index] = char
        }
      })
      setOtp(newOtp)
      
      // Focus last filled input or last input
      const lastFilledIndex = Math.min(pastedData.length, length) - 1
      inputRefs.current[lastFilledIndex]?.focus()
      setActiveInput(lastFilledIndex)
      
      // Check if complete
      if (pastedData.length >= length) {
        onComplete(pastedData.slice(0, length))
      }
    }
  }

  const handleResend = () => {
    if (canResendNow && onResend) {
      onResend()
      setResendTimer(resendCooldown)
      setCanResendNow(false)
      setOtp(new Array(length).fill(''))
      inputRefs.current[0]?.focus()
      setActiveInput(0)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-secondary-800">{title}</h2>
        <p className="mt-2 text-secondary-500">{subtitle}</p>
        {email && (
          <p className="mt-1 text-primary-600 font-medium">{email}</p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
        >
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </motion.div>
      )}

      {/* OTP Input Fields */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-6">
        {otp.map((digit, index) => (
          <motion.input
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            onFocus={() => setActiveInput(index)}
            disabled={loading}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`
              w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl
              border-2 transition-all duration-200 outline-none
              ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              ${activeInput === index 
                ? 'border-primary-500 ring-2 ring-primary-500/20' 
                : digit 
                  ? 'border-primary-400 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }
              ${error ? 'border-red-300 shake' : ''}
            `}
          />
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
          <span className="text-secondary-600">Verifying...</span>
        </div>
      )}

      {/* Resend Option */}
      {canResend && (
        <div className="text-center">
          <p className="text-secondary-500 text-sm">
            Didn't receive the code?{' '}
            {canResendNow ? (
              <button
                onClick={handleResend}
                disabled={loading}
                className="text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Resend Code
              </button>
            ) : (
              <span className="text-secondary-400">
                Resend in {resendTimer}s
              </span>
            )}
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> Check your spam folder if you don't see the email. 
          The code expires in 10 minutes.
        </p>
      </div>
    </div>
  )
}
