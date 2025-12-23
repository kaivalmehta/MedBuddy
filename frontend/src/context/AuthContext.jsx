import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

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

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setUser(JSON.parse(userData))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const response = await api.post('/auth/login/', { email, password })
    const { user: userData, tokens } = response.data
    
    localStorage.setItem('accessToken', tokens.access)
    localStorage.setItem('refreshToken', tokens.refresh)
    localStorage.setItem('user', JSON.stringify(userData))
    
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`
    setUser(userData)
    
    navigate(userData.role === 'pharmacy' ? '/pharmacy' : '/')
    return userData
  }

  const register = async (data) => {
    const response = await api.post('/auth/register/', data)
    const { user: userData, tokens } = response.data
    
    localStorage.setItem('accessToken', tokens.access)
    localStorage.setItem('refreshToken', tokens.refresh)
    localStorage.setItem('user', JSON.stringify(userData))
    
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`
    setUser(userData)
    
    navigate(userData.role === 'pharmacy' ? '/pharmacy' : '/')
    return userData
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await api.post('/auth/logout/', { refresh: refreshToken })
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

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

