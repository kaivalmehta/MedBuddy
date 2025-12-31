import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, Clock, CheckCircle, XCircle, Loader2, ArrowLeft, 
  User, Pill, DollarSign, AlertCircle, RefreshCw, Send,
  FileText, Phone, MapPin, ChevronDown, ChevronUp, Check, X, Plus, Minus
} from 'lucide-react'
import api from '../../services/api'

const statusConfig = {
  pending: { color: 'gray', icon: Clock, label: 'Pending', next: null },
  sent_to_pharmacy: { color: 'blue', icon: Package, label: 'New Order', next: 'quote' },
  pharmacy_quoted: { color: 'yellow', icon: DollarSign, label: 'Quote Sent', next: null },
  patient_accepted: { color: 'green', icon: CheckCircle, label: 'Accepted', next: 'preparing' },
  preparing: { color: 'purple', icon: Package, label: 'Preparing', next: 'ready_for_pickup' },
  ready_for_pickup: { color: 'emerald', icon: CheckCircle, label: 'Ready', next: 'completed' },
  completed: { color: 'green', icon: CheckCircle, label: 'Completed', next: null },
  cancelled: { color: 'red', icon: XCircle, label: 'Cancelled', next: null },
  rejected: { color: 'red', icon: XCircle, label: 'Rejected', next: null }
}

const statusActions = {
  preparing: 'Mark Preparing',
  ready_for_pickup: 'Mark Ready for Pickup',
  completed: 'Mark Completed'
}

export default function PharmacyRxOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [quoteForm, setQuoteForm] = useState({ orderId: null, amount: '', details: '' })
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('active')
  const [medAvailability, setMedAvailability] = useState({}) // {orderId: {medIdx: {available: bool, availableQty: num, note: string}}}
  
  // Initialize medication availability when order is expanded
  const initMedAvailability = (order) => {
    if (!medAvailability[order.id] && order.selected_medications?.length > 0) {
      const initial = {}
      order.selected_medications.forEach((med, idx) => {
        initial[idx] = {
          available: true,
          availableQty: med.quantity || 1,
          note: ''
        }
      })
      setMedAvailability(prev => ({ ...prev, [order.id]: initial }))
    }
  }
  
  const toggleMedAvailability = (orderId, medIdx) => {
    setMedAvailability(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [medIdx]: {
          ...prev[orderId]?.[medIdx],
          available: !prev[orderId]?.[medIdx]?.available
        }
      }
    }))
  }
  
  const updateMedQty = (orderId, medIdx, qty) => {
    setMedAvailability(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [medIdx]: {
          ...prev[orderId]?.[medIdx],
          availableQty: Math.max(0, qty)
        }
      }
    }))
  }
  
  const updateMedNote = (orderId, medIdx, note) => {
    setMedAvailability(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [medIdx]: {
          ...prev[orderId]?.[medIdx],
          note
        }
      }
    }))
  }
  
  useEffect(() => {
    loadOrders()
  }, [])
  
  const loadOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/pharmacy/rx-orders/')
      // Handle both paginated and non-paginated responses
      setOrders(res.data?.results || res.data || [])
    } catch (err) {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }
  
  const submitQuote = async (orderId) => {
    if (!quoteForm.amount || parseFloat(quoteForm.amount) <= 0) {
      setError('Please enter a valid quote amount')
      return
    }
    
    // Build availability summary for quote details
    const order = orders.find(o => o.id === orderId)
    const availabilityDetails = order?.selected_medications?.map((med, idx) => {
      const avail = medAvailability[orderId]?.[idx] || { available: true, availableQty: med.quantity || 1, note: '' }
      return {
        name: med.name,
        requested: med.quantity || 1,
        available: avail.available,
        availableQty: avail.available ? avail.availableQty : 0,
        note: avail.note || ''
      }
    }) || []
    
    const quoteDetails = {
      notes: quoteForm.details,
      medications: availabilityDetails
    }
    
    setSubmitting(true)
    try {
      await api.post(`/pharmacy/rx-orders/${orderId}/quote/`, {
        quoted_amount: parseFloat(quoteForm.amount),
        quote_details: quoteDetails
      })
      setQuoteForm({ orderId: null, amount: '', details: '' })
      await loadOrders()
    } catch (err) {
      setError('Failed to submit quote')
    } finally {
      setSubmitting(false)
    }
  }
  
  const updateStatus = async (orderId, newStatus) => {
    setSubmitting(true)
    try {
      await api.patch(`/pharmacy/rx-orders/${orderId}/status/`, { status: newStatus })
      await loadOrders()
    } catch (err) {
      setError('Failed to update status')
    } finally {
      setSubmitting(false)
    }
  }
  
  const rejectOrder = async (orderId) => {
    if (!confirm('Are you sure you want to reject this order?')) return
    
    setSubmitting(true)
    try {
      await api.patch(`/pharmacy/rx-orders/${orderId}/status/`, { status: 'rejected' })
      await loadOrders()
    } catch (err) {
      setError('Failed to reject order')
    } finally {
      setSubmitting(false)
    }
  }
  
  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.pending
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      green: 'bg-green-100 text-green-700',
      emerald: 'bg-emerald-100 text-emerald-700',
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
  
  const filteredOrders = orders.filter(order => {
    if (filter === 'active') {
      return !['completed', 'cancelled', 'rejected'].includes(order.status)
    } else if (filter === 'completed') {
      return ['completed', 'cancelled', 'rejected'].includes(order.status)
    }
    return true
  })
  
  const activeCount = orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          to="/pharmacy/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Prescription Orders</h1>
              <p className="text-gray-600">
                {activeCount > 0 ? `${activeCount} active order${activeCount !== 1 ? 's' : ''}` : 'No active orders'}
              </p>
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

      {/* Filters */}
      <div className="flex gap-2">
        {['active', 'completed', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

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
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <XCircle className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            {filter === 'active' ? 'No Active Orders' : filter === 'completed' ? 'No Completed Orders' : 'No Orders'}
          </h3>
          <p className="text-gray-500">
            {filter === 'active' 
              ? 'New prescription orders from patients will appear here.'
              : 'Order history will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden"
            >
              {/* Order Header */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => {
                  const newExpanded = expandedOrder === order.id ? null : order.id
                  setExpandedOrder(newExpanded)
                  if (newExpanded) initMedAvailability(order)
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {order.patient_name || 'Patient'}
                      </span>
                      <span className="text-sm text-gray-500">#{order.order_number}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{order.medication_count || order.selected_medications?.length || 0} medication(s)</span>
                      <span>•</span>
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status)}
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
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      {/* Patient Info */}
                      {order.patient_phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{order.patient_phone}</span>
                        </div>
                      )}
                      
                      {/* Medications with Availability Check */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Pill className="w-4 h-4" />
                          Requested Medications
                        </h4>
                        {order.selected_medications && order.selected_medications.length > 0 ? (
                          <div className="space-y-3">
                            {order.selected_medications.map((med, idx) => {
                              const availability = medAvailability[order.id]?.[idx] || { 
                                available: true, 
                                availableQty: med.quantity || 1, 
                                note: '' 
                              }
                              const requestedQty = med.quantity || 1
                              const isPartial = availability.available && availability.availableQty < requestedQty
                              
                              return (
                                <div key={idx} className={`p-3 rounded-lg border-2 ${
                                  !availability.available 
                                    ? 'border-red-200 bg-red-50' 
                                    : isPartial 
                                      ? 'border-yellow-200 bg-yellow-50'
                                      : 'border-green-200 bg-green-50'
                                }`}>
                                  <div className="flex items-start gap-3">
                                    {/* Availability Toggle */}
                                    <button
                                      onClick={() => toggleMedAvailability(order.id, idx)}
                                      className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                        availability.available
                                          ? 'bg-green-500 text-white'
                                          : 'bg-red-500 text-white'
                                      }`}
                                    >
                                      {availability.available ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <X className="w-4 h-4" />
                                      )}
                                    </button>
                                    
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-800">{med.name}</span>
                                        <span className={`text-sm px-2 py-0.5 rounded ${
                                          !availability.available 
                                            ? 'bg-red-100 text-red-700' 
                                            : isPartial
                                              ? 'bg-yellow-100 text-yellow-700'
                                              : 'bg-green-100 text-green-700'
                                        }`}>
                                          {!availability.available 
                                            ? 'Not Available' 
                                            : isPartial 
                                              ? 'Partial'
                                              : 'In Stock'}
                                        </span>
                                      </div>
                                      
                                      {med.dosage && (
                                        <p className="text-sm text-gray-500">{med.dosage}</p>
                                      )}
                                      
                                      <div className="flex items-center gap-4 mt-2">
                                        <span className="text-sm text-gray-600">
                                          Requested: <strong>{requestedQty}</strong>
                                        </span>
                                        
                                        {availability.available && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600">Available:</span>
                                            <div className="flex items-center gap-1">
                                              <button
                                                onClick={() => updateMedQty(order.id, idx, availability.availableQty - 1)}
                                                className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                              >
                                                <Minus className="w-3 h-3" />
                                              </button>
                                              <span className={`w-8 text-center font-medium ${
                                                isPartial ? 'text-yellow-700' : 'text-green-700'
                                              }`}>
                                                {availability.availableQty}
                                              </span>
                                              <button
                                                onClick={() => updateMedQty(order.id, idx, availability.availableQty + 1)}
                                                className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                              >
                                                <Plus className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Note field for partial/unavailable */}
                                      {(!availability.available || isPartial) && (
                                        <input
                                          type="text"
                                          placeholder={!availability.available ? "Reason not available..." : "Note (e.g., only 1 strip available)"}
                                          value={availability.note}
                                          onChange={(e) => updateMedNote(order.id, idx, e.target.value)}
                                          className="mt-2 w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            
                            {/* Summary */}
                            <div className="p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                              <strong>Summary:</strong>{' '}
                              {order.selected_medications.filter((_, idx) => 
                                medAvailability[order.id]?.[idx]?.available !== false
                              ).length} of {order.selected_medications.length} medications available
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-gray-500 text-sm">No medications listed</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Patient Notes */}
                      {order.patient_notes && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Patient Notes
                          </h4>
                          <p className="text-gray-600 bg-yellow-50 rounded-lg p-3 text-sm">
                            {order.patient_notes}
                          </p>
                        </div>
                      )}
                      
                      {/* Quote Info (if already quoted) */}
                      {order.quoted_amount && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">Quoted Amount</span>
                            <span className="text-xl font-bold text-blue-600">
                              ${parseFloat(order.quoted_amount).toFixed(2)}
                            </span>
                          </div>
                          {order.quote_details && (
                            <p className="text-sm text-gray-600 mt-2">{order.quote_details}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Actions based on status */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        {/* Provide Quote Form */}
                        {order.status === 'sent_to_pharmacy' && (
                          <div className="w-full space-y-3">
                            {quoteForm.orderId === order.id ? (
                              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quote Amount ($)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={quoteForm.amount}
                                    onChange={(e) => setQuoteForm(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Details (optional)
                                  </label>
                                  <textarea
                                    value={quoteForm.details}
                                    onChange={(e) => setQuoteForm(prev => ({ ...prev, details: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={2}
                                    placeholder="Insurance applied, generic substitution, etc."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => submitQuote(order.id)}
                                    disabled={submitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    {submitting ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Send className="w-4 h-4" />
                                    )}
                                    Send Quote
                                  </button>
                                  <button
                                    onClick={() => setQuoteForm({ orderId: null, amount: '', details: '' })}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setQuoteForm({ orderId: order.id, amount: '', details: '' })}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                  <DollarSign className="w-4 h-4" />
                                  Provide Quote
                                </button>
                                <button
                                  onClick={() => rejectOrder(order.id)}
                                  disabled={submitting}
                                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Status progression buttons */}
                        {['patient_accepted', 'preparing', 'ready_for_pickup'].includes(order.status) && (
                          <button
                            onClick={() => updateStatus(order.id, statusConfig[order.status].next)}
                            disabled={submitting}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {submitting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            {statusActions[statusConfig[order.status].next]}
                          </button>
                        )}
                        
                        {/* View prescription link */}
                        {order.prescription_id && (
                          <Link
                            to={`/pharmacy/prescriptions/${order.prescription_id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                          >
                            <FileText className="w-4 h-4" />
                            View Prescription
                          </Link>
                        )}
                      </div>
                    </div>
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