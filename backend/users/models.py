# backend/users/models.py
# Complete user models with email verification, OTP, and all required fields

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.conf import settings
import uuid
import random
import string
from datetime import timedelta


class User(AbstractUser):
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('pharmacy', 'Pharmacy'),
        ('laboratory', 'Laboratory'),
        ('doctor', 'Doctor/Clinic'),
        ('admin', 'Admin'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='patient')
    phone = models.CharField(max_length=20, blank=True)
    
    # Email Verification
    is_email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    
    # Professional Verification (for doctors, pharmacies, labs)
    is_professional_verified = models.BooleanField(default=False)
    professional_verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='verified_users'
    )
    verification_notes = models.TextField(blank=True)
    
    # Account Suspension
    is_suspended = models.BooleanField(default=False)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.TextField(blank=True)
    
    # Legacy field - kept for compatibility
    is_verified = models.BooleanField(default=False)
    
    preferred_language = models.CharField(max_length=10, default='en')
    
    # For receiving prescriptions/reports from professionals
    receive_email_notifications = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['is_email_verified']),
            models.Index(fields=['is_professional_verified']),
        ]
    
    def __str__(self):
        return f"{self.email} ({self.role})"
    
    @property
    def is_fully_verified(self):
        """Check if user is fully verified based on their role"""
        if self.role == 'patient':
            return self.is_email_verified
        elif self.role in ['doctor', 'pharmacy', 'laboratory']:
            return self.is_email_verified and self.is_professional_verified
        elif self.role == 'admin':
            return self.is_email_verified
        return False
    
    @property
    def can_send_to_patients(self):
        """Check if professional user can send prescriptions/reports to patients"""
        if self.role in ['doctor', 'pharmacy', 'laboratory']:
            return self.is_email_verified and self.is_professional_verified and not self.is_suspended
        return False
    
    def mark_email_verified(self):
        """Mark user's email as verified"""
        self.is_email_verified = True
        self.email_verified_at = timezone.now()
        self.is_verified = True  # Legacy field
        self.save()


class EmailVerificationOTP(models.Model):
    """OTP for email verification during registration and login"""
    PURPOSE_CHOICES = [
        ('registration', 'Registration Verification'),
        ('login', 'Login Verification'),
        ('password_reset', 'Password Reset'),
        ('email_change', 'Email Change'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='email_otps')
    
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    
    is_used = models.BooleanField(default=False)
    is_expired = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=5)
    
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'email_verification_otps'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'purpose', 'is_used']),
        ]
    
    @classmethod
    def generate_otp(cls):
        """Generate a 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))
    
    @classmethod
    def create_otp(cls, email, purpose, user=None, validity_minutes=None):
        """Create a new OTP for email verification"""
        if validity_minutes is None:
            validity_minutes = getattr(settings, 'OTP_VALIDITY_MINUTES', 10)
        
        # Invalidate any existing unused OTPs for this email and purpose
        cls.objects.filter(
            email=email,
            purpose=purpose,
            is_used=False,
            is_expired=False
        ).update(is_expired=True)
        
        otp_code = cls.generate_otp()
        expires_at = timezone.now() + timedelta(minutes=validity_minutes)
        
        return cls.objects.create(
            email=email,
            user=user,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=expires_at
        )
    
    def verify(self, entered_otp):
        """Verify the entered OTP"""
        # Check if already used
        if self.is_used:
            return False, "OTP has already been used"
        
        # Check if expired
        if self.is_expired or timezone.now() > self.expires_at:
            self.is_expired = True
            self.save()
            return False, "OTP has expired"
        
        # Check max attempts
        if self.attempts >= self.max_attempts:
            self.is_expired = True
            self.save()
            return False, "Maximum attempts exceeded"
        
        # Increment attempts
        self.attempts += 1
        self.save()
        
        # Verify OTP
        if self.otp_code != entered_otp:
            remaining = self.max_attempts - self.attempts
            return False, f"Invalid OTP. {remaining} attempts remaining"
        
        # Success
        self.is_used = True
        self.used_at = timezone.now()
        self.save()
        
        return True, "OTP verified successfully"
    
    @property
    def is_valid(self):
        """Check if OTP is still valid"""
        return not self.is_used and not self.is_expired and timezone.now() < self.expires_at


class PendingRegistration(models.Model):
    """Store pending user registrations waiting for email verification"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    
    # Store registration data as JSON
    registration_data = models.JSONField()
    
    # Verification status
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'pending_registrations'
        ordering = ['-created_at']
    
    @classmethod
    def create_pending(cls, email, registration_data, validity_hours=24):
        """Create a pending registration"""
        # Remove any existing pending registration for this email
        cls.objects.filter(email=email).delete()
        
        expires_at = timezone.now() + timedelta(hours=validity_hours)
        
        return cls.objects.create(
            email=email,
            registration_data=registration_data,
            expires_at=expires_at
        )
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class HealthProfile(models.Model):
    BLOOD_TYPE_CHOICES = [
        ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-'),
    ]
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='health_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    blood_type = models.CharField(max_length=3, choices=BLOOD_TYPE_CHOICES, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    medical_conditions = models.JSONField(default=list, blank=True)
    allergies = models.JSONField(default=list, blank=True)
    current_medications = models.JSONField(default=list, blank=True)
    lifestyle_factors = models.JSONField(default=dict, blank=True)
    
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'health_profiles'


class FamilyMember(models.Model):
    RELATIONSHIP_CHOICES = [
        ('spouse', 'Spouse'), ('child', 'Child'), ('parent', 'Parent'),
        ('sibling', 'Sibling'), ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='family_members')
    name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=HealthProfile.GENDER_CHOICES, blank=True)
    blood_type = models.CharField(max_length=3, choices=HealthProfile.BLOOD_TYPE_CHOICES, blank=True)
    medical_conditions = models.JSONField(default=list, blank=True)
    allergies = models.JSONField(default=list, blank=True)
    current_medications = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'family_members'
        ordering = ['name']


class DoctorProfile(models.Model):
    """Profile for Doctor/Clinic users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    
    # Professional details
    full_name = models.CharField(max_length=200)
    specialization = models.CharField(max_length=100)
    qualification = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=100, unique=True)
    
    # Clinic/Hospital details
    clinic_name = models.CharField(max_length=200, blank=True)
    clinic_address = models.TextField(blank=True)
    clinic_phone = models.CharField(max_length=20, blank=True)
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verification_document = models.URLField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'doctor_profiles'
    
    def __str__(self):
        return f"Dr. {self.full_name} - {self.specialization}"


class LaboratoryProfile(models.Model):
    """Profile for Laboratory users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='laboratory_profile')
    
    name = models.CharField(max_length=200)
    license_number = models.CharField(max_length=100, unique=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    phone = models.CharField(max_length=20)
    
    # Services offered
    services = models.JSONField(default=list, blank=True)  # ['blood_test', 'xray', 'mri', etc.]
    home_collection_available = models.BooleanField(default=False)  # Lab offers home collection
    
    is_verified = models.BooleanField(default=False)
    verification_document = models.URLField(blank=True)  # License PDF URL
    operating_hours = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'laboratory_profiles'
    
    def __str__(self):
        return self.name


class PatientAccessToken(models.Model):
    """OTP/PIN system for doctors to access patient history or send prescriptions"""
    PURPOSE_CHOICES = [
        ('view_history', 'View Medical History'),
        ('add_prescription', 'Add Prescription'),
        ('add_report', 'Add Lab Report'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # The patient whose data is being accessed
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='access_tokens')
    # The doctor/professional requesting access
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='access_requests')
    
    # OTP details
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='view_history')
    
    # Validity
    is_used = models.BooleanField(default=False)
    is_expired = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    
    # Access granted
    access_granted = models.BooleanField(default=False)
    access_granted_at = models.DateTimeField(null=True, blank=True)
    
    # Session validity after access is granted
    session_expires_at = models.DateTimeField(null=True, blank=True)
    
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=5)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'patient_access_tokens'
        ordering = ['-created_at']
    
    @classmethod
    def generate_otp(cls):
        """Generate a 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))
    
    @classmethod
    def create_access_request(cls, patient, requester, purpose='view_history', validity_minutes=10):
        """Create a new access request with OTP"""
        # Invalidate existing requests
        cls.objects.filter(
            patient=patient,
            requester=requester,
            is_used=False,
            is_expired=False
        ).update(is_expired=True)
        
        otp = cls.generate_otp()
        expires_at = timezone.now() + timedelta(minutes=validity_minutes)
        
        token = cls.objects.create(
            patient=patient,
            requester=requester,
            otp_code=otp,
            purpose=purpose,
            expires_at=expires_at
        )
        return token
    
    def verify_otp(self, entered_otp):
        """Verify the OTP and grant access"""
        if self.is_used:
            return False, "OTP already used"
        
        if self.is_expired or timezone.now() > self.expires_at:
            self.is_expired = True
            self.save()
            return False, "OTP has expired"
        
        if self.attempts >= self.max_attempts:
            self.is_expired = True
            self.save()
            return False, "Maximum attempts exceeded"
        
        self.attempts += 1
        self.save()
        
        if self.otp_code != entered_otp:
            remaining = self.max_attempts - self.attempts
            return False, f"Invalid OTP. {remaining} attempts remaining"
        
        # Grant access with 1-hour session
        self.is_used = True
        self.access_granted = True
        self.access_granted_at = timezone.now()
        self.session_expires_at = timezone.now() + timedelta(hours=1)
        self.save()
        
        return True, "Access granted"
    
    @property
    def is_valid(self):
        """Check if token is still valid"""
        return not self.is_used and not self.is_expired and timezone.now() < self.expires_at
    
    @property
    def is_session_active(self):
        """Check if the granted session is still active"""
        if not self.access_granted or not self.session_expires_at:
            return False
        return timezone.now() < self.session_expires_at


class PasswordResetToken(models.Model):
    """Token for password reset functionality"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    
    token = models.CharField(max_length=64, unique=True)
    otp_code = models.CharField(max_length=6)
    
    is_used = models.BooleanField(default=False)
    is_expired = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'password_reset_tokens'
        ordering = ['-created_at']
    
    @classmethod
    def create_token(cls, user, validity_minutes=30):
        """Create a new password reset token"""
        import secrets
        
        # Invalidate existing tokens
        cls.objects.filter(user=user, is_used=False, is_expired=False).update(is_expired=True)
        
        token = secrets.token_urlsafe(48)
        otp_code = ''.join(random.choices(string.digits, k=6))
        expires_at = timezone.now() + timedelta(minutes=validity_minutes)
        
        return cls.objects.create(
            user=user,
            token=token,
            otp_code=otp_code,
            expires_at=expires_at
        )
    
    def verify(self, otp_or_token):
        """Verify the reset token or OTP"""
        if self.is_used:
            return False, "Reset link has already been used"
        
        if self.is_expired or timezone.now() > self.expires_at:
            self.is_expired = True
            self.save()
            return False, "Reset link has expired"
        
        if otp_or_token == self.otp_code or otp_or_token == self.token:
            return True, "Verified"
        
        return False, "Invalid verification code"
    
    def mark_used(self):
        """Mark token as used after password reset"""
        self.is_used = True
        self.used_at = timezone.now()
        self.save()
