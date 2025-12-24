# backend/users/views.py
# Complete user views with OTP verification, registration, login, and password reset

from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import (
    User, HealthProfile, FamilyMember, DoctorProfile, LaboratoryProfile,
    EmailVerificationOTP, PendingRegistration, PasswordResetToken
)
from .serializers import (
    UserSerializer, InitiateRegistrationSerializer, VerifyRegistrationOTPSerializer,
    ResendOTPSerializer, LoginStep1Serializer, LoginStep2Serializer, QuickLoginSerializer,
    RequestPasswordResetSerializer, VerifyPasswordResetOTPSerializer, ResetPasswordSerializer,
    ChangePasswordSerializer, HealthProfileSerializer, FamilyMemberSerializer
)
from prescriptions.email_service import EmailService
import logging

logger = logging.getLogger(__name__)


# ============================================
# REGISTRATION VIEWS (2-Step with OTP)
# ============================================

class InitiateRegistrationView(views.APIView):
    """
    Step 1: Initiate Registration
    - Validates registration data
    - Sends OTP to email for verification
    - Stores pending registration
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = InitiateRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        # Store pending registration data (with hashed password)
        registration_data = {
            'email': email,
            'username': serializer.validated_data['username'],
            'password': serializer.validated_data['password'],
            'first_name': serializer.validated_data.get('first_name', ''),
            'last_name': serializer.validated_data.get('last_name', ''),
            'role': serializer.validated_data.get('role', 'patient'),
            'phone': serializer.validated_data.get('phone', ''),
            'doctor_profile': serializer.validated_data.get('doctor_profile'),
            'laboratory_profile': serializer.validated_data.get('laboratory_profile'),
            'pharmacy_profile': serializer.validated_data.get('pharmacy_profile'),
        }
        
        # Create pending registration
        pending = PendingRegistration.create_pending(email, registration_data)
        
        # Create and send OTP
        otp = EmailVerificationOTP.create_otp(email, 'registration')
        
        # Send OTP email
        EmailService.send_registration_otp_email(email, otp.otp_code)
        
        return Response({
            'message': 'Verification code sent to your email',
            'email': email,
            'expires_in_minutes': 10
        }, status=status.HTTP_200_OK)


class VerifyRegistrationOTPView(views.APIView):
    """
    Step 2: Verify OTP and Complete Registration
    - Verifies OTP
    - Creates user account
    - Returns tokens
    """
    permission_classes = [AllowAny]
    
    @transaction.atomic
    def post(self, request):
        serializer = VerifyRegistrationOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']
        
        # Get pending registration
        try:
            pending = PendingRegistration.objects.get(email=email, is_verified=False)
        except PendingRegistration.DoesNotExist:
            return Response(
                {'error': 'No pending registration found. Please start registration again.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if pending.is_expired:
            pending.delete()
            return Response(
                {'error': 'Registration expired. Please start again.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify OTP
        otp = EmailVerificationOTP.objects.filter(
            email=email,
            purpose='registration',
            is_used=False,
            is_expired=False
        ).order_by('-created_at').first()
        
        if not otp:
            return Response(
                {'error': 'No OTP found. Please request a new one.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        success, message = otp.verify(otp_code)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user from pending registration
        data = pending.registration_data
        
        user = User.objects.create_user(
            email=data['email'],
            username=data['username'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            role=data.get('role', 'patient'),
            phone=data.get('phone', ''),
            is_email_verified=True,
            is_verified=True
        )
        
        # Create role-specific profiles
        self._create_role_profiles(user, data)
        
        # Mark pending as verified and delete
        pending.delete()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Registration successful',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_201_CREATED)
    
    def _create_role_profiles(self, user, data):
        """Create role-specific profiles based on user role"""
        if user.role == 'patient':
            HealthProfile.objects.create(user=user)
        
        elif user.role == 'doctor':
            doctor_data = data.get('doctor_profile', {}) or {}
            DoctorProfile.objects.create(
                user=user,
                full_name=f"{user.first_name} {user.last_name}".strip() or user.email,
                specialization=doctor_data.get('specialization', 'General Practice'),
                qualification=doctor_data.get('qualification', 'MBBS'),
                registration_number=doctor_data.get('registration_number', f'PENDING-{user.id}'),
                clinic_name=doctor_data.get('clinic_name', ''),
                clinic_address=doctor_data.get('clinic_address', ''),
                clinic_phone=doctor_data.get('clinic_phone', ''),
            )
        
        elif user.role == 'laboratory':
            lab_data = data.get('laboratory_profile', {}) or {}
            LaboratoryProfile.objects.create(
                user=user,
                name=lab_data.get('name', f"{user.first_name}'s Laboratory"),
                license_number=lab_data.get('license_number', f'PENDING-{user.id}'),
                address=lab_data.get('address', 'Please update'),
                city=lab_data.get('city', 'Please update'),
                state=lab_data.get('state', 'Please update'),
                zip_code=lab_data.get('zip_code', '00000'),
                phone=user.phone or '0000000000',
            )
        
        elif user.role == 'pharmacy':
            from pharmacy.models import Pharmacy
            pharmacy_data = data.get('pharmacy_profile', {}) or {}
            Pharmacy.objects.create(
                user=user,
                name=pharmacy_data.get('name', f"{user.first_name}'s Pharmacy"),
                license_number=pharmacy_data.get('license_number', f'PENDING-{user.id}'),
                address=pharmacy_data.get('address', 'Please update'),
                city=pharmacy_data.get('city', 'Please update'),
                state=pharmacy_data.get('state', 'Please update'),
                zip_code=pharmacy_data.get('zip_code', '00000'),
                phone=user.phone or '0000000000',
                email=user.email,
            )


class ResendOTPView(views.APIView):
    """Resend OTP for registration or login"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        purpose = serializer.validated_data['purpose']
        
        if purpose == 'registration':
            # Check pending registration exists
            if not PendingRegistration.objects.filter(email=email, is_verified=False).exists():
                return Response(
                    {'error': 'No pending registration found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif purpose == 'login':
            # Check user exists
            if not User.objects.filter(email=email, is_active=True).exists():
                return Response(
                    {'error': 'No account found with this email'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Create and send new OTP
        otp = EmailVerificationOTP.create_otp(email, purpose)
        
        if purpose == 'registration':
            EmailService.send_registration_otp_email(email, otp.otp_code)
        else:
            EmailService.send_login_otp_email(email, otp.otp_code)
        
        return Response({
            'message': 'New verification code sent',
            'email': email,
            'expires_in_minutes': 10
        })


# ============================================
# LOGIN VIEWS (2-Step with OTP)
# ============================================

class LoginStep1View(views.APIView):
    """
    Step 1: Validate credentials and send OTP
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginStep1Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Create and send OTP
        otp = EmailVerificationOTP.create_otp(user.email, 'login', user=user)
        EmailService.send_login_otp_email(user.email, otp.otp_code)
        
        return Response({
            'message': 'Verification code sent to your email',
            'email': user.email,
            'expires_in_minutes': 10,
            'requires_otp': True
        })


class LoginStep2View(views.APIView):
    """
    Step 2: Verify OTP and complete login
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginStep2Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']
        
        # Get user
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if user.is_suspended:
            return Response(
                {'error': f'Account suspended: {user.suspension_reason or "Contact support"}'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify OTP
        otp = EmailVerificationOTP.objects.filter(
            email=email,
            purpose='login',
            is_used=False,
            is_expired=False
        ).order_by('-created_at').first()
        
        if not otp:
            return Response(
                {'error': 'No OTP found. Please request a new one.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        success, message = otp.verify(otp_code)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark email as verified if not already
        if not user.is_email_verified:
            user.mark_email_verified()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        })


class QuickLoginView(views.APIView):
    """
    Quick login without OTP (for development or when OTP verification is disabled)
    Can be configured to require email verification
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = QuickLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        skip_otp = serializer.validated_data.get('skip_otp', False)
        
        # For users who haven't verified email, send OTP
        if not user.is_email_verified and not skip_otp:
            otp = EmailVerificationOTP.create_otp(user.email, 'login', user=user)
            EmailService.send_login_otp_email(user.email, otp.otp_code)
            return Response({
                'message': 'Please verify your email. OTP sent.',
                'email': user.email,
                'requires_otp': True,
                'expires_in_minutes': 10
            })
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        })


class LogoutView(views.APIView):
    """Logout and blacklist the refresh token"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Successfully logged out'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# PASSWORD RESET VIEWS
# ============================================

class RequestPasswordResetView(views.APIView):
    """Request password reset - sends OTP"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RequestPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            # Don't reveal if user exists or not
            return Response({
                'message': 'If an account exists with this email, you will receive a reset code.'
            })
        
        # Create reset token
        reset_token = PasswordResetToken.create_token(user)
        
        # Send email
        EmailService.send_password_reset_email(email, reset_token.otp_code)
        
        return Response({
            'message': 'If an account exists with this email, you will receive a reset code.',
            'expires_in_minutes': 30
        })


class VerifyPasswordResetOTPView(views.APIView):
    """Verify password reset OTP before allowing password change"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = VerifyPasswordResetOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']
        
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
        
        reset_token = PasswordResetToken.objects.filter(
            user=user,
            is_used=False,
            is_expired=False
        ).order_by('-created_at').first()
        
        if not reset_token:
            return Response(
                {'error': 'No reset request found. Please request a new one.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        success, message = reset_token.verify(otp_code)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': 'OTP verified. You can now reset your password.',
            'verified': True
        })


class ResetPasswordView(views.APIView):
    """Complete password reset with new password"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']
        new_password = serializer.validated_data['new_password']
        
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
        
        reset_token = PasswordResetToken.objects.filter(
            user=user,
            is_used=False,
            is_expired=False
        ).order_by('-created_at').first()
        
        if not reset_token:
            return Response(
                {'error': 'No reset request found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        success, message = reset_token.verify(otp_code)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        # Reset password
        user.set_password(new_password)
        user.save()
        
        # Mark token as used
        reset_token.mark_used()
        
        # Mark email as verified if not already
        if not user.is_email_verified:
            user.mark_email_verified()
        
        return Response({'message': 'Password reset successfully. You can now login.'})


class ChangePasswordView(views.APIView):
    """Change password for authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        
        # Verify current password
        if not user.check_password(serializer.validated_data['current_password']):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({'message': 'Password changed successfully'})


# ============================================
# PROFILE VIEWS
# ============================================

class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update current user profile"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class HealthProfileView(generics.RetrieveUpdateAPIView):
    """Get or update health profile"""
    serializer_class = HealthProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        profile, _ = HealthProfile.objects.get_or_create(user=self.request.user)
        return profile


class FamilyMemberListCreateView(generics.ListCreateAPIView):
    """List and create family members"""
    serializer_class = FamilyMemberSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return FamilyMember.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FamilyMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a family member"""
    serializer_class = FamilyMemberSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return FamilyMember.objects.filter(user=self.request.user)
    
    def perform_destroy(self, instance):
        # Soft delete
        instance.is_active = False
        instance.save()


# ============================================
# EMAIL VERIFICATION STATUS
# ============================================

class CheckEmailVerificationView(views.APIView):
    """Check if email is verified for current user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            'email': user.email,
            'is_email_verified': user.is_email_verified,
            'is_professional_verified': user.is_professional_verified,
            'is_fully_verified': user.is_fully_verified,
            'role': user.role
        })


class RequestEmailVerificationView(views.APIView):
    """Request email verification OTP for current user"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        if user.is_email_verified:
            return Response({'message': 'Email already verified'})
        
        otp = EmailVerificationOTP.create_otp(user.email, 'login', user=user)
        EmailService.send_login_otp_email(user.email, otp.otp_code)
        
        return Response({
            'message': 'Verification code sent',
            'email': user.email,
            'expires_in_minutes': 10
        })


class VerifyEmailView(views.APIView):
    """Verify email with OTP for current user"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        otp_code = request.data.get('otp_code')
        
        if not otp_code:
            return Response(
                {'error': 'OTP code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        otp = EmailVerificationOTP.objects.filter(
            email=user.email,
            user=user,
            is_used=False,
            is_expired=False
        ).order_by('-created_at').first()
        
        if not otp:
            return Response(
                {'error': 'No OTP found. Please request a new one.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        success, message = otp.verify(otp_code)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        user.mark_email_verified()
        
        return Response({
            'message': 'Email verified successfully',
            'is_email_verified': True
        })
