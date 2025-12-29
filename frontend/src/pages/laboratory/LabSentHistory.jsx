import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { laboratoryService } from '../../services/professional'
import { 
  FileText, Search, Filter, Calendar, User, ExternalLink, 
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Mail,
  CheckCircle, FlaskConical, ArrowUpRight, Download
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function LabSentHistory() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const reportTypes = [
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

  useEffect(() => {
    loadReports()
  }, [page, filterType])

  const loadReports = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page,
        per_page: 15,
      }
      if (filterType) params.type = filterType
      if (search) params.search = search

      const res = await laboratoryService.getSentReports(params)
      setReports(res.data.reports || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
    } catch (err) {
      console.error('Failed to load reports:', err)
      setError('Failed to load sent reports')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadReports()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sent Reports</h1>
          <p className="text-gray-600 mt-1">View all reports you've sent to patients</p>
        </div>
        <Link
          to="/laboratory/upload"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <FileText className="w-5 h-5" />
          Upload New Report
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or patient..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{total}</p>
            <p className="text-sm text-gray-500">Total Reports Sent</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Reports Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No reports found</p>
            <Link
              to="/laboratory/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
            >
              Upload First Report
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report, idx) => (
                  <motion.tr
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reportTypeColors[report.report_type] || 'bg-gray-100'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{report.report_title}</p>
                          {report.abnormal_values_count > 0 && (
                            <span className="text-xs text-amber-600">
                              {report.abnormal_values_count} abnormal value{report.abnormal_values_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{report.patient_name}</p>
                          <p className="text-xs text-gray-500">{report.patient_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${reportTypeColors[report.report_type] || 'bg-gray-100 text-gray-700'}`}>
                        {reportTypeLabels[report.report_type] || report.report_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {report.report_date || new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="capitalize text-sm text-gray-700">{report.status}</span>
                        {report.email_sent && (
                          <span className="flex items-center gap-1 text-xs text-green-600" title="Email sent">
                            <Mail className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/laboratory/report/${report.id}`}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="View Details & Analysis"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                        {report.file_url && (
                          <a
                            href={report.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
