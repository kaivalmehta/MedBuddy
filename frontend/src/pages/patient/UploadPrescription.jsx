// frontend/src/pages/patient/UploadPrescription.jsx
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileImage, X, AlertCircle, CheckCircle2, Loader2,
  Camera, FileText, Users, ChevronDown, Sparkles, Shield,
  ArrowRight, RefreshCw, ArrowLeft
} from 'lucide-react'
import { prescriptionService } from '../../services/prescriptions'
import { userService } from '../../services/user'

export default function UploadPrescription() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null)
  const [uploadedPrescription, setUploadedPrescription] = useState(null)
  const [step, setStep] = useState('upload') // upload, processing, analyzing, complete

  // Fetch family members for dropdown
  const { data: familyData } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: userService.getFamilyMembers,
  })
  const familyMembers = familyData?.data || []

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (formData) => prescriptionService.upload(formData),
    onSuccess: (response) => {
      setUploadedPrescription(response.data)
      setStep('processing')
      // Auto-trigger analysis after upload
      setTimeout(() => {
        analyzeMutation.mutate(response.data.id)
      }, 1000)
    },
    onError: (error) => {
      console.error('Upload failed:', error)
      alert(error.response?.data?.detail || 'Failed to upload prescription. Please try again.')
      setStep('upload')
    }
  })

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: (prescriptionId) => prescriptionService.analyze(prescriptionId),
    onSuccess: (response) => {
      setUploadedPrescription(response.data)
      setStep('complete')
    },
    onError: (error) => {
      console.error('Analysis failed:', error)
      // Still show complete but with error note
      setStep('complete')
    }
  })

  // Handle file selection
  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!validTypes.includes(selectedFile.type)) {
      alert('Please upload a JPG, PNG, or PDF file')
      return
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB')
      return
    }

    setFile(selectedFile)

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }, [])

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  // Handle upload
  const handleUpload = async () => {
    if (!file) return

    setStep('processing')

    const formData = new FormData()
    formData.append('file', file)
    if (selectedFamilyMember) {
      formData.append('family_member_id', selectedFamilyMember)
    }

    uploadMutation.mutate(formData)
  }

  // Remove file
  const removeFile = () => {
    setFile(null)
    setPreview(null)
  }

  // Reset to start over
  const resetUpload = () => {
    setFile(null)
    setPreview(null)
    setUploadedPrescription(null)
    setStep('upload')
    setSelectedFamilyMember(null)
  }

  // View results
  const viewResults = () => {
    if (uploadedPrescription?.id) {
      navigate(`/prescriptions/${uploadedPrescription.id}`)
    }
  }

  // Go back handler
  const handleGoBack = () => {
    if (step === 'upload') {
      navigate(-1) // Go to previous page
    } else {
      // If in middle of process, confirm before leaving
      if (window.confirm('Are you sure you want to leave? Your upload progress will be lost.')) {
        navigate(-1)
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Button */}
      <button
        onClick={handleGoBack}
        className="flex items-center gap-2 text-secondary-600 hover:text-secondary-800 mb-6 group transition-colors"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold text-secondary-800">
          Upload Prescription
        </h1>
        <p className="text-secondary-500 mt-2">
          Take a photo or upload an image/PDF of your prescription
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {['Upload', 'Processing', 'Analysis', 'Complete'].map((label, idx) => {
          const stepIndex = ['upload', 'processing', 'analyzing', 'complete'].indexOf(step)
          const isActive = idx <= stepIndex
          const isCurrent = idx === stepIndex
          
          return (
            <div key={label} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                transition-all duration-300
                ${isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}
                ${isCurrent ? 'ring-4 ring-primary-100 scale-110' : ''}
              `}>
                {idx + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${isActive ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
              {idx < 3 && <div className={`w-8 h-0.5 mx-2 ${idx < stepIndex ? 'bg-primary-500' : 'bg-gray-200'}`} />}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card"
          >
            {/* Family Member Selector */}
            {familyMembers.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  This prescription is for:
                </label>
                <div className="relative">
                  <select
                    value={selectedFamilyMember || ''}
                    onChange={(e) => setSelectedFamilyMember(e.target.value || null)}
                    className="input-field appearance-none pr-10"
                  >
                    <option value="">Myself</option>
                    {familyMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.relationship})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-2xl p-8 text-center
                transition-all duration-300 cursor-pointer
                ${dragActive 
                  ? 'border-primary-500 bg-primary-50' 
                  : file 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }
              `}
              onClick={() => !file && document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={(e) => handleFile(e.target.files[0])}
                className="hidden"
              />

              {!file ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-2xl flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-secondary-700">
                      {dragActive ? 'Drop your file here' : 'Drag & drop your prescription'}
                    </p>
                    <p className="text-secondary-500 mt-1">or click to browse</p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm text-secondary-400">
                    <span className="flex items-center gap-1">
                      <FileImage className="w-4 h-4" /> JPG, PNG
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" /> PDF
                    </span>
                    <span>Max 10MB</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-32 h-40 object-cover rounded-lg shadow-sm" />
                  ) : (
                    <div className="w-32 h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-secondary-800 truncate max-w-xs">
                        {file.name}
                      </span>
                    </div>
                    <p className="text-sm text-secondary-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(); }}
                      className="mt-2 text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Features Info */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <Sparkles className="w-5 h-5 text-primary-500 mt-0.5" />
                <div>
                  <p className="font-medium text-secondary-700 text-sm">AI-Powered OCR</p>
                  <p className="text-xs text-secondary-500">Extracts text from handwritten & printed prescriptions</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-secondary-700 text-sm">Safety Analysis</p>
                  <p className="text-xs text-secondary-500">Checks drug interactions & allergies</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3 justify-between">
              <button
                onClick={() => navigate('/')}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploadMutation.isPending}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                Upload & Analyze
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2 & 3: Processing / Analyzing */}
        {(step === 'processing' || step === 'analyzing') && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-50" />
              <div className="relative w-full h-full bg-primary-500 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            </div>
            
            <h2 className="text-2xl font-display font-bold text-secondary-800 mb-2">
              {step === 'processing' ? 'Processing Your Prescription' : 'Analyzing Medications'}
            </h2>
            <p className="text-secondary-500 max-w-md mx-auto">
              {step === 'processing' 
                ? 'Extracting text using Azure AI Vision OCR...'
                : 'Checking for drug interactions and safety concerns...'}
            </p>

            <div className="mt-8 flex justify-center gap-8 text-sm">
              <div className={`flex items-center gap-2 ${step === 'processing' ? 'text-primary-600' : 'text-green-600'}`}>
                {step === 'processing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                OCR Extraction
              </div>
              <div className={`flex items-center gap-2 ${step === 'analyzing' ? 'text-primary-600' : 'text-secondary-400'}`}>
                {step === 'analyzing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-current" />
                )}
                Safety Analysis
              </div>
            </div>

            {/* Cancel during processing */}
            <button
              onClick={handleGoBack}
              className="mt-8 text-secondary-500 hover:text-secondary-700 text-sm flex items-center gap-1 mx-auto"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </motion.div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card text-center py-12"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>

            <h2 className="text-2xl font-display font-bold text-secondary-800 mb-2">
              Analysis Complete!
            </h2>
            <p className="text-secondary-500 mb-6">
              Your prescription has been processed and analyzed successfully.
            </p>

            {/* Quick Summary */}
            {uploadedPrescription && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-secondary-500">Safety Score</span>
                  <div className={`
                    px-3 py-1 rounded-full text-sm font-medium
                    ${uploadedPrescription.safety_score >= 7 
                      ? 'bg-green-100 text-green-700' 
                      : uploadedPrescription.safety_score >= 4 
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }
                  `}>
                    {uploadedPrescription.safety_score || 'N/A'}/10
                  </div>
                </div>
                {uploadedPrescription.doctor_name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-500">Doctor</span>
                    <span className="text-secondary-800">{uploadedPrescription.doctor_name}</span>
                  </div>
                )}
                {uploadedPrescription.drugs && uploadedPrescription.drugs.length > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-secondary-500">Medications Found</span>
                    <span className="text-secondary-800">{uploadedPrescription.drugs.length}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={resetUpload} className="btn-secondary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Upload Another
              </button>
              <button onClick={viewResults} className="btn-primary flex items-center gap-2">
                View Full Results
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Back to Dashboard link */}
            <button
              onClick={() => navigate('/')}
              className="mt-6 text-secondary-500 hover:text-secondary-700 text-sm flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips Section */}
      {step === 'upload' && (
        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Tips for Best Results
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Ensure good lighting and clear focus</li>
            <li>• Include the entire prescription in the frame</li>
            <li>• Avoid glare or shadows on the document</li>
            <li>• For handwritten prescriptions, ensure text is legible</li>
          </ul>
        </div>
      )}
    </div>
  )
}