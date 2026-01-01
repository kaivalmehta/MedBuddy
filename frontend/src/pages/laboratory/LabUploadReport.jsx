import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { laboratoryService, testOrderService } from '../../services/professional'
import {
  Upload,
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  X,
  Send,
  Eye,
  Shield,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LabUploadReport() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  /* -------------------- FORM STATE -------------------- */
  const [email, setEmail] = useState(searchParams.get('patient') || '')
  const [reportTitle, setReportTitle] = useState('')
  const [reportType, setReportType] = useState('blood_test')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [referringDoctor, setReferringDoctor] = useState('')
  const [notes, setNotes] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [files, setFiles] = useState([])
  const [testOrderId] = useState(searchParams.get('order') || '')

  /* -------------------- UI STATE -------------------- */
  const [step, setStep] = useState('form') // form | uploading | success | error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResults, setUploadResults] = useState([])

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

  /* -------------------- INITIAL LOAD -------------------- */
  useEffect(() => {
    loadProfile()
    if (testOrderId) loadTestOrder()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await laboratoryService.getProfile()
      setLabProfile(res.data)
    } catch (err) {
      console.error('Profile load failed', err)
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
      console.error('Order load failed', err)
    }
  }

  /* -------------------- PATIENT CHECK -------------------- */
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
      setPatientExists(res.data.exists)
      if (!res.data.exists) setError('Patient not found in the system.')
    } catch {
      setPatientExists(false)
      setError('Patient not found in the system.')
    } finally {
      setVerifyingPatient(false)
    }
  }

  /* -------------------- FILE HANDLING -------------------- */
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']

    for (const file of selected) {
      if (!validTypes.includes(file.type)) {
        setError(`${file.name}: Invalid file type`)
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name}: File must be < 10MB`)
        return
      }
    }

    setFiles((prev) => [...prev, ...selected])
    setError('')
  }

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  /* -------------------- SUBMIT -------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!patientExists) return setError('Invalid patient email')
    if (!files.length) return setError('Please upload at least one file')
    if (!reportTitle.trim()) return setError('Report title required')

    setStep('uploading')
    setLoading(true)
    setError('')
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('patient_email', email.trim().toLowerCase())

      files.forEach((file) => {
        formData.append('report_files', file)
      })

      formData.append('report_title', reportTitle.trim())
      formData.append('report_type', reportType)
      formData.append('report_date', reportDate)
      formData.append('referring_doctor', referringDoctor.trim())
      formData.append('notes', notes.trim())
      formData.append('send_email', sendEmail)

      if (testOrderId) formData.append('test_order_id', testOrderId)

      const res = await testOrderService.uploadReport(formData, {
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total))
        },
      })

      setUploadResults(
        files.map((file) => ({
          file: file.name,
          ...res.data,
        }))
      )

      setStep('success')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Upload failed')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  /* -------------------- RESET -------------------- */
  const handleReset = () => {
    setStep('form')
    setFiles([])
    setNotes('')
    setReportTitle('')
    setUploadResults([])
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* -------------------- GUARDS -------------------- */
  if (loadingProfile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (labProfile && !labProfile.is_verified) {
    return (
      <div className="text-center p-10">
        <Shield className="w-12 h-12 mx-auto text-amber-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">Verification Required</h2>
        <Link to="/laboratory/profile" className="text-purple-600 underline">
          Go to profile
        </Link>
      </div>
    )
  }

  /* -------------------- UI -------------------- */
  return (
    <div className="max-w-2xl mx-auto card p-8">
      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <Link to="/laboratory" className="flex items-center gap-2 text-gray-600">
              <ArrowLeft className="w-5 h-5" /> Back
            </Link>

            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded flex gap-2">
                <AlertCircle /> {error}
              </div>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Patient email"
              className="input"
              required
            />

            <input
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Report title"
              className="input"
              required
            />

            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />
            <button type="button" onClick={() => fileInputRef.current.click()} className="btn">
              Add Files
            </button>

            {files.map((f, i) => (
              <div key={i} className="flex justify-between text-sm">
                {f.name}
                <X onClick={() => removeFile(i)} className="cursor-pointer" />
              </div>
            ))}

            <button type="submit" className="btn-primary">
              <Send /> Upload
            </button>
          </motion.form>
        )}

        {step === 'uploading' && (
          <motion.div key="uploading" className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <div className="h-2 bg-gray-200 rounded">
              <div className="h-full bg-purple-600" style={{ width: `${uploadProgress}%` }} />
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-4">Report Sent Successfully</h2>
            <button onClick={handleReset} className="btn-secondary">
              Upload More
            </button>
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div key="error" className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <button onClick={() => setStep('form')} className="btn-primary">
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
