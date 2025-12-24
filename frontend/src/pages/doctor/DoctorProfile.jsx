// ============================================
// frontend/src/pages/doctor/DoctorProfile.jsx
// ============================================

import { useState, useEffect } from 'react'
import { doctorService } from '../../services/professional'
import { Stethoscope, Save, Loader2, CheckCircle } from 'lucide-react'

export default function DoctorProfile() {
  const [profile, setProfile] = useState({
    full_name: '', specialization: '', qualification: '',
    registration_number: '', clinic_name: '', clinic_address: '', clinic_phone: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await doctorService.getProfile()
      setProfile(res.data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await doctorService.updateProfile(profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">Doctor Profile</h1>
          <p className="text-secondary-500">Manage your professional information</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Professional Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Full Name</label>
              <input type="text" value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Specialization</label>
              <input type="text" value={profile.specialization} onChange={(e) => setProfile({...profile, specialization: e.target.value})} className="input-field" placeholder="e.g., General Physician" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Qualification</label>
              <input type="text" value={profile.qualification} onChange={(e) => setProfile({...profile, qualification: e.target.value})} className="input-field" placeholder="e.g., MBBS, MD" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Registration Number</label>
              <input type="text" value={profile.registration_number} onChange={(e) => setProfile({...profile, registration_number: e.target.value})} className="input-field" />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Clinic Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Clinic Name</label>
              <input type="text" value={profile.clinic_name} onChange={(e) => setProfile({...profile, clinic_name: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Address</label>
              <textarea value={profile.clinic_address} onChange={(e) => setProfile({...profile, clinic_address: e.target.value})} className="input-field min-h-[80px]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Phone</label>
              <input type="text" value={profile.clinic_phone} onChange={(e) => setProfile({...profile, clinic_phone: e.target.value})} className="input-field" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}