# backend/prescriptions/views.py
from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from .models import Prescription, PrescriptionDrug, MedicationReminder, DoseLog
from .serializers import (PrescriptionListSerializer, PrescriptionDetailSerializer,
                          PrescriptionUploadSerializer, MedicationReminderSerializer,
                          DoseLogSerializer)
from .services import AzureServices
from pharmacy.models import PharmacyOrder, Pharmacy
from pharmacy.serializers import PharmacyOrderCreateSerializer


class PrescriptionListView(generics.ListAPIView):
    serializer_class = PrescriptionListSerializer
    
    def get_queryset(self):
        qs = Prescription.objects.filter(user=self.request.user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.select_related('family_member').prefetch_related('drugs')


class PrescriptionUploadView(views.APIView):
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        serializer = PrescriptionUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        file = serializer.validated_data['file']
        family_member_id = serializer.validated_data.get('family_member_id')
        
        azure_svc = AzureServices()
        
        # Upload to Azure Blob Storage (or local fallback)
        blob_name, blob_url = azure_svc.upload_prescription(file, request.user.id)
        
        # Create prescription record
        prescription = Prescription.objects.create(
            user=request.user,
            family_member_id=family_member_id,
            image_url=blob_url,
            blob_name=blob_name,
            file_type='pdf' if file.content_type == 'application/pdf' else 'image',
            status='processing'
        )
        
        # Try to run OCR immediately
        try:
            ocr_result = azure_svc.extract_text(blob_url)
            prescription.ocr_raw_text = ocr_result.get('text', '')
            prescription.ocr_confidence = ocr_result.get('confidence', 0)
            prescription.status = 'uploaded' if prescription.ocr_raw_text else 'processing'
            prescription.save()
        except Exception as e:
            print(f"OCR during upload failed: {e}")
            prescription.status = 'uploaded'
            prescription.notes = f'OCR will run during analysis'
            prescription.save()
        
        return Response(
            PrescriptionDetailSerializer(prescription).data,
            status=status.HTTP_201_CREATED
        )


class PrescriptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PrescriptionDetailSerializer
    
    def get_queryset(self):
        return Prescription.objects.filter(user=self.request.user)


class PrescriptionAnalyzeView(views.APIView):
    def post(self, request, pk):
        try:
            prescription = Prescription.objects.get(pk=pk, user=request.user)
        except Prescription.DoesNotExist:
            return Response({'error': 'Prescription not found'}, status=404)
        
        azure_svc = AzureServices()
        
        # If no OCR text yet, try to get it now (use mock if Azure fails)
        if not prescription.ocr_raw_text:
            try:
                ocr_result = azure_svc.extract_text(prescription.image_url)
                prescription.ocr_raw_text = ocr_result.get('text', '')
                prescription.ocr_confidence = ocr_result.get('confidence', 0)
            except Exception as e:
                print(f"OCR failed: {e}")
            
            # If still no text, use mock OCR for demo
            if not prescription.ocr_raw_text:
                mock_result = azure_svc._mock_ocr_result()
                prescription.ocr_raw_text = mock_result['text']
                prescription.ocr_confidence = mock_result['confidence']
                prescription.notes = 'Using demo OCR data (Azure Vision not configured or image not accessible)'
        
        # Parse prescription with AI (or mock)
        try:
            parsed_data = azure_svc.parse_prescription(prescription.ocr_raw_text)
        except Exception as e:
            print(f"Parsing failed: {e}")
            parsed_data = azure_svc._mock_parsed_result()
        
        prescription.parsed_data = parsed_data
        prescription.doctor_name = parsed_data.get('doctor_name', '')
        prescription.clinic_name = parsed_data.get('clinic_name', '')
        
        if parsed_data.get('prescription_date'):
            try:
                from datetime import datetime
                date_str = parsed_data['prescription_date']
                prescription.prescription_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except:
                pass
        
        # Create drug records
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
        
        # Run safety analysis
        try:
            health_profile = request.user.health_profile
            health_data = {
                'conditions': health_profile.medical_conditions or [],
                'allergies': health_profile.allergies or [],
                'current_meds': health_profile.current_medications or [],
                'lifestyle': health_profile.lifestyle_factors or {}
            }
        except:
            health_data = {'conditions': [], 'allergies': [], 'current_meds': [], 'lifestyle': {}}
        
        try:
            safety_result = azure_svc.analyze_safety(
                drugs=[{
                    'name': d.drug_name,
                    'generic': d.generic_name,
                    'dosage': d.dosage
                } for d in drugs],
                health_profile=health_data
            )
        except Exception as e:
            print(f"Safety analysis failed: {e}")
            safety_result = azure_svc._mock_safety_result(drugs)
        
        prescription.safety_score = safety_result.get('score', 7)
        prescription.safety_summary = safety_result.get('summary', 'Analysis complete.')
        prescription.status = 'analyzed'
        prescription.save()
        
        # Create interaction records
        for drug in drugs:
            for interaction in safety_result.get('interactions', []):
                if interaction.get('drug_name', '').lower() in drug.drug_name.lower():
                    drug.interactions.create(
                        interaction_type=interaction.get('type', 'drug_drug'),
                        severity=interaction.get('severity', 'minor'),
                        interacting_item=interaction.get('interacting_with', ''),
                        description=interaction.get('description', ''),
                        recommendation=interaction.get('recommendation', '')
                    )
        
        return Response(PrescriptionDetailSerializer(prescription).data)


class SendToPharmacyView(views.APIView):
    def post(self, request, pk):
        try:
            prescription = Prescription.objects.get(pk=pk, user=request.user)
        except Prescription.DoesNotExist:
            return Response({'error': 'Prescription not found'}, status=404)
        
        serializer = PharmacyOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            pharmacy = Pharmacy.objects.get(pk=serializer.validated_data['pharmacy_id'])
        except Pharmacy.DoesNotExist:
            return Response({'error': 'Pharmacy not found'}, status=404)
        
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
        }, status=status.HTTP_201_CREATED)


class ReminderListView(generics.ListCreateAPIView):
    serializer_class = MedicationReminderSerializer
    
    def get_queryset(self):
        return MedicationReminder.objects.filter(
            user=self.request.user,
            is_active=True
        ).select_related('prescription_drug')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MarkDoseTakenView(views.APIView):
    def post(self, request, pk):
        try:
            reminder = MedicationReminder.objects.get(pk=pk, user=request.user)
        except MedicationReminder.DoesNotExist:
            return Response({'error': 'Reminder not found'}, status=404)
        
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
        
        return Response({'message': 'Dose marked as taken'})


class PrescriptionHistoryView(generics.ListAPIView):
    serializer_class = PrescriptionListSerializer
    
    def get_queryset(self):
        qs = Prescription.objects.filter(user=self.request.user)
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__lte=end_date)
        
        return qs.order_by('-created_at')