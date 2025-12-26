// frontend/src/pages/pharmacy/OrderQueue.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { orderService } from '../../services/pharmacy'
import { motion } from 'framer-motion'
import {
  Package, Clock, CheckCircle2, AlertTriangle, User, Calendar,
  ArrowRight, Filter, Search, Truck, ShoppingBag, ChevronDown
} from 'lucide-react'

const STATUS_TABS = [
  { key: 'all', label: 'All Orders', icon: Package },
  { key: 'received', label: 'New', icon: Package },
  { key: 'verified', label: 'Verified', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'ready', label: 'Ready', icon: ShoppingBag },
]

export default function OrderQueue() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeStatus = searchParams.get('status') || 'all'
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacyOrders', activeStatus],
    queryFn: () => orderService.list(activeStatus !== 'all' ? { status: activeStatus } : {}).then(r => r.data)
  })

  const orders = data?.results || []
  const filteredOrders = orders.filter(order =>
    order.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">Order Queue</h1>
          <p className="text-secondary-500">Manage incoming prescription orders</p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field pl-12 w-full md:w-72"
            placeholder="Search orders..."
          />
        </div>
      </motion.div>

      {/* Status Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSearchParams(tab.key === 'all' ? {} : { status: tab.key })}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap
              transition-all duration-200
              ${activeStatus === tab.key 
                ? 'bg-primary-500 text-white' 
                : 'bg-white text-secondary-600 hover:bg-gray-50 border border-gray-200'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Orders List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-secondary-500">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, idx) => (
              <OrderCard key={order.id} order={order} delay={idx * 0.05} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

function OrderCard({ order, delay }) {
  const statusConfig = getStatusConfig(order.status)
  const hasSafetyConcerns = order.prescription?.safety_score < 7

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link
        to={`/pharmacy/orders/${order.id}`}
        className={`
          block p-4 rounded-xl border-2 transition-all duration-200
          hover:shadow-card hover:border-primary-200
          ${hasSafetyConcerns ? 'border-warning-200 bg-warning-50/30' : 'border-gray-100'}
        `}
      >
        <div className="flex items-center gap-4">
          {/* Status Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.bg}`}>
            <statusConfig.icon className={`w-6 h-6 ${statusConfig.iconColor}`} />
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-secondary-800">{order.patient_name}</h3>
              {hasSafetyConcerns && (
                <AlertTriangle className="w-4 h-4 text-warning-500" />
              )}
            </div>
            <p className="text-sm text-secondary-500">
              Order #{order.id.slice(0, 8)} • {order.prescription?.drugs?.length || 0} medications
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-secondary-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatTime(order.created_at)}
              </span>
              <span className="flex items-center gap-1">
                {order.fulfillment_type === 'delivery' ? (
                  <Truck className="w-3 h-3" />
                ) : (
                  <ShoppingBag className="w-3 h-3" />
                )}
                {order.fulfillment_type}
              </span>
            </div>
          </div>

          {/* Status Badge & Arrow */}
          <div className="flex items-center gap-3">
            <span className={`badge ${statusConfig.badge}`}>
              {order.status_display || order.status}
            </span>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function getStatusConfig(status) {
  const configs = {
    received: { icon: Package, bg: 'bg-primary-100', iconColor: 'text-primary-500', badge: 'badge-primary' },
    verified: { icon: CheckCircle2, bg: 'bg-success-100', iconColor: 'text-success-500', badge: 'badge-success' },
    preparing: { icon: Clock, bg: 'bg-warning-100', iconColor: 'text-warning-500', badge: 'badge-warning' },
    ready: { icon: ShoppingBag, bg: 'bg-accent-100', iconColor: 'text-accent-600', badge: 'bg-accent-100 text-accent-700' },
    out_for_delivery: { icon: Truck, bg: 'bg-primary-100', iconColor: 'text-primary-500', badge: 'badge-primary' },
    completed: { icon: CheckCircle2, bg: 'bg-success-100', iconColor: 'text-success-500', badge: 'badge-success' },
    cancelled: { icon: AlertTriangle, bg: 'bg-danger-100', iconColor: 'text-danger-500', badge: 'badge-danger' },
  }
  return configs[status] || configs.received
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}


