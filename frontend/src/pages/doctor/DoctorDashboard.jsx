// frontend/src/pages/doctor/DoctorDashboard.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDoctorDashboard, getDoctorProfile } from '../../services/professional'
import { 
  UserSearch, FilePlus, Upload, History, Stethoscope, 
  Users, FileText, TrendingUp, Clock, AlertCircle, CheckCircle
} from 'lucide-react'

export default function DoctorDashboard() {
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
        getDoctorProfile(),
        getDoctorDashboard()
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
    { title: 'Access Patient', desc: 'View patient history with OTP', icon: UserSearch, path: '/doctor/patient-access', color: 'bg-blue-500' },
    { title: 'New Prescription', desc: 'Create digital prescription', icon: FilePlus, path: '/doctor/create-prescription', color: 'bg-emerald-500' },
    { title: 'Upload & Send', desc: 'Scan and send prescription', icon: Upload, path: '/doctor/upload', color: 'bg-purple-500' },
    { title: 'History', desc: 'View sent prescriptions', icon: History, path: '/doctor/history', color: 'bg-amber-500' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Rejection Warning */}
      {user?.is_rejected && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Verification Rejected</p>
            <p className="text-sm text-red-700 mt-1">
              Your professional verification was rejected. Reason: {user.rejection_reason || 'No reason provided'}
            </p>
            <p className="text-sm text-red-600 mt-2">
              Please contact support or re-submit your verification documents.
            </p>
          </div>
        </div>
      )}

      {/* Verification Warning - only show if not rejected */}
      {profile && !profile.is_verified && !user?.is_rejected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Account Pending Verification</p>
            <p className="text-sm text-amber-700 mt-1">
              Your professional account is pending admin verification. Some features may be limited until verification is complete.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">
              Welcome, Dr. {profile?.full_name || user?.first_name || 'Doctor'}
            </h1>
            <p className="text-blue-100 mt-1">
              {profile?.specialization || 'Manage your patients and prescriptions'}
            </p>
          </div>
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.total_prescriptions || 0}</p>
              <p className="text-blue-100 text-sm">Prescriptions Sent</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.patients_accessed || 0}</p>
              <p className="text-blue-100 text-sm">Patients Accessed</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold">{stats.this_month || 0}</p>
              <p className="text-blue-100 text-sm">This Month</p>
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
            <h2 className="text-lg font-semibold text-secondary-800">Your Profile</h2>
            <Link to="/doctor/profile" className="text-sm text-blue-600 hover:text-blue-700">
              Edit Profile →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-secondary-500">Registration Number</p>
              <p className="font-medium text-secondary-800">{profile.registration_number || 'Not set'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-secondary-500">Clinic</p>
              <p className="font-medium text-secondary-800">{profile.clinic_name || 'Not set'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-secondary-500">Qualification</p>
              <p className="font-medium text-secondary-800">{profile.qualification || 'Not set'}</p>
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

      {/* Recent Activity */}
      {stats?.recent_prescriptions && stats.recent_prescriptions.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-secondary-800 mb-4">Recent Prescriptions</h2>
          <div className="space-y-3">
            {stats.recent_prescriptions.map((rx, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-secondary-800">{rx.patient_name || rx.patient_email}</p>
                    <p className="text-sm text-secondary-500">{new Date(rx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  rx.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {rx.status || 'Sent'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
