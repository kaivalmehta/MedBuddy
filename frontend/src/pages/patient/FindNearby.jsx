// frontend/src/pages/patient/FindNearby.jsx
// Find nearby pharmacies, labs, and doctors

import { useState, useEffect } from 'react'
import { MapPin, Navigation, Search, Phone, Mail, Clock, Star, 
         Building2, Stethoscope, TestTube, Loader2, AlertCircle,
         ChevronDown, Filter, Home } from 'lucide-react'
import { locationService } from '../../services/location'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = [
  { id: 'pharmacies', label: 'Pharmacies', icon: Building2, color: 'blue' },
  { id: 'labs', label: 'Laboratories', icon: TestTube, color: 'purple' },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope, color: 'green' },
]

export default function FindNearby() {
  const [activeTab, setActiveTab] = useState('pharmacies')
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [results, setResults] = useState([])
  const [radius, setRadius] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [specializations, setSpecializations] = useState([])
  const [selectedSpecialization, setSelectedSpecialization] = useState('')
  const [homeCollectionOnly, setHomeCollectionOnly] = useState(false)

  useEffect(() => {
    getCurrentLocation()
    loadSpecializations()
  }, [])

  useEffect(() => {
    if (location) {
      searchNearby()
    }
  }, [activeTab, location, radius, selectedSpecialization, homeCollectionOnly])

  const getCurrentLocation = async () => {
    setLoadingLocation(true)
    setLocationError('')
    try {
      const loc = await locationService.getCurrentLocation()
      setLocation(loc)
    } catch (err) {
      setLocationError(err.message)
    } finally {
      setLoadingLocation(false)
    }
  }

  const loadSpecializations = async () => {
    try {
      const res = await locationService.getSpecializations()
      setSpecializations(res.data.specializations || [])
    } catch (err) {
      console.error('Failed to load specializations:', err)
    }
  }

  const searchNearby = async () => {
    if (!location) return
    
    setLoading(true)
    try {
      let res
      switch (activeTab) {
        case 'pharmacies':
          res = await locationService.getNearbyPharmacies(
            location.lat, location.lon, radius, searchQuery
          )
          setResults(res.data.pharmacies || [])
          break
        case 'labs':
          res = await locationService.getNearbyLabs(
            location.lat, location.lon, radius, 
            { test: searchQuery, homeCollection: homeCollectionOnly }
          )
          setResults(res.data.laboratories || [])
          break
        case 'doctors':
          res = await locationService.getNearbyDoctors(
            location.lat, location.lon, radius, selectedSpecialization || searchQuery
          )
          setResults(res.data.doctors || [])
          break
      }
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    searchNearby()
  }

  const openDirections = (item) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Nearby</h1>
          <p className="text-gray-600">Discover healthcare facilities near you</p>
        </div>
        
        {/* Location Status */}
        <button
          onClick={getCurrentLocation}
          disabled={loadingLocation}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
        >
          {loadingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          <span>{location ? 'Update Location' : 'Get Location'}</span>
        </button>
      </div>

      {/* Location Error */}
      {locationError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-amber-800 font-medium">{locationError}</p>
            <p className="text-amber-600 text-sm">Please enable location access to find nearby facilities.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setResults([])
              setSearchQuery('')
              setSelectedSpecialization('')
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition ${
              activeTab === tab.id
                ? `bg-white text-${tab.color}-600 shadow-sm`
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'pharmacies' ? 'Search by medication...' :
                  activeTab === 'labs' ? 'Search by test...' :
                  'Search doctors...'
                }
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Specialization Filter (Doctors only) */}
          {activeTab === 'doctors' && specializations.length > 0 && (
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Specializations</option>
              {specializations.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          )}

          {/* Home Collection Filter (Labs only) */}
          {activeTab === 'labs' && (
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={homeCollectionOnly}
                onChange={(e) => setHomeCollectionOnly(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <Home className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Home Collection</span>
            </label>
          )}

          {/* Radius */}
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>Within 5 km</option>
            <option value={10}>Within 10 km</option>
            <option value={20}>Within 20 km</option>
            <option value={50}>Within 50 km</option>
          </select>

          <button
            type="submit"
            disabled={!location || loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {location ? 'No results found. Try increasing the search radius.' : 'Enable location to search nearby facilities.'}
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm text-gray-600">{results.length} results found</p>
            
            {results.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {item.name}
                      </h3>
                      {item.rating && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-sm">
                          <Star className="w-3 h-3 fill-current" />
                          {item.rating}
                        </span>
                      )}
                    </div>
                    
                    {/* Doctor specific */}
                    {activeTab === 'doctors' && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.specialization && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                            {item.specialization}
                          </span>
                        )}
                        {item.experience_years && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {item.experience_years} years exp
                          </span>
                        )}
                        {item.consultation_fee && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                            ₹{item.consultation_fee}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Lab specific */}
                    {activeTab === 'labs' && item.offers_home_collection && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm mb-2">
                        <Home className="w-3 h-3" />
                        Home Collection Available
                      </span>
                    )}
                    
                    <div className="flex items-start gap-2 text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">
                        {item.address || item.clinic_address}
                        {item.city && `, ${item.city}`}
                        {item.state && `, ${item.state}`}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {item.phone && (
                        <a href={`tel:${item.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Phone className="w-4 h-4" />
                          {item.phone}
                        </a>
                      )}
                      {item.email && (
                        <a href={`mailto:${item.email}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Mail className="w-4 h-4" />
                          {item.email}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {item.distance_km} km
                    </div>
                    <button
                      onClick={() => openDirections(item)}
                      className="mt-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm flex items-center gap-1"
                    >
                      <Navigation className="w-4 h-4" />
                      Directions
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}