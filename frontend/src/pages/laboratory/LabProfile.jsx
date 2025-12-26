import { useState, useEffect } from 'react'
import { laboratoryService } from '../../services/professional'
import { 
  FlaskConical, Save, Loader2, AlertCircle, CheckCircle, 
  Building, Phone, MapPin, Clock, FileText, Shield
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function LabProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    services: [],
    home_collection_available: false,
    operating_hours: {}
  })

  const availableServices = [
    'Blood Tests',
    'Urine Tests',
    'X-Ray',
    'MRI',
    'CT Scan',
    'Ultrasound',
    'ECG/EKG',
    'Pathology',
    'Microbiology',
    'Biochemistry',
    'Hematology',
    'Immunology',
    'Genetic Testing',
    'COVID-19 Testing',
    'Drug Testing',
    'Allergy Testing'
  ]

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await laboratoryService.getProfile()
      setProfile(res.data)
      setFormData({
        name: res.data.name || '',
        license_number: res.data.license_number || '',
        address: res.data.address || '',
        city: res.data.city || '',
        state: res.data.state || '',
        zip_code: res.data.zip_code || '',
        phone: res.data.phone || '',
        services: res.data.services || [],
        home_collection_available: res.data.home_collection_available || false,
        operating_hours: res.data.operating_hours || {}
      })
    } catch (err) {
      console.error('Failed to load profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleServiceToggle = (service) => {
    setFormData(prev => {
      const services = prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
      return { ...prev, services }
    })
  }

  const handleHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...prev.operating_hours[day],
          [field]: value
        }
      }
    }))
  }

  const handleDayClosed = (day, closed) => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: closed ? { closed: true } : { open: '09:00', close: '17:00' }
      }
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
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to update profile:', err)
      setError(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Laboratory Profile</h1>
          <p className="text-gray-600 mt-1">Manage your laboratory information</p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.is_verified ? (
            <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              Verified
            </span>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-5 h-5" />
              Pending Verification
            </span>
          )}
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
        >
          <AlertCircle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700"
        >
          <CheckCircle className="w-5 h-5" />
          {success}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-purple-500" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Laboratory Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-500" />
            Address
          </h2>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-500" />
            Services Offered
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availableServices.map((service) => (
              <label
                key={service}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                  formData.services.includes(service)
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.services.includes(service)}
                  onChange={() => handleServiceToggle(service)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  formData.services.includes(service)
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-gray-300'
                }`}>
                  {formData.services.includes(service) && (
                    <CheckCircle className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-sm">{service}</span>
              </label>
            ))}
          </div>

          {/* Home Collection Toggle */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Home Sample Collection</p>
                  <p className="text-sm text-gray-600">Offer sample collection at patient's home</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.home_collection_available}
                  onChange={(e) => setFormData(prev => ({ ...prev, home_collection_available: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            Operating Hours
          </h2>

          <div className="space-y-3">
            {daysOfWeek.map((day) => {
              const hours = formData.operating_hours[day] || {}
              const isClosed = hours.closed

              return (
                <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className="w-24 font-medium text-gray-700 capitalize">{day}</span>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isClosed}
                      onChange={(e) => handleDayClosed(day, e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-600">Closed</span>
                  </label>

                  {!isClosed && (
                    <>
                      <input
                        type="time"
                        value={hours.open || '09:00'}
                        onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={hours.close || '17:00'}
                        onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Verification Status */}
        {!profile?.is_verified && (
          <div className="card bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">Verification Required</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Your laboratory profile is pending verification. Please ensure all information is accurate
                  and your license document has been uploaded during registration. An admin will review
                  and verify your account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
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
        </div>
      </form>
    </div>
  )
}
