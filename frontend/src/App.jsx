import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/patient/Dashboard'
import UploadPrescription from './pages/patient/UploadPrescription'
import PrescriptionHistory from './pages/patient/PrescriptionHistory'
import PrescriptionDetail from './pages/patient/PrescriptionDetail'
import HealthProfile from './pages/patient/HealthProfile'
import FamilyMembers from './pages/patient/FamilyMembers'
import Reminders from './pages/patient/Reminders'
import FindPharmacy from './pages/patient/FindPharmacy'
import MyOrders from './pages/patient/MyOrders'
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard'
import OrderQueue from './pages/pharmacy/OrderQueue'
import OrderDetail from './pages/pharmacy/OrderDetail'
import Inventory from './pages/pharmacy/Inventory'

export default function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Patient Routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<UploadPrescription />} />
      <Route path="/prescriptions" element={<PrescriptionHistory />} />
      <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
      <Route path="/health-profile" element={<HealthProfile />} />
      <Route path="/family" element={<FamilyMembers />} />
      <Route path="/reminders" element={<Reminders />} />
      <Route path="/pharmacies" element={<FindPharmacy />} />
      <Route path="/orders" element={<MyOrders />} />
      
      {/* Pharmacy Routes */}
      <Route path="/pharmacy" element={<PharmacyDashboard />} />
      <Route path="/pharmacy/orders" element={<OrderQueue />} />
      <Route path="/pharmacy/orders/:id" element={<OrderDetail />} />
      <Route path="/pharmacy/inventory" element={<Inventory />} />
      
      {/* Default */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}
