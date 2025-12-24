from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, HealthProfile, FamilyMember, DoctorProfile

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['email', 'username', 'role', 'is_verified', 'is_professional_verified', 'created_at']
    list_filter = ['role', 'is_verified', 'is_professional_verified', 'is_active']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Verification', {
            'fields': ('role', 'phone', 'is_verified', 'is_email_verified', 'is_professional_verified')
        }),
        ('Suspension', {
            'fields': ('is_suspended', 'suspension_reason', 'suspended_at')
        }),
    )

@admin.register(HealthProfile)
class HealthProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'blood_type', 'updated_at']
    search_fields = ['user__email']

@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'relationship', 'is_active']
    list_filter = ['relationship', 'is_active']

@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'full_name', 'specialization', 'is_verified']
    list_filter = ['is_verified', 'specialization']
    search_fields = ['user__email', 'full_name']