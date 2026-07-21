// ============================================
// frontend/src/pages/patient/LabReports.jsx
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { labReportService } from '../../services/professional'
import { 
  TestTube, Upload, FileText, Calendar, Building2, 
  ChevronRight, Search, Filter, Plus, Loader2, X, AlertTriangle
} from 'lucide-react'

const REPORT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'blood_test', label: 'Blood Test' },
  { value: 'urine_test', label: 'Urine Test' },
  { value: 'xray', label: 'X-Ray' },
  { value: 'mri', label: 'MRI' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'ecg', label: 'ECG/EKG' },
  { value: 'pathology', label: 'Pathology' },
  { value: 'other', label: 'Other' },
]

export default function LabReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const res = await labReportService.list()
      setReports(res.data.reports || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = reports.filter(r => {
    const matchesSearch = r.report_title?.toLowerCase().includes(search.toLowerCase()) ||
                          r.laboratory_name?.toLowerCase().includes(search.toLowerCase())
    const matchesType = !typeFilter || r.report_type === typeFilter
    return matchesSearch && matchesType
  })

  // Group by source
  const fromLab = filtered.filter(r => r.source === 'laboratory')
  const selfUploaded = filtered.filter(r => r.source === 'self')
  const fromDoctor = filtered.filter(r => r.source === 'doctor')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <TestTube className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">Lab Reports</h1>
            <p className="text-secondary-500">{reports.length} reports</p>
          </div>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Upload Report
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="input-field pl-12"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field w-full sm:w-48"
        >
          {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadReportModal 
          onClose={() => setShowUpload(false)} 
          onSuccess={() => { setShowUpload(false); loadReports(); }}
        />
      )}

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <TestTube className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-800 mb-2">No Lab Reports</h3>
          <p className="text-secondary-500 mb-6">
            {search || typeFilter ? 'No reports match your filters' : 'Upload your first lab report'}
          </p>
          {!search && !typeFilter && (
            <button onClick={() => setShowUpload(true)} className="btn-primary mx-auto">
              Upload Report
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* From Laboratory */}
          {fromLab.length > 0 && (
            <ReportSection title="From Laboratories" icon={Building2} reports={fromLab} color="purple" />
          )}
          
          {/* From Doctor */}
          {fromDoctor.length > 0 && (
            <ReportSection title="From Doctors" icon={FileText} reports={fromDoctor} color="blue" />
          )}
          
          {/* Self Uploaded */}
          {selfUploaded.length > 0 && (
            <ReportSection title="Self Uploaded" icon={Upload} reports={selfUploaded} color="gray" />
          )}
        </div>
      )}
    </div>
  )
}

function ReportSection({ title, icon: Icon, reports, color }) {
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
    gray: 'bg-gray-100 text-gray-600'
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${color === 'purple' ? 'text-purple-500' : color === 'blue' ? 'text-blue-500' : 'text-gray-500'}`} />
        <h2 className="text-lg font-semibold text-secondary-800">{title}</h2>
        <span className="text-sm text-secondary-500">({reports.length})</span>
      </div>
      <div className="space-y-3">
        {reports.map((report) => (
          <Link
            key={report.id}
            to={`/reports/${report.id}`}
            className="card-hover flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
              <TestTube className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-secondary-800 truncate">{report.report_title}</p>
              <p className="text-sm text-secondary-500">
                {report.report_type_display} • {report.laboratory_name || 'Unknown Lab'}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm text-secondary-600">
                {report.report_date ? new Date(report.report_date).toLocaleDateString() : 'No date'}
              </p>
              <span className={`text-xs ${report.status === 'analyzed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {report.status}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function UploadReportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [reportType, setReportType] = useState('blood_test')
  const [reportTitle, setReportTitle] = useState('')
  const [laboratoryName, setLaboratoryName] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback((acceptedFiles) => {
    setFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'], 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !reportTitle) return

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('report_type', reportType)
    formData.append('report_title', reportTitle)
    formData.append('laboratory_name', laboratoryName)
    if (reportDate) formData.append('report_date', reportDate)

    try {
      await labReportService.upload(formData)
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upload Lab Report</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          {/* File Upload */}
          {!file ? (
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}>
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-secondary-600">Drop file or click to upload</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-8 h-8 text-purple-500" />
              <span className="flex-1 truncate text-sm">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Report Type *</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="input-field">
              {REPORT_TYPES.slice(1).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Report Title *</label>
            <input type="text" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} className="input-field" placeholder="e.g., Complete Blood Count" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Laboratory Name</label>
            <input type="text" value={laboratoryName} onChange={(e) => setLaboratoryName(e.target.value)} className="input-field" placeholder="Lab name" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Report Date</label>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="input-field" />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || !file || !reportTitle} className="btn-primary flex-1 flex items-center justify-center gap-2" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
