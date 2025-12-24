# backend/users/urls.py
# Complete URL routes for user authentication and profiles

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # ============================================
    # REGISTRATION (2-Step with OTP)
    # ============================================
    path('register/', views.InitiateRegistrationView.as_view(), name='register_initiate'),
    path('register/verify/', views.VerifyRegistrationOTPView.as_view(), name='register_verify'),
    path('register/resend-otp/', views.ResendOTPView.as_view(), name='resend_otp'),
    
    # ============================================
    # LOGIN (2-Step with OTP)
    # ============================================
    path('login/', views.LoginStep1View.as_view(), name='login_step1'),
    path('login/verify/', views.LoginStep2View.as_view(), name='login_step2'),
    path('login/quick/', views.QuickLoginView.as_view(), name='login_quick'),
    
    # ============================================
    # LOGOUT & TOKEN
    # ============================================
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ============================================
    # PASSWORD RESET
    # ============================================
    path('password/reset/', views.RequestPasswordResetView.as_view(), name='password_reset_request'),
    path('password/reset/verify/', views.VerifyPasswordResetOTPView.as_view(), name='password_reset_verify'),
    path('password/reset/confirm/', views.ResetPasswordView.as_view(), name='password_reset_confirm'),
    path('password/change/', views.ChangePasswordView.as_view(), name='password_change'),
    
    # ============================================
    # EMAIL VERIFICATION (for authenticated users)
    # ============================================
    path('email/status/', views.CheckEmailVerificationView.as_view(), name='email_status'),
    path('email/request-verification/', views.RequestEmailVerificationView.as_view(), name='email_request_verification'),
    path('email/verify/', views.VerifyEmailView.as_view(), name='email_verify'),
    
    # ============================================
    # PROFILE
    # ============================================
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('health-profile/', views.HealthProfileView.as_view(), name='health_profile'),
    
    # ============================================
    # FAMILY MEMBERS
    # ============================================
    path('family-members/', views.FamilyMemberListCreateView.as_view(), name='family_members'),
    path('family-members/<uuid:pk>/', views.FamilyMemberDetailView.as_view(), name='family_member_detail'),
]
