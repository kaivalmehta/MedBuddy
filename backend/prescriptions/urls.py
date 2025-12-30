
# ============================================
# backend/prescriptions/urls.py (REPLACE)
# ============================================

from django.urls import path
from . import views
from . import views_speech

urlpatterns = [
    path('', views.PrescriptionListView.as_view(), name='prescription_list'),
    path('upload/', views.PrescriptionUploadView.as_view(), name='prescription_upload'),
    path('dashboard/', views.PatientDashboardView.as_view(), name='patient_dashboard'),
    path('<uuid:pk>/', views.PrescriptionDetailView.as_view(), name='prescription_detail'),
    path('<uuid:pk>/analyze/', views.PrescriptionAnalyzeView.as_view(), name='prescription_analyze'),
    path('<uuid:pk>/send-to-pharmacy/', views.SendToPharmacyView.as_view(), name='send_to_pharmacy'),
    path('reminders/', views.ReminderListView.as_view(), name='reminder_list'),
    path('reminders/<uuid:pk>/', views.ReminderDetailView.as_view(), name='reminder_detail'),
    path('reminders/<uuid:pk>/mark-taken/', views.MarkDoseTakenView.as_view(), name='mark_dose_taken'),
    path('history/', views.PrescriptionHistoryView.as_view(), name='prescription_history'),
    
    # Lab Reports - Patient endpoints
    path('lab-reports/', views.PatientLabReportsView.as_view(), name='patient_lab_reports'),
    path('lab-reports/upload/', views.PatientLabReportUploadView.as_view(), name='patient_lab_report_upload'),
    path('lab-reports/<uuid:report_id>/', views.PatientLabReportDetailView.as_view(), name='patient_lab_report_detail'),
    path('lab-reports/<uuid:report_id>/analyze/', views.PatientLabReportAnalyzeView.as_view(), name='patient_lab_report_analyze'),
    
    # Speech Services - Text-to-Speech & Speech-to-Text
    path('speech/voices/', views_speech.AvailableVoicesView.as_view(), name='available_voices'),
    path('speech/text-to-speech/', views_speech.CustomTextToSpeechView.as_view(), name='custom_tts'),
    path('speech/speech-to-text/', views_speech.SpeechToTextView.as_view(), name='speech_to_text'),
    path('<uuid:prescription_id>/speak/', views_speech.PrescriptionTextToSpeechView.as_view(), name='prescription_tts'),
    path('lab-reports/<uuid:report_id>/speak/', views_speech.LabReportTextToSpeechView.as_view(), name='lab_report_tts'),
]
