import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { initiateLogin, verifyLoginOTP, resendLoginOTP } from '../../services/api'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, Shield, ArrowLeft, Volume2, VolumeX, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

// Translations for multiple languages
const translations = {
  en: {
    welcome: 'Welcome back',
    signInContinue: 'Sign in to continue to MedBuddy',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    emailRequired: 'Email is required',
    emailInvalid: 'Invalid email',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'Password is required',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    continue: 'Continue',
    signingIn: 'Signing in...',
    noAccount: "Don't have an account?",
    createAccount: 'Create account',
    invalidCredentials: 'Invalid email or password',
    back: 'Back',
    verifyIdentity: 'Verify your identity',
    codeSentTo: 'We sent a 6-digit code to',
    invalidCode: 'Invalid verification code',
    verifySignIn: 'Verify & Sign in',
    verifying: 'Verifying...',
    didntReceive: "Didn't receive the code?",
    resendIn: 'Resend in',
    resendCode: 'Resend code',
    sessionExpired: 'Your session has expired. Please sign in again.',
    speakWelcome: 'Welcome back to MedBuddy. Please enter your email and password to sign in.',
    speakVerify: 'Please enter the 6-digit verification code sent to your email.',
  },
  es: {
    welcome: 'Bienvenido de nuevo',
    signInContinue: 'Inicia sesión para continuar a MedBuddy',
    email: 'Correo electrónico',
    emailPlaceholder: 'tu@ejemplo.com',
    emailRequired: 'El correo es requerido',
    emailInvalid: 'Correo inválido',
    password: 'Contraseña',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'La contraseña es requerida',
    rememberMe: 'Recuérdame',
    forgotPassword: '¿Olvidaste tu contraseña?',
    continue: 'Continuar',
    signingIn: 'Iniciando sesión...',
    noAccount: '¿No tienes cuenta?',
    createAccount: 'Crear cuenta',
    invalidCredentials: 'Correo o contraseña inválidos',
    back: 'Atrás',
    verifyIdentity: 'Verifica tu identidad',
    codeSentTo: 'Enviamos un código de 6 dígitos a',
    invalidCode: 'Código de verificación inválido',
    verifySignIn: 'Verificar e iniciar sesión',
    verifying: 'Verificando...',
    didntReceive: '¿No recibiste el código?',
    resendIn: 'Reenviar en',
    resendCode: 'Reenviar código',
    sessionExpired: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
    speakWelcome: 'Bienvenido de nuevo a MedBuddy. Por favor ingresa tu correo electrónico y contraseña.',
    speakVerify: 'Por favor ingresa el código de 6 dígitos enviado a tu correo.',
  },
  hi: {
    welcome: 'वापस स्वागत है',
    signInContinue: 'MedBuddy जारी रखने के लिए साइन इन करें',
    email: 'ईमेल',
    emailPlaceholder: 'आप@उदाहरण.com',
    emailRequired: 'ईमेल आवश्यक है',
    emailInvalid: 'अमान्य ईमेल',
    password: 'पासवर्ड',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'पासवर्ड आवश्यक है',
    rememberMe: 'मुझे याद रखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    continue: 'जारी रखें',
    signingIn: 'साइन इन हो रहा है...',
    noAccount: 'खाता नहीं है?',
    createAccount: 'खाता बनाएं',
    invalidCredentials: 'अमान्य ईमेल या पासवर्ड',
    back: 'वापस',
    verifyIdentity: 'अपनी पहचान सत्यापित करें',
    codeSentTo: 'हमने 6 अंकों का कोड भेजा',
    invalidCode: 'अमान्य सत्यापन कोड',
    verifySignIn: 'सत्यापित करें और साइन इन करें',
    verifying: 'सत्यापित हो रहा है...',
    didntReceive: 'कोड नहीं मिला?',
    resendIn: 'में पुनः भेजें',
    resendCode: 'कोड पुनः भेजें',
    sessionExpired: 'आपका सत्र समाप्त हो गया। कृपया फिर से साइन इन करें।',
    speakWelcome: 'MedBuddy में आपका स्वागत है। कृपया साइन इन करने के लिए अपना ईमेल और पासवर्ड दर्ज करें।',
    speakVerify: 'कृपया अपने ईमेल पर भेजा गया 6 अंकों का सत्यापन कोड दर्ज करें।',
  },
  zh: {
    welcome: '欢迎回来',
    signInContinue: '登录以继续使用MedBuddy',
    email: '电子邮件',
    emailPlaceholder: '你@示例.com',
    emailRequired: '需要电子邮件',
    emailInvalid: '无效的电子邮件',
    password: '密码',
    passwordPlaceholder: '••••••••',
    passwordRequired: '需要密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    continue: '继续',
    signingIn: '登录中...',
    noAccount: '没有账户？',
    createAccount: '创建账户',
    invalidCredentials: '无效的电子邮件或密码',
    back: '返回',
    verifyIdentity: '验证您的身份',
    codeSentTo: '我们发送了6位数代码到',
    invalidCode: '无效的验证码',
    verifySignIn: '验证并登录',
    verifying: '验证中...',
    didntReceive: '没有收到代码？',
    resendIn: '重新发送于',
    resendCode: '重新发送代码',
    sessionExpired: '您的会话已过期。请重新登录。',
    speakWelcome: '欢迎回到MedBuddy。请输入您的电子邮件和密码登录。',
    speakVerify: '请输入发送到您电子邮件的6位验证码。',
  },
  fr: {
    welcome: 'Bienvenue',
    signInContinue: 'Connectez-vous pour continuer sur MedBuddy',
    email: 'Email',
    emailPlaceholder: 'vous@exemple.com',
    emailRequired: "L'email est requis",
    emailInvalid: 'Email invalide',
    password: 'Mot de passe',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'Le mot de passe est requis',
    rememberMe: 'Se souvenir de moi',
    forgotPassword: 'Mot de passe oublié?',
    continue: 'Continuer',
    signingIn: 'Connexion...',
    noAccount: "Pas de compte?",
    createAccount: 'Créer un compte',
    invalidCredentials: 'Email ou mot de passe invalide',
    back: 'Retour',
    verifyIdentity: 'Vérifiez votre identité',
    codeSentTo: 'Nous avons envoyé un code à 6 chiffres à',
    invalidCode: 'Code de vérification invalide',
    verifySignIn: 'Vérifier et se connecter',
    verifying: 'Vérification...',
    didntReceive: "Vous n'avez pas reçu le code?",
    resendIn: 'Renvoyer dans',
    resendCode: 'Renvoyer le code',
    sessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
    speakWelcome: 'Bienvenue sur MedBuddy. Veuillez entrer votre email et mot de passe pour vous connecter.',
    speakVerify: 'Veuillez entrer le code de vérification à 6 chiffres envoyé à votre email.',
  }
}

const languageOptions = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
]

export default function Login() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Steps: 'credentials' | 'otp'
  const [step, setStep] = useState('credentials')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)
  
  // Language and speech
  const [language, setLanguage] = useState('en')
  const [speechEnabled, setSpeechEnabled] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  
  const otpRefs = useRef([])
  const { register, handleSubmit, formState: { errors } } = useForm()
  
  const t = translations[language]

  // Check for session expired parameter
  const sessionExpired = searchParams.get('session_expired') === 'true'

  // Speech synthesis
  const speak = (text) => {
    if (!speechEnabled || !window.speechSynthesis) return
    
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Set language for speech
    const langMap = { en: 'en-US', es: 'es-ES', hi: 'hi-IN', zh: 'zh-CN', fr: 'fr-FR' }
    utterance.lang = langMap[language] || 'en-US'
    utterance.rate = 0.9
    utterance.pitch = 1
    
    window.speechSynthesis.speak(utterance)
  }

  // Speak welcome message on page load or step change
  useEffect(() => {
    if (speechEnabled) {
      if (step === 'credentials') {
        speak(t.speakWelcome)
      } else if (step === 'otp') {
        speak(t.speakVerify)
      }
    }
    return () => window.speechSynthesis?.cancel()
  }, [step, speechEnabled, language])

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

  // Toggle speech
  const toggleSpeech = () => {
    if (speechEnabled) {
      window.speechSynthesis?.cancel()
    }
    setSpeechEnabled(!speechEnabled)
  }

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
        setError(t.invalidCredentials)
      }
      if (speechEnabled) speak(t.invalidCredentials)
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
      
      const { tokens, user } = response.data
      const { access, refresh } = tokens
      
      // Save to localStorage
      localStorage.setItem('accessToken', access)
      localStorage.setItem('refreshToken', refresh)
      localStorage.setItem('user', JSON.stringify(user))

      // Redirect based on role
      const dashboards = {
        patient: '/dashboard',
        pharmacy: '/pharmacy',
        doctor: '/doctor',
        laboratory: '/laboratory',
        admin: '/admin'
      }
      
      window.location.href = dashboards[user.role] || '/dashboard'

    } catch (err) {
      console.error('[Login] OTP verify error:', err.response?.data || err)
      setError(err.response?.data?.error || t.invalidCode)
      if (speechEnabled) speak(t.invalidCode)
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
      {/* Language and Speech Controls */}
      <div className="flex justify-end gap-2 mb-4">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{languageOptions.find(l => l.code === language)?.flag}</span>
          </button>
          
          {showLanguageMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              {languageOptions.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code)
                    setShowLanguageMenu(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    language === lang.code ? 'bg-primary-50 text-primary-600' : ''
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Speech Toggle */}
        <button
          onClick={toggleSpeech}
          className={`p-2 rounded-lg border transition-colors ${
            speechEnabled 
              ? 'bg-primary-50 border-primary-200 text-primary-600' 
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
          title={speechEnabled ? 'Disable speech' : 'Enable speech'}
        >
          {speechEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Session Expired Message */}
      {sessionExpired && step === 'credentials' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">{t.sessionExpired}</p>
        </motion.div>
      )}

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
                {t.welcome}
              </h2>
              <p className="mt-2 text-secondary-500">
                {t.signInContinue}
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
                  {t.email}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    {...register('email', {
                      required: t.emailRequired,
                      pattern: { value: /^\S+@\S+$/i, message: t.emailInvalid }
                    })}
                    className="input-field pl-12"
                    placeholder={t.emailPlaceholder}
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
                  {t.password}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { required: t.passwordRequired })}
                    className="input-field pl-12 pr-12"
                    placeholder={t.passwordPlaceholder}
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
                    {t.rememberMe}
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {t.forgotPassword}
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
                    {t.signingIn}
                  </>
                ) : (
                  t.continue
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
              {t.back}
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-display font-bold text-secondary-800">
                {t.verifyIdentity}
              </h2>
              <p className="mt-2 text-secondary-500">
                {t.codeSentTo}<br />
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
                  {t.verifying}
                </>
              ) : (
                t.verifySignIn
              )}
            </button>

            <p className="text-center text-secondary-500">
              {t.didntReceive}{' '}
              {resendTimer > 0 ? (
                <span className="text-secondary-400">
                  {t.resendIn} {resendTimer}s
                </span>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {t.resendCode}
                </button>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-8 text-center text-secondary-500">
        {t.noAccount}{' '}
        <Link
          to="/register"
          className="text-primary-600 hover:text-primary-700 font-semibold"
        >
          {t.createAccount}
        </Link>
      </p>
    </motion.div>
  )
}
