// ============================================
// frontend/src/pages/admin/AdminDashboard.jsx
// ============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/admin'
import { 
  Users, UserCheck, UserX, AlertTriangle, Shield, Search,
  Clock, Loader2, ChevronRight, Activity, Stethoscope, Building2,
  FlaskConical, User, Mail, Phone, Calendar,
  CheckCircle, XCircle, Eye, RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    loadDashboard()
    loadAllUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, activeFilter, searchQuery])

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

  const loadAllUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await adminService.getAllUsers()
      // Handle both array and paginated response formats
      const userData = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setUsers(userData)
    } catch (err) {
      console.error('Failed to load users:', err)
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]
    
    // Filter by role
    if (activeFilter !== 'all') {
      filtered = filtered.filter(user => user.role === activeFilter)
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user => 
        user.first_name?.toLowerCase().includes(query) ||
        user.last_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        user.profile_info?.name?.toLowerCase().includes(query) ||
        user.profile_info?.full_name?.toLowerCase().includes(query) ||
        user.profile_info?.specialization?.toLowerCase().includes(query)
      )
    }
    
    setFilteredUsers(filtered)
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor': return <Stethoscope className="w-4 h-4" />
      case 'pharmacy': return <Building2 className="w-4 h-4" />
      case 'laboratory': return <FlaskConical className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor': return 'bg-purple-100 text-purple-600'
      case 'pharmacy': return 'bg-orange-100 text-orange-600'
      case 'laboratory': return 'bg-cyan-100 text-cyan-600'
      case 'admin': return 'bg-red-100 text-red-600'
      default: return 'bg-blue-100 text-blue-600'
    }
  }

  const getStatusBadge = (user) => {
    if (user.is_suspended) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">Suspended</span>
    }
    if (user.role !== 'patient' && user.role !== 'admin') {
      if (user.is_professional_verified) {
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">Verified</span>
      }
      if (user.is_rejected) {
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">Rejected</span>
      }
      return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-600">Pending</span>
    }
    if (user.is_email_verified) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">Active</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Unverified</span>
  }

  const filterTabs = [
    { key: 'all', label: 'All Users', icon: Users },
    { key: 'patient', label: 'Patients', icon: User },
    { key: 'doctor', label: 'Doctors', icon: Stethoscope },
    { key: 'pharmacy', label: 'Pharmacies', icon: Building2 },
    { key: 'laboratory', label: 'Laboratories', icon: FlaskConical },
  ]

  const getUserCounts = () => {
    return {
      all: users.length,
      patient: users.filter(u => u.role === 'patient').length,
      doctor: users.filter(u => u.role === 'doctor').length,
      pharmacy: users.filter(u => u.role === 'pharmacy').length,
      laboratory: users.filter(u => u.role === 'laboratory').length,
    }
  }

  const counts = getUserCounts()

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
      value: users.length,
      icon: Users,
      color: 'blue',
      link: null,
      subtitle: `${counts.patient} Patients, ${counts.doctor} Doctors`
    },
    {
      title: 'System Status',
      value: 'Active',
      icon: Activity,
      color: 'purple',
      link: null,
      subtitle: 'All systems operational'
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
        <button 
          onClick={() => { loadDashboard(); loadAllUsers(); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="h-full"
          >
            {stat.link ? (
              <Link
                to={stat.link}
                className="card h-full hover:shadow-lg transition-shadow flex items-start gap-4"
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[stat.color]}`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-gray-600 font-medium">{stat.title}</p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{stat.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </Link>
            ) : (
              <div className="card h-full flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[stat.color]}`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-gray-600 font-medium">{stat.title}</p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{stat.subtitle}</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* User Management Section */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            User Management
          </h2>
          
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-100">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                activeFilter === tab.key
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Users List */}
        {usersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No users found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Contact</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          {user.profile_info?.name && (
                            <p className="text-sm text-gray-500">{user.profile_info.name}</p>
                          )}
                          {user.profile_info?.full_name && (
                            <p className="text-sm text-gray-500">{user.profile_info.full_name}</p>
                          )}
                          {user.profile_info?.specialization && (
                            <p className="text-xs text-gray-400">{user.profile_info.specialization}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      {getStatusBadge(user)}
                    </td>
                    <td className="py-4">
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.role !== 'patient' && user.role !== 'admin' && !user.is_professional_verified && !user.is_rejected && (
                          <Link
                            to="/admin/verifications"
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Review Verification"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Link>
                        )}
                        {!user.is_suspended && user.role !== 'admin' && (
                          <Link
                            to="/admin/suspensions"
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Suspend User"
                          >
                            <XCircle className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getRoleColor(selectedUser.role)}`}>
                  {getRoleIcon(selectedUser.role)}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h4>
                  <p className="text-gray-500 capitalize">{selectedUser.role}</p>
                  {getStatusBadge(selectedUser)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 pt-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                </div>
                
                {selectedUser.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium">{selectedUser.phone}</p>
                    </div>
                  </div>
                )}
                
                {(selectedUser.profile_info?.name || selectedUser.profile_info?.full_name) && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Business/Practice Name</p>
                      <p className="font-medium">{selectedUser.profile_info?.name || selectedUser.profile_info?.full_name}</p>
                    </div>
                  </div>
                )}
                
                {selectedUser.profile_info?.specialization && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Stethoscope className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Specialization</p>
                      <p className="font-medium">{selectedUser.profile_info.specialization}</p>
                    </div>
                  </div>
                )}
                
                {(selectedUser.profile_info?.registration_number || selectedUser.profile_info?.license_number) && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">License/Registration Number</p>
                      <p className="font-medium">{selectedUser.profile_info?.registration_number || selectedUser.profile_info?.license_number}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Joined</p>
                    <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                {selectedUser.role !== 'admin' && !selectedUser.is_suspended && (
                  <Link
                    to="/admin/suspensions"
                    className="flex-1 py-2.5 bg-red-100 text-red-600 rounded-lg font-medium text-center hover:bg-red-200 transition"
                  >
                    Suspend User
                  </Link>
                )}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
