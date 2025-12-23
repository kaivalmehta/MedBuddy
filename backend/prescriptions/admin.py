from django.contrib import admin
from .models import Prescription, PrescriptionDrug, DrugInteraction, MedicationReminder

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'doctor_name', 'status', 'safety_score', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__email', 'doctor_name']

@admin.register(PrescriptionDrug)
class PrescriptionDrugAdmin(admin.ModelAdmin):
    list_display = ['drug_name', 'prescription', 'dosage', 'frequency']
    search_fields = ['drug_name', 'generic_name']

@admin.register(DrugInteraction)
class DrugInteractionAdmin(admin.ModelAdmin):
    list_display = ['prescription_drug', 'interaction_type', 'severity', 'interacting_item']
    list_filter = ['interaction_type', 'severity']

@admin.register(MedicationReminder)
class MedicationReminderAdmin(admin.ModelAdmin):
    list_display = ['prescription_drug', 'user', 'reminder_time', 'is_active']
    list_filter = ['is_active']