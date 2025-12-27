// frontend/src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'

// Patient Pages
import Dashboard from './pages/patient/Dashboard'
import UploadPrescription from './pages/patient/UploadPrescription'
import PrescriptionHistory from './pages/patient/PrescriptionHistory'
import PrescriptionDetail from './pages/patient/PrescriptionDetail'
import HealthProfile from './pages/patient/HealthProfile'
import FamilyMembers from './pages/patient/FamilyMembers'
import Reminders from './pages/patient/Reminders'
import FindPharmacy from './pages/patient/FindPharmacy'
import MyOrders from './pages/patient/MyOrders'
import LabReports from './pages/patient/LabReports'
import LabReportDetail from './pages/patient/LabReportDetail'
import PatientTestOrders from './pages/patient/PatientTestOrders'
import PatientOrderTest from './pages/patient/PatientOrderTest'

// Pharmacy Pages
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard'
import PharmacyScanSend from './pages/pharmacy/PharmacyScanSend'
import PharmacySentHistory from './pages/pharmacy/PharmacySentHistory'
import PharmacyPatientAccess from './pages/pharmacy/PharmacyPatientAccess'
import PharmacyPatientHistory from './pages/pharmacy/PharmacyPatientHistory'
import SalesDashboard from './pages/pharmacy/SalesDashboard'
import Inventory from './pages/pharmacy/Inventory'

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import PatientAccess from './pages/doctor/PatientAccess'
import CreatePrescription from './pages/doctor/CreatePrescription'
import DoctorUpload from './pages/doctor/DoctorUpload'
import DoctorHistory from './pages/doctor/DoctorHistory'
import DoctorProfile from './pages/doctor/DoctorProfile'
import PatientHistory from './pages/doctor/PatientHistory'
import DoctorOrderTest from './pages/doctor/DoctorOrderTest'
import DoctorTestOrders from './pages/doctor/DoctorTestOrders'

// Laboratory Pages
import LabDashboard from './pages/laboratory/LabDashboard'
import LabPatientAccess from './pages/laboratory/LabPatientAccess'
import LabPatientHistory from './pages/laboratory/LabPatientHistory'
import LabUploadReport from './pages/laboratory/LabUploadReport'
import LabSentHistory from './pages/laboratory/LabSentHistory'
import LabReportDetailPage from './pages/laboratory/LabReportDetail'
import LabProfile from './pages/laboratory/LabProfile'
import LabTestOrders from './pages/laboratory/LabTestOrders'
import LabHomeCollections from './pages/laboratory/LabHomeCollections'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminVerifications from './pages/admin/AdminVerifications'
import AdminSuspensions from './pages/admin/AdminSuspensions'

// Shared Pages
import CriticalAlerts from './pages/shared/CriticalAlerts'

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto"></div>
      <p className="mt-4 text-secondary-600">Loading...</p>
    </div>
  </div>
)

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()
  
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const dashboards = {
      patient: '/dashboard',
      pharmacy: '/pharmacy',
      doctor: '/doctor',
      laboratory: '/laboratory',
      admin: '/admin'
    }
    return <Navigate to={dashboards[user.role] || '/dashboard'} replace />
  }
  
  return children
}

// Get default route based on role
const getDefaultRoute = (role) => {
  const routes = {
    patient: '/dashboard',
    pharmacy: '/pharmacy',
    doctor: '/doctor',
    laboratory: '/laboratory',
    admin: '/admin'
  }
  return routes[role] || '/dashboard'
}

export default function App() {
  const { user, loading } = useAuth()
  
  if (loading) return <LoadingScreen />
  
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={
        user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <AuthLayout><Login /></AuthLayout>
      } />
      <Route path="/register" element={
        user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <Register />
      } />
      <Route path="/forgot-password" element={
        user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <ForgotPassword />
      } />
      
      {/* Patient Routes */}
      <Route element={<ProtectedRoute allowedRoles={['patient']}><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPrescription />} />
        <Route path="/prescriptions" element={<PrescriptionHistory />} />
        <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
        <Route path="/reports" element={<LabReports />} />
        <Route path="/reports/:id" element={<LabReportDetail />} />
        <Route path="/health-profile" element={<HealthProfile />} />
        <Route path="/family" element={<FamilyMembers />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/pharmacies" element={<FindPharmacy />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/lab-orders" element={<PatientTestOrders />} />
        <Route path="/order-test" element={<PatientOrderTest />} />
        <Route path="/alerts" element={<CriticalAlerts userRole="patient" />} />
      </Route>
      
      {/* Pharmacy Routes */}
      <Route element={<ProtectedRoute allowedRoles={['pharmacy']}><MainLayout /></ProtectedRoute>}>
        <Route path="/pharmacy" element={<PharmacyDashboard />} />
        <Route path="/pharmacy/patient-access" element={<PharmacyPatientAccess />} />
        <Route path="/pharmacy/patient/:patientId" element={<PharmacyPatientHistory />} />
        <Route path="/pharmacy/scan" element={<PharmacyScanSend />} />
        <Route path="/pharmacy/sent" element={<PharmacySentHistory />} />
        <Route path="/pharmacy/sales" element={<SalesDashboard />} />
        <Route path="/pharmacy/inventory" element={<Inventory />} />
      </Route>
      
      {/* Doctor Routes */}
      <Route element={<ProtectedRoute allowedRoles={['doctor']}><MainLayout /></ProtectedRoute>}>
        <Route path="/doctor" element={<DoctorDashboard />} />
        <Route path="/doctor/patient-access" element={<PatientAccess />} />
        <Route path="/doctor/patient/:patientId" element={<PatientHistory />} />
        <Route path="/doctor/create-prescription" element={<CreatePrescription />} />
        <Route path="/doctor/upload" element={<DoctorUpload />} />
        <Route path="/doctor/history" element={<DoctorHistory />} />
        <Route path="/doctor/profile" element={<DoctorProfile />} />
        <Route path="/doctor/order-test" element={<DoctorOrderTest />} />
        <Route path="/doctor/test-orders" element={<DoctorTestOrders />} />
        <Route path="/doctor/alerts" element={<CriticalAlerts userRole="doctor" />} />
      </Route>
      
      {/* Laboratory Routes */}
      <Route element={<ProtectedRoute allowedRoles={['laboratory']}><MainLayout /></ProtectedRoute>}>
        <Route path="/laboratory" element={<LabDashboard />} />
        <Route path="/laboratory/patient-access" element={<LabPatientAccess />} />
        <Route path="/laboratory/patient/:patientId" element={<LabPatientHistory />} />
        <Route path="/laboratory/upload" element={<LabUploadReport />} />
        <Route path="/laboratory/sent" element={<LabSentHistory />} />
        <Route path="/laboratory/report/:id" element={<LabReportDetailPage />} />
        <Route path="/laboratory/profile" element={<LabProfile />} />
        <Route path="/laboratory/test-orders" element={<LabTestOrders />} />
        <Route path="/laboratory/collections" element={<LabHomeCollections />} />
      </Route>
      
      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']}><MainLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/verifications" element={<AdminVerifications />} />
        <Route path="/admin/suspensions" element={<AdminSuspensions />} />
      </Route>
      
      {/* Root redirect */}
      <Route path="/" element={
        user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <Navigate to="/login" replace />
      } />
      
      {/* Catch all */}
      <Route path="*" element={
        user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <Navigate to="/login" replace />
      } />
    </Routes>
  )
}
