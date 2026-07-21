import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { testOrderService } from '../../services/professional'
import { 
  FlaskConical, Search, MapPin, CheckCircle, Clock, Home,
  Building, ArrowLeft, ArrowRight, Loader2, AlertCircle,
  Phone, Plus, X, Calendar, User, FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PatientOrderTest() {
  const navigate = useNavigate()
  
  // Steps: search | select_lab | tests | collection | review
  const [step, setStep] = useState('search')
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [homeCollectionOnly, setHomeCollectionOnly] = useState(false)
  const [labs, setLabs] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Selected lab
  const [selectedLab, setSelectedLab] = useState(null)
  const [labDetail, setLabDetail] = useState(null)
  const [loadingLab, setLoadingLab] = useState(false)
  
  // Order details
  const [selectedTests, setSelectedTests] = useState([])
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [urgency, setUrgency] = useState('routine')
  const [collectionType, setCollectionType] = useState('lab_visit')
  
  // Home collection
  const [homeAddress, setHomeAddress] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    landmark: '',
    contact_phone: '',
    alternate_phone: '',
    preferred_date: '',
    preferred_time_slot: 'morning',
    patient_notes: ''
  })
  
  // Manual test entry
  const [manualTest, setManualTest] = useState('')
  
  // UI state
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState(null)

  // Search labs
  const searchLabs = async () => {
    setSearchLoading(true)
    setError('')
    try {
      const params = {}
      if (searchQuery) params.query = searchQuery
      if (cityFilter) params.city = cityFilter
      if (homeCollectionOnly) params.home_collection = true
      
      const res = await testOrderService.searchLabs(params)
      setLabs(res.data || [])
    } catch (err) {
      setError('Failed to search laboratories')
    } finally {
      setSearchLoading(false)
    }
  }

  // Load lab detail
  const loadLabDetail = async (labId) => {
    setLoadingLab(true)
    try {
      const res = await testOrderService.getLabDetail(labId)
      setLabDetail(res.data)
      setStep('tests')
    } catch (err) {
      setError('Failed to load laboratory details')
    } finally {
      setLoadingLab(false)
    }
  }

  // Select lab
  const handleSelectLab = (lab) => {
    setSelectedLab(lab)
    loadLabDetail(lab.id)
  }

  // Toggle test selection
  const toggleTest = (testName) => {
    setSelectedTests(prev => 
      prev.includes(testName) 
        ? prev.filter(t => t !== testName)
        : [...prev, testName]
    )
  }

  // Add manual test
  const addManualTest = () => {
    if (manualTest.trim() && !selectedTests.includes(manualTest.trim())) {
      setSelectedTests(prev => [...prev, manualTest.trim()])
      setManualTest('')
    }
  }

  // Remove test
  const removeTest = (testName) => {
    setSelectedTests(prev => prev.filter(t => t !== testName))
  }

  // Submit order
  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    
    try {
      const orderData = {
        laboratory_id: selectedLab.id,
        tests_requested: selectedTests,
        clinical_notes: clinicalNotes,
        urgency,
        collection_type: collectionType
      }
      
      if (collectionType === 'home_collection') {
        orderData.home_collection = homeAddress
      }
      
      const res = await testOrderService.createPatientOrder(orderData)
      setOrderResult(res.data)
      setStep('success')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate estimated cost
  const estimatedCost = selectedTests.reduce((sum, testName) => {
    if (labDetail?.test_catalog) {
      const test = Object.values(labDetail.test_catalog).flat().find(t => t.test_name === testName)
      if (test) return sum + parseFloat(test.effective_price || test.price || 0)
    }
    return sum
  }, 0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      {step !== 'success' && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {['search', 'tests', 'collection', 'review'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  step === s ? 'bg-blue-600 text-white' :
                  ['search', 'tests', 'collection', 'review'].indexOf(step) > idx 
                    ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {['search', 'tests', 'collection', 'review'].indexOf(step) > idx ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : idx + 1}
                </div>
                {idx < 3 && (
                  <div className={`w-20 h-1 mx-2 ${
                    ['search', 'tests', 'collection', 'review'].indexOf(step) > idx 
                      ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Find Lab</span>
            <span>Select Tests</span>
            <span>Collection</span>
            <span>Review</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Search Labs */}
        {step === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Find a Laboratory</h2>
                <p className="text-gray-600">Search for labs near you</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by lab name..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    placeholder="City"
                    className="w-40 pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={searchLabs}
                  disabled={searchLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                </button>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={homeCollectionOnly}
                  onChange={(e) => setHomeCollectionOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <Home className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Home collection available</span>
              </label>
            </div>

            {/* Lab Results */}
            <div className="space-y-3">
              {labs.length === 0 && !searchLoading && (
                <div className="text-center py-8 text-gray-500">
                  <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Search for laboratories to get started</p>
                </div>
              )}
              
              {labs.map(lab => (
                <div
                  key={lab.id}
                  onClick={() => handleSelectLab(lab)}
                  className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{lab.name}</h3>
                        {lab.is_verified && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {lab.city}
                        </span>
                        {lab.offers_home_collection && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Home className="w-4 h-4" />
                            Home Collection
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Select Tests */}
        {step === 'tests' && (
          <motion.div
            key="tests"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card p-6"
          >
            <button
              onClick={() => { setStep('search'); setSelectedLab(null); setLabDetail(null); }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="w-5 h-5" /> Back to search
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Select Tests</h2>
                <p className="text-gray-600">{selectedLab?.name}</p>
              </div>
            </div>

            {loadingLab ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                {/* Selected Tests Summary */}
                {selectedTests.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm font-medium text-blue-800 mb-2">
                      Selected Tests ({selectedTests.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTests.map(test => (
                        <span
                          key={test}
                          className="px-3 py-1 bg-white text-blue-700 rounded-full text-sm flex items-center gap-1"
                        >
                          {test}
                          <button onClick={() => removeTest(test)}>
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {estimatedCost > 0 && (
                      <p className="mt-2 text-sm text-blue-600">
                        Estimated: ₹{estimatedCost.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {/* Test Catalog */}
                {labDetail?.test_catalog && Object.entries(labDetail.test_catalog).map(([category, tests]) => (
                  <div key={category} className="mb-6">
                    <h3 className="font-semibold text-gray-700 mb-3 capitalize">{category.replace('_', ' ')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {tests.map(test => (
                        <label
                          key={test.id}
                          className={`p-3 border rounded-lg cursor-pointer transition ${
                            selectedTests.includes(test.test_name)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedTests.includes(test.test_name)}
                              onChange={() => toggleTest(test.test_name)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{test.test_name}</p>
                              <p className="text-sm text-gray-500">₹{test.effective_price || test.price}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Manual Test Entry */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Add Custom Test</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualTest}
                      onChange={(e) => setManualTest(e.target.value)}
                      placeholder="Enter test name"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addManualTest}
                      disabled={!manualTest.trim()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Clinical Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes for Lab (Optional)
                  </label>
                  <textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special requirements or notes..."
                  />
                </div>

                <button
                  onClick={() => setStep('collection')}
                  disabled={selectedTests.length === 0}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Step 3: Collection Type */}
        {step === 'collection' && (
          <motion.div
            key="collection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card p-6"
          >
            <button
              onClick={() => setStep('tests')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-6">Collection Details</h2>

            {/* Urgency */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Urgency</label>
              <div className="flex gap-3">
                {[
                  { value: 'routine', label: 'Routine', color: 'gray' },
                  { value: 'urgent', label: 'Urgent', color: 'orange' },
                  { value: 'stat', label: 'STAT (Emergency)', color: 'red' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setUrgency(opt.value)}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition ${
                      urgency === opt.value
                        ? `border-${opt.color}-500 bg-${opt.color}-50 text-${opt.color}-700`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Collection Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">How will you provide samples?</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCollectionType('lab_visit')}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    collectionType === 'lab_visit'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="font-semibold">Visit Lab</p>
                  <p className="text-sm text-gray-500">Go to the laboratory</p>
                </button>
                
                <button
                  onClick={() => setCollectionType('home_collection')}
                  disabled={!labDetail?.offers_home_collection}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    collectionType === 'home_collection'
                      ? 'border-green-500 bg-green-50'
                      : labDetail?.offers_home_collection
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Home className="w-8 h-8 text-green-600 mb-2" />
                  <p className="font-semibold">Home Collection</p>
                  <p className="text-sm text-gray-500">
                    {labDetail?.offers_home_collection 
                      ? 'Sample collected at home' 
                      : 'Not available'}
                  </p>
                </button>
              </div>
            </div>

            {/* Home Collection Form */}
            {collectionType === 'home_collection' && (
              <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-700">Home Collection Details</h3>
                
                <input
                  type="text"
                  value={homeAddress.address_line1}
                  onChange={(e) => setHomeAddress({...homeAddress, address_line1: e.target.value})}
                  placeholder="Address Line 1 *"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  required
                />
                
                <input
                  type="text"
                  value={homeAddress.address_line2}
                  onChange={(e) => setHomeAddress({...homeAddress, address_line2: e.target.value})}
                  placeholder="Address Line 2"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={homeAddress.city}
                    onChange={(e) => setHomeAddress({...homeAddress, city: e.target.value})}
                    placeholder="City *"
                    className="px-4 py-3 border border-gray-300 rounded-xl"
                    required
                  />
                  <input
                    type="text"
                    value={homeAddress.state}
                    onChange={(e) => setHomeAddress({...homeAddress, state: e.target.value})}
                    placeholder="State *"
                    className="px-4 py-3 border border-gray-300 rounded-xl"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={homeAddress.zip_code}
                    onChange={(e) => setHomeAddress({...homeAddress, zip_code: e.target.value})}
                    placeholder="ZIP Code *"
                    className="px-4 py-3 border border-gray-300 rounded-xl"
                    required
                  />
                  <input
                    type="text"
                    value={homeAddress.landmark}
                    onChange={(e) => setHomeAddress({...homeAddress, landmark: e.target.value})}
                    placeholder="Landmark"
                    className="px-4 py-3 border border-gray-300 rounded-xl"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="tel"
                    value={homeAddress.contact_phone}
                    onChange={(e) => setHomeAddress({...homeAddress, contact_phone: e.target.value})}
                    placeholder="Contact Phone *"
                    className="px-4 py-3 border border-gray-300 rounded-xl"
                    required
                  />
                  <input
                    type="tel"
                    value={homeAddress.alternate_phone}
                    onChange={(e) => setHomeAddress({...homeAddress, alternate_phone: e.target.value})}
                    placeholder="Alternate Phone"
                    className="px-4 py-3 border border-gray-300 rounded-xl"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Preferred Date</label>
                    <input
                      type="date"
                      value={homeAddress.preferred_date}
                      onChange={(e) => setHomeAddress({...homeAddress, preferred_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Preferred Time</label>
                    <select
                      value={homeAddress.preferred_time_slot}
                      onChange={(e) => setHomeAddress({...homeAddress, preferred_time_slot: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                    >
                      <option value="morning">Morning (8AM - 12PM)</option>
                      <option value="afternoon">Afternoon (12PM - 4PM)</option>
                      <option value="evening">Evening (4PM - 8PM)</option>
                    </select>
                  </div>
                </div>
                
                <textarea
                  value={homeAddress.patient_notes}
                  onChange={(e) => setHomeAddress({...homeAddress, patient_notes: e.target.value})}
                  placeholder="Special instructions for collector..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                />
              </div>
            )}

            <button
              onClick={() => setStep('review')}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              Review Order <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card p-6"
          >
            <button
              onClick={() => setStep('collection')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-6">Review Your Order</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Laboratory */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Laboratory</h3>
              <p className="font-semibold text-gray-800">{selectedLab?.name}</p>
              <p className="text-sm text-gray-600">{selectedLab?.city}</p>
            </div>

            {/* Tests */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Tests ({selectedTests.length})</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTests.map(test => (
                  <span key={test} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {test}
                  </span>
                ))}
              </div>
              {estimatedCost > 0 && (
                <p className="mt-3 font-semibold text-gray-800">
                  Estimated Cost: ₹{estimatedCost.toFixed(2)}
                </p>
              )}
            </div>

            {/* Collection Details */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Collection</h3>
              <div className="flex items-center gap-2">
                {collectionType === 'home_collection' ? (
                  <>
                    <Home className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Home Collection</span>
                  </>
                ) : (
                  <>
                    <Building className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Visit Laboratory</span>
                  </>
                )}
                <span className={`ml-auto px-2 py-1 rounded text-xs ${
                  urgency === 'stat' ? 'bg-red-100 text-red-700' :
                  urgency === 'urgent' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {urgency.toUpperCase()}
                </span>
              </div>
              
              {collectionType === 'home_collection' && homeAddress.address_line1 && (
                <div className="mt-3 text-sm text-gray-600">
                  <p>{homeAddress.address_line1}</p>
                  {homeAddress.address_line2 && <p>{homeAddress.address_line2}</p>}
                  <p>{homeAddress.city}, {homeAddress.state} {homeAddress.zip_code}</p>
                  {homeAddress.preferred_date && (
                    <p className="mt-2">
                      Preferred: {homeAddress.preferred_date} ({homeAddress.preferred_time_slot})
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirm Order
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Success */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-8 text-center"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Placed!</h2>
            <p className="text-gray-600 mb-6">
              Your test order has been sent to the laboratory.
            </p>
            
            {orderResult && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="text-xl font-mono font-bold text-gray-800">
                  {orderResult.order_number}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Link
                to="/lab-orders"
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View My Orders
              </Link>
              <Link
                to="/dashboard"
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Go to Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
