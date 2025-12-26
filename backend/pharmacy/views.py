# backend/pharmacy/views.py
# Pharmacy views with OTP verification for patient access

from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Count, Sum, Avg, F, Q
from django.db.models.functions import Radians, Sin, Cos, ACos
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
from datetime import date

from .models import Pharmacy, PharmacyOrder, PharmacyInventory, PharmacyReview, ChatMessage, PharmacySale
from .serializers import (
    PharmacySerializer, PharmacyOrderSerializer,
    OrderStatusUpdateSerializer, PharmacyInventorySerializer,
    PharmacyReviewSerializer, ChatMessageSerializer,
    PharmacySaleSerializer, DispenseItemSerializer
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
        
        # Get pharmacy and inventory stats
        try:
            pharmacy = request.user.pharmacy_profile
            inventory = PharmacyInventory.objects.filter(pharmacy=pharmacy)
            low_stock_count = inventory.filter(
                quantity_in_stock__lte=F('reorder_level'),
                quantity_in_stock__gt=0
            ).count()
            
            # Sales stats
            today_sales = PharmacySale.objects.filter(
                pharmacy=pharmacy,
                created_at__date=today,
                quantity__gt=0
            ).count()
        except:
            low_stock_count = 0
            today_sales = 0
        
        return Response({
            'total_prescriptions': sent_prescriptions.count(),
            'prescriptions_today': sent_prescriptions.filter(created_at__date=today).count(),
            'patients_served': sent_prescriptions.values('user').distinct().count(),
            'today_sales': today_sales,
            'low_stock_items': low_stock_count,
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
            'message': 'Access granted. You can now view patient history and upload prescriptions.',
            'access_token_id': str(token.id),
            'session_expires_at': token.session_expires_at,
            'patient': {
                'id': str(token.patient.id),
                'email': token.patient.email,
                'name': f"{token.patient.first_name} {token.patient.last_name}".strip() or token.patient.email
            }
        })


class PharmacyActiveSessionsView(views.APIView):
    """View pharmacy's active patient sessions"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get(self, request):
        sessions = PatientAccessToken.objects.filter(
            requester=request.user,
            access_granted=True,
            session_expires_at__gt=timezone.now()
        ).select_related('patient').order_by('-access_granted_at')
        
        return Response({
            'count': sessions.count(),
            'sessions': [{
                'id': str(s.id),
                'patient_id': str(s.patient.id),
                'patient_email': s.patient.email,
                'patient_name': f"{s.patient.first_name} {s.patient.last_name}".strip() or s.patient.email,
                'expires_at': s.session_expires_at,
                'granted_at': s.access_granted_at
            } for s in sessions]
        })


class PharmacyPatientHistoryView(views.APIView):
    """
    View patient's prescription and report history.
    Requires valid access session from OTP verification.
    """
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get(self, request, patient_id):
        # Verify pharmacy has active access to this patient
        access_token = PatientAccessToken.objects.filter(
            patient_id=patient_id,
            requester=request.user,
            access_granted=True,
            session_expires_at__gt=timezone.now()
        ).first()
        
        if not access_token:
            return Response({
                'error': 'Access denied. Please verify OTP to access patient data.',
                'requires_otp': True
            }, status=status.HTTP_403_FORBIDDEN)
        
        patient = get_object_or_404(User, pk=patient_id, role='patient')
        
        # Get prescriptions (non-duplicate) with drugs and compliance
        prescriptions = Prescription.objects.filter(
            user=patient,
            is_duplicate=False
        ).prefetch_related(
            'drugs',
            'drugs__reminders',
            'drugs__interactions'
        ).order_by('-created_at')[:20]
        
        # Get lab reports (non-duplicate)
        from prescriptions.models import LabReport
        reports = LabReport.objects.filter(
            user=patient,
            is_duplicate=False
        ).order_by('-created_at')[:20]
        
        # Get health profile
        try:
            hp = patient.health_profile
            health_profile = {
                'blood_type': hp.blood_type,
                'gender': hp.gender,
                'date_of_birth': hp.date_of_birth,
                'age': hp.age,
                'height_cm': hp.height_cm,
                'weight_kg': hp.weight_kg,
                'allergies': hp.allergies or [],
                'medical_conditions': hp.medical_conditions or [],
                'current_medications': hp.current_medications or [],
                'emergency_contact_name': hp.emergency_contact_name,
                'emergency_contact_phone': hp.emergency_contact_phone
            }
        except:
            health_profile = None
        
        # Serialize prescriptions with detailed medication data
        prescriptions_data = []
        for p in prescriptions:
            medications = []
            for d in p.drugs.all():
                # Get compliance data from reminders
                doses_taken = 0
                doses_missed = 0
                last_taken = None
                
                for reminder in d.reminders.all():
                    doses_taken += reminder.doses_taken
                    doses_missed += reminder.doses_missed
                    if reminder.last_taken_at:
                        if not last_taken or reminder.last_taken_at > last_taken:
                            last_taken = reminder.last_taken_at
                
                total_doses = doses_taken + doses_missed
                adherence_rate = round((doses_taken / total_doses * 100)) if total_doses > 0 else 0
                
                # Get interactions
                interactions = [{
                    'type': i.interaction_type,
                    'severity': i.severity,
                    'interacting_item': i.interacting_item,
                    'title': i.title,
                    'description': i.description,
                    'recommendation': i.recommendation
                } for i in d.interactions.all()]
                
                medications.append({
                    'id': str(d.id),
                    'drug_name': d.drug_name,
                    'generic_name': d.generic_name,
                    'dosage': d.dosage,
                    'frequency': d.frequency,
                    'duration': d.duration,
                    'quantity': d.quantity,
                    'instructions': d.instructions,
                    'category': d.category,
                    'primary_use': d.primary_use,
                    'safety_percentage': d.safety_percentage,
                    'is_safe_to_take': d.is_safe_to_take,
                    'requires_monitoring': d.requires_monitoring,
                    'special_instructions': d.special_instructions,
                    'common_side_effects': d.common_side_effects or [],
                    'interactions': interactions,
                    'compliance': {
                        'doses_taken': doses_taken,
                        'doses_missed': doses_missed,
                        'adherence_rate': adherence_rate,
                        'last_taken_at': last_taken,
                        'is_active': d.reminders.filter(is_active=True).exists()
                    }
                })
            
            prescriptions_data.append({
                'id': str(p.id),
                'doctor_name': p.doctor_name,
                'clinic_name': p.clinic_name,
                'prescription_date': p.prescription_date,
                'status': p.status,
                'overall_safety_percentage': p.overall_safety_percentage,
                'source': p.source,
                'created_at': p.created_at,
                'medications': medications
            })
        
        return Response({
            'patient': {
                'id': str(patient.id),
                'email': patient.email,
                'name': f"{patient.first_name} {patient.last_name}".strip() or patient.email,
                'phone': patient.phone
            },
            'health_profile': health_profile,
            'prescriptions': prescriptions_data,
            'lab_reports': [{
                'id': str(r.id),
                'report_type': r.report_type,
                'report_title': r.report_title,
                'report_date': r.report_date,
                'laboratory_name': r.laboratory_name,
                'status': r.status,
                'created_at': r.created_at
            } for r in reports],
            'session_expires_at': access_token.session_expires_at
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
    """List prescriptions sent by this pharmacy with detailed analysis"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get(self, request):
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        
        prescriptions = Prescription.objects.filter(
            sent_by=request.user,
            source='pharmacy'
        ).select_related('user').prefetch_related(
            'drugs', 'drugs__interactions'
        ).order_by('-created_at')
        
        if search:
            prescriptions = prescriptions.filter(
                Q(user__email__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(doctor_name__icontains=search)
            )
        
        if status_filter:
            prescriptions = prescriptions.filter(status=status_filter)
        
        results = []
        for p in prescriptions[:50]:
            # Get patient allergies for context
            patient_allergies = []
            patient_conditions = []
            try:
                if p.user and hasattr(p.user, 'health_profile'):
                    hp = p.user.health_profile
                    patient_allergies = hp.allergies or []
                    patient_conditions = hp.medical_conditions or []
            except:
                pass
            
            # Build detailed medication list
            medications = []
            total_interactions = 0
            critical_count = 0
            
            for d in p.drugs.all():
                interactions = []
                for inter in d.interactions.all():
                    interactions.append({
                        'type': inter.interaction_type,
                        'severity': inter.severity,
                        'interacting_item': inter.interacting_item,
                        'title': inter.title,
                        'description': inter.description,
                        'recommendation': inter.recommendation
                    })
                    total_interactions += 1
                    if inter.severity in ['severe', 'critical']:
                        critical_count += 1
                
                medications.append({
                    'id': str(d.id),
                    'drug_name': d.drug_name,
                    'generic_name': d.generic_name,
                    'dosage': d.dosage,
                    'frequency': d.frequency,
                    'duration': d.duration,
                    'quantity': d.quantity,
                    'instructions': d.instructions,
                    'category': d.category,
                    'primary_use': d.primary_use,
                    'safety_percentage': d.safety_percentage,
                    'safety_status': d.safety_status,
                    'is_safe_to_take': d.is_safe_to_take,
                    'requires_monitoring': d.requires_monitoring,
                    'special_instructions': d.special_instructions,
                    'common_side_effects': d.common_side_effects or [],
                    'interactions': interactions
                })
            
            results.append({
                'id': str(p.id),
                'patient_email': p.user.email if p.user else 'Unknown',
                'patient_name': f"{p.user.first_name} {p.user.last_name}".strip() if p.user else '',
                'patient_allergies': patient_allergies,
                'patient_conditions': patient_conditions,
                'doctor_name': p.doctor_name,
                'clinic_name': p.clinic_name,
                'prescription_date': p.prescription_date,
                'status': p.status,
                'drugs_count': len(medications),
                'is_duplicate': p.is_duplicate,
                'email_sent': p.email_sent,
                'overall_safety_percentage': p.overall_safety_percentage,
                'safety_status': p.safety_status,
                'total_interactions': total_interactions,
                'critical_warnings': critical_count,
                'medications': medications,
                'created_at': p.created_at
            })
        
        return Response({
            'count': len(results),
            'prescriptions': results
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
    """List and create inventory items with filtering"""
    serializer_class = PharmacyInventorySerializer
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get_queryset(self):
        qs = PharmacyInventory.objects.filter(pharmacy__user=self.request.user)
        
        # Filtering
        search = self.request.query_params.get('search', '')
        category = self.request.query_params.get('category', '')
        status = self.request.query_params.get('status', '')  # low_stock, out_of_stock, expiring, expired
        
        if search:
            qs = qs.filter(
                Q(drug_name__icontains=search) |
                Q(generic_name__icontains=search) |
                Q(manufacturer__icontains=search) |
                Q(sku__icontains=search)
            )
        
        if category:
            qs = qs.filter(category=category)
        
        if status == 'low_stock':
            qs = qs.filter(quantity_in_stock__lte=F('reorder_level'), quantity_in_stock__gt=0)
        elif status == 'out_of_stock':
            qs = qs.filter(quantity_in_stock=0)
        elif status == 'expiring':
            from datetime import date, timedelta
            qs = qs.filter(expiry_date__lte=date.today() + timedelta(days=30), expiry_date__gt=date.today())
        elif status == 'expired':
            from datetime import date
            qs = qs.filter(expiry_date__lt=date.today())
        
        return qs.order_by('drug_name')
    
    def perform_create(self, serializer):
        pharmacy = Pharmacy.objects.get(user=self.request.user)
        serializer.save(pharmacy=pharmacy)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Calculate stats
        all_items = PharmacyInventory.objects.filter(pharmacy__user=request.user)
        from datetime import date, timedelta
        today = date.today()
        
        stats = {
            'total_items': all_items.count(),
            'in_stock': all_items.filter(quantity_in_stock__gt=F('reorder_level')).count(),
            'low_stock': all_items.filter(quantity_in_stock__lte=F('reorder_level'), quantity_in_stock__gt=0).count(),
            'out_of_stock': all_items.filter(quantity_in_stock=0).count(),
            'expiring_soon': all_items.filter(expiry_date__lte=today + timedelta(days=30), expiry_date__gt=today).count(),
            'expired': all_items.filter(expiry_date__lt=today).count(),
            'total_value': sum(float(i.unit_price) * i.quantity_in_stock for i in all_items),
            'categories': list(all_items.values('category').annotate(count=Count('id')).order_by('-count'))
        }
        
        return Response({
            'stats': stats,
            'results': serializer.data
        })


class InventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete inventory item"""
    serializer_class = PharmacyInventorySerializer
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get_queryset(self):
        return PharmacyInventory.objects.filter(pharmacy__user=self.request.user)


class InventoryRestockView(views.APIView):
    """Restock an inventory item"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def post(self, request, pk):
        item = get_object_or_404(PharmacyInventory, pk=pk, pharmacy__user=request.user)
        quantity = request.data.get('quantity', 0)
        batch_number = request.data.get('batch_number', '')
        expiry_date = request.data.get('expiry_date')
        cost_price = request.data.get('cost_price')
        
        if quantity <= 0:
            return Response({'error': 'Quantity must be positive'}, status=400)
        
        item.quantity_in_stock += quantity
        item.last_restocked = timezone.now()
        if batch_number:
            item.batch_number = batch_number
        if expiry_date:
            item.expiry_date = expiry_date
        if cost_price:
            item.cost_price = cost_price
        item.is_available = True
        item.save()
        
        return Response({
            'message': f'Added {quantity} units to {item.drug_name}',
            'new_quantity': item.quantity_in_stock
        })


class InventoryAlertsView(views.APIView):
    """Get inventory alerts (low stock, expiring, expired)"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get(self, request):
        from datetime import date, timedelta
        today = date.today()
        
        items = PharmacyInventory.objects.filter(pharmacy__user=request.user)
        
        low_stock = items.filter(
            quantity_in_stock__lte=F('reorder_level'),
            quantity_in_stock__gt=0
        ).values('id', 'drug_name', 'quantity_in_stock', 'reorder_level')
        
        out_of_stock = items.filter(quantity_in_stock=0).values('id', 'drug_name')
        
        expiring_soon = items.filter(
            expiry_date__lte=today + timedelta(days=30),
            expiry_date__gt=today
        ).values('id', 'drug_name', 'expiry_date', 'quantity_in_stock', 'batch_number')
        
        expired = items.filter(expiry_date__lt=today).values(
            'id', 'drug_name', 'expiry_date', 'quantity_in_stock', 'batch_number'
        )
        
        return Response({
            'low_stock': list(low_stock),
            'out_of_stock': list(out_of_stock),
            'expiring_soon': list(expiring_soon),
            'expired': list(expired),
            'total_alerts': len(low_stock) + len(out_of_stock) + len(expiring_soon) + len(expired)
        })


class InventoryBulkUpdateView(views.APIView):
    """Bulk update inventory quantities (for quick stock adjustments)"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def post(self, request):
        updates = request.data.get('updates', [])  # [{id, quantity}, ...]
        
        updated = 0
        for update in updates:
            try:
                item = PharmacyInventory.objects.get(
                    id=update['id'],
                    pharmacy__user=request.user
                )
                item.quantity_in_stock = update['quantity']
                item.is_available = item.quantity_in_stock > 0
                item.save()
                updated += 1
            except PharmacyInventory.DoesNotExist:
                continue
        
        return Response({'updated': updated})


# ============================================
# SALES / DISPENSE VIEWS
# ============================================

class DispenseItemView(views.APIView):
    """Dispense/sell an inventory item"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    @transaction.atomic
    def post(self, request):
        serializer = DispenseItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Get inventory item
        try:
            item = PharmacyInventory.objects.get(
                id=data['inventory_item_id'],
                pharmacy__user=request.user
            )
        except PharmacyInventory.DoesNotExist:
            return Response({'error': 'Item not found'}, status=404)
        
        quantity = data['quantity']
        
        # Check stock
        if item.quantity_in_stock < quantity:
            return Response({
                'error': f'Insufficient stock. Available: {item.quantity_in_stock}'
            }, status=400)
        
        # Handle return (add back to stock)
        if data['sale_type'] == 'return':
            item.quantity_in_stock += quantity
            item.save()
            
            # Create negative sale record
            sale = PharmacySale.objects.create(
                pharmacy=item.pharmacy,
                inventory_item=item,
                drug_name=item.drug_name,
                generic_name=item.generic_name or '',
                quantity=-quantity,
                unit_price=item.unit_price,
                cost_price=item.cost_price,
                sale_type='return',
                customer_name=data.get('customer_name', ''),
                customer_phone=data.get('customer_phone', ''),
                notes=data.get('notes', ''),
                sold_by=request.user
            )
            
            return Response({
                'message': f'Return processed: {quantity} units added back',
                'new_quantity': item.quantity_in_stock,
                'sale_id': str(sale.id)
            })
        
        # Regular sale - reduce stock
        item.quantity_in_stock -= quantity
        item.is_available = item.quantity_in_stock > 0
        item.save()
        
        # Get prescription if provided
        prescription = None
        if data.get('prescription_id'):
            try:
                prescription = Prescription.objects.get(id=data['prescription_id'])
            except Prescription.DoesNotExist:
                pass
        
        # Create sale record
        sale = PharmacySale.objects.create(
            pharmacy=item.pharmacy,
            inventory_item=item,
            prescription=prescription,
            drug_name=item.drug_name,
            generic_name=item.generic_name or '',
            quantity=quantity,
            unit_price=item.unit_price,
            cost_price=item.cost_price,
            sale_type=data['sale_type'],
            customer_name=data.get('customer_name', ''),
            customer_phone=data.get('customer_phone', ''),
            notes=data.get('notes', ''),
            sold_by=request.user
        )
        
        return Response({
            'message': f'Dispensed {quantity} units of {item.drug_name}',
            'new_quantity': item.quantity_in_stock,
            'sale_id': str(sale.id),
            'total_price': float(sale.total_price)
        })


class SalesHistoryView(views.APIView):
    """Get sales history with filtering"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get(self, request):
        pharmacy = Pharmacy.objects.get(user=request.user)
        sales = PharmacySale.objects.filter(pharmacy=pharmacy)
        
        # Filters
        sale_type = request.query_params.get('type', '')
        date_from = request.query_params.get('from', '')
        date_to = request.query_params.get('to', '')
        search = request.query_params.get('search', '')
        
        if sale_type:
            sales = sales.filter(sale_type=sale_type)
        if date_from:
            sales = sales.filter(created_at__date__gte=date_from)
        if date_to:
            sales = sales.filter(created_at__date__lte=date_to)
        if search:
            sales = sales.filter(
                Q(drug_name__icontains=search) |
                Q(customer_name__icontains=search)
            )
        
        sales = sales.order_by('-created_at')[:100]
        
        return Response({
            'count': sales.count(),
            'sales': [{
                'id': str(s.id),
                'drug_name': s.drug_name,
                'generic_name': s.generic_name,
                'quantity': s.quantity,
                'unit_price': float(s.unit_price),
                'total_price': float(s.total_price),
                'profit': float(s.profit) if s.profit else None,
                'sale_type': s.sale_type,
                'customer_name': s.customer_name,
                'created_at': s.created_at
            } for s in sales]
        })


class SalesDashboardView(views.APIView):
    """Get sales dashboard stats"""
    permission_classes = [IsAuthenticated, IsPharmacyUser]
    
    def get(self, request):
        from datetime import timedelta
        pharmacy = Pharmacy.objects.get(user=request.user)
        today = date.today()
        
        # Get all sales
        all_sales = PharmacySale.objects.filter(pharmacy=pharmacy, quantity__gt=0)  # Exclude returns
        
        # Today's sales
        today_sales = all_sales.filter(created_at__date=today)
        today_revenue = today_sales.aggregate(total=Sum('total_price'))['total'] or 0
        today_profit = today_sales.aggregate(total=Sum('profit'))['total'] or 0
        today_count = today_sales.count()
        
        # This week
        week_start = today - timedelta(days=today.weekday())
        week_sales = all_sales.filter(created_at__date__gte=week_start)
        week_revenue = week_sales.aggregate(total=Sum('total_price'))['total'] or 0
        week_profit = week_sales.aggregate(total=Sum('profit'))['total'] or 0
        
        # This month
        month_sales = all_sales.filter(
            created_at__month=today.month,
            created_at__year=today.year
        )
        month_revenue = month_sales.aggregate(total=Sum('total_price'))['total'] or 0
        month_profit = month_sales.aggregate(total=Sum('profit'))['total'] or 0
        
        # Top selling items (this month)
        top_items = month_sales.values('drug_name').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('total_price')
        ).order_by('-total_qty')[:10]
        
        # Sales by type (this month)
        by_type = month_sales.values('sale_type').annotate(
            count=Count('id'),
            revenue=Sum('total_price')
        )
        
        # Daily sales for chart (last 7 days)
        daily_sales = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_total = all_sales.filter(created_at__date=day).aggregate(
                revenue=Sum('total_price'),
                count=Count('id')
            )
            daily_sales.append({
                'date': day.strftime('%Y-%m-%d'),
                'day': day.strftime('%a'),
                'revenue': float(day_total['revenue'] or 0),
                'count': day_total['count'] or 0
            })
        
        # Recent sales
        recent = all_sales.order_by('-created_at')[:10]
        recent_sales = [{
            'id': str(s.id),
            'drug_name': s.drug_name,
            'quantity': s.quantity,
            'total_price': float(s.total_price),
            'sale_type': s.sale_type,
            'created_at': s.created_at
        } for s in recent]
        
        return Response({
            'today': {
                'revenue': float(today_revenue),
                'profit': float(today_profit),
                'count': today_count
            },
            'week': {
                'revenue': float(week_revenue),
                'profit': float(week_profit)
            },
            'month': {
                'revenue': float(month_revenue),
                'profit': float(month_profit)
            },
            'top_items': list(top_items),
            'by_type': list(by_type),
            'daily_sales': daily_sales,
            'recent_sales': recent_sales
        })


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
