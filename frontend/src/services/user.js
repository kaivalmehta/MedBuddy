import api from './api'

export const userService = {
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  getHealthProfile: () => api.get('/auth/health-profile/'),
  updateHealthProfile: (data) => api.patch('/auth/health-profile/', data),
  getFamilyMembers: () => api.get('/auth/family-members/'),
  addFamilyMember: (data) => api.post('/auth/family-members/', data),
  updateFamilyMember: (id, data) => api.patch(`/auth/family-members/${id}/`, data),
  deleteFamilyMember: (id) => api.delete(`/auth/family-members/${id}/`),
}

export const analyticsService = {
  // Patient dashboard - uses prescriptions endpoints
  getPatientDashboard: () => api.get('/prescriptions/dashboard/'),
  getAdherenceReport: (days = 30) => api.get('/prescriptions/adherence/', { params: { days } }),
  
  // Pharmacy dashboard - uses pharmacy endpoint
  getPharmacyDashboard: () => api.get('/pharmacy/dashboard/'),
  
  // Doctor dashboard - uses doctor endpoint
  getDoctorDashboard: () => api.get('/doctor/dashboard/'),
  
  // Laboratory dashboard - uses laboratory endpoint
  getLabDashboard: () => api.get('/laboratory/dashboard/'),
  
  // Export history
  exportHistory: () => api.get('/prescriptions/export/'),
}
