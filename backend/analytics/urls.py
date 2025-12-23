from django.urls import path
from . import views

urlpatterns = [
    path('patient/dashboard/', views.PatientDashboardView.as_view(), name='patient_dashboard'),
    path('patient/adherence/', views.AdherenceReportView.as_view(), name='adherence_report'),
    path('pharmacy/dashboard/', views.PharmacyDashboardView.as_view(), name='pharmacy_dashboard'),
    path('export/history/', views.ExportHistoryView.as_view(), name='export_history'),
]