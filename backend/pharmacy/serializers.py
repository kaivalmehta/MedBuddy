from rest_framework import serializers
from .models import Pharmacy, PharmacyOrder, PharmacyInventory, PharmacyReview, ChatMessage, PharmacySale
from prescriptions.serializers import PrescriptionDetailSerializer


class PharmacySerializer(serializers.ModelSerializer):
    distance_km = serializers.FloatField(read_only=True, required=False)
    
    class Meta:
        model = Pharmacy
        fields = ['id', 'name', 'license_number', 'address', 'city', 'state',
                  'zip_code', 'latitude', 'longitude', 'phone', 'email', 'website',
                  'operating_hours', 'services', 'is_verified', 'is_active',
                  'rating', 'total_reviews', 'distance_km', 'created_at']
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