# backend/prescriptions/views_translator.py
"""
Translation API Views for MedBuddy
Provides endpoints for translating prescriptions, lab reports, and UI content
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .azure_translator_service import translator_service
from .models import Prescription, LabReport, PrescriptionDrug

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_supported_languages(request):
    """
    Get list of all supported languages for translation.
    
    Returns comprehensive list with language codes, names, native names, and text direction.
    """
    try:
        languages = translator_service.get_supported_languages()
        return Response({
            'success': True,
            **languages
        })
    except Exception as e:
        logger.error(f"Error getting supported languages: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def detect_language(request):
    """
    Detect the language of provided text.
    
    Request body:
    {
        "text": "Text to detect language for"
    }
    """
    text = request.data.get('text', '')
    
    if not text:
        return Response({
            'success': False,
            'error': 'Text is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        result = translator_service.detect_language(text)
        if result and 'error' not in result:
            return Response({
                'success': True,
                **result
            })
        return Response({
            'success': False,
            'error': result.get('error', 'Detection failed')
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Language detection error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def translate_text(request):
    """
    Translate text to target language.
    
    Request body:
    {
        "text": "Text to translate" or ["Text 1", "Text 2"],
        "target_language": "es",
        "source_language": "en" (optional, auto-detect if not provided),
        "is_healthcare": true (optional, default true)
    }
    """
    text = request.data.get('text')
    target_language = request.data.get('target_language')
    source_language = request.data.get('source_language')
    is_healthcare = request.data.get('is_healthcare', True)
    
    if not text:
        return Response({
            'success': False,
            'error': 'Text is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not target_language:
        return Response({
            'success': False,
            'error': 'Target language is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        result = translator_service.translate_text(
            text=text,
            target_language=target_language,
            source_language=source_language,
            is_healthcare=is_healthcare
        )
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def translate_prescription(request, prescription_id):
    """
    Translate a prescription to the target language.
    
    URL: /api/translate/prescription/<prescription_id>/
    
    Request body:
    {
        "target_language": "es"
    }
    """
    target_language = request.data.get('target_language')
    
    if not target_language:
        return Response({
            'success': False,
            'error': 'Target language is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get prescription (ensure user owns it)
        prescription = get_object_or_404(
            Prescription,
            id=prescription_id,
            user=request.user
        )
        
        # Prepare prescription data for translation
        prescription_data = {
            'id': str(prescription.id),
            'ocr_raw_text': prescription.ocr_raw_text,
            'safety_summary': prescription.safety_summary,
            'doctor_name': prescription.doctor_name,
            'clinic_name': prescription.clinic_name,
            'notes': prescription.notes,
            'parsed_data': prescription.parsed_data or {},
            'safety_report': prescription.safety_report or {}
        }
        
        # Translate prescription
        result = translator_service.translate_prescription(prescription_data, target_language)
        
        if result['success']:
            # Also translate drugs
            drugs_translated = []
            for drug in prescription.drugs.all():
                drug_data = {
                    'id': str(drug.id),
                    'drug_name': drug.drug_name,
                    'generic_name': drug.generic_name,
                    'dosage': drug.dosage,
                    'frequency': drug.frequency,
                    'duration': drug.duration,
                    'instructions': drug.instructions,
                    'primary_use': drug.primary_use,
                    'mechanism': drug.mechanism,
                    'special_instructions': drug.special_instructions,
                    'common_side_effects': drug.common_side_effects or [],
                    'generic_alternatives': drug.generic_alternatives or [],
                    'safety_concerns': drug.safety_concerns or []
                }
                
                drug_result = translator_service.translate_drug_info(drug_data, target_language)
                if drug_result['success']:
                    drugs_translated.append(drug_result['translated_drug'])
                else:
                    drugs_translated.append(drug_data)
            
            result['translated_drugs'] = drugs_translated
            
            # Translate safety report if exists
            if prescription.safety_report:
                safety_result = translator_service.translate_safety_report(
                    prescription.safety_report,
                    target_language
                )
                if safety_result['success']:
                    result['translated_safety_report'] = safety_result['translated_safety']
            
            return Response(result)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Prescription.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Prescription not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Prescription translation error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def translate_lab_report(request, report_id):
    """
    Translate a lab report to the target language.
    
    URL: /api/translate/lab-report/<report_id>/
    
    Request body:
    {
        "target_language": "hi"
    }
    """
    target_language = request.data.get('target_language')
    
    if not target_language:
        return Response({
            'success': False,
            'error': 'Target language is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get lab report (ensure user owns it)
        lab_report = get_object_or_404(
            LabReport,
            id=report_id,
            patient=request.user
        )
        
        # Prepare report data for translation
        report_data = {
            'id': str(lab_report.id),
            'report_type': lab_report.report_type,
            'summary': lab_report.summary,
            'clinical_notes': lab_report.clinical_notes,
            'interpretation': lab_report.interpretation,
            'recommendations': lab_report.recommendations,
            'results': lab_report.results or []
        }
        
        # Translate report
        result = translator_service.translate_lab_report(report_data, target_language)
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except LabReport.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Lab report not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Lab report translation error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def translate_drug(request, drug_id):
    """
    Translate drug information to the target language.
    
    URL: /api/translate/drug/<drug_id>/
    
    Request body:
    {
        "target_language": "zh-Hans"
    }
    """
    target_language = request.data.get('target_language')
    
    if not target_language:
        return Response({
            'success': False,
            'error': 'Target language is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get drug (ensure user owns the prescription)
        drug = get_object_or_404(
            PrescriptionDrug,
            id=drug_id,
            prescription__user=request.user
        )
        
        # Prepare drug data for translation
        drug_data = {
            'id': str(drug.id),
            'drug_name': drug.drug_name,
            'generic_name': drug.generic_name,
            'dosage': drug.dosage,
            'frequency': drug.frequency,
            'duration': drug.duration,
            'instructions': drug.instructions,
            'primary_use': drug.primary_use,
            'mechanism': drug.mechanism,
            'special_instructions': drug.special_instructions,
            'common_side_effects': drug.common_side_effects or [],
            'generic_alternatives': drug.generic_alternatives or [],
            'safety_concerns': drug.safety_concerns or []
        }
        
        # Translate drug info
        result = translator_service.translate_drug_info(drug_data, target_language)
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except PrescriptionDrug.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Drug not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Drug translation error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_ui_translations(request, language_code):
    """
    Get UI translations for a specific language.
    
    URL: /api/translate/ui/<language_code>/
    
    Returns common UI strings translated to the specified language.
    """
    try:
        result = translator_service.get_ui_translations(language_code)
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"UI translation error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def translate_batch(request):
    """
    Batch translate multiple texts to multiple languages.
    
    Request body:
    {
        "texts": ["Text 1", "Text 2"],
        "target_languages": ["es", "fr", "hi"],
        "source_language": "en" (optional)
    }
    """
    texts = request.data.get('texts', [])
    target_languages = request.data.get('target_languages', [])
    source_language = request.data.get('source_language')
    
    if not texts:
        return Response({
            'success': False,
            'error': 'Texts are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not target_languages:
        return Response({
            'success': False,
            'error': 'Target languages are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        results = {}
        
        for lang in target_languages:
            result = translator_service.translate_text(
                text=texts,
                target_language=lang,
                source_language=source_language,
                is_healthcare=True
            )
            results[lang] = result
        
        return Response({
            'success': True,
            'translations': results,
            'source_texts': texts,
            'target_languages': target_languages
        })
        
    except Exception as e:
        logger.error(f"Batch translation error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def translate_safety_report(request, prescription_id):
    """
    Translate safety report for a prescription.
    
    URL: /api/translate/safety-report/<prescription_id>/
    
    Request body:
    {
        "target_language": "es"
    }
    """
    target_language = request.data.get('target_language')
    
    if not target_language:
        return Response({
            'success': False,
            'error': 'Target language is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        prescription = get_object_or_404(
            Prescription,
            id=prescription_id,
            user=request.user
        )
        
        if not prescription.safety_report:
            return Response({
                'success': False,
                'error': 'No safety report available for this prescription'
            }, status=status.HTTP_404_NOT_FOUND)
        
        result = translator_service.translate_safety_report(
            prescription.safety_report,
            target_language
        )
        
        if result['success']:
            return Response(result)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Prescription.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Prescription not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Safety report translation error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
