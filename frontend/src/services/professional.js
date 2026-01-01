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
export const labCheckPatient = (email) => {
  return api.post('/laboratory/patient/check/', { email })
}

export const labRequestPatientAccess = (data) => {
  return api.post('/laboratory/patient/request-access/', data)
}

export const labVerifyPatientOTP = (data) => {
  return api.post('/laboratory/patient/verify-otp/', data)
}

export const labGetActiveSessions = () => {
  return api.get('/laboratory/patient/sessions/')
}

export const labGetPatientHistory = (patientId) => {
  return api.get(`/laboratory/patient/${patientId}/history/`)
}

// Report Upload & Management
export const uploadLabReport = (formData) => {
  return api.post('/laboratory/report/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const labGetSentReports = (params) => {
  return api.get('/laboratory/reports/sent/', { params })
}

export const labGetReportDetail = (reportId) => {
  return api.get(`/laboratory/reports/${reportId}/`)
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
  checkPatient: labCheckPatient,
  requestPatientAccess: labRequestPatientAccess,
  verifyPatientOTP: labVerifyPatientOTP,
  getActiveSessions: labGetActiveSessions,
  getPatientHistory: labGetPatientHistory,
  uploadReport: uploadLabReport,
  getSentReports: labGetSentReports,
  getReportDetail: labGetReportDetail,
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
  analyze: (id) => api.post(`/prescriptions/lab-reports/${id}/analyze/`),
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

// ============================================
// TEST ORDER APIs
// ============================================

// Lab Search (for doctors)
export const searchLaboratories = (params) => api.get('/test-orders/labs/search/', { params })
export const getLaboratoryDetail = (labId) => api.get(`/test-orders/labs/${labId}/`)

// Doctor Test Orders
export const createTestOrder = (data) => api.post('/test-orders/doctor/orders/create/', data)
export const getDoctorTestOrders = (params) => api.get('/test-orders/doctor/orders/', { params })
export const getDoctorTestOrderDetail = (orderId) => api.get(`/test-orders/doctor/orders/${orderId}/`)

// Lab Test Orders
export const getLabTestOrders = (params) => api.get('/test-orders/lab/orders/', { params })
export const getLabTestOrderDetail = (orderId) => api.get(`/test-orders/lab/orders/${orderId}/`)
export const acceptTestOrder = (orderId, data) => api.post(`/test-orders/lab/orders/${orderId}/`, { action: 'accept', ...data })
export const declineTestOrder = (orderId, reason) => api.post(`/test-orders/lab/orders/${orderId}/`, { action: 'decline', decline_reason: reason })
export const updateTestOrderStatus = (orderId, status, data = {}) => api.post(`/test-orders/lab/orders/${orderId}/status/`, { status, ...data })

// Lab Home Collections
export const getLabHomeCollections = (params) => api.get('/test-orders/lab/collections/', { params })
export const updateHomeCollection = (collectionId, data) => api.patch(`/test-orders/lab/collections/${collectionId}/`, data)

// Lab Report Upload with Analysis
export const uploadReportWithAnalysis = (formData) => api.post('/test-orders/lab/upload-report/', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// Test Catalog
export const getTestCatalog = () => api.get('/test-orders/catalog/')
export const addTestToCatalog = (data) => api.post('/test-orders/catalog/', data)
export const updateTestInCatalog = (testId, data) => api.patch(`/test-orders/catalog/${testId}/`, data)
export const deleteTestFromCatalog = (testId) => api.delete(`/test-orders/catalog/${testId}/`)

// Critical Alerts
export const getCriticalAlerts = () => api.get('/test-orders/alerts/')
export const acknowledgeAlert = (alertId) => api.post(`/test-orders/alerts/${alertId}/acknowledge/`)

// Patient Test Orders
export const getPatientTestOrders = () => api.get('/test-orders/patient/orders/')
export const getPatientTestOrderDetail = (orderId) => api.get(`/test-orders/patient/orders/${orderId}/`)
export const createPatientTestOrder = (data) => api.post('/test-orders/patient/orders/create/', data)

// Test Order Service Object
export const testOrderService = {
  // Lab search
  searchLabs: searchLaboratories,
  getLabDetail: getLaboratoryDetail,
  
  // Doctor
  create: createTestOrder,
  getDoctorOrders: getDoctorTestOrders,
  getDoctorOrderDetail: getDoctorTestOrderDetail,
  
  // Lab
  getLabOrders: getLabTestOrders,
  getLabOrderDetail: getLabTestOrderDetail,
  accept: acceptTestOrder,
  decline: declineTestOrder,
  updateStatus: updateTestOrderStatus,
  
  // Home collection
  getCollections: getLabHomeCollections,
  updateCollection: updateHomeCollection,
  
  // Report upload
  uploadReport: uploadReportWithAnalysis,
  
  // Catalog
  getCatalog: getTestCatalog,
  addTest: addTestToCatalog,
  updateTest: updateTestInCatalog,
  deleteTest: deleteTestFromCatalog,
  
  // Alerts
  getAlerts: getCriticalAlerts,
  acknowledgeAlert: acknowledgeAlert,
  
  // Patient
  getPatientOrders: getPatientTestOrders,
  getPatientOrderDetail: getPatientTestOrderDetail,
  createPatientOrder: createPatientTestOrder,
}
