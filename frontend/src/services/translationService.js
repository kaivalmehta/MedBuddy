// frontend/src/services/translationService.js
/**
 * Translation Service for MedBuddy
 * Handles all translation API calls using Azure Translator
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: `${API_BASE_URL}/translate`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Could implement token refresh here
      console.log('Authentication required for translation');
    }
    return Promise.reject(error);
  }
);

/**
 * Translation Service API
 */
const translationService = {
  /**
   * Get all supported languages
   * @returns {Promise<Object>} List of supported languages
   */
  getSupportedLanguages: async () => {
    try {
      const response = await api.get('/languages/');
      return response.data;
    } catch (error) {
      console.error('Error fetching languages:', error);
      throw error;
    }
  },

  /**
   * Detect language of text
   * @param {string} text - Text to detect language for
   * @returns {Promise<Object>} Detected language info
   */
  detectLanguage: async (text) => {
    try {
      const response = await api.post('/detect/', { text });
      return response.data;
    } catch (error) {
      console.error('Error detecting language:', error);
      throw error;
    }
  },

  /**
   * Translate text to target language
   * @param {string|string[]} text - Text(s) to translate
   * @param {string} targetLanguage - Target language code
   * @param {string} sourceLanguage - Source language code (optional)
   * @param {boolean} isHealthcare - Use healthcare context (default true)
   * @returns {Promise<Object>} Translation result
   */
  translateText: async (text, targetLanguage, sourceLanguage = null, isHealthcare = true) => {
    try {
      const response = await api.post('/text/', {
        text,
        target_language: targetLanguage,
        source_language: sourceLanguage,
        is_healthcare: isHealthcare,
      });
      return response.data;
    } catch (error) {
      console.error('Error translating text:', error);
      throw error;
    }
  },

  /**
   * Translate prescription
   * @param {string} prescriptionId - UUID of prescription
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} Translated prescription
   */
  translatePrescription: async (prescriptionId, targetLanguage) => {
    try {
      const response = await api.post(`/prescription/${prescriptionId}/`, {
        target_language: targetLanguage,
      });
      return response.data;
    } catch (error) {
      console.error('Error translating prescription:', error);
      throw error;
    }
  },

  /**
   * Translate lab report
   * @param {string} reportId - UUID of lab report
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} Translated lab report
   */
  translateLabReport: async (reportId, targetLanguage) => {
    try {
      const response = await api.post(`/lab-report/${reportId}/`, {
        target_language: targetLanguage,
      });
      return response.data;
    } catch (error) {
      console.error('Error translating lab report:', error);
      throw error;
    }
  },

  /**
   * Translate drug information
   * @param {string} drugId - UUID of drug
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} Translated drug info
   */
  translateDrug: async (drugId, targetLanguage) => {
    try {
      const response = await api.post(`/drug/${drugId}/`, {
        target_language: targetLanguage,
      });
      return response.data;
    } catch (error) {
      console.error('Error translating drug:', error);
      throw error;
    }
  },

  /**
   * Translate safety report
   * @param {string} prescriptionId - UUID of prescription
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} Translated safety report
   */
  translateSafetyReport: async (prescriptionId, targetLanguage) => {
    try {
      const response = await api.post(`/safety-report/${prescriptionId}/`, {
        target_language: targetLanguage,
      });
      return response.data;
    } catch (error) {
      console.error('Error translating safety report:', error);
      throw error;
    }
  },

  /**
   * Get UI translations for a language
   * @param {string} languageCode - Language code
   * @returns {Promise<Object>} UI translations
   */
  getUITranslations: async (languageCode) => {
    try {
      const response = await api.get(`/ui/${languageCode}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching UI translations:', error);
      throw error;
    }
  },

  /**
   * Batch translate texts to multiple languages
   * @param {string[]} texts - Array of texts
   * @param {string[]} targetLanguages - Array of target language codes
   * @param {string} sourceLanguage - Source language code (optional)
   * @returns {Promise<Object>} Batch translation results
   */
  translateBatch: async (texts, targetLanguages, sourceLanguage = null) => {
    try {
      const response = await api.post('/batch/', {
        texts,
        target_languages: targetLanguages,
        source_language: sourceLanguage,
      });
      return response.data;
    } catch (error) {
      console.error('Error batch translating:', error);
      throw error;
    }
  },
};

export default translationService;
