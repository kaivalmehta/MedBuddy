# backend/prescriptions/views.py
from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Prescription, PrescriptionDrug, DrugInteraction, MedicationReminder, DoseLog
from .serializers import (
    PrescriptionListSerializer, PrescriptionDetailSerializer,
    PrescriptionUploadSerializer, MedicationReminderSerializer,
    CreateReminderSerializer, DoseLogSerializer
)
from .services import AzureServices
import logging

logger = logging.getLogger(__name__)


class PrescriptionListView(generics.ListAPIView):
    """List all prescriptions for the authenticated user"""
    serializer_class = PrescriptionListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = Prescription.objects.filter(user=self.request.user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.select_related('family_member').prefetch_related('drugs')


class PrescriptionUploadView(views.APIView):
    """Upload a new prescription image/PDF"""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PrescriptionUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        file = serializer.validated_data['file']
        family_member_id = serializer.validated_data.get('family_member_id')
        
        azure_svc = AzureServices()
        
        try:
            blob_name, blob_url = azure_svc.upload_prescription(file, str(request.user.id))
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            return Response({'error': 'Failed to upload file'}, status=500)
        
        prescription = Prescription.objects.create(
            user=request.user,
            family_member_id=family_member_id,
            image_url=blob_url,
            blob_name=blob_name,
            file_type='pdf' if file.content_type == 'application/pdf' else 'image',
            status='processing'
        )
        
        # Try OCR during upload
        try:
            ocr_result = azure_svc.extract_text(blob_url)
            prescription.ocr_raw_text = ocr_result.get('text', '')
            prescription.ocr_confidence = ocr_result.get('confidence', 0)
            prescription.status = 'uploaded'
            prescription.save()
        except Exception as e:
            logger.warning(f"OCR failed during upload: {e}")
            prescription.status = 'uploaded'
            prescription.notes = 'OCR pending - will run during analysis'
            prescription.save()
        
        return Response(PrescriptionDetailSerializer(prescription).data, status=201)


class PrescriptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a specific prescription"""
    serializer_class = PrescriptionDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Prescription.objects.filter(user=self.request.user)


class PrescriptionAnalyzeView(views.APIView):
    """Comprehensive prescription analysis with detailed safety report"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        prescription = get_object_or_404(Prescription, pk=pk, user=request.user)
        azure_svc = AzureServices()
        
        # Step 1: OCR if needed
        if not prescription.ocr_raw_text:
            try:
                ocr_result = azure_svc.extract_text(prescription.image_url)
                prescription.ocr_raw_text = ocr_result.get('text', '')
                prescription.ocr_confidence = ocr_result.get('confidence', 0)
                prescription.save()
            except Exception as e:
                logger.error(f"OCR failed: {e}")
        
        if not prescription.ocr_raw_text:
            return Response(
                {'error': 'Could not extract text from prescription image. Please try uploading a clearer image.'},
                status=400
            )
        
        # Step 2: Parse prescription
        try:
            parsed_data = azure_svc.parse_prescription(prescription.ocr_raw_text)
        except Exception as e:
            logger.error(f"Parsing failed: {e}")
            parsed_data = {"medications": []}
        
        prescription.parsed_data = parsed_data
        prescription.doctor_name = parsed_data.get('doctor_name', '')
        prescription.clinic_name = parsed_data.get('clinic_name', '')
        
        if parsed_data.get('prescription_date'):
            try:
                from datetime import datetime
                prescription.prescription_date = datetime.strptime(
                    parsed_data['prescription_date'], '%Y-%m-%d'
                ).date()
            except:
                pass
        
        # Step 3: Create drug records
        PrescriptionDrug.objects.filter(prescription=prescription).delete()
        drugs = []
        
        for drug_data in parsed_data.get('medications', []):
            drug = PrescriptionDrug.objects.create(
                prescription=prescription,
                drug_name=drug_data.get('drug_name', 'Unknown'),
                generic_name=drug_data.get('generic_name', ''),
                dosage=drug_data.get('dosage', ''),
                frequency=drug_data.get('frequency', ''),
                duration=drug_data.get('duration', ''),
                instructions=drug_data.get('instructions', ''),
                category=drug_data.get('category', 'other'),
                primary_use=drug_data.get('primary_use', ''),
                mechanism=drug_data.get('mechanism', ''),
                common_side_effects=drug_data.get('side_effects', []),
                generic_alternatives=drug_data.get('alternatives', [])
            )
            drugs.append(drug)
        
        # Step 4: Get health profile
        try:
            hp = request.user.health_profile
            health_data = {
                'conditions': hp.medical_conditions or [],
                'allergies': hp.allergies or [],
                'current_meds': hp.current_medications or [],
                'lifestyle': hp.lifestyle_factors or {}
            }
        except:
            health_data = {'conditions': [], 'allergies': [], 'current_meds': [], 'lifestyle': {}}
        
        # Step 5: Comprehensive safety analysis
        if drugs:
            try:
                safety_result = azure_svc.analyze_safety_comprehensive(
                    drugs=[{
                        'name': d.drug_name,
                        'generic': d.generic_name,
                        'dosage': d.dosage,
                        'frequency': d.frequency
                    } for d in drugs],
                    health_profile=health_data
                )
            except Exception as e:
                logger.error(f"Safety analysis failed: {e}")
                safety_result = azure_svc._empty_safety_report()
            
            # Save overall safety to prescription
            prescription.overall_safety_percentage = safety_result.get('overall_safety_percentage')
            prescription.safety_status = safety_result.get('safety_status', 'safe')
            prescription.safety_summary = safety_result.get('safety_summary', '')
            prescription.safety_report = safety_result
            
            # Step 6: Update individual drug safety
            individual_safety = {
                item['drug_name'].lower(): item 
                for item in safety_result.get('individual_drug_safety', [])
            }
            
            for drug in drugs:
                drug_safety = individual_safety.get(drug.drug_name.lower(), {})
                drug.safety_percentage = drug_safety.get('safety_percentage', 100)
                drug.safety_status = drug_safety.get('safety_status', 'safe')
                drug.is_safe_to_take = drug_safety.get('is_safe_to_take', True)
                drug.requires_monitoring = drug_safety.get('requires_monitoring', False)
                drug.safety_concerns = drug_safety.get('concerns', [])
                drug.special_instructions = drug_safety.get('special_instructions', '')
                drug.save()
            
            # Step 7: Create detailed interaction records
            self._create_interaction_records(drugs, safety_result)
        
        prescription.status = 'analyzed'
        prescription.save()
        
        return Response(PrescriptionDetailSerializer(prescription).data)
    
    def _create_interaction_records(self, drugs, safety_result):
        """Create DrugInteraction records from safety analysis"""
        drug_map = {d.drug_name.lower(): d for d in drugs}
        
        # Drug-Drug Interactions
        for interaction in safety_result.get('drug_drug_interactions', []):
            drug = drug_map.get(interaction.get('drug1', '').lower())
            if drug:
                DrugInteraction.objects.create(
                    prescription_drug=drug,
                    interaction_type='drug_drug',
                    severity=interaction.get('severity', 'moderate'),
                    interacting_item=interaction.get('drug2', ''),
                    title=interaction.get('title', ''),
                    description=interaction.get('description', ''),
                    mechanism=interaction.get('mechanism', ''),
                    effects=interaction.get('effects', ''),
                    recommendation=interaction.get('recommendation', ''),
                    requires_immediate_attention=interaction.get('requires_immediate_attention', False),
                    consult_doctor=interaction.get('consult_doctor', False)
                )
        
        # Drug-Allergy Interactions
        for interaction in safety_result.get('drug_allergy_interactions', []):
            drug = drug_map.get(interaction.get('drug', '').lower())
            if drug:
                DrugInteraction.objects.create(
                    prescription_drug=drug,
                    interaction_type='drug_allergy',
                    severity=interaction.get('severity', 'severe'),
                    interacting_item=interaction.get('allergy', ''),
                    title=interaction.get('title', ''),
                    description=interaction.get('description', ''),
                    effects=interaction.get('symptoms_to_watch', ''),
                    recommendation=interaction.get('recommendation', ''),
                    requires_immediate_attention=interaction.get('requires_immediate_attention', True),
                    consult_doctor=interaction.get('consult_doctor', True)
                )
        
        # Drug-Disease Interactions
        for interaction in safety_result.get('drug_disease_interactions', []):
            drug = drug_map.get(interaction.get('drug', '').lower())
            if drug:
                DrugInteraction.objects.create(
                    prescription_drug=drug,
                    interaction_type='drug_disease',
                    severity=interaction.get('severity', 'moderate'),
                    interacting_item=interaction.get('condition', ''),
                    title=interaction.get('title', ''),
                    description=interaction.get('description', ''),
                    effects=interaction.get('risk', ''),
                    recommendation=interaction.get('recommendation', ''),
                    consult_doctor=interaction.get('consult_doctor', False)
                )
        
        # Drug-Food Interactions
        for interaction in safety_result.get('drug_food_interactions', []):
            drug = drug_map.get(interaction.get('drug', '').lower())
            if drug:
                DrugInteraction.objects.create(
                    prescription_drug=drug,
                    interaction_type='drug_food',
                    severity=interaction.get('severity', 'minor'),
                    interacting_item=interaction.get('food_or_drink', ''),
                    title=interaction.get('title', ''),
                    description=interaction.get('description', ''),
                    effects=interaction.get('timing', ''),
                    recommendation=interaction.get('recommendation', '')
                )
        
        # Pregnancy Warnings
        for warning in safety_result.get('pregnancy_warnings', []):
            drug = drug_map.get(warning.get('drug', '').lower())
            if drug:
                DrugInteraction.objects.create(
                    prescription_drug=drug,
                    interaction_type='pregnancy',
                    severity=warning.get('severity', 'moderate'),
                    interacting_item=f"Pregnancy Category {warning.get('category', 'Unknown')}",
                    title=f"Pregnancy Warning - Category {warning.get('category', '')}",
                    description=warning.get('warning', ''),
                    recommendation=warning.get('recommendation', '')
                )


class SendToPharmacyView(views.APIView):
    """Send prescription to a pharmacy"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        from pharmacy.models import Pharmacy, PharmacyOrder
        from pharmacy.serializers import PharmacyOrderCreateSerializer
        
        prescription = get_object_or_404(Prescription, pk=pk, user=request.user)
        
        serializer = PharmacyOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        pharmacy = get_object_or_404(Pharmacy, pk=serializer.validated_data['pharmacy_id'])
        
        order = PharmacyOrder.objects.create(
            prescription=prescription,
            pharmacy=pharmacy,
            patient=request.user,
            fulfillment_type=serializer.validated_data['fulfillment_type'],
            patient_notes=serializer.validated_data.get('patient_notes', '')
        )
        
        prescription.status = 'sent_to_pharmacy'
        prescription.save()
        
        return Response({
            'message': 'Prescription sent to pharmacy',
            'order_id': str(order.id)
        }, status=201)


class ReminderListView(generics.ListCreateAPIView):
    """List and create medication reminders"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateReminderSerializer
        return MedicationReminderSerializer
    
    def get_queryset(self):
        return MedicationReminder.objects.filter(
            user=self.request.user,
            is_active=True
        ).select_related('prescription_drug')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ReminderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a reminder"""
    serializer_class = MedicationReminderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return MedicationReminder.objects.filter(user=self.request.user)


class MarkDoseTakenView(views.APIView):
    """Mark a medication dose as taken"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        reminder = get_object_or_404(MedicationReminder, pk=pk, user=request.user)
        
        DoseLog.objects.create(
            reminder=reminder,
            scheduled_time=timezone.now(),
            taken_at=timezone.now(),
            status='taken',
            notes=request.data.get('notes', '')
        )
        
        reminder.doses_taken += 1
        reminder.last_taken_at = timezone.now()
        reminder.save()
        
        return Response({'message': 'Dose marked as taken', 'doses_taken': reminder.doses_taken})


class PrescriptionHistoryView(generics.ListAPIView):
    """Get prescription history with optional filtering"""
    serializer_class = PrescriptionListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = Prescription.objects.filter(user=self.request.user)
        
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__lte=end_date)
        
        return qs.order_by('-created_at')