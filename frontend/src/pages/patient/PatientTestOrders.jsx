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

  const statusConfig = {
    pending: {
      color: 'bg-yellow-100 text-yellow-700',
      icon: Clock,
      label: 'Pending Lab Acceptance',
      description: 'Waiting for the laboratory to accept this order'
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
                        order.status === 'declined' ? 'bg-red-50' : 'bg-blue-50'
                      }`}>
                        <p className="text-sm text-gray-700">{config.description}</p>
                      </div>

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
    </div>
  )
}
