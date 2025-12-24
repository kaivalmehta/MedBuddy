// frontend/src/pages/pharmacy/PharmacyDashboard.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPharmacyDashboard, getPharmacyProfile } from '../../services/professional'
import { 
  Scan, Package, History, Pill, 
  ShoppingBag, TrendingUp, Clock, AlertCircle, CheckCircle
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
        getPharmacyProfile(),
        getPharmacyDashboard()
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

  const quickActions = [
    { title: 'Scan & Send', desc: 'Scan prescription for patient', icon: Scan, path: '/pharmacy/scan', color: 'bg-emerald-500' },
    { title: 'Order Queue', desc: 'Manage incoming orders', icon: ShoppingBag, path: '/pharmacy/orders', color: 'bg-blue-500' },
    { title: 'Sent History', desc: 'View sent prescriptions', icon: History, path: '/pharmacy/sent', color: 'bg-purple-500' },
    { title: 'Inventory', desc: 'Manage stock levels', icon: Package, path: '/pharmacy/inventory', color: 'bg-amber-500' },
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
              Welcome, {profile?.pharmacy_name || user?.first_name || 'Pharmacy'}
            </h1>
            <p className="text-emerald-100 mt-1">
              {profile?.address || 'Manage prescriptions and orders'}
            </p>
          </div>
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.total_prescriptions || 0}</p>
              <p className="text-emerald-100 text-sm">Prescriptions Sent</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.pending_orders || 0}</p>
              <p className="text-emerald-100 text-sm">Pending Orders</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.completed_orders || 0}</p>
              <p className="text-emerald-100 text-sm">Completed Orders</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.this_month || 0}</p>
              <p className="text-emerald-100 text-sm">This Month</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-secondary-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="font-medium text-secondary-800">{profile.license_number || 'Not set'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-secondary-500">Phone</p>
              <p className="font-medium text-secondary-800">{profile.phone || 'Not set'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-secondary-500">Operating Hours</p>
              <p className="font-medium text-secondary-800">{profile.operating_hours || 'Not set'}</p>
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

      {/* Recent Orders */}
      {stats?.recent_orders && stats.recent_orders.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary-800">Recent Orders</h2>
            <Link to="/pharmacy/orders" className="text-sm text-emerald-600 hover:text-emerald-700">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recent_orders.map((order, index) => (
              <Link 
                key={index} 
                to={`/pharmacy/orders/${order.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-secondary-800">{order.patient_name || order.patient_email}</p>
                    <p className="text-sm text-secondary-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  order.status === 'completed' ? 'bg-green-100 text-green-700' :
                  order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {order.status || 'Pending'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
