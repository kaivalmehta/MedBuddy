// frontend/src/pages/pharmacy/PharmacyDashboard.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { pharmacyService } from '../../services/pharmacy'
import { 
  Scan, Package, History, Pill, UserSearch,
  TrendingUp, Clock, AlertCircle, CheckCircle
} from 'lucide-react'

export default function PharmacyDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [profileRes, dashboardRes] = await Promise.all([
        pharmacyService.getProfile(),
        pharmacyService.getDashboard()
      ])
      setProfile(profileRes.data)
      setStats(dashboardRes.data)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const displayValue = (value) => {
    if (value === null || value === undefined) return 'Not set'
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : 'Not set'
      }
      const entries = Object.entries(value)
      if (entries.length === 0) return 'Not set'
      return entries.map(([k, v]) => `${k}: ${v}`).join(' | ')
    }
    return value || 'Not set'
  }

  const quickActions = [
    { title: 'Access Patient', desc: 'View patient history', icon: UserSearch, path: '/pharmacy/patient-access', color: 'bg-blue-500' },
    { title: 'Scan & Send', desc: 'Scan prescription for patient', icon: Scan, path: '/pharmacy/scan', color: 'bg-emerald-500' },
    { title: 'Sent History', desc: 'View sent prescriptions', icon: History, path: '/pharmacy/sent', color: 'bg-purple-500' },
    { title: 'Sales Dashboard', desc: 'Track sales & revenue', icon: TrendingUp, path: '/pharmacy/sales', color: 'bg-amber-500' },
    { title: 'Inventory', desc: 'Manage stock levels', icon: Package, path: '/pharmacy/inventory', color: 'bg-rose-500' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Verification Warning */}
      {profile && !profile.is_verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Account Pending Verification</p>
            <p className="text-sm text-amber-700 mt-1">
              Your pharmacy account is pending admin verification. Some features may be limited until verification is complete.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Pill className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">
              Welcome, {profile?.name || profile?.pharmacy_name || user?.first_name || 'Pharmacy'}
            </h1>
            <p className="text-emerald-100 mt-1">
              {typeof profile?.address === 'string' ? profile.address : 'Manage prescriptions and patient care'}
            </p>
          </div>
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.total_prescriptions || 0}</p>
              <p className="text-emerald-100 text-sm">Prescriptions Sent</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.patients_served || 0}</p>
              <p className="text-emerald-100 text-sm">Patients Served</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.today_sales || 0}</p>
              <p className="text-emerald-100 text-sm">Sales Today</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.low_stock_items || 0}</p>
              <p className="text-emerald-100 text-sm">Low Stock Alerts</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-secondary-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="card-hover p-6 flex flex-col items-center text-center group"
            >
              <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-secondary-800">{action.title}</h3>
              <p className="text-sm text-secondary-500 mt-1">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Profile Summary */}
      {profile && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary-800">Pharmacy Profile</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-secondary-500">License Number</p>
              <p className="font-medium text-secondary-800">{displayValue(profile.license_number)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-secondary-500">Phone</p>
              <p className="font-medium text-secondary-800">{displayValue(profile.phone)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-secondary-500">Operating Hours</p>
              <p className="font-medium text-secondary-800 text-sm">{displayValue(profile.operating_hours)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-secondary-500">Verification Status</p>
              <div className="flex items-center gap-2">
                {profile.is_verified ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-emerald-600">Verified</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-amber-600">Pending Verification</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
