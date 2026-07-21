import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { testOrderService } from '../../services/professional'
import { 
  FileText, Clock, CheckCircle, XCircle, Home, Building,
  Stethoscope, Loader2, FlaskConical, Calendar, Eye,
  ChevronDown, ChevronUp, AlertTriangle, Phone, MapPin, Truck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PatientTestOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [respondingToQuote, setRespondingToQuote] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const res = await testOrderService.getPatientOrders()
      setOrders(res.data || [])
    } catch (err) {
      setError('Failed to load test orders')
    } finally {
      setLoading(false)
    }
  }

  const handleQuoteResponse = async (orderId, action) => {
    setRespondingToQuote(orderId)
    try {
      const payload = { action }
      if (action === 'reject' && rejectionReason) {
        payload.rejection_reason = rejectionReason
      }
      await testOrderService.respondToQuote(orderId, payload)
      setShowRejectModal(null)
      setRejectionReason('')
      await loadOrders()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to respond to quote')
    } finally {
      setRespondingToQuote(null)
    }
  }

  const statusConfig = {
    pending: {
      color: 'bg-yellow-100 text-yellow-700',
      icon: Clock,
      label: 'Pending Lab Acceptance',
      description: 'Waiting for the laboratory to accept this order'
    },
    quote_sent: {
      color: 'bg-blue-100 text-blue-700',
      icon: FileText,
      label: 'Quote Received',
      description: 'Laboratory has sent a quote. Please review and confirm.'
    },
    quote_accepted: {
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle,
      label: 'Quote Accepted',
      description: 'You accepted the quote. Waiting for lab to proceed.'
    },
    quote_rejected: {
      color: 'bg-orange-100 text-orange-700',
      icon: XCircle,
      label: 'Quote Rejected',
      description: 'You rejected the quote. Consider selecting another lab.'
    },
    accepted: {
      color: 'bg-blue-100 text-blue-700',
      icon: CheckCircle,
      label: 'Accepted',
      description: 'Lab has accepted. Please visit the lab or wait for home collection.'
    },
    declined: {
      color: 'bg-red-100 text-red-700',
      icon: XCircle,
      label: 'Declined',
      description: 'Lab has declined this order'
    },
    sample_collected: {
      color: 'bg-purple-100 text-purple-700',
      icon: FlaskConical,
      label: 'Sample Collected',
      description: 'Your sample has been collected and sent for processing'
    },
    processing: {
      color: 'bg-indigo-100 text-indigo-700',
      icon: Clock,
      label: 'Processing',
      description: 'Your tests are being processed'
    },
    completed: {
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle,
      label: 'Completed',
      description: 'Your results are ready'
    },
    cancelled: {
      color: 'bg-gray-100 text-gray-700',
      icon: XCircle,
      label: 'Cancelled',
      description: 'This order has been cancelled'
    }
  }

  const urgencyColors = {
    routine: 'bg-gray-100 text-gray-600',
    urgent: 'bg-orange-100 text-orange-700',
    stat: 'bg-red-100 text-red-700',
  }

  const getStatusStep = (status) => {
    const steps = ['pending', 'accepted', 'sample_collected', 'processing', 'completed']
    const index = steps.indexOf(status)
    return index >= 0 ? index + 1 : 0
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Lab Orders</h1>
        <p className="text-gray-600 mt-1">Track lab tests ordered by your doctors</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card text-center py-12">
          <FlaskConical className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No lab orders yet</p>
          <p className="text-sm text-gray-400 mt-1">
            When your doctor orders lab tests, they'll appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending
            const StatusIcon = config.icon
            const currentStep = getStatusStep(order.status)
            
            return (
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
                      order.status === 'completed' ? 'bg-green-100' :
                      order.status === 'declined' ? 'bg-red-100' : 'bg-purple-100'
                    }`}>
                      <StatusIcon className={`w-6 h-6 ${
                        order.status === 'completed' ? 'text-green-600' :
                        order.status === 'declined' ? 'text-red-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">Order #{order.order_number}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        {order.urgency !== 'routine' && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${urgencyColors[order.urgency]}`}>
                            {order.urgency_display}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Stethoscope className="w-3 h-3" />
                        {order.doctor_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{order.laboratory_name}</p>
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
                      {/* Progress Steps */}
                      {order.status !== 'declined' && order.status !== 'cancelled' && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between">
                            {['Ordered', 'Accepted', 'Collected', 'Processing', 'Completed'].map((step, idx) => (
                              <div key={step} className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  idx < currentStep ? 'bg-green-500 text-white' :
                                  idx === currentStep ? 'bg-blue-500 text-white' :
                                  'bg-gray-200 text-gray-400'
                                }`}>
                                  {idx < currentStep ? (
                                    <CheckCircle className="w-5 h-5" />
                                  ) : (
                                    <span className="text-sm font-medium">{idx + 1}</span>
                                  )}
                                </div>
                                <span className={`text-xs mt-1 ${
                                  idx <= currentStep ? 'text-gray-700' : 'text-gray-400'
                                }`}>
                                  {step}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex mt-2 -mx-4">
                            {[0, 1, 2, 3].map((idx) => (
                              <div
                                key={idx}
                                className={`flex-1 h-1 mx-1 rounded ${
                                  idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Message */}
                      <div className={`p-3 rounded-lg mb-4 ${
                        order.status === 'completed' ? 'bg-green-50' :
                        order.status === 'declined' ? 'bg-red-50' : 
                        order.status === 'quote_sent' ? 'bg-amber-50' : 'bg-blue-50'
                      }`}>
                        <p className="text-sm text-gray-700">{config.description}</p>
                      </div>

                      {/* Quote Response Section */}
                      {order.status === 'quote_sent' && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-amber-600" />
                            <h4 className="font-semibold text-amber-800">Quote from Laboratory</h4>
                          </div>
                          
                          <div className="bg-white rounded-lg p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-gray-600">Estimated Cost:</span>
                              <span className="text-2xl font-bold text-green-600">${order.estimated_cost}</span>
                            </div>
                            {order.quote_notes && (
                              <div className="text-sm text-gray-600 pt-3 border-t">
                                <p className="font-medium text-gray-700 mb-1">Lab Notes:</p>
                                <p>{order.quote_notes}</p>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-sm text-amber-700 mb-4">
                            Please review the quote and confirm to proceed with the lab tests.
                          </p>
                          
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleQuoteResponse(order.id, 'accept')}
                              disabled={respondingToQuote === order.id}
                              className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {respondingToQuote === order.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-5 h-5" />
                              )}
                              Accept Quote
                            </button>
                            <button
                              onClick={() => setShowRejectModal(order.id)}
                              disabled={respondingToQuote === order.id}
                              className="flex-1 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <XCircle className="w-5 h-5" />
                              Reject Quote
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Quote Accepted Info */}
                      {order.status === 'quote_accepted' && (
                        <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <h4 className="font-medium text-green-800">Quote Accepted</h4>
                          </div>
                          <p className="text-sm text-gray-700">
                            You accepted the quote of <strong>${order.estimated_cost}</strong>. 
                            The laboratory will proceed with accepting your order.
                          </p>
                        </div>
                      )}

                      {/* Quote Rejected Info */}
                      {order.status === 'quote_rejected' && (
                        <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-5 h-5 text-orange-600" />
                            <h4 className="font-medium text-orange-800">Quote Rejected</h4>
                          </div>
                          <p className="text-sm text-gray-700">
                            You rejected the quote of ${order.estimated_cost}. 
                            Your doctor has been notified and may select another laboratory.
                          </p>
                          {order.patient_rejection_reason && (
                            <p className="text-sm text-gray-600 mt-2">
                              <strong>Your reason:</strong> {order.patient_rejection_reason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tests */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Tests Ordered:</p>
                        <div className="flex flex-wrap gap-2">
                          {order.tests_requested?.map((test, idx) => (
                            <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                              {test}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Home Collection Details */}
                      {order.collection_type === 'home_collection' && order.home_collection && (
                        <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Home className="w-5 h-5 text-green-600" />
                            <h4 className="font-medium text-green-800">Home Collection</h4>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-gray-700">{order.home_collection.address_line1}</p>
                                <p className="text-gray-600">
                                  {order.home_collection.city}, {order.home_collection.state} {order.home_collection.zip_code}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">
                                {order.home_collection.confirmed_date || order.home_collection.preferred_date}
                                {' • '}
                                {order.home_collection.confirmed_time || order.home_collection.time_slot_display}
                              </span>
                            </div>

                            {order.home_collection.collector_name && (
                              <div className="mt-3 p-3 bg-white rounded-lg">
                                <p className="text-xs text-green-600 font-medium mb-1">Collector Assigned</p>
                                <p className="font-medium text-gray-800">{order.home_collection.collector_name}</p>
                                <a 
                                  href={`tel:${order.home_collection.collector_phone}`}
                                  className="text-blue-600 flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  {order.home_collection.collector_phone}
                                </a>
                              </div>
                            )}

                            {order.home_collection.status === 'in_transit' && (
                              <div className="mt-3 p-3 bg-indigo-100 rounded-lg flex items-center gap-2">
                                <Truck className="w-5 h-5 text-indigo-600" />
                                <span className="text-indigo-700 font-medium">Collector is on the way!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Lab Visit Info */}
                      {order.collection_type === 'lab_visit' && order.status === 'accepted' && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="w-5 h-5 text-blue-600" />
                            <h4 className="font-medium text-blue-800">Visit Laboratory</h4>
                          </div>
                          <p className="text-sm text-gray-700">
                            Please visit <strong>{order.laboratory_name}</strong> at your earliest convenience to provide your sample.
                          </p>
                        </div>
                      )}

                      {/* Decline Reason */}
                      {order.status === 'declined' && order.decline_reason && (
                        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs font-medium text-red-700 mb-1">Reason</p>
                          <p className="text-sm text-gray-700">{order.decline_reason}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Your doctor has been notified and may select another laboratory.
                          </p>
                        </div>
                      )}

                      {/* View Report Button */}
                      {order.status === 'completed' && order.has_report && (
                        <Link
                          to="/reports"
                          className="block w-full py-3 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          View Results
                        </Link>
                      )}

                      {/* Cost */}
                      {order.estimated_cost && (
                        <div className="mt-4 pt-3 border-t border-gray-200 text-sm text-gray-600">
                          <span>Estimated Cost: </span>
                          <span className="font-semibold text-gray-800">₹{order.estimated_cost}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Reject Quote Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Reject Quote</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reject this quote? Your doctor will be notified.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full p-3 border border-gray-200 rounded-lg resize-none h-24 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectionReason('')
                }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleQuoteResponse(showRejectModal, 'reject')}
                disabled={respondingToQuote}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {respondingToQuote ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Reject Quote
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}