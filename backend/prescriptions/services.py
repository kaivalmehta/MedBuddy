# backend/prescriptions/services.py
import os
import json
import uuid
import requests
import time
import base64
from datetime import datetime
from django.conf import settings
from azure.storage.blob import BlobServiceClient, ContentSettings
from openai import AzureOpenAI
import logging

logger = logging.getLogger(__name__)


class AzureServices:
    """
    Centralized Azure service integration for MedBuddy.
    Handles Blob Storage, AI Vision (OCR), OpenAI (GPT-4o), and Speech operations.
    """
    
    def __init__(self):
        self.blob_service = BlobServiceClient.from_connection_string(
            settings.AZURE_STORAGE_CONNECTION_STRING
        )
        self.container_name = settings.AZURE_STORAGE_CONTAINER_NAME
        self.vision_endpoint = settings.AZURE_VISION_ENDPOINT
        self.vision_key = settings.AZURE_VISION_KEY
        self.openai_client = AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_KEY,
            api_version="2024-02-15-preview"
        )
        self.deployment = settings.AZURE_OPENAI_DEPLOYMENT
        
        # Azure Speech Services
        self.speech_key = getattr(settings, 'AZURE_SPEECH_KEY', None)
        self.speech_region = getattr(settings, 'AZURE_SPEECH_REGION', 'eastus')
    
    # ============================================
    # AZURE SPEECH SERVICES - Text-to-Speech & Speech-to-Text
    # ============================================
    
    def text_to_speech(self, text, voice='en-US-JennyNeural', output_format='audio-16khz-128kbitrate-mono-mp3'):
        """
        Convert text to speech using Azure Speech Services.
        
        Args:
            text: Text to convert to speech
            voice: Voice to use (default: en-US-JennyNeural - friendly female voice)
                   Other options: en-US-GuyNeural, en-US-AriaNeural, en-IN-NeerjaNeural (Indian English)
            output_format: Audio format (default: mp3)
        
        Returns:
            tuple: (audio_data as base64 string, content_type)
        """
        if not self.speech_key:
            raise ValueError("Azure Speech Key not configured")
        
        # Azure Speech REST API endpoint
        endpoint = f"https://{self.speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.speech_key,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': output_format,
            'User-Agent': 'MedBuddy'
        }
        
        # SSML for better speech control
        ssml = f"""
        <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
            <voice name='{voice}'>
                <prosody rate='0.95' pitch='0%'>
                    {self._escape_ssml(text)}
                </prosody>
            </voice>
        </speak>
        """
        
        try:
            response = requests.post(endpoint, headers=headers, data=ssml.encode('utf-8'))
            
            if response.status_code == 200:
                audio_base64 = base64.b64encode(response.content).decode('utf-8')
                logger.info(f"Text-to-speech successful, generated {len(response.content)} bytes")
                return audio_base64, 'audio/mpeg'
            else:
                logger.error(f"Text-to-speech failed: {response.status_code} - {response.text}")
                raise Exception(f"Speech synthesis failed: {response.status_code}")
                
        except requests.RequestException as e:
            logger.error(f"Text-to-speech request error: {e}")
            raise
    
    def _escape_ssml(self, text):
        """Escape special characters for SSML."""
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')
        text = text.replace('"', '&quot;')
        text = text.replace("'", '&apos;')
        return text
    
    def speech_to_text(self, audio_data, language='en-US'):
        """
        Convert speech to text using Azure Speech Services.
        
        Args:
            audio_data: Audio file bytes (WAV format preferred)
            language: Language code (default: en-US)
        
        Returns:
            dict: {text: transcribed text, confidence: confidence score}
        """
        if not self.speech_key:
            raise ValueError("Azure Speech Key not configured")
        
        # Azure Speech REST API endpoint for speech-to-text
        endpoint = f"https://{self.speech_region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
        
        params = {
            'language': language,
            'format': 'detailed'
        }
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.speech_key,
            'Content-Type': 'audio/wav',
            'Accept': 'application/json'
        }
        
        try:
            response = requests.post(endpoint, params=params, headers=headers, data=audio_data)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get('RecognitionStatus') == 'Success':
                    # Get the best result
                    nbest = result.get('NBest', [])
                    if nbest:
                        best = nbest[0]
                        logger.info(f"Speech-to-text successful: {best.get('Display', '')[:50]}...")
                        return {
                            'text': best.get('Display', ''),
                            'confidence': best.get('Confidence', 0),
                            'lexical': best.get('Lexical', ''),
                            'itn': best.get('ITN', '')
                        }
                    return {'text': result.get('DisplayText', ''), 'confidence': 1.0}
                else:
                    logger.warning(f"Speech recognition status: {result.get('RecognitionStatus')}")
                    return {'text': '', 'confidence': 0, 'status': result.get('RecognitionStatus')}
            else:
                logger.error(f"Speech-to-text failed: {response.status_code} - {response.text}")
                raise Exception(f"Speech recognition failed: {response.status_code}")
                
        except requests.RequestException as e:
            logger.error(f"Speech-to-text request error: {e}")
            raise
    
    def generate_prescription_speech_text(self, prescription_data):
        """
        Generate a patient-friendly text for prescription to be read aloud.
        
        Args:
            prescription_data: Dict containing prescription details
        
        Returns:
            str: Formatted text optimized for speech
        """
        lines = []
        
        # Header
        if prescription_data.get('doctor_name'):
            lines.append(f"This prescription is from Doctor {prescription_data['doctor_name']}.")
        
        if prescription_data.get('date'):
            lines.append(f"Prescribed on {prescription_data['date']}.")
        
        # Diagnosis
        if prescription_data.get('diagnosis'):
            lines.append(f"Diagnosis: {prescription_data['diagnosis']}.")
        
        # Medications
        medications = prescription_data.get('medications', [])
        if medications:
            lines.append(f"You have been prescribed {len(medications)} medication{'s' if len(medications) > 1 else ''}.")
            
            for i, med in enumerate(medications, 1):
                med_text = f"Medication {i}: {med.get('name', 'Unknown')}."
                
                if med.get('dosage'):
                    med_text += f" Dosage: {med['dosage']}."
                
                if med.get('frequency'):
                    med_text += f" Take it {med['frequency']}."
                
                if med.get('duration'):
                    med_text += f" For {med['duration']}."
                
                if med.get('instructions'):
                    med_text += f" Special instructions: {med['instructions']}."
                
                lines.append(med_text)
        
        # Instructions
        if prescription_data.get('instructions'):
            lines.append(f"Additional instructions: {prescription_data['instructions']}.")
        
        # Safety warning
        if prescription_data.get('safety_score') and prescription_data['safety_score'] < 70:
            lines.append("Important: This prescription has potential drug interactions. Please consult your doctor or pharmacist.")
        
        # Footer
        lines.append("Please take your medications as prescribed and consult your doctor if you experience any side effects.")
        
        return ' '.join(lines)
    
    def generate_lab_report_speech_text(self, report_data):
        """
        Generate a patient-friendly text for lab report to be read aloud.
        
        Args:
            report_data: Dict containing lab report details
        
        Returns:
            str: Formatted text optimized for speech
        """
        lines = []
        
        # Header
        lines.append(f"Lab Report Summary.")
        
        if report_data.get('report_type'):
            lines.append(f"This is a {report_data['report_type'].replace('_', ' ')} report.")
        
        if report_data.get('test_date'):
            lines.append(f"Test conducted on {report_data['test_date']}.")
        
        if report_data.get('laboratory_name'):
            lines.append(f"Performed at {report_data['laboratory_name']}.")
        
        # Analysis summary
        if report_data.get('analysis_summary'):
            lines.append(f"Summary: {report_data['analysis_summary']}.")
        
        # Abnormal values
        abnormal = report_data.get('abnormal_values', [])
        if abnormal:
            lines.append(f"Attention: {len(abnormal)} value{'s are' if len(abnormal) > 1 else ' is'} outside the normal range.")
            
            for item in abnormal[:5]:  # Limit to 5 for brevity
                lines.append(f"{item.get('parameter', 'Unknown')}: {item.get('value', '')} {item.get('unit', '')}. "
                           f"Normal range is {item.get('normal_range', 'not specified')}. "
                           f"This is {item.get('status', 'abnormal')}.")
        else:
            lines.append("Good news: All your values are within normal range.")
        
        # Recommendations
        if report_data.get('recommendations'):
            lines.append(f"Recommendations: {report_data['recommendations']}.")
        
        # Footer
        lines.append("Please discuss these results with your doctor for a complete understanding.")
        
        return ' '.join(lines)
    
    def upload_prescription(self, file, user_id):
        """Upload prescription image/PDF to Azure Blob Storage."""
        ext = file.name.split('.')[-1].lower()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        blob_name = f"users/{user_id}/prescriptions/{timestamp}_{uuid.uuid4().hex[:8]}.{ext}"
        
        container_client = self.blob_service.get_container_client(self.container_name)
        try:
            container_client.create_container()
        except Exception:
            pass
        
        content_type_map = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'png': 'image/png', 'pdf': 'application/pdf'
        }
        content_type = content_type_map.get(ext, 'application/octet-stream')
        
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.upload_blob(
            file.read(),
            content_settings=ContentSettings(content_type=content_type),
            overwrite=True
        )
        return blob_name, blob_client.url
    
    def upload_verification_document(self, file, role, identifier):
        """Upload verification document (license PDF) for professionals."""
        ext = file.name.split('.')[-1].lower()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        blob_name = f"verification/{role}/{identifier}_{timestamp}.{ext}"
        
        container_client = self.blob_service.get_container_client(self.container_name)
        try:
            container_client.create_container()
        except Exception:
            pass
        
        content_type_map = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'png': 'image/png', 'pdf': 'application/pdf'
        }
        content_type = content_type_map.get(ext, 'application/octet-stream')
        
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.upload_blob(
            file.read(),
            content_settings=ContentSettings(content_type=content_type),
            overwrite=True
        )
        return blob_name, blob_client.url
    
    def upload_lab_report(self, file_data, filename):
        """Upload lab report to Azure Blob Storage."""
        ext = filename.split('.')[-1].lower()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        blob_name = f"lab-reports/{timestamp}_{uuid.uuid4().hex[:8]}_{filename}"
        
        container_client = self.blob_service.get_container_client(self.container_name)
        try:
            container_client.create_container()
        except Exception:
            pass
        
        content_type_map = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'png': 'image/png', 'pdf': 'application/pdf'
        }
        content_type = content_type_map.get(ext, 'application/octet-stream')
        
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.upload_blob(
            file_data,
            content_settings=ContentSettings(content_type=content_type),
            overwrite=True
        )
        return blob_name, blob_client.url
    
    def extract_text(self, image_url):
        """Extract text using Azure Computer Vision Read API."""
        analyze_url = f"{self.vision_endpoint.rstrip('/')}/vision/v3.2/read/analyze"
        headers = {
            'Ocp-Apim-Subscription-Key': self.vision_key,
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(analyze_url, headers=headers, json={'url': image_url})
            response.raise_for_status()
            operation_url = response.headers.get('Operation-Location')
            
            if not operation_url:
                return {'text': '', 'confidence': 0.0}
            
            for _ in range(15):
                time.sleep(1)
                result = requests.get(operation_url, headers={
                    'Ocp-Apim-Subscription-Key': self.vision_key
                }).json()
                
                if result.get('status') == 'succeeded':
                    break
                elif result.get('status') == 'failed':
                    return {'text': '', 'confidence': 0.0}
            
            all_text, confidences = [], []
            for page in result.get('analyzeResult', {}).get('readResults', []):
                for line in page.get('lines', []):
                    all_text.append(line.get('text', ''))
                    for word in line.get('words', []):
                        if word.get('confidence'):
                            confidences.append(word['confidence'])
            
            return {
                'text': '\n'.join(all_text),
                'confidence': round(sum(confidences) / len(confidences), 4) if confidences else 0.0
            }
        except Exception as e:
            logger.error(f"OCR Error: {e}")
            return {'text': '', 'confidence': 0.0}
    
    def perform_ocr(self, file_data):
        """Perform OCR on file data (image bytes). Alias for extract_text but accepts bytes."""
        # Upload temp file and get URL, or process directly
        try:
            # For direct byte processing, we need to use a different endpoint
            analyze_url = f"{self.vision_endpoint.rstrip('/')}/vision/v3.2/read/analyze"
            headers = {
                'Ocp-Apim-Subscription-Key': self.vision_key,
                'Content-Type': 'application/octet-stream'
            }
            
            response = requests.post(analyze_url, headers=headers, data=file_data)
            response.raise_for_status()
            operation_url = response.headers.get('Operation-Location')
            
            if not operation_url:
                return {'text': '', 'confidence': 0.0}
            
            for _ in range(15):
                time.sleep(1)
                result = requests.get(operation_url, headers={
                    'Ocp-Apim-Subscription-Key': self.vision_key
                }).json()
                
                if result.get('status') == 'succeeded':
                    break
                elif result.get('status') == 'failed':
                    return {'text': '', 'confidence': 0.0}
            
            all_text, confidences = [], []
            for page in result.get('analyzeResult', {}).get('readResults', []):
                for line in page.get('lines', []):
                    all_text.append(line.get('text', ''))
                    for word in line.get('words', []):
                        if word.get('confidence'):
                            confidences.append(word['confidence'])
            
            return {
                'text': '\n'.join(all_text),
                'confidence': round(sum(confidences) / len(confidences), 4) if confidences else 0.0
            }
        except Exception as e:
            logger.error(f"OCR Error: {e}")
            return {'text': '', 'confidence': 0.0}

    def chat_completion(self, messages, temperature=0.1, max_tokens=3000):
        """Generic chat completion method for Azure OpenAI"""
        try:
            response = self.openai_client.chat.completions.create(
                model=self.deployment,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return {
                'content': response.choices[0].message.content,
                'finish_reason': response.choices[0].finish_reason
            }
        except Exception as e:
            logger.error(f"Chat completion error: {e}")
            return {'content': '[]', 'error': str(e)}

    def analyze_lab_report(self, ocr_text, report_type='other'):
        """
        Analyze lab report text and extract structured data.
        """
        if not ocr_text or not ocr_text.strip():
            return {
                'parsed_data': {},
                'summary': 'Unable to analyze report.',
                'abnormal_values': [],
                'recommendations': []
            }
        
        system_prompt = """You are a medical lab report analyzer. Your job is to carefully analyze lab reports and identify ALL abnormal values.

IMPORTANT: You MUST identify any value that falls outside the normal/reference range. Look for:
- Values marked as "LOW", "HIGH", "ABNORMAL", "L", "H", "*", or any flag
- Values outside the reference/normal range shown
- Any concerning findings mentioned in impressions or comments

Return a JSON object with this EXACT structure:
{
    "parsed_data": {
        "patient_name": "extracted name or null",
        "test_date": "YYYY-MM-DD or null",
        "tests": [
            {
                "test_name": "Test name",
                "result": "Value with unit",
                "reference_range": "Normal range",
                "status": "normal|low|high|critical",
                "flag": "any flag shown like LOW, HIGH, etc"
            }
        ]
    },
    "summary": "Brief 2-3 sentence summary of findings. Mention if there are abnormal values.",
    "abnormal_values": [
        {
            "test_name": "EXACT test name",
            "result": "The actual measured value with unit",
            "expected": "The normal/reference range",
            "severity": "mild|moderate|significant",
            "meaning": "Brief explanation of what this abnormality might indicate"
        }
    ],
    "recommendations": [
        "Specific recommendation based on findings"
    ]
}

CRITICAL RULES:
1. If a value is flagged as LOW, HIGH, ABNORMAL, or is outside reference range, it MUST be in abnormal_values
2. Include the actual numeric result and the expected range
3. For CBC reports: Check Hemoglobin, RBC, WBC, Platelets, etc against their ranges
4. Never return empty abnormal_values if there are clearly flagged abnormal results
5. severity should be "significant" if value is very far from normal range"""

        user_prompt = f"""Analyze this lab report carefully and identify ALL abnormal values:

{ocr_text}

Remember: Any value marked LOW, HIGH, or outside reference range MUST be included in abnormal_values array."""

        try:
            response = self.openai_client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                max_tokens=4000
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Ensure required fields exist
            result.setdefault('parsed_data', {})
            result.setdefault('summary', 'Analysis complete.')
            result.setdefault('abnormal_values', [])
            result.setdefault('recommendations', [])
            
            # Log what we found for debugging
            logger.info(f"Lab report analysis found {len(result.get('abnormal_values', []))} abnormal values")
            if result.get('abnormal_values'):
                logger.info(f"Abnormal values: {result['abnormal_values']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Lab Report Analysis Error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'parsed_data': {},
                'summary': 'Unable to analyze report. Please consult your doctor.',
                'abnormal_values': [],
                'recommendations': ['Please share this report with your healthcare provider.']
            }
    
    def parse_prescription(self, ocr_text):
        """Parse raw OCR text into structured prescription data."""
        if not ocr_text or not ocr_text.strip():
            return {"medications": [], "doctor_name": "", "clinic_name": "", "prescription_date": None}
        
        system_prompt = """You are a medical prescription parser. Extract structured information from prescription text.

Return a JSON object with this exact structure:
{
    "doctor_name": "string or empty",
    "clinic_name": "string or empty", 
    "prescription_date": "YYYY-MM-DD or null",
    "medications": [
        {
            "drug_name": "brand name",
            "generic_name": "generic/chemical name",
            "dosage": "e.g., 500mg",
            "frequency": "e.g., twice daily",
            "duration": "e.g., 7 days",
            "instructions": "special instructions",
            "category": "antibiotic|painkiller|antacid|antihistamine|antihypertensive|antidiabetic|vitamin|other",
            "primary_use": "what this drug treats in simple terms",
            "mechanism": "how it works in simple terms",
            "side_effects": ["effect1", "effect2"],
            "alternatives": ["generic alternative"]
        }
    ]
}

Use your medical knowledge to fill in details. Only return valid JSON."""

        try:
            response = self.openai_client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Parse this prescription:\n\n{ocr_text}"}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Parse Error: {e}")
            return {"medications": [], "doctor_name": "", "clinic_name": "", "prescription_date": None}
    
    def analyze_safety_comprehensive(self, drugs, health_profile):
        """
        Comprehensive safety analysis with detailed categorized interactions.
        Returns percentage-based safety with detailed reports.
        """
        if not drugs:
            return self._empty_safety_report()
        
        system_prompt = """You are an expert pharmaceutical safety analyst. Analyze drug safety comprehensively.

Return a JSON object with this EXACT structure:
{
    "overall_safety_percentage": 85,
    "safety_status": "safe|caution_needed|consultation_required|unsafe",
    "safety_summary": "Brief 1-2 sentence overall assessment",
    
    "drug_drug_interactions": [
        {
            "drug1": "Drug A name",
            "drug2": "Drug B name",
            "severity": "info|minor|moderate|severe|critical",
            "title": "Short title like 'Increased Bleeding Risk'",
            "description": "Detailed explanation of the interaction",
            "mechanism": "Why this interaction occurs",
            "effects": "What could happen",
            "recommendation": "What to do about it",
            "requires_immediate_attention": false,
            "consult_doctor": true
        }
    ],
    
    "drug_allergy_interactions": [
        {
            "drug": "Drug name",
            "allergy": "Allergy name",
            "severity": "info|minor|moderate|severe|critical",
            "title": "Short title",
            "description": "Why this is a concern",
            "cross_reactivity": "Related allergies to watch for",
            "symptoms_to_watch": ["symptom1", "symptom2"],
            "recommendation": "What to do",
            "requires_immediate_attention": true,
            "consult_doctor": true
        }
    ],
    
    "drug_disease_interactions": [
        {
            "drug": "Drug name",
            "condition": "Medical condition name",
            "severity": "info|minor|moderate|severe|critical",
            "title": "Short title",
            "description": "Why this drug is concerning with this condition",
            "risk": "What could go wrong",
            "recommendation": "What to do",
            "requires_monitoring": true,
            "consult_doctor": true
        }
    ],
    
    "drug_food_interactions": [
        {
            "drug": "Drug name",
            "food_or_drink": "Food/drink item",
            "severity": "info|minor|moderate|severe",
            "title": "Short title",
            "description": "Why to avoid this combination",
            "timing": "When to avoid (e.g., 'Avoid grapefruit while on this medication')",
            "recommendation": "What to do"
        }
    ],
    
    "pregnancy_warnings": [
        {
            "drug": "Drug name",
            "category": "A|B|C|D|X",
            "severity": "info|minor|moderate|severe|critical",
            "warning": "Pregnancy safety information",
            "recommendation": "What to do if pregnant or planning pregnancy"
        }
    ],
    
    "critical_alerts": [
        {
            "type": "allergy|interaction|contraindication",
            "title": "CRITICAL: Short alert title",
            "message": "Important warning message",
            "action_required": "Immediate action to take"
        }
    ],
    
    "safe_medications": [
        {
            "drug": "Drug name",
            "message": "This medication appears safe based on your profile",
            "general_advice": "Standard advice for taking this medication"
        }
    ],
    
    "recommendations": [
        "General recommendation 1",
        "General recommendation 2"
    ],
    
    "individual_drug_safety": [
        {
            "drug_name": "Drug name",
            "safety_percentage": 90,
            "safety_status": "safe|caution|warning|danger",
            "is_safe_to_take": true,
            "requires_monitoring": false,
            "concerns": ["concern1 if any"],
            "special_instructions": "Any special instructions for this drug"
        }
    ]
}

SEVERITY GUIDE:
- info: Educational information, no concern
- minor: Minor concern, usually safe to proceed
- moderate: Needs attention, may need adjustment
- severe: Significant risk, doctor consultation needed
- critical: Do NOT take without medical clearance

SAFETY STATUS GUIDE:
- safe: 80-100% - Safe to use as prescribed
- caution_needed: 60-79% - Can use but monitor closely
- consultation_required: 40-59% - Talk to doctor/pharmacist first
- unsafe: 0-39% - Do not take without medical advice

IMPORTANT:
- Be thorough but write in plain, patient-friendly language
- If something is SAFE, explicitly say so
- If there are NO interactions of a type, return empty array []
- Calculate overall_safety_percentage based on severity and count of issues
- Always include individual_drug_safety for EACH drug"""

        user_prompt = f"""Analyze safety for these medications:

PRESCRIBED MEDICATIONS:
{json.dumps(drugs, indent=2)}

PATIENT HEALTH PROFILE:
- Medical Conditions: {', '.join(health_profile.get('conditions', [])) or 'None reported'}
- Known Allergies: {', '.join(health_profile.get('allergies', [])) or 'None reported'}  
- Current Medications: {', '.join(health_profile.get('current_meds', [])) or 'None reported'}
- Lifestyle Factors: {json.dumps(health_profile.get('lifestyle', {}))}

Provide comprehensive safety analysis covering:
1. Drug-drug interactions (between prescribed meds AND with current meds)
2. Drug-allergy interactions (check cross-reactivity too)
3. Drug-disease/condition interactions
4. Drug-food interactions
5. Pregnancy warnings if applicable
6. Any critical alerts that need immediate attention
7. Which medications are safe (explicitly state if safe)
8. Individual safety assessment for each drug"""

        try:
            response = self.openai_client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                max_tokens=4000
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Validate and clamp percentage
            result['overall_safety_percentage'] = max(0, min(100, result.get('overall_safety_percentage', 75)))
            
            # Ensure all arrays exist
            for key in ['drug_drug_interactions', 'drug_allergy_interactions', 
                       'drug_disease_interactions', 'drug_food_interactions',
                       'pregnancy_warnings', 'critical_alerts', 'safe_medications',
                       'recommendations', 'individual_drug_safety']:
                if key not in result:
                    result[key] = []
            
            logger.info(f"Safety analysis complete: {result['overall_safety_percentage']}% safe")
            return result
            
        except Exception as e:
            logger.error(f"Safety Analysis Error: {e}")
            return self._empty_safety_report()
    
    def _empty_safety_report(self):
        """Return empty safety report structure."""
        return {
            'overall_safety_percentage': None,
            'safety_status': 'safe',
            'safety_summary': 'Unable to complete safety analysis. Please consult your pharmacist.',
            'drug_drug_interactions': [],
            'drug_allergy_interactions': [],
            'drug_disease_interactions': [],
            'drug_food_interactions': [],
            'pregnancy_warnings': [],
            'critical_alerts': [],
            'safe_medications': [],
            'recommendations': ['Please consult with your pharmacist or doctor about these medications.'],
            'individual_drug_safety': []
        }
    
    def translate_content(self, content, target_language):
        """Translate content to user's preferred language."""
        language_names = {
            'es': 'Spanish', 'hi': 'Hindi', 'zh': 'Chinese (Simplified)',
            'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
            'ar': 'Arabic', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean'
        }
        lang_name = language_names.get(target_language, target_language)
        
        try:
            response = self.openai_client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": f"Translate to {lang_name}. Keep medical terms accurate."},
                    {"role": "user", "content": content}
                ],
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Translation Error: {e}")
            return content

 