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
    path('patient/request-access/', views_professional.LabRequestPatientAccessView.as_view(), name='lab_request_patient_access'),
    path('patient/verify-otp/', views_professional.VerifyPatientOTPView.as_view(), name='lab_verify_patient_otp'),
    
    # ============================================
    # REPORT UPLOAD (WITH OTP VERIFICATION)
    # ============================================
    path('report/upload/', views_professional.LabUploadReportView.as_view(), name='lab_upload_report'),
]
