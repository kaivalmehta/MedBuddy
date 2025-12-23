import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pharmacyService } from '../../services/pharmacy'
import { MapPin, Star, Phone, Loader2, Search } from 'lucide-react'

export default function FindPharmacy() {
  const [location, setLocation] = useState({ lat: 37.7749, lng: -122.4194 })
  const [search, setSearch] = useState('')

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    )
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['nearbyPharmacies', location],
    queryFn: () => pharmacyService.getNearby(location.lat, location.lng, 20).then(r => r.data)
  })

  const pharmacies = data?.results || []
  const filtered = pharmacies.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-secondary-800">Find a Pharmacy</h1>
        <p className="text-secondary-500">Locate nearby pharmacies</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-12"
          placeholder="Search pharmacies..."
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((pharmacy) => (
            <div key={pharmacy.id} className="card-hover flex items-start gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-7 h-7 text-primary-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{pharmacy.name}</h3>
                <p className="text-sm text-secondary-500">{pharmacy.address}</p>
                {pharmacy.phone && (
                  <a href={`tel:${pharmacy.phone}`} className="text-sm text-primary-600 flex items-center gap-1 mt-2">
                    <Phone className="w-4 h-4" /> {pharmacy.phone}
                  </a>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-accent-500 fill-current" />
                  <span>{pharmacy.rating}</span>
                </div>
                {pharmacy.distance_km && (
                  <p className="text-xs text-secondary-400">{pharmacy.distance_km.toFixed(1)} km</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}