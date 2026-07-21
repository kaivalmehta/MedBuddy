# backend/prescriptions/urls_maps.py
# URL routes for Azure Maps location services

from django.urls import path
from . import views_maps

urlpatterns = [
    # Nearby facilities
    path('nearby/pharmacies/', views_maps.NearbyPharmaciesView.as_view(), name='nearby_pharmacies'),
    path('nearby/labs/', views_maps.NearbyLabsView.as_view(), name='nearby_labs'),
    path('nearby/doctors/', views_maps.NearbyDoctorsView.as_view(), name='nearby_doctors'),
    
    # Geocoding
    path('geocode/', views_maps.GeocodeAddressView.as_view(), name='geocode_address'),
    path('reverse-geocode/', views_maps.ReverseGeocodeView.as_view(), name='reverse_geocode'),
    
    # Reference data
    path('specializations/', views_maps.SpecializationsListView.as_view(), name='specializations_list'),
]