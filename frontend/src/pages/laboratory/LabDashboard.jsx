// ============================================
// frontend/src/pages/laboratory/LabDashboard.jsx
// ============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { laboratoryService } from '../../services/professional'
import { FlaskConical, Upload, Send, FileText, TrendingUp, Users, Calendar } from 'lucide-react'

export default function LabDashboard() {
  const [stats, setStats] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [dashRes, profileRes] = await Promise.all([
        laboratoryService.getDashboard(),
        laboratoryService.getProfile()
      ])
      setStats(dashRes.data)
      setProfile(profileRes.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { title: 'Upload Report', desc: 'Upload and send to patient', icon: Upload, path: '/laboratory/upload', color: 'bg-purple-500' },
    { title: 'Sent Reports', desc: 'View sent history', icon: Send, path: '/laboratory/sent', color: 'bg-blue-500' },
    { title: 'Lab Profile', desc: 'Manage lab information', icon: FlaskConical, path: '/laboratory/profile', color: 'bg-emerald-500' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <FlaskConical className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{profile?.name || 'Laboratory Dashboard'}</h1>
            <p className="text-purple-100 mt-1">Upload and send lab reports to patients</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-800">{stats.total_reports_sent}</p>
              <p className="text-sm text-secondary-500">Total Reports Sent</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-800">{stats.reports_today}</p>
              <p className="text-sm text-secondary-500">Sent Today</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-800">{stats.reports_this_month}</p>
              <p className="text-sm text-secondary-500">This Month</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-secondary-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path} className="card-hover p-6 flex flex-col items-center text-center group">
              <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-secondary-800">{action.title}</h3>
              <p className="text-sm text-secondary-500 mt-1">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
