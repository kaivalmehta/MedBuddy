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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('accessToken')
      const userData = localStorage.getItem('user')
      
      console.log('[Auth] Initializing, token exists:', !!token, 'user exists:', !!userData)
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          // Ensure api has the token
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          console.log('[Auth] User loaded:', parsedUser.email)
        } catch (e) {
          console.error('[Auth] Error parsing user data:', e)
          localStorage.removeItem('user')
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
      }
      
      // Clear the login transition flag after a short delay
      // This gives the Dashboard time to make initial requests
      setTimeout(() => {
        sessionStorage.removeItem('justLoggedIn')
      }, 2000)
      
      setLoading(false)
    }
    
    initAuth()
  }, [])

  // Set auth state (called after OTP verification)
  const setAuth = ({ user: userData, accessToken, refreshToken }) => {
    console.log('[Auth] Setting auth for:', userData.email)
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    setUser(userData)
  }

  // Logout
  const logout = async () => {
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

  // Show loading spinner while initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

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