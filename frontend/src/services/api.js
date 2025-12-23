import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh/`,
          { refresh: refreshToken }
        )
        
        const { access } = response.data
        localStorage.setItem('accessToken', access)
        api.defaults.headers.common['Authorization'] = `Bearer ${access}`
        originalRequest.headers['Authorization'] = `Bearer ${access}`
        
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)
// 🔹 Auth APIs
export const registerUser = (data) => {
  return api.post('/auth/register/', data)
}

export const loginUser = (data) => {
  return api.post('/auth/login/', data)
}

export const logoutUser = (refreshToken) => {
  return api.post('/auth/logout/', { refresh: refreshToken })
}

export default api