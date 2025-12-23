from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, HealthProfile, FamilyMember

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['email', 'username', 'role', 'is_verified', 'created_at']
    list_filter = ['role', 'is_verified', 'is_active']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-created_at']

@admin.register(HealthProfile)
class HealthProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'blood_type', 'updated_at']
    search_fields = ['user__email']

@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'relationship', 'is_active']
    list_filter = ['relationship', 'is_active']