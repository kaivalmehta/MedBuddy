# backend/prescriptions/models.py
# REPLACE your entire prescriptions/models.py with this

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from users.models import User, FamilyMember
import uuid
import hashlib


class Prescription(models.Model):
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('analyzed', 'Analyzed'),
        ('sent_to_pharmacy', 'Sent to Pharmacy'),
        ('completed', 'Completed'),
    ]
    
    SAFETY_STATUS_CHOICES = [
        ('safe', 'Safe to Use'),
        ('caution_needed', 'Use with Caution'),
        ('consultation_required', 'Consult Doctor First'),
        ('unsafe', 'Do Not Take Without Medical Advice'),
    ]
    
    # NEW: Source tracking for duplicate prevention
    SOURCE_CHOICES = [
        ('self', 'Self Upload'),
        ('doctor', 'From Doctor'),
        ('pharmacy', 'From Pharmacy'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions')
    family_member = models.ForeignKey(FamilyMember, on_delete=models.SET_NULL, null=True, blank=True)
    
    # NEW: Source and sender tracking
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='self')
    sent_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sent_prescriptions',
        help_text="Doctor or Pharmacy who sent this prescription"
    )
    
    # NEW: Duplicate prevention - hash of prescription content
    content_hash = models.CharField(max_length=64, blank=True, db_index=True)
    is_duplicate = models.BooleanField(default=False)
    original_prescription = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='duplicates',
        help_text="If duplicate, points to the original"
    )
    
    # File storage
    image_url = models.URLField(max_length=500)
    file_type = models.CharField(max_length=10, default='image')
    blob_name = models.CharField(max_length=255)
    
    # OCR results
    ocr_raw_text = models.TextField(blank=True)
    ocr_confidence = models.FloatField(null=True, blank=True)
    
    # Parsed prescription data
    parsed_data = models.JSONField(default=dict, blank=True)
    doctor_name = models.CharField(max_length=200, blank=True)
    clinic_name = models.CharField(max_length=200, blank=True)
    prescription_date = models.DateField(null=True, blank=True)
    
    # NEW: Computerized prescription (for doctors creating digital prescriptions)
    is_digital = models.BooleanField(default=False, help_text="True if created digitally by doctor")
    digital_signature = models.TextField(blank=True, help_text="Doctor's digital signature/verification")
    
    # Safety Analysis Fields
    overall_safety_percentage = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    safety_status = models.CharField(max_length=30, choices=SAFETY_STATUS_CHOICES, default='safe', blank=True)
    safety_summary = models.TextField(blank=True)
    safety_report = models.JSONField(default=dict, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    notes = models.TextField(blank=True)
    
    # Email tracking
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prescriptions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['safety_status']),
            models.Index(fields=['source']),
            models.Index(fields=['content_hash']),
        ]
    
    def __str__(self):
        return f"Prescription {self.id} - {self.user.email} ({self.source})"
    
    def generate_content_hash(self):
        """Generate hash for duplicate detection based on key prescription data"""
        # Combine key identifiers
        content = f"{self.doctor_name}|{self.prescription_date}|{self.ocr_raw_text[:500] if self.ocr_raw_text else ''}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def check_and_mark_duplicate(self):
        """Check if this prescription is a duplicate and mark accordingly"""
        if not self.content_hash:
            self.content_hash = self.generate_content_hash()
        
        # Look for existing prescriptions with same hash for same user
        existing = Prescription.objects.filter(
            user=self.user,
            content_hash=self.content_hash,
            is_duplicate=False
        ).exclude(pk=self.pk).first()
        
        if existing:
            self.is_duplicate = True
            self.original_prescription = existing
            return True
        return False
    
    @property
    def has_critical_warnings(self):
        if not self.safety_report:
            return False
        return len(self.safety_report.get('critical_alerts', [])) > 0
    
    @property
    def total_interactions_count(self):
        if not self.safety_report:
            return 0
        count = 0
        for key in ['drug_drug_interactions', 'drug_allergy_interactions', 
                    'drug_disease_interactions', 'drug_food_interactions']:
            count += len(self.safety_report.get(key, []))
        return count
    
    @property
    def source_display(self):
        """Human readable source with sender info"""
        if self.source == 'self':
            return "Self Uploaded"
        elif self.source == 'doctor' and self.sent_by:
            try:
                return f"From Dr. {self.sent_by.doctor_profile.full_name}"
            except:
                return "From Doctor"
        elif self.source == 'pharmacy' and self.sent_by:
            try:
                return f"From {self.sent_by.pharmacy_profile.name}"
            except:
                return "From Pharmacy"
        return self.get_source_display()


class PrescriptionDrug(models.Model):
    CATEGORY_CHOICES = [
        ('antibiotic', 'Antibiotic'), ('painkiller', 'Painkiller'),
        ('antacid', 'Antacid'), ('antihistamine', 'Antihistamine'),
        ('antihypertensive', 'Antihypertensive'), ('antidiabetic', 'Antidiabetic'),
        ('vitamin', 'Vitamin/Supplement'), ('other', 'Other'),
    ]
    
    SAFETY_STATUS_CHOICES = [
        ('safe', 'Safe'),
        ('caution', 'Use with Caution'),
        ('warning', 'Warning'),
        ('danger', 'Danger - Consult Doctor'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='drugs')
    
    drug_name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100, blank=True)
    quantity = models.IntegerField(null=True, blank=True)
    instructions = models.TextField(blank=True)
    
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    primary_use = models.TextField(blank=True)
    mechanism = models.TextField(blank=True)
    common_side_effects = models.JSONField(default=list, blank=True)
    generic_alternatives = models.JSONField(default=list, blank=True)
    
    safety_percentage = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    safety_status = models.CharField(max_length=20, choices=SAFETY_STATUS_CHOICES, default='safe', blank=True)
    safety_concerns = models.JSONField(default=list, blank=True)
    is_safe_to_take = models.BooleanField(default=True)
    requires_monitoring = models.BooleanField(default=False)
    special_instructions = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'prescription_drugs'


class DrugInteraction(models.Model):
    INTERACTION_TYPES = [
        ('drug_drug', 'Drug-Drug Interaction'),
        ('drug_allergy', 'Drug-Allergy Interaction'),
        ('drug_disease', 'Drug-Disease Interaction'),
        ('drug_food', 'Drug-Food Interaction'),
        ('drug_lifestyle', 'Drug-Lifestyle Interaction'),
        ('pregnancy', 'Pregnancy Warning'),
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Information'),
        ('minor', 'Minor'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
        ('critical', 'Critical - Do Not Take'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription_drug = models.ForeignKey(PrescriptionDrug, on_delete=models.CASCADE, related_name='interactions')
    
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    interacting_item = models.CharField(max_length=200)
    
    title = models.CharField(max_length=300, blank=True)
    description = models.TextField()
    mechanism = models.TextField(blank=True)
    effects = models.TextField(blank=True)
    recommendation = models.TextField()
    
    requires_immediate_attention = models.BooleanField(default=False)
    consult_doctor = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'drug_interactions'
        indexes = [
            models.Index(fields=['severity']),
            models.Index(fields=['interaction_type']),
        ]


class MedicationReminder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription_drug = models.ForeignKey(PrescriptionDrug, on_delete=models.CASCADE, related_name='reminders')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reminders')
    
    reminder_time = models.TimeField()
    days_of_week = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    
    doses_taken = models.IntegerField(default=0)
    doses_missed = models.IntegerField(default=0)
    last_taken_at = models.DateTimeField(null=True, blank=True)
    
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medication_reminders'
    
    @property
    def adherence_rate(self):
        total = self.doses_taken + self.doses_missed
        if total == 0:
            return 100.0
        return round((self.doses_taken / total) * 100, 1)


class DoseLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('taken', 'Taken'),
        ('missed', 'Missed'),
        ('skipped', 'Skipped'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reminder = models.ForeignKey(MedicationReminder, on_delete=models.CASCADE, related_name='dose_logs')
    scheduled_time = models.DateTimeField()
    taken_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'dose_logs'
        ordering = ['-scheduled_time']


# ============================================
# NEW: LAB REPORT MODEL
# ============================================

class LabReport(models.Model):
    """Laboratory test reports"""
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('analyzed', 'Analyzed'),
        ('completed', 'Completed'),
    ]
    
    SOURCE_CHOICES = [
        ('self', 'Self Upload'),
        ('laboratory', 'From Laboratory'),
        ('doctor', 'From Doctor'),
    ]
    
    REPORT_TYPE_CHOICES = [
        ('blood_test', 'Blood Test'),
        ('urine_test', 'Urine Test'),
        ('xray', 'X-Ray'),
        ('mri', 'MRI'),
        ('ct_scan', 'CT Scan'),
        ('ultrasound', 'Ultrasound'),
        ('ecg', 'ECG/EKG'),
        ('pathology', 'Pathology'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lab_reports')
    family_member = models.ForeignKey(FamilyMember, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Source tracking
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='self')
    sent_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sent_lab_reports'
    )
    
    # Report details
    report_type = models.CharField(max_length=30, choices=REPORT_TYPE_CHOICES, default='other')
    report_title = models.CharField(max_length=200)
    report_date = models.DateField(null=True, blank=True)
    
    # Lab info
    laboratory_name = models.CharField(max_length=200, blank=True)
    referring_doctor = models.CharField(max_length=200, blank=True)
    
    # File storage
    file_url = models.URLField(max_length=500)
    file_type = models.CharField(max_length=10, default='pdf')
    blob_name = models.CharField(max_length=255)
    
    # OCR/Analysis results
    ocr_raw_text = models.TextField(blank=True)
    ocr_confidence = models.FloatField(null=True, blank=True)
    parsed_data = models.JSONField(default=dict, blank=True)
    
    # AI Analysis
    analysis_summary = models.TextField(blank=True)
    abnormal_values = models.JSONField(default=list, blank=True)
    recommendations = models.JSONField(default=list, blank=True)
    
    # Duplicate prevention
    content_hash = models.CharField(max_length=64, blank=True, db_index=True)
    is_duplicate = models.BooleanField(default=False)
    original_report = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='duplicates'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    notes = models.TextField(blank=True)
    
    # Email tracking
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'lab_reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['report_type']),
            models.Index(fields=['source']),
        ]
    
    def __str__(self):
        return f"{self.report_title} - {self.user.email}"
    
    def generate_content_hash(self):
        content = f"{self.laboratory_name}|{self.report_date}|{self.report_type}|{self.ocr_raw_text[:500] if self.ocr_raw_text else ''}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def check_and_mark_duplicate(self):
        if not self.content_hash:
            self.content_hash = self.generate_content_hash()
        
        existing = LabReport.objects.filter(
            user=self.user,
            content_hash=self.content_hash,
            is_duplicate=False
        ).exclude(pk=self.pk).first()
        
        if existing:
            self.is_duplicate = True
            self.original_report = existing
            return True
        return False