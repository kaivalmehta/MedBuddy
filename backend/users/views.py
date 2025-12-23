# backend/users/views.py
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from .models import User, HealthProfile, FamilyMember
from .serializers import (UserSerializer, RegisterSerializer, LoginSerializer,
                          HealthProfileSerializer, FamilyMemberSerializer)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_201_CREATED)

class LoginView(views.APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        })

class LogoutView(views.APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Successfully logged out'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user

class HealthProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = HealthProfileSerializer
    
    def get_object(self):
        profile, _ = HealthProfile.objects.get_or_create(user=self.request.user)
        return profile

class FamilyMemberListCreateView(generics.ListCreateAPIView):
    serializer_class = FamilyMemberSerializer
    
    def get_queryset(self):
        return FamilyMember.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class FamilyMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FamilyMemberSerializer
    
    def get_queryset(self):
        return FamilyMember.objects.filter(user=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()