// ============================================
// frontend/src/pages/laboratory/LabProfile.jsx
// ============================================

import { useState, useEffect } from 'react'
import { laboratoryService } from '../../services/professional'
import { FlaskConical, Save, Loader2, CheckCircle } from 'lucide-react'

export default function LabProfile() {
  const [profile, setProfile] = useState({
    name: '', license_number: '', address: '', city: '', state: '', zip_code: '', phone: '', services: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await laboratoryService.getProfile()
      setProfile(res.data)
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await laboratoryService.updateProfile(profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <FlaskConical className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">Laboratory Profile</h1>
          <p className="text-secondary-500">Manage your lab information</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Lab Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-2">Laboratory Name</label>
              <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">License Number</label>
              <input type="text" value={profile.license_number} onChange={(e) => setProfile({...profile, license_number: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Phone</label>
              <input type="text" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="input-field" />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Address</h2>
          <div className="space-y-4">
            <textarea value={profile.address} onChange={(e) => setProfile({...profile, address: e.target.value})} className="input-field" placeholder="Street Address" />
            <div className="grid grid-cols-3 gap-4">
              <input type="text" value={profile.city} onChange={(e) => setProfile({...profile, city: e.target.value})} className="input-field" placeholder="City" />
              <input type="text" value={profile.state} onChange={(e) => setProfile({...profile, state: e.target.value})} className="input-field" placeholder="State" />
              <input type="text" value={profile.zip_code} onChange={(e) => setProfile({...profile, zip_code: e.target.value})} className="input-field" placeholder="ZIP Code" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}