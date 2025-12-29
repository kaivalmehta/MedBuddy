import { useState, useEffect } from 'react'
import { testOrderService } from '../../services/professional'
import { 
  Home, Calendar, Clock, User, Phone, MapPin, Loader2,
  CheckCircle, AlertCircle, Truck, Package, Filter
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LabHomeCollections() {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [editingCollection, setEditingCollection] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    loadCollections()
  }, [statusFilter, dateFilter])

  const loadCollections = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (dateFilter) params.date = dateFilter
      
      const res = await testOrderService.getCollections(params)
      setCollections(res.data || [])
    } catch (err) {
      setError('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCollection = async (collectionId, data) => {
    setActionLoading(collectionId)
    try {
      await testOrderService.updateCollection(collectionId, data)
      setEditingCollection(null)
      loadCollections()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update collection')
    } finally {
      setActionLoading(null)
    }
  }

  const statusColors = {
    requested: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    collector_assigned: 'bg-purple-100 text-purple-700',
    in_transit: 'bg-indigo-100 text-indigo-700',
    collected: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const statusIcons = {
    requested: Clock,
    confirmed: CheckCircle,
    collector_assigned: User,
    in_transit: Truck,
    collected: Package,
    cancelled: AlertCircle,
  }

  const timeSlotLabels = {
    morning: '8 AM - 12 PM',
    afternoon: '12 PM - 4 PM',
    evening: '4 PM - 8 PM',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Home Collections</h1>
        <p className="text-gray-600 mt-1">Manage home sample collection requests</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Status</option>
            <option value="requested">Requested</option>
            <option value="confirmed">Confirmed</option>
            <option value="collector_assigned">Collector Assigned</option>
            <option value="in_transit">In Transit</option>
            <option value="collected">Collected</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
          {(statusFilter || dateFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setDateFilter(''); }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Collections */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : collections.length === 0 ? (
        <div className="card text-center py-12">
          <Home className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No home collections found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => {
            const StatusIcon = statusIcons[collection.status] || Clock
            
            return (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusColors[collection.status]}`}>
                    <StatusIcon className="w-3 h-3" />
                    {collection.status_display}
                  </span>
                  <span className="text-sm text-gray-500">#{collection.order_number}</span>
                </div>

                {/* Patient Info */}
                <div className="mb-4">
                  <p className="font-semibold text-gray-800">{collection.patient_name}</p>
                  <p className="text-sm text-gray-500">{collection.patient_email}</p>
                </div>

                {/* Address */}
                <div className="p-3 bg-gray-50 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p>{collection.address_line1}</p>
                      {collection.address_line2 && <p>{collection.address_line2}</p>}
                      <p>{collection.city}, {collection.state} {collection.zip_code}</p>
                      {collection.landmark && (
                        <p className="text-gray-500 text-xs mt-1">Near: {collection.landmark}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      {collection.confirmed_date || collection.preferred_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      {collection.confirmed_time || timeSlotLabels[collection.preferred_time_slot]}
                    </span>
                  </div>
                </div>

                {/* Contact */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Phone className="w-4 h-4" />
                  <span>{collection.contact_phone}</span>
                </div>

                {/* Collector Info */}
                {collection.collector_name && (
                  <div className="p-3 bg-green-50 rounded-lg mb-4">
                    <p className="text-xs text-green-600 font-medium mb-1">Collector Assigned</p>
                    <p className="text-sm font-medium text-gray-800">{collection.collector_name}</p>
                    <p className="text-sm text-gray-600">{collection.collector_phone}</p>
                  </div>
                )}

                {/* Tests */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Tests:</p>
                  <div className="flex flex-wrap gap-1">
                    {collection.tests?.map((test, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        {test}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-200">
                  {collection.status === 'confirmed' && (
                    <button
                      onClick={() => setEditingCollection(collection)}
                      className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Assign Collector
                    </button>
                  )}
                  {collection.status === 'collector_assigned' && (
                    <button
                      onClick={() => handleUpdateCollection(collection.id, { status: 'in_transit' })}
                      disabled={actionLoading === collection.id}
                      className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm flex items-center justify-center gap-2"
                    >
                      {actionLoading === collection.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Truck className="w-4 h-4" />
                      )}
                      Mark In Transit
                    </button>
                  )}
                  {collection.status === 'in_transit' && (
                    <button
                      onClick={() => handleUpdateCollection(collection.id, { status: 'collected' })}
                      disabled={actionLoading === collection.id}
                      className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center justify-center gap-2"
                    >
                      {actionLoading === collection.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Mark Collected
                    </button>
                  )}
                  {collection.status === 'collected' && (
                    <div className="text-center py-2 text-green-600 text-sm flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Sample Collected
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Assign Collector Modal */}
      <AnimatePresence>
        {editingCollection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingCollection(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">Assign Collector</h3>
              <p className="text-sm text-gray-600 mb-4">
                Order #{editingCollection.order_number} - {editingCollection.patient_name}
              </p>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  handleUpdateCollection(editingCollection.id, {
                    collector_name: formData.get('collector_name'),
                    collector_phone: formData.get('collector_phone'),
                    confirmed_date: formData.get('confirmed_date') || editingCollection.preferred_date,
                    confirmed_time: formData.get('confirmed_time'),
                    status: 'collector_assigned'
                  })
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Collector Name *</label>
                  <input
                    name="collector_name"
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Collector Phone *</label>
                  <input
                    name="collector_phone"
                    type="tel"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      name="confirmed_date"
                      type="date"
                      defaultValue={editingCollection.preferred_date}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      name="confirmed_time"
                      type="time"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingCollection(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === editingCollection.id}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                  >
                    {actionLoading === editingCollection.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    Assign
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
