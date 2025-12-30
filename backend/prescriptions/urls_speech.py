# backend/prescriptions/urls_speech.py
# URL routes for Azure Speech Services

from django.urls import path
from . import views_speech

urlpatterns = [
    # General speech services
    path('text-to-speech/', views_speech.CustomTextToSpeechView.as_view(), name='text_to_speech'),
    path('speech-to-text/', views_speech.SpeechToTextView.as_view(), name='speech_to_text'),
    path('voices/', views_speech.AvailableVoicesView.as_view(), name='voice_list'),
    
    # Content-specific audio generation
    path('prescription/<uuid:prescription_id>/audio/', views_speech.PrescriptionTextToSpeechView.as_view(), name='prescription_audio'),
    path('lab-report/<uuid:report_id>/audio/', views_speech.LabReportTextToSpeechView.as_view(), name='lab_report_audio'),
]