// frontend/src/pages/patient/MyOrders.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Package, Clock, CheckCircle2, Truck, MapPin, Phone,
  MessageCircle, ChevronRight, Filter, Search, X,
  AlertCircle, Store, Calendar, FileText, ExternalLink,
  RefreshCw, XCircle
} from 'lucide-react'
import { orderService } from '../../services/pharmacy'

const STATUS_CONFIG = {
  received: {
    label: 'Order Received',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    icon: Package,
    description: 'Your prescription has been received by the pharmacy'
  },
  verified: {
    label: 'Verified',
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    icon: CheckCircle2,
    description: 'Prescription verified by pharmacist'
  },
  preparing: {
    label: 'Preparing',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    icon: RefreshCw,
    description: 'Your medications are being prepared'
  },
  ready: {
    label: 'Ready for Pickup',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    icon: Store,
    description: 'Your order is ready! Visit the pharmacy to pick it up'
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    icon: Truck,
    description: 'Your order is on its way'
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    icon: CheckCircle2,
    description: 'Order completed successfully'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    icon: XCircle,
    description: 'This order has been cancelled'
  }
}

const STATUS_STEPS = ['received', 'verified', 'preparing', 'ready', 'completed']

export default function MyOrders() {
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['myOrders', filterStatus],
    queryFn: () => orderService.list(filterStatus !== 'all' ? { status: filterStatus } : {}),
  })

  const orders = ordersData?.data?.results || ordersData?.data || []

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.pharmacy_name?.toLowerCase().includes(query) ||
      order.id?.toLowerCase().includes(query)
    )
  })

  const activeOrders = filteredOrders.filter(o => 
    !['completed', 'cancelled'].includes(o.status)
  )
  const pastOrders = filteredOrders.filter(o => 
    ['completed', 'cancelled'].includes(o.status)
  )

  const getStatusStep = (status) => {
    const idx = STATUS_STEPS.indexOf(status)
    return idx === -1 ? 0 : idx
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary-500">Loading your orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">My Orders</h1>
          <p className="text-secondary-500 mt-1">Track your prescription orders</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="btn-secondary flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="text"
              placeholder="Search by pharmacy or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-secondary-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field w-auto"
            >
              <option value="all">All Orders</option>
              <option value="received">Received</option>
              <option value="verified">Verified</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready for Pickup</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            Active Orders ({activeOrders.length})
          </h2>
          <div className="space-y-4">
            {activeOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onSelect={() => setSelectedOrder(order)}
                isActive 
              />
            ))}
          </div>
        </section>
      )}

      {/* Past Orders */}
      {pastOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-secondary-400" />
            Past Orders ({pastOrders.length})
          </h2>
          <div className="space-y-4">
            {pastOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order}
                onSelect={() => setSelectedOrder(order)} 
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="card text-center py-16">
          <Package className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-secondary-700 mb-2">No orders found</h3>
          <p className="text-secondary-500 mb-6">
            {searchQuery 
              ? "No orders match your search criteria"
              : "You haven't placed any orders yet"
            }
          </p>
          <Link to="/prescriptions" className="btn-primary inline-flex items-center gap-2">
            <FileText className="w-4 h-4" />
            View Prescriptions
          </Link>
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function OrderCard({ order, onSelect, isActive }) {
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.received
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-hover cursor-pointer ${isActive ? 'border-l-4 border-l-primary-500' : ''}`}
      onClick={onSelect}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Order Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${status.bgColor} flex items-center justify-center flex-shrink-0`}>
              <StatusIcon className={`w-5 h-5 ${status.textColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-secondary-800">{order.pharmacy_name}</h3>
                <span className={`badge ${status.bgColor} ${status.textColor}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-secondary-500 mt-1">
                Order #{order.id?.slice(0, 8).toUpperCase()}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-secondary-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress & Actions */}
        <div className="flex items-center gap-4">
          {isActive && order.status !== 'cancelled' && (
            <div className="hidden md:flex items-center gap-1">
              {STATUS_STEPS.slice(0, 4).map((step, idx) => {
                const currentStep = STATUS_STEPS.indexOf(order.status)
                const isCompleted = idx <= currentStep
                const isCurrent = idx === currentStep
                return (
                  <div key={step} className="flex items-center">
                    <div className={`w-3 h-3 rounded-full transition-colors ${
                      isCompleted ? 'bg-primary-500' : 'bg-gray-200'
                    } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`} />
                    {idx < 3 && (
                      <div className={`w-8 h-0.5 ${isCompleted ? 'bg-primary-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {order.total_price > 0 && (
            <div className="text-right">
              <p className="text-lg font-semibold text-secondary-800">
                ${parseFloat(order.total_price).toFixed(2)}
              </p>
              <p className="text-xs text-secondary-500">Total</p>
            </div>
          )}

          <ChevronRight className="w-5 h-5 text-secondary-400" />
        </div>
      </div>

      {/* Estimated Time */}
      {isActive && order.estimated_ready_time && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary-500" />
          <span className="text-secondary-600">
            Estimated ready: {format(new Date(order.estimated_ready_time), 'h:mm a, MMM d')}
          </span>
        </div>
      )}

      {/* Pharmacist Notes */}
      {order.pharmacist_notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-start gap-2 text-sm bg-blue-50 text-blue-700 p-3 rounded-lg">
            <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{order.pharmacist_notes}</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function OrderDetailModal({ order, onClose }) {
  const [message, setMessage] = useState('')
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.received
  const StatusIcon = status.icon

  const { data: chatData } = useQuery({
    queryKey: ['orderChat', order.id],
    queryFn: () => orderService.getChat(order.id),
    enabled: !!order.id
  })

  const messages = chatData?.data || []

  const handleSendMessage = async () => {
    if (!message.trim()) return
    try {
      await orderService.sendMessage(order.id, message)
      setMessage('')
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-secondary-800">Order Details</h2>
            <p className="text-sm text-secondary-500">#{order.id?.slice(0, 8).toUpperCase()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Status */}
          <div className={`p-4 rounded-xl ${status.bgColor}`}>
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-6 h-6 ${status.textColor}`} />
              <div>
                <h3 className={`font-semibold ${status.textColor}`}>{status.label}</h3>
                <p className="text-sm opacity-80">{status.description}</p>
              </div>
            </div>
          </div>

          {/* Progress Timeline */}
          {order.status !== 'cancelled' && (
            <div className="relative">
              <h4 className="font-medium text-secondary-700 mb-4">Order Progress</h4>
              <div className="space-y-4">
                {STATUS_STEPS.map((step, idx) => {
                  const stepConfig = STATUS_CONFIG[step]
                  const StepIcon = stepConfig.icon
                  const currentIdx = STATUS_STEPS.indexOf(order.status)
                  const isCompleted = idx <= currentIdx
                  const isCurrent = idx === currentIdx

                  return (
                    <div key={step} className="flex items-start gap-4">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${isCompleted ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'}
                        ${isCurrent ? 'ring-4 ring-primary-100' : ''}
                      `}>
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 pb-4 border-l-2 border-gray-100 -ml-4 pl-8">
                        <p className={`font-medium ${isCompleted ? 'text-secondary-800' : 'text-secondary-400'}`}>
                          {stepConfig.label}
                        </p>
                        {isCurrent && (
                          <p className="text-sm text-primary-600 mt-1">
                            {formatDistanceToNow(new Date(order.updated_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pharmacy Info */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-secondary-700 mb-3">Pharmacy</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-secondary-400" />
                <span className="font-medium text-secondary-800">{order.pharmacy_name}</span>
              </div>
              {order.pharmacy?.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-secondary-400 mt-0.5" />
                  <span className="text-sm text-secondary-600">{order.pharmacy.address}</span>
                </div>
              )}
              {order.pharmacy?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-secondary-400" />
                  <a href={`tel:${order.pharmacy.phone}`} className="text-sm text-primary-600 hover:underline">
                    {order.pharmacy.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Medications */}
          {order.prescription?.drugs?.length > 0 && (
            <div>
              <h4 className="font-medium text-secondary-700 mb-3">Medications</h4>
              <div className="space-y-2">
                {order.prescription.drugs.map((drug) => (
                  <div key={drug.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-secondary-800">{drug.drug_name}</p>
                      <p className="text-sm text-secondary-500">{drug.dosage} - {drug.frequency}</p>
                    </div>
                    {drug.quantity && (
                      <span className="text-sm text-secondary-600">Qty: {drug.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Summary */}
          {order.total_price > 0 && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium text-secondary-700 mb-3">Price Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-600">Subtotal</span>
                  <span className="text-secondary-800">${parseFloat(order.subtotal || 0).toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${parseFloat(order.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-primary-600">${parseFloat(order.total_price).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Chat Section */}
          <div>
            <h4 className="font-medium text-secondary-700 mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Messages
            </h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Messages List */}
              <div className="h-48 overflow-y-auto p-4 bg-gray-50 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-secondary-400 text-sm py-8">
                    No messages yet. Send a message to the pharmacy.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_role === 'patient' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-xl ${
                        msg.sender_role === 'patient'
                          ? 'bg-primary-500 text-white'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_role === 'patient' ? 'text-primary-100' : 'text-secondary-400'
                        }`}>
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-3 border-t border-gray-200 flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="btn-primary py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
          <Link
            to={`/prescriptions/${order.prescription?.id}`}
            className="btn-secondary flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            View Prescription
          </Link>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}