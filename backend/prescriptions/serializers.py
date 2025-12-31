# backend/prescriptions/serializers.py
from rest_framework import serializers
from .models import Prescription, PrescriptionDrug, DrugInteraction, MedicationReminder, DoseLog


class DrugInteractionSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    type_display = serializers.CharField(source='get_interaction_type_display', read_only=True)
    severity_color = serializers.SerializerMethodField()
    
    class Meta:
        model = DrugInteraction
        fields = [
            'id', 'interaction_type', 'type_display', 'severity', 'severity_display',
            'severity_color', 'interacting_item', 'title', 'description', 'mechanism',
            'effects', 'recommendation', 'requires_immediate_attention', 'consult_doctor',
            'created_at'
        ]
    
    def get_severity_color(self, obj):
        colors = {
            'info': 'blue',
            'minor': 'green',
            'moderate': 'yellow',
            'severe': 'orange',
            'critical': 'red'
        }
        return colors.get(obj.severity, 'gray')


class PrescriptionDrugSerializer(serializers.ModelSerializer):
    interactions = DrugInteractionSerializer(many=True, read_only=True)
    has_safety_concerns = serializers.SerializerMethodField()
    safety_color = serializers.SerializerMethodField()
    interaction_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PrescriptionDrug
        fields = [
            'id', 'drug_name', 'generic_name', 'dosage', 'frequency',
            'duration', 'quantity', 'instructions', 'category', 'primary_use',
            'mechanism', 'common_side_effects', 'generic_alternatives',
            # Safety fields
            'safety_percentage', 'safety_status', 'safety_concerns',
            'is_safe_to_take', 'requires_monitoring', 'special_instructions',
            'has_safety_concerns', 'safety_color', 'interaction_count',
            'interactions', 'created_at'
        ]
    
    def get_has_safety_concerns(self, obj):
        if obj.safety_percentage is None:
            return False
        return obj.safety_percentage < 80 or not obj.is_safe_to_take
    
    def get_safety_color(self, obj):
        if obj.safety_percentage is None:
            return 'gray'
        if obj.safety_percentage >= 80:
            return 'green'
        if obj.safety_percentage >= 60:
            return 'yellow'
        if obj.safety_percentage >= 40:
            return 'orange'
        return 'red'
    
    def get_interaction_count(self, obj):
        return obj.interactions.count()


class PrescriptionListSerializer(serializers.ModelSerializer):
    drug_count = serializers.SerializerMethodField()
    has_safety_concerns = serializers.SerializerMethodField()
    has_critical_warnings = serializers.SerializerMethodField()
    family_member_name = serializers.CharField(source='family_member.name', read_only=True, allow_null=True)
    safety_color = serializers.SerializerMethodField()
    safety_label = serializers.SerializerMethodField()
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'image_url', 'doctor_name', 'clinic_name', 'prescription_date',
            'overall_safety_percentage', 'safety_status', 'status',
            'drug_count', 'has_safety_concerns', 'has_critical_warnings',
            'safety_color', 'safety_label', 'family_member_name', 'created_at'
        ]
    
    def get_drug_count(self, obj):
        return obj.drugs.count()
    
    def get_has_safety_concerns(self, obj):
        if obj.overall_safety_percentage is None:
            return False
        return obj.overall_safety_percentage < 80
    
    def get_has_critical_warnings(self, obj):
        return obj.has_critical_warnings
    
    def get_safety_color(self, obj):
        if obj.overall_safety_percentage is None:
            return 'gray'
        if obj.overall_safety_percentage >= 80:
            return 'green'
        if obj.overall_safety_percentage >= 60:
            return 'yellow'
        if obj.overall_safety_percentage >= 40:
            return 'orange'
        return 'red'
    
    def get_safety_label(self, obj):
        if obj.overall_safety_percentage is None:
            return 'Not Analyzed'
        if obj.overall_safety_percentage >= 80:
            return 'Safe'
        if obj.overall_safety_percentage >= 60:
            return 'Caution Needed'
        if obj.overall_safety_percentage >= 40:
            return 'Consult Doctor'
        return 'Warning'


class PrescriptionDetailSerializer(serializers.ModelSerializer):
    drugs = PrescriptionDrugSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    safety_status_display = serializers.SerializerMethodField()
    safety_color = serializers.SerializerMethodField()
    total_interactions_count = serializers.IntegerField(read_only=True)
    has_critical_warnings = serializers.BooleanField(read_only=True)
    
    # Extract sections from safety_report for easy frontend access
    drug_drug_interactions = serializers.SerializerMethodField()
    drug_allergy_interactions = serializers.SerializerMethodField()
    drug_disease_interactions = serializers.SerializerMethodField()
    drug_food_interactions = serializers.SerializerMethodField()
    pregnancy_warnings = serializers.SerializerMethodField()
    critical_alerts = serializers.SerializerMethodField()
    safe_medications = serializers.SerializerMethodField()
    recommendations = serializers.SerializerMethodField()
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'user', 'family_member', 'image_url', 'file_type',
            'ocr_raw_text', 'ocr_confidence', 'parsed_data', 'doctor_name',
            'clinic_name', 'prescription_date',
            # Safety overview
            'overall_safety_percentage', 'safety_status', 'safety_status_display',
            'safety_summary', 'safety_color', 'total_interactions_count',
            'has_critical_warnings',
            # Detailed safety sections (from safety_report)
            'drug_drug_interactions', 'drug_allergy_interactions',
            'drug_disease_interactions', 'drug_food_interactions',
            'pregnancy_warnings', 'critical_alerts', 'safe_medications',
            'recommendations',
            # Full report for advanced use
            'safety_report',
            # Other
            'status', 'status_display', 'notes', 'drugs', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'ocr_raw_text', 'ocr_confidence', 'parsed_data']
    
    def get_safety_status_display(self, obj):
        status_map = {
            'safe': '✓ Safe to Use',
            'caution_needed': '⚠ Use with Caution',
            'consultation_required': '⚕ Consult Doctor First',
            'unsafe': '⛔ Do Not Take Without Medical Advice'
        }
        return status_map.get(obj.safety_status, 'Unknown')
    
    def get_safety_color(self, obj):
        if obj.overall_safety_percentage is None:
            return 'gray'
        if obj.overall_safety_percentage >= 80:
            return 'green'
        if obj.overall_safety_percentage >= 60:
            return 'yellow'
        if obj.overall_safety_percentage >= 40:
            return 'orange'
        return 'red'
    
    def get_drug_drug_interactions(self, obj):
        return obj.safety_report.get('drug_drug_interactions', []) if obj.safety_report else []
    
    def get_drug_allergy_interactions(self, obj):
        return obj.safety_report.get('drug_allergy_interactions', []) if obj.safety_report else []
    
    def get_drug_disease_interactions(self, obj):
        return obj.safety_report.get('drug_disease_interactions', []) if obj.safety_report else []
    
    def get_drug_food_interactions(self, obj):
        return obj.safety_report.get('drug_food_interactions', []) if obj.safety_report else []
    
    def get_pregnancy_warnings(self, obj):
        return obj.safety_report.get('pregnancy_warnings', []) if obj.safety_report else []
    
    def get_critical_alerts(self, obj):
        return obj.safety_report.get('critical_alerts', []) if obj.safety_report else []
    
    def get_safe_medications(self, obj):
        return obj.safety_report.get('safe_medications', []) if obj.safety_report else []
    
    def get_recommendations(self, obj):
        return obj.safety_report.get('recommendations', []) if obj.safety_report else []


class PrescriptionUploadSerializer(serializers.Serializer):
    """Serializer for prescription file upload"""
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
    adherence_rate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = MedicationReminder
        fields = [
            'id', 'prescription_drug', 'drug_name', 'dosage', 'reminder_time',
            'days_of_week', 'is_active', 'doses_taken', 'doses_missed',
            'last_taken_at', 'start_date', 'end_date', 'notes',
            'adherence_rate', 'created_at'
        ]
        read_only_fields = ['id', 'doses_taken', 'doses_missed', 'last_taken_at']


class CreateReminderSerializer(serializers.ModelSerializer):
    """Serializer for creating medication reminders"""
    class Meta:
        model = MedicationReminder
        fields = ['prescription_drug', 'reminder_time', 'days_of_week', 'start_date', 'end_date', 'notes']


class DoseLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoseLog
        fields = ['id', 'reminder', 'scheduled_time', 'taken_at', 'status', 'notes']


# ============================================
# DETAILED SERIALIZERS FOR PATIENT HISTORY
# ============================================

class DrugComplianceSerializer(serializers.ModelSerializer):
    """Drug with compliance/reminder data for patient history"""
    compliance = serializers.SerializerMethodField()
    
    class Meta:
        model = PrescriptionDrug
        fields = [
            'id', 'drug_name', 'generic_name', 'dosage', 'frequency',
            'duration', 'quantity', 'instructions', 'category', 'primary_use',
            'safety_percentage', 'safety_status', 'is_safe_to_take',
            'compliance'
        ]
    
    def get_compliance(self, obj):
        """Get compliance data from reminders"""
        # Get the patient (user) from context
        user = self.context.get('patient')
        if not user:
            return None
        
        reminder = obj.reminders.filter(user=user).first()
        if not reminder:
            return None
        
        return {
            'doses_taken': reminder.doses_taken,
            'doses_missed': reminder.doses_missed,
            'adherence_rate': reminder.adherence_rate,
            'last_taken_at': reminder.last_taken_at,
            'is_active': reminder.is_active,
            'start_date': reminder.start_date,
            'end_date': reminder.end_date
        }


class PrescriptionDetailedSerializer(serializers.ModelSerializer):
    """Detailed prescription with medications for patient history"""
    medications = serializers.SerializerMethodField()
    drug_count = serializers.SerializerMethodField()
    overall_compliance = serializers.SerializerMethodField()
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'doctor_name', 'clinic_name', 'prescription_date',
            'overall_safety_percentage', 'safety_status', 'status', 'source',
            'drug_count', 'overall_compliance', 'medications', 'created_at'
        ]
    
    def get_drug_count(self, obj):
        return obj.drugs.count()
    
    def get_medications(self, obj):
        return DrugComplianceSerializer(
            obj.drugs.all(), 
            many=True, 
            context=self.context
        ).data
    
    def get_overall_compliance(self, obj):
        """Calculate overall compliance across all medications"""
        user = self.context.get('patient')
        if not user:
            return None
        
        total_taken = 0
        total_missed = 0
        
        for drug in obj.drugs.all():
            reminder = drug.reminders.filter(user=user).first()
            if reminder:
                total_taken += reminder.doses_taken
                total_missed += reminder.doses_missed
        
        total = total_taken + total_missed
        if total == 0:
            return None
        
        return {
            'doses_taken': total_taken,
            'doses_missed': total_missed,
            'adherence_rate': round((total_taken / total) * 100, 1)
        }


# ============================================
# TEST CATALOG SERIALIZERS
# ============================================

from .models import TestCatalog, TestOrder, HomeSampleCollection, CriticalValueAlert


class TestCatalogSerializer(serializers.ModelSerializer):
    laboratory_name = serializers.SerializerMethodField()
    effective_price = serializers.SerializerMethodField()
    
    class Meta:
        model = TestCatalog
        fields = [
            'id', 'test_name', 'test_code', 'category', 'description',
            'price', 'discount_price', 'effective_price', 'turnaround_time',
            'preparation_instructions', 'sample_type',
            'home_collection_available', 'home_collection_charge',
            'normal_range_min', 'normal_range_max', 'unit',
            'is_active', 'is_popular', 'laboratory_name'
        ]
    
    def get_laboratory_name(self, obj):
        try:
            return obj.laboratory.laboratory_profile.name
        except:
            return obj.laboratory.email
    
    def get_effective_price(self, obj):
        if obj.discount_price and obj.discount_price < obj.price:
            return float(obj.discount_price)
        return float(obj.price)


class TestCatalogCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCatalog
        fields = [
            'test_name', 'test_code', 'category', 'description',
            'price', 'discount_price', 'turnaround_time',
            'preparation_instructions', 'sample_type',
            'home_collection_available', 'home_collection_charge',
            'normal_range_min', 'normal_range_max', 'unit',
            'critical_low', 'critical_high', 'is_active', 'is_popular'
        ]


# ============================================
# HOME SAMPLE COLLECTION SERIALIZERS
# ============================================

class HomeSampleCollectionSerializer(serializers.ModelSerializer):
    time_slot_display = serializers.CharField(source='get_preferred_time_slot_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = HomeSampleCollection
        fields = [
            'id', 'address_line1', 'address_line2', 'city', 'state', 'zip_code',
            'landmark', 'contact_phone', 'alternate_phone',
            'preferred_date', 'preferred_time_slot', 'time_slot_display',
            'confirmed_date', 'confirmed_time',
            'collector_name', 'collector_phone',
            'status', 'status_display', 'collected_at',
            'patient_notes', 'lab_notes', 'collection_charge',
            'created_at'
        ]


class HomeSampleCollectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeSampleCollection
        fields = [
            'address_line1', 'address_line2', 'city', 'state', 'zip_code',
            'landmark', 'contact_phone', 'alternate_phone',
            'preferred_date', 'preferred_time_slot', 'patient_notes'
        ]


# ============================================
# TEST ORDER SERIALIZERS
# ============================================

class TestOrderSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.SerializerMethodField()
    laboratory_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    collection_type_display = serializers.CharField(source='get_collection_type_display', read_only=True)
    home_collection = HomeSampleCollectionSerializer(read_only=True)
    has_report = serializers.SerializerMethodField()
    reports_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TestOrder
        fields = [
            'id', 'order_number', 'doctor', 'doctor_name', 
            'patient', 'patient_name', 'patient_email',
            'laboratory', 'laboratory_name',
            'tests_requested', 'clinical_notes', 'diagnosis',
            'urgency', 'urgency_display', 'status', 'status_display',
            'collection_type', 'collection_type_display',
            'home_collection', 'lab_notes',
            'accepted_at', 'declined_at', 'decline_reason',
            'completed_at', 'estimated_cost', 'final_cost',
            'has_report', 'reports_count', 'created_at', 'updated_at'
        ]
    
    def get_doctor_name(self, obj):
        if not obj.doctor:
            return None  # Patient self-order, no doctor
        return f"Dr. {obj.doctor.get_full_name()}" if obj.doctor.get_full_name() else obj.doctor.email
    
    def get_patient_name(self, obj):
        return obj.patient.get_full_name() or obj.patient.email
    
    def get_patient_email(self, obj):
        return obj.patient.email
    
    def get_laboratory_name(self, obj):
        try:
            return obj.laboratory.laboratory_profile.name
        except:
            return obj.laboratory.email
    
    def get_has_report(self, obj):
        return obj.reports.exists()
    
    def get_reports_count(self, obj):
        return obj.reports.count()


class TestOrderCreateSerializer(serializers.Serializer):
    patient_email = serializers.EmailField()
    laboratory_id = serializers.UUIDField()
    tests_requested = serializers.ListField(child=serializers.CharField())
    clinical_notes = serializers.CharField(required=False, allow_blank=True)
    diagnosis = serializers.CharField(required=False, allow_blank=True)
    urgency = serializers.ChoiceField(choices=['routine', 'urgent', 'stat'], default='routine')
    collection_type = serializers.ChoiceField(choices=['lab_visit', 'home_collection'], default='lab_visit')
    
    # Home collection fields (optional)
    address_line1 = serializers.CharField(required=False)
    address_line2 = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False)
    state = serializers.CharField(required=False)
    zip_code = serializers.CharField(required=False)
    landmark = serializers.CharField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False)
    alternate_phone = serializers.CharField(required=False, allow_blank=True)
    preferred_date = serializers.DateField(required=False)
    preferred_time_slot = serializers.ChoiceField(
        choices=['morning', 'afternoon', 'evening'], 
        required=False
    )
    patient_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if data.get('collection_type') == 'home_collection':
            required_fields = ['address_line1', 'city', 'state', 'zip_code', 'contact_phone', 'preferred_date', 'preferred_time_slot']
            for field in required_fields:
                if not data.get(field):
                    raise serializers.ValidationError({field: f'{field} is required for home collection'})
        return data


# ============================================
# CRITICAL VALUE ALERT SERIALIZERS
# ============================================

class CriticalValueAlertSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    severity_color = serializers.SerializerMethodField()
    
    class Meta:
        model = CriticalValueAlert
        fields = [
            'id', 'test_name', 'measured_value', 'unit', 'normal_range',
            'severity', 'severity_display', 'severity_color',
            'description', 'recommendation',
            'patient_notified', 'patient_notified_at',
            'doctor_notified', 'doctor_notified_at',
            'acknowledged_by_patient', 'acknowledged_by_doctor',
            'created_at'
        ]
    
    def get_severity_color(self, obj):
        colors = {
            'abnormal': 'yellow',
            'critical_low': 'orange',
            'critical_high': 'orange',
            'panic': 'red'
        }
        return colors.get(obj.severity, 'gray')


# ============================================
# LAB SEARCH SERIALIZER (for doctors)
# ============================================

class LaboratorySearchSerializer(serializers.Serializer):
    """Serializer for laboratory search results"""
    id = serializers.UUIDField()
    name = serializers.CharField()
    email = serializers.EmailField()
    address = serializers.CharField()
    city = serializers.CharField()
    state = serializers.CharField()
    phone = serializers.CharField()
    services = serializers.ListField()
    is_verified = serializers.BooleanField()
    offers_home_collection = serializers.BooleanField()
    test_count = serializers.IntegerField()
    rating = serializers.FloatField(required=False)