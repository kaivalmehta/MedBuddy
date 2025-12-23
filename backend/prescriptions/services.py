# backend/prescriptions/services.py
import os
import json
import uuid
import requests
import time
from datetime import datetime
from django.conf import settings
from azure.storage.blob import BlobServiceClient, ContentSettings
from openai import AzureOpenAI
import logging

logger = logging.getLogger(__name__)


class AzureServices:
    """
    Centralized Azure service integration for MedBuddy.
    Handles Blob Storage, AI Vision (OCR), and OpenAI (GPT-4o) operations.
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