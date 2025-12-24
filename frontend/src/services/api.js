import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor - always read fresh token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Skip token refresh logic for auth endpoints
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/password', '/auth/token']
    const isAuthEndpoint = authEndpoints.some(ep => originalRequest.url?.includes(ep))
    
    // Check if we're in the middle of a login transition (just logged in)
    const justLoggedIn = sessionStorage.getItem('justLoggedIn')
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // If we just logged in, don't try to refresh or redirect - just ignore these errors
      if (justLoggedIn) {
        console.log('[API] Ignoring 401 during login transition')
        return Promise.reject(error)
      }
      
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/token/refresh/`,
            { refresh: refreshToken }
          )
          
          const { access } = response.data
          localStorage.setItem('accessToken', access)
          originalRequest.headers['Authorization'] = `Bearer ${access}`
          
          return api(originalRequest)
        } catch (refreshError) {
          // Only clear tokens and redirect if we're NOT in login transition
          if (!justLoggedIn) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login'
            }
          }
          return Promise.reject(refreshError)
        }
      } else if (!window.location.pathname.includes('/login')) {
        // No refresh token and not on login page - redirect
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// ============================================
// AUTH APIs - 2-STEP OTP VERIFICATION
// ============================================

// Registration - Step 1: Initiate (sends OTP)
export const initiateRegistration = (data) => {
  return api.post('/auth/register/', data)
}

// Registration - Step 2: Verify OTP and create account
export const verifyRegistrationOTP = (data) => {
  return api.post('/auth/register/verify/', data)
}

// Registration - Resend OTP
export const resendRegistrationOTP = (email) => {
  return api.post('/auth/register/resend-otp/', { email, purpose: 'registration' })
}

// Login - Step 1: Validate credentials (sends OTP)
export const initiateLogin = (data) => {
  return api.post('/auth/login/', data)
}

// Login - Step 2: Verify OTP and get tokens
export const verifyLoginOTP = (data) => {
  return api.post('/auth/login/verify/', data)
}

// Login - Quick (without OTP - for development)
export const quickLogin = (data) => {
  return api.post('/auth/login/quick/', data)
}

// Login - Resend OTP
export const resendLoginOTP = (email) => {
  return api.post('/auth/register/resend-otp/', { email, purpose: 'login' })
}

// Password Reset - Step 1: Request (sends OTP)
export const requestPasswordReset = (email) => {
  return api.post('/auth/password/reset/', { email })
}

// Password Reset - Step 2: Verify OTP
export const verifyPasswordResetOTP = (data) => {
  return api.post('/auth/password/reset/verify/', data)
}

// Password Reset - Step 3: Set new password
export const confirmPasswordReset = (data) => {
  return api.post('/auth/password/reset/confirm/', data)
}

// Change Password (authenticated)
export const changePassword = (data) => {
  return api.post('/auth/password/change/', data)
}

// Logout
export const logoutUser = (refreshToken) => {
  return api.post('/auth/logout/', { refresh: refreshToken })
}

// Email Verification
export const checkEmailVerification = () => {
  return api.get('/auth/email/status/')
}

export const requestEmailVerification = () => {
  return api.post('/auth/email/request-verification/')
}

export const verifyEmail = (otp) => {
  return api.post('/auth/email/verify/', { otp_code: otp })
}

// ============================================
// PROFILE APIs
// ============================================

export const getProfile = () => api.get('/auth/profile/')
export const updateProfile = (data) => api.patch('/auth/profile/', data)
export const getHealthProfile = () => api.get('/auth/health-profile/')
export const updateHealthProfile = (data) => api.patch('/auth/health-profile/', data)

// Family Members
export const getFamilyMembers = () => api.get('/auth/family-members/')
export const addFamilyMember = (data) => api.post('/auth/family-members/', data)
export const updateFamilyMember = (id, data) => api.patch(`/auth/family-members/${id}/`, data)
export const deleteFamilyMember = (id) => api.delete(`/auth/family-members/${id}/`)

export default api