import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { testOrderService } from '../../services/professional'
import { 
  FlaskConical, Search, MapPin, CheckCircle, Clock, Home,
  Building, ArrowLeft, ArrowRight, Loader2, AlertCircle,
  Phone, Plus, X, Calendar, User, FileText, Stethoscope
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DoctorOrderTest() {
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
  const [patientEmail, setPatientEmail] = useState('')
  const [selectedTests, setSelectedTests] = useState([])
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
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
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdOrder, setCreatedOrder] = useState(null)

  // Search labs
  const handleSearch = async () => {
    setSearchLoading(true)
    setError('')
    try {
      const params = {}
      if (searchQuery) params.q = searchQuery
      if (cityFilter) params.city = cityFilter
      if (homeCollectionOnly) params.home_collection = 'true'
      
      const res = await testOrderService.searchLabs(params)
      setLabs(res.data || [])
    } catch (err) {
      setError('Failed to search laboratories')
    } finally {
      setSearchLoading(false)
    }
  }

  useEffect(() => {
    handleSearch()
  }, [])

  // Load lab detail when selected
  const handleSelectLab = async (lab) => {
    setSelectedLab(lab)
    setLoadingLab(true)
    try {
      const res = await testOrderService.getLabDetail(lab.id)
      setLabDetail(res.data)
      setStep('tests')
    } catch (err) {
      setError('Failed to load laboratory details')
    } finally {
      setLoadingLab(false)
    }
  }

  // Toggle test selection
  const toggleTest = (testName) => {
    setSelectedTests(prev => 
      prev.includes(testName)
        ? prev.filter(t => t !== testName)
        : [...prev, testName]
    )
  }

  // Submit order
  const handleSubmit = async () => {
    if (!patientEmail) {
      setError('Patient email is required')
      return
    }
    if (selectedTests.length === 0) {
      setError('Please select at least one test')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const orderData = {
        patient_email: patientEmail,
        laboratory_id: selectedLab.id,
        tests_requested: selectedTests,
        clinical_notes: clinicalNotes,
        diagnosis: diagnosis,
        urgency: urgency,
        collection_type: collectionType,
      }
      
      // Add home collection data if applicable
      if (collectionType === 'home_collection') {
        Object.assign(orderData, homeAddress)
      }
      
      const res = await testOrderService.create(orderData)
      setCreatedOrder(res.data.order)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create test order')
    } finally {
      setLoading(false)
    }
  }

  // Render steps
  const renderSearch = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Find Laboratory</h2>
        <p className="text-gray-600 mt-1">Search for a laboratory to order tests</p>
      </div>

      {/* Search Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="w-48">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="City..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={homeCollectionOnly}
              onChange={(e) => setHomeCollectionOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <Home className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Home Collection</span>
          </label>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {searchLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : labs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FlaskConical className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No laboratories found. Try a different search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {labs.map((lab) => (
            <motion.div
              key={lab.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card hover:shadow-lg transition cursor-pointer"
              onClick={() => handleSelectLab(lab)}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FlaskConical className="w-7 h-7 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{lab.name}</h3>
                    {lab.is_verified && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {lab.address}, {lab.city}, {lab.state}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {lab.phone}
                    </span>
                    <span className="text-xs text-gray-500">
                      {lab.test_count} tests available
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {lab.home_collection_available && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                        <Home className="w-3 h-3" />
                        Home Collection
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )

  const renderTestSelection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <button
        onClick={() => { setStep('search'); setSelectedLab(null); setLabDetail(null); }}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Search
      </button>

      {loadingLab ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Lab Info */}
          <div className="card p-4 mb-6 bg-purple-50 border-purple-200">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-8 h-8 text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-800">{labDetail?.name}</h3>
                <p className="text-sm text-gray-600">{labDetail?.address}, {labDetail?.city}</p>
              </div>
            </div>
          </div>

          {/* Patient Email */}
          <div className="card p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient Email *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="patient@example.com"
                required
              />
            </div>
          </div>

          {/* Test Catalog */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Select Tests *</h3>
            {labDetail?.test_catalog && Object.keys(labDetail.test_catalog).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(labDetail.test_catalog).map(([category, tests]) => (
                  <div key={category} className="card">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-500" />
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {tests.map((test) => (
                        <label
                          key={test.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            selectedTests.includes(test.test_name)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTests.includes(test.test_name)}
                            onChange={() => toggleTest(test.test_name)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">{test.test_name}</p>
                            <p className="text-xs text-gray-500">
                              ₹{test.effective_price} • {test.turnaround_time || 'N/A'}
                            </p>
                          </div>
                          {test.home_collection_available && (
                            <Home className="w-4 h-4 text-green-500" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-4 text-center text-gray-500">
                <p>No tests in catalog. You can still specify tests manually.</p>
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Enter test name and press Enter"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        toggleTest(e.target.value.trim())
                        e.target.value = ''
                      }
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Selected tests summary */}
            {selectedTests.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  Selected Tests ({selectedTests.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTests.map((test) => (
                    <span
                      key={test}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
                    >
                      {test}
                      <button
                        onClick={() => toggleTest(test)}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep('collection')}
            disabled={selectedTests.length === 0 || !patientEmail}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </>
      )}
    </motion.div>
  )

  const renderCollection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <button
        onClick={() => setStep('tests')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tests
      </button>

      <h2 className="text-xl font-bold text-gray-800 mb-6">Order Details</h2>

      {/* Urgency & Collection Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-3">Urgency</label>
          <div className="space-y-2">
            {[
              { value: 'routine', label: 'Routine', desc: 'Standard processing' },
              { value: 'urgent', label: 'Urgent', desc: 'Priority processing' },
              { value: 'stat', label: 'STAT', desc: 'Emergency - immediate' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                  urgency === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="urgency"
                  value={opt.value}
                  checked={urgency === opt.value}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <p className="font-medium text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-3">Collection Type</label>
          <div className="space-y-2">
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                collectionType === 'lab_visit' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="collection"
                value="lab_visit"
                checked={collectionType === 'lab_visit'}
                onChange={(e) => setCollectionType(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <Building className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-800">Visit Laboratory</p>
                <p className="text-xs text-gray-500">Patient visits the lab</p>
              </div>
            </label>
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                collectionType === 'home_collection' ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="collection"
                value="home_collection"
                checked={collectionType === 'home_collection'}
                onChange={(e) => setCollectionType(e.target.value)}
                className="w-4 h-4 text-green-600"
              />
              <Home className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-gray-800">Home Collection</p>
                <p className="text-xs text-gray-500">Sample collected at home</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Home Collection Form */}
      {collectionType === 'home_collection' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="card mb-6"
        >
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-green-500" />
            Home Collection Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
              <input
                type="text"
                value={homeAddress.address_line1}
                onChange={(e) => setHomeAddress({...homeAddress, address_line1: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Street address"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input
                type="text"
                value={homeAddress.address_line2}
                onChange={(e) => setHomeAddress({...homeAddress, address_line2: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Apartment, suite, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                value={homeAddress.city}
                onChange={(e) => setHomeAddress({...homeAddress, city: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input
                type="text"
                value={homeAddress.state}
                onChange={(e) => setHomeAddress({...homeAddress, state: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
              <input
                type="text"
                value={homeAddress.zip_code}
                onChange={(e) => setHomeAddress({...homeAddress, zip_code: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
              <input
                type="text"
                value={homeAddress.landmark}
                onChange={(e) => setHomeAddress({...homeAddress, landmark: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Near..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone *</label>
              <input
                type="tel"
                value={homeAddress.contact_phone}
                onChange={(e) => setHomeAddress({...homeAddress, contact_phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
              <input
                type="tel"
                value={homeAddress.alternate_phone}
                onChange={(e) => setHomeAddress({...homeAddress, alternate_phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date *</label>
              <input
                type="date"
                value={homeAddress.preferred_date}
                onChange={(e) => setHomeAddress({...homeAddress, preferred_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time *</label>
              <select
                value={homeAddress.preferred_time_slot}
                onChange={(e) => setHomeAddress({...homeAddress, preferred_time_slot: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="morning">Morning (8 AM - 12 PM)</option>
                <option value="afternoon">Afternoon (12 PM - 4 PM)</option>
                <option value="evening">Evening (4 PM - 8 PM)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
              <textarea
                value={homeAddress.patient_notes}
                onChange={(e) => setHomeAddress({...homeAddress, patient_notes: e.target.value})}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="Any special instructions for the collector..."
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Clinical Notes */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Primary diagnosis..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
            <textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Relevant clinical history, reason for tests..."
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => setStep('review')}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
      >
        Review Order
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  )

  const renderReview = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <button
        onClick={() => setStep('collection')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h2 className="text-xl font-bold text-gray-800 mb-6">Review Order</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Laboratory */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Laboratory</h3>
          <p className="font-semibold text-gray-800">{selectedLab?.name}</p>
          <p className="text-sm text-gray-600">{selectedLab?.address}, {selectedLab?.city}</p>
        </div>

        {/* Patient */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Patient</h3>
          <p className="font-semibold text-gray-800">{patientEmail}</p>
        </div>

        {/* Tests */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Tests Ordered ({selectedTests.length})</h3>
          <div className="flex flex-wrap gap-2">
            {selectedTests.map((test) => (
              <span key={test} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                {test}
              </span>
            ))}
          </div>
        </div>

        {/* Urgency & Collection */}
        <div className="card grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Urgency</h3>
            <p className="font-semibold text-gray-800 capitalize">{urgency}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Collection</h3>
            <p className="font-semibold text-gray-800">
              {collectionType === 'home_collection' ? 'Home Collection' : 'Lab Visit'}
            </p>
          </div>
        </div>

        {/* Home Collection Details */}
        {collectionType === 'home_collection' && (
          <div className="card bg-green-50 border-green-200">
            <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
              <Home className="w-4 h-4" />
              Home Collection Details
            </h3>
            <p className="text-sm text-gray-700">
              {homeAddress.address_line1}, {homeAddress.city}, {homeAddress.state} {homeAddress.zip_code}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Phone: {homeAddress.contact_phone} | Date: {homeAddress.preferred_date} | 
              Time: {homeAddress.preferred_time_slot === 'morning' ? '8 AM - 12 PM' : 
                     homeAddress.preferred_time_slot === 'afternoon' ? '12 PM - 4 PM' : '4 PM - 8 PM'}
            </p>
          </div>
        )}

        {/* Clinical Notes */}
        {(diagnosis || clinicalNotes) && (
          <div className="card">
            {diagnosis && (
              <div className="mb-2">
                <h3 className="text-sm font-medium text-gray-500">Diagnosis</h3>
                <p className="text-gray-800">{diagnosis}</p>
              </div>
            )}
            {clinicalNotes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Clinical Notes</h3>
                <p className="text-gray-800">{clinicalNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Order...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Confirm & Send Order
          </>
        )}
      </button>
    </motion.div>
  )

  const renderSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Test Order Created!</h2>
      <p className="text-gray-600 mb-2">
        Order #{createdOrder?.order_number} has been sent to the laboratory.
      </p>
      <p className="text-sm text-gray-500 mb-6">
        The patient and laboratory have been notified via email.
      </p>

      <div className="flex gap-3 justify-center">
        <Link
          to="/doctor/test-orders"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          View All Orders
        </Link>
        <button
          onClick={() => {
            setSuccess(false)
            setStep('search')
            setSelectedLab(null)
            setLabDetail(null)
            setSelectedTests([])
            setPatientEmail('')
            setClinicalNotes('')
            setDiagnosis('')
            setUrgency('routine')
            setCollectionType('lab_visit')
          }}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Create Another
        </button>
      </div>
    </motion.div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      {!success && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {['search', 'tests', 'collection', 'review'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-blue-600 text-white' :
                ['search', 'tests', 'collection', 'review'].indexOf(step) > idx ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {['search', 'tests', 'collection', 'review'].indexOf(step) > idx ? (
                  <CheckCircle className="w-5 h-5" />
                ) : idx + 1}
              </div>
              {idx < 3 && (
                <div className={`w-12 h-1 ${
                  ['search', 'tests', 'collection', 'review'].indexOf(step) > idx ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {success ? renderSuccess() :
         step === 'search' ? renderSearch() :
         step === 'tests' ? renderTestSelection() :
         step === 'collection' ? renderCollection() :
         renderReview()}
      </AnimatePresence>
    </div>
  )
}
