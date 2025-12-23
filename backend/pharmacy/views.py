from rest_framework import generics, views, status
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg
from django.db.models.functions import Radians, Sin, Cos, ACos
from django.utils import timezone
from .models import Pharmacy, PharmacyOrder, PharmacyInventory, PharmacyReview, ChatMessage
from .serializers import (PharmacySerializer, PharmacyOrderSerializer,
                          OrderStatusUpdateSerializer, PharmacyInventorySerializer,
                          PharmacyReviewSerializer, ChatMessageSerializer)


class PharmacyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = PharmacySerializer
    
    def get_object(self):
        return Pharmacy.objects.get(user=self.request.user)


class PharmacyOrderListView(generics.ListAPIView):
    serializer_class = PharmacyOrderSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'pharmacy':
            qs = PharmacyOrder.objects.filter(pharmacy__user=user)
        else:
            qs = PharmacyOrder.objects.filter(patient=user)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        return qs.select_related('prescription', 'pharmacy', 'patient')


class PharmacyOrderDetailView(generics.RetrieveAPIView):
    serializer_class = PharmacyOrderSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'pharmacy':
            return PharmacyOrder.objects.filter(pharmacy__user=user)
        return PharmacyOrder.objects.filter(patient=user)


class UpdateOrderStatusView(views.APIView):
    def patch(self, request, pk):
        try:
            order = PharmacyOrder.objects.get(pk=pk, pharmacy__user=request.user)
        except PharmacyOrder.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)
        
        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        order.status = serializer.validated_data['status']
        if 'pharmacist_notes' in serializer.validated_data:
            order.pharmacist_notes = serializer.validated_data['pharmacist_notes']
        if 'estimated_ready_time' in serializer.validated_data:
            order.estimated_ready_time = serializer.validated_data['estimated_ready_time']
        
        if order.status == 'completed':
            order.completed_at = timezone.now()
            order.prescription.status = 'completed'
            order.prescription.save()
        
        order.save()
        return Response(PharmacyOrderSerializer(order).data)


class VerifyPrescriptionView(views.APIView):
    def post(self, request, pk):
        try:
            order = PharmacyOrder.objects.get(pk=pk, pharmacy__user=request.user)
        except PharmacyOrder.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)
        
        order.verified_by = request.data.get('verified_by', request.user.email)
        order.verification_notes = request.data.get('notes', '')
        order.verified_at = timezone.now()
        order.status = 'verified'
        order.save()
        
        return Response(PharmacyOrderSerializer(order).data)


class InventoryListView(generics.ListCreateAPIView):
    serializer_class = PharmacyInventorySerializer
    
    def get_queryset(self):
        return PharmacyInventory.objects.filter(pharmacy__user=self.request.user)
    
    def perform_create(self, serializer):
        pharmacy = Pharmacy.objects.get(user=self.request.user)
        serializer.save(pharmacy=pharmacy)


class InventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PharmacyInventorySerializer
    
    def get_queryset(self):
        return PharmacyInventory.objects.filter(pharmacy__user=self.request.user)


class NearbyPharmaciesView(generics.ListAPIView):
    serializer_class = PharmacySerializer
    permission_classes = []
    
    def get_queryset(self):
        lat = float(self.request.query_params.get('lat', 0))
        lng = float(self.request.query_params.get('lng', 0))
        radius_km = float(self.request.query_params.get('radius', 10))
        
        return Pharmacy.objects.filter(
            is_active=True,
            is_verified=True,
            latitude__isnull=False
        ).annotate(
            distance_km=6371 * ACos(
                Cos(Radians(lat)) * Cos(Radians('latitude')) *
                Cos(Radians('longitude') - Radians(lng)) +
                Sin(Radians(lat)) * Sin(Radians('latitude'))
            )
        ).filter(distance_km__lte=radius_km).order_by('distance_km')


class PharmacyReviewView(generics.ListCreateAPIView):
    serializer_class = PharmacyReviewSerializer
    
    def get_queryset(self):
        return PharmacyReview.objects.filter(pharmacy_id=self.kwargs['pk'])
    
    def perform_create(self, serializer):
        pharmacy = Pharmacy.objects.get(pk=self.kwargs['pk'])
        review = serializer.save(user=self.request.user, pharmacy=pharmacy)
        
        avg_rating = PharmacyReview.objects.filter(pharmacy=pharmacy).aggregate(avg=Avg('rating'), count=Count('id'))
        pharmacy.rating = avg_rating['avg'] or 0
        pharmacy.total_reviews = avg_rating['count']
        pharmacy.save()


class ChatView(generics.ListCreateAPIView):
    serializer_class = ChatMessageSerializer
    
    def get_queryset(self):
        return ChatMessage.objects.filter(order_id=self.kwargs['order_id'])
    
    def perform_create(self, serializer):
        order = PharmacyOrder.objects.get(pk=self.kwargs['order_id'])
        serializer.save(order=order, sender=self.request.user)