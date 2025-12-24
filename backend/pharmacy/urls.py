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
    path('inventory/<uuid:pk>/', views.InventoryDetailView.as_view(), name='inventory_detail'),
    
    # ============================================
    # PUBLIC (For patients finding pharmacies)
    # ============================================
    path('nearby/', views.NearbyPharmaciesView.as_view(), name='nearby_pharmacies'),
    path('<uuid:pk>/reviews/', views.PharmacyReviewView.as_view(), name='pharmacy_reviews'),
]
