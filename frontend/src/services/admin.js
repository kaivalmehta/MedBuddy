// ============================================
// frontend/src/services/admin.js
// Admin API service
// ============================================

import api from './api'

export const adminService = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard/'),
  
  // Verification requests
  getPendingVerifications: (params) => api.get('/admin/verifications/pending/', { params }),
  getRejectedVerifications: () => api.get('/admin/verifications/rejected/'),
  approveVerification: (userId, notes = '') => api.post(`/admin/verifications/${userId}/verify/`, { 
    action: 'approve', 
    notes 
  }),
  rejectVerification: (userId, reason) => api.post(`/admin/verifications/${userId}/verify/`, { 
    action: 'reject', 
    reason 
  }),
  reconsiderRejection: (userId) => api.post(`/admin/verifications/${userId}/reconsider/`),
  
  // Suspensions
  getSuspensions: () => api.get('/admin/suspensions/'),
  suspendUser: (userId, reason) => api.post(`/admin/users/${userId}/suspend/`, { 
    action: 'suspend', 
    reason 
  }),
  unsuspendUser: (userId) => api.post(`/admin/users/${userId}/suspend/`, { 
    action: 'unsuspend' 
  }),
  
  // Users
  getUsers: (params) => api.get('/admin/users/', { params }),
  getAllUsers: () => api.get('/admin/users/'),
  getUserDetail: (userId) => api.get(`/admin/users/${userId}/`),
  searchUsers: (query, role = '') => api.get('/admin/users/search/', { params: { q: query, role } }),
}

export default adminService
