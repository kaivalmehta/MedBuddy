# backend/prescriptions/email_service.py
# Comprehensive email service for all notification types

from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending all types of emails"""
    
    # ============================================
    # REGISTRATION / LOGIN OTP EMAILS
    # ============================================
    
    @staticmethod
    def send_registration_otp_email(email, otp_code):
        """Send OTP for registration verification"""
        subject = "MedBuddy - Verify Your Email"
        
        text_content = f"""
Welcome to MedBuddy!

Your verification code is: {otp_code}

This code will expire in 10 minutes.

If you did not create an account, please ignore this email.

Best regards,
MedBuddy Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #00a8a8 0%, #007575 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }}
        .otp-box {{ background: white; padding: 30px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }}
        .otp-code {{ font-size: 42px; font-weight: bold; color: #00a8a8; letter-spacing: 10px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Welcome to MedBuddy!</h1>
        </div>
        <div class="content">
            <p>Thank you for registering with MedBuddy, your intelligent prescription management companion.</p>
            
            <div class="otp-box">
                <p>Your verification code is:</p>
                <p class="otp-code">{otp_code}</p>
                <p><small>This code expires in 10 minutes</small></p>
            </div>
            
            <p>Enter this code to complete your registration.</p>
        </div>
        <div class="footer">
            <p>If you did not create an account, please ignore this email.</p>
            <p>© 2024 MedBuddy - Your Intelligent Prescription Companion</p>
        </div>
    </div>
</body>
</html>
        """
        
        return EmailService._send_email(email, subject, text_content, html_content)
    
    @staticmethod
    def send_login_otp_email(email, otp_code):
        """Send OTP for login verification"""
        subject = "MedBuddy - Login Verification Code"
        
        text_content = f"""
Hello,

You are attempting to log in to your MedBuddy account.

Your verification code is: {otp_code}

This code will expire in 10 minutes.

If you did not attempt to log in, please secure your account immediately.

Best regards,
MedBuddy Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #00a8a8 0%, #007575 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }}
        .otp-box {{ background: white; padding: 30px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }}
        .otp-code {{ font-size: 42px; font-weight: bold; color: #00a8a8; letter-spacing: 10px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
        .warning {{ background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Login Verification</h1>
        </div>
        <div class="content">
            <p>You are attempting to log in to your MedBuddy account.</p>
            
            <div class="otp-box">
                <p>Your verification code is:</p>
                <p class="otp-code">{otp_code}</p>
                <p><small>This code expires in 10 minutes</small></p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you did not attempt to log in, 
                someone may have access to your password. Please secure your account immediately.
            </div>
        </div>
        <div class="footer">
            <p>© 2024 MedBuddy - Your Intelligent Prescription Companion</p>
        </div>
    </div>
</body>
</html>
        """
        
        return EmailService._send_email(email, subject, text_content, html_content)
    
    @staticmethod
    def send_password_reset_email(email, otp_code):
        """Send OTP for password reset"""
        subject = "MedBuddy - Password Reset Code"
        
        text_content = f"""
Hello,

You have requested to reset your MedBuddy password.

Your password reset code is: {otp_code}

This code will expire in 30 minutes.

If you did not request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
MedBuddy Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }}
        .otp-box {{ background: white; padding: 30px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }}
        .otp-code {{ font-size: 42px; font-weight: bold; color: #dc3545; letter-spacing: 10px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔑 Password Reset</h1>
        </div>
        <div class="content">
            <p>You have requested to reset your MedBuddy password.</p>
            
            <div class="otp-box">
                <p>Your reset code is:</p>
                <p class="otp-code">{otp_code}</p>
                <p><small>This code expires in 30 minutes</small></p>
            </div>
            
            <p>If you did not request this, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>© 2024 MedBuddy - Your Intelligent Prescription Companion</p>
        </div>
    </div>
</body>
</html>
        """
        
        return EmailService._send_email(email, subject, text_content, html_content)
    
    # ============================================
    # PATIENT ACCESS OTP EMAILS
    # ============================================
    
    @staticmethod
    def send_patient_access_otp_email(patient_email, patient_name, otp_code, requester_name, 
                                       requester_role, purpose, is_new_patient=False):
        """Send OTP to patient for professional access verification"""
        purpose_text = {
            'view_history': 'view your medical history',
            'add_prescription': 'add a prescription to your account',
            'add_report': 'add a lab report to your account'
        }
        
        role_text = {
            'doctor': 'Doctor',
            'laboratory': 'Laboratory',
            'pharmacy': 'Pharmacy'
        }
        
        subject = f"MedBuddy - Verification Required from {requester_name}"
        
        new_patient_text = ""
        if is_new_patient:
            new_patient_text = f"""
Note: A MedBuddy account has been created for you by {requester_name}. 
After verifying this code, you can set up your password and access your medical records.
"""
        
        text_content = f"""
Hello {patient_name},

{requester_name} ({role_text.get(requester_role, 'Healthcare Provider')}) is requesting to {purpose_text.get(purpose, 'access your medical information')}.

Your verification code is: {otp_code}

This code will expire in 10 minutes.

Please share this code with {requester_name} to grant access.
{new_patient_text}
If you did not initiate this request, please ignore this email.

Best regards,
MedBuddy Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #00a8a8 0%, #007575 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }}
        .otp-box {{ background: white; padding: 30px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }}
        .otp-code {{ font-size: 42px; font-weight: bold; color: #00a8a8; letter-spacing: 10px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
        .requester-info {{ background: #e8f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }}
        .new-patient {{ background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0; color: #155724; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Access Verification</h1>
        </div>
        <div class="content">
            <p>Hello {patient_name},</p>
            
            <div class="requester-info">
                <strong>{requester_name}</strong><br>
                <small>{role_text.get(requester_role, 'Healthcare Provider')}</small><br>
                <p>is requesting to <strong>{purpose_text.get(purpose, 'access your medical information')}</strong>.</p>
            </div>
            
            <div class="otp-box">
                <p>Your verification code is:</p>
                <p class="otp-code">{otp_code}</p>
                <p><small>This code expires in 10 minutes</small></p>
            </div>
            
            <p>Share this code with <strong>{requester_name}</strong> to grant access.</p>
            
            {"<div class='new-patient'><strong>📋 New Account Created:</strong><br>A MedBuddy account has been created for you. After verification, you can set up your password and access your medical records.</div>" if is_new_patient else ""}
            
            <p><strong>If you did not initiate this request, please ignore this email.</strong></p>
        </div>
        <div class="footer">
            <p>© 2024 MedBuddy - Your Intelligent Prescription Companion</p>
        </div>
    </div>
</body>
</html>
        """
        
        return EmailService._send_email(patient_email, subject, text_content, html_content)
    
    @staticmethod
    def send_otp_email(patient_email, otp_code, requester_name, purpose='view_history'):
        """Legacy method - redirects to new method"""
        return EmailService.send_patient_access_otp_email(
            patient_email=patient_email,
            patient_name="Patient",
            otp_code=otp_code,
            requester_name=requester_name,
            requester_role='doctor',
            purpose=purpose
        )
    
    # ============================================
    # PRESCRIPTION EMAILS
    # ============================================
    
    @staticmethod
    def send_prescription_email(prescription, recipient_email, sender_name, sender_type):
        """Send prescription to patient via email"""
        subject = f"New Prescription from {sender_name} - MedBuddy"
        
        # Build medication list
        medications = []
        for drug in prescription.drugs.all():
            medications.append({
                'name': drug.drug_name,
                'dosage': drug.dosage,
                'frequency': drug.frequency,
                'duration': drug.duration,
                'instructions': drug.instructions
            })
        
        # Plain text version
        text_content = f"""
Hello,

You have received a new prescription from {sender_name}.

Prescription Details:
- Date: {prescription.prescription_date or 'Not specified'}
- Doctor: {prescription.doctor_name or sender_name}
- Clinic: {prescription.clinic_name or 'Not specified'}

Medications:
"""
        for med in medications:
            text_content += f"""
- {med['name']} ({med['dosage']})
  Take: {med['frequency']}
  Duration: {med['duration']}
  Instructions: {med['instructions']}
"""
        
        text_content += f"""

This prescription has been automatically added to your MedBuddy account.
Log in to view full details, safety analysis, and set medication reminders.

View Prescription: {settings.FRONTEND_URL}/prescriptions/{prescription.id}

Best regards,
MedBuddy Team

---
This is an automated message from MedBuddy. Do not reply to this email.
        """
        
        # HTML version
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #00a8a8 0%, #007575 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .prescription-card {{ background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }}
        .medication {{ border-left: 4px solid #00a8a8; padding-left: 15px; margin: 15px 0; background: white; padding: 15px; border-radius: 0 8px 8px 0; }}
        .btn {{ display: inline-block; background: #00a8a8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💊 New Prescription</h1>
            <p>From {sender_name}</p>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You have received a new prescription that has been added to your MedBuddy account.</p>
            
            <div class="prescription-card">
                <h3>📋 Prescription Details</h3>
                <p><strong>Date:</strong> {prescription.prescription_date or 'Not specified'}</p>
                <p><strong>Doctor:</strong> {prescription.doctor_name or sender_name}</p>
                <p><strong>Clinic:</strong> {prescription.clinic_name or 'Not specified'}</p>
            </div>
            
            <h3>💊 Medications</h3>
"""
        
        for med in medications:
            html_content += f"""
            <div class="medication">
                <strong>{med['name']}</strong> - {med['dosage']}<br>
                <small>Take: {med['frequency']} | Duration: {med['duration']}</small><br>
                <small>Instructions: {med['instructions'] or 'As directed'}</small>
            </div>
"""
        
        html_content += f"""
            <center>
                <a href="{settings.FRONTEND_URL}/prescriptions/{prescription.id}" class="btn">
                    View Full Prescription
                </a>
            </center>
            
            <p>Log in to your MedBuddy account to:</p>
            <ul>
                <li>View detailed safety analysis</li>
                <li>Check drug interactions</li>
                <li>Set medication reminders</li>
                <li>Send to a pharmacy</li>
            </ul>
        </div>
        <div class="footer">
            <p>This is an automated message from MedBuddy.</p>
            <p>© 2024 MedBuddy - Your Intelligent Prescription Companion</p>
        </div>
    </div>
</body>
</html>
        """
        
        success = EmailService._send_email(recipient_email, subject, text_content, html_content)
        
        if success:
            prescription.email_sent = True
            prescription.email_sent_at = timezone.now()
            prescription.save()
        
        return success
    
    # ============================================
    # LAB REPORT EMAILS
    # ============================================
    
    @staticmethod
    def send_lab_report_email(report, recipient_email, sender_name):
        """Send lab report to patient via email."""
        subject = f"New Lab Report from {sender_name} - MedBuddy"
        
        text_content = f"""
Hello,

You have received a new lab report from {sender_name}.

Report Details:
- Report Type: {report.get_report_type_display()}
- Title: {report.report_title}
- Date: {report.report_date or 'Not specified'}
- Laboratory: {report.laboratory_name or sender_name}

This report has been automatically added to your MedBuddy account.
Log in to view full details and analysis.

View Report: {settings.FRONTEND_URL}/reports/{report.id}

Best regards,
MedBuddy Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .report-card {{ background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }}
        .btn {{ display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔬 New Lab Report</h1>
            <p>From {sender_name}</p>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You have received a new lab report that has been added to your MedBuddy account.</p>
            
            <div class="report-card">
                <h3>📋 Report Details</h3>
                <p><strong>Type:</strong> {report.get_report_type_display()}</p>
                <p><strong>Title:</strong> {report.report_title}</p>
                <p><strong>Date:</strong> {report.report_date or 'Not specified'}</p>
                <p><strong>Laboratory:</strong> {report.laboratory_name or sender_name}</p>
            </div>
            
            <center>
                <a href="{settings.FRONTEND_URL}/reports/{report.id}" class="btn">
                    View Full Report
                </a>
            </center>
        </div>
        <div class="footer">
            <p>This is an automated message from MedBuddy.</p>
            <p>© 2024 MedBuddy - Your Intelligent Prescription Companion</p>
        </div>
    </div>
</body>
</html>
        """
        
        success = EmailService._send_email(recipient_email, subject, text_content, html_content)
        
        if success:
            report.email_sent = True
            report.email_sent_at = timezone.now()
            report.save()
        
        return success
    
    # ============================================
    # NEW PATIENT WELCOME EMAIL
    # ============================================
    
    @staticmethod
    def send_new_patient_welcome_email(patient_email, patient_name, created_by_name, created_by_role):
        """Send welcome email to newly created patient account"""
        subject = "Welcome to MedBuddy - Your Account Has Been Created"
        
        role_text = {
            'doctor': 'Doctor',
            'laboratory': 'Laboratory',
            'pharmacy': 'Pharmacy'
        }
        
        text_content = f"""
Hello {patient_name},

A MedBuddy account has been created for you by {created_by_name} ({role_text.get(created_by_role, 'Healthcare Provider')}).

MedBuddy is your intelligent prescription management companion that helps you:
- Store and manage your prescriptions digitally
- Track your medications with reminders
- Get safety analysis for drug interactions
- Share prescriptions with pharmacies

To set up your password and access your account, please visit:
{settings.FRONTEND_URL}/reset-password?email={patient_email}

Best regards,
MedBuddy Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #00a8a8 0%, #007575 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .feature {{ display: flex; align-items: center; margin: 10px 0; padding: 10px; background: white; border-radius: 8px; }}
        .btn {{ display: inline-block; background: #00a8a8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Welcome to MedBuddy!</h1>
        </div>
        <div class="content">
            <p>Hello {patient_name},</p>
            <p>A MedBuddy account has been created for you by <strong>{created_by_name}</strong> ({role_text.get(created_by_role, 'Healthcare Provider')}).</p>
            
            <p>MedBuddy is your intelligent prescription management companion that helps you:</p>
            <div class="feature">📱 Store and manage your prescriptions digitally</div>
            <div class="feature">⏰ Track your medications with reminders</div>
            <div class="feature">🔒 Get safety analysis for drug interactions</div>
            <div class="feature">🏪 Share prescriptions with pharmacies</div>
            
            <center>
                <a href="{settings.FRONTEND_URL}/reset-password?email={patient_email}" class="btn">
                    Set Up Your Password
                </a>
            </center>
        </div>
        <div class="footer">
            <p>© 2024 MedBuddy - Your Intelligent Prescription Companion</p>
        </div>
    </div>
</body>
</html>
        """
        
        return EmailService._send_email(patient_email, subject, text_content, html_content)
    
    # ============================================
    # HELPER METHOD
    # ============================================
    
    @staticmethod
    def _send_email(recipient_email, subject, text_content, html_content):
        """Send email with both text and HTML versions"""
        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            
            logger.info(f"Email sent successfully to {recipient_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {e}")
            return False
    
    # ============================================
    # ADMIN VERIFICATION EMAILS
    # ============================================
    
    @staticmethod
    def send_verification_approval_email(email, first_name, role):
        """Send email when professional account is verified"""
        role_text = {
            'doctor': 'Doctor',
            'laboratory': 'Laboratory',
            'pharmacy': 'Pharmacy'
        }
        
        subject = "MedBuddy - Your Professional Account Has Been Verified!"
        
        text_content = f"""
Hello {first_name or 'there'},

Great news! Your {role_text.get(role, 'professional')} account on MedBuddy has been verified.

You now have full access to:
- Send prescriptions/reports to patients
- Access patient medical history (with patient consent)
- Use all professional features

Log in to your account to get started: {settings.FRONTEND_URL}/login

Best regards,
MedBuddy Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .feature {{ display: flex; align-items: center; margin: 10px 0; padding: 10px; background: white; border-radius: 8px; }}
        .btn {{ display: inline-block; background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Account Verified!</h1>
        </div>
        <div class="content">
            <p>Hello {first_name or 'there'},</p>
            <p>Great news! Your <strong>{role_text.get(role, 'professional')}</strong> account on MedBuddy has been verified.</p>
            
            <p>You now have full access to:</p>
            <div class="feature">📤 Send prescriptions/reports to patients</div>
            <div class="feature">📋 Access patient medical history (with consent)</div>
            <div class="feature">⭐ All professional features</div>
            
            <center>
                <a href="{settings.FRONTEND_URL}/login" class="btn">
                    Log In to Your Account
                </a>
            </center>
        </div>
        <div class="footer">
            <p>© 2024 MedBuddy - Your Intelligent Prescription Companion</p>
        </div>
    </div>
</body>
</html>
        """
        
        return EmailService._send_email(email, subject, text_content, html_content)
    
    @staticmethod
    def send_verification_rejection_email(email, first_name, role, reason):
        """Send email when professional verification is rejected"""
        role_text = {
            'doctor': 'Doctor',
            'laboratory': 'Laboratory',
            'pharmacy': 'Pharmacy'
        }
        
        subject = "MedBuddy - Professional Verification Update"
        
        text_content = f"""
Hello {first_name or 'there'},

We have reviewed your {role_text.get(role, 'professional')} account verification request on MedBuddy.

Unfortunately, we were unable to verify your account at this time.

{"Reason: " + reason if reason else ""}

If you believe this is an error or would like to provide additional documentation, please contact our support team.

Best regards,
MedBuddy Team
        """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .reason-box {{ background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Verification Update</h1>
        </div>
        <div class="content">
            <p>Hello {first_name or 'there'},</p>
            <p>We have reviewed your <strong>{role_text.get(role, 'professional')}</strong> account verification request.</p>
            
            <p>Unfortunately, we were unable to verify your account at this time.</p>
            
            {"<div class='reason-box'><strong>Reason:</strong><br>" + reason + "</div>" if reason else ""}
            
            <p>If you believe this is an error or would like to provide additional documentation, please contact our support team.</p>
        </div>
        <div class="footer">
            <p>© 2024 MedBuddy - Your Intelligent Prescription Companion</p>
        </div>
    </div>
</body>
</html>
        """
        
        return EmailService._send_email(email, subject, text_content, html_content)
