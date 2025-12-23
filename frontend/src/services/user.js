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
  getPatientDashboard: () => api.get('/analytics/patient/dashboard/'),
  getAdherenceReport: (days = 30) => api.get('/analytics/patient/adherence/', { params: { days } }),
  getPharmacyDashboard: () => api.get('/analytics/pharmacy/dashboard/'),
  exportHistory: () => api.get('/analytics/export/history/'),
}
