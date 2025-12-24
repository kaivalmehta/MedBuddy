# backend/prescriptions/report_views.py
# CREATE this new file

from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import LabReport
from .services import AzureServices
import logging

logger = logging.getLogger(__name__)


class LabReportListView(generics.ListAPIView):
    """List all lab reports for the authenticated patient"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return LabReport.objects.filter(
            user=self.request.user,
            is_duplicate=False
        ).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        return Response({
            'count': queryset.count(),
            'reports': [{
                'id': str(r.id),
                'report_type': r.report_type,
                'report_type_display': r.get_report_type_display(),
                'report_title': r.report_title,
                'report_date': r.report_date,
                'laboratory_name': r.laboratory_name,
                'referring_doctor': r.referring_doctor,
                'source': r.source,
                'status': r.status,
                'file_url': r.file_url,
                'created_at': r.created_at
            } for r in queryset]
        })


class LabReportUploadView(views.APIView):
    """Patient uploads their own lab report"""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        file = request.FILES.get('file')
        report_type = request.data.get('report_type', 'other')
        report_title = request.data.get('report_title', 'Lab Report')
        laboratory_name = request.data.get('laboratory_name', '')
        referring_doctor = request.data.get('referring_doctor', '')
        report_date = request.data.get('report_date')
        
        if not file:
            return Response({'error': 'Report file is required'}, status=400)
        
        # Validate file
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response({'error': 'Invalid file type. Use JPG, PNG, or PDF'}, status=400)
        
        # Upload to Azure
        azure_svc = AzureServices()
        blob_name, blob_url = azure_svc.upload_prescription(file, str(request.user.id))
        
        # Create report
        report = LabReport.objects.create(
            user=request.user,
            source='self',
            report_type=report_type,
            report_title=report_title,
            report_date=report_date if report_date else None,
            laboratory_name=laboratory_name,
            referring_doctor=referring_doctor,
            file_url=blob_url,
            blob_name=blob_name,
            file_type='pdf' if file.content_type == 'application/pdf' else 'image',
            status='uploaded'
        )
        
        # Try OCR
        try:
            ocr_result = azure_svc.extract_text(blob_url)
            report.ocr_raw_text = ocr_result.get('text', '')
            report.ocr_confidence = ocr_result.get('confidence', 0)
            report.save()
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
        
        # Check for duplicates
        report.content_hash = report.generate_content_hash()
        report.check_and_mark_duplicate()
        report.save()
        
        return Response({
            'message': 'Report uploaded successfully',
            'report_id': str(report.id),
            'is_duplicate': report.is_duplicate,
            'ocr_success': bool(report.ocr_raw_text)
        }, status=201)


class LabReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a specific lab report"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return LabReport.objects.filter(user=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        report = self.get_object()
        
        return Response({
            'id': str(report.id),
            'report_type': report.report_type,
            'report_type_display': report.get_report_type_display(),
            'report_title': report.report_title,
            'report_date': report.report_date,
            'laboratory_name': report.laboratory_name,
            'referring_doctor': report.referring_doctor,
            'source': report.source,
            'source_display': report.get_source_display(),
            'sent_by': report.sent_by.email if report.sent_by else None,
            'file_url': report.file_url,
            'file_type': report.file_type,
            'ocr_raw_text': report.ocr_raw_text,
            'ocr_confidence': report.ocr_confidence,
            'parsed_data': report.parsed_data,
            'analysis_summary': report.analysis_summary,
            'abnormal_values': report.abnormal_values,
            'recommendations': report.recommendations,
            'status': report.status,
            'notes': report.notes,
            'is_duplicate': report.is_duplicate,
            'created_at': report.created_at,
            'updated_at': report.updated_at
        })


class LabReportAnalyzeView(views.APIView):
    """Analyze a lab report using AI"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        report = get_object_or_404(LabReport, pk=pk, user=request.user)
        azure_svc = AzureServices()
        
        # Run OCR if needed
        if not report.ocr_raw_text:
            try:
                ocr_result = azure_svc.extract_text(report.file_url)
                report.ocr_raw_text = ocr_result.get('text', '')
                report.ocr_confidence = ocr_result.get('confidence', 0)
                report.save()
            except Exception as e:
                logger.error(f"OCR failed: {e}")
        
        if not report.ocr_raw_text:
            return Response({
                'error': 'Could not extract text from report image'
            }, status=400)
        
        # Use AI to analyze the report
        try:
            analysis = azure_svc.analyze_lab_report(report.ocr_raw_text, report.report_type)
            
            report.parsed_data = analysis.get('parsed_data', {})
            report.analysis_summary = analysis.get('summary', '')
            report.abnormal_values = analysis.get('abnormal_values', [])
            report.recommendations = analysis.get('recommendations', [])
            report.status = 'analyzed'
            report.save()
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return Response({'error': 'Analysis failed'}, status=500)
        
        return Response({
            'message': 'Report analyzed successfully',
            'analysis_summary': report.analysis_summary,
            'abnormal_values': report.abnormal_values,
            'recommendations': report.recommendations
        })


class LabReportHistoryView(generics.ListAPIView):
    """Get lab report history with filtering"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        queryset = LabReport.objects.filter(
            user=request.user,
            is_duplicate=False
        )
        
        # Filters
        report_type = request.query_params.get('type')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        source = request.query_params.get('source')
        
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        if start_date:
            queryset = queryset.filter(report_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(report_date__lte=end_date)
        if source:
            queryset = queryset.filter(source=source)
        
        queryset = queryset.order_by('-created_at')
        
        return Response({
            'count': queryset.count(),
            'reports': [{
                'id': str(r.id),
                'report_type': r.report_type,
                'report_type_display': r.get_report_type_display(),
                'report_title': r.report_title,
                'report_date': r.report_date,
                'laboratory_name': r.laboratory_name,
                'source': r.source,
                'status': r.status,
                'has_abnormal_values': len(r.abnormal_values) > 0 if r.abnormal_values else False,
                'created_at': r.created_at
            } for r in queryset]
        })