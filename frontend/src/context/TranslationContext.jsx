// frontend/src/contexts/TranslationContext.jsx
/**
 * Translation Context Provider
 * Manages global language state and provides translation utilities
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translationService from '../services/translationService';

const TranslationContext = createContext(null);

// Default UI strings (English)
const DEFAULT_UI_STRINGS = {
  home: 'Home',
  prescriptions: 'Prescriptions',
  lab_reports: 'Lab Reports',
  medications: 'Medications',
  reminders: 'Reminders',
  profile: 'Profile',
  settings: 'Settings',
  logout: 'Logout',
  upload: 'Upload',
  download: 'Download',
  translate: 'Translate',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  view: 'View',
  search: 'Search',
  filter: 'Filter',
  refresh: 'Refresh',
  prescription_details: 'Prescription Details',
  doctor_name: 'Doctor Name',
  clinic_name: 'Clinic Name',
  prescription_date: 'Prescription Date',
  medications_list: 'Medications List',
  dosage: 'Dosage',
  frequency: 'Frequency',
  duration: 'Duration',
  instructions: 'Instructions',
  upload_prescription: 'Upload Prescription',
  safety_analysis: 'Safety Analysis',
  safety_score: 'Safety Score',
  safe: 'Safe',
  caution: 'Use with Caution',
  warning: 'Warning',
  danger: 'Danger',
  drug_interactions: 'Drug Interactions',
  allergies: 'Allergies',
  side_effects: 'Side Effects',
  consult_doctor: 'Consult Your Doctor',
  lab_report_details: 'Lab Report Details',
  test_name: 'Test Name',
  result: 'Result',
  normal_range: 'Normal Range',
  status: 'Status',
  abnormal: 'Abnormal',
  normal: 'Normal',
  critical: 'Critical',
  loading: 'Loading...',
  error_occurred: 'An error occurred',
  success: 'Success',
  no_results: 'No results found',
  confirm_action: 'Are you sure?',
  select_language: 'Select Language',
  translate_to: 'Translate to',
  original_text: 'Original Text',
  translated_text: 'Translated Text',
  auto_detect: 'Auto Detect Language',
};

export const TranslationProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('preferred_language') || 'en';
  });
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [uiStrings, setUiStrings] = useState(DEFAULT_UI_STRINGS);
  const [isRTL, setIsRTL] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch supported languages on mount
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await translationService.getSupportedLanguages();
        if (response.success) {
          setSupportedLanguages(response.languages);
        }
      } catch (err) {
        console.error('Failed to fetch languages:', err);
        // Use fallback languages
        setSupportedLanguages([
          { code: 'en', name: 'English', native_name: 'English', direction: 'ltr' },
          { code: 'es', name: 'Spanish', native_name: 'Español', direction: 'ltr' },
          { code: 'fr', name: 'French', native_name: 'Français', direction: 'ltr' },
          { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', direction: 'ltr' },
          { code: 'zh-Hans', name: 'Chinese (Simplified)', native_name: '简体中文', direction: 'ltr' },
          { code: 'ar', name: 'Arabic', native_name: 'العربية', direction: 'rtl' },
        ]);
      }
    };
    fetchLanguages();
  }, []);

  // Load UI translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      if (currentLanguage === 'en') {
        setUiStrings(DEFAULT_UI_STRINGS);
        setIsRTL(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await translationService.getUITranslations(currentLanguage);
        if (response.success) {
          setUiStrings(response.translations);
          setIsRTL(response.is_rtl || false);
        }
      } catch (err) {
        console.error('Failed to load translations:', err);
        setError('Failed to load translations');
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
    localStorage.setItem('preferred_language', currentLanguage);

    // Update document direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [currentLanguage]);

  // Change language
  const changeLanguage = useCallback((languageCode) => {
    setCurrentLanguage(languageCode);
    const lang = supportedLanguages.find((l) => l.code === languageCode);
    if (lang) {
      setIsRTL(lang.direction === 'rtl');
    }
  }, [supportedLanguages]);

  // Get translated string
  const t = useCallback((key) => {
    return uiStrings[key] || DEFAULT_UI_STRINGS[key] || key;
  }, [uiStrings]);

  // Translate custom text
  const translateText = useCallback(async (text, targetLang = null) => {
    try {
      const target = targetLang || currentLanguage;
      if (target === 'en') return text;
      
      const response = await translationService.translateText(text, target);
      if (response.success && response.translations.length > 0) {
        return response.translations[0].translated;
      }
      return text;
    } catch (err) {
      console.error('Translation error:', err);
      return text;
    }
  }, [currentLanguage]);

  // Get language info
  const getLanguageInfo = useCallback((code) => {
    return supportedLanguages.find((l) => l.code === code);
  }, [supportedLanguages]);

  const value = {
    currentLanguage,
    supportedLanguages,
    uiStrings,
    isRTL,
    isLoading,
    error,
    changeLanguage,
    t,
    translateText,
    getLanguageInfo,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

// Custom hook for using translation context
export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

export default TranslationContext;
