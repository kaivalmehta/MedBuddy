import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { testOrderService } from '../../services/professional'
import { 
  FileText, Clock, CheckCircle, XCircle, Home, Building,
  User, Stethoscope, AlertTriangle, Loader2, Filter,
  ChevronDown, ChevronUp, Phone, MapPin, Calendar,
  FlaskConical, Package, Play, AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LabTestOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  
  // Accept modal
  const [showAcceptModal, setShowAcceptModal] = useState(null)
  const [estimatedCost, setEstimatedCost] = useState('')
  const [labNotes, setLabNotes] = useState('')
  const [collectorName, setCollectorName] = useState('')
  const [collectorPhone, setCollectorPhone] = useState('')
  const [confirmedDate, setConfirmedDate] = useState('')
  const [confirmedTime, setConfirmedTime] = useState('')
  
  // Decline modal
  const [showDeclineModal, setShowDeclineModal] = useState(null)
  const [declineReason, setDeclineReason] = useState('')

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const res = await testOrderService.getLabOrders(params)
      setOrders(res.data || [])
    } catch (err) {
      setError('Failed to load test orders')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (orderId) => {
    setActionLoading(orderId)
    try {
      const data = {
        estimated_cost: estimatedCost || null,
        lab_notes: labNotes,
      }
      
      // Add collector info if home collection
      const order = orders.find(o => o.id === orderId)
      if (order?.collection_type === 'home_collection') {
        data.collector_name = collectorName
        data.collector_phone = collectorPhone
        data.confirmed_date = confirmedDate || order.home_collection?.preferred_date
        data.confirmed_time = confirmedTime
      }
      
      await testOrderService.accept(orderId, data)
      setShowAcceptModal(null)
      loadOrders()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept order')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (orderId) => {
    setActionLoading(orderId)
    try {
      await testOrderService.decline(orderId, declineReason)
      setShowDeclineModal(null)
      loadOrders()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline order')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionLoading(orderId)
    try {
      await testOrderService.updateStatus(orderId, newStatus)
      loadOrders()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteOrder = async (orderId) => {
    setActionLoading(orderId)
    try {
      await testOrderService.completeOrder(orderId)
      loadOrders()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete order')
    } finally {
      setActionLoading(null)
    }
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    declined: 'bg-red-100 text-red-700',
    sample_collected: 'bg-purple-100 text-purple-700',
    processing: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  const urgencyColors = {
    routine: 'bg-gray-100 text-gray-600',
    urgent: 'bg-orange-100 text-orange-700',
    stat: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Test Orders</h1>
          <p className="text-gray-600 mt-1">Manage incoming test orders from doctors</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No test orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden"
            >
              {/* Order Header */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    order.urgency === 'stat' ? 'bg-red-100' :
                    order.urgency === 'urgent' ? 'bg-orange-100' : 'bg-purple-100'
                  }`}>
                    <FileText className={`w-6 h-6 ${
                      order.urgency === 'stat' ? 'text-red-600' :
                      order.urgency === 'urgent' ? 'text-orange-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">#{order.order_number}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status]}`}>
                        {order.status_display}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${urgencyColors[order.urgency]}`}>
                        {order.urgency_display}
                      </span>
                      {order.collection_type === 'home_collection' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          Home
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {order.patient_name}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{order.tests_requested?.length} tests</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {expandedOrder === order.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedOrder === order.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-gray-200 mt-4 pt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Doctor Info */}
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600 font-medium mb-1">Ordered By</p>
                        <p className="font-medium text-gray-800 flex items-center gap-1">
                          <Stethoscope className="w-4 h-4" />
                          {order.doctor_name}
                        </p>
                        {order.diagnosis && (
                          <p className="text-sm text-gray-600 mt-1">Diagnosis: {order.diagnosis}</p>
                        )}
                      </div>

                      {/* Patient Info */}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium mb-1">Patient</p>
                        <p className="font-medium text-gray-800">{order.patient_name}</p>
                        <p className="text-sm text-gray-500">{order.patient_email}</p>
                      </div>
                    </div>

                    {/* Tests */}
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Tests Requested:</p>
                      <div className="flex flex-wrap gap-2">
                        {order.tests_requested?.map((test, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            {test}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Notes */}
                    {order.clinical_notes && (
                      <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                        <p className="text-xs text-amber-600 font-medium mb-1">Clinical Notes</p>
                        <p className="text-sm text-gray-700">{order.clinical_notes}</p>
                      </div>
                    )}

                    {/* Home Collection Details */}
                    {order.collection_type === 'home_collection' && order.home_collection && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-600 font-medium mb-2 flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          Home Collection Details
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Address</p>
                            <p className="text-gray-800">
                              {order.home_collection.address_line1}, 
                              {order.home_collection.city}, {order.home_collection.state}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Phone</p>
                            <p className="text-gray-800">{order.home_collection.contact_phone}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Preferred Date</p>
                            <p className="text-gray-800">{order.home_collection.preferred_date}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Preferred Time</p>
                            <p className="text-gray-800">{order.home_collection.time_slot_display}</p>
                          </div>
                          {order.home_collection.collector_name && (
                            <>
                              <div>
                                <p className="text-gray-500">Collector</p>
                                <p className="text-gray-800">{order.home_collection.collector_name}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Collector Phone</p>
                                <p className="text-gray-800">{order.home_collection.collector_phone}</p>
                              </div>
                            </>
                          )}
                        </div>
                        {order.home_collection.patient_notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            Note: {order.home_collection.patient_notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setShowAcceptModal(order)}
                            disabled={actionLoading === order.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept Order
                          </button>
                          <button
                            onClick={() => setShowDeclineModal(order)}
                            disabled={actionLoading === order.id}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                        </>
                      )}
                      {order.status === 'accepted' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'sample_collected')}
                          disabled={actionLoading === order.id}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                        >
                          {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                          Mark Sample Collected
                        </button>
                      )}
                      {order.status === 'sample_collected' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'processing')}
                          disabled={actionLoading === order.id}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                        >
                          {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          Start Processing
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <>
                          <Link
                            to={`/laboratory/upload?order=${order.id}&patient=${order.patient_email}`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            Upload Report{order.reports_count > 0 ? 's' : ''}
                          </Link>
                          {order.reports_count > 0 && (
                            <button
                              onClick={() => handleCompleteOrder(order.id)}
                              disabled={actionLoading === order.id}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                            >
                              {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Complete Order ({order.reports_count} report{order.reports_count !== 1 ? 's' : ''})
                            </button>
                          )}
                        </>
                      )}
                      {order.reports_count > 0 && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg flex items-center gap-1 text-sm">
                          <FileText className="w-3 h-3" />
                          {order.reports_count} report{order.reports_count !== 1 ? 's' : ''} uploaded
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Accept Modal */}
      <AnimatePresence>
        {showAcceptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAcceptModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">Accept Order #{showAcceptModal.order_number}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="₹0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lab Notes</label>
                  <textarea
                    value={labNotes}
                    onChange={(e) => setLabNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder="Any notes for this order..."
                  />
                </div>

                {showAcceptModal.collection_type === 'home_collection' && (
                  <>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-2">Home Collection Assignment</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Collector Name</label>
                          <input
                            type="text"
                            value={collectorName}
                            onChange={(e) => setCollectorName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Collector Phone</label>
                          <input
                            type="tel"
                            value={collectorPhone}
                            onChange={(e) => setCollectorPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Confirm Date</label>
                            <input
                              type="date"
                              value={confirmedDate}
                              onChange={(e) => setConfirmedDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Confirm Time</label>
                            <input
                              type="time"
                              value={confirmedTime}
                              onChange={(e) => setConfirmedTime(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAcceptModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAccept(showAcceptModal.id)}
                  disabled={actionLoading === showAcceptModal.id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  {actionLoading === showAcceptModal.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Accept
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decline Modal */}
      <AnimatePresence>
        {showDeclineModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeclineModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">Decline Order #{showDeclineModal.order_number}</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Declining</label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="Please provide a reason..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeclineModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecline(showDeclineModal.id)}
                  disabled={actionLoading === showDeclineModal.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  {actionLoading === showDeclineModal.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Decline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}