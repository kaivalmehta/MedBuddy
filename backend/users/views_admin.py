# backend/users/views_admin.py
# Admin views for user management, verification, and analytics

from rest_framework import views, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.db.models import Count, Q
from django.utils import timezone
from datetime import date, timedelta

from .models import User, DoctorProfile, LaboratoryProfile
from .serializers import UserSerializer, AdminUserListSerializer, DoctorProfileSerializer, LaboratoryProfileSerializer
from prescriptions.models import Prescription, LabReport
from prescriptions.email_service import EmailService
import logging

logger = logging.getLogger(__name__)


class IsAdminUser(BasePermission):
    """Permission class for admin-only views"""
    message = "Admin access required."
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == 'admin' and 
            not request.user.is_suspended
        )


# ============================================
# ADMIN DASHBOARD
# ============================================

class AdminDashboardView(views.APIView):
    """Admin dashboard with platform statistics"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        today = date.today()
        last_30_days = today - timedelta(days=30)
        
        # User stats
        users = User.objects.all()
        
        user_stats = {
            'total_users': users.count(),
            'patients': users.filter(role='patient').count(),
            'doctors': users.filter(role='doctor').count(),
            'pharmacies': users.filter(role='pharmacy').count(),
            'laboratories': users.filter(role='laboratory').count(),
            'admins': users.filter(role='admin').count(),
            'new_users_today': users.filter(created_at__date=today).count(),
            'new_users_this_month': users.filter(created_at__gte=last_30_days).count(),
            'verified_emails': users.filter(is_email_verified=True).count(),
        }
        
        # Verification stats
        verification_stats = {
            'pending_doctor_verifications': users.filter(
                role='doctor', 
                is_email_verified=True, 
                is_professional_verified=False
            ).count(),
            'pending_pharmacy_verifications': users.filter(
                role='pharmacy', 
                is_email_verified=True, 
                is_professional_verified=False
            ).count(),
            'pending_lab_verifications': users.filter(
                role='laboratory', 
                is_email_verified=True, 
                is_professional_verified=False
            ).count(),
            'verified_professionals': users.filter(
                role__in=['doctor', 'pharmacy', 'laboratory'],
                is_professional_verified=True
            ).count(),
            'suspended_users': users.filter(is_suspended=True).count(),
        }
        
        # Prescription stats
        prescriptions = Prescription.objects.all()
        prescription_stats = {
            'total_prescriptions': prescriptions.count(),
            'prescriptions_today': prescriptions.filter(created_at__date=today).count(),
            'prescriptions_this_month': prescriptions.filter(created_at__gte=last_30_days).count(),
            'from_doctors': prescriptions.filter(source='doctor').count(),
            'from_pharmacies': prescriptions.filter(source='pharmacy').count(),
            'self_uploaded': prescriptions.filter(source='self').count(),
            'digital_prescriptions': prescriptions.filter(is_digital=True).count(),
        }
        
        # Lab report stats
        reports = LabReport.objects.all()
        report_stats = {
            'total_reports': reports.count(),
            'reports_today': reports.filter(created_at__date=today).count(),
            'reports_this_month': reports.filter(created_at__gte=last_30_days).count(),
        }
        
        return Response({
            'user_stats': user_stats,
            'verification_stats': verification_stats,
            'prescription_stats': prescription_stats,
            'report_stats': report_stats
        })


# ============================================
# USER MANAGEMENT
# ============================================

class AdminUserListView(generics.ListAPIView):
    """List all users with filtering"""
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        queryset = User.objects.all().order_by('-created_at')
        
        # Apply filters
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        email_verified = self.request.query_params.get('email_verified')
        if email_verified == 'true':
            queryset = queryset.filter(is_email_verified=True)
        elif email_verified == 'false':
            queryset = queryset.filter(is_email_verified=False)
        
        professional_verified = self.request.query_params.get('professional_verified')
        if professional_verified == 'true':
            queryset = queryset.filter(is_professional_verified=True)
        elif professional_verified == 'false':
            queryset = queryset.filter(
                role__in=['doctor', 'pharmacy', 'laboratory'],
                is_professional_verified=False
            )
        
        suspended = self.request.query_params.get('suspended')
        if suspended == 'true':
            queryset = queryset.filter(is_suspended=True)
        elif suspended == 'false':
            queryset = queryset.filter(is_suspended=False)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )
        
        return queryset


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """View and update user details"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = User.objects.all()
    
    def get_object(self):
        user = super().get_object()
        return user
    
    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        data = UserSerializer(user).data
        
        # Add role-specific profile
        if user.role == 'doctor':
            try:
                data['doctor_profile'] = DoctorProfileSerializer(user.doctor_profile).data
            except:
                pass
        elif user.role == 'laboratory':
            try:
                data['laboratory_profile'] = LaboratoryProfileSerializer(user.laboratory_profile).data
            except:
                pass
        elif user.role == 'pharmacy':
            try:
                from pharmacy.serializers import PharmacySerializer
                data['pharmacy_profile'] = PharmacySerializer(user.pharmacy_profile).data
            except:
                pass
        
        # Add stats
        data['stats'] = {
            'prescriptions_count': user.prescriptions.count() if user.role == 'patient' else Prescription.objects.filter(sent_by=user).count(),
            'lab_reports_count': user.lab_reports.count() if user.role == 'patient' else LabReport.objects.filter(sent_by=user).count(),
        }
        
        return Response(data)


# ============================================
# PROFESSIONAL VERIFICATION
# ============================================

class PendingVerificationsView(views.APIView):
    """List all pending professional verifications"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        role_filter = request.query_params.get('role')
        
        # Get pending verifications
        pending_users = User.objects.filter(
            is_email_verified=True,
            is_professional_verified=False,
            is_suspended=False,
            role__in=['doctor', 'pharmacy', 'laboratory']
        )
        
        if role_filter:
            pending_users = pending_users.filter(role=role_filter)
        
        results = []
        for user in pending_users.order_by('-created_at'):
            item = {
                'id': str(user.id),
                'email': user.email,
                'name': f"{user.first_name} {user.last_name}".strip() or user.email,
                'phone': user.phone,
                'role': user.role,
                'role_display': user.get_role_display(),
                'created_at': user.created_at,
                'profile': None
            }
            
            # Get role-specific profile
            if user.role == 'doctor':
                try:
                    profile = user.doctor_profile
                    item['profile'] = {
                        'full_name': profile.full_name,
                        'specialization': profile.specialization,
                        'qualification': profile.qualification,
                        'registration_number': profile.registration_number,
                        'clinic_name': profile.clinic_name,
                        'clinic_address': profile.clinic_address,
                        'clinic_phone': profile.clinic_phone,
                        'verification_document': profile.verification_document
                    }
                except:
                    pass
            elif user.role == 'laboratory':
                try:
                    profile = user.laboratory_profile
                    item['profile'] = {
                        'name': profile.name,
                        'license_number': profile.license_number,
                        'address': profile.address,
                        'city': profile.city,
                        'state': profile.state,
                        'phone': profile.phone,
                        'services': profile.services
                    }
                except:
                    pass
            elif user.role == 'pharmacy':
                try:
                    profile = user.pharmacy_profile
                    item['profile'] = {
                        'name': profile.name,
                        'license_number': profile.license_number,
                        'address': profile.address,
                        'city': profile.city,
                        'state': profile.state,
                        'phone': profile.phone
                    }
                except:
                    pass
            
            results.append(item)
        
        return Response({
            'count': len(results),
            'results': results
        })


class VerifyProfessionalView(views.APIView):
    """Approve or reject professional verification"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request, user_id):
        action = request.data.get('action')  # 'approve' or 'reject'
        notes = request.data.get('notes', '')
        
        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Invalid action. Use "approve" or "reject"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(pk=user_id, role__in=['doctor', 'pharmacy', 'laboratory'])
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        if action == 'approve':
            user.is_professional_verified = True
            user.professional_verified_at = timezone.now()
            user.verified_by = request.user
            user.verification_notes = notes
            user.save()
            
            # Also update the role-specific profile
            if user.role == 'doctor':
                try:
                    user.doctor_profile.is_verified = True
                    user.doctor_profile.save()
                except:
                    pass
            elif user.role == 'laboratory':
                try:
                    user.laboratory_profile.is_verified = True
                    user.laboratory_profile.save()
                except:
                    pass
            elif user.role == 'pharmacy':
                try:
                    user.pharmacy_profile.is_verified = True
                    user.pharmacy_profile.save()
                except:
                    pass
            
            # Send approval email
            EmailService.send_verification_approval_email(user.email, user.first_name, user.role)
            
            logger.info(f"Admin {request.user.email} approved {user.role} {user.email}")
            
            return Response({
                'message': f'{user.get_role_display()} verified successfully',
                'user_id': str(user.id)
            })
        
        else:  # reject
            user.verification_notes = f"Rejected: {notes}"
            user.save()
            
            # Send rejection email
            EmailService.send_verification_rejection_email(user.email, user.first_name, user.role, notes)
            
            logger.info(f"Admin {request.user.email} rejected {user.role} {user.email}")
            
            return Response({
                'message': f'{user.get_role_display()} verification rejected',
                'user_id': str(user.id)
            })


# ============================================
# USER SUSPENSION
# ============================================

class SuspendUserView(views.APIView):
    """Suspend or unsuspend a user"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request, user_id):
        action = request.data.get('action')  # 'suspend' or 'unsuspend'
        reason = request.data.get('reason', '')
        
        if action not in ['suspend', 'unsuspend']:
            return Response(
                {'error': 'Invalid action. Use "suspend" or "unsuspend"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        # Prevent self-suspension
        if user.id == request.user.id:
            return Response(
                {'error': 'Cannot suspend your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent suspending other admins
        if user.role == 'admin':
            return Response(
                {'error': 'Cannot suspend admin accounts'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action == 'suspend':
            if user.is_suspended:
                return Response({'error': 'User is already suspended'}, status=400)
            
            user.is_suspended = True
            user.suspension_reason = reason
            user.suspended_at = timezone.now()
            user.save()
            
            logger.info(f"Admin {request.user.email} suspended user {user.email}: {reason}")
            
            return Response({
                'message': f'User {user.email} has been suspended',
                'user_id': str(user.id)
            })
        
        else:  # unsuspend
            if not user.is_suspended:
                return Response({'error': 'User is not suspended'}, status=400)
            
            user.is_suspended = False
            user.suspension_reason = ''
            user.suspended_at = None
            user.save()
            
            logger.info(f"Admin {request.user.email} unsuspended user {user.email}")
            
            return Response({
                'message': f'User {user.email} has been unsuspended',
                'user_id': str(user.id)
            })


# ============================================
# CREATE ADMIN USER
# ============================================

class CreateAdminUserView(views.APIView):
    """Create a new admin user (super admin only)"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        # Only superusers can create new admins
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can create admin accounts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'User with this email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = User.objects.create_user(
            email=email,
            username=email.split('@')[0],
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='admin',
            is_email_verified=True,
            is_staff=True
        )
        
        return Response({
            'message': 'Admin user created successfully',
            'user': UserSerializer(user).data
        }, status=201)


# ============================================
# ANALYTICS
# ============================================

class AdminAnalyticsView(views.APIView):
    """Detailed analytics for admin"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        # Time period
        period = request.query_params.get('period', '30')  # days
        try:
            days = int(period)
        except:
            days = 30
        
        start_date = date.today() - timedelta(days=days)
        
        # User registration trend
        user_trend = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            count = User.objects.filter(created_at__date=day).count()
            user_trend.append({'date': day.isoformat(), 'count': count})
        
        # Prescription trend
        prescription_trend = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            count = Prescription.objects.filter(created_at__date=day).count()
            prescription_trend.append({'date': day.isoformat(), 'count': count})
        
        # User role distribution
        role_distribution = list(
            User.objects.values('role')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Prescription source distribution
        source_distribution = list(
            Prescription.objects.values('source')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Top active doctors
        top_doctors = list(
            Prescription.objects.filter(source='doctor', sent_by__isnull=False)
            .values('sent_by__email', 'sent_by__first_name', 'sent_by__last_name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        
        # Top active laboratories
        top_labs = list(
            LabReport.objects.filter(source='laboratory', sent_by__isnull=False)
            .values('sent_by__email')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        
        # Email verification stats
        email_stats = {
            'verified': User.objects.filter(is_email_verified=True).count(),
            'unverified': User.objects.filter(is_email_verified=False).count(),
        }
        
        return Response({
            'period_days': days,
            'user_registration_trend': user_trend,
            'prescription_trend': prescription_trend,
            'role_distribution': role_distribution,
            'source_distribution': source_distribution,
            'top_doctors': top_doctors,
            'top_laboratories': top_labs,
            'email_verification_stats': email_stats
        })
