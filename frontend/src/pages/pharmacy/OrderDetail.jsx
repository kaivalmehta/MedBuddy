// frontend/src/pages/pharmacy/OrderDetail.jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '../../services/pharmacy'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Package, User, Phone, MapPin, Calendar, Clock,
  CheckCircle2, AlertTriangle, Shield, Pill, Send, Loader2,
  MessageSquare, Truck, ShoppingBag
} from 'lucide-react'

const STATUS_FLOW = ['received', 'verified', 'preparing', 'ready', 'completed']

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  const [chatMessage, setChatMessage] = useState('')

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.get(id).then(r => r.data)
  })

  const { data: chatData } = useQuery({
    queryKey: ['orderChat', id],
    queryFn: () => orderService.getChat(id).then(r => r.data),
    refetchInterval: 5000
  })

  const updateStatusMutation = useMutation({
    mutationFn: (data) => orderService.updateStatus(id, data),
    onSuccess: () => queryClient.invalidateQueries(['order', id])
  })

  const verifyMutation = useMutation({
    mutationFn: (data) => orderService.verify(id, data),
    onSuccess: () => queryClient.invalidateQueries(['order', id])
  })

  const sendMessageMutation = useMutation({
    mutationFn: (message) => orderService.sendMessage(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries(['orderChat', id])
      setChatMessage('')
    }
  })

  if (isLoading) return <OrderDetailSkeleton />

  const rx = order?.prescription
  const currentStatusIndex = STATUS_FLOW.indexOf(order?.status)
  const nextStatus = STATUS_FLOW[currentStatusIndex + 1]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/pharmacy/orders')}
        className="flex items-center gap-2 text-secondary-600 hover:text-secondary-800"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Orders
      </button>

      {/* Order Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">
              Order #{order?.id?.slice(0, 8)}
            </h1>
            <p className="text-secondary-500">
              Created {formatDateTime(order?.created_at)}
            </p>
          </div>
          <span className={`badge ${getStatusBadge(order?.status)}`}>
            {order?.status_display}
          </span>
        </div>

        {/* Status Progress */}
        <div className="flex items-center justify-between mb-6">
          {STATUS_FLOW.slice(0, -1).map((status, idx) => (
            <div key={status} className="flex items-center flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${idx <= currentStatusIndex ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}
              `}>
                {idx < currentStatusIndex ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
              </div>
              {idx < STATUS_FLOW.length - 2 && (
                <div className={`flex-1 h-1 mx-2 rounded ${
                  idx < currentStatusIndex ? 'bg-primary-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Patient Info */}
        <div className="grid md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl">
          <div>
            <h3 className="font-semibold text-secondary-800 mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Patient Information
            </h3>
            <p className="text-secondary-700">{order?.patient_name}</p>
            <p className="text-sm text-secondary-500">{order?.patient?.email}</p>
          </div>
          <div>
            <h3 className="font-semibold text-secondary-800 mb-3 flex items-center gap-2">
              {order?.fulfillment_type === 'delivery' ? (
                <Truck className="w-5 h-5 text-primary-500" />
              ) : (
                <ShoppingBag className="w-5 h-5 text-primary-500" />
              )}
              Fulfillment
            </h3>
            <p className="text-secondary-700 capitalize">{order?.fulfillment_type}</p>
            {order?.estimated_ready_time && (
              <p className="text-sm text-secondary-500">
                Est. ready: {formatDateTime(order.estimated_ready_time)}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Prescription Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-semibold text-secondary-800">
            Prescription Details
          </h2>
          {rx?.safety_score && (
            <div className={`flex items-center gap-2 ${getSafetyColor(rx.safety_score)}`}>
              <Shield className="w-5 h-5" />
              <span className="font-medium">Safety: {rx.safety_score}/10</span>
            </div>
          )}
        </div>

        {/* Original Image */}
        {rx?.image_url && (
          <div className="mb-6">
            <p className="text-sm font-medium text-secondary-700 mb-2">Original Prescription</p>
            <img
              src={rx.image_url}
              alt="Prescription"
              className="max-h-64 rounded-xl border border-gray-200"
            />
          </div>
        )}

        {/* Medications */}
        <div className="space-y-3">
          {rx?.drugs?.map((drug) => (
            <div
              key={drug.id}
              className={`p-4 rounded-xl border ${
                drug.has_interactions ? 'border-warning-200 bg-warning-50/50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Pill className={`w-5 h-5 ${drug.has_interactions ? 'text-warning-500' : 'text-primary-500'}`} />
                <div className="flex-1">
                  <p className="font-medium text-secondary-800">{drug.drug_name}</p>
                  <p className="text-sm text-secondary-500">
                    {drug.dosage} • {drug.frequency} • {drug.duration}
                  </p>
                </div>
                {drug.has_interactions && (
                  <AlertTriangle className="w-5 h-5 text-warning-500" />
                )}
              </div>
              {drug.instructions && (
                <p className="text-sm text-secondary-600 mt-2 pl-8">{drug.instructions}</p>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="text-lg font-display font-semibold text-secondary-800 mb-4">Actions</h2>
        
        {order?.status === 'received' && (
          <div className="space-y-4">
            <p className="text-secondary-600">Verify this prescription matches the original image and is valid.</p>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Verification Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input-field"
                rows={2}
                placeholder="Add any notes about verification..."
              />
            </div>
            <button
              onClick={() => verifyMutation.mutate({ notes })}
              disabled={verifyMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {verifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Verify Prescription
            </button>
          </div>
        )}

        {nextStatus && order?.status !== 'received' && (
          <button
            onClick={() => updateStatusMutation.mutate({ status: nextStatus })}
            disabled={updateStatusMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {updateStatusMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Mark as {nextStatus.replace('_', ' ')}
          </button>
        )}
      </motion.div>

      {/* Chat */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h2 className="text-lg font-display font-semibold text-secondary-800 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-500" />
          Patient Communication
        </h2>
        
        <div className="max-h-64 overflow-y-auto space-y-3 mb-4">
          {chatData?.results?.length === 0 ? (
            <p className="text-secondary-400 text-center py-4">No messages yet</p>
          ) : (
            chatData?.results?.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-xl max-w-[80%] ${
                  msg.sender_role === 'pharmacy'
                    ? 'bg-primary-100 ml-auto'
                    : 'bg-gray-100'
                }`}
              >
                <p className="text-sm text-secondary-800">{msg.message}</p>
                <p className="text-xs text-secondary-400 mt-1">{msg.sender_name}</p>
              </div>
            ))
          )}
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={e => setChatMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && chatMessage && sendMessageMutation.mutate(chatMessage)}
            className="input-field flex-1"
            placeholder="Type a message..."
          />
          <button
            onClick={() => chatMessage && sendMessageMutation.mutate(chatMessage)}
            disabled={!chatMessage || sendMessageMutation.isPending}
            className="btn-primary"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32" />
      <div className="h-48 bg-gray-200 rounded-2xl" />
      <div className="h-64 bg-gray-200 rounded-2xl" />
    </div>
  )
}

function getStatusBadge(status) {
  const badges = {
    received: 'badge-primary', verified: 'badge-success',
    preparing: 'badge-warning', ready: 'bg-accent-100 text-accent-700',
    completed: 'badge-success', cancelled: 'badge-danger'
  }
  return badges[status] || 'badge-secondary'
}

function getSafetyColor(score) {
  if (score >= 7) return 'text-success-500'
  if (score >= 4) return 'text-warning-500'
  return 'text-danger-500'
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}