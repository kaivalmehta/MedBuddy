# backend/prescriptions/views_maps.py
# Azure Maps integration for finding nearby healthcare facilities

from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.db.models import F
from math import radians, sin, cos, sqrt, atan2
import requests
import logging
from rest_framework.permissions import AllowAny

from pharmacy.models import Pharmacy
from users.models import DoctorProfile, LaboratoryProfile

logger = logging.getLogger(__name__)

from math import radians, cos, sin, asin, sqrt, atan2


def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance in kilometers between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert to float to handle Decimal fields
    lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Earth's radius in kilometers
    r = 6371
    
    return c * r


class NearbyPharmaciesView(views.APIView):
    """Find nearby pharmacies based on user location"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        """
        Get nearby pharmacies.
        
        Query params:
            lat: Latitude (required)
            lon: Longitude (required)
            radius: Search radius in km (default: 10)
            medication: Optional - filter by medication in stock
        """
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        radius = float(request.query_params.get('radius', 10))
        medication = request.query_params.get('medication', '')
        
        if not lat or not lon:
            return Response(
                {'error': 'Latitude and longitude are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lat = float(lat)
            lon = float(lon)
        except ValueError:
            return Response(
                {'error': 'Invalid latitude or longitude'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get verified pharmacies with location (check both profile and user verification)
        pharmacies = Pharmacy.objects.filter(
            is_verified=True,
            user__is_professional_verified=True,
            latitude__isnull=False,
            longitude__isnull=False
        ).select_related('user')
        
        # Filter by medication if specified
        if medication:
            pharmacies = pharmacies.filter(
                inventory__drug_name__icontains=medication,
                inventory__quantity_in_stock__gt=0
            ).distinct()
        
        # Calculate distances and filter by radius
        nearby = []
        for pharmacy in pharmacies:
            distance = self._haversine_distance(lat, lon, pharmacy.latitude, pharmacy.longitude)
            if distance <= radius:
                nearby.append({
                    'id': str(pharmacy.id),
                    'name': pharmacy.name,
                    'address': pharmacy.address,
                    'city': pharmacy.city,
                    'state': pharmacy.state,
                    'phone': pharmacy.phone,
                    'email': pharmacy.email,
                    'latitude': float(pharmacy.latitude),
                    'longitude': float(pharmacy.longitude),
                    'distance_km': round(distance, 2),
                    'is_open': self._is_open(pharmacy),
                    'rating': float(pharmacy.rating) if pharmacy.rating else None,
                })
        
        # Sort by distance
        nearby.sort(key=lambda x: x['distance_km'])
        
        return Response({
            'count': len(nearby[:20]),
            'pharmacies': nearby[:20],
            'search_location': {'lat': lat, 'lon': lon},
            'radius_km': radius
        })
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in km
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def _is_open(self, pharmacy):
        """Check if pharmacy is currently open (simplified)"""
        # This would need actual business hours logic
        return True


class NearbyLabsView(views.APIView):
    """Find nearby laboratories by location"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        radius_km = float(request.query_params.get('radius', 10))
        test = request.query_params.get('test', '')
        home_collection = request.query_params.get('home_collection', '').lower() == 'true'
        
        if not lat or not lon:
            return Response({'error': 'Latitude and longitude required'}, status=400)
        
        try:
            user_lat = float(lat)
            user_lon = float(lon)
        except ValueError:
            return Response({'error': 'Invalid coordinates'}, status=400)
        
        from users.models import LaboratoryProfile
        
        # Get verified labs with location (check both profile and user verification)
        labs = LaboratoryProfile.objects.filter(
            is_verified=True,
            user__is_professional_verified=True,
            latitude__isnull=False,
            longitude__isnull=False
        ).select_related('user')
        
        # Filter by home collection if requested
        if home_collection:
            labs = labs.filter(offers_home_collection=True)
        
        results = []
        for lab in labs:
            distance = haversine(user_lat, user_lon, lab.latitude, lab.longitude)
            if distance <= radius_km:
                results.append({
                    'id': str(lab.id),
                    'name': lab.name,
                    'address': lab.address,
                    'city': lab.city,
                    'state': lab.state,
                    'phone': lab.phone,
                    'accreditation': getattr(lab, 'accreditation', ''),
                    'offers_home_collection': lab.offers_home_collection,
                    'latitude': float(lab.latitude),
                    'longitude': float(lab.longitude),
                    'distance_km': round(distance, 2),
                })
        
        results.sort(key=lambda x: x['distance_km'])
        return Response({
            'count': len(results[:50]),
            'laboratories': results[:50],
            'search_location': {'lat': user_lat, 'lon': user_lon},
            'radius_km': radius_km
        })


class NearbyDoctorsView(views.APIView):
    """Find nearby doctors by location"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        radius_km = float(request.query_params.get('radius', 10))
        specialization = request.query_params.get('specialization', '')
        
        if not lat or not lon:
            return Response({'error': 'Latitude and longitude required'}, status=400)
        
        try:
            user_lat = float(lat)
            user_lon = float(lon)
        except ValueError:
            return Response({'error': 'Invalid coordinates'}, status=400)
        
        from users.models import DoctorProfile
        
        # Get verified doctors with location (check both profile and user verification)
        doctors = DoctorProfile.objects.filter(
            is_verified=True,
            user__is_professional_verified=True,
            latitude__isnull=False,
            longitude__isnull=False
        ).select_related('user')
        
        # Filter by specialization if provided
        if specialization:
            doctors = doctors.filter(specialization__icontains=specialization)
        
        results = []
        for doctor in doctors:
            distance = haversine(user_lat, user_lon, doctor.latitude, doctor.longitude)
            if distance <= radius_km:
                results.append({
                    'id': str(doctor.id),
                    'name': f"Dr. {doctor.full_name}",
                    'specialization': doctor.specialization,
                    'qualification': doctor.qualification,
                    'clinic_name': doctor.clinic_name,
                    'clinic_address': doctor.clinic_address,
                    'phone': doctor.clinic_phone or doctor.user.phone,
                    'email': doctor.user.email,
                    'consultation_fee': str(doctor.consultation_fee) if doctor.consultation_fee else None,
                    'experience_years': doctor.experience_years,
                    'latitude': float(doctor.latitude),
                    'longitude': float(doctor.longitude),
                    'distance_km': round(distance, 2),
                })
        
        results.sort(key=lambda x: x['distance_km'])
        return Response({
            'count': len(results[:50]),
            'doctors': results[:50],
            'search_location': {'lat': user_lat, 'lon': user_lon},
            'radius_km': radius_km
        })

class GeocodeAddressView(views.APIView):
    """Convert address to coordinates using Azure Maps"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Geocode an address.
        
        Query params:
            address: Address to geocode (required)
        """
        address = request.query_params.get('address', '')
        
        if not address:
            return Response(
                {'error': 'Address is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        maps_key = settings.AZURE_MAPS_KEY
        if not maps_key:
            return Response(
                {'error': 'Maps service not configured'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        try:
            # Azure Maps Geocoding API
            url = "https://atlas.microsoft.com/search/address/json"
            params = {
                'api-version': '1.0',
                'subscription-key': maps_key,
                'query': address,
                'countrySet': 'IN',  # Prioritize India
                'limit': 5
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for result in data.get('results', []):
                position = result.get('position', {})
                address_info = result.get('address', {})
                results.append({
                    'latitude': position.get('lat'),
                    'longitude': position.get('lon'),
                    'formatted_address': address_info.get('freeformAddress'),
                    'city': address_info.get('municipality'),
                    'state': address_info.get('countrySubdivision'),
                    'country': address_info.get('country'),
                    'postal_code': address_info.get('postalCode'),
                })
            
            return Response({
                'query': address,
                'count': len(results),
                'results': results
            })
            
        except requests.RequestException as e:
            logger.error(f"Geocoding error: {e}")
            return Response(
                {'error': 'Failed to geocode address'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReverseGeocodeView(views.APIView):
    """Convert coordinates to address using Azure Maps"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Reverse geocode coordinates.
        
        Query params:
            lat: Latitude (required)
            lon: Longitude (required)
        """
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        
        if not lat or not lon:
            return Response(
                {'error': 'Latitude and longitude are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        maps_key = settings.AZURE_MAPS_KEY
        if not maps_key:
            return Response(
                {'error': 'Maps service not configured'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        try:
            # Azure Maps Reverse Geocoding API
            url = "https://atlas.microsoft.com/search/address/reverse/json"
            params = {
                'api-version': '1.0',
                'subscription-key': maps_key,
                'query': f"{lat},{lon}"
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            addresses = data.get('addresses', [])
            if addresses:
                address = addresses[0].get('address', {})
                return Response({
                    'latitude': float(lat),
                    'longitude': float(lon),
                    'formatted_address': address.get('freeformAddress'),
                    'street': address.get('streetName'),
                    'city': address.get('municipality'),
                    'state': address.get('countrySubdivision'),
                    'country': address.get('country'),
                    'postal_code': address.get('postalCode'),
                })
            
            return Response({
                'latitude': float(lat),
                'longitude': float(lon),
                'formatted_address': None,
                'error': 'No address found for these coordinates'
            })
            
        except requests.RequestException as e:
            logger.error(f"Reverse geocoding error: {e}")
            return Response(
                {'error': 'Failed to reverse geocode'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SpecializationsListView(views.APIView):
    """Get list of available doctor specializations"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        specializations = DoctorProfile.objects.filter(
            is_verified=True,
            user__is_professional_verified=True
        ).values_list('specialization', flat=True).distinct()
        
        return Response({
            'specializations': sorted([s for s in specializations if s])
        })