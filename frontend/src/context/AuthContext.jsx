import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api, { logoutUser, AUTH_EXPIRED_EVENT } from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initialize from localStorage synchronously to avoid flash
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('accessToken')
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData)
        // Set axios header immediately
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        console.log('[Auth] Initial user from localStorage:', parsed.email)
        return parsed
      } catch (e) {
        console.error('[Auth] Error parsing stored user:', e)
        return null
      }
    }
    return null
  })
  const [loading, setLoading] = useState(false) // Start as false since we init from localStorage
  const [sessionExpired, setSessionExpired] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Handle session expiration - redirect to login
  const handleSessionExpired = useCallback(() => {
    console.log('[Auth] Session expired, redirecting to login')
    setUser(null)
    setSessionExpired(true)
    
    // Don't redirect if already on auth pages
    const authPages = ['/login', '/register', '/forgot-password']
    if (!authPages.includes(location.pathname)) {
      // Use search params for reliable detection
      navigate('/login?session_expired=true', { 
        replace: true 
      })
    }
  }, [navigate, location.pathname])

  // Listen for auth expired events from API interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      console.log('[Auth] Received auth:expired event')
      handleSessionExpired()
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    }
  }, [handleSessionExpired])

  // Check token validity - decode JWT and check expiry
  const isTokenExpired = (token) => {
    if (!token) return true
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      // Check if token expires in less than 60 seconds
      return payload.exp * 1000 < Date.now() + 60000
    } catch (e) {
      console.error('[Auth] Error decoding token:', e)
      return true
    }
  }

  // Check token on window focus (when user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      const token = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (user && isTokenExpired(token) && isTokenExpired(refreshToken)) {
        console.log('[Auth] Tokens expired on focus, triggering session expired')
        handleSessionExpired()
      }
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, handleSessionExpired])

  // Periodic token check every 5 minutes
  useEffect(() => {
    if (!user) return

    const checkInterval = setInterval(() => {
      const token = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (isTokenExpired(token) && isTokenExpired(refreshToken)) {
        console.log('[Auth] Periodic check: tokens expired')
        handleSessionExpired()
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => clearInterval(checkInterval)
  }, [user, handleSessionExpired])

  // Clear session expired message after it's been shown
  const clearSessionExpired = () => {
    setSessionExpired(false)
  }

  // Set auth state (called after OTP verification)
  const setAuth = ({ user: userData, accessToken, refreshToken }) => {
    console.log('[Auth] setAuth called for:', userData.email)
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    setUser(userData)
    setSessionExpired(false)
  }

  // Logout
  const logout = async () => {
    console.log('[Auth] Logout called')
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        await logoutUser(refreshToken)
      }
    } catch (e) {
      console.error('Logout error:', e)
    }
    
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    navigate('/login')
  }

  // Update user data
  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role
  }

  // Check if user is professional (doctor, pharmacy, laboratory)
  const isProfessional = () => {
    return ['doctor', 'pharmacy', 'laboratory'].includes(user?.role)
  }

  // Check if professional is verified
  const isVerifiedProfessional = () => {
    return isProfessional() && user?.is_professional_verified
  }

  // Get dashboard path for user role
  const getDashboardPath = () => {
    if (!user) return '/login'
    
    const paths = {
      patient: '/dashboard',
      doctor: '/doctor',
      pharmacy: '/pharmacy',
      laboratory: '/laboratory',
      admin: '/admin'
    }
    return paths[user.role] || '/dashboard'
  }

  // Log when user changes
  useEffect(() => {
    console.log('[Auth] User state changed:', user ? user.email : 'null')
  }, [user])

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      sessionExpired,
      clearSessionExpired,
      setAuth,
      logout, 
      updateUser,
      hasRole,
      isProfessional,
      isVerifiedProfessional,
      getDashboardPath
    }}>
      {children}
    </AuthContext.Provider>
  )
}
