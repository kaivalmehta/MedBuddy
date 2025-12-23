// frontend/src/pages/patient/HealthProfile.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { userService } from '../../services/user'
import { motion } from 'framer-motion'
import {
  User, Heart, Droplets, Scale, Ruler, AlertCircle, Plus, X,
  Pill, Wine, Cigarette, Save, Loader2, Check, Phone, Shield
} from 'lucide-react'

export default function HealthProfile() {
  const queryClient = useQueryClient()
  const [newCondition, setNewCondition] = useState('')
  const [newAllergy, setNewAllergy] = useState('')
  const [newMedication, setNewMedication] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['healthProfile'],
    queryFn: () => userService.getHealthProfile().then(r => r.data)
  })

  const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm({
    values: profile
  })

  const updateMutation = useMutation({
    mutationFn: (data) => userService.updateHealthProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['healthProfile'])
    }
  })

  const onSubmit = (data) => {
    updateMutation.mutate(data)
  }

  const addToList = (field, value, setter) => {
    if (!value.trim()) return
    const current = watch(field) || []
    setValue(field, [...current, value.trim()], { shouldDirty: true })
    setter('')
  }

  const removeFromList = (field, index) => {
    const current = watch(field) || []
    setValue(field, current.filter((_, i) => i !== index), { shouldDirty: true })
  }

  if (isLoading) return <ProfileSkeleton />

  const conditions = watch('medical_conditions') || []
  const allergies = watch('allergies') || []
  const medications = watch('current_medications') || []
  const lifestyle = watch('lifestyle_factors') || {}

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">Health Profile</h1>
            <p className="text-secondary-500">Keep your health information updated for accurate safety analysis</p>
          </div>
          {isDirty && (
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={updateMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          )}
        </div>
      </motion.div>

      {updateMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-success-500/10 border border-success-500/20 rounded-xl flex items-center gap-3"
        >
          <Check className="w-5 h-5 text-success-500" />
          <p className="text-sm text-success-600">Profile updated successfully!</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <h2 className="text-lg font-display font-semibold text-secondary-800 mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            Basic Information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Date of Birth</label>
              <input type="date" {...register('date_of_birth')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Gender</label>
              <select {...register('gender')} className="input-field">
                <option value="">Select gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                <Droplets className="w-4 h-4 inline mr-1" />
                Blood Type
              </label>
              <select {...register('blood_type')} className="input-field">
                <option value="">Select blood type</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                <Scale className="w-4 h-4 inline mr-1" />
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                {...register('weight_kg')}
                className="input-field"
                placeholder="70.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                <Ruler className="w-4 h-4 inline mr-1" />
                Height (cm)
              </label>
              <input
                type="number"
                step="0.1"
                {...register('height_cm')}
                className="input-field"
                placeholder="175"
              />
            </div>
          </div>
        </motion.div>

        {/* Medical Conditions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-lg font-display font-semibold text-secondary-800 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-danger-500" />
            Medical Conditions
          </h2>
          <p className="text-sm text-secondary-500 mb-4">
            List any existing medical conditions (e.g., diabetes, hypertension, asthma)
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {conditions.map((condition, idx) => (
              <span key={idx} className="badge badge-danger flex items-center gap-1">
                {condition}
                <button type="button" onClick={() => removeFromList('medical_conditions', idx)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCondition}
              onChange={e => setNewCondition(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addToList('medical_conditions', newCondition, setNewCondition))}
              className="input-field flex-1"
              placeholder="Add a condition..."
            />
            <button
              type="button"
              onClick={() => addToList('medical_conditions', newCondition, setNewCondition)}
              className="btn-secondary"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Allergies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-lg font-display font-semibold text-secondary-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning-500" />
            Allergies
          </h2>
          <p className="text-sm text-secondary-500 mb-4">
            List drug allergies and food allergies (e.g., penicillin, peanuts, shellfish)
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {allergies.map((allergy, idx) => (
              <span key={idx} className="badge badge-warning flex items-center gap-1">
                {allergy}
                <button type="button" onClick={() => removeFromList('allergies', idx)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newAllergy}
              onChange={e => setNewAllergy(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addToList('allergies', newAllergy, setNewAllergy))}
              className="input-field flex-1"
              placeholder="Add an allergy..."
            />
            <button
              type="button"
              onClick={() => addToList('allergies', newAllergy, setNewAllergy)}
              className="btn-secondary"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Current Medications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h2 className="text-lg font-display font-semibold text-secondary-800 mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary-500" />
            Current Medications & Supplements
          </h2>
          <p className="text-sm text-secondary-500 mb-4">
            Include OTC drugs, vitamins, and supplements you take regularly
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {medications.map((med, idx) => (
              <span key={idx} className="badge badge-primary flex items-center gap-1">
                {med}
                <button type="button" onClick={() => removeFromList('current_medications', idx)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newMedication}
              onChange={e => setNewMedication(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addToList('current_medications', newMedication, setNewMedication))}
              className="input-field flex-1"
              placeholder="Add medication or supplement..."
            />
            <button
              type="button"
              onClick={() => addToList('current_medications', newMedication, setNewMedication)}
              className="btn-secondary"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Lifestyle Factors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h2 className="text-lg font-display font-semibold text-secondary-800 mb-6">
            Lifestyle Factors
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            <LifestyleToggle
              icon={Cigarette}
              label="Smoker"
              checked={lifestyle.smoker}
              onChange={(v) => setValue('lifestyle_factors', { ...lifestyle, smoker: v }, { shouldDirty: true })}
            />
            <LifestyleToggle
              icon={Wine}
              label="Alcohol"
              checked={lifestyle.alcohol}
              onChange={(v) => setValue('lifestyle_factors', { ...lifestyle, alcohol: v }, { shouldDirty: true })}
            />
            <LifestyleToggle
              icon={Heart}
              label="Pregnant"
              checked={lifestyle.pregnant}
              onChange={(v) => setValue('lifestyle_factors', { ...lifestyle, pregnant: v }, { shouldDirty: true })}
            />
          </div>
        </motion.div>

        {/* Emergency Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h2 className="text-lg font-display font-semibold text-secondary-800 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-success-500" />
            Emergency Contact
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Contact Name</label>
              <input
                type="text"
                {...register('emergency_contact_name')}
                className="input-field"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                {...register('emergency_contact_phone')}
                className="input-field"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </motion.div>
      </form>
    </div>
  )
}

function LifestyleToggle({ icon: Icon, label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        checked
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${checked ? 'text-primary-500' : 'text-gray-400'}`} />
        <span className={`font-medium ${checked ? 'text-primary-700' : 'text-secondary-600'}`}>
          {label}
        </span>
        {checked && <Check className="w-4 h-4 text-primary-500 ml-auto" />}
      </div>
    </button>
  )
}

function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
      ))}
    </div>
  )
}


