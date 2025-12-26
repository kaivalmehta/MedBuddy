// frontend/src/pages/pharmacy/PharmacySentHistory.jsx
// Prescription History with Safety Report functionality

import { useState, useEffect } from 'react'
import { 
  History, FileText, Search, ChevronDown, ChevronUp, Pill, 
  AlertTriangle, Shield, CheckCircle, XCircle, Loader2,
  Clock, AlertCircle, Microscope, Mail, RefreshCw, X,
  Activity, Heart, Zap, Info
} from 'lucide-react'
import { pharmacyService } from '../../services/pharmacy'

export default function PharmacySentHistory() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [analyzingId, setAnalyzingId] = useState(null)
  const [safetyReport, setSafetyReport] = useState(null) // For modal

  useEffect(() => {
    loadHistory()
  }, [search, statusFilter])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const res = await pharmacyService.getPrescriptionHistory({ search, status: statusFilter })
      setPrescriptions(res.data.prescriptions || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async (id) => {
    setAnalyzingId(id)
    try {
      await pharmacyService.analyzePrescription(id)
      loadHistory()
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalyzingId(null)
    }
  }

  const openSafetyReport = (prescription) => {
    setSafetyReport(prescription)
  }

  const getSafetyColor = (percentage) => {
    if (percentage === null || percentage === undefined) return 'text-gray-500'
    if (percentage >= 80) return 'text-emerald-600'
    if (percentage >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getSafetyBg = (percentage) => {
    if (percentage === null || percentage === undefined) return 'bg-gray-100'
    if (percentage >= 80) return 'bg-emerald-100'
    if (percentage >= 60) return 'bg-amber-100'
    return 'bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <History className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">Sent Prescriptions</h1>
            <p className="text-secondary-500">History with safety analysis</p>
          </div>
        </div>
        <button onClick={loadHistory} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient email or doctor name..."
              className="input-field pl-12"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field md:w-48"
          >
            <option value="">All Status</option>
            <option value="uploaded">Uploaded</option>
            <option value="analyzed">Analyzed</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-secondary-500">No prescriptions sent yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-secondary-800 truncate">{p.patient_email}</p>
                  <p className="text-sm text-secondary-500">
                    {p.patient_name && `${p.patient_name} • `}
                    {p.drugs_count || 0} medications • {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Safety Badge */}
                  {p.overall_safety_percentage !== null && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSafetyBg(p.overall_safety_percentage)} ${getSafetyColor(p.overall_safety_percentage)}`}>
                      {p.overall_safety_percentage}% Safe
                    </div>
                  )}
                  
                  {/* Critical Warnings */}
                  {p.critical_warnings > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {p.critical_warnings}
                    </span>
                  )}
                  
                  {/* Email Status */}
                  {p.email_sent && (
                    <span className="badge badge-success flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Sent
                    </span>
                  )}
                  
                  {/* Status Badge */}
                  <span className={`badge ${p.status === 'analyzed' ? 'badge-success' : 'badge-warning'}`}>
                    {p.status}
                  </span>
                  
                  {/* Action Buttons */}
                  {p.status !== 'analyzed' ? (
                    <button
                      onClick={() => handleAnalyze(p.id)}
                      disabled={analyzingId === p.id}
                      className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"
                    >
                      {analyzingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Microscope className="w-4 h-4" />
                      )}
                      Analyze
                    </button>
                  ) : (
                    <button
                      onClick={() => openSafetyReport(p)}
                      className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Shield className="w-4 h-4" />
                      Safety Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Safety Report Modal */}
      {safetyReport && (
        <SafetyReportModal 
          prescription={safetyReport} 
          onClose={() => setSafetyReport(null)} 
        />
      )}
    </div>
  )
}

// Safety Report Modal Component
function SafetyReportModal({ prescription, onClose }) {
  const p = prescription

  const getSafetyColor = (percentage) => {
    if (percentage === null || percentage === undefined) return 'text-gray-500'
    if (percentage >= 80) return 'text-emerald-600'
    if (percentage >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getSafetyBg = (percentage) => {
    if (percentage === null || percentage === undefined) return 'bg-gray-100'
    if (percentage >= 80) return 'bg-emerald-50 border-emerald-200'
    if (percentage >= 60) return 'bg-amber-50 border-amber-200'
    return 'bg-red-50 border-red-200'
  }

  const getSeverityColor = (severity) => {
    const colors = {
      'info': 'bg-blue-100 text-blue-700 border-blue-200',
      'minor': 'bg-green-100 text-green-700 border-green-200',
      'moderate': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'severe': 'bg-orange-100 text-orange-700 border-orange-200',
      'critical': 'bg-red-100 text-red-700 border-red-200'
    }
    return colors[severity] || 'bg-gray-100 text-gray-700'
  }

  const getComplianceColor = (rate) => {
    if (rate >= 80) return 'bg-emerald-500'
    if (rate >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold">Safety Analysis Report</h2>
              <p className="text-emerald-100 text-sm">{p.patient_email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overall Safety Score */}
          <div className={`p-6 rounded-2xl border-2 ${getSafetyBg(p.overall_safety_percentage)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-secondary-800">Overall Safety Score</h3>
                <p className="text-secondary-500 text-sm mt-1">
                  Based on drug interactions, allergies, and medical conditions
                </p>
              </div>
              <div className="text-center">
                <div className={`text-5xl font-bold ${getSafetyColor(p.overall_safety_percentage)}`}>
                  {p.overall_safety_percentage ?? 'N/A'}%
                </div>
                <p className="text-sm text-secondary-500 mt-1">
                  {p.overall_safety_percentage >= 80 ? 'Safe' : 
                   p.overall_safety_percentage >= 60 ? 'Caution' : 'High Risk'}
                </p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary-800">{p.medications?.length || 0}</p>
                <p className="text-xs text-secondary-500">Medications</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{p.total_interactions || 0}</p>
                <p className="text-xs text-secondary-500">Interactions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{p.critical_warnings || 0}</p>
                <p className="text-xs text-secondary-500">Critical Warnings</p>
              </div>
            </div>
          </div>

          {/* Patient Health Context */}
          {(p.patient_allergies?.length > 0 || p.patient_conditions?.length > 0) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Patient Health Profile
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {p.patient_allergies?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-amber-700 mb-2">Known Allergies:</p>
                    <div className="flex flex-wrap gap-2">
                      {p.patient_allergies.map((a, i) => (
                        <span key={i} className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {p.patient_conditions?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-amber-700 mb-2">Medical Conditions:</p>
                    <div className="flex flex-wrap gap-2">
                      {p.patient_conditions.map((c, i) => (
                        <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medications Analysis */}
          <div>
            <h3 className="text-lg font-semibold text-secondary-800 mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary-500" /> Medication Analysis
            </h3>
            
            <div className="space-y-4">
              {p.medications?.map((med, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Med Header */}
                  <div className="p-4 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        med.is_safe_to_take === false ? 'bg-red-100' : 
                        med.requires_monitoring ? 'bg-amber-100' : 'bg-emerald-100'
                      }`}>
                        {med.is_safe_to_take === false ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : med.requires_monitoring ? (
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-secondary-800">{med.drug_name}</h4>
                        {med.generic_name && med.generic_name !== med.drug_name && (
                          <p className="text-sm text-secondary-500">{med.generic_name}</p>
                        )}
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold ${getSafetyBg(med.safety_percentage)} ${getSafetyColor(med.safety_percentage)}`}>
                      {med.safety_percentage ?? 'N/A'}%
                    </div>
                  </div>

                  {/* Med Details */}
                  <div className="p-4 space-y-4">
                    {/* Dosage Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-secondary-500">Dosage</p>
                        <p className="font-medium text-secondary-800">{med.dosage || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-secondary-500">Frequency</p>
                        <p className="font-medium text-secondary-800">{med.frequency || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-secondary-500">Duration</p>
                        <p className="font-medium text-secondary-800">{med.duration || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-secondary-500">Quantity</p>
                        <p className="font-medium text-secondary-800">{med.quantity || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Instructions */}
                    {med.instructions && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <span className="font-medium">📝 Instructions:</span> {med.instructions}
                        </p>
                      </div>
                    )}

                    {/* Primary Use */}
                    {med.primary_use && (
                      <p className="text-sm text-secondary-600">
                        <span className="font-medium">Used for:</span> {med.primary_use}
                      </p>
                    )}

                    {/* Special Instructions */}
                    {med.special_instructions && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-700">
                          <span className="font-medium">⚠️ Special Instructions:</span> {med.special_instructions}
                        </p>
                      </div>
                    )}

                    {/* Side Effects */}
                    {med.common_side_effects?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-secondary-700 mb-2 flex items-center gap-1">
                          <Activity className="w-4 h-4" /> Common Side Effects
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {med.common_side_effects.slice(0, 8).map((effect, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 text-secondary-600 text-xs rounded-full">
                              {effect}
                            </span>
                          ))}
                          {med.common_side_effects.length > 8 && (
                            <span className="text-xs text-secondary-400">+{med.common_side_effects.length - 8} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Interactions */}
                    {med.interactions?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-secondary-700 mb-2 flex items-center gap-1">
                          <Zap className="w-4 h-4" /> Drug Interactions ({med.interactions.length})
                        </p>
                        <div className="space-y-2">
                          {med.interactions.map((inter, i) => (
                            <div key={i} className={`p-3 rounded-lg border ${getSeverityColor(inter.severity)}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{inter.interacting_item}</span>
                                <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-white/50">
                                  {inter.severity}
                                </span>
                              </div>
                              {inter.title && <p className="text-sm">{inter.title}</p>}
                              {inter.description && (
                                <p className="text-sm mt-1 opacity-80">{inter.description}</p>
                              )}
                              {inter.recommendation && (
                                <p className="text-sm mt-2 font-medium">
                                  💡 {inter.recommendation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prescription Info */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-secondary-700 mb-3">Prescription Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {p.doctor_name && (
                <div>
                  <p className="text-secondary-500">Doctor</p>
                  <p className="font-medium text-secondary-800">{p.doctor_name}</p>
                </div>
              )}
              {p.clinic_name && (
                <div>
                  <p className="text-secondary-500">Clinic</p>
                  <p className="font-medium text-secondary-800">{p.clinic_name}</p>
                </div>
              )}
              {p.prescription_date && (
                <div>
                  <p className="text-secondary-500">Date</p>
                  <p className="font-medium text-secondary-800">
                    {new Date(p.prescription_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-secondary-500">Uploaded</p>
                <p className="font-medium text-secondary-800">
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="btn-primary w-full">
            Close Report
          </button>
        </div>
      </div>
    </div>
  )
}
