from rest_framework import serializers
from .models import Prescription, PrescriptionDrug, DrugInteraction, MedicationReminder, DoseLog
from users.serializers import FamilyMemberSerializer

class DrugInteractionSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    type_display = serializers.CharField(source='get_interaction_type_display', read_only=True)
    
    class Meta:
        model = DrugInteraction
        fields = ['id', 'interaction_type', 'type_display', 'severity', 
                  'severity_display', 'interacting_item', 'description', 
                  'recommendation', 'created_at']


class PrescriptionDrugSerializer(serializers.ModelSerializer):
    interactions = DrugInteractionSerializer(many=True, read_only=True)
    has_interactions = serializers.SerializerMethodField()
    
    class Meta:
        model = PrescriptionDrug
        fields = ['id', 'drug_name', 'generic_name', 'dosage', 'frequency',
                  'duration', 'quantity', 'instructions', 'category', 'primary_use',
                  'mechanism', 'common_side_effects', 'generic_alternatives',
                  'interactions', 'has_interactions', 'created_at']
    
    def get_has_interactions(self, obj):
        return obj.interactions.filter(severity__in=['severe', 'contraindicated']).exists()


class PrescriptionListSerializer(serializers.ModelSerializer):
    drug_count = serializers.SerializerMethodField()
    has_safety_concerns = serializers.SerializerMethodField()
    family_member_name = serializers.CharField(source='family_member.name', read_only=True)
    
    class Meta:
        model = Prescription
        fields = ['id', 'image_url', 'doctor_name', 'clinic_name', 
                  'prescription_date', 'safety_score', 'status', 'drug_count',
                  'has_safety_concerns', 'family_member_name', 'created_at']
    
    def get_drug_count(self, obj):
        return obj.drugs.count()
    
    def get_has_safety_concerns(self, obj):
        return obj.safety_score is not None and obj.safety_score < 7


class PrescriptionDetailSerializer(serializers.ModelSerializer):
    drugs = PrescriptionDrugSerializer(many=True, read_only=True)
    family_member = FamilyMemberSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Prescription
        fields = ['id', 'user', 'family_member', 'image_url', 'file_type',
                  'ocr_raw_text', 'ocr_confidence', 'parsed_data', 'doctor_name',
                  'clinic_name', 'prescription_date', 'safety_score', 'safety_summary',
                  'status', 'status_display', 'notes', 'drugs', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'ocr_raw_text', 'ocr_confidence', 
                           'parsed_data', 'safety_score', 'safety_summary']


class PrescriptionUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    family_member_id = serializers.UUIDField(required=False, allow_null=True)
    
    def validate_file(self, value):
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError('File type not supported. Use JPG, PNG, or PDF.')
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('File size must be under 10MB')
        return value


class MedicationReminderSerializer(serializers.ModelSerializer):
    drug_name = serializers.CharField(source='prescription_drug.drug_name', read_only=True)
    dosage = serializers.CharField(source='prescription_drug.dosage', read_only=True)
    adherence_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicationReminder
        fields = ['id', 'prescription_drug', 'drug_name', 'dosage', 'reminder_time',
                  'days_of_week', 'is_active', 'doses_taken', 'doses_missed',
                  'last_taken_at', 'start_date', 'end_date', 'adherence_rate', 'created_at']
        read_only_fields = ['id', 'doses_taken', 'doses_missed', 'last_taken_at']
    
    def get_adherence_rate(self, obj):
        total = obj.doses_taken + obj.doses_missed
        if total == 0:
            return 100.0
        return round((obj.doses_taken / total) * 100, 1)


class DoseLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoseLog
        fields = ['id', 'reminder', 'scheduled_time', 'taken_at', 'status', 'notes']