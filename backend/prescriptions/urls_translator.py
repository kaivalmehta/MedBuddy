# backend/prescriptions/urls_translator.py
"""
URL routing for Translation API endpoints
"""

from django.urls import path
from . import views_translator

urlpatterns = [
    # Language Support
    path('languages/', views_translator.get_supported_languages, name='supported-languages'),
    path('detect/', views_translator.detect_language, name='detect-language'),
    
    # Text Translation
    path('text/', views_translator.translate_text, name='translate-text'),
    path('batch/', views_translator.translate_batch, name='translate-batch'),
    
    # Document Translation
    path('prescription/<uuid:prescription_id>/', views_translator.translate_prescription, name='translate-prescription'),
    path('lab-report/<uuid:report_id>/', views_translator.translate_lab_report, name='translate-lab-report'),
    path('drug/<uuid:drug_id>/', views_translator.translate_drug, name='translate-drug'),
    path('safety-report/<uuid:prescription_id>/', views_translator.translate_safety_report, name='translate-safety-report'),
    
    # UI Translations
    path('ui/<str:language_code>/', views_translator.get_ui_translations, name='ui-translations'),
]
