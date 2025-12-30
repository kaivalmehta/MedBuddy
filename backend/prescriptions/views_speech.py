# backend/prescriptions/views_speech.py
# Azure Speech Services API endpoints for text-to-speech and speech-to-text

from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404

from .models import Prescription, LabReport
from .services import AzureServices
import logging

logger = logging.getLogger(__name__)


class PrescriptionTextToSpeechView(views.APIView):
    """
    Convert prescription details to speech audio.
    Helps visually impaired patients hear their prescription.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, prescription_id):
        """
        Generate audio for a prescription.
        
        Request body (optional):
            voice: Voice to use (default: en-US-JennyNeural)
            language: Language (default: en-US)
        
        Returns:
            audio: Base64 encoded audio
            content_type: audio/mpeg
        """
        try:
            prescription = get_object_or_404(
                Prescription.objects.select_related('user', 'sent_by'),
                pk=prescription_id
            )
            
            # Check permission - patient (user), doctor who sent it, or pharmacy/lab with access
            user = request.user
            if not (prescription.user == user or 
                    prescription.sent_by == user or
                    user.role in ['admin', 'pharmacy', 'laboratory']):
                return Response(
                    {'error': 'You do not have permission to access this prescription'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Build prescription data for speech
            # Get medications from related PrescriptionDrug model
            medications_list = []
            for drug in prescription.drugs.all():
                medications_list.append({
                    'name': drug.drug_name,
                    'dosage': drug.dosage,
                    'frequency': drug.frequency,
                    'duration': drug.duration,
                    'instructions': drug.instructions,
                })

            # Build prescription data for speech
            prescription_data = {
                'doctor_name': prescription.sent_by.get_full_name() if prescription.sent_by else (prescription.doctor_name or 'Unknown'),
                'date': prescription.created_at.strftime('%B %d, %Y') if prescription.created_at else None,
                'diagnosis': prescription.parsed_data.get('diagnosis', '') if prescription.parsed_data else '',
                'medications': medications_list,
                'instructions': prescription.notes or '',
                'safety_score': prescription.overall_safety_percentage,
            }
                        
            # Get voice preference
            voice = request.data.get('voice', 'en-US-JennyNeural')
            
            # Generate speech text
            azure_svc = AzureServices()
            speech_text = azure_svc.generate_prescription_speech_text(prescription_data)
            
            # Convert to audio
            audio_base64, content_type = azure_svc.text_to_speech(speech_text, voice=voice)
            
            logger.info(f"Generated speech for prescription {prescription_id} for user {user.email}")
            
            return Response({
                'audio': audio_base64,
                'content_type': content_type,
                'text': speech_text,  # Also return text for accessibility
                'prescription_id': str(prescription_id)
            })
            
        except ValueError as e:
            logger.error(f"Speech configuration error: {e}")
            return Response(
                {'error': 'Speech service not configured. Please contact support.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Error generating prescription speech: {e}")
            return Response(
                {'error': 'Failed to generate audio. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LabReportTextToSpeechView(views.APIView):
    """
    Convert lab report details to speech audio.
    Helps visually impaired patients hear their lab results.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, report_id):
        """
        Generate audio for a lab report.
        
        Request body (optional):
            voice: Voice to use (default: en-US-JennyNeural)
        
        Returns:
            audio: Base64 encoded audio
            content_type: audio/mpeg
        """
        try:
            report = get_object_or_404(
                LabReport.objects.select_related('user', 'sent_by'),
                pk=report_id
            )
            
            # Check permission
            user = request.user
            if not (report.user == user or 
                    report.sent_by == user or
                    user.role in ['admin', 'laboratory']):
                return Response(
                    {'error': 'You do not have permission to access this report'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Build report data for speech - handle different data types
            abnormal = getattr(report, 'abnormal_values', None)
            if abnormal is None:
                abnormal = []
            elif isinstance(abnormal, str):
                # If it's a string, wrap it in a list
                abnormal = [abnormal] if abnormal else []
            elif not isinstance(abnormal, list):
                abnormal = []
            
            recommendations = getattr(report, 'recommendations', '')
            if recommendations is None:
                recommendations = ''
            elif isinstance(recommendations, list):
                recommendations = '. '.join(recommendations)
            
            report_data = {
                'report_type': report.report_type or '',
                'test_date': report.report_date.strftime('%B %d, %Y') if report.report_date else None,
                'laboratory_name': getattr(report, 'laboratory_name', '') or '',
                'analysis_summary': getattr(report, 'analysis_summary', '') or '',
                'abnormal_values': abnormal,
                'recommendations': recommendations,
            }
            
            # Get voice preference
            voice = request.data.get('voice', 'en-US-JennyNeural')
            
            # Generate speech text
            azure_svc = AzureServices()
            speech_text = azure_svc.generate_lab_report_speech_text(report_data)
            
            # Convert to audio
            audio_base64, content_type = azure_svc.text_to_speech(speech_text, voice=voice)
            
            logger.info(f"Generated speech for lab report {report_id} for user {user.email}")
            
            return Response({
                'audio': audio_base64,
                'content_type': content_type,
                'text': speech_text,
                'report_id': str(report_id)
            })
            
        except ValueError as e:
            logger.error(f"Speech configuration error: {e}")
            return Response(
                {'error': 'Speech service not configured. Please contact support.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Error generating lab report speech: {e}")
            return Response(
                {'error': 'Failed to generate audio. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomTextToSpeechView(views.APIView):
    """
    Convert any custom text to speech.
    Useful for reading instructions, notes, etc.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Generate audio for custom text.
        
        Request body:
            text: Text to convert (required, max 5000 chars)
            voice: Voice to use (default: en-US-JennyNeural)
        
        Returns:
            audio: Base64 encoded audio
            content_type: audio/mpeg
        """
        text = request.data.get('text', '').strip()
        
        if not text:
            return Response(
                {'error': 'Text is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(text) > 5000:
            return Response(
                {'error': 'Text too long. Maximum 5000 characters allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        voice = request.data.get('voice', 'en-US-JennyNeural')
        
        try:
            azure_svc = AzureServices()
            audio_base64, content_type = azure_svc.text_to_speech(text, voice=voice)
            
            logger.info(f"Generated custom speech for user {request.user.email}")
            
            return Response({
                'audio': audio_base64,
                'content_type': content_type,
                'text_length': len(text)
            })
            
        except ValueError as e:
            logger.error(f"Speech configuration error: {e}")
            return Response(
                {'error': 'Speech service not configured. Please contact support.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Error generating custom speech: {e}")
            return Response(
                {'error': 'Failed to generate audio. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SpeechToTextView(views.APIView):
    """
    Convert speech audio to text.
    Useful for doctors to dictate prescription notes.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """
        Transcribe audio to text.
        
        Request:
            audio: Audio file (WAV format, max 60 seconds)
            language: Language code (default: en-US)
        
        Returns:
            text: Transcribed text
            confidence: Confidence score (0-1)
        """
        audio_file = request.FILES.get('audio')
        
        if not audio_file:
            return Response(
                {'error': 'Audio file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check file size (max 10MB)
        if audio_file.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'Audio file too large. Maximum 10MB allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        language = request.data.get('language', 'en-US')
        
        try:
            audio_data = audio_file.read()
            
            azure_svc = AzureServices()
            result = azure_svc.speech_to_text(audio_data, language=language)
            
            logger.info(f"Transcribed speech for user {request.user.email}: {result.get('text', '')[:50]}...")
            
            return Response({
                'text': result.get('text', ''),
                'confidence': result.get('confidence', 0),
                'status': result.get('status', 'Success')
            })
            
        except ValueError as e:
            logger.error(f"Speech configuration error: {e}")
            return Response(
                {'error': 'Speech service not configured. Please contact support.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Error transcribing speech: {e}")
            return Response(
                {'error': 'Failed to transcribe audio. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AvailableVoicesView(views.APIView):
    """
    Get list of available voices for text-to-speech.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Returns list of available voices.
        """
        voices = [
            {'id': 'en-US-JennyNeural', 'name': 'Jenny', 'language': 'English (US)', 'gender': 'Female', 'style': 'Friendly'},
            {'id': 'en-US-GuyNeural', 'name': 'Guy', 'language': 'English (US)', 'gender': 'Male', 'style': 'Professional'},
            {'id': 'en-US-AriaNeural', 'name': 'Aria', 'language': 'English (US)', 'gender': 'Female', 'style': 'Conversational'},
            {'id': 'en-US-DavisNeural', 'name': 'Davis', 'language': 'English (US)', 'gender': 'Male', 'style': 'Calm'},
            {'id': 'en-GB-SoniaNeural', 'name': 'Sonia', 'language': 'English (UK)', 'gender': 'Female', 'style': 'Professional'},
            {'id': 'en-GB-RyanNeural', 'name': 'Ryan', 'language': 'English (UK)', 'gender': 'Male', 'style': 'Friendly'},
            {'id': 'en-IN-NeerjaNeural', 'name': 'Neerja', 'language': 'English (India)', 'gender': 'Female', 'style': 'Professional'},
            {'id': 'en-IN-PrabhatNeural', 'name': 'Prabhat', 'language': 'English (India)', 'gender': 'Male', 'style': 'Professional'},
            {'id': 'hi-IN-SwaraNeural', 'name': 'Swara', 'language': 'Hindi', 'gender': 'Female', 'style': 'Friendly'},
            {'id': 'hi-IN-MadhurNeural', 'name': 'Madhur', 'language': 'Hindi', 'gender': 'Male', 'style': 'Professional'},
        ]
        
        return Response({'voices': voices})