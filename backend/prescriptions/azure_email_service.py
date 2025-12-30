# backend/prescriptions/azure_email_service.py
"""
Comprehensive Email Service using Azure Communication Services
Handles all email notifications for MedBuddy platform
"""

import os
import logging
from django.conf import settings
from django.utils import timezone
from datetime import datetime
import pytz

logger = logging.getLogger(__name__)

# NYC Timezone
NYC_TZ = pytz.timezone('America/New_York')

def get_nyc_time():
    """Get current time in NYC timezone"""
    return datetime.now(NYC_TZ)

def format_nyc_datetime(fmt='%B %d, %Y at %I:%M %p'):
    """Get formatted NYC time string"""
    return get_nyc_time().strftime(fmt)

def format_nyc_date(fmt='%B %d, %Y'):
    """Get formatted NYC date string"""
    return get_nyc_time().strftime(fmt)

# Try to import Azure Communication Services
try:
    from azure.communication.email import EmailClient
    AZURE_EMAIL_AVAILABLE = True
except ImportError:
    AZURE_EMAIL_AVAILABLE = False
    logger.warning("Azure Communication Services Email SDK not installed. Run: pip install azure-communication-email")


class AzureEmailService:
    """
    Email service using Azure Communication Services
    Fallback to Django's built-in email if Azure not configured
    """
    
    _client = None
    
    @classmethod
    def get_client(cls):
        """Get or create Azure Email client"""
        if cls._client is None:
            connection_string = getattr(settings, 'AZURE_COMMUNICATION_CONNECTION_STRING', None)
            if connection_string and AZURE_EMAIL_AVAILABLE:
                try:
                    cls._client = EmailClient.from_connection_string(connection_string)
                    logger.info("Azure Email client initialized successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize Azure Email client: {e}")
                    cls._client = None
        return cls._client
    
    @classmethod
    def send_email(cls, to_email, subject, html_content, text_content=None):
        """
        Send email using Azure Communication Services
        Falls back to Django email if Azure not available
        """
        if text_content is None:
            import re
            text_content = re.sub('<[^<]+?>', '', html_content)
        
        client = cls.get_client()
        sender_email = getattr(settings, 'AZURE_EMAIL_SENDER', None)
        
        if client and sender_email:
            return cls._send_via_azure(client, sender_email, to_email, subject, html_content, text_content)
        else:
            return cls._send_via_django(to_email, subject, html_content, text_content)
    
    @classmethod
    def _send_via_azure(cls, client, sender, to_email, subject, html_content, text_content):
        """Send using Azure Communication Services"""
        try:
            message = {
                "senderAddress": sender,
                "recipients": {
                    "to": [{"address": to_email}]
                },
                "content": {
                    "subject": subject,
                    "plainText": text_content,
                    "html": html_content
                }
            }
            
            poller = client.begin_send(message)
            result = poller.result()
            
            logger.info(f"Azure Email sent successfully to {to_email}, Message ID: {result.get('id', 'N/A')}")
            return True
            
        except Exception as e:
            logger.error(f"Azure Email failed to {to_email}: {e}")
            # Fallback to Django email
            return cls._send_via_django(to_email, subject, html_content, text_content)
    
    @classmethod
    def _send_via_django(cls, to_email, subject, html_content, text_content):
        """Fallback to Django's email system"""
        try:
            from django.core.mail import EmailMultiAlternatives
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            
            logger.info(f"Django Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Django Email failed to {to_email}: {e}")
            return False

    # =========================================================================
    # EMAIL TEMPLATES - Base Styles
    # =========================================================================
    
    @staticmethod
    def _get_base_styles():
        return """
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00a8a8 0%, #007575 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header-success { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
            .header-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
            .header-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
            .header-info { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
            .header-purple { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
            .content { background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .otp-box { background: #f8fafc; padding: 25px; border-radius: 10px; margin: 20px 0; text-align: center; border: 2px dashed #00a8a8; }
            .otp-code { font-size: 36px; font-weight: bold; color: #00a8a8; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .info-box { background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #3b82f6; }
            .success-box { background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #22c55e; }
            .warning-box { background: #fffbeb; padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            .danger-box { background: #fef2f2; padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #ef4444; }
            .btn { display: inline-block; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
            .btn-primary { background: #00a8a8; color: white; }
            .btn-success { background: #22c55e; color: white; }
            .btn-info { background: #3b82f6; color: white; }
            .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: 600; color: #6b7280; min-width: 140px; }
            .detail-value { color: #111827; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding: 20px; }
            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .badge-success { background: #dcfce7; color: #166534; }
            .badge-warning { background: #fef3c7; color: #92400e; }
            .badge-danger { background: #fee2e2; color: #991b1b; }
            .badge-info { background: #dbeafe; color: #1e40af; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f8fafc; font-weight: 600; color: #374151; }
        </style>
        """
    
    @staticmethod
    def _get_footer():
        return """
        <div class="footer">
            <p>This is an automated message from MedBuddy.</p>
            <p>Please do not reply to this email.</p>
            <p>© 2024 MedBuddy - Your Intelligent Healthcare Companion</p>
        </div>
        """

    # =========================================================================
    # OTP EMAILS
    # =========================================================================
    
    @classmethod
    def send_registration_otp(cls, email, otp_code, first_name=None):
        """Send OTP for new user registration"""
        subject = "🔐 MedBuddy - Verify Your Email"
        
        greeting = f"Hello {first_name}," if first_name else "Hello,"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🏥 MedBuddy</div>
                    <p>Welcome to Your Healthcare Companion</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Thank you for registering with MedBuddy! To complete your registration, please verify your email address using the code below:</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0 0 10px 0; color: #6b7280;">Your Verification Code</p>
                        <p class="otp-code">{otp_code}</p>
                        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Valid for 10 minutes</p>
                    </div>
                    
                    <div class="warning-box">
                        <strong>⚠️ Security Notice:</strong> Never share this code with anyone. MedBuddy staff will never ask for your verification code.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

Welcome to MedBuddy!

Your verification code is: {otp_code}

This code will expire in 10 minutes.

If you did not create an account, please ignore this email.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(email, subject, html_content, text_content)
    
    @classmethod
    def send_login_otp(cls, email, otp_code, first_name=None):
        """Send OTP for login verification"""
        subject = "🔑 MedBuddy - Login Verification Code"
        
        greeting = f"Hello {first_name}," if first_name else "Hello,"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-info">
                    <div class="logo">🔐 Login Verification</div>
                    <p>Secure Access to Your Account</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>You are attempting to log in to your MedBuddy account. Use the code below to complete your login:</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0 0 10px 0; color: #6b7280;">Your Login Code</p>
                        <p class="otp-code">{otp_code}</p>
                        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Valid for 10 minutes</p>
                    </div>
                    
                    <div class="danger-box">
                        <strong>🚨 Didn't request this?</strong> If you did not attempt to log in, someone may have your password. Please secure your account immediately by changing your password.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

You are attempting to log in to your MedBuddy account.

Your login verification code is: {otp_code}

This code will expire in 10 minutes.

If you did not attempt to log in, please secure your account immediately.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(email, subject, html_content, text_content)
    
    @classmethod
    def send_password_reset_otp(cls, email, otp_code, first_name=None):
        """Send OTP for password reset"""
        subject = "🔄 MedBuddy - Password Reset Code"
        
        greeting = f"Hello {first_name}," if first_name else "Hello,"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-warning">
                    <div class="logo">🔑 Password Reset</div>
                    <p>Reset Your Account Password</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>You have requested to reset your MedBuddy password. Use the code below to proceed:</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0 0 10px 0; color: #6b7280;">Your Reset Code</p>
                        <p class="otp-code">{otp_code}</p>
                        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Valid for 30 minutes</p>
                    </div>
                    
                    <div class="info-box">
                        <strong>ℹ️ Note:</strong> If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

You have requested to reset your MedBuddy password.

Your password reset code is: {otp_code}

This code will expire in 30 minutes.

If you did not request this, please ignore this email.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(email, subject, html_content, text_content)
    
    @classmethod
    def send_sensitive_action_otp(cls, email, otp_code, action_type, first_name=None):
        """Send OTP for sensitive actions (viewing medical data, etc.)"""
        subject = "🛡️ MedBuddy - Security Verification Required"
        
        greeting = f"Hello {first_name}," if first_name else "Hello,"
        
        action_descriptions = {
            'view_prescription': 'view a prescription',
            'download_prescription': 'download a prescription',
            'view_lab_report': 'view a lab report',
            'download_lab_report': 'download a lab report',
            'update_medical_info': 'update medical information',
            'share_prescription': 'share a prescription',
            'access_patient_data': 'access patient medical data',
        }
        
        action_text = action_descriptions.get(action_type, 'perform a sensitive action')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-purple">
                    <div class="logo">🛡️ Security Verification</div>
                    <p>Protecting Your Medical Data</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>A verification code is required to <strong>{action_text}</strong> on MedBuddy.</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0 0 10px 0; color: #6b7280;">Your Security Code</p>
                        <p class="otp-code">{otp_code}</p>
                        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Valid for 5 minutes</p>
                    </div>
                    
                    <div class="info-box">
                        <strong>🔒 Why this verification?</strong><br>
                        Your medical data is sensitive. We require verification for all access to ensure only you can view your health information.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

A verification code is required to {action_text} on MedBuddy.

Your security code is: {otp_code}

This code will expire in 5 minutes.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(email, subject, html_content, text_content)

    # =========================================================================
    # ADMIN VERIFICATION EMAILS
    # =========================================================================
    
    @classmethod
    def send_verification_approved(cls, email, first_name, role, profile_details=None):
        """Send email when professional account is approved by admin"""
        subject = "✅ MedBuddy - Your Professional Account is Verified!"
        
        role_display = {'doctor': 'Doctor', 'pharmacy': 'Pharmacy', 'laboratory': 'Laboratory'}.get(role, 'Professional')
        greeting = f"Dear Dr. {first_name}," if role == 'doctor' else f"Dear {first_name},"
        
        features = {
            'doctor': [
                '📝 Create and send digital prescriptions to patients',
                '🔬 Order lab tests for your patients',
                '📊 View patient medical history (with consent)',
                '⚠️ Receive drug interaction alerts',
                '📍 Appear in "Find Nearby Doctors" for patients',
            ],
            'pharmacy': [
                '📋 Receive prescriptions from doctors and patients',
                '💊 Manage your inventory',
                '📊 Track sales and analytics',
                '📍 Appear in "Find Nearby Pharmacies" for patients',
                '🔔 Get notified of new prescription requests',
            ],
            'laboratory': [
                '🔬 Receive lab test orders from doctors',
                '📤 Upload and send lab reports to patients',
                '🏠 Manage home collection requests',
                '📍 Appear in "Find Nearby Labs" for patients',
                '📊 Track your test orders and reports',
            ],
        }
        
        feature_list = features.get(role, [])
        features_html = ''.join([f'<div style="padding: 8px 0;">✓ {f}</div>' for f in feature_list])
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-success">
                    <div class="logo">✅ Account Verified!</div>
                    <p>Welcome to MedBuddy Professional</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Great news! Your <strong>{role_display}</strong> account on MedBuddy has been <span class="badge badge-success">VERIFIED</span> by our admin team.</p>
                    
                    <div class="success-box">
                        <strong>🎉 You now have full access to:</strong>
                        {features_html}
                    </div>
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/login" class="btn btn-success">Log In to Your Account</a>
                    </center>
                    
                    <div class="info-box">
                        <strong>💡 Quick Tips:</strong><br>
                        • Complete your profile to help patients find you<br>
                        • Set your location to appear in nearby searches<br>
                        • Keep your professional documents up to date
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

Great news! Your {role_display} account on MedBuddy has been VERIFIED.

You now have full access to all professional features.

Log in at: {settings.FRONTEND_URL}/login

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(email, subject, html_content, text_content)
    
    @classmethod
    def send_verification_rejected(cls, email, first_name, role, reason=None):
        """Send email when professional verification is rejected"""
        subject = "⚠️ MedBuddy - Professional Verification Update"
        
        role_display = {'doctor': 'Doctor', 'pharmacy': 'Pharmacy', 'laboratory': 'Laboratory'}.get(role, 'Professional')
        greeting = f"Dear {first_name}," if first_name else "Hello,"
        
        reason_html = f'<div class="warning-box"><strong>Reason:</strong><br>{reason}</div>' if reason else ''
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-warning">
                    <div class="logo">⚠️ Verification Update</div>
                    <p>Action Required</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>We have reviewed your <strong>{role_display}</strong> account verification request on MedBuddy.</p>
                    
                    <p>Unfortunately, we were unable to verify your account at this time.</p>
                    
                    {reason_html}
                    
                    <div class="info-box">
                        <strong>📋 What you can do:</strong><br>
                        • Review the reason above (if provided)<br>
                        • Update your profile with correct information<br>
                        • Re-upload clear copies of your professional documents<br>
                        • Contact support if you believe this is an error
                    </div>
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/login" class="btn btn-primary">Update Your Profile</a>
                    </center>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

We have reviewed your {role_display} account verification request on MedBuddy.

Unfortunately, we were unable to verify your account at this time.

{f"Reason: {reason}" if reason else ""}

You can update your profile and documents, then request verification again.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(email, subject, html_content, text_content)
    
    @classmethod
    def send_account_suspended(cls, email, first_name, role, reason=None, suspension_end=None):
        """Send email when account is suspended"""
        subject = "🚫 MedBuddy - Account Suspension Notice"
        
        role_display = {'doctor': 'Doctor', 'pharmacy': 'Pharmacy', 'laboratory': 'Laboratory', 'patient': 'Patient'}.get(role, 'User')
        greeting = f"Dear {first_name}," if first_name else "Hello,"
        
        suspension_info = ""
        if suspension_end:
            suspension_info = f"<p><strong>Suspension ends:</strong> {suspension_end.strftime('%B %d, %Y at %I:%M %p')}</p>"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-danger">
                    <div class="logo">🚫 Account Suspended</div>
                    <p>Important Notice</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Your <strong>{role_display}</strong> account on MedBuddy has been <span class="badge badge-danger">SUSPENDED</span>.</p>
                    
                    <div class="danger-box">
                        <strong>Reason for suspension:</strong><br>
                        {reason or 'Policy violation'}
                    </div>
                    
                    {suspension_info}
                    
                    <div class="info-box">
                        <strong>📞 Need help?</strong><br>
                        If you believe this suspension is in error, please contact our support team with your account details.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

Your {role_display} account on MedBuddy has been SUSPENDED.

Reason: {reason or 'Policy violation'}

If you believe this is an error, please contact support.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(email, subject, html_content, text_content)
    
    @classmethod
    def send_account_reactivated(cls, email, first_name, role):
        """Send email when suspended account is reactivated"""
        subject = "✅ MedBuddy - Your Account Has Been Reactivated"
        
        role_display = {'doctor': 'Doctor', 'pharmacy': 'Pharmacy', 'laboratory': 'Laboratory', 'patient': 'Patient'}.get(role, 'User')
        greeting = f"Dear {first_name}," if first_name else "Hello,"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-success">
                    <div class="logo">✅ Account Reactivated</div>
                    <p>Welcome Back!</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Good news! Your <strong>{role_display}</strong> account on MedBuddy has been <span class="badge badge-success">REACTIVATED</span>.</p>
                    
                    <div class="success-box">
                        <strong>🎉 You can now:</strong><br>
                        • Log in to your account<br>
                        • Access all your previous data<br>
                        • Use all features available to your role
                    </div>
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/login" class="btn btn-success">Log In Now</a>
                    </center>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

Good news! Your {role_display} account on MedBuddy has been REACTIVATED.

You can now log in and access all your features.

Log in at: {settings.FRONTEND_URL}/login

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(email, subject, html_content, text_content)

    # =========================================================================
    # PRESCRIPTION NOTIFICATIONS
    # =========================================================================
    
    @classmethod
    def send_prescription_to_patient(cls, patient_email, patient_name, doctor_name, doctor_specialization, 
                                      prescription_id, medications=None, diagnosis=None):
        """Notify patient when doctor sends them a prescription"""
        subject = f"📋 New Prescription from Dr. {doctor_name}"
        
        greeting = f"Dear {patient_name}," if patient_name else "Hello,"
        
        meds_html = ""
        if medications:
            meds_rows = ''.join([
                f"<tr><td>{m.get('name', 'N/A')}</td><td>{m.get('dosage', 'N/A')}</td><td>{m.get('frequency', 'N/A')}</td></tr>"
                for m in medications[:5]  # Show max 5 medications
            ])
            meds_html = f"""
            <table>
                <tr><th>Medication</th><th>Dosage</th><th>Frequency</th></tr>
                {meds_rows}
            </table>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">📋 New Prescription</div>
                    <p>From Your Healthcare Provider</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>You have received a new prescription from <strong>Dr. {doctor_name}</strong> ({doctor_specialization or 'Healthcare Provider'}).</p>
                    
                    <div class="info-box">
                        <strong>📄 Prescription Details</strong><br>
                        <div class="detail-row">
                            <span class="detail-label">Prescribed by:</span>
                            <span class="detail-value">Dr. {doctor_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Specialization:</span>
                            <span class="detail-value">{doctor_specialization or 'General'}</span>
                        </div>
                        {f'<div class="detail-row"><span class="detail-label">Diagnosis:</span><span class="detail-value">{diagnosis}</span></div>' if diagnosis else ''}
                        <div class="detail-row">
                            <span class="detail-label">Date:</span>
                            <span class="detail-value">{timezone.now().strftime('%B %d, %Y')}</span>
                        </div>
                    </div>
                    
                    {meds_html if meds_html else ''}
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/prescriptions" class="btn btn-primary">View Full Prescription</a>
                    </center>
                    
                    <div class="warning-box">
                        <strong>⚠️ Important:</strong> Follow your doctor's instructions carefully. If you experience any adverse effects, contact your healthcare provider immediately.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

You have received a new prescription from Dr. {doctor_name} ({doctor_specialization or 'Healthcare Provider'}).

View your prescription at: {settings.FRONTEND_URL}/prescriptions

Please follow your doctor's instructions carefully.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(patient_email, subject, html_content, text_content)
    
    @classmethod
    def send_prescription_to_pharmacy(cls, pharmacy_email, pharmacy_name, patient_name, doctor_name, 
                                       prescription_id, medications=None, sender_type='doctor'):
        """Notify pharmacy when prescription is sent to them"""
        subject = f"📥 New Prescription Request - Patient: {patient_name}"
        
        sender_text = f"Dr. {doctor_name}" if sender_type == 'doctor' else patient_name
        
        meds_html = ""
        if medications:
            meds_rows = ''.join([
                f"<tr><td>{m.get('name', 'N/A')}</td><td>{m.get('dosage', 'N/A')}</td><td>{m.get('quantity', 'N/A')}</td></tr>"
                for m in medications[:10]
            ])
            meds_html = f"""
            <table>
                <tr><th>Medication</th><th>Dosage</th><th>Quantity</th></tr>
                {meds_rows}
            </table>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <div class="logo">📥 New Prescription</div>
                    <p>Fulfillment Request</p>
                </div>
                <div class="content">
                    <p>Dear {pharmacy_name},</p>
                    <p>You have received a new prescription request that requires fulfillment.</p>
                    
                    <div class="info-box">
                        <strong>📋 Request Details</strong><br>
                        <div class="detail-row">
                            <span class="detail-label">Patient:</span>
                            <span class="detail-value">{patient_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Sent by:</span>
                            <span class="detail-value">{sender_text}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date:</span>
                            <span class="detail-value">{timezone.now().strftime('%B %d, %Y at %I:%M %p')}</span>
                        </div>
                    </div>
                    
                    {meds_html if meds_html else ''}
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/pharmacy" class="btn btn-success">View in Dashboard</a>
                    </center>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear {pharmacy_name},

You have received a new prescription request.

Patient: {patient_name}
Sent by: {sender_text}
Date: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}

Please log in to your dashboard to view the full prescription.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(pharmacy_email, subject, html_content, text_content)

    # =========================================================================
    # LAB TEST NOTIFICATIONS
    # =========================================================================
    
    @classmethod
    def send_lab_order_to_laboratory(cls, lab_email, lab_name, patient_name, doctor_name, 
                                      order_id, tests=None, is_home_collection=False, notes=None):
        """Notify laboratory when doctor orders tests for a patient"""
        subject = f"🔬 New Lab Test Order - Patient: {patient_name}"
        
        tests_html = ""
        if tests:
            tests_rows = ''.join([
                f"<tr><td>{t.get('name', 'N/A')}</td><td>{t.get('category', 'N/A')}</td></tr>"
                for t in tests[:10]
            ])
            tests_html = f"""
            <table>
                <tr><th>Test Name</th><th>Category</th></tr>
                {tests_rows}
            </table>
            """
        
        collection_badge = '<span class="badge badge-info">🏠 Home Collection</span>' if is_home_collection else '<span class="badge badge-warning">🏥 Lab Visit</span>'
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-purple">
                    <div class="logo">🔬 New Lab Order</div>
                    <p>Test Request from Healthcare Provider</p>
                </div>
                <div class="content">
                    <p>Dear {lab_name},</p>
                    <p>You have received a new lab test order from <strong>Dr. {doctor_name}</strong>.</p>
                    
                    <div class="info-box">
                        <strong>📋 Order Details</strong><br>
                        <div class="detail-row">
                            <span class="detail-label">Order ID:</span>
                            <span class="detail-value">#{order_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Patient:</span>
                            <span class="detail-value">{patient_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Ordering Doctor:</span>
                            <span class="detail-value">Dr. {doctor_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Collection Type:</span>
                            <span class="detail-value">{collection_badge}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date:</span>
                            <span class="detail-value">{timezone.now().strftime('%B %d, %Y at %I:%M %p')}</span>
                        </div>
                    </div>
                    
                    {tests_html if tests_html else ''}
                    
                    {f'<div class="warning-box"><strong>📝 Doctor Notes:</strong><br>{notes}</div>' if notes else ''}
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/laboratory/test-orders" class="btn btn-primary">View Order Details</a>
                    </center>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear {lab_name},

You have received a new lab test order.

Order ID: #{order_id}
Patient: {patient_name}
Ordering Doctor: Dr. {doctor_name}
Collection Type: {'Home Collection' if is_home_collection else 'Lab Visit'}
Date: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}

Please log in to view the complete order details.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(lab_email, subject, html_content, text_content)
    
    @classmethod
    def send_lab_order_to_patient(cls, patient_email, patient_name, doctor_name, lab_name,
                                   order_id, tests=None, is_home_collection=False, scheduled_date=None):
        """Notify patient when doctor orders lab tests for them"""
        subject = f"🔬 Lab Tests Ordered by Dr. {doctor_name}"
        
        greeting = f"Dear {patient_name}," if patient_name else "Hello,"
        
        tests_html = ""
        if tests:
            tests_list = ''.join([f"<li>{t.get('name', 'N/A')}</li>" for t in tests[:10]])
            tests_html = f"<ul>{tests_list}</ul>"
        
        collection_info = ""
        if is_home_collection:
            collection_info = """
            <div class="success-box">
                <strong>🏠 Home Collection:</strong> A lab technician will visit you to collect samples at your registered address.
            </div>
            """
        else:
            collection_info = f"""
            <div class="info-box">
                <strong>🏥 Lab Visit Required:</strong> Please visit <strong>{lab_name}</strong> to provide your samples.
            </div>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-purple">
                    <div class="logo">🔬 Lab Tests Ordered</div>
                    <p>From Your Healthcare Provider</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p><strong>Dr. {doctor_name}</strong> has ordered lab tests for you at <strong>{lab_name}</strong>.</p>
                    
                    <div class="info-box">
                        <strong>📋 Order Details</strong><br>
                        <div class="detail-row">
                            <span class="detail-label">Order ID:</span>
                            <span class="detail-value">#{order_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Ordered by:</span>
                            <span class="detail-value">Dr. {doctor_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Laboratory:</span>
                            <span class="detail-value">{lab_name}</span>
                        </div>
                        {f'<div class="detail-row"><span class="detail-label">Scheduled:</span><span class="detail-value">{scheduled_date}</span></div>' if scheduled_date else ''}
                    </div>
                    
                    <p><strong>Tests Ordered:</strong></p>
                    {tests_html if tests_html else '<p>Please check your dashboard for test details.</p>'}
                    
                    {collection_info}
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/lab-orders" class="btn btn-primary">View Order Details</a>
                    </center>
                    
                    <div class="warning-box">
                        <strong>⚠️ Preparation:</strong> Some tests may require fasting or other preparation. Please check the test requirements in your dashboard.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

Dr. {doctor_name} has ordered lab tests for you at {lab_name}.

Order ID: #{order_id}
Collection Type: {'Home Collection' if is_home_collection else 'Lab Visit Required'}

Please log in to view your order details and any preparation instructions.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(patient_email, subject, html_content, text_content)
    
    @classmethod
    def send_lab_report_to_patient(cls, patient_email, patient_name, lab_name, report_id, tests=None):
        """Notify patient when lab uploads their report"""
        subject = f"📊 Lab Report Ready from {lab_name}"
        
        greeting = f"Dear {patient_name}," if patient_name else "Hello,"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-success">
                    <div class="logo">📊 Lab Report Ready</div>
                    <p>Your Results Are Available</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Your lab report from <strong>{lab_name}</strong> is now available.</p>
                    
                    <div class="success-box">
                        <strong>✅ Report Details</strong><br>
                        <div class="detail-row">
                            <span class="detail-label">Laboratory:</span>
                            <span class="detail-value">{lab_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Report Date:</span>
                            <span class="detail-value">{timezone.now().strftime('%B %d, %Y')}</span>
                        </div>
                    </div>
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/reports" class="btn btn-success">View Lab Report</a>
                    </center>
                    
                    <div class="info-box">
                        <strong>💡 Tip:</strong> If you have questions about your results, please consult with your healthcare provider.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

Your lab report from {lab_name} is now available.

View your report at: {settings.FRONTEND_URL}/reports

If you have questions about your results, please consult with your healthcare provider.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(patient_email, subject, html_content, text_content)
    
    @classmethod
    def send_lab_report_to_doctor(cls, doctor_email, doctor_name, patient_name, lab_name, report_id, tests=None):
        """Notify doctor when lab report is ready for their patient"""
        subject = f"📊 Lab Report Ready - Patient: {patient_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-info">
                    <div class="logo">📊 Lab Report Available</div>
                    <p>Patient Test Results</p>
                </div>
                <div class="content">
                    <p>Dear Dr. {doctor_name},</p>
                    <p>Lab results are now available for your patient <strong>{patient_name}</strong>.</p>
                    
                    <div class="info-box">
                        <strong>📋 Report Details</strong><br>
                        <div class="detail-row">
                            <span class="detail-label">Patient:</span>
                            <span class="detail-value">{patient_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Laboratory:</span>
                            <span class="detail-value">{lab_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Report Date:</span>
                            <span class="detail-value">{timezone.now().strftime('%B %d, %Y')}</span>
                        </div>
                    </div>
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/doctor" class="btn btn-info">View in Dashboard</a>
                    </center>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Dear Dr. {doctor_name},

Lab results are now available for your patient {patient_name}.

Laboratory: {lab_name}
Report Date: {timezone.now().strftime('%B %d, %Y')}

Please log in to view the results.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(doctor_email, subject, html_content, text_content)

    # =========================================================================
    # MEDICATION REMINDERS & ALERTS
    # =========================================================================
    
    @classmethod
    def send_medication_reminder(cls, patient_email, patient_name, medications):
        """Send medication reminder to patient"""
        subject = "💊 MedBuddy - Medication Reminder"
        
        greeting = f"Dear {patient_name}," if patient_name else "Hello,"
        
        meds_html = ""
        if medications:
            meds_items = ''.join([
                f'<div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #00a8a8;">'
                f'<strong>{m.get("name", "Medication")}</strong><br>'
                f'<span style="color: #6b7280;">Dosage: {m.get("dosage", "N/A")} | Time: {m.get("time", "N/A")}</span>'
                f'</div>'
                for m in medications
            ])
            meds_html = meds_items
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">💊 Medication Reminder</div>
                    <p>Time to Take Your Medicine</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>This is a friendly reminder to take your scheduled medications.</p>
                    
                    {meds_html}
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/reminders" class="btn btn-primary">View All Reminders</a>
                    </center>
                    
                    <div class="info-box">
                        <strong>💡 Stay on Track:</strong> Taking medications at the same time each day helps maintain consistent levels in your body.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

This is a reminder to take your scheduled medications.

Please log in to view your medication schedule.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(patient_email, subject, html_content, text_content)
    
    @classmethod
    def send_drug_interaction_alert(cls, recipient_email, recipient_name, patient_name, 
                                     interactions, severity='moderate', recipient_type='doctor'):
        """Send drug interaction alert to doctor or patient"""
        subject = f"⚠️ Drug Interaction Alert - {patient_name}" if recipient_type == 'doctor' else "⚠️ Important: Drug Interaction Detected"
        
        severity_colors = {
            'mild': 'badge-info',
            'moderate': 'badge-warning', 
            'severe': 'badge-danger'
        }
        
        severity_badge = severity_colors.get(severity, 'badge-warning')
        
        interactions_html = ""
        if interactions:
            for interaction in interactions[:5]:
                interactions_html += f"""
                <div class="warning-box">
                    <strong>{interaction.get('drug1', 'Drug 1')} + {interaction.get('drug2', 'Drug 2')}</strong>
                    <span class="badge {severity_badge}">{severity.upper()}</span><br>
                    {interaction.get('description', 'Potential interaction detected.')}
                </div>
                """
        
        greeting = f"Dear Dr. {recipient_name}," if recipient_type == 'doctor' else f"Dear {recipient_name},"
        
        # Define variables to avoid backslashes in f-strings
        action_text = "Please review the patient's medications and consider alternatives if necessary." if recipient_type == 'doctor' else "Please consult with your healthcare provider before taking these medications together."
        detection_text = "A potential drug interaction has been detected for your patient" if recipient_type == 'doctor' else "A potential drug interaction has been detected in your medications"
        alert_url = f"{settings.FRONTEND_URL}/doctor/alerts" if recipient_type == 'doctor' else f"{settings.FRONTEND_URL}/alerts"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-danger">
                    <div class="logo">⚠️ Drug Interaction Alert</div>
                    <p>Requires Immediate Attention</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>{detection_text} <strong>{patient_name}</strong>.</p>
                    
                    {interactions_html}
                    
                    <div class="danger-box">
                        <strong>🚨 Action Required:</strong><br>
                        {action_text}
                    </div>
                    
                    <center>
                        <a href="{alert_url}" class="btn btn-primary">View Full Details</a>
                    </center>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

A potential drug interaction has been detected.

Patient: {patient_name}
Severity: {severity.upper()}

Please review the details in your MedBuddy dashboard.

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(recipient_email, subject, html_content, text_content)

    # =========================================================================
    # WELCOME & ACCOUNT CREATION EMAILS
    # =========================================================================
    
    @classmethod
    def send_welcome_email(cls, email, first_name, role):
        """Send welcome email after successful registration"""
        subject = "🎉 Welcome to MedBuddy!"
        
        role_display = {'doctor': 'Doctor', 'pharmacy': 'Pharmacy', 'laboratory': 'Laboratory', 'patient': 'Patient'}.get(role, 'User')
        greeting = f"Hello {first_name}!" if first_name else "Hello!"
        
        if role == 'patient':
            features = [
                '📱 Store and manage your prescriptions digitally',
                '⏰ Set medication reminders',
                '🔒 Get drug interaction safety analysis',
                '🏪 Share prescriptions with pharmacies',
                '🔬 Order and track lab tests',
            ]
        else:
            features = [
                '📋 Manage patient prescriptions/reports',
                '📊 Access comprehensive dashboards',
                '🔔 Receive important notifications',
                '📍 Get discovered by patients nearby',
            ]
            if role != 'patient':
                pending_note = """
                <div class="warning-box">
                    <strong>⏳ Verification Pending:</strong> Your professional account is pending verification by our admin team. 
                    You'll receive an email once your account is verified.
                </div>
                """
            else:
                pending_note = ""
        
        features_html = ''.join([f'<div style="padding: 8px 0;">✓ {f}</div>' for f in features])
        pending_note = pending_note if role != 'patient' else ""
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎉 Welcome to MedBuddy!</div>
                    <p>Your Intelligent Healthcare Companion</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Thank you for joining MedBuddy as a <strong>{role_display}</strong>!</p>
                    
                    <div class="success-box">
                        <strong>🌟 What you can do with MedBuddy:</strong>
                        {features_html}
                    </div>
                    
                    {pending_note}
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/login" class="btn btn-primary">Get Started</a>
                    </center>
                    
                    <div class="info-box">
                        <strong>💡 Need Help?</strong><br>
                        Check out our help center or contact support if you have any questions.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

Thank you for joining MedBuddy as a {role_display}!

Get started at: {settings.FRONTEND_URL}/login

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(email, subject, html_content, text_content)
    
    @classmethod
    def send_patient_account_created(cls, patient_email, patient_name, created_by_name, created_by_role):
        """Notify patient when a professional creates an account for them"""
        subject = "🏥 Your MedBuddy Account Has Been Created"
        
        role_text = {'doctor': 'your doctor', 'pharmacy': 'your pharmacy', 'laboratory': 'the laboratory'}.get(created_by_role, 'a healthcare provider')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🏥 Welcome to MedBuddy!</div>
                    <p>Account Created For You</p>
                </div>
                <div class="content">
                    <p>Hello {patient_name or 'there'},</p>
                    <p>A MedBuddy account has been created for you by <strong>{created_by_name}</strong> ({role_text}).</p>
                    
                    <div class="info-box">
                        <strong>🌟 With MedBuddy, you can:</strong>
                        <div style="padding: 8px 0;">✓ 📱 Store and manage your prescriptions digitally</div>
                        <div style="padding: 8px 0;">✓ ⏰ Set medication reminders</div>
                        <div style="padding: 8px 0;">✓ 🔒 Get drug interaction safety analysis</div>
                        <div style="padding: 8px 0;">✓ 🏪 Share prescriptions with pharmacies</div>
                        <div style="padding: 8px 0;">✓ 🔬 Track your lab tests and reports</div>
                    </div>
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/reset-password?email={patient_email}" class="btn btn-primary">Set Up Your Password</a>
                    </center>
                    
                    <div class="warning-box">
                        <strong>🔐 Security Note:</strong> Click the button above to set your password and secure your account.
                    </div>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Hello {patient_name or 'there'},

A MedBuddy account has been created for you by {created_by_name} ({role_text}).

Set up your password at: {settings.FRONTEND_URL}/reset-password?email={patient_email}

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(patient_email, subject, html_content, text_content)

    # =========================================================================
    # ORDER STATUS NOTIFICATIONS
    # =========================================================================
    
    @classmethod
    def send_order_status_update(cls, patient_email, patient_name, order_id, status, 
                                  pharmacy_name=None, items=None, notes=None):
        """Notify patient of pharmacy order status change"""
        subject = f"📦 Order #{order_id} - {status.replace('_', ' ').title()}"
        
        greeting = f"Dear {patient_name}," if patient_name else "Hello,"
        
        status_info = {
            'received': ('📥', 'Order Received', 'Your prescription has been received by the pharmacy.', 'info'),
            'processing': ('⚙️', 'Processing', 'Your order is being prepared.', 'info'),
            'ready': ('✅', 'Ready for Pickup', 'Your order is ready! Please visit the pharmacy to collect.', 'success'),
            'out_for_delivery': ('🚚', 'Out for Delivery', 'Your order is on its way!', 'info'),
            'delivered': ('📬', 'Delivered', 'Your order has been delivered successfully.', 'success'),
            'cancelled': ('❌', 'Cancelled', 'Your order has been cancelled.', 'danger'),
        }
        
        icon, title, description, box_type = status_info.get(status, ('📦', status.title(), '', 'info'))
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header {'header-success' if box_type == 'success' else 'header-danger' if box_type == 'danger' else ''}">
                    <div class="logo">{icon} {title}</div>
                    <p>Order Update</p>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>{description}</p>
                    
                    <div class="{box_type}-box">
                        <strong>📋 Order Details</strong><br>
                        <div class="detail-row">
                            <span class="detail-label">Order ID:</span>
                            <span class="detail-value">#{order_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value"><span class="badge badge-{box_type}">{title}</span></span>
                        </div>
                        {f'<div class="detail-row"><span class="detail-label">Pharmacy:</span><span class="detail-value">{pharmacy_name}</span></div>' if pharmacy_name else ''}
                    </div>
                    
                    {f'<div class="info-box"><strong>📝 Notes:</strong><br>{notes}</div>' if notes else ''}
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/orders" class="btn btn-primary">View Order Details</a>
                    </center>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
{greeting}

{description}

Order ID: #{order_id}
Status: {title}
{f"Pharmacy: {pharmacy_name}" if pharmacy_name else ""}

View your order at: {settings.FRONTEND_URL}/orders

Best regards,
MedBuddy Team
        """
        
        return cls.send_email(patient_email, subject, html_content, text_content)

    # =========================================================================
    # ADMIN NOTIFICATIONS
    # =========================================================================
    
    @classmethod
    def send_new_verification_request_to_admin(cls, admin_email, professional_name, role, registration_number):
        """Notify admin of new professional verification request"""
        subject = f"🔔 New Verification Request - {role.title()}: {professional_name}"
        
        role_display = {'doctor': 'Doctor', 'pharmacy': 'Pharmacy', 'laboratory': 'Laboratory'}.get(role, 'Professional')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>{cls._get_base_styles()}</head>
        <body>
            <div class="container">
                <div class="header header-info">
                    <div class="logo">🔔 New Verification Request</div>
                    <p>Action Required</p>
                </div>
                <div class="content">
                    <p>Hello Admin,</p>
                    <p>A new professional verification request requires your review.</p>
                    
                    <div class="info-box">
                        <strong>📋 Request Details</strong><br>
                        <div class="detail-row">
                            <span class="detail-label">Name:</span>
                            <span class="detail-value">{professional_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Role:</span>
                            <span class="detail-value">{role_display}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Registration #:</span>
                            <span class="detail-value">{registration_number or 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Submitted:</span>
                            <span class="detail-value">{timezone.now().strftime('%B %d, %Y at %I:%M %p')}</span>
                        </div>
                    </div>
                    
                    <center>
                        <a href="{settings.FRONTEND_URL}/admin/verifications" class="btn btn-primary">Review Request</a>
                    </center>
                </div>
                {cls._get_footer()}
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Hello Admin,

A new professional verification request requires your review.

Name: {professional_name}
Role: {role_display}
Registration #: {registration_number or 'N/A'}

Please log in to review the request.

Best regards,
MedBuddy System
        """
        
        return cls.send_email(admin_email, subject, html_content, text_content)


# Create a simpler alias for backward compatibility
EmailService = AzureEmailService
