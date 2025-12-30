// frontend/src/components/Translation/TranslationModal.jsx
/**
 * Translation Modal Component
 * Full-screen modal for viewing translated content
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import translationService from '../../services/translationService';
import './TranslationModal.css';

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const PrintIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect width="12" height="8" x="6" y="14"/>
  </svg>
);

const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);

const TranslationModal = ({
  isOpen,
  onClose,
  title = 'Translation',
  originalContent,
  translatedContent,
  targetLanguage,
  sourceLanguage = 'en',
  isRTL = false,
  drugs = [],
  safetyReport = null
}) => {
  const { supportedLanguages } = useTranslation();
  const [activeTab, setActiveTab] = useState('translation');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getLanguageName = (code) => {
    const lang = supportedLanguages.find(l => l.code === code);
    return lang ? lang.name : code;
  };

  const getLanguageNative = (code) => {
    const lang = supportedLanguages.find(l => l.code === code);
    return lang ? lang.native_name : code;
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLanguage;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDownload = () => {
    const content = `
${title}
=====================================
Original (${getLanguageName(sourceLanguage)}):
${originalContent}

Translated (${getLanguageName(targetLanguage)}):
${translatedContent}

${drugs.length > 0 ? `
Medications:
${drugs.map(d => `- ${d.drug_name_translated || d.drug_name}: ${d.dosage_translated || d.dosage}`).join('\n')}
` : ''}
=====================================
Translated by MedBuddy using Azure AI
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation-${targetLanguage}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="translation-modal-overlay" onClick={onClose}>
      <div className="translation-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h2>{title}</h2>
            <div className="language-badges">
              <span className="lang-badge source">{getLanguageNative(sourceLanguage)}</span>
              <span className="arrow">→</span>
              <span className="lang-badge target">{getLanguageNative(targetLanguage)}</span>
            </div>
          </div>
          <div className="modal-actions">
            <button className="action-btn" onClick={() => handleSpeak(translatedContent)} title="Listen">
              <SpeakerIcon />
            </button>
            <button className="action-btn" onClick={() => handleCopy(translatedContent)} title="Copy">
              {copied ? '✓' : <CopyIcon />}
            </button>
            <button className="action-btn" onClick={handlePrint} title="Print">
              <PrintIcon />
            </button>
            <button className="action-btn" onClick={handleDownload} title="Download">
              <DownloadIcon />
            </button>
            <button className="close-btn" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {(drugs.length > 0 || safetyReport) && (
          <div className="modal-tabs">
            <button
              className={`tab ${activeTab === 'translation' ? 'active' : ''}`}
              onClick={() => setActiveTab('translation')}
            >
              Main Content
            </button>
            {drugs.length > 0 && (
              <button
                className={`tab ${activeTab === 'drugs' ? 'active' : ''}`}
                onClick={() => setActiveTab('drugs')}
              >
                Medications ({drugs.length})
              </button>
            )}
            {safetyReport && (
              <button
                className={`tab ${activeTab === 'safety' ? 'active' : ''}`}
                onClick={() => setActiveTab('safety')}
              >
                Safety Info
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="modal-content">
          {activeTab === 'translation' && (
            <div className="translation-content-grid">
              {/* Original */}
              <div className="content-section original">
                <div className="section-header">
                  <span className="section-label">Original</span>
                  <span className="lang-name">{getLanguageName(sourceLanguage)}</span>
                </div>
                <div className="section-body">
                  <p>{originalContent}</p>
                </div>
              </div>

              {/* Translated */}
              <div className={`content-section translated ${isRTL ? 'rtl' : ''}`}>
                <div className="section-header">
                  <span className="section-label">Translated</span>
                  <span className="lang-name">{getLanguageName(targetLanguage)}</span>
                </div>
                <div className="section-body">
                  <p style={{ direction: isRTL ? 'rtl' : 'ltr' }}>{translatedContent}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'drugs' && drugs.length > 0 && (
            <div className="drugs-list">
              {drugs.map((drug, index) => (
                <div key={index} className="drug-card">
                  <div className="drug-header">
                    <h4>{drug.drug_name_translated || drug.drug_name}</h4>
                    {drug.generic_name && (
                      <span className="generic">{drug.generic_name_translated || drug.generic_name}</span>
                    )}
                  </div>
                  <div className="drug-details">
                    <div className="detail-row">
                      <span className="label">Dosage:</span>
                      <span className="value">{drug.dosage_translated || drug.dosage}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Frequency:</span>
                      <span className="value">{drug.frequency_translated || drug.frequency}</span>
                    </div>
                    {drug.duration && (
                      <div className="detail-row">
                        <span className="label">Duration:</span>
                        <span className="value">{drug.duration_translated || drug.duration}</span>
                      </div>
                    )}
                    {drug.instructions && (
                      <div className="detail-row full">
                        <span className="label">Instructions:</span>
                        <span className="value">{drug.instructions_translated || drug.instructions}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'safety' && safetyReport && (
            <div className="safety-content">
              {safetyReport.safety_summary_translated && (
                <div className="safety-summary">
                  <h4>Safety Summary</h4>
                  <p>{safetyReport.safety_summary_translated}</p>
                </div>
              )}

              {safetyReport.drug_drug_interactions_translated?.length > 0 && (
                <div className="interactions-section">
                  <h4>Drug Interactions</h4>
                  {safetyReport.drug_drug_interactions_translated.map((interaction, index) => (
                    <div key={index} className="interaction-item">
                      <span className={`severity ${interaction.severity?.toLowerCase()}`}>
                        {interaction.severity_translated || interaction.severity}
                      </span>
                      <p>{interaction.description_translated || interaction.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            <span className="azure-badge">🤖 Translated by Azure AI</span>
            <span className="disclaimer">Always consult healthcare professionals</span>
          </div>
          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslationModal;
