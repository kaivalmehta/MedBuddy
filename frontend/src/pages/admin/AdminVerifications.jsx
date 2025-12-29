// ============================================
// frontend/src/pages/admin/AdminVerifications.jsx
// ============================================

import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { adminService } from '../../services/admin'
import { 
  Clock, UserCheck, UserX, FileText, Building2, Stethoscope,
  FlaskConical, Loader2, ExternalLink, Check, X, RotateCcw,
  AlertTriangle, ArrowLeft, Eye, FileWarning
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminVerifications() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pending')
  const [requests, setRequests] = useState([])
  const [rejected, setRejected] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'approve', 'reject', 'view', 'reconsider'
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setSearchParams({ tab: activeTab })
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pendingRes, rejectedRes] = await Promise.all([
        adminService.getPendingVerifications(),
        adminService.getRejectedVerifications()
      ])
      console.log('Pending verifications:', pendingRes.data)
      setRequests(pendingRes.data.results || [])
      setRejected(rejectedRes.data.results || [])
    } catch (err) {
      console.error('Failed to load verifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedUser) return
    setProcessing(true)
    try {
      await adminService.approveVerification(selectedUser.id, notes)
      setShowModal(false)
      setSelectedUser(null)
      setNotes('')
      loadData()
    } catch (err) {
      console.error('Failed to approve:', err)
      alert('Failed to approve verification')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedUser || !reason.trim()) return
    setProcessing(true)
    try {
      await adminService.rejectVerification(selectedUser.id, reason)
      setShowModal(false)
      setSelectedUser(null)
      setReason('')
      loadData()
    } catch (err) {
      console.error('Failed to reject:', err)
      alert('Failed to reject verification')
    } finally {
      setProcessing(false)
    }
  }

  const handleReconsider = async () => {
    if (!selectedUser) return
    setProcessing(true)
    try {
      await adminService.reconsiderRejection(selectedUser.id)
      setShowModal(false)
      setSelectedUser(null)
      loadData()
    } catch (err) {
      console.error('Failed to reconsider:', err)
      alert('Failed to move back to pending')
    } finally {
      setProcessing(false)
    }
  }

  const openModal = (user, type) => {
    setSelectedUser(user)
    setModalType(type)
    setShowModal(true)
    setReason('')
    setNotes('')
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor': return Stethoscope
      case 'laboratory': return FlaskConical
      case 'pharmacy': return Building2
      default: return FileText
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor': return 'bg-blue-100 text-blue-600'
      case 'laboratory': return 'bg-purple-100 text-purple-600'
      case 'pharmacy': return 'bg-green-100 text-green-600'
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

  const currentData = activeTab === 'pending' ? requests : rejected

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Verification Requests</h1>
          <p className="text-gray-600 mt-1">Review and manage professional verification requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'pending'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Pending ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'rejected'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Rejected ({rejected.length})
        </button>
      </div>

      {/* Requests List */}
      {currentData.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {activeTab === 'pending' ? (
              <UserCheck className="w-8 h-8 text-gray-400" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <p className="text-gray-500">
            {activeTab === 'pending' 
              ? 'No pending verification requests' 
              : 'No rejected verification requests'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentData.map((user, idx) => {
            const RoleIcon = getRoleIcon(user.role)
            const hasDocument = user.verification_document && user.verification_document.trim() !== ''
            
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card"
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
                        {user.profile?.full_name || user.profile?.name || user.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role_display}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    
                    {/* Profile Details */}
                    {user.profile && (
                      <div className="mt-2 text-sm text-gray-600">
                        {user.role === 'doctor' && (
                          <>
                            <p><strong>Specialization:</strong> {user.profile.specialization}</p>
                            <p><strong>Registration #:</strong> {user.profile.registration_number}</p>
                            {user.profile.clinic_name && <p><strong>Clinic:</strong> {user.profile.clinic_name}</p>}
                          </>
                        )}
                        {user.role === 'laboratory' && (
                          <>
                            <p><strong>License #:</strong> {user.profile.license_number}</p>
                            <p><strong>Location:</strong> {user.profile.city}, {user.profile.state}</p>
                          </>
                        )}
                        {user.role === 'pharmacy' && (
                          <>
                            <p><strong>License #:</strong> {user.profile.license_number}</p>
                            <p><strong>Location:</strong> {user.profile.city}, {user.profile.state}</p>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* License Document Status */}
                    <div className="mt-3">
                      {hasDocument ? (
                        <a
                          href={user.verification_document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-sm font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          View License Document
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm">
                          <FileWarning className="w-4 h-4" />
                          No license document uploaded
                        </div>
                      )}
                    </div>
                    
                    {/* Rejection reason */}
                    {activeTab === 'rejected' && user.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Rejection Reason:</strong> {user.rejection_reason}
                        </p>
                        <p className="text-xs text-red-500 mt-1">
                          Rejected on {new Date(user.rejected_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    {/* Applied date */}
                    <p className="text-xs text-gray-400 mt-2">
                      Applied: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {activeTab === 'pending' ? (
                      <>
                        <button
                          onClick={() => openModal(user, 'approve')}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-1 w-full justify-center"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => openModal(user, 'reject')}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-1 w-full justify-center"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openModal(user, 'reconsider')}
                        className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-4 h-4" /> Reconsider
                      </button>
                    )}
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
              className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {modalType === 'approve' && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Approve Verification</h2>
                        <p className="text-gray-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to approve verification for{' '}
                      <strong>{selectedUser.profile?.full_name || selectedUser.profile?.name || selectedUser.name}</strong>?
                    </p>
                    
                    {/* Show document link in modal */}
                    {selectedUser.verification_document ? (
                      <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-800 font-medium mb-2">License Document:</p>
                        <a
                          href={selectedUser.verification_document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm"
                        >
                          <FileText className="w-4 h-4" />
                          View Document
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-700">
                          <FileWarning className="w-4 h-4 inline mr-1" />
                          No license document was uploaded by this user.
                        </p>
                      </div>
                    )}
                    
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes (optional)"
                      className="w-full p-3 border border-gray-200 rounded-xl mb-4"
                      rows={3}
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowModal(false)}
                        disabled={processing}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Approve
                      </button>
                    </div>
                  </>
                )}
                
                {modalType === 'reject' && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <UserX className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Reject Verification</h2>
                        <p className="text-gray-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      Please provide a reason for rejecting{' '}
                      <strong>{selectedUser.profile?.full_name || selectedUser.profile?.name || selectedUser.name}</strong>'s verification request.
                    </p>
                    
                    {/* Show document link in modal */}
                    {selectedUser.verification_document ? (
                      <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-800 font-medium mb-2">License Document:</p>
                        <a
                          href={selectedUser.verification_document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm"
                        >
                          <FileText className="w-4 h-4" />
                          View Document
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-700">
                          <FileWarning className="w-4 h-4 inline mr-1" />
                          No license document was uploaded by this user.
                        </p>
                      </div>
                    )}
                    
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Rejection reason (required)"
                      className="w-full p-3 border border-gray-200 rounded-xl mb-4"
                      rows={3}
                      required
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowModal(false)}
                        disabled={processing}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={processing || !reason.trim()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Reject
                      </button>
                    </div>
                  </>
                )}
                
                {modalType === 'reconsider' && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <RotateCcw className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Reconsider Request</h2>
                        <p className="text-gray-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">
                      This will move <strong>{selectedUser.profile?.full_name || selectedUser.profile?.name || selectedUser.name}</strong>'s 
                      request back to pending verifications for review.
                    </p>
                    <div className="p-3 bg-amber-50 rounded-lg mb-4">
                      <p className="text-sm text-amber-700">
                        <strong>Previous rejection reason:</strong> {selectedUser.rejection_reason}
                      </p>
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
                        onClick={handleReconsider}
                        disabled={processing}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Move to Pending
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
