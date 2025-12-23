# backend/prescriptions/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from users.models import User, FamilyMember
import uuid


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
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions')
    family_member = models.ForeignKey(FamilyMember, on_delete=models.SET_NULL, null=True, blank=True)
    
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
    
    # NEW: Enhanced Safety Analysis Fields
    overall_safety_percentage = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Overall safety percentage (0-100%)"
    )
    safety_status = models.CharField(
        max_length=30, 
        choices=SAFETY_STATUS_CHOICES, 
        default='safe',
        blank=True
    )
    safety_summary = models.TextField(blank=True, help_text="Brief overall safety summary")
    
    # Detailed safety report stored as JSON
    safety_report = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Detailed safety analysis with all interaction categories"
    )
    # Example structure of safety_report:
    # {
    #     "drug_drug_interactions": [...],
    #     "drug_allergy_interactions": [...],
    #     "drug_disease_interactions": [...],
    #     "drug_food_interactions": [...],
    #     "pregnancy_warnings": [...],
    #     "critical_alerts": [...],
    #     "recommendations": [...],
    #     "safe_medications": [...]
    # }
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prescriptions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['safety_status']),
        ]
    
    def __str__(self):
        return f"Prescription {self.id} - {self.user.email}"
    
    @property
    def has_critical_warnings(self):
        """Check if prescription has any critical warnings"""
        if not self.safety_report:
            return False
        return len(self.safety_report.get('critical_alerts', [])) > 0
    
    @property
    def total_interactions_count(self):
        """Count total number of interactions found"""
        if not self.safety_report:
            return 0
        count = 0
        for key in ['drug_drug_interactions', 'drug_allergy_interactions', 
                    'drug_disease_interactions', 'drug_food_interactions']:
            count += len(self.safety_report.get(key, []))
        return count


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
    
    # Drug info
    drug_name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100, blank=True)
    quantity = models.IntegerField(null=True, blank=True)
    instructions = models.TextField(blank=True)
    
    # Classification
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    primary_use = models.TextField(blank=True)
    mechanism = models.TextField(blank=True)
    common_side_effects = models.JSONField(default=list, blank=True)
    generic_alternatives = models.JSONField(default=list, blank=True)
    
    # NEW: Individual drug safety fields
    safety_percentage = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Safety percentage for this specific drug (0-100%)"
    )
    safety_status = models.CharField(
        max_length=20, 
        choices=SAFETY_STATUS_CHOICES, 
        default='safe',
        blank=True
    )
    safety_concerns = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of safety concerns for this drug"
    )
    is_safe_to_take = models.BooleanField(default=True)
    requires_monitoring = models.BooleanField(default=False)
    special_instructions = models.TextField(blank=True, help_text="AI-generated special instructions based on health profile")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'prescription_drugs'
    
    def __str__(self):
        return f"{self.drug_name} - {self.dosage}"


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
    interacting_item = models.CharField(max_length=200, help_text="The drug/allergy/disease/food causing interaction")
    
    # Detailed explanation
    title = models.CharField(max_length=300, blank=True, help_text="Short title for the interaction")
    description = models.TextField(help_text="Detailed explanation of the interaction")
    mechanism = models.TextField(blank=True, help_text="How/why this interaction occurs")
    effects = models.TextField(blank=True, help_text="What could happen if taken together")
    recommendation = models.TextField(help_text="What the patient should do")
    
    # Additional flags
    requires_immediate_attention = models.BooleanField(default=False)
    consult_doctor = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'drug_interactions'
        indexes = [
            models.Index(fields=['severity']),
            models.Index(fields=['interaction_type']),
        ]
    
    def __str__(self):
        return f"{self.prescription_drug.drug_name} - {self.interaction_type} with {self.interacting_item}"


class MedicationReminder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription_drug = models.ForeignKey(PrescriptionDrug, on_delete=models.CASCADE, related_name='reminders')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reminders')
    
    reminder_time = models.TimeField()
    days_of_week = models.JSONField(default=list)  # [0,1,2,3,4,5,6]
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