# backend/pharmacy/urls.py
# URL routes for pharmacy functionality

from django.urls import path
from . import views

urlpatterns = [
    # ============================================
    # PHARMACY PROFILE & DASHBOARD
    # ============================================
    path('profile/', views.PharmacyProfileView.as_view(), name='pharmacy_profile'),
    path('dashboard/', views.PharmacyDashboardView.as_view(), name='pharmacy_dashboard'),
    
    # ============================================
    # PATIENT ACCESS (OTP VERIFICATION)
    # ============================================
    path('patient/check/', views.PharmacyCheckPatientView.as_view(), name='pharmacy_check_patient'),
    path('patient/request-access/', views.PharmacyRequestPatientAccessView.as_view(), name='pharmacy_request_access'),
    path('patient/verify-otp/', views.PharmacyVerifyPatientOTPView.as_view(), name='pharmacy_verify_otp'),
    path('patient/sessions/', views.PharmacyActiveSessionsView.as_view(), name='pharmacy_active_sessions'),
    path('patient/<uuid:patient_id>/history/', views.PharmacyPatientHistoryView.as_view(), name='pharmacy_patient_history'),
    
    # ============================================
    # PRESCRIPTION MANAGEMENT
    # ============================================
    path('prescription/upload/', views.PharmacySendPrescriptionView.as_view(), name='pharmacy_upload_prescription'),
    path('prescription/<uuid:pk>/analyze/', views.PharmacyAnalyzePrescriptionView.as_view(), name='pharmacy_analyze_prescription'),
    path('prescriptions/', views.PharmacyPrescriptionHistoryView.as_view(), name='pharmacy_prescription_history'),
    
    # ============================================
    # ORDERS
    # ============================================
    path('orders/', views.PharmacyOrderListView.as_view(), name='pharmacy_orders'),
    path('orders/<uuid:pk>/', views.PharmacyOrderDetailView.as_view(), name='pharmacy_order_detail'),
    path('orders/<uuid:pk>/status/', views.UpdateOrderStatusView.as_view(), name='update_order_status'),
    path('orders/<uuid:pk>/verify/', views.VerifyPrescriptionView.as_view(), name='verify_prescription'),
    path('orders/<uuid:order_id>/chat/', views.ChatView.as_view(), name='order_chat'),
    
    # ============================================
    # INVENTORY
    # ============================================
    path('inventory/', views.InventoryListView.as_view(), name='pharmacy_inventory'),
    path('inventory/alerts/', views.InventoryAlertsView.as_view(), name='inventory_alerts'),
    path('inventory/bulk-update/', views.InventoryBulkUpdateView.as_view(), name='inventory_bulk_update'),
    path('inventory/<uuid:pk>/', views.InventoryDetailView.as_view(), name='inventory_detail'),
    path('inventory/<uuid:pk>/restock/', views.InventoryRestockView.as_view(), name='inventory_restock'),
    
    # ============================================
    # SALES / DISPENSE
    # ============================================
    path('sales/dispense/', views.DispenseItemView.as_view(), name='dispense_item'),
    path('sales/history/', views.SalesHistoryView.as_view(), name='sales_history'),
    path('sales/dashboard/', views.SalesDashboardView.as_view(), name='sales_dashboard'),
    
    # ============================================
    # PUBLIC (For patients finding pharmacies)
    # ============================================
    path('nearby/', views.NearbyPharmaciesView.as_view(), name='nearby_pharmacies'),
    path('registered/', views.RegisteredPharmaciesView.as_view(), name='registered_pharmacies'),
    path('<uuid:pk>/reviews/', views.PharmacyReviewView.as_view(), name='pharmacy_reviews'),
    
    # ============================================
    # PRESCRIPTION ORDERS (Patient-initiated)
    # ============================================
    # Patient endpoints
    path('prescription-orders/', views.PatientPrescriptionOrderListView.as_view(), name='patient_prescription_orders'),
    path('prescription-orders/create/', views.PatientPrescriptionOrderCreateView.as_view(), name='create_prescription_order'),
    path('prescription-orders/<uuid:order_id>/', views.PatientPrescriptionOrderDetailView.as_view(), name='patient_prescription_order_detail'),
    
    # Pharmacy endpoints
    path('rx-orders/', views.PharmacyPrescriptionOrderListView.as_view(), name='pharmacy_rx_orders'),
    path('rx-orders/<uuid:order_id>/', views.PharmacyPrescriptionOrderDetailView.as_view(), name='pharmacy_rx_order_detail'),
    path('rx-orders/<uuid:order_id>/quote/', views.PharmacyProvideQuoteView.as_view(), name='pharmacy_provide_quote'),
    path('rx-orders/<uuid:order_id>/status/', views.PharmacyUpdateOrderStatusView.as_view(), name='pharmacy_update_rx_status'),
]