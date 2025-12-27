import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { laboratoryService } from '../../services/professional'
import { 
  FlaskConical, Upload, Send, FileText, TrendingUp, Users, Calendar,
  UserSearch, History, Settings, AlertCircle, CheckCircle, Clock,
  Activity, BarChart3, ArrowUpRight
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function LabDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await laboratoryService.getDashboard()
      setStats(res.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { title: 'Access Patient', desc: 'View patient history', icon: UserSearch, path: '/laboratory/patient-access', color: 'bg-blue-500' },
    { title: 'Upload Report', desc: 'Send report to patient', icon: Upload, path: '/laboratory/upload', color: 'bg-purple-500' },
    { title: 'Sent Reports', desc: 'View sent history', icon: History, path: '/laboratory/sent', color: 'bg-emerald-500' },
    { title: 'Lab Profile', desc: 'Manage lab info', icon: Settings, path: '/laboratory/profile', color: 'bg-amber-500' },
  ]

  const reportTypeLabels = {
    blood_test: 'Blood Test',
    urine_test: 'Urine Test',
    xray: 'X-Ray',
    mri: 'MRI',
    ct_scan: 'CT Scan',
    ultrasound: 'Ultrasound',
    ecg: 'ECG/EKG',
    pathology: 'Pathology',
    other: 'Other',
  }

  const reportTypeColors = {
    blood_test: 'bg-red-100 text-red-700',
    urine_test: 'bg-yellow-100 text-yellow-700',
    xray: 'bg-blue-100 text-blue-700',
    mri: 'bg-purple-100 text-purple-700',
    ct_scan: 'bg-indigo-100 text-indigo-700',
    ultrasound: 'bg-cyan-100 text-cyan-700',
    ecg: 'bg-pink-100 text-pink-700',
    pathology: 'bg-orange-100 text-orange-700',
    other: 'bg-gray-100 text-gray-700',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <FlaskConical className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">
                {stats?.lab_name || 'Laboratory Dashboard'}
              </h1>
              <p className="text-purple-100 mt-1">Upload and send lab reports to patients</p>
            </div>
          </div>
          {stats?.is_verified ? (
            <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Verified</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/80 px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Pending Verification</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-800">{stats.total_reports_sent}</p>
              <p className="text-sm text-secondary-500">Total Reports Sent</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-800">{stats.reports_today}</p>
              <p className="text-sm text-secondary-500">Sent Today</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-800">{stats.reports_this_month}</p>
              <p className="text-sm text-secondary-500">This Month</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-800">{stats.unique_patients}</p>
              <p className="text-sm text-secondary-500">Patients Served</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-secondary-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <motion.div
              key={action.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link 
                to={action.path} 
                className="card-hover p-6 flex flex-col items-center text-center group"
              >
                <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-secondary-800">{action.title}</h3>
                <p className="text-sm text-secondary-500 mt-1">{action.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Types Distribution */}
        {stats?.report_types?.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-secondary-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Reports by Type
              </h3>
            </div>
            <div className="space-y-3">
              {stats.report_types.map((item) => {
                const maxCount = Math.max(...stats.report_types.map(r => r.count))
                const percentage = (item.count / maxCount) * 100
                return (
                  <div key={item.report_type} className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${reportTypeColors[item.report_type] || 'bg-gray-100 text-gray-700'}`}>
                      {reportTypeLabels[item.report_type] || item.report_type}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-secondary-700 w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Recent Reports */}
        {stats?.recent_reports?.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-secondary-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Recent Reports
              </h3>
              <Link to="/laboratory/sent" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View All <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recent_reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reportTypeColors[report.report_type] || 'bg-gray-100'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary-800 text-sm">{report.report_title}</p>
                      <p className="text-xs text-secondary-500">{report.patient_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${reportTypeColors[report.report_type] || 'bg-gray-100 text-gray-700'}`}>
                      {reportTypeLabels[report.report_type] || report.report_type}
                    </span>
                    <p className="text-xs text-secondary-500 mt-1">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Rejection Warning */}
      {user?.is_rejected && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Verification Rejected</h4>
              <p className="text-sm text-red-700 mt-1">
                Your laboratory verification was rejected. Reason: {user.rejection_reason || 'No reason provided'}
              </p>
              <p className="text-sm text-red-600 mt-2">
                Please contact support or update your verification documents.
              </p>
              <Link to="/laboratory/profile" className="text-sm text-red-800 font-medium hover:underline mt-2 inline-block">
                Update Profile →
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Not Verified Warning - only show if not rejected */}
      {stats && !stats.is_verified && !user?.is_rejected && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Verification Pending</h4>
              <p className="text-sm text-amber-700 mt-1">
                Your laboratory is pending verification. Some features may be limited until an admin verifies your credentials.
                Please ensure your license document has been uploaded in your profile.
              </p>
              <Link to="/laboratory/profile" className="text-sm text-amber-800 font-medium hover:underline mt-2 inline-block">
                Go to Profile →
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
