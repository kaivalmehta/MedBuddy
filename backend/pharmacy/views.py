# backend/pharmacy/views.py
# Pharmacy views with OTP verification for patient access

from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Count, Sum, Avg
from django.db.models.functions import Radians, Sin, Cos, ACos
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
from datetime import date

from .models import Pharmacy, PharmacyOrder, PharmacyInventory, PharmacyReview, ChatMessage
from .serializers import (
    PharmacySerializer, PharmacyOrderSerializer,
    OrderStatusUpdateSerializer, PharmacyInventorySerializer,
    PharmacyReviewSerializer, ChatMessageSerializer
)

from users.models import User, PatientAccessToken, HealthProfile
from users.serializers import RequestPatientAccessSerializer, VerifyPatientOTPSerializer
from prescriptions.models import Prescription, PrescriptionDrug
from prescriptions.services import AzureServices
from prescriptions.email_service import EmailService
import logging

logger = logging.getLogger(__name__)


# ============================================
# PERMISSION CLASSES
# ============================================

class IsPharmacyUser(BasePermission):
    """Permission class for pharmacy-only views"""
    message = "Only pharmacies can access this resource."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'pharmacy':
            return False
        if request.user.is_suspended:
            self.message = "Your account is suspended."
            return False
        return True


class IsVerifiedPharmacy(BasePermission):
    """Permission for verified pharmacies only"""
    message = "Your professional account needs to be verified by admin."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'pharmacy':
            return False
        if request.user.is_suspended:
            return False
        if not request.user.is_professional_verified:
            return False
        return True


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_pharmacy_name(user):
    """Get pharmacy display name"""
    try:
        return user.pharmacy_profile.name
    except:
        return user.email


def check_active_session(user, patient):
    """Check if there's an active access session for this patient"""
    return PatientAccessToken.objects.filter(
        patient=patient,
        requester=user,
        access_granted=True,
        session_expires_at__gt=timezone.now()
    ).exists()


# ============================================
# PHARMACY PROFILE
# ============================================

class PharmacyProfileView(generics.RetrieveUpdateAPIView):
    """Get or update pharmacy profile"""
    serializer_class = PharmacySerializer
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get_object(self):
        profile, _ = Pharmacy.objects.get_or_create(
            user=self.request.user,
            defaults={
                'name': self.request.user.email,
                'license_number': f"TEMP-{self.request.user.id}",
                'address': 'Please update',
                'city': 'Please update',
                'state': 'Please update',
                'zip_code': '00000',
                'phone': self.request.user.phone or '0000000000',
                'email': self.request.user.email
            }
        )
        return profile


class PharmacyDashboardView(views.APIView):
    """Dashboard stats for pharmacy"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get(self, request):
        today = date.today()
        
        # Prescriptions sent
        sent_prescriptions = Prescription.objects.filter(
            sent_by=request.user,
            source='pharmacy'
        )
        
        # Orders
        try:
            pharmacy = request.user.pharmacy_profile
            orders = PharmacyOrder.objects.filter(pharmacy=pharmacy)
            orders_today = orders.filter(created_at__date=today).count()
            pending_orders = orders.filter(status__in=['received', 'verified', 'preparing']).count()
            completed_orders = orders.filter(status='completed').count()
        except:
            orders_today = 0
            pending_orders = 0
            completed_orders = 0
        
        return Response({
            'prescriptions_sent_total': sent_prescriptions.count(),
            'prescriptions_sent_today': sent_prescriptions.filter(created_at__date=today).count(),
            'orders_received_today': orders_today,
            'pending_orders': pending_orders,
            'completed_orders': completed_orders,
            'unique_patients': sent_prescriptions.values('user').distinct().count(),
            'is_verified': request.user.is_professional_verified
        })


# ============================================
# PATIENT ACCESS (OTP VERIFICATION)
# ============================================

class PharmacyCheckPatientView(views.APIView):
    """Check if patient exists"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def post(self, request):
        patient_email = request.data.get('patient_email')
        
        if not patient_email:
            return Response(
                {'error': 'Patient email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            patient = User.objects.get(email=patient_email, role='patient')
            has_active_session = check_active_session(request.user, patient)
            
            return Response({
                'patient_exists': True,
                'patient_email': patient.email,
                'patient_name': f"{patient.first_name} {patient.last_name}".strip() or patient.email,
                'has_active_session': has_active_session,
                'requires_otp': not has_active_session
            })
        except User.DoesNotExist:
            return Response({
                'patient_exists': False,
                'patient_email': patient_email,
                'can_create': True,
                'message': 'Patient not found. You can create their profile.'
            })


class PharmacyRequestPatientAccessView(views.APIView):
    """Pharmacy requests access to send prescription to patient"""
    permission_classes = [IsAuthenticated, IsVerifiedPharmacy]
    
    @transaction.atomic
    def post(self, request):
        serializer = RequestPatientAccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        patient_email = serializer.validated_data['patient_email']
        create_if_not_exists = serializer.validated_data.get('create_if_not_exists', False)
        
        # Find or create patient
        try:
            patient = User.objects.get(email=patient_email, role='patient')
            is_new_patient = False
        except User.DoesNotExist:
            if not create_if_not_exists:
                return Response({
                    'error': 'Patient not found',
                    'patient_exists': False,
                    'can_create': True
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Create patient
            import secrets
            patient = User.objects.create_user(
                email=patient_email,
                username=patient_email.split('@')[0] + str(timezone.now().timestamp())[-4:],
                password=secrets.token_urlsafe(16),
                first_name=serializer.validated_data.get('patient_first_name', ''),
                last_name=serializer.validated_data.get('patient_last_name', ''),
                phone=serializer.validated_data.get('patient_phone', ''),
                role='patient'
            )
            HealthProfile.objects.create(user=patient)
            is_new_patient = True
        
        # Check for active session
        if check_active_session(request.user, patient):
            return Response({
                'message': 'Active session exists',
                'has_active_session': True,
                'ready_for_upload': True
            })
        
        # Create access token
        token = PatientAccessToken.create_access_request(
            patient=patient,
            requester=request.user,
            purpose='add_prescription'
        )
        
        pharmacy_name = get_pharmacy_name(request.user)
        
        # Send OTP
        EmailService.send_patient_access_otp_email(
            patient_email=patient.email,
            patient_name=f"{patient.first_name} {patient.last_name}".strip() or "Patient",
            otp_code=token.otp_code,
            requester_name=pharmacy_name,
            requester_role='pharmacy',
            purpose='add_prescription',
            is_new_patient=is_new_patient
        )
        
        return Response({
            'message': f'Verification code sent to patient at {patient_email}',
            'patient_email': patient_email,
            'is_new_patient': is_new_patient,
            'expires_in_minutes': 10
        })


class PharmacyVerifyPatientOTPView(views.APIView):
    """Verify OTP and get access to send prescription"""
    permission_classes = [IsAuthenticated, IsVerifiedPharmacy]
    
    def post(self, request):
        serializer = VerifyPatientOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        patient_email = serializer.validated_data['patient_email']
        otp_code = serializer.validated_data['otp_code']
        
        # Find token
        token = PatientAccessToken.objects.filter(
            patient__email=patient_email,
            requester=request.user,
            is_used=False,
            is_expired=False
        ).order_by('-created_at').first()
        
        if not token:
            return Response({
                'error': 'No pending access request found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify OTP
        success, message = token.verify_otp(otp_code)
        
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': 'Access granted. You can now upload prescription.',
            'access_token_id': str(token.id),
            'session_expires_at': token.session_expires_at,
            'patient_email': patient_email
        })


# ============================================
# PRESCRIPTION UPLOAD (WITH OTP)
# ============================================

class PharmacySendPrescriptionView(views.APIView):
    """Pharmacy uploads prescription with OTP verification"""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, IsVerifiedPharmacy]
    
    def post(self, request):
        patient_email = request.data.get('patient_email')
        otp_code = request.data.get('otp_code')
        file = request.FILES.get('file')
        notes = request.data.get('notes', '')
        send_email = request.data.get('send_email', 'true').lower() == 'true'
        doctor_name = request.data.get('doctor_name', '')
        clinic_name = request.data.get('clinic_name', '')
        
        if not patient_email:
            return Response({'error': 'Patient email is required'}, status=400)
        
        if not file:
            return Response({'error': 'Prescription file is required'}, status=400)
        
        # Validate file
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response({'error': 'Invalid file type. Use JPG, PNG, or PDF'}, status=400)
        
        # Find patient
        try:
            patient = User.objects.get(email=patient_email, role='patient')
        except User.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=404)
        
        # Verify access
        has_session = check_active_session(request.user, patient)
        
        if not has_session:
            if not otp_code:
                return Response({
                    'error': 'OTP verification required',
                    'requires_otp': True
                }, status=status.HTTP_403_FORBIDDEN)
            
            token = PatientAccessToken.objects.filter(
                patient=patient,
                requester=request.user,
                purpose='add_prescription',
                is_used=False,
                is_expired=False
            ).order_by('-created_at').first()
            
            if not token:
                return Response({
                    'error': 'No pending verification found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            success, message = token.verify_otp(otp_code)
            if not success:
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        pharmacy_name = get_pharmacy_name(request.user)
        
        # Upload to Azure
        azure_svc = AzureServices()
        blob_name, blob_url = azure_svc.upload_prescription(file, str(patient.id))
        
        # Create prescription
        prescription = Prescription.objects.create(
            user=patient,
            source='pharmacy',
            sent_by=request.user,
            doctor_name=doctor_name,
            clinic_name=clinic_name,
            prescription_date=date.today(),
            image_url=blob_url,
            blob_name=blob_name,
            file_type='pdf' if file.content_type == 'application/pdf' else 'image',
            status='uploaded',
            notes=notes
        )
        
        # Try OCR
        try:
            ocr_result = azure_svc.extract_text(blob_url)
            prescription.ocr_raw_text = ocr_result.get('text', '')
            prescription.ocr_confidence = ocr_result.get('confidence', 0)
            prescription.save()
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
        
        # Check duplicates
        prescription.content_hash = prescription.generate_content_hash()
        prescription.check_and_mark_duplicate()
        prescription.save()
        
        # Send email
        if send_email and patient.receive_email_notifications:
            EmailService.send_prescription_email(
                prescription=prescription,
                recipient_email=patient.email,
                sender_name=pharmacy_name,
                sender_type='pharmacy'
            )
        
        return Response({
            'message': 'Prescription sent to patient successfully',
            'prescription_id': str(prescription.id),
            'is_duplicate': prescription.is_duplicate,
            'email_sent': send_email and patient.receive_email_notifications
        }, status=201)


class PharmacyAnalyzePrescriptionView(views.APIView):
    """Analyze a prescription uploaded by pharmacy"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def post(self, request, pk):
        prescription = get_object_or_404(
            Prescription, 
            pk=pk,
            sent_by=request.user,
            source='pharmacy'
        )
        
        azure_svc = AzureServices()
        
        # Run OCR if needed
        if not prescription.ocr_raw_text:
            try:
                ocr_result = azure_svc.extract_text(prescription.image_url)
                prescription.ocr_raw_text = ocr_result.get('text', '')
                prescription.ocr_confidence = ocr_result.get('confidence', 0)
                prescription.save()
            except Exception as e:
                logger.error(f"OCR failed: {e}")
                return Response({'error': 'OCR extraction failed'}, status=500)
        
        if not prescription.ocr_raw_text:
            return Response({
                'error': 'Could not extract text from prescription image'
            }, status=400)
        
        # Parse prescription
        try:
            parsed_data = azure_svc.parse_prescription(prescription.ocr_raw_text)
        except Exception as e:
            logger.error(f"Parsing failed: {e}")
            parsed_data = {"medications": []}
        
        prescription.parsed_data = parsed_data
        prescription.doctor_name = parsed_data.get('doctor_name', '') or prescription.doctor_name
        prescription.clinic_name = parsed_data.get('clinic_name', '') or prescription.clinic_name
        
        # Create drug records
        PrescriptionDrug.objects.filter(prescription=prescription).delete()
        
        for drug_data in parsed_data.get('medications', []):
            PrescriptionDrug.objects.create(
                prescription=prescription,
                drug_name=drug_data.get('drug_name', 'Unknown'),
                generic_name=drug_data.get('generic_name', ''),
                dosage=drug_data.get('dosage', ''),
                frequency=drug_data.get('frequency', ''),
                duration=drug_data.get('duration', ''),
                instructions=drug_data.get('instructions', ''),
                category=drug_data.get('category', 'other'),
                primary_use=drug_data.get('primary_use', ''),
                common_side_effects=drug_data.get('side_effects', [])
            )
        
        prescription.status = 'analyzed'
        prescription.save()
        
        from prescriptions.serializers import PrescriptionDetailSerializer
        return Response(PrescriptionDetailSerializer(prescription).data)


class PharmacyPrescriptionHistoryView(views.APIView):
    """List prescriptions sent by this pharmacy"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get(self, request):
        prescriptions = Prescription.objects.filter(
            sent_by=request.user,
            source='pharmacy'
        ).select_related('user').order_by('-created_at')
        
        return Response({
            'count': prescriptions.count(),
            'prescriptions': [{
                'id': str(p.id),
                'patient_email': p.user.email,
                'patient_name': f"{p.user.first_name} {p.user.last_name}".strip() or p.user.email,
                'doctor_name': p.doctor_name,
                'prescription_date': p.prescription_date,
                'status': p.status,
                'drugs_count': p.drugs.count(),
                'is_duplicate': p.is_duplicate,
                'email_sent': p.email_sent,
                'created_at': p.created_at
            } for p in prescriptions[:50]]
        })


# ============================================
# ORDER MANAGEMENT
# ============================================

class PharmacyOrderListView(generics.ListAPIView):
    """List orders for pharmacy or patient"""
    serializer_class = PharmacyOrderSerializer
    permission_classes = [IsAuthenticated]
    
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
    """Get order details"""
    serializer_class = PharmacyOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'pharmacy':
            return PharmacyOrder.objects.filter(pharmacy__user=user)
        return PharmacyOrder.objects.filter(patient=user)


class UpdateOrderStatusView(views.APIView):
    """Update order status"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
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
    """Verify a prescription order"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
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


# ============================================
# INVENTORY
# ============================================

class InventoryListView(generics.ListCreateAPIView):
    """List and create inventory items"""
    serializer_class = PharmacyInventorySerializer
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get_queryset(self):
        return PharmacyInventory.objects.filter(pharmacy__user=self.request.user)
    
    def perform_create(self, serializer):
        pharmacy = Pharmacy.objects.get(user=self.request.user)
        serializer.save(pharmacy=pharmacy)


class InventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete inventory item"""
    serializer_class = PharmacyInventorySerializer
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get_queryset(self):
        return PharmacyInventory.objects.filter(pharmacy__user=self.request.user)


# ============================================
# PUBLIC PHARMACY VIEWS
# ============================================

class NearbyPharmaciesView(generics.ListAPIView):
    """Find nearby pharmacies by location"""
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
    """List and create pharmacy reviews"""
    serializer_class = PharmacyReviewSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PharmacyReview.objects.filter(pharmacy_id=self.kwargs['pk'])
    
    def perform_create(self, serializer):
        pharmacy = Pharmacy.objects.get(pk=self.kwargs['pk'])
        review = serializer.save(user=self.request.user, pharmacy=pharmacy)
        
        # Update pharmacy rating
        avg_rating = PharmacyReview.objects.filter(pharmacy=pharmacy).aggregate(
            avg=Avg('rating'), 
            count=Count('id')
        )
        pharmacy.rating = avg_rating['avg'] or 0
        pharmacy.total_reviews = avg_rating['count']
        pharmacy.save()


class ChatView(generics.ListCreateAPIView):
    """Chat messages for order"""
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ChatMessage.objects.filter(order_id=self.kwargs['order_id'])
    
    def perform_create(self, serializer):
        order = PharmacyOrder.objects.get(pk=self.kwargs['order_id'])
        serializer.save(order=order, sender=self.request.user)
