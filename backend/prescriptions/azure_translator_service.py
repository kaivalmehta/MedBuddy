# backend/prescriptions/azure_translator_service.py
"""
Azure Translator Service for MedBuddy
Supports translation of prescriptions, lab reports, and UI content
"""

import os
import requests
import uuid
import logging
import json
from typing import List, Dict, Optional, Union
from django.conf import settings

logger = logging.getLogger(__name__)


class AzureTranslatorService:
    """
    Azure Translator Text API v3.0 Service
    Supports 100+ languages for healthcare document translation
    """
    
    # Azure Translator supported languages (comprehensive list)
    SUPPORTED_LANGUAGES = {
        # Major World Languages
        'en': {'name': 'English', 'native': 'English', 'dir': 'ltr'},
        'es': {'name': 'Spanish', 'native': 'Español', 'dir': 'ltr'},
        'fr': {'name': 'French', 'native': 'Français', 'dir': 'ltr'},
        'de': {'name': 'German', 'native': 'Deutsch', 'dir': 'ltr'},
        'it': {'name': 'Italian', 'native': 'Italiano', 'dir': 'ltr'},
        'pt': {'name': 'Portuguese', 'native': 'Português', 'dir': 'ltr'},
        'pt-PT': {'name': 'Portuguese (Portugal)', 'native': 'Português (Portugal)', 'dir': 'ltr'},
        'ru': {'name': 'Russian', 'native': 'Русский', 'dir': 'ltr'},
        'zh-Hans': {'name': 'Chinese (Simplified)', 'native': '简体中文', 'dir': 'ltr'},
        'zh-Hant': {'name': 'Chinese (Traditional)', 'native': '繁體中文', 'dir': 'ltr'},
        'ja': {'name': 'Japanese', 'native': '日本語', 'dir': 'ltr'},
        'ko': {'name': 'Korean', 'native': '한국어', 'dir': 'ltr'},
        'ar': {'name': 'Arabic', 'native': 'العربية', 'dir': 'rtl'},
        
        # South Asian Languages
        'hi': {'name': 'Hindi', 'native': 'हिन्दी', 'dir': 'ltr'},
        'bn': {'name': 'Bengali', 'native': 'বাংলা', 'dir': 'ltr'},
        'pa': {'name': 'Punjabi', 'native': 'ਪੰਜਾਬੀ', 'dir': 'ltr'},
        'gu': {'name': 'Gujarati', 'native': 'ગુજરાતી', 'dir': 'ltr'},
        'mr': {'name': 'Marathi', 'native': 'मराठी', 'dir': 'ltr'},
        'ta': {'name': 'Tamil', 'native': 'தமிழ்', 'dir': 'ltr'},
        'te': {'name': 'Telugu', 'native': 'తెలుగు', 'dir': 'ltr'},
        'kn': {'name': 'Kannada', 'native': 'ಕನ್ನಡ', 'dir': 'ltr'},
        'ml': {'name': 'Malayalam', 'native': 'മലയാളം', 'dir': 'ltr'},
        'or': {'name': 'Odia', 'native': 'ଓଡ଼ିଆ', 'dir': 'ltr'},
        'as': {'name': 'Assamese', 'native': 'অসমীয়া', 'dir': 'ltr'},
        'ur': {'name': 'Urdu', 'native': 'اردو', 'dir': 'rtl'},
        'ne': {'name': 'Nepali', 'native': 'नेपाली', 'dir': 'ltr'},
        'si': {'name': 'Sinhala', 'native': 'සිංහල', 'dir': 'ltr'},
        
        # Southeast Asian Languages
        'th': {'name': 'Thai', 'native': 'ไทย', 'dir': 'ltr'},
        'vi': {'name': 'Vietnamese', 'native': 'Tiếng Việt', 'dir': 'ltr'},
        'id': {'name': 'Indonesian', 'native': 'Bahasa Indonesia', 'dir': 'ltr'},
        'ms': {'name': 'Malay', 'native': 'Bahasa Melayu', 'dir': 'ltr'},
        'fil': {'name': 'Filipino', 'native': 'Filipino', 'dir': 'ltr'},
        'my': {'name': 'Myanmar (Burmese)', 'native': 'မြန်မာ', 'dir': 'ltr'},
        'km': {'name': 'Khmer', 'native': 'ខ្មែរ', 'dir': 'ltr'},
        'lo': {'name': 'Lao', 'native': 'ລາວ', 'dir': 'ltr'},
        
        # European Languages
        'nl': {'name': 'Dutch', 'native': 'Nederlands', 'dir': 'ltr'},
        'pl': {'name': 'Polish', 'native': 'Polski', 'dir': 'ltr'},
        'uk': {'name': 'Ukrainian', 'native': 'Українська', 'dir': 'ltr'},
        'cs': {'name': 'Czech', 'native': 'Čeština', 'dir': 'ltr'},
        'sk': {'name': 'Slovak', 'native': 'Slovenčina', 'dir': 'ltr'},
        'hu': {'name': 'Hungarian', 'native': 'Magyar', 'dir': 'ltr'},
        'ro': {'name': 'Romanian', 'native': 'Română', 'dir': 'ltr'},
        'bg': {'name': 'Bulgarian', 'native': 'Български', 'dir': 'ltr'},
        'el': {'name': 'Greek', 'native': 'Ελληνικά', 'dir': 'ltr'},
        'tr': {'name': 'Turkish', 'native': 'Türkçe', 'dir': 'ltr'},
        'sv': {'name': 'Swedish', 'native': 'Svenska', 'dir': 'ltr'},
        'da': {'name': 'Danish', 'native': 'Dansk', 'dir': 'ltr'},
        'no': {'name': 'Norwegian', 'native': 'Norsk', 'dir': 'ltr'},
        'fi': {'name': 'Finnish', 'native': 'Suomi', 'dir': 'ltr'},
        'hr': {'name': 'Croatian', 'native': 'Hrvatski', 'dir': 'ltr'},
        'sr-Cyrl': {'name': 'Serbian (Cyrillic)', 'native': 'Српски', 'dir': 'ltr'},
        'sr-Latn': {'name': 'Serbian (Latin)', 'native': 'Srpski', 'dir': 'ltr'},
        'sl': {'name': 'Slovenian', 'native': 'Slovenščina', 'dir': 'ltr'},
        'et': {'name': 'Estonian', 'native': 'Eesti', 'dir': 'ltr'},
        'lv': {'name': 'Latvian', 'native': 'Latviešu', 'dir': 'ltr'},
        'lt': {'name': 'Lithuanian', 'native': 'Lietuvių', 'dir': 'ltr'},
        'mt': {'name': 'Maltese', 'native': 'Malti', 'dir': 'ltr'},
        'is': {'name': 'Icelandic', 'native': 'Íslenska', 'dir': 'ltr'},
        'ga': {'name': 'Irish', 'native': 'Gaeilge', 'dir': 'ltr'},
        'cy': {'name': 'Welsh', 'native': 'Cymraeg', 'dir': 'ltr'},
        'ca': {'name': 'Catalan', 'native': 'Català', 'dir': 'ltr'},
        'eu': {'name': 'Basque', 'native': 'Euskara', 'dir': 'ltr'},
        'gl': {'name': 'Galician', 'native': 'Galego', 'dir': 'ltr'},
        
        # Middle Eastern Languages
        'he': {'name': 'Hebrew', 'native': 'עברית', 'dir': 'rtl'},
        'fa': {'name': 'Persian', 'native': 'فارسی', 'dir': 'rtl'},
        'ps': {'name': 'Pashto', 'native': 'پښتو', 'dir': 'rtl'},
        'ku': {'name': 'Kurdish (Central)', 'native': 'کوردی', 'dir': 'rtl'},
        
        # African Languages
        'sw': {'name': 'Swahili', 'native': 'Kiswahili', 'dir': 'ltr'},
        'am': {'name': 'Amharic', 'native': 'አማርኛ', 'dir': 'ltr'},
        'zu': {'name': 'Zulu', 'native': 'isiZulu', 'dir': 'ltr'},
        'xh': {'name': 'Xhosa', 'native': 'isiXhosa', 'dir': 'ltr'},
        'af': {'name': 'Afrikaans', 'native': 'Afrikaans', 'dir': 'ltr'},
        'so': {'name': 'Somali', 'native': 'Soomaali', 'dir': 'ltr'},
        'ha': {'name': 'Hausa', 'native': 'Hausa', 'dir': 'ltr'},
        'ig': {'name': 'Igbo', 'native': 'Igbo', 'dir': 'ltr'},
        'yo': {'name': 'Yoruba', 'native': 'Yorùbá', 'dir': 'ltr'},
        'rw': {'name': 'Kinyarwanda', 'native': 'Kinyarwanda', 'dir': 'ltr'},
        'mg': {'name': 'Malagasy', 'native': 'Malagasy', 'dir': 'ltr'},
        
        # Other Languages
        'az': {'name': 'Azerbaijani', 'native': 'Azərbaycan', 'dir': 'ltr'},
        'uz': {'name': 'Uzbek', 'native': 'Oʻzbek', 'dir': 'ltr'},
        'kk': {'name': 'Kazakh', 'native': 'Қазақ', 'dir': 'ltr'},
        'ky': {'name': 'Kyrgyz', 'native': 'Кыргыз', 'dir': 'ltr'},
        'tg': {'name': 'Tajik', 'native': 'Тоҷикӣ', 'dir': 'ltr'},
        'tk': {'name': 'Turkmen', 'native': 'Türkmen', 'dir': 'ltr'},
        'mn': {'name': 'Mongolian', 'native': 'Монгол', 'dir': 'ltr'},
        'hy': {'name': 'Armenian', 'native': 'Հայերdelays', 'dir': 'ltr'},
        'ka': {'name': 'Georgian', 'native': 'ქართული', 'dir': 'ltr'},
        'sq': {'name': 'Albanian', 'native': 'Shqip', 'dir': 'ltr'},
        'mk': {'name': 'Macedonian', 'native': 'Македонски', 'dir': 'ltr'},
        'bs': {'name': 'Bosnian', 'native': 'Bosanski', 'dir': 'ltr'},
        
        # Pacific Languages
        'mi': {'name': 'Maori', 'native': 'Te Reo Māori', 'dir': 'ltr'},
        'sm': {'name': 'Samoan', 'native': 'Gagana Samoa', 'dir': 'ltr'},
        'to': {'name': 'Tongan', 'native': 'Lea Fakatonga', 'dir': 'ltr'},
        'fj': {'name': 'Fijian', 'native': 'Vosa Vakaviti', 'dir': 'ltr'},
        
        # Constructed/Other
        'eo': {'name': 'Esperanto', 'native': 'Esperanto', 'dir': 'ltr'},
    }
    
    # Medical terminology context for better healthcare translations
    HEALTHCARE_CONTEXT = {
        'category': 'health',
        'profanity_action': 'NoAction',
        'include_alignment': True,
        'include_sentence_length': True
    }
    
    def __init__(self):
        """Initialize the Azure Translator service."""
        self.key = os.getenv('AZURE_TRANSLATOR_KEY')
        self.endpoint = os.getenv('AZURE_TRANSLATOR_ENDPOINT', 'https://api.cognitive.microsofttranslator.com')
        self.region = os.getenv('AZURE_TRANSLATOR_REGION', 'eastus')
        
        if not self.key:
            logger.warning("Azure Translator key not configured. Translation features will be limited.")
    
    def _get_headers(self) -> Dict:
        """Get headers for API requests."""
        return {
            'Ocp-Apim-Subscription-Key': self.key,
            'Ocp-Apim-Subscription-Region': self.region,
            'Content-Type': 'application/json',
            'X-ClientTraceId': str(uuid.uuid4())
        }
    
    def get_supported_languages(self) -> Dict:
        """
        Get all supported languages with their details.
        Returns both the static list and live API response.
        """
        languages = []
        for code, details in self.SUPPORTED_LANGUAGES.items():
            languages.append({
                'code': code,
                'name': details['name'],
                'native_name': details['native'],
                'direction': details['dir']
            })
        
        # Sort alphabetically by name
        languages.sort(key=lambda x: x['name'])
        
        return {
            'languages': languages,
            'total_count': len(languages),
            'rtl_languages': [l['code'] for l in languages if l['direction'] == 'rtl']
        }
    
    def detect_language(self, text: str) -> Optional[Dict]:
        """
        Detect the language of the given text.
        
        Args:
            text: Text to detect language for
            
        Returns:
            Dictionary with detected language info or None on error
        """
        if not self.key:
            return {'language': 'en', 'score': 1.0, 'error': 'API key not configured'}
        
        try:
            url = f"{self.endpoint}/detect?api-version=3.0"
            body = [{'text': text[:10000]}]  # API limit
            
            response = requests.post(url, headers=self._get_headers(), json=body, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            if result and len(result) > 0:
                detected = result[0]
                return {
                    'language': detected.get('language'),
                    'score': detected.get('score'),
                    'is_translation_supported': detected.get('isTranslationSupported', True),
                    'alternatives': detected.get('alternatives', [])
                }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Language detection error: {str(e)}")
            return {'error': str(e)}
        
        return None
    
    def translate_text(
        self,
        text: Union[str, List[str]],
        target_language: str,
        source_language: Optional[str] = None,
        is_healthcare: bool = True
    ) -> Dict:
        """
        Translate text to the target language.
        
        Args:
            text: Single string or list of strings to translate
            target_language: Target language code (e.g., 'es', 'hi', 'zh-Hans')
            source_language: Source language code (auto-detect if None)
            is_healthcare: Enable healthcare context for medical translations
            
        Returns:
            Dictionary with translations and metadata
        """
        if not self.key:
            return {
                'success': False,
                'error': 'Azure Translator API key not configured',
                'translations': []
            }
        
        # Ensure text is a list
        if isinstance(text, str):
            texts = [text]
        else:
            texts = text
        
        # Validate target language
        if target_language not in self.SUPPORTED_LANGUAGES:
            return {
                'success': False,
                'error': f'Unsupported target language: {target_language}',
                'translations': []
            }
        
        try:
            # Build URL with parameters
            params = f"api-version=3.0&to={target_language}"
            if source_language:
                params += f"&from={source_language}"
            # Note: Custom categories like 'health' require Azure Custom Translator setup
            # For standard translation, we omit the category parameter
            
            url = f"{self.endpoint}/translate?{params}"
            
            # Prepare body (max 10000 chars per text element)
            body = [{'text': t[:10000]} for t in texts]
            
            response = requests.post(url, headers=self._get_headers(), json=body, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            translations = []
            for i, item in enumerate(result):
                if 'translations' in item and len(item['translations']) > 0:
                    trans = item['translations'][0]
                    translations.append({
                        'original': texts[i],
                        'translated': trans.get('text', ''),
                        'target_language': target_language,
                        'detected_language': item.get('detectedLanguage', {}).get('language'),
                        'confidence': item.get('detectedLanguage', {}).get('score')
                    })
            
            return {
                'success': True,
                'translations': translations,
                'source_language': source_language or (translations[0]['detected_language'] if translations else None),
                'target_language': target_language,
                'target_language_name': self.SUPPORTED_LANGUAGES.get(target_language, {}).get('name', target_language),
                'target_language_native': self.SUPPORTED_LANGUAGES.get(target_language, {}).get('native', ''),
                'is_rtl': self.SUPPORTED_LANGUAGES.get(target_language, {}).get('dir') == 'rtl'
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Translation error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'translations': []
            }
    
    def translate_prescription(self, prescription_data: Dict, target_language: str) -> Dict:
        """
        Translate all prescription fields to target language.
        
        Args:
            prescription_data: Dictionary containing prescription fields
            target_language: Target language code
            
        Returns:
            Dictionary with translated prescription data
        """
        fields_to_translate = [
            'ocr_raw_text',
            'safety_summary',
            'doctor_name',
            'clinic_name',
            'notes'
        ]
        
        texts_to_translate = []
        field_mapping = []
        
        # Collect all texts to translate
        for field in fields_to_translate:
            value = prescription_data.get(field, '')
            if value and isinstance(value, str) and value.strip():
                texts_to_translate.append(value)
                field_mapping.append(field)
        
        # Translate parsed_data if present
        parsed_data = prescription_data.get('parsed_data', {})
        parsed_fields = []
        if isinstance(parsed_data, dict):
            for key, value in parsed_data.items():
                if isinstance(value, str) and value.strip():
                    texts_to_translate.append(value)
                    parsed_fields.append(key)
        
        if not texts_to_translate:
            return {
                'success': True,
                'translated_prescription': prescription_data,
                'message': 'No content to translate'
            }
        
        # Perform batch translation
        result = self.translate_text(texts_to_translate, target_language, is_healthcare=True)
        
        if not result['success']:
            return result
        
        # Map translations back to fields
        translated_prescription = prescription_data.copy()
        translations = result['translations']
        
        idx = 0
        for field in field_mapping:
            if idx < len(translations):
                translated_prescription[f'{field}_translated'] = translations[idx]['translated']
                idx += 1
        
        # Handle parsed_data translations
        if parsed_fields:
            translated_parsed_data = parsed_data.copy()
            for key in parsed_fields:
                if idx < len(translations):
                    translated_parsed_data[f'{key}_translated'] = translations[idx]['translated']
                    idx += 1
            translated_prescription['parsed_data_translated'] = translated_parsed_data
        
        return {
            'success': True,
            'translated_prescription': translated_prescription,
            'target_language': target_language,
            'target_language_name': result['target_language_name'],
            'target_language_native': result['target_language_native'],
            'is_rtl': result['is_rtl']
        }
    
    def translate_drug_info(self, drug_data: Dict, target_language: str) -> Dict:
        """
        Translate drug information fields.
        
        Args:
            drug_data: Dictionary containing drug information
            target_language: Target language code
            
        Returns:
            Dictionary with translated drug data
        """
        fields_to_translate = [
            'drug_name',
            'generic_name',
            'dosage',
            'frequency',
            'duration',
            'instructions',
            'primary_use',
            'mechanism',
            'special_instructions'
        ]
        
        texts_to_translate = []
        field_mapping = []
        
        for field in fields_to_translate:
            value = drug_data.get(field, '')
            if value and isinstance(value, str) and value.strip():
                texts_to_translate.append(value)
                field_mapping.append(field)
        
        # Handle list fields (side effects, alternatives, concerns)
        list_fields = ['common_side_effects', 'generic_alternatives', 'safety_concerns']
        list_texts = []
        list_mapping = []
        
        for field in list_fields:
            items = drug_data.get(field, [])
            if isinstance(items, list):
                for i, item in enumerate(items):
                    if isinstance(item, str) and item.strip():
                        list_texts.append(item)
                        list_mapping.append((field, i))
        
        all_texts = texts_to_translate + list_texts
        
        if not all_texts:
            return {
                'success': True,
                'translated_drug': drug_data,
                'message': 'No content to translate'
            }
        
        result = self.translate_text(all_texts, target_language, is_healthcare=True)
        
        if not result['success']:
            return result
        
        translated_drug = drug_data.copy()
        translations = result['translations']
        
        # Map simple field translations
        idx = 0
        for field in field_mapping:
            if idx < len(translations):
                translated_drug[f'{field}_translated'] = translations[idx]['translated']
                idx += 1
        
        # Map list field translations
        translated_lists = {field: [] for field in list_fields}
        for field, _ in list_mapping:
            if idx < len(translations):
                translated_lists[field].append(translations[idx]['translated'])
                idx += 1
        
        for field in list_fields:
            if translated_lists[field]:
                translated_drug[f'{field}_translated'] = translated_lists[field]
        
        return {
            'success': True,
            'translated_drug': translated_drug,
            'target_language': target_language,
            'is_rtl': result['is_rtl']
        }
    
    def translate_lab_report(self, report_data: Dict, target_language: str) -> Dict:
        """
        Translate lab report fields.
        
        Args:
            report_data: Dictionary containing lab report data
            target_language: Target language code
            
        Returns:
            Dictionary with translated lab report data
        """
        fields_to_translate = [
            'report_type',
            'summary',
            'clinical_notes',
            'interpretation',
            'recommendations'
        ]
        
        texts_to_translate = []
        field_mapping = []
        
        for field in fields_to_translate:
            value = report_data.get(field, '')
            if value and isinstance(value, str) and value.strip():
                texts_to_translate.append(value)
                field_mapping.append(field)
        
        # Handle test results
        test_results = report_data.get('results', [])
        test_texts = []
        test_mapping = []
        
        if isinstance(test_results, list):
            for i, test in enumerate(test_results):
                if isinstance(test, dict):
                    for key in ['test_name', 'interpretation', 'notes']:
                        value = test.get(key, '')
                        if value and isinstance(value, str) and value.strip():
                            test_texts.append(value)
                            test_mapping.append((i, key))
        
        all_texts = texts_to_translate + test_texts
        
        if not all_texts:
            return {
                'success': True,
                'translated_report': report_data,
                'message': 'No content to translate'
            }
        
        result = self.translate_text(all_texts, target_language, is_healthcare=True)
        
        if not result['success']:
            return result
        
        translated_report = report_data.copy()
        translations = result['translations']
        
        idx = 0
        for field in field_mapping:
            if idx < len(translations):
                translated_report[f'{field}_translated'] = translations[idx]['translated']
                idx += 1
        
        # Handle test result translations
        if test_mapping and 'results' in translated_report:
            translated_results = list(translated_report['results'])
            for test_idx, key in test_mapping:
                if idx < len(translations):
                    if test_idx < len(translated_results):
                        translated_results[test_idx][f'{key}_translated'] = translations[idx]['translated']
                    idx += 1
            translated_report['results_translated'] = translated_results
        
        return {
            'success': True,
            'translated_report': translated_report,
            'target_language': target_language,
            'is_rtl': result['is_rtl']
        }
    
    def translate_safety_report(self, safety_data: Dict, target_language: str) -> Dict:
        """
        Translate drug safety analysis report.
        
        Args:
            safety_data: Dictionary containing safety analysis
            target_language: Target language code
            
        Returns:
            Dictionary with translated safety data
        """
        texts_to_translate = []
        field_mapping = []
        
        # Translate simple fields
        simple_fields = ['safety_summary', 'overall_recommendation']
        for field in simple_fields:
            value = safety_data.get(field, '')
            if value and isinstance(value, str):
                texts_to_translate.append(value)
                field_mapping.append(('simple', field))
        
        # Translate interaction arrays
        interaction_types = [
            'drug_drug_interactions',
            'drug_allergy_interactions', 
            'drug_disease_interactions',
            'drug_food_interactions',
            'critical_alerts'
        ]
        
        for int_type in interaction_types:
            interactions = safety_data.get(int_type, [])
            if isinstance(interactions, list):
                for i, interaction in enumerate(interactions):
                    if isinstance(interaction, dict):
                        for key in ['description', 'severity', 'recommendation', 'alert', 'message']:
                            value = interaction.get(key, '')
                            if value and isinstance(value, str):
                                texts_to_translate.append(value)
                                field_mapping.append(('interaction', int_type, i, key))
        
        if not texts_to_translate:
            return {
                'success': True,
                'translated_safety': safety_data,
                'message': 'No content to translate'
            }
        
        result = self.translate_text(texts_to_translate, target_language, is_healthcare=True)
        
        if not result['success']:
            return result
        
        translated_safety = safety_data.copy()
        translations = result['translations']
        
        idx = 0
        for mapping in field_mapping:
            if idx >= len(translations):
                break
                
            if mapping[0] == 'simple':
                translated_safety[f'{mapping[1]}_translated'] = translations[idx]['translated']
            elif mapping[0] == 'interaction':
                int_type, i, key = mapping[1], mapping[2], mapping[3]
                if int_type not in translated_safety:
                    translated_safety[f'{int_type}_translated'] = list(safety_data.get(int_type, []))
                if i < len(translated_safety.get(f'{int_type}_translated', [])):
                    translated_safety[f'{int_type}_translated'][i][f'{key}_translated'] = translations[idx]['translated']
            idx += 1
        
        return {
            'success': True,
            'translated_safety': translated_safety,
            'target_language': target_language,
            'is_rtl': result['is_rtl']
        }
    
    def get_ui_translations(self, target_language: str) -> Dict:
        """
        Get common UI strings translated for the interface.
        
        Args:
            target_language: Target language code
            
        Returns:
            Dictionary with translated UI strings
        """
        ui_strings = {
            # Navigation
            'home': 'Home',
            'prescriptions': 'Prescriptions',
            'lab_reports': 'Lab Reports',
            'medications': 'Medications',
            'reminders': 'Reminders',
            'profile': 'Profile',
            'settings': 'Settings',
            'logout': 'Logout',
            
            # Actions
            'upload': 'Upload',
            'download': 'Download',
            'translate': 'Translate',
            'save': 'Save',
            'cancel': 'Cancel',
            'delete': 'Delete',
            'edit': 'Edit',
            'view': 'View',
            'search': 'Search',
            'filter': 'Filter',
            'refresh': 'Refresh',
            
            # Prescription related
            'prescription_details': 'Prescription Details',
            'doctor_name': 'Doctor Name',
            'clinic_name': 'Clinic Name',
            'prescription_date': 'Prescription Date',
            'medications_list': 'Medications List',
            'dosage': 'Dosage',
            'frequency': 'Frequency',
            'duration': 'Duration',
            'instructions': 'Instructions',
            'upload_prescription': 'Upload Prescription',
            
            # Safety related
            'safety_analysis': 'Safety Analysis',
            'safety_score': 'Safety Score',
            'safe': 'Safe',
            'caution': 'Use with Caution',
            'warning': 'Warning',
            'danger': 'Danger',
            'drug_interactions': 'Drug Interactions',
            'allergies': 'Allergies',
            'side_effects': 'Side Effects',
            'consult_doctor': 'Consult Your Doctor',
            
            # Lab reports
            'lab_report_details': 'Lab Report Details',
            'test_name': 'Test Name',
            'result': 'Result',
            'normal_range': 'Normal Range',
            'status': 'Status',
            'abnormal': 'Abnormal',
            'normal': 'Normal',
            'critical': 'Critical',
            
            # Messages
            'loading': 'Loading...',
            'error_occurred': 'An error occurred',
            'success': 'Success',
            'no_results': 'No results found',
            'confirm_action': 'Are you sure?',
            
            # Language
            'select_language': 'Select Language',
            'translate_to': 'Translate to',
            'original_text': 'Original Text',
            'translated_text': 'Translated Text',
            'auto_detect': 'Auto Detect Language'
        }
        
        if target_language == 'en':
            return {
                'success': True,
                'translations': ui_strings,
                'target_language': 'en',
                'is_rtl': False
            }
        
        # Translate all UI strings
        texts = list(ui_strings.values())
        keys = list(ui_strings.keys())
        
        result = self.translate_text(texts, target_language, source_language='en', is_healthcare=False)
        
        if not result['success']:
            return result
        
        translated_ui = {}
        for i, key in enumerate(keys):
            if i < len(result['translations']):
                translated_ui[key] = result['translations'][i]['translated']
            else:
                translated_ui[key] = ui_strings[key]
        
        return {
            'success': True,
            'translations': translated_ui,
            'target_language': target_language,
            'target_language_name': result['target_language_name'],
            'is_rtl': result['is_rtl']
        }


# Singleton instance
translator_service = AzureTranslatorService()
