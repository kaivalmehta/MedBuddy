// frontend/src/components/LocationSettings.jsx
import { useState, useEffect } from 'react'
import { MapPin, Navigation, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { locationService } from '../services/location'

export default function LocationSettings({ currentLat, currentLng, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [location, setLocation] = useState({
    latitude: currentLat || null,
    longitude: currentLng || null
  })

  const getCurrentLocation = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const loc = await locationService.getCurrentLocation()
      setLocation({ latitude: loc.lat, longitude: loc.lon })
      
      // Save to backend
      await locationService.updateMyLocation(loc.lat, loc.lon)
      setSuccess('Location updated successfully!')
      
      if (onUpdate) {
        onUpdate(loc.lat, loc.lon)
      }
    } catch (err) {
      setError(err.message || 'Failed to get location')
    } finally {
      setLoading(false)
    }
  }

  const hasLocation = location.latitude && location.longitude

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <MapPin className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Your Location</h3>
          <p className="text-sm text-gray-500">
            Patients will find you based on this location
          </p>
        </div>
      </div>

      {/* Current Location Display */}
      {hasLocation && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Location is set</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Coordinates: {Number(location.latitude).toFixed(4)}, {Number(location.longitude).toFixed(4)}
          </p>
        </div>
      )}

      {!hasLocation && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Location not set</span>
          </div>
          <p className="text-xs text-amber-600 mt-1">
            Set your location so patients can find you nearby
          </p>
        </div>
      )}

      {/* Update Button */}
      <button
        onClick={getCurrentLocation}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Getting location...</span>
          </>
        ) : (
          <>
            <Navigation className="w-5 h-5" />
            <span>{hasLocation ? 'Update My Location' : 'Set My Location'}</span>
          </>
        )}
      </button>

      {/* Messages */}
      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-sm text-green-600 text-center">{success}</p>
      )}

      <p className="mt-4 text-xs text-gray-500 text-center">
        Your location is used only to help patients find healthcare facilities nearby
      </p>
    </div>
  )
}