// ============================================
// frontend/src/pages/laboratory/LabSentHistory.jsx
// ============================================

import { useState, useEffect } from 'react'
import { Send, TestTube, Mail, Search } from 'lucide-react'
import api from '../../services/api'

export default function LabSentHistory() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      // Would need dedicated endpoint
      setReports([])
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <Send className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">Sent Reports</h1>
          <p className="text-secondary-500">History of reports you've sent to patients</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by patient email..." className="input-field pl-12" />
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div></div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-12">
          <TestTube className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-secondary-500">No reports sent yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card-hover flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TestTube className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-secondary-800">{r.patient_email}</p>
                <p className="text-sm text-secondary-500">{r.report_title} • {r.report_type}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.email_sent && <span className="badge badge-success flex items-center gap-1"><Mail className="w-3 h-3" /> Sent</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
