// frontend/src/pages/doctor/DoctorProfile.jsx

import { useState, useEffect } from 'react'
import { 
  Stethoscope, Save, Loader2, CheckCircle, AlertCircle, MapPin, 
  Navigation, Phone, Mail, Building, Award, Calendar, Shield,
  DollarSign, Clock
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { doctorService } from '../../services/professional'
import { locationService } from '../../services/location'
import { motion } from 'framer-motion'

export default function DoctorProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  
  // Location state
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [locationSuccess, setLocationSuccess] = useState('')

  const [formData, setFormData] = useState({
    specialization: '',
    qualification: '',
    registration_number: '',
    clinic_name: '',
    clinic_address: '',
    clinic_phone: '',
    consultation_fee: '',
    experience_years: '',
    bio: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await doctorService.getProfile()
      const data = res.data
      setProfile(data)
      setFormData({
        specialization: data.specialization || '',
        qualification: data.qualification || '',
        registration_number: data.registration_number || data.license_number || '',
        clinic_name: data.clinic_name || '',
        clinic_address: data.clinic_address || '',
        clinic_phone: data.clinic_phone || data.phone || '',
        consultation_fee: data.consultation_fee || '',
        experience_years: data.experience_years || '',
        bio: data.bio || '',
      })
    } catch (err) {
      setError('Failed to load profile')
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await doctorService.updateProfile(formData)
      setSuccess('Profile updated successfully!')
      setEditMode(false)
      loadProfile()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile')
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateLocation = async () => {
    setLocationLoading(true)
    setLocationError('')
    setLocationSuccess('')

    try {
      const loc = await locationService.getCurrentLocation()
      await locationService.updateMyLocation(loc.lat, loc.lon)
      setLocationSuccess('Location updated successfully!')
      setProfile(prev => ({
        ...prev,
        latitude: loc.lat,
        longitude: loc.lon
      }))
    } catch (err) {
      setLocationError(err.message || 'Failed to update location')
    } finally {
      setLocationLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Profile</h1>
            <p className="text-gray-600">Manage your professional information</p>
          </div>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Professional Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              Professional Details
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="e.g., Cardiology"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualification *
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="e.g., MBBS, MD"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    name="registration_number"
                    value={formData.registration_number}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Medical license number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleChange}
                    disabled={!editMode}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Years"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consultation Fee (₹)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="consultation_fee"
                    value={formData.consultation_fee}
                    onChange={handleChange}
                    disabled={!editMode}
                    min="0"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="e.g., 500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio / About
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!editMode}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Brief description about yourself..."
                />
              </div>
            </form>
          </motion.div>

          {/* Clinic Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              Clinic Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic / Hospital Name
                </label>
                <input
                  type="text"
                  name="clinic_name"
                  value={formData.clinic_name}
                  onChange={handleChange}
                  disabled={!editMode}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Your clinic or hospital name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    name="clinic_address"
                    value={formData.clinic_address}
                    onChange={handleChange}
                    disabled={!editMode}
                    rows={2}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Full address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="clinic_phone"
                    value={formData.clinic_phone}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Clinic contact number"
                  />
                </div>
              </div>
            </div>

            {editMode && (
              <div className="flex gap-3 pt-6 mt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false)
                    loadProfile()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Verification Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Verification Status
            </h2>

            {user?.is_suspended ? (
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Account Suspended</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  {user.suspension_reason || 'Please contact support for more information.'}
                </p>
              </div>
            ) : profile?.is_verified || user?.is_professional_verified ? (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Verified</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Your profile is verified and visible to patients.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Pending Verification</span>
                </div>
                <p className="text-sm text-amber-600 mt-1">
                  Your account is under review. You'll be notified once verified.
                </p>
              </div>
            )}
          </motion.div>

          {/* Location Settings */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Location for "Find Nearby"
            </h2>

            {profile?.latitude && profile?.longitude ? (
              <div className="p-4 bg-green-50 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Location Set</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  📍 {Number(profile.latitude).toFixed(4)}, {Number(profile.longitude).toFixed(4)}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Location Not Set</span>
                </div>
                <p className="text-sm text-amber-600 mt-1">
                  Set your clinic location so patients can find you nearby.
                </p>
              </div>
            )}

            <button
              onClick={updateLocation}
              disabled={locationLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {locationLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  {profile?.latitude ? 'Update Location' : 'Set My Location'}
                </>
              )}
            </button>

            {locationError && (
              <p className="mt-3 text-sm text-red-600 text-center">{locationError}</p>
            )}
            {locationSuccess && (
              <p className="mt-3 text-sm text-green-600 text-center">{locationSuccess}</p>
            )}

            <p className="mt-4 text-xs text-gray-500 text-center">
              Patients will find your clinic based on this location
            </p>
          </motion.div>

          {/* Quick Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5" />
                <span className="text-sm">{user?.email}</span>
              </div>
              {formData.clinic_phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-5 h-5" />
                  <span className="text-sm">{formData.clinic_phone}</span>
                </div>
              )}
              {formData.specialization && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Stethoscope className="w-5 h-5" />
                  <span className="text-sm">{formData.specialization}</span>
                </div>
              )}
              {formData.experience_years && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm">{formData.experience_years} years experience</span>
                </div>
              )}
              {formData.consultation_fee && (
                <div className="flex items-center gap-3 text-gray-600">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm">₹{formData.consultation_fee} per consultation</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}