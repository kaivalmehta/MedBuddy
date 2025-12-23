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
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions')
    family_member = models.ForeignKey(FamilyMember, on_delete=models.SET_NULL, null=True, blank=True)
    
    image_url = models.URLField(max_length=500)
    file_type = models.CharField(max_length=10, default='image')
    blob_name = models.CharField(max_length=255)
    
    ocr_raw_text = models.TextField(blank=True)
    ocr_confidence = models.FloatField(null=True, blank=True)
    
    parsed_data = models.JSONField(default=dict, blank=True)
    doctor_name = models.CharField(max_length=200, blank=True)
    clinic_name = models.CharField(max_length=200, blank=True)
    prescription_date = models.DateField(null=True, blank=True)
    
    safety_score = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    safety_summary = models.TextField(blank=True)
    
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
        ]


class PrescriptionDrug(models.Model):
    CATEGORY_CHOICES = [
        ('antibiotic', 'Antibiotic'), ('painkiller', 'Painkiller'),
        ('antacid', 'Antacid'), ('antihistamine', 'Antihistamine'),
        ('antihypertensive', 'Antihypertensive'), ('antidiabetic', 'Antidiabetic'),
        ('vitamin', 'Vitamin/Supplement'), ('other', 'Other'),
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
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'prescription_drugs'


class DrugInteraction(models.Model):
    INTERACTION_TYPES = [
        ('drug_drug', 'Drug-Drug'),
        ('drug_condition', 'Drug-Condition'),
        ('drug_allergy', 'Drug-Allergy'),
        ('drug_food', 'Drug-Food'),
    ]
    SEVERITY_LEVELS = [
        ('minor', 'Minor'), ('moderate', 'Moderate'),
        ('severe', 'Severe'), ('contraindicated', 'Contraindicated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription_drug = models.ForeignKey(PrescriptionDrug, on_delete=models.CASCADE, related_name='interactions')
    
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    interacting_item = models.CharField(max_length=200)
    description = models.TextField()
    recommendation = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'drug_interactions'
        indexes = [models.Index(fields=['severity'])]


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
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medication_reminders'


class DoseLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reminder = models.ForeignKey(MedicationReminder, on_delete=models.CASCADE, related_name='dose_logs')
    scheduled_time = models.DateTimeField()
    taken_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'dose_logs'
        ordering = ['-scheduled_time']