import api from './api'

export const pharmacyService = {
  getNearby: (lat, lng, radius = 10) => 
    api.get('/pharmacy/nearby/', { params: { lat, lng, radius } }),
  getProfile: () => api.get('/pharmacy/profile/'),
  updateProfile: (data) => api.patch('/pharmacy/profile/', data),
  getReviews: (pharmacyId) => api.get(`/pharmacy/${pharmacyId}/reviews/`),
  addReview: (pharmacyId, data) => api.post(`/pharmacy/${pharmacyId}/reviews/`, data),
}

export const orderService = {
  list: (params) => api.get('/pharmacy/orders/', { params }),
  get: (id) => api.get(`/pharmacy/orders/${id}/`),
  updateStatus: (id, data) => api.patch(`/pharmacy/orders/${id}/status/`, data),
  verify: (id, data) => api.post(`/pharmacy/orders/${id}/verify/`, data),
  getChat: (orderId) => api.get(`/pharmacy/chat/${orderId}/`),
  sendMessage: (orderId, message) => api.post(`/pharmacy/chat/${orderId}/`, { message }),
}

export const inventoryService = {
  list: () => api.get('/pharmacy/inventory/'),
  create: (data) => api.post('/pharmacy/inventory/', data),
  update: (id, data) => api.patch(`/pharmacy/inventory/${id}/`, data),
  delete: (id) => api.delete(`/pharmacy/inventory/${id}/`),
}