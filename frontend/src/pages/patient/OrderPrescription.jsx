import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, Check, ChevronRight, ChevronLeft, MapPin, 
  ShoppingCart, Package, Loader2, AlertCircle, CheckCircle,
  Pill, Plus, Minus, Store, Phone, Clock, Star, Search
} from 'lucide-react'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'

export default function OrderPrescription() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  // Wizard steps
  const [step, setStep] = useState(1)
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null)
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [selectedMedications, setSelectedMedications] = useState([])
  const [selectedPharmacy, setSelectedPharmacy] = useState(null)
  const [patientNotes, setPatientNotes] = useState('')
  const [pharmacySearch, setPharmacySearch] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Fetch prescriptions
  const { data: prescriptions, isLoading: loadingPrescriptions } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: async () => {
      const res = await api.get('/prescriptions/')
      // Handle both paginated and non-paginated responses
      return res.data?.results || res.data || []
    }
  })
  
  // Get user location
  const [userLocation, setUserLocation] = useState(null)
  
  useEffect(() => {
    if (step === 3 && !userLocation) {
      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          },
          (error) => {
            console.log('Location not available, will show all pharmacies')
            // Set default location or null to show all
            setUserLocation({ lat: null, lng: null })
          }
        )
      } else {
        setUserLocation({ lat: null, lng: null })
      }
    }
  }, [step, userLocation])
  
  // Fetch nearby pharmacies
  const { data: pharmacies, isLoading: loadingPharmacies } = useQuery({
    queryKey: ['nearby-pharmacies', userLocation],
    queryFn: async () => {
      // Build URL with location params if available
      let url = '/pharmacy/nearby/'
      if (userLocation?.lat && userLocation?.lng) {
        url += `?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=50`
      } else {
        // Fallback: get all registered pharmacies
        url = '/pharmacy/registered/'
      }
      const res = await api.get(url)
      // Handle both paginated and non-paginated responses
      return res.data?.results || res.data || []
    },
    enabled: step === 3 && userLocation !== null
  })
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/pharmacy/prescription-orders/create/', data)
      return res.data
    },
    onSuccess: (data) => {
      setOrderSuccess(data.order)
      setStep(5)
      queryClient.invalidateQueries(['prescription-orders'])
    }
  })
  
  // When prescription ID is selected, fetch full details
  useEffect(() => {
    if (selectedPrescriptionId) {
      setLoadingDetails(true)
      api.get(`/prescriptions/${selectedPrescriptionId}/`)
        .then(res => {
          const rx = res.data
          setSelectedPrescription(rx)
          
          // Extract medications from drugs array
          const drugs = rx.drugs || []
          const meds = drugs.map((drug, idx) => ({
            id: idx,
            name: drug.drug_name || drug.name || 'Unknown',
            dosage: drug.dosage || drug.strength || '',
            frequency: drug.frequency || '',
            quantity: drug.quantity || 1,
            selected: true
          }))
          setSelectedMedications(meds)
        })
        .catch(err => {
          console.error('Failed to load prescription details:', err)
        })
        .finally(() => {
          setLoadingDetails(false)
        })
    }
  }, [selectedPrescriptionId])
  
  const toggleMedication = (idx) => {
    setSelectedMedications(prev => 
      prev.map((med, i) => 
        i === idx ? { ...med, selected: !med.selected } : med
      )
    )
  }
  
  const updateQuantity = (idx, delta) => {
    setSelectedMedications(prev =>
      prev.map((med, i) =>
        i === idx ? { ...med, quantity: Math.max(1, med.quantity + delta) } : med
      )
    )
  }
  
  const filteredPharmacies = pharmacies?.filter(p => 
    p.name.toLowerCase().includes(pharmacySearch.toLowerCase()) ||
    p.address?.toLowerCase().includes(pharmacySearch.toLowerCase())
  ) || []
  
  const canProceed = () => {
    switch (step) {
      case 1: return selectedPrescriptionId !== null && selectedPrescription !== null && !loadingDetails
      case 2: return selectedMedications.some(m => m.selected)
      case 3: return selectedPharmacy !== null
      case 4: return true
      default: return false
    }
  }
  
  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    } else {
      // Submit order
      const orderData = {
        prescription_id: selectedPrescription.id,
        pharmacy_id: selectedPharmacy.id,
        selected_medications: selectedMedications
          .filter(m => m.selected)
          .map(m => ({
            name: m.name,
            dosage: m.dosage,
            quantity: m.quantity
          })),
        patient_notes: patientNotes
      }
      createOrderMutation.mutate(orderData)
    }
  }
  
  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <ShoppingCart className="w-7 h-7 text-primary-500" />
          Order Prescription
        </h1>
        <p className="text-gray-500 mt-1">
          Send your prescription to a pharmacy for fulfillment
        </p>
      </div>
      
      {/* Progress Steps */}
      {step < 5 && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Select Prescription' },
              { num: 2, label: 'Choose Medications' },
              { num: 3, label: 'Select Pharmacy' },
              { num: 4, label: 'Confirm Order' }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${step >= s.num 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span className={`ml-2 hidden sm:block text-sm ${
                  step >= s.num ? 'text-primary-600 font-medium' : 'text-gray-400'
                }`}>
                  {s.label}
                </span>
                {idx < 3 && (
                  <ChevronRight className="w-5 h-5 text-gray-300 mx-2 sm:mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Select Prescription */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl shadow-sm border p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Select a Prescription
            </h2>
            
            {loadingPrescriptions ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : !prescriptions || prescriptions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No prescriptions found</p>
                <button
                  onClick={() => navigate('/upload')}
                  className="mt-4 text-primary-600 font-medium hover:underline"
                >
                  Upload a prescription first
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(prescriptions || []).map((rx) => (
                  <button
                    key={rx.id}
                    onClick={() => setSelectedPrescriptionId(rx.id)}
                    className={`
                      w-full p-4 rounded-xl border-2 text-left transition-all
                      ${selectedPrescriptionId === rx.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {rx.doctor_name ? `Dr. ${rx.doctor_name}` : 'Prescription'}
                          {rx.drug_count > 0 && (
                            <span className="text-gray-500 ml-1">
                              • {rx.drug_count} medication{rx.drug_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {rx.clinic_name && `${rx.clinic_name} • `}
                          {new Date(rx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${selectedPrescriptionId === rx.id
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                        }
                      `}>
                        {selectedPrescriptionId === rx.id && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Loading indicator when fetching prescription details */}
            {selectedPrescriptionId && loadingDetails && (
              <div className="mt-4 flex items-center justify-center gap-2 text-primary-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading prescription details...</span>
              </div>
            )}
          </motion.div>
        )}
        
        {/* Step 2: Choose Medications */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl shadow-sm border p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary-500" />
              Select Medications to Order
            </h2>
            
            {loadingDetails ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : selectedMedications.length === 0 ? (
              <div className="text-center py-12">
                <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No medications found in this prescription</p>
                <p className="text-sm text-gray-400 mt-2">The prescription may not have been fully analyzed yet</p>
              </div>
            ) : (
            <div className="space-y-3">
              {selectedMedications.map((med, idx) => (
                <div
                  key={idx}
                  className={`
                    p-4 rounded-xl border-2 transition-all
                    ${med.selected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleMedication(idx)}
                      className={`
                        w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                        ${med.selected
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 bg-white'
                        }
                      `}
                    >
                      {med.selected && <Check className="w-4 h-4 text-white" />}
                    </button>
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{med.name}</h3>
                      {med.dosage && (
                        <p className="text-sm text-gray-500">{med.dosage}</p>
                      )}
                    </div>
                    
                    {med.selected && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Qty:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(idx, -1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{med.quantity}</span>
                          <button
                            onClick={() => updateQuantity(idx, 1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
            
            {selectedMedications.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Selected:</strong> {selectedMedications.filter(m => m.selected).length} of {selectedMedications.length} medications
              </p>
            </div>
            )}
          </motion.div>
        )}
        
        {/* Step 3: Select Pharmacy */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl shadow-sm border p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-primary-500" />
              Select a Pharmacy
            </h2>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search pharmacies..."
                value={pharmacySearch}
                onChange={(e) => setPharmacySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            {!userLocation ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
                <p className="text-gray-500">Getting your location...</p>
              </div>
            ) : loadingPharmacies ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : filteredPharmacies.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No registered pharmacies found</p>
                <p className="text-sm text-gray-400 mt-2">
                  {pharmacySearch ? 'Try a different search term' : 'Check back later as more pharmacies register'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredPharmacies.map((pharmacy) => (
                  <button
                    key={pharmacy.id}
                    onClick={() => setSelectedPharmacy(pharmacy)}
                    className={`
                      w-full p-4 rounded-xl border-2 text-left transition-all
                      ${selectedPharmacy?.id === pharmacy.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{pharmacy.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-4 h-4" />
                          {pharmacy.address}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {pharmacy.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {pharmacy.phone}
                            </span>
                          )}
                          {pharmacy.rating > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              {pharmacy.rating}
                            </span>
                          )}
                          {pharmacy.distance_km && (
                            <span>{pharmacy.distance_km.toFixed(1)} km</span>
                          )}
                        </div>
                      </div>
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${selectedPharmacy?.id === pharmacy.id
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                        }
                      `}>
                        {selectedPharmacy?.id === pharmacy.id && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
        
        {/* Step 4: Confirm Order */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl shadow-sm border p-6"
          >
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-500" />
              Confirm Your Order
            </h2>
            
            {/* Summary */}
            <div className="space-y-4">
              {/* Pharmacy */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Pharmacy</h3>
                <p className="font-medium text-gray-900">{selectedPharmacy?.name}</p>
                <p className="text-sm text-gray-500">{selectedPharmacy?.address}</p>
              </div>
              
              {/* Medications */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Medications</h3>
                <ul className="space-y-2">
                  {selectedMedications.filter(m => m.selected).map((med, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span className="text-gray-900">{med.name}</span>
                      <span className="text-gray-500">Qty: {med.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="Any allergies, preferences, or special requests..."
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>
            </div>
            
            {createOrderMutation.isError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">
                  {createOrderMutation.error?.response?.data?.error || 'Failed to create order'}
                </p>
              </div>
            )}
          </motion.div>
        )}
        
        {/* Step 5: Success */}
        {step === 5 && orderSuccess && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm border p-8 text-center"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Order Submitted!
            </h2>
            <p className="text-gray-500 mb-6">
              Your prescription order has been sent to the pharmacy.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 inline-block">
              <p className="text-sm text-gray-500">Order Number</p>
              <p className="text-xl font-mono font-bold text-primary-600">
                {orderSuccess.order_number}
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                The pharmacy will review your order and provide a quote. You'll receive an email notification.
              </p>
              
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => navigate('/prescription-orders')}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Track Order
                </button>
                <button
                  onClick={() => {
                    setStep(1)
                    setSelectedPrescription(null)
                    setSelectedMedications([])
                    setSelectedPharmacy(null)
                    setPatientNotes('')
                    setOrderSuccess(null)
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  New Order
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Navigation Buttons */}
      {step < 5 && (
        <div className="flex justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg
              ${step === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          
          <button
            onClick={handleNext}
            disabled={!canProceed() || createOrderMutation.isLoading}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg
              ${canProceed()
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {createOrderMutation.isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : step === 4 ? (
              <>
                Submit Order
                <Check className="w-5 h-5" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}