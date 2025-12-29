// ============================================
// frontend/src/pages/admin/AdminDashboard.jsx
// ============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/admin'
import { 
  Users, UserCheck, UserX, AlertTriangle, Shield,
  Clock, Loader2, ChevronRight, Activity
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const res = await adminService.getDashboard()
      setStats(res.data.stats)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Pending Verifications',
      value: stats?.pending_verifications || 0,
      icon: Clock,
      color: 'amber',
      link: '/admin/verifications',
      subtitle: `${stats?.pending_doctors || 0} Doctors, ${stats?.pending_labs || 0} Labs, ${stats?.pending_pharmacies || 0} Pharmacies`
    },
    {
      title: 'Verified Professionals',
      value: stats?.verified_professionals || 0,
      icon: UserCheck,
      color: 'green',
      link: null,
      subtitle: 'Active verified accounts'
    },
    {
      title: 'Suspended Users',
      value: stats?.suspended_users || 0,
      icon: UserX,
      color: 'red',
      link: '/admin/suspensions',
      subtitle: 'Accounts under suspension'
    },
    {
      title: 'Rejected Requests',
      value: stats?.rejected_users || 0,
      icon: AlertTriangle,
      color: 'orange',
      link: '/admin/verifications?tab=rejected',
      subtitle: 'Verification requests rejected'
    },
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'blue',
      link: null,
      subtitle: `${stats?.total_patients || 0} Patients`
    },
  ]

  const colorClasses = {
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-7 h-7 text-purple-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Manage verifications, suspensions, and users</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            {stat.link ? (
              <Link
                to={stat.link}
                className="card hover:shadow-lg transition-shadow flex items-start gap-4"
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colorClasses[stat.color]}`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-gray-600 font-medium">{stat.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ) : (
              <div className="card flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colorClasses[stat.color]}`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-gray-600 font-medium">{stat.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/verifications"
            className="p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition flex items-center gap-3"
          >
            <Clock className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-medium text-gray-800">Review Verifications</p>
              <p className="text-sm text-gray-500">{stats?.pending_verifications || 0} pending</p>
            </div>
          </Link>
          
          <Link
            to="/admin/suspensions"
            className="p-4 bg-red-50 rounded-xl hover:bg-red-100 transition flex items-center gap-3"
          >
            <UserX className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-medium text-gray-800">Manage Suspensions</p>
              <p className="text-sm text-gray-500">{stats?.suspended_users || 0} suspended</p>
            </div>
          </Link>
          
          <Link
            to="/admin/verifications?tab=rejected"
            className="p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition flex items-center gap-3"
          >
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <div>
              <p className="font-medium text-gray-800">Rejected Requests</p>
              <p className="text-sm text-gray-500">{stats?.rejected_users || 0} rejected</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
