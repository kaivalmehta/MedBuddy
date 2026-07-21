# backend/prescriptions/email_service.py
"""
Email Service - Wrapper for Azure Communication Services Email
Maintains backward compatibility with existing code while using Azure for delivery
"""

from django.conf import settings
from django.utils import timezone
import logging
import re

logger = logging.getLogger(__name__)

# Import the Azure email service
from .azure_email_service import AzureEmailService


class EmailService:
    """
    Email service that wraps Azure Communication Services
    Maintains backward compatibility with existing method signatures
    """
    
    # =========================================================================
    # GENERIC EMAIL METHOD
    # =========================================================================
    
    @staticmethod
    def send_email(to_email, subject, html_content, text_content=None):
        """Generic method to send any email"""
        return AzureEmailService.send_email(to_email, subject, html_content, text_content)
    
    @staticmethod
    def _send_email(recipient_email, subject, text_content, html_content):
        """Internal method for sending email (backward compatible)"""
        return AzureEmailService.send_email(recipient_email, subject, html_content, text_content)
    
    # =========================================================================
    # OTP EMAILS - Registration, Login, Password Reset
    # =========================================================================
    
    @staticmethod
    def send_registration_otp_email(email, otp_code, first_name=None):
        """Send OTP for registration verification"""
        return AzureEmailService.send_registration_otp(email, otp_code, first_name)
    
    @staticmethod
    def send_login_otp_email(email, otp_code, first_name=None):
        """Send OTP for login verification"""
        return AzureEmailService.send_login_otp(email, otp_code, first_name)
    
    @staticmethod
    def send_password_reset_email(email, otp_code, first_name=None):
        """Send OTP for password reset"""
        return AzureEmailService.send_password_reset_otp(email, otp_code, first_name)
    
    @staticmethod
    def send_sensitive_action_otp(email, otp_code, action_type, first_name=None):
        """Send OTP for sensitive actions (viewing medical data, etc.)"""
        return AzureEmailService.send_sensitive_action_otp(email, otp_code, action_type, first_name)
    
    @staticmethod
    def send_patient_access_otp_email(patient_email, patient_name, otp_code, 
                                       requester_name, requester_role='pharmacy',
                                       purpose='add_prescription', is_new_patient=False):
        """Send OTP to patient for pharmacy/doctor access verification"""
        return AzureEmailService.send_patient_access_otp_email(
            patient_email, patient_name, otp_code, 
            requester_name, requester_role, purpose, is_new_patient
        )
    
    # =========================================================================
    # ADMIN VERIFICATION EMAILS
    # =========================================================================
    
    @staticmethod
    def send_verification_approval_email(email, first_name, role):
        """Send email when professional account is verified/approved"""
        return AzureEmailService.send_verification_approved(email, first_name, role)
    
    @staticmethod
    def send_verification_rejection_email(email, first_name, role, reason=None):
        """Send email when professional verification is rejected"""
        return AzureEmailService.send_verification_rejected(email, first_name, role, reason)
    
    @staticmethod
    def send_account_suspended_email(email, first_name, role, reason=None, suspension_end=None):
        """Send email when account is suspended"""
        return AzureEmailService.send_account_suspended(email, first_name, role, reason, suspension_end)
    
    @staticmethod
    def send_account_reactivated_email(email, first_name, role):
        """Send email when suspended account is reactivated"""
        return AzureEmailService.send_account_reactivated(email, first_name, role)
    
    # =========================================================================
    # PRESCRIPTION NOTIFICATIONS
    # =========================================================================
    
    @staticmethod
    def send_prescription_to_patient(patient_email, patient_name, doctor_name, doctor_specialization,
                                     prescription_id, medications=None, diagnosis=None):
        """Notify patient when doctor sends them a prescription"""
        return AzureEmailService.send_prescription_to_patient(
            patient_email, patient_name, doctor_name, doctor_specialization,
            prescription_id, medications, diagnosis
        )
    
    @staticmethod
    def send_prescription_to_pharmacy(pharmacy_email, pharmacy_name, patient_name, doctor_name,
                                      prescription_id, medications=None, sender_type='doctor'):
        """Notify pharmacy when prescription is sent to them"""
        return AzureEmailService.send_prescription_to_pharmacy(
            pharmacy_email, pharmacy_name, patient_name, doctor_name,
            prescription_id, medications, sender_type
        )
    
    # =========================================================================
    # LAB TEST NOTIFICATIONS
    # =========================================================================
    
    @staticmethod
    def send_lab_order_to_laboratory(lab_email, lab_name, patient_name, doctor_name,
                                     order_id, tests=None, is_home_collection=False, notes=None):
        """Notify laboratory when doctor orders tests for a patient"""
        return AzureEmailService.send_lab_order_to_laboratory(
            lab_email, lab_name, patient_name, doctor_name,
            order_id, tests, is_home_collection, notes
        )
    
    @staticmethod
    def send_lab_order_to_patient(patient_email, patient_name, doctor_name, lab_name,
                                  order_id, tests=None, is_home_collection=False, scheduled_date=None):
        """Notify patient when doctor orders lab tests for them"""
        return AzureEmailService.send_lab_order_to_patient(
            patient_email, patient_name, doctor_name, lab_name,
            order_id, tests, is_home_collection, scheduled_date
        )
    
    @staticmethod
    def send_lab_report_to_patient(patient_email, patient_name, lab_name, report_id, tests=None):
        """Notify patient when lab uploads their report"""
        return AzureEmailService.send_lab_report_to_patient(
            patient_email, patient_name, lab_name, report_id, tests
        )
    
    @staticmethod
    def send_lab_report_to_doctor(doctor_email, doctor_name, patient_name, lab_name, report_id, tests=None):
        """Notify doctor when lab report is ready for their patient"""
        return AzureEmailService.send_lab_report_to_doctor(
            doctor_email, doctor_name, patient_name, lab_name, report_id, tests
        )
    
    # =========================================================================
    # MEDICATION & HEALTH ALERTS
    # =========================================================================
    
    @staticmethod
    def send_medication_reminder(patient_email, patient_name, medications):
        """Send medication reminder to patient"""
        return AzureEmailService.send_medication_reminder(patient_email, patient_name, medications)
    
    @staticmethod
    def send_drug_interaction_alert(recipient_email, recipient_name, patient_name,
                                    interactions, severity='moderate', recipient_type='doctor'):
        """Send drug interaction alert to doctor or patient"""
        return AzureEmailService.send_drug_interaction_alert(
            recipient_email, recipient_name, patient_name,
            interactions, severity, recipient_type
        )
    
    # =========================================================================
    # WELCOME & ACCOUNT EMAILS
    # =========================================================================
    
    @staticmethod
    def send_welcome_email(email, first_name, role):
        """Send welcome email after successful registration"""
        return AzureEmailService.send_welcome_email(email, first_name, role)
    
    @staticmethod
    def send_patient_account_created_email(patient_email, patient_name, created_by_name, created_by_role):
        """Notify patient when a professional creates an account for them"""
        return AzureEmailService.send_patient_account_created(
            patient_email, patient_name, created_by_name, created_by_role
        )
    
    # =========================================================================
    # ORDER STATUS NOTIFICATIONS
    # =========================================================================
    
    @staticmethod
    def send_order_status_update(patient_email, patient_name, order_id, status,
                                 pharmacy_name=None, items=None, notes=None):
        """Notify patient of pharmacy order status change"""
        return AzureEmailService.send_order_status_update(
            patient_email, patient_name, order_id, status,
            pharmacy_name, items, notes
        )
    
    # =========================================================================
    # LEGACY METHODS (for backward compatibility)
    # =========================================================================
    
    @staticmethod
    def send_prescription_email(prescription, recipient_email, sender_name, sender_type='doctor'):
        """
        Legacy method for sending prescription notification
        Maps to new send_prescription_to_patient method
        """
        # Get patient name
        patient_name = ""
        if prescription.user:
            patient_name = f"{prescription.user.first_name} {prescription.user.last_name}".strip()
            if not patient_name:
                patient_name = prescription.user.email
        
        # Get doctor info
        doctor_name = prescription.doctor_name or sender_name
        doctor_specialization = ""
        if prescription.sent_by and prescription.sent_by.role == 'doctor':
            try:
                doctor_specialization = prescription.sent_by.doctor_profile.specialization
            except:
                pass
        
        # Get medications
        medications = []
        if hasattr(prescription, 'drugs'):
            for drug in prescription.drugs.all()[:5]:
                medications.append({
                    'name': drug.drug_name,
                    'dosage': drug.dosage,
                    'frequency': drug.frequency,
                })
        
        return AzureEmailService.send_prescription_to_patient(
            patient_email=recipient_email,
            patient_name=patient_name,
            doctor_name=doctor_name,
            doctor_specialization=doctor_specialization,
            prescription_id=str(prescription.id),
            medications=medications,
            diagnosis=prescription.notes or ''
        )
    
    @staticmethod
    def send_lab_report_email(report, recipient_email, sender_name):
        """
        Legacy method for sending lab report notification
        Maps to new send_lab_report_to_patient method
        """
        # Get patient name
        patient_name = ""
        if report.user:
            patient_name = f"{report.user.first_name} {report.user.last_name}".strip()
            if not patient_name:
                patient_name = report.user.email
        
        lab_name = report.laboratory_name or sender_name
        
        return AzureEmailService.send_lab_report_to_patient(
            patient_email=recipient_email,
            patient_name=patient_name,
            lab_name=lab_name,
            report_id=str(report.id),
            tests=None
        )
    
    # =========================================================================
    # ADMIN NOTIFICATIONS
    # =========================================================================
    
    @staticmethod
    def send_new_verification_request_to_admin(admin_email, professional_name, role, registration_number):
        """Notify admin of new professional verification request"""
        return AzureEmailService.send_new_verification_request_to_admin(
            admin_email, professional_name, role, registration_number
        )
    
    @staticmethod
    def notify_admins_of_new_registration(professional_name, role, registration_number):
        """Notify all admins of new professional verification request"""
        admin_email = getattr(settings, 'ADMIN_EMAIL', None)
        if admin_email:
            return AzureEmailService.send_new_verification_request_to_admin(
                admin_email, professional_name, role, registration_number
            )
        return False