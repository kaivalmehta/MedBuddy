// frontend/src/components/Translation/TranslationButton.jsx
/**
 * Translation Button Component
 * Inline translation trigger for prescriptions, lab reports, and other documents
 */

import React, { useState } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import translationService from '../../services/translationService';
import './TranslationButton.css';

const TranslateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 8 6 6"/>
    <path d="m4 14 6-6 2-3"/>
    <path d="M2 5h12"/>
    <path d="M7 2h1"/>
    <path d="m22 22-5-10-5 10"/>
    <path d="M14 18h6"/>
  </svg>
);

const LoadingSpinner = () => (
  <svg className="spinner-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
  </svg>
);

const TranslationButton = ({
  documentType, // 'prescription', 'lab-report', 'drug', 'text'
  documentId,
  text, // for simple text translation
  onTranslated,
  variant = 'icon', // 'icon', 'button', 'dropdown'
  className = ''
}) => {
  const { supportedLanguages, currentLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);

  // Popular languages for quick access
  const quickLanguages = ['es', 'fr', 'hi', 'zh-Hans', 'ar', 'de', 'pt', 'ja'];

  const handleTranslate = async (targetLanguage) => {
    setIsTranslating(true);
    setError(null);

    try {
      let result;

      switch (documentType) {
        case 'prescription':
          result = await translationService.translatePrescription(documentId, targetLanguage);
          break;
        case 'lab-report':
          result = await translationService.translateLabReport(documentId, targetLanguage);
          break;
        case 'drug':
          result = await translationService.translateDrug(documentId, targetLanguage);
          break;
        case 'text':
        default:
          result = await translationService.translateText(text, targetLanguage);
          break;
      }

      if (result.success) {
        if (onTranslated) {
          onTranslated(result);
        }
        setIsOpen(false);
      } else {
        setError(result.error || 'Translation failed');
      }
    } catch (err) {
      setError(err.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const getLanguageInfo = (code) => {
    return supportedLanguages.find(l => l.code === code) || { name: code, native_name: code };
  };

  // Icon variant - just shows icon, opens dropdown on click
  if (variant === 'icon') {
    return (
      <div className={`translation-btn-container ${className}`}>
        <button
          className="translate-icon-btn"
          onClick={() => setIsOpen(!isOpen)}
          title="Translate"
          disabled={isTranslating}
        >
          {isTranslating ? <LoadingSpinner /> : <TranslateIcon />}
        </button>

        {isOpen && (
          <div className="translate-dropdown">
            <div className="translate-dropdown-header">
              <span>Translate to</span>
              <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>
            
            <div className="quick-lang-grid">
              {quickLanguages.map(code => {
                const lang = getLanguageInfo(code);
                return (
                  <button
                    key={code}
                    className="quick-lang-btn"
                    onClick={() => handleTranslate(code)}
                    disabled={isTranslating}
                  >
                    <span className="lang-native">{lang.native_name}</span>
                    <span className="lang-name">{lang.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="more-languages">
              <select
                onChange={(e) => e.target.value && handleTranslate(e.target.value)}
                value=""
                disabled={isTranslating}
              >
                <option value="">More languages...</option>
                {supportedLanguages
                  .filter(l => !quickLanguages.includes(l.code) && l.code !== currentLanguage)
                  .map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.native_name} - {lang.name}
                    </option>
                  ))
                }
              </select>
            </div>

            {error && (
              <div className="translate-error">
                <span>⚠️ {error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Button variant - shows "Translate" text
  if (variant === 'button') {
    return (
      <div className={`translation-btn-container ${className}`}>
        <button
          className="translate-text-btn"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isTranslating}
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

        {isOpen && (
          <div className="translate-dropdown translate-dropdown-wide">
            <div className="translate-dropdown-header">
              <span>Select language</span>
              <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>
            
            <div className="lang-list-scroll">
              {supportedLanguages
                .filter(l => l.code !== currentLanguage)
                .map(lang => (
                  <button
                    key={lang.code}
                    className="lang-list-item"
                    onClick={() => handleTranslate(lang.code)}
                    disabled={isTranslating}
                  >
                    <span className="lang-native">{lang.native_name}</span>
                    <span className="lang-name">{lang.name}</span>
                  </button>
                ))
              }
            </div>

            {error && (
              <div className="translate-error">
                <span>⚠️ {error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Dropdown variant - inline select dropdown
  return (
    <div className={`translation-btn-container inline ${className}`}>
      <div className="inline-translate">
        <TranslateIcon />
        <select
          onChange={(e) => e.target.value && handleTranslate(e.target.value)}
          value=""
          disabled={isTranslating}
          className="inline-select"
        >
          <option value="">Translate to...</option>
          {quickLanguages.map(code => {
            const lang = getLanguageInfo(code);
            return (
              <option key={code} value={code}>
                {lang.native_name} ({lang.name})
              </option>
            );
          })}
          <option disabled>───────────</option>
          {supportedLanguages
            .filter(l => !quickLanguages.includes(l.code) && l.code !== currentLanguage)
            .map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.native_name} ({lang.name})
              </option>
            ))
          }
        </select>
        {isTranslating && <LoadingSpinner />}
      </div>
      {error && <span className="inline-error">⚠️ {error}</span>}
    </div>
  );
};

export default TranslationButton;
