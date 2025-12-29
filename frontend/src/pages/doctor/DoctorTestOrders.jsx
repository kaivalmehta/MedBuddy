import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { testOrderService } from '../../services/professional'
import { 
  FileText, Clock, CheckCircle, XCircle, Home, Building,
  User, Loader2, Filter, Plus, AlertTriangle, ChevronDown,
  ChevronUp, FlaskConical, Calendar, Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DoctorTestOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const res = await testOrderService.getDoctorOrders(params)
      setOrders(res.data || [])
    } catch (err) {
      setError('Failed to load test orders')
    } finally {
      setLoading(false)
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
          <p className="text-gray-600 mt-1">Track lab test orders for your patients</p>
        </div>
        <Link
          to="/doctor/order-test"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Test Order
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No test orders found</p>
          <Link
            to="/doctor/order-test"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create First Order
          </Link>
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
                    order.status === 'completed' ? 'bg-green-100' :
                    order.status === 'declined' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <FlaskConical className={`w-6 h-6 ${
                      order.status === 'completed' ? 'text-green-600' :
                      order.status === 'declined' ? 'text-red-600' : 'text-blue-600'
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
                    </div>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {order.patient_name}
                      {order.collection_type === 'home_collection' && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Home className="w-3 h-3" />
                          Home
                        </span>
                      )}
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

                    {/* Clinical Notes */}
                    {order.clinical_notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Clinical Notes</p>
                        <p className="text-sm text-gray-700">{order.clinical_notes}</p>
                      </div>
                    )}

                    {/* Home Collection */}
                    {order.home_collection && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          Home Collection
                        </p>
                        <div className="text-sm text-gray-700">
                          <p>{order.home_collection.address_line1}, {order.home_collection.city}</p>
                          <p className="text-gray-500">
                            {order.home_collection.confirmed_date || order.home_collection.preferred_date} • 
                            {order.home_collection.time_slot_display}
                          </p>
                          {order.home_collection.collector_name && (
                            <p className="mt-1 text-green-700">
                              Collector: {order.home_collection.collector_name} ({order.home_collection.collector_phone})
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Decline Reason */}
                    {order.status === 'declined' && order.decline_reason && (
                      <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs font-medium text-red-700 mb-1">Decline Reason</p>
                        <p className="text-sm text-gray-700">{order.decline_reason}</p>
                      </div>
                    )}

                    {/* Reports */}
                    {order.has_report && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Report Available
                        </p>
                        <Link
                          to="/doctor/test-orders"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View Report
                        </Link>
                      </div>
                    )}

                    {/* Cost */}
                    {(order.estimated_cost || order.final_cost) && (
                      <div className="flex gap-4 text-sm">
                        {order.estimated_cost && (
                          <div>
                            <span className="text-gray-500">Estimated: </span>
                            <span className="font-medium">₹{order.estimated_cost}</span>
                          </div>
                        )}
                        {order.final_cost && (
                          <div>
                            <span className="text-gray-500">Final: </span>
                            <span className="font-medium text-green-600">₹{order.final_cost}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
