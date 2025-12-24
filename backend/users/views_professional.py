# backend/users/views_professional.py
# Professional views for doctors, labs, pharmacies with proper patient verification

from rest_framework import views, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from datetime import date

from .models import (
    User, PatientAccessToken, DoctorProfile, LaboratoryProfile, HealthProfile
)
from .serializers import (
    RequestPatientAccessSerializer, VerifyPatientOTPSerializer, 
    PatientSummarySerializer, DoctorProfileSerializer, LaboratoryProfileSerializer,
    HealthProfileSerializer, PatientAccessTokenSerializer, InitiatePrescriptionUploadSerializer
)
from prescriptions.models import Prescription, PrescriptionDrug, LabReport
from prescriptions.serializers import PrescriptionListSerializer, PrescriptionDetailSerializer, PrescriptionDetailedSerializer
from prescriptions.email_service import EmailService
from prescriptions.services import AzureServices
import logging

logger = logging.getLogger(__name__)


# ============================================
# PERMISSION CLASSES
# ============================================

class IsDoctorUser(BasePermission):
    """Permission class for doctor-only views"""
    message = "Only verified doctors can access this resource."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'doctor':
            return False
        # Check if not suspended
        if request.user.is_suspended:
            self.message = "Your account is suspended."
            return False
        return True


class IsVerifiedDoctor(BasePermission):
    """Permission for verified doctors only"""
    message = "Your professional account needs to be verified by admin."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'doctor':
            return False
        if request.user.is_suspended:
            self.message = "Your account is suspended."
            return False
        if not request.user.is_professional_verified:
            return False
        return True


class IsLaboratoryUser(BasePermission):
    """Permission class for laboratory-only views"""
    message = "Only laboratories can access this resource."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'laboratory':
            return False
        if request.user.is_suspended:
            self.message = "Your account is suspended."
            return False
        return True


class IsVerifiedLaboratory(BasePermission):
    """Permission for verified labs only"""
    message = "Your professional account needs to be verified by admin."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'laboratory':
            return False
        if request.user.is_suspended:
            return False
        if not request.user.is_professional_verified:
            return False
        return True


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

def get_requester_name(user):
    """Get display name for the professional"""
    if user.role == 'doctor':
        try:
            return f"Dr. {user.doctor_profile.full_name}"
        except:
            pass
    elif user.role == 'laboratory':
        try:
            return user.laboratory_profile.name
        except:
            pass
    elif user.role == 'pharmacy':
        try:
            return user.pharmacy_profile.name
        except:
            pass
    return f"{user.first_name} {user.last_name}".strip() or user.email


def check_active_session(user, patient):
    """Check if there's an active access session for this patient"""
    return PatientAccessToken.objects.filter(
        patient=patient,
        requester=user,
        access_granted=True,
        session_expires_at__gt=timezone.now()
    ).exists()


# ============================================
# DOCTOR PROFILE VIEWS
# ============================================

class DoctorProfileView(generics.RetrieveUpdateAPIView):
    """Get or update doctor's own profile"""
    serializer_class = DoctorProfileSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def get_object(self):
        profile, _ = DoctorProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                'full_name': f"{self.request.user.first_name} {self.request.user.last_name}".strip(),
                'specialization': 'General Practice',
                'qualification': 'MBBS',
                'registration_number': f"TEMP-{self.request.user.id}"
            }
        )
        return profile


class DoctorDashboardView(views.APIView):
    """Dashboard stats for doctor"""
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def get(self, request):
        today = date.today()
        
        # Prescriptions sent
        prescriptions = Prescription.objects.filter(sent_by=request.user)
        
        # Active patient sessions
        active_sessions = PatientAccessToken.objects.filter(
            requester=request.user,
            access_granted=True,
            session_expires_at__gt=timezone.now()
        ).count()
        
        # Unique patients accessed
        unique_patients = prescriptions.values('user').distinct().count()
        
        # Recent prescriptions for activity feed
        recent = prescriptions.order_by('-created_at')[:5]
        recent_data = [{
            'id': str(p.id),
            'patient_email': p.user.email if p.user else 'Unknown',
            'patient_name': f"{p.user.first_name} {p.user.last_name}".strip() if p.user else '',
            'created_at': p.created_at,
            'status': 'sent'
        } for p in recent]
        
        return Response({
            # Field names that frontend expects
            'total_prescriptions': prescriptions.count(),
            'patients_accessed': unique_patients,
            'this_month': prescriptions.filter(
                created_at__month=today.month,
                created_at__year=today.year
            ).count(),
            'active_sessions': active_sessions,
            'recent_prescriptions': recent_data,
            'is_verified': request.user.is_professional_verified
        })


class DoctorSentPrescriptionsView(views.APIView):
    """List prescriptions sent by doctor with detailed analysis"""
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def get(self, request):
        search = request.query_params.get('search', '')
        
        prescriptions = Prescription.objects.filter(
            sent_by=request.user
        ).select_related('user').prefetch_related(
            'drugs', 
            'drugs__interactions',
            'drugs__reminders'
        ).order_by('-created_at')
        
        if search:
            prescriptions = prescriptions.filter(user__email__icontains=search)
        
        data = []
        for p in prescriptions[:50]:  # Limit to 50
            # Get patient health profile for context
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
            medications_data = []
            total_interactions = 0
            critical_warnings = 0
            
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
                        critical_warnings += 1
                
                # Get compliance data if available
                compliance = None
                reminder = d.reminders.filter(user=p.user).first()
                if reminder:
                    compliance = {
                        'doses_taken': reminder.doses_taken,
                        'doses_missed': reminder.doses_missed,
                        'adherence_rate': reminder.adherence_rate,
                        'last_taken_at': reminder.last_taken_at,
                        'is_active': reminder.is_active
                    }
                
                medications_data.append({
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
                    'interactions': interactions,
                    'compliance': compliance
                })
            
            data.append({
                'id': str(p.id),
                'patient_email': p.user.email if p.user else 'Unknown',
                'patient_name': f"{p.user.first_name} {p.user.last_name}".strip() if p.user else '',
                'patient_allergies': patient_allergies,
                'patient_conditions': patient_conditions,
                'doctor_name': p.doctor_name,
                'clinic_name': p.clinic_name,
                'prescription_date': p.prescription_date,
                'drugs_count': len(medications_data),
                'source': p.source,
                'status': p.status,
                'is_digital': p.is_digital,
                'overall_safety_percentage': p.overall_safety_percentage,
                'safety_status': p.safety_status,
                'total_interactions': total_interactions,
                'critical_warnings': critical_warnings,
                'notes': p.notes,
                'created_at': p.created_at,
                'medications': medications_data
            })
        
        return Response({
            'count': len(data),
            'results': data
        })


# ============================================
# PATIENT ACCESS / OTP VERIFICATION VIEWS
# ============================================

class CheckPatientView(views.APIView):
    """
    Check if patient exists and return status
    Used before initiating OTP flow
    """
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def post(self, request):
        patient_email = request.data.get('patient_email')
        
        if not patient_email:
            return Response(
                {'error': 'Patient email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            patient = User.objects.get(email=patient_email, role='patient')
            
            # Check for active session
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


class RequestPatientAccessView(views.APIView):
    """
    Request access to patient's medical history.
    Sends OTP to patient's email for verification.
    Can optionally create patient profile if doesn't exist.
    """
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    @transaction.atomic
    def post(self, request):
        serializer = RequestPatientAccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        patient_email = serializer.validated_data['patient_email']
        purpose = serializer.validated_data['purpose']
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
                    'can_create': True,
                    'message': 'Patient not found. Set create_if_not_exists=true to create their profile.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Create new patient
            patient_first_name = serializer.validated_data.get('patient_first_name', '')
            patient_last_name = serializer.validated_data.get('patient_last_name', '')
            patient_phone = serializer.validated_data.get('patient_phone', '')
            
            if not patient_first_name:
                return Response({
                    'error': 'Patient first name is required when creating new patient'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create patient with temporary password
            import secrets
            temp_password = secrets.token_urlsafe(16)
            
            patient = User.objects.create_user(
                email=patient_email,
                username=patient_email.split('@')[0] + str(timezone.now().timestamp())[-4:],
                password=temp_password,
                first_name=patient_first_name,
                last_name=patient_last_name,
                phone=patient_phone,
                role='patient',
                is_active=True
            )
            
            # Create health profile
            HealthProfile.objects.create(user=patient)
            is_new_patient = True
            
            logger.info(f"Doctor {request.user.email} created patient profile: {patient_email}")
        
        # Check for active session
        if check_active_session(request.user, patient):
            return Response({
                'message': 'You already have active access to this patient',
                'has_active_session': True,
                'patient': PatientSummarySerializer(patient).data
            })
        
        # Create access token with OTP
        token = PatientAccessToken.create_access_request(
            patient=patient,
            requester=request.user,
            purpose=purpose
        )
        
        # Get requester name
        requester_name = get_requester_name(request.user)
        
        # Send OTP email to patient
        EmailService.send_patient_access_otp_email(
            patient_email=patient.email,
            patient_name=f"{patient.first_name} {patient.last_name}".strip() or "Patient",
            otp_code=token.otp_code,
            requester_name=requester_name,
            requester_role=request.user.role,
            purpose=purpose,
            is_new_patient=is_new_patient
        )
        
        return Response({
            'message': f'Verification code sent to patient at {patient_email}',
            'token_id': str(token.id),
            'patient_email': patient_email,
            'is_new_patient': is_new_patient,
            'expires_in_minutes': 10
        })


class VerifyPatientOTPView(views.APIView):
    """
    Verify OTP and get access to patient data.
    Returns patient summary and grants session access.
    """
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def post(self, request):
        serializer = VerifyPatientOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        patient_email = serializer.validated_data['patient_email']
        otp_code = serializer.validated_data['otp_code']
        
        # Find the most recent access token
        token = PatientAccessToken.objects.filter(
            patient__email=patient_email,
            requester=request.user,
            is_used=False,
            is_expired=False
        ).order_by('-created_at').first()
        
        if not token:
            return Response({
                'error': 'No pending access request found. Please request access first.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify OTP
        success, message = token.verify_otp(otp_code)
        
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        # Return patient summary with session info
        patient = token.patient
        return Response({
            'message': 'Access granted',
            'access_token_id': str(token.id),
            'session_expires_at': token.session_expires_at,
            'patient': PatientSummarySerializer(patient).data
        })


class ViewPatientHistoryView(views.APIView):
    """
    View patient's prescription and report history.
    Requires valid access session from OTP verification.
    """
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def get(self, request, patient_id):
        # Verify doctor has active access to this patient
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
        
        # Get prescriptions (non-duplicate) with prefetched drugs and reminders
        prescriptions = Prescription.objects.filter(
            user=patient,
            is_duplicate=False
        ).prefetch_related(
            'drugs',
            'drugs__reminders'
        ).order_by('-created_at')[:20]
        
        # Get lab reports (non-duplicate)
        reports = LabReport.objects.filter(
            user=patient,
            is_duplicate=False
        ).order_by('-created_at')[:20]
        
        # Get health profile
        try:
            health_profile = HealthProfileSerializer(patient.health_profile).data
        except:
            health_profile = None
        
        # Serialize prescriptions with detailed medication and compliance data
        prescriptions_data = PrescriptionDetailedSerializer(
            prescriptions, 
            many=True,
            context={'patient': patient}
        ).data
        
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


class ActiveSessionsView(views.APIView):
    """View doctor's active patient sessions"""
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def get(self, request):
        sessions = PatientAccessToken.objects.filter(
            requester=request.user,
            access_granted=True,
            session_expires_at__gt=timezone.now()
        ).select_related('patient').order_by('-access_granted_at')
        
        return Response({
            'count': sessions.count(),
            'sessions': PatientAccessTokenSerializer(sessions, many=True).data
        })


# ============================================
# PRESCRIPTION UPLOAD WITH OTP VERIFICATION
# ============================================

class InitiatePrescriptionUploadView(views.APIView):
    """
    Step 1: Initiate prescription upload
    - Checks patient exists (or creates if specified)
    - Sends OTP to patient for verification
    """
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    @transaction.atomic
    def post(self, request):
        serializer = InitiatePrescriptionUploadSerializer(data=request.data)
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
                'message': 'Active session exists. You can upload prescription.',
                'has_active_session': True,
                'patient_email': patient.email,
                'ready_for_upload': True
            })
        
        # Create access token for prescription upload
        token = PatientAccessToken.create_access_request(
            patient=patient,
            requester=request.user,
            purpose='add_prescription'
        )
        
        requester_name = get_requester_name(request.user)
        
        # Send OTP
        EmailService.send_patient_access_otp_email(
            patient_email=patient.email,
            patient_name=f"{patient.first_name} {patient.last_name}".strip() or "Patient",
            otp_code=token.otp_code,
            requester_name=requester_name,
            requester_role='doctor',
            purpose='add_prescription',
            is_new_patient=is_new_patient
        )
        
        return Response({
            'message': f'Verification code sent to patient at {patient_email}',
            'patient_email': patient_email,
            'is_new_patient': is_new_patient,
            'requires_otp': True,
            'expires_in_minutes': 10
        })


class DoctorUploadPrescriptionView(views.APIView):
    """
    Upload prescription after OTP verification or with active session.
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def post(self, request):
        patient_email = request.data.get('patient_email')
        otp_code = request.data.get('otp_code')
        file = request.FILES.get('file')
        send_email = request.data.get('send_email', 'true').lower() == 'true'
        
        if not patient_email:
            return Response({'error': 'Patient email is required'}, status=400)
        
        if not file:
            return Response({'error': 'Prescription file is required'}, status=400)
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response({'error': 'Invalid file type. Use JPG, PNG, or PDF'}, status=400)
        
        # Find patient
        try:
            patient = User.objects.get(email=patient_email, role='patient')
        except User.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=404)
        
        # Check for active session or verify OTP
        has_session = check_active_session(request.user, patient)
        
        if not has_session:
            if not otp_code:
                return Response({
                    'error': 'OTP verification required',
                    'requires_otp': True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Verify OTP
            token = PatientAccessToken.objects.filter(
                patient=patient,
                requester=request.user,
                purpose='add_prescription',
                is_used=False,
                is_expired=False
            ).order_by('-created_at').first()
            
            if not token:
                return Response({
                    'error': 'No pending verification found. Please request OTP first.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            success, message = token.verify_otp(otp_code)
            if not success:
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get doctor info
        try:
            doctor_profile = request.user.doctor_profile
            doctor_name = f"Dr. {doctor_profile.full_name}"
            clinic_name = doctor_profile.clinic_name
        except:
            doctor_name = f"{request.user.first_name} {request.user.last_name}".strip()
            clinic_name = ""
        
        # Upload to Azure
        azure_svc = AzureServices()
        blob_name, blob_url = azure_svc.upload_prescription(file, str(patient.id))
        
        # Create prescription
        prescription = Prescription.objects.create(
            user=patient,
            source='doctor',
            sent_by=request.user,
            doctor_name=doctor_name,
            clinic_name=clinic_name,
            prescription_date=date.today(),
            image_url=blob_url,
            blob_name=blob_name,
            file_type='pdf' if file.content_type == 'application/pdf' else 'image',
            status='uploaded'
        )
        
        # Try OCR
        try:
            ocr_result = azure_svc.extract_text(blob_url)
            prescription.ocr_raw_text = ocr_result.get('text', '')
            prescription.ocr_confidence = ocr_result.get('confidence', 0)
            prescription.save()
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
        
        # Check for duplicates
        prescription.content_hash = prescription.generate_content_hash()
        prescription.check_and_mark_duplicate()
        prescription.save()
        
        # Send email notification
        if send_email and patient.receive_email_notifications:
            EmailService.send_prescription_email(
                prescription=prescription,
                recipient_email=patient.email,
                sender_name=doctor_name,
                sender_type='doctor'
            )
        
        return Response({
            'message': 'Prescription uploaded and sent to patient',
            'prescription_id': str(prescription.id),
            'is_duplicate': prescription.is_duplicate,
            'email_sent': send_email and patient.receive_email_notifications
        }, status=201)


class CreateDigitalPrescriptionView(views.APIView):
    """
    Create digital prescription (structured data, no image).
    Requires OTP verification or active session.
    """
    permission_classes = [IsAuthenticated, IsDoctorUser]  # Changed from IsVerifiedDoctor for dev
    
    @transaction.atomic
    def post(self, request):
        patient_email = request.data.get('patient_email')
        otp_code = request.data.get('otp_code')
        medications = request.data.get('medications', [])
        notes = request.data.get('notes', '')
        send_email = request.data.get('send_email', True)
        
        if not patient_email:
            return Response({'error': 'Patient email is required'}, status=400)
        
        if not medications:
            return Response({'error': 'At least one medication is required'}, status=400)
        
        # Find patient
        try:
            patient = User.objects.get(email=patient_email, role='patient')
        except User.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=404)
        
        # Check for active session or verify OTP
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
        
        # Get doctor info
        try:
            doctor_profile = request.user.doctor_profile
            doctor_name = f"Dr. {doctor_profile.full_name}"
            clinic_name = doctor_profile.clinic_name
        except:
            doctor_name = f"{request.user.first_name} {request.user.last_name}".strip()
            clinic_name = ""
        
        # Create prescription
        prescription = Prescription.objects.create(
            user=patient,
            source='doctor',
            sent_by=request.user,
            is_digital=True,
            doctor_name=doctor_name,
            clinic_name=clinic_name,
            prescription_date=date.today(),
            image_url='',
            blob_name='',
            file_type='digital',
            status='analyzed',
            notes=notes,
            digital_signature=f"Digitally signed by {doctor_name} on {date.today()}"
        )
        
        # Create drug records
        for med_data in medications:
            PrescriptionDrug.objects.create(
                prescription=prescription,
                drug_name=med_data.get('drug_name', ''),
                generic_name=med_data.get('generic_name', ''),
                dosage=med_data.get('dosage', ''),
                frequency=med_data.get('frequency', ''),
                duration=med_data.get('duration', ''),
                quantity=med_data.get('quantity'),
                instructions=med_data.get('instructions', ''),
                category=med_data.get('category', 'other')
            )
        
        # Check duplicates
        prescription.content_hash = prescription.generate_content_hash()
        prescription.check_and_mark_duplicate()
        prescription.save()
        
        # Send email
        if send_email and patient.receive_email_notifications:
            EmailService.send_prescription_email(
                prescription=prescription,
                recipient_email=patient.email,
                sender_name=doctor_name,
                sender_type='doctor'
            )
        
        return Response({
            'message': 'Digital prescription created successfully',
            'prescription_id': str(prescription.id),
            'is_duplicate': prescription.is_duplicate,
            'email_sent': send_email and patient.receive_email_notifications
        }, status=201)


# ============================================
# LABORATORY VIEWS
# ============================================

class LaboratoryProfileView(generics.RetrieveUpdateAPIView):
    """Get or update laboratory's own profile"""
    serializer_class = LaboratoryProfileSerializer
    permission_classes = [IsAuthenticated, IsLaboratoryUser]
    
    def get_object(self):
        profile, _ = LaboratoryProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                'name': self.request.user.email,
                'license_number': f"TEMP-{self.request.user.id}",
                'address': '',
                'city': '',
                'state': '',
                'zip_code': '',
                'phone': ''
            }
        )
        return profile


class LabRequestPatientAccessView(views.APIView):
    """Laboratory requests access to send report to patient"""
    permission_classes = [IsAuthenticated, IsVerifiedLaboratory]
    
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
            
            import secrets
            patient = User.objects.create_user(
                email=patient_email,
                username=patient_email.split('@')[0] + str(timezone.now().timestamp())[-4:],
                password=secrets.token_urlsafe(16),
                first_name=serializer.validated_data.get('patient_first_name', ''),
                last_name=serializer.validated_data.get('patient_last_name', ''),
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
            purpose='add_report'
        )
        
        lab_name = get_requester_name(request.user)
        
        EmailService.send_patient_access_otp_email(
            patient_email=patient.email,
            patient_name=f"{patient.first_name} {patient.last_name}".strip() or "Patient",
            otp_code=token.otp_code,
            requester_name=lab_name,
            requester_role='laboratory',
            purpose='add_report',
            is_new_patient=is_new_patient
        )
        
        return Response({
            'message': f'Verification code sent to patient at {patient_email}',
            'patient_email': patient_email,
            'is_new_patient': is_new_patient,
            'expires_in_minutes': 10
        })


class LabUploadReportView(views.APIView):
    """Laboratory uploads a report with OTP verification"""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, IsVerifiedLaboratory]
    
    def post(self, request):
        patient_email = request.data.get('patient_email')
        otp_code = request.data.get('otp_code')
        file = request.FILES.get('file')
        report_type = request.data.get('report_type', 'other')
        report_title = request.data.get('report_title', 'Lab Report')
        referring_doctor = request.data.get('referring_doctor', '')
        send_email = request.data.get('send_email', 'true').lower() == 'true'
        
        if not patient_email:
            return Response({'error': 'Patient email is required'}, status=400)
        
        if not file:
            return Response({'error': 'Report file is required'}, status=400)
        
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response({'error': 'Invalid file type'}, status=400)
        
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
                purpose='add_report',
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
        
        lab_name = get_requester_name(request.user)
        
        # Upload file
        azure_svc = AzureServices()
        blob_name, blob_url = azure_svc.upload_prescription(file, str(patient.id))
        
        # Create report
        report = LabReport.objects.create(
            user=patient,
            source='laboratory',
            sent_by=request.user,
            report_type=report_type,
            report_title=report_title,
            report_date=date.today(),
            laboratory_name=lab_name,
            referring_doctor=referring_doctor,
            file_url=blob_url,
            blob_name=blob_name,
            file_type='pdf' if file.content_type == 'application/pdf' else 'image',
            status='uploaded'
        )
        
        # OCR
        try:
            ocr_result = azure_svc.extract_text(blob_url)
            report.ocr_raw_text = ocr_result.get('text', '')
            report.ocr_confidence = ocr_result.get('confidence', 0)
            report.save()
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
        
        # Check duplicates
        report.content_hash = report.generate_content_hash()
        report.check_and_mark_duplicate()
        report.save()
        
        # Send email
        if send_email and patient.receive_email_notifications:
            EmailService.send_lab_report_email(
                report=report,
                recipient_email=patient.email,
                sender_name=lab_name
            )
        
        return Response({
            'message': 'Report uploaded and sent to patient',
            'report_id': str(report.id),
            'is_duplicate': report.is_duplicate,
            'email_sent': send_email and patient.receive_email_notifications
        }, status=201)


class LabDashboardView(views.APIView):
    """Dashboard stats for laboratory"""
    permission_classes = [IsAuthenticated, IsLaboratoryUser]
    
    def get(self, request):
        from django.db.models import Count
        
        reports = LabReport.objects.filter(sent_by=request.user)
        today = date.today()
        
        return Response({
            'total_reports_sent': reports.count(),
            'reports_today': reports.filter(created_at__date=today).count(),
            'reports_this_month': reports.filter(
                created_at__month=today.month,
                created_at__year=today.year
            ).count(),
            'report_types': list(
                reports.values('report_type')
                .annotate(count=Count('id'))
                .order_by('-count')[:5]
            ),
            'is_verified': request.user.is_professional_verified
        })