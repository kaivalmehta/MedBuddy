// ============================================
// frontend/src/pages/doctor/CreatePrescription.jsx
// ============================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorService } from '../../services/professional'
import { FilePlus, Plus, Trash2, Send, Loader2, CheckCircle, Mail } from 'lucide-react'

export default function CreatePrescription() {
  const navigate = useNavigate()
  const [patientEmail, setPatientEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [medications, setMedications] = useState([
    { drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const addMedication = () => {
    setMedications([...medications, { drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  }

  const removeMedication = (index) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index))
    }
  }

  const updateMedication = (index, field, value) => {
    const updated = [...medications]
    updated[index][field] = value
    setMedications(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate
    const validMeds = medications.filter(m => m.drug_name && m.dosage && m.frequency)
    if (validMeds.length === 0) {
      setError('Please add at least one medication with name, dosage, and frequency')
      setLoading(false)
      return
    }

    try {
      await doctorService.createDigitalPrescription({
        patient_email: patientEmail,
        medications: validMeds,
        notes,
        send_email: sendEmail
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create prescription')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-12">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-display font-bold text-secondary-800 mb-2">
            Prescription Created!
          </h2>
          <p className="text-secondary-500 mb-6">
            The prescription has been sent to {patientEmail}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setSuccess(false); setPatientEmail(''); setMedications([{ drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]); }} className="btn-secondary">
              Create Another
            </button>
            <button onClick={() => navigate('/doctor/history')} className="btn-primary">
              View History
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
          <FilePlus className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">Create Digital Prescription</h1>
          <p className="text-secondary-500">Create and send a prescription directly to patient</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">{error}</div>
        )}

        {/* Patient Email */}
        <div className="card">
          <h2 className="text-lg font-semibold text-secondary-800 mb-4">Patient Information</h2>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Patient Email *</label>
            <input
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              className="input-field"
              placeholder="patient@example.com"
              required
            />
          </div>
        </div>

        {/* Medications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary-800">Medications</h2>
            <button type="button" onClick={addMedication} className="btn-secondary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>

          <div className="space-y-4">
            {medications.map((med, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-secondary-600">Medication {index + 1}</span>
                  {medications.length > 1 && (
                    <button type="button" onClick={() => removeMedication(index)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={med.drug_name}
                    onChange={(e) => updateMedication(index, 'drug_name', e.target.value)}
                    className="input-field"
                    placeholder="Drug Name *"
                    required
                  />
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    className="input-field"
                    placeholder="Dosage (e.g., 500mg) *"
                    required
                  />
                  <input
                    type="text"
                    value={med.frequency}
                    onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                    className="input-field"
                    placeholder="Frequency (e.g., Twice daily) *"
                    required
                  />
                  <input
                    type="text"
                    value={med.duration}
                    onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                    className="input-field"
                    placeholder="Duration (e.g., 7 days)"
                  />
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                    className="input-field md:col-span-2"
                    placeholder="Special Instructions (e.g., Take after meals)"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes & Options */}
        <div className="card">
          <h2 className="text-lg font-semibold text-secondary-800 mb-4">Additional Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-field min-h-[100px]"
            placeholder="Any additional instructions or notes for the patient..."
          />
          
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-secondary-700">Send email notification to patient</span>
            <Mail className="w-4 h-4 text-secondary-400" />
          </label>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-4">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {loading ? 'Creating Prescription...' : 'Create & Send Prescription'}
        </button>
      </form>
    </div>
  )
}