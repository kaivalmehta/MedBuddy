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
        # Azure Blob Storage client
        self.blob_service = BlobServiceClient.from_connection_string(
            settings.AZURE_STORAGE_CONNECTION_STRING
        )
        self.container_name = settings.AZURE_STORAGE_CONTAINER_NAME
        
        # Azure AI Vision credentials (using REST API directly)
        self.vision_endpoint = settings.AZURE_VISION_ENDPOINT
        self.vision_key = settings.AZURE_VISION_KEY
        
        # Azure OpenAI client
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
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'pdf': 'application/pdf'
        }
        content_type = content_type_map.get(ext, 'application/octet-stream')
        
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.upload_blob(
            file.read(),
            content_settings=ContentSettings(content_type=content_type),
            overwrite=True
        )
        
        blob_url = blob_client.url
        return blob_name, blob_url
    
    def extract_text(self, image_url):
        """
        Extract text from prescription image using Azure Computer Vision Read API.
        Uses REST API directly for compatibility.
        """
        analyze_url = f"{self.vision_endpoint.rstrip('/')}/vision/v3.2/read/analyze"
        
        headers = {
            'Ocp-Apim-Subscription-Key': self.vision_key,
            'Content-Type': 'application/json'
        }
        
        data = {'url': image_url}
        
        try:
            # Submit the image for analysis
            response = requests.post(analyze_url, headers=headers, json=data)
            response.raise_for_status()
            
            # Get the operation location for polling
            operation_url = response.headers.get('Operation-Location')
            
            if not operation_url:
                logger.error("No operation URL returned from Azure Vision")
                return {'text': '', 'confidence': 0.0}
            
            # Poll for results
            max_retries = 10
            retry_delay = 1
            
            for attempt in range(max_retries):
                time.sleep(retry_delay)
                result_response = requests.get(
                    operation_url,
                    headers={'Ocp-Apim-Subscription-Key': self.vision_key}
                )
                result = result_response.json()
                
                status = result.get('status')
                logger.info(f"OCR polling attempt {attempt + 1}: status={status}")
                
                if status == 'succeeded':
                    break
                elif status == 'failed':
                    logger.error("OCR analysis failed")
                    return {'text': '', 'confidence': 0.0}
            
            # Extract text from results
            all_text = []
            confidences = []
            
            read_results = result.get('analyzeResult', {}).get('readResults', [])
            
            for page in read_results:
                for line in page.get('lines', []):
                    all_text.append(line.get('text', ''))
                    for word in line.get('words', []):
                        conf = word.get('confidence', 0)
                        if conf:
                            confidences.append(conf)
            
            extracted_text = '\n'.join(all_text)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            logger.info(f"OCR extracted {len(all_text)} lines, confidence: {avg_confidence:.2f}")
            
            return {
                'text': extracted_text,
                'confidence': round(avg_confidence, 4)
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"OCR Request Error: {str(e)}")
            return {'text': '', 'confidence': 0.0}
        except Exception as e:
            logger.error(f"OCR Error: {str(e)}")
            return {'text': '', 'confidence': 0.0}
    
    def parse_prescription(self, ocr_text):
        """Parse raw OCR text into structured prescription data using GPT-4o."""
        if not ocr_text or ocr_text.strip() == '':
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
            "generic_name": "generic/chemical name if identifiable",
            "dosage": "e.g., 500mg",
            "frequency": "e.g., twice daily, every 8 hours",
            "duration": "e.g., 7 days, 2 weeks",
            "instructions": "any special instructions like 'take with food'",
            "category": "antibiotic|painkiller|antacid|antihistamine|antihypertensive|antidiabetic|vitamin|other",
            "primary_use": "simple explanation of what this drug treats",
            "mechanism": "simple explanation of how it works",
            "side_effects": ["common side effect 1", "common side effect 2"],
            "alternatives": ["generic alternative 1"]
        }
    ]
}

Important guidelines:
- Use your medical knowledge to fill in generic names, categories, and uses
- Provide plain English explanations suitable for patients
- Include common side effects from your knowledge
- If information is unclear or missing, use empty strings or empty arrays
- Only return valid JSON, no markdown formatting"""

        user_prompt = f"Parse this prescription text and extract all medication information:\n\n{ocr_text}"
        
        try:
            response = self.openai_client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"Parsed {len(result.get('medications', []))} medications")
            return result
        except Exception as e:
            logger.error(f"Parse Error: {str(e)}")
            return {"medications": [], "doctor_name": "", "clinic_name": "", "prescription_date": None}
    
    def analyze_safety(self, drugs, health_profile):
        """Analyze drug interactions and safety concerns using GPT-4o."""
        if not drugs:
            return {
                'score': 10,
                'summary': 'No medications to analyze.',
                'interactions': []
            }
        
        system_prompt = """You are a pharmaceutical safety analyst. Analyze drug interactions and safety concerns.

Return a JSON object with this structure:
{
    "score": 8,
    "summary": "Plain English summary of overall safety assessment",
    "interactions": [
        {
            "drug_name": "name of the drug with the interaction",
            "type": "drug_drug|drug_condition|drug_allergy|drug_food",
            "severity": "minor|moderate|severe|contraindicated",
            "interacting_with": "name of interacting drug/condition/allergy/food",
            "description": "Plain English explanation of the interaction",
            "recommendation": "What the patient should do"
        }
    ],
    "food_warnings": ["Foods to avoid while on these medications"],
    "lifestyle_warnings": ["Lifestyle considerations"],
    "general_advice": ["General medication tips"]
}

Severity guide:
- minor: Monitor, usually not significant
- moderate: May require dosage adjustment or monitoring  
- severe: Significant risk, doctor consultation required
- contraindicated: Should NOT be taken together, dangerous

Be thorough but write in plain, understandable English."""

        user_prompt = f"""Analyze the safety of these medications for a patient:

PRESCRIBED MEDICATIONS:
{json.dumps(drugs, indent=2)}

PATIENT HEALTH PROFILE:
- Medical Conditions: {', '.join(health_profile.get('conditions', [])) or 'None reported'}
- Known Allergies: {', '.join(health_profile.get('allergies', [])) or 'None reported'}
- Current Medications/Supplements: {', '.join(health_profile.get('current_meds', [])) or 'None reported'}
- Lifestyle: {json.dumps(health_profile.get('lifestyle', {}))}

Check for:
1. Drug-drug interactions between prescribed medications
2. Drug-drug interactions with current medications
3. Drug-condition interactions (contraindications)
4. Drug-allergy interactions (including cross-reactivity)
5. Drug-food interactions
6. Lifestyle considerations (smoking, alcohol, pregnancy)"""

        try:
            response = self.openai_client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            result['score'] = max(1, min(10, result.get('score', 5)))
            logger.info(f"Safety analysis complete: score={result['score']}")
            return result
        except Exception as e:
            logger.error(f"Safety Analysis Error: {str(e)}")
            return {
                'score': 5,
                'summary': 'Unable to complete safety analysis. Please consult your pharmacist.',
                'interactions': []
            }
