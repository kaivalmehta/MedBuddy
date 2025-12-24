// ============================================
// frontend/src/pages/pharmacy/PharmacySentHistory.jsx
// ============================================

import { useState, useEffect } from 'react'
import { pharmacyExtendedService } from '../../services/professional'
import { Send, FileText, Mail, CheckCircle, Search, User, AlertTriangle } from 'lucide-react'

export default function PharmacySentHistory() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await pharmacyExtendedService.getSentPrescriptions()
      setPrescriptions(res.data.prescriptions || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = prescriptions.filter(p => 
    p.patient_email?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.doctor_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Send className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">Sent Prescriptions</h1>
            <p className="text-secondary-500">History of prescriptions sent to patients</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-secondary-800">{prescriptions.length}</p>
          <p className="text-sm text-secondary-500">Total Sent</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient email or name..."
          className="input-field pl-12"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-secondary-500">
            {search ? 'No prescriptions match your search' : 'No prescriptions sent yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="card-hover">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-secondary-800">{p.patient_name || p.patient_email}</p>
                    {p.is_duplicate && (
                      <span className="badge badge-warning flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Duplicate
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-secondary-500">
                    {p.doctor_name && `Dr. ${p.doctor_name} • `}
                    {p.drugs_count || 0} medications
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-secondary-600">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {p.email_sent && (
                      <span className="badge badge-success flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Sent
                      </span>
                    )}
                    <span className={`badge ${p.status === 'analyzed' ? 'badge-primary' : 'badge-warning'}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}