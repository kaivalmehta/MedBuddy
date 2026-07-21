// frontend/src/components/Translation/LanguageSelector.jsx
/**
 * Language Selector Component
 * Dropdown for selecting UI language - perfect for navbar integration
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import './LanguageSelector.css';

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
    <path d="M2 12h20"/>
  </svg>
);

const ChevronIcon = ({ isOpen }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
  >
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const CheckmarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const LanguageSelector = ({ 
  variant = 'default', // 'default', 'minimal', 'button'
  showNativeName = true,
  showFlag = false,
  maxVisibleLanguages = 10
}) => {
  const { currentLanguage, supportedLanguages, changeLanguage, isLoading } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Popular languages to show at top
  const popularCodes = ['en', 'es', 'fr', 'de', 'hi', 'zh-Hans', 'ar', 'pt', 'ja', 'ko'];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Get current language info
  const currentLangInfo = supportedLanguages.find(l => l.code === currentLanguage) || {
    code: 'en',
    name: 'English',
    native_name: 'English'
  };

  // Filter languages based on search
  const filteredLanguages = supportedLanguages.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.native_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort languages: popular first, then alphabetically
  const sortedLanguages = [...filteredLanguages].sort((a, b) => {
    const aPopular = popularCodes.indexOf(a.code);
    const bPopular = popularCodes.indexOf(b.code);
    
    if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;
    if (aPopular !== -1) return -1;
    if (bPopular !== -1) return 1;
    
    return a.name.localeCompare(b.name);
  });

  const handleSelect = (code) => {
    changeLanguage(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Render trigger button based on variant
  const renderTrigger = () => {
    switch (variant) {
      case 'minimal':
        return (
          <button 
            className="lang-trigger lang-trigger-minimal"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Select language"
          >
            <GlobeIcon />
            <span className="lang-code">{currentLanguage.toUpperCase()}</span>
          </button>
        );
      
      case 'button':
        return (
          <button 
            className="lang-trigger lang-trigger-button"
            onClick={() => setIsOpen(!isOpen)}
          >
            <GlobeIcon />
            <span>{currentLangInfo.native_name}</span>
            <ChevronIcon isOpen={isOpen} />
          </button>
        );
      
      default:
        return (
          <button 
            className="lang-trigger lang-trigger-default"
            onClick={() => setIsOpen(!isOpen)}
          >
            <GlobeIcon />
            <div className="lang-info">
              <span className="lang-native">{currentLangInfo.native_name}</span>
              {showNativeName && currentLangInfo.name !== currentLangInfo.native_name && (
                <span className="lang-english">{currentLangInfo.name}</span>
              )}
            </div>
            <ChevronIcon isOpen={isOpen} />
          </button>
        );
    }
  };

  return (
    <div className={`language-selector ${variant}`} ref={dropdownRef}>
      {renderTrigger()}

      {isOpen && (
        <div className="lang-dropdown" onKeyDown={handleKeyDown}>
          {/* Search Input */}
          <div className="lang-search-container">
            <input
              ref={searchInputRef}
              type="text"
              className="lang-search-input"
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search languages"
            />
          </div>

          {/* Languages List */}
          <div className="lang-list">
            {sortedLanguages.length === 0 ? (
              <div className="lang-no-results">
                No languages found for "{searchQuery}"
              </div>
            ) : (
              <>
                {/* Popular Languages Section */}
                {!searchQuery && (
                  <div className="lang-section">
                    <div className="lang-section-header">Popular</div>
                    {sortedLanguages
                      .filter(lang => popularCodes.includes(lang.code))
                      .map(lang => (
                        <button
                          key={lang.code}
                          className={`lang-option ${lang.code === currentLanguage ? 'selected' : ''}`}
                          onClick={() => handleSelect(lang.code)}
                        >
                          <div className="lang-option-info">
                            <span className="lang-option-native">{lang.native_name}</span>
                            <span className="lang-option-name">{lang.name}</span>
                          </div>
                          {lang.code === currentLanguage && <CheckmarkIcon />}
                          {lang.direction === 'rtl' && (
                            <span className="rtl-badge">RTL</span>
                          )}
                        </button>
                      ))
                    }
                  </div>
                )}

                {/* All Languages Section */}
                <div className="lang-section">
                  {!searchQuery && <div className="lang-section-header">All Languages</div>}
                  {sortedLanguages
                    .filter(lang => searchQuery || !popularCodes.includes(lang.code))
                    .map(lang => (
                      <button
                        key={lang.code}
                        className={`lang-option ${lang.code === currentLanguage ? 'selected' : ''}`}
                        onClick={() => handleSelect(lang.code)}
                      >
                        <div className="lang-option-info">
                          <span className="lang-option-native">{lang.native_name}</span>
                          <span className="lang-option-name">{lang.name}</span>
                        </div>
                        {lang.code === currentLanguage && <CheckmarkIcon />}
                        {lang.direction === 'rtl' && (
                          <span className="rtl-badge">RTL</span>
                        )}
                      </button>
                    ))
                  }
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="lang-footer">
            <span>{supportedLanguages.length} languages available</span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="lang-loading">
          <div className="lang-loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
