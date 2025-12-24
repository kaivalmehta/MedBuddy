// ============================================
// frontend/src/pages/patient/LabReportDetail.jsx
// ============================================

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { labReportService } from '../../services/professional'
import { 
  TestTube, ArrowLeft, Calendar, Building2, User, FileText,
  AlertTriangle, CheckCircle, Loader2, Download, Zap
} from 'lucide-react'

export default function LabReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    loadReport()
  }, [id])

  const loadReport = async () => {
    try {
      const res = await labReportService.get(id)
      setReport(res.data)
    } catch (err) {
      console.error('Failed to load report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await labReportService.analyze(id)
      setReport(prev => ({
        ...prev,
        ...res.data,
        status: 'analyzed'
      }))
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-500">Report not found</p>
        <Link to="/reports" className="btn-primary mt-4">Back to Reports</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link to="/reports" className="inline-flex items-center gap-2 text-secondary-600 hover:text-secondary-800">
        <ArrowLeft className="w-4 h-4" /> Back to Reports
      </Link>

      {/* Header */}
      <div className="card bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center">
            <TestTube className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-secondary-800">{report.report_title}</h1>
            <p className="text-secondary-500">{report.report_type_display}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {report.report_date && (
                <span className="flex items-center gap-1 text-secondary-600">
                  <Calendar className="w-4 h-4" /> {new Date(report.report_date).toLocaleDateString()}
                </span>
              )}
              {report.laboratory_name && (
                <span className="flex items-center gap-1 text-secondary-600">
                  <Building2 className="w-4 h-4" /> {report.laboratory_name}
                </span>
              )}
            </div>
          </div>
          {report.file_url && (
            <a href={report.file_url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> View File
            </a>
          )}
        </div>
      </div>

      {/* Source Info */}
      <div className="card">
        <div className="flex items-center gap-2 text-sm text-secondary-600">
          <span className={`px-2 py-1 rounded-full ${
            report.source === 'laboratory' ? 'bg-purple-100 text-purple-700' :
            report.source === 'doctor' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {report.source === 'laboratory' ? 'From Laboratory' : 
             report.source === 'doctor' ? 'From Doctor' : 'Self Uploaded'}
          </span>
          {report.sent_by && <span>by {report.sent_by}</span>}
        </div>
      </div>

      {/* Analysis Section */}
      {report.status !== 'analyzed' ? (
        <div className="card text-center py-8">
          <Zap className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI Analysis Available</h3>
          <p className="text-secondary-500 mb-6">Get AI-powered insights about your lab results</p>
          <button 
            onClick={handleAnalyze} 
            disabled={analyzing}
            className="btn-primary mx-auto flex items-center gap-2"
            style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}
          >
            {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {analyzing ? 'Analyzing...' : 'Analyze Report'}
          </button>
        </div>
      ) : (
        <>
          {/* Analysis Summary */}
          {report.analysis_summary && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Summary</h2>
              <p className="text-secondary-600">{report.analysis_summary}</p>
            </div>
          )}

          {/* Abnormal Values */}
          {report.abnormal_values?.length > 0 && (
            <div className="card border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-amber-800">Abnormal Values</h2>
              </div>
              <div className="space-y-3">
                {report.abnormal_values.map((item, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-secondary-800">{item.test_name}</span>
                      <span className={`text-sm font-medium ${
                        item.severity === 'significant' ? 'text-red-600' : 'text-amber-600'
                      }`}>{item.severity}</span>
                    </div>
                    <p className="text-sm text-secondary-600">
                      Result: <strong>{item.result}</strong> (Normal: {item.expected})
                    </p>
                    {item.meaning && <p className="text-sm text-secondary-500 mt-1">{item.meaning}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold">Recommendations</h2>
              </div>
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-secondary-600">
                    <span className="text-emerald-500 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Disclaimer */}
      <div className="text-center text-sm text-secondary-500 p-4 bg-gray-50 rounded-xl">
        <strong>Disclaimer:</strong> This AI analysis is for informational purposes only. 
        Please consult your healthcare provider for medical advice.
      </div>
    </div>
  )
}