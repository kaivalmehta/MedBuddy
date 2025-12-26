import api from './api'

export const pharmacyService = {
  getNearby: (lat, lng, radius = 10) => 
    api.get('/pharmacy/nearby/', { params: { lat, lng, radius } }),
  getProfile: () => api.get('/pharmacy/profile/'),
  updateProfile: (data) => api.patch('/pharmacy/profile/', data),
  getDashboard: () => api.get('/pharmacy/dashboard/'),
  getReviews: (pharmacyId) => api.get(`/pharmacy/${pharmacyId}/reviews/`),
  addReview: (pharmacyId, data) => api.post(`/pharmacy/${pharmacyId}/reviews/`, data),
  
  // Patient Access
  checkPatient: (email) => api.post('/pharmacy/patient/check/', { patient_email: email }),
  requestPatientAccess: (data) => api.post('/pharmacy/patient/request-access/', data),
  verifyPatientOTP: (data) => api.post('/pharmacy/patient/verify-otp/', data),
  getActiveSessions: () => api.get('/pharmacy/patient/sessions/'),
  getPatientHistory: (patientId) => api.get(`/pharmacy/patient/${patientId}/history/`),
  
  // Prescriptions
  getPrescriptionHistory: (params) => api.get('/pharmacy/prescriptions/', { params }),
  analyzePrescription: (id) => api.post(`/pharmacy/prescription/${id}/analyze/`),
}

export const orderService = {
  list: (params) => api.get('/pharmacy/orders/', { params }),
  get: (id) => api.get(`/pharmacy/orders/${id}/`),
  updateStatus: (id, data) => api.patch(`/pharmacy/orders/${id}/status/`, data),
  verify: (id, data) => api.post(`/pharmacy/orders/${id}/verify/`, data),
  getChat: (orderId) => api.get(`/pharmacy/orders/${orderId}/chat/`),
  sendMessage: (orderId, message) => api.post(`/pharmacy/orders/${orderId}/chat/`, { message }),
}

export const inventoryService = {
  list: (params) => api.get('/pharmacy/inventory/', { params }),
  get: (id) => api.get(`/pharmacy/inventory/${id}/`),
  create: (data) => api.post('/pharmacy/inventory/', data),
  update: (id, data) => api.patch(`/pharmacy/inventory/${id}/`, data),
  delete: (id) => api.delete(`/pharmacy/inventory/${id}/`),
  
  // Inventory management
  getAlerts: () => api.get('/pharmacy/inventory/alerts/'),
  restock: (id, data) => api.post(`/pharmacy/inventory/${id}/restock/`, data),
  bulkUpdate: (updates) => api.post('/pharmacy/inventory/bulk-update/', { updates }),
}

export const salesService = {
  dispense: (data) => api.post('/pharmacy/sales/dispense/', data),
  getHistory: (params) => api.get('/pharmacy/sales/history/', { params }),
  getDashboard: () => api.get('/pharmacy/sales/dashboard/'),
}