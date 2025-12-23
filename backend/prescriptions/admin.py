# backend/prescriptions/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Prescription, PrescriptionDrug, DrugInteraction, MedicationReminder, DoseLog
import json


class PrescriptionDrugInline(admin.TabularInline):
    model = PrescriptionDrug
    extra = 0
    readonly_fields = ['safety_badge', 'interaction_count']
    fields = ['drug_name', 'dosage', 'frequency', 'safety_badge', 'is_safe_to_take', 'interaction_count']
    
    def safety_badge(self, obj):
        if obj.safety_percentage is None:
            return format_html('<span style="color: gray;">Not analyzed</span>')
        
        if obj.safety_percentage >= 80:
            color = '#10b981'
            label = 'Safe'
        elif obj.safety_percentage >= 60:
            color = '#f59e0b'
            label = 'Caution'
        elif obj.safety_percentage >= 40:
            color = '#f97316'
            label = 'Warning'
        else:
            color = '#ef4444'
            label = 'Danger'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-weight: 500;">{} ({}%)</span>',
            color, label, obj.safety_percentage
        )
    safety_badge.short_description = 'Safety'
    
    def interaction_count(self, obj):
        count = obj.interactions.count()
        if count == 0:
            return format_html('<span style="color: #10b981;">✓ No interactions</span>')
        return format_html(
            '<span style="color: #f59e0b; font-weight: bold;">{} interaction(s)</span>',
            count
        )
    interaction_count.short_description = 'Interactions'


class DrugInteractionInline(admin.TabularInline):
    model = DrugInteraction
    extra = 0
    readonly_fields = ['severity_badge']
    fields = ['interaction_type', 'severity_badge', 'interacting_item', 'title', 'consult_doctor']
    
    def severity_badge(self, obj):
        colors = {
            'info': '#3b82f6',
            'minor': '#10b981',
            'moderate': '#f59e0b',
            'severe': '#f97316',
            'critical': '#ef4444'
        }
        color = colors.get(obj.severity, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px; text-transform: uppercase; font-size: 11px;">{}</span>',
            color, obj.severity
        )
    severity_badge.short_description = 'Severity'


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = [
        'id_short', 'user_email', 'doctor_name', 'status_badge', 
        'safety_display', 'drug_count', 'created_at'
    ]
    list_filter = ['status', 'safety_status', 'created_at']
    search_fields = ['user__email', 'doctor_name', 'clinic_name']
    readonly_fields = [
        'safety_report_formatted', 'ocr_preview', 'image_preview',
        'critical_alerts_display', 'interactions_summary'
    ]
    inlines = [PrescriptionDrugInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'family_member', 'doctor_name', 'clinic_name', 'prescription_date', 'status')
        }),
        ('Safety Analysis', {
            'fields': (
                'overall_safety_percentage', 'safety_status', 'safety_summary',
                'critical_alerts_display', 'interactions_summary'
            ),
            'classes': ('wide',)
        }),
        ('Detailed Safety Report', {
            'fields': ('safety_report_formatted',),
            'classes': ('collapse', 'wide')
        }),
        ('Prescription Image & OCR', {
            'fields': ('image_preview', 'ocr_preview', 'ocr_confidence'),
            'classes': ('collapse',)
        }),
        ('Raw Data', {
            'fields': ('image_url', 'blob_name', 'parsed_data', 'notes'),
            'classes': ('collapse',)
        }),
    )
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def status_badge(self, obj):
        colors = {
            'uploaded': '#6b7280',
            'processing': '#3b82f6',
            'analyzed': '#10b981',
            'sent_to_pharmacy': '#8b5cf6',
            'completed': '#059669'
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def safety_display(self, obj):
        if obj.overall_safety_percentage is None:
            return format_html('<span style="color: gray;">Not analyzed</span>')
        
        if obj.overall_safety_percentage >= 80:
            color = '#10b981'
            icon = '✓'
        elif obj.overall_safety_percentage >= 60:
            color = '#f59e0b'
            icon = '⚠'
        elif obj.overall_safety_percentage >= 40:
            color = '#f97316'
            icon = '⚠'
        else:
            color = '#ef4444'
            icon = '⛔'
        
        return format_html(
            '<span style="color: {}; font-weight: bold; font-size: 16px;">{} {}%</span>',
            color, icon, obj.overall_safety_percentage
        )
    safety_display.short_description = 'Safety'
    
    def drug_count(self, obj):
        return obj.drugs.count()
    drug_count.short_description = 'Drugs'
    
    def image_preview(self, obj):
        if obj.image_url:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 400px; '
                'border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"/>',
                obj.image_url
            )
        return 'No image'
    image_preview.short_description = 'Prescription Image'
    
    def ocr_preview(self, obj):
        if obj.ocr_raw_text:
            return format_html(
                '<pre style="background: #f3f4f6; padding: 12px; border-radius: 8px; '
                'max-height: 200px; overflow-y: auto; white-space: pre-wrap;">{}</pre>',
                obj.ocr_raw_text[:1000] + ('...' if len(obj.ocr_raw_text) > 1000 else '')
            )
        return 'No OCR text'
    ocr_preview.short_description = 'Extracted Text'
    
    def critical_alerts_display(self, obj):
        if not obj.safety_report:
            return 'No safety report'
        
        alerts = obj.safety_report.get('critical_alerts', [])
        if not alerts:
            return format_html('<span style="color: #10b981; font-weight: bold;">✓ No critical alerts</span>')
        
        html = '<div style="background: #fef2f2; padding: 12px; border-radius: 8px; border-left: 4px solid #ef4444;">'
        for alert in alerts:
            html += f'<p style="margin: 8px 0;"><strong style="color: #dc2626;">⚠ {alert.get("title", "Alert")}</strong><br/>'
            html += f'{alert.get("message", "")}</p>'
        html += '</div>'
        return mark_safe(html)
    critical_alerts_display.short_description = 'Critical Alerts'
    
    def interactions_summary(self, obj):
        if not obj.safety_report:
            return 'No safety report'
        
        sections = [
            ('drug_drug_interactions', '💊 Drug-Drug', '#3b82f6'),
            ('drug_allergy_interactions', '🤧 Drug-Allergy', '#ef4444'),
            ('drug_disease_interactions', '🏥 Drug-Disease', '#f97316'),
            ('drug_food_interactions', '🍎 Drug-Food', '#10b981'),
        ]
        
        html = '<div style="display: flex; gap: 12px; flex-wrap: wrap;">'
        for key, label, color in sections:
            count = len(obj.safety_report.get(key, []))
            bg_color = f'{color}20' if count > 0 else '#f3f4f6'
            text_color = color if count > 0 else '#6b7280'
            html += f'''
                <div style="background: {bg_color}; padding: 8px 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: {text_color};">{count}</div>
                    <div style="font-size: 12px; color: {text_color};">{label}</div>
                </div>
            '''
        html += '</div>'
        return mark_safe(html)
    interactions_summary.short_description = 'Interaction Summary'
    
    def safety_report_formatted(self, obj):
        if not obj.safety_report:
            return 'No safety report available'
        
        return format_html(
            '<pre style="background: #f8fafc; padding: 16px; border-radius: 8px; '
            'max-height: 500px; overflow-y: auto; font-size: 12px;">{}</pre>',
            json.dumps(obj.safety_report, indent=2)
        )
    safety_report_formatted.short_description = 'Full Safety Report (JSON)'


@admin.register(PrescriptionDrug)
class PrescriptionDrugAdmin(admin.ModelAdmin):
    list_display = [
        'drug_name', 'prescription_link', 'dosage', 'frequency',
        'safety_badge', 'is_safe_to_take', 'interaction_count'
    ]
    list_filter = ['category', 'safety_status', 'is_safe_to_take', 'requires_monitoring']
    search_fields = ['drug_name', 'generic_name', 'prescription__user__email']
    inlines = [DrugInteractionInline]
    readonly_fields = ['safety_badge', 'concerns_display']
    
    fieldsets = (
        ('Drug Information', {
            'fields': ('prescription', 'drug_name', 'generic_name', 'category', 'dosage', 'frequency', 'duration')
        }),
        ('Safety Analysis', {
            'fields': ('safety_badge', 'safety_percentage', 'safety_status', 'is_safe_to_take', 
                      'requires_monitoring', 'concerns_display', 'special_instructions'),
            'classes': ('wide',)
        }),
        ('Additional Info', {
            'fields': ('primary_use', 'mechanism', 'common_side_effects', 'generic_alternatives', 'instructions'),
            'classes': ('collapse',)
        }),
    )
    
    def prescription_link(self, obj):
        return format_html(
            '<a href="/admin/prescriptions/prescription/{}/change/">{}</a>',
            obj.prescription.id, str(obj.prescription.id)[:8]
        )
    prescription_link.short_description = 'Prescription'
    
    def safety_badge(self, obj):
        if obj.safety_percentage is None:
            return format_html('<span style="color: gray;">Not analyzed</span>')
        
        if obj.safety_percentage >= 80:
            color, label = '#10b981', 'Safe'
        elif obj.safety_percentage >= 60:
            color, label = '#f59e0b', 'Caution'
        elif obj.safety_percentage >= 40:
            color, label = '#f97316', 'Warning'
        else:
            color, label = '#ef4444', 'Danger'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 12px; '
            'border-radius: 12px; font-weight: 600;">{} ({}%)</span>',
            color, label, obj.safety_percentage
        )
    safety_badge.short_description = 'Safety'
    
    def interaction_count(self, obj):
        count = obj.interactions.count()
        if count == 0:
            return format_html('<span style="color: #10b981;">✓ None</span>')
        return format_html('<span style="color: #f59e0b; font-weight: bold;">{}</span>', count)
    interaction_count.short_description = 'Interactions'
    
    def concerns_display(self, obj):
        if not obj.safety_concerns:
            return format_html('<span style="color: #10b981;">✓ No concerns</span>')
        
        html = '<ul style="margin: 0; padding-left: 20px;">'
        for concern in obj.safety_concerns:
            html += f'<li style="color: #f59e0b;">{concern}</li>'
        html += '</ul>'
        return mark_safe(html)
    concerns_display.short_description = 'Safety Concerns'


@admin.register(DrugInteraction)
class DrugInteractionAdmin(admin.ModelAdmin):
    list_display = [
        'drug_name', 'interaction_type_badge', 'severity_badge',
        'interacting_item', 'requires_immediate_attention', 'consult_doctor'
    ]
    list_filter = ['interaction_type', 'severity', 'requires_immediate_attention', 'consult_doctor']
    search_fields = ['prescription_drug__drug_name', 'interacting_item', 'title']
    
    def drug_name(self, obj):
        return obj.prescription_drug.drug_name
    drug_name.short_description = 'Drug'
    
    def interaction_type_badge(self, obj):
        colors = {
            'drug_drug': '#3b82f6',
            'drug_allergy': '#ef4444',
            'drug_disease': '#f97316',
            'drug_food': '#10b981',
            'drug_lifestyle': '#8b5cf6',
            'pregnancy': '#ec4899'
        }
        color = colors.get(obj.interaction_type, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px; font-size: 11px;">{}</span>',
            color, obj.get_interaction_type_display()
        )
    interaction_type_badge.short_description = 'Type'
    
    def severity_badge(self, obj):
        colors = {
            'info': '#3b82f6',
            'minor': '#10b981',
            'moderate': '#f59e0b',
            'severe': '#f97316',
            'critical': '#ef4444'
        }
        color = colors.get(obj.severity, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px; text-transform: uppercase; font-size: 11px; font-weight: bold;">{}</span>',
            color, obj.severity
        )
    severity_badge.short_description = 'Severity'


@admin.register(MedicationReminder)
class MedicationReminderAdmin(admin.ModelAdmin):
    list_display = [
        'drug_name', 'user_email', 'reminder_time', 'is_active',
        'adherence_display', 'days_display'
    ]
    list_filter = ['is_active', 'reminder_time']
    search_fields = ['prescription_drug__drug_name', 'user__email']
    
    def drug_name(self, obj):
        return obj.prescription_drug.drug_name
    drug_name.short_description = 'Drug'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def adherence_display(self, obj):
        rate = obj.adherence_rate
        if rate >= 80:
            color = '#10b981'
        elif rate >= 60:
            color = '#f59e0b'
        else:
            color = '#ef4444'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color, rate
        )
    adherence_display.short_description = 'Adherence'
    
    def days_display(self, obj):
        day_names = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
        html = ''
        for i, day in enumerate(day_names):
            if i in obj.days_of_week:
                html += f'<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; margin: 1px;">{day}</span>'
            else:
                html += f'<span style="background: #e5e7eb; color: #9ca3af; padding: 2px 6px; border-radius: 4px; margin: 1px;">{day}</span>'
        return mark_safe(html)
    days_display.short_description = 'Days'


@admin.register(DoseLog)
class DoseLogAdmin(admin.ModelAdmin):
    list_display = ['reminder_drug', 'scheduled_time', 'status_badge', 'taken_at']
    list_filter = ['status', 'scheduled_time']
    
    def reminder_drug(self, obj):
        return obj.reminder.prescription_drug.drug_name
    reminder_drug.short_description = 'Drug'
    
    def status_badge(self, obj):
        colors = {
            'pending': '#6b7280',
            'taken': '#10b981',
            'missed': '#ef4444',
            'skipped': '#f59e0b'
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px;">{}</span>',
            color, obj.status.title()
        )
    status_badge.short_description = 'Status'