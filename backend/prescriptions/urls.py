from django.urls import path
from . import views

urlpatterns = [
    path('', views.PrescriptionListView.as_view(), name='prescription_list'),
    path('upload/', views.PrescriptionUploadView.as_view(), name='prescription_upload'),
    path('<uuid:pk>/', views.PrescriptionDetailView.as_view(), name='prescription_detail'),
    path('<uuid:pk>/analyze/', views.PrescriptionAnalyzeView.as_view(), name='prescription_analyze'),
    path('<uuid:pk>/send-to-pharmacy/', views.SendToPharmacyView.as_view(), name='send_to_pharmacy'),
    path('reminders/', views.ReminderListView.as_view(), name='reminder_list'),
    path('reminders/<uuid:pk>/mark-taken/', views.MarkDoseTakenView.as_view(), name='mark_dose_taken'),
    path('history/', views.PrescriptionHistoryView.as_view(), name='prescription_history'),
]