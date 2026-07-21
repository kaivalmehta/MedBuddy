// frontend/src/services/location.js
// Azure Maps Location Services API

import api from './api'

export const locationService = {
  // Find nearby pharmacies
  getNearbyPharmacies: (lat, lon, radius = 10, medication = '') => {
    const params = new URLSearchParams({ lat, lon, radius })
    if (medication) params.append('medication', medication)
    return api.get(`/location/nearby/pharmacies/?${params}`)
  },
  
  // Find nearby laboratories
  getNearbyLabs: (lat, lon, radius = 10, options = {}) => {
    const params = new URLSearchParams({ lat, lon, radius })
    if (options.test) params.append('test', options.test)
    if (options.homeCollection) params.append('home_collection', 'true')
    return api.get(`/location/nearby/labs/?${params}`)
  },
  
  // Update user's location
  updateMyLocation: (latitude, longitude, address = '') => 
  api.post('/auth/location/update/', { latitude, longitude, address }),

  // Find nearby doctors
  getNearbyDoctors: (lat, lon, radius = 10, specialization = '') => {
    const params = new URLSearchParams({ lat, lon, radius })
    if (specialization) params.append('specialization', specialization)
    return api.get(`/location/nearby/doctors/?${params}`)
  },
  
  // Geocode address to coordinates
  geocodeAddress: (address) => 
    api.get(`/location/geocode/?address=${encodeURIComponent(address)}`),
  
  // Reverse geocode coordinates to address
  reverseGeocode: (lat, lon) => 
    api.get(`/location/reverse-geocode/?lat=${lat}&lon=${lon}`),
  
  // Get list of specializations
  getSpecializations: () => 
    api.get('/location/specializations/'),
  
  // Get user's current location
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'))
        return
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        },
        (error) => {
          let message = 'Unable to get your location'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable location access.'
              break
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable.'
              break
            case error.TIMEOUT:
              message = 'Location request timed out.'
              break
          }
          reject(new Error(message))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes cache
        }
      )
    })
  }
}

export default locationService