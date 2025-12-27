// ============================================
// frontend/src/pages/admin/AdminSuspensions.jsx
// ============================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/admin'
import { 
  UserX, UserCheck, Loader2, ArrowLeft, AlertTriangle, Search,
  Stethoscope, FlaskConical, Building2, User, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminSuspensions() {
  const [suspensions, setSuspensions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'reinstate' or 'suspend'
  const [processing, setProcessing] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState('')
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    loadSuspensions()
  }, [])

  const loadSuspensions = async () => {
    setLoading(true)
    try {
      const res = await adminService.getSuspensions()
      setSuspensions(res.data.results || [])
    } catch (err) {
      console.error('Failed to load suspensions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await adminService.searchUsers(searchQuery.trim())
      setSearchResults(res.data.results || [])
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch()
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  const handleReinstate = async () => {
    if (!selectedUser) return
    setProcessing(true)
    try {
      await adminService.unsuspendUser(selectedUser.id)
      setShowModal(false)
      setSelectedUser(null)
      loadSuspensions()
    } catch (err) {
      console.error('Failed to reinstate:', err)
      alert('Failed to reinstate user')
    } finally {
      setProcessing(false)
    }
  }

  const handleSuspend = async () => {
    if (!selectedUser || !suspensionReason.trim()) return
    setProcessing(true)
    try {
      await adminService.suspendUser(selectedUser.id, suspensionReason)
      setShowModal(false)
      setSelectedUser(null)
      setSuspensionReason('')
      setSearchQuery('')
      setSearchResults([])
      loadSuspensions()
    } catch (err) {
      console.error('Failed to suspend:', err)
      alert('Failed to suspend user')
    } finally {
      setProcessing(false)
    }
  }

  const openSuspendModal = (user) => {
    setSelectedUser(user)
    setModalType('suspend')
    setSuspensionReason('')
    setShowModal(true)
  }

  const openReinstateModal = (user) => {
    setSelectedUser(user)
    setModalType('reinstate')
    setShowModal(true)
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor': return Stethoscope
      case 'laboratory': return FlaskConical
      case 'pharmacy': return Building2
      case 'patient': return User
      default: return User
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor': return 'bg-blue-100 text-blue-600'
      case 'laboratory': return 'bg-purple-100 text-purple-600'
      case 'pharmacy': return 'bg-green-100 text-green-600'
      case 'patient': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/admin" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <UserX className="w-7 h-7 text-red-600" />
          User Suspensions
        </h1>
        <p className="text-gray-600 mt-1">Search and suspend users, or reinstate suspended accounts</p>
      </div>

      {/* Search to Suspend Section */}
      <div className="card border-2 border-dashed border-gray-300">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-purple-500" />
          Search & Suspend User
        </h2>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or name (min 2 characters)..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {searching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          )}
          
          {!searching && searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {searchResults.map((user) => {
                const RoleIcon = getRoleIcon(user.role)
                return (
                  <div key={user.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getRoleColor(user.role)}`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {user.profile?.name || user.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(user.role)}`}>
                          {user.role_display}
                        </span>
                        {user.is_professional_verified && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openSuspendModal(user)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2 flex-shrink-0"
                    >
                      <UserX className="w-4 h-4" /> Suspend
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          
          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              No users found matching "{searchQuery}"
            </div>
          )}
          
          {!searching && searchQuery.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              Enter an email or name to search for users to suspend
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="card p-4 bg-red-50 border-red-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-800">{suspensions.length}</p>
            <p className="text-red-600">Currently Suspended</p>
          </div>
        </div>
      </div>

      {/* Suspensions List */}
      {suspensions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-500">No suspended users</p>
          <p className="text-sm text-gray-400 mt-1">All accounts are in good standing</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Suspended Accounts</h2>
          {suspensions.map((user, idx) => {
            const RoleIcon = getRoleIcon(user.role)
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card border-red-200"
              >
                <div className="flex items-start gap-4">
                  {/* Role Icon */}
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${getRoleColor(user.role)}`}>
                    <RoleIcon className="w-7 h-7" />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">
                        {user.profile?.name || user.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role_display}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Suspended
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    
                    {/* Suspension reason */}
                    {user.suspension_reason && (
                      <div className="mt-2 p-2 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Reason:</strong> {user.suspension_reason}
                        </p>
                      </div>
                    )}
                    
                    {/* Suspension date */}
                    <p className="text-xs text-gray-400 mt-2">
                      Suspended on: {user.suspended_at ? new Date(user.suspended_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => openReinstateModal(user)}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" /> Reinstate
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !processing && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {modalType === 'reinstate' && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Reinstate User</h2>
                        <p className="text-gray-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to reinstate <strong>{selectedUser.profile?.name || selectedUser.name}</strong>?
                    </p>
                    
                    {selectedUser.role !== 'patient' && (
                      <div className="p-3 bg-blue-50 rounded-lg mb-4">
                        <p className="text-sm text-blue-700">
                          This will also restore their professional verification status.
                        </p>
                      </div>
                    )}
                    
                    {selectedUser.suspension_reason && (
                      <div className="p-3 bg-gray-50 rounded-lg mb-4">
                        <p className="text-sm text-gray-600">
                          <strong>Was suspended for:</strong> {selectedUser.suspension_reason}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowModal(false)}
                        disabled={processing}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReinstate}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        Reinstate User
                      </button>
                    </div>
                  </>
                )}
                
                {modalType === 'suspend' && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <UserX className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Suspend User</h2>
                        <p className="text-gray-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      You are about to suspend <strong>{selectedUser.profile?.name || selectedUser.name}</strong>.
                      {selectedUser.role !== 'patient' && ' This will also revoke their professional verification.'}
                    </p>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Suspension Reason <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={suspensionReason}
                        onChange={(e) => setSuspensionReason(e.target.value)}
                        placeholder="Enter reason for suspension..."
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        rows={3}
                        required
                      />
                    </div>
                    
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowModal(false)}
                        disabled={processing}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSuspend}
                        disabled={processing || !suspensionReason.trim()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                        Suspend User
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
