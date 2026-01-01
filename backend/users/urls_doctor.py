# backend/users/urls_doctor.py
# URL routes for doctor-specific functionality

from django.urls import path
from . import views_professional

urlpatterns = [
    # ============================================
    # DOCTOR PROFILE & DASHBOARD
    # ============================================
    path('profile/', views_professional.DoctorProfileView.as_view(), name='doctor_profile'),
    path('dashboard/', views_professional.DoctorDashboardView.as_view(), name='doctor_dashboard'),
    path('sent-prescriptions/', views_professional.DoctorSentPrescriptionsView.as_view(), name='doctor_sent_prescriptions'),
    path('prescription/<uuid:prescription_id>/analyze/', views_professional.DoctorAnalyzePrescriptionView.as_view(), name='doctor_analyze_prescription'),
    
    # ============================================
    # PATIENT ACCESS (OTP VERIFICATION)
    # ============================================
    path('patient/check/', views_professional.CheckPatientView.as_view(), name='check_patient'),
    path('patient/request-access/', views_professional.RequestPatientAccessView.as_view(), name='request_patient_access'),
    path('patient/verify-otp/', views_professional.VerifyPatientOTPView.as_view(), name='verify_patient_otp'),
    path('patient/<uuid:patient_id>/history/', views_professional.ViewPatientHistoryView.as_view(), name='view_patient_history'),
    path('sessions/', views_professional.ActiveSessionsView.as_view(), name='active_sessions'),
    
    # ============================================
    # PRESCRIPTION UPLOAD (WITH OTP VERIFICATION)
    # ============================================
    path('prescription/initiate/', views_professional.InitiatePrescriptionUploadView.as_view(), name='initiate_prescription'),
    path('prescription/upload/', views_professional.DoctorUploadPrescriptionView.as_view(), name='upload_prescription'),
    path('prescription/digital/', views_professional.CreateDigitalPrescriptionView.as_view(), name='create_digital_prescription'),
]