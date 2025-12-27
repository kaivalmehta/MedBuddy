# backend/users/serializers.py
# Complete serializers with OTP verification, registration, and all authentication flows

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import (
    User, HealthProfile, FamilyMember, DoctorProfile, LaboratoryProfile, 
    PatientAccessToken, EmailVerificationOTP, PendingRegistration, PasswordResetToken
)


# ============================================
# USER SERIALIZERS
# ============================================

class UserSerializer(serializers.ModelSerializer):
    is_fully_verified = serializers.ReadOnlyField()
    can_send_to_patients = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'role', 
            'phone', 'preferred_language', 'is_email_verified', 'is_professional_verified',
            'is_fully_verified', 'can_send_to_patients', 'is_suspended',
            'is_rejected', 'rejection_reason',
            'receive_email_notifications', 'created_at'
        ]
        read_only_fields = ['id', 'is_email_verified', 'is_professional_verified', 
                           'is_suspended', 'is_rejected', 'rejection_reason', 'created_at']


class UserPublicSerializer(serializers.ModelSerializer):
    """Minimal user info for public/shared contexts"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']


# ============================================
# REGISTRATION SERIALIZERS (Step 1: Initiate Registration)
# ============================================

class InitiateRegistrationSerializer(serializers.Serializer):
    """Step 1: Start registration - validates data and sends OTP"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, default='patient')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Optional profile data based on role
    doctor_profile = serializers.JSONField(required=False)
    laboratory_profile = serializers.JSONField(required=False)
    pharmacy_profile = serializers.JSONField(required=False)
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists')
        return value
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with this username already exists')
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        return attrs


class VerifyRegistrationOTPSerializer(serializers.Serializer):
    """Step 2: Verify OTP and complete registration"""
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)


class ResendOTPSerializer(serializers.Serializer):
    """Resend OTP for registration or login"""
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=['registration', 'login'])


# ============================================
# LOGIN SERIALIZERS (With OTP verification)
# ============================================

class LoginStep1Serializer(serializers.Serializer):
    """Step 1: Validate credentials and send OTP"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        user = authenticate(username=attrs['email'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled')
        if user.is_suspended:
            raise serializers.ValidationError(
                f'Account is suspended. Reason: {user.suspension_reason or "Contact support"}'
            )
        attrs['user'] = user
        return attrs


class LoginStep2Serializer(serializers.Serializer):
    """Step 2: Verify OTP and complete login"""
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)


class QuickLoginSerializer(serializers.Serializer):
    """Quick login without OTP (for development or trusted devices)"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    skip_otp = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        user = authenticate(username=attrs['email'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled')
        if user.is_suspended:
            raise serializers.ValidationError('Account is suspended')
        attrs['user'] = user
        return attrs


# ============================================
# PASSWORD RESET SERIALIZERS
# ============================================

class RequestPasswordResetSerializer(serializers.Serializer):
    """Request password reset - sends OTP to email"""
    email = serializers.EmailField()


class VerifyPasswordResetOTPSerializer(serializers.Serializer):
    """Verify OTP for password reset"""
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)


class ResetPasswordSerializer(serializers.Serializer):
    """Complete password reset with new password"""
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match'})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """Change password for authenticated user"""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match'})
        return attrs


# ============================================
# HEALTH PROFILE SERIALIZERS
# ============================================

class HealthProfileSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = HealthProfile
        fields = [
            'id', 'date_of_birth', 'age', 'gender', 'blood_type', 'weight_kg',
            'height_cm', 'medical_conditions', 'allergies', 'current_medications',
            'lifestyle_factors', 'emergency_contact_name', 'emergency_contact_phone',
            'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']
    
    def get_age(self, obj):
        if obj.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - obj.date_of_birth.year - (
                (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
            )
        return None


class FamilyMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMember
        fields = [
            'id', 'name', 'relationship', 'date_of_birth', 'gender', 
            'blood_type', 'medical_conditions', 'allergies', 
            'current_medications', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# ============================================
# PROFESSIONAL PROFILE SERIALIZERS
# ============================================

class DoctorProfileSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    is_verified = serializers.SerializerMethodField()
    
    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user', 'full_name', 'specialization', 'qualification',
            'registration_number', 'clinic_name', 'clinic_address', 
            'clinic_phone', 'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'is_verified', 'created_at']
    
    def get_is_verified(self, obj):
        # Check both profile verification AND user's professional verification
        return obj.is_verified and obj.user.is_professional_verified


class LaboratoryProfileSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    is_verified = serializers.SerializerMethodField()
    
    class Meta:
        model = LaboratoryProfile
        fields = [
            'id', 'user', 'name', 'license_number', 'address', 'city',
            'state', 'zip_code', 'phone', 'services', 'is_verified',
            'home_collection_available', 'operating_hours', 'created_at'
        ]
        read_only_fields = ['id', 'is_verified', 'created_at']
    
    def get_is_verified(self, obj):
        # Check both profile verification AND user's professional verification
        return obj.is_verified and obj.user.is_professional_verified


# ============================================
# OTP / PATIENT ACCESS SERIALIZERS
# ============================================

class RequestPatientAccessSerializer(serializers.Serializer):
    """For doctors/professionals to request access to patient data"""
    patient_email = serializers.EmailField()
    purpose = serializers.ChoiceField(
        choices=['view_history', 'add_prescription', 'add_report'],
        default='view_history'
    )
    
    # Optional: Create patient profile if doesn't exist
    create_if_not_exists = serializers.BooleanField(default=False)
    patient_first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    patient_last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    patient_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)


class VerifyPatientOTPSerializer(serializers.Serializer):
    """For verifying OTP and granting access"""
    patient_email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)


class PatientAccessTokenSerializer(serializers.ModelSerializer):
    patient_id = serializers.UUIDField(source='patient.id', read_only=True)
    patient_email = serializers.EmailField(source='patient.email', read_only=True)
    patient_name = serializers.SerializerMethodField()
    requester_name = serializers.SerializerMethodField()
    is_session_active = serializers.ReadOnlyField()
    
    class Meta:
        model = PatientAccessToken
        fields = [
            'id', 'patient_id', 'patient_email', 'patient_name', 'requester_name', 'purpose', 
            'is_used', 'access_granted', 'is_session_active', 'expires_at', 
            'session_expires_at', 'created_at'
        ]
    
    def get_patient_name(self, obj):
        name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return name or obj.patient.email
    
    def get_requester_name(self, obj):
        if obj.requester.role == 'doctor':
            try:
                return f"Dr. {obj.requester.doctor_profile.full_name}"
            except:
                pass
        elif obj.requester.role == 'laboratory':
            try:
                return obj.requester.laboratory_profile.name
            except:
                pass
        elif obj.requester.role == 'pharmacy':
            try:
                return obj.requester.pharmacy_profile.name
            except:
                pass
        return obj.requester.email


# ============================================
# PATIENT SUMMARY SERIALIZER (for professionals viewing patient data)
# ============================================

class PatientSummarySerializer(serializers.ModelSerializer):
    """Summary of patient data for doctors/professionals"""
    health_profile = HealthProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    recent_prescriptions_count = serializers.SerializerMethodField()
    recent_reports_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
            'health_profile', 'recent_prescriptions_count', 'recent_reports_count'
        ]
    
    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.email
    
    def get_recent_prescriptions_count(self, obj):
        return obj.prescriptions.filter(is_duplicate=False).count()
    
    def get_recent_reports_count(self, obj):
        return obj.lab_reports.filter(is_duplicate=False).count()


# ============================================
# PRESCRIPTION FLOW SERIALIZERS
# ============================================

class InitiatePrescriptionUploadSerializer(serializers.Serializer):
    """
    Step 1: Doctor/Professional initiates prescription upload
    If patient exists: Send OTP for verification
    If patient doesn't exist: Allow creation with consent
    """
    patient_email = serializers.EmailField()
    create_if_not_exists = serializers.BooleanField(default=False)
    
    # Patient details (required if creating new patient)
    patient_first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    patient_last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    patient_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    def validate(self, attrs):
        # Only validate patient details if creating AND patient doesn't exist
        # The view will handle the actual existence check
        return attrs


class VerifyAndUploadPrescriptionSerializer(serializers.Serializer):
    """Step 2: Verify OTP and upload prescription"""
    patient_email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)


class DigitalPrescriptionSerializer(serializers.Serializer):
    """For doctors to create digital prescriptions"""
    patient_email = serializers.EmailField()
    prescription_date = serializers.DateField(required=False)
    medications = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    send_email = serializers.BooleanField(default=True)
    
    # OTP verification (required if sending to patient without prior verification)
    otp_code = serializers.CharField(max_length=6, min_length=6, required=False)
    
    def validate_medications(self, value):
        required_fields = ['drug_name', 'dosage', 'frequency']
        for med in value:
            for field in required_fields:
                if field not in med:
                    raise serializers.ValidationError(
                        f"Each medication must have: {', '.join(required_fields)}"
                    )
        return value


# ============================================
# ADMIN SERIALIZERS
# ============================================

class AdminUserListSerializer(serializers.ModelSerializer):
    """Extended user serializer for admin views"""
    profile_info = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'role',
            'phone', 'is_email_verified', 'is_professional_verified',
            'is_suspended', 'suspension_reason', 'profile_info',
            'created_at', 'updated_at'
        ]
    
    def get_profile_info(self, obj):
        if obj.role == 'doctor':
            try:
                return {
                    'full_name': obj.doctor_profile.full_name,
                    'specialization': obj.doctor_profile.specialization,
                    'registration_number': obj.doctor_profile.registration_number
                }
            except:
                pass
        elif obj.role == 'laboratory':
            try:
                return {
                    'name': obj.laboratory_profile.name,
                    'license_number': obj.laboratory_profile.license_number
                }
            except:
                pass
        elif obj.role == 'pharmacy':
            try:
                return {
                    'name': obj.pharmacy_profile.name,
                    'license_number': obj.pharmacy_profile.license_number
                }
            except:
                pass
        return None


class VerifyProfessionalSerializer(serializers.Serializer):
    """For admin to verify/reject professional"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    notes = serializers.CharField(required=False, allow_blank=True)


class SuspendUserSerializer(serializers.Serializer):
    """For admin to suspend/unsuspend user"""
    action = serializers.ChoiceField(choices=['suspend', 'unsuspend'])
    reason = serializers.CharField(required=False, allow_blank=True)