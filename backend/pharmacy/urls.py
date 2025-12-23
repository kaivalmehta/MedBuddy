from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.PharmacyProfileView.as_view(), name='pharmacy_profile'),
    path('orders/', views.PharmacyOrderListView.as_view(), name='pharmacy_orders'),
    path('orders/<uuid:pk>/', views.PharmacyOrderDetailView.as_view(), name='order_detail'),
    path('orders/<uuid:pk>/status/', views.UpdateOrderStatusView.as_view(), name='update_order_status'),
    path('orders/<uuid:pk>/verify/', views.VerifyPrescriptionView.as_view(), name='verify_prescription'),
    path('inventory/', views.InventoryListView.as_view(), name='inventory'),
    path('inventory/<uuid:pk>/', views.InventoryDetailView.as_view(), name='inventory_detail'),
    path('nearby/', views.NearbyPharmaciesView.as_view(), name='nearby_pharmacies'),
    path('<uuid:pk>/reviews/', views.PharmacyReviewView.as_view(), name='pharmacy_reviews'),
    path('chat/<uuid:order_id>/', views.ChatView.as_view(), name='order_chat'),
]