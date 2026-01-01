from rest_framework import serializers
from .models import Pharmacy, PharmacyOrder, PharmacyInventory, PharmacyReview, ChatMessage, PharmacySale, PrescriptionOrder
from prescriptions.serializers import PrescriptionDetailSerializer


class PharmacySerializer(serializers.ModelSerializer):
    distance_km = serializers.FloatField(read_only=True, required=False)
    
    class Meta:
        model = Pharmacy
        fields = ['id', 'name', 'license_number', 'address', 'city', 'state',
                  'zip_code', 'latitude', 'longitude', 'phone', 'email', 'website',
                  'operating_hours', 'services', 'is_verified', 'is_active',
                  'rating', 'total_reviews', 'distance_km','latitude', 'longitude', 'created_at']
        read_only_fields = ['id', 'is_verified', 'rating', 'total_reviews']


class PharmacyOrderSerializer(serializers.ModelSerializer):
    prescription = PrescriptionDetailSerializer(read_only=True)
    pharmacy_name = serializers.CharField(source='pharmacy.name', read_only=True)
    patient_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PharmacyOrder
        fields = ['id', 'prescription', 'pharmacy', 'pharmacy_name', 'patient',
                  'patient_name', 'status', 'status_display', 'fulfillment_type',
                  'verified_by', 'verification_notes', 'verified_at', 'subtotal',
                  'discount', 'total_price', 'estimated_ready_time', 'completed_at',
                  'pharmacist_notes', 'patient_notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'prescription', 'pharmacy', 'patient', 'created_at']
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip() or obj.patient.email


class PharmacyOrderCreateSerializer(serializers.Serializer):
    pharmacy_id = serializers.UUIDField()
    fulfillment_type = serializers.ChoiceField(choices=['pickup', 'delivery'])
    patient_notes = serializers.CharField(required=False, allow_blank=True)


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['received', 'verified', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'])
    pharmacist_notes = serializers.CharField(required=False, allow_blank=True)
    estimated_ready_time = serializers.DateTimeField(required=False)


class PharmacyInventorySerializer(serializers.ModelSerializer):
    is_low_stock = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    is_expiring_soon = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()
    
    class Meta:
        model = PharmacyInventory
        fields = [
            'id', 'drug_name', 'generic_name', 'manufacturer', 'category',
            'strength', 'dosage_form', 'quantity_in_stock', 'unit_price', 
            'cost_price', 'is_available', 'sku', 'batch_number', 'expiry_date',
            'reorder_level', 'max_stock_level', 'supplier_name', 'supplier_contact',
            'requires_prescription', 'is_controlled_substance', 'storage_instructions',
            'last_restocked', 'created_at', 'updated_at',
            # Computed fields
            'is_low_stock', 'is_expired', 'is_expiring_soon', 'stock_status', 'profit_margin'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_low_stock', 'is_expired', 'is_expiring_soon', 'stock_status', 'profit_margin']


class InventoryBulkCreateSerializer(serializers.Serializer):
    """For CSV/bulk import"""
    items = PharmacyInventorySerializer(many=True)


class PharmacyReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PharmacyReview
        fields = ['id', 'pharmacy', 'user', 'user_name', 'order', 'rating', 'review_text', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name[0]}." if obj.user.last_name else obj.user.first_name


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'order', 'sender', 'sender_name', 'sender_role', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']
    
    def get_sender_name(self, obj):
        if obj.sender.role == 'pharmacy':
            return obj.sender.pharmacy_profile.name
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip()


class PharmacySaleSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source='inventory_item.drug_name', read_only=True)
    
    class Meta:
        model = PharmacySale
        fields = [
            'id', 'inventory_item', 'inventory_item_name', 'prescription',
            'drug_name', 'generic_name', 'quantity', 'unit_price', 
            'total_price', 'cost_price', 'profit', 'sale_type',
            'customer_name', 'customer_phone', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'total_price', 'profit', 'created_at']


class DispenseItemSerializer(serializers.Serializer):
    """For dispensing/selling inventory items"""
    inventory_item_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
    sale_type = serializers.ChoiceField(choices=['prescription', 'otc', 'return'], default='otc')
    customer_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    customer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    prescription_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


# ========================================
# PRESCRIPTION ORDER SERIALIZERS
# ========================================

class PrescriptionOrderSerializer(serializers.ModelSerializer):
    """Full serializer for prescription orders"""
    prescription = PrescriptionDetailSerializer(read_only=True)
    pharmacy_name = serializers.CharField(source='pharmacy.name', read_only=True)
    pharmacy_address = serializers.CharField(source='pharmacy.address', read_only=True)
    pharmacy_phone = serializers.CharField(source='pharmacy.phone', read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    selected_medications = serializers.JSONField(read_only=True)  # Explicit JSONField
    quote_details = serializers.JSONField(read_only=True)  # Explicit JSONField
    
    class Meta:
        model = PrescriptionOrder
        fields = [
            'id', 'order_number', 'prescription', 'pharmacy', 'pharmacy_name',
            'pharmacy_address', 'pharmacy_phone', 'patient', 'patient_name',
            'patient_email', 'selected_medications', 'status', 'status_display',
            'quoted_amount', 'quote_details', 'quote_valid_until',
            'patient_notes', 'pharmacy_notes', 'estimated_ready_time',
            'created_at', 'updated_at', 'quoted_at', 'accepted_at',
            'ready_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'prescription', 'patient', 'created_at',
            'updated_at', 'quoted_at', 'accepted_at', 'ready_at', 'completed_at'
        ]
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip() or obj.patient.email


class PrescriptionOrderCreateSerializer(serializers.Serializer):
    """Create a prescription order"""
    prescription_id = serializers.UUIDField()
    pharmacy_id = serializers.UUIDField()
    selected_medications = serializers.ListField(
        child=serializers.DictField(),  # [{name, dosage, quantity}]
        required=True
    )
    patient_notes = serializers.CharField(required=False, allow_blank=True)


class PrescriptionOrderQuoteSerializer(serializers.Serializer):
    """Pharmacy provides a quote for the order"""
    quoted_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    quote_details = serializers.DictField(required=False)  # Breakdown of costs
    pharmacy_notes = serializers.CharField(required=False, allow_blank=True)
    estimated_ready_time = serializers.DateTimeField(required=False)


class PrescriptionOrderStatusUpdateSerializer(serializers.Serializer):
    """Update prescription order status"""
    status = serializers.ChoiceField(choices=[
        'preparing', 'ready_for_pickup', 'completed', 'cancelled', 'rejected'
    ])
    pharmacy_notes = serializers.CharField(required=False, allow_blank=True)
    estimated_ready_time = serializers.DateTimeField(required=False)


class PrescriptionOrderListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing orders"""
    pharmacy_name = serializers.CharField(source='pharmacy.name', read_only=True)
    pharmacy_address = serializers.CharField(source='pharmacy.address', read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_phone = serializers.SerializerMethodField()
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    medication_count = serializers.SerializerMethodField()
    prescription_title = serializers.SerializerMethodField()
    selected_medications = serializers.SerializerMethodField()  # Use method for proper JSON handling
    quote_details = serializers.SerializerMethodField()  # Use method for proper JSON handling
    
    class Meta:
        model = PrescriptionOrder
        fields = [
            'id', 'order_number', 'pharmacy_name', 'pharmacy_address', 'patient_name',
            'patient_email', 'patient_phone', 'status', 'status_display', 'quoted_amount', 
            'quote_details', 'medication_count', 'selected_medications', 'patient_notes', 
            'pharmacy_notes', 'prescription_title', 'created_at', 'updated_at'
        ]
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}".strip() or obj.patient.email
    
    def get_patient_phone(self, obj):
        return getattr(obj.patient, 'phone_number', None) or getattr(obj.patient, 'phone', None)
    
    def get_medication_count(self, obj):
        meds = obj.selected_medications
        if isinstance(meds, str):
            import json
            try:
                meds = json.loads(meds)
            except:
                return 0
        return len(meds) if meds else 0
    
    def get_selected_medications(self, obj):
        """Ensure selected_medications is always returned as a list"""
        meds = obj.selected_medications
        if meds is None:
            return []
        if isinstance(meds, str):
            import json
            try:
                return json.loads(meds)
            except:
                return []
        return meds if isinstance(meds, list) else []
    
    def get_quote_details(self, obj):
        """Ensure quote_details is always returned as a dict"""
        details = obj.quote_details
        if details is None:
            return None
        if isinstance(details, str):
            import json
            try:
                return json.loads(details)
            except:
                return None
        return details
    
    def get_prescription_title(self, obj):
        if obj.prescription and hasattr(obj.prescription, 'medications') and obj.prescription.medications:
            meds = obj.prescription.medications
            if isinstance(meds, list) and len(meds) > 0:
                first_med = meds[0].get('name', 'Prescription') if isinstance(meds[0], dict) else str(meds[0])
                if len(meds) > 1:
                    return f"{first_med} + {len(meds) - 1} more"
                return first_med
        return f"Order {obj.order_number}"