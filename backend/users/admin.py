from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, HealthProfile, FamilyMember, DoctorProfile, LaboratoryProfile
from pharmacy.models import Pharmacy

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['email', 'username', 'role', 'is_verified', 'is_professional_verified', 'is_rejected', 'is_suspended', 'created_at']
    list_filter = ['role', 'is_verified', 'is_professional_verified', 'is_rejected', 'is_active', 'is_suspended']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-created_at']
    actions = ['verify_professionals', 'unverify_professionals']
    
    # Add custom fields to the admin form
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Verification', {
            'fields': ('role', 'phone', 'is_verified', 'is_email_verified', 'is_professional_verified')
        }),
        ('Rejection', {
            'fields': ('is_rejected', 'rejection_reason', 'rejected_at')
        }),
        ('Suspension', {
            'fields': ('is_suspended', 'suspension_reason', 'suspended_at')
        }),
        ('Preferences', {
            'fields': ('receive_email_notifications',)
        }),
    )
    
    # Fields shown when creating a new user
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role & Verification', {
            'fields': ('role', 'is_professional_verified')
        }),
    )
    
    @admin.action(description='Verify selected professionals')
    def verify_professionals(self, request, queryset):
        # Update user's is_professional_verified
        count = queryset.filter(role__in=['doctor', 'pharmacy', 'laboratory']).update(
            is_professional_verified=True,
            is_verified=True,
            is_rejected=False,
            rejection_reason=''
        )
        # Also update their profile is_verified
        for user in queryset.filter(role__in=['doctor', 'pharmacy', 'laboratory']):
            if user.role == 'doctor':
                DoctorProfile.objects.filter(user=user).update(is_verified=True)
            elif user.role == 'pharmacy':
                Pharmacy.objects.filter(user=user).update(is_verified=True)
            elif user.role == 'laboratory':
                LaboratoryProfile.objects.filter(user=user).update(is_verified=True)
        self.message_user(request, f'{count} professional(s) verified successfully.')
    
    @admin.action(description='Unverify selected professionals')
    def unverify_professionals(self, request, queryset):
        count = queryset.filter(role__in=['doctor', 'pharmacy', 'laboratory']).update(
            is_professional_verified=False
        )
        for user in queryset.filter(role__in=['doctor', 'pharmacy', 'laboratory']):
            if user.role == 'doctor':
                DoctorProfile.objects.filter(user=user).update(is_verified=False)
            elif user.role == 'pharmacy':
                Pharmacy.objects.filter(user=user).update(is_verified=False)
            elif user.role == 'laboratory':
                LaboratoryProfile.objects.filter(user=user).update(is_verified=False)
        self.message_user(request, f'{count} professional(s) unverified.')

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
    list_display = ['user', 'full_name', 'specialization', 'registration_number', 'is_verified', 'user_verified']
    search_fields = ['user__email', 'full_name', 'registration_number']
    list_filter = ['specialization', 'is_verified']
    actions = ['verify_doctors', 'unverify_doctors']
    
    def user_verified(self, obj):
        return obj.user.is_professional_verified
    user_verified.boolean = True
    user_verified.short_description = 'User Prof. Verified'
    
    @admin.action(description='Verify selected doctors (both profile and user)')
    def verify_doctors(self, request, queryset):
        for profile in queryset:
            profile.is_verified = True
            profile.save()
            profile.user.is_professional_verified = True
            profile.user.is_verified = True
            profile.user.save()
        self.message_user(request, f'{queryset.count()} doctor(s) verified successfully.')
    
    @admin.action(description='Unverify selected doctors')
    def unverify_doctors(self, request, queryset):
        for profile in queryset:
            profile.is_verified = False
            profile.save()
            profile.user.is_professional_verified = False
            profile.user.save()
        self.message_user(request, f'{queryset.count()} doctor(s) unverified.')

@admin.register(LaboratoryProfile)
class LaboratoryProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'license_number', 'is_verified', 'user_verified']
    search_fields = ['user__email', 'name', 'license_number']
    list_filter = ['is_verified']
    actions = ['verify_labs', 'unverify_labs']
    
    def user_verified(self, obj):
        return obj.user.is_professional_verified
    user_verified.boolean = True
    user_verified.short_description = 'User Prof. Verified'
    
    @admin.action(description='Verify selected laboratories (both profile and user)')
    def verify_labs(self, request, queryset):
        for profile in queryset:
            profile.is_verified = True
            profile.save()
            profile.user.is_professional_verified = True
            profile.user.is_verified = True
            profile.user.save()
        self.message_user(request, f'{queryset.count()} laboratory(ies) verified successfully.')
    
    @admin.action(description='Unverify selected laboratories')
    def unverify_labs(self, request, queryset):
        for profile in queryset:
            profile.is_verified = False
            profile.save()
            profile.user.is_professional_verified = False
            profile.user.save()
        self.message_user(request, f'{queryset.count()} laboratory(ies) unverified.')