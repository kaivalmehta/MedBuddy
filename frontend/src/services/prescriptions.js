// // frontend/src/services/prescriptions.js
// import api from './api'

// export const prescriptionService = {
//   // List all prescriptions
//   list: (params) => api.get('/prescriptions/', { params }),
  
//   // Get single prescription
//   get: (id) => api.get(`/prescriptions/${id}/`),
  
//   // Upload new prescription
//   upload: (formData) => api.post('/prescriptions/upload/', formData, {
//     headers: { 'Content-Type': 'multipart/form-data' }
//   }),
  
//   // Analyze prescription (OCR + AI parsing + safety analysis)
//   analyze: (id) => api.post(`/prescriptions/${id}/analyze/`),
  
//   // Send prescription to pharmacy
//   sendToPharmacy: (id, data) => api.post(`/prescriptions/${id}/send-to-pharmacy/`, data),
  
//   // Get prescription history with filters
//   getHistory: (params) => api.get('/prescriptions/history/', { params }),
  
//   // Update prescription
//   update: (id, data) => api.patch(`/prescriptions/${id}/`, data),
  
//   // Delete prescription
//   delete: (id) => api.delete(`/prescriptions/${id}/`),
// }

// export const reminderService = {
//   // List all reminders for current user
//   list: () => api.get('/prescriptions/reminders/'),
  
//   // Create a new reminder
//   create: (data) => api.post('/prescriptions/reminders/', data),
  
//   // Mark a dose as taken
//   markTaken: (id, notes = '') => api.post(`/prescriptions/reminders/${id}/mark-taken/`, { notes }),
  
//   // Update reminder settings
//   update: (id, data) => api.patch(`/prescriptions/reminders/${id}/`, data),
  
//   // Delete/deactivate a reminder
//   delete: (id) => api.delete(`/prescriptions/reminders/${id}/`),
// }

// frontend/src/services/prescriptions.js
import api from './api'

export const prescriptionService = {
  // List all prescriptions
  list: (params) => api.get('/prescriptions/', { params }),
  
  // Get single prescription
  get: (id) => api.get(`/prescriptions/${id}/`),
  
  // Upload new prescription
  upload: (formData) => api.post('/prescriptions/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Analyze prescription (OCR + AI parsing + safety analysis)
  analyze: (id) => api.post(`/prescriptions/${id}/analyze/`),
  
  // Send prescription to pharmacy
  sendToPharmacy: (id, data) => api.post(`/prescriptions/${id}/send-to-pharmacy/`, data),
  
  // Get prescription history with filters
  getHistory: (params) => api.get('/prescriptions/history/', { params }),
  
  // Update prescription
  update: (id, data) => api.patch(`/prescriptions/${id}/`, data),
  
  // Delete prescription
  delete: (id) => api.delete(`/prescriptions/${id}/`),
}

export const reminderService = {
  // List all reminders for current user
  list: () => api.get('/prescriptions/reminders/'),
  
  // Create a new reminder
  create: (data) => api.post('/prescriptions/reminders/', data),
  
  // Mark a dose as taken with optional timestamp
  markTaken: (id, notes = '', taken_at = null) => api.post(`/prescriptions/reminders/${id}/mark-taken/`, { 
    notes,
    taken_at: taken_at || new Date().toISOString()
  }),
  
  // Mark a dose as missed
  markMissed: (id) => api.post(`/prescriptions/reminders/${id}/mark-missed/`),
  
  // Skip a dose with reason
  skipDose: (id, reason = '') => api.post(`/prescriptions/reminders/${id}/skip/`, { reason }),
  
  // Update reminder settings
  update: (id, data) => api.patch(`/prescriptions/reminders/${id}/`, data),
  
  // Delete/deactivate a reminder
  delete: (id) => api.delete(`/prescriptions/reminders/${id}/`),
  
  // Get dose history/logs for a reminder
  getDoseLogs: (id, params) => api.get(`/prescriptions/reminders/${id}/logs/`, { params }),
  
  // Get today's summary
  getTodaySummary: () => api.get('/prescriptions/reminders/today/'),
}