# backend/users/urls_laboratory.py
# URL routes for laboratory-specific functionality

from django.urls import path
from . import views_professional

urlpatterns = [
    # ============================================
    # LABORATORY PROFILE & DASHBOARD
    # ============================================
    path('profile/', views_professional.LaboratoryProfileView.as_view(), name='lab_profile'),
    path('dashboard/', views_professional.LabDashboardView.as_view(), name='lab_dashboard'),
    
    # ============================================
    # PATIENT ACCESS (OTP VERIFICATION)
    # ============================================
    path('patient/check/', views_professional.LabCheckPatientView.as_view(), name='lab_check_patient'),
    path('patient/request-access/', views_professional.LabRequestPatientAccessView.as_view(), name='lab_request_patient_access'),
    path('patient/verify-otp/', views_professional.LabVerifyPatientOTPView.as_view(), name='lab_verify_patient_otp'),
    path('patient/sessions/', views_professional.LabActiveSessionsView.as_view(), name='lab_active_sessions'),
    path('patient/<uuid:patient_id>/history/', views_professional.LabPatientHistoryView.as_view(), name='lab_patient_history'),
    
    # ============================================
    # REPORT UPLOAD & MANAGEMENT
    # ============================================
    path('report/upload/', views_professional.LabUploadReportView.as_view(), name='lab_upload_report'),
    path('reports/sent/', views_professional.LabSentReportsView.as_view(), name='lab_sent_reports'),
    path('reports/<uuid:report_id>/', views_professional.LabReportDetailView.as_view(), name='lab_report_detail'),
]
