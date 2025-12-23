from django.contrib import admin
from .models import Pharmacy, PharmacyOrder, PharmacyInventory, PharmacyReview

@admin.register(Pharmacy)
class PharmacyAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'city', 'is_verified', 'rating']
    list_filter = ['is_verified', 'is_active', 'city']
    search_fields = ['name', 'address']

@admin.register(PharmacyOrder)
class PharmacyOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'pharmacy', 'patient', 'status', 'created_at']
    list_filter = ['status', 'fulfillment_type']
    search_fields = ['patient__email', 'pharmacy__name']

@admin.register(PharmacyInventory)
class PharmacyInventoryAdmin(admin.ModelAdmin):
    list_display = ['drug_name', 'pharmacy', 'quantity_in_stock', 'unit_price', 'is_available']
    list_filter = ['is_available']
    search_fields = ['drug_name']

@admin.register(PharmacyReview)
class PharmacyReviewAdmin(admin.ModelAdmin):
    list_display = ['pharmacy', 'user', 'rating', 'created_at']
    list_filter = ['rating']