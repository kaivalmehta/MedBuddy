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


# ============================================
# LAB REPORTS - PATIENT VIEWS
# ============================================

class PatientLabReportsView(views.APIView):
    """Get all lab reports for the authenticated patient"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import LabReport
        
        # Get query params for filtering
        report_type = request.query_params.get('type')
        search = request.query_params.get('search', '').strip()
        
        reports = LabReport.objects.filter(user=request.user)
        
        if report_type:
            reports = reports.filter(report_type=report_type)
        if search:
            reports = reports.filter(report_title__icontains=search)
        
        reports = reports.order_by('-created_at')
        
        reports_data = [{
            'id': str(r.id),
            'report_title': r.report_title,
            'report_type': r.report_type,
            'report_type_display': r.get_report_type_display() if hasattr(r, 'get_report_type_display') else r.report_type,
            'report_date': r.report_date.isoformat() if r.report_date else None,
            'laboratory_name': r.laboratory_name,
            'referring_doctor': r.referring_doctor,
            'file_url': r.file_url,
            'status': r.status,
            'source': r.source,
            'has_critical_values': r.has_critical_values,
            'analysis_summary': r.analysis_summary,
            'abnormal_values': r.abnormal_values or [],
            'created_at': r.created_at.isoformat(),
        } for r in reports]
        
        return Response({'reports': reports_data})


class PatientLabReportDetailView(views.APIView):
    """Get detail of a specific lab report for patient"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, report_id):
        from .models import LabReport, CriticalValueAlert, LabReportFile
        
        try:
            report = LabReport.objects.get(id=report_id, user=request.user)
        except LabReport.DoesNotExist:
            return Response({'error': 'Report not found'}, status=404)
        
        # Get all files for this report
        report_files = LabReportFile.objects.filter(lab_report=report).order_by('created_at')
        files_list = [{
            'id': str(f.id),
            'file_url': f.file_url,
            'file_type': f.file_type,
            'original_filename': f.original_filename,
            'file_size': f.file_size,
            'created_at': f.created_at.isoformat()
        } for f in report_files]
        
        # If no files in LabReportFile, use the main file_url for backward compatibility
        if not files_list and report.file_url:
            files_list = [{
                'id': str(report.id),
                'file_url': report.file_url,
                'file_type': report.file_type,
                'original_filename': f"{report.report_title}.{report.file_type}",
                'file_size': 0,
                'created_at': report.created_at.isoformat()
            }]
        
        # Get associated critical value alerts
        alerts = CriticalValueAlert.objects.filter(lab_report=report)
        
        # Build abnormal_values - prefer CriticalValueAlert records if they exist
        if alerts.exists():
            abnormal_values = [{
                'test_name': a.test_name,
                'severity': a.severity,
                'result': a.measured_value,
                'expected': a.normal_range,
                'meaning': a.description,
                'unit': a.unit,
                'recommendation': a.recommendation,
            } for a in alerts]
            recommendations = list(set([a.recommendation for a in alerts if a.recommendation]))
        elif report.abnormal_values:
            # Fallback to report.abnormal_values for legacy data
            # Check if it's list of strings or list of dicts
            if report.abnormal_values and isinstance(report.abnormal_values[0], dict):
                abnormal_values = [{
                    'test_name': av.get('test_name', 'Unknown'),
                    'severity': av.get('severity', 'abnormal'),
                    'result': av.get('result', av.get('measured_value', '')),
                    'expected': av.get('expected', av.get('normal_range', '')),
                    'meaning': av.get('meaning', av.get('description', '')),
                    'unit': av.get('unit', ''),
                    'recommendation': av.get('recommendation', ''),
                } for av in report.abnormal_values]
            else:
                # List of just test names
                abnormal_values = [{
                    'test_name': name,
                    'severity': 'abnormal',
                    'result': '',
                    'expected': '',
                    'meaning': '',
                    'unit': '',
                    'recommendation': '',
                } for name in report.abnormal_values if name]
            recommendations = report.recommendations or []
        else:
            abnormal_values = []
            recommendations = report.recommendations or []
        
        # Build analysis summary if not present
        analysis_summary = report.analysis_summary
        if not analysis_summary and abnormal_values:
            if report.has_critical_values:
                analysis_summary = f"This report contains {len(abnormal_values)} abnormal value(s) that require attention. Please review the findings below and consult your healthcare provider."
            else:
                analysis_summary = f"This report has been analyzed. {len(abnormal_values)} value(s) were flagged for your review."
        elif not analysis_summary:
            analysis_summary = "No abnormal values were detected in this report."
        
        # Get test order info if available
        test_order_info = None
        if report.test_order:
            order = report.test_order
            test_order_info = {
                'order_number': order.order_number,
                'doctor_name': f"Dr. {order.doctor.get_full_name()}" if order.doctor and order.doctor.get_full_name() else (order.doctor.email if order.doctor else None),
                'tests_requested': order.tests_requested,
            }
        
        # Determine status - if we have abnormal_values, consider it analyzed
        status = report.status
        if (alerts.exists() or abnormal_values) and status != 'analyzed':
            status = 'analyzed'
        
        return Response({
            'id': str(report.id),
            'report_title': report.report_title,
            'report_type': report.report_type,
            'report_type_display': report.get_report_type_display() if hasattr(report, 'get_report_type_display') else report.report_type,
            'report_date': report.report_date.isoformat() if report.report_date else None,
            'laboratory_name': report.laboratory_name,
            'referring_doctor': report.referring_doctor,
            'file_url': report.file_url,
            'file_type': report.file_type,
            'files': files_list,  # All files for this report
            'files_count': len(files_list),
            'status': status,
            'source': report.source,
            'has_critical_values': report.has_critical_values,
            'analysis_summary': analysis_summary,
            'abnormal_values': abnormal_values,
            'recommendations': recommendations,
            'parsed_data': report.parsed_data or {},
            'notes': report.notes,
            'critical_alerts': abnormal_values,  # Same data, for backwards compatibility
            'test_order': test_order_info,
            'created_at': report.created_at.isoformat(),
        })


class PatientDashboardView(views.APIView):
    """Dashboard stats for patient"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import LabReport, TestOrder, CriticalValueAlert
        from datetime import timedelta
        
        user = request.user
        today = timezone.now().date()
        
        # Prescription stats
        total_prescriptions = Prescription.objects.filter(user=user).count()
        active_prescriptions = Prescription.objects.filter(
            user=user, 
            status='active'
        ).count()
        
        # Reminder stats - use reminder_time field instead of next_reminder_at
        reminders_today = MedicationReminder.objects.filter(
            user=user,
            is_active=True,
            start_date__lte=today,
            end_date__gte=today
        ).count()
        
        pending_reminders = MedicationReminder.objects.filter(
            user=user,
            is_active=True,
            start_date__lte=today
        ).exclude(
            end_date__lt=today
        ).count()
        
        # Lab report stats
        total_lab_reports = LabReport.objects.filter(user=user).count()
        recent_lab_reports = LabReport.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        # Critical alerts (unacknowledged) - linked through lab_report
        critical_alerts = CriticalValueAlert.objects.filter(
            lab_report__user=user,
            acknowledged_by_patient=False
        ).count()
        
        # Test orders
        pending_test_orders = TestOrder.objects.filter(
            patient=user,
            status__in=['pending', 'accepted', 'sample_collected', 'processing']
        ).count()
        
        # Recent prescriptions
        recent_prescriptions = Prescription.objects.filter(
            user=user
        ).order_by('-created_at')[:5]
        
        recent_prescriptions_data = [{
            'id': str(p.id),
            'doctor_name': p.doctor_name or p.clinic_name or 'Unknown',
            'diagnosis': p.notes or '',
            'status': p.status,
            'created_at': p.created_at.isoformat(),
            'drugs_count': p.drugs.count()
        } for p in recent_prescriptions]
        
        # Recent lab reports
        recent_reports = LabReport.objects.filter(user=user).order_by('-created_at')[:5]
        recent_reports_data = [{
            'id': str(r.id),
            'report_title': r.report_title,
            'report_type': r.report_type,
            'laboratory_name': r.laboratory_name,
            'has_critical_values': r.has_critical_values,
            'created_at': r.created_at.isoformat()
        } for r in recent_reports]
        
        return Response({
            'stats': {
                'total_prescriptions': total_prescriptions,
                'active_prescriptions': active_prescriptions,
                'reminders_today': reminders_today,
                'pending_reminders': pending_reminders,
                'total_lab_reports': total_lab_reports,
                'recent_lab_reports': recent_lab_reports,
                'critical_alerts': critical_alerts,
                'pending_test_orders': pending_test_orders,
            },
            'recent_prescriptions': recent_prescriptions_data,
            'recent_lab_reports': recent_reports_data
        })


class PatientLabReportUploadView(views.APIView):
    """Patient uploads their own lab report"""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from .models import LabReport
        from .services import AzureServices
        from datetime import date
        
        file = request.FILES.get('file')
        report_title = request.data.get('report_title', 'Lab Report')
        report_type = request.data.get('report_type', 'other')
        report_date = request.data.get('report_date')
        laboratory_name = request.data.get('laboratory_name', '')
        notes = request.data.get('notes', '')
        
        if not file:
            return Response({'error': 'File is required'}, status=400)
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response({'error': 'Invalid file type. Use PDF, JPG, or PNG.'}, status=400)
        
        # Validate file size (10MB max)
        if file.size > 10 * 1024 * 1024:
            return Response({'error': 'File too large. Maximum 10MB.'}, status=400)
        
        azure_services = AzureServices()
        
        try:
            # Upload file
            blob_name, file_url = azure_services.upload_lab_report(
                file.read(),
                f"patient_{request.user.id}_{file.name}"
            )
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            return Response({'error': 'Failed to upload file'}, status=500)
        
        # Create report
        report = LabReport.objects.create(
            user=request.user,
            source='self',
            report_type=report_type,
            report_title=report_title,
            report_date=report_date or date.today(),
            laboratory_name=laboratory_name,
            file_url=file_url,
            file_type=file.name.split('.')[-1].lower(),
            blob_name=blob_name,
            notes=notes,
            status='uploaded'
        )
        
        # Try OCR
        try:
            file.seek(0)
            ocr_result = azure_services.perform_ocr(file.read())
            report.ocr_raw_text = ocr_result.get('text', '')
            report.ocr_confidence = ocr_result.get('confidence')
            report.status = 'pending'  # Not analyzed yet - user needs to click analyze
            report.save()
            logger.info(f"Patient uploaded report. OCR text length: {len(report.ocr_raw_text)}")
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            report.status = 'pending'
            report.save()
        
        # Send confirmation email to patient
        try:
            from .azure_email_service import AzureEmailService
            AzureEmailService.send_patient_self_upload_confirmation(
                patient_email=request.user.email,
                patient_name=request.user.get_full_name(),
                report_title=report_title
            )
            report.email_sent = True
            report.email_sent_at = timezone.now()
            report.save()
        except Exception as e:
            logger.error(f"Failed to send self-upload confirmation email: {e}")
        
        return Response({
            'message': 'Report uploaded successfully',
            'report_id': str(report.id),
            'file_url': file_url
        }, status=201)


class PatientLabReportAnalyzeView(views.APIView):
    """Analyze a lab report using AI"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, report_id):
        from .models import LabReport, CriticalValueAlert
        from .services import AzureServices
        
        try:
            report = LabReport.objects.get(id=report_id, user=request.user)
        except LabReport.DoesNotExist:
            return Response({'error': 'Report not found'}, status=404)
        
        # If already analyzed with alerts, return current data
        existing_alerts = CriticalValueAlert.objects.filter(lab_report=report)
        if report.status == 'analyzed' and existing_alerts.exists():
            abnormal_values = [{
                'test_name': a.test_name,
                'severity': a.severity,
                'result': a.measured_value,
                'expected': a.normal_range,
                'meaning': a.description,
                'unit': a.unit,
                'recommendation': a.recommendation,
            } for a in existing_alerts]
            
            return Response({
                'status': 'analyzed',
                'analysis_summary': report.analysis_summary or f"This report contains {len(abnormal_values)} abnormal value(s).",
                'abnormal_values': abnormal_values,
                'recommendations': list(set([a.recommendation for a in existing_alerts if a.recommendation])),
            })
        
        azure_services = AzureServices()
        
        # Get OCR text if not available
        ocr_text = report.ocr_raw_text
        if not ocr_text and report.file_url:
            try:
                ocr_result = azure_services.extract_text(report.file_url)
                ocr_text = ocr_result.get('text', '')
                report.ocr_raw_text = ocr_text
                report.ocr_confidence = ocr_result.get('confidence')
                report.save()
            except Exception as e:
                logger.error(f"OCR failed: {e}")
        
        if not ocr_text:
            return Response({'error': 'Could not extract text from report'}, status=400)
        
        # Analyze using Azure OpenAI
        try:
            logger.info(f"Starting analysis for report {report_id}")
            logger.info(f"OCR text length: {len(ocr_text)}")
            
            analysis = azure_services.analyze_lab_report(ocr_text, report.report_type)
            
            logger.info(f"Analysis result - Summary: {analysis.get('summary', '')[:100]}")
            logger.info(f"Analysis result - Abnormal values count: {len(analysis.get('abnormal_values', []))}")
            
            # Store summary
            report.analysis_summary = analysis.get('summary', '')
            report.parsed_data = analysis.get('parsed_data', {})
            
            # Create CriticalValueAlert records from abnormal values
            abnormal_values = analysis.get('abnormal_values', [])
            has_critical = False
            
            # Clear existing alerts first
            CriticalValueAlert.objects.filter(lab_report=report).delete()
            
            for av in abnormal_values:
                logger.info(f"Processing abnormal value: {av}")
                # Map severity from analyze_lab_report format to CriticalValueAlert format
                severity_map = {
                    'mild': 'abnormal',
                    'moderate': 'abnormal', 
                    'significant': 'critical_high',
                    'critical': 'panic',
                    'abnormal': 'abnormal',
                    'critical_low': 'critical_low',
                    'critical_high': 'critical_high',
                    'panic': 'panic',
                    'low': 'critical_low',
                    'high': 'critical_high',
                }
                raw_severity = str(av.get('severity', 'abnormal')).lower()
                severity = severity_map.get(raw_severity, 'abnormal')
                
                if severity in ['critical_low', 'critical_high', 'panic']:
                    has_critical = True
                
                CriticalValueAlert.objects.create(
                    lab_report=report,
                    test_name=av.get('test_name', 'Unknown Test'),
                    measured_value=av.get('result', av.get('measured_value', '')),
                    unit=av.get('unit', ''),
                    normal_range=av.get('expected', av.get('normal_range', '')),
                    severity=severity,
                    description=av.get('meaning', av.get('description', '')),
                    recommendation=av.get('recommendation', '')
                )
            
            report.has_critical_values = has_critical
            report.abnormal_values = [av.get('test_name', '') for av in abnormal_values]
            report.recommendations = analysis.get('recommendations', [])
            report.status = 'analyzed'
            report.save()
            
            # Format response
            formatted_abnormal = [{
                'test_name': av.get('test_name', 'Unknown Test'),
                'severity': av.get('severity', 'abnormal'),
                'result': av.get('result', av.get('measured_value', '')),
                'expected': av.get('expected', av.get('normal_range', '')),
                'meaning': av.get('meaning', av.get('description', '')),
                'unit': av.get('unit', ''),
                'recommendation': av.get('recommendation', ''),
            } for av in abnormal_values]
            
            return Response({
                'status': 'analyzed',
                'analysis_summary': report.analysis_summary,
                'abnormal_values': formatted_abnormal,
                'recommendations': report.recommendations,
            })
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return Response({'error': 'Analysis failed. Please try again.'}, status=500)