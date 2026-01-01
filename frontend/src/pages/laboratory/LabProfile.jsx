// frontend/src/pages/laboratory/LabProfile.jsx

import { useState, useEffect } from 'react'
import { 
  FlaskConical, Phone, Mail, MapPin, Clock, Save, Loader2, 
  CheckCircle, AlertCircle, Navigation, Shield, Home,
  FileText, Calendar, Award
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { laboratoryService } from '../../services/professional'
import { locationService } from '../../services/location'
import { motion } from 'framer-motion'

export default function LabProfile() {
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
    name: '',
    license_number: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    accreditation: '',
    description: '',
    offers_home_collection: false,
    opening_time: '08:00',
    closing_time: '20:00',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await laboratoryService.getProfile()
      const data = response.data
      setProfile(data)
      
      setFormData({
        name: data.name || '',
        license_number: data.license_number || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        accreditation: data.accreditation || '',
        description: data.description || '',
        offers_home_collection: data.offers_home_collection || false,
        opening_time: data.opening_time || '08:00',
        closing_time: data.closing_time || '20:00',
      })
    } catch (err) {
      setError('Failed to load profile')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await laboratoryService.updateProfile(formData)
      setSuccess('Profile updated successfully!')
      setEditMode(false)
      fetchProfile()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile')
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
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laboratory Profile</h1>
          <p className="text-gray-600">Manage your laboratory information</p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
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
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-amber-600" />
              Laboratory Information
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Laboratory Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number *
                  </label>
                  <input
                    type="text"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!editMode}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accreditation
                  </label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="accreditation"
                      value={formData.accreditation}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="e.g., CAP, CLIA, NABL"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={!editMode}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Brief description of your laboratory services..."
                />
              </div>

              {editMode && (
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
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
                      fetchProfile()
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </motion.div>

          {/* Services & Hours */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Services & Hours
            </h2>

            <div className="space-y-4">
              {/* Home Collection Toggle */}
              <label className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  name="offers_home_collection"
                  checked={formData.offers_home_collection}
                  onChange={handleChange}
                  disabled={!editMode}
                  className="w-5 h-5 text-amber-600 rounded"
                />
                <Home className="w-5 h-5 text-amber-600" />
                <div>
                  <span className="font-medium text-gray-900">Home Sample Collection</span>
                  <p className="text-sm text-gray-600">Enable if you offer home collection services</p>
                </div>
              </label>

              {/* Business Hours */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    name="opening_time"
                    value={formData.opening_time}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    name="closing_time"
                    value={formData.closing_time}
                    onChange={handleChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>
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
              <Shield className="w-5 h-5 text-amber-600" />
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
            ) : profile?.is_verified ? (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Verified</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Your laboratory is verified and visible to patients.
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
              <MapPin className="w-5 h-5 text-amber-600" />
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
                  Set your location so patients can find you nearby.
                </p>
              </div>
            )}

            <button
              onClick={updateLocation}
              disabled={locationLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
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
              Patients will find your lab based on this location
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
              {formData.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-5 h-5" />
                  <span className="text-sm">{formData.phone}</span>
                </div>
              )}
              {formData.accreditation && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Award className="w-5 h-5" />
                  <span className="text-sm">{formData.accreditation}</span>
                </div>
              )}
              {formData.offers_home_collection && (
                <div className="flex items-center gap-3 text-green-600">
                  <Home className="w-5 h-5" />
                  <span className="text-sm">Home Collection Available</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}