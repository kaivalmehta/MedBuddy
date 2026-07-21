import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { laboratoryService } from '../../services/professional'
import { 
  ArrowLeft, User, FileText, Activity, Heart, AlertTriangle,
  Clock, Download, ExternalLink, FlaskConical, Pill, Calendar,
  ChevronDown, ChevronUp, Upload, Loader2, AlertCircle, Droplet,
  Ruler, Weight, Phone, Mail, Stethoscope, CheckCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LabPatientHistory() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedReport, setExpandedReport] = useState(null)

  useEffect(() => {
    loadPatientHistory()
  }, [patientId])

  const loadPatientHistory = async () => {
    try {
      const res = await laboratoryService.getPatientHistory(patientId)
      setData(res.data)
    } catch (err) {
      console.error('Failed to load patient history:', err)
      if (err.response?.status === 403) {
        setError('No active access session. Please request access again.')
      } else {
        setError(err.response?.data?.error || 'Failed to load patient history')
      }
    } finally {
      setLoading(false)
    }
  }

  const reportTypeLabels = {
    blood_test: 'Blood Test',
    urine_test: 'Urine Test',
    xray: 'X-Ray',
    mri: 'MRI',
    ct_scan: 'CT Scan',
    ultrasound: 'Ultrasound',
    ecg: 'ECG/EKG',
    pathology: 'Pathology',
    other: 'Other',
  }

  const reportTypeColors = {
    blood_test: 'bg-red-100 text-red-700',
    urine_test: 'bg-yellow-100 text-yellow-700',
    xray: 'bg-blue-100 text-blue-700',
    mri: 'bg-purple-100 text-purple-700',
    ct_scan: 'bg-indigo-100 text-indigo-700',
    ultrasound: 'bg-cyan-100 text-cyan-700',
    ecg: 'bg-pink-100 text-pink-700',
    pathology: 'bg-orange-100 text-orange-700',
    other: 'bg-gray-100 text-gray-700',
  }

  const calculateAge = (dob) => {
    if (!dob) return null
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/laboratory/patient-access"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Request Access
          </Link>
        </div>
      </div>
    )
  }

  const hp = data?.health_profile

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/laboratory/patient-access"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Patient Access
        </Link>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          Session expires: {new Date(data?.session_expires_at).toLocaleTimeString()}
        </div>
      </div>

      {/* Patient Info Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{data?.patient?.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-purple-100">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {data?.patient?.email}
              </span>
              {data?.patient?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {data?.patient?.phone}
                </span>
              )}
            </div>
          </div>
          <Link
            to={`/laboratory/upload?patient=${data?.patient?.email}`}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
          >
            <Upload className="w-5 h-5" />
            Upload Report
          </Link>
        </div>
      </motion.div>

      {/* Health Profile */}
      {hp && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Health Profile
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {hp.blood_type && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <Droplet className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-xs text-gray-500">Blood Type</p>
                  <p className="font-semibold text-gray-800">{hp.blood_type}</p>
                </div>
              </div>
            )}
            {hp.gender && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                <User className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-xs text-gray-500">Gender</p>
                  <p className="font-semibold text-gray-800 capitalize">{hp.gender}</p>
                </div>
              </div>
            )}
            {hp.date_of_birth && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">Age</p>
                  <p className="font-semibold text-gray-800">{calculateAge(hp.date_of_birth)} years</p>
                </div>
              </div>
            )}
            {hp.weight_kg && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <Weight className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Weight</p>
                  <p className="font-semibold text-gray-800">{hp.weight_kg} kg</p>
                </div>
              </div>
            )}
          </div>

          {/* Medical Conditions */}
          {hp.medical_conditions?.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-600 mb-2">Medical Conditions</p>
              <div className="flex flex-wrap gap-2">
                {hp.medical_conditions.map((condition, idx) => (
                  <span key={idx} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Allergies */}
          {hp.allergies?.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-600 mb-2">Allergies</p>
              <div className="flex flex-wrap gap-2">
                {hp.allergies.map((allergy, idx) => (
                  <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Current Medications */}
          {hp.current_medications?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Current Medications</p>
              <div className="flex flex-wrap gap-2">
                {hp.current_medications.map((med, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                    <Pill className="w-3 h-3" />
                    {med}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lab Reports */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-500" />
                Lab Reports
              </h2>
              <span className="text-sm text-gray-500">
                {data?.lab_reports?.length || 0} reports
              </span>
            </div>

            {data?.lab_reports?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FlaskConical className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No lab reports found</p>
                <Link
                  to={`/laboratory/upload?patient=${data?.patient?.email}`}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload First Report
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.lab_reports?.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reportTypeColors[report.report_type] || 'bg-gray-100'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-800">{report.report_title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${reportTypeColors[report.report_type] || 'bg-gray-100 text-gray-700'}`}>
                              {reportTypeLabels[report.report_type] || report.report_type}
                            </span>
                            {report.sent_by_me && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                Sent by you
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {report.report_date || new Date(report.created_at).toLocaleDateString()}
                        </span>
                        {expandedReport === report.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedReport === report.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-gray-200 p-4 bg-gray-50"
                        >
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            {report.laboratory_name && (
                              <div>
                                <p className="text-gray-500">Laboratory</p>
                                <p className="font-medium text-gray-800">{report.laboratory_name}</p>
                              </div>
                            )}
                            {report.referring_doctor && (
                              <div>
                                <p className="text-gray-500">Referring Doctor</p>
                                <p className="font-medium text-gray-800">{report.referring_doctor}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-gray-500">Status</p>
                              <p className="font-medium text-gray-800 capitalize">{report.status}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Source</p>
                              <p className="font-medium text-gray-800 capitalize">{report.source}</p>
                            </div>
                          </div>

                          {/* Analysis Summary */}
                          {report.analysis_summary && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-medium text-blue-800 mb-1">Analysis Summary</p>
                              <p className="text-sm text-blue-700">{report.analysis_summary}</p>
                            </div>
                          )}

                          {/* Abnormal Values */}
                          {report.abnormal_values?.length > 0 && (
                            <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                              <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                Abnormal Values
                              </p>
                              <div className="space-y-1">
                                {report.abnormal_values.map((item, idx) => (
                                  <p key={idx} className="text-sm text-amber-700">• {item}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recommendations */}
                          {report.recommendations?.length > 0 && (
                            <div className="mb-4 p-3 bg-green-50 rounded-lg">
                              <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Recommendations
                              </p>
                              <div className="space-y-1">
                                {report.recommendations.map((item, idx) => (
                                  <p key={idx} className="text-sm text-green-700">• {item}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {report.file_url && (
                              <a
                                href={report.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-sm"
                              >
                                <ExternalLink className="w-4 h-4" />
                                View Report
                              </a>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Prescriptions (Context) */}
        <div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-500" />
              Recent Prescriptions
            </h2>
            <p className="text-xs text-gray-500 mb-3">Context for ordered tests</p>

            {data?.recent_prescriptions?.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Stethoscope className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No prescriptions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.recent_prescriptions?.map((rx) => (
                  <div key={rx.id} className="p-3 bg-gray-50 rounded-xl">
                    <p className="font-medium text-gray-800 text-sm">{rx.diagnosis || 'No diagnosis'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Dr. {rx.doctor_name} • {rx.clinic_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(rx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
