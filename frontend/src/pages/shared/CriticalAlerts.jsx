import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { testOrderService } from '../../services/professional'
import { 
  AlertTriangle, AlertCircle, CheckCircle, Loader2, FileText,
  User, Calendar, ChevronRight, Bell, ShieldAlert, X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CriticalAlerts({ userRole = 'patient' }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acknowledging, setAcknowledging] = useState(null)

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const res = await testOrderService.getAlerts()
      setAlerts(res.data || [])
    } catch (err) {
      setError('Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (alertId) => {
    setAcknowledging(alertId)
    try {
      await testOrderService.acknowledgeAlert(alertId)
      // Update local state
      setAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? { ...a, [userRole === 'doctor' ? 'acknowledged_by_doctor' : 'acknowledged_by_patient']: true }
          : a
      ))
    } catch (err) {
      setError('Failed to acknowledge alert')
    } finally {
      setAcknowledging(null)
    }
  }

  const severityConfig = {
    abnormal: {
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-700',
      icon: AlertCircle,
      label: 'Abnormal'
    },
    critical_low: {
      color: 'orange',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-700',
      icon: AlertTriangle,
      label: 'Critical Low'
    },
    critical_high: {
      color: 'orange',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-700',
      icon: AlertTriangle,
      label: 'Critical High'
    },
    panic: {
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      textColor: 'text-red-700',
      icon: ShieldAlert,
      label: 'Panic Value'
    }
  }

  const unacknowledgedCount = alerts.filter(a => 
    userRole === 'doctor' ? !a.acknowledged_by_doctor : !a.acknowledged_by_patient
  ).length

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Critical Alerts</h1>
            <p className="text-gray-600">Lab results requiring immediate attention</p>
          </div>
        </div>
        {unacknowledgedCount > 0 && (
          <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full font-medium">
            {unacknowledgedCount} unread
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Critical Alerts</h3>
          <p className="text-gray-500">All your lab values are within normal ranges</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.abnormal
            const SeverityIcon = config.icon
            const isAcknowledged = userRole === 'doctor' 
              ? alert.acknowledged_by_doctor 
              : alert.acknowledged_by_patient

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card ${config.bgColor} border ${config.borderColor} ${
                  isAcknowledged ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Severity Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    alert.severity === 'panic' ? 'bg-red-200' :
                    alert.severity.includes('critical') ? 'bg-orange-200' : 'bg-yellow-200'
                  }`}>
                    <SeverityIcon className={`w-6 h-6 ${config.textColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">{alert.test_name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.textColor} ${
                        alert.severity === 'panic' ? 'bg-red-200' :
                        alert.severity.includes('critical') ? 'bg-orange-200' : 'bg-yellow-200'
                      }`}>
                        {config.label}
                      </span>
                      {isAcknowledged && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                          Acknowledged
                        </span>
                      )}
                    </div>

                    {/* Value Display */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className={`text-2xl font-bold ${config.textColor}`}>
                        {alert.measured_value}
                      </span>
                      {alert.unit && (
                        <span className="text-gray-500">{alert.unit}</span>
                      )}
                      {alert.normal_range && (
                        <span className="text-sm text-gray-500">
                          (Normal: {alert.normal_range})
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {alert.description && (
                      <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                    )}

                    {/* Recommendation */}
                    {alert.recommendation && (
                      <div className="p-3 bg-white/50 rounded-lg mb-3">
                        <p className="text-sm font-medium text-gray-800">Recommendation:</p>
                        <p className="text-sm text-gray-600">{alert.recommendation}</p>
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {alert.report_title}
                      </span>
                      {userRole === 'doctor' && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {alert.patient_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {alert.report_date || new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {!isAcknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={acknowledging === alert.id}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm flex items-center gap-2"
                      >
                        {acknowledging === alert.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Acknowledge
                      </button>
                    )}
                    <Link
                      to={userRole === 'patient' ? '/reports' : `/doctor/patient/${alert.patient_id}/reports`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-2"
                    >
                      View Report
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Emergency Contact Info */}
      {alerts.some(a => a.severity === 'panic' || a.severity.includes('critical')) && (
        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Immediate Action Required</h3>
              <p className="text-sm text-red-700 mt-1">
                You have critical or panic values that require immediate medical attention. 
                Please contact your healthcare provider or visit the nearest emergency room immediately.
              </p>
              <div className="mt-3 flex gap-3">
                <a
                  href="tel:911"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                >
                  Call Emergency Services
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
