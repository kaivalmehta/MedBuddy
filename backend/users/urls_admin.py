# backend/users/urls_admin.py
# URL routes for admin functionality

from django.urls import path
from . import views_admin

urlpatterns = [
    # ============================================
    # DASHBOARD & ANALYTICS
    # ============================================
    path('dashboard/', views_admin.AdminDashboardView.as_view(), name='admin_dashboard'),
    path('analytics/', views_admin.AdminAnalyticsView.as_view(), name='admin_analytics'),
    
    # ============================================
    # USER MANAGEMENT
    # ============================================
    path('users/', views_admin.AdminUserListView.as_view(), name='admin_user_list'),
    path('users/search/', views_admin.SearchUsersView.as_view(), name='admin_search_users'),
    path('users/<uuid:pk>/', views_admin.AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('users/create-admin/', views_admin.CreateAdminUserView.as_view(), name='create_admin'),
    
    # ============================================
    # PROFESSIONAL VERIFICATION
    # ============================================
    path('verifications/pending/', views_admin.PendingVerificationsView.as_view(), name='pending_verifications'),
    path('verifications/rejected/', views_admin.RejectedListView.as_view(), name='rejected_verifications'),
    path('verifications/<uuid:user_id>/verify/', views_admin.VerifyProfessionalView.as_view(), name='verify_professional'),
    path('verifications/<uuid:user_id>/reconsider/', views_admin.ReconsiderRejectionView.as_view(), name='reconsider_rejection'),
    
    # ============================================
    # USER SUSPENSION
    # ============================================
    path('suspensions/', views_admin.SuspensionsListView.as_view(), name='suspensions_list'),
    path('users/<uuid:user_id>/suspend/', views_admin.SuspendUserView.as_view(), name='suspend_user'),
]
