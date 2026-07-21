import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { testOrderService } from '../../services/professional'
import { 
  FileText, Clock, CheckCircle, XCircle, Home, Building,
  User, Loader2, Filter, Plus, AlertTriangle, ChevronDown,
  ChevronUp, FlaskConical, Calendar, Eye, X, Activity, Info, Download
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DoctorTestOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderDetails, setOrderDetails] = useState({}) // Cache order details
  const [loadingDetail, setLoadingDetail] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null) // For report modal

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const res = await testOrderService.getDoctorOrders(params)
      setOrders(res.data || [])
    } catch (err) {
      setError('Failed to load test orders')
    } finally {
      setLoading(false)
    }
  }

  const loadOrderDetail = async (orderId) => {
    if (orderDetails[orderId]) return // Already cached
    
    setLoadingDetail(orderId)
    try {
      const res = await testOrderService.getDoctorOrderDetail(orderId)
      setOrderDetails(prev => ({ ...prev, [orderId]: res.data }))
    } catch (err) {
      console.error('Failed to load order details:', err)
    } finally {
      setLoadingDetail(null)
    }
  }

  const handleExpandOrder = async (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null)
    } else {
      setExpandedOrder(orderId)
      await loadOrderDetail(orderId)
    }
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    declined: 'bg-red-100 text-red-700',
    sample_collected: 'bg-purple-100 text-purple-700',
    processing: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  const urgencyColors = {
    routine: 'bg-gray-100 text-gray-600',
    urgent: 'bg-orange-100 text-orange-700',
    stat: 'bg-red-100 text-red-700',
  }

  const getSeverityColor = (severity) => {
    if (severity?.includes('critical')) return 'bg-red-100 text-red-700'
    if (severity?.includes('significant')) return 'bg-orange-100 text-orange-700'
    return 'bg-amber-100 text-amber-700'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Test Orders</h1>
          <p className="text-gray-600 mt-1">Track lab test orders for your patients</p>
        </div>
        <Link
          to="/doctor/order-test"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Test Order
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No test orders found</p>
          <Link
            to="/doctor/order-test"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create First Order
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden"
            >
              {/* Order Header */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleExpandOrder(order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    order.status === 'completed' ? 'bg-green-100' :
                    order.status === 'declined' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <FlaskConical className={`w-6 h-6 ${
                      order.status === 'completed' ? 'text-green-600' :
                      order.status === 'declined' ? 'text-red-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">#{order.order_number}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status]}`}>
                        {order.status_display}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${urgencyColors[order.urgency]}`}>
                        {order.urgency_display}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {order.patient_name}
                      {order.collection_type === 'home_collection' && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Home className="w-3 h-3" />
                          Home
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{order.laboratory_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {expandedOrder === order.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedOrder === order.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-gray-200 mt-4 pt-4"
                  >
                    {/* Tests */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Tests Ordered:</p>
                      <div className="flex flex-wrap gap-2">
                        {order.tests_requested?.map((test, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            {test}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Notes */}
                    {order.clinical_notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Clinical Notes</p>
                        <p className="text-sm text-gray-700">{order.clinical_notes}</p>
                      </div>
                    )}

                    {/* Home Collection */}
                    {order.home_collection && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          Home Collection
                        </p>
                        <div className="text-sm text-gray-700">
                          <p>{order.home_collection.address_line1}, {order.home_collection.city}</p>
                          <p className="text-gray-500">
                            {order.home_collection.confirmed_date || order.home_collection.preferred_date} • 
                            {order.home_collection.time_slot_display}
                          </p>
                          {order.home_collection.collector_name && (
                            <p className="mt-1 text-green-700">
                              Collector: {order.home_collection.collector_name} ({order.home_collection.collector_phone})
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Decline Reason */}
                    {order.status === 'declined' && order.decline_reason && (
                      <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs font-medium text-red-700 mb-1">Decline Reason</p>
                        <p className="text-sm text-gray-700">{order.decline_reason}</p>
                      </div>
                    )}

                    {/* Reports - Show multiple reports separately */}
                    {order.has_report && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Reports Available
                        </p>
                        
                        {loadingDetail === order.id ? (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading reports...
                          </div>
                        ) : orderDetails[order.id]?.reports?.length > 0 ? (
                          <div className="space-y-3">
                            {orderDetails[order.id].reports.map((report, idx) => (
                              <div key={report.id} className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                                {/* Report Header - Click to view analysis */}
                                <div 
                                  className="flex items-center justify-between p-2 hover:bg-gray-50 transition cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedReport(report)
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                      <FlaskConical className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">{report.report_title}</p>
                                      <p className="text-xs text-gray-500">{report.report_type} • {report.files_count || 1} file(s)</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {report.has_critical_values && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Critical</span>
                                    )}
                                    <button className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">
                                      <Eye className="w-3 h-3" />
                                      View Analysis
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Report Files List */}
                                {report.files && report.files.length > 0 && (
                                  <div className="border-t border-blue-100 p-2 bg-gray-50">
                                    <p className="text-xs text-gray-500 mb-2">Report Files ({report.files.length})</p>
                                    <div className="space-y-1">
                                      {report.files.map((file, fileIdx) => (
                                        <div key={file.id || fileIdx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                                          <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-red-50 rounded flex items-center justify-center">
                                              <FileText className="w-3.5 h-3.5 text-red-500" />
                                            </div>
                                            <div>
                                              <p className="text-xs font-medium text-gray-700 truncate max-w-[200px]">
                                                {file.original_filename || `File ${fileIdx + 1}`}
                                              </p>
                                              <p className="text-xs text-gray-400">
                                                {file.file_type?.toUpperCase() || 'PDF'} 
                                                {file.file_size ? ` • ${(file.file_size / 1024).toFixed(1)} KB` : ''}
                                              </p>
                                            </div>
                                          </div>
                                          <a
                                            href={file.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 px-2 py-1 text-purple-600 hover:bg-purple-50 text-xs rounded transition"
                                          >
                                            <Download className="w-3 h-3" />
                                            View
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              loadOrderDetail(order.id)
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Load Reports
                          </button>
                        )}
                      </div>
                    )}

                    {/* Cost */}
                    {(order.estimated_cost || order.final_cost) && (
                      <div className="flex gap-4 text-sm">
                        {order.estimated_cost && (
                          <div>
                            <span className="text-gray-500">Estimated: </span>
                            <span className="font-medium">₹{order.estimated_cost}</span>
                          </div>
                        )}
                        {order.final_cost && (
                          <div>
                            <span className="text-gray-500">Final: </span>
                            <span className="font-medium text-green-600">₹{order.final_cost}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <FlaskConical className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{selectedReport.report_title}</h3>
                      <p className="text-sm text-gray-500">{selectedReport.report_type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Report Date */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedReport.created_at).toLocaleDateString()}
                </div>

                {/* Critical Alert */}
                {selectedReport.has_critical_values && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-700">This report contains critical values</span>
                  </div>
                )}

                {/* Analysis Summary */}
                {selectedReport.analysis_summary && (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Analysis Summary
                    </h4>
                    <p className="text-gray-600 text-sm">{selectedReport.analysis_summary}</p>
                  </div>
                )}

                {/* Abnormal Values */}
                {selectedReport.abnormal_values && selectedReport.abnormal_values.length > 0 && (
                  <div className={`p-4 rounded-xl border-2 ${selectedReport.has_critical_values ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <h4 className={`font-medium mb-3 flex items-center gap-2 ${selectedReport.has_critical_values ? 'text-red-800' : 'text-amber-800'}`}>
                      <AlertTriangle className="w-4 h-4" />
                      Abnormal Values ({selectedReport.abnormal_values.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedReport.abnormal_values.map((item, i) => {
                        // Handle various field name patterns from different analysis versions
                        const testName = item.test_name || item.parameter || item.name || item.test || 'Unknown Test'
                        const resultValue = item.result || item.measured_value || item.value || 'N/A'
                        const normalRange = item.expected || item.normal_range || item.reference_range || item.range || 'N/A'
                        const severity = item.severity || item.status || 'abnormal'
                        const meaning = item.meaning || item.description || item.explanation || ''
                        const unit = item.unit || ''
                        
                        return (
                          <div key={i} className="p-3 bg-white rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-800">{testName}</span>
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${getSeverityColor(severity)}`}>
                                {severity.charAt(0).toUpperCase() + severity.slice(1)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500">Result: </span>
                                <span className="font-medium">{resultValue} {unit}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Normal: </span>
                                <span className="font-medium">{normalRange}</span>
                              </div>
                            </div>
                            {meaning && (
                              <p className="text-xs text-gray-600 mt-2 p-2 bg-blue-50 rounded flex items-start gap-1">
                                <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-500" />
                                {meaning}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {selectedReport.recommendations && selectedReport.recommendations.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {selectedReport.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* All Report Files */}
                {selectedReport.files && selectedReport.files.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Report Files ({selectedReport.files.length})
                    </h4>
                    {selectedReport.files.map((file, i) => (
                      <a
                        key={file.id || i}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{file.original_filename || `File ${i + 1}`}</p>
                            <p className="text-xs text-gray-500">
                              {file.file_type?.toUpperCase() || 'PDF'}
                              {file.file_size ? ` • ${(file.file_size / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-purple-600">
                          <Download className="w-4 h-4" />
                          <span className="text-sm">View</span>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : selectedReport.file_url && (
                  <a
                    href={selectedReport.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
                  >
                    <FileText className="w-5 h-5" />
                    View Full Report PDF
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}