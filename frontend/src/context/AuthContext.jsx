import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { logoutUser } from '../services/api'

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
  const navigate = useNavigate()

  // Set auth state (called after OTP verification)
  const setAuth = ({ user: userData, accessToken, refreshToken }) => {
    console.log('[Auth] setAuth called for:', userData.email)
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    setUser(userData)
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
