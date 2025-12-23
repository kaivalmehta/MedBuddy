# backend/users/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, HealthProfile, FamilyMember

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'role', 
                  'phone', 'preferred_language', 'is_verified', 'created_at']
        read_only_fields = ['id', 'is_verified', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 'first_name', 
                  'last_name', 'role', 'phone']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        HealthProfile.objects.create(user=user)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        user = authenticate(username=attrs['email'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled')
        attrs['user'] = user
        return attrs

class HealthProfileSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = HealthProfile
        fields = ['id', 'date_of_birth', 'age', 'gender', 'blood_type', 'weight_kg',
                  'height_cm', 'medical_conditions', 'allergies', 'current_medications',
                  'lifestyle_factors', 'emergency_contact_name', 'emergency_contact_phone',
                  'updated_at']
        read_only_fields = ['id', 'updated_at']
    
    def get_age(self, obj):
        if obj.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - obj.date_of_birth.year - (
                (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
            )
        return None

class FamilyMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMember
        fields = ['id', 'name', 'relationship', 'date_of_birth', 'gender', 
                  'blood_type', 'medical_conditions', 'allergies', 
                  'current_medications', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']