// frontend/src/components/Translation/TranslationPage.jsx
/**
 * Translation Page Component
 * Main page for healthcare document translations
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import TranslationPanel from './TranslationPanel';
import './TranslationPage.css';

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
    <path d="M2 12h20"/>
  </svg>
);

const DocIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" x2="8" y1="13" y2="13"/>
    <line x1="16" x2="8" y1="17" y2="17"/>
  </svg>
);

const PillIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
    <path d="m8.5 8.5 7 7"/>
  </svg>
);

const LabIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2v6l-2 4v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6l-2-4V2"/>
    <line x1="8" x2="16" y1="2" y2="2"/>
    <line x1="11" x2="13" y1="10" y2="10"/>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const TranslationPage = () => {
  const { supportedLanguages, currentLanguage, isLoading } = useTranslation();
  const [stats, setStats] = useState({
    totalLanguages: 0,
    rtlLanguages: 0,
    regions: 0
  });

  useEffect(() => {
    if (supportedLanguages.length > 0) {
      const rtlCount = supportedLanguages.filter(l => l.direction === 'rtl').length;
      setStats({
        totalLanguages: supportedLanguages.length,
        rtlLanguages: rtlCount,
        regions: 7 // Africa, Asia, Europe, Middle East, Pacific, South Asia, Southeast Asia
      });
    }
  }, [supportedLanguages]);

  const popularLanguages = [
    { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'zh-Hans', name: 'Chinese', native: '简体中文', flag: '🇨🇳' },
    { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
    { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
    { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  ];

  const features = [
    {
      icon: <DocIcon />,
      title: 'Prescription Translation',
      description: 'Translate your prescription documents including medication names, dosages, and doctor instructions.'
    },
    {
      icon: <LabIcon />,
      title: 'Lab Report Translation',
      description: 'Understand your lab results in your preferred language with accurate medical terminology.'
    },
    {
      icon: <PillIcon />,
      title: 'Drug Information',
      description: 'Get medication details, side effects, and usage instructions translated accurately.'
    },
    {
      icon: <ShieldIcon />,
      title: 'Safety Alerts',
      description: 'Important drug interactions and safety warnings translated for better understanding.'
    }
  ];

  return (
    <div className="translation-page">
      {/* Hero Section */}
      <div className="translation-page-hero">
        <div className="translation-page-hero-content">
          <div className="translation-page-hero-icon">
            <GlobeIcon />
          </div>
          <h1 className="translation-page-title">
            Healthcare Translation
          </h1>
          <p className="translation-page-subtitle">
            Break language barriers in healthcare. Translate prescriptions, lab reports, 
            and medical information into {stats.totalLanguages}+ languages with healthcare-optimized accuracy.
          </p>
          
          {/* Stats */}
          <div className="translation-page-stats">
            <div className="translation-page-stat">
              <span className="translation-page-stat-value">{stats.totalLanguages}+</span>
              <span className="translation-page-stat-label">Languages</span>
            </div>
            <div className="translation-page-stat">
              <span className="translation-page-stat-value">{stats.regions}</span>
              <span className="translation-page-stat-label">Regions</span>
            </div>
            <div className="translation-page-stat">
              <span className="translation-page-stat-value">{stats.rtlLanguages}</span>
              <span className="translation-page-stat-label">RTL Languages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Translation Panel */}
      <div className="translation-page-main">
        <TranslationPanel variant="default" />
      </div>

      {/* Popular Languages */}
      <div className="translation-page-section">
        <h2 className="translation-page-section-title">Popular Languages</h2>
        <div className="translation-page-languages-grid">
          {popularLanguages.map((lang) => (
            <div key={lang.code} className="translation-page-language-card">
              <span className="translation-page-language-flag">{lang.flag}</span>
              <div className="translation-page-language-info">
                <span className="translation-page-language-name">{lang.name}</span>
                <span className="translation-page-language-native">{lang.native}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="translation-page-section">
        <h2 className="translation-page-section-title">What You Can Translate</h2>
        <div className="translation-page-features-grid">
          {features.map((feature, index) => (
            <div key={index} className="translation-page-feature-card">
              <div className="translation-page-feature-icon">
                {feature.icon}
              </div>
              <h3 className="translation-page-feature-title">{feature.title}</h3>
              <p className="translation-page-feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Healthcare Disclaimer */}
      <div className="translation-page-disclaimer">
        <div className="translation-page-disclaimer-icon">ℹ️</div>
        <div className="translation-page-disclaimer-content">
          <strong>Healthcare Translation Notice:</strong> Translations are optimized for medical terminology 
          but should be verified by healthcare professionals for critical medical decisions. 
          When in doubt, always consult with your doctor or pharmacist.
        </div>
      </div>

      {/* Powered by Azure */}
      <div className="translation-page-branding">
        <span>Powered by</span>
        <svg width="80" height="20" viewBox="0 0 80 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25.5 5h3.2l3.8 9.5L36.3 5h3.2l-5.2 12h-3.5L25.5 5z" fill="#0078d4"/>
          <path d="M40.5 5h3v12h-3V5z" fill="#0078d4"/>
          <path d="M45.5 14.2l1.8-1.8c1 1.2 2.3 1.8 4 1.8 1.5 0 2.2-.6 2.2-1.4 0-.4-.2-.8-.5-1-.3-.3-.9-.5-1.6-.7l-1.5-.4c-1.5-.4-2.5-.9-3.2-1.6-.6-.7-1-1.6-1-2.8 0-1.4.5-2.5 1.5-3.3 1-.8 2.4-1.2 4-1.2 2 0 3.6.6 4.8 1.8l-1.6 1.8c-.9-.9-2-1.3-3.3-1.3-1.3 0-2 .5-2 1.3 0 .4.2.7.5 1 .3.2.9.5 1.7.6l1.5.4c1.5.4 2.6.9 3.2 1.6.6.7 1 1.7 1 2.9 0 1.5-.5 2.6-1.6 3.4-1 .8-2.5 1.2-4.3 1.2-2.2 0-4-.7-5.6-2.3z" fill="#0078d4"/>
          <path d="M57 5h3v12h-3V5z" fill="#0078d4"/>
          <path d="M62 11c0-3.9 2.8-6.2 6.3-6.2 3.5 0 6.3 2.3 6.3 6.2s-2.8 6.2-6.3 6.2c-3.5 0-6.3-2.3-6.3-6.2zm9.5 0c0-2.3-1.3-3.7-3.2-3.7-1.9 0-3.2 1.4-3.2 3.7s1.3 3.7 3.2 3.7c1.9 0 3.2-1.4 3.2-3.7z" fill="#0078d4"/>
          <path d="M12 2L2 7v6l10 5 10-5V7L12 2zm0 2.2l7.2 3.6-7.2 3.6-7.2-3.6L12 4.2zm-8 5.3l8 4v5.3l-8-4V9.5zm10 9.3V13.5l8-4v5.3l-8 4z" fill="#0078d4"/>
        </svg>
        <span>Azure AI Translator</span>
      </div>
    </div>
  );
};

export default TranslationPage;
