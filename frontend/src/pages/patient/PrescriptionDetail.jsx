// frontend/src/pages/patient/PrescriptionDetail.jsx
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Pill, AlertTriangle, Shield, Clock, User,
  Building, Calendar, ChevronDown, ChevronUp, Bell, CheckCircle,
  Info, AlertCircle, XCircle, Loader2, MapPin, Plus, Minus,
  Sun, Sunrise, Sunset, Moon, X, Heart, Apple, Baby, Activity,
  AlertOctagon, ThumbsUp, Stethoscope, Utensils
} from 'lucide-react'
import { prescriptionService, reminderService } from '../../services/prescriptions'
import { format } from 'date-fns'

export default function PrescriptionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedDrug, setExpandedDrug] = useState(null)
  const [expandedSection, setExpandedSection] = useState(null)
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
        <Link to="/prescriptions" className="btn-primary">View All Prescriptions</Link>
      </div>
    )
  }

  const getSafetyConfig = (percentage) => {
    if (percentage === null || percentage === undefined) {
      return { color: 'gray', bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Analyzed', icon: Info }
    }
    if (percentage >= 80) {
      return { color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Safe', icon: CheckCircle }
    }
    if (percentage >= 60) {
      return { color: 'amber', bg: 'bg-amber-100', text: 'text-amber-600', label: 'Caution Needed', icon: AlertTriangle }
    }
    if (percentage >= 40) {
      return { color: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', label: 'Consult Doctor', icon: AlertCircle }
    }
    return { color: 'rose', bg: 'bg-rose-100', text: 'text-rose-600', label: 'Warning', icon: AlertOctagon }
  }

  const safetyConfig = getSafetyConfig(prescription.overall_safety_percentage)
  const SafetyIcon = safetyConfig.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-secondary-600 hover:text-secondary-800">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        
        <div className="flex items-center gap-3">
          {(prescription.status === 'uploaded' || prescription.status === 'processing') && (
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {analyzeMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
              ) : (
                <><Shield className="w-5 h-5" /> Analyze Prescription</>
              )}
            </button>
          )}
          {prescription.status === 'analyzed' && (
            <button onClick={() => setShowPharmacyModal(true)} className="btn-primary flex items-center gap-2">
              <Send className="w-5 h-5" /> Send to Pharmacy
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
              <img src={prescription.image_url} alt="Prescription" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card with Safety Percentage */}
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-display font-bold text-secondary-800">Prescription Details</h1>
                <p className="text-secondary-500 mt-1">
                  Uploaded {format(new Date(prescription.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
              
              {/* Safety Percentage Circle */}
              <div className={`${safetyConfig.bg} rounded-2xl p-4 text-center min-w-[100px]`}>
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200" />
                    <circle
                      cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none"
                      className={safetyConfig.text}
                      strokeDasharray={`${(prescription.overall_safety_percentage || 0) * 1.76} 176`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={`absolute text-lg font-bold ${safetyConfig.text}`}>
                    {prescription.overall_safety_percentage ?? '?'}%
                  </span>
                </div>
                <p className={`text-xs font-semibold mt-1 ${safetyConfig.text}`}>{safetyConfig.label}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <InfoCard icon={User} label="Doctor" value={prescription.doctor_name || 'Not detected'} />
              <InfoCard
                icon={Calendar} label="Date"
                value={prescription.prescription_date ? format(new Date(prescription.prescription_date), 'MMM d, yyyy') : 'Not detected'}
              />
              <InfoCard icon={Pill} label="Medications" value={`${prescription.drugs?.length || 0} medication(s)`} />
              <InfoCard icon={Building} label="Clinic" value={prescription.clinic_name || 'Not detected'} />
            </div>

            {/* Reminder Button */}
            {prescription.drugs?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-800">Set Medication Reminder</h4>
                    <p className="text-sm text-secondary-500">Never miss a dose</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedDrugForReminder(prescription.drugs[0]); setShowReminderModal(true) }} className="btn-primary flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Set Reminder
                </button>
              </div>
            )}
          </div>

          {/* Critical Alerts - Show First if Any */}
          {prescription.critical_alerts?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card bg-rose-50 border-2 border-rose-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-rose-700">Critical Alerts</h3>
              </div>
              <div className="space-y-3">
                {prescription.critical_alerts.map((alert, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-rose-200">
                    <h4 className="font-bold text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> {alert.title}
                    </h4>
                    <p className="text-rose-600 mt-1">{alert.message}</p>
                    {alert.action_required && (
                      <p className="mt-2 text-sm font-medium text-rose-800 bg-rose-100 p-2 rounded-lg">
                        ⚡ Action: {alert.action_required}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Safety Summary */}
          {prescription.safety_summary && (
            <div className={`card border-l-4 ${
              prescription.overall_safety_percentage >= 80 ? 'border-emerald-500 bg-emerald-50/50' :
              prescription.overall_safety_percentage >= 60 ? 'border-amber-500 bg-amber-50/50' :
              'border-rose-500 bg-rose-50/50'
            }`}>
              <div className="flex items-start gap-3">
                <SafetyIcon className={`w-6 h-6 mt-0.5 ${safetyConfig.text}`} />
                <div>
                  <h3 className="font-semibold text-secondary-800">Safety Summary</h3>
                  <p className="text-secondary-700 mt-1">{prescription.safety_summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Safe Medications */}
          {prescription.safe_medications?.length > 0 && (
            <div className="card bg-emerald-50/50 border border-emerald-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <ThumbsUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-emerald-700">Safe Medications</h3>
              </div>
              <div className="grid gap-3">
                {prescription.safe_medications.map((med, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-emerald-200">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-secondary-800">{med.drug}</span>
                      <p className="text-sm text-secondary-600">{med.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interaction Sections */}
          <div className="space-y-4">
            <InteractionSection
              title="Drug-Drug Interactions"
              icon={Pill}
              iconBg="bg-blue-500"
              items={prescription.drug_drug_interactions}
              expanded={expandedSection === 'drug_drug'}
              onToggle={() => setExpandedSection(expandedSection === 'drug_drug' ? null : 'drug_drug')}
              renderItem={(item, i) => (
                <InteractionCard key={i} severity={item.severity}>
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={item.severity} />
                    <span className="font-semibold text-secondary-800">{item.title || `${item.drug1} + ${item.drug2}`}</span>
                  </div>
                  <p className="text-secondary-600 text-sm">{item.description}</p>
                  {item.mechanism && <p className="text-secondary-500 text-xs mt-2"><strong>Why:</strong> {item.mechanism}</p>}
                  {item.recommendation && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                      💡 {item.recommendation}
                    </div>
                  )}
                </InteractionCard>
              )}
            />

            <InteractionSection
              title="Drug-Allergy Interactions"
              icon={Heart}
              iconBg="bg-rose-500"
              items={prescription.drug_allergy_interactions}
              expanded={expandedSection === 'drug_allergy'}
              onToggle={() => setExpandedSection(expandedSection === 'drug_allergy' ? null : 'drug_allergy')}
              emptyMessage="No allergy interactions detected based on your profile."
              renderItem={(item, i) => (
                <InteractionCard key={i} severity={item.severity}>
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={item.severity} />
                    <span className="font-semibold text-secondary-800">{item.drug} ↔ {item.allergy}</span>
                  </div>
                  <p className="text-secondary-600 text-sm">{item.description}</p>
                  {item.cross_reactivity && <p className="text-rose-600 text-xs mt-2"><strong>Cross-reactivity:</strong> {item.cross_reactivity}</p>}
                  {item.recommendation && (
                    <div className="mt-3 p-2 bg-rose-50 rounded-lg text-sm text-rose-700">
                      ⚠️ {item.recommendation}
                    </div>
                  )}
                </InteractionCard>
              )}
            />

            <InteractionSection
              title="Drug-Disease Interactions"
              icon={Stethoscope}
              iconBg="bg-orange-500"
              items={prescription.drug_disease_interactions}
              expanded={expandedSection === 'drug_disease'}
              onToggle={() => setExpandedSection(expandedSection === 'drug_disease' ? null : 'drug_disease')}
              emptyMessage="No disease interactions detected based on your health profile."
              renderItem={(item, i) => (
                <InteractionCard key={i} severity={item.severity}>
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={item.severity} />
                    <span className="font-semibold text-secondary-800">{item.drug} ↔ {item.condition}</span>
                  </div>
                  <p className="text-secondary-600 text-sm">{item.description}</p>
                  {item.risk && <p className="text-orange-600 text-xs mt-2"><strong>Risk:</strong> {item.risk}</p>}
                  {item.recommendation && (
                    <div className="mt-3 p-2 bg-orange-50 rounded-lg text-sm text-orange-700">
                      🏥 {item.recommendation}
                    </div>
                  )}
                </InteractionCard>
              )}
            />

            <InteractionSection
              title="Drug-Food Interactions"
              icon={Utensils}
              iconBg="bg-emerald-500"
              items={prescription.drug_food_interactions}
              expanded={expandedSection === 'drug_food'}
              onToggle={() => setExpandedSection(expandedSection === 'drug_food' ? null : 'drug_food')}
              emptyMessage="No significant food interactions found."
              renderItem={(item, i) => (
                <InteractionCard key={i} severity={item.severity}>
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={item.severity} />
                    <span className="font-semibold text-secondary-800">{item.drug} ↔ {item.food_or_drink}</span>
                  </div>
                  <p className="text-secondary-600 text-sm">{item.description}</p>
                  {item.timing && <p className="text-emerald-600 text-xs mt-2">⏰ {item.timing}</p>}
                  {item.recommendation && (
                    <div className="mt-3 p-2 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                      🍎 {item.recommendation}
                    </div>
                  )}
                </InteractionCard>
              )}
            />

            {prescription.pregnancy_warnings?.length > 0 && (
              <InteractionSection
                title="Pregnancy Warnings"
                icon={Baby}
                iconBg="bg-pink-500"
                items={prescription.pregnancy_warnings}
                expanded={expandedSection === 'pregnancy'}
                onToggle={() => setExpandedSection(expandedSection === 'pregnancy' ? null : 'pregnancy')}
                renderItem={(item, i) => (
                  <InteractionCard key={i} severity={item.severity}>
                    <div className="flex items-center gap-2 mb-2">
                      <SeverityBadge severity={item.severity} />
                      <span className="font-semibold text-secondary-800">{item.drug} - Category {item.category}</span>
                    </div>
                    <p className="text-secondary-600 text-sm">{item.warning}</p>
                    {item.recommendation && (
                      <div className="mt-3 p-2 bg-pink-50 rounded-lg text-sm text-pink-700">
                        👶 {item.recommendation}
                      </div>
                    )}
                  </InteractionCard>
                )}
              />
            )}
          </div>

          {/* Recommendations */}
          {prescription.recommendations?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-primary-500" /> General Recommendations
              </h3>
              <ul className="space-y-2">
                {prescription.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-secondary-600">
                    <CheckCircle className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Medications List */}
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
                    onSetReminder={() => { setSelectedDrugForReminder(drug); setShowReminderModal(true) }}
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

      {/* Modals */}
      <AnimatePresence>
        {showReminderModal && selectedDrugForReminder && (
          <ReminderModal
            drug={selectedDrugForReminder}
            allDrugs={prescription.drugs}
            onClose={() => { setShowReminderModal(false); setSelectedDrugForReminder(null) }}
          />
        )}
      </AnimatePresence>
      {showPharmacyModal && <PharmacyModal onClose={() => setShowPharmacyModal(false)} />}
    </div>
  )
}

// ============ Helper Components ============

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

function InteractionSection({ title, icon: Icon, iconBg, items, expanded, onToggle, emptyMessage, renderItem }) {
  const count = items?.length || 0
  
  return (
    <div className="card">
      <button onClick={onToggle} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-secondary-800">{title}</h3>
            <p className="text-sm text-secondary-500">
              {count === 0 ? 'None found' : `${count} interaction${count > 1 ? 's' : ''} found`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {count}
            </span>
          )}
          {count === 0 && <CheckCircle className="w-5 h-5 text-emerald-500" />}
          {expanded ? <ChevronUp className="w-5 h-5 text-secondary-400" /> : <ChevronDown className="w-5 h-5 text-secondary-400" />}
        </div>
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              {count === 0 ? (
                <p className="text-center text-secondary-500 py-4 flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  {emptyMessage || 'No interactions found - all clear!'}
                </p>
              ) : (
                items.map(renderItem)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InteractionCard({ severity, children }) {
  const borderColors = {
    info: 'border-l-blue-400',
    minor: 'border-l-emerald-400',
    moderate: 'border-l-amber-400',
    severe: 'border-l-orange-500',
    critical: 'border-l-rose-500'
  }
  
  return (
    <div className={`bg-gray-50 rounded-xl p-4 border-l-4 ${borderColors[severity] || 'border-l-gray-300'}`}>
      {children}
    </div>
  )
}

function SeverityBadge({ severity }) {
  const config = {
    info: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Info' },
    minor: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Minor' },
    moderate: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Moderate' },
    severe: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Severe' },
    critical: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Critical' }
  }
  const c = config[severity] || config.info
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function DrugCard({ drug, index, isExpanded, onToggle, onSetReminder }) {
  const getSafetyBg = () => {
    if (drug.safety_percentage === null) return 'bg-gray-100'
    if (drug.safety_percentage >= 80) return 'bg-emerald-100'
    if (drug.safety_percentage >= 60) return 'bg-amber-100'
    return 'bg-rose-100'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${getSafetyBg()} rounded-xl flex items-center justify-center`}>
            {drug.is_safe_to_take ? (
              <Pill className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-secondary-800">{drug.drug_name}</h4>
              {drug.safety_percentage !== null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  drug.safety_percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  drug.safety_percentage >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {drug.safety_percentage}% safe
                </span>
              )}
            </div>
            <p className="text-sm text-secondary-500">{drug.dosage} • {drug.frequency}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onSetReminder() }} className="p-2 hover:bg-primary-100 rounded-lg text-primary-600">
            <Bell className="w-4 h-4" />
          </button>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-secondary-400" /> : <ChevronDown className="w-5 h-5 text-secondary-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 space-y-4">
              {drug.special_instructions && (
                <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <p className="text-primary-800 text-sm"><strong>Special Instructions:</strong> {drug.special_instructions}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {drug.generic_name && <div><span className="text-secondary-500">Generic:</span> <span className="font-medium">{drug.generic_name}</span></div>}
                {drug.category && <div><span className="text-secondary-500">Category:</span> <span className="font-medium capitalize">{drug.category}</span></div>}
              </div>
              
              {drug.primary_use && <p className="text-secondary-600 text-sm"><strong>Used for:</strong> {drug.primary_use}</p>}
              
              {drug.safety_concerns?.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-800 text-sm font-medium mb-1">⚠️ Concerns:</p>
                  <ul className="list-disc list-inside text-amber-700 text-sm">
                    {drug.safety_concerns.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              
              {drug.common_side_effects?.length > 0 && (
                <div>
                  <span className="text-xs text-secondary-500">Possible Side Effects:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {drug.common_side_effects.map((effect, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">{effect}</span>
                    ))}
                  </div>
                </div>
              )}
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
  const [selectedDays, setSelectedDays] = useState([0,1,2,3,4,5,6])
  const [duration, setDuration] = useState('ongoing')
  const [customDays, setCustomDays] = useState(7)
  const [notes, setNotes] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [success, setSuccess] = useState(false)
  const queryClient = useQueryClient()

  const daysOfWeek = [
    { id: 0, short: 'S', full: 'Sun' }, { id: 1, short: 'M', full: 'Mon' },
    { id: 2, short: 'T', full: 'Tue' }, { id: 3, short: 'W', full: 'Wed' },
    { id: 4, short: 'T', full: 'Thu' }, { id: 5, short: 'F', full: 'Fri' },
    { id: 6, short: 'S', full: 'Sat' }
  ]

  const handleTimesChange = (count) => {
    const newCount = Math.max(1, Math.min(4, count))
    setTimesPerDay(newCount)
    setReminderTimes(['08:00', '12:00', '18:00', '21:00'].slice(0, newCount))
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
          notes
        })
      }
      queryClient.invalidateQueries(['reminders'])
      setSuccess(true)
    } catch (e) {
      alert('Failed to create reminder')
    }
    setIsCreating(false)
  }

  const currentDrug = allDrugs.find(d => d.id === selectedDrug)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Reminder Set!</h3>
            <p className="text-secondary-500 mb-6">You'll be reminded to take {currentDrug?.drug_name}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={onClose} className="btn-secondary">Close</button>
              <Link to="/reminders" className="btn-primary">View Reminders</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Bell className="w-5 h-5 text-primary-500" /> Set Reminder</h3>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-5">
              {allDrugs.length > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Medication</label>
                  <select value={selectedDrug} onChange={e => setSelectedDrug(e.target.value)} className="input-field">
                    {allDrugs.map(d => <option key={d.id} value={d.id}>{d.drug_name} - {d.dosage}</option>)}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2">Times per day</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleTimesChange(timesPerDay - 1)} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                  <span className="text-2xl font-bold text-primary-600 w-8 text-center">{timesPerDay}</span>
                  <button onClick={() => handleTimesChange(timesPerDay + 1)} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Times</label>
                <div className="grid grid-cols-4 gap-2">
                  {reminderTimes.map((time, idx) => (
                    <input key={idx} type="time" value={time} onChange={e => { const t = [...reminderTimes]; t[idx] = e.target.value; setReminderTimes(t) }} className="input-field text-sm" />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Days</label>
                <div className="flex gap-1">
                  {daysOfWeek.map(day => (
                    <button key={day.id} onClick={() => setSelectedDays(selectedDays.includes(day.id) ? selectedDays.filter(d => d !== day.id) : [...selectedDays, day.id].sort())}
                      className={`w-10 h-10 rounded-lg font-medium ${selectedDays.includes(day.id) ? 'bg-primary-500 text-white' : 'bg-gray-100'}`}>
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration</label>
                <div className="flex flex-wrap gap-2">
                  {[{ value: 'ongoing', label: 'Ongoing' }, { value: '7', label: '1 Week' }, { value: '14', label: '2 Weeks' }, { value: '30', label: '1 Month' }].map(opt => (
                    <button key={opt.value} onClick={() => setDuration(opt.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${duration === opt.value ? 'bg-primary-500 text-white' : 'bg-gray-100'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleCreate} disabled={isCreating} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Bell className="w-4 h-4" /> Set Reminder</>}
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
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Send to Pharmacy</h3>
        <p className="text-secondary-500 mb-6">Find a nearby pharmacy to send your prescription.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <Link to="/pharmacies" className="btn-primary flex items-center gap-2"><MapPin className="w-4 h-4" /> Find Pharmacies</Link>
        </div>
      </motion.div>
    </div>
  )
}