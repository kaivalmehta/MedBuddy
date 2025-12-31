import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingCart, Package, Clock, CheckCircle, XCircle, 
  Loader2, ArrowLeft, Store, DollarSign, AlertCircle,
  RefreshCw, ChevronRight
} from 'lucide-react'
import api from '../../services/api'

const statusConfig = {
  pending: { color: 'gray', icon: Clock, label: 'Pending' },
  sent_to_pharmacy: { color: 'blue', icon: Package, label: 'Sent to Pharmacy' },
  pharmacy_quoted: { color: 'yellow', icon: DollarSign, label: 'Quote Received' },
  patient_accepted: { color: 'green', icon: CheckCircle, label: 'Accepted' },
  patient_rejected: { color: 'red', icon: XCircle, label: 'Rejected' },
  preparing: { color: 'purple', icon: Package, label: 'Preparing' },
  ready_for_pickup: { color: 'green', icon: CheckCircle, label: 'Ready for Pickup' },
  completed: { color: 'green', icon: CheckCircle, label: 'Completed' },
  cancelled: { color: 'red', icon: XCircle, label: 'Cancelled' }
}

export default function PrescriptionOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [respondingTo, setRespondingTo] = useState(null)
  
  useEffect(() => {
    loadOrders()
  }, [])
  
  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await api.get('/pharmacy/prescription-orders/')
      // Handle both paginated and non-paginated responses
      setOrders(res.data?.results || res.data || [])
    } catch (err) {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }
  
  const respondToQuote = async (orderId, action) => {
    setRespondingTo(orderId)
    try {
      await api.post(`/pharmacy/prescription-orders/${orderId}/`, { action })
      await loadOrders()
    } catch (err) {
      setError('Failed to respond to quote')
    } finally {
      setRespondingTo(null)
    }
  }
  
  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.pending
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
      purple: 'bg-purple-100 text-purple-700'
    }
    
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colorClasses[config.color]}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Prescription Orders</h1>
              <p className="text-gray-600">Track your pharmacy orders</p>
            </div>
          </div>
          
          <button
            onClick={loadOrders}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Orders Yet</h3>
          <p className="text-gray-500 mb-6">You haven't placed any prescription orders.</p>
          <Link
            to="/order-prescription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            <ShoppingCart className="w-5 h-5" />
            Order Prescription
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-medium text-gray-800">Order #{order.order_number}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {getStatusBadge(order.status)}
              </div>
              
              {/* Pharmacy Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                <Store className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-800">{order.pharmacy_name}</p>
                  <p className="text-sm text-gray-500">{order.pharmacy_address}</p>
                </div>
              </div>
              
              {/* Medications */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Medications:</p>
                <div className="flex flex-wrap gap-2">
                  {order.selected_medications && order.selected_medications.length > 0 ? (
                    order.selected_medications.map((med, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                        {med.name || med} {med.quantity ? `(x${med.quantity})` : ''}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">
                      {order.medication_count ? `${order.medication_count} medication(s)` : 'No medications listed'}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Quote Response */}
              {order.status === 'pharmacy_quoted' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-yellow-800">Quote Received</p>
                      <p className="text-2xl font-bold text-yellow-900">${order.quoted_amount}</p>
                    </div>
                    {order.pharmacy_notes && (
                      <p className="text-sm text-yellow-700">{order.pharmacy_notes}</p>
                    )}
                  </div>
                  
                  {/* Medication Availability from Quote */}
                  {order.quote_details?.medications && (
                    <div className="mb-4 space-y-2">
                      <p className="text-sm font-medium text-yellow-800">Medication Availability:</p>
                      {order.quote_details.medications.map((med, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-2 rounded text-sm ${
                          !med.available 
                            ? 'bg-red-100 text-red-700' 
                            : med.availableQty < med.requested 
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                        }`}>
                          <span className="flex items-center gap-2">
                            {med.available ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            {med.name}
                          </span>
                          <span>
                            {med.available 
                              ? `${med.availableQty}/${med.requested} available`
                              : 'Not available'}
                            {med.note && ` - ${med.note}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {order.quote_details?.notes && (
                    <p className="text-sm text-yellow-700 mb-3 italic">
                      "{order.quote_details.notes}"
                    </p>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => respondToQuote(order.id, 'accept')}
                      disabled={respondingTo === order.id}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {respondingTo === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => respondToQuote(order.id, 'reject')}
                      disabled={respondingTo === order.id}
                      className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              )}
              
              {/* Ready for Pickup */}
              {order.status === 'ready_for_pickup' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Ready for Pickup!</p>
                      <p className="text-sm text-green-700">
                        Your order is ready at {order.pharmacy_name}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Final Amount */}
              {order.final_amount && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-gray-600">Total Paid:</span>
                  <span className="font-bold text-gray-800">${order.final_amount}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      
      {/* New Order Button */}
      {orders.length > 0 && (
        <div className="text-center">
          <Link
            to="/order-prescription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            <ShoppingCart className="w-5 h-5" />
            New Order
          </Link>
        </div>
      )}
    </div>
  )
}