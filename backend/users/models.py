from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class User(AbstractUser):
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('pharmacy', 'Pharmacy'),
        ('admin', 'Admin'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='patient')
    phone = models.CharField(max_length=20, blank=True)
    is_verified = models.BooleanField(default=False)
    preferred_language = models.CharField(max_length=10, default='en')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

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