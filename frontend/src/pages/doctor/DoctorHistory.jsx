// ============================================
// frontend/src/pages/doctor/DoctorHistory.jsx
// Enhanced with detailed prescription analysis
// ============================================

import { useState, useEffect } from 'react'
import { 
  History, FileText, Search, ChevronDown, ChevronUp, Pill, 
  AlertTriangle, Shield, Activity, CheckCircle, XCircle,
  TrendingUp, Clock, AlertCircle
} from 'lucide-react'
import api from '../../services/api'

export default function DoctorHistory() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await api.get('/doctor/sent-prescriptions/')
      setPrescriptions(res.data.results || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = prescriptions.filter(p => 
    p.patient_email?.toLowerCase().includes(search.toLowerCase()) ||
    p.doctor_name?.toLowerCase().includes(search.toLowerCase())
  )

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

  const getSeverityColor = (severity) => {
    const colors = {
      'info': 'bg-blue-100 text-blue-700',
      'minor': 'bg-green-100 text-green-700',
      'moderate': 'bg-yellow-100 text-yellow-700',
      'severe': 'bg-orange-100 text-orange-700',
      'critical': 'bg-red-100 text-red-700'
    }
    return colors[severity] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <History className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">Sent Prescriptions</h1>
            <p className="text-secondary-500">History with detailed safety analysis</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient email..."
          className="input-field pl-12"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-secondary-500">No prescriptions sent yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              {/* Header - Clickable */}
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="w-full flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-secondary-800">{p.patient_email}</p>
                  <p className="text-sm text-secondary-500">
                    {p.drugs_count || 0} medications • {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {p.overall_safety_percentage !== null && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSafetyBg(p.overall_safety_percentage)} ${getSafetyColor(p.overall_safety_percentage)}`}>
                      {p.overall_safety_percentage}% Safe
                    </div>
                  )}
                  {p.critical_warnings > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {p.critical_warnings}
                    </span>
                  )}
                  <span className={`badge ${p.is_digital ? 'badge-info' : 'badge-secondary'}`}>
                    {p.is_digital ? 'Digital' : 'Uploaded'}
                  </span>
                  <span className={`badge ${p.status === 'analyzed' ? 'badge-success' : 'badge-warning'}`}>
                    {p.status}
                  </span>
                  {expandedId === p.id ? (
                    <ChevronUp className="w-5 h-5 text-secondary-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-secondary-400" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedId === p.id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Patient Context */}
                  {(p.patient_allergies?.length > 0 || p.patient_conditions?.length > 0) && (
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Patient Health Context
                      </h4>
                      <div className="flex flex-wrap gap-4">
                        {p.patient_allergies?.length > 0 && (
                          <div>
                            <span className="text-xs text-amber-700 font-medium">Allergies: </span>
                            {p.patient_allergies.map((a, i) => (
                              <span key={i} className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full mr-1">{a}</span>
                            ))}
                          </div>
                        )}
                        {p.patient_conditions?.length > 0 && (
                          <div>
                            <span className="text-xs text-amber-700 font-medium">Conditions: </span>
                            {p.patient_conditions.map((c, i) => (
                              <span key={i} className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full mr-1">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Medications */}
                  <div>
                    <h4 className="text-sm font-semibold text-secondary-700 mb-3 flex items-center gap-2">
                      <Pill className="w-4 h-4" /> Medications Prescribed
                    </h4>
                    <div className="space-y-3">
                      {p.medications?.map((med, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-medium text-secondary-800">{med.drug_name}</h5>
                                {med.generic_name && med.generic_name !== med.drug_name && (
                                  <span className="text-xs text-secondary-500">({med.generic_name})</span>
                                )}
                                {!med.is_safe_to_take && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                    ⚠️ Not Safe
                                  </span>
                                )}
                                {med.requires_monitoring && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                    Needs Monitoring
                                  </span>
                                )}
                              </div>
                              
                              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div><span className="text-secondary-500">Dosage:</span> <span className="font-medium">{med.dosage || 'N/A'}</span></div>
                                <div><span className="text-secondary-500">Frequency:</span> <span className="font-medium">{med.frequency || 'N/A'}</span></div>
                                <div><span className="text-secondary-500">Duration:</span> <span className="font-medium">{med.duration || 'N/A'}</span></div>
                                {med.quantity && <div><span className="text-secondary-500">Qty:</span> <span className="font-medium">{med.quantity}</span></div>}
                              </div>
                              
                              {med.instructions && (
                                <p className="mt-2 text-sm text-secondary-600 italic">📝 {med.instructions}</p>
                              )}
                              
                              {med.primary_use && (
                                <p className="mt-1 text-sm text-secondary-600"><span className="font-medium">For:</span> {med.primary_use}</p>
                              )}

                              {med.special_instructions && (
                                <p className="mt-1 text-sm text-amber-600"><span className="font-medium">⚠️ Special:</span> {med.special_instructions}</p>
                              )}
                            </div>
                            
                            {med.safety_percentage !== null && (
                              <div className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${getSafetyBg(med.safety_percentage)} ${getSafetyColor(med.safety_percentage)}`}>
                                {med.safety_percentage}%
                              </div>
                            )}
                          </div>

                          {/* Side Effects */}
                          {med.common_side_effects?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-secondary-500 mb-1">Common Side Effects:</p>
                              <div className="flex flex-wrap gap-1">
                                {med.common_side_effects.slice(0, 5).map((effect, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">{effect}</span>
                                ))}
                                {med.common_side_effects.length > 5 && (
                                  <span className="text-xs text-secondary-400">+{med.common_side_effects.length - 5} more</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Interactions */}
                          {med.interactions?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-medium text-secondary-700 mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Drug Interactions ({med.interactions.length})
                              </p>
                              <div className="space-y-2">
                                {med.interactions.map((inter, i) => (
                                  <div key={i} className={`p-2 rounded-lg ${getSeverityColor(inter.severity)}`}>
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">{inter.interacting_item}</span>
                                      <span className="text-xs uppercase">{inter.severity}</span>
                                    </div>
                                    {inter.title && <p className="text-sm mt-1">{inter.title}</p>}
                                    {inter.recommendation && (
                                      <p className="text-xs mt-1 opacity-80">💡 {inter.recommendation}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Compliance */}
                          {med.compliance && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-medium text-secondary-700 mb-2 flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Patient Compliance
                              </p>
                              <div className="grid grid-cols-4 gap-2">
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                                  <span className="text-xs"><span className="font-semibold text-emerald-600">{med.compliance.doses_taken}</span> taken</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-red-500" />
                                  <span className="text-xs"><span className="font-semibold text-red-600">{med.compliance.doses_missed}</span> missed</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3 text-blue-500" />
                                  <span className={`text-xs font-semibold ${getSafetyColor(med.compliance.adherence_rate)}`}>{med.compliance.adherence_rate}%</span>
                                </div>
                                {med.compliance.last_taken_at && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-secondary-400" />
                                    <span className="text-xs">{new Date(med.compliance.last_taken_at).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${med.compliance.adherence_rate >= 80 ? 'bg-emerald-500' : med.compliance.adherence_rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${med.compliance.adherence_rate}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {(!p.medications || p.medications.length === 0) && (
                      <p className="text-secondary-500 text-sm text-center py-4">No medication details available</p>
                    )}
                  </div>

                  {/* Analysis Summary */}
                  {p.total_interactions > 0 && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Analysis Summary
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-blue-600">{p.total_interactions}</p>
                          <p className="text-xs text-blue-700">Total Interactions</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">{p.critical_warnings}</p>
                          <p className="text-xs text-red-700">Critical Warnings</p>
                        </div>
                        <div>
                          <p className={`text-2xl font-bold ${getSafetyColor(p.overall_safety_percentage)}`}>
                            {p.overall_safety_percentage || 'N/A'}%
                          </p>
                          <p className="text-xs text-secondary-600">Overall Safety</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
