# ============================================
# backend/medbuddy_api/urls.py
# Complete URL configuration
# ============================================

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # ============================================
    # AUTHENTICATION & USER APIs
    # ============================================
    path('api/auth/', include('users.urls')),
    
    # ============================================
    # ADMIN APIs
    # ============================================
    path('api/admin/', include('users.urls_admin')),
    
    # ============================================
    # PROFESSIONAL APIs (Doctor, Lab)
    # ============================================
    path('api/doctor/', include('users.urls_doctor')),
    path('api/laboratory/', include('users.urls_laboratory')),
    
    # ============================================
    # TEST ORDERS & LAB FEATURES
    # ============================================
    path('api/test-orders/', include('users.urls_test_orders')),
    
    # ============================================
    # PRESCRIPTION & REPORT APIs
    # ============================================
    path('api/prescriptions/', include('prescriptions.urls')),
    path('api/reports/', include('prescriptions.report_urls')),
    
    # ============================================
    # SPEECH SERVICES APIs
    # ============================================
    path('api/speech/', include('prescriptions.urls_speech')),
    
    # ============================================
    # PHARMACY APIs
    # ============================================
    path('api/pharmacy/', include('pharmacy.urls')),
    
    # ============================================
    # ANALYTICS APIs
    # ============================================
    path('api/analytics/', include('analytics.urls')),
    
    # ============================================
    # API DOCUMENTATION
    # ============================================
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # ============================================
    # LOCATION/MAPS APIs
    # ============================================
    path('api/location/', include('prescriptions.urls_maps')),
    
    # ============================================
    # TRANSLATION APIs (Azure Translator)
    # ============================================
    path('api/translate/', include('prescriptions.urls_translator')),
]