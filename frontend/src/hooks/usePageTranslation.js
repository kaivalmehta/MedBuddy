// frontend/src/hooks/usePageTranslation.js
/**
 * Hook for translating page content
 * Listens for language changes and provides translation utilities
 */

import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

// Cache for translations to avoid repeated API calls
const translationCache = new Map()

// Default UI strings for common dashboard elements
const UI_STRINGS = {
  // Dashboard
  good_morning: 'Good morning',
  good_afternoon: 'Good afternoon',
  good_evening: 'Good evening',
  health_summary: "Here's your health summary for today",
  upload_prescription: 'Upload Prescription',
  view_reminders: 'View Reminders',
  active_medications: 'Active Medications',
  taken_today: 'Taken Today',
  overdue: 'Overdue',
  pending_orders: 'Pending Orders',
  todays_doses: "Today's Doses",
  recent_prescriptions: 'Recent Prescriptions',
  view_all: 'View all',
  no_doses: 'No doses scheduled',
  no_prescriptions: 'No prescriptions yet',
  
  // Navigation
  dashboard: 'Dashboard',
  my_prescriptions: 'My Prescriptions',
  order_prescription: 'Order Prescription',
  my_rx_orders: 'My Rx Orders',
  lab_reports: 'Lab Reports',
  order_lab_test: 'Order Lab Test',
  my_lab_orders: 'My Lab Orders',
  health_alerts: 'Health Alerts',
  reminders: 'Reminders',
  pharmacy_orders: 'Pharmacy Orders',
  translate: 'Translate',
  health_profile: 'Health Profile',
  family_members: 'Family Members',
  find_nearby: 'Find Nearby',
  
  // Common actions
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  view: 'View',
  search: 'Search',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  
  // Prescription related
  medications: 'Medications',
  dosage: 'Dosage',
  frequency: 'Frequency',
  duration: 'Duration',
  instructions: 'Instructions',
  doctor_name: 'Doctor Name',
  prescription_date: 'Prescription Date',
  safety_score: 'Safety Score',
  
  // Lab reports
  test_name: 'Test Name',
  result: 'Result',
  normal_range: 'Normal Range',
  status: 'Status',
  abnormal: 'Abnormal',
  normal: 'Normal',
  critical: 'Critical',
  
  // Doctor dashboard
  sent_prescriptions: 'Sent Prescriptions',
  access_patient: 'Access Patient',
  new_prescription: 'New Prescription',
  upload_send: 'Upload & Send',
  test_orders: 'Test Orders',
  critical_alerts: 'Critical Alerts',
  my_profile: 'My Profile',
  analyze: 'Analyze',
  analyzing: 'Analyzing...',
  prescription_not_analyzed: 'Prescription Not Analyzed',
  run_ai_analysis: 'Run AI analysis to extract medications and check for interactions',
  analyze_now: 'Analyze Now',
  patient_health_context: 'Patient Health Context',
  allergies: 'Allergies',
  conditions: 'Conditions',
  medications_prescribed: 'Medications Prescribed',
}

export function usePageTranslation() {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('preferred_language') || 'en'
  })
  const [translations, setTranslations] = useState(UI_STRINGS)
  const [isTranslating, setIsTranslating] = useState(false)

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (e) => {
      const newLang = e.detail?.language || 'en'
      setCurrentLang(newLang)
    }

    // Also check localStorage on mount
    const storedLang = localStorage.getItem('preferred_language')
    if (storedLang && storedLang !== currentLang) {
      setCurrentLang(storedLang)
    }

    window.addEventListener('languageChange', handleLanguageChange)
    return () => window.removeEventListener('languageChange', handleLanguageChange)
  }, [])

  // Translate when language changes
  useEffect(() => {
    const translateStrings = async () => {
      if (currentLang === 'en') {
        setTranslations(UI_STRINGS)
        return
      }

      // Check cache first
      const cacheKey = `ui_${currentLang}`
      if (translationCache.has(cacheKey)) {
        setTranslations(translationCache.get(cacheKey))
        return
      }

      setIsTranslating(true)
      try {
        // Get all strings to translate
        const textsToTranslate = Object.values(UI_STRINGS)
        
        // Call translation API
        const response = await api.post('/translate/text/', {
          text: textsToTranslate,
          target_language: currentLang,
          is_healthcare: true
        })

        if (response.data.success && response.data.translations) {
          // Map translations back to keys
          const keys = Object.keys(UI_STRINGS)
          const translatedStrings = {}
          
          response.data.translations.forEach((t, index) => {
            translatedStrings[keys[index]] = t.translated || UI_STRINGS[keys[index]]
          })

          // Cache the translations
          translationCache.set(cacheKey, translatedStrings)
          setTranslations(translatedStrings)
        }
      } catch (err) {
        console.error('Translation failed:', err)
        // Keep English on error
        setTranslations(UI_STRINGS)
      } finally {
        setIsTranslating(false)
      }
    }

    translateStrings()
  }, [currentLang])

  // Get translated string by key
  const t = useCallback((key) => {
    return translations[key] || UI_STRINGS[key] || key
  }, [translations])

  // Translate arbitrary text
  const translateText = useCallback(async (text) => {
    if (currentLang === 'en' || !text) return text

    const cacheKey = `${currentLang}_${text}`
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)
    }

    try {
      const response = await api.post('/translate/text/', {
        text: text,
        target_language: currentLang,
        is_healthcare: true
      })

      if (response.data.success && response.data.translations?.[0]) {
        const translated = response.data.translations[0].translated
        translationCache.set(cacheKey, translated)
        return translated
      }
    } catch (err) {
      console.error('Translation failed:', err)
    }
    return text
  }, [currentLang])

  return {
    t,
    translateText,
    currentLang,
    isTranslating
  }
}

export default usePageTranslation