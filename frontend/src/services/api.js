import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
})

// Custom event for auth expiration - components can listen for this
export const AUTH_EXPIRED_EVENT = 'auth:expired'

// Function to dispatch auth expired event
const dispatchAuthExpired = () => {
  console.log('[API] Dispatching auth expired event')
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
}

// Function to clear auth data
const clearAuthData = () => {
  console.log('[API] Clearing auth data from localStorage')
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  delete api.defaults.headers.common['Authorization']
}

// Request interceptor - always read fresh token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    console.log('[API Request]', config.method?.toUpperCase(), config.url)
    
    if (token) {
      // Make sure headers object exists
      if (!config.headers) {
        config.headers = {}
      }
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// Response interceptor for token refresh and auto-logout on expiration
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const url = originalRequest?.url
    
    console.error('[API Error]', status, url, error.response?.data?.detail || '')
    
    // Skip token refresh logic for auth endpoints
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/password', '/auth/token']
    const isAuthEndpoint = authEndpoints.some(ep => url?.includes(ep))
    
    // Handle 401 Unauthorized
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem('refreshToken')
      console.log('[API] Token expired, attempting refresh...')
      
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/token/refresh/`,
            { refresh: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          )
          
          const { access } = response.data
          console.log('[API] Token refresh successful')
          localStorage.setItem('accessToken', access)
          api.defaults.headers.common['Authorization'] = `Bearer ${access}`
          originalRequest.headers.Authorization = `Bearer ${access}`
          
          return api(originalRequest)
        } catch (refreshError) {
          console.error('[API] Token refresh failed:', refreshError.response?.status)
          
          // Refresh token is also expired or invalid - clear auth and redirect
          clearAuthData()
          dispatchAuthExpired()
          
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token available - clear auth and redirect
        console.log('[API] No refresh token available')
        clearAuthData()
        dispatchAuthExpired()
      }
    }
    
    // Handle 403 Forbidden (sometimes used for expired tokens)
    if (status === 403 && error.response?.data?.code === 'token_not_valid') {
      console.log('[API] Received token_not_valid error')
      clearAuthData()
      dispatchAuthExpired()
    }
    
    return Promise.reject(error)
  }
)

// ============================================
// AUTH APIs - 2-STEP OTP VERIFICATION
// ============================================

// Registration - Step 1: Initiate (sends OTP)
export const initiateRegistration = (data) => {
  // Check if data is FormData (for file uploads)
  if (data instanceof FormData) {
    return api.post('/auth/register/', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
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
