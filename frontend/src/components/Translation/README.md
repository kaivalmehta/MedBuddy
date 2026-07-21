# Azure Translator Multi-Language Support for MedBuddy

## 🌍 Overview

This implementation adds comprehensive multi-language translation support to MedBuddy healthcare platform using Azure Translator AI. Patients can now translate prescriptions, lab reports, drug information, and the entire UI into 100+ languages.

## ✨ Features

- **100+ Languages**: Support for all major world languages including RTL languages
- **Healthcare-Optimized**: Medical terminology translation with healthcare context
- **Prescription Translation**: Translate OCR text, doctor info, safety summaries
- **Lab Report Translation**: Translate test results, interpretations, recommendations
- **Drug Information Translation**: Medication names, dosages, instructions, side effects
- **Safety Alerts Translation**: Drug interactions and warnings in your language
- **UI Localization**: Translate the entire interface
- **RTL Support**: Full support for Arabic, Hebrew, Urdu, Persian, etc.
- **Auto-Detection**: Automatically detect source language
- **Text-to-Speech**: Listen to translated content
- **Modern UI**: Beautiful, responsive translation interface

## 📋 Supported Languages (100+)

### Major World Languages
- English, Spanish, French, German, Italian, Portuguese, Russian
- Chinese (Simplified & Traditional), Japanese, Korean, Arabic

### South Asian Languages
- Hindi, Bengali, Punjabi, Gujarati, Marathi
- Tamil, Telugu, Kannada, Malayalam
- Odia, Assamese, Urdu, Nepali, Sinhala

### Southeast Asian Languages
- Thai, Vietnamese, Indonesian, Malay, Filipino
- Myanmar (Burmese), Khmer, Lao

### European Languages
- Dutch, Polish, Ukrainian, Czech, Slovak, Hungarian, Romanian
- Bulgarian, Greek, Turkish, Swedish, Danish, Norwegian, Finnish
- Croatian, Serbian, Slovenian, Estonian, Latvian, Lithuanian
- And many more...

### Middle Eastern Languages
- Arabic, Hebrew, Persian, Pashto, Kurdish

### African Languages
- Swahili, Amharic, Zulu, Xhosa, Afrikaans, Somali
- Hausa, Igbo, Yoruba, Kinyarwanda, Malagasy

### RTL (Right-to-Left) Languages
- Arabic, Hebrew, Urdu, Persian, Pashto, Kurdish

## 🔧 Backend Setup

### 1. Environment Variables

Add to your `.env` file:

```env
# Azure Translator Configuration
AZURE_TRANSLATOR_KEY=your_azure_translator_key_here
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
AZURE_TRANSLATOR_REGION=eastus
```

### 2. Azure Portal Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new resource: **Translator** (under AI + Machine Learning)
3. Choose your pricing tier (Free tier: 2M characters/month)
4. After creation, go to **Keys and Endpoint**
5. Copy **KEY 1** and **Location/Region**
6. Add these to your `.env` file

### 3. Backend Files Structure

```
backend/prescriptions/
├── azure_translator_service.py    # Main translation service
├── views_translator.py            # API endpoints
└── urls_translator.py             # URL routing
```

### 4. API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/translate/languages/` | GET | No | Get supported languages |
| `/api/translate/detect/` | POST | No | Detect language |
| `/api/translate/text/` | POST | No | Translate text |
| `/api/translate/prescription/<id>/` | POST | Yes | Translate prescription |
| `/api/translate/lab-report/<id>/` | POST | Yes | Translate lab report |
| `/api/translate/drug/<id>/` | POST | Yes | Translate drug info |
| `/api/translate/safety-report/<id>/` | POST | Yes | Translate safety report |
| `/api/translate/ui/<lang>/` | GET | No | Get UI translations |
| `/api/translate/batch/` | POST | No | Batch translate |

## 🎨 Frontend Setup

### 1. Files Structure

```
frontend/src/
├── services/
│   └── translationService.js      # API client
├── contexts/
│   └── TranslationContext.jsx     # Global state management
└── components/Translation/
    ├── index.js                   # Component exports
    ├── TranslationPanel.jsx       # Main translation interface
    ├── TranslationPanel.css
    ├── LanguageSelector.jsx       # Navbar language dropdown
    ├── LanguageSelector.css
    ├── TranslationButton.jsx      # Inline translation trigger
    ├── TranslationButton.css
    ├── TranslationModal.jsx       # Full-screen translation view
    ├── TranslationModal.css
    ├── TranslationPage.jsx        # Dedicated translation page
    └── TranslationPage.css
```

### 2. App Integration

#### Step 1: Wrap your app with TranslationProvider

```jsx
// src/App.jsx
import { TranslationProvider } from './contexts/TranslationContext';

function App() {
  return (
    <TranslationProvider>
      <Router>
        {/* Your routes */}
      </Router>
    </TranslationProvider>
  );
}
```

#### Step 2: Add Language Selector to Navbar

```jsx
// src/components/Navbar.jsx
import { LanguageSelector } from '../components/Translation';

const Navbar = () => {
  return (
    <nav className="navbar">
      {/* Other nav items */}
      <LanguageSelector variant="minimal" />
    </nav>
  );
};
```

#### Step 3: Add Translation Button to Document Views

```jsx
// src/pages/PrescriptionDetail.jsx
import { TranslationButton } from '../components/Translation';

const PrescriptionDetail = ({ prescription }) => {
  const [translation, setTranslation] = useState(null);

  return (
    <div className="prescription-detail">
      <header>
        <h1>Prescription Details</h1>
        <TranslationButton
          documentType="prescription"
          documentId={prescription.id}
          variant="button"
          onTranslated={(result) => setTranslation(result)}
        />
      </header>
      {/* Prescription content */}
    </div>
  );
};
```

#### Step 4: Add Translation Page Route

```jsx
// src/App.jsx
import { TranslationPage } from './components/Translation';

<Route path="/translate" element={<TranslationPage />} />
```

### 3. Using Translation Context

```jsx
import { useTranslation } from '../contexts/TranslationContext';

const MyComponent = () => {
  const {
    currentLanguage,        // Current language code
    supportedLanguages,     // Array of all languages
    uiStrings,             // Translated UI strings
    isRTL,                 // Is current language RTL
    changeLanguage,        // Change interface language
    t,                     // Translation function
    translateText,         // Translate arbitrary text
    getLanguageInfo        // Get language details
  } = useTranslation();

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <h1>{t('prescriptions')}</h1>
      <button onClick={() => changeLanguage('es')}>
        Switch to Spanish
      </button>
    </div>
  );
};
```

## 📱 Component Usage Examples

### TranslationPanel - Main Translation Interface

```jsx
import { TranslationPanel } from './components/Translation';

// Default variant - full featured
<TranslationPanel />

// Compact variant for sidebars
<TranslationPanel variant="compact" />

// With document context
<TranslationPanel 
  documentType="prescription"
  documentId="uuid-here"
  onTranslationComplete={(result) => console.log(result)}
/>
```

### LanguageSelector - Navbar Dropdown

```jsx
import { LanguageSelector } from './components/Translation';

// Minimal variant (icon + code)
<LanguageSelector variant="minimal" />

// Default variant (full names)
<LanguageSelector variant="default" />

// Button variant
<LanguageSelector variant="button" />
```

### TranslationButton - Document Translation

```jsx
import { TranslationButton } from './components/Translation';

// Icon button
<TranslationButton
  documentType="prescription"
  documentId={prescriptionId}
  variant="icon"
  onTranslated={(result) => setTranslation(result)}
/>

// Text button
<TranslationButton
  documentType="lab-report"
  documentId={reportId}
  variant="button"
/>

// Dropdown
<TranslationButton
  documentType="drug"
  documentId={drugId}
  variant="dropdown"
/>
```

### TranslationModal - View Translations

```jsx
import { TranslationModal } from './components/Translation';

<TranslationModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  translationData={translationResult}
  documentType="prescription"
/>
```

## 🔌 API Usage Examples

### Translate Text

```javascript
// POST /api/translate/text/
{
  "text": "Take one tablet twice daily with food",
  "target_language": "hi",
  "is_healthcare": true
}

// Response
{
  "success": true,
  "translations": [{
    "original": "Take one tablet twice daily with food",
    "translated": "भोजन के साथ दिन में दो बार एक गोली लें",
    "target_language": "hi"
  }],
  "is_rtl": false
}
```

### Translate Prescription

```javascript
// POST /api/translate/prescription/uuid-here/
{
  "target_language": "es"
}

// Response
{
  "success": true,
  "translated_prescription": {
    "ocr_raw_text_translated": "...",
    "safety_summary_translated": "...",
    "doctor_name_translated": "..."
  },
  "translated_drugs": [...],
  "translated_safety_report": {...}
}
```

### Batch Translation

```javascript
// POST /api/translate/batch/
{
  "texts": ["Hello", "How are you?"],
  "target_languages": ["es", "fr", "hi"]
}

// Response - translations for each language
```

## 🎯 Best Practices

### 1. Healthcare Translation Accuracy
- Always use `is_healthcare: true` for medical content
- Verify critical medical information with healthcare professionals
- Display original text alongside translations for reference

### 2. RTL Language Support
- Check `isRTL` from context and adjust layouts
- Use CSS `direction: rtl` for RTL languages
- Test thoroughly with Arabic, Hebrew, and Urdu

### 3. Performance
- Cache frequently used UI translations
- Use batch translation for multiple texts
- Implement loading states for better UX

### 4. Accessibility
- Support text-to-speech for all translations
- Ensure proper language tags for screen readers
- Maintain sufficient color contrast

## 🔍 Troubleshooting

### Common Issues

1. **Translation fails with 401 error**
   - Check Azure API key is correct
   - Verify region matches your Azure resource

2. **Language not supported error**
   - Ensure language code is valid (e.g., 'zh-Hans' not 'zh')
   - Check SUPPORTED_LANGUAGES in service

3. **RTL text not displaying correctly**
   - Verify CSS direction is set
   - Check font supports the language

4. **Healthcare context not working**
   - Ensure `is_healthcare: true` is passed
   - Some languages may have limited medical vocabulary

### Debug Mode

Enable debug logging in Django:
```python
LOGGING = {
    'loggers': {
        'prescriptions.azure_translator_service': {
            'level': 'DEBUG',
        },
    },
}
```

## 💰 Azure Pricing

| Tier | Price | Included |
|------|-------|----------|
| Free | $0 | 2M characters/month |
| S1 | $10/M chars | Pay as you go |
| S2 | $2.34/M chars | Volume discount |

## 📚 Additional Resources

- [Azure Translator Documentation](https://docs.microsoft.com/azure/cognitive-services/translator/)
- [Language Support](https://docs.microsoft.com/azure/cognitive-services/translator/language-support)
- [Healthcare Translation Best Practices](https://docs.microsoft.com/azure/cognitive-services/translator/customization)

## 🤝 Support

For issues with this implementation:
1. Check the troubleshooting section
2. Review Azure service health
3. Check browser console for errors
4. Review Django logs

---

**Note**: This implementation is optimized for healthcare content. Always verify critical medical translations with qualified healthcare professionals.
