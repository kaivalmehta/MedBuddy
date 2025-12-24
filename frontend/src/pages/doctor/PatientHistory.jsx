// ============================================
// frontend/src/pages/doctor/PatientHistory.jsx
// Enhanced with medication details and compliance
// ============================================

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doctorService } from '../../services/professional'
import { 
  User, FileText, TestTube, Heart, AlertTriangle, Calendar, 
  ArrowLeft, Loader2, ChevronDown, ChevronUp, Pill, Clock,
  CheckCircle, XCircle, TrendingUp, Activity
} from 'lucide-react'

export default function PatientHistory() {
  const { patientId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedPrescriptions, setExpandedPrescriptions] = useState({})

  useEffect(() => {
    loadPatientHistory()
  }, [patientId])

  const loadPatientHistory = async () => {
    try {
      const res = await doctorService.getPatientHistory(patientId)
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load patient history. Access may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const togglePrescription = (id) => {
    setExpandedPrescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
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

  const getComplianceColor = (rate) => {
    if (rate === null || rate === undefined) return 'text-gray-500'
    if (rate >= 80) return 'text-emerald-600'
    if (rate >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-secondary-800 mb-2">Access Denied</h2>
        <p className="text-secondary-500 mb-6">{error}</p>
        <Link to="/doctor/patient-access" className="btn-primary">Request New Access</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/doctor/patient-access" className="inline-flex items-center gap-2 text-secondary-600 hover:text-secondary-800">
        <ArrowLeft className="w-4 h-4" /> Back to Patient Access
      </Link>

      {/* Patient Info */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">
              {data.patient.name || data.patient.email}
            </h1>
            <p className="text-secondary-500">{data.patient.email}</p>
            {data.session_expires_at && (
              <p className="text-xs text-blue-600 mt-1">
                Session expires: {new Date(data.session_expires_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Health Profile */}
      {data.health_profile && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold">Health Profile</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-secondary-500">Blood Type</p>
              <p className="font-medium">{data.health_profile.blood_type || 'N/A'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-secondary-500">Gender</p>
              <p className="font-medium">{data.health_profile.gender || 'N/A'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-secondary-500">Age</p>
              <p className="font-medium">{data.health_profile.age || 'N/A'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-secondary-500">Weight</p>
              <p className="font-medium">
                {data.health_profile.weight_kg ? `${data.health_profile.weight_kg} kg` : 'N/A'}
              </p>
            </div>
          </div>
          
          {data.health_profile.medical_conditions?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-secondary-700 mb-2">Medical Conditions</p>
              <div className="flex flex-wrap gap-2">
                {data.health_profile.medical_conditions.map((c, i) => (
                  <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">{c}</span>
                ))}
              </div>
            </div>
          )}
          
          {data.health_profile.allergies?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-secondary-700 mb-2">Allergies</p>
              <div className="flex flex-wrap gap-2">
                {data.health_profile.allergies.map((a, i) => (
                  <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prescriptions */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Prescription History ({data.prescriptions?.length || 0})</h2>
        </div>
        
        {data.prescriptions?.length > 0 ? (
          <div className="space-y-4">
            {data.prescriptions.map((prescription) => (
              <div key={prescription.id} className="border rounded-xl overflow-hidden">
                {/* Prescription Header - Clickable */}
                <button
                  onClick={() => togglePrescription(prescription.id)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-secondary-800">
                      {prescription.doctor_name || 'Unknown Doctor'}
                    </p>
                    <p className="text-sm text-secondary-500">
                      {prescription.drug_count || 0} medications • {prescription.source || 'Uploaded'}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-sm text-secondary-600">
                        {new Date(prescription.created_at).toLocaleDateString()}
                      </p>
                      {prescription.overall_safety_percentage !== null && (
                        <p className={`text-xs ${getSafetyColor(prescription.overall_safety_percentage)}`}>
                          Safety: {prescription.overall_safety_percentage}%
                        </p>
                      )}
                      {prescription.overall_compliance && (
                        <p className={`text-xs ${getComplianceColor(prescription.overall_compliance.adherence_rate)}`}>
                          Compliance: {prescription.overall_compliance.adherence_rate}%
                        </p>
                      )}
                    </div>
                    {expandedPrescriptions[prescription.id] ? (
                      <ChevronUp className="w-5 h-5 text-secondary-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-secondary-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Medication Details */}
                {expandedPrescriptions[prescription.id] && prescription.medications && (
                  <div className="p-4 border-t bg-white">
                    <h4 className="text-sm font-semibold text-secondary-700 mb-3 flex items-center gap-2">
                      <Pill className="w-4 h-4" /> Medications
                    </h4>
                    <div className="space-y-3">
                      {prescription.medications.map((med) => (
                        <div key={med.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-secondary-800">{med.drug_name}</h5>
                                {med.generic_name && med.generic_name !== med.drug_name && (
                                  <span className="text-xs text-secondary-500">({med.generic_name})</span>
                                )}
                                {!med.is_safe_to_take && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                    ⚠️ Safety Concern
                                  </span>
                                )}
                              </div>
                              
                              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div>
                                  <span className="text-secondary-500">Dosage:</span>{' '}
                                  <span className="font-medium">{med.dosage || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-secondary-500">Frequency:</span>{' '}
                                  <span className="font-medium">{med.frequency || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-secondary-500">Duration:</span>{' '}
                                  <span className="font-medium">{med.duration || 'N/A'}</span>
                                </div>
                                {med.quantity && (
                                  <div>
                                    <span className="text-secondary-500">Quantity:</span>{' '}
                                    <span className="font-medium">{med.quantity}</span>
                                  </div>
                                )}
                              </div>
                              
                              {med.instructions && (
                                <p className="mt-2 text-sm text-secondary-600 italic">
                                  📝 {med.instructions}
                                </p>
                              )}

                              {med.primary_use && (
                                <p className="mt-2 text-sm text-secondary-600">
                                  <span className="font-medium">For:</span> {med.primary_use}
                                </p>
                              )}
                            </div>
                            
                            {/* Safety indicator */}
                            {med.safety_percentage !== null && (
                              <div className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${getSafetyBg(med.safety_percentage)} ${getSafetyColor(med.safety_percentage)}`}>
                                {med.safety_percentage}%
                              </div>
                            )}
                          </div>

                          {/* Compliance Data */}
                          {med.compliance && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="w-4 h-4 text-secondary-500" />
                                <span className="text-sm font-medium text-secondary-700">Patient Compliance</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                                  <div>
                                    <p className="text-xs text-secondary-500">Doses Taken</p>
                                    <p className="font-semibold text-emerald-600">{med.compliance.doses_taken}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  <div>
                                    <p className="text-xs text-secondary-500">Doses Missed</p>
                                    <p className="font-semibold text-red-600">{med.compliance.doses_missed}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-blue-500" />
                                  <div>
                                    <p className="text-xs text-secondary-500">Adherence Rate</p>
                                    <p className={`font-semibold ${getComplianceColor(med.compliance.adherence_rate)}`}>
                                      {med.compliance.adherence_rate}%
                                    </p>
                                  </div>
                                </div>
                                {med.compliance.last_taken_at && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-secondary-500" />
                                    <div>
                                      <p className="text-xs text-secondary-500">Last Taken</p>
                                      <p className="font-medium text-secondary-700">
                                        {new Date(med.compliance.last_taken_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Compliance Bar */}
                              <div className="mt-3">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${
                                      med.compliance.adherence_rate >= 80 ? 'bg-emerald-500' :
                                      med.compliance.adherence_rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${med.compliance.adherence_rate}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {prescription.medications.length === 0 && (
                      <p className="text-secondary-500 text-sm">No medication details available</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-secondary-500 text-center py-4">No prescriptions found</p>
        )}
      </div>

      {/* Lab Reports */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TestTube className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold">Lab Reports ({data.lab_reports?.length || 0})</h2>
        </div>
        {data.lab_reports?.length > 0 ? (
          <div className="space-y-3">
            {data.lab_reports.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TestTube className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-secondary-800">{r.report_title}</p>
                  <p className="text-sm text-secondary-500">{r.report_type} • {r.laboratory_name || 'Unknown Lab'}</p>
                </div>
                <p className="text-sm text-secondary-600">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-secondary-500 text-center py-4">No lab reports found</p>
        )}
      </div>
    </div>
  )
}