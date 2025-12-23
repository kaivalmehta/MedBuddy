// frontend/src/pages/patient/PrescriptionHistory.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { prescriptionService } from '../../services/prescriptions'
import { motion } from 'framer-motion'
import {
  FileText, Search, Filter, Calendar, Shield, ChevronRight,
  Download, Clock, Pill, AlertTriangle
} from 'lucide-react'

export default function PrescriptionHistory() {
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['prescriptionHistory', dateRange],
    queryFn: () => prescriptionService.getHistory({
      start_date: dateRange.start || undefined,
      end_date: dateRange.end || undefined
    }).then(r => r.data)
  })

  const prescriptions = data?.results || []
  const filtered = prescriptions.filter(rx =>
    rx.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    rx.clinic_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">Prescription History</h1>
            <p className="text-secondary-500">View and manage all your past prescriptions</p>
          </div>
          <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
            <FileText className="w-5 h-5" />
            New Prescription
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-12"
              placeholder="Search by doctor or clinic..."
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="input-field"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      </motion.div>

      {/* Prescriptions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-secondary-500">No prescriptions found</p>
            <Link to="/upload" className="text-primary-600 text-sm font-medium mt-2 inline-block">
              Upload your first prescription
            </Link>
          </div>
        ) : (
          filtered.map((rx, idx) => (
            <PrescriptionCard key={rx.id} prescription={rx} delay={idx * 0.05} />
          ))
        )}
      </motion.div>
    </div>
  )
}

function PrescriptionCard({ prescription: rx, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link
        to={`/prescriptions/${rx.id}`}
        className="card-hover flex items-center gap-4 group"
      >
        <img
          src={rx.image_url}
          alt="Prescription"
          className="w-20 h-20 object-cover rounded-xl border border-gray-100"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-secondary-800">
              {rx.doctor_name || 'Prescription'}
            </h3>
            {rx.has_safety_concerns && (
              <AlertTriangle className="w-4 h-4 text-warning-500" />
            )}
          </div>
          {rx.clinic_name && (
            <p className="text-sm text-secondary-500">{rx.clinic_name}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-secondary-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(rx.prescription_date || rx.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Pill className="w-3 h-3" />
              {rx.drug_count} medications
            </span>
            {rx.safety_score && (
              <span className={`flex items-center gap-1 ${getSafetyTextColor(rx.safety_score)}`}>
                <Shield className="w-3 h-3" />
                {rx.safety_score}/10
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${getStatusBadge(rx.status)}`}>{rx.status}</span>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
        </div>
      </Link>
    </motion.div>
  )
}

function formatDate(d) {
  if (!d) return 'Unknown'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function getSafetyTextColor(s) {
  if (s >= 7) return 'text-success-500'
  if (s >= 4) return 'text-warning-500'
  return 'text-danger-500'
}
function getStatusBadge(s) {
  const b = { uploaded: 'bg-gray-100 text-gray-700', processing: 'badge-warning', analyzed: 'badge-success', sent_to_pharmacy: 'badge-primary', completed: 'badge-success' }
  return b[s] || 'bg-gray-100 text-gray-700'
}


