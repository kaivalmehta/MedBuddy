// frontend/src/pages/auth/Register.jsx

import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { initiateRegistration, verifyRegistrationOTP, resendRegistrationOTP } from '../../services/api'
import { 
  Eye, EyeOff, Mail, Lock, User, Phone, Shield, ArrowLeft, Loader2, 
  AlertCircle, CheckCircle, Upload, Building, FileText, Stethoscope,
  FlaskConical, Pill, MapPin, Navigation
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  
  // Steps: 'details' | 'otp' | 'success'
  const [step, setStep] = useState('details')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('patient')
  const [showPassword, setShowPassword] = useState(false)
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)
  const [verificationFile, setVerificationFile] = useState(null)
  
  // Location state
  const [location, setLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  
  const otpRefs = useRef([])
  const fileInputRef = useRef(null)
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm()
  const password = watch('password')

  // Get current location
  const getLocation = () => {
    setLocationLoading(true)
    setLocationError('')
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser')
      setLocationLoading(false)
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
        setLocationLoading(false)
        setLocationError('')
      },
      (error) => {
        let message = 'Could not get location.'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. You can add it later in settings.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable. You can add it later in settings.'
            break
          case error.TIMEOUT:
            message = 'Location request timed out. You can add it later in settings.'
            break
        }
        setLocationError(message)
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }

  // Auto-get location when professional role is selected
  useEffect(() => {
    if (['doctor', 'pharmacy', 'laboratory'].includes(role)) {
      getLocation()
    } else {
      setLocation(null)
      setLocationError('')
    }
  }, [role])

  const roles = [
    { value: 'patient', label: 'Patient', icon: User, desc: 'Manage your prescriptions', color: 'bg-blue-500' },
    { value: 'doctor', label: 'Doctor', icon: Stethoscope, desc: 'Create prescriptions', color: 'bg-emerald-500' },
    { value: 'pharmacy', label: 'Pharmacy', icon: Pill, desc: 'Fulfill prescriptions', color: 'bg-purple-500' },
    { value: 'laboratory', label: 'Laboratory', icon: FlaskConical, desc: 'Upload lab reports', color: 'bg-amber-500' },
  ]

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

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        setError('Please upload a PDF or image file (JPG, PNG)')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }
      setVerificationFile(file)
      setError('')
    }
  }

  // Step 1: Submit registration details
  const onSubmitDetails = async (data) => {
    setLoading(true)
    setError('')

    try {
      // Build FormData for file upload support
      const formData = new FormData()
      formData.append('email', data.email)
      formData.append('username', data.username || data.email.split('@')[0])
      formData.append('password', data.password)
      formData.append('password_confirm', data.password_confirm)
      formData.append('first_name', data.first_name || '')
      formData.append('last_name', data.last_name || '')
      formData.append('phone', data.phone || '')
      formData.append('role', role)

      // Add location if available (for professionals)
      if (location && ['doctor', 'pharmacy', 'laboratory'].includes(role)) {
        formData.append('latitude', location.latitude)
        formData.append('longitude', location.longitude)
      }

      // Add role-specific profile data
      if (role === 'doctor') {
        formData.append('doctor_profile', JSON.stringify({
          specialization: data.specialization || '',
          qualification: data.qualification || '',
          registration_number: data.license_number || '',
          clinic_name: data.clinic_name || '',
          clinic_address: data.address || '',
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
        }))
      } else if (role === 'pharmacy') {
        formData.append('pharmacy_profile', JSON.stringify({
          name: data.business_name || '',
          license_number: data.license_number || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
        }))
      } else if (role === 'laboratory') {
        formData.append('laboratory_profile', JSON.stringify({
          name: data.business_name || '',
          license_number: data.license_number || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
        }))
      }

      // Add verification document if provided
      if (verificationFile && role !== 'patient') {
        formData.append('verification_document', verificationFile)
      }

      await initiateRegistration(formData)
      setEmail(data.email)
      setStep('otp')
      setResendTimer(60)
    } catch (err) {
      console.error('REGISTER ERROR:', err.response?.data)
      
      if (err.response?.data) {
        const errorData = err.response.data
        if (errorData.error) {
          setError(errorData.error)
        } else {
          const messages = Object.entries(errorData)
            .map(([field, errors]) => {
              const errMsg = Array.isArray(errors) ? errors.join(', ') : errors
              return `${field}: ${errMsg}`
            })
            .join('\n')
          setError(messages)
        }
      } else {
        setError('Registration failed. Please try again.')
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
      const response = await verifyRegistrationOTP({ email, otp_code: otpCode })
      console.log('[Register] OTP verify response:', response.data)
      
      const { tokens, user } = response.data
      const { access, refresh } = tokens

      localStorage.setItem('accessToken', access)
      localStorage.setItem('refreshToken', refresh)
      localStorage.setItem('user', JSON.stringify(user))

      setStep('success')
      setTimeout(() => {
        const dashboards = {
          patient: '/dashboard',
          pharmacy: '/pharmacy',
          doctor: '/doctor',
          laboratory: '/laboratory'
        }
        window.location.href = dashboards[user.role] || '/dashboard'
      }, 2000)

    } catch (err) {
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
      await resendRegistrationOTP(email)
      setResendTimer(60)
      setOtpValues(['', '', '', '', '', ''])
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Go back to details step
  const handleBack = () => {
    setStep('details')
    setOtpValues(['', '', '', '', '', ''])
    setError('')
  }

  // Render role-specific fields
  const renderRoleFields = () => {
    if (role === 'patient') return null

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="space-y-4 pt-4 border-t border-gray-200"
      >
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Building className="w-4 h-4" />
          Professional Details
        </h3>

        {/* Location Capture Section */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Your Location</span>
            </div>
            {locationLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : location ? (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Captured
              </span>
            ) : (
              <button
                type="button"
                onClick={getLocation}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Navigation className="w-4 h-4" />
                Enable Location
              </button>
            )}
          </div>
          
          {location && (
            <p className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded inline-block">
              📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          )}
          
          {locationError && (
            <p className="text-xs text-amber-600 mt-1">{locationError}</p>
          )}
          
          <p className="text-xs text-gray-600 mt-2">
            Patients will be able to find you in "Find Nearby" based on this location.
            You can update it later in your profile settings.
          </p>
        </div>

        {/* Doctor-specific fields */}
        {role === 'doctor' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization *</label>
                <input
                  type="text"
                  {...register('specialization', { required: role === 'doctor' ? 'Required' : false })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g., Cardiology"
                />
                {errors.specialization && <p className="mt-1 text-xs text-red-500">{errors.specialization.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qualification *</label>
                <input
                  type="text"
                  {...register('qualification', { required: role === 'doctor' ? 'Required' : false })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="e.g., MBBS, MD"
                />
                {errors.qualification && <p className="mt-1 text-xs text-red-500">{errors.qualification.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical License Number *</label>
              <input
                type="text"
                {...register('license_number', { required: role === 'doctor' ? 'Required' : false })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Your medical registration number"
              />
              {errors.license_number && <p className="mt-1 text-xs text-red-500">{errors.license_number.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic/Hospital Name</label>
              <input
                type="text"
                {...register('clinic_name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Your clinic or hospital name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Address</label>
              <input
                type="text"
                {...register('address')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Full address"
              />
            </div>
          </>
        )}

        {/* Pharmacy & Laboratory fields */}
        {(role === 'pharmacy' || role === 'laboratory') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {role === 'pharmacy' ? 'Pharmacy Name *' : 'Laboratory Name *'}
              </label>
              <input
                type="text"
                {...register('business_name', { required: 'Required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder={role === 'pharmacy' ? 'Your pharmacy name' : 'Your laboratory name'}
              />
              {errors.business_name && <p className="mt-1 text-xs text-red-500">{errors.business_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License/Registration Number *</label>
              <input
                type="text"
                {...register('license_number', { required: 'Required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Business license number"
              />
              {errors.license_number && <p className="mt-1 text-xs text-red-500">{errors.license_number.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <input
                type="text"
                {...register('address', { required: 'Required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Street address"
              />
              {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  {...register('city', { required: 'Required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  {...register('state', { required: 'Required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                <input
                  type="text"
                  {...register('zip_code', { required: 'Required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="ZIP"
                />
              </div>
            </div>
          </>
        )}

        {/* Verification Document Upload */}
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-1" />
            License Document (PDF/Image) *
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              verificationFile 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />
            {verificationFile ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{verificationFile.name}</span>
              </div>
            ) : (
              <div className="text-gray-500">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Click to upload your license document</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (max 5MB)</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This document will be reviewed by our admin team for verification.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <AnimatePresence mode="wait">
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Create account</h2>
              <p className="text-gray-600 mb-6">Start managing prescriptions safely</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-start gap-2 whitespace-pre-line"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmitDetails)} className="space-y-4">
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => {
                          setRole(r.value)
                          setVerificationFile(null)
                        }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          role === r.value 
                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${r.color} rounded-lg flex items-center justify-center`}>
                            <r.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className={`font-medium text-sm ${role === r.value ? 'text-blue-700' : 'text-gray-700'}`}>
                              {r.label}
                            </p>
                            <p className="text-xs text-gray-500">{r.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        {...register('first_name')}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="John"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      {...register('last_name')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                      })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="you@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone {role !== 'patient' && '*'}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      {...register('phone', { required: role !== 'patient' ? 'Phone required for professionals' : false })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password', {
                          required: 'Password is required',
                          minLength: { value: 8, message: 'Min 8 characters' }
                        })}
                        className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        {...register('password_confirm', {
                          required: 'Confirm password',
                          validate: v => v === password || 'Passwords must match'
                        })}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.password_confirm && <p className="mt-1 text-xs text-red-500">{errors.password_confirm.message}</p>}
                  </div>
                </div>

                {/* Role-specific fields */}
                <AnimatePresence mode="wait">
                  {renderRoleFields()}
                </AnimatePresence>

                {/* Professional Notice */}
                {role !== 'patient' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Professional accounts require admin verification. You'll have limited access until your credentials are verified.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-gray-600 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Sign in
                </Link>
              </p>
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
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Verify your email
                </h2>
                <p className="mt-2 text-gray-600">
                  We sent a 6-digit code to<br />
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
                    className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    disabled={loading}
                  />
                ))}
              </div>

              <button
                onClick={() => handleOtpSubmit(otpValues.join(''))}
                disabled={loading || otpValues.some(v => !v)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium flex items-center justify-center gap-2 mb-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Create Account'
                )}
              </button>

              <p className="text-center text-gray-600">
                Didn't receive the code?{' '}
                {resendTimer > 0 ? (
                  <span className="text-gray-400">
                    Resend in {resendTimer}s
                  </span>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-700 font-medium"
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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Account Created!
              </h2>
              <p className="text-gray-600">
                {role !== 'patient' 
                  ? 'Your professional account is pending verification. Redirecting...'
                  : 'Welcome to MedBuddy. Redirecting you to your dashboard...'
                }
              </p>
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mt-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}