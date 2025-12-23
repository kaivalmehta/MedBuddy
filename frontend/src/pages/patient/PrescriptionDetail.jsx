// frontend/src/pages/patient/PrescriptionDetail.jsx
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Pill, AlertTriangle, Shield, Clock, User,
  Building, Calendar, ChevronDown, ChevronUp, Bell, CheckCircle,
  Info, AlertCircle, XCircle, Loader2, MapPin, Plus, Minus,
  Sun, Sunrise, Sunset, Moon, MessageSquare, CalendarDays, X
} from 'lucide-react'
import { prescriptionService, reminderService } from '../../services/prescriptions'
import { format } from 'date-fns'

export default function PrescriptionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedDrug, setExpandedDrug] = useState(null)
  const [showPharmacyModal, setShowPharmacyModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedDrugForReminder, setSelectedDrugForReminder] = useState(null)

  const { data: prescription, isLoading, error } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => prescriptionService.get(id).then(r => r.data)
  })

  const analyzeMutation = useMutation({
    mutationFn: () => prescriptionService.analyze(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['prescription', id])
    }
  })

  const openReminderModal = (drug) => {
    setSelectedDrugForReminder(drug)
    setShowReminderModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error || !prescription) {
    return (
      <div className="card text-center py-12">
        <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-secondary-800 mb-2">Prescription Not Found</h2>
        <p className="text-secondary-500 mb-4">This prescription may have been deleted.</p>
        <Link to="/prescriptions" className="btn-primary">View All Prescriptions</Link>
      </div>
    )
  }

  const getSafetyColor = (score) => {
    if (score === null || score === undefined) return 'text-gray-500 bg-gray-100'
    if (score >= 8) return 'text-emerald-600 bg-emerald-100'
    if (score >= 5) return 'text-amber-600 bg-amber-100'
    return 'text-rose-600 bg-rose-100'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-secondary-600 hover:text-secondary-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        
        <div className="flex items-center gap-3">
          {prescription.status === 'uploaded' && (
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Analyze Prescription
                </>
              )}
            </button>
          )}
          {(prescription.status === 'analyzed' || prescription.drugs?.length > 0) && (
            <button
              onClick={() => setShowPharmacyModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send to Pharmacy
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Image */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <h3 className="text-sm font-medium text-secondary-500 mb-3">Prescription Image</h3>
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
              <img
                src={prescription.image_url}
                alt="Prescription"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card with Set Reminder */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-display font-bold text-secondary-800">
                  Prescription Details
                </h1>
                <p className="text-secondary-500 mt-1">
                  Uploaded {format(new Date(prescription.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-center ${getSafetyColor(prescription.safety_score)}`}>
                <span className="text-2xl font-bold">
                  {prescription.safety_score !== null ? prescription.safety_score : 'N/A'}/10
                </span>
                <p className="text-xs font-medium">Safety Score</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <InfoCard icon={User} label="Doctor" value={prescription.doctor_name || 'Not detected'} />
              <InfoCard
                icon={Calendar}
                label="Prescription Date"
                value={prescription.prescription_date 
                  ? format(new Date(prescription.prescription_date), 'MMMM d, yyyy')
                  : 'Not detected'
                }
              />
              <InfoCard icon={Pill} label="Medications" value={`${prescription.drugs?.length || 0} medication(s)`} />
              <InfoCard icon={Building} label="Clinic" value={prescription.clinic_name || 'Not detected'} />
            </div>

            {/* Set Reminder Button - Right here in the card */}
            {prescription.drugs?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-secondary-800">Set Medication Reminder</h4>
                      <p className="text-sm text-secondary-500">Never miss a dose</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openReminderModal(prescription.drugs[0])}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Set Reminder
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Safety Analysis */}
          {prescription.safety_summary && (
            <div className="card border-l-4 border-primary-500">
              <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary-500" />
                Safety Analysis
              </h3>
              <p className="text-secondary-700 leading-relaxed">
                {prescription.safety_summary}
              </p>
            </div>
          )}

          {/* Medications */}
          <div className="card">
            <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2 mb-4">
              <Pill className="w-5 h-5 text-primary-500" />
              Medications ({prescription.drugs?.length || 0})
            </h2>

            {prescription.drugs?.length > 0 ? (
              <div className="space-y-3">
                {prescription.drugs.map((drug, idx) => (
                  <DrugCard
                    key={drug.id}
                    drug={drug}
                    index={idx}
                    isExpanded={expandedDrug === drug.id}
                    onToggle={() => setExpandedDrug(expandedDrug === drug.id ? null : drug.id)}
                    onSetReminder={() => openReminderModal(drug)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-secondary-500">
                <Pill className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No medications extracted yet</p>
              </div>
            )}
          </div>

          {/* OCR Text */}
          {prescription.ocr_raw_text && (
            <details className="card">
              <summary className="cursor-pointer font-semibold text-secondary-800 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary-500" />
                Extracted Text (OCR)
                <span className="text-sm font-normal text-secondary-500 ml-2">
                  {((prescription.ocr_confidence || 0) * 100).toFixed(0)}% confidence
                </span>
              </summary>
              <pre className="mt-4 p-4 bg-gray-50 rounded-xl text-sm text-secondary-700 whitespace-pre-wrap font-mono">
                {prescription.ocr_raw_text}
              </pre>
            </details>
          )}
        </div>
      </div>

      {/* Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && selectedDrugForReminder && (
          <ReminderModal
            drug={selectedDrugForReminder}
            allDrugs={prescription.drugs}
            onClose={() => {
              setShowReminderModal(false)
              setSelectedDrugForReminder(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Pharmacy Modal */}
      {showPharmacyModal && (
        <PharmacyModal onClose={() => setShowPharmacyModal(false)} />
      )}
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
        <Icon className="w-5 h-5 text-primary-500" />
      </div>
      <div>
        <p className="text-xs text-secondary-500">{label}</p>
        <p className="font-semibold text-secondary-800">{value}</p>
      </div>
    </div>
  )
}

function DrugCard({ drug, index, isExpanded, onToggle, onSetReminder }) {
  const severityColors = {
    minor: 'bg-blue-50 text-blue-700 border-blue-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    severe: 'bg-orange-50 text-orange-700 border-orange-200',
    contraindicated: 'bg-rose-50 text-rose-700 border-rose-200'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-gray-200 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Pill className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h4 className="font-semibold text-secondary-800">{drug.drug_name}</h4>
            <p className="text-sm text-secondary-500">
              {drug.dosage} • {drug.frequency}
              {drug.duration && ` • ${drug.duration}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {drug.interactions?.length > 0 && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {drug.interactions.length}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onSetReminder(); }}
            className="p-2 hover:bg-primary-100 rounded-lg text-primary-600 transition-colors"
            title="Set Reminder"
          >
            <Bell className="w-4 h-4" />
          </button>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-secondary-400" /> : <ChevronDown className="w-5 h-5 text-secondary-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100"
          >
            <div className="p-4 bg-gray-50 space-y-4">
              {/* Drug Info */}
              <div className="grid grid-cols-2 gap-3">
                {drug.generic_name && (
                  <div>
                    <span className="text-xs text-secondary-500">Generic Name</span>
                    <p className="font-medium text-secondary-800">{drug.generic_name}</p>
                  </div>
                )}
                {drug.category && (
                  <div>
                    <span className="text-xs text-secondary-500">Category</span>
                    <p className="font-medium text-secondary-800 capitalize">{drug.category}</p>
                  </div>
                )}
              </div>

              {drug.primary_use && (
                <div>
                  <span className="text-xs text-secondary-500">What it's for</span>
                  <p className="text-secondary-700">{drug.primary_use}</p>
                </div>
              )}

              {drug.instructions && (
                <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <span className="text-xs text-primary-600 font-medium">Instructions</span>
                  <p className="text-primary-800">{drug.instructions}</p>
                </div>
              )}

              {drug.common_side_effects?.length > 0 && (
                <div>
                  <span className="text-xs text-secondary-500">Side Effects</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {drug.common_side_effects.map((effect, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-200 rounded-full text-xs text-secondary-700">
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {drug.interactions?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-secondary-500 font-medium">Warnings</span>
                  {drug.interactions.map((interaction, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${severityColors[interaction.severity]}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium capitalize">{interaction.severity}</span>
                        <span className="text-sm">— {interaction.interacting_item}</span>
                      </div>
                      <p className="text-sm">{interaction.description}</p>
                      {interaction.recommendation && (
                        <p className="text-sm mt-1 font-medium">💡 {interaction.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Set Reminder Button inside expanded card too */}
              {/* <button
                onClick={onSetReminder}
                className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Set Reminder for {drug.drug_name}
              </button> */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ReminderModal({ drug, allDrugs, onClose }) {
  const [selectedDrug, setSelectedDrug] = useState(drug.id)
  const [timesPerDay, setTimesPerDay] = useState(1)
  const [reminderTimes, setReminderTimes] = useState(['09:00'])
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4, 5, 6])
  const [duration, setDuration] = useState('ongoing')
  const [customDays, setCustomDays] = useState(7)
  const [notes, setNotes] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [success, setSuccess] = useState(false)
  const queryClient = useQueryClient()

  const daysOfWeek = [
    { id: 0, short: 'S', full: 'Sun' },
    { id: 1, short: 'M', full: 'Mon' },
    { id: 2, short: 'T', full: 'Tue' },
    { id: 3, short: 'W', full: 'Wed' },
    { id: 4, short: 'T', full: 'Thu' },
    { id: 5, short: 'F', full: 'Fri' },
    { id: 6, short: 'S', full: 'Sat' },
  ]

  const timePresets = [
    { label: 'Morning', time: '08:00', icon: Sunrise },
    { label: 'Noon', time: '12:00', icon: Sun },
    { label: 'Evening', time: '18:00', icon: Sunset },
    { label: 'Night', time: '21:00', icon: Moon },
  ]

  const handleTimesChange = (count) => {
    const newCount = Math.max(1, Math.min(4, count))
    setTimesPerDay(newCount)
    const defaults = ['08:00', '12:00', '18:00', '21:00']
    setReminderTimes(defaults.slice(0, newCount))
  }

  const toggleDay = (dayId) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) setSelectedDays(selectedDays.filter(d => d !== dayId))
    } else {
      setSelectedDays([...selectedDays, dayId].sort())
    }
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      let endDate = null
      if (duration !== 'ongoing') {
        const days = duration === 'custom' ? customDays : parseInt(duration)
        const end = new Date()
        end.setDate(end.getDate() + days)
        endDate = end.toISOString().split('T')[0]
      }

      for (const time of reminderTimes) {
        await reminderService.create({
          prescription_drug: selectedDrug,
          reminder_time: time,
          days_of_week: selectedDays,
          start_date: new Date().toISOString().split('T')[0],
          end_date: endDate,
          notes: notes
        })
      }

      queryClient.invalidateQueries(['reminders'])
      setSuccess(true)
    } catch (e) {
      console.error(e)
      alert('Failed to create reminder')
    }
    setIsCreating(false)
  }

  const currentDrug = allDrugs.find(d => d.id === selectedDrug)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-secondary-800 mb-2">Reminder Set!</h3>
            <p className="text-secondary-500 mb-6">
              You'll be reminded to take {currentDrug?.drug_name} at your selected times.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={onClose} className="btn-secondary">Close</button>
              <Link to="/reminders" className="btn-primary">View Reminders</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-secondary-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-500" />
                Set Medication Reminder
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-secondary-400" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Select Medication */}
              {allDrugs.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Medication</label>
                  <select
                    value={selectedDrug}
                    onChange={(e) => setSelectedDrug(e.target.value)}
                    className="input-field"
                  >
                    {allDrugs.map(d => (
                      <option key={d.id} value={d.id}>{d.drug_name} - {d.dosage}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Times per day */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">How many times per day?</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleTimesChange(timesPerDay - 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    disabled={timesPerDay <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-bold text-primary-600 w-8 text-center">{timesPerDay}</span>
                  <button
                    onClick={() => handleTimesChange(timesPerDay + 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    disabled={timesPerDay >= 4}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-secondary-500">time{timesPerDay > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Time selection */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">At what time?</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {timePresets.slice(0, timesPerDay).map((preset, idx) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        const newTimes = [...reminderTimes]
                        newTimes[idx] = preset.time
                        setReminderTimes(newTimes)
                      }}
                      className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs transition-all ${
                        reminderTimes[idx] === preset.time
                          ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-400'
                          : 'bg-gray-100 hover:bg-gray-200 text-secondary-600'
                      }`}
                    >
                      <preset.icon className="w-4 h-4" />
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {reminderTimes.map((time, idx) => (
                    <input
                      key={idx}
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...reminderTimes]
                        newTimes[idx] = e.target.value
                        setReminderTimes(newTimes)
                      }}
                      className="input-field text-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Days */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Which days?</label>
                <div className="flex gap-1">
                  {daysOfWeek.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id)}
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        selectedDays.includes(day.id)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
                      }`}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-2 text-xs">
                  <button onClick={() => setSelectedDays([0,1,2,3,4,5,6])} className="text-primary-600 hover:underline">All days</button>
                  <button onClick={() => setSelectedDays([1,2,3,4,5])} className="text-primary-600 hover:underline">Weekdays</button>
                  <button onClick={() => setSelectedDays([0,6])} className="text-primary-600 hover:underline">Weekends</button>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">For how long?</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'ongoing', label: 'Ongoing' },
                    { value: '7', label: '1 Week' },
                    { value: '14', label: '2 Weeks' },
                    { value: '30', label: '1 Month' },
                    { value: 'custom', label: 'Custom' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDuration(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        duration === opt.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-secondary-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {duration === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="1"
                      value={customDays}
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 7)}
                      className="input-field w-20"
                    />
                    <span className="text-secondary-600">days</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Take with food, avoid dairy..."
                  className="input-field resize-none"
                  rows={2}
                />
              </div>

              {/* Summary */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-secondary-600">
                <strong>Summary:</strong> Remind me {timesPerDay}x daily at {reminderTimes.join(', ')} on {selectedDays.length === 7 ? 'all days' : selectedDays.map(d => daysOfWeek[d].full).join(', ')}
                {duration !== 'ongoing' && ` for ${duration === 'custom' ? customDays : duration} days`}
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Set Reminder
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

function PharmacyModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-secondary-800 mb-2">Send to Pharmacy</h3>
        <p className="text-secondary-500 mb-6">Find a nearby pharmacy and send your prescription.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <Link to="/pharmacies" className="btn-primary flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Find Pharmacies
          </Link>
        </div>
      </motion.div>
    </div>
  )
}