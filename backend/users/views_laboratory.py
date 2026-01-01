# backend/users/views_laboratory.py
# Views for Test Orders, Home Collection, and Critical Alerts

from rest_framework import views, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db import transaction, models
from django.db.models import Q, Count, Avg
from datetime import date, timedelta
import logging

from .models import User, LaboratoryProfile, DoctorProfile, HealthProfile, PatientAccessToken
from prescriptions.models import (
    TestCatalog, TestOrder, HomeSampleCollection, 
    CriticalValueAlert, LabReport
)
from prescriptions.serializers import (
    TestCatalogSerializer, TestCatalogCreateSerializer,
    TestOrderSerializer, TestOrderCreateSerializer,
    HomeSampleCollectionSerializer, HomeSampleCollectionCreateSerializer,
    CriticalValueAlertSerializer, LaboratorySearchSerializer
)
from prescriptions.email_service import EmailService
from prescriptions.services import AzureServices

logger = logging.getLogger(__name__)


# ============================================
# PERMISSION CLASSES
# ============================================

class IsDoctorUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'doctor'


class IsVerifiedDoctor(BasePermission):
    message = "Your doctor account needs to be verified."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'doctor':
            return False
        return request.user.is_professional_verified


class IsLaboratoryUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'laboratory'


class IsVerifiedLaboratory(BasePermission):
    message = "Your laboratory account needs to be verified."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'laboratory':
            return False
        return request.user.is_professional_verified


class IsPatientUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'patient'


# ============================================
# LABORATORY SEARCH (For Doctors)
# ============================================

class LaboratorySearchView(views.APIView):
    """Search for laboratories by location, services, or name"""
    permission_classes = [IsAuthenticated]  # Allow any authenticated user (doctors and patients)
    
    def get(self, request):
        query = request.query_params.get('q', '').strip()
        city = request.query_params.get('city', '').strip()
        service = request.query_params.get('service', '').strip()
        home_collection = request.query_params.get('home_collection', '').lower() == 'true'
        
        # Get verified laboratories
        labs = LaboratoryProfile.objects.filter(
            is_verified=True,
            user__is_professional_verified=True,
            user__is_suspended=False
        ).select_related('user')
        
        # Apply filters
        if query:
            labs = labs.filter(
                Q(name__icontains=query) |
                Q(address__icontains=query)
            )
        
        if city:
            labs = labs.filter(city__icontains=city)
        
        if service:
            labs = labs.filter(services__contains=[service])
        
        # Filter by home collection if requested
        if home_collection:
            labs = labs.filter(offers_home_collection=True)
        
        # Build results
        results = []
        for lab in labs[:50]:
            test_count = TestCatalog.objects.filter(
                laboratory=lab.user,
                is_active=True
            ).count()
            
            results.append({
                'id': str(lab.user.id),
                'name': lab.name,
                'email': lab.user.email,
                'address': lab.address,
                'city': lab.city,
                'state': lab.state,
                'phone': lab.phone,
                'services': lab.services or [],
                'is_verified': lab.is_verified,
                'offers_home_collection': lab.offers_home_collection,
                'test_count': test_count,
            })
        
        return Response(results)


class LaboratoryDetailView(views.APIView):
    """Get laboratory details with test catalog"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, lab_id):
        try:
            lab_user = User.objects.get(id=lab_id, role='laboratory')
            lab_profile = LaboratoryProfile.objects.get(user=lab_user)
        except (User.DoesNotExist, LaboratoryProfile.DoesNotExist):
            return Response({'error': 'Laboratory not found'}, status=404)
        
        # Get test catalog
        tests = TestCatalog.objects.filter(
            laboratory=lab_user,
            is_active=True
        ).order_by('category', 'test_name')
        
        # Group by category
        categories = {}
        for test in tests:
            cat = test.get_category_display()
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(TestCatalogSerializer(test).data)
        
        return Response({
            'id': str(lab_user.id),
            'name': lab_profile.name,
            'email': lab_user.email,
            'phone': lab_profile.phone,
            'address': lab_profile.address,
            'city': lab_profile.city,
            'state': lab_profile.state,
            'zip_code': lab_profile.zip_code,
            'services': lab_profile.services or [],
            'operating_hours': lab_profile.operating_hours or {},
            'is_verified': lab_profile.is_verified,
            'offers_home_collection': lab_profile.offers_home_collection,
            'test_catalog': categories,
            'test_count': tests.count()
        })


# ============================================
# TEST CATALOG MANAGEMENT (For Labs)
# ============================================

class TestCatalogListView(views.APIView):
    """List and create tests in catalog"""
    permission_classes = [IsAuthenticated, IsLaboratoryUser]
    
    def get(self, request):
        tests = TestCatalog.objects.filter(
            laboratory=request.user
        ).order_by('category', 'test_name')
        
        return Response(TestCatalogSerializer(tests, many=True).data)
    
    def post(self, request):
        serializer = TestCatalogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        test = TestCatalog.objects.create(
            laboratory=request.user,
            **serializer.validated_data
        )
        
        return Response(TestCatalogSerializer(test).data, status=201)


class TestCatalogDetailView(views.APIView):
    """Update or delete a test from catalog"""
    permission_classes = [IsAuthenticated, IsLaboratoryUser]
    
    def get_object(self, test_id):
        try:
            return TestCatalog.objects.get(id=test_id, laboratory=self.request.user)
        except TestCatalog.DoesNotExist:
            return None
    
    def get(self, request, test_id):
        test = self.get_object(test_id)
        if not test:
            return Response({'error': 'Test not found'}, status=404)
        return Response(TestCatalogSerializer(test).data)
    
    def patch(self, request, test_id):
        test = self.get_object(test_id)
        if not test:
            return Response({'error': 'Test not found'}, status=404)
        
        serializer = TestCatalogCreateSerializer(test, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        for key, value in serializer.validated_data.items():
            setattr(test, key, value)
        test.save()
        
        return Response(TestCatalogSerializer(test).data)
    
    def delete(self, request, test_id):
        test = self.get_object(test_id)
        if not test:
            return Response({'error': 'Test not found'}, status=404)
        test.delete()
        return Response(status=204)


# ============================================
# TEST ORDER - DOCTOR VIEWS
# ============================================

class DoctorCreateTestOrderView(views.APIView):
    """Doctor creates a test order for patient"""
    permission_classes = [IsAuthenticated, IsVerifiedDoctor]
    
    @transaction.atomic
    def post(self, request):
        serializer = TestOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Get or create patient
        patient_email = data['patient_email'].lower()
        try:
            patient = User.objects.get(email=patient_email, role='patient')
        except User.DoesNotExist:
            return Response({
                'error': 'Patient not found',
                'patient_exists': False
            }, status=404)
        
        # Get laboratory
        try:
            laboratory = User.objects.get(
                id=data['laboratory_id'],
                role='laboratory',
                is_professional_verified=True
            )
        except User.DoesNotExist:
            return Response({'error': 'Laboratory not found or not verified'}, status=404)
        
        # Create test order
        order = TestOrder.objects.create(
            doctor=request.user,
            patient=patient,
            laboratory=laboratory,
            tests_requested=data['tests_requested'],
            clinical_notes=data.get('clinical_notes', ''),
            diagnosis=data.get('diagnosis', ''),
            urgency=data.get('urgency', 'routine'),
            collection_type=data.get('collection_type', 'lab_visit')
        )
        
        # Create home collection record if needed
        if data.get('collection_type') == 'home_collection':
            HomeSampleCollection.objects.create(
                test_order=order,
                address_line1=data['address_line1'],
                address_line2=data.get('address_line2', ''),
                city=data['city'],
                state=data['state'],
                zip_code=data['zip_code'],
                landmark=data.get('landmark', ''),
                contact_phone=data['contact_phone'],
                alternate_phone=data.get('alternate_phone', ''),
                preferred_date=data['preferred_date'],
                preferred_time_slot=data['preferred_time_slot'],
                patient_notes=data.get('patient_notes', '')
            )
        
        # Send notification to laboratory
        try:
            email_service = EmailService()
            email_service.send_email(
                to_email=laboratory.email,
                subject=f"New Test Order #{order.order_number} - {data.get('urgency', 'routine').upper()}",
                html_content=f"""
                <h2>New Test Order Received</h2>
                <p><strong>Order Number:</strong> {order.order_number}</p>
                <p><strong>Doctor:</strong> Dr. {request.user.get_full_name() or request.user.email}</p>
                <p><strong>Patient:</strong> {patient.get_full_name() or patient.email}</p>
                <p><strong>Tests:</strong> {', '.join(data['tests_requested'])}</p>
                <p><strong>Urgency:</strong> {data.get('urgency', 'routine').upper()}</p>
                <p><strong>Collection Type:</strong> {data.get('collection_type', 'lab_visit')}</p>
                {f"<p><strong>Clinical Notes:</strong> {data.get('clinical_notes')}</p>" if data.get('clinical_notes') else ""}
                <p>Please log in to your dashboard to accept or decline this order.</p>
                """
            )
        except Exception as e:
            logger.error(f"Failed to send order notification: {e}")
        
        # Notify patient
        try:
            email_service = EmailService()
            email_service.send_email(
                to_email=patient.email,
                subject=f"Lab Test Ordered by Dr. {request.user.get_full_name() or request.user.email}",
                html_content=f"""
                <h2>Lab Test Order Created</h2>
                <p>Your doctor has ordered lab tests for you.</p>
                <p><strong>Order Number:</strong> {order.order_number}</p>
                <p><strong>Tests:</strong> {', '.join(data['tests_requested'])}</p>
                <p><strong>Laboratory:</strong> {laboratory.laboratory_profile.name if hasattr(laboratory, 'laboratory_profile') else laboratory.email}</p>
                <p><strong>Collection Type:</strong> {'Home Sample Collection' if data.get('collection_type') == 'home_collection' else 'Visit Laboratory'}</p>
                <p>You can track the status of this order in your MedBuddy dashboard.</p>
                """
            )
        except Exception as e:
            logger.error(f"Failed to send patient notification: {e}")
        
        return Response({
            'message': 'Test order created successfully',
            'order': TestOrderSerializer(order).data
        }, status=201)


class DoctorTestOrdersView(views.APIView):
    """List test orders created by doctor"""
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def get(self, request):
        status_filter = request.query_params.get('status')
        
        orders = TestOrder.objects.filter(
            doctor=request.user
        ).select_related('patient', 'laboratory').prefetch_related('home_collection')
        
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        orders = orders.order_by('-created_at')[:100]
        
        return Response(TestOrderSerializer(orders, many=True).data)


class DoctorTestOrderDetailView(views.APIView):
    """Get details of a test order"""
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def get(self, request, order_id):
        try:
            order = TestOrder.objects.select_related(
                'patient', 'laboratory'
            ).prefetch_related('home_collection', 'reports').get(
                id=order_id,
                doctor=request.user
            )
        except TestOrder.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)
        
        data = TestOrderSerializer(order).data
        
        # Include reports if completed
        if order.status == 'completed':
            from prescriptions.models import LabReport
            reports = order.reports.all()
            data['reports'] = [{
                'id': str(r.id),
                'report_title': r.report_title,
                'report_type': r.report_type,
                'file_url': r.file_url,
                'has_critical_values': r.has_critical_values,
                'created_at': r.created_at.isoformat()
            } for r in reports]
        
        return Response(data)


# ============================================
# TEST ORDER - LABORATORY VIEWS
# ============================================

class LabTestOrdersView(views.APIView):
    """List test orders for laboratory"""
    permission_classes = [IsAuthenticated, IsLaboratoryUser]
    
    def get(self, request):
        status_filter = request.query_params.get('status')
        
        orders = TestOrder.objects.filter(
            laboratory=request.user
        ).select_related('doctor', 'patient').prefetch_related('home_collection')
        
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        orders = orders.order_by('-created_at')[:100]
        
        return Response(TestOrderSerializer(orders, many=True).data)


class LabTestOrderDetailView(views.APIView):
    """Get, accept, or decline a test order"""
    permission_classes = [IsAuthenticated, IsVerifiedLaboratory]
    
    def get(self, request, order_id):
        try:
            order = TestOrder.objects.select_related(
                'doctor', 'patient'
            ).prefetch_related('home_collection').get(
                id=order_id,
                laboratory=request.user
            )
        except TestOrder.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)
        
        data = TestOrderSerializer(order).data
        
        # Get patient health profile
        try:
            hp = HealthProfile.objects.get(user=order.patient)
            data['patient_health_profile'] = {
                'blood_type': hp.blood_type,
                'allergies': hp.allergies or [],
                'medical_conditions': hp.medical_conditions or [],
                'current_medications': hp.current_medications or [],
            }
        except HealthProfile.DoesNotExist:
            data['patient_health_profile'] = None
        
        return Response(data)
    
    def post(self, request, order_id):
        """Accept or decline order"""
        action = request.data.get('action')  # 'accept' or 'decline'
        
        try:
            order = TestOrder.objects.get(
                id=order_id,
                laboratory=request.user,
                status='pending'
            )
        except TestOrder.DoesNotExist:
            return Response({'error': 'Order not found or not pending'}, status=404)
        
        if action == 'accept':
            order.status = 'accepted'
            order.accepted_at = timezone.now()
            order.estimated_cost = request.data.get('estimated_cost')
            order.lab_notes = request.data.get('lab_notes', '')
            order.save()
            
            # If home collection, confirm the schedule
            if order.collection_type == 'home_collection' and hasattr(order, 'home_collection'):
                hc = order.home_collection
                hc.status = 'confirmed'
                hc.confirmed_date = request.data.get('confirmed_date', hc.preferred_date)
                confirmed_time = request.data.get('confirmed_time')
                if confirmed_time:
                    from datetime import datetime
                    hc.confirmed_time = datetime.strptime(confirmed_time, '%H:%M').time()
                hc.collection_charge = request.data.get('collection_charge', 0)
                hc.save()
            
            # Notify doctor and patient
            self._send_acceptance_notification(order)
            
            return Response({
                'message': 'Order accepted',
                'order': TestOrderSerializer(order).data
            })
        
        elif action == 'decline':
            order.status = 'declined'
            order.declined_at = timezone.now()
            order.decline_reason = request.data.get('decline_reason', '')
            order.save()
            
            # Notify doctor
            self._send_decline_notification(order)
            
            return Response({
                'message': 'Order declined',
                'order': TestOrderSerializer(order).data
            })
        
        return Response({'error': 'Invalid action'}, status=400)
    
    def _send_acceptance_notification(self, order):
        try:
            email_service = EmailService()
            
            lab_name = order.laboratory.laboratory_profile.name if hasattr(order.laboratory, 'laboratory_profile') else order.laboratory.email
            
            # Notify patient
            email_service.send_email(
                to_email=order.patient.email,
                subject=f"Test Order #{order.order_number} Accepted",
                html_content=f"""
                <h2>Your Test Order Has Been Accepted</h2>
                <p><strong>Order Number:</strong> {order.order_number}</p>
                <p><strong>Laboratory:</strong> {lab_name}</p>
                <p><strong>Tests:</strong> {', '.join(order.tests_requested)}</p>
                {f"<p><strong>Estimated Cost:</strong> ${order.estimated_cost}</p>" if order.estimated_cost else ""}
                {"<p><strong>Home Collection:</strong> Confirmed. The lab will contact you with collector details.</p>" if order.collection_type == 'home_collection' else "<p>Please visit the laboratory at your earliest convenience.</p>"}
                """
            )
            
            # Notify doctor (only if order was created by a doctor)
            if order.doctor:
                email_service.send_email(
                    to_email=order.doctor.email,
                    subject=f"Test Order #{order.order_number} Accepted by Lab",
                    html_content=f"""
                    <h2>Test Order Accepted</h2>
                    <p>Your test order has been accepted by {lab_name}.</p>
                    <p><strong>Order Number:</strong> {order.order_number}</p>
                    <p><strong>Patient:</strong> {order.patient.get_full_name() or order.patient.email}</p>
                    """
                )
        except Exception as e:
            logger.error(f"Failed to send acceptance notification: {e}")
    
    def _send_decline_notification(self, order):
        try:
            email_service = EmailService()
            
            # Notify patient
            email_service.send_email(
                to_email=order.patient.email,
                subject=f"Test Order #{order.order_number} Declined",
                html_content=f"""
                <h2>Your Test Order Has Been Declined</h2>
                <p>Unfortunately, the laboratory was unable to accept your test order.</p>
                <p><strong>Order Number:</strong> {order.order_number}</p>
                {f"<p><strong>Reason:</strong> {order.decline_reason}</p>" if order.decline_reason else ""}
                <p>Please try another laboratory for your tests.</p>
                """
            )
            
            # Notify doctor (only if order was created by a doctor)
            if order.doctor:
                email_service.send_email(
                    to_email=order.doctor.email,
                    subject=f"Test Order #{order.order_number} Declined",
                    html_content=f"""
                    <h2>Test Order Declined</h2>
                    <p>Your test order has been declined by the laboratory.</p>
                    <p><strong>Order Number:</strong> {order.order_number}</p>
                    <p><strong>Patient:</strong> {order.patient.get_full_name() or order.patient.email}</p>
                    {f"<p><strong>Reason:</strong> {order.decline_reason}</p>" if order.decline_reason else ""}
                    <p>Please select another laboratory for this patient.</p>
                    """
                )
        except Exception as e:
            logger.error(f"Failed to send decline notification: {e}")


class LabUpdateOrderStatusView(views.APIView):
    """Update order status (sample collected, processing, completed)"""
    permission_classes = [IsAuthenticated, IsVerifiedLaboratory]
    
    def post(self, request, order_id):
        new_status = request.data.get('status')
        valid_statuses = ['sample_collected', 'processing', 'completed']
        
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Must be one of: {valid_statuses}'}, status=400)
        
        try:
            order = TestOrder.objects.get(
                id=order_id,
                laboratory=request.user
            )
        except TestOrder.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)
        
        # Validate status transitions
        if new_status == 'sample_collected' and order.status not in ['accepted', 'sample_collected']:
            return Response({'error': 'Order must be accepted first'}, status=400)
        
        if new_status == 'processing' and order.status not in ['sample_collected', 'processing']:
            return Response({'error': 'Sample must be collected first'}, status=400)
        
        if new_status == 'completed' and order.status not in ['processing', 'completed']:
            return Response({'error': 'Order must be processing first'}, status=400)
        
        order.status = new_status
        
        if new_status == 'sample_collected':
            # Update home collection status if applicable
            if hasattr(order, 'home_collection'):
                order.home_collection.status = 'collected'
                order.home_collection.collected_at = timezone.now()
                order.home_collection.save()
        
        elif new_status == 'completed':
            order.completed_at = timezone.now()
            order.final_cost = request.data.get('final_cost', order.estimated_cost)
        
        order.save()
        
        return Response({
            'message': f'Order status updated to {new_status}',
            'order': TestOrderSerializer(order).data
        })


# ============================================
# HOME SAMPLE COLLECTION MANAGEMENT
# ============================================

class LabHomeCollectionsView(views.APIView):
    """List home collections for laboratory"""
    permission_classes = [IsAuthenticated, IsLaboratoryUser]
    
    def get(self, request):
        status_filter = request.query_params.get('status')
        date_filter = request.query_params.get('date')
        
        collections = HomeSampleCollection.objects.filter(
            test_order__laboratory=request.user
        ).select_related('test_order', 'test_order__patient')
        
        if status_filter:
            collections = collections.filter(status=status_filter)
        
        if date_filter:
            collections = collections.filter(preferred_date=date_filter)
        
        collections = collections.order_by('preferred_date', 'preferred_time_slot')[:100]
        
        results = []
        for hc in collections:
            data = HomeSampleCollectionSerializer(hc).data
            data['order_number'] = hc.test_order.order_number
            data['patient_name'] = hc.test_order.patient.get_full_name() or hc.test_order.patient.email
            data['patient_email'] = hc.test_order.patient.email
            data['tests'] = hc.test_order.tests_requested
            results.append(data)
        
        return Response(results)


class LabHomeCollectionDetailView(views.APIView):
    """Update home collection details"""
    permission_classes = [IsAuthenticated, IsVerifiedLaboratory]
    
    def patch(self, request, collection_id):
        try:
            collection = HomeSampleCollection.objects.get(
                id=collection_id,
                test_order__laboratory=request.user
            )
        except HomeSampleCollection.DoesNotExist:
            return Response({'error': 'Collection not found'}, status=404)
        
        # Updateable fields
        updateable = [
            'confirmed_date', 'confirmed_time', 'collector_name', 
            'collector_phone', 'status', 'lab_notes', 'collection_charge'
        ]
        
        for field in updateable:
            if field in request.data:
                value = request.data[field]
                if field == 'confirmed_time' and value:
                    from datetime import datetime
                    value = datetime.strptime(value, '%H:%M').time()
                setattr(collection, field, value)
        
        collection.save()
        
        # Notify patient if collector assigned
        if 'collector_name' in request.data and collection.collector_name:
            try:
                email_service = EmailService()
                email_service.send_email(
                    to_email=collection.test_order.patient.email,
                    subject=f"Sample Collector Assigned - Order #{collection.test_order.order_number}",
                    html_content=f"""
                    <h2>Sample Collector Assigned</h2>
                    <p>A sample collector has been assigned for your home collection.</p>
                    <p><strong>Collector Name:</strong> {collection.collector_name}</p>
                    <p><strong>Collector Phone:</strong> {collection.collector_phone}</p>
                    <p><strong>Date:</strong> {collection.confirmed_date or collection.preferred_date}</p>
                    <p><strong>Time:</strong> {collection.confirmed_time or collection.get_preferred_time_slot_display()}</p>
                    <p>Please be available at the provided address during this time.</p>
                    """
                )
            except Exception as e:
                logger.error(f"Failed to send collector notification: {e}")
        
        data = HomeSampleCollectionSerializer(collection).data
        data['order_number'] = collection.test_order.order_number
        return Response(data)


# ============================================
# CRITICAL VALUE DETECTION & ALERTS
# ============================================

class CriticalValueAnalysisService:
    """Service to analyze lab reports for critical values"""
    
    # Common critical value ranges
    CRITICAL_RANGES = {
        'hemoglobin': {'unit': 'g/dL', 'low': 7.0, 'high': 20.0, 'critical_low': 5.0, 'critical_high': 22.0, 'normal_low': 12.0, 'normal_high': 17.5},
        'glucose': {'unit': 'mg/dL', 'low': 50, 'high': 400, 'critical_low': 40, 'critical_high': 500, 'normal_low': 70, 'normal_high': 100},
        'potassium': {'unit': 'mEq/L', 'low': 2.5, 'high': 6.5, 'critical_low': 2.0, 'critical_high': 7.0, 'normal_low': 3.5, 'normal_high': 5.0},
        'sodium': {'unit': 'mEq/L', 'low': 120, 'high': 160, 'critical_low': 115, 'critical_high': 165, 'normal_low': 136, 'normal_high': 145},
        'creatinine': {'unit': 'mg/dL', 'low': 0.5, 'high': 10.0, 'critical_low': 0.3, 'critical_high': 12.0, 'normal_low': 0.7, 'normal_high': 1.3},
        'platelet': {'unit': 'x10^3/µL', 'low': 50, 'high': 1000, 'critical_low': 20, 'critical_high': 1500, 'normal_low': 150, 'normal_high': 400},
        'wbc': {'unit': 'x10^3/µL', 'low': 2.0, 'high': 30.0, 'critical_low': 1.0, 'critical_high': 50.0, 'normal_low': 4.5, 'normal_high': 11.0},
        'inr': {'unit': '', 'low': 0.8, 'high': 4.5, 'critical_low': 0.5, 'critical_high': 6.0, 'normal_low': 0.9, 'normal_high': 1.1},
        'troponin': {'unit': 'ng/mL', 'low': 0, 'high': 0.4, 'critical_low': 0, 'critical_high': 0.5, 'normal_low': 0, 'normal_high': 0.04},
        'bilirubin': {'unit': 'mg/dL', 'low': 0.1, 'high': 12.0, 'critical_low': 0, 'critical_high': 15.0, 'normal_low': 0.1, 'normal_high': 1.2},
    }
    
    @classmethod
    def analyze_with_ai(cls, ocr_text, parsed_data):
        """Use Azure OpenAI to analyze report for critical values"""
        try:
            azure_services = AzureServices()
            
            # Use analyze_lab_report which we know works
            analysis = azure_services.analyze_lab_report(ocr_text, 'blood_test')
            
            # Convert abnormal_values format to our expected format
            critical_values = []
            abnormal = analysis.get('abnormal_values', [])
            
            for av in abnormal:
                # Map severity
                severity_map = {
                    'mild': 'abnormal',
                    'moderate': 'abnormal',
                    'significant': 'critical_high',
                    'critical': 'panic',
                    'low': 'critical_low',
                    'high': 'critical_high',
                }
                raw_severity = av.get('severity', 'abnormal').lower()
                severity = severity_map.get(raw_severity, 'abnormal')
                
                critical_values.append({
                    'test_name': av.get('test_name', 'Unknown'),
                    'measured_value': av.get('result', av.get('measured_value', '')),
                    'unit': av.get('unit', ''),
                    'normal_range': av.get('expected', av.get('normal_range', '')),
                    'severity': severity,
                    'description': av.get('meaning', av.get('description', '')),
                    'recommendation': av.get('recommendation', 'Consult your healthcare provider')
                })
            
            logger.info(f"AI analysis found {len(critical_values)} abnormal values")
            return critical_values
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    @classmethod
    def analyze_report(cls, lab_report):
        """Analyze a lab report for critical values"""
        critical_values = []
        
        # First try AI analysis
        if lab_report.ocr_raw_text or lab_report.parsed_data:
            ai_results = cls.analyze_with_ai(
                lab_report.ocr_raw_text or '',
                lab_report.parsed_data or {}
            )
            critical_values.extend(ai_results)
        
        # Also check parsed data against known ranges
        if lab_report.parsed_data:
            for key, value in lab_report.parsed_data.items():
                key_lower = key.lower().replace(' ', '_').replace('-', '_')
                
                for test_name, ranges in cls.CRITICAL_RANGES.items():
                    if test_name in key_lower:
                        try:
                            # Extract numeric value
                            import re
                            numeric = re.findall(r'[\d.]+', str(value))
                            if numeric:
                                val = float(numeric[0])
                                
                                severity = None
                                if val <= ranges['critical_low']:
                                    severity = 'panic' if val <= ranges['critical_low'] * 0.8 else 'critical_low'
                                elif val >= ranges['critical_high']:
                                    severity = 'panic' if val >= ranges['critical_high'] * 1.2 else 'critical_high'
                                elif val < ranges['normal_low'] or val > ranges['normal_high']:
                                    severity = 'abnormal'
                                
                                if severity:
                                    # Check if not already added by AI
                                    already_added = any(
                                        cv['test_name'].lower() == key.lower() 
                                        for cv in critical_values
                                    )
                                    if not already_added:
                                        critical_values.append({
                                            'test_name': key,
                                            'measured_value': str(value),
                                            'unit': ranges['unit'],
                                            'normal_range': f"{ranges['normal_low']}-{ranges['normal_high']} {ranges['unit']}",
                                            'severity': severity,
                                            'description': f"Value is {'below' if val < ranges['normal_low'] else 'above'} normal range",
                                            'recommendation': 'Consult with your healthcare provider'
                                        })
                        except (ValueError, TypeError):
                            pass
        
        return critical_values


class LabUploadReportWithAnalysisView(views.APIView):
    """Upload report with critical value analysis - supports multiple files"""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, IsVerifiedLaboratory]
    
    @transaction.atomic
    def post(self, request):
        from prescriptions.models import LabReportFile
        
        patient_email = request.data.get('patient_email')
        # Support both single file and multiple files
        files = request.FILES.getlist('report_files')  # New: multiple files
        single_file = request.FILES.get('report_file')  # Backward compatibility
        
        # Combine files - support both old and new format
        if single_file and not files:
            files = [single_file]
        
        report_type = request.data.get('report_type', 'other')
        report_title = request.data.get('report_title', 'Lab Report')
        report_date = request.data.get('report_date')
        referring_doctor = request.data.get('referring_doctor', '')
        notes = request.data.get('notes', '')
        test_order_id = request.data.get('test_order_id')
        send_email = request.data.get('send_email', 'true').lower() == 'true'
        
        if not patient_email:
            return Response({'error': 'Patient email is required'}, status=400)
        
        if not files:
            return Response({'error': 'At least one report file is required'}, status=400)
        
        # Validate all files
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        for file in files:
            if file.content_type not in allowed_types:
                return Response({'error': f'Invalid file type for {file.name}. Allowed: PDF, JPG, PNG'}, status=400)
            if file.size > 10 * 1024 * 1024:  # 10MB limit per file
                return Response({'error': f'File {file.name} exceeds 10MB limit'}, status=400)
        
        # Get patient
        try:
            patient = User.objects.get(email=patient_email.lower(), role='patient')
        except User.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=404)
        
        # Get test order if provided
        test_order = None
        if test_order_id:
            try:
                test_order = TestOrder.objects.get(
                    id=test_order_id,
                    laboratory=request.user,
                    patient=patient
                )
            except TestOrder.DoesNotExist:
                pass
        
        azure_services = AzureServices()
        
        # Get lab name
        try:
            lab_name = request.user.laboratory_profile.name
        except:
            lab_name = request.user.email
        
        # Upload first file for backward compatibility (primary file on LabReport)
        first_file = files[0]
        try:
            first_file.seek(0)
            blob_name, file_url = azure_services.upload_lab_report(
                first_file.read(),
                f"lab_{patient.id}_{timezone.now().timestamp()}.{first_file.name.split('.')[-1]}"
            )
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            return Response({'error': 'Failed to upload file'}, status=500)
        
        # Create report with first file info (backward compatible)
        report = LabReport.objects.create(
            user=patient,
            source='laboratory',
            sent_by=request.user,
            report_type=report_type,
            report_title=report_title,
            report_date=report_date or date.today(),
            laboratory_name=lab_name,
            referring_doctor=referring_doctor,
            file_url=file_url,
            file_type=first_file.name.split('.')[-1].lower(),
            blob_name=blob_name,
            notes=notes,
            test_order=test_order,
            status='processing'
        )
        
        # Create LabReportFile entries for ALL files (including first)
        all_ocr_text = []
        uploaded_files_info = []
        
        for idx, file in enumerate(files):
            try:
                file.seek(0)
                file_content = file.read()
                
                # Upload to Azure (skip first file since already uploaded)
                if idx == 0:
                    current_blob_name = blob_name
                    current_file_url = file_url
                else:
                    current_blob_name, current_file_url = azure_services.upload_lab_report(
                        file_content,
                        f"lab_{patient.id}_{timezone.now().timestamp()}_{idx}.{file.name.split('.')[-1]}"
                    )
                
                # Perform OCR on each file
                ocr_text = ''
                ocr_confidence = None
                try:
                    file.seek(0)
                    ocr_result = azure_services.perform_ocr(file.read())
                    ocr_text = ocr_result.get('text', '')
                    ocr_confidence = ocr_result.get('confidence')
                    all_ocr_text.append(ocr_text)
                    logger.info(f"OCR completed for file {idx + 1}. Text length: {len(ocr_text)}")
                except Exception as e:
                    logger.error(f"OCR failed for file {file.name}: {e}")
                
                # Create LabReportFile entry
                report_file = LabReportFile.objects.create(
                    lab_report=report,
                    file_url=current_file_url,
                    file_type=file.name.split('.')[-1].lower(),
                    blob_name=current_blob_name,
                    original_filename=file.name,
                    file_size=file.size,
                    ocr_raw_text=ocr_text,
                    ocr_confidence=ocr_confidence
                )
                
                uploaded_files_info.append({
                    'filename': file.name,
                    'file_url': current_file_url,
                    'size': file.size
                })
                
            except Exception as e:
                logger.error(f"Failed to process file {file.name}: {e}")
                continue
        
        # Combine all OCR text for analysis
        combined_ocr_text = "\n\n--- Next Report ---\n\n".join(all_ocr_text)
        report.ocr_raw_text = combined_ocr_text
        report.save()
        
        # Store first file for email attachment
        file = first_file  # Use first file for backward compatibility in email
        
        # Analyze report using Azure OpenAI directly
        has_critical = False
        critical_values = []
        
        if report.ocr_raw_text:
            try:
                # Run AI analysis
                analysis_result = azure_services.analyze_lab_report(report.ocr_raw_text, report_type)
                
                # Save analysis summary
                report.analysis_summary = analysis_result.get('summary', '')
                report.recommendations = analysis_result.get('recommendations', [])
                report.parsed_data = analysis_result.get('parsed_data', report.parsed_data or {})
                
                logger.info(f"Analysis summary: {report.analysis_summary}")
                logger.info(f"Found {len(analysis_result.get('abnormal_values', []))} abnormal values from AI")
                
                # Process abnormal values
                abnormal_values = analysis_result.get('abnormal_values', [])
                
                for av in abnormal_values:
                    # Map severity 
                    severity_map = {
                        'mild': 'abnormal',
                        'moderate': 'abnormal',
                        'significant': 'critical_high',
                        'critical': 'panic',
                        'low': 'critical_low',
                        'high': 'critical_high',
                    }
                    raw_severity = str(av.get('severity', 'abnormal')).lower()
                    severity = severity_map.get(raw_severity, 'abnormal')
                    
                    if severity in ['critical_low', 'critical_high', 'panic']:
                        has_critical = True
                    
                    cv = {
                        'test_name': av.get('test_name', 'Unknown Test'),
                        'measured_value': str(av.get('result', av.get('measured_value', ''))),
                        'unit': av.get('unit', ''),
                        'normal_range': av.get('expected', av.get('reference_range', av.get('normal_range', ''))),
                        'severity': severity,
                        'description': av.get('meaning', av.get('description', '')),
                        'recommendation': av.get('recommendation', 'Consult your healthcare provider')
                    }
                    critical_values.append(cv)
                    
                    # Create alert record
                    CriticalValueAlert.objects.create(
                        lab_report=report,
                        test_name=cv['test_name'],
                        measured_value=cv['measured_value'],
                        unit=cv['unit'],
                        normal_range=cv['normal_range'],
                        severity=severity,
                        description=cv['description'],
                        recommendation=cv['recommendation']
                    )
                    logger.info(f"Created alert for: {cv['test_name']} = {cv['measured_value']}")
                
            except Exception as e:
                logger.error(f"AI Analysis failed: {e}")
                import traceback
                logger.error(traceback.format_exc())
        
        report.has_critical_values = has_critical
        report.abnormal_values = [cv['test_name'] for cv in critical_values]
        report.status = 'analyzed'
        report.save()
        
        logger.info(f"Report saved. Has critical: {has_critical}, Abnormal count: {len(critical_values)}")
        
        # Update test order if linked
        if test_order:
            test_order.status = 'completed'
            test_order.completed_at = timezone.now()
            test_order.save()
        
        # Send notifications
        from prescriptions.azure_email_service import AzureEmailService
        
        # Always notify patient with file attachments if applicable
        if send_email:
            try:
                # Collect all files for email attachment
                files_for_email = []
                for idx, f in enumerate(files):
                    try:
                        f.seek(0)
                        file_data = f.read()
                        file_ext = f.name.split('.')[-1].lower()
                        
                        # Determine MIME type
                        if file_ext == 'pdf':
                            mime_type = 'application/pdf'
                        elif file_ext in ['jpg', 'jpeg']:
                            mime_type = 'image/jpeg'
                        elif file_ext == 'png':
                            mime_type = 'image/png'
                        else:
                            mime_type = 'application/octet-stream'
                        
                        # Create a clean filename
                        clean_name = f"{report_title.replace(' ', '_')}_{idx + 1}_{report.report_date}.{file_ext}"
                        
                        files_for_email.append({
                            'data': file_data,
                            'name': clean_name,
                            'type': mime_type
                        })
                    except Exception as e:
                        logger.error(f"Failed to prepare file {idx} for email: {e}")
                
                # Get test names from critical values or use report title
                test_names = [cv['test_name'] for cv in critical_values] if critical_values else [report_type]
                
                critical_message = None
                if has_critical:
                    critical_details = ", ".join([f"{cv['test_name']}: {cv['measured_value']}" 
                                                  for cv in critical_values 
                                                  if cv.get('severity') in ['critical_low', 'critical_high', 'panic']])
                    critical_message = f"Critical values detected: {critical_details}. Please contact your healthcare provider immediately."
                
                # Send email with all file attachments
                AzureEmailService.send_lab_report_with_files(
                    patient_email=patient.email,
                    patient_name=patient.get_full_name(),
                    report_title=report_title,
                    lab_name=lab_name,
                    test_names=test_names,
                    has_critical_values=has_critical,
                    critical_message=critical_message,
                    files_data=files_for_email
                )
                
                report.email_sent = True
                report.email_sent_at = timezone.now()
                report.save()
            except Exception as e:
                logger.error(f"Failed to send patient email: {e}")
                import traceback
                logger.error(traceback.format_exc())
        
        # If critical values, also notify referring doctor
        if has_critical and referring_doctor:
            report.critical_alert_sent = True
            report.critical_alert_sent_at = timezone.now()
            report.save()
            
            # Try to find doctor by name and notify
            try:
                # Send to test order doctor if available
                doctor_email = None
                if test_order and test_order.doctor:
                    doctor_email = test_order.doctor.email
                
                if doctor_email:
                    AzureEmailService.send_email(
                        to_email=doctor_email,
                        subject=f"⚠️ CRITICAL: Lab Results for Patient {patient.get_full_name() or patient.email}",
                        html_content=f"""
                        <h2 style="color: #DC2626;">Critical Lab Values Detected</h2>
                        <p><strong>Patient:</strong> {patient.get_full_name() or patient.email}</p>
                        <p><strong>Report:</strong> {report_title}</p>
                        <p><strong>Critical Values:</strong></p>
                        <ul>
                            {''.join([f"<li><strong>{cv['test_name']}:</strong> {cv['measured_value']} (Normal: {cv.get('normal_range', 'N/A')})</li>" for cv in critical_values if cv.get('severity') in ['critical_low', 'critical_high', 'panic']])}
                        </ul>
                        <p>Please review the results and contact the patient if necessary.</p>
                        """
                    )
                    
                    # Update alert notification status
                    CriticalValueAlert.objects.filter(lab_report=report).update(
                        doctor_notified=True,
                        doctor_notified_at=timezone.now()
                    )
            except Exception as e:
                logger.error(f"Failed to notify doctor: {e}")
        
        return Response({
            'message': 'Report uploaded and analyzed',
            'report_id': str(report.id),
            'has_critical_values': has_critical,
            'critical_values_count': len(critical_values),
            'abnormal_values': [cv['test_name'] for cv in critical_values],
            'email_sent': report.email_sent,
            'files_uploaded': len(uploaded_files_info) if 'uploaded_files_info' in dir() else 1,
            'files': uploaded_files_info if 'uploaded_files_info' in dir() else []
        }, status=201)


class CriticalAlertsView(views.APIView):
    """View critical alerts for patients or doctors"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        if user.role == 'patient':
            alerts = CriticalValueAlert.objects.filter(
                lab_report__user=user
            ).select_related('lab_report').order_by('-created_at')
        elif user.role == 'doctor':
            # Get alerts for patients the doctor has ordered tests for
            patient_ids = TestOrder.objects.filter(
                doctor=user
            ).values_list('patient_id', flat=True)
            
            alerts = CriticalValueAlert.objects.filter(
                lab_report__user_id__in=patient_ids
            ).select_related('lab_report').order_by('-created_at')
        else:
            return Response({'error': 'Not authorized'}, status=403)
        
        # Only unacknowledged or recent
        alerts = alerts[:50]
        
        results = []
        for alert in alerts:
            data = CriticalValueAlertSerializer(alert).data
            data['report_title'] = alert.lab_report.report_title
            data['patient_name'] = alert.lab_report.user.get_full_name() or alert.lab_report.user.email
            data['report_date'] = alert.lab_report.report_date.isoformat() if alert.lab_report.report_date else None
            results.append(data)
        
        return Response(results)


class AcknowledgeCriticalAlertView(views.APIView):
    """Acknowledge a critical alert"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, alert_id):
        user = request.user
        
        try:
            if user.role == 'patient':
                alert = CriticalValueAlert.objects.get(
                    id=alert_id,
                    lab_report__user=user
                )
                alert.acknowledged_by_patient = True
            elif user.role == 'doctor':
                alert = CriticalValueAlert.objects.get(id=alert_id)
                # Verify doctor has access
                has_access = TestOrder.objects.filter(
                    doctor=user,
                    patient=alert.lab_report.user
                ).exists()
                if not has_access:
                    return Response({'error': 'Not authorized'}, status=403)
                alert.acknowledged_by_doctor = True
            else:
                return Response({'error': 'Not authorized'}, status=403)
            
            alert.save()
            return Response({'message': 'Alert acknowledged'})
            
        except CriticalValueAlert.DoesNotExist:
            return Response({'error': 'Alert not found'}, status=404)


# ============================================
# PATIENT VIEWS
# ============================================

class PatientTestOrdersView(views.APIView):
    """List test orders for patient"""
    permission_classes = [IsAuthenticated, IsPatientUser]
    
    def get(self, request):
        orders = TestOrder.objects.filter(
            patient=request.user
        ).select_related('doctor', 'laboratory').prefetch_related('home_collection')
        
        orders = orders.order_by('-created_at')[:50]
        
        return Response(TestOrderSerializer(orders, many=True).data)


class PatientTestOrderDetailView(views.APIView):
    """Get test order details for patient"""
    permission_classes = [IsAuthenticated, IsPatientUser]
    
    def get(self, request, order_id):
        try:
            order = TestOrder.objects.select_related(
                'doctor', 'laboratory'
            ).prefetch_related('home_collection', 'reports').get(
                id=order_id,
                patient=request.user
            )
        except TestOrder.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)
        
        data = TestOrderSerializer(order).data
        
        # Include reports
        reports = order.reports.all()
        data['reports'] = [{
            'id': str(r.id),
            'report_title': r.report_title,
            'report_type': r.report_type,
            'file_url': r.file_url,
            'has_critical_values': r.has_critical_values,
            'created_at': r.created_at.isoformat()
        } for r in reports]
        
        return Response(data)


class PatientCreateTestOrderView(views.APIView):
    """Patient creates their own test order"""
    permission_classes = [IsAuthenticated, IsPatientUser]
    
    @transaction.atomic
    def post(self, request):
        laboratory_id = request.data.get('laboratory_id')
        tests_requested = request.data.get('tests_requested', [])
        clinical_notes = request.data.get('clinical_notes', '')
        urgency = request.data.get('urgency', 'routine')
        collection_type = request.data.get('collection_type', 'lab_visit')
        home_collection_data = request.data.get('home_collection')
        
        # Validate
        if not laboratory_id:
            return Response({'error': 'Laboratory is required'}, status=400)
        
        if not tests_requested:
            return Response({'error': 'At least one test is required'}, status=400)
        
        # Get laboratory
        try:
            lab_user = User.objects.get(id=laboratory_id, role='laboratory')
            lab_profile = LaboratoryProfile.objects.get(user=lab_user)
            if not lab_profile.is_verified or not lab_user.is_professional_verified:
                return Response({'error': 'Laboratory is not verified'}, status=400)
        except (User.DoesNotExist, LaboratoryProfile.DoesNotExist):
            return Response({'error': 'Laboratory not found'}, status=404)
        
        # Validate home collection
        if collection_type == 'home_collection':
            if not home_collection_data:
                return Response({'error': 'Home collection address is required'}, status=400)
            required_fields = ['address_line1', 'city', 'state', 'zip_code', 'contact_phone']
            for field in required_fields:
                if not home_collection_data.get(field):
                    return Response({'error': f'{field} is required for home collection'}, status=400)
        
        # Create order
        order = TestOrder.objects.create(
            doctor=None,  # No doctor - patient self-order
            patient=request.user,
            laboratory=lab_user,
            tests_requested=tests_requested,
            clinical_notes=clinical_notes,
            urgency=urgency,
            collection_type=collection_type
        )
        
        # Create home collection record if needed
        if collection_type == 'home_collection' and home_collection_data:
            HomeSampleCollection.objects.create(
                test_order=order,
                address_line1=home_collection_data.get('address_line1', ''),
                address_line2=home_collection_data.get('address_line2', ''),
                city=home_collection_data.get('city', ''),
                state=home_collection_data.get('state', ''),
                zip_code=home_collection_data.get('zip_code', ''),
                landmark=home_collection_data.get('landmark', ''),
                contact_phone=home_collection_data.get('contact_phone', ''),
                alternate_phone=home_collection_data.get('alternate_phone', ''),
                preferred_date=home_collection_data.get('preferred_date') or None,
                preferred_time_slot=home_collection_data.get('preferred_time_slot', 'morning'),
                patient_notes=home_collection_data.get('patient_notes', '')
            )
        
        # Send notification to lab
        try:
            EmailService.send_test_order_notification(
                lab_email=lab_user.email,
                lab_name=lab_profile.name,
                patient_name=f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email,
                order_number=order.order_number,
                tests=tests_requested,
                urgency=urgency,
                collection_type=collection_type
            )
        except Exception as e:
            logger.error(f"Failed to send order notification: {e}")
        
        return Response({
            'message': 'Test order created successfully',
            'order_id': str(order.id),
            'order_number': order.order_number
        }, status=201)
