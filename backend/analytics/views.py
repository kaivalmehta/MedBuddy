from rest_framework import views
from rest_framework.response import Response
from django.db.models import Count, Avg, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from django.db import models
from prescriptions.models import Prescription, MedicationReminder, DoseLog
from pharmacy.models import PharmacyOrder, Pharmacy


class PatientDashboardView(views.APIView):
    def get(self, request):
        user = request.user
        today = timezone.now().date()
        
        active_reminders = MedicationReminder.objects.filter(user=user, is_active=True).select_related('prescription_drug')
        
        today_doses = DoseLog.objects.filter(reminder__user=user, scheduled_time__date=today)
        
        recent_prescriptions = Prescription.objects.filter(user=user).order_by('-created_at')[:5]
        
        safety_concerns = Prescription.objects.filter(user=user, safety_score__lt=7, status='analyzed').count()
        
        pending_orders = PharmacyOrder.objects.filter(patient=user, status__in=['received', 'verified', 'preparing']).count()
        
        return Response({
            'active_medications': active_reminders.count(),
            'today_doses': {
                'total': today_doses.count(),
                'taken': today_doses.filter(status='taken').count(),
                'pending': today_doses.filter(status='pending').count()
            },
            'recent_prescriptions': [{
                'id': str(p.id),
                'date': p.created_at.date(),
                'doctor': p.doctor_name,
                'status': p.status,
                'safety_score': p.safety_score
            } for p in recent_prescriptions],
            'safety_alerts': safety_concerns,
            'pending_orders': pending_orders
        })


class AdherenceReportView(views.APIView):
    def get(self, request):
        user = request.user
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        daily_adherence = DoseLog.objects.filter(
            reminder__user=user,
            scheduled_time__gte=start_date
        ).annotate(
            date=TruncDate('scheduled_time')
        ).values('date').annotate(
            taken=Count('id', filter=models.Q(status='taken')),
            total=Count('id')
        ).order_by('date')
        
        total_logs = DoseLog.objects.filter(reminder__user=user, scheduled_time__gte=start_date)
        total_count = total_logs.count()
        taken_count = total_logs.filter(status='taken').count()
        
        return Response({
            'period_days': days,
            'overall_adherence': round((taken_count / total_count * 100), 1) if total_count > 0 else 100,
            'daily_data': list(daily_adherence),
            'total_doses': total_count,
            'doses_taken': taken_count,
            'doses_missed': total_logs.filter(status='missed').count()
        })


class PharmacyDashboardView(views.APIView):
    def get(self, request):
        pharmacy = Pharmacy.objects.get(user=request.user)
        today = timezone.now().date()
        
        orders = PharmacyOrder.objects.filter(pharmacy=pharmacy)
        
        return Response({
            'pending_orders': orders.filter(status='received').count(),
            'preparing': orders.filter(status='preparing').count(),
            'ready_for_pickup': orders.filter(status='ready').count(),
            'completed_today': orders.filter(status='completed', completed_at__date=today).count(),
            'flagged_prescriptions': orders.filter(prescription__safety_score__lt=5).count(),
            'revenue_today': orders.filter(status='completed', completed_at__date=today).aggregate(total=Sum('total_price'))['total'] or 0,
            'rating': float(pharmacy.rating),
            'total_reviews': pharmacy.total_reviews
        })


class ExportHistoryView(views.APIView):
    def get(self, request):
        user = request.user
        prescriptions = Prescription.objects.filter(user=user).prefetch_related('drugs')
        
        export_data = {
            'patient': {
                'name': f"{user.first_name} {user.last_name}",
                'email': user.email,
                'export_date': timezone.now().isoformat()
            },
            'prescriptions': [{
                'id': str(p.id),
                'date': p.prescription_date.isoformat() if p.prescription_date else None,
                'doctor': p.doctor_name,
                'clinic': p.clinic_name,
                'medications': [{
                    'name': d.drug_name,
                    'generic': d.generic_name,
                    'dosage': d.dosage,
                    'frequency': d.frequency,
                    'duration': d.duration
                } for d in p.drugs.all()],
                'safety_score': p.safety_score
            } for p in prescriptions]
        }
        
        return Response(export_data)