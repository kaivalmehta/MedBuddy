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
    verification_document = models.URLField(blank=True)  # License PDF URL
    is_active = models.BooleanField(default=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Location fields (add after existing fields)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    
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
    CATEGORY_CHOICES = [
        ('tablets', 'Tablets'),
        ('capsules', 'Capsules'),
        ('syrups', 'Syrups'),
        ('injections', 'Injections'),
        ('creams', 'Creams/Ointments'),
        ('drops', 'Drops'),
        ('inhalers', 'Inhalers'),
        ('patches', 'Patches'),
        ('powders', 'Powders'),
        ('solutions', 'Solutions'),
        ('suppositories', 'Suppositories'),
        ('devices', 'Medical Devices'),
        ('otc', 'OTC/General'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='inventory')
    
    # Basic Info
    drug_name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    manufacturer = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='tablets')
    
    # Dosage Info
    strength = models.CharField(max_length=100, blank=True)  # e.g., "500mg", "10ml"
    dosage_form = models.CharField(max_length=100, blank=True)  # e.g., "Tablet", "Syrup"
    
    # Stock Info
    quantity_in_stock = models.IntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_available = models.BooleanField(default=True)
    
    # Inventory Management
    sku = models.CharField(max_length=100, blank=True)  # Stock Keeping Unit
    batch_number = models.CharField(max_length=100, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    reorder_level = models.IntegerField(default=10)  # Alert when stock falls below this
    max_stock_level = models.IntegerField(default=100)
    
    # Supplier Info
    supplier_name = models.CharField(max_length=200, blank=True)
    supplier_contact = models.CharField(max_length=100, blank=True)
    
    # Prescription Requirements
    requires_prescription = models.BooleanField(default=True)
    is_controlled_substance = models.BooleanField(default=False)
    
    # Storage
    storage_instructions = models.TextField(blank=True)  # e.g., "Store below 25°C"
    
    # Timestamps
    last_restocked = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pharmacy_inventory'
        unique_together = ['pharmacy', 'drug_name', 'batch_number']
        ordering = ['drug_name']
    
    @property
    def is_low_stock(self):
        return self.quantity_in_stock <= self.reorder_level
    
    @property
    def is_expired(self):
        if not self.expiry_date:
            return False
        from datetime import date
        return self.expiry_date < date.today()
    
    @property
    def is_expiring_soon(self):
        if not self.expiry_date:
            return False
        from datetime import date, timedelta
        return self.expiry_date <= date.today() + timedelta(days=30)
    
    @property
    def stock_status(self):
        if self.quantity_in_stock == 0:
            return 'out_of_stock'
        if self.is_low_stock:
            return 'low_stock'
        return 'in_stock'
    
    @property
    def profit_margin(self):
        if self.cost_price and self.cost_price > 0:
            return round(((self.unit_price - self.cost_price) / self.cost_price) * 100, 2)
        return None


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


class PharmacySale(models.Model):
    """Track individual sales/dispenses"""
    SALE_TYPE_CHOICES = [
        ('prescription', 'Prescription'),
        ('otc', 'Over the Counter'),
        ('return', 'Return'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='sales')
    inventory_item = models.ForeignKey(PharmacyInventory, on_delete=models.SET_NULL, null=True, related_name='sales')
    prescription = models.ForeignKey(Prescription, on_delete=models.SET_NULL, null=True, blank=True, related_name='pharmacy_sales')
    
    # Item details (stored in case inventory item is deleted)
    drug_name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    
    # Sale details
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    profit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    sale_type = models.CharField(max_length=20, choices=SALE_TYPE_CHOICES, default='otc')
    
    # Customer info (optional)
    customer_name = models.CharField(max_length=200, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    
    notes = models.TextField(blank=True)
    sold_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='pharmacy_sales_made')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'pharmacy_sales'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        # Calculate total and profit
        self.total_price = self.quantity * self.unit_price
        if self.cost_price:
            self.profit = self.total_price - (self.quantity * self.cost_price)
        super().save(*args, **kwargs)