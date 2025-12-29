// ============================================
// frontend/src/pages/laboratory/LabReportDetail.jsx
// ============================================

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { laboratoryService } from '../../services/professional'
import { 
  TestTube, ArrowLeft, Calendar, Building2, User, FileText,
  AlertTriangle, CheckCircle, Loader2, Download, Info,
  AlertCircle, Activity, Mail, Clock
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function LabReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReport()
  }, [id])

  const loadReport = async () => {
    try {
      const res = await laboratoryService.getReportDetail(id)
      console.log('Lab report detail:', res.data)
      setReport(res.data)
    } catch (err) {
      console.error('Failed to load report:', err)
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'critical_low':
      case 'critical_high':
      case 'panic':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'significant':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'moderate':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'abnormal':
      case 'mild':
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
  }

  const getSeverityLabel = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'critical_low': return 'Critical Low'
      case 'critical_high': return 'Critical High'
      case 'panic': return 'PANIC'
      case 'significant': return 'Significant'
      case 'moderate': return 'Moderate'
      case 'abnormal': return 'Abnormal'
      case 'mild': return 'Mild'
      default: return severity || 'Abnormal'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-secondary-500 mb-4">{error}</p>
        <Link to="/laboratory/sent" className="btn-primary">Back to Sent Reports</Link>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-500">Report not found</p>
        <Link to="/laboratory/sent" className="btn-primary mt-4">Back to Sent Reports</Link>
      </div>
    )
  }

  const hasAbnormalValues = report.abnormal_values && report.abnormal_values.length > 0
  const isAnalyzed = report.status === 'analyzed'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link to="/laboratory/sent" className="inline-flex items-center gap-2 text-secondary-600 hover:text-secondary-800 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Sent Reports
      </Link>

      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <TestTube className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-secondary-800">{report.report_title}</h1>
            <p className="text-secondary-500">{report.report_type_display || report.report_type}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {report.report_date && (
                <span className="flex items-center gap-1 text-secondary-600">
                  <Calendar className="w-4 h-4" /> {new Date(report.report_date).toLocaleDateString()}
                </span>
              )}
              {report.referring_doctor && (
                <span className="flex items-center gap-1 text-secondary-600">
                  <User className="w-4 h-4" /> Referred by: {report.referring_doctor}
                </span>
              )}
            </div>
          </div>
          {report.file_url && (
            <a 
              href={report.file_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-secondary flex items-center gap-2 flex-shrink-0"
            >
              <Download className="w-4 h-4" /> View File
            </a>
          )}
        </div>
      </motion.div>

      {/* Patient Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-purple-500" />
          Patient Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-secondary-500">Name</p>
            <p className="font-medium text-secondary-800">{report.patient_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-500">Email</p>
            <p className="font-medium text-secondary-800">{report.patient_email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Status Info */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isAnalyzed && hasAbnormalValues ? 'bg-amber-100 text-amber-700' : 
              isAnalyzed ? 'bg-green-100 text-green-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {isAnalyzed && hasAbnormalValues ? `⚠️ ${report.abnormal_values.length} Abnormal Values` : 
               isAnalyzed ? '✓ All Values Normal' :
               '⏳ Processing'}
            </span>
            {report.email_sent && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 flex items-center gap-1">
                <Mail className="w-4 h-4" /> Email Sent
              </span>
            )}
          </div>
          {report.has_critical_values && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Critical Values
            </span>
          )}
        </div>
      </div>

      {/* Analysis Results */}
      {isAnalyzed && (
        <>
          {/* Analysis Summary */}
          {report.analysis_summary && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-secondary-800">AI Analysis Summary</h2>
              </div>
              <p className="text-secondary-600 leading-relaxed">
                {report.analysis_summary}
              </p>
            </motion.div>
          )}

          {/* Abnormal Values */}
          {hasAbnormalValues && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`card border-2 ${report.has_critical_values ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className={`w-5 h-5 ${report.has_critical_values ? 'text-red-600' : 'text-amber-600'}`} />
                <h2 className={`text-lg font-semibold ${report.has_critical_values ? 'text-red-800' : 'text-amber-800'}`}>
                  Abnormal Values Detected
                </h2>
                <span className="ml-auto text-sm px-2 py-1 rounded-full bg-white/50 font-medium">
                  {report.abnormal_values.length} found
                </span>
              </div>
              <div className="space-y-3">
                {report.abnormal_values.map((item, i) => (
                  <div key={i} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-secondary-800 text-lg">{item.test_name}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${getSeverityColor(item.severity)}`}>
                        {getSeverityLabel(item.severity)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-2">
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-secondary-500 block text-xs uppercase tracking-wide">Result</span>
                        <span className="font-semibold text-secondary-800 text-base">
                          {item.result || item.measured_value || 'N/A'} {item.unit}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-secondary-500 block text-xs uppercase tracking-wide">Normal Range</span>
                        <span className="font-semibold text-secondary-800 text-base">
                          {item.expected || item.normal_range || 'N/A'}
                        </span>
                      </div>
                    </div>
                    {(item.meaning || item.description) && (
                      <p className="text-sm text-secondary-600 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <Info className="w-4 h-4 inline mr-2 text-blue-500" />
                        {item.meaning || item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* No Abnormal Values */}
          {!hasAbnormalValues && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card border-green-200 bg-green-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">All Values Normal</h3>
                  <p className="text-sm text-green-600">No abnormal or critical values were detected in this report.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card border-blue-200 bg-blue-50"
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-blue-800">AI Recommendations</h2>
              </div>
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary-700 bg-white p-3 rounded-lg">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {i + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </>
      )}

      {/* Notes */}
      {report.notes && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-secondary-500" />
            Notes
          </h2>
          <p className="text-secondary-600">{report.notes}</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-secondary-500" />
          <h2 className="text-lg font-semibold">Timeline</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-secondary-500">Uploaded</span>
            <span className="text-secondary-700">{new Date(report.created_at).toLocaleString()}</span>
          </div>
          {report.email_sent_at && (
            <div className="flex justify-between">
              <span className="text-secondary-500">Email Sent</span>
              <span className="text-secondary-700">{new Date(report.email_sent_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
