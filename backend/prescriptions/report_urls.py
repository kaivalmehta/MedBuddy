# ============================================
# backend/prescriptions/report_urls.py (CREATE NEW FILE)
# ============================================

from django.urls import path
from . import report_views

urlpatterns = [
    path('', report_views.LabReportListView.as_view(), name='report_list'),
    path('upload/', report_views.LabReportUploadView.as_view(), name='report_upload'),
    path('<uuid:pk>/', report_views.LabReportDetailView.as_view(), name='report_detail'),
    path('<uuid:pk>/analyze/', report_views.LabReportAnalyzeView.as_view(), name='report_analyze'),
    path('history/', report_views.LabReportHistoryView.as_view(), name='report_history'),
]