import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { laboratoryService, testOrderService } from '../../services/professional'
import { 
  Upload, Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle, 
  FileText, X, Calendar, User, FlaskConical, Send, Eye, Shield,
  AlertTriangle, ClipboardList
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LabUploadReport() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  // Form state
  const [email, setEmail] = useState(searchParams.get('patient') || '')
  const [reportTitle, setReportTitle] = useState('')
  const [reportType, setReportType] = useState('blood_test')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [referringDoctor, setReferringDoctor] = useState('')
  const [notes, setNotes] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [file, setFile] = useState(null)
  const [testOrderId, setTestOrderId] = useState(searchParams.get('order') || '')
  
  // UI state
  const [step, setStep] = useState('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState(null)
  const [patientExists, setPatientExists] = useState(false)
  const [verifyingPatient, setVerifyingPatient] = useState(false)
  const [labProfile, setLabProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [testOrder, setTestOrder] = useState(null)

  const reportTypes = [
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

  useEffect(() => {
    loadProfile()
    if (testOrderId) {
      loadTestOrder()
    }
  }, [])

  const loadProfile = async () => {
    try {
      const res = await laboratoryService.getProfile()
      setLabProfile(res.data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoadingProfile(false)
    }
  }

  const loadTestOrder = async () => {
    try {
      const res = await testOrderService.getLabOrderDetail(testOrderId)
      setTestOrder(res.data)
      if (res.data.patient_email) setEmail(res.data.patient_email)
      if (res.data.doctor_name) setReferringDoctor(res.data.doctor_name)
      if (res.data.tests_requested?.length) {
        setReportTitle(res.data.tests_requested.join(', '))
      }
      setPatientExists(true)
    } catch (err) {
      console.error('Failed to load test order:', err)
    }
  }

  // Just check if patient exists - NO OTP REQUIRED
  useEffect(() => {
    if (email && email.includes('@')) {
      checkPatientExists()
    } else {
      setPatientExists(false)
    }
  }, [email])

  const checkPatientExists = async () => {
    setVerifyingPatient(true)
    setError('')
    try {
      const res = await laboratoryService.checkPatient(email.trim().toLowerCase())
      if (res.data.exists) {
        setPatientExists(true)
      } else {
        setPatientExists(false)
        setError('Patient not found in the system.')
      }
    } catch (err) {
      setPatientExists(false)
      if (err.response?.status === 404) {
        setError('Patient not found in the system.')
      }
    } finally {
      setVerifyingPatient(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF or image file (JPG, PNG)')
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!patientExists) {
      setError('Please enter a valid patient email')
      return
    }
    if (!file) {
      setError('Please select a file to upload')
      return
    }
    if (!reportTitle.trim()) {
      setError('Please enter a report title')
      return
    }

    setStep('uploading')
    setLoading(true)
    setError('')
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('patient_email', email.trim().toLowerCase())
      formData.append('report_file', file)
      formData.append('report_title', reportTitle.trim())
      formData.append('report_type', reportType)
      formData.append('report_date', reportDate)
      formData.append('referring_doctor', referringDoctor.trim())
      formData.append('notes', notes.trim())
      formData.append('send_email', sendEmail)
      if (testOrderId) {
        formData.append('test_order_id', testOrderId)
      }

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const res = await testOrderService.uploadReport(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadResult(res.data)
      setStep('success')
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.response?.data?.error || 'Failed to upload report')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep('form')
    setFile(null)
    setReportTitle('')
    setNotes('')
    setError('')
    setUploadResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loadingProfile) {
    return (
      <div className="max-w-2xl mx-auto card p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </div>
    )
  }

  if (labProfile && !labProfile.is_verified) {
    return (
      <div className="max-w-2xl mx-auto card p-8 text-center py-8">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Required</h2>
        <p className="text-gray-600 mb-6">Your laboratory account needs to be verified before uploading reports.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/laboratory/profile" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Go to Profile
          </Link>
          <Link to="/laboratory" className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <Link to="/laboratory" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
                  <ArrowLeft className="w-5 h-5" /> Back
                </Link>
              </div>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Upload Lab Report</h2>
                <p className="mt-2 text-gray-600">Send a report directly to a patient</p>
              </div>

              {testOrder && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                    <ClipboardList className="w-5 h-5" />
                    Linked to Order #{testOrder.order_number}
                  </div>
                  <p className="text-sm text-blue-600">Patient: {testOrder.patient_name} • Doctor: {testOrder.doctor_name}</p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
                        patientExists ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                      placeholder="patient@example.com"
                      required
                      disabled={!!testOrder}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {verifyingPatient ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      ) : patientExists ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : null}
                    </div>
                  </div>
                  {patientExists && (
                    <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Patient found - Ready to send
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Title *</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                      placeholder="Complete Blood Count (CBC)"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    >
                      {reportTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Date</label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Referring Doctor (Optional)</label>
                  <input
                    type="text"
                    value={referringDoctor}
                    onChange={(e) => setReferringDoctor(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    placeholder="Dr. Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report File *</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                      file ? 'border-purple-300 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-purple-600" />
                        <div className="text-left">
                          <p className="font-medium text-gray-800">{file.name}</p>
                          <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-1 hover:bg-purple-200 rounded-full">
                          <X className="w-5 h-5 text-purple-600" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Click to upload</p>
                        <p className="text-sm text-gray-400">PDF, JPG, PNG (max 10MB)</p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-800">Email Notification</p>
                      <p className="text-sm text-gray-500">Notify patient when ready</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-300 peer-checked:bg-purple-600 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!patientExists || !file || !reportTitle.trim()}
                  className="w-full py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  <Send className="w-5 h-5" /> Upload & Send Report
                </button>
              </form>
            </motion.div>
          )}

          {step === 'uploading' && (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Uploading Report...</h2>
              <p className="text-gray-600 mb-6">Analyzing for critical values</p>
              <div className="max-w-xs mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className={`w-20 h-20 ${uploadResult?.has_critical_values ? 'bg-orange-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                {uploadResult?.has_critical_values ? <AlertTriangle className="w-10 h-10 text-orange-600" /> : <CheckCircle className="w-10 h-10 text-green-600" />}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {uploadResult?.has_critical_values ? 'Report Sent with Critical Values!' : 'Report Sent!'}
              </h2>
              <p className="text-gray-600 mb-6">The report has been sent to the patient.</p>

              {uploadResult?.has_critical_values && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-left">
                  <p className="font-semibold text-orange-800">Critical Values Detected</p>
                  <p className="text-sm text-orange-700">{uploadResult.critical_values_count} abnormal value(s) found.</p>
                  {uploadResult.abnormal_values?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {uploadResult.abnormal_values.map((val, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{val}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleReset} className="flex-1 px-4 py-3 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50">
                  Upload Another
                </button>
                <Link to="/laboratory/sent" className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
                  <Eye className="w-5 h-5" /> View Sent
                </Link>
              </div>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Failed</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button onClick={() => setStep('form')} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
