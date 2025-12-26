# backend/users/urls_test_orders.py
# URL routes for test orders, home collection, and critical alerts

from django.urls import path
from . import views_laboratory as views

urlpatterns = [
    # ============================================
    # LABORATORY SEARCH (For Doctors)
    # ============================================
    path('labs/search/', views.LaboratorySearchView.as_view(), name='lab_search'),
    path('labs/<uuid:lab_id>/', views.LaboratoryDetailView.as_view(), name='lab_detail'),
    
    # ============================================
    # TEST CATALOG (For Labs)
    # ============================================
    path('catalog/', views.TestCatalogListView.as_view(), name='test_catalog_list'),
    path('catalog/<uuid:test_id>/', views.TestCatalogDetailView.as_view(), name='test_catalog_detail'),
    
    # ============================================
    # TEST ORDERS - DOCTOR ENDPOINTS
    # ============================================
    path('doctor/orders/', views.DoctorTestOrdersView.as_view(), name='doctor_test_orders'),
    path('doctor/orders/create/', views.DoctorCreateTestOrderView.as_view(), name='doctor_create_test_order'),
    path('doctor/orders/<uuid:order_id>/', views.DoctorTestOrderDetailView.as_view(), name='doctor_test_order_detail'),
    
    # ============================================
    # TEST ORDERS - LABORATORY ENDPOINTS
    # ============================================
    path('lab/orders/', views.LabTestOrdersView.as_view(), name='lab_test_orders'),
    path('lab/orders/<uuid:order_id>/', views.LabTestOrderDetailView.as_view(), name='lab_test_order_detail'),
    path('lab/orders/<uuid:order_id>/status/', views.LabUpdateOrderStatusView.as_view(), name='lab_update_order_status'),
    
    # ============================================
    # HOME COLLECTION - LABORATORY ENDPOINTS
    # ============================================
    path('lab/collections/', views.LabHomeCollectionsView.as_view(), name='lab_home_collections'),
    path('lab/collections/<uuid:collection_id>/', views.LabHomeCollectionDetailView.as_view(), name='lab_home_collection_detail'),
    
    # ============================================
    # REPORT UPLOAD WITH ANALYSIS
    # ============================================
    path('lab/upload-report/', views.LabUploadReportWithAnalysisView.as_view(), name='lab_upload_report_analysis'),
    
    # ============================================
    # CRITICAL ALERTS
    # ============================================
    path('alerts/', views.CriticalAlertsView.as_view(), name='critical_alerts'),
    path('alerts/<uuid:alert_id>/acknowledge/', views.AcknowledgeCriticalAlertView.as_view(), name='acknowledge_alert'),
    
    # ============================================
    # PATIENT ENDPOINTS
    # ============================================
    path('patient/orders/', views.PatientTestOrdersView.as_view(), name='patient_test_orders'),
    path('patient/orders/create/', views.PatientCreateTestOrderView.as_view(), name='patient_create_test_order'),
    path('patient/orders/<uuid:order_id>/', views.PatientTestOrderDetailView.as_view(), name='patient_test_order_detail'),
]
