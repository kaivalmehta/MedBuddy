from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from users.models import User
from prescriptions.models import Prescription
import uuid

class Pharmacy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='pharmacy_profile')
    
    name = models.CharField(max_length=200)
    license_number = models.CharField(max_length=100, unique=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    website = models.URLField(blank=True)
    
    operating_hours = models.JSONField(default=dict)
    services = models.JSONField(default=list)
    
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pharmacies'
        verbose_name_plural = 'Pharmacies'


class PharmacyOrder(models.Model):
    STATUS_CHOICES = [
        ('received', 'Received'),
        ('verified', 'Verified'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready for Pickup'),
        ('out_for_delivery', 'Out for Delivery'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    FULFILLMENT_CHOICES = [('pickup', 'Pickup'), ('delivery', 'Delivery')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='orders')
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='orders')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pharmacy_orders')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='received')
    fulfillment_type = models.CharField(max_length=20, choices=FULFILLMENT_CHOICES, default='pickup')
    
    verified_by = models.CharField(max_length=100, blank=True)
    verification_notes = models.TextField(blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    estimated_ready_time = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    pharmacist_notes = models.TextField(blank=True)
    patient_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pharmacy_orders'
        ordering = ['-created_at']


class PharmacyInventory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='inventory')
    
    drug_name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    manufacturer = models.CharField(max_length=200, blank=True)
    
    quantity_in_stock = models.IntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True)
    
    last_restocked = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pharmacy_inventory'
        unique_together = ['pharmacy', 'drug_name', 'manufacturer']


class PharmacyReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pharmacy_reviews')
    order = models.ForeignKey(PharmacyOrder, on_delete=models.SET_NULL, null=True, blank=True)
    
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    review_text = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'pharmacy_reviews'
        unique_together = ['pharmacy', 'user', 'order']


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(PharmacyOrder, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']