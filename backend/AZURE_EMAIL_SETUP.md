# Azure Communication Services Email Setup Guide

## Overview
MedBuddy uses Azure Communication Services (ACS) for sending professional email notifications including:
- OTP verification emails
- Prescription notifications (doctor → patient)
- Lab test order notifications (doctor → lab, lab → patient)
- Lab report notifications (lab → patient, lab → doctor)
- Admin verification/suspension notifications
- Welcome emails and account creation notifications

## Setup Steps

### Step 1: Create Azure Communication Services Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource**
3. Search for **Communication Services**
4. Click **Create**
5. Fill in:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Resource Name**: e.g., `medbuddy-communication`
   - **Data Location**: Choose your preferred region
6. Click **Review + Create** → **Create**

### Step 2: Create Email Communication Services Resource

1. In Azure Portal, click **Create a resource**
2. Search for **Email Communication Services**
3. Click **Create**
4. Fill in:
   - **Subscription**: Same as above
   - **Resource Group**: Same as above
   - **Email Service Name**: e.g., `medbuddy-email`
   - **Data Location**: Same region
5. Click **Review + Create** → **Create**

### Step 3: Set Up Email Domain

#### Option A: Use Azure Managed Domain (Easiest)
1. Go to your Email Communication Services resource
2. Click **Provision Domains** → **Add domain**
3. Select **Azure subdomain**
4. Click **Add**
5. Wait for provisioning (takes a few minutes)
6. Your sender address will be: `DoNotReply@xxxxxxxx.azurecomm.net`

#### Option B: Use Custom Domain (Recommended for Production)
1. Go to **Provision Domains** → **Add domain**
2. Select **Custom domain**
3. Enter your domain (e.g., `mail.medbuddy.com`)
4. Add the required DNS records:
   - SPF record
   - DKIM records (2)
   - DMARC record (optional but recommended)
5. Click **Verify** after adding DNS records
6. Your sender address will be: `noreply@mail.medbuddy.com`

### Step 4: Connect Email to Communication Services

1. Go to your **Communication Services** resource
2. Click **Domains** in the left menu
3. Click **Connect domain**
4. Select your Email Communication Services resource
5. Select the verified domain
6. Click **Connect**

### Step 5: Get Connection String

1. Go to your **Communication Services** resource
2. Click **Keys** in the left menu
3. Copy the **Connection string** (Primary or Secondary)

### Step 6: Configure MedBuddy

Add these environment variables to your `.env` file:

```env
# Azure Communication Services Email
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://your-resource.communication.azure.com/;accesskey=your-access-key
AZURE_EMAIL_SENDER=DoNotReply@xxxxxxxx.azurecomm.net

# Admin notification email
ADMIN_EMAIL=admin@yourcompany.com
```

### Step 7: Install Python SDK

```bash
pip install azure-communication-email
```

Or if using requirements.txt:
```bash
pip install -r requirements.txt
```

## Testing

### Test Email Sending (Django Shell)
```python
python manage.py shell

from prescriptions.azure_email_service import AzureEmailService

# Test sending an email
result = AzureEmailService.send_email(
    to_email="test@example.com",
    subject="Test Email from MedBuddy",
    html_content="<h1>Hello!</h1><p>This is a test email.</p>",
    text_content="Hello! This is a test email."
)
print(f"Email sent: {result}")
```

### Test OTP Email
```python
from prescriptions.email_service import EmailService

EmailService.send_registration_otp_email(
    email="test@example.com",
    otp_code="123456",
    first_name="John"
)
```

## Email Types & Templates

### OTP Emails
- `send_registration_otp_email` - For new user registration
- `send_login_otp_email` - For login verification
- `send_password_reset_email` - For password reset
- `send_sensitive_action_otp` - For viewing medical data

### Admin Notifications
- `send_verification_approval_email` - When admin approves professional
- `send_verification_rejection_email` - When admin rejects professional
- `send_account_suspended_email` - When admin suspends account
- `send_account_reactivated_email` - When admin reactivates account
- `send_new_verification_request_to_admin` - Notify admin of new registration

### Prescription Notifications
- `send_prescription_to_patient` - When doctor sends prescription
- `send_prescription_to_pharmacy` - When prescription sent to pharmacy

### Lab Notifications
- `send_lab_order_to_laboratory` - When doctor orders tests
- `send_lab_order_to_patient` - When tests ordered for patient
- `send_lab_report_to_patient` - When lab uploads report
- `send_lab_report_to_doctor` - When lab results ready for doctor's patient

### Other Notifications
- `send_welcome_email` - Welcome email after registration
- `send_medication_reminder` - Medication reminders
- `send_drug_interaction_alert` - Drug interaction warnings
- `send_order_status_update` - Pharmacy order status changes

## Fallback Behavior

If Azure Communication Services is not configured:
1. The system falls back to Django's built-in email backend
2. In development (with `EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'`), emails are printed to console
3. For production SMTP fallback, configure these settings:

```python
# settings.py
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # or your SMTP server
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
```

## Pricing

Azure Communication Services Email pricing (as of 2024):
- **First 100 emails/month**: Free
- **Additional emails**: ~$0.00025 per email

For most applications, the free tier is sufficient for development and small-scale production.

## Troubleshooting

### "No module named 'azure.communication.email'"
```bash
pip install azure-communication-email --break-system-packages
```

### "Authentication failed"
- Check your connection string is correct
- Ensure the domain is connected to Communication Services
- Verify the sender email matches your verified domain

### "Recipient address rejected"
- Check the recipient email format is valid
- Some test emails (like `test@test.com`) may be rejected

### Emails not arriving
1. Check spam/junk folder
2. Verify domain DNS records are correct
3. Check Azure Portal for send failures
4. Review application logs for errors

## Support

For Azure-specific issues:
- [Azure Communication Services Documentation](https://docs.microsoft.com/azure/communication-services/)
- [Email SDK Documentation](https://docs.microsoft.com/azure/communication-services/quickstarts/email/send-email)
