// frontend/src/components/Translation/TranslationPanel.jsx
/**
 * Translation Panel Component
 * Beautiful, user-friendly interface for translating medical content
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import translationService from '../../services/translationService';
import './TranslationPanel.css';

// Icons as SVG components
const TranslateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 8 6 6"/>
    <path d="m4 14 6-6 2-3"/>
    <path d="M2 5h12"/>
    <path d="M7 2h1"/>
    <path d="m22 22-5-10-5 10"/>
    <path d="M14 18h6"/>
  </svg>
);

const SwapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3 4 7l4 4"/>
    <path d="M4 7h16"/>
    <path d="m16 21 4-4-4-4"/>
    <path d="M20 17H4"/>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
  </div>
);

const TranslationPanel = ({ 
  initialText = '', 
  documentType = 'general',
  documentId = null,
  onTranslationComplete = null,
  compact = false 
}) => {
  const { currentLanguage, supportedLanguages, t, isRTL } = useTranslation();
  
  const [sourceText, setSourceText] = useState(initialText);
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState(currentLanguage === 'en' ? 'es' : currentLanguage);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // Popular languages for quick access
  const popularLanguages = ['en', 'es', 'fr', 'de', 'hi', 'zh-Hans', 'ar', 'pt', 'ru', 'ja'];

  useEffect(() => {
    setSourceText(initialText);
    setCharCount(initialText.length);
  }, [initialText]);

  // Detect language when source text changes
  useEffect(() => {
    const detectLang = async () => {
      if (sourceText.length > 10 && sourceLanguage === 'auto') {
        try {
          const result = await translationService.detectLanguage(sourceText);
          if (result.success && result.language) {
            setDetectedLanguage(result.language);
          }
        } catch (err) {
          console.error('Detection error:', err);
        }
      }
    };

    const debounce = setTimeout(detectLang, 500);
    return () => clearTimeout(debounce);
  }, [sourceText, sourceLanguage]);

  // Translate text
  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) {
      setError('Please enter text to translate');
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      let result;
      
      // Use document-specific translation if available
      if (documentType === 'prescription' && documentId) {
        result = await translationService.translatePrescription(documentId, targetLanguage);
      } else if (documentType === 'lab-report' && documentId) {
        result = await translationService.translateLabReport(documentId, targetLanguage);
      } else if (documentType === 'drug' && documentId) {
        result = await translationService.translateDrug(documentId, targetLanguage);
      } else {
        // General text translation
        result = await translationService.translateText(
          sourceText,
          targetLanguage,
          sourceLanguage === 'auto' ? null : sourceLanguage,
          true // healthcare context
        );
      }

      if (result.success) {
        if (result.translations && result.translations.length > 0) {
          setTranslatedText(result.translations[0].translated);
          if (result.translations[0].detected_language) {
            setDetectedLanguage(result.translations[0].detected_language);
          }
        } else if (result.translated_prescription) {
          // Handle prescription translation
          const tp = result.translated_prescription;
          const translatedParts = [];
          if (tp.ocr_raw_text_translated) translatedParts.push(tp.ocr_raw_text_translated);
          if (tp.safety_summary_translated) translatedParts.push(`\n\n${tp.safety_summary_translated}`);
          setTranslatedText(translatedParts.join('') || 'Translation completed');
        }

        if (onTranslationComplete) {
          onTranslationComplete(result);
        }
      } else {
        setError(result.error || 'Translation failed');
      }
    } catch (err) {
      setError(err.message || 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, targetLanguage, sourceLanguage, documentType, documentId, onTranslationComplete]);

  // Swap languages
  const handleSwapLanguages = () => {
    if (sourceLanguage !== 'auto' && translatedText) {
      const tempLang = sourceLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(tempLang);
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  // Copy to clipboard
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Text-to-speech
  const handleSpeak = (text, lang) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Get language display name
  const getLanguageName = (code) => {
    if (code === 'auto') return 'Detect Language';
    const lang = supportedLanguages.find(l => l.code === code);
    return lang ? `${lang.name} (${lang.native_name})` : code;
  };

  // Filter and sort languages for dropdown
  const getLanguageOptions = (includeAuto = false) => {
    const options = includeAuto ? [{ code: 'auto', name: 'Detect Language', native_name: '🌐' }] : [];
    
    // Add popular languages first
    popularLanguages.forEach(code => {
      const lang = supportedLanguages.find(l => l.code === code);
      if (lang) options.push(lang);
    });
    
    // Add separator
    if (supportedLanguages.length > popularLanguages.length) {
      options.push({ code: 'separator', name: '───────────', native_name: '', disabled: true });
    }
    
    // Add remaining languages
    supportedLanguages.forEach(lang => {
      if (!popularLanguages.includes(lang.code)) {
        options.push(lang);
      }
    });
    
    return options;
  };

  return (
    <div className={`translation-panel ${compact ? 'compact' : ''} ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="translation-header">
        <div className="translation-title">
          <TranslateIcon />
          <h2>Translate</h2>
        </div>
        <div className="translation-badge">
          <span className="badge-azure">Powered by Azure AI</span>
        </div>
      </div>

      {/* Language Selectors */}
      <div className="language-selectors">
        <div className="language-select-wrapper">
          <label>From</label>
          <select
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
            className="language-select"
          >
            {getLanguageOptions(true).map((lang) => (
              <option 
                key={lang.code} 
                value={lang.code}
                disabled={lang.disabled}
              >
                {lang.code === 'auto' 
                  ? `🌐 ${lang.name}${detectedLanguage ? ` (${getLanguageName(detectedLanguage).split(' ')[0]})` : ''}`
                  : `${lang.native_name} - ${lang.name}`
                }
              </option>
            ))}
          </select>
        </div>

        <button 
          className="swap-button" 
          onClick={handleSwapLanguages}
          disabled={sourceLanguage === 'auto' || !translatedText}
          title="Swap languages"
        >
          <SwapIcon />
        </button>

        <div className="language-select-wrapper">
          <label>To</label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="language-select"
          >
            {getLanguageOptions(false).map((lang) => (
              <option 
                key={lang.code} 
                value={lang.code}
                disabled={lang.disabled || lang.code === sourceLanguage}
              >
                {`${lang.native_name} - ${lang.name}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Language Pills */}
      <div className="quick-languages">
        <span className="quick-label">Quick select:</span>
        {popularLanguages.slice(0, 6).map((code) => {
          const lang = supportedLanguages.find(l => l.code === code);
          if (!lang) return null;
          return (
            <button
              key={code}
              className={`language-pill ${targetLanguage === code ? 'active' : ''}`}
              onClick={() => setTargetLanguage(code)}
            >
              {lang.native_name}
            </button>
          );
        })}
      </div>

      {/* Translation Area */}
      <div className="translation-content">
        {/* Source Text */}
        <div className="text-panel source-panel">
          <div className="panel-header">
            <span className="panel-label">
              {sourceLanguage === 'auto' && detectedLanguage 
                ? `Detected: ${getLanguageName(detectedLanguage).split(' ')[0]}` 
                : 'Source Text'
              }
            </span>
            <span className="char-count">{charCount}/10,000</span>
          </div>
          <textarea
            className="translation-textarea"
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              setCharCount(e.target.value.length);
            }}
            placeholder="Enter text to translate... (Prescriptions, medication instructions, lab reports)"
            maxLength={10000}
          />
          <div className="panel-actions">
            {sourceText && (
              <>
                <button 
                  className="action-btn" 
                  onClick={() => handleSpeak(sourceText, sourceLanguage === 'auto' ? (detectedLanguage || 'en') : sourceLanguage)}
                  title="Listen"
                >
                  <SpeakerIcon />
                </button>
                <button 
                  className="action-btn" 
                  onClick={() => handleCopy(sourceText)}
                  title="Copy"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
                <button 
                  className="action-btn clear-btn" 
                  onClick={() => {
                    setSourceText('');
                    setTranslatedText('');
                    setCharCount(0);
                  }}
                  title="Clear"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>

        {/* Translate Button */}
        <div className="translate-button-container">
          <button
            className={`translate-btn ${isTranslating ? 'translating' : ''}`}
            onClick={handleTranslate}
            disabled={isTranslating || !sourceText.trim()}
          >
            {isTranslating ? (
              <>
                <LoadingSpinner />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <TranslateIcon />
                <span>Translate</span>
              </>
            )}
          </button>
        </div>

        {/* Translated Text */}
        <div className={`text-panel target-panel ${supportedLanguages.find(l => l.code === targetLanguage)?.direction === 'rtl' ? 'rtl-text' : ''}`}>
          <div className="panel-header">
            <span className="panel-label">{getLanguageName(targetLanguage)}</span>
          </div>
          <div className="translation-result">
            {isTranslating ? (
              <div className="translating-placeholder">
                <LoadingSpinner />
                <span>Translating your medical content...</span>
              </div>
            ) : translatedText ? (
              <p className="translated-content">{translatedText}</p>
            ) : (
              <p className="placeholder-text">Translation will appear here</p>
            )}
          </div>
          <div className="panel-actions">
            {translatedText && (
              <>
                <button 
                  className="action-btn" 
                  onClick={() => handleSpeak(translatedText, targetLanguage)}
                  title="Listen"
                >
                  <SpeakerIcon />
                </button>
                <button 
                  className="action-btn" 
                  onClick={() => handleCopy(translatedText)}
                  title="Copy"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="translation-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button className="dismiss-error" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Healthcare Notice */}
      <div className="healthcare-notice">
        <span className="notice-icon">🏥</span>
        <span>Optimized for medical terminology • Always consult healthcare professionals</span>
      </div>
    </div>
  );
};

export default TranslationPanel;
