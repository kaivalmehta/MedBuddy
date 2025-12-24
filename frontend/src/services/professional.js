import api from './api'

// ============================================
// DOCTOR APIs - Function Exports
// ============================================

// Dashboard & Profile
export const getDoctorDashboard = () => api.get('/doctor/dashboard/')
export const getDoctorProfile = () => api.get('/doctor/profile/')
export const updateDoctorProfile = (data) => api.patch('/doctor/profile/', data)

// Patient Access (OTP Verification)
export const checkPatient = (patientEmail) => {
  return api.post('/doctor/patient/check/', { patient_email: patientEmail })
}

export const requestPatientAccess = (data) => {
  return api.post('/doctor/patient/request-access/', data)
}

export const verifyPatientOTP = (data) => {
  return api.post('/doctor/patient/verify-otp/', data)
}

export const getPatientHistory = (patientId) => {
  return api.get(`/doctor/patient/${patientId}/history/`)
}

export const getActiveSessions = () => {
  return api.get('/doctor/sessions/')
}

// Prescription Upload (with OTP)
export const initiatePrescriptionUpload = (data) => {
  return api.post('/doctor/prescription/initiate/', data)
}

export const uploadPrescription = (formData) => {
  return api.post('/doctor/prescription/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const createDigitalPrescription = (data) => {
  return api.post('/doctor/prescription/digital/', data)
}

// ============================================
// LABORATORY APIs - Function Exports
// ============================================

// Dashboard & Profile
export const getLabDashboard = () => api.get('/laboratory/dashboard/')
export const getLabProfile = () => api.get('/laboratory/profile/')
export const updateLabProfile = (data) => api.patch('/laboratory/profile/', data)

// Patient Access (OTP Verification)
export const labRequestPatientAccess = (data) => {
  return api.post('/laboratory/patient/request-access/', data)
}

export const labVerifyPatientOTP = (data) => {
  return api.post('/laboratory/patient/verify-otp/', data)
}

// Report Upload (with OTP)
export const uploadLabReport = (formData) => {
  return api.post('/laboratory/report/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ============================================
// PHARMACY APIs - Function Exports
// ============================================

// Dashboard & Profile
export const getPharmacyDashboard = () => api.get('/pharmacy/dashboard/')
export const getPharmacyProfile = () => api.get('/pharmacy/profile/')
export const updatePharmacyProfile = (data) => api.patch('/pharmacy/profile/', data)

// Patient Access (OTP Verification)
export const pharmacyCheckPatient = (patientEmail) => {
  return api.post('/pharmacy/patient/check/', { patient_email: patientEmail })
}

export const pharmacyRequestPatientAccess = (data) => {
  return api.post('/pharmacy/patient/request-access/', data)
}

export const pharmacyVerifyPatientOTP = (data) => {
  return api.post('/pharmacy/patient/verify-otp/', data)
}

// Prescription Upload (with OTP)
export const pharmacyUploadPrescription = (formData) => {
  return api.post('/pharmacy/prescription/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const pharmacyAnalyzePrescription = (prescriptionId) => {
  return api.post(`/pharmacy/prescription/${prescriptionId}/analyze/`)
}

export const getPharmacyPrescriptionHistory = () => {
  return api.get('/pharmacy/prescriptions/')
}

// Orders
export const getPharmacyOrders = (status) => {
  const params = status ? { status } : {}
  return api.get('/pharmacy/orders/', { params })
}

export const getPharmacyOrderDetail = (orderId) => {
  return api.get(`/pharmacy/orders/${orderId}/`)
}

export const updateOrderStatus = (orderId, data) => {
  return api.patch(`/pharmacy/orders/${orderId}/status/`, data)
}

export const verifyOrder = (orderId, data) => {
  return api.post(`/pharmacy/orders/${orderId}/verify/`, data)
}

// Inventory
export const getInventory = () => api.get('/pharmacy/inventory/')
export const addInventoryItem = (data) => api.post('/pharmacy/inventory/', data)
export const updateInventoryItem = (id, data) => api.patch(`/pharmacy/inventory/${id}/`, data)
export const deleteInventoryItem = (id) => api.delete(`/pharmacy/inventory/${id}/`)

// Nearby Pharmacies (for patients)
export const getNearbyPharmacies = (lat, lng, radius = 10) => {
  return api.get('/pharmacy/nearby/', { params: { lat, lng, radius } })
}

export const getPharmacyReviews = (pharmacyId) => {
  return api.get(`/pharmacy/${pharmacyId}/reviews/`)
}

export const addPharmacyReview = (pharmacyId, data) => {
  return api.post(`/pharmacy/${pharmacyId}/reviews/`, data)
}

// Chat
export const getOrderChat = (orderId) => {
  return api.get(`/pharmacy/orders/${orderId}/chat/`)
}

export const sendChatMessage = (orderId, message) => {
  return api.post(`/pharmacy/orders/${orderId}/chat/`, { message })
}

// ============================================
// OBJECT-BASED SERVICE EXPORTS (for backward compatibility)
// ============================================

export const doctorService = {
  getDashboard: getDoctorDashboard,
  getProfile: getDoctorProfile,
  updateProfile: updateDoctorProfile,
  checkPatient,
  requestPatientAccess,
  verifyPatientOTP,
  getPatientHistory,
  getActiveSessions,
  initiatePrescriptionUpload,
  uploadPrescription,
  createDigitalPrescription,
}

export const laboratoryService = {
  getDashboard: getLabDashboard,
  getProfile: getLabProfile,
  updateProfile: updateLabProfile,
  requestPatientAccess: labRequestPatientAccess,
  verifyPatientOTP: labVerifyPatientOTP,
  uploadReport: uploadLabReport,
}

// ============================================
// LAB REPORT SERVICE (for patients)
// ============================================

export const labReportService = {
  list: (params) => api.get('/prescriptions/lab-reports/', { params }),
  get: (id) => api.get(`/prescriptions/lab-reports/${id}/`),
  upload: (formData) => api.post('/prescriptions/lab-reports/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}

export const pharmacyExtendedService = {
  getDashboard: getPharmacyDashboard,
  getProfile: getPharmacyProfile,
  updateProfile: updatePharmacyProfile,
  checkPatient: pharmacyCheckPatient,
  requestPatientAccess: pharmacyRequestPatientAccess,
  verifyPatientOTP: pharmacyVerifyPatientOTP,
  uploadPrescription: pharmacyUploadPrescription,
  sendPrescription: pharmacyUploadPrescription, // alias for backward compatibility
  analyzePrescription: pharmacyAnalyzePrescription,
  getHistory: getPharmacyPrescriptionHistory,
  getOrders: getPharmacyOrders,
  getOrderDetail: getPharmacyOrderDetail,
  updateOrderStatus,
  verifyOrder,
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getNearbyPharmacies,
  getPharmacyReviews,
  addPharmacyReview,
  getOrderChat,
  sendChatMessage,
}
